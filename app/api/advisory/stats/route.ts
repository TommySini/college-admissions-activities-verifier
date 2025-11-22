import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { flattenGroupStudentIds, loadAdvisorGroups } from "@/lib/advisory-groups";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "admin" && user.role !== "teacher") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const groups = await loadAdvisorGroups(prisma, user.id);
    const studentIds = flattenGroupStudentIds(groups);

    if (studentIds.length === 0) {
      return NextResponse.json(buildEmptyStats());
    }

    const activities = await prisma.activity.findMany({
      where: { studentId: { in: studentIds } },
      select: { id: true, studentId: true, status: true, totalHours: true, createdAt: true },
    });

    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const totalActivities = activities.length;
    let verifiedActivities = 0;
    let pendingActivities = 0;
    let recentActivities = 0;
    let serviceHours30d = 0;
    const studentsWithRecent = new Set<string>();

    for (const activity of activities) {
      const status = (activity.status ?? "").toLowerCase();
      if (status === "verified") verifiedActivities += 1;
      if (status === "pending") pendingActivities += 1;

      const createdAt = activity.createdAt ? new Date(activity.createdAt) : null;
      if (createdAt && createdAt >= thirtyDaysAgo) {
        recentActivities += 1;
        if (activity.studentId) {
          studentsWithRecent.add(activity.studentId);
        }
        serviceHours30d += Number(activity.totalHours) || 0;
      }
    }

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const activityTrend: { month: string; value: number }[] = [];
    const hoursTrend: { month: string; value: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

      const inRange = activities.filter((activity) => {
        const createdAt = activity.createdAt ? new Date(activity.createdAt) : null;
        return createdAt && createdAt >= monthStart && createdAt <= monthEnd;
      });

      activityTrend.push({
        month: monthNames[date.getMonth()],
        value: inRange.length,
      });

      const hours = inRange.reduce((sum, activity) => sum + (Number(activity.totalHours) || 0), 0);
      hoursTrend.push({
        month: monthNames[date.getMonth()],
        value: Math.round(hours),
      });
    }

    const stats = {
      studentCount: studentIds.length,
      totalActivities,
      verifiedActivities,
      pendingActivities,
      recentActivities,
      serviceHours30d: Math.round(serviceHours30d),
      studentsWithRecent: studentsWithRecent.size,
      activityTrend,
      hoursTrend,
    };

    return NextResponse.json({ stats });
  } catch (error) {
    console.error("[advisory stats] error:", error);
    return NextResponse.json(
      { error: "Failed to load advisory stats" },
      { status: 500 }
    );
  }
}

function buildEmptyStats() {
  return {
    stats: {
      studentCount: 0,
      totalActivities: 0,
      verifiedActivities: 0,
      pendingActivities: 0,
      recentActivities: 0,
      serviceHours30d: 0,
      studentsWithRecent: 0,
      activityTrend: [],
      hoursTrend: [],
    },
  };
}

