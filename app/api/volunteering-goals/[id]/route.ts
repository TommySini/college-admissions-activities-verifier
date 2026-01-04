import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// PATCH - Update goal
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.volunteeringGoal.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    // Students can only update their own goals
    if (user.role !== 'admin' && existing.studentId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You can only update your own goals' },
        { status: 403 }
      );
    }

    const updateData: any = {};
    if (body.targetHours !== undefined) updateData.targetHours = parseFloat(body.targetHours);
    if (body.targetDate !== undefined)
      updateData.targetDate = body.targetDate ? new Date(body.targetDate) : null;
    if (body.description !== undefined) updateData.description = body.description || null;
    if (body.status !== undefined) {
      updateData.status = body.status;
      if (body.status === 'completed') {
        updateData.completedAt = new Date();
      }
    }

    const goal = await prisma.volunteeringGoal.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json({ goal });
  } catch (error) {
    console.error('Error updating goal:', error);
    return NextResponse.json({ error: 'Failed to update goal' }, { status: 500 });
  }
}

// DELETE - Delete goal
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.volunteeringGoal.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    // Students can only delete their own goals
    if (user.role !== 'admin' && existing.studentId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You can only delete your own goals' },
        { status: 403 }
      );
    }

    await prisma.volunteeringGoal.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting goal:', error);
    return NextResponse.json({ error: 'Failed to delete goal' }, { status: 500 });
  }
}
