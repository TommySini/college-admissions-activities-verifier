import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { upsertEmbedding } from '@/lib/retrieval/indexer';

// GET - List participations with filtering
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.log('Unauthorized: No user found in GET /api/volunteering-participations');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get('studentId');
    const opportunityId = searchParams.get('opportunityId');
    const status = searchParams.get('status');
    const verified = searchParams.get('verified');

    const where: any = {};

    // Students can only see their own participations unless admin
    if (user.role !== 'admin') {
      where.studentId = user.id;
    } else if (studentId) {
      where.studentId = studentId;
    }

    // Handle opportunityId filter (including null for manual logs)
    if (searchParams.has('opportunityId')) {
      const oppId = searchParams.get('opportunityId');
      if (oppId === 'null' || oppId === null) {
        where.opportunityId = null;
      } else {
        where.opportunityId = oppId;
      }
    }

    if (status) {
      where.status = status;
    }

    if (verified !== null && verified !== undefined) {
      where.verified = verified === 'true';
    }

    // Use Prisma include to fetch related data in one query (no N+1)
    const participations = await prisma.volunteeringParticipation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        student: {
          select: { id: true, name: true, email: true },
        },
        activity: {
          select: { id: true, name: true, category: true },
        },
        verifier: {
          select: { id: true, name: true, email: true },
        },
        opportunity: {
          include: {
            postedBy: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    console.log(`Found ${participations.length} participations for user ${user.id}`);

    return NextResponse.json({ participations });
  } catch (error: any) {
    console.error('Error fetching participations:', error);
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    });
    return NextResponse.json(
      {
        error: 'Failed to fetch participations',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      { status: 500 }
    );
  }
}

// POST - Create new participation (sign up for opportunity)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'student') {
      return NextResponse.json(
        { error: 'Only students can participate in volunteering opportunities' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { opportunityId, startDate, totalHours, hoursPerWeek, activityId } = body;

    if (!opportunityId || !startDate || totalHours === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: opportunityId, startDate, totalHours' },
        { status: 400 }
      );
    }

    // Check if opportunity exists and is approved
    const opportunity = await prisma.volunteeringOpportunity.findUnique({
      where: { id: opportunityId },
    });

    if (!opportunity) {
      return NextResponse.json({ error: 'Volunteering opportunity not found' }, { status: 404 });
    }

    if (opportunity.status !== 'approved') {
      return NextResponse.json(
        { error: 'This opportunity is not available for participation' },
        { status: 400 }
      );
    }

    // Check if student is already participating
    const existing = await prisma.volunteeringParticipation.findFirst({
      where: {
        opportunityId,
        studentId: user.id,
        status: {
          in: ['active', 'completed'],
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'You are already participating in this opportunity' },
        { status: 400 }
      );
    }

    // Check max volunteers limit
    if (opportunity.maxVolunteers) {
      const currentCount = await prisma.volunteeringParticipation.count({
        where: {
          opportunityId,
          status: {
            in: ['active', 'completed'],
          },
        },
      });

      if (currentCount >= opportunity.maxVolunteers) {
        return NextResponse.json(
          { error: 'This opportunity has reached its maximum number of volunteers' },
          { status: 400 }
        );
      }
    }

    const participation = await prisma.volunteeringParticipation.create({
      data: {
        opportunityId,
        studentId: user.id,
        activityId: activityId || null,
        startDate: new Date(startDate),
        endDate: null,
        totalHours: parseFloat(totalHours),
        hoursPerWeek: hoursPerWeek ? parseFloat(hoursPerWeek) : null,
        status: 'active',
        verified: false,
      },
      include: {
        opportunity: {
          include: {
            postedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        activity: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
      },
    });

    // Index participation for semantic search (async, don't await)
    upsertEmbedding('VolunteeringParticipation', participation.id).catch((error) => {
      console.error(
        `[POST /api/volunteering-participations] Failed to index participation ${participation.id}:`,
        error
      );
    });

    return NextResponse.json({ participation }, { status: 201 });
  } catch (error) {
    console.error('Error creating participation:', error);
    return NextResponse.json({ error: 'Failed to create participation' }, { status: 500 });
  }
}
