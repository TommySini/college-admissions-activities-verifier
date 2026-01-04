import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// GET - Check for opportunities that have ended and need completion confirmation
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'student') {
      return NextResponse.json(
        { error: 'Only students can check for completion prompts' },
        { status: 403 }
      );
    }

    const now = new Date();

    // Find participations where:
    // 1. User is the student
    // 2. Status is "active"
    // 3. Opportunity has ended (endDate is in the past, or if ongoing, check startDate + some time)
    const participations = await prisma.volunteeringParticipation.findMany({
      where: {
        studentId: user.id,
        status: 'active',
        opportunity: {
          OR: [
            {
              endDate: {
                lte: now,
              },
            },
            {
              AND: [
                { isOngoing: false },
                {
                  startDate: {
                    lte: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Started more than 24 hours ago
                  },
                },
              ],
            },
          ],
        },
      },
      include: {
        opportunity: {
          select: {
            id: true,
            title: true,
            organization: true,
            endDate: true,
            isOngoing: true,
            startDate: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ participations });
  } catch (error) {
    console.error('Error checking for completions:', error);
    return NextResponse.json({ error: 'Failed to check for completions' }, { status: 500 });
  }
}
