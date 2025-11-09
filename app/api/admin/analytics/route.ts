import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - Get analytics data for admin dashboard
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can access this endpoint" },
        { status: 403 }
      );
    }

    // Get all activities with their categories and verification status
    const activities = await prisma.activity.findMany({
      include: {
        verification: {
          select: {
            status: true,
          },
        },
        student: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    // Calculate most common activity categories
    const categoryCounts: Record<string, number> = {};
    activities.forEach((activity) => {
      const category = activity.category || "Other";
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });

    const mostCommonCategories = Object.entries(categoryCounts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 categories

    // Calculate verified vs unverified by grade
    // Since we don't have grade in the schema, we'll group by verification status
    const verifiedCount = activities.filter(
      (activity) =>
        activity.verification?.status === "verified" ||
        activity.verification?.status === "accepted" ||
        activity.status === "verified"
    ).length;

    const unverifiedCount = activities.filter(
      (activity) =>
        !activity.verification ||
        (activity.verification.status !== "verified" &&
          activity.verification.status !== "accepted") ||
        activity.status === "pending"
    ).length;

    const deniedCount = activities.filter(
      (activity) =>
        activity.verification?.status === "denied" ||
        activity.verification?.status === "rejected" ||
        activity.status === "denied"
    ).length;

    // For now, we'll return overall stats
    // In production, you might want to extract grade from email or store it in DB
    const verificationByStatus = [
      { status: "Verified", count: verifiedCount },
      { status: "Unverified", count: unverifiedCount },
      { status: "Denied", count: deniedCount },
    ];

    return NextResponse.json({
      mostCommonCategories,
      verificationByStatus,
      totalActivities: activities.length,
      totalStudents: await prisma.user.count({ where: { role: "student" } }),
      totalVerifiers: await prisma.user.count({ where: { role: "verifier" } }),
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}

