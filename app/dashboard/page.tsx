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
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      // Check if user selected a role during signup
      const urlParams = new URLSearchParams(window.location.search);
      const signupRole = urlParams.get("role");
      if (signupRole && (signupRole === "student" || signupRole === "verifier")) {
        // Update role if different
        if (session.user.role !== signupRole) {
          fetch("/api/user/update-role", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: signupRole }),
          }).then(() => {
            // Reload to get updated session
            window.location.href = "/dashboard";
          });
          return;
        }
      }
      
      fetchVerifications();
      if (session.user.role === "student") {
        fetchActivities();
      }
    }
  }, [session]);

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

  const isVerifier = session.user.role === "verifier" || session.user.role === "admin";
  const isStudent = session.user.role === "student";
  const pendingVerifications = verifications.filter((v) => v.status === "pending");
  const acceptedVerifications = verifications.filter((v) => v.status === "accepted" || v.status === "verified");

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
      })) : []),
    // Add regular activities
    ...activities.map((a) => ({
      id: a.id,
      name: a.name,
      category: a.category,
      description: a.description,
      startDate: a.startDate,
      endDate: a.endDate,
      position: a.role,
      organization: a.organization,
      verified: verifications.some((v) => (v.activityId === a.id || v.activity?.id === a.id) && (v.status === "accepted" || v.status === "verified")),
      hoursPerWeek: a.hoursPerWeek,
      totalHours: a.totalHours,
      notes: a.studentNotes,
    })),
  ].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-black dark:to-zinc-900">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
                {session.user.name}
              </h1>
              <p className="text-zinc-600 dark:text-zinc-400">
                {isVerifier ? "Verifier Dashboard" : "Student Dashboard"}
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/profile"
                className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
              >
                My Profile
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/auth/signin" })}
                className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>

        {isVerifier ? (
          /* Verifier View */
          <div>
            <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 shadow-sm mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
                    Issue Verification Token
                  </h2>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    Send verification tokens to students who worked with you
                  </p>
                </div>
                <button
                  onClick={() => setShowIssueForm(true)}
                  className="px-6 py-2 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-black rounded-lg font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
                >
                  + Issue Token
                </button>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
                Issued Verifications ({verifications.length})
              </h3>
              {verifications.length === 0 ? (
                <div className="bg-white dark:bg-zinc-800 rounded-lg p-12 text-center shadow-sm">
                  <p className="text-zinc-600 dark:text-zinc-400">
                    No verifications issued yet. Click "Issue Token" to get started.
                  </p>
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
          <div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 shadow-sm">
                <div className="text-sm text-zinc-600 dark:text-zinc-400">Verified</div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {unifiedActivities.filter((a) => a.verified).length}
                </div>
              </div>
              <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 shadow-sm">
                <div className="text-sm text-zinc-600 dark:text-zinc-400">Pending</div>
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {pendingVerifications.length}
                </div>
              </div>
              <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 shadow-sm">
                <div className="text-sm text-zinc-600 dark:text-zinc-400">Unverified</div>
                <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  {unifiedActivities.filter((a) => !a.verified).length}
                </div>
              </div>
              <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 shadow-sm">
                <div className="text-sm text-zinc-600 dark:text-zinc-400">Total</div>
                <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  {unifiedActivities.length}
                </div>
              </div>
            </div>

            {/* Pending Verifications Section */}
            {pendingVerifications.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
                  Pending Verifications
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pendingVerifications.map((verification) => (
                    <VerificationCard
                      key={verification.id}
                      verification={verification}
                      isOrganization={false}
                      onAcceptReject={handleAcceptReject}
                      onDelete={handleDeleteVerification}
                      onEdit={handleEditVerification}
                      updatingId={updatingId}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Unified Activities Section */}
            <div className="mb-6">
              <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 shadow-sm mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
                      All Activities
                    </h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      Your verified and unverified activities in one place
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Search activities..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                    />
                    <button
                      onClick={() => {
                        setEditingActivity(null);
                        setShowActivityForm(true);
                      }}
                      className="px-6 py-2 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-black rounded-lg font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
                    >
                      + Add Activity
                    </button>
                  </div>
                </div>
              </div>

              {/* Export Button */}
              {unifiedActivities.length > 0 && (
                <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 shadow-sm mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
                        Export Activities
                      </h3>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Download your activities as PDF
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
                      className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors text-sm"
                    >
                      Export PDF
                    </button>
                  </div>
                </div>
              )}

              {unifiedActivities.filter(
                (a) =>
                  a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  a.description.toLowerCase().includes(searchQuery.toLowerCase())
              ).length === 0 ? (
                <div className="bg-white dark:bg-zinc-800 rounded-lg p-12 text-center shadow-sm">
                  <p className="text-zinc-600 dark:text-zinc-400">
                    {unifiedActivities.length === 0
                      ? "No activities yet. Click 'Add Activity' to get started!"
                      : "No activities match your search."}
                  </p>
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
                        return (
                          <ActivityCard
                            key={activity.id}
                            activity={activityData}
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
    <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
            {activityName}
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
            {isOrganization ? (
              <>Sent to <span className="font-medium">{verification.student?.email || "Student"}</span></>
            ) : (
              <>Verified by <span className="font-medium">{verification.verifier?.name || "Verifier"}</span></>
            )}
          </p>
          {category && (
            <span className="inline-block px-2 py-1 text-xs font-medium bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded">
              {category}
            </span>
          )}
        </div>
        <span
          className={`ml-2 px-3 py-1 text-xs font-medium rounded ${
            verification.status === "accepted" || verification.status === "verified"
              ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
              : verification.status === "rejected"
              ? "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
              : "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200"
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
        <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-3">
          {verification.verifierNotes}
        </p>
      )}

      <div className="flex gap-2">
        {!isOrganization && verification.status === "pending" && (
          <>
            <button
              onClick={() => onAcceptReject(verification.id, "accepted")}
              disabled={updatingId === verification.id}
              className="flex-1 px-3 py-2 text-sm font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded hover:bg-green-200 dark:hover:bg-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updatingId === verification.id ? "Processing..." : "Accept"}
            </button>
            <button
              onClick={() => onAcceptReject(verification.id, "rejected")}
              disabled={updatingId === verification.id}
              className="flex-1 px-3 py-2 text-sm font-medium bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded hover:bg-red-200 dark:hover:bg-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updatingId === verification.id ? "Processing..." : "Reject"}
            </button>
          </>
        )}
        {isOrganization && (
          <button
            onClick={() => onEdit(verification)}
            className="px-3 py-2 text-sm font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
          >
            Edit
          </button>
        )}
        <button
          onClick={() => onDelete(verification.id)}
          className="px-3 py-2 text-sm font-medium bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
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
    <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
            {activity.name}
          </h3>
          <span className="inline-block px-2 py-1 text-xs font-medium bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded">
            {activity.category}
          </span>
        </div>
        <span className="ml-2 px-3 py-1 text-xs font-medium rounded bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200">
          {activity.verified ? "Verified" : "Unverified"}
        </span>
      </div>

      {activity.organization && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
          {activity.organization}
        </p>
      )}

      <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-3 line-clamp-2">
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
}: {
  activity: Activity | null;
  onClose: () => void;
  onSuccess: () => void;
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
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const url = activity ? `/api/activities/${activity.id}` : "/api/activities";
      const method = activity ? "PATCH" : "POST";

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
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to save activity");
        setIsSubmitting(false);
        return;
      }

      // If verifier email is provided and this is a new activity, offer to send email
      if (formData.verifierEmail && !activity) {
        const sendEmail = window.confirm(
          "Activity created! Would you like to send a verification email to " + formData.verifierEmail + "?"
        );
        if (sendEmail) {
          try {
            const emailResponse = await fetch("/api/send-verification-email-for-activity", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                activityId: data.activity.id,
                verifierEmail: formData.verifierEmail,
              }),
            });
            const emailData = await emailResponse.json();
            if (emailResponse.ok) {
              alert("Verification email sent successfully!");
            } else {
              alert(emailData.error || "Failed to send email");
            }
          } catch (err) {
            console.error("Error sending email:", err);
          }
        }
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
                    if (!activity) {
                      alert("Please save the activity first before sending the email.");
                      return;
                    }
                    try {
                      const response = await fetch("/api/send-verification-email-for-activity", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          activityId: activity.id,
                          verifierEmail: formData.verifierEmail,
                        }),
                      });
                      const data = await response.json();
                      if (response.ok) {
                        alert("Verification email sent successfully!");
                      } else {
                        alert(data.error || "Failed to send email");
                      }
                    } catch (err) {
                      alert("An error occurred while sending the email");
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!activity}
                  title={!activity ? "Save the activity first" : "Send verification email"}
                >
                  Send Email
                </button>
              )}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Enter the email of the person who can verify this activity. Click "Send Email" to send them a verification request.
            </p>
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

