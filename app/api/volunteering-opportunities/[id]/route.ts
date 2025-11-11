import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET - Get single volunteering opportunity
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    const opportunity = await prisma.volunteeringOpportunity.findUnique({
      where: { id },
      include: {
        postedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        approvedBy: {
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
            description: true,
            status: true,
          },
        },
        participations: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        _count: {
          select: {
            participations: true,
          },
        },
      },
    });

    if (!opportunity) {
      return NextResponse.json(
        { error: "Volunteering opportunity not found" },
        { status: 404 }
      );
    }

    // Non-admins can only see approved opportunities
    if (!user || user.role !== "admin") {
      if (opportunity.status !== "approved") {
        return NextResponse.json(
          { error: "Volunteering opportunity not found" },
          { status: 404 }
        );
      }
    }

    return NextResponse.json({ opportunity });
  } catch (error) {
    console.error("Error fetching volunteering opportunity:", error);
    return NextResponse.json(
      { error: "Failed to fetch volunteering opportunity" },
      { status: 500 }
    );
  }
}

// PATCH - Update volunteering opportunity
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

    // Check if opportunity exists and user has permission
    const existing = await prisma.volunteeringOpportunity.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Volunteering opportunity not found" },
        { status: 404 }
      );
    }

    // Only poster or admin can update
    if (existing.postedById !== user.id && user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: You can only update your own opportunities" },
        { status: 403 }
      );
    }

    // Prepare update data
    const updateData: any = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.organization !== undefined) updateData.organization = body.organization;
    if (body.organizationId !== undefined) updateData.organizationId = body.organizationId || null;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.location !== undefined) updateData.location = body.location || null;
    if (body.isOnline !== undefined) updateData.isOnline = body.isOnline;
    if (body.contactEmail !== undefined) updateData.contactEmail = body.contactEmail || null;
    if (body.contactPhone !== undefined) updateData.contactPhone = body.contactPhone || null;
    if (body.website !== undefined) updateData.website = body.website || null;
    if (body.startDate !== undefined) updateData.startDate = new Date(body.startDate);
    if (body.endDate !== undefined) updateData.endDate = body.endDate ? new Date(body.endDate) : null;
    if (body.isOngoing !== undefined) updateData.isOngoing = body.isOngoing;
    if (body.hoursPerSession !== undefined) updateData.hoursPerSession = body.hoursPerSession ? parseFloat(body.hoursPerSession) : null;
    if (body.totalHours !== undefined) updateData.totalHours = body.totalHours ? parseFloat(body.totalHours) : null;
    if (body.commitmentLevel !== undefined) updateData.commitmentLevel = body.commitmentLevel || null;
    if (body.ageRequirement !== undefined) updateData.ageRequirement = body.ageRequirement || null;
    if (body.skillsRequired !== undefined) updateData.skillsRequired = body.skillsRequired || null;
    if (body.maxVolunteers !== undefined) updateData.maxVolunteers = body.maxVolunteers ? parseInt(body.maxVolunteers) : null;

    // If status is being changed, only admin can do it
    if (body.status !== undefined && user.role === "admin") {
      updateData.status = body.status;
      if (body.status === "approved" && !existing.approvedById) {
        updateData.approvedById = user.id;
      }
    }

    const opportunity = await prisma.volunteeringOpportunity.update({
      where: { id },
      data: updateData,
      include: {
        postedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        approvedBy: {
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
    });

    return NextResponse.json({ opportunity });
  } catch (error) {
    console.error("Error updating volunteering opportunity:", error);
    return NextResponse.json(
      { error: "Failed to update volunteering opportunity" },
      { status: 500 }
    );
  }
}

// DELETE - Delete volunteering opportunity
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

    const existing = await prisma.volunteeringOpportunity.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Volunteering opportunity not found" },
        { status: 404 }
      );
    }

    // Only poster or admin can delete
    if (existing.postedById !== user.id && user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: You can only delete your own opportunities" },
        { status: 403 }
      );
    }

    await prisma.volunteeringOpportunity.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting volunteering opportunity:", error);
    return NextResponse.json(
      { error: "Failed to delete volunteering opportunity" },
      { status: 500 }
    );
  }
}

