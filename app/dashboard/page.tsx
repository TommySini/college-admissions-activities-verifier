"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Clock3,
  BarChart3,
  Building2,
  GraduationCap,
  Sparkles,
  ArrowUpRight,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ActivitiesResponse = { activities?: any[] };
type VerificationsResponse = { verifications?: any[] };
type ParticipationsResponse = { participations?: any[] };
type VolunteeringOpportunitiesResponse = { opportunities?: any[] };
type OrganizationsResponse = { organizations?: any[] };
type AlumniProfilesResponse = { profiles?: any[] };
type ClubsResponse = { clubs?: any[] };

type DashboardMetrics = {
  activities: {
    total: number;
    verified: number;
    pending: number;
    highlight: string;
  };
  volunteering: {
    totalHours: number;
    active: number;
    completed: number;
    upcoming: number;
    highlight: string;
  };
  opportunities: {
    total: number;
    open: number;
    highlight: string;
  };
  organizations: {
    total: number;
    pending: number;
    clubs: number;
    highlight: string;
  };
  alumni: {
    total: number;
    focus: string;
    highlight: string;
  };
};

const initialMetrics: DashboardMetrics = {
  activities: { total: 0, verified: 0, pending: 0, highlight: "Your next milestone" },
  volunteering: { totalHours: 0, active: 0, completed: 0, upcoming: 0, highlight: "Log new hours" },
  opportunities: { total: 0, open: 0, highlight: "Browse curated programs" },
  organizations: { total: 0, pending: 0, clubs: 0, highlight: "Share your organization" },
  alumni: { total: 0, focus: "Stay inspired by alumni journeys", highlight: "Add your profile" },
};


export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [metrics, setMetrics] = useState<DashboardMetrics>(initialMetrics);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activitiesView, setActivitiesView] = useState<'all' | 'verified' | 'pending'>('all');
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated" && session?.user.role === "admin") {
      router.replace("/admin");
    }
  }, [status, session?.user.role, router]);

  const loadMetrics = useCallback(async () => {
    if (status !== "authenticated") return;
    if (session?.user.role === "admin") return;

    setLoading(true);
    setError(null);

    try {
      const [
        activitiesData,
        verificationsData,
        participationsData,
        volunteeringOppData,
        organizationsData,
        alumniData,
        clubsData,
      ] = await Promise.all([
        fetchJSON<ActivitiesResponse>("/api/activities"),
        fetchJSON<VerificationsResponse>("/api/verifications"),
        fetchJSON<ParticipationsResponse>("/api/volunteering-participations"),
        fetchJSON<VolunteeringOpportunitiesResponse>("/api/volunteering-opportunities?limit=12"),
        fetchJSON<OrganizationsResponse>("/api/organizations"),
        fetchJSON<AlumniProfilesResponse>("/api/alumni/profiles"),
        fetchJSON<ClubsResponse>("/api/clubs"),
      ]);

      if (!isMounted.current) {
        return;
      }

      if (
        [
          activitiesData,
          verificationsData,
          participationsData,
          volunteeringOppData,
          organizationsData,
          alumniData,
          clubsData,
        ].some((data) => data === null)
      ) {
        setError("Some panels may be out of date. Refresh to retry.");
      }

      setMetrics(
        computeMetrics({
          activitiesData,
          verificationsData,
          participationsData,
          volunteeringOppData,
          organizationsData,
          alumniData,
          clubsData,
        })
      );
    } catch (error) {
      console.error("[dashboard] Error loading metrics:", error);
      setError("Failed to load dashboard data. Please try refreshing.");
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [status, session?.user.role]);

  useEffect(() => {
    if (status === "authenticated" && session?.user.role !== "admin") {
      loadMetrics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session?.user.role]);

  const firstName = useMemo(() => {
    if (!session?.user?.name) return "there";
    return session.user.name.split(" ")[0];
  }, [session?.user?.name]);

  const activitiesData = useMemo(() => {
    switch (activitiesView) {
      case 'verified':
        return {
          value: formatNumber(metrics.activities.verified),
          description: `Showing verified • ${formatNumber(metrics.activities.pending)} pending • ${formatNumber(metrics.activities.total - metrics.activities.verified - metrics.activities.pending)} other`,
        };
      case 'pending':
        return {
          value: formatNumber(metrics.activities.pending),
          description: `Showing pending • ${formatNumber(metrics.activities.verified)} verified • ${formatNumber(metrics.activities.total - metrics.activities.verified - metrics.activities.pending)} other`,
        };
      default:
        return {
          value: formatNumber(metrics.activities.total),
          description: `${formatNumber(metrics.activities.verified)} verified • ${formatNumber(metrics.activities.pending)} pending`,
        };
    }
  }, [activitiesView, metrics.activities]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-700">
        Preparing your dashboard…
      </div>
    );
  }

  if (session?.user.role === "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-lg">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Admin Access</p>
          <h1 className="mt-4 text-2xl font-semibold text-slate-900">Switch to Admin Console</h1>
          <p className="mt-3 text-sm text-slate-600">
            The student dashboard is hidden for admin accounts. Jump back into the admin experience to manage schools,
            verifications, and analytics.
          </p>
          <Link
            href="/admin"
            className="mt-6 inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:border-blue-200"
          >
            Go to Admin
            <ArrowUpRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-none px-4 md:px-6 xl:px-8 py-8">
        <header className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">Actify Dashboard</p>
            <h1 className="mt-3 text-4xl font-semibold text-slate-900">
              Welcome back, {firstName}
            </h1>
            <p className="mt-2 text-base text-slate-600">
              Here's a live snapshot of your organizations, activities, and opportunities in one glance.
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadMetrics()}
            disabled={loading}
            className={cn(
              "inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:border-blue-200 disabled:cursor-not-allowed disabled:opacity-70",
              loading && "cursor-wait"
            )}
          >
            <Sparkles className="h-4 w-4 text-blue-600" />
            {loading ? "Refreshing…" : "Refresh data"}
          </button>
        </header>

        {error && (
          <div className="mb-6 rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
            {error}
          </div>
        )}

        {loading ? (
          <LoadingGrid />
        ) : (
          <div className="grid auto-rows-[180px] grid-cols-1 gap-4 md:auto-rows-[220px] md:grid-cols-12">
            <WidgetCard
              href="/activities"
              title="Activities"
              icon={<Activity className="h-10 w-10 text-slate-600" />}
              value={activitiesData.value}
              description={activitiesData.description}
              actions={
                <div className="inline-flex rounded-full bg-slate-100 p-0.5 text-xs">
                  {(['all', 'verified', 'pending'] as const).map((view) => (
                    <button
                      key={view}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setActivitiesView(view);
                      }}
                      className={cn(
                        'px-3 py-1 rounded-full transition',
                        activitiesView === view
                          ? 'bg-white shadow-sm border border-slate-200 font-semibold text-slate-900'
                          : 'text-slate-600 hover:text-slate-900'
                      )}
                    >
                      {view.charAt(0).toUpperCase() + view.slice(1)}
                    </button>
                  ))}
                </div>
              }
              stats={[
                { label: "Latest", value: metrics.activities.highlight },
                { label: "Weeklytheta", value: activitiesView === 'all' ? 'All' : activitiesView === 'verified' ? 'Verified' : 'Pending' },
              ]}
              className="md:col-span-12 lg:col-span-6 lg:row-span-2"
            />

            <WidgetCard
              href="/volunteering"
              title="Volunteering"
              icon={<Clock3 className="h-10 w-10 text-slate-600" />}
              value={`${formatNumber(metrics.volunteering.totalHours)}h`}
              description={`${formatNumber(metrics.volunteering.active)} active • ${formatNumber(
                metrics.volunteering.upcoming
              )} upcoming`}
              stats={[
                { label: "Completed", value: formatNumber(metrics.volunteering.completed) },
                { label: "Next", value: metrics.volunteering.highlight },
              ]}
              className="md:col-span-6 lg:col-span-3"
            />

            <ProfileWidget
              session={session}
              className="md:col-span-6 lg:col-span-3"
            />

            <WidgetCard
              href="/opportunities"
              title="Opportunities"
              icon={<BarChart3 className="h-10 w-10 text-slate-600" />}
              value={formatNumber(metrics.opportunities.total)}
              description={`${formatNumber(metrics.opportunities.open)} open to explore`}
              stats={[
                { label: "Spotlight", value: metrics.opportunities.highlight },
              ]}
              className="md:col-span-12 lg:col-span-6"
            />

            <WidgetCard
              href="/organizations"
              title="Organizations & Clubs"
              icon={<Building2 className="h-10 w-10 text-slate-600" />}
              value={formatNumber(metrics.organizations.total)}
              description={`${formatNumber(metrics.organizations.pending)} pending • ${formatNumber(
                metrics.organizations.clubs
              )} clubs live`}
              stats={[
                { label: "Latest submission", value: metrics.organizations.highlight },
                { label: "Clubs listed", value: formatNumber(metrics.organizations.clubs) },
              ]}
              className="md:col-span-6 lg:col-span-3"
            />

            <WidgetCard
              href="/alumni"
              title="Alumni Database"
              icon={<GraduationCap className="h-10 w-10 text-slate-600" />}
              value={formatNumber(metrics.alumni.total)}
              description={metrics.alumni.focus}
              stats={[{ label: "Latest story", value: metrics.alumni.highlight }]}
              className="md:col-span-6 lg:col-span-3"
            />
          </div>
        )}
      </div>
    </div>
  );
}

const numberFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return "0";
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  }
  return numberFormatter.format(value);
}

async function fetchJSON<T>(url: string): Promise<T | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(url, { 
      cache: "no-store",
      signal: controller.signal 
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error(`[dashboard] ${url} failed with ${response.status}`);
      return null;
    }
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`[dashboard] ${url} timed out after 10 seconds`);
    } else {
      console.error(`[dashboard] ${url} error`, error);
    }
    return null;
  }
}

type MetricDependencies = {
  activitiesData: ActivitiesResponse | null;
  verificationsData: VerificationsResponse | null;
  participationsData: ParticipationsResponse | null;
  volunteeringOppData: VolunteeringOpportunitiesResponse | null;
  organizationsData: OrganizationsResponse | null;
  alumniData: AlumniProfilesResponse | null;
  clubsData: ClubsResponse | null;
};

function computeMetrics(data: MetricDependencies): DashboardMetrics {
  const now = Date.now();
  const activities = data.activitiesData?.activities ?? [];
  const verifications = data.verificationsData?.verifications ?? [];
  const participations = data.participationsData?.participations ?? [];
  const volunteeringOpps = data.volunteeringOppData?.opportunities ?? [];
  const organizations = data.organizationsData?.organizations ?? [];
  const profiles = data.alumniData?.profiles ?? [];
  const clubs = data.clubsData?.clubs ?? [];

  const verifiedActivities = activities.filter(
    (activity: any) =>
      activity.verified ||
      (activity.verificationStatus ?? "").toLowerCase() === "accepted" ||
      (activity.status ?? "").toLowerCase() === "verified"
  ).length;

  const pendingVerifications =
    verifications.filter((verification: any) => verification.status === "pending").length ||
    activities.filter(
      (activity: any) =>
        (activity.verificationStatus ?? "").toLowerCase() === "pending" ||
        (!activity.verified && (activity.status ?? "").toLowerCase() !== "rejected")
    ).length;

  const totalHours = participations.reduce(
    (sum, participation) => sum + (Number(participation.totalHours) || 0),
    0
  );
  const activeMissions = participations.filter((p: any) => p.status === "active").length;
  const completedMissions = participations.filter((p: any) => p.status === "completed").length;
  const upcomingOpportunities = volunteeringOpps.filter((opp: any) => {
    if (!opp.startDate) return false;
    return new Date(opp.startDate).getTime() > now;
  });
  const nextOpportunity =
    [...upcomingOpportunities]
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0]?.title ??
    volunteeringOpps[0]?.title ??
    "Log new hours";

  const openOpportunities = volunteeringOpps.filter((opp: any) => {
    const status = (opp.status ?? "").toLowerCase();
    if (status === "approved" || status === "active" || status === "open") return true;
    if (opp.startDate) {
      return new Date(opp.startDate).getTime() > now;
    }
    return false;
  }).length;
  const opportunitySpotlight =
    volunteeringOpps[0]?.title ||
    volunteeringOpps[0]?.organization ||
    "Browse curated programs";

  const pendingOrganizations = organizations.filter((org: any) => org.status === "PENDING").length;
  const latestOrganization = organizations[0]?.name || "Submit a new organization";

  const featuredMajors = Array.from(
    new Set(
      profiles
        .map((profile: any) => profile.intendedMajor)
        .filter(Boolean)
        .map((major: string) => major.trim())
    )
  ).slice(0, 2);
  const latestProfile =
    profiles[0]?.displayName || profiles[0]?.intendedMajor || "Share your admission story";

  return {
    activities: {
      total: activities.length,
      verified: verifiedActivities,
      pending: pendingVerifications,
      highlight: activities[0]?.name || "Keep tracking your story",
    },
    volunteering: {
      totalHours: Math.round(totalHours),
      active: activeMissions,
      completed: completedMissions,
      upcoming: upcomingOpportunities.length,
      highlight: nextOpportunity,
    },
    opportunities: {
      total: volunteeringOpps.length,
      open: openOpportunities,
      highlight: opportunitySpotlight,
    },
    organizations: {
      total: organizations.length,
      pending: pendingOrganizations,
      clubs: clubs.length,
      highlight: latestOrganization,
    },
    alumni: {
      total: profiles.length,
      focus: featuredMajors.length > 0 ? featuredMajors.join(" • ") : "Stay inspired by alumni journeys",
      highlight: latestProfile,
    },
  };
}

type WidgetCardProps = {
  href: string;
  title: string;
  value: string;
  description: string;
  stats?: { label: string; value: string }[];
  icon?: ReactNode;
  className?: string;
  actions?: ReactNode;
  titleClassName?: string;
};

function WidgetCard({
  href,
  title,
  value,
  description,
  stats,
  icon,
  className,
  actions,
  titleClassName,
}: WidgetCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-blue-200 hover:bg-gradient-to-br hover:from-slate-50/60 hover:to-white",
        className
      )}
    >
      <div className="flex h-full flex-col justify-between gap-3">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className={cn("text-xs font-bold uppercase tracking-[0.14em] text-slate-500", titleClassName)}>{title}</p>
            </div>
            {icon && <div className="flex-shrink-0">{icon}</div>}
          </div>
          {actions && (
            <div className="flex items-center" onClick={(e) => e.preventDefault()}>
              {actions}
            </div>
          )}
          <div>
            <p className="text-4xl font-semibold text-slate-900">{value}</p>
            <p className="mt-1.5 text-sm text-slate-600">{description}</p>
          </div>
        </div>
        {stats && stats.length > 0 && (
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm border-t border-slate-100 pt-3">
            {stats.map((stat) => (
              <div key={`${title}-${stat.label}`} className="flex items-center justify-between gap-2">
                <span className="text-slate-500 text-xs truncate">{stat.label}</span>
                <span className="font-semibold text-slate-900 text-xs truncate" title={stat.value}>{stat.value}</span>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 text-sm font-medium text-blue-600 group-hover:text-blue-700">
          Open
          <ArrowUpRight className="h-4 w-4" />
        </div>
      </div>
    </Link>
  );
}

type ProfileWidgetProps = {
  session: ReturnType<typeof useSession>["data"];
  className?: string;
};

function ProfileWidget({ session, className }: ProfileWidgetProps) {
  const initials = getInitials(session?.user?.name);
  const role =
    session?.user?.role?.replace(/\b\w/g, (letter) => letter.toUpperCase()) ?? "Student";
  return (
    <Link
      href="/profile"
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-blue-200 hover:bg-gradient-to-br hover:from-slate-50/60 hover:to-white",
        className
      )}
    >
      <div className="flex h-full flex-col justify-between gap-3">
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Profile</p>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-base font-semibold text-slate-700 border border-slate-200">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-slate-900 truncate">
                {session?.user?.name ?? "Your profile"}
              </p>
              <p className="text-xs text-slate-600">{role}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-blue-600 group-hover:text-blue-700">
          Manage profile
          <ArrowUpRight className="h-4 w-4" />
        </div>
      </div>
    </Link>
  );
}

function getInitials(name?: string | null) {
  if (!name) return <UserRound className="h-5 w-5 text-slate-600" />;
  const parts = name.split(" ").filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function LoadingGrid() {
  const placeholders = [
    "md:col-span-12 lg:col-span-6 lg:row-span-2",
    "md:col-span-6 lg:col-span-3",
    "md:col-span-6 lg:col-span-3",
    "md:col-span-12 lg:col-span-6",
    "md:col-span-6 lg:col-span-3",
    "md:col-span-6 lg:col-span-3",
  ];
  return (
    <div className="grid auto-rows-[180px] grid-cols-1 gap-4 md:auto-rows-[220px] md:grid-cols-12">
      {placeholders.map((placement, index) => (
        <div
          key={index}
          className={cn(
            "animate-pulse rounded-3xl border border-slate-200 bg-slate-50 shadow-sm",
            placement
          )}
        />
      ))}
    </div>
  );
}

