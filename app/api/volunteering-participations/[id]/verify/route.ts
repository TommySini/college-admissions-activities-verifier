import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// POST - Verify participation (admin/verifier only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only admins can verify participations" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { verified, verificationNotes } = body;

    const participation = await prisma.volunteeringParticipation.findUnique({
      where: { id },
    });

    if (!participation) {
      return NextResponse.json(
        { error: "Participation not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.volunteeringParticipation.update({
      where: { id },
      data: {
        verified: verified !== undefined ? verified : true,
        verifiedBy: verified !== false ? user.id : null,
        verifiedAt: verified !== false ? new Date() : null,
        verificationNotes: verificationNotes || null,
      },
      include: {
        opportunity: {
          include: {
            postedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
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
        verifier: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // If linked to an activity, update activity status
    if (updated.activityId && verified !== false) {
      await prisma.activity.update({
        where: { id: updated.activityId },
        data: {
          status: "verified",
        },
      });
    }

    return NextResponse.json({ participation: updated });
  } catch (error) {
    console.error("Error verifying participation:", error);
    return NextResponse.json(
      { error: "Failed to verify participation" },
      { status: 500 }
    );
  }
}

