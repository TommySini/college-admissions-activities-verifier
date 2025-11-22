import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getAdminSubRole } from "@/lib/admin-role";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "admin" && user.role !== "teacher") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const adminSubRole = await getAdminSubRole(user.id);
  if (adminSubRole !== "college_counselor") {
    return NextResponse.json({ error: "Only college counselors can access this resource" }, { status: 403 });
  }

  if (!user.schoolId) {
    return NextResponse.json({ error: "Please set your school before accessing counselor insights." }, { status: 400 });
  }

  const schoolId = user.schoolId;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const [
    totalStudents,
    activities,
    goals,
    volunteering,
    organizations,
    alumniApplications,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "student", schoolId } }),
    prisma.activity.findMany({
      where: { student: { schoolId } },
      select: { studentId: true, status: true },
    }),
    prisma.volunteeringGoal.findMany({
      where: { student: { schoolId } },
      select: { status: true },
    }),
    prisma.volunteeringParticipation.findMany({
      where: { student: { schoolId }, updatedAt: { gte: sixtyDaysAgo } },
      select: {
        totalHours: true,
        verified: true,
        updatedAt: true,
      },
    }),
    prisma.organization.findMany({
      where: { createdBy: { schoolId } },
      select: { status: true },
    }),
    prisma.alumniApplication.findMany({
      where: {
        alumniProfile: {
          user: { schoolId },
        },
      },
      select: { parseStatus: true, createdAt: true },
    }),
  ]);

  const studentsWithActivity = new Set<string>();
  let verifiedActivities = 0;
  activities.forEach((activity) => {
    studentsWithActivity.add(activity.studentId);
    if (activity.status === "approved") {
      verifiedActivities += 1;
    }
  });

  const activityParticipationRate = totalStudents
    ? Math.round((studentsWithActivity.size / totalStudents) * 100)
    : 0;

  let hoursLast30 = 0;
  let hoursPrev30 = 0;
  let verifiedHoursLast30 = 0;

  volunteering.forEach((participation) => {
    const hours = Number(participation.totalHours ?? 0);
    if (participation.updatedAt >= thirtyDaysAgo) {
      hoursLast30 += hours;
      if (participation.verified) {
        verifiedHoursLast30 += hours;
      }
    } else {
      hoursPrev30 += hours;
    }
  });

  const volunteeringMomentum = hoursPrev30
    ? Math.round(((hoursLast30 - hoursPrev30) / hoursPrev30) * 100)
    : null;

  const totalGoals = goals.length;
  const completedGoals = goals.filter((goal) => goal.status === "completed").length;
  const goalCompletionRate = totalGoals ? Math.round((completedGoals / totalGoals) * 100) : 0;

  const approvedOrganizations = organizations.filter((org) => org.status === "APPROVED").length;
  const organizationApprovalRate = organizations.length
    ? Math.round((approvedOrganizations / organizations.length) * 100)
    : 0;

  const alumniSuccesses = alumniApplications.filter((app) => app.parseStatus === "success").length;
  const recentAlumniUploads = alumniApplications.filter((app) => app.createdAt >= thirtyDaysAgo).length;

  const widgetScores = [
    activityParticipationRate,
    Math.min(Math.round((verifiedHoursLast30 / Math.max(totalStudents, 1)) * 5), 100),
    goalCompletionRate,
    organizationApprovalRate,
    Math.min(Math.round((recentAlumniUploads / Math.max(totalStudents, 1)) * 100), 100),
  ];
  const engagementScore = widgetScores.length
    ? Math.round(widgetScores.reduce((sum, score) => sum + score, 0) / widgetScores.length)
    : 0;

  return NextResponse.json({
    summary: {
      totalStudents,
      activityParticipationRate,
      verifiedActivities,
      hoursLast30,
      verifiedHoursLast30,
      volunteeringMomentum,
      goalCompletionRate,
      organizationApprovalRate,
      alumniSuccesses,
      recentAlumniUploads,
      engagementScore,
    },
    widgets: [
      {
        id: "participation",
        label: "Activity Participation",
        value: `${activityParticipationRate}%`,
        score: activityParticipationRate,
        detail: {
          participants: studentsWithActivity.size,
          totalStudents,
        },
      },
      {
        id: "volunteering",
        label: "Verified Volunteering Hours",
        value: `${Math.round(verifiedHoursLast30)} hrs (30d)`,
        score: Math.min(Math.round((verifiedHoursLast30 / Math.max(totalStudents, 1)) * 5), 100),
        detail: {
          hoursLast30,
          hoursPrev30,
          trend: volunteeringMomentum,
        },
      },
      {
        id: "goals",
        label: "Goal Completion",
        value: `${goalCompletionRate}%`,
        score: goalCompletionRate,
        detail: {
          completedGoals,
          totalGoals,
        },
      },
      {
        id: "organizations",
        label: "Club & Program Launches",
        value: `${approvedOrganizations}/${organizations.length} approved`,
        score: organizationApprovalRate,
      },
      {
        id: "alumni",
        label: "Alumni Portfolio Growth",
        value: `${recentAlumniUploads} uploads (30d)`,
        score: Math.min(Math.round((recentAlumniUploads / Math.max(totalStudents, 1)) * 100), 100),
        detail: {
          alumniSuccesses,
          totalSubmissions: alumniApplications.length,
        },
      },
    ],
  });
}


