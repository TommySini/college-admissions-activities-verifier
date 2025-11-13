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
  const [showGoalManager, setShowGoalManager] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalName, setGoalName] = useState("");
  const [goalHours, setGoalHours] = useState("");
  const [goalDate, setGoalDate] = useState("");
  const [completionParticipations, setCompletionParticipations] = useState<any[]>([]);
  const [showCompletionPrompt, setShowCompletionPrompt] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [chartTimeRange, setChartTimeRange] = useState<"1W" | "1M" | "6M" | "1Y" | "2Y" | "all">("1M");
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);
  const [showLogHoursModal, setShowLogHoursModal] = useState(false);
  const [logHoursFormData, setLogHoursFormData] = useState({
    organizationName: "",
    activityDescription: "",
    startDate: "",
    endDate: "",
    isOneDay: false,
    totalHours: "",
    serviceSheetUrl: "",
  });
  const [uploadedFile, setUploadedFile] = useState<{ url: string; name: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmittingLogHours, setIsSubmittingLogHours] = useState(false);
  const [logHoursError, setLogHoursError] = useState("");
  const [showAddOpportunityModal, setShowAddOpportunityModal] = useState(false);
  const [opportunityFormData, setOpportunityFormData] = useState({
    name: "",
    description: "",
    startTime: "",
    endTime: "",
    date: "",
    isRecurring: false,
    recurrenceFrequency: "weekly", // "weekly", "monthly", "daily"
  });
  const [isSubmittingOpportunity, setIsSubmittingOpportunity] = useState(false);
  const [opportunityError, setOpportunityError] = useState("");
  const [opportunitySuccess, setOpportunitySuccess] = useState(false);

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
      const response = await fetch("/api/volunteering-participations", {
        credentials: "include", // Ensure cookies are sent
      });
      const data = await response.json();
      if (response.ok) {
        setParticipations(data.participations || []);
      } else {
        // Silently fail - just log and use empty array
        console.warn("Could not load participations:", data.error || "Unknown error");
        setParticipations([]); // Set empty array so page still works
      }
    } catch (error) {
      // Silently fail - just log and use empty array
      console.warn("Error fetching participations:", error);
      setParticipations([]); // Set empty array so page still works
    }
  };

  const fetchGoals = async () => {
    try {
      const response = await fetch("/api/volunteering-goals", {
        credentials: "include",
      });
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
    if (!goalName || !goalName.trim()) {
      alert("Please enter a goal name");
      return;
    }
    if (!goalHours || parseFloat(goalHours) <= 0) {
      alert("Please enter a valid goal hours amount");
      return;
    }
    if (!goalDate) {
      alert("Please enter a due date");
      return;
    }

    try {
      const response = await fetch("/api/volunteering-goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          targetHours: parseFloat(goalHours),
          targetDate: goalDate || null,
          description: goalName.trim(),
          goalType: "personal",
        }),
      });

      let data: any = {};
      try {
        const text = await response.text();
        console.log("Raw response text:", text);
        
        if (text) {
          try {
            data = JSON.parse(text);
          } catch (parseError) {
            console.error("Error parsing JSON:", parseError);
            data = { error: text || `Server returned ${response.status}: ${response.statusText}` };
          }
        } else {
          data = { error: `Empty response from server (${response.status})` };
        }
      } catch (readError) {
        console.error("Error reading response:", readError);
        data = { error: `Failed to read response (${response.status})` };
      }

      console.log("Goal creation response:", { 
        status: response.status, 
        ok: response.ok, 
        statusText: response.statusText,
        data,
        dataKeys: Object.keys(data || {})
      });

      if (response.ok) {
        setShowGoalForm(false);
        setGoalName("");
        setGoalHours("");
        setGoalDate("");
        fetchGoals();
      } else {
        console.error("Failed to create goal:", { 
          status: response.status, 
          statusText: response.statusText,
          data,
          dataType: typeof data,
          dataKeys: Object.keys(data || {})
        });
        const errorMessage = data?.error || data?.message || `Failed to create goal (${response.status})`;
        alert(errorMessage);
      }
    } catch (error: any) {
      console.error("Error creating goal:", error);
      alert(`Failed to create goal: ${error?.message || "Unknown error"}. Please check your connection and try again.`);
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

    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setLogHoursError("Invalid file type. Please upload a PDF or image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setLogHoursError("File size exceeds 5MB limit.");
      return;
    }

    setIsUploading(true);
    setLogHoursError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setUploadedFile({ url: data.url, name: data.fileName });
        setLogHoursFormData((prev) => ({ ...prev, serviceSheetUrl: data.url }));
      } else {
        setLogHoursError(data.error || "Failed to upload file");
      }
    } catch (err) {
      setLogHoursError("Failed to upload file. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleLogHoursSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLogHoursError("");

    if (
      !logHoursFormData.organizationName ||
      !logHoursFormData.activityDescription ||
      !logHoursFormData.startDate ||
      !logHoursFormData.totalHours
    ) {
      setLogHoursError("Please fill in all required fields");
      return;
    }

    if (parseFloat(logHoursFormData.totalHours) <= 0) {
      setLogHoursError("Total hours must be greater than 0");
      return;
    }

    setIsSubmittingLogHours(true);

    try {
      const response = await fetch("/api/volunteering-participations/log-hours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationName: logHoursFormData.organizationName,
          activityDescription: logHoursFormData.activityDescription,
          startDate: logHoursFormData.startDate,
          endDate: logHoursFormData.isOneDay ? logHoursFormData.startDate : logHoursFormData.endDate || logHoursFormData.startDate,
          totalHours: parseFloat(logHoursFormData.totalHours),
          serviceSheetUrl: logHoursFormData.serviceSheetUrl || null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setShowLogHoursModal(false);
        setLogHoursFormData({
          organizationName: "",
          activityDescription: "",
          startDate: "",
          endDate: "",
          isOneDay: false,
          totalHours: "",
          serviceSheetUrl: "",
        });
        setUploadedFile(null);
        fetchParticipations();
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 5000);
      } else {
        setLogHoursError(data.error || "Failed to log hours");
        setIsSubmittingLogHours(false);
      }
    } catch (err: any) {
      setLogHoursError(`An error occurred: ${err?.message || "Please try again."}`);
      setIsSubmittingLogHours(false);
    }
  };

  const handleAddOpportunitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOpportunityError("");
    setOpportunitySuccess(false);

    if (
      !opportunityFormData.name ||
      !opportunityFormData.description ||
      !opportunityFormData.startTime ||
      !opportunityFormData.endTime ||
      !opportunityFormData.date
    ) {
      setOpportunityError("Please fill in all required fields");
      return;
    }

    setIsSubmittingOpportunity(true);

    try {
      const response = await fetch("/api/volunteering-opportunities/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: opportunityFormData.name,
          description: opportunityFormData.description,
          startTime: opportunityFormData.startTime,
          endTime: opportunityFormData.endTime,
          date: opportunityFormData.date,
          isRecurring: opportunityFormData.isRecurring,
          recurrenceFrequency: opportunityFormData.isRecurring ? opportunityFormData.recurrenceFrequency : null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setOpportunitySuccess(true);
        setOpportunityFormData({
          name: "",
          description: "",
          startTime: "",
          endTime: "",
          date: "",
          isRecurring: false,
          recurrenceFrequency: "weekly",
        });
        setTimeout(() => {
          setShowAddOpportunityModal(false);
          setOpportunitySuccess(false);
        }, 2000);
      } else {
        setOpportunityError(data.error || "Failed to submit opportunity request");
      }
    } catch (error) {
      console.error("Error submitting opportunity:", error);
      setOpportunityError("Failed to submit opportunity request. Please try again.");
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
    .filter((g) => g.status === "active")
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
  const monthlyHoursData = recentMonths.map(month => ({
    month,
    hours: monthlyHours[month]
  }));

  const stats = {
    totalHours,
    totalParticipations: totalActivities,
    averageHoursPerMonth,
    percentTowardsGoal,
    nextGoal,
    monthlyHoursData,
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
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">
            Volunteering Opportunities
          </h1>
          {session.user.role === "student" && (
            <button
              onClick={() => setShowLogHoursModal(true)}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-colors text-white shadow-md"
              style={{ backgroundColor: colors.primary, fontFamily: "'Nunito', sans-serif" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "0.9";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "1";
              }}
            >
              Log Hours
            </button>
          )}
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
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Statistics</h2>
              </div>

              {/* Statistics Grid - 3 Boxes in Horizontal Row */}
              <div className="mb-6 w-full">
                <div className="grid gap-2 w-full px-2 items-end" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
                  {/* Total Hours */}
                  <div
                    className="flex items-center justify-center rounded-lg aspect-square min-w-0"
                    style={{ 
                      backgroundColor: colors.accent,
                      boxShadow: "0 0 12px rgba(0, 0, 0, 0.2)"
                    }}
                  >
                    <div className="flex flex-col items-center justify-center">
                      <span className="text-5xl font-bold leading-none" style={{ color: colors.primary, fontFamily: "Arial, sans-serif" }}>
                        {Math.round(stats.totalHours)}
                      </span>
                      <span className="text-base font-medium mt-1.5" style={{ color: colors.primary, fontFamily: "'Nunito', sans-serif" }}>
                        {Math.round(stats.totalHours) === 1 ? "hour" : "hours"}
                      </span>
                    </div>
                  </div>

                  {/* Monthly Hours Bar Chart */}
                  <div
                    className="flex items-end justify-center rounded-lg min-w-0 p-2 relative aspect-square"
                    style={{
                      backgroundColor: colors.accent,
                      boxShadow: "0 0 12px rgba(0, 0, 0, 0.2)"
                    }}
                  >
                    {stats.monthlyHoursData.length > 0 ? (
                      <div className="flex items-end justify-center w-full h-full relative gap-0">
                        {stats.monthlyHoursData.map((data, index) => {
                          // Use reduce to avoid stack overflow
                          const maxHours = stats.monthlyHoursData.reduce((max, d) => Math.max(max, d.hours), 1);
                          const barHeight = maxHours > 0 ? (data.hours / maxHours) * 100 : 0;
                          const colorIndex = index % 2;
                          const barColor = colorIndex === 0 ? colors.primary : colors.tertiary;
                          
                          // Format month for display
                          const [year, month] = data.month.split('-');
                          const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                          const monthName = monthNames[parseInt(month) - 1];
                          
                          return (
                            <div
                              key={data.month}
                              className="flex-1 max-w-full relative group"
                              style={{
                                height: `${Math.max(barHeight, 2)}%`,
                                backgroundColor: barColor,
                                minHeight: '2px',
                              }}
                              onMouseEnter={() => setHoveredBarIndex(index)}
                              onMouseLeave={() => setHoveredBarIndex(null)}
                            >
                              {hoveredBarIndex === index && (
                                <div
                                  className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap z-50"
                                  style={{ fontFamily: "'Nunito', sans-serif" }}
                                >
                                  {monthName} {year}: {Math.round(data.hours * 10) / 10} hrs
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="w-full h-full" />
                )}
              </div>

                  {/* Percent Towards Goal or Goals Count */}
                  <div
                    className="relative flex items-center justify-center rounded-lg aspect-square min-w-0 overflow-hidden"
                        style={{
                      backgroundColor: stats.nextGoal ? "white" : colors.accent,
                      boxShadow: "0 0 12px rgba(0, 0, 0, 0.2)"
                    }}
                  >
                    {/* Progress Fill - Bottom to Top */}
                    {stats.nextGoal && (
                      <div
                        className="absolute bottom-0 left-0 right-0 transition-all duration-300"
                        style={{
                          height: `${Math.min(100, Math.max(0, stats.percentTowardsGoal))}%`,
                          backgroundColor: colors.accent,
                        }}
                      />
                    )}
                    {/* Text Content - Above Progress */}
                    <div className="relative z-10 flex flex-col items-center justify-center">
                      {stats.nextGoal ? (
                        <>
                          <span className="text-5xl font-bold leading-none" style={{ color: colors.primary, fontFamily: "Arial, sans-serif" }}>
                            {Math.round(stats.percentTowardsGoal)}%
                          </span>
                          <span className="text-sm font-medium mt-1" style={{ color: colors.primary, fontFamily: "'Nunito', sans-serif" }}>
                            towards goal
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-5xl font-bold leading-none" style={{ color: colors.primary, fontFamily: "Arial, sans-serif" }}>
                            {goals.filter((g) => g.status === "active").length}
                          </span>
                          <span className="text-sm font-medium mt-1" style={{ color: colors.primary, fontFamily: "'Nunito', sans-serif" }}>
                            {goals.filter((g) => g.status === "active").length === 1 ? "goal" : "goals"}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Chart - At bottom */}
              <div className="mt-6">
                <HoursChart
                  participations={participations}
                  goals={goals.filter((g) => g.status === "active")}
                  currentHours={stats.totalHours}
                  colors={colors}
                  timeRange={chartTimeRange}
                />
                {participations.length === 0 && (
                  <p className="text-xs text-gray-400 text-center mt-2" style={{ fontFamily: "'Nunito', sans-serif" }}>
                    Log Hours to Use the Chart
                  </p>
                )}
              {/* Time Range Selector and Manage Goals Button - Bottom Row */}
                <div className="flex items-center justify-between gap-2 mt-2">
                  {/* Manage Goals Button - Bottom Left */}
                  <button
                    onClick={() => {
                      setShowGoalManager(true);
                      setShowGoalForm(false);
                    }}
                    className="px-3 py-1 text-xs font-medium rounded transition-colors text-white shadow-md"
                    style={{ backgroundColor: colors.primary, fontFamily: "'Nunito', sans-serif" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = "0.9";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = "1";
                    }}
                  >
                    Manage Goals
                  </button>

                  {/* Time Range Selector - Bottom Right */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setChartTimeRange("1W")}
                      className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                        chartTimeRange === "1W"
                          ? "text-white shadow-md"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                      style={
                        chartTimeRange === "1W"
                          ? { backgroundColor: colors.primary, fontFamily: "'Nunito', sans-serif" }
                          : { backgroundColor: "transparent", fontFamily: "'Nunito', sans-serif" }
                      }
                    >
                      1W
                    </button>
                    <button
                      onClick={() => setChartTimeRange("1M")}
                      className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                        chartTimeRange === "1M"
                          ? "text-white shadow-md"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                      style={
                        chartTimeRange === "1M"
                          ? { backgroundColor: colors.primary, fontFamily: "'Nunito', sans-serif" }
                          : { backgroundColor: "transparent", fontFamily: "'Nunito', sans-serif" }
                      }
                    >
                      1M
                    </button>
                    <button
                      onClick={() => setChartTimeRange("6M")}
                      className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                        chartTimeRange === "6M"
                          ? "text-white shadow-md"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                      style={
                        chartTimeRange === "6M"
                          ? { backgroundColor: colors.primary, fontFamily: "'Nunito', sans-serif" }
                          : { backgroundColor: "transparent", fontFamily: "'Nunito', sans-serif" }
                      }
                    >
                      6M
                    </button>
                    <button
                      onClick={() => setChartTimeRange("1Y")}
                      className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                        chartTimeRange === "1Y"
                          ? "text-white shadow-md"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                      style={
                        chartTimeRange === "1Y"
                          ? { backgroundColor: colors.primary, fontFamily: "'Nunito', sans-serif" }
                          : { backgroundColor: "transparent", fontFamily: "'Nunito', sans-serif" }
                      }
                    >
                      1Y
                    </button>
                    <button
                      onClick={() => setChartTimeRange("2Y")}
                      className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                        chartTimeRange === "2Y"
                          ? "text-white shadow-md"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                      style={
                        chartTimeRange === "2Y"
                          ? { backgroundColor: colors.primary, fontFamily: "'Nunito', sans-serif" }
                          : { backgroundColor: "transparent", fontFamily: "'Nunito', sans-serif" }
                      }
                    >
                      2Y
                    </button>
                    <button
                      onClick={() => setChartTimeRange("all")}
                      className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                        chartTimeRange === "all"
                          ? "text-white shadow-md"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                      style={
                        chartTimeRange === "all"
                          ? { backgroundColor: colors.primary, fontFamily: "'Nunito', sans-serif" }
                          : { backgroundColor: "transparent", fontFamily: "'Nunito', sans-serif" }
                      }
                    >
                      <span className="text-xs font-medium" style={{ fontFamily: "'Nunito', sans-serif" }}>∞</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Goal Manager Modal */}
              {showGoalManager && (
                <div 
                  className="fixed inset-0 flex items-center justify-center z-[9999] transition-opacity duration-200"
                  style={{ 
                    animation: "fadeIn 0.2s ease-out",
                    backgroundColor: "rgba(0, 0, 0, 0.3)",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)"
                  }}
                  onClick={(e) => {
                    if (e.target === e.currentTarget) {
                      setShowGoalManager(false);
                      setShowGoalForm(false);
                      setGoalName("");
                      setGoalHours("");
                      setGoalDate("");
                    }
                  }}
                >
                  <div
                    className="bg-white rounded-xl p-8 max-w-xl w-full max-h-[80vh] mx-4 shadow-2xl flex flex-col"
                    style={{ animation: "slideUp 0.2s ease-out" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-start justify-between mb-6 flex-shrink-0">
                      <h3 className="text-lg font-semibold text-gray-900">Manage Goals</h3>
                      <button
                        onClick={() => {
                          setShowGoalManager(false);
                          setShowGoalForm(false);
                          setGoalName("");
                          setGoalHours("");
                          setGoalDate("");
                        }}
                        className="text-base text-gray-500 hover:text-gray-700"
                      >
                        Close
                      </button>
              </div>

                    <div className="flex-1 flex flex-col min-h-0">
                      <div className="flex items-center justify-between mb-4 flex-shrink-0">
                        <div />
                        <button
                          onClick={() => setShowGoalForm((prev) => !prev)}
                          className="text-base font-medium text-white px-6 py-3 rounded shadow-md font-semibold"
                          style={{ backgroundColor: colors.primary, fontFamily: "'Inter', sans-serif" }}
                        >
                          {showGoalForm ? "Hide Form" : "Add Goal"}
                        </button>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                        {/* Active Goals Section */}
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-3">Active Goals</h4>
                          <div className="rounded-lg border border-gray-200">
                            {goals.filter((g: any) => g.status === "active").length === 0 ? (
                              <div className="px-4 py-6 text-center text-sm text-gray-500">
                                No active goals. Add a new goal to get started.
                              </div>
                            ) : (
                              <ul className="divide-y divide-gray-200">
                                {goals.filter((g: any) => g.status === "active").map((goal: any) => {
                                  const dueDateText = goal.targetDate
                                    ? new Date(goal.targetDate).toLocaleDateString("en-US", {
                                        month: "long",
                                        day: "numeric",
                                        year: "numeric",
                                      })
                                    : "No due date";
                                  const percentComplete = goal.targetHours
                                    ? Math.min(
                                        100,
                                        Math.round(
                                          (participations.reduce((sum, p) => sum + p.totalHours, 0) /
                                            goal.targetHours) *
                                            100
                                        )
                                      )
                                    : 0;

                                  return (
                                    <li
                                      key={goal.id}
                                      className="px-4 py-4 text-sm bg-white"
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div>
                                          <div className="font-semibold text-gray-900">
                                            {goal.description || "Goal"}
                                          </div>
                                          <div className="mt-1 text-gray-600">
                                            {goal.targetHours} hrs by {dueDateText}
                                          </div>
                                          <div className="mt-2 flex items-center gap-2">
                                            <div className="h-2 w-28 overflow-hidden rounded-full bg-gray-200 shadow-inner">
                                              <div
                                                className="h-full rounded-full transition-all"
                                                style={{
                                                  width: `${percentComplete}%`,
                                                  backgroundColor:
                                                    percentComplete >= 100 ? colors.primary : colors.accent,
                                                }}
                                              ></div>
                                            </div>
                                            <span className="text-xs font-medium text-gray-700">
                                              {percentComplete}% Completed
                                            </span>
                                          </div>
                                        </div>
                                        <button
                                          onClick={async () => {
                                            try {
                                              const response = await fetch(`/api/volunteering-goals/${goal.id}`, {
                                                method: "DELETE",
                                                credentials: "include",
                                              });
                                              const text = await response.text();
                                              if (!response.ok) {
                                                console.error("Failed to delete goal:", text);
                                                alert("Failed to delete goal");
                                                return;
                                              }
                                              fetchGoals();
                                            } catch (error) {
                                              console.error("Error deleting goal:", error);
                                              alert("Failed to delete goal");
                                            }
                                          }}
                                          className="rounded-full p-2 text-red-500 transition hover:bg-red-50 shadow-md"
                                          aria-label="Delete goal"
                                          title="Delete goal"
                                        >
                                          <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="h-4 w-4"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth={2}
                                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V5a2 2 0 00-2-2h-2a2 2 0 00-2 2v2M4 7h16"
                                            />
                                          </svg>
                                        </button>
                                      </div>
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                          </div>
                        </div>

                        {/* Completed Goals Section */}
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-3">Completed Goals</h4>
                          <div className="rounded-lg border border-gray-200">
                            {goals.filter((g: any) => g.status === "completed").length === 0 ? (
                              <div className="px-4 py-6 text-center text-sm text-gray-500">
                                No completed goals yet.
                              </div>
                            ) : (
                              <ul className="divide-y divide-gray-200">
                                {goals.filter((g: any) => g.status === "completed").map((goal: any) => {
                                  const dueDateText = goal.targetDate
                                    ? new Date(goal.targetDate).toLocaleDateString("en-US", {
                                        month: "long",
                                        day: "numeric",
                                        year: "numeric",
                                      })
                                    : "No due date";
                                  const completedDateText = goal.completedAt
                                    ? new Date(goal.completedAt).toLocaleDateString("en-US", {
                                        month: "long",
                                        day: "numeric",
                                        year: "numeric",
                                      })
                                    : "";

                                  return (
                                    <li
                                      key={goal.id}
                                      className="px-4 py-4 text-sm bg-white"
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div>
                                          <div className="font-semibold text-gray-900">
                                            {goal.description || "Goal"}
                                          </div>
                                          <div className="mt-1 text-gray-600">
                                            {goal.targetHours} hrs by {dueDateText}
                                          </div>
                                          {completedDateText && (
                                            <div className="mt-1 text-xs text-gray-500">
                                              Completed on {completedDateText}
                                            </div>
                                          )}
                                          <div className="mt-2 flex items-center gap-2">
                                            <div className="h-2 w-28 overflow-hidden rounded-full bg-gray-200 shadow-inner">
                                              <div
                                                className="h-full rounded-full transition-all"
                                                style={{
                                                  width: "100%",
                                                  backgroundColor: colors.primary,
                                                }}
                                              ></div>
                                            </div>
                                            <span className="text-xs font-medium text-gray-700">
                                              100% Completed
                                            </span>
                                          </div>
                                        </div>
                                        <button
                                          onClick={async () => {
                                            try {
                                              const response = await fetch(`/api/volunteering-goals/${goal.id}`, {
                                                method: "DELETE",
                                                credentials: "include",
                                              });
                                              const text = await response.text();
                                              if (!response.ok) {
                                                console.error("Failed to delete goal:", text);
                                                alert("Failed to delete goal");
                                                return;
                                              }
                                              fetchGoals();
                                            } catch (error) {
                                              console.error("Error deleting goal:", error);
                                              alert("Failed to delete goal");
                                            }
                                          }}
                                          className="rounded-full p-2 text-red-500 transition hover:bg-red-50 shadow-md"
                                          aria-label="Delete goal"
                                          title="Delete goal"
                                        >
                                          <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="h-4 w-4"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth={2}
                                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V5a2 2 0 00-2-2h-2a2 2 0 00-2 2v2M4 7h16"
                                            />
                                          </svg>
                                        </button>
                                      </div>
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                          </div>
                        </div>

                        {/* Add Goal Form */}
                        {showGoalForm && (
                          <div className="border-t border-gray-200 pt-4 space-y-4">
                          <h4 className="text-sm font-medium text-gray-700">Create New Goal</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                Goal Name
                        </label>
                        <input
                                type="text"
                                value={goalName}
                                onChange={(e) => setGoalName(e.target.value)}
                                placeholder="e.g. Bright Futures Scholarship"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                Due Date
                        </label>
                        <input
                          type="date"
                          value={goalDate}
                          onChange={(e) => setGoalDate(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-datetime-edit-text]:text-gray-400 [&::-webkit-datetime-edit-month-field]:text-gray-400 [&::-webkit-datetime-edit-day-field]:text-gray-400 [&::-webkit-datetime-edit-year-field]:text-gray-400"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Hours Required
                              </label>
                              <input
                                type="number"
                                value={goalHours}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value === "" || parseFloat(value) >= 0) {
                                    setGoalHours(value);
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "ArrowDown") {
                                    e.preventDefault();
                                    const current = parseFloat(goalHours) || 0;
                                    setGoalHours(Math.max(0, current - 5).toString());
                                  } else if (e.key === "ArrowUp") {
                                    e.preventDefault();
                                    const current = parseFloat(goalHours) || 0;
                                    setGoalHours((current + 5).toString());
                                  }
                                }}
                                onInput={(e) => {
                                  const target = e.target as HTMLInputElement;
                                  const value = parseFloat(target.value);
                                  if (!isNaN(value) && value < 0) {
                                    target.value = "0";
                                    setGoalHours("0");
                                  }
                                }}
                                min="0"
                                step="5"
                                placeholder="e.g. 75"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 text-gray-900"
                        />
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={handleCreateGoal}
                                className="flex-1 px-4 py-2 text-white rounded-lg transition-colors shadow-md"
                                style={{ backgroundColor: colors.primary }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.opacity = "0.9";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.opacity = "1";
                                }}
                              >
                                Save Goal
                        </button>
                        <button
                          onClick={() => {
                                  setShowGoalForm(false);
                                  setGoalName("");
                            setGoalHours("");
                            setGoalDate("");
                          }}
                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700 shadow-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Log Hours Modal */}
              {showLogHoursModal && (
                <div 
                  className="fixed inset-0 flex items-center justify-center z-[9999] transition-opacity duration-200"
                  style={{ 
                    animation: "fadeIn 0.2s ease-out",
                    backgroundColor: "rgba(0, 0, 0, 0.3)",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)"
                  }}
                  onClick={(e) => {
                    if (e.target === e.currentTarget) {
                      setShowLogHoursModal(false);
                      setLogHoursFormData({
                        organizationName: "",
                        activityDescription: "",
                        startDate: "",
                        endDate: "",
                        isOneDay: false,
                        totalHours: "",
                        serviceSheetUrl: "",
                      });
                      setUploadedFile(null);
                      setLogHoursError("");
                    }
                  }}
                >
                  <div
                    className="bg-white rounded-xl p-8 max-w-2xl w-full max-h-[90vh] mx-4 shadow-2xl overflow-y-auto"
                    style={{ animation: "slideUp 0.2s ease-out" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="mb-6">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">Log Past Hours</h3>
                      <p className="text-gray-600 text-sm">
                        Record your past community service hours to track your volunteering progress
                      </p>
            </div>

                    <form onSubmit={handleLogHoursSubmit}>
                      {logHoursError && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                          {logHoursError}
                        </div>
                      )}

                      {/* Organization Name */}
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Organization Name
                        </label>
                        <input
                          type="text"
                          required
                          value={logHoursFormData.organizationName}
                          onChange={(e) => setLogHoursFormData({ ...logHoursFormData, organizationName: e.target.value })}
                          placeholder="e.g., Local Food Bank"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 text-gray-900"
                        />
                      </div>

                      {/* Activity Description */}
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Activity Description
                        </label>
                        <textarea
                          required
                          value={logHoursFormData.activityDescription}
                          onChange={(e) => setLogHoursFormData({ ...logHoursFormData, activityDescription: e.target.value })}
                          placeholder="Describe what you did while volunteering..."
                          rows={4}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 text-gray-900"
                        />
                      </div>

                      {/* Date Range */}
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Date
                        </label>
                <div className="space-y-3">
                          <div className="flex items-center gap-2 mb-3">
                            <input
                              type="checkbox"
                              id="oneDay"
                              checked={logHoursFormData.isOneDay}
                              onChange={handleOneDayToggle}
                              className="w-4 h-4 rounded border-gray-300"
                            />
                            <label htmlFor="oneDay" className="text-sm text-gray-700 cursor-pointer">
                              This was a one-day event
                            </label>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Start Date</label>
                              <input
                                type="date"
                                required
                                value={logHoursFormData.startDate}
                                onChange={(e) => {
                                  const newStartDate = e.target.value;
                                  setLogHoursFormData({
                                    ...logHoursFormData,
                                    startDate: newStartDate,
                                    endDate: logHoursFormData.isOneDay ? newStartDate : logHoursFormData.endDate,
                                  });
                                }}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-datetime-edit-text]:text-gray-400 [&::-webkit-datetime-edit-month-field]:text-gray-400 [&::-webkit-datetime-edit-day-field]:text-gray-400 [&::-webkit-datetime-edit-year-field]:text-gray-400"
                              />
                            </div>
                            {!logHoursFormData.isOneDay && (
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">End Date</label>
                                <input
                                  type="date"
                                  value={logHoursFormData.endDate}
                                  onChange={(e) => setLogHoursFormData({ ...logHoursFormData, endDate: e.target.value })}
                                  min={logHoursFormData.startDate}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-datetime-edit-text]:text-gray-400 [&::-webkit-datetime-edit-month-field]:text-gray-400 [&::-webkit-datetime-edit-day-field]:text-gray-400 [&::-webkit-datetime-edit-year-field]:text-gray-400"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Time Spent */}
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Time Spent
                        </label>
                        <input
                          type="number"
                          required
                          step="0.1"
                          min="0.1"
                          value={logHoursFormData.totalHours}
                          onChange={(e) => setLogHoursFormData({ ...logHoursFormData, totalHours: e.target.value })}
                          placeholder="e.g., 5.5"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 text-gray-900"
                        />
                      </div>

                      {/* Service Sheet Upload */}
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Service Sheet (Optional)
                        </label>
                        <p className="text-xs text-gray-500 mb-3">
                          Upload your community service form to store it digitally
                        </p>

                        {!uploadedFile ? (
                          <div>
                            <input
                              type="file"
                              accept=".pdf,image/*"
                              onChange={handleFileUpload}
                              disabled={isUploading}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                            />
                            {isUploading && (
                              <p className="text-sm text-gray-500 mt-2">Uploading...</p>
                            )}
                          </div>
                        ) : (
                          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <svg
                                  className="w-8 h-8 text-blue-600"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                  />
                                </svg>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{uploadedFile.name}</p>
                                  <a
                                    href={uploadedFile.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 hover:underline"
                                  >
                                    View file
                                  </a>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setUploadedFile(null);
                                  setLogHoursFormData({ ...logHoursFormData, serviceSheetUrl: "" });
                                }}
                                className="text-red-600 hover:text-red-800 text-sm"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Submit Button */}
                      <div className="flex gap-3 pt-4 border-t border-gray-200">
                        <button
                          type="submit"
                          disabled={isSubmittingLogHours}
                          className="flex-1 px-6 py-3 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                          style={{ backgroundColor: colors.primary }}
                          onMouseEnter={(e) => {
                            if (!isSubmittingLogHours) e.currentTarget.style.opacity = "0.9";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = "1";
                          }}
                        >
                          {isSubmittingLogHours ? "Logging Hours..." : "Log Hours"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowLogHoursModal(false);
                            setLogHoursFormData({
                              organizationName: "",
                              activityDescription: "",
                              startDate: "",
                              endDate: "",
                              isOneDay: false,
                              totalHours: "",
                              serviceSheetUrl: "",
                            });
                            setUploadedFile(null);
                            setLogHoursError("");
                          }}
                          className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Add Opportunity Modal */}
              {showAddOpportunityModal && (
                <div 
                  className="fixed inset-0 flex items-center justify-center z-[9999] transition-opacity duration-200"
                  style={{ 
                    animation: "fadeIn 0.2s ease-out",
                    backgroundColor: "rgba(0, 0, 0, 0.3)",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)"
                  }}
                  onClick={(e) => {
                    if (e.target === e.currentTarget) {
                      setShowAddOpportunityModal(false);
                      setOpportunityFormData({
                        name: "",
                        description: "",
                        startTime: "",
                        endTime: "",
                        date: "",
                        isRecurring: false,
                        recurrenceFrequency: "weekly",
                      });
                      setOpportunityError("");
                      setOpportunitySuccess(false);
                    }
                  }}
                >
                  <div
                    className="bg-white rounded-xl p-8 max-w-2xl w-full max-h-[90vh] mx-4 shadow-2xl overflow-y-auto"
                    style={{ animation: "slideUp 0.2s ease-out" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-start justify-between mb-6">
                      <h3 className="text-lg font-semibold text-gray-900">Add Opportunity</h3>
                      <button
                        onClick={() => {
                          setShowAddOpportunityModal(false);
                          setOpportunityFormData({
                            name: "",
                            description: "",
                            startTime: "",
                            endTime: "",
                            date: "",
                            isRecurring: false,
                            recurrenceFrequency: "weekly",
                          });
                          setOpportunityError("");
                          setOpportunitySuccess(false);
                        }}
                        className="text-base text-gray-500 hover:text-gray-700"
                      >
                        Close
                      </button>
                    </div>

                    {opportunitySuccess ? (
                      <div className="text-center py-8">
                        <div className="mb-4">
                          <svg className="w-16 h-16 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">Request Submitted!</h4>
                        <p className="text-sm text-gray-600">Your opportunity request has been submitted for admin review.</p>
                      </div>
                    ) : (
                      <form onSubmit={handleAddOpportunitySubmit}>
                        {opportunityError && (
                          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                            {opportunityError}
                          </div>
                        )}

                        {/* Opportunity Name */}
                        <div className="mb-6">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Opportunity Name
                          </label>
                          <input
                            type="text"
                            required
                            value={opportunityFormData.name}
                            onChange={(e) => setOpportunityFormData({ ...opportunityFormData, name: e.target.value })}
                            placeholder="e.g. Beach Clean Up"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 text-gray-900"
                          />
                        </div>

                        {/* Description */}
                        <div className="mb-6">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Description
                          </label>
                          <textarea
                            required
                            value={opportunityFormData.description}
                            onChange={(e) => setOpportunityFormData({ ...opportunityFormData, description: e.target.value })}
                            placeholder="What should volunteers expect to do? Should they bring anything or prepare beforehand? How difficult will this activity be to complete? etc..."
                            rows={4}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 text-gray-900"
                          />
                        </div>

                        {/* Date */}
                        <div className="mb-6">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Date
                          </label>
                          <input
                            type="date"
                            required
                            value={opportunityFormData.date}
                            onChange={(e) => setOpportunityFormData({ ...opportunityFormData, date: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-datetime-edit-text]:text-gray-400 [&::-webkit-datetime-edit-month-field]:text-gray-400 [&::-webkit-datetime-edit-day-field]:text-gray-400 [&::-webkit-datetime-edit-year-field]:text-gray-400"
                          />
                        </div>

                        {/* Time Range */}
                        <div className="mb-6">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Time Range
                          </label>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Start Time</label>
                              <input
                                type="time"
                                required
                                value={opportunityFormData.startTime}
                                onChange={(e) => setOpportunityFormData({ ...opportunityFormData, startTime: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">End Time</label>
                              <input
                                type="time"
                                required
                                value={opportunityFormData.endTime}
                                onChange={(e) => setOpportunityFormData({ ...opportunityFormData, endTime: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Recurring */}
                        <div className="mb-6">
                          <label className="flex items-center gap-2 cursor-pointer mb-3">
                            <input
                              type="checkbox"
                              checked={opportunityFormData.isRecurring}
                              onChange={(e) => setOpportunityFormData({ ...opportunityFormData, isRecurring: e.target.checked })}
                              className="w-4 h-4 rounded border-gray-300"
                            />
                            <span className="text-sm text-gray-700">This is a recurring opportunity</span>
                          </label>
                          {opportunityFormData.isRecurring && (
                            <div className="ml-6 mt-3">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Repeats
                              </label>
                              <select
                                value={opportunityFormData.recurrenceFrequency}
                                onChange={(e) => setOpportunityFormData({ ...opportunityFormData, recurrenceFrequency: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                              >
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                                <option value="monthly">Monthly</option>
                              </select>
                            </div>
                          )}
                        </div>

                        {/* Submit Button */}
                        <div className="flex gap-3 pt-4 border-t border-gray-200">
                          <button
                            type="submit"
                            disabled={isSubmittingOpportunity}
                            className="flex-1 px-6 py-3 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                            style={{ backgroundColor: colors.primary }}
                            onMouseEnter={(e) => {
                              if (!isSubmittingOpportunity) e.currentTarget.style.opacity = "0.9";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.opacity = "1";
                            }}
                          >
                            {isSubmittingOpportunity ? "Submitting..." : "Submit for Review"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowAddOpportunityModal(false);
                              setOpportunityFormData({
                                name: "",
                                description: "",
                                startTime: "",
                                endTime: "",
                                date: "",
                                isRecurring: false,
                                recurrenceFrequency: "weekly",
                              });
                              setOpportunityError("");
                              setOpportunitySuccess(false);
                            }}
                            className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* My Service Box */}
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">My Service</h2>
              <div className="max-h-[600px] overflow-y-auto px-2">
                {/* Upcoming Activities */}
                {upcomingOpportunities.length > 0 && (
                  <div className="space-y-3 mb-6">
                    {upcomingOpportunities.map((opp) => {
                      const startDate = new Date(opp.startDate);
                      const endDate = opp.endDate ? new Date(opp.endDate) : null;
                      const now = new Date();
                      const daysFromNow = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                      
                      const formatDateRange = (start: Date, end: Date | null) => {
                        const startStr = start.toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: start.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
                        });
                        if (!end) return startStr;
                        const endStr = end.toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: end.getFullYear() !== start.getFullYear() ? "numeric" : undefined,
                        });
                        if (start.getTime() === end.getTime()) return startStr;
                        return `${startStr} to ${endStr}`;
                      };

                      return (
                    <div
                      key={opp.id}
                          className="p-3 rounded-lg cursor-pointer transition-all shadow-md whitespace-nowrap overflow-x-auto"
                          style={{ 
                            backgroundColor: colors.tertiary,
                            boxShadow: "0 0 12px rgba(0, 0, 0, 0.2)"
                          }}
                      onClick={() => router.push(`/volunteering/${opp.id}`)}
                    >
                          <div className="text-base font-bold leading-tight mb-1" style={{ fontFamily: "var(--font-caslon), serif", color: colors.primary }}>
                            {opp.title} - <span style={{ fontFamily: "'Nunito', sans-serif", fontWeight: "normal" }}>{opp.description || opp.organization}</span>
                    </div>
                          <div className="text-sm leading-tight" style={{ fontFamily: "'Nunito', sans-serif", color: colors.primary }}>
                            {formatDateRange(startDate, endDate)} {opp.isOngoing && "(Ongoing)"} {daysFromNow >= 0 && `(${daysFromNow} ${daysFromNow === 1 ? 'day' : 'days'} from now)`}
                </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Past Activities (Participations) */}
                {participations.length > 0 && (
                  <div className="space-y-3">
                    {participations
                      .sort((a, b) => {
                        const aDate = new Date(a.endDate || a.startDate).getTime();
                        const bDate = new Date(b.endDate || b.startDate).getTime();
                        return bDate - aDate; // Most recent first
                      })
                      .map((participation) => {
                        const startDate = new Date(participation.startDate);
                        const endDate = participation.endDate ? new Date(participation.endDate) : null;
                        const activityName = participation.opportunity?.title || participation.organizationName || "Activity";
                        const description = participation.opportunity?.description || participation.activityDescription || "";
                        
                        const formatDateRange = (start: Date, end: Date | null) => {
                          const startStr = start.toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: start.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
                          });
                          if (!end || start.getTime() === end.getTime()) return startStr;
                          const endStr = end.toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: end.getFullYear() !== start.getFullYear() ? "numeric" : undefined,
                          });
                          return `${startStr} to ${endStr}`;
                        };

                        return (
                          <div
                            key={participation.id}
                            className="p-3 rounded-lg transition-all shadow-md whitespace-nowrap overflow-x-auto"
                            style={{ 
                              backgroundColor: colors.accent,
                              boxShadow: "0 0 12px rgba(0, 0, 0, 0.2)"
                            }}
                          >
                            <div className="text-base font-bold leading-tight mb-1" style={{ fontFamily: "var(--font-caslon), serif", color: colors.primary }}>
                              {activityName} - <span style={{ fontFamily: "'Nunito', sans-serif", fontWeight: "normal" }}>{description}</span>
                            </div>
                            <div className="text-sm leading-tight" style={{ fontFamily: "'Nunito', sans-serif", color: colors.primary }}>
                              {formatDateRange(startDate, endDate)} <span style={{ fontFamily: "var(--font-caslon), serif", fontWeight: "bold" }}>{Math.round(participation.totalHours)} hrs</span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}

                {upcomingOpportunities.length === 0 && participations.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4" style={{ fontFamily: "'Nunito', sans-serif" }}>No activities yet</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Search and Filters Section */}
        <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200 mb-6">
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
              style={showFilters ? { backgroundColor: colors.primary, fontFamily: "'Nunito', sans-serif" } : { fontFamily: "'Nunito', sans-serif" }}
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

            {/* Post Opportunity Button - Plus Sign */}
            {session.user.role === "student" && (
              <button
                onClick={() => setShowAddOpportunityModal(true)}
                className="w-10 h-10 rounded-lg flex items-center justify-center transition-opacity shadow-md"
                style={{ backgroundColor: colors.primary }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = "0.9";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "1";
                }}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="white"
                  strokeWidth={2.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </button>
            )}
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
