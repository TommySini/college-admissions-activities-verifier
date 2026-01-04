import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { upsertEmbedding } from '@/lib/retrieval/indexer';
import { verifyOrigin } from '@/lib/csrf';

// GET - Get activities for current user
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const activities = await prisma.activity.findMany({
      where: { studentId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ activities });
  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
  }
}

// POST - Create new activity
export async function POST(request: NextRequest) {
  try {
    // CSRF protection
    if (!verifyOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'student') {
      return NextResponse.json({ error: 'Only students can create activities' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      category,
      description,
      startDate,
      endDate,
      hoursPerWeek,
      totalHours,
      position,
      organization,
      notes,
      verifierEmail,
      attachments,
    } = body;

    if (!name || !category || !description || !startDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const activity = await prisma.activity.create({
      data: {
        studentId: user.id,
        name,
        category,
        description,
        startDate,
        endDate: endDate || undefined,
        hoursPerWeek: hoursPerWeek ? parseFloat(hoursPerWeek) : undefined,
        totalHours: totalHours ? parseFloat(totalHours) : undefined,
        role: position || undefined,
        organization: organization || undefined,
        studentNotes: notes || undefined,
        supervisorEmail: verifierEmail || undefined,
        attachments: attachments || undefined,
        status: 'pending',
      },
    });

    // Index activity for semantic search (async, don't await)
    upsertEmbedding('Activity', activity.id).catch((error) => {
      console.error(`[POST /api/activities] Failed to index activity ${activity.id}:`, error);
    });

    // Note: Email sending is now handled separately via the "Send Email" button
    // This allows users to save the activity first, then send the email when ready

    return NextResponse.json({ activity }, { status: 201 });
  } catch (error) {
    console.error('Error creating activity:', error);
    return NextResponse.json({ error: 'Failed to create activity' }, { status: 500 });
  }
}
