import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - Check if current user is a member of an organization
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
    
    // Verify the organization exists
    const organization = await prisma.organization.findUnique({
      where: { id },
    });

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Students can only check membership for approved organizations
    if (user.role === "student" && organization.status !== "APPROVED") {
      return NextResponse.json({ error: "Organization not available" }, { status: 403 });
    }

    // Get members from Settings table
    const membersSetting = await prisma.settings.findUnique({
      where: { key: `organization_members_${id}` },
    });

    const memberIds = membersSetting?.value ? JSON.parse(membersSetting.value) : [];
    const isMember = memberIds.includes(user.id);

    // Get member role if they're a member
    let roles: string[] = [];
    if (isMember) {
      const rolesSetting = await prisma.settings.findUnique({
        where: { key: `organization_member_roles_${id}_${user.id}` },
      });
      roles = rolesSetting?.value ? JSON.parse(rolesSetting.value) : [];
    }

    return NextResponse.json({
      isMember,
      roles,
      organization: {
        id: organization.id,
        name: organization.name,
        status: organization.status,
      },
    });
  } catch (error) {
    console.error("[GET /api/organizations/[id]/membership] Error:", error);
    return NextResponse.json(
      { error: "Failed to check membership" },
      { status: 500 }
    );
  }
}

