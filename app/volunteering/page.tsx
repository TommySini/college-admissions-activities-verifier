"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useColors } from "../context/ColorContext";
import { HoursChart } from "../components/HoursChart";
import { OpportunityCompletionPrompt } from "../components/OpportunityCompletionPrompt";

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
  "Environment",
  "Education",
  "Healthcare",
  "Community Service",
  "Animal Welfare",
  "Arts & Culture",
  "Sports & Recreation",
  "Technology",
  "Other",
];

const COMMITMENT_LEVELS = ["Low", "Medium", "High"];

export default function VolunteeringPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const colors = useColors();
  const [opportunities, setOpportunities] = useState<VolunteeringOpportunity[]>([]);
  const [participations, setParticipations] = useState<Participation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [selectedCommitment, setSelectedCommitment] = useState<string>("");
  const [isOnlineFilter, setIsOnlineFilter] = useState<boolean | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [total, setTotal] = useState(0);
  const [goals, setGoals] = useState<any[]>([]);
  const [showGoalInput, setShowGoalInput] = useState(false);
  const [goalHours, setGoalHours] = useState("");
  const [goalDate, setGoalDate] = useState("");
  const [completionParticipations, setCompletionParticipations] = useState<any[]>([]);
  const [showCompletionPrompt, setShowCompletionPrompt] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    if (status === "authenticated") {
      fetchOpportunities();
      if (session?.user.role === "student") {
        fetchParticipations();
        fetchGoals();
        checkCompletions();
      }
    }

    // Check for success message from log hours redirect
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("logged") === "true") {
      setShowSuccessMessage(true);
      // Refresh participations to show newly logged hours
      if (session?.user.role === "student") {
        fetchParticipations();
      }
      // Remove query param
      window.history.replaceState({}, "", "/volunteering");
      // Hide message after 5 seconds
      setTimeout(() => setShowSuccessMessage(false), 5000);
    }
  }, [status, router, selectedCategories, selectedLocation, selectedCommitment, isOnlineFilter, searchQuery]);

  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCategories.length > 0) {
        params.append("categories", selectedCategories.join(","));
      }
      if (selectedLocation) params.append("location", selectedLocation);
      if (isOnlineFilter !== null) params.append("isOnline", isOnlineFilter.toString());
      if (searchQuery) params.append("search", searchQuery);
      params.append("status", "approved");

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
      console.error("Error fetching opportunities:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchParticipations = async () => {
    try {
      const response = await fetch("/api/volunteering-participations");
      const data = await response.json();
      console.log("Fetched participations:", data.participations?.length || 0, data.participations);
      if (response.ok) {
        setParticipations(data.participations || []);
      } else {
        console.error("Failed to fetch participations:", data.error);
      }
    } catch (error) {
      console.error("Error fetching participations:", error);
    }
  };

  const fetchGoals = async () => {
    try {
      const response = await fetch("/api/volunteering-goals");
      const data = await response.json();
      if (response.ok) {
        setGoals(data.goals || []);
      }
    } catch (error) {
      console.error("Error fetching goals:", error);
    }
  };

  const checkCompletions = async () => {
    try {
      const response = await fetch("/api/volunteering-participations/check-completions");
      const data = await response.json();
      if (response.ok && data.participations && data.participations.length > 0) {
        setCompletionParticipations(data.participations);
        setShowCompletionPrompt(true);
      }
    } catch (error) {
      console.error("Error checking completions:", error);
    }
  };

  const handleCompleteParticipation = async (participationId: string, completed: boolean) => {
    try {
      const response = await fetch(`/api/volunteering-participations/${participationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: completed ? "completed" : "cancelled",
        }),
      });

      if (response.ok) {
        // Refresh participations to update stats
        await fetchParticipations();
        // Remove from completion list
        setCompletionParticipations((prev) =>
          prev.filter((p) => p.id !== participationId)
        );
        if (completionParticipations.length === 1) {
          setShowCompletionPrompt(false);
        }
      } else {
        throw new Error("Failed to update participation");
      }
    } catch (error) {
      console.error("Error updating participation:", error);
      throw error;
    }
  };

  const handleCreateGoal = async () => {
    if (!goalHours || parseFloat(goalHours) <= 0) {
      alert("Please enter a valid goal hours amount");
      return;
    }

    try {
      const response = await fetch("/api/volunteering-goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetHours: parseFloat(goalHours),
          targetDate: goalDate || null,
          goalType: "personal",
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setShowGoalInput(false);
        setGoalHours("");
        setGoalDate("");
        fetchGoals();
      } else {
        alert(data.error || "Failed to create goal");
      }
    } catch (error) {
      console.error("Error creating goal:", error);
      alert("Failed to create goal");
    }
  };

  // Calculate stats
  const stats = {
    totalHours: participations.reduce((sum, p) => sum + p.totalHours, 0),
    totalParticipations: participations.length,
  };

  // Get active goal
  const activeGoal = goals.find((g) => g.status === "active");

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
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
      <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shadow-sm"
                  style={{ backgroundColor: colors.primary }}
                >
                  <span className="text-white font-bold text-xl">A</span>
                </div>
                <span className="text-xl font-bold text-gray-900">Actify</span>
              </Link>
              <div className="h-6 w-px bg-gray-300 mx-2"></div>
              <span className="text-sm text-gray-500">Volunteering</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 pr-4 border-r border-gray-200">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{session.user.name}</p>
                  <p className="text-xs text-gray-500">{session.user.email}</p>
                </div>
                {session.user.image && (
                  <img
                    src={session.user.image}
                    alt={session.user.name || "User"}
                    className="w-10 h-10 rounded-full border-2 border-gray-200"
                  />
                )}
              </div>
              <Link
                href="/dashboard"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
              >
                Dashboard
              </Link>
              {session.user.role === "student" && (
                <>
                  <Link
                    href="/volunteering/log-hours"
                    className="px-4 py-2 text-sm font-medium rounded-lg transition-colors text-white"
                    style={{ backgroundColor: colors.primary }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = "0.9";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = "1";
                    }}
                  >
                    Log Hours
                  </Link>
                  <Link
                    href="/volunteering/my-opportunities"
                    className="px-4 py-2 text-sm font-medium text-blue-700 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    My Participations
                  </Link>
                  <Link
                    href="/volunteering/post"
                    className="px-4 py-2 text-sm font-medium text-green-700 hover:text-green-900 hover:bg-green-50 rounded-lg transition-colors"
                  >
                    Post Opportunity
                  </Link>
                </>
              )}
              <button
                onClick={() => signOut({ callbackUrl: "/auth/signin" })}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Volunteering Opportunities
          </h1>
          <p className="text-gray-600">
            Discover and sign up for community service opportunities in your area
          </p>
        </div>

        {/* Success Message */}
        {showSuccessMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-medium">Hours logged successfully!</span>
              </div>
              <button
                onClick={() => setShowSuccessMessage(false)}
                className="text-green-600 hover:text-green-800"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Stats and Upcoming Activities Row */}
        {session.user.role === "student" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Stats Box */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">My Volunteering Stats</h2>
                {!activeGoal && (
                  <button
                    onClick={() => setShowGoalInput(true)}
                    className="text-xs px-3 py-1 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    Set Goal
                  </button>
                )}
              </div>

              {/* Total Hours - Large Display */}
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-2">Total Hours</p>
                <p className="text-5xl font-bold" style={{ color: colors.primary }}>
                  {stats.totalHours.toFixed(1)}
                </p>
                {activeGoal && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500">
                      Goal: {activeGoal.targetHours}h
                      {activeGoal.targetDate && ` by ${new Date(activeGoal.targetDate).toLocaleDateString()}`}
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.min((stats.totalHours / activeGoal.targetHours) * 100, 100)}%`,
                          backgroundColor: colors.primary,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Chart - Always show */}
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Hours Over Time</p>
                <HoursChart
                  participations={participations}
                  goalHours={activeGoal?.targetHours}
                  goalDate={activeGoal?.targetDate}
                  currentHours={stats.totalHours}
                  colors={colors}
                />
                {participations.length === 0 && (
                  <p className="text-xs text-gray-400 text-center mt-2">
                    No hours logged yet. Start logging hours to see your progress!
                  </p>
                )}
              </div>

              {/* Total Participations */}
              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-1">Total Participations</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalParticipations}</p>
              </div>

              {/* Goal Input Modal */}
              {showGoalInput && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                    <h3 className="text-lg font-semibold mb-4">Set Volunteering Goal</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Target Hours
                        </label>
                        <input
                          type="number"
                          value={goalHours}
                          onChange={(e) => setGoalHours(e.target.value)}
                          placeholder="e.g., 75"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Target Date (Optional)
                        </label>
                        <input
                          type="date"
                          value={goalDate}
                          onChange={(e) => setGoalDate(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={handleCreateGoal}
                          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Set Goal
                        </button>
                        <button
                          onClick={() => {
                            setShowGoalInput(false);
                            setGoalHours("");
                            setGoalDate("");
                          }}
                          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Upcoming Activities Box */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Opportunities</h2>
              {upcomingOpportunities.length > 0 ? (
                <div className="space-y-3">
                  {upcomingOpportunities.map((opp) => (
                    <div
                      key={opp.id}
                      className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => router.push(`/volunteering/${opp.id}`)}
                    >
                      <p className="font-medium text-gray-900 text-sm">{opp.title}</p>
                      <p className="text-xs text-gray-600 mt-1">{opp.organization}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(opp.startDate)}
                        {opp.isOngoing && " (Ongoing)"}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No upcoming opportunities</p>
              )}
            </div>
          </div>
        )}

        {/* Search and Filters Section */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
          <div className="flex items-center gap-4 mb-4">
            {/* Search Bar */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search opportunities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filter Toggle Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                showFilters
                  ? "text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              style={showFilters ? { backgroundColor: colors.primary } : {}}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              Filters
            </button>
          </div>

          {/* Filters (Collapsible) */}
          {showFilters && (
            <div className="pt-4 border-t border-gray-200 space-y-4">
              {/* Online Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Opportunity Type
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="onlineFilter"
                      checked={isOnlineFilter === null}
                      onChange={() => setIsOnlineFilter(null)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">All</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="onlineFilter"
                      checked={isOnlineFilter === true}
                      onChange={() => setIsOnlineFilter(true)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">Online Only</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="onlineFilter"
                      checked={isOnlineFilter === false}
                      onChange={() => setIsOnlineFilter(false)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">In-Person Only</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Category Filter - Multi-select */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categories (Select multiple)
                  </label>
                  <div className="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto">
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
                            className="w-4 h-4 rounded border-gray-300"
                          />
                          <span className="text-sm text-gray-700">{cat}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {selectedCategories.length > 0 && (
                    <button
                      onClick={() => setSelectedCategories([])}
                      className="text-xs text-blue-600 hover:text-blue-800 mt-2"
                    >
                      Clear categories
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Location Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location
                    </label>
                    <input
                      type="text"
                      placeholder="Filter by location..."
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Commitment Level Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Commitment Level
                    </label>
                    <select
                      value={selectedCommitment}
                      onChange={(e) => setSelectedCommitment(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              {(selectedCategories.length > 0 || selectedLocation || selectedCommitment || isOnlineFilter !== null || searchQuery) && (
                <button
                  onClick={() => {
                    setSelectedCategories([]);
                    setSelectedLocation("");
                    setSelectedCommitment("");
                    setIsOnlineFilter(null);
                    setSearchQuery("");
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Found {opportunities.length} opportunity{opportunities.length !== 1 ? "ies" : ""}
          </p>
        </div>

        {/* Opportunities Grid */}
        {opportunities.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
            <svg
              className="w-16 h-16 text-gray-400 mx-auto mb-4"
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
            <p className="text-gray-600 mb-2 font-medium">No opportunities found</p>
            <p className="text-sm text-gray-500">
              {searchQuery || selectedCategories.length > 0 || selectedLocation
                ? "Try adjusting your filters"
                : "Check back later for new opportunities"}
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
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all">
      <div className="mb-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900 flex-1">
            {opportunity.title}
          </h3>
        </div>
        <p className="text-sm font-medium mb-2" style={{ color: colors.primary }}>
          {opportunity.organization}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="inline-block px-2.5 py-1 text-xs font-medium rounded-md"
            style={{ backgroundColor: colors.accent, color: colors.primary }}
          >
            {opportunity.category}
          </span>
          {opportunity.commitmentLevel && (
            <span className="inline-block px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-md">
              {opportunity.commitmentLevel} Commitment
            </span>
          )}
        </div>
      </div>

      <p className="text-sm text-gray-700 mb-4 line-clamp-3">
        {opportunity.description}
      </p>

      <div className="space-y-2 mb-4 text-xs text-gray-600">
        <div className="flex items-center gap-2 flex-wrap">
          {opportunity.isOnline && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-md text-xs font-medium">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Online
            </span>
          )}
          {opportunity.location && !opportunity.isOnline && (
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <span>{opportunity.location}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span>
            {formatDate(opportunity.startDate)}
            {opportunity.endDate && ` - ${formatDate(opportunity.endDate)}`}
            {opportunity.isOngoing && " (Ongoing)"}
          </span>
        </div>
        {opportunity.hoursPerSession && (
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{opportunity.hoursPerSession} hours per session</span>
          </div>
        )}
        {opportunity._count.participations > 0 && (
          <div className="text-xs text-gray-500">
            {opportunity._count.participations} participant
            {opportunity._count.participations !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      <button
        onClick={() => router.push(`/volunteering/${opportunity.id}`)}
        className="w-full px-4 py-2 text-white rounded-lg font-medium transition-colors"
        style={{
          backgroundColor: colors.primary,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = "0.9";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = "1";
        }}
      >
        View Details
      </button>
    </div>
  );
}
