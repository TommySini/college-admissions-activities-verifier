import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET - List participations with filtering
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      console.log("Unauthorized: No user found in GET /api/volunteering-participations");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get("studentId");
    const opportunityId = searchParams.get("opportunityId");
    const status = searchParams.get("status");
    const verified = searchParams.get("verified");

    const where: any = {};

    // Students can only see their own participations unless admin
    if (user.role !== "admin") {
      where.studentId = user.id;
    } else if (studentId) {
      where.studentId = studentId;
    }

    // Handle opportunityId filter (including null for manual logs)
    if (searchParams.has("opportunityId")) {
      const oppId = searchParams.get("opportunityId");
      if (oppId === "null" || oppId === null) {
        where.opportunityId = null;
      } else {
        where.opportunityId = oppId;
      }
    }

    if (status) {
      where.status = status;
    }

    if (verified !== null && verified !== undefined) {
      where.verified = verified === "true";
    }

    // Use raw SQL to reliably fetch participations (handles null opportunityId properly)
    const conditions: string[] = [];
    
    if (where.studentId) {
      conditions.push(`studentId = '${where.studentId.replace(/'/g, "''")}'`);
    }
    
    if (where.opportunityId !== undefined) {
      if (where.opportunityId === null) {
        conditions.push(`opportunityId IS NULL`);
      } else {
        conditions.push(`opportunityId = '${where.opportunityId.replace(/'/g, "''")}'`);
      }
    }
    
    if (where.status) {
      conditions.push(`status = '${where.status.replace(/'/g, "''")}'`);
    }
    
    if (where.verified !== undefined) {
      conditions.push(`verified = ${where.verified ? 1 : 0}`);
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const sql = `SELECT * FROM volunteering_participations ${whereClause} ORDER BY createdAt DESC`;
    
    console.log(`Fetching participations with SQL: ${sql}`);
    
    const participationsRaw = await prisma.$queryRawUnsafe<any[]>(sql);
    
    console.log(`Found ${participationsRaw.length} participations for user ${user.id}`);

    // Fetch related data separately
    const participations = await Promise.all(
      participationsRaw.map(async (p: any) => {
        try {
          const [student, activity, verifier, opportunity] = await Promise.all([
            prisma.user.findUnique({
              where: { id: p.studentId },
              select: { id: true, name: true, email: true },
            }).catch(() => null),
            p.activityId
              ? prisma.activity.findUnique({
                  where: { id: p.activityId },
                  select: { id: true, name: true, category: true },
                }).catch(() => null)
              : null,
            p.verifiedBy
              ? prisma.user.findUnique({
                  where: { id: p.verifiedBy },
                  select: { id: true, name: true, email: true },
                }).catch(() => null)
              : null,
            p.opportunityId
              ? prisma.volunteeringOpportunity.findUnique({
                  where: { id: p.opportunityId },
                  include: {
                    postedBy: {
                      select: { id: true, name: true, email: true },
                    },
                  },
                }).catch(() => null)
              : null,
          ]);

          return {
            id: p.id,
            opportunityId: p.opportunityId,
            studentId: p.studentId,
            activityId: p.activityId,
            startDate: p.startDate,
            endDate: p.endDate,
            totalHours: p.totalHours,
            hoursPerWeek: p.hoursPerWeek,
            status: p.status,
            isManualLog: p.isManualLog === 1 || p.isManualLog === true,
            organizationName: p.organizationName,
            activityName: p.activityName,
            activityDescription: p.activityDescription,
            serviceSheetUrl: p.serviceSheetUrl,
            verified: p.verified === 1 || p.verified === true,
            verifiedBy: p.verifiedBy,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
            opportunity,
            student,
            activity,
            verifier,
          };
        } catch (err) {
          console.error(`Error fetching relations for participation ${p.id}:`, err);
          // Return basic participation data even if relations fail
          return {
            id: p.id,
            opportunityId: p.opportunityId,
            studentId: p.studentId,
            activityId: p.activityId,
            startDate: p.startDate,
            endDate: p.endDate,
            totalHours: p.totalHours,
            hoursPerWeek: p.hoursPerWeek,
            status: p.status,
            isManualLog: p.isManualLog === 1 || p.isManualLog === true,
            organizationName: p.organizationName,
            activityName: p.activityName,
            activityDescription: p.activityDescription,
            serviceSheetUrl: p.serviceSheetUrl,
            verified: p.verified === 1 || p.verified === true,
            verifiedBy: p.verifiedBy,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
            opportunity: null,
            student: null,
            activity: null,
            verifier: null,
          };
        }
      })
    );

    return NextResponse.json({ participations });
  } catch (error: any) {
    console.error("Error fetching participations:", error);
    console.error("Error details:", {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    });
    return NextResponse.json(
      { 
        error: "Failed to fetch participations",
        details: process.env.NODE_ENV === "development" ? error?.message : undefined,
      },
      { status: 500 }
    );
  }
}

// POST - Create new participation (sign up for opportunity)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "student") {
      return NextResponse.json(
        { error: "Only students can participate in volunteering opportunities" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { opportunityId, startDate, totalHours, hoursPerWeek, activityId } = body;

    if (!opportunityId || !startDate || totalHours === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: opportunityId, startDate, totalHours" },
        { status: 400 }
      );
    }

    // Check if opportunity exists and is approved
    const opportunity = await prisma.volunteeringOpportunity.findUnique({
      where: { id: opportunityId },
    });

    if (!opportunity) {
      return NextResponse.json(
        { error: "Volunteering opportunity not found" },
        { status: 404 }
      );
    }

    if (opportunity.status !== "approved") {
      return NextResponse.json(
        { error: "This opportunity is not available for participation" },
        { status: 400 }
      );
    }

    // Check if student is already participating
    const existing = await prisma.volunteeringParticipation.findFirst({
      where: {
        opportunityId,
        studentId: user.id,
        status: {
          in: ["active", "completed"],
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "You are already participating in this opportunity" },
        { status: 400 }
      );
    }

    // Check max volunteers limit
    if (opportunity.maxVolunteers) {
      const currentCount = await prisma.volunteeringParticipation.count({
        where: {
          opportunityId,
          status: {
            in: ["active", "completed"],
          },
        },
      });

      if (currentCount >= opportunity.maxVolunteers) {
        return NextResponse.json(
          { error: "This opportunity has reached its maximum number of volunteers" },
          { status: 400 }
        );
      }
    }

    const participation = await prisma.volunteeringParticipation.create({
      data: {
        opportunityId,
        studentId: user.id,
        activityId: activityId || null,
        startDate: new Date(startDate),
        endDate: null,
        totalHours: parseFloat(totalHours),
        hoursPerWeek: hoursPerWeek ? parseFloat(hoursPerWeek) : null,
        status: "active",
        verified: false,
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
      },
    });

    return NextResponse.json({ participation }, { status: 201 });
  } catch (error) {
    console.error("Error creating participation:", error);
    return NextResponse.json(
      { error: "Failed to create participation" },
      { status: 500 }
    );
  }
}

