import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can reject opportunities
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const opportunity = await prisma.volunteeringOpportunity.update({
      where: { id },
      data: {
        status: 'rejected',
        approvedById: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      opportunity,
    });
  } catch (error: any) {
    console.error('Error rejecting opportunity:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reject opportunity' },
      { status: 500 }
    );
  }
}
