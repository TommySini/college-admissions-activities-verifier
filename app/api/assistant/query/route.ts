import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { getUserProfile } from '@/lib/assistant/tools';
import { listModels, describeModel } from '@/lib/assistant/runtimeModels';
import { executeGenericQuery, buildWhereClause } from '@/lib/assistant/genericQuery';
import {
  formatResultsForPrompt,
  formatModelsList,
  formatModelDescription,
} from '@/lib/assistant/format';
import { semanticSearch, formatSearchResults } from '@/lib/retrieval/search';
import { checkRateLimit, RateLimitPresets } from '@/lib/rate-limit';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define tools for OpenAI function calling
const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'list_models',
      description: 'List all available data models/tables in the platform that can be queried',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'describe_model',
      description:
        'Get detailed schema information about a specific model including its fields and types',
      parameters: {
        type: 'object',
        properties: {
          model: {
            type: 'string',
            description:
              "The name of the model to describe (e.g., 'Activity', 'Organization', 'AlumniProfile')",
          },
        },
        required: ['model'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'query_model',
      description:
        'Query a specific model with filters, field selection, and ordering. Returns actual data from the database.',
      parameters: {
        type: 'object',
        properties: {
          model: {
            type: 'string',
            description: 'The model name to query',
          },
          filters: {
            type: 'object',
            description:
              "Filter conditions as key-value pairs. Use 'contains' for text search, 'equals' for exact match, 'gt'/'lt' for numbers",
            additionalProperties: true,
          },
          fields: {
            type: 'array',
            items: { type: 'string' },
            description: 'Specific fields to return (optional, returns all if not specified)',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of records to return (max 50, default 20)',
          },
          orderBy: {
            type: 'object',
            properties: {
              field: { type: 'string' },
              direction: { type: 'string', enum: ['asc', 'desc'] },
            },
            description: 'Sort order for results',
          },
        },
        required: ['model'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'semantic_search',
      description:
        "Semantic search over platform text (essays, activities, organizations, opportunities). Use this for fuzzy/conceptual queries like 'find alumni who mention robotics' or 'clubs related to community service'. Privacy-aware and respects user permissions.",
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query (natural language)',
          },
          scope: {
            type: 'array',
            items: { type: 'string' },
            description:
              "Optional: specific models to search (e.g., ['ExtractedEssay', 'Organization']). If omitted, searches all supported models.",
          },
          topK: {
            type: 'number',
            description: 'Number of results to return (default 10, max 20)',
          },
        },
        required: ['query'],
      },
    },
  },
];

type DescribeModelArgs = { model: string };
type QueryModelArgs = {
  model: string;
  filters?: Record<string, unknown>;
  fields?: string[];
  limit?: number;
  orderBy?: { field: string; direction: 'asc' | 'desc' };
};
type SemanticSearchArgs = {
  query: string;
  scope?: string[];
  topK?: number;
};

export async function POST(request: NextRequest) {
  try {
    // Rate limiting for AI assistant (expensive)
    const rateLimit = checkRateLimit(request, RateLimitPresets.ai);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'Retry-After': Math.ceil((rateLimit.resetAt - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { message, action } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
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
- query_model: Fetch actual data with filters (exact/structured queries)
- semantic_search: Search by meaning/concepts across essays, activities, organizations (fuzzy/semantic queries)

**Access Rules:**
- Students can access their own data and approved public content
- Admins have full access to all platform data
- Alumni data respects privacy settings (ANONYMOUS, PSEUDONYM, FULL)
- Always use tools to fetch current data rather than making assumptions

**CRITICAL Instructions:**
1. **ANSWER IN 1 TOOL CALL**: For most questions, use semantic_search ONCE and answer immediately
2. **NO EXPLORATION**: Don't call list_models or describe_model unless absolutely necessary
3. **IMMEDIATE SYNTHESIS**: After getting search results, answer the question - don't make additional calls
4. For questions about specific activities, organizations, or alumni: use semantic_search with the query text
5. For questions about "my" data: use query_model with appropriate filters
6. Keep responses concise (2-4 sentences)
7. If semantic_search returns results, ANSWER IMMEDIATELY - don't query for more details

**Example Flow:**
User: "Tell me about weeklytheta"
You: Call semantic_search("weeklytheta") → Get results → Answer immediately with what you found

${action ? `The user selected the "${action}" action - apply this if relevant.` : ''}`;

    // Start conversation with tool calling
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message },
    ];

    let iterationCount = 0;
    const MAX_ITERATIONS = 15; // Increased to handle edge cases

    while (iterationCount < MAX_ITERATIONS) {
      iterationCount++;
      console.log(`\n=== Iteration ${iterationCount}/${MAX_ITERATIONS} ===`);

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        tools,
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 1000, // Increased for fuller responses
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
        if (toolCall.type !== 'function') continue;
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;

        console.log(`→ Tool call: ${functionName}`, JSON.stringify(functionArgs, null, 2));

        let toolResult: string;

        try {
          switch (functionName) {
            case 'list_models': {
              const models = listModels();
              toolResult = formatModelsList(models);
              break;
            }

            case 'describe_model': {
              const { model } = functionArgs as DescribeModelArgs;
              const modelDesc = describeModel(model);
              if (modelDesc) {
                const fieldNames = modelDesc.fields.filter((f) => !f.isRelation).map((f) => f.name);
                toolResult = formatModelDescription(model, fieldNames);
              } else {
                toolResult = `Model '${model}' not found.`;
              }
              break;
            }

            case 'query_model': {
              const { model, filters, fields, limit, orderBy } = functionArgs as QueryModelArgs;
              const where = filters ? buildWhereClause(filters) : undefined;
              const queryResult = await executeGenericQuery(
                {
                  model,
                  where,
                  select: fields,
                  limit,
                  orderBy,
                },
                user
              );

              if (queryResult.success && queryResult.data) {
                toolResult = formatResultsForPrompt(queryResult.data, model, 10);
              } else {
                toolResult = queryResult.error || 'Query failed';
              }
              break;
            }

            case 'semantic_search': {
              const { query, scope, topK } = functionArgs as SemanticSearchArgs;
              const searchResult = await semanticSearch({
                query,
                models: scope,
                user,
                topK: Math.min(topK || 10, 20),
              });

              if (searchResult.matches.length > 0) {
                toolResult = formatSearchResults(searchResult.matches);
              } else {
                toolResult = 'No relevant results found for your search.';
              }
              break;
            }

            default:
              toolResult = `Unknown tool: ${functionName}`;
          }
        } catch (error) {
          console.error(`Error executing tool ${functionName}:`, error);
          const message = error instanceof Error ? error.message : 'Tool execution failed';
          toolResult = `Error: ${message}`;
        }

        // Add tool result to messages
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: toolResult,
        });
      }
    }

    // If we hit max iterations, return what we have
    return NextResponse.json({
      answer:
        'I apologize, but I need more iterations to complete this request. Please try rephrasing your question.',
      citations: [],
    });
  } catch (error) {
    console.error('Error in assistant query:', error);

    if (error && typeof error === 'object' && 'status' in error && error.status === 401) {
      return NextResponse.json({ error: 'OpenAI API key is invalid or missing' }, { status: 500 });
    }

    const message = error instanceof Error ? error.message : 'Failed to process query';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
