import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// POST - Create manual log entry (past hours)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Debug: Log user role to help diagnose issues
    console.log("User attempting to log hours:", {
      id: user.id,
      email: user.email,
      role: user.role,
      roleType: typeof user.role,
    });

    // Check role (case-insensitive, trimmed)
    const userRole = (user.role || "").toString().toLowerCase().trim();
    if (userRole !== "student") {
      console.error("Role check failed:", {
        expected: "student",
        actual: userRole,
        rawRole: user.role,
      });
      return NextResponse.json(
        { 
          error: "Only students can log hours",
          debug: {
            role: user.role,
            roleType: typeof user.role,
          }
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    console.log("Received request body:", body);
    
    const {
      organizationName,
      activityName,
      activityDescription,
      startDate,
      endDate,
      totalHours,
      serviceSheetUrl,
    } = body;

    // Validate required fields
    if (!organizationName || !activityName || !activityDescription || !startDate || totalHours === undefined) {
      console.error("Validation failed - missing required fields:", {
        organizationName: !!organizationName,
        activityName: !!activityName,
        activityDescription: !!activityDescription,
        startDate: !!startDate,
        totalHours: totalHours !== undefined,
      });
      return NextResponse.json(
        { error: "Missing required fields: organizationName, activityName, activityDescription, startDate, totalHours" },
        { status: 400 }
      );
    }

    if (totalHours <= 0) {
      return NextResponse.json(
        { error: "Total hours must be greater than 0" },
        { status: 400 }
      );
    }

    // Calculate hoursPerWeek if date range provided
    let hoursPerWeek: number | null = null;
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : start;
    const daysDiff = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    const weeks = daysDiff / 7;
    if (weeks > 0) {
      hoursPerWeek = parseFloat(totalHours) / weeks;
    }

    // Prepare participation data
    // For manual logs, opportunityId must be null and we don't provide the opportunity relation
    const participationData = {
      opportunityId: null as string | null, // Explicitly null for manual logs
      studentId: user.id,
      activityId: null as string | null,
      startDate: start,
      endDate: endDate ? new Date(endDate) : null,
      totalHours: parseFloat(totalHours),
      hoursPerWeek: hoursPerWeek,
      status: "completed" as const,
      isManualLog: true,
      organizationName: organizationName.trim(),
      activityName: activityName.trim(),
      activityDescription: activityDescription.trim(),
      serviceSheetUrl: serviceSheetUrl?.trim() || null,
      verified: false,
    };

    console.log("Creating participation with data:", {
      ...participationData,
      startDate: participationData.startDate.toISOString(),
      endDate: participationData.endDate?.toISOString() || null,
    });

    // Generate a unique ID for the participation (using cuid-like format)
    // Prisma uses cuid() which generates IDs like "clxxx..." - we'll use a simple unique ID
    const participationId = `cl${Date.now()}${Math.random().toString(36).substring(2, 15)}`;

    // Use raw SQL to insert the record, bypassing Prisma relation issues with null opportunityId
    await prisma.$executeRaw`
      INSERT INTO volunteering_participations (
        id, opportunityId, studentId, activityId,
        startDate, endDate, totalHours, hoursPerWeek, status,
        isManualLog, organizationName, activityName, activityDescription,
        serviceSheetUrl, verified, createdAt, updatedAt
      ) VALUES (
        ${participationId},
        NULL,
        ${user.id},
        NULL,
        ${participationData.startDate},
        ${participationData.endDate},
        ${participationData.totalHours},
        ${participationData.hoursPerWeek},
        ${participationData.status},
        ${participationData.isManualLog ? 1 : 0},
        ${participationData.organizationName},
        ${participationData.activityName},
        ${participationData.activityDescription},
        ${participationData.serviceSheetUrl},
        ${participationData.verified ? 1 : 0},
        datetime('now'),
        datetime('now')
      )
    `;

    // Fetch the created participation using raw SQL to avoid Prisma relation issues with null opportunityId
    const participationResult = await prisma.$queryRaw<Array<{
      id: string;
      opportunityId: string | null;
      studentId: string;
      activityId: string | null;
      startDate: Date;
      endDate: Date | null;
      totalHours: number;
      hoursPerWeek: number | null;
      status: string;
      isManualLog: boolean;
      organizationName: string | null;
      activityName: string | null;
      activityDescription: string | null;
      serviceSheetUrl: string | null;
      verified: boolean;
      createdAt: Date;
      updatedAt: Date;
    }>>`
      SELECT * FROM volunteering_participations WHERE id = ${participationId}
    `;

    if (!participationResult || participationResult.length === 0) {
      throw new Error("Failed to retrieve created participation");
    }

    const participationRow = participationResult[0];

    // Fetch student info separately
    const student = await prisma.user.findUnique({
      where: { id: participationRow.studentId },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    // Format the participation object to match expected structure
    const participation = {
      ...participationRow,
      student: student || null,
      opportunity: null, // Manual logs don't have opportunities
      activity: null,
      verifier: null,
    };

    return NextResponse.json({ participation }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating manual log:", error);
    console.error("Error type:", typeof error);
    console.error("Error constructor:", error?.constructor?.name);
    console.error("Error stringified:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    
    // Extract error information
    const errorMessage = error?.message || String(error) || "Failed to log hours";
    const errorCode = error?.code;
    const errorMeta = error?.meta;
    const errorStack = error?.stack;
    
    // Log full error details
    console.error("Error details:", {
      message: errorMessage,
      code: errorCode,
      meta: errorMeta,
      stack: errorStack,
      fullError: error,
    });
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: {
          message: errorMessage,
          code: errorCode || "UNKNOWN",
          meta: errorMeta,
          type: error?.constructor?.name || typeof error,
        },
      },
      { status: 500 }
    );
  }
}

