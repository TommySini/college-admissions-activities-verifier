import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "admin" && user.role !== "teacher")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    
    // Verify the organization exists and user has access
    const organization = await prisma.organization.findUnique({
      where: { id },
    });

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Get members from Settings table
    const membersSetting = await prisma.settings.findUnique({
      where: { key: `organization_members_${id}` },
    });

    const memberIds = membersSetting?.value ? JSON.parse(membersSetting.value) : [];
    
    if (memberIds.length === 0) {
      return NextResponse.json({ members: [] });
    }

    // Get member details
    const members = await prisma.user.findMany({
      where: {
        id: { in: memberIds },
        role: "student",
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    });

    // Get roles for each member
    const membersWithRoles = await Promise.all(
      members.map(async (member) => {
        const rolesSetting = await prisma.settings.findUnique({
          where: { key: `organization_member_roles_${id}_${member.id}` },
        });
        const roles = rolesSetting?.value ? JSON.parse(rolesSetting.value) : [];
        return { ...member, roles };
      })
    );

    return NextResponse.json({ members: membersWithRoles });
  } catch (error) {
    console.error("[GET /api/admin/organizations/[id]/members] Error:", error);
    return NextResponse.json(
      { error: "Failed to load members" },
      { status: 500 }
    );
  }
}


