import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { upsertEmbedding } from "@/lib/retrieval/indexer";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "admin" && user.role !== "teacher")) {
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

    const body = await request.json();
    const { memberIds, hours, date, description } = body;

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return NextResponse.json(
        { error: "Please select at least one member" },
        { status: 400 }
      );
    }

    if (!hours || hours <= 0) {
      return NextResponse.json(
        { error: "Hours must be greater than 0" },
        { status: 400 }
      );
    }

    if (!date) {
      return NextResponse.json(
        { error: "Date is required" },
        { status: 400 }
      );
    }

    // Verify all members exist and are students
    const members = await prisma.user.findMany({
      where: {
        id: { in: memberIds },
        role: "student",
      },
    });

    if (members.length !== memberIds.length) {
      return NextResponse.json(
        { error: "One or more members not found or are not students" },
        { status: 400 }
      );
    }

    const startDate = new Date(date);
    const endDate = new Date(date);

    // Calculate hoursPerWeek (for single day, it's just the hours)
    const hoursPerWeek = parseFloat(hours);

    // Create volunteering participations for each member
    const participations = await Promise.all(
      members.map(async (member) => {
        // Generate a unique ID for the participation
        const participationId = `cl${Date.now()}${Math.random().toString(36).substring(2, 15)}`;

        // Use raw SQL to insert the record
        await prisma.$executeRaw`
          INSERT INTO "VolunteeringParticipation" (
            id, "studentId", "opportunityId", "activityId",
            "startDate", "endDate", "totalHours", "hoursPerWeek",
            status, "isManualLog", "organizationName", "activityName",
            "activityDescription", "serviceSheetUrl", verified, "verifiedBy", "verifiedAt",
            "createdAt", "updatedAt"
          ) VALUES (
            ${participationId},
            ${member.id},
            NULL,
            NULL,
            ${startDate},
            ${endDate},
            ${parseFloat(hours)},
            ${hoursPerWeek},
            'completed',
            true,
            ${organization.name},
            ${description || `Service hours awarded by ${user.name || "admin"}`},
            ${description || `Service hours awarded for participation in ${organization.name}`},
            NULL,
            true,
            ${user.id},
            NOW(),
            NOW(),
            NOW()
          )
        `;

        // Index participation for semantic search (async, don't await)
        upsertEmbedding("VolunteeringParticipation", participationId).catch((error) => {
          console.error(`[POST /api/admin/organizations/[id]/award-hours] Failed to index participation ${participationId}:`, error);
        });

        return {
          id: participationId,
          studentId: member.id,
          studentName: member.name,
          hours: parseFloat(hours),
        };
      })
    );

    return NextResponse.json({
      success: true,
      participations,
      message: `Successfully awarded ${hours} hours to ${members.length} member(s)`,
    }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/organizations/[id]/award-hours] Error:", error);
    return NextResponse.json(
      { error: "Failed to award hours" },
      { status: 500 }
    );
  }
}

