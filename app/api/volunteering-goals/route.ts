import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getToken } from 'next-auth/jwt';

// GET - Get goals for current user or specific student (if admin)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get('studentId');

    const where: any = {};

    // Students can only see their own goals unless admin
    if (user.role !== 'admin') {
      where.studentId = user.id;
    } else if (studentId) {
      where.studentId = studentId;
    }

    const goals = await prisma.volunteeringGoal.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ goals });
  } catch (error) {
    console.error('Error fetching goals:', error);
    return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 });
  }
}

// POST - Create new goal
export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/volunteering-goals - Attempting to get current user');
    let user = await getCurrentUser();
    console.log(
      'POST /api/volunteering-goals - User:',
      user ? { id: user.id, email: user.email, role: user.role } : 'null'
    );

    // Fallback to decoding the NextAuth JWT token if getCurrentUser fails
    if (!user) {
      console.log(
        'POST /api/volunteering-goals - No user from getCurrentUser, attempting token fallback'
      );
      try {
        const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
        console.log(
          'POST /api/volunteering-goals - Token:',
          token ? { email: token.email, id: token.sub, role: token.role } : 'null'
        );
        if (token?.email) {
          user = await prisma.user.upsert({
            where: { email: token.email },
            update: {
              name: token.name || '',
              role: (token.role as string) || 'student',
            },
            create: {
              email: token.email,
              name: token.name || '',
              role: (token.role as string) || 'student',
            },
          });
          console.log(
            'POST /api/volunteering-goals - User from token/upsert:',
            user ? { id: user.id, email: user.email, role: user.role } : 'null'
          );
        }
      } catch (tokenError) {
        console.error('POST /api/volunteering-goals - Error decoding token:', tokenError);
      }
    }

    if (!user) {
      console.log('POST /api/volunteering-goals - Unauthorized: No user found after fallback');
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Please sign in to create a goal',
        },
        { status: 401 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { studentId, targetHours, targetDate, description, goalType } = body;

    if (!targetHours || targetHours <= 0) {
      return NextResponse.json({ error: 'Target hours must be greater than 0' }, { status: 400 });
    }

    // Determine student ID
    let finalStudentId = studentId;
    if (user.role === 'student') {
      // Students can only create goals for themselves
      finalStudentId = user.id;
    } else if (!studentId) {
      return NextResponse.json({ error: 'studentId is required' }, { status: 400 });
    }

    // Verify student exists
    const student = await prisma.user.findUnique({
      where: { id: finalStudentId },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const goal = await prisma.volunteeringGoal.create({
      data: {
        studentId: finalStudentId,
        createdById: user.id,
        targetHours: parseFloat(targetHours),
        targetDate: targetDate ? new Date(targetDate) : null,
        description: description || null,
        goalType: goalType || (user.role === 'admin' ? 'admin_assigned' : 'personal'),
        status: 'active',
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({ goal }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating goal:', error);
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    });

    let errorMessage = 'Failed to create goal';
    if (error?.message) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details:
          process.env.NODE_ENV === 'development'
            ? {
                message: error?.message,
                code: error?.code,
              }
            : undefined,
      },
      { status: 500 }
    );
  }
}
