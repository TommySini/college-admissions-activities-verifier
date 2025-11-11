"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Folder from "@/app/components/Folder";

interface Profile {
  id: string;
  privacy: string;
  displayName?: string;
  intendedMajor?: string;
  careerInterestTags: string[];
  applications: Array<{
    id: string;
    parseStatus: string;
    activitiesCount: number;
    essaysCount: number;
    resultsCount: number;
    results: Array<{
      collegeName: string;
      decision: string;
      decisionRound?: string;
      rankBucket?: string;
    }>;
  }>;
}

export default function AlumniDatabasePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    major: "",
    tags: "",
    rankBucket: "",
    decision: "",
    search: "",
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    async function fetchProfiles() {
      try {
        const params = new URLSearchParams();
        if (filters.major) params.append("major", filters.major);
        if (filters.tags) params.append("tags", filters.tags);
        if (filters.rankBucket) params.append("rankBucket", filters.rankBucket);
        if (filters.decision) params.append("decision", filters.decision);
        if (filters.search) params.append("search", filters.search);

        const res = await fetch(`/api/alumni/profiles?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch profiles");
        const data = await res.json();
        setProfiles(data.profiles);
      } catch (err) {
        console.error("Error fetching profiles:", err);
      } finally {
        setLoading(false);
      }
    }

    if (status === "authenticated") {
      fetchProfiles();
    }
  }, [status, filters]);

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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Alumni Database</h1>
          <p className="text-gray-600">
            Browse college admissions profiles from past students. Filter by major, career interests, and admission results.
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
            {(filters.major || filters.tags || filters.rankBucket || filters.decision || filters.search) && (
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                placeholder="Search by name, major, tags..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Major</label>
              <input
                type="text"
                value={filters.major}
                onChange={(e) => handleFilterChange("major", e.target.value)}
                placeholder="e.g., Computer Science"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Career Tags</label>
              <input
                type="text"
                value={filters.tags}
                onChange={(e) => handleFilterChange("tags", e.target.value)}
                placeholder="e.g., finance, technology"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rank Bucket</label>
              <select
                value={filters.rankBucket}
                onChange={(e) => handleFilterChange("rankBucket", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                <option value="top5">Top 5</option>
                <option value="top10">Top 10</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Decision</label>
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
          {profiles.length} {profiles.length === 1 ? "profile" : "profiles"} found
        </p>

        {/* Profiles Grid */}
        {profiles.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
            <p className="text-gray-600 mb-2 font-medium">No profiles found</p>
            <p className="text-sm text-gray-500">Try adjusting your filters or be the first to upload!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {profiles.map((profile) => (
              <ProfileCard key={profile.id} profile={profile} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileCard({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [hoveredPaper, setHoveredPaper] = useState<number | null>(null);
  const application = profile.applications[0]; // Show first application

  if (!application) return null;

  const getPrivacyBadge = () => {
    const colors = {
      ANONYMOUS: "bg-gray-100 text-gray-700",
      PSEUDONYM: "bg-blue-100 text-blue-700",
      FULL: "bg-green-100 text-green-700",
    };
    return (
      <span className={`px-2 py-1 text-xs rounded-md ${colors[profile.privacy as keyof typeof colors]}`}>
        {profile.privacy}
      </span>
    );
  };

  const topAdmit = application.results.find((r) => r.decision === "admit" && r.rankBucket === "top5");

  // Create paper items with more detailed content
  const paperItems = [
    <div 
      key="activities" 
      className="p-3 text-xs flex flex-col items-center justify-center h-full"
      onMouseEnter={() => setHoveredPaper(0)}
      onMouseLeave={() => setHoveredPaper(null)}
    >
      <div className="font-bold text-blue-600 text-lg mb-1">📋</div>
      <div className="font-semibold text-gray-800">Activities</div>
      <div className="text-gray-500">{application.activitiesCount}</div>
    </div>,
    <div 
      key="essays" 
      className="p-3 text-xs flex flex-col items-center justify-center h-full"
      onMouseEnter={() => setHoveredPaper(1)}
      onMouseLeave={() => setHoveredPaper(null)}
    >
      <div className="font-bold text-purple-600 text-lg mb-1">✍️</div>
      <div className="font-semibold text-gray-800">Essays</div>
      <div className="text-gray-500">{application.essaysCount}</div>
    </div>,
    <div 
      key="results" 
      className="p-3 text-xs flex flex-col items-center justify-center h-full"
      onMouseEnter={() => setHoveredPaper(2)}
      onMouseLeave={() => setHoveredPaper(null)}
    >
      <div className="font-bold text-green-600 text-lg mb-1">🎓</div>
      <div className="font-semibold text-gray-800">Results</div>
      <div className="text-gray-500">{application.resultsCount}</div>
    </div>,
  ];

  return (
    <div 
      className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-lg transition-all cursor-pointer"
      onClick={() => router.push(`/alumni/${application.id}`)}
    >
      {/* Folder - Centered */}
      <div className="flex justify-center mb-6">
        <Folder color="#5227FF" size={2.5} items={paperItems} />
      </div>

      {/* Profile Info Below Folder */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          {profile.displayName || "Anonymous Alumni"}
        </h3>
        {profile.intendedMajor && (
          <p className="text-sm text-gray-600 mb-2">{profile.intendedMajor}</p>
        )}
        {profile.careerInterestTags.length > 0 && (
          <div className="flex gap-1 flex-wrap justify-center mb-3">
            {profile.careerInterestTags.slice(0, 3).map((tag) => (
              <span key={tag} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-md">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Top Admit Badge */}
        {topAdmit && (
          <div className="mb-3 p-2 bg-purple-50 border border-purple-200 rounded-lg inline-block">
            <p className="text-xs font-medium text-purple-900">🎉 Top 5 Admit</p>
            <p className="text-xs text-purple-700">{topAdmit.collegeName}</p>
          </div>
        )}

        {/* Stats */}
        <div className="text-xs text-gray-500 mt-2">
          {application.activitiesCount} activities • {application.essaysCount} essays • {application.resultsCount} results
        </div>
      </div>
    </div>
  );
}

