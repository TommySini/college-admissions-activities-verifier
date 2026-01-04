import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { upsertEmbedding, deleteEmbedding } from '@/lib/retrieval/indexer';

// PATCH - Update activity
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Check if activity belongs to user
    const activity = await prisma.activity.findUnique({
      where: { id },
    });

    if (!activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    if (activity.studentId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Map form fields to schema fields
    const updateData: any = {};
    if (body.name) updateData.name = body.name;
    if (body.category) updateData.category = body.category;
    if (body.description) updateData.description = body.description;
    if (body.startDate) updateData.startDate = body.startDate;
    if (body.endDate !== undefined) updateData.endDate = body.endDate;
    if (body.hoursPerWeek !== undefined) updateData.hoursPerWeek = body.hoursPerWeek;
    if (body.totalHours !== undefined) updateData.totalHours = body.totalHours;
    if (body.position !== undefined) updateData.role = body.position;
    if (body.organization !== undefined) updateData.organization = body.organization;
    if (body.notes !== undefined) updateData.studentNotes = body.notes;
    if (body.verifierEmail !== undefined) updateData.supervisorEmail = body.verifierEmail;
    if (body.attachments !== undefined) updateData.attachments = body.attachments;

    const updated = await prisma.activity.update({
      where: { id },
      data: updateData,
    });

    // Re-index activity for semantic search (async, don't await)
    upsertEmbedding('Activity', updated.id).catch((error) => {
      console.error(`[PATCH /api/activities/${id}] Failed to re-index activity:`, error);
    });

    return NextResponse.json({ activity: updated });
  } catch (error) {
    console.error('Error updating activity:', error);
    return NextResponse.json({ error: 'Failed to update activity' }, { status: 500 });
  }
}

// DELETE - Delete activity
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

    // Check if activity belongs to user
    const activity = await prisma.activity.findUnique({
      where: { id },
    });

    if (!activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    if (activity.studentId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await prisma.activity.delete({
      where: { id },
    });

    // Delete embedding for semantic search (async, don't await)
    deleteEmbedding('Activity', id).catch((error) => {
      console.error(`[DELETE /api/activities/${id}] Failed to delete embedding:`, error);
    });

    return NextResponse.json({ message: 'Activity deleted' });
  } catch (error) {
    console.error('Error deleting activity:', error);
    return NextResponse.json({ error: 'Failed to delete activity' }, { status: 500 });
  }
}
