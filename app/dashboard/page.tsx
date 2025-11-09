"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { exportToPDF } from "../components/ExportFunctions";
import { Activity as ActivityType, ActivityCategory } from "../types";

interface Verification {
  id: string;
  activityId?: string;
  status: string;
  verifierNotes?: string;
  activity?: { id: string; name: string; category: string };
  student?: { id: string; name: string; email: string };
  verifier?: { id: string; name: string; email: string };
}

// Use Activity type from types.ts which includes createdAt and updatedAt
type Activity = ActivityType;

// Unified activity interface that combines verifications and activities
interface UnifiedActivity {
  id: string;
  name: string;
  category: string;
  description: string;
  startDate: string;
  endDate?: string;
  position?: string;
  organization?: string;
  verified: boolean;
  hoursPerWeek?: number;
  totalHours?: number;
  notes?: string;
  verificationId?: string; // If this came from a verification
  verificationStatus?: string; // "pending", "accepted", "rejected"
  organizationName?: string; // From verification
  verifierEmail?: string | null; // Email of the verifier
}

const CATEGORIES: ActivityCategory[] = [
  "Sports",
  "Clubs",
  "Volunteer",
  "Work",
  "Academic",
  "Arts",
  "Leadership",
  "Other",
];

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [showEditVerificationForm, setShowEditVerificationForm] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [editingVerification, setEditingVerification] = useState<Verification | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }
    
    if (!session || status !== "authenticated") {
      return;
    }

    // FIRST: Check if user selected a role during signup - this takes priority
    const urlParams = new URLSearchParams(window.location.search);
    const signupRole = urlParams.get("role");
    
    // Also check cookie as fallback
    const cookieRole = document.cookie
      .split("; ")
      .find((row) => row.startsWith("signupRole="))
      ?.split("=")[1];
    
    const selectedRole = signupRole || cookieRole;
    
    // If there's a selected role and it's different from current role, update it FIRST
    if (selectedRole && (selectedRole === "student" || selectedRole === "verifier" || selectedRole === "admin")) {
      if (session.user.role !== selectedRole) {
        console.log("Updating user role from", session.user.role, "to", selectedRole);
        fetch("/api/user/update-role", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: selectedRole }),
        })
        .then((response) => response.json())
        .then((data) => {
          if (data.error) {
            console.error("Error updating role:", data.error);
          } else {
            console.log("Role updated successfully:", data.user);
            // Clear the cookie
            document.cookie = "signupRole=; path=/; max-age=0";
            // Reload to get updated session
            if (selectedRole === "admin") {
              window.location.href = "/admin";
            } else {
              window.location.href = "/dashboard";
            }
          }
        })
        .catch((error) => {
          console.error("Error updating role:", error);
        });
        return; // Don't proceed with other logic until role is updated
      } else {
        // Role is already correct, clear the cookie
        document.cookie = "signupRole=; path=/; max-age=0";
      }
    }
    
    // SECOND: After role is confirmed/updated, check for admin redirect
    // Only redirect if there's no role parameter (meaning role update already happened)
    if (!selectedRole && session.user.role === "admin") {
      router.push("/admin");
      return;
    }
    
    // Don't run dashboard logic for admins - they should be redirected
    if (session.user.role === "admin") {
      return;
    }
    
    // THIRD: Load dashboard data
    fetchVerifications();
    if (session.user.role === "student") {
      fetchActivities();
    } else if (session.user.role === "verifier") {
      fetchPendingRequests();
    }
  }, [status, session, router]);

  const fetchVerifications = async () => {
    try {
      const response = await fetch("/api/verifications");
      const data = await response.json();
      setVerifications(data.verifications || []);
    } catch (error) {
      console.error("Error fetching verifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivities = async () => {
    try {
      const response = await fetch("/api/activities");
      const data = await response.json();
      setActivities(data.activities || []);
    } catch (error) {
      console.error("Error fetching activities:", error);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const response = await fetch("/api/pending-verification-requests");
      const data = await response.json();
      setPendingRequests(data.pendingRequests || []);
    } catch (error) {
      console.error("Error fetching pending requests:", error);
    }
  };

  const handleAcceptReject = async (id: string, status: "accepted" | "rejected") => {
    setUpdatingId(id);
    try {
      const response = await fetch(`/api/verifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Error updating verification:", data.error);
        alert(data.error || "Failed to update verification");
        setUpdatingId(null);
        return;
      }

      // Refresh verifications
      await fetchVerifications();
      setUpdatingId(null);
    } catch (error) {
      console.error("Error updating verification:", error);
      alert("An error occurred. Please try again.");
      setUpdatingId(null);
    }
  };

  const handleDeleteVerification = async (id: string) => {
    if (!confirm("Are you sure you want to delete this verification?")) {
      return;
    }

    try {
      const response = await fetch(`/api/verifications/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to delete verification");
        return;
      }

      fetchVerifications();
    } catch (error) {
      console.error("Error deleting verification:", error);
      alert("An error occurred. Please try again.");
    }
  };

  const handleEditVerification = (verification: Verification) => {
    setEditingVerification(verification);
    setShowEditVerificationForm(true);
  };

  const handleVerifyActivity = async (activityId: string, action: "accept" | "reject") => {
    try {
      const response = await fetch("/api/verify-activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activityId, action }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to verify activity");
        return;
      }

      // Success
      alert(`Activity ${action === "accept" ? "verified" : "rejected"} successfully!`);
    } catch (error) {
      console.error("Error verifying activity:", error);
      alert("An error occurred. Please try again.");
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-black dark:to-zinc-900 flex items-center justify-center">
        <div className="text-zinc-600 dark:text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  // Don't render dashboard for admins - they should be redirected
  if (session.user.role === "admin") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Redirecting to admin dashboard...</div>
      </div>
    );
  }

  const isVerifier = session.user.role === "verifier";
  const isStudent = session.user.role === "student";
  const pendingVerifications = verifications.filter((v) => v.status === "pending");
  const acceptedVerifications = verifications.filter((v) => v.status === "accepted" || v.status === "verified");

  // Get activity IDs that already have verifications (to avoid duplicates)
  const verifiedActivityIds = new Set(
    acceptedVerifications
      .filter((v) => v.activity?.id)
      .map((v) => v.activity!.id)
  );

  // Merge accepted verifications with activities into unified list
  const unifiedActivities: UnifiedActivity[] = [
    // Add accepted verifications as verified activities (only for students)
    ...(isStudent ? acceptedVerifications
      .filter((v) => v.activity) // Only include verifications with activities
      .map((v) => ({
        id: v.activity!.id,
        name: v.activity!.name,
        category: v.activity!.category || "Other",
        description: v.verifierNotes || "",
        startDate: activities.find((a) => a.id === v.activity!.id)?.startDate || new Date().toISOString(),
        endDate: activities.find((a) => a.id === v.activity!.id)?.endDate,
        position: activities.find((a) => a.id === v.activity!.id)?.role,
        organization: v.verifier?.name || "",
        verified: true,
        verificationId: v.id,
        verificationStatus: v.status,
        organizationName: v.verifier?.name,
        verifierEmail: v.verifier?.email || null,
      })) : []),
    // Add regular activities (excluding those that already have verifications)
    ...activities
      .filter((a) => !verifiedActivityIds.has(a.id)) // Exclude activities that already have verifications
      .map((a) => {
        const verification = verifications.find((v) => (v.activityId === a.id || v.activity?.id === a.id) && (v.status === "accepted" || v.status === "verified"));
        return {
          id: a.id,
          name: a.name,
          category: a.category,
          description: a.description,
          startDate: a.startDate,
          endDate: a.endDate,
          position: a.role,
          organization: a.organization,
          verified: !!verification,
          verifierEmail: verification?.verifier?.email || null,
          hoursPerWeek: a.hoursPerWeek,
          totalHours: a.totalHours,
          notes: a.studentNotes,
        };
      }),
  ].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-sm">
                  <span className="text-white font-bold text-xl">A</span>
                </div>
                <span className="text-xl font-bold text-gray-900">Actify</span>
              </Link>
              <div className="h-6 w-px bg-gray-300 mx-2"></div>
              <span className="text-sm text-gray-500">
                {isVerifier ? "Verifier Portal" : "Student Portal"}
              </span>
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
                href="/profile"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
              >
                Profile
              </Link>
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
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {session.user.name?.split(" ")[0] || "there"}!
          </h1>
          <p className="text-gray-600">
            {isVerifier 
              ? "Review and verify student activity submissions" 
              : "Manage your activities and track verification status"}
          </p>
        </div>

        {isVerifier ? (
          /* Verifier View */
          <div className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Pending Requests</p>
                    <p className="text-3xl font-bold text-gray-900">{pendingRequests.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Issued Verifications</p>
                    <p className="text-3xl font-bold text-gray-900">{verifications.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Verified This Month</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {verifications.filter(v => {
                        const date = new Date(v.createdAt || Date.now());
                        const now = new Date();
                        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                      }).length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Pending Verification Requests Section */}
            {pendingRequests.length > 0 && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-500 rounded-lg p-6 mb-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <h2 className="text-xl font-bold text-gray-900">
                        Action Required: {pendingRequests.length} Pending Request{pendingRequests.length !== 1 ? 's' : ''}
                      </h2>
                    </div>
                    <p className="text-gray-600 text-sm">
                      Students are waiting for your verification. Please review and respond.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pendingRequests.map((activity) => (
                    <PendingRequestCard
                      key={activity.id}
                      activity={activity}
                      onAccept={async () => {
                        await handleVerifyActivity(activity.id, "accept");
                        fetchPendingRequests();
                        fetchVerifications();
                      }}
                      onReject={async () => {
                        await handleVerifyActivity(activity.id, "reject");
                        fetchPendingRequests();
                        fetchVerifications();
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Issue Verification Section */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">
                    Issue New Verification
                  </h2>
                  <p className="text-sm text-gray-600">
                    Create and send verification tokens to students
                  </p>
                </div>
                <button
                  onClick={() => setShowIssueForm(true)}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Issue Token
                </button>
              </div>
            </div>

            {/* Issued Verifications Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">
                  Issued Verifications
                </h3>
                <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                  {verifications.length} total
                </span>
              </div>
              {verifications.length === 0 ? (
                <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-600 mb-2 font-medium">No verifications yet</p>
                  <p className="text-sm text-gray-500 mb-4">
                    Start by issuing your first verification token
                  </p>
                  <button
                    onClick={() => setShowIssueForm(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
                  >
                    Issue Your First Token
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {verifications.map((verification) => (
                    <VerificationCard
                      key={verification.id}
                      verification={verification}
                      isOrganization={true}
                      onAcceptReject={handleAcceptReject}
                      onDelete={handleDeleteVerification}
                      onEdit={handleEditVerification}
                      updatingId={updatingId}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Student View */
          <div className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
                <p className="text-xs font-medium text-gray-600 mb-1 uppercase tracking-wide">Verified</p>
                <p className="text-2xl font-bold text-green-600">
                  {unifiedActivities.filter((a) => a.verified).length}
                </p>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
                <p className="text-xs font-medium text-gray-600 mb-1 uppercase tracking-wide">Pending</p>
                <p className="text-2xl font-bold text-amber-600">
                  {pendingVerifications.length}
                </p>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
                <p className="text-xs font-medium text-gray-600 mb-1 uppercase tracking-wide">Unverified</p>
                <p className="text-2xl font-bold text-gray-400">
                  {unifiedActivities.filter((a) => !a.verified && a.verificationStatus !== "pending").length}
                </p>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
                <p className="text-xs font-medium text-gray-600 mb-1 uppercase tracking-wide">Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  {unifiedActivities.length}
                </p>
              </div>
            </div>

            {/* Pending Verifications Section */}
            {pendingVerifications.length > 0 && (
              <div className="bg-amber-50 border-l-4 border-amber-500 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Pending Verifications ({pendingVerifications.length})
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {pendingVerifications.map((verification) => (
                    <div
                      key={verification.id}
                      className="bg-white border border-amber-200 rounded-lg p-4"
                    >
                      <p className="text-sm font-medium text-gray-900 mb-1">
                        {verification.activity?.name}
                      </p>
                      <p className="text-xs text-gray-600">
                        Awaiting verification from {verification.verifier?.name || "verifier"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Activities Section */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">
                    My Activities
                  </h2>
                  <p className="text-sm text-gray-600">
                    Track and manage your extracurricular activities
                  </p>
                </div>
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Search activities..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  <button
                    onClick={() => {
                      setEditingActivity(null);
                      setShowActivityForm(true);
                    }}
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Activity
                  </button>
                </div>
              </div>

              {/* Export Button */}
              {unifiedActivities.length > 0 && (
                <div className="flex items-center justify-between mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <p className="text-sm font-medium text-gray-900 mb-0.5">Export Your Activities</p>
                    <p className="text-xs text-gray-600">
                      Download as PDF for your college applications
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      exportToPDF(
                        acceptedVerifications,
                        activities,
                        session?.user.name || "Profile"
                      )
                    }
                    className="px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors text-sm flex items-center gap-2 shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export PDF
                  </button>
                </div>
              )}

              {unifiedActivities.filter(
                (a) =>
                  a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  a.description.toLowerCase().includes(searchQuery.toLowerCase())
              ).length === 0 ? (
                <div className="bg-gray-50 rounded-lg p-12 text-center border border-gray-200">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p className="text-gray-600 mb-2 font-medium">
                    {unifiedActivities.length === 0
                      ? "No activities yet"
                      : "No activities match your search"}
                  </p>
                  <p className="text-sm text-gray-500">
                    {unifiedActivities.length === 0
                      ? "Start building your activity profile for college applications"
                      : "Try adjusting your search terms"}
                  </p>
                  {unifiedActivities.length === 0 && (
                    <button
                      onClick={() => {
                        setEditingActivity(null);
                        setShowActivityForm(true);
                      }}
                      className="mt-4 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
                    >
                      Add Your First Activity
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {unifiedActivities
                    .filter(
                      (a) =>
                        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        a.description.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((activity) => {
                      // If it's from a verification, show VerificationCard
                      if (activity.verificationId) {
                        const verification = acceptedVerifications.find(
                          (v) => v.id === activity.verificationId
                        );
                        if (verification) {
                          return (
                            <VerificationCard
                              key={activity.id}
                              verification={verification}
                              isOrganization={false}
                              onAcceptReject={handleAcceptReject}
                              onDelete={handleDeleteVerification}
                              onEdit={handleEditVerification}
                              updatingId={updatingId}
                            />
                          );
                        }
                      }
                      // Otherwise, show ActivityCard
                      const activityData = activities.find((a) => a.id === activity.id);
                      if (activityData) {
                        // Create activity object with verifier email from unified activity
                        const activityWithVerifier = {
                          ...activityData,
                          verifierEmail: activity.verifierEmail,
                        };
                        return (
                          <ActivityCard
                            key={activity.id}
                            activity={activityWithVerifier as Activity}
                            onEdit={() => {
                              setEditingActivity(activityData);
                              setShowActivityForm(true);
                            }}
                            onDelete={async () => {
                              if (!confirm("Are you sure you want to delete this activity?")) {
                                return;
                              }
                              try {
                                const response = await fetch(`/api/activities/${activity.id}`, {
                                  method: "DELETE",
                                });
                                if (!response.ok) {
                                  alert("Failed to delete activity");
                                  return;
                                }
                                fetchActivities();
                              } catch (error) {
                                console.error("Error deleting activity:", error);
                                alert("An error occurred. Please try again.");
                              }
                            }}
                            onRequestVerification={async () => {
                              const orgEmail = prompt(
                                "Enter the organization's email address to request verification:"
                              );
                              if (orgEmail) {
                                try {
                                  const response = await fetch(
                                    `/api/activities/${activity.id}/request-verification`,
                                    {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ organizationEmail: orgEmail }),
                                    }
                                  );
                                  const data = await response.json();
                                  if (response.ok) {
                                    alert("Verification request sent!");
                                    fetchVerifications();
                                  } else {
                                    alert(data.error || "Failed to send verification request");
                                  }
                                } catch (error) {
                                  alert("An error occurred. Please try again.");
                                }
                              }
                            }}
                          />
                        );
                      }
                      return null;
                    })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Issue Token Form Modal */}
        {showIssueForm && (
          <IssueTokenForm
            onClose={() => setShowIssueForm(false)}
            onSuccess={() => {
              setShowIssueForm(false);
              fetchVerifications();
            }}
          />
        )}

        {/* Activity Form Modal */}
        {showActivityForm && (
          <ActivityForm
            activity={editingActivity}
            onClose={() => {
              setShowActivityForm(false);
              setEditingActivity(null);
            }}
            onSuccess={() => {
              setShowActivityForm(false);
              setEditingActivity(null);
              fetchActivities();
            }}
            onActivityCreated={(newActivity) => {
              // Update editingActivity so form switches to edit mode
              setEditingActivity(newActivity);
              fetchActivities();
            }}
          />
        )}

        {/* Edit Verification Form Modal */}
        {showEditVerificationForm && editingVerification && (
          <EditVerificationForm
            verification={editingVerification}
            onClose={() => {
              setShowEditVerificationForm(false);
              setEditingVerification(null);
            }}
            onSuccess={() => {
              setShowEditVerificationForm(false);
              setEditingVerification(null);
              fetchVerifications();
            }}
          />
        )}
      </div>
    </div>
  );
}

function VerificationCard({
  verification,
  isOrganization,
  onAcceptReject,
  onDelete,
  onEdit,
  updatingId,
}: {
  verification: Verification;
  isOrganization: boolean;
  onAcceptReject: (id: string, status: "accepted" | "rejected") => void;
  onDelete: (id: string) => void;
  onEdit: (verification: Verification) => void;
  updatingId?: string | null;
}) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
    });
  };

  const activityName = verification.activity?.name || "Activity";
  const category = verification.activity?.category || "Other";

  return (
    <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow border border-blue-100">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-gray-900 mb-1">
            {activityName}
          </h3>
          <p className="text-sm text-gray-600 mb-2">
            {isOrganization ? (
              <>Sent to <span className="font-medium">{verification.student?.email || "Student"}</span></>
            ) : (
              <>Verified by <span className="font-medium">{verification.verifier?.name || "Verifier"}</span></>
            )}
          </p>
          {category && (
            <span className="inline-block px-2.5 py-1 text-xs font-medium bg-white/70 text-gray-700 rounded-md border border-blue-200">
              {category}
            </span>
          )}
        </div>
        <span
          className={`ml-2 px-3 py-1 text-xs font-medium rounded ${
            verification.status === "accepted" || verification.status === "verified"
              ? "bg-green-500 text-white"
              : verification.status === "rejected"
              ? "bg-red-500 text-white"
              : "bg-amber-500 text-white"
          }`}
        >
          {verification.status === "accepted" || verification.status === "verified"
            ? "✓ Accepted"
            : verification.status === "rejected"
            ? "✗ Rejected"
            : "Pending"}
        </span>
      </div>

      {verification.verifierNotes && (
        <p className="text-sm text-gray-700 mb-3">
          {verification.verifierNotes}
        </p>
      )}
      
      {verification.verifierNotes && verification.verifierNotes.includes("dashboard") && (
        <p className="text-xs text-gray-500 mb-3 italic">
          Verified via dashboard
        </p>
      )}

      <div className="flex gap-2 pt-4 border-t border-blue-200">
        {!isOrganization && verification.status === "pending" && (
          <>
            <button
              onClick={() => onAcceptReject(verification.id, "accepted")}
              disabled={updatingId === verification.id}
              className="flex-1 px-3 py-2 text-sm font-medium bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {updatingId === verification.id ? "Processing..." : "Accept"}
            </button>
            <button
              onClick={() => onAcceptReject(verification.id, "rejected")}
              disabled={updatingId === verification.id}
              className="flex-1 px-3 py-2 text-sm font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {updatingId === verification.id ? "Processing..." : "Reject"}
            </button>
          </>
        )}
        {isOrganization && (
          <button
            onClick={() => onEdit(verification)}
            className="px-3 py-2 text-sm font-medium bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-sm"
          >
            Edit
          </button>
        )}
        <button
          onClick={() => onDelete(verification.id)}
          className="px-3 py-2 text-sm font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-sm"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function IssueTokenForm({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    studentEmail: "",
    title: "",
    description: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    position: "",
    category: "Other",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/verifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to issue token");
        setIsSubmitting(false);
        return;
      }

      onSuccess();
    } catch (err) {
      setError("An error occurred. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
          Issue Verification Token
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Student Email *
            </label>
            <input
              type="email"
              required
              value={formData.studentEmail}
              onChange={(e) => setFormData({ ...formData, studentEmail: e.target.value })}
              className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Verification Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Internship 2025 Financial Analyst"
              className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Position/Role
              </label>
              <input
                type="text"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500"
              >
                <option value="Sports">Sports</option>
                <option value="Clubs">Clubs</option>
                <option value="Volunteer">Volunteer</option>
                <option value="Work">Work</option>
                <option value="Academic">Academic</option>
                <option value="Arts">Arts</option>
                <option value="Leadership">Leadership</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-2 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-black rounded-lg font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Issuing..." : "Issue Token"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 rounded-lg font-medium hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditVerificationForm({
  verification,
  onClose,
  onSuccess,
}: {
  verification: Verification;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    title: verification.title,
    description: verification.description || "",
    startDate: verification.startDate,
    endDate: verification.endDate || "",
    position: verification.position || "",
    category: verification.category || "Other",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/verifications/${verification.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to update verification");
        setIsSubmitting(false);
        return;
      }

      onSuccess();
    } catch (err) {
      setError("An error occurred. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
          Edit Verification
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Verification Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Internship 2025 Financial Analyst"
              className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Position/Role
              </label>
              <input
                type="text"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                placeholder="e.g., Financial Analyst"
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500"
              >
                <option value="Work">Work</option>
                <option value="Volunteer">Volunteer</option>
                <option value="Internship">Internship</option>
                <option value="Research">Research</option>
                <option value="Leadership">Leadership</option>
                <option value="Award">Award</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-2 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-black rounded-lg font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Updating..." : "Update Verification"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 rounded-lg font-medium hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PendingRequestCard({
  activity,
  onAccept,
  onReject,
}: {
  activity: Activity & { student?: { name: string; email: string } };
  onAccept: () => void;
  onReject: () => void;
}) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
    });
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
          {activity.name}
        </h3>
        <p className="text-sm text-gray-600 mb-2">
          Requested by <span className="font-medium text-gray-900">{activity.student?.name || "Unknown"}</span>
        </p>
        <span className="inline-block px-2.5 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-md">
          {activity.category}
        </span>
      </div>

      {activity.organization && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
          <strong>Organization:</strong> {activity.organization}
        </p>
      )}

      <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-3 line-clamp-3">
        {activity.description}
      </p>

      <div className="text-xs text-zinc-500 dark:text-zinc-500 mb-4 space-y-1">
        <div>
          <span className="font-medium">Dates:</span> {formatDate(activity.startDate)}
          {activity.endDate ? ` - ${formatDate(activity.endDate)}` : " - Present"}
        </div>
        {activity.hoursPerWeek && (
          <div>
            <span className="font-medium">Hours/week:</span> {activity.hoursPerWeek}
          </div>
        )}
        {activity.totalHours && (
          <div>
            <span className="font-medium">Total hours:</span> {activity.totalHours}
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-4 border-t border-gray-200 mt-4">
        <button
          onClick={onAccept}
          className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors text-sm shadow-sm"
        >
          ✓ Verify
        </button>
        <button
          onClick={onReject}
          className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors text-sm shadow-sm"
        >
          ✗ Reject
        </button>
      </div>
    </div>
  );
}

function ActivityCard({
  activity,
  onEdit,
  onDelete,
  onRequestVerification,
}: {
  activity: Activity;
  onEdit: () => void;
  onDelete: () => void;
  onRequestVerification: () => void;
}) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
    });
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">
              {activity.name}
            </h3>
            {activity.verified && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Verified
              </span>
            )}
            {!activity.verified && activity.verificationStatus === "pending" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                Pending
              </span>
            )}
          </div>
          <span className="inline-block px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-md">
            {activity.category}
          </span>
        </div>
      </div>

      {activity.organization && (
        <p className="text-sm text-gray-600 mb-2 font-medium">
          {activity.organization}
        </p>
      )}

      <p className="text-sm text-gray-700 mb-4 line-clamp-2 leading-relaxed">
        {activity.description}
      </p>

      {(activity as any).verifierEmail && (
        <div className="flex items-center gap-1.5 mb-3 text-xs text-gray-500">
          <svg className="w-3.5 h-3.5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>Verified by <span className="font-medium text-gray-700">{(activity as any).verifierEmail}</span></span>
        </div>
      )}

      {/* Display Attachments */}
      {(activity as any).attachments && (() => {
        try {
          const attachments = JSON.parse((activity as any).attachments);
          const hasAttachments = (attachments.photos?.length > 0) || 
                                (attachments.certificates?.length > 0) || 
                                (attachments.portfolioLinks?.length > 0);
          
          if (!hasAttachments) return null;
          
          return (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                Attachments & Evidence
              </p>
              
              {/* Photos */}
              {attachments.photos?.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-gray-600 mb-2 font-medium">Photos</p>
                  <div className="flex flex-wrap gap-2">
                    {attachments.photos.map((url: string, idx: number) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block group"
                      >
                        <img
                          src={url}
                          alt={`Photo ${idx + 1}`}
                          className="w-16 h-16 object-cover rounded-lg border border-gray-300 hover:opacity-80 transition-opacity shadow-sm group-hover:shadow-md"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Certificates */}
              {attachments.certificates?.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-gray-600 mb-2 font-medium">Certificates & Documents</p>
                  <div className="space-y-1.5">
                    {attachments.certificates.map((url: string, idx: number) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-700 hover:underline"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {url.split("/").pop()}
                      </a>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Portfolio Links */}
              {attachments.portfolioLinks?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-600 mb-2 font-medium">Portfolio Links</p>
                  <div className="space-y-1.5">
                    {attachments.portfolioLinks.map((link: string, idx: number) => (
                      <a
                        key={idx}
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-700 hover:underline truncate"
                      >
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        <span className="truncate">{link}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        } catch (e) {
          return null;
        }
      })()}

      <div className="text-xs text-zinc-500 dark:text-zinc-500 mb-4 space-y-1">
        <div>
          <span className="font-medium">Dates:</span> {formatDate(activity.startDate)}
          {activity.endDate ? ` - ${formatDate(activity.endDate)}` : " - Present"}
        </div>
        {activity.hoursPerWeek && (
          <div>
            <span className="font-medium">Hours/week:</span> {activity.hoursPerWeek}
          </div>
        )}
        {activity.totalHours && (
          <div>
            <span className="font-medium">Total hours:</span> {activity.totalHours}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={onEdit}
          className="flex-1 px-3 py-2 text-sm font-medium bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 rounded hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
        >
          Edit
        </button>
        {!activity.verified && (
          <button
            onClick={onRequestVerification}
            className="flex-1 px-3 py-2 text-sm font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
          >
            Request Verify
          </button>
        )}
        <button
          onClick={onDelete}
          className="px-3 py-2 text-sm font-medium bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function ActivityForm({
  activity,
  onClose,
  onSuccess,
  onActivityCreated,
}: {
  activity: Activity | null;
  onClose: () => void;
  onSuccess: () => void;
  onActivityCreated?: (activity: Activity) => void;
}) {
  const [formData, setFormData] = useState<{
    name: string;
    category: ActivityCategory;
    description: string;
    startDate: string;
    endDate: string;
    hoursPerWeek: string;
    totalHours: string;
    position: string;
    organization: string;
    notes: string;
    verifierEmail: string;
    photos: string[];
    certificates: string[];
    portfolioLinks: string[];
  }>({
    name: activity?.name || "",
    category: (activity?.category || "Other") as ActivityCategory,
    description: activity?.description || "",
    startDate: activity?.startDate || new Date().toISOString().split("T")[0],
    endDate: activity?.endDate || "",
    hoursPerWeek: activity?.hoursPerWeek?.toString() || "",
    totalHours: activity?.totalHours?.toString() || "",
    position: activity?.position || "",
    organization: activity?.organization || "",
    notes: activity?.notes || "",
    verifierEmail: activity?.supervisorEmail || "",
    photos: activity?.attachments ? (JSON.parse(activity.attachments)?.photos || []) : [],
    certificates: activity?.attachments ? (JSON.parse(activity.attachments)?.certificates || []) : [],
    portfolioLinks: activity?.attachments ? (JSON.parse(activity.attachments)?.portfolioLinks || []) : [],
  });

  // Update form data when activity prop changes (e.g., after creating)
  useEffect(() => {
    if (activity) {
      const attachments = activity.attachments ? JSON.parse(activity.attachments) : {};
      setFormData({
        name: activity.name || "",
        category: (activity.category || "Other") as ActivityCategory,
        description: activity.description || "",
        startDate: activity.startDate || new Date().toISOString().split("T")[0],
        endDate: activity.endDate || "",
        hoursPerWeek: activity.hoursPerWeek?.toString() || "",
        totalHours: activity.totalHours?.toString() || "",
        position: activity.position || "",
        organization: activity.organization || "",
        notes: activity.notes || "",
        verifierEmail: activity.supervisorEmail || "",
        photos: attachments.photos || [],
        certificates: attachments.certificates || [],
        portfolioLinks: attachments.portfolioLinks || [],
      });
    }
  }, [activity]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const url = activity ? `/api/activities/${activity.id}` : "/api/activities";
      const method = activity ? "PATCH" : "POST";

      // Prepare attachments JSON
      const attachments = {
        photos: formData.photos || [],
        certificates: formData.certificates || [],
        portfolioLinks: formData.portfolioLinks || [],
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          category: formData.category,
          description: formData.description,
          startDate: formData.startDate,
          endDate: formData.endDate || undefined,
          hoursPerWeek: formData.hoursPerWeek ? parseFloat(formData.hoursPerWeek) : undefined,
          totalHours: formData.totalHours ? parseFloat(formData.totalHours) : undefined,
          position: formData.position || undefined,
          organization: formData.organization || undefined,
          notes: formData.notes || undefined,
          verifierEmail: formData.verifierEmail || undefined,
          attachments: JSON.stringify(attachments),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to save activity");
        setIsSubmitting(false);
        return;
      }

      // Update the activity state if this was a new activity
      if (!activity && data.activity) {
        setEditingActivity(data.activity);
      }

      onSuccess();
    } catch (err) {
      setError("An error occurred. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
          {activity ? "Edit Activity" : "Add New Activity"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Activity Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Category *
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as ActivityCategory })}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Organization
              </label>
              <input
                type="text"
                value={formData.organization}
                onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Position/Role
            </label>
            <input
              type="text"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Description *
            </label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                End Date (leave empty if ongoing)
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Hours per Week
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.hoursPerWeek}
                onChange={(e) => setFormData({ ...formData, hoursPerWeek: e.target.value })}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Total Hours
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.totalHours}
                onChange={(e) => setFormData({ ...formData, totalHours: e.target.value })}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Verifier Email
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={formData.verifierEmail}
                onChange={(e) => setFormData({ ...formData, verifierEmail: e.target.value })}
                placeholder="e.g., main@weeklytheta.com"
                className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500"
              />
              {formData.verifierEmail && (
                <button
                  type="button"
                  onClick={async () => {
                    // Validate required fields
                    if (!formData.name || !formData.category || !formData.description || !formData.startDate) {
                      alert("Please fill in all required fields (Name, Category, Description, Start Date) before sending the email.");
                      return;
                    }

                    let activityId = activity?.id;

                    // If activity doesn't exist yet, create it first
                    if (!activityId) {
                      try {
                        const createResponse = await fetch("/api/activities", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            name: formData.name,
                            category: formData.category,
                            description: formData.description,
                            startDate: formData.startDate,
                            endDate: formData.endDate || undefined,
                            hoursPerWeek: formData.hoursPerWeek ? parseFloat(formData.hoursPerWeek) : undefined,
                            totalHours: formData.totalHours ? parseFloat(formData.totalHours) : undefined,
                            position: formData.position || undefined,
                            organization: formData.organization || undefined,
                            notes: formData.notes || undefined,
                            verifierEmail: formData.verifierEmail || undefined,
                          }),
                        });

                        const createData = await createResponse.json();
                        if (!createResponse.ok) {
                          alert(createData.error || "Failed to create activity");
                          return;
                        }
                        activityId = createData.activity.id;
                        // Notify parent that activity was created so form can update
                        if (onActivityCreated) {
                          onActivityCreated(createData.activity);
                        }
                      } catch (err) {
                        alert("An error occurred while creating the activity");
                        return;
                      }
                    }

                    // Now send the email
                    try {
                      const response = await fetch("/api/send-verification-email-for-activity", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          activityId: activityId,
                          verifierEmail: formData.verifierEmail,
                        }),
                      });
                      const data = await response.json();
                      if (response.ok) {
                        alert("Verification email sent successfully!");
                        // Don't close the form - user can continue editing or close manually
                      } else {
                        alert(data.error || "Failed to send email");
                      }
                    } catch (err) {
                      alert("An error occurred while sending the email");
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors whitespace-nowrap"
                  title="Send verification email"
                >
                  Send Email
                </button>
              )}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Enter the email of the person who can verify this activity. Click "Send Email" to send them a verification request.
            </p>
          </div>

          {/* Attachments Section */}
          <div className="border-t border-zinc-200 dark:border-zinc-700 pt-4 mt-4">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
              Attachments & Evidence
            </h3>

            {/* Photos Upload */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Photos
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={async (e) => {
                  const files = Array.from(e.target.files || []);
                  const uploadedUrls: string[] = [];
                  
                  for (const file of files) {
                    const formData = new FormData();
                    formData.append("file", file);
                    
                    try {
                      const response = await fetch("/api/upload", {
                        method: "POST",
                        body: formData,
                      });
                      const data = await response.json();
                      if (data.success) {
                        uploadedUrls.push(data.url);
                      }
                    } catch (err) {
                      console.error("Error uploading file:", err);
                    }
                  }
                  
                  setFormData({
                    ...formData,
                    photos: [...formData.photos, ...uploadedUrls],
                  });
                }}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500"
              />
              {formData.photos.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {formData.photos.map((url, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={url}
                        alt={`Photo ${idx + 1}`}
                        className="w-20 h-20 object-cover rounded border border-zinc-300 dark:border-zinc-700"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            photos: formData.photos.filter((_, i) => i !== idx),
                          });
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Certificates Upload */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Certificates/Documents (PDF, Images)
              </label>
              <input
                type="file"
                accept=".pdf,image/*"
                multiple
                onChange={async (e) => {
                  const files = Array.from(e.target.files || []);
                  const uploadedUrls: string[] = [];
                  
                  for (const file of files) {
                    const formData = new FormData();
                    formData.append("file", file);
                    
                    try {
                      const response = await fetch("/api/upload", {
                        method: "POST",
                        body: formData,
                      });
                      const data = await response.json();
                      if (data.success) {
                        uploadedUrls.push(data.url);
                      }
                    } catch (err) {
                      console.error("Error uploading file:", err);
                    }
                  }
                  
                  setFormData({
                    ...formData,
                    certificates: [...formData.certificates, ...uploadedUrls],
                  });
                }}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500"
              />
              {formData.certificates.length > 0 && (
                <div className="mt-2 space-y-1">
                  {formData.certificates.map((url, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-zinc-100 dark:bg-zinc-700 rounded">
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex-1"
                      >
                        {url.split("/").pop()}
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            certificates: formData.certificates.filter((_, i) => i !== idx),
                          });
                        }}
                        className="text-red-600 dark:text-red-400 ml-2"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Portfolio Links */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                External Portfolio Links
              </label>
              <div className="space-y-2">
                {formData.portfolioLinks.map((link, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="url"
                      value={link}
                      onChange={(e) => {
                        const newLinks = [...formData.portfolioLinks];
                        newLinks[idx] = e.target.value;
                        setFormData({ ...formData, portfolioLinks: newLinks });
                      }}
                      placeholder="https://example.com/portfolio"
                      className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          portfolioLinks: formData.portfolioLinks.filter((_, i) => i !== idx),
                        });
                      }}
                      className="px-3 py-2 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-lg hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setFormData({
                      ...formData,
                      portfolioLinks: [...formData.portfolioLinks, ""],
                    });
                  }}
                  className="px-4 py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors text-sm"
                >
                  + Add Portfolio Link
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-2 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-black rounded-lg font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Saving..." : activity ? "Update Activity" : "Add Activity"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 rounded-lg font-medium hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

