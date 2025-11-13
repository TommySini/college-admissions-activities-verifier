import { prisma } from "@/lib/prisma";
import { User } from "@prisma/client";

/**
 * Fetch user's activities with verification status
 */
export async function getUserActivities(userId: string, limit = 20) {
  const activities = await prisma.activity.findMany({
    where: { studentId: userId },
    include: {
      verification: true,
    },
    orderBy: [
      { status: "desc" }, // verified first
      { updatedAt: "desc" },
    ],
    take: limit,
  });

  return activities.map((activity) => ({
    id: activity.id,
    name: activity.name,
    category: activity.category,
    description: activity.description,
    role: activity.role,
    organization: activity.organization,
    startDate: activity.startDate,
    endDate: activity.endDate,
    hoursPerWeek: activity.hoursPerWeek,
    totalHours: activity.totalHours,
    status: activity.status,
    verified: activity.verification?.status === "verified",
  }));
}

/**
 * Get user's volunteering statistics
 */
export async function getVolunteeringStats(userId: string) {
  const participations = await prisma.volunteeringParticipation.findMany({
    where: {
      studentId: userId,
      status: { in: ["active", "completed"] },
    },
    include: {
      opportunity: {
        select: {
          title: true,
          organization: true,
          category: true,
        },
      },
    },
    orderBy: { startDate: "desc" },
  });

  const totalHours = participations.reduce((sum, p) => sum + p.totalHours, 0);
  const verifiedHours = participations
    .filter((p) => p.verified)
    .reduce((sum, p) => sum + p.totalHours, 0);

  // Last 6 months breakdown
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const recentParticipations = participations.filter(
    (p) => new Date(p.startDate) >= sixMonthsAgo
  );

  const recentHours = recentParticipations.reduce((sum, p) => sum + p.totalHours, 0);

  // Categories breakdown
  const categoriesMap = new Map<string, number>();
  participations.forEach((p) => {
    const category = p.opportunity?.category || "Manual Log";
    categoriesMap.set(category, (categoriesMap.get(category) || 0) + p.totalHours);
  });

  return {
    totalHours,
    verifiedHours,
    unverifiedHours: totalHours - verifiedHours,
    recentHours,
    participationCount: participations.length,
    categories: Array.from(categoriesMap.entries()).map(([name, hours]) => ({
      name,
      hours,
    })),
    recentActivities: recentParticipations.slice(0, 10).map((p) => ({
      id: p.id,
      organizationName: p.organizationName || p.opportunity?.organization || "Unknown",
      activityName: p.activityName || p.opportunity?.title || "Volunteering",
      totalHours: p.totalHours,
      startDate: p.startDate,
      endDate: p.endDate,
      verified: p.verified,
    })),
  };
}

/**
 * Get user's volunteering goals
 */
export async function getVolunteeringGoals(userId: string) {
  const goals = await prisma.volunteeringGoal.findMany({
    where: {
      studentId: userId,
      status: { in: ["active", "completed"] },
    },
    orderBy: { createdAt: "desc" },
  });

  const stats = await getVolunteeringStats(userId);

  return goals.map((goal) => ({
    id: goal.id,
    description: goal.description,
    targetHours: goal.targetHours,
    targetDate: goal.targetDate,
    status: goal.status,
    currentHours: stats.totalHours,
    remainingHours: Math.max(0, goal.targetHours - stats.totalHours),
    percentComplete: Math.min(100, (stats.totalHours / goal.targetHours) * 100),
  }));
}

/**
 * Get user profile information
 */
export async function getUserProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      alumniProfile: true,
    },
  });

  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    alumniProfile: user.alumniProfile
      ? {
          displayName: user.alumniProfile.displayName,
          intendedMajor: user.alumniProfile.intendedMajor,
          privacy: user.alumniProfile.privacy,
        }
      : null,
  };
}

/**
 * Get admin analytics (only for admin users)
 */
export async function getAdminAnalytics(user: User) {
  if (user.role !== "admin") {
    throw new Error("Unauthorized: Admin access required");
  }

  const [
    totalStudents,
    totalActivities,
    verifiedActivities,
    totalVolunteeringHours,
    pendingVerifications,
    totalOrganizations,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "student" } }),
    prisma.activity.count(),
    prisma.activity.count({ where: { status: "verified" } }),
    prisma.volunteeringParticipation.aggregate({
      _sum: { totalHours: true },
    }),
    prisma.verification.count({ where: { status: "pending" } }),
    prisma.organization.count({ where: { status: "APPROVED" } }),
  ]);

  return {
    totalStudents,
    totalActivities,
    verifiedActivities,
    pendingVerifications,
    totalVolunteeringHours: totalVolunteeringHours._sum.totalHours || 0,
    totalOrganizations,
    verificationRate:
      totalActivities > 0 ? (verifiedActivities / totalActivities) * 100 : 0,
  };
}

/**
 * Get organizations (filtered by status)
 */
export async function getOrganizations(status?: string, limit = 50) {
  const organizations = await prisma.organization.findMany({
    where: status ? { status: status as any } : undefined,
    include: {
      createdBy: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return organizations.map((org) => ({
    id: org.id,
    name: org.name,
    description: org.description,
    category: org.category,
    leadership: org.leadership,
    presidentName: org.presidentName,
    contactEmail: org.contactEmail,
    isSchoolClub: org.isSchoolClub,
    status: org.status,
    createdBy: org.createdBy,
  }));
}

/**
 * Find organization by name (fuzzy search)
 */
export async function findOrganizationByName(searchTerm: string) {
  const organizations = await prisma.organization.findMany({
    where: {
      OR: [
        { name: { contains: searchTerm, mode: "insensitive" } },
        { description: { contains: searchTerm, mode: "insensitive" } },
      ],
      status: "APPROVED", // Only search approved organizations
    },
    include: {
      createdBy: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    take: 10,
  });

  return organizations.map((org) => ({
    id: org.id,
    name: org.name,
    description: org.description,
    category: org.category,
    leadership: org.leadership,
    presidentName: org.presidentName,
    contactEmail: org.contactEmail,
    isSchoolClub: org.isSchoolClub,
    status: org.status,
    createdBy: org.createdBy,
  }));
}

/**
 * Build context for AI assistant
 */
export async function buildUserContext(user: User) {
  const [profile, activities, volunteeringStats, goals] = await Promise.all([
    getUserProfile(user.id),
    getUserActivities(user.id, 20),
    getVolunteeringStats(user.id),
    getVolunteeringGoals(user.id),
  ]);

  let adminData = null;
  if (user.role === "admin") {
    try {
      adminData = await getAdminAnalytics(user);
    } catch (error) {
      console.error("Error fetching admin analytics:", error);
    }
  }

  return {
    profile,
    activities,
    volunteering: volunteeringStats,
    goals,
    admin: adminData,
  };
}

