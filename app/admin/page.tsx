"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Student {
  id: string;
  name: string;
  email: string;
  grade: string;
  totalActivities: number;
  verifiedActivities: number;
  verifiedPercentage: number;
  activities: Activity[];
}

interface Activity {
  id: string;
  name: string;
  category: string;
  description: string;
  startDate: string;
  endDate?: string;
  status: string;
  verificationStatus: string;
  verifier: {
    name: string;
    email: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface Organization {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  leadership?: string | null;
  presidentName?: string | null;
  isSchoolClub: boolean;
  contactEmail?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

interface Analytics {
  mostCommonCategories: { category: string; count: number }[];
  verificationByStatus: { status: string; count: number }[];
  totalActivities: number;
  totalStudents: number;
  totalOrganizations: number;
}

type Tab = "dashboard" | "analytics" | "organizations" | "export";

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [students, setStudents] = useState<Student[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationsLoading, setOrganizationsLoading] = useState(true);
  const [organizationActionId, setOrganizationActionId] = useState<string | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".profile-dropdown-container")) {
        setShowProfileDropdown(false);
      }
    };

    if (showProfileDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showProfileDropdown]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated" && session?.user.role !== "admin") {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  useEffect(() => {
    if (session) {
      // Check if user selected a role during signup
      const urlParams = new URLSearchParams(window.location.search);
      const signupRole = urlParams.get("role");
      
      // Also check cookie as fallback
      const cookieRole = document.cookie
        .split("; ")
        .find((row) => row.startsWith("signupRole="))
        ?.split("=")[1];
      
      const selectedRole = signupRole || cookieRole;
      
      if (selectedRole && selectedRole === "admin") {
        // Update role if different - this ensures the role is set correctly
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
              window.location.href = "/admin";
            }
          })
          .catch((error) => {
            console.error("Error updating role:", error);
          });
          return;
        } else {
          // Role is already correct, clear the cookie
          document.cookie = "signupRole=; path=/; max-age=0";
        }
      }
      
      if (session.user.role === "admin") {
        fetchStudents();
        fetchAnalytics();
        fetchOrganizations();
      }
    }
  }, [session]);

  useEffect(() => {
    if (
      activeTab === "organizations" &&
      session?.user.role === "admin" &&
      !organizationsLoading &&
      organizations.length === 0
    ) {
      fetchOrganizations();
    }
  }, [activeTab, session?.user.role, organizations.length, organizationsLoading]);

  const fetchStudents = async () => {
    try {
      const response = await fetch("/api/admin/students");
      const data = await response.json();
      console.log("Fetched students data:", data);
      if (data.error) {
        console.error("API error:", data.error);
        alert(`Error: ${data.error}`);
      }
      setStudents(data.students || []);
    } catch (error) {
      console.error("Error fetching students:", error);
      alert("Failed to fetch students. Check the console for details.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch("/api/admin/analytics");
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    }
  };

  const fetchOrganizations = async () => {
    try {
      setOrganizationsLoading(true);
      const response = await fetch("/api/admin/organizations");
      const data = await response.json();

      if (!response.ok) {
        console.error("Error fetching organizations:", data.error);
        alert(data.error || "Failed to fetch organizations.");
        return;
      }

      setOrganizations(data.organizations || []);
    } catch (error) {
      console.error("Error fetching organizations:", error);
      alert("Failed to fetch organizations. Check the console for details.");
    } finally {
      setOrganizationsLoading(false);
    }
  };

  const handleOrganizationDecision = async (organizationId: string, action: "approve" | "reject") => {
    try {
      setOrganizationActionId(organizationId);
      const response = await fetch(`/api/admin/organizations/${organizationId}/${action}`, {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        console.error(`Failed to ${action} organization:`, data.error);
        alert(data.error || `Failed to ${action} organization.`);
        return;
      }

      setOrganizations((prev) =>
        prev.map((organization) =>
          organization.id === organizationId
            ? { ...organization, status: action === "approve" ? "APPROVED" : "REJECTED" }
            : organization
        )
      );
      fetchAnalytics();
    } catch (error) {
      console.error(`Error trying to ${action} organization:`, error);
      alert(`Failed to ${action} organization. Please try again.`);
    } finally {
      setOrganizationActionId(null);
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch("/api/admin/export");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `actify-student-data-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error exporting data:", error);
      alert("Failed to export data. Please try again.");
    }
  };

  const filteredStudents = students.filter(
    (student) =>
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!session || session.user.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Fixed Navigation Bar */}
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
              <span className="text-sm text-gray-500">Admin Portal</span>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === "dashboard"
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab("analytics")}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === "analytics"
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                Analytics
              </button>
              <button
                onClick={() => setActiveTab("organizations")}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === "organizations"
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                Organizations
              </button>
              <button
                onClick={() => setActiveTab("export")}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === "export"
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                Export
              </button>
            </div>

            {/* Admin Profile Dropdown */}
            <div className="relative profile-dropdown-container">
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {session.user.name}
                  </p>
                  <p className="text-xs text-gray-500">Admin</p>
                </div>
                {session.user.image ? (
                  <img
                    src={session.user.image}
                    alt={session.user.name || "Admin"}
                    className="w-10 h-10 rounded-full border-2 border-gray-200"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-sm">
                      {session.user.name?.[0]?.toUpperCase() || "A"}
                    </span>
                  </div>
                )}
                <svg
                  className="w-4 h-4 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {showProfileDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <Link
                    href="/profile"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setShowProfileDropdown(false)}
                  >
                    Settings
                  </Link>
                  <button
                    onClick={() => {
                      setShowProfileDropdown(false);
                      signOut({ callbackUrl: "/auth/signin" });
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === "dashboard" && (
          <div>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Student Management
              </h1>
              <p className="text-gray-600">
                View and manage student activity verifications
              </p>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search students by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <svg
                  className="absolute left-3 top-2.5 w-5 h-5 text-gray-400"
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
              </div>
            </div>

            {/* Students Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Student Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Grade
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        # of Activities
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        # Verified
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        % Verified
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-6 py-12 text-center"
                        >
                          <div className="flex flex-col items-center gap-2">
                            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                            <p className="text-gray-500 font-medium">
                              {searchQuery
                                ? "No students found matching your search."
                                : "No students found."}
                            </p>
                            {!searchQuery && (
                              <p className="text-sm text-gray-400 mt-2">
                                Make sure users have signed in with the "Sign Up as Student" option
                                and have the "student" role assigned in the database.
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((student) => (
                        <tr
                          key={student.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {student.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {student.email}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {student.grade}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {student.totalActivities}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {student.verifiedActivities}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                                <div
                                  className={`h-2 rounded-full ${
                                    student.verifiedPercentage >= 80
                                      ? "bg-green-500"
                                      : student.verifiedPercentage >= 50
                                      ? "bg-blue-500"
                                      : "bg-red-500"
                                  }`}
                                  style={{
                                    width: `${student.verifiedPercentage}%`,
                                  }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium text-gray-700">
                                {student.verifiedPercentage}%
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => {
                                setSelectedStudent(student);
                                setShowProfileModal(true);
                              }}
                              className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              View Profile
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "analytics" && analytics && (
          <div>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Analytics
              </h1>
              <p className="text-gray-600">
                Insights into student activities and verifications
              </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="text-sm text-gray-600 mb-1">Total Students</div>
                <div className="text-3xl font-bold text-gray-900">
                  {analytics.totalStudents}
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="text-sm text-gray-600 mb-1">
                  Total Activities
                </div>
                <div className="text-3xl font-bold text-gray-900">
                  {analytics.totalActivities}
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="text-sm text-gray-600 mb-1">
                  Approved Organizations
                </div>
                <div className="text-3xl font-bold text-gray-900">
                  {analytics.totalOrganizations}
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bar Chart - Most Common Categories */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Most Common Activity Categories
                </h2>
                <div className="space-y-4">
                  {analytics.mostCommonCategories.map((item, index) => {
                    const maxCount = Math.max(
                      ...analytics.mostCommonCategories.map((c) => c.count)
                    );
                    const percentage = (item.count / maxCount) * 100;
                    return (
                      <div key={index}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">
                            {item.category}
                          </span>
                          <span className="text-sm text-gray-600">
                            {item.count}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pie Chart - Verification Status */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Verification Status Overview
                </h2>
                <div className="flex items-center justify-center">
                  <svg width="200" height="200" viewBox="0 0 200 200">
                    {(() => {
                      const total =
                        analytics.verificationByStatus.reduce(
                          (sum, item) => sum + item.count,
                          0
                        );
                      let currentAngle = -90;
                      const colors = ["#10b981", "#ef4444", "#f59e0b"]; // green, red, amber

                      return analytics.verificationByStatus.map(
                        (item, index) => {
                          const percentage = (item.count / total) * 100;
                          const angle = (percentage / 100) * 360;
                          const startAngle = currentAngle;
                          currentAngle += angle;

                          const x1 =
                            100 +
                            100 * Math.cos((startAngle * Math.PI) / 180);
                          const y1 =
                            100 +
                            100 * Math.sin((startAngle * Math.PI) / 180);
                          const x2 =
                            100 +
                            100 * Math.cos((currentAngle * Math.PI) / 180);
                          const y2 =
                            100 +
                            100 * Math.sin((currentAngle * Math.PI) / 180);
                          const largeArc = angle > 180 ? 1 : 0;

                          return (
                            <path
                              key={index}
                              d={`M 100 100 L ${x1} ${y1} A 100 100 0 ${largeArc} 1 ${x2} ${y2} Z`}
                              fill={colors[index % colors.length]}
                              stroke="white"
                              strokeWidth="2"
                            />
                          );
                        }
                      );
                    })()}
                  </svg>
                </div>
                <div className="mt-6 space-y-2">
                  {analytics.verificationByStatus.map((item, index) => {
                    const total = analytics.verificationByStatus.reduce(
                      (sum, i) => sum + i.count,
                      0
                    );
                    const percentage = Math.round((item.count / total) * 100);
                    const colors = ["#10b981", "#ef4444", "#f59e0b"];
                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded"
                            style={{
                              backgroundColor: colors[index % colors.length],
                            }}
                          ></div>
                          <span className="text-sm text-gray-700">
                            {item.status}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {item.count} ({percentage}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "organizations" && (
          <div>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Organization Approvals
              </h1>
              <p className="text-gray-600 max-w-2xl">
                Review organization submissions from students. Approving an organization makes it visible to students
                and signals that it can support activity verification.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              {organizationsLoading ? (
                <div className="p-10 text-center text-sm text-gray-500">
                  Loading organization submissions…
                </div>
              ) : organizations.length === 0 ? (
                <div className="p-10 text-center text-sm text-gray-500">
                  No organization submissions yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Organization
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Details
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Submitted By
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {organizations.map((organization) => (
                        <tr key={organization.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 align-top">
                            <div className="flex items-center gap-3">
                              <div>
                                <div className="text-sm font-semibold text-gray-900">{organization.name}</div>
                                <div className="text-xs text-gray-500 mt-1">
                                  Submitted {new Date(organization.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 align-top">
                            <div className="space-y-2">
                              <p>{organization.description || "No description provided."}</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-500">
                                <div>
                                  <span className="font-medium text-gray-600">Category:</span>{" "}
                                  {organization.category || "—"}
                                </div>
                                <div>
                                  <span className="font-medium text-gray-600">President:</span>{" "}
                                  {organization.presidentName || "—"}
                                </div>
                                <div className="sm:col-span-2">
                                  <span className="font-medium text-gray-600">Leadership & Advisor:</span>{" "}
                                  {organization.leadership || "—"}
                                </div>
                                <div>
                                  <span className="font-medium text-gray-600">Type:</span>{" "}
                                  {organization.isSchoolClub ? "TBS club" : "External organization"}
                                </div>
                                <div>
                                  <span className="font-medium text-gray-600">Contact:</span>{" "}
                                  {organization.contactEmail || "—"}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 align-top">
                            {organization.createdBy ? (
                              <div>
                                <div className="font-medium text-gray-800">
                                  {organization.createdBy.name || "Unknown"}
                                </div>
                                <div className="text-xs text-gray-500">{organization.createdBy.email}</div>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right align-top">
                            <div className="inline-flex items-center gap-2">
                              <span
                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                  organization.status === "APPROVED"
                                    ? "bg-green-100 text-green-700 border border-green-200"
                                    : organization.status === "REJECTED"
                                    ? "bg-red-100 text-red-700 border border-red-200"
                                    : "bg-amber-100 text-amber-700 border border-amber-200"
                                }`}
                              >
                                {organization.status.charAt(0) + organization.status.slice(1).toLowerCase()}
                              </span>
                              <button
                                onClick={() => handleOrganizationDecision(organization.id, "reject")}
                                disabled={
                                  organizationActionId === organization.id ||
                                  organization.status === "REJECTED"
                                }
                                className="px-3 py-1 text-sm font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {organizationActionId === organization.id && organization.status !== "REJECTED"
                                  ? "Updating..."
                                  : organization.status === "REJECTED"
                                  ? "Rejected"
                                  : "Reject"}
                              </button>
                              <button
                                onClick={() => handleOrganizationDecision(organization.id, "approve")}
                                disabled={
                                  organizationActionId === organization.id ||
                                  organization.status === "APPROVED"
                                }
                                className="px-3 py-1 text-sm font-medium rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {organizationActionId === organization.id && organization.status !== "APPROVED"
                                  ? "Updating..."
                                  : organization.status === "APPROVED"
                                  ? "Approved"
                                  : "Approve"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "export" && (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="mb-6">
                <svg
                  className="mx-auto w-16 h-16 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Export Student Data
              </h2>
              <p className="text-gray-600 mb-6">
                Download all student activity data as a CSV file
              </p>
              <button
                onClick={handleExport}
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                Download CSV
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Student Profile Modal */}
      {showProfileModal && selectedStudent && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowProfileModal(false);
              setSelectedStudent(null);
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedStudent.name}
                </h2>
                <p className="text-sm text-gray-600">{selectedStudent.email}</p>
              </div>
              <button
                onClick={() => {
                  setShowProfileModal(false);
                  setSelectedStudent(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="px-6 py-4 overflow-y-auto flex-1">
              <div className="mb-6 grid grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">
                    Total Activities
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {selectedStudent.totalActivities}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Verified</div>
                  <div className="text-2xl font-bold text-green-600">
                    {selectedStudent.verifiedActivities}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">
                    Verification Rate
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    {selectedStudent.verifiedPercentage}%
                  </div>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Activities
              </h3>
              <div className="space-y-4">
                {selectedStudent.activities.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No activities found
                  </p>
                ) : (
                  selectedStudent.activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">
                            {activity.name}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {activity.description}
                          </p>
                        </div>
                        <span
                          className={`px-2.5 py-1 text-xs font-medium rounded ${
                            activity.verificationStatus === "verified" ||
                            activity.verificationStatus === "accepted"
                              ? "bg-green-100 text-green-700"
                              : activity.verificationStatus === "denied" ||
                                activity.verificationStatus === "rejected"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {activity.verificationStatus === "verified" ||
                          activity.verificationStatus === "accepted"
                            ? "Verified"
                            : activity.verificationStatus === "denied" ||
                              activity.verificationStatus === "rejected"
                            ? "Denied"
                            : "Pending"}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                        <div>
                          <span className="text-gray-600">Category: </span>
                          <span className="font-medium text-gray-900">
                            {activity.category}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Dates: </span>
                          <span className="font-medium text-gray-900">
                            {new Date(activity.startDate).toLocaleDateString()}
                            {activity.endDate &&
                              ` - ${new Date(activity.endDate).toLocaleDateString()}`}
                          </span>
                        </div>
                        {activity.verifier && (
                          <div className="col-span-2">
                            <span className="text-gray-600">Verified by: </span>
                            <span className="font-medium text-gray-900">
                              {activity.verifier.name} ({activity.verifier.email})
                            </span>
                          </div>
                        )}
                        <div className="col-span-2">
                          <span className="text-gray-600">Created: </span>
                          <span className="font-medium text-gray-900">
                            {new Date(activity.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

