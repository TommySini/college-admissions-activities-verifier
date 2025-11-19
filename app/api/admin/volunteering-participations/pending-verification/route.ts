import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - Get all unverified manual log entries for admin verification
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "admin" && user.role !== "teacher")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get("studentId");
    const limit = parseInt(searchParams.get("limit") || "50");

    // Find all manual logs that are not verified
    const where: any = {
      isManualLog: true,
      verified: false,
    };

    if (studentId) {
      where.studentId = studentId;
    }

    const participations = await prisma.volunteeringParticipation.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
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
      orderBy: {
        createdAt: "desc", // Most recent first
      },
      take: limit,
    });

    return NextResponse.json({
      participations,
      count: participations.length,
    });
  } catch (error) {
    console.error("[GET /api/admin/volunteering-participations/pending-verification] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch pending verifications" },
      { status: 500 }
    );
  }
}

