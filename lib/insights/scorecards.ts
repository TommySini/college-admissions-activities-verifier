export type ScoreTone = "good" | "warn" | "bad";

export type ScoreBreakdownItem = {
  label: string;
  value: string;
  helper?: string;
  tone: ScoreTone;
};

export type ScoreTrend = {
  label: string;
  data: number[];
  tone: ScoreTone;
  suffix?: string;
};

export type ScoreCardData = {
  title: string;
  score: number;
  description: string;
  breakdown: ScoreBreakdownItem[];
  hint?: string | null;
  trends?: ScoreTrend[];
};

export type OrganizationSummary = {
  id: string;
  name: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  updatedAt?: string;
  createdAt?: string;
  createdBy?: {
    id: string;
    name?: string | null;
  } | null;
};

export type OrganizationEngagement = {
  totalOrgs: number;
  currentMemberCount: number;
  memberCountPosition: number;
  clubsWithMoreMembers: number;
  clubsWithSameMembers: number;
  clubsWithFewerMembers: number;
  newMembers30d: number;
  growthPercent: number;
  monthlyEngagement: { month: string; value: number }[];
  monthlyMemberGrowth: { month: string; value: number }[];
  monthlyEventCount: { month: string; value: number }[];
  avgEngagement: number;
  topClubs: { name: string; members: number; isCurrent: boolean }[];
  attendanceRate: number;
  participationRate: number;
  retentionRate: number;
  totalEvents: number;
  pastEvents: number;
  upcomingEvents: number;
};

export type OrganizationEvent = {
  id: string;
  title: string;
  description?: string | null;
  date: string;
  time?: string | null;
  location?: string | null;
  createdAt?: string;
  type?: "past" | "upcoming";
};

export type OrganizationEventBuckets = {
  past: OrganizationEvent[];
  upcoming: OrganizationEvent[];
};

export type AdvisoryStats = {
  studentCount: number;
  totalActivities: number;
  verifiedActivities: number;
  pendingActivities: number;
  recentActivities: number;
  serviceHours30d: number;
  studentsWithRecent: number;
  activityTrend: { month: string; value: number }[];
  hoursTrend: { month: string; value: number }[];
};

const clampScore = (value: number, min = 0, max = 1) => {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
};

const scoreFromRecency = (days: number | null, ideal: number) => {
  if (days === null) return 0.4;
  if (days <= ideal) return 1;
  if (days >= ideal * 3) return 0;
  return clampScore(1 - (days - ideal) / (ideal * 2));
};

const scoreFromFuture = (days: number | null, target: number) => {
  if (days === null) return 0.3;
  if (days <= target) return 1;
  if (days >= target * 3) return 0;
  return clampScore(1 - (days - target) / (target * 2));
};

export function toneFromScore(value: number): ScoreTone {
  if (value >= 0.7) return "good";
  if (value >= 0.4) return "warn";
  return "bad";
}

export function buildOrganizationScoreCard({
  organization,
  engagement,
  lastEvent,
  nextEvent,
  totalStudents,
  pendingVerifications,
  studentBodyCountConfigured,
}: {
  organization: OrganizationSummary;
  engagement: OrganizationEngagement | null;
  lastEvent: OrganizationEvent | null;
  nextEvent: OrganizationEvent | null;
  totalStudents: number | null;
  pendingVerifications: number;
  studentBodyCountConfigured: boolean;
}): ScoreCardData {
  const members = engagement?.currentMemberCount ?? 0;
  const studentCount = totalStudents ?? 0;
  const targetMembers = studentCount > 0 ? Math.max(8, studentCount * 0.03) : 20;
  const coverageScore = studentCount > 0 ? clampScore(members / (targetMembers * 0.9)) : members > 0 ? 0.75 : 0;

  const now = new Date();
  const lastEventDate = lastEvent ? new Date(lastEvent.date) : null;
  const nextEventDate = nextEvent ? new Date(nextEvent.date) : null;
  const daysSinceLast = lastEventDate ? Math.max(0, Math.round((now.getTime() - lastEventDate.getTime()) / 86400000)) : null;
  const daysUntilNext = nextEventDate ? Math.max(0, Math.round((nextEventDate.getTime() - now.getTime()) / 86400000)) : null;
  const cadenceScore = (scoreFromRecency(daysSinceLast, 40) + scoreFromFuture(daysUntilNext, 40)) / 2;

  const avgEngagement = (engagement?.avgEngagement ?? 60) / 100;
  const attendanceScore = clampScore((engagement?.attendanceRate ?? 55) / 85);
  const growthPercent = engagement?.growthPercent ?? 8;
  const growthScore = clampScore((growthPercent + 30) / 70);
  const queueScore = clampScore(1 - Math.min(pendingVerifications / 25, 1));

  const composite =
    coverageScore * 0.25 +
    cadenceScore * 0.2 +
    avgEngagement * 0.2 +
    attendanceScore * 0.2 +
    growthScore * 0.1 +
    queueScore * 0.05;

  const score = Math.round(clampScore(composite) * 100);

  const breakdown: ScoreBreakdownItem[] = [
    {
      label: "Member reach",
      value: members ? `${members} members` : "No roster",
      helper: studentCount > 0 ? `Target ≈${Math.round(targetMembers)}` : "Set school size",
      tone: toneFromScore(coverageScore),
    },
    {
      label: "Attendance",
      value: `${Math.round(attendanceScore * 100)}% avg`,
      helper: `${engagement?.attendanceRate ?? 0}% reported turnout`,
      tone: toneFromScore(attendanceScore),
    },
    {
      label: "Growth",
      value: `+${engagement?.newMembers30d ?? 0} this month`,
      helper: `${growthPercent}% vs last month`,
      tone: toneFromScore(growthScore),
    },
    {
      label: "Event rhythm",
      value: lastEventDate ? `${daysSinceLast ?? "—"}d since last` : "No events logged",
      helper: nextEventDate ? `Next in ${daysUntilNext ?? "—"}d` : "Schedule one",
      tone: toneFromScore(cadenceScore),
    },
    {
      label: "Queue",
      value: pendingVerifications > 0 ? `${pendingVerifications} pending` : "Clear",
      helper: `Status: ${organization.status.toLowerCase()}`,
      tone: pendingVerifications > 0 ? "warn" : "good",
    },
  ];

  return {
    title: organization.name,
    score,
    description: "Club health index",
    breakdown,
    hint: studentBodyCountConfigured ? null : "Add your school size in Settings to calibrate this score.",
  };
}

export function buildAdvisoryScoreCard({
  stats,
  pendingAdvisoryRequests,
}: {
  stats: AdvisoryStats | null;
  pendingAdvisoryRequests: number;
}): ScoreCardData {
  if (!stats) {
    return {
      title: "Advisory engagement",
      score: 15,
      description: "No advisees yet",
      breakdown: [
        { label: "Updates", value: "0 activities", tone: "warn" },
        { label: "Recent activity", value: "0 students", tone: "warn", helper: "Add students to track progress" },
        { label: "Hours", value: "0h logged", tone: "warn" },
        {
          label: "Backlog",
          value: `${pendingAdvisoryRequests} invites`,
          tone: pendingAdvisoryRequests > 0 ? "warn" : "good",
        },
      ],
      hint: "Add students to your advisory to unlock this score.",
    };
  }

  const studentCount = Math.max(stats.studentCount, 1);
  const activityPerStudent = stats.totalActivities / studentCount;
  const activityScore = clampScore(activityPerStudent / 3);

  const verifiedRate = stats.totalActivities > 0 ? stats.verifiedActivities / stats.totalActivities : 0;
  const recencyScore = clampScore(stats.studentsWithRecent / studentCount);
  const backlogScore = stats.totalActivities > 0 ? clampScore(1 - stats.pendingActivities / stats.totalActivities) : 0.7;
  const avgHours = stats.serviceHours30d / studentCount;
  const hoursScore = clampScore(avgHours / 5);

  const composite =
    activityScore * 0.28 + verifiedRate * 0.22 + recencyScore * 0.25 + backlogScore * 0.15 + hoursScore * 0.1;
  const score = Math.round(clampScore(composite) * 100);

  const breakdown: ScoreBreakdownItem[] = [
    {
      label: "Updates logged",
      value: `${stats.totalActivities}`,
      helper: `${stats.verifiedActivities} verified`,
      tone: toneFromScore(activityScore),
    },
    {
      label: "Active students",
      value: `${stats.studentsWithRecent}/${stats.studentCount}`,
      helper: `${stats.recentActivities} updates (30d)`,
      tone: toneFromScore(recencyScore),
    },
    {
      label: "Hours logged",
      value: `${Math.round(stats.serviceHours30d)}h`,
      helper: `${avgHours.toFixed(1)}h avg`,
      tone: toneFromScore(hoursScore),
    },
    {
      label: "Backlog",
      value: `${stats.pendingActivities + pendingAdvisoryRequests} waiting`,
      helper: `${stats.pendingActivities} activities · ${pendingAdvisoryRequests} invites`,
      tone: toneFromScore(backlogScore),
    },
  ];

  return {
    title: "Advisory engagement",
    score,
    description: `${stats.studentCount} students`,
    breakdown,
    hint: stats.totalActivities === 0 ? "Log student activity to boost this score." : null,
  };
}


