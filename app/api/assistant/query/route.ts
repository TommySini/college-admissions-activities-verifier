import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import {
  getUserActivities,
  getVolunteeringStats,
  getVolunteeringGoals,
  getUserProfile,
  getAdminAnalytics,
  getOrganizations,
  findOrganizationByName,
} from "@/lib/assistant/tools";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Intent classification keywords
const INTENT_PATTERNS = {
  clubs: [
    "club",
    "organization",
    "president",
    "leader",
    "advisor",
    "contact",
    "finance club",
    "robotics",
    "tbs",
  ],
  activities: [
    "activity",
    "activities",
    "extracurricular",
    "best activity",
    "what have i done",
    "my activities",
  ],
  volunteering: [
    "volunteer",
    "volunteering",
    "hours",
    "service",
    "community service",
    "how many hours",
  ],
  goals: ["goal", "target", "progress", "remaining", "aim for", "should i"],
  profile: ["profile", "my info", "about me", "my major", "who am i"],
  admin: ["analytics", "platform", "total students", "statistics", "admin"],
};

function classifyIntent(message: string): string[] {
  const lowerMessage = message.toLowerCase();
  const intents: string[] = [];

  for (const [intent, keywords] of Object.entries(INTENT_PATTERNS)) {
    if (keywords.some((keyword) => lowerMessage.includes(keyword))) {
      intents.push(intent);
    }
  }

  // Default to all if no specific intent detected
  if (intents.length === 0) {
    return ["profile", "activities", "volunteering"];
  }

  return intents;
}

// Extract potential organization names from the query
function extractOrganizationName(message: string): string | null {
  const lowerMessage = message.toLowerCase();

  // Common patterns for asking about clubs
  const patterns = [
    /(?:president|leader|advisor|contact|email).*?(?:of|for)\s+(?:the\s+)?([a-z\s]+?)(?:\?|$|club)/i,
    /([a-z\s]+?)\s+(?:club|organization|team)/i,
    /(?:the\s+)?([a-z\s]+?)\s+(?:president|leader|advisor)/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { message, action } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Classify intent to determine what data to fetch
    const intents = classifyIntent(message);
    console.log("Detected intents:", intents);

    // Conditionally fetch data based on intent
    const contextData: any = {};

    // Always include basic profile
    contextData.profile = await getUserProfile(user.id);

    // Fetch data based on detected intents
    if (intents.includes("activities")) {
      contextData.activities = await getUserActivities(user.id, 15);
    }

    if (intents.includes("volunteering")) {
      contextData.volunteering = await getVolunteeringStats(user.id);
    }

    if (intents.includes("goals")) {
      contextData.goals = await getVolunteeringGoals(user.id);
    }

    if (intents.includes("clubs")) {
      // Try to extract organization name from query
      const orgName = extractOrganizationName(message);
      if (orgName) {
        console.log("Searching for organization:", orgName);
        contextData.searchedOrganizations = await findOrganizationByName(orgName);
      }
      // Also get general list of organizations (limited)
      contextData.organizations = await getOrganizations("APPROVED", 20);
    }

    if (intents.includes("admin") && user.role === "admin") {
      try {
        contextData.admin = await getAdminAnalytics(user);
      } catch (error) {
        console.error("Error fetching admin analytics:", error);
      }
    }

    // Build compact system prompt
    let systemPrompt = `You are Actify Assistant, a helpful AI assistant for the Actify college admissions activity verification platform.

You have access to the following data about the current user and platform:

**User Profile:**
- Name: ${contextData.profile?.name}
- Email: ${contextData.profile?.email}
- Role: ${contextData.profile?.role}
${contextData.profile?.alumniProfile ? `- Intended Major: ${contextData.profile.alumniProfile.intendedMajor || "Not specified"}` : ""}
`;

    // Add activities if requested
    if (contextData.activities) {
      const topActivities = contextData.activities.slice(0, 10);
      systemPrompt += `\n**Activities (showing ${topActivities.length} of ${contextData.activities.length}):**\n`;
      topActivities.forEach((act: any) => {
        systemPrompt += `- ${act.name} (${act.category})${act.role ? ` - Role: ${act.role}` : ""}${
          act.organization ? ` at ${act.organization}` : ""
        }${act.totalHours ? ` - ${act.totalHours} hours` : ""}${
          act.verified ? " ✓ Verified" : " (Pending)"
        }\n`;
      });
    }

    // Add volunteering if requested
    if (contextData.volunteering) {
      systemPrompt += `\n**Volunteering Statistics:**
- Total Hours: ${contextData.volunteering.totalHours}
- Verified Hours: ${contextData.volunteering.verifiedHours}
- Unverified Hours: ${contextData.volunteering.unverifiedHours}
- Recent Hours (last 6 months): ${contextData.volunteering.recentHours}
- Total Participations: ${contextData.volunteering.participationCount}
`;
      if (contextData.volunteering.categories?.length > 0) {
        systemPrompt += `- Categories: ${contextData.volunteering.categories
          .map((c: any) => `${c.name} (${c.hours}h)`)
          .join(", ")}\n`;
      }
    }

    // Add goals if requested
    if (contextData.goals && contextData.goals.length > 0) {
      systemPrompt += `\n**Volunteering Goals:**\n`;
      contextData.goals.forEach((goal: any) => {
        systemPrompt += `- Target: ${goal.targetHours} hours${
          goal.description ? ` (${goal.description})` : ""
        } - Current: ${goal.currentHours}h (${Math.round(goal.percentComplete)}% complete)${
          goal.remainingHours > 0 ? ` - ${goal.remainingHours}h remaining` : " ✓ Complete"
        }\n`;
      });
    }

    // Add searched organizations if found
    if (contextData.searchedOrganizations && contextData.searchedOrganizations.length > 0) {
      systemPrompt += `\n**Searched Organizations (matching query):**\n`;
      contextData.searchedOrganizations.forEach((org: any) => {
        systemPrompt += `- **${org.name}**${org.category ? ` (${org.category})` : ""}
  ${org.description ? `Description: ${org.description}\n  ` : ""}${
          org.presidentName ? `President: ${org.presidentName}\n  ` : ""
        }${org.leadership ? `Leadership: ${org.leadership}\n  ` : ""}${
          org.contactEmail ? `Contact: ${org.contactEmail}\n  ` : ""
        }Status: ${org.status}\n`;
      });
    } else if (contextData.organizations && contextData.organizations.length > 0) {
      // Show general list if no specific search
      systemPrompt += `\n**Available Organizations (${contextData.organizations.length} shown):**\n`;
      contextData.organizations.slice(0, 10).forEach((org: any) => {
        systemPrompt += `- **${org.name}**${org.presidentName ? ` - President: ${org.presidentName}` : ""}${
          org.leadership ? ` - Leadership: ${org.leadership}` : ""
        }\n`;
      });
    }

    // Add admin data if requested
    if (contextData.admin) {
      systemPrompt += `\n**Admin Analytics:**
- Total Students: ${contextData.admin.totalStudents}
- Total Activities: ${contextData.admin.totalActivities}
- Verified Activities: ${contextData.admin.verifiedActivities}
- Pending Verifications: ${contextData.admin.pendingVerifications}
- Total Volunteering Hours: ${contextData.admin.totalVolunteeringHours}
- Total Organizations: ${contextData.admin.totalOrganizations}
- Verification Rate: ${Math.round(contextData.admin.verificationRate)}%
`;
    }

    systemPrompt += `\n**Instructions:**
1. Answer questions based ONLY on the data provided above.
2. If asked about something not in the data, politely explain you don't have that information and suggest where the user can find it on the platform (e.g., "Check the Clubs Directory page" or "Visit your Activities page").
3. Be conversational, helpful, and encouraging.
4. When discussing activities, mention verification status if relevant.
5. For volunteering questions, provide specific numbers and context.
6. If asked for recommendations (e.g., "What should I aim for?"), provide general college admissions guidance based on the user's current data.
7. Keep responses concise but informative (2-4 sentences typically).
8. Use natural language, not JSON or technical formatting in your response.
9. For club/organization questions, provide the specific information requested (president name, contact, etc.).

${action ? `The user has selected the "${action}" action. Apply this to your response if relevant.` : ""}`;

    console.log("System prompt length:", systemPrompt.length);

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const answer =
      completion.choices[0]?.message?.content ||
      "I'm sorry, I couldn't generate a response.";

    return NextResponse.json({
      answer,
      citations: [],
    });
  } catch (error: any) {
    console.error("Error in assistant query:", error);

    if (error?.status === 401) {
      return NextResponse.json(
        { error: "OpenAI API key is invalid or missing" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: error?.message || "Failed to process query" },
      { status: 500 }
    );
  }
}
