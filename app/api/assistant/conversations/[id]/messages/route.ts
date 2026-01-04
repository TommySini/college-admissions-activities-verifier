import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, RateLimitPresets } from '@/lib/rate-limit';
import { generateAssistantResponse } from '@/lib/assistant/respond';

// GET /api/assistant/conversations/[id]/messages - Get messages for a conversation
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: conversationId } = await params;

    // Verify conversation ownership
    const conversation = await prisma.assistantConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    if (conversation.ownerId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch messages
    const messages = await prisma.assistantMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        role: true,
        content: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ messages });
  } catch (error: any) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// POST /api/assistant/conversations/[id]/messages - Send a message
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Rate limiting
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

    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: conversationId } = await params;

    // Verify conversation ownership
    const conversation = await prisma.assistantConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    if (conversation.ownerId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { message, action } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Save user message
    const userMessage = await prisma.assistantMessage.create({
      data: {
        conversationId,
        role: 'user',
        content: message,
      },
    });

    // Get conversation history for context (last 10 messages)
    const previousMessages = await prisma.assistantMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        role: true,
        content: true,
      },
    });

    // Reverse to chronological order (oldest first) and exclude the current message
    const historyForContext = previousMessages
      .reverse()
      .slice(0, -1)
      .map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));

    // Generate assistant response
    const response = await generateAssistantResponse(message, user.id, action, historyForContext);

    // Save assistant message
    const assistantMessage = await prisma.assistantMessage.create({
      data: {
        conversationId,
        role: 'assistant',
        content: response.answer,
      },
    });

    // Update conversation's updatedAt timestamp
    await prisma.assistantConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      userMessage,
      assistantMessage,
      answer: response.answer,
    });
  } catch (error: any) {
    console.error('Error processing message:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process message' },
      { status: 500 }
    );
  }
}
