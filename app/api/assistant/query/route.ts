import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { buildUserContext } from "@/lib/assistant/tools";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

    // Build context from user data
    const context = await buildUserContext(user);

    // Build system prompt with user context
    const systemPrompt = `You are Actify Assistant, a helpful AI assistant for the Actify college admissions activity verification platform.

You have access to the following data about the current user:

**User Profile:**
- Name: ${context.profile?.name}
- Email: ${context.profile?.email}
- Role: ${context.profile?.role}
${context.profile?.alumniProfile ? `- Intended Major: ${context.profile.alumniProfile.intendedMajor || "Not specified"}` : ""}

**Activities (${context.activities.length} total):**
${JSON.stringify(context.activities, null, 2)}

**Volunteering Statistics:**
- Total Hours: ${context.volunteering.totalHours}
- Verified Hours: ${context.volunteering.verifiedHours}
- Unverified Hours: ${context.volunteering.unverifiedHours}
- Recent Hours (last 6 months): ${context.volunteering.recentHours}
- Total Participations: ${context.volunteering.participationCount}
- Categories: ${JSON.stringify(context.volunteering.categories, null, 2)}
- Recent Activities: ${JSON.stringify(context.volunteering.recentActivities, null, 2)}

**Volunteering Goals:**
${JSON.stringify(context.goals, null, 2)}

${context.admin ? `**Admin Analytics:**
${JSON.stringify(context.admin, null, 2)}` : ""}

**Instructions:**
1. Answer questions based ONLY on the data provided above.
2. If asked about something not in the data, politely explain you don't have that information and suggest what the user can do on the platform.
3. Be conversational, helpful, and encouraging.
4. When discussing activities, mention verification status if relevant.
5. For volunteering questions, provide specific numbers and context.
6. If asked for recommendations (e.g., "What should I aim for?"), provide general college admissions guidance based on the user's current data.
7. Keep responses concise but informative.
8. Use markdown formatting for better readability when appropriate.

${action ? `The user has selected the "${action}" action. Apply this to your response if relevant.` : ""}`;

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      temperature: 0.7,
      max_tokens: 800,
    });

    const answer = completion.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";

    return NextResponse.json({
      answer,
      citations: [], // Can be extended later for specific data references
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

