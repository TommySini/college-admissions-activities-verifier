'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  Clock3,
  BarChart3,
  Building2,
  GraduationCap,
  Sparkles,
  ArrowUpRight,
  UserRound,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Plus,
  MapPin,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Briefcase,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AssistantDashboardWidget } from '@/app/components/assistant/AssistantDashboardWidget';
import { AlumniWidget } from '@/app/components/AlumniWidget';
import { VolunteeringWidget } from '@/app/components/VolunteeringWidget';
import { ActivitiesWidget } from '@/app/components/ActivitiesWidget';
import { ClubsWidget } from '@/app/components/ClubsWidget';
import { CalendarWidget } from '@/app/components/CalendarWidget';

type ActivitiesResponse = { activities?: any[] };
type VerificationsResponse = { verifications?: any[] };
type ParticipationsResponse = { participations?: any[] };
type VolunteeringOpportunitiesResponse = { opportunities?: any[] };
type OrganizationsResponse = { organizations?: any[] };
type AlumniProfilesResponse = { profiles?: any[] };
type ClubsResponse = { clubs?: any[] };

type Organization = {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  leadership?: string | null;
  presidentName?: string | null;
  isSchoolClub: boolean;
  contactEmail?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
};

type ActivityData = {
  id: string;
  name: string;
  category: string;
  status: string;
  startDate: string;
  endDate?: string;
  verified?: boolean;
  verificationStatus?: string;
  createdAt: string;
};

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
    uniqueMajors: number;
    newThisMonth: number;
    focus: string;
    highlight: string;
  };
};

const initialMetrics: DashboardMetrics = {
  activities: { total: 0, verified: 0, pending: 0, highlight: 'Your next milestone' },
  volunteering: { totalHours: 0, active: 0, completed: 0, upcoming: 0, highlight: 'Log new hours' },
  opportunities: { total: 0, open: 0, highlight: 'Browse curated programs' },
  organizations: { total: 0, pending: 0, clubs: 0, highlight: 'Share your organization' },
  alumni: {
    total: 0,
    uniqueMajors: 0,
    newThisMonth: 0,
    focus: 'Stay inspired by alumni journeys',
    highlight: 'Add your profile',
  },
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [metrics, setMetrics] = useState<DashboardMetrics>(initialMetrics);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activitiesView, setActivitiesView] = useState<'all' | 'verified' | 'pending'>('all');
  const [activities, setActivities] = useState<ActivityData[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [clubs, setClubs] = useState<Organization[]>([]);
  const [alumniProfiles, setAlumniProfiles] = useState<any[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated' && session?.user.role === 'admin') {
      router.replace('/admin');
    }
  }, [status, session?.user.role, router]);

  const loadMetrics = useCallback(async () => {
    if (status !== 'authenticated') return;
    if (session?.user.role === 'admin') return;

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
        fetchJSON<ActivitiesResponse>('/api/activities'),
        fetchJSON<VerificationsResponse>('/api/verifications'),
        fetchJSON<ParticipationsResponse>('/api/volunteering-participations'),
        fetchJSON<VolunteeringOpportunitiesResponse>('/api/volunteering-opportunities?limit=12'),
        fetchJSON<OrganizationsResponse>('/api/organizations'),
        fetchJSON<AlumniProfilesResponse>('/api/alumni/profiles'),
        fetchJSON<ClubsResponse>('/api/clubs'),
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
        setError('Some panels may be out of date. Refresh to retry.');
      }

      // Store activities for enhanced widget
      if (activitiesData?.activities) {
        setActivities(activitiesData.activities);
      }

      // Store opportunities for enhanced widget
      if (volunteeringOppData?.opportunities) {
        setOpportunities(volunteeringOppData.opportunities);
      }

      // Store organizations and clubs for enhanced widget
      if (organizationsData?.organizations) {
        setOrganizations(organizationsData.organizations);
      }
      if (clubsData?.clubs) {
        setClubs(clubsData.clubs);
      }

      // Store alumni profiles for enhanced widget
      if (alumniData?.profiles) {
        setAlumniProfiles(alumniData.profiles);
      }

      // Build calendar events from activities and opportunities
      const events: Array<{
        id: string;
        title: string;
        date: string;
        source: 'activity' | 'opportunity';
      }> = [];

      // Add activities with start dates
      if (activitiesData?.activities) {
        activitiesData.activities.forEach((activity: any) => {
          if (activity.startDate) {
            events.push({
              id: `activity-${activity.id}`,
              title: activity.name,
              date: activity.startDate,
              source: 'activity' as const,
            });
          }
        });
      }

      // Add volunteering opportunities with start dates
      if (volunteeringOppData?.opportunities) {
        volunteeringOppData.opportunities.forEach((opp: any) => {
          if (opp.startDate) {
            events.push({
              id: `opportunity-${opp.id}`,
              title: opp.title,
              date: opp.startDate,
              source: 'opportunity' as const,
            });
          }
        });
      }

      setCalendarEvents(events);

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
      console.error('[dashboard] Error loading metrics:', error);
      setError('Failed to load dashboard data. Please try refreshing.');
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [status, session?.user.role]);

  useEffect(() => {
    if (status === 'authenticated' && session?.user.role !== 'admin') {
      loadMetrics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session?.user.role]);

  const firstName = useMemo(() => {
    if (!session?.user?.name) return 'there';
    return session.user.name.split(' ')[0];
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

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-700">
        Preparing your dashboard…
      </div>
    );
  }

  if (session?.user.role === 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-lg">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
            Admin Access
          </p>
          <h1 className="mt-4 text-2xl font-semibold text-slate-900">Switch to Admin Console</h1>
          <p className="mt-3 text-sm text-slate-600">
            The student dashboard is hidden for admin accounts. Jump back into the admin experience
            to manage schools, verifications, and analytics.
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
          <p className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-4 py-1 text-xs font-bold uppercase tracking-[0.35em] text-slate-700 shadow-sm">
              Actify Dashboard
            </p>
            <h1 className="mt-3 text-4xl font-semibold text-slate-900">
              Welcome back, {firstName}
            </h1>
            <p className="mt-2 text-base text-slate-600">
              Here's a live snapshot of your organizations, activities, and opportunities in one
              glance.
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadMetrics()}
            disabled={loading}
            className={cn(
              'inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:border-blue-200 disabled:cursor-not-allowed disabled:opacity-70',
              loading && 'cursor-wait'
            )}
          >
            <Sparkles className="h-4 w-4 text-blue-600" />
            {loading ? 'Refreshing…' : 'Refresh data'}
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
            <ActivitiesWidget
              total={metrics.activities.total}
              verified={metrics.activities.verified}
              pending={metrics.activities.pending}
              activities={activities}
              highlight={metrics.activities.highlight}
              className="md:col-span-6 lg:col-span-3 lg:row-span-2"
            />

            <CalendarWidget
              events={calendarEvents}
              className="md:col-span-6 lg:col-span-3 lg:row-span-2"
            />

            <VolunteeringWidget
              totalHours={metrics.volunteering.totalHours}
              active={metrics.volunteering.active}
              completed={metrics.volunteering.completed}
              upcoming={metrics.volunteering.upcoming}
              highlight={metrics.volunteering.highlight}
              className="md:col-span-6 lg:col-span-3"
            />

            <ProfileWidget session={session} className="md:col-span-6 lg:col-span-3" />

            <EnhancedOpportunitiesWidget
              opportunities={opportunities}
              metrics={metrics.opportunities}
              className="md:col-span-12 lg:col-span-6"
            />

            <ClubsWidget
              myOrgs={metrics.organizations.total}
              pending={metrics.organizations.pending}
              clubsLive={metrics.organizations.clubs}
              organizations={organizations}
              clubs={clubs}
              highlight={metrics.organizations.highlight}
              className="md:col-span-6 lg:col-span-3"
            />

            <AlumniWidget
              profiles={alumniProfiles}
              total={metrics.alumni.total}
              uniqueMajors={metrics.alumni.uniqueMajors}
              newThisMonth={metrics.alumni.newThisMonth}
              highlight={metrics.alumni.highlight}
              className="md:col-span-6 lg:col-span-3"
            />

            <AssistantDashboardWidget className="md:col-span-12 lg:col-span-6" />
          </div>
        )}
      </div>
    </div>
  );
}

const numberFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return '0';
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  }
  return numberFormatter.format(value);
}

async function fetchJSON<T>(url: string): Promise<T | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(url, {
      cache: 'no-store',
      signal: controller.signal,
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
      (activity.verificationStatus ?? '').toLowerCase() === 'accepted' ||
      (activity.status ?? '').toLowerCase() === 'verified'
  ).length;

  const pendingVerifications =
    verifications.filter((verification: any) => verification.status === 'pending').length ||
    activities.filter(
      (activity: any) =>
        (activity.verificationStatus ?? '').toLowerCase() === 'pending' ||
        (!activity.verified && (activity.status ?? '').toLowerCase() !== 'rejected')
    ).length;

  const totalHours = participations.reduce(
    (sum, participation) => sum + (Number(participation.totalHours) || 0),
    0
  );
  const activeMissions = participations.filter((p: any) => p.status === 'active').length;
  const completedMissions = participations.filter((p: any) => p.status === 'completed').length;
  const upcomingOpportunities = volunteeringOpps.filter((opp: any) => {
    if (!opp.startDate) return false;
    return new Date(opp.startDate).getTime() > now;
  });
  const nextOpportunity =
    [...upcomingOpportunities].sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    )[0]?.title ??
    volunteeringOpps[0]?.title ??
    'Log new hours';

  const openOpportunities = volunteeringOpps.filter((opp: any) => {
    const status = (opp.status ?? '').toLowerCase();
    if (status === 'approved' || status === 'active' || status === 'open') return true;
    if (opp.startDate) {
      return new Date(opp.startDate).getTime() > now;
    }
    return false;
  }).length;
  const opportunitySpotlight =
    volunteeringOpps[0]?.title || volunteeringOpps[0]?.organization || 'Browse curated programs';

  const pendingOrganizations = organizations.filter((org: any) => org.status === 'PENDING').length;
  const latestOrganization = organizations[0]?.name || 'Submit a new organization';

  const uniqueMajorsSet = Array.from(
    new Set(
      profiles
        .map((profile: any) => profile.intendedMajor)
        .filter(Boolean)
        .map((major: string) => major.trim())
    )
  );
  const featuredMajors = uniqueMajorsSet.slice(0, 2);
  const latestProfile =
    profiles[0]?.displayName || profiles[0]?.intendedMajor || 'Share your admission story';

  // Calculate new profiles this month
  const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;
  const newThisMonth = profiles.filter((profile: any) => {
    if (!profile.createdAt) return false;
    return new Date(profile.createdAt).getTime() > oneMonthAgo;
  }).length;

  return {
    activities: {
      total: activities.length,
      verified: verifiedActivities,
      pending: pendingVerifications,
      highlight: activities[0]?.name || 'Keep tracking your story',
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
      uniqueMajors: uniqueMajorsSet.length,
      newThisMonth,
      focus:
        featuredMajors.length > 0 ? featuredMajors.join(' • ') : 'Stay inspired by alumni journeys',
      highlight: latestProfile,
    },
  };
}

type EnhancedActivitiesWidgetProps = {
  metrics: DashboardMetrics['activities'];
  activities: ActivityData[];
  activitiesView: 'all' | 'verified' | 'pending';
  setActivitiesView: (view: 'all' | 'verified' | 'pending') => void;
  className?: string;
};

function EnhancedActivitiesWidget({
  metrics,
  activities,
  activitiesView,
  setActivitiesView,
  className,
}: EnhancedActivitiesWidgetProps) {
  const verificationRate = metrics.total > 0 ? (metrics.verified / metrics.total) * 100 : 0;

  // Get latest 3 activities based on current view
  const filteredActivities = useMemo(() => {
    let filtered = activities;
    if (activitiesView === 'verified') {
      filtered = activities.filter(
        (a) => a.verified || (a.verificationStatus ?? '').toLowerCase() === 'accepted'
      );
    } else if (activitiesView === 'pending') {
      filtered = activities.filter(
        (a) => (a.verificationStatus ?? a.status ?? '').toLowerCase() === 'pending'
      );
    }
    return filtered.slice(0, 3);
  }, [activities, activitiesView]);

  // Determine next step suggestion
  const nextStepSuggestion = useMemo(() => {
    if (metrics.total === 0) {
      return {
        icon: <Plus className="h-4 w-4" />,
        text: 'Add your first activity',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
      };
    }
    if (metrics.pending > 0) {
      return {
        icon: <Clock className="h-4 w-4" />,
        text: `${metrics.pending} ${metrics.pending === 1 ? 'activity' : 'activities'} awaiting verification`,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
      };
    }
    if (verificationRate < 100) {
      return {
        icon: <TrendingUp className="h-4 w-4" />,
        text: 'Request verification for unverified activities',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
      };
    }
    return {
      icon: <CheckCircle2 className="h-4 w-4" />,
      text: 'All activities verified! Add more to strengthen your profile',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    };
  }, [metrics, verificationRate]);

  const getStatusDisplay = (activity: ActivityData) => {
    const verified =
      activity.verified || (activity.verificationStatus ?? '').toLowerCase() === 'accepted';
    const pending =
      (activity.verificationStatus ?? activity.status ?? '').toLowerCase() === 'pending';

    if (verified) {
      return {
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
        text: 'Verified',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
      };
    }
    if (pending) {
      return {
        icon: <Clock className="h-3.5 w-3.5" />,
        text: 'Pending',
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
      };
    }
    return {
      icon: <AlertCircle className="h-3.5 w-3.5" />,
      text: 'Unverified',
      color: 'text-slate-500',
      bgColor: 'bg-slate-50',
      borderColor: 'border-slate-200',
    };
  };

  return (
    <Link
      href="/activities"
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-blue-200 hover:bg-gradient-to-br hover:from-slate-50/60 hover:to-white',
        className
      )}
    >
      <div className="flex h-full flex-col p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
              Activities
            </p>
          </div>
          <Activity className="h-10 w-10 text-slate-600 transition-transform group-hover:scale-110" />
        </div>

        {/* View Toggle */}
        <div className="mb-4" onClick={(e) => e.preventDefault()}>
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
                  'px-3 py-1.5 rounded-full transition-all duration-200',
                  activitiesView === view
                    ? 'bg-white shadow-sm border border-slate-200 font-semibold text-slate-900 scale-105'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                )}
              >
                {view.charAt(0).toUpperCase() + view.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Main Metrics */}
        <div className="mb-4">
          <p className="text-4xl font-semibold text-slate-900 mb-2">
            {activitiesView === 'all' && metrics.total}
            {activitiesView === 'verified' && metrics.verified}
            {activitiesView === 'pending' && metrics.pending}
          </p>
          <div className="flex items-center gap-2 text-xs text-slate-600 mb-3">
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
              {metrics.verified} verified
            </span>
            <span className="text-slate-300">•</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-amber-600" />
              {metrics.pending} pending
            </span>
          </div>

          {/* Progress Bar */}
          {metrics.total > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Verification progress</span>
                <span className="font-semibold text-slate-700">
                  {Math.round(verificationRate)}%
                </span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${verificationRate}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Latest Activities */}
        {filteredActivities.length > 0 && (
          <div className="flex-1 min-h-0 mb-4" onClick={(e) => e.preventDefault()}>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Latest {activitiesView !== 'all' ? activitiesView : ''}
            </p>
            <div className="space-y-2 overflow-y-auto max-h-[180px]">
              {filteredActivities.map((activity) => {
                const status = getStatusDisplay(activity);
                return (
                  <div
                    key={activity.id}
                    className="group/item p-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:bg-white hover:border-slate-200 hover:shadow-sm transition-all duration-200 cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-xs font-semibold text-slate-900 line-clamp-1 group-hover/item:text-blue-600 transition-colors">
                        {activity.name}
                      </p>
                      <div
                        className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border shrink-0',
                          status.color,
                          status.bgColor,
                          status.borderColor
                        )}
                      >
                        {status.icon}
                        {status.text}
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 line-clamp-1">{activity.category}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Next Step Suggestion */}
        <div
          className={cn(
            'p-3 rounded-xl border transition-all duration-200',
            nextStepSuggestion.bgColor,
            nextStepSuggestion.color.replace('text-', 'border-').replace('600', '200')
          )}
        >
          <div className="flex items-center gap-2">
            {nextStepSuggestion.icon}
            <p className="text-xs font-medium">{nextStepSuggestion.text}</p>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="flex items-center gap-2 text-sm font-medium text-blue-600 group-hover:text-blue-700 mt-3">
          View all activities
          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
      </div>
    </Link>
  );
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
        'group relative flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-blue-200 hover:bg-gradient-to-br hover:from-slate-50/60 hover:to-white',
        className
      )}
    >
      <div className="flex h-full flex-col justify-between gap-3">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  'text-xs font-bold uppercase tracking-[0.14em] text-slate-500',
                  titleClassName
                )}
              >
                {title}
              </p>
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
              <div
                key={`${title}-${stat.label}`}
                className="flex items-center justify-between gap-2"
              >
                <span className="text-slate-500 text-xs truncate">{stat.label}</span>
                <span className="font-semibold text-slate-900 text-xs truncate" title={stat.value}>
                  {stat.value}
                </span>
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
  session: ReturnType<typeof useSession>['data'];
  className?: string;
};

function ProfileWidget({ session, className }: ProfileWidgetProps) {
  const initials = getInitials(session?.user?.name);
  const role = session?.user?.role?.replace(/\b\w/g, (letter) => letter.toUpperCase()) ?? 'Student';

  // Calculate profile completion based on available data
  const completionPercentage = useMemo(() => {
    let completed = 0;
    const total = 4;

    if (session?.user?.name) completed++;
    if (session?.user?.email) completed++;
    if (session?.user?.role) completed++;
    if (session?.user?.image) completed++;

    return Math.round((completed / total) * 100);
  }, [session?.user]);

  return (
    <Link
      href="/profile"
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-blue-300 hover:bg-gradient-to-br hover:from-blue-50/40 hover:to-white',
        className
      )}
    >
      <div className="flex h-full flex-col justify-between gap-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 group-hover:text-slate-600 transition-colors">
              Profile
            </p>
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-semibold text-slate-500 group-hover:text-slate-600 transition-colors">
                ACTIVE
              </span>
            </div>
          </div>

          {/* Profile info with enhanced hover effect */}
          <div className="flex items-center gap-3 cursor-pointer">
            <div className="relative flex-shrink-0">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 text-base font-bold text-slate-700 border border-slate-200 shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md group-hover:border-blue-300 group-hover:from-blue-50 group-hover:to-slate-50">
                {initials}
              </div>
              {/* Subtle ring indicator on hover */}
              <div className="absolute inset-0 rounded-2xl bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-slate-900 truncate transition-colors group-hover:text-blue-900">
                {session?.user?.name ?? 'Your profile'}
              </p>
              <p className="text-xs text-slate-600 transition-colors group-hover:text-slate-700">
                {role}
              </p>
            </div>
          </div>

          {/* Profile completion indicator */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500">Profile completion</span>
              <span className="text-[11px] font-bold text-slate-900">{completionPercentage}%</span>
            </div>
            <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500 group-hover:from-blue-600 group-hover:to-blue-700"
                style={{ width: `${completionPercentage}%` }}
              />
              {/* Shimmer effect */}
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  width: `${completionPercentage}%`,
                  animation: 'shimmer 2s infinite',
                }}
              />
            </div>
          </div>
        </div>

        {/* Call to action */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 group-hover:border-blue-100 transition-colors">
          <span className="text-sm font-semibold text-blue-600 group-hover:text-blue-700 transition-colors">
            Manage profile
          </span>
          <div className="flex items-center justify-center h-7 w-7 rounded-full bg-blue-50 text-blue-600 transition-all duration-300 group-hover:bg-blue-600 group-hover:text-white group-hover:scale-110">
            <ArrowUpRight className="h-4 w-4" />
          </div>
        </div>
      </div>
    </Link>
  );
}

function getInitials(name?: string | null) {
  if (!name) return <UserRound className="h-5 w-5 text-slate-600" />;
  const parts = name.split(' ').filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

type EnhancedOrganizationsWidgetProps = {
  organizations: Organization[];
  clubs: Organization[];
  metrics: DashboardMetrics['organizations'];
  className?: string;
};

function EnhancedOrganizationsWidget({
  organizations,
  clubs,
  metrics,
  className,
}: EnhancedOrganizationsWidgetProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Combine and sort all organizations (user's + approved clubs)
  const allOrgs = useMemo(() => {
    const combined = [...organizations];
    // Add approved clubs that aren't already in user's organizations
    const userOrgIds = new Set(organizations.map((o) => o.id));
    clubs.forEach((club) => {
      if (!userOrgIds.has(club.id) && club.status === 'APPROVED') {
        combined.push(club);
      }
    });
    return combined.slice(0, 4); // Show max 4
  }, [organizations, clubs]);

  const getStatusBadge = (status: Organization['status']) => {
    const styles = {
      PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
      APPROVED: 'bg-green-100 text-green-700 border-green-200',
      REJECTED: 'bg-red-100 text-red-700 border-red-200',
    };
    return (
      <span
        className={cn(
          'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all duration-300',
          styles[status]
        )}
      >
        {status}
      </span>
    );
  };

  const getTypeBadge = (isSchoolClub: boolean) => {
    return (
      <span
        className={cn(
          'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all duration-300',
          isSchoolClub
            ? 'bg-blue-100 text-blue-700 border-blue-200'
            : 'bg-purple-100 text-purple-700 border-purple-200'
        )}
      >
        {isSchoolClub ? 'Club' : 'External'}
      </span>
    );
  };

  return (
    <Link
      href="/organizations#submit-organization"
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-blue-300',
        className
      )}
    >
      {/* Background gradient on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50/60 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="relative z-10 flex h-full flex-col p-6">
        {/* Header */}
        <div className="space-y-3 mb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 group-hover:text-slate-600 transition-colors">
                Organizations & Clubs
              </p>
            </div>
            <Building2 className="h-10 w-10 text-slate-600 transition-all duration-300 group-hover:text-blue-600 group-hover:scale-110" />
          </div>

          <div>
            <p className="text-4xl font-semibold text-slate-900">{formatNumber(metrics.total)}</p>
            <p className="mt-1.5 text-sm text-slate-600">
              {formatNumber(metrics.pending)} pending • {formatNumber(metrics.clubs)} clubs live
            </p>
          </div>
        </div>

        {/* Organizations cards grid */}
        {allOrgs.length > 0 ? (
          <div className="flex-1 overflow-hidden">
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
              {allOrgs.map((org, index) => (
                <div
                  key={org.id}
                  onMouseEnter={() => setHoveredId(org.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={cn(
                    'relative rounded-2xl border bg-white p-3 transition-all duration-300',
                    hoveredId === org.id
                      ? 'border-blue-300 shadow-md scale-[1.02] z-10'
                      : 'border-slate-200 shadow-sm hover:border-slate-300'
                  )}
                  style={{
                    animation: `fadeInUp 0.4s ease-out ${index * 0.1}s both`,
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  {/* Card content */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-slate-900 truncate transition-colors">
                          {org.name}
                        </h4>
                        {org.category && (
                          <p className="text-xs text-slate-500 truncate mt-0.5">{org.category}</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        {getStatusBadge(org.status)}
                        {getTypeBadge(org.isSchoolClub)}
                      </div>
                    </div>

                    {/* Metadata revealed on hover */}
                    <div
                      className={cn(
                        'overflow-hidden transition-all duration-300',
                        hoveredId === org.id ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'
                      )}
                    >
                      <div className="pt-2 border-t border-slate-100 space-y-1">
                        {org.presidentName && (
                          <div className="flex items-center gap-2 text-xs">
                            <UserRound className="h-3 w-3 text-slate-400" />
                            <span className="text-slate-600 truncate">{org.presidentName}</span>
                          </div>
                        )}
                        {org.createdAt && (
                          <div className="flex items-center gap-2 text-xs">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            <span className="text-slate-500">
                              {new Date(org.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-sm text-slate-500 py-8">
              <Building2 className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              <p>No organizations yet</p>
            </div>
          </div>
        )}

        {/* Footer CTA */}
        <div className="flex items-center justify-between gap-2 pt-4 mt-4 border-t border-slate-100 group-hover:border-blue-100 transition-colors">
          <span className="text-sm font-semibold text-blue-600 group-hover:text-blue-700 transition-colors">
            View all & submit
          </span>
          <div className="flex items-center justify-center h-7 w-7 rounded-full bg-blue-50 text-blue-600 transition-all duration-300 group-hover:bg-blue-600 group-hover:text-white group-hover:scale-110">
            <ArrowUpRight className="h-4 w-4" />
          </div>
        </div>
      </div>
    </Link>
  );
}

function LoadingGrid() {
  const placeholders = [
    'md:col-span-12 lg:col-span-6 lg:row-span-2',
    'md:col-span-6 lg:col-span-3',
    'md:col-span-6 lg:col-span-3',
    'md:col-span-12 lg:col-span-6',
    'md:col-span-6 lg:col-span-3',
    'md:col-span-6 lg:col-span-3',
  ];
  return (
    <div className="grid auto-rows-[180px] grid-cols-1 gap-4 md:auto-rows-[220px] md:grid-cols-12">
      {placeholders.map((placement, index) => (
        <div
          key={index}
          className={cn(
            'animate-pulse rounded-3xl border border-slate-200 bg-slate-50 shadow-sm',
            placement
          )}
        />
      ))}
    </div>
  );
}

type EnhancedOpportunitiesWidgetProps = {
  opportunities: any[];
  metrics: {
    total: number;
    open: number;
    highlight: string;
  };
  className?: string;
};

function EnhancedOpportunitiesWidget({
  opportunities,
  metrics,
  className,
}: EnhancedOpportunitiesWidgetProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [activeTab, setActiveTab] = useState<'internships' | 'extracurriculars' | 'competitions'>(
    'internships'
  );
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

  // Placeholder spotlight opportunities (will be replaced with real data later)
  const placeholderOpportunities = {
    internships: [
      {
        id: 'int-1',
        title: 'Software Engineering Intern',
        organization: 'Tech Innovations Inc.',
        description:
          'Join our team to work on cutting-edge AI projects and gain real-world experience.',
        location: 'San Francisco, CA',
        startDate: '2025-06-01',
      },
      {
        id: 'int-2',
        title: 'Marketing Intern',
        organization: 'Global Marketing Solutions',
        description: 'Help develop marketing campaigns for Fortune 500 companies.',
        location: 'New York, NY',
        startDate: '2025-06-15',
      },
      {
        id: 'int-3',
        title: 'Research Assistant',
        organization: 'University Medical Center',
        description: 'Assist in groundbreaking medical research focused on cancer treatment.',
        location: 'Boston, MA',
        startDate: '2025-07-01',
      },
    ],
    extracurriculars: [
      {
        id: 'ext-1',
        title: 'Debate Team Captain',
        organization: 'National Debate League',
        description: 'Lead your school debate team in regional and national competitions.',
        location: 'Virtual & In-Person',
        startDate: '2025-09-01',
      },
      {
        id: 'ext-2',
        title: 'Student Government President',
        organization: 'High School Leadership',
        description: 'Represent your peers and drive positive change in your school community.',
        location: 'Your School',
        startDate: '2025-08-15',
      },
      {
        id: 'ext-3',
        title: 'Robotics Club Member',
        organization: 'FIRST Robotics',
        description: 'Design, build, and program robots for international competitions.',
        location: 'Multiple Locations',
        startDate: '2025-09-10',
      },
    ],
    competitions: [
      {
        id: 'comp-1',
        title: 'National Science Olympiad',
        organization: 'Science Olympiad Foundation',
        description: 'Compete in 23 different STEM events against top students nationwide.',
        location: 'Various Locations',
        startDate: '2025-03-15',
      },
      {
        id: 'comp-2',
        title: 'Math Competition Series',
        organization: 'American Mathematics Competitions',
        description: 'Test your problem-solving skills in this prestigious math competition.',
        location: 'Online',
        startDate: '2025-02-01',
      },
      {
        id: 'comp-3',
        title: 'Hackathon Challenge',
        organization: 'CodeCraft',
        description: 'Build innovative tech solutions in 48 hours with a team.',
        location: 'San Jose, CA',
        startDate: '2025-04-20',
      },
    ],
  };

  // Get spotlighted opportunities based on active tab
  const spotlightOpportunities = placeholderOpportunities[activeTab];
  const hasSpotlight = spotlightOpportunities.length > 0;

  // Auto-rotate through opportunities every 4 seconds
  useEffect(() => {
    if (!isAutoPlaying || spotlightOpportunities.length <= 1) return;

    autoPlayRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % spotlightOpportunities.length);
    }, 4000);

    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
      }
    };
  }, [isAutoPlaying, spotlightOpportunities.length]);

  // Reset carousel when tab changes
  useEffect(() => {
    setCurrentIndex(0);
    setIsAutoPlaying(true);
  }, [activeTab]);

  const handlePrevious = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev === 0 ? spotlightOpportunities.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev + 1) % spotlightOpportunities.length);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-blue-200',
        className
      )}
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
    >
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 via-indigo-50/0 to-violet-50/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative flex h-full flex-col p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
              Opportunities
            </p>
          </div>
          <div className="flex-shrink-0">
            <div className="relative">
              <div className="absolute inset-0 animate-pulse rounded-2xl bg-blue-500/20 blur-xl" />
              <BarChart3 className="relative h-10 w-10 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-4" onClick={(e) => e.preventDefault()}>
          <div className="inline-flex rounded-full bg-slate-100 p-0.5 text-xs w-full">
            {(['internships', 'extracurriculars', 'competitions'] as const).map((tab) => (
              <button
                key={tab}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveTab(tab);
                }}
                className={cn(
                  'flex-1 px-3 py-1.5 rounded-full transition-all duration-200 text-center',
                  activeTab === tab
                    ? 'bg-white shadow-sm border border-slate-200 font-semibold text-slate-900 scale-105'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                )}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Spotlight Carousel */}
        {hasSpotlight && spotlightOpportunities.length > 0 && (
          <div className="flex-1 mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                ✨ Spotlight
              </p>
              {spotlightOpportunities.length > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handlePrevious();
                    }}
                    className="rounded-full p-1 hover:bg-slate-100 transition-colors"
                    aria-label="Previous opportunity"
                  >
                    <ChevronLeft className="h-4 w-4 text-slate-600" />
                  </button>
                  <div className="flex gap-1 px-2">
                    {spotlightOpportunities.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setCurrentIndex(idx);
                          setIsAutoPlaying(false);
                        }}
                        className={cn(
                          'h-1.5 rounded-full transition-all',
                          idx === currentIndex
                            ? 'w-6 bg-blue-600'
                            : 'w-1.5 bg-slate-300 hover:bg-slate-400'
                        )}
                        aria-label={`Go to opportunity ${idx + 1}`}
                      />
                    ))}
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleNext();
                    }}
                    className="rounded-full p-1 hover:bg-slate-100 transition-colors"
                    aria-label="Next opportunity"
                  >
                    <ChevronRight className="h-4 w-4 text-slate-600" />
                  </button>
                </div>
              )}
            </div>

            {/* Carousel Cards */}
            <div className="relative h-[120px] overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200">
              {spotlightOpportunities.map((opp, idx) => (
                <div
                  key={opp.id || idx}
                  className={cn(
                    'absolute inset-0 p-4 transition-all duration-500 ease-in-out',
                    idx === currentIndex
                      ? 'translate-x-0 opacity-100'
                      : idx < currentIndex
                        ? '-translate-x-full opacity-0'
                        : 'translate-x-full opacity-0'
                  )}
                >
                  <div className="flex flex-col h-full justify-between">
                    <div>
                      <h4 className="font-semibold text-slate-900 text-sm mb-1 line-clamp-2">
                        {opp.title || 'Untitled Opportunity'}
                      </h4>
                      <p className="text-xs text-slate-600 mb-2">
                        {opp.organization || 'Organization'}
                      </p>
                      {opp.description && (
                        <p className="text-xs text-slate-500 line-clamp-2">{opp.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      {opp.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate max-w-[100px]">{opp.location}</span>
                        </div>
                      )}
                      {opp.startDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(opp.startDate)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Enhanced CTA */}
        <Link
          href="/opportunities"
          className="group/cta relative flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
        >
          <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 opacity-0 transition-opacity group-hover/cta:opacity-100" />
          <span className="relative">Explore All Programs</span>
          <ExternalLink className="relative h-4 w-4 transition-transform group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5" />
        </Link>
      </div>
    </div>
  );
}
