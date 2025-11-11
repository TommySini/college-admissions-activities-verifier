import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// POST - Approve volunteering opportunity (admin only)
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
        { error: "Forbidden: Only admins can approve opportunities" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const opportunity = await prisma.volunteeringOpportunity.findUnique({
      where: { id },
    });

    if (!opportunity) {
      return NextResponse.json(
        { error: "Volunteering opportunity not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.volunteeringOpportunity.update({
      where: { id },
      data: {
        status: "approved",
        approvedById: user.id,
      },
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
      },
    });

    return NextResponse.json({ opportunity: updated });
  } catch (error) {
    console.error("Error approving volunteering opportunity:", error);
    return NextResponse.json(
      { error: "Failed to approve volunteering opportunity" },
      { status: 500 }
    );
  }
}

