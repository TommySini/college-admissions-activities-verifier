import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Get verifications for current user
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let verifications;

    if (user.role === 'verifier' || user.role === 'admin') {
      // Verifiers see verifications they've issued
      verifications = await prisma.verification.findMany({
        where: { verifierId: user.id },
        select: {
          id: true,
          activityId: true,
          status: true,
          verifierNotes: true,
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
        orderBy: { createdAt: 'desc' },
      });
    } else {
      // Students see verifications sent to them
      verifications = await prisma.verification.findMany({
        where: {
          studentId: user.id,
        },
        select: {
          id: true,
          activityId: true,
          status: true,
          verifierNotes: true,
          verifier: {
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
        orderBy: { createdAt: 'desc' },
      });
    }

    return NextResponse.json({ verifications });
  } catch (error) {
    console.error('Error fetching verifications:', error);
    return NextResponse.json({ error: 'Failed to fetch verifications' }, { status: 500 });
  }
}

// POST - Create new verification
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'verifier' && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only verifiers can create verifications' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { studentEmail, title, description, startDate, endDate, position, category } = body;

    if (!studentEmail || !title || !startDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Try to find student by email
    const student = await prisma.user.findUnique({
      where: { email: studentEmail },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found with that email' }, { status: 404 });
    }

    // Create an activity for this verification
    const activity = await prisma.activity.create({
      data: {
        studentId: student.id,
        name: title,
        category: category || 'Other',
        description: description || '',
        role: position,
        startDate,
        endDate: endDate || undefined,
        status: 'pending',
      },
    });

    // Create verification linked to the activity
    const verification = await prisma.verification.create({
      data: {
        activityId: activity.id,
        verifierId: user.id,
        studentId: student.id,
        status: 'pending',
        verifierNotes: description || undefined,
      },
      include: {
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

    return NextResponse.json({ verification }, { status: 201 });
  } catch (error) {
    console.error('Error creating verification:', error);
    return NextResponse.json({ error: 'Failed to create verification' }, { status: 500 });
  }
}
