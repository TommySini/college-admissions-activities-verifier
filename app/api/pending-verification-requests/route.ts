import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Get pending verification requests for the logged-in verifier
// These are activities where supervisorEmail matches the verifier's email
// and status is "pending" (no verification record exists yet)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only verifiers and admins can see pending requests
    if (user.role !== 'verifier' && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only verifiers can view pending requests' },
        { status: 403 }
      );
    }

    // Find activities where:
    // 1. supervisorEmail matches the verifier's email
    // 2. status is "pending"
    // 3. No verification record exists yet (or verification status is "pending")
    const pendingActivities = await prisma.activity.findMany({
      where: {
        supervisorEmail: user.email,
        status: 'pending',
        // Only include activities that don't have a verification yet, or have a pending verification
        OR: [
          {
            verification: null, // No verification record exists
          },
          {
            verification: {
              status: 'pending', // Verification exists but is still pending
            },
          },
        ],
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        verification: {
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc', // Most recent first
      },
    });

    return NextResponse.json({
      pendingRequests: pendingActivities,
      count: pendingActivities.length,
    });
  } catch (error) {
    console.error('Error fetching pending verification requests:', error);
    return NextResponse.json({ error: 'Failed to fetch pending requests' }, { status: 500 });
  }
}
