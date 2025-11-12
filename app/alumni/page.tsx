"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Activity {
  id: string;
  title: string;
  description?: string;
  role?: string;
  organization?: string;
  hours?: number;
  years?: string;
}

interface Essay {
  id: string;
  topic: string;
  prompt?: string;
  summary?: string;
  tags: string[];
}

interface Award {
  id: string;
  title: string;
  level?: string;
  year?: string;
  description?: string;
}

interface Result {
  id: string;
  collegeName: string;
  decision: string;
  decisionRound?: string;
  rankBucket?: string;
}

interface Application {
  id: string;
  parseStatus: string;
  createdAt: string;
  alumniProfile: {
    id: string;
    privacy: string;
    displayName?: string;
    intendedMajor?: string;
    careerInterestTags?: string;
  };
  extractedActivities: Activity[];
  extractedEssays: Essay[];
  extractedAwards: Award[];
  admissionResults: Result[];
}

export default function AlumniDatabasePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    major: "",
    tags: "",
    rankBucket: "",
    decision: "",
    search: "",
  });
  const [selectedSection, setSelectedSection] = useState<{
    appId: string;
    section: "activities" | "essays" | "awards";
  } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    async function fetchApplications() {
      try {
        const res = await fetch("/api/alumni/applications");
        if (!res.ok) throw new Error("Failed to fetch applications");
        const data = await res.json();
        setApplications(data.applications);
      } catch (err) {
        console.error("Error fetching applications:", err);
      } finally {
        setLoading(false);
      }
    }

    if (status === "authenticated") {
      fetchApplications();
    }
  }, [status]);

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

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      major: "",
      tags: "",
      rankBucket: "",
      decision: "",
      search: "",
    });
  };

  // Client-side filtering
  const filteredApplications = applications.filter((app) => {
    const profile = app.alumniProfile;
    const careerTags = profile.careerInterestTags
      ? JSON.parse(profile.careerInterestTags)
      : [];

    // Major filter
    if (
      filters.major &&
      !profile.intendedMajor?.toLowerCase().includes(filters.major.toLowerCase())
    ) {
      return false;
    }

    // Tags filter
    if (filters.tags) {
      const searchTags = filters.tags.toLowerCase();
      const hasTag = careerTags.some((tag: string) =>
        tag.toLowerCase().includes(searchTags)
      );
      if (!hasTag) return false;
    }

    // Rank bucket filter
    if (filters.rankBucket) {
      const hasRank = app.admissionResults.some(
        (r) => r.rankBucket === filters.rankBucket
      );
      if (!hasRank) return false;
    }

    // Decision filter
    if (filters.decision) {
      const hasDecision = app.admissionResults.some(
        (r) => r.decision === filters.decision
      );
      if (!hasDecision) return false;
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const majorMatch = profile.intendedMajor
        ?.toLowerCase()
        .includes(searchLower);
      const tagsMatch = careerTags.some((tag: string) =>
        tag.toLowerCase().includes(searchLower)
      );
      const displayNameMatch = profile.displayName
        ?.toLowerCase()
        .includes(searchLower);
      if (!majorMatch && !tagsMatch && !displayNameMatch) return false;
    }

    return true;
  });

  const handleCardClick = (
    appId: string,
    section: "activities" | "essays" | "awards"
  ) => {
    setSelectedSection({ appId, section });
  };

  const closeModal = () => {
    setSelectedSection(null);
  };

  const selectedApp = applications.find(
    (app) => app.id === selectedSection?.appId
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
                  <span className="text-white font-bold text-xl">A</span>
                </div>
                <span className="text-xl font-bold text-gray-900">Actify</span>
              </Link>
              <div className="h-6 w-px bg-gray-300 mx-2"></div>
              <span className="text-sm text-gray-500">Alumni Database</span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/alumni/upload"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Upload Application
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Alumni Database
          </h1>
          <p className="text-gray-600">
            Browse college admissions profiles from past students. Filter by
            major, career interests, and admission results.
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
            {(filters.major ||
              filters.tags ||
              filters.rankBucket ||
              filters.decision ||
              filters.search) && (
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                placeholder="Search by name, major, tags..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Major
              </label>
              <input
                type="text"
                value={filters.major}
                onChange={(e) => handleFilterChange("major", e.target.value)}
                placeholder="e.g., Computer Science"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Career Tags
              </label>
              <input
                type="text"
                value={filters.tags}
                onChange={(e) => handleFilterChange("tags", e.target.value)}
                placeholder="e.g., finance, technology"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rank Bucket
              </label>
              <select
                value={filters.rankBucket}
                onChange={(e) =>
                  handleFilterChange("rankBucket", e.target.value)
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                <option value="top5">Top 5</option>
                <option value="top10">Top 10</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Decision
              </label>
              <select
                value={filters.decision}
                onChange={(e) => handleFilterChange("decision", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                <option value="admit">Admit</option>
                <option value="waitlist">Waitlist</option>
                <option value="deny">Deny</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <p className="text-sm text-gray-600 mb-4">
          {filteredApplications.length}{" "}
          {filteredApplications.length === 1 ? "application" : "applications"}{" "}
          found
        </p>

        {/* Applications Grid */}
        {filteredApplications.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
            <p className="text-gray-600 mb-2 font-medium">
              No applications found
            </p>
            <p className="text-sm text-gray-500">
              Try adjusting your filters or be the first to upload!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredApplications.map((app) => (
              <div
                key={app.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                {/* Card Header */}
                <div className="p-6 border-b border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {app.alumniProfile.displayName ||
                      app.alumniProfile.intendedMajor ||
                      "Anonymous"}
                  </h3>
                  {app.alumniProfile.intendedMajor && (
                    <p className="text-sm text-gray-600">
                      {app.alumniProfile.intendedMajor}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    Uploaded {new Date(app.createdAt).toLocaleDateString()}
                  </p>
                </div>

                {/* Card Content - Clickable Sections */}
                <div className="p-4">
                  <div className="space-y-2">
                    <button
                      onClick={() => handleCardClick(app.id, "activities")}
                      className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">📋</span>
                        <div>
                          <p className="font-medium text-gray-900">Activities</p>
                          <p className="text-xs text-gray-600">
                            {app.extractedActivities.length} items
                          </p>
                        </div>
                      </div>
                      <svg
                        className="w-5 h-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>

                    <button
                      onClick={() => handleCardClick(app.id, "essays")}
                      className="w-full flex items-center justify-between p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">✍️</span>
                        <div>
                          <p className="font-medium text-gray-900">Essays</p>
                          <p className="text-xs text-gray-600">
                            {app.extractedEssays.length} items
                          </p>
                        </div>
                      </div>
                      <svg
                        className="w-5 h-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>

                    <button
                      onClick={() => handleCardClick(app.id, "awards")}
                      className="w-full flex items-center justify-between p-3 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">🏆</span>
                        <div>
                          <p className="font-medium text-gray-900">Awards</p>
                          <p className="text-xs text-gray-600">
                            {app.extractedAwards.length} items
                          </p>
                        </div>
                      </div>
                      <svg
                        className="w-5 h-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Parse Status */}
                {app.parseStatus === "pending" && (
                  <div className="px-6 pb-4">
                    <div className="text-xs text-yellow-600 bg-yellow-50 px-3 py-2 rounded-lg">
                      Parsing in progress...
                    </div>
                  </div>
                )}
                {app.parseStatus === "failed" && (
                  <div className="px-6 pb-4">
                    <div className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                      Parse failed
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal for Section Details */}
      {selectedSection && selectedApp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-gray-900">
                {selectedSection.section === "activities" && "📋 Activities"}
                {selectedSection.section === "essays" && "✍️ Essays"}
                {selectedSection.section === "awards" && "🏆 Awards"}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1">
              {selectedSection.section === "activities" && (
                <div className="space-y-4">
                  {selectedApp.extractedActivities.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      No activities found
                    </p>
                  ) : (
                    selectedApp.extractedActivities.map((activity) => (
                      <div
                        key={activity.id}
                        className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <h4 className="font-semibold text-gray-900 mb-2">
                          {activity.title}
                        </h4>
                        {activity.role && (
                          <p className="text-sm text-gray-600 mb-1">
                            Role: {activity.role}
                          </p>
                        )}
                        {activity.organization && (
                          <p className="text-sm text-gray-600 mb-1">
                            Organization: {activity.organization}
                          </p>
                        )}
                        {activity.description && (
                          <p className="text-sm text-gray-700 mb-2">
                            {activity.description}
                          </p>
                        )}
                        <div className="flex gap-4 text-xs text-gray-500">
                          {activity.hours && <span>{activity.hours} hours</span>}
                          {activity.years && <span>Years: {activity.years}</span>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {selectedSection.section === "essays" && (
                <div className="space-y-4">
                  {selectedApp.extractedEssays.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      No essays found
                    </p>
                  ) : (
                    selectedApp.extractedEssays.map((essay) => (
                      <div
                        key={essay.id}
                        className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <h4 className="font-semibold text-gray-900 mb-2">
                          {essay.topic}
                        </h4>
                        {essay.prompt && (
                          <p className="text-sm text-gray-600 mb-2 italic">
                            {essay.prompt}
                          </p>
                        )}
                        {essay.summary && (
                          <p className="text-sm text-gray-700 mb-2">
                            {essay.summary}
                          </p>
                        )}
                        {essay.tags && essay.tags.length > 0 && (
                          <div className="flex gap-2 flex-wrap">
                            {essay.tags.map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {selectedSection.section === "awards" && (
                <div className="space-y-4">
                  {selectedApp.extractedAwards.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      No awards found
                    </p>
                  ) : (
                    selectedApp.extractedAwards.map((award) => (
                      <div
                        key={award.id}
                        className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <h4 className="font-semibold text-gray-900 mb-2">
                          {award.title}
                        </h4>
                        <div className="flex gap-4 text-sm text-gray-600 mb-2">
                          {award.level && (
                            <span className="px-2 py-1 bg-yellow-50 text-yellow-700 text-xs rounded-md capitalize">
                              {award.level}
                            </span>
                          )}
                          {award.year && <span>{award.year}</span>}
                        </div>
                        {award.description && (
                          <p className="text-sm text-gray-700">
                            {award.description}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
