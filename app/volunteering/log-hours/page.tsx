"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useColors } from "../../context/ColorContext";

export default function LogHoursPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const colors = useColors();
  const [formData, setFormData] = useState({
    organizationName: "",
    activityName: "",
    activityDescription: "",
    startDate: "",
    endDate: "",
    isOneDay: false,
    totalHours: "",
    serviceSheetUrl: "",
  });
  const [uploadedFile, setUploadedFile] = useState<{ url: string; name: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/auth/signin");
    return null;
  }

  if (!session || session.user.role !== "student") {
    router.push("/volunteering");
    return null;
  }

  const handleOneDayToggle = () => {
    const newIsOneDay = !formData.isOneDay;
    setFormData({
      ...formData,
      isOneDay: newIsOneDay,
      endDate: newIsOneDay ? formData.startDate : formData.endDate,
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError("Invalid file type. Please upload a PDF or image file.");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("File size exceeds 5MB limit.");
      return;
    }

    setIsUploading(true);
    setError("");

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
        setFormData((prev) => ({ ...prev, serviceSheetUrl: data.url }));
      } else {
        setError(data.error || "Failed to upload file");
      }
    } catch (err) {
      setError("Failed to upload file. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Check user role before submitting
    if (!session || session.user.role !== "student") {
      setError(`You must be a student to log hours. Current role: ${session?.user?.role || "unknown"}`);
      return;
    }

    // Validate required fields
    if (
      !formData.organizationName ||
      !formData.activityName ||
      !formData.activityDescription ||
      !formData.startDate ||
      !formData.totalHours
    ) {
      setError("Please fill in all required fields");
      return;
    }

    if (parseFloat(formData.totalHours) <= 0) {
      setError("Total hours must be greater than 0");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/volunteering-participations/log-hours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationName: formData.organizationName,
          activityName: formData.activityName,
          activityDescription: formData.activityDescription,
          startDate: formData.startDate,
          endDate: formData.isOneDay ? formData.startDate : formData.endDate || formData.startDate,
          totalHours: parseFloat(formData.totalHours),
          serviceSheetUrl: formData.serviceSheetUrl || null,
        }),
      });

      const data = await response.json();
      console.log("API Response:", { status: response.status, ok: response.ok, data });

      if (response.ok) {
        router.push("/volunteering?logged=true");
      } else {
        let errorMessage = data.error || "Failed to log hours";
        console.error("Full error response:", data);
        
        if (data.debug) {
          errorMessage += ` (Debug: role="${data.debug.role}", type=${data.debug.roleType})`;
        }
        if (data.details) {
          console.error("API Error Details:", data.details);
          if (data.details.message) {
            errorMessage += ` - ${data.details.message}`;
          }
          if (data.details.code) {
            errorMessage += ` [Code: ${data.details.code}]`;
          }
        }
        // Also log the raw error if available
        if (data.message) {
          errorMessage += ` - ${data.message}`;
        }
        setError(errorMessage);
        setIsSubmitting(false);
      }
    } catch (err: any) {
      console.error("Error submitting form:", err);
      setError(`An error occurred: ${err?.message || "Please try again."}`);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
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
              <span className="text-sm text-gray-500">Log Hours</span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/volunteering"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
              >
                Back to Volunteering
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

      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Log Past Hours</h1>
          <p className="text-gray-600">
            Record your past community service hours to track your volunteering progress
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}

          {/* Organization Name */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Organization / Nonprofit Name *
            </label>
            <input
              type="text"
              required
              value={formData.organizationName}
              onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
              placeholder="e.g., Local Food Bank"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Activity Name */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Activity Name (What you did) *
            </label>
            <input
              type="text"
              required
              value={formData.activityName}
              onChange={(e) => setFormData({ ...formData, activityName: e.target.value })}
              placeholder="e.g., Food Distribution Volunteer"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Activity Description */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Activity Description *
            </label>
            <textarea
              required
              value={formData.activityDescription}
              onChange={(e) => setFormData({ ...formData, activityDescription: e.target.value })}
              placeholder="Describe what you did during this volunteering..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Date Range */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Range *
            </label>
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  id="oneDay"
                  checked={formData.isOneDay}
                  onChange={handleOneDayToggle}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <label htmlFor="oneDay" className="text-sm text-gray-700 cursor-pointer">
                  This was a one-day event
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => {
                      const newStartDate = e.target.value;
                      setFormData({
                        ...formData,
                        startDate: newStartDate,
                        endDate: formData.isOneDay ? newStartDate : formData.endDate,
                      });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {!formData.isOneDay && (
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">End Date</label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      min={formData.startDate}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Total Hours */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Total Hours *
            </label>
            <input
              type="number"
              required
              step="0.1"
              min="0.1"
              value={formData.totalHours}
              onChange={(e) => setFormData({ ...formData, totalHours: e.target.value })}
              placeholder="e.g., 5.5"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Service Sheet Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Service Sheet (Optional)
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Upload your community service form (PDF or image) for admin verification
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
                      setFormData({ ...formData, serviceSheetUrl: "" });
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
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: colors.primary }}
              onMouseEnter={(e) => {
                if (!isSubmitting) e.currentTarget.style.opacity = "0.9";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "1";
              }}
            >
              {isSubmitting ? "Logging Hours..." : "Log Hours"}
            </button>
            <Link
              href="/volunteering"
              className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

