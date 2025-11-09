"use client";

import { useState } from "react";
import { ActivityCategory, Verification } from "../types";
import { useProfile } from "../context/ProfileContext";
import { useVerifications } from "../context/VerificationContext";

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

export function SendVerificationForm({
  onClose,
}: {
  onClose: () => void;
}) {
  const { currentProfile, allProfiles } = useProfile();
  const { sendVerification } = useVerifications();
  const [formData, setFormData] = useState({
    applicantEmail: "",
    title: "",
    description: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    position: "",
    category: "Other" as ActivityCategory,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    if (!currentProfile || currentProfile.profileType !== "Organization") {
      setError("You must be logged in as an organization to send verifications.");
      setIsSubmitting(false);
      return;
    }

    // Find applicant profile by email
    const applicantProfile = allProfiles.find(
      (p) => p.profileType === "Applicant" && p.email.toLowerCase() === formData.applicantEmail.toLowerCase()
    );

    const applicantId = applicantProfile?.id || "";

    // Send verification
    sendVerification({
      organizationId: currentProfile.id,
      organizationName: currentProfile.name,
      applicantId: applicantId,
      applicantEmail: formData.applicantEmail,
      title: formData.title,
      description: formData.description || undefined,
      startDate: formData.startDate,
      endDate: formData.endDate || undefined,
      position: formData.position || undefined,
      category: formData.category,
    });

    // Send email notification (if API is set up)
    try {
      await fetch("/api/send-verification-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: formData.applicantEmail,
          organizationName: currentProfile.name,
          title: formData.title,
          applicantExists: !!applicantProfile,
        }),
      });
    } catch (err) {
      console.log("Email notification failed (API may not be configured):", err);
    }

    setIsSubmitting(false);
    setSuccess(true);
    
    // Close modal after a brief delay to show success message
    setTimeout(() => {
      onClose();
      setSuccess(false);
      setFormData({
        applicantEmail: "",
        title: "",
        description: "",
        startDate: new Date().toISOString().split("T")[0],
        endDate: "",
        position: "",
        category: "Other",
      });
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
          Send Verification
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
          Send a verification to an applicant's email address. They will be able to accept or reject it.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-lg text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-lg text-sm">
              ✓ Verification sent successfully!
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
              placeholder="applicant@example.com"
              className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500"
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              The applicant will receive a verification request at this email address
            </p>
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
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value as ActivityCategory })
                }
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
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

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-2 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-black rounded-lg font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Sending..." : "Send Verification"}
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

export function VerificationCard({
  verification,
  onAccept,
  onReject,
  isApplicant,
}: {
  verification: Verification;
  onAccept: () => void;
  onReject: () => void;
  isApplicant: boolean;
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
            {isApplicant ? (
              <>Verified by <span className="font-medium">{verification.organizationName}</span></>
            ) : (
              <>Sent to <span className="font-medium">{verification.applicantEmail}</span></>
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

      {isApplicant && verification.status === "pending" && (
        <div className="flex gap-2">
          <button
            onClick={onAccept}
            className="flex-1 px-3 py-2 text-sm font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
          >
            Accept
          </button>
          <button
            onClick={onReject}
            className="flex-1 px-3 py-2 text-sm font-medium bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}

