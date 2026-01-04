'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  History,
  TrendingUp,
} from 'lucide-react';
import { useColors } from '../context/ColorContext';
import { HoursChart } from '../components/HoursChart';
import { OpportunityCompletionPrompt } from '../components/OpportunityCompletionPrompt';

interface VolunteeringOpportunity {
  id: string;
  title: string;
  description: string;
  organization: string;
  category: string;
  location: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  startDate: string;
  endDate: string | null;
  isOngoing: boolean;
  isOnline: boolean;
  hoursPerSession: number | null;
  totalHours: number | null;
  commitmentLevel: string | null;
  ageRequirement: string | null;
  maxVolunteers: number | null;
  status: string;
  createdAt: string;
  postedBy: {
    id: string;
    name: string;
    email: string;
  };
  _count: {
    participations: number;
  };
}

interface Participation {
  id: string;
  opportunityId: string | null; // Nullable for manual logs
  studentId: string;
  startDate: string;
  endDate: string | null;
  totalHours: number;
  hoursPerWeek: number | null;
  status: string;
  verified: boolean;
  isManualLog?: boolean;
  organizationName?: string | null;
  activityName?: string | null;
  activityDescription?: string | null;
  serviceSheetUrl?: string | null;
  opportunity: VolunteeringOpportunity | null; // Nullable for manual logs
}

const CATEGORIES = [
  'Environment',
  'Education',
  'Healthcare',
  'Community Service',
  'Animal Welfare',
  'Arts & Culture',
  'Sports & Recreation',
  'Technology',
  'Other',
];

const COMMITMENT_LEVELS = ['Low', 'Medium', 'High'];

export default function VolunteeringPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const colors = useColors();
  const [opportunities, setOpportunities] = useState<VolunteeringOpportunity[]>([]);
  const [participations, setParticipations] = useState<Participation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedCommitment, setSelectedCommitment] = useState<string>('');
  const [isOnlineFilter, setIsOnlineFilter] = useState<boolean | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [total, setTotal] = useState(0);
  const [goals, setGoals] = useState<any[]>([]);
  const [showGoalManager, setShowGoalManager] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalName, setGoalName] = useState('');
  const [goalHours, setGoalHours] = useState('');
  const [goalDate, setGoalDate] = useState('');
  const [completionParticipations, setCompletionParticipations] = useState<any[]>([]);
  const [showCompletionPrompt, setShowCompletionPrompt] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [chartTimeRange, setChartTimeRange] = useState<'1W' | '1M' | '6M' | '1Y' | '2Y' | 'all'>(
    '1M'
  );
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);
  const [showLogHoursModal, setShowLogHoursModal] = useState(false);
  const [logHoursFormData, setLogHoursFormData] = useState({
    organizationName: '',
    activityDescription: '',
    startDate: '',
    endDate: '',
    isOneDay: false,
    totalHours: '',
    serviceSheetUrl: '',
  });
  const [uploadedFile, setUploadedFile] = useState<{ url: string; name: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmittingLogHours, setIsSubmittingLogHours] = useState(false);
  const [logHoursError, setLogHoursError] = useState('');
  const [showAddOpportunityModal, setShowAddOpportunityModal] = useState(false);
  const [opportunityFormData, setOpportunityFormData] = useState({
    name: '',
    description: '',
    startTime: '',
    endTime: '',
    date: '',
    isRecurring: false,
    recurrenceFrequency: 'weekly', // "weekly", "monthly", "daily"
  });
  const [isSubmittingOpportunity, setIsSubmittingOpportunity] = useState(false);
  const [opportunityError, setOpportunityError] = useState('');
  const [opportunitySuccess, setOpportunitySuccess] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (status === 'authenticated') {
      fetchOpportunities();
      if (session?.user.role === 'student') {
        fetchParticipations();
        fetchGoals();
        checkCompletions();
      }
    }

    // Check for success message from log hours redirect
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('logged') === 'true') {
      setShowSuccessMessage(true);
      // Refresh participations to show newly logged hours
      if (session?.user.role === 'student') {
        fetchParticipations();
      }
      // Remove query param
      window.history.replaceState({}, '', '/volunteering');
      // Hide message after 5 seconds
      setTimeout(() => setShowSuccessMessage(false), 5000);
    }
  }, [
    status,
    router,
    selectedCategories,
    selectedLocation,
    selectedCommitment,
    isOnlineFilter,
    searchQuery,
  ]);

  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCategories.length > 0) {
        params.append('categories', selectedCategories.join(','));
      }
      if (selectedLocation) params.append('location', selectedLocation);
      if (isOnlineFilter !== null) params.append('isOnline', isOnlineFilter.toString());
      if (searchQuery) params.append('search', searchQuery);
      params.append('status', 'approved');

      const response = await fetch(`/api/volunteering-opportunities?${params.toString()}`);
      const data = await response.json();

      if (response.ok) {
        let filtered = data.opportunities;
        if (selectedCommitment) {
          filtered = filtered.filter(
            (opp: VolunteeringOpportunity) => opp.commitmentLevel === selectedCommitment
          );
        }
        setOpportunities(filtered);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('Error fetching opportunities:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchParticipations = async () => {
    try {
      const response = await fetch('/api/volunteering-participations', {
        credentials: 'include', // Ensure cookies are sent
      });
      const data = await response.json();
      if (response.ok) {
        setParticipations(data.participations || []);
      } else {
        // Silently fail - just log and use empty array
        console.warn('Could not load participations:', data.error || 'Unknown error');
        setParticipations([]); // Set empty array so page still works
      }
    } catch (error) {
      // Silently fail - just log and use empty array
      console.warn('Error fetching participations:', error);
      setParticipations([]); // Set empty array so page still works
    }
  };

  const fetchGoals = async () => {
    try {
      const response = await fetch('/api/volunteering-goals', {
        credentials: 'include',
      });
      const data = await response.json();
      if (response.ok) {
        setGoals(data.goals || []);
      }
    } catch (error) {
      console.error('Error fetching goals:', error);
    }
  };

  const checkCompletions = async () => {
    try {
      const response = await fetch('/api/volunteering-participations/check-completions');
      const data = await response.json();
      if (response.ok && data.participations && data.participations.length > 0) {
        setCompletionParticipations(data.participations);
        setShowCompletionPrompt(true);
      }
    } catch (error) {
      console.error('Error checking completions:', error);
    }
  };

  const handleCompleteParticipation = async (participationId: string, completed: boolean) => {
    try {
      const response = await fetch(`/api/volunteering-participations/${participationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: completed ? 'completed' : 'cancelled',
        }),
      });

      if (response.ok) {
        // Refresh participations to update stats
        await fetchParticipations();
        // Remove from completion list
        setCompletionParticipations((prev) => prev.filter((p) => p.id !== participationId));
        if (completionParticipations.length === 1) {
          setShowCompletionPrompt(false);
        }
      } else {
        throw new Error('Failed to update participation');
      }
    } catch (error) {
      console.error('Error updating participation:', error);
      throw error;
    }
  };

  const handleCreateGoal = async () => {
    if (!goalName || !goalName.trim()) {
      alert('Please enter a goal name');
      return;
    }
    if (!goalHours || parseFloat(goalHours) <= 0) {
      alert('Please enter a valid goal hours amount');
      return;
    }
    if (!goalDate) {
      alert('Please enter a due date');
      return;
    }

    try {
      const response = await fetch('/api/volunteering-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          targetHours: parseFloat(goalHours),
          targetDate: goalDate || null,
          description: goalName.trim(),
          goalType: 'personal',
        }),
      });

      let data: any = {};
      try {
        const text = await response.text();
        console.log('Raw response text:', text);

        if (text) {
          try {
            data = JSON.parse(text);
          } catch (parseError) {
            console.error('Error parsing JSON:', parseError);
            data = { error: text || `Server returned ${response.status}: ${response.statusText}` };
          }
        } else {
          data = { error: `Empty response from server (${response.status})` };
        }
      } catch (readError) {
        console.error('Error reading response:', readError);
        data = { error: `Failed to read response (${response.status})` };
      }

      console.log('Goal creation response:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText,
        data,
        dataKeys: Object.keys(data || {}),
      });

      if (response.ok) {
        setShowGoalForm(false);
        setGoalName('');
        setGoalHours('');
        setGoalDate('');
        fetchGoals();
      } else {
        console.error('Failed to create goal:', {
          status: response.status,
          statusText: response.statusText,
          data,
          dataType: typeof data,
          dataKeys: Object.keys(data || {}),
        });
        const errorMessage =
          data?.error || data?.message || `Failed to create goal (${response.status})`;
        alert(errorMessage);
      }
    } catch (error: any) {
      console.error('Error creating goal:', error);
      alert(
        `Failed to create goal: ${error?.message || 'Unknown error'}. Please check your connection and try again.`
      );
    }
  };

  const handleOneDayToggle = () => {
    const newIsOneDay = !logHoursFormData.isOneDay;
    setLogHoursFormData({
      ...logHoursFormData,
      isOneDay: newIsOneDay,
      endDate: newIsOneDay ? logHoursFormData.startDate : logHoursFormData.endDate,
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setLogHoursError('Invalid file type. Please upload a PDF or image file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setLogHoursError('File size exceeds 5MB limit.');
      return;
    }

    setIsUploading(true);
    setLogHoursError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setUploadedFile({ url: data.url, name: data.fileName });
        setLogHoursFormData((prev) => ({ ...prev, serviceSheetUrl: data.url }));
      } else {
        setLogHoursError(data.error || 'Failed to upload file');
      }
    } catch (err) {
      setLogHoursError('Failed to upload file. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleLogHoursSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLogHoursError('');

    if (
      !logHoursFormData.organizationName ||
      !logHoursFormData.activityDescription ||
      !logHoursFormData.startDate ||
      !logHoursFormData.totalHours
    ) {
      setLogHoursError('Please fill in all required fields');
      return;
    }

    if (parseFloat(logHoursFormData.totalHours) <= 0) {
      setLogHoursError('Total hours must be greater than 0');
      return;
    }

    setIsSubmittingLogHours(true);

    try {
      const response = await fetch('/api/volunteering-participations/log-hours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationName: logHoursFormData.organizationName,
          activityDescription: logHoursFormData.activityDescription,
          startDate: logHoursFormData.startDate,
          endDate: logHoursFormData.isOneDay
            ? logHoursFormData.startDate
            : logHoursFormData.endDate || logHoursFormData.startDate,
          totalHours: parseFloat(logHoursFormData.totalHours),
          serviceSheetUrl: logHoursFormData.serviceSheetUrl || null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setShowLogHoursModal(false);
        setLogHoursFormData({
          organizationName: '',
          activityDescription: '',
          startDate: '',
          endDate: '',
          isOneDay: false,
          totalHours: '',
          serviceSheetUrl: '',
        });
        setUploadedFile(null);
        fetchParticipations();
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 5000);
      } else {
        setLogHoursError(data.error || 'Failed to log hours');
        setIsSubmittingLogHours(false);
      }
    } catch (err: any) {
      setLogHoursError(`An error occurred: ${err?.message || 'Please try again.'}`);
      setIsSubmittingLogHours(false);
    }
  };

  const handleAddOpportunitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOpportunityError('');
    setOpportunitySuccess(false);

    if (
      !opportunityFormData.name ||
      !opportunityFormData.description ||
      !opportunityFormData.startTime ||
      !opportunityFormData.endTime ||
      !opportunityFormData.date
    ) {
      setOpportunityError('Please fill in all required fields');
      return;
    }

    setIsSubmittingOpportunity(true);

    try {
      const response = await fetch('/api/volunteering-opportunities/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: opportunityFormData.name,
          description: opportunityFormData.description,
          startTime: opportunityFormData.startTime,
          endTime: opportunityFormData.endTime,
          date: opportunityFormData.date,
          isRecurring: opportunityFormData.isRecurring,
          recurrenceFrequency: opportunityFormData.isRecurring
            ? opportunityFormData.recurrenceFrequency
            : null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setOpportunitySuccess(true);
        setOpportunityFormData({
          name: '',
          description: '',
          startTime: '',
          endTime: '',
          date: '',
          isRecurring: false,
          recurrenceFrequency: 'weekly',
        });
        setTimeout(() => {
          setShowAddOpportunityModal(false);
          setOpportunitySuccess(false);
        }, 2000);
      } else {
        setOpportunityError(data.error || 'Failed to submit opportunity request');
      }
    } catch (error) {
      console.error('Error submitting opportunity:', error);
      setOpportunityError('Failed to submit opportunity request. Please try again.');
    } finally {
      setIsSubmittingOpportunity(false);
    }
  };

  // Calculate stats
  const totalHours = participations.reduce((sum, p) => sum + p.totalHours, 0);
  const totalActivities = participations.length;

  // Calculate average hours per month
  let averageHoursPerMonth = 0;
  if (participations.length > 0) {
    const now = new Date();
    const earliestDate = participations.reduce((earliest, p) => {
      const pDate = new Date(p.startDate);
      return pDate < earliest ? pDate : earliest;
    }, new Date(participations[0].startDate));

    const monthsDiff = Math.max(
      1,
      (now.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
    );
    averageHoursPerMonth = totalHours / monthsDiff;
  }

  // Find next goal (closest unreached goal)
  const sortedGoals = [...goals]
    .filter((g) => g.status === 'active')
    .sort((a, b) => a.targetHours - b.targetHours);
  const nextGoal = sortedGoals.find((g) => g.targetHours > totalHours);
  const percentTowardsGoal = nextGoal
    ? Math.min((totalHours / nextGoal.targetHours) * 100, 100)
    : 0;

  // Calculate hours per month for bar chart
  const monthlyHours: { [key: string]: number } = {};
  participations.forEach((p) => {
    const startDate = new Date(p.startDate);
    const endDate = p.endDate ? new Date(p.endDate) : new Date(p.startDate);

    // Distribute hours across months
    const startMonth = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
    const endMonth = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`;

    if (startMonth === endMonth) {
      // Single month participation
      monthlyHours[startMonth] = (monthlyHours[startMonth] || 0) + p.totalHours;
    } else {
      // Multi-month participation - distribute evenly
      const startTime = startDate.getTime();
      const endTime = endDate.getTime();
      const totalDays = Math.ceil((endTime - startTime) / (1000 * 60 * 60 * 24));

      // Group days by month
      const monthDays: { [key: string]: number } = {};
      for (let i = 0; i <= totalDays; i++) {
        const dayDate = new Date(startTime + i * 24 * 60 * 60 * 1000);
        const monthKey = `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, '0')}`;
        monthDays[monthKey] = (monthDays[monthKey] || 0) + 1;
      }

      // Distribute hours proportionally
      Object.keys(monthDays).forEach((monthKey) => {
        const daysInMonth = monthDays[monthKey];
        const hoursForMonth = (p.totalHours / totalDays) * daysInMonth;
        monthlyHours[monthKey] = (monthlyHours[monthKey] || 0) + hoursForMonth;
      });
    }
  });

  // Sort months and get the last 12 months (or all if less than 12)
  const sortedMonths = Object.keys(monthlyHours).sort();
  const recentMonths = sortedMonths.slice(-12); // Last 12 months
  const monthlyHoursData = recentMonths.map((month) => ({
    month,
    hours: monthlyHours[month],
  }));

  const stats = {
    totalHours,
    totalParticipations: totalActivities,
    averageHoursPerMonth,
    percentTowardsGoal,
    nextGoal,
    monthlyHoursData,
  };

  const maxMonthlyHours = stats.monthlyHoursData.reduce((max, d) => Math.max(max, d.hours), 1);
  const activeGoalsCount = goals.filter((g) => g.status === 'active').length;

  // Get active goal
  const activeGoal = goals.find((g) => g.status === 'active');

  // Get upcoming opportunities (starting soon or ongoing)
  const upcomingOpportunities = opportunities
    .filter((opp) => {
      const startDate = new Date(opp.startDate);
      const now = new Date();
      const daysUntilStart = (startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return opp.isOngoing || (daysUntilStart >= 0 && daysUntilStart <= 30);
    })
    .slice(0, 3);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateRangeDisplay = (startDate: Date, endDate?: Date | null) => {
    const currentYear = new Date().getFullYear();
    const startLabel = startDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: startDate.getFullYear() !== currentYear ? 'numeric' : undefined,
    });

    if (!endDate || startDate.getTime() === endDate.getTime()) {
      return startLabel;
    }

    const endLabel = endDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: endDate.getFullYear() !== startDate.getFullYear() ? 'numeric' : undefined,
    });

    return `${startLabel} – ${endLabel}`;
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-700">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600"></div>
          <span className="text-sm font-medium">Loading opportunities...</span>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-none px-4 md:px-6 xl:px-8 py-8">
        {/* Header */}
        <header className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">
              Volunteering
            </p>
            <h1 className="mt-3 text-4xl font-semibold text-slate-900">Opportunities & Hours</h1>
            <p className="mt-2 text-base text-slate-600">
              Discover meaningful volunteer opportunities and track your community service impact.
            </p>
          </div>
          {session.user.role === 'student' && (
            <button
              onClick={() => setShowLogHoursModal(true)}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:border-blue-200"
            >
              <svg
                className="w-4 h-4 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Log Hours
            </button>
          )}
        </header>

        {/* Success Message */}
        {showSuccessMessage && (
          <div className="mb-6 rounded-3xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="font-semibold">Hours logged successfully!</span>
              </div>
              <button
                onClick={() => setShowSuccessMessage(false)}
                className="text-green-600 hover:text-green-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Stats and Upcoming Activities Row */}
        {session.user.role === 'student' && (
          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Stats Box */}
            <div className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-gradient-to-br hover:from-blue-50/40 hover:to-white hover:shadow-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="relative flex h-full flex-col gap-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                      Your Impact
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Live view of your volunteering journey
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-inner">
                    <Clock3 className="h-6 w-6" />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Total hours
                    </p>
                    <p
                      className="mt-1 text-4xl font-semibold text-slate-900 tabular-nums"
                      style={{ color: colors.primary }}
                    >
                      {Math.round(stats.totalHours)}
                    </p>
                    <p className="text-xs font-medium text-slate-500">
                      {Math.round(stats.totalHours) === 1 ? 'hour logged' : 'hours logged'}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-white/80 p-4">
                    <div className="mb-3 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <span>Recent pace</span>
                      <span>{stats.monthlyHoursData.length || 0} mo</span>
                    </div>
                    <div className="flex h-32 items-end gap-1">
                      {stats.monthlyHoursData.length > 0 ? (
                        stats.monthlyHoursData.map((data, index) => {
                          const barHeight =
                            maxMonthlyHours > 0 ? (data.hours / maxMonthlyHours) * 100 : 0;
                          const [year, month] = data.month.split('-');
                          const monthNames = [
                            'January',
                            'February',
                            'March',
                            'April',
                            'May',
                            'June',
                            'July',
                            'August',
                            'September',
                            'October',
                            'November',
                            'December',
                          ];
                          const monthName = monthNames[parseInt(month, 10) - 1];
                          const gradient =
                            index % 2 === 0
                              ? 'from-blue-200 to-blue-500'
                              : 'from-indigo-200 to-purple-500';

                          return (
                            <div
                              key={data.month}
                              className={`group relative flex-1 rounded-full bg-gradient-to-t ${gradient}`}
                              style={{ height: `${Math.max(barHeight, 4)}%` }}
                              onMouseEnter={() => setHoveredBarIndex(index)}
                              onMouseLeave={() => setHoveredBarIndex(null)}
                            >
                              <div
                                className={`pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900 px-2 py-1 text-[10px] font-semibold text-white opacity-0 transition-opacity duration-150 ${
                                  hoveredBarIndex === index ? 'opacity-100' : ''
                                }`}
                              >
                                {monthName} {year}: {Math.round(data.hours * 10) / 10} hrs
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                          Log hours to see pace
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="relative rounded-2xl border border-slate-100 bg-white/90 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {stats.nextGoal ? 'Next goal' : 'Active goals'}
                    </p>
                    {stats.nextGoal ? (
                      <>
                        <p
                          className="mt-2 text-4xl font-semibold text-slate-900"
                          style={{ color: colors.primary }}
                        >
                          {Math.round(stats.percentTowardsGoal)}%
                        </p>
                        <p className="text-xs text-slate-500">
                          {stats.nextGoal.description || 'Goal'} ({stats.nextGoal.targetHours} hrs)
                        </p>
                      </>
                    ) : (
                      <>
                        <p
                          className="mt-2 text-4xl font-semibold text-slate-900"
                          style={{ color: colors.primary }}
                        >
                          {activeGoalsCount}
                        </p>
                        <p className="text-xs text-slate-500">
                          {activeGoalsCount === 1 ? 'Active goal' : 'Active goals'}
                        </p>
                      </>
                    )}
                    <div className="mt-4 h-2 w-full rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${stats.nextGoal ? Math.min(100, Math.max(0, stats.percentTowardsGoal)) : 0}%`,
                          backgroundColor: colors.primary,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white/80 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Hours over time</p>
                      <p className="text-xs text-slate-500">Track consistency across months</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(['1W', '1M', '6M', '1Y', '2Y', 'all'] as const).map((range) => (
                        <button
                          key={range}
                          onClick={() => setChartTimeRange(range)}
                          className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                            chartTimeRange === range
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'bg-transparent text-slate-500 hover:bg-slate-100'
                          }`}
                        >
                          {range === 'all' ? 'ALL' : range}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-slate-100 bg-white px-3 py-4">
                    <HoursChart
                      participations={participations}
                      goals={goals.filter((g) => g.status === 'active')}
                      currentHours={stats.totalHours}
                      colors={colors}
                      timeRange={chartTimeRange}
                    />
                    {participations.length === 0 && (
                      <p className="mt-2 text-center text-xs text-slate-400">
                        Log hours to use the chart
                      </p>
                    )}
                  </div>

                  <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="inline-flex items-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      <TrendingUp className="h-4 w-4 text-blue-500" />
                      <span>
                        {stats.nextGoal
                          ? `Next target: ${stats.nextGoal.description || 'Goal'} (${Math.max(
                              0,
                              Math.round(stats.nextGoal.targetHours - stats.totalHours)
                            )} hrs remaining)`
                          : 'Set a goal to stay motivated.'}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setShowGoalManager(true);
                        setShowGoalForm(false);
                      }}
                      className="rounded-2xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
                    >
                      Manage goals
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* My Service Box */}
            <div className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-gradient-to-br hover:from-blue-50/40 hover:to-white hover:shadow-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="relative flex h-full flex-col gap-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                      My Service
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Upcoming commitments & service history
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 shadow-inner">
                    <CalendarDays className="h-6 w-6" />
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between gap-2 text-sm font-semibold text-slate-900">
                      <div className="inline-flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-blue-500" />
                        Upcoming commitments
                      </div>
                      <span className="text-xs font-medium text-blue-600">
                        {upcomingOpportunities.length > 0
                          ? `${upcomingOpportunities.length} scheduled`
                          : 'No events'}
                      </span>
                    </div>

                    <div className="mt-3 space-y-3">
                      {upcomingOpportunities.length > 0 ? (
                        upcomingOpportunities.map((opp) => {
                          const startDate = new Date(opp.startDate);
                          const endDate = opp.endDate ? new Date(opp.endDate) : null;
                          const now = new Date();
                          const daysFromNow = Math.ceil(
                            (startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
                          );
                          const timingLabel = opp.isOngoing
                            ? 'In progress'
                            : daysFromNow === 0
                              ? 'Starts today'
                              : `${daysFromNow} ${daysFromNow === 1 ? 'day' : 'days'} away`;

                          return (
                            <button
                              key={opp.id}
                              type="button"
                              onClick={() => router.push(`/volunteering/${opp.id}`)}
                              className="w-full rounded-2xl border border-slate-200 bg-white/80 p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                            >
                              <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                                  <CalendarDays className="h-5 w-5" />
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-semibold text-slate-900">
                                    {opp.title}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {opp.description || opp.organization}
                                  </p>
                                </div>
                                <span className="text-xs font-semibold text-blue-600">
                                  {timingLabel}
                                </span>
                              </div>
                              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                                <span>
                                  {formatDateRangeDisplay(startDate, endDate)}{' '}
                                  {opp.isOngoing && '(Ongoing)'}
                                </span>
                                <span className="inline-flex items-center gap-1 font-semibold text-blue-600">
                                  View
                                  <ArrowUpRight className="h-3.5 w-3.5" />
                                </span>
                              </div>
                            </button>
                          );
                        })
                      ) : (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                          No upcoming commitments. Explore opportunities below to add new service.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-6">
                    <div className="flex items-center justify-between gap-2 text-sm font-semibold text-slate-900">
                      <div className="inline-flex items-center gap-2">
                        <History className="h-4 w-4 text-slate-500" />
                        Service history
                      </div>
                      <span className="text-xs font-medium text-slate-500">
                        {participations.length > 0
                          ? `${participations.length} logs`
                          : 'Nothing logged'}
                      </span>
                    </div>

                    <div className="mt-3 max-h-[360px] space-y-3 overflow-y-auto pr-2">
                      {participations.length > 0 ? (
                        [...participations]
                          .sort((a, b) => {
                            const aDate = new Date(a.endDate || a.startDate).getTime();
                            const bDate = new Date(b.endDate || b.startDate).getTime();
                            return bDate - aDate;
                          })
                          .map((participation) => {
                            const startDate = new Date(participation.startDate);
                            const endDate = participation.endDate
                              ? new Date(participation.endDate)
                              : null;
                            const activityName =
                              participation.opportunity?.title ||
                              participation.organizationName ||
                              participation.activityName ||
                              'Activity';
                            const description =
                              participation.opportunity?.description ||
                              participation.activityDescription ||
                              participation.organizationName ||
                              '';

                            return (
                              <div
                                key={participation.id}
                                className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4"
                              >
                                <div className="flex items-start gap-3">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                                    <CheckCircle2 className="h-5 w-5" />
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm font-semibold text-slate-900">
                                      {activityName}
                                    </p>
                                    <p className="text-xs text-slate-500">{description}</p>
                                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                                      <span>{formatDateRangeDisplay(startDate, endDate)}</span>
                                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-white px-2 py-0.5 font-semibold text-emerald-600">
                                        <Clock3 className="h-3.5 w-3.5" />
                                        {Math.round(participation.totalHours)} hrs
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                      ) : (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                          Track your impact by logging hours.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Search and Filters Section */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
          <div className="flex items-center gap-4 mb-4">
            {/* Search Bar */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search opportunities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900 placeholder:text-slate-400"
              />
            </div>

            {/* Filter Toggle Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2.5 rounded-2xl transition-all flex items-center gap-2 font-semibold ${
                showFilters
                  ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              Filters
            </button>

            {/* Post Opportunity Button - Plus Sign */}
            {session.user.role === 'student' && (
              <button
                onClick={() => setShowAddOpportunityModal(true)}
                className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow-md"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="white"
                  strokeWidth={2.5}
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            )}
          </div>

          {/* Filters (Collapsible) */}
          {showFilters && (
            <div className="pt-4 border-t border-slate-200 space-y-4">
              {/* Online Filter */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Opportunity Type
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="onlineFilter"
                      checked={isOnlineFilter === null}
                      onChange={() => setIsOnlineFilter(null)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-slate-700">All</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="onlineFilter"
                      checked={isOnlineFilter === true}
                      onChange={() => setIsOnlineFilter(true)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-slate-700">Online Only</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="onlineFilter"
                      checked={isOnlineFilter === false}
                      onChange={() => setIsOnlineFilter(false)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-slate-700">In-Person Only</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Category Filter - Multi-select */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Categories (Select multiple)
                  </label>
                  <div className="border border-slate-300 rounded-2xl p-3 max-h-40 overflow-y-auto">
                    <div className="space-y-2">
                      {CATEGORIES.map((cat) => (
                        <label key={cat} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedCategories.includes(cat)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCategories([...selectedCategories, cat]);
                              } else {
                                setSelectedCategories(selectedCategories.filter((c) => c !== cat));
                              }
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600"
                          />
                          <span className="text-sm text-slate-700">{cat}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {selectedCategories.length > 0 && (
                    <button
                      onClick={() => setSelectedCategories([])}
                      className="text-xs text-blue-600 hover:text-blue-800 mt-2 font-semibold"
                    >
                      Clear categories
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Location Filter */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Location
                    </label>
                    <input
                      type="text"
                      placeholder="Filter by location..."
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900 placeholder:text-slate-400"
                    />
                  </div>

                  {/* Commitment Level Filter */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Commitment Level
                    </label>
                    <select
                      value={selectedCommitment}
                      onChange={(e) => setSelectedCommitment(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900"
                    >
                      <option value="">All Levels</option>
                      {COMMITMENT_LEVELS.map((level) => (
                        <option key={level} value={level}>
                          {level}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Clear Filters */}
              {(selectedCategories.length > 0 ||
                selectedLocation ||
                selectedCommitment ||
                isOnlineFilter !== null ||
                searchQuery) && (
                <button
                  onClick={() => {
                    setSelectedCategories([]);
                    setSelectedLocation('');
                    setSelectedCommitment('');
                    setIsOnlineFilter(null);
                    setSearchQuery('');
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800 font-semibold"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Opportunities Grid */}
        {opportunities.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <svg
              className="w-16 h-16 text-slate-400 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <p className="text-slate-900 mb-2 font-semibold">No opportunities found</p>
            <p className="text-sm text-slate-600">
              {searchQuery || selectedCategories.length > 0 || selectedLocation
                ? 'Try adjusting your filters'
                : 'Check back later for new opportunities'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {opportunities.map((opportunity) => (
              <OpportunityCard key={opportunity.id} opportunity={opportunity} colors={colors} />
            ))}
          </div>
        )}
      </div>

      {/* Completion Prompt */}
      {showCompletionPrompt && completionParticipations.length > 0 && (
        <OpportunityCompletionPrompt
          participations={completionParticipations}
          onComplete={handleCompleteParticipation}
          onDismiss={() => setShowCompletionPrompt(false)}
        />
      )}
    </div>
  );
}

function OpportunityCard({
  opportunity,
  colors,
}: {
  opportunity: VolunteeringOpportunity;
  colors: { primary: string; tertiary: string; accent: string };
}) {
  const router = useRouter();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg hover:border-blue-200">
      <div className="mb-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-semibold text-slate-900 flex-1 group-hover:text-blue-900 transition-colors">
            {opportunity.title}
          </h3>
        </div>
        <p className="text-sm font-semibold mb-3 text-blue-600">{opportunity.organization}</p>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            {opportunity.category}
          </span>
          {opportunity.commitmentLevel && (
            <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {opportunity.commitmentLevel} Commitment
            </span>
          )}
        </div>
      </div>

      <p className="text-sm text-slate-700 mb-4 line-clamp-3">{opportunity.description}</p>

      <div className="space-y-2 mb-4 text-xs text-slate-600">
        <div className="flex items-center gap-2 flex-wrap">
          {opportunity.isOnline && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs font-semibold border border-green-200">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              Online
            </span>
          )}
          {opportunity.location && !opportunity.isOnline && (
            <div className="flex items-center gap-1.5">
              <svg
                className="w-4 h-4 text-slate-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span className="text-slate-700">{opportunity.location}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <svg
            className="w-4 h-4 text-slate-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="text-slate-700">
            {formatDate(opportunity.startDate)}
            {opportunity.endDate && ` - ${formatDate(opportunity.endDate)}`}
            {opportunity.isOngoing && ' (Ongoing)'}
          </span>
        </div>
        {opportunity.hoursPerSession && (
          <div className="flex items-center gap-1.5">
            <svg
              className="w-4 h-4 text-slate-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-slate-700">{opportunity.hoursPerSession} hours per session</span>
          </div>
        )}
        {opportunity._count.participations > 0 && (
          <div className="text-xs text-slate-500 font-medium">
            {opportunity._count.participations} participant
            {opportunity._count.participations !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      <button
        onClick={() => router.push(`/volunteering/${opportunity.id}`)}
        className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-2xl font-semibold transition-all hover:bg-blue-700 hover:shadow-md active:scale-[0.98]"
      >
        View Details
      </button>
    </div>
  );
}
