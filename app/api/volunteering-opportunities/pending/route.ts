import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can view pending opportunities
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const opportunities = await prisma.volunteeringOpportunity.findMany({
      where: {
        status: 'pending',
      },
      include: {
        postedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ opportunities });
  } catch (error: any) {
    console.error('Error fetching pending opportunities:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch pending opportunities' },
      { status: 500 }
    );
  }
}
