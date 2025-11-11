import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET - Get single participation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const participation = await prisma.volunteeringParticipation.findUnique({
      where: { id },
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
            organizationRef: {
              select: {
                id: true,
                name: true,
                status: true,
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
            description: true,
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

    if (!participation) {
      return NextResponse.json(
        { error: "Participation not found" },
        { status: 404 }
      );
    }

    // Students can only see their own participations
    if (user.role !== "admin" && participation.studentId !== user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    return NextResponse.json({ participation });
  } catch (error) {
    console.error("Error fetching participation:", error);
    return NextResponse.json(
      { error: "Failed to fetch participation" },
      { status: 500 }
    );
  }
}

// PATCH - Update participation
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.volunteeringParticipation.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Participation not found" },
        { status: 404 }
      );
    }

    // Students can only update their own participations
    if (user.role !== "admin" && existing.studentId !== user.id) {
      return NextResponse.json(
        { error: "Forbidden: You can only update your own participations" },
        { status: 403 }
      );
    }

    const updateData: any = {};
    if (body.startDate !== undefined) updateData.startDate = new Date(body.startDate);
    if (body.endDate !== undefined) updateData.endDate = body.endDate ? new Date(body.endDate) : null;
    if (body.totalHours !== undefined) updateData.totalHours = parseFloat(body.totalHours);
    if (body.hoursPerWeek !== undefined) updateData.hoursPerWeek = body.hoursPerWeek ? parseFloat(body.hoursPerWeek) : null;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.activityId !== undefined) updateData.activityId = body.activityId || null;
    if (body.serviceSheetUrl !== undefined) updateData.serviceSheetUrl = body.serviceSheetUrl || null;
    if (body.organizationName !== undefined) updateData.organizationName = body.organizationName || null;
    if (body.activityName !== undefined) updateData.activityName = body.activityName || null;
    if (body.activityDescription !== undefined) updateData.activityDescription = body.activityDescription || null;

    const participation = await prisma.volunteeringParticipation.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json({ participation });
  } catch (error) {
    console.error("Error updating participation:", error);
    return NextResponse.json(
      { error: "Failed to update participation" },
      { status: 500 }
    );
  }
}

// DELETE - Delete participation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.volunteeringParticipation.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Participation not found" },
        { status: 404 }
      );
    }

    // Students can only delete their own participations
    if (user.role !== "admin" && existing.studentId !== user.id) {
      return NextResponse.json(
        { error: "Forbidden: You can only delete your own participations" },
        { status: 403 }
      );
    }

    await prisma.volunteeringParticipation.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting participation:", error);
    return NextResponse.json(
      { error: "Failed to delete participation" },
      { status: 500 }
    );
  }
}

