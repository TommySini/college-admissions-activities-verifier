import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH - Update organization details (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "admin" && user.role !== "teacher")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Check if organization exists
    const existing = await prisma.organization.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.description !== undefined) updateData.description = body.description?.trim() || null;
    if (body.category !== undefined) updateData.category = body.category?.trim() || null;
    if (body.leadership !== undefined) updateData.leadership = body.leadership?.trim() || null;
    if (body.presidentName !== undefined) updateData.presidentName = body.presidentName?.trim() || null;
    if (body.contactEmail !== undefined) updateData.contactEmail = body.contactEmail?.trim() || null;
    if (body.isSchoolClub !== undefined) updateData.isSchoolClub = Boolean(body.isSchoolClub);
    
    // Only admins can change status
    if (body.status !== undefined && user.role === "admin") {
      updateData.status = body.status;
    }

    const organization = await prisma.organization.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ organization });
  } catch (error) {
    console.error("[PATCH /api/admin/organizations/[id]] Error:", error);
    return NextResponse.json(
      { error: "Failed to update organization" },
      { status: 500 }
    );
  }
}

