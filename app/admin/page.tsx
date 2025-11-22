"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building07, BookOpen01, HeartHand, GraduationHat01 } from "@untitledui/icons";
import { X, ArrowRight } from "lucide-react";
import {
  buildAdvisoryScoreCard,
  buildOrganizationScoreCard,
  type AdvisoryStats,
  type OrganizationEngagement,
  type OrganizationEvent,
  type OrganizationSummary,
  type ScoreCardData,
  type ScoreTone,
} from "@/lib/insights/scorecards";

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const role = session?.user?.role ?? null;

  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
  const [advisoryStats, setAdvisoryStats] = useState<AdvisoryStats | null>(null);
  const [studentBodyCount, setStudentBodyCount] = useState<number | null>(null);
  const [pendingVerificationCount, setPendingVerificationCount] = useState(0);
  const [primaryOrgInsight, setPrimaryOrgInsight] = useState<{
    organization: OrganizationSummary;
    engagement: OrganizationEngagement | null;
    lastEvent: OrganizationEvent | null;
    nextEvent: OrganizationEvent | null;
  } | null>(null);
  const [advisoryStudentsCount, setAdvisoryStudentsCount] = useState(0);
  const [pendingAdvisoryRequests, setPendingAdvisoryRequests] = useState(0);
  const [advisoryHighlights, setAdvisoryHighlights] = useState<AdvisoryHighlights | null>(null);
  const [loadingAdvisoryHighlights, setLoadingAdvisoryHighlights] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState<OrganizationEventSummary[]>([]);
  const [loadingUpcomingEvents, setLoadingUpcomingEvents] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [welcomeDismissed, setWelcomeDismissed] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showViewToolModal, setShowViewToolModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const fetchAdvisoryHighlights = useCallback(async (studentIds: string[]) => {
    if (studentIds.length === 0) {
      setAdvisoryHighlights(null);
      return;
    }

    setLoadingAdvisoryHighlights(true);
    try {
      const limitedIds = studentIds.slice(0, 8);
      const participationGroups = await Promise.all(
        limitedIds.map(async (studentId) => {
          try {
            const res = await fetch(`/api/volunteering-participations?studentId=${studentId}`);
            if (!res.ok) return [];
            const data = await res.json();
            return Array.isArray(data.participations) ? (data.participations as ParticipationResponse[]) : [];
          } catch (err) {
            console.error("Error fetching participations for advisory student", err);
            return [];
          }
        })
      );

      const merged = participationGroups.flat();
      if (merged.length === 0) {
        setAdvisoryHighlights(null);
        return;
      }

      const totalHours = merged.reduce((sum, participation) => sum + (Number(participation.totalHours) || 0), 0);
      const recentLogs = merged
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 3)
        .map((entry) => ({
          id: entry.id,
          studentName: entry.student?.name ?? "Student",
          description: entry.activityName || entry.organizationName || entry.activity?.name || "Service",
          hours: Math.round(Number(entry.totalHours) || 0),
          createdAt: entry.createdAt,
        }));

      setAdvisoryHighlights({
        totalHours: Math.round(totalHours),
        recentLogs,
      });
    } catch (err) {
      console.error("Failed to load advisory highlights", err);
      setAdvisoryHighlights(null);
    } finally {
      setLoadingAdvisoryHighlights(false);
    }
  }, []);

  const fetchUpcomingEvents = useCallback(async (organizationIds: string[]) => {
    if (organizationIds.length === 0) {
      setUpcomingEvents([]);
      return;
    }

    setLoadingUpcomingEvents(true);
    try {
      const res = await fetch(`/api/volunteering-opportunities?status=approved&limit=100`);
      if (!res.ok) {
        setUpcomingEvents([]);
        return;
      }

      const data = await res.json();
      const opportunities = Array.isArray(data.opportunities)
        ? (data.opportunities as VolunteeringOpportunityResponse[])
        : [];
      const now = new Date();
      const events = opportunities
        .filter((opp) => opp.organizationId && organizationIds.includes(opp.organizationId))
        .map((opp) => {
          if (!opp.startDate) return null;
          const start = new Date(opp.startDate);
          if (Number.isNaN(start.getTime())) return null;
          const diffDays = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays < 0) return null;
          return {
            id: opp.id,
            title: opp.title,
            organizationName: opp.organization || opp.organizationRef?.name || "Club event",
            startDate: start.toISOString(),
            daysUntil: diffDays,
          } as OrganizationEventSummary;
        })
        .filter(Boolean) as OrganizationEventSummary[];

      const upcoming = events
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
        .slice(0, 3);
      setUpcomingEvents(upcoming);
    } catch (err) {
      console.error("Failed to load upcoming events", err);
      setUpcomingEvents([]);
    } finally {
      setLoadingUpcomingEvents(false);
    }
  }, []);

  const loadPrimaryOrganizationInsight = useCallback(async (org: OrganizationSummary | null) => {
    if (!org) {
      setPrimaryOrgInsight(null);
      return;
    }

    try {
      const [engagementRes, eventsRes] = await Promise.all([
        fetch(`/api/admin/organizations/${org.id}/engagement`),
        fetch(`/api/admin/organizations/${org.id}/events`),
      ]);

      const engagementData = engagementRes.ok ? await engagementRes.json() : null;

      let lastEvent: OrganizationEvent | null = null;
      let nextEvent: OrganizationEvent | null = null;

      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        const past = Array.isArray(eventsData.past) ? eventsData.past : [];
        const upcoming = Array.isArray(eventsData.upcoming) ? eventsData.upcoming : [];
        lastEvent = past[0] ?? null;
        nextEvent = upcoming[0] ?? null;
      }

      setPrimaryOrgInsight({
        organization: org,
        engagement: engagementData,
        lastEvent,
        nextEvent,
      });
    } catch (error) {
      console.error("Error loading primary organization insight", error);
      setPrimaryOrgInsight({
        organization: org,
        engagement: null,
        lastEvent: null,
        nextEvent: null,
      });
    }
  }, []);

  const firstName = useMemo(() => {
    if (!session?.user?.name) return "Admin";
    return session.user.name.split(" ")[0];
  }, [session?.user?.name]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/signin");
      return;
    }

    if (status === "authenticated" && role !== "admin" && role !== "teacher") {
      router.replace("/dashboard");
    }
  }, [status, role, router]);

  useEffect(() => {
    if (session?.user.role !== "admin" && session?.user.role !== "teacher") return;

    const load = async () => {
      setError(null);
      try {
        // Check if welcome notification was dismissed
        const welcomeKey = session?.user?.id ? `admin_welcome_dismissed_${session.user.id}` : null;
        let welcomeDismissedValue = false; // Default to showing welcome (first time)
        if (welcomeKey) {
          try {
            const welcomeRes = await fetch(`/api/settings?key=${welcomeKey}`);
            if (welcomeRes.ok) {
              const data = await welcomeRes.json();
              welcomeDismissedValue = data.exists && data.value === "true";
            }
          } catch (err) {
            // If error, show welcome (first time)
            welcomeDismissedValue = false;
          }
        }
        setWelcomeDismissed(welcomeDismissedValue);

        const [analyticsRes, orgRes, petitionsRes, verificationsRes, advisoryStatsRes, schoolSizeRes] = await Promise.all([
          fetch("/api/admin/analytics"),
          fetch("/api/admin/organizations"),
          fetch("/api/petitions?status=pending"),
          fetch("/api/pending-verification-requests"),
          fetch("/api/advisory/stats"),
          fetch("/api/settings?key=school_student_body_count"),
        ]);

        if (analyticsRes.ok) {
          const analyticsData = await analyticsRes.json();
          setAnalytics(analyticsData);
        } else {
          console.error("Failed to load analytics", analyticsRes.statusText);
        }

        let loadedOrganizations: OrganizationSummary[] = [];
        if (orgRes.ok) {
          const orgData = await orgRes.json();
          loadedOrganizations = Array.isArray(orgData.organizations) ? orgData.organizations : [];
          setOrganizations(loadedOrganizations);
        } else {
          console.error("Failed to load organizations", orgRes.statusText);
        }
        if (loadedOrganizations.length > 0) {
          fetchUpcomingEvents(loadedOrganizations.map((org) => org.id));
        } else {
          setUpcomingEvents([]);
        }

        const primaryOrg =
          session?.user?.role === "teacher"
            ? loadedOrganizations.find((org) => org.createdBy?.id === session?.user?.id) ?? loadedOrganizations[0] ?? null
            : loadedOrganizations[0] ?? null;
        await loadPrimaryOrganizationInsight(primaryOrg);

        // Build notifications from actual data
        const notificationsList: NotificationItem[] = [];
        let pendingVerificationsTotal = 0;

        // Pending organizations
        const pendingOrgs = loadedOrganizations.filter((org) => org.status === "PENDING");
        if (pendingOrgs.length > 0) {
          notificationsList.push({
            id: "pending-orgs",
            title: `${pendingOrgs.length} organization${pendingOrgs.length > 1 ? "s" : ""} pending approval`,
            description: "Review requests in My Organizations",
            type: "organization",
            timestamp: new Date().toISOString(),
            href: "/admin/organizations",
          });
        }

        // Pending petitions
        if (petitionsRes.ok) {
          const petitionsData = await petitionsRes.json();
          const pendingPetitions = Array.isArray(petitionsData.petitions) ? petitionsData.petitions : [];
          if (pendingPetitions.length > 0) {
            notificationsList.push({
              id: "pending-petitions",
              title: `${pendingPetitions.length} petition${pendingPetitions.length > 1 ? "s" : ""} awaiting review`,
              description: "Open petitions queue",
              type: "petition",
              timestamp: new Date().toISOString(),
              href: "/admin/petitions",
            });
          }
        }

        // Pending verifications
        if (verificationsRes.ok) {
          const verificationsData = await verificationsRes.json();
          const pendingVerifications = Array.isArray(verificationsData.activities) ? verificationsData.activities : [];
          pendingVerificationsTotal = pendingVerifications.length;
          setPendingVerificationCount(pendingVerificationsTotal);
          if (pendingVerificationsTotal > 0) {
            notificationsList.push({
              id: "pending-verifications",
              title: `${pendingVerificationsTotal} activit${pendingVerificationsTotal > 1 ? "ies" : "y"} awaiting verification`,
              description: "See pending approvals",
              type: "verification",
              timestamp: new Date().toISOString(),
              href: "/admin/view/activities",
            });
          }
        } else {
          setPendingVerificationCount(0);
        }

        // Add welcome notification at the beginning if not dismissed
        if (!welcomeDismissedValue) {
          notificationsList.unshift({
            id: "welcome",
            title: "Welcome to Actify!",
            description: "Explore the dashboard widgets to get started.",
            type: "welcome",
            timestamp: new Date().toISOString(),
            dismissible: true,
          });
        }

        setNotifications(notificationsList);

        if (advisoryStatsRes.ok) {
          const statsData = await advisoryStatsRes.json();
          setAdvisoryStats(statsData.stats ?? null);
        } else {
          setAdvisoryStats(null);
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

        // Load advisory data
        try {
          const advisoryRes = await fetch("/api/advisory");
          if (advisoryRes.ok) {
            const advisoryData = await advisoryRes.json();
            setAdvisoryStudentsCount(advisoryData.students?.length || 0);
            setPendingAdvisoryRequests(advisoryData.pendingRequests?.length || 0);
            const studentIds = Array.isArray(advisoryData.students)
              ? advisoryData.students.map((student: AdvisoryStudent) => student.id)
              : [];
            if (studentIds.length > 0) {
              fetchAdvisoryHighlights(studentIds);
            } else {
              setAdvisoryHighlights(null);
            }
          }
        } catch (err) {
          console.error("Error fetching advisory data:", err);
        }
      } catch (err) {
        console.error("Error fetching admin data", err);
        setError("Some dashboard data could not be loaded. Please refresh.");
      } finally {
        /* no-op */
      }
    };

    load();
  }, [session?.user?.role, session?.user?.id, fetchAdvisoryHighlights, fetchUpcomingEvents, loadPrimaryOrganizationInsight]);

  if (status === "loading") {
    return <div className="admin-dark-scope min-h-screen flex items-center justify-center text-slate-600">Loading admin tools…</div>;
  }

  const handleSeedFakeData = async () => {
    setSeeding(true);
    try {
      const res = await fetch("/api/admin/seed-fake-data", {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        // Reload the page to see the new data
        window.location.reload();
      } else {
        const errorData = await res.json();
        setError(errorData.error || "Failed to seed fake data");
      }
    } catch (err) {
      console.error("Error seeding fake data:", err);
      setError("Failed to seed fake data");
    } finally {
      setSeeding(false);
    }
  };

  const totalAdvisoryHours = advisoryHighlights?.totalHours ?? 0;
  const advisoryLogs = advisoryHighlights?.recentLogs ?? [];
  const latestAdvisoryLog = advisoryLogs[0] ?? null;
  const totalOrganizations = analytics?.totalOrganizations ?? organizations.length;
  const approvedOrganizations = useMemo(
    () => organizations.filter((org) => org.status === "APPROVED").length,
    [organizations]
  );
  const pendingOrganizationsCount = useMemo(
    () => organizations.filter((org) => org.status === "PENDING").length,
    [organizations]
  );
  const normalizedStudentPopulation = useMemo(() => {
    if (studentBodyCount && studentBodyCount > 0) return studentBodyCount;
    if (analytics?.totalStudents && analytics.totalStudents > 0) return analytics.totalStudents;
    return null;
  }, [studentBodyCount, analytics?.totalStudents]);
  const clubScoreCard = useMemo<ScoreCardData | null>(() => {
    if (!primaryOrgInsight) return null;
    return buildOrganizationScoreCard({
      organization: primaryOrgInsight.organization,
      engagement: primaryOrgInsight.engagement,
      lastEvent: primaryOrgInsight.lastEvent,
      nextEvent: primaryOrgInsight.nextEvent,
      totalStudents: normalizedStudentPopulation,
      pendingVerifications: pendingVerificationCount,
      studentBodyCountConfigured: Boolean(studentBodyCount),
    });
  }, [primaryOrgInsight, normalizedStudentPopulation, pendingVerificationCount, studentBodyCount]);
  const advisoryScoreCard = useMemo<ScoreCardData>(
    () =>
      buildAdvisoryScoreCard({
        stats: advisoryStats,
        pendingAdvisoryRequests,
      }),
    [advisoryStats, pendingAdvisoryRequests]
  );
  const toneTextClasses: Record<ScoreTone, string> = {
    good: "text-emerald-600",
    warn: "text-amber-600",
    bad: "text-rose-600",
  };
  const summaryToneClass = (score?: number | null) => {
    if (typeof score !== "number") return "text-slate-400";
    if (score >= 70) return "text-emerald-600";
    if (score >= 40) return "text-amber-600";
    return "text-rose-600";
  };
  const recentLogsCount = advisoryLogs.length;

  const formatDaysUntil = (days: number) => {
    if (days <= 0) return "Today";
    if (days === 1) return "In 1 day";
    return `In ${days} days`;
  };

  const formatRelativeDate = (timestamp: string) => {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "";
    const diffMs = Date.now() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return "Today";
    if (diffDays === 1) return "1 day ago";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const formatNotificationTime = (timestamp: string) => {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "";
    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    if (diffMinutes < 1) return "just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const handleNotificationNavigate = useCallback(
    (note: NotificationItem, options?: { keepModalOpen?: boolean }) => {
      if (note.href) {
        router.push(note.href);
        if (!options?.keepModalOpen) {
          setShowNotificationsModal(false);
        }
      } else if (!options?.keepModalOpen) {
        setShowNotificationsModal(true);
      }
    },
    [router]
  );


  return (
    <div className="admin-dark-scope flex h-screen w-full bg-transparent">
      <div className="mx-auto flex h-full w-full max-w-6xl flex-col px-4 py-4">
        <header className="flex flex-col gap-1">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">Admin dashboard</p>
          <h1 className="text-3xl font-semibold text-slate-900">Welcome back, {firstName}</h1>
        </header>

        {error && (
          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
            {error}
          </div>
        )}

        {/* Temporary seed button - remove after testing */}
        {(organizations.length === 0 || advisoryStudentsCount === 0) && (
          <div className="mt-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-blue-800">
                Need test data? Create a fake club and student for testing.
              </p>
              <button
                onClick={handleSeedFakeData}
                disabled={seeding}
                className="rounded-xl border border-blue-300 bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 transition hover:bg-blue-200 disabled:opacity-50"
              >
                {seeding ? "Creating..." : "Create Test Data"}
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 flex-1 overflow-hidden">
          <div className="grid h-full grid-cols-1 gap-3 lg:grid-cols-3 lg:grid-rows-[repeat(2,minmax(0,1fr))]">
            <section
              id="insights"
              onClick={() => router.push("/admin/insights")}
              className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur lg:col-span-2 cursor-pointer transition hover:border-slate-300 hover:-translate-y-0.5 hover:shadow-xl duration-200"
            >
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Insights</h2>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push("/admin/insights");
                  }}
                  className="rounded-full bg-slate-100 border border-slate-200 p-2 text-slate-700 shadow-sm transition hover:bg-slate-200 hover:border-slate-300"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              <div className="grid flex-1 grid-cols-1 gap-4 text-sm text-slate-700 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-slate-50/90 px-4 py-4 shadow-md shadow-slate-200">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-2">Club health</p>
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-4xl font-semibold text-slate-900">{clubScoreCard ? clubScoreCard.score : "—"}</p>
                      <p className="text-xs text-slate-500 mt-1">{clubScoreCard?.title ?? "Link a club"}</p>
                    </div>
                    <span className={`text-xs font-semibold ${summaryToneClass(clubScoreCard?.score)}`}>
                      {clubScoreCard?.description ?? "No data"}
                    </span>
                  </div>
                  {clubScoreCard ? (
                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                      {clubScoreCard.breakdown.slice(0, 2).map((item) => (
                        <div
                          key={item.label}
                          className="rounded-xl border border-slate-100 bg-white/90 px-3 py-2 shadow-sm shadow-slate-200"
                        >
                          <p className="text-[10px] uppercase tracking-wide text-slate-500">{item.label}</p>
                          <p className={`text-sm font-semibold ${toneTextClasses[item.tone]}`}>{item.value}</p>
                          {item.helper && <p className="text-[11px] text-slate-400">{item.helper}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 mt-4">Link a club to see live health.</p>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50/90 px-4 py-4 shadow-md shadow-slate-200">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-2">Advisory engagement</p>
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-4xl font-semibold text-slate-900">{advisoryScoreCard.score}</p>
                      <p className="text-xs text-slate-500 mt-1">{advisoryScoreCard.description}</p>
                    </div>
                    <span className={`text-xs font-semibold ${summaryToneClass(advisoryScoreCard.score)}`}>
                      {advisoryScoreCard.breakdown[1]?.value ?? ""}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    {advisoryScoreCard.breakdown.slice(0, 2).map((item) => (
                      <div
                        key={item.label}
                        className="rounded-xl border border-slate-100 bg-white/90 px-3 py-2 shadow-sm shadow-slate-200"
                      >
                        <p className="text-[10px] uppercase tracking-wide text-slate-500">{item.label}</p>
                        <p className={`text-sm font-semibold ${toneTextClasses[item.tone]}`}>{item.value}</p>
                        {item.helper && <p className="text-[11px] text-slate-400">{item.helper}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section
              id="notifications"
              onClick={() => setShowNotificationsModal(true)}
              className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur lg:col-span-1 cursor-pointer transition hover:border-slate-300 hover:-translate-y-0.5 hover:shadow-xl duration-200"
            >
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Notifications</h2>
                {notifications.length > 0 && (
                  <span className="flex h-8 w-8 rounded-full bg-red-500 shadow-sm"></span>
                )}
              </div>
              <div className="flex-1 overflow-y-auto min-h-0">
                {notifications.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-sm text-slate-500">No new notifications</p>
                  </div>
                ) : (
                  <ul className="space-y-2 text-sm text-slate-700">
                    {notifications.slice(0, 3).map((note) => (
                      <li
                        key={note.id}
                        className="rounded-xl border border-slate-100 px-3 py-2.5 bg-white/90 shadow-sm shadow-slate-200"
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNotificationNavigate(note, { keepModalOpen: true });
                          }}
                          className={`w-full text-left ${note.href ? "hover:text-slate-900 transition" : "cursor-default"}`}
                        >
                          <p className="font-medium text-slate-900">{note.title}</p>
                          {note.description && (
                            <p className="text-xs text-slate-500 mt-0.5">{note.description}</p>
                          )}
                          <p className="text-[11px] text-slate-400 mt-1">{formatNotificationTime(note.timestamp)}</p>
                        </button>
                      </li>
                    ))}
                    {notifications.length > 3 && (
                      <li className="text-xs text-slate-500 text-center pt-1">
                        +{notifications.length - 3} more
                      </li>
                    )}
                  </ul>
                )}
              </div>
            </section>

            <section
              id="organizations"
              onClick={() => router.push("/admin/organizations")}
              className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur lg:col-span-2 lg:row-start-2 cursor-pointer transition hover:border-slate-300 hover:-translate-y-0.5 hover:shadow-xl duration-200"
            >
              <div className="mb-2 flex items-center justify-between">
                <div>
                <h2 className="text-lg font-semibold text-slate-900">My Organizations</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    {approvedOrganizations} active • {totalOrganizations} total
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push("/admin/organizations");
                  }}
                  className="rounded-full bg-slate-100 border border-slate-200 p-2 text-slate-700 shadow-sm transition hover:bg-slate-200 hover:border-slate-300"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-slate-50/90 px-4 py-4 shadow-md shadow-slate-200 flex flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">Advisory activity</p>
                      <p className="text-3xl font-semibold text-slate-900 mt-1">{loadingAdvisoryHighlights ? "…" : `${totalAdvisoryHours}h`}</p>
                      <p className="text-xs text-slate-500">{advisoryStudentsCount} students</p>
                    </div>
                    {pendingAdvisoryRequests > 0 && (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                        {pendingAdvisoryRequests} request{pendingAdvisoryRequests > 1 ? "s" : ""} waiting
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex-1">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Recent logs</p>
                    {loadingAdvisoryHighlights ? (
                      <p className="text-sm text-slate-500 mt-2">Fetching logs…</p>
                    ) : advisoryLogs.length > 0 ? (
                      <ul className="mt-2 space-y-2">
                        {advisoryLogs.map((log) => (
                          <li
                            key={log.id}
                            className="flex items-center justify-between rounded-xl border border-slate-100 bg-white/90 px-3 py-2.5 shadow-sm shadow-slate-200"
                          >
                            <div className="pr-3">
                              <p className="text-sm font-semibold text-slate-900">{log.studentName}</p>
                              <p className="text-xs text-slate-500">{log.description}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-emerald-600">{log.hours}h</p>
                              <p className="text-[11px] text-slate-400">{formatRelativeDate(log.createdAt)}</p>
                </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-slate-500 mt-2">No logs yet.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 px-4 py-4 flex flex-col bg-slate-50/90 shadow-md shadow-slate-200">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">Upcoming events</p>
                      <p className="text-3xl font-semibold text-slate-900 mt-1">{loadingUpcomingEvents ? "…" : upcomingEvents.length || "0"}</p>
                      <p className="text-xs text-slate-500">connected to your clubs</p>
              </div>
                  <div>
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">Upcoming events</p>
                      <p className="text-3xl font-semibold text-slate-900 mt-1">{loadingUpcomingEvents ? "…" : upcomingEvents.length || "0"}</p>
                      <p className="text-xs text-slate-500">connected to your clubs</p>
                      </div>
                  </div>
                  <div className="mt-4 flex-1">
                    {loadingUpcomingEvents ? (
                      <p className="text-sm text-slate-500">Fetching…</p>
                    ) : upcomingEvents.length > 0 ? (
                      <ul className="space-y-2">
                        {upcomingEvents.map((event) => (
                          <li
                            key={event.id}
                            className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2.5 bg-white/90 shadow-sm shadow-slate-200"
                          >
                            <div className="pr-3">
                              <p className="text-sm font-semibold text-slate-900">{event.title}</p>
                              <p className="text-xs text-slate-500">{event.organizationName}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-indigo-600">{formatDaysUntil(event.daysUntil)}</p>
                              <p className="text-[11px] text-slate-400">
                                {new Date(event.startDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                        No events yet.
                  </div>
                )}
                  </div>
                </div>
              </div>
            </section>

            <section
              id="view"
              onClick={() => setShowViewToolModal(true)}
              className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur lg:col-span-1 lg:row-start-2 cursor-pointer transition hover:border-slate-300 hover:-translate-y-0.5 hover:shadow-xl duration-200"
            >
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">View Tool</h2>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowViewToolModal(true);
                  }}
                  className="rounded-full bg-slate-100 border border-slate-200 p-2 text-slate-700 shadow-sm transition hover:bg-slate-200 hover:border-slate-300"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
                <p className="text-sm text-slate-700">
                  See the organizations, activities, volunteering, and alumni databases from the student perspective.
                </p>
            </section>
          </div>
        </div>
      </div>

      {/* View Tool Modal */}
      {showViewToolModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-[backdropFadeIn_0.3s_ease-out] backdrop-blur-[2px]"
          onClick={() => setShowViewToolModal(false)}
        >
          <div
            className="relative w-full max-w-4xl mx-4 rounded-2xl border border-slate-200 bg-white shadow-xl animate-[modalFadeIn_0.3s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">View Tool</h2>
                <p className="text-sm text-slate-600 mt-1">
                  See the organizations, activities, volunteering, and alumni databases from the student perspective.
                </p>
              </div>
              <button
                onClick={() => setShowViewToolModal(false)}
                className="rounded-full p-2 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link
                  href="/admin/view/organizations"
                  onClick={() => setShowViewToolModal(false)}
                  className="group flex flex-col rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-sm hover:border-slate-300 hover:shadow-md transition"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="rounded-xl border border-slate-100 p-2">
                      <Building07 className="w-5 h-5 text-slate-700" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">Organizations</h3>
                  </div>
                  <p className="text-sm text-slate-600">Browse and explore all student organizations and clubs with admin details</p>
                </Link>

                <Link
                  href="/admin/view/activities"
                  onClick={() => setShowViewToolModal(false)}
                  className="group flex flex-col rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-sm hover:border-slate-300 hover:shadow-md transition"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="rounded-xl border border-slate-100 p-2">
                      <BookOpen01 className="w-5 h-5 text-slate-700" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">Activities</h3>
                  </div>
                  <p className="text-sm text-slate-600">View student activities and their verification status with admin details</p>
                </Link>

                <Link
                  href="/admin/view/volunteering"
                  onClick={() => setShowViewToolModal(false)}
                  className="group flex flex-col rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-sm hover:border-slate-300 hover:shadow-md transition"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="rounded-xl border border-slate-100 p-2">
                      <HeartHand className="w-5 h-5 text-slate-700" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">Volunteering</h3>
                  </div>
                  <p className="text-sm text-slate-600">See volunteering opportunities and student participation with admin details</p>
                </Link>

                <Link
                  href="/admin/view/alumni"
                  onClick={() => setShowViewToolModal(false)}
                  className="group flex flex-col rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-sm hover:border-slate-300 hover:shadow-md transition"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="rounded-xl border border-slate-100 p-2">
                      <GraduationHat01 className="w-5 h-5 text-slate-700" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">Alumni Database</h3>
                  </div>
                  <p className="text-sm text-slate-600">Explore alumni profiles and college application data</p>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Modal */}
      {showNotificationsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-[backdropFadeIn_0.3s_ease-out] backdrop-blur-[2px]"
          onClick={() => setShowNotificationsModal(false)}
        >
          <div
            className="relative w-full max-w-2xl mx-4 rounded-2xl border border-slate-200 bg-white shadow-xl animate-[modalFadeIn_0.3s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-2xl font-semibold text-slate-900">Notifications</h2>
              <button
                onClick={() => setShowNotificationsModal(false)}
                className="rounded-full p-2 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-sm text-slate-500">No new notifications</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {notifications.map((note) => (
                    <li
                      key={note.id}
                      className="rounded-xl border border-slate-200 px-4 py-3 relative group bg-white hover:border-slate-300 transition"
                    >
                      <button
                        type="button"
                        onClick={() => handleNotificationNavigate(note)}
                        className={`w-full text-left pr-10 ${note.href ? "hover:text-slate-900" : "cursor-default"}`}
                      >
                        <p className="font-semibold text-slate-900 mb-1">{note.title}</p>
                        {note.description && <p className="text-sm text-slate-600">{note.description}</p>}
                        <p className="text-[11px] text-slate-400 mt-1">{formatNotificationTime(note.timestamp)}</p>
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (note.id === "welcome") {
                            try {
                              const res = await fetch("/api/admin/dismiss-welcome", {
                                method: "POST",
                              });
                              if (res.ok) {
                                setWelcomeDismissed(true);
                                setNotifications((prev) => prev.filter((n) => n.id !== "welcome"));
                              }
                            } catch (err) {
                              console.error("Error dismissing welcome:", err);
                            }
                          } else {
                            setNotifications((prev) => prev.filter((n) => n.id !== note.id));
                          }
                        }}
                        className="absolute top-3 right-3 rounded-full p-1.5 hover:bg-slate-100 transition text-slate-500 hover:text-slate-700"
                        aria-label="Dismiss notification"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


type AnalyticsSummary = {
  totalStudents: number;
  totalActivities: number;
  totalOrganizations: number;
  verificationByStatus?: { status: string; count: number }[];
};

type AdvisoryStudent = {
  id: string;
  name: string | null;
};

type NotificationItem = {
  id: string;
  title: string;
  description?: string;
  type: "welcome" | "organization" | "petition" | "verification" | "activity";
  timestamp: string;
  dismissible?: boolean;
  href?: string;
};

type AdvisoryHighlights = {
  totalHours: number;
  recentLogs: AdvisoryLog[];
};

type AdvisoryLog = {
  id: string;
  studentName: string;
  description: string;
  hours: number;
  createdAt: string;
};

type ParticipationResponse = {
  id: string;
  student?: { id: string; name: string | null } | null;
  activityName?: string | null;
  organizationName?: string | null;
  activity?: { name?: string | null } | null;
  totalHours?: number | null;
  createdAt: string;
};

type OrganizationEventSummary = {
  id: string;
  title: string;
  organizationName: string;
  startDate: string;
  daysUntil: number;
};

type VolunteeringOpportunityResponse = {
  id: string;
  title: string;
  organization: string | null;
  organizationId: string | null;
  organizationRef?: { name?: string | null } | null;
  startDate: string | null;
};
