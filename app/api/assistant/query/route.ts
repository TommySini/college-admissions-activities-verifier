import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { getUserProfile } from "@/lib/assistant/tools";
import { listModels, describeModel } from "@/lib/assistant/runtimeModels";
import { executeGenericQuery, buildWhereClause } from "@/lib/assistant/genericQuery";
import { formatResultsForPrompt, formatModelsList, formatModelDescription } from "@/lib/assistant/format";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define tools for OpenAI function calling
const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "list_models",
      description: "List all available data models/tables in the platform that can be queried",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "describe_model",
      description: "Get detailed schema information about a specific model including its fields and types",
      parameters: {
        type: "object",
        properties: {
          model: {
            type: "string",
            description: "The name of the model to describe (e.g., 'Activity', 'Organization', 'AlumniProfile')",
          },
        },
        required: ["model"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_model",
      description: "Query a specific model with filters, field selection, and ordering. Returns actual data from the database.",
      parameters: {
        type: "object",
        properties: {
          model: {
            type: "string",
            description: "The model name to query",
          },
          filters: {
            type: "object",
            description: "Filter conditions as key-value pairs. Use 'contains' for text search, 'equals' for exact match, 'gt'/'lt' for numbers",
            additionalProperties: true,
          },
          fields: {
            type: "array",
            items: { type: "string" },
            description: "Specific fields to return (optional, returns all if not specified)",
          },
          limit: {
            type: "number",
            description: "Maximum number of records to return (max 50, default 20)",
          },
          orderBy: {
            type: "object",
            properties: {
              field: { type: "string" },
              direction: { type: "string", enum: ["asc", "desc"] },
            },
            description: "Sort order for results",
          },
        },
        required: ["model"],
      },
    },
  },
];

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

    // Get user profile for context
    const profile = await getUserProfile(user.id);

    // Build initial system prompt
    const systemPrompt = `You are Actify Assistant, a helpful AI assistant for the Actify college admissions platform.

**Current User:**
- Name: ${profile?.name}
- Role: ${profile?.role}
- Email: ${profile?.email}

**Your Capabilities:**
You have access to tools that let you query the platform's database:
- list_models: See all available data tables
- describe_model: Get schema details for a specific table
- query_model: Fetch actual data with filters

**Access Rules:**
- Students can access: their own activities/goals/participations, approved organizations, volunteering opportunities, and alumni data
- Admins can access: all data including other students' records
- Always use tools to fetch current data rather than making assumptions

**Instructions:**
1. IMPORTANT: Use tools efficiently - try to answer in 1-2 tool calls maximum
2. For clubs/organizations: query Organization model with {name: {contains: "search term"}}
3. For alumni: query AlumniProfile first, then related models if needed
4. For user's own data: query Activity, VolunteeringParticipation, or VolunteeringGoal
5. Don't call list_models or describe_model unless you truly don't know which model to use
6. Use filters to narrow results: {field: {contains: "text"}} or {field: value}
7. After getting data, synthesize an answer immediately - don't make more tool calls unless necessary
8. Keep responses concise (2-4 sentences)

${action ? `The user selected the "${action}" action - apply this if relevant.` : ""}`;

    // Start conversation with tool calling
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: message },
    ];

    let iterationCount = 0;
    const MAX_ITERATIONS = 10; // Increased from 5 to 10

    while (iterationCount < MAX_ITERATIONS) {
      iterationCount++;
      console.log(`\n=== Iteration ${iterationCount}/${MAX_ITERATIONS} ===`);

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        tools,
        tool_choice: "auto",
        temperature: 0.7,
        max_tokens: 800,
      });

      const responseMessage = completion.choices[0].message;
      messages.push(responseMessage);

      // If no tool calls, we have the final answer
      if (!responseMessage.tool_calls || responseMessage.tool_calls.length === 0) {
        console.log(`✓ Final answer generated after ${iterationCount} iterations`);
        return NextResponse.json({
          answer: responseMessage.content || "I'm sorry, I couldn't generate a response.",
          citations: [],
        });
      }

      console.log(`Tool calls requested: ${responseMessage.tool_calls.length}`);

      // Execute tool calls
      for (const toolCall of responseMessage.tool_calls) {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);

        console.log(`→ Tool call: ${functionName}`, JSON.stringify(functionArgs, null, 2));

        let toolResult: string;

        try {
          switch (functionName) {
            case "list_models":
              const models = listModels();
              toolResult = formatModelsList(models);
              break;

            case "describe_model":
              const modelDesc = describeModel(functionArgs.model);
              if (modelDesc) {
                const fieldNames = modelDesc.fields
                  .filter((f) => !f.isRelation)
                  .map((f) => f.name);
                toolResult = formatModelDescription(functionArgs.model, fieldNames);
              } else {
                toolResult = `Model '${functionArgs.model}' not found.`;
              }
              break;

            case "query_model":
              const where = functionArgs.filters ? buildWhereClause(functionArgs.filters) : undefined;
              const queryResult = await executeGenericQuery(
                {
                  model: functionArgs.model,
                  where,
                  select: functionArgs.fields,
                  limit: functionArgs.limit,
                  orderBy: functionArgs.orderBy,
                },
                user
              );

              if (queryResult.success && queryResult.data) {
                toolResult = formatResultsForPrompt(
                  queryResult.data,
                  functionArgs.model,
                  10
                );
              } else {
                toolResult = queryResult.error || "Query failed";
              }
              break;

            default:
              toolResult = `Unknown tool: ${functionName}`;
          }
        } catch (error: any) {
          console.error(`Error executing tool ${functionName}:`, error);
          toolResult = `Error: ${error.message || "Tool execution failed"}`;
        }

        // Add tool result to messages
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: toolResult,
        });
      }
    }

    // If we hit max iterations, return what we have
    return NextResponse.json({
      answer: "I apologize, but I need more iterations to complete this request. Please try rephrasing your question.",
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
