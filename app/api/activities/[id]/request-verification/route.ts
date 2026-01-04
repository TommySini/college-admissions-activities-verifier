import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST - Request verification from an organization
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { organizationEmail } = body;

    if (!organizationEmail) {
      return NextResponse.json({ error: 'Organization email is required' }, { status: 400 });
    }

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

    // Find verifier by email
    const verifier = await prisma.user.findUnique({
      where: { email: organizationEmail },
    });

    if (!verifier) {
      return NextResponse.json({ error: 'Verifier not found with that email' }, { status: 404 });
    }

    // Check if verification already exists for this activity
    const existingVerification = await prisma.verification.findUnique({
      where: { activityId: id },
    });

    if (existingVerification) {
      return NextResponse.json(
        { error: 'Verification request already exists for this activity' },
        { status: 400 }
      );
    }

    // Create verification request
    const verification = await prisma.verification.create({
      data: {
        verifierId: verifier.id,
        studentId: user.id,
        activityId: activity.id,
        status: 'pending',
      },
    });

    return NextResponse.json(
      { message: 'Verification request sent', verification },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error requesting verification:', error);
    return NextResponse.json({ error: 'Failed to request verification' }, { status: 500 });
  }
}
