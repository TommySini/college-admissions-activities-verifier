"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
  parseError?: string;
  createdAt: string;
  profile: {
    id: string;
    privacy: string;
    displayName?: string;
    contactEmail?: string;
    intendedMajor?: string;
    careerInterestTags: string[];
  };
  activities: Activity[];
  essays: Essay[];
  awards: Award[];
  results: Result[];
}

type TabType = "activities" | "essays" | "awards";

export default function AlumniProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("activities");
  const [selectedAppIndex, setSelectedAppIndex] = useState(0);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch the first application to get profile info
        const res = await fetch(`/api/alumni/applications/${params.id}`);
        if (!res.ok) {
          throw new Error("Failed to fetch application");
        }
        const data = await res.json();
        const firstApp = data.application;
        setProfile(firstApp.profile);

        // Fetch all applications for this alumni profile
        const appsRes = await fetch(`/api/alumni/applications?alumniId=${firstApp.profile.id}`);
        if (appsRes.ok) {
          const appsData = await appsRes.json();
          setApplications(appsData.applications || [firstApp]);
        } else {
          setApplications([firstApp]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      fetchData();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || "Profile not found"}</p>
          <Link href="/alumni" className="text-blue-600 hover:underline">
            Back to Alumni Database
          </Link>
        </div>
      </div>
    );
  }

  const currentApp = applications[selectedAppIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
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
              <Link href="/alumni" className="text-sm text-gray-500 hover:text-gray-700">
                Alumni Database
              </Link>
            </div>
            <Link
              href="/alumni"
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
            >
              Back to Browse
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Profile Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {profile.displayName || "Anonymous Alumni"}
          </h1>
          {profile.intendedMajor && (
            <p className="text-xl text-gray-600 mb-3">{profile.intendedMajor}</p>
          )}
          {profile.careerInterestTags && profile.careerInterestTags.length > 0 && (
            <div className="flex gap-2 justify-center flex-wrap">
              {profile.careerInterestTags.map((tag: string) => (
                <span key={tag} className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}
          {profile.contactEmail && (
            <p className="text-sm text-gray-500 mt-3">Contact: {profile.contactEmail}</p>
          )}
        </div>

        {/* Application Selector */}
        {applications.length > 1 && (
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Application
            </label>
            <select
              value={selectedAppIndex}
              onChange={(e) => setSelectedAppIndex(Number(e.target.value))}
              className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {applications.map((app, index) => (
                <option key={app.id} value={index}>
                  Application {index + 1} - {new Date(app.createdAt).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Tab Headers */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab("activities")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === "activities"
                  ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl">📋</span>
                <span>Activities ({currentApp.activities.length})</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab("essays")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === "essays"
                  ? "text-purple-600 border-b-2 border-purple-600 bg-purple-50"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl">✍️</span>
                <span>Essays ({currentApp.essays.length})</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab("awards")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === "awards"
                  ? "text-yellow-600 border-b-2 border-yellow-600 bg-yellow-50"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl">🏆</span>
                <span>Awards ({currentApp.awards.length})</span>
              </div>
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === "activities" && (
              <div className="space-y-4">
                {currentApp.activities.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No activities found</p>
                ) : (
                  currentApp.activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
                    >
                      <h4 className="font-semibold text-gray-900 mb-2">{activity.title}</h4>
                      {activity.role && (
                        <p className="text-sm text-gray-600 mb-1">Role: {activity.role}</p>
                      )}
                      {activity.organization && (
                        <p className="text-sm text-gray-600 mb-1">
                          Organization: {activity.organization}
                        </p>
                      )}
                      {activity.description && (
                        <p className="text-sm text-gray-700 mb-2">{activity.description}</p>
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

            {activeTab === "essays" && (
              <div className="space-y-4">
                {currentApp.essays.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No essays found</p>
                ) : (
                  currentApp.essays.map((essay) => (
                    <div
                      key={essay.id}
                      className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-purple-300 transition-colors"
                    >
                      <h4 className="font-semibold text-gray-900 mb-2">{essay.topic}</h4>
                      {essay.prompt && (
                        <p className="text-sm text-gray-600 mb-2 italic">{essay.prompt}</p>
                      )}
                      {essay.summary && (
                        <p className="text-sm text-gray-700 mb-2">{essay.summary}</p>
                      )}
                      {essay.tags.length > 0 && (
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

            {activeTab === "awards" && (
              <div className="space-y-4">
                {currentApp.awards.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No awards found</p>
                ) : (
                  currentApp.awards.map((award) => (
                    <div
                      key={award.id}
                      className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-yellow-300 transition-colors"
                    >
                      <h4 className="font-semibold text-gray-900 mb-2">{award.title}</h4>
                      <div className="flex gap-4 text-sm text-gray-600 mb-2">
                        {award.level && (
                          <span className="px-2 py-1 bg-yellow-50 text-yellow-700 text-xs rounded-md capitalize">
                            {award.level}
                          </span>
                        )}
                        {award.year && <span>{award.year}</span>}
                      </div>
                      {award.description && (
                        <p className="text-sm text-gray-700">{award.description}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Parse Status */}
        {currentApp.parseStatus === "pending" && (
          <div className="mt-4 text-center">
            <div className="inline-block px-4 py-2 bg-yellow-50 text-yellow-700 rounded-lg text-sm">
              Parsing in progress...
            </div>
          </div>
        )}
        {currentApp.parseStatus === "failed" && (
          <div className="mt-4 text-center">
            <div className="inline-block px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm">
              Parse failed: {currentApp.parseError}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
