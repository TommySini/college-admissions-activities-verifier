import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch organizations that are on-campus TBS clubs and either pending or approved
    const clubs = await prisma.organization.findMany({
      where: {
        isSchoolClub: true,
        status: {
          in: ['PENDING', 'APPROVED'],
        },
      },
      orderBy: [
        { status: 'asc' }, // APPROVED comes before PENDING alphabetically
        { name: 'asc' },
      ],
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ clubs });
  } catch (error) {
    console.error('[GET /api/clubs] Error:', error);
    return NextResponse.json({ error: 'Failed to load clubs' }, { status: 500 });
  }
}
