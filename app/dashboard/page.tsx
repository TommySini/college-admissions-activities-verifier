"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { exportToPDF } from "../components/ExportFunctions";

interface Verification {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  position?: string;
  category?: string;
  status: string;
  applicantEmail: string;
  organization?: { name: string };
  applicant?: { name: string; email: string };
}

interface Activity {
  id: string;
  name: string;
  category: string;
  description: string;
  startDate: string;
  endDate?: string;
  hoursPerWeek?: number;
  totalHours?: number;
  position?: string;
  organization?: string;
  verified: boolean;
  notes?: string;
}

const CATEGORIES = [
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
      fetchVerifications();
      if (session.user.profileType === "Applicant") {
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

  const isOrganization = session.user.profileType === "Organization";
  const pendingVerifications = verifications.filter((v) => v.status === "pending");
  const acceptedVerifications = verifications.filter((v) => v.status === "accepted");

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
                {isOrganization ? "Organization Dashboard" : "Applicant Dashboard"}
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

        {isOrganization ? (
          /* Organization View */
          <div>
            <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 shadow-sm mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
                    Issue Verification Token
                  </h2>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    Send verification tokens to applicants who worked with your organization
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
          /* Applicant View */
          <div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 shadow-sm">
                <div className="text-sm text-zinc-600 dark:text-zinc-400">Verified</div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {acceptedVerifications.length}
                </div>
              </div>
              <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 shadow-sm">
                <div className="text-sm text-zinc-600 dark:text-zinc-400">Pending</div>
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {pendingVerifications.length}
                </div>
              </div>
              <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 shadow-sm">
                <div className="text-sm text-zinc-600 dark:text-zinc-400">My Activities</div>
                <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  {activities.length}
                </div>
              </div>
              <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 shadow-sm">
                <div className="text-sm text-zinc-600 dark:text-zinc-400">Total</div>
                <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  {verifications.length + activities.length}
                </div>
              </div>
            </div>

            {/* Export Button */}
            {(acceptedVerifications.length > 0 || activities.length > 0) && (
              <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 shadow-sm mb-6">
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

            {acceptedVerifications.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
                  Verified Activities
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {acceptedVerifications.map((verification) => (
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

            {/* Manage Activities Section */}
            <div className="mb-6">
              <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 shadow-sm mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
                      Manage Activities
                    </h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      Add and manage your activities. Request verification from organizations.
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

              {activities.filter(
                (a) =>
                  a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  a.description.toLowerCase().includes(searchQuery.toLowerCase())
              ).length === 0 ? (
                <div className="bg-white dark:bg-zinc-800 rounded-lg p-12 text-center shadow-sm">
                  <p className="text-zinc-600 dark:text-zinc-400">
                    {activities.length === 0
                      ? "No activities yet. Click 'Add Activity' to get started!"
                      : "No activities match your search."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activities
                    .filter(
                      (a) =>
                        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        a.description.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((activity) => (
                      <ActivityCard
                        key={activity.id}
                        activity={activity}
                        onEdit={() => {
                          setEditingActivity(activity);
                          setShowActivityForm(true);
                        }}
                        onDelete={async () => {
                          if (confirm("Are you sure you want to delete this activity?")) {
                            try {
                              await fetch(`/api/activities/${activity.id}`, {
                                method: "DELETE",
                              });
                              fetchActivities();
                            } catch (error) {
                              console.error("Error deleting activity:", error);
                            }
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
                    ))}
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

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
            {verification.title}
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
            {isOrganization ? (
              <>Sent to <span className="font-medium">{verification.applicantEmail}</span></>
            ) : (
              <>Verified by <span className="font-medium">{verification.organization?.name}</span></>
            )}
          </p>
          {verification.category && (
            <span className="inline-block px-2 py-1 text-xs font-medium bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded">
              {verification.category}
            </span>
          )}
        </div>
        <span
          className={`ml-2 px-3 py-1 text-xs font-medium rounded ${
            verification.status === "accepted"
              ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
              : verification.status === "rejected"
              ? "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
              : "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200"
          }`}
        >
          {verification.status === "accepted"
            ? "✓ Accepted"
            : verification.status === "rejected"
            ? "✗ Rejected"
            : "Pending"}
        </span>
      </div>

      {verification.position && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
          <span className="font-medium">Position:</span> {verification.position}
        </p>
      )}

      {verification.description && (
        <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-3">
          {verification.description}
        </p>
      )}

      <div className="text-xs text-zinc-500 dark:text-zinc-500 mb-4">
        <div>
          <span className="font-medium">Dates:</span> {formatDate(verification.startDate)}
          {verification.endDate ? ` - ${formatDate(verification.endDate)}` : " - Present"}
        </div>
      </div>

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
    applicantEmail: "",
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
              Applicant Email *
            </label>
            <input
              type="email"
              required
              value={formData.applicantEmail}
              onChange={(e) => setFormData({ ...formData, applicantEmail: e.target.value })}
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
  const [formData, setFormData] = useState({
    name: activity?.name || "",
    category: activity?.category || "Other",
    description: activity?.description || "",
    startDate: activity?.startDate || new Date().toISOString().split("T")[0],
    endDate: activity?.endDate || "",
    hoursPerWeek: activity?.hoursPerWeek?.toString() || "",
    totalHours: activity?.totalHours?.toString() || "",
    position: activity?.position || "",
    organization: activity?.organization || "",
    notes: activity?.notes || "",
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
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to save activity");
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
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
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

