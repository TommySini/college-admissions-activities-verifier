"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Info, Loader2, X } from "lucide-react";
import {
  buildAdvisoryScoreCard,
  buildOrganizationScoreCard,
  type AdvisoryStats,
  type OrganizationEngagement,
  type OrganizationEvent,
  type OrganizationEventBuckets,
  type OrganizationSummary,
  type ScoreCardData,
  type ScoreTone,
  type ScoreTrend,
} from "@/lib/insights/scorecards";
import type { Session } from "next-auth";
import { useAdminRole } from "@/app/context/AdminRoleContext";

type AnalyticsSummary = {
  totalStudents: number;
  totalActivities: number;
  totalOrganizations: number;
  verificationByStatus?: { status: string; count: number }[];
};

type OrganizationInsight = {
  organization: OrganizationSummary;
  engagement: OrganizationEngagement | null;
  events: OrganizationEventBuckets;
  lastEvent: OrganizationEvent | null;
  nextEvent: OrganizationEvent | null;
};

function InsightsScoreCard({ data }: { data: ScoreCardData }) {
  const toneColor = data.score >= 70 ? "#16a34a" : data.score >= 40 ? "#fbbf24" : "#f87171";
  const toneClasses: Record<ScoreTone, string> = {
    good: "text-emerald-600",
    warn: "text-amber-600",
    bad: "text-rose-600",
  };
  const toneColors: Record<ScoreTone, string> = {
    good: "#10b981",
    warn: "#f59e0b",
    bad: "#f87171",
  };

  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-lg shadow-slate-200 flex flex-col gap-5">
      <div className="flex items-center justify-between gap-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">{data.title}</p>
          <p className="text-sm font-medium text-slate-900 mt-1">{data.description}</p>
        </div>
        <ScoreDial score={data.score} toneColor={toneColor} />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {data.breakdown.map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">{item.label}</p>
            <p className={`text-lg font-semibold ${toneClasses[item.tone]} mt-1`}>{item.value}</p>
            {item.helper && <p className="text-xs text-slate-500 mt-0.5">{item.helper}</p>}
          </div>
        ))}
        {data.trends?.map((trend, idx) => (
          <div key={`${trend.label}-${idx}`} className="rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2 shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>{trend.label}</span>
              {trend.data.length > 0 && (
                <span className={`font-semibold ${toneClasses[trend.tone]}`}>
                  {trend.data[trend.data.length - 1]}
                  {trend.suffix ?? ""}
                </span>
              )}
            </div>
            <SparkLine data={trend.data} color={toneColors[trend.tone]} />
          </div>
        ))}
      </div>
      {data.hint && <p className="text-xs text-slate-500">{data.hint}</p>}
    </div>
  );
}

function ScoreDial({ score, toneColor }: { score: number; toneColor: string }) {
  const clampedScore = Math.max(0, Math.min(100, score));
  return (
    <div className="relative h-28 w-28">
      <div
        className="h-full w-full rounded-full"
        style={{
          background: `conic-gradient(${toneColor} ${clampedScore}%, #e2e8f0 ${clampedScore}% 100%)`,
        }}
      />
      <div className="absolute inset-4 rounded-full bg-white flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold text-slate-900">{clampedScore}</span>
        <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">health</span>
      </div>
    </div>
  );
}

function SparkLine({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length === 0) {
    return <div className="h-12 rounded-lg bg-slate-200" />;
  }
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = Math.max(max - min, 1);

  const points = data
    .map((value, index) => {
      const x = (index / Math.max(data.length - 1, 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 40" className="h-12 w-full">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
}

type SessionStatus = "loading" | "authenticated" | "unauthenticated";

type CounselorInsightsResponse = {
  summary: {
    totalStudents: number;
    activityParticipationRate: number;
    verifiedActivities: number;
    hoursLast30: number;
    verifiedHoursLast30: number;
    volunteeringMomentum: number | null;
    goalCompletionRate: number;
    organizationApprovalRate: number;
    alumniSuccesses: number;
    recentAlumniUploads: number;
    engagementScore: number;
  };
  widgets: {
    id: string;
    label: string;
    value: string;
    score: number;
    detail?: Record<string, unknown>;
  }[];
};

export default function AdminInsightsPage() {
  const sessionState = useSession();
  const { adminSubRole, loading: adminRoleLoading } = useAdminRole();

  if (sessionState.status === "loading" || adminRoleLoading) {
    return (
      <div className="admin-dark-scope min-h-screen flex items-center justify-center text-slate-600">
        Loading insights…
      </div>
    );
  }

  if (adminSubRole === "college_counselor") {
    return (
      <CounselorInsights
        session={sessionState.data ?? null}
        status={sessionState.status}
      />
    );
  }

  return (
    <TeacherInsights
      session={sessionState.data ?? null}
      status={sessionState.status}
    />
  );
}

function TeacherInsights({ session, status }: { session: Session | null; status: SessionStatus }) {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
  const [pendingVerifications, setPendingVerifications] = useState(0);
  const [pendingAdvisoryRequests, setPendingAdvisoryRequests] = useState(0);
  const [organizationInsights, setOrganizationInsights] = useState<OrganizationInsight[]>([]);
  const [advisoryStats, setAdvisoryStats] = useState<AdvisoryStats | null>(null);
  const [studentBodyCount, setStudentBodyCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = session?.user?.role === "admin";
  const isTeacher = session?.user?.role === "teacher";
  const canSeeFullInsights = isAdmin;

  const fetchOrganizationInsights = useCallback(
    async (orgList: OrganizationSummary[]) => {
      if (!orgList || orgList.length === 0) {
        setOrganizationInsights([]);
        return;
      }

      const maxWidgets = 6;
      const subset = orgList.slice(0, maxWidgets);

      const insights = await Promise.all(
        subset.map(async (org) => {
          try {
            const [engagementRes, eventsRes] = await Promise.all([
              fetch(`/api/admin/organizations/${org.id}/engagement`),
              fetch(`/api/admin/organizations/${org.id}/events`),
            ]);

            const engagementData = engagementRes.ok ? await engagementRes.json() : null;

            let events: OrganizationEventBuckets = { past: [], upcoming: [] };
            let lastEvent: OrganizationEvent | null = null;
            let nextEvent: OrganizationEvent | null = null;

            if (eventsRes.ok) {
              const eventsData = await eventsRes.json();
              const past = Array.isArray(eventsData.past) ? eventsData.past : [];
              const upcoming = Array.isArray(eventsData.upcoming) ? eventsData.upcoming : [];
              events = { past, upcoming };
              lastEvent = past[0] ?? null;
              nextEvent = upcoming[0] ?? null;
            }

            return {
              organization: org,
              engagement: engagementData,
              events,
              lastEvent,
              nextEvent,
            } as OrganizationInsight;
          } catch (error) {
            console.error("Error loading organization insight:", org.id, error);
            return {
              organization: org,
              engagement: null,
              events: { past: [], upcoming: [] },
              lastEvent: null,
              nextEvent: null,
            } as OrganizationInsight;
          }
        })
      );

      setOrganizationInsights(insights);
    },
    []
  );

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/signin");
      return;
    }
    if (status === "authenticated" && !isAdmin && !isTeacher) {
      router.replace("/dashboard");
    }
  }, [status, isAdmin, isTeacher, router]);

  useEffect(() => {
    if (!isAdmin && !isTeacher) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [analyticsRes, orgRes, advisoryRes, verificationsRes, schoolSizeRes, advisoryStatsRes] = await Promise.all([
          fetch("/api/admin/analytics"),
          fetch("/api/admin/organizations"),
          fetch("/api/advisory"),
          fetch("/api/pending-verification-requests"),
          fetch("/api/settings?key=school_student_body_count"),
          fetch("/api/advisory/stats"),
        ]);

        if (analyticsRes.ok) {
          const analyticsData = await analyticsRes.json();
          setAnalytics(analyticsData);
        } else {
          throw new Error("Unable to load analytics");
        }

        let loadedOrganizations: OrganizationSummary[] = [];
        if (orgRes.ok) {
          const orgData = await orgRes.json();
          loadedOrganizations = Array.isArray(orgData.organizations) ? orgData.organizations : [];
          setOrganizations(loadedOrganizations);
        } else {
          throw new Error("Unable to load organizations");
        }

        if (advisoryRes.ok) {
          const advisoryData = await advisoryRes.json();
          setPendingAdvisoryRequests(advisoryData.pendingRequests?.length || 0);
        }

        if (verificationsRes.ok) {
          const data = await verificationsRes.json();
          const pending = Array.isArray(data.activities) ? data.activities.length : 0;
          setPendingVerifications(pending);
        }

        if (schoolSizeRes.ok) {
          const schoolSizeData = await schoolSizeRes.json();
          if (schoolSizeData.exists && typeof schoolSizeData.value === "string") {
            const parsed = Number(schoolSizeData.value);
            setStudentBodyCount(Number.isFinite(parsed) && parsed > 0 ? parsed : null);
          } else {
            setStudentBodyCount(null);
          }
        } else {
          setStudentBodyCount(null);
        }

        if (advisoryStatsRes.ok) {
          const statsData = await advisoryStatsRes.json();
          setAdvisoryStats(statsData.stats ?? null);
        } else {
          setAdvisoryStats(null);
        }

        const manageableOrganizations = isAdmin
          ? loadedOrganizations
          : loadedOrganizations.filter((org) => org.createdBy?.id === session?.user?.id);
        const listForWidgets =
          manageableOrganizations.length > 0 ? manageableOrganizations : loadedOrganizations;
        await fetchOrganizationInsights(listForWidgets);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Failed to load insights");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isAdmin, isTeacher, session?.user?.id, fetchOrganizationInsights]);

  const normalizedStudentPopulation = useMemo(() => {
    if (studentBodyCount && studentBodyCount > 0) return studentBodyCount;
    if (analytics?.totalStudents && analytics.totalStudents > 0) return analytics.totalStudents;
    return null;
  }, [studentBodyCount, analytics?.totalStudents]);

  const organizationScoreCards = useMemo(() => {
    if (organizationInsights.length === 0) return [];
    return organizationInsights.map((insight) => ({
      id: insight.organization.id,
      data: buildOrganizationScoreCard({
        organization: insight.organization,
        engagement: insight.engagement,
        lastEvent: insight.lastEvent,
        nextEvent: insight.nextEvent,
        totalStudents: normalizedStudentPopulation,
        pendingVerifications,
        studentBodyCountConfigured: Boolean(studentBodyCount),
      }),
    }));
  }, [organizationInsights, normalizedStudentPopulation, pendingVerifications, studentBodyCount]);

  const advisoryScoreCard = useMemo(
    () =>
      buildAdvisoryScoreCard({
        stats: advisoryStats,
        pendingAdvisoryRequests,
      }),
    [advisoryStats, pendingAdvisoryRequests]
  );
  if (status === "loading" || loading) {
    return <div className="admin-dark-scope min-h-screen flex items-center justify-center text-slate-600">Loading insights…</div>;
  }

  if (error) {
    return (
      <div className="admin-dark-scope min-h-screen flex items-center justify-center">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-4 text-rose-700">{error}</div>
      </div>
    );
  }

  return (
    <div className="admin-dark-scope flex h-screen w-full bg-transparent">
      <div className="mx-auto flex h-full w-full max-w-6xl flex-col px-4 py-4 space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-slate-500">
              {isAdmin ? "Insights" : "Advisor view"}
            </p>
            <h1 className="text-3xl font-semibold text-slate-900 mt-1">
              {isAdmin ? "Organizations & advisory" : "Club health"}
            </h1>
            <p className="text-sm text-slate-500 mt-1">Quick health signals, no clutter.</p>
          </div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
        </header>

        <section>
          {organizationScoreCards.length === 0 ? (
            <div className="rounded-3xl border border-slate-100 bg-white/90 p-6 text-center shadow-sm shadow-slate-200">
              <p className="text-sm text-slate-600">Link a club to start tracking health.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {organizationScoreCards.map((card) => (
                <InsightsScoreCard key={card.id} data={card.data} />
              ))}
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 gap-4">
          <InsightsScoreCard data={advisoryScoreCard} />
        </section>
      </div>
    </div>
  );
}

function CounselorInsights({ session, status }: { session: Session | null; status: SessionStatus }) {
  const router = useRouter();
  const [data, setData] = useState<CounselorInsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWidget, setSelectedWidget] = useState<CounselorInsightsResponse["widgets"][number] | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/signin");
      return;
    }
    if (status === "authenticated" && session?.user?.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [status, session?.user?.role, router]);

  useEffect(() => {
    let cancelled = false;
    const fetchInsights = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/admin/counselor/insights");
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load insights");
        }
        const payload: CounselorInsightsResponse = await response.json();
        if (!cancelled) {
          setData(payload);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Failed to load insights");
          setData(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchInsights();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || status === "loading") {
    return (
      <div className="admin-dark-scope min-h-screen flex items-center justify-center text-slate-600">
        Loading counselor insights…
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dark-scope min-h-screen flex items-center justify-center">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-4 text-rose-700 max-w-lg text-center">
          {error}
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const toneFromScore = (score: number) => {
    if (score >= 70) return "good";
    if (score >= 40) return "warn";
    return "bad";
  };

  return (
    <div className="admin-dark-scope flex h-screen w-full bg-transparent">
      <div className="mx-auto flex h-full w-full max-w-6xl flex-col px-4 py-6 space-y-6 overflow-y-auto">
        <header className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">Counselor insights</p>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold text-slate-900">School Engagement Score</h1>
              <p className="text-sm text-slate-500">
                These live gauges show how your student body is performing across Actify touchpoints.
              </p>
            </div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to dashboard
            </Link>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-xl backdrop-blur flex flex-col gap-6">
            <div className="flex items-center gap-6">
              <ScoreDial score={data.summary.engagementScore} toneColor="#4f46e5" />
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Total health</p>
                <h2 className="text-4xl font-semibold text-slate-900">{data.summary.engagementScore}/100</h2>
                <p className="text-sm text-slate-500 mt-2">
                  Higher scores mean more of your students are logging meaningful hours, verifying activities,
                  and sharing outcomes.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <MiniStat label="Students on platform" value={data.summary.totalStudents.toLocaleString()} />
              <MiniStat label="Verified activities" value={data.summary.verifiedActivities.toLocaleString()} />
              <MiniStat label="Hours logged (30d)" value={Math.round(data.summary.hoursLast30).toLocaleString()} />
              <MiniStat
                label="Goal completion"
                value={`${data.summary.goalCompletionRate}%`}
                tone={toneFromScore(data.summary.goalCompletionRate)}
              />
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-xl backdrop-blur flex flex-col gap-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Recent highlights</h3>
            <ul className="space-y-3 text-sm text-slate-600">
              <li>
                <span className="font-semibold text-slate-900">{data.summary.recentAlumniUploads}</span> alumni
                uploads in the past 30 days.
              </li>
              <li>
                Organization approvals sit at{" "}
                <span className="font-semibold text-slate-900">{data.summary.organizationApprovalRate}%</span>.
              </li>
              <li>
                Verified volunteering hours (30d):{" "}
                <span className="font-semibold text-slate-900">
                  {Math.round(data.summary.verifiedHoursLast30).toLocaleString()} hrs
                </span>
                .
              </li>
            </ul>
          </div>
        </section>

        <section>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {data.widgets.map((widget) => {
              const tone = toneFromScore(widget.score);
              return (
                <button
                  key={widget.id}
                  onClick={() => setSelectedWidget(widget)}
                  className={`rounded-3xl border border-slate-200 bg-white/95 p-5 text-left shadow-lg backdrop-blur transition hover:-translate-y-0.5 ${
                    tone === "good"
                      ? "hover:border-emerald-300"
                      : tone === "warn"
                        ? "hover:border-amber-300"
                        : "hover:border-rose-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{widget.label}</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900">{widget.value}</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <span
                        className={`text-sm font-semibold ${
                          tone === "good"
                            ? "text-emerald-600"
                            : tone === "warn"
                              ? "text-amber-600"
                              : "text-rose-600"
                        }`}
                      >
                        {widget.score}/100
                      </span>
                      <Info className="mt-2 h-4 w-4 text-slate-400" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {selectedWidget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white/98 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Widget insight</p>
                <h3 className="text-2xl font-semibold text-slate-900">{selectedWidget.label}</h3>
              </div>
              <button
                onClick={() => setSelectedWidget(null)}
                className="rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              Score: <span className="font-semibold text-slate-900">{selectedWidget.score}/100</span>
            </p>
            <pre className="rounded-2xl bg-slate-100/80 p-4 text-xs text-slate-600 overflow-auto">
              {JSON.stringify(selectedWidget.detail ?? {}, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "warn" | "bad";
}) {
  const toneClasses =
    tone === "good"
      ? "text-emerald-600"
      : tone === "warn"
        ? "text-amber-600"
        : tone === "bad"
          ? "text-rose-600"
          : "text-slate-500";
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`text-xl font-semibold ${toneClasses}`}>{value}</p>
    </div>
  );
}

