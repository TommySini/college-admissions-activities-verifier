import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getAdminSubRole } from "@/lib/admin-role";

type StudentMetric = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  createdAt: string;
  activityCount: number;
  verifiedActivityCount: number;
  pendingActivityCount: number;
  totalActivityHours: number;
  volunteeringHours: number;
  verifiedVolunteeringHours: number;
  volunteeringEntries: number;
  goalsActive: number;
  goalsCompleted: number;
  organizationsStarted: number;
  alumniSubmissions: number;
  alumniSuccesses: number;
  lastSubmissionAt?: string;
};

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
    return NextResponse.json(
      { error: "Please set your school before accessing counselor tools." },
      { status: 400 }
    );
  }

  const schoolId = user.schoolId;

  const students = await prisma.user.findMany({
    where: { role: "student", schoolId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      createdAt: true,
    },
    orderBy: { name: "asc" },
  });

  const [
    activities,
    participations,
    goals,
    orgGroup,
    alumniProfiles,
  ] = await Promise.all([
    prisma.activity.findMany({
      where: { student: { schoolId } },
      select: {
        studentId: true,
        status: true,
        totalHours: true,
        updatedAt: true,
        createdAt: true,
      },
    }),
    prisma.volunteeringParticipation.findMany({
      where: { student: { schoolId } },
      select: {
        studentId: true,
        totalHours: true,
        verified: true,
        updatedAt: true,
        createdAt: true,
      },
    }),
    prisma.volunteeringGoal.findMany({
      where: { student: { schoolId } },
      select: {
        studentId: true,
        status: true,
      },
    }),
    prisma.organization.groupBy({
      by: ["createdById"],
      where: { createdBy: { schoolId } },
      _count: { _all: true },
    }),
    prisma.alumniProfile.findMany({
      where: { user: { schoolId } },
      select: {
        userId: true,
        applications: {
          select: {
            parseStatus: true,
            createdAt: true,
          },
        },
      },
    }),
  ]);

  const metricsMap = new Map<string, StudentMetric>();

  students.forEach((student) => {
    metricsMap.set(student.id, {
      id: student.id,
      name: student.name,
      email: student.email,
      image: student.image,
      createdAt: student.createdAt.toISOString(),
      activityCount: 0,
      verifiedActivityCount: 0,
      pendingActivityCount: 0,
      totalActivityHours: 0,
      volunteeringHours: 0,
      verifiedVolunteeringHours: 0,
      volunteeringEntries: 0,
      goalsActive: 0,
      goalsCompleted: 0,
      organizationsStarted: 0,
      alumniSubmissions: 0,
      alumniSuccesses: 0,
    });
  });

  const updateLastSubmission = (studentId: string, timestamp: Date | null | undefined) => {
    if (!timestamp) return;
    const entry = metricsMap.get(studentId);
    if (!entry) return;
    if (!entry.lastSubmissionAt || new Date(entry.lastSubmissionAt) < timestamp) {
      entry.lastSubmissionAt = timestamp.toISOString();
    }
  };

  activities.forEach((activity) => {
    const entry = metricsMap.get(activity.studentId);
    if (!entry) return;
    entry.activityCount += 1;
    if (activity.status?.toLowerCase() === "approved") {
      entry.verifiedActivityCount += 1;
    } else if (activity.status?.toLowerCase() === "pending") {
      entry.pendingActivityCount += 1;
    }
    if (activity.totalHours) {
      entry.totalActivityHours += Number(activity.totalHours);
    }
    updateLastSubmission(activity.studentId, activity.updatedAt || activity.createdAt);
  });

  participations.forEach((participation) => {
    const entry = metricsMap.get(participation.studentId);
    if (!entry) return;
    entry.volunteeringEntries += 1;
    entry.volunteeringHours += Number(participation.totalHours ?? 0);
    if (participation.verified) {
      entry.verifiedVolunteeringHours += Number(participation.totalHours ?? 0);
    }
    updateLastSubmission(participation.studentId, participation.updatedAt || participation.createdAt);
  });

  goals.forEach((goal) => {
    const entry = metricsMap.get(goal.studentId);
    if (!entry) return;
    if (goal.status === "completed") {
      entry.goalsCompleted += 1;
    } else if (goal.status === "active") {
      entry.goalsActive += 1;
    }
  });

  orgGroup.forEach((group) => {
    const entry = metricsMap.get(group.createdById);
    if (!entry) return;
    entry.organizationsStarted += group._count._all;
  });

  alumniProfiles.forEach((profile) => {
    const entry = metricsMap.get(profile.userId);
    if (!entry) return;
    entry.alumniSubmissions += profile.applications.length;
    entry.alumniSuccesses += profile.applications.filter((app) => app.parseStatus === "success").length;
    profile.applications.forEach((app) => updateLastSubmission(profile.userId, app.createdAt));
  });

  const studentMetrics = Array.from(metricsMap.values());

  const totalStudents = students.length;
  const totalActivityParticipants = studentMetrics.filter((student) => student.activityCount > 0).length;
  const totalActivities = activities.length;
  const totalVolunteeringHours = studentMetrics.reduce((sum, student) => sum + student.volunteeringHours, 0);

  return NextResponse.json({
    summary: {
      totalStudents,
      totalActivityParticipants,
      activityParticipationRate: totalStudents
        ? Math.round((totalActivityParticipants / totalStudents) * 100)
        : 0,
      totalActivities,
      totalVolunteeringHours,
      averageActivitiesPerStudent: totalStudents ? totalActivities / totalStudents : 0,
    },
    students: studentMetrics,
  });
}


