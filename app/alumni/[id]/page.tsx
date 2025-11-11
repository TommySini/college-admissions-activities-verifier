"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Folder from "@/app/components/Folder";
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
  results: Result[];
}

export default function AlumniProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<{
    appId: string;
    section: "activities" | "essays" | "results";
  } | null>(null);

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

  const handlePaperClick = (appId: string, section: "activities" | "essays" | "results") => {
    setSelectedSection({ appId, section });
  };

  const closeModal = () => {
    setSelectedSection(null);
  };

  const selectedApp = applications.find((app) => app.id === selectedSection?.appId);

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

        {/* Applications Title */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Application Files</h2>
          <p className="text-gray-600">Click on a folder to view its contents, then click on individual papers to see details</p>
        </div>

        {/* Horizontal Scrollable Folders */}
        <div className="overflow-x-auto pb-8">
          <div className="flex gap-12 justify-center min-w-max px-8">
            {applications.map((app, index) => (
              <ApplicationFolder
                key={app.id}
                application={app}
                index={index}
                onPaperClick={handlePaperClick}
              />
            ))}
          </div>
        </div>

        {/* Empty State */}
        {applications.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No applications uploaded yet</p>
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
                {selectedSection.section === "results" && "🎓 Admission Results"}
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
                  {selectedApp.activities.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No activities found</p>
                  ) : (
                    selectedApp.activities.map((activity) => (
                      <div key={activity.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <h4 className="font-semibold text-gray-900 mb-2">{activity.title}</h4>
                        {activity.role && <p className="text-sm text-gray-600 mb-1">Role: {activity.role}</p>}
                        {activity.organization && (
                          <p className="text-sm text-gray-600 mb-1">Organization: {activity.organization}</p>
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

              {selectedSection.section === "essays" && (
                <div className="space-y-4">
                  {selectedApp.essays.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No essays found</p>
                  ) : (
                    selectedApp.essays.map((essay) => (
                      <div key={essay.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <h4 className="font-semibold text-gray-900 mb-2">{essay.topic}</h4>
                        {essay.prompt && <p className="text-sm text-gray-600 mb-2 italic">{essay.prompt}</p>}
                        {essay.summary && <p className="text-sm text-gray-700 mb-2">{essay.summary}</p>}
                        {essay.tags.length > 0 && (
                          <div className="flex gap-2 flex-wrap">
                            {essay.tags.map((tag) => (
                              <span key={tag} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md">
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

              {selectedSection.section === "results" && (
                <div className="space-y-4">
                  {selectedApp.results.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No results found</p>
                  ) : (
                    selectedApp.results.map((result) => (
                      <div key={result.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-1">{result.collegeName}</h4>
                            {result.decisionRound && (
                              <p className="text-xs text-gray-500">{result.decisionRound}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {result.rankBucket === "top5" && (
                              <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-md">
                                Top 5
                              </span>
                            )}
                            {result.rankBucket === "top10" && (
                              <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-md">
                                Top 10
                              </span>
                            )}
                            <span
                              className={`px-2 py-1 text-xs rounded-md ${
                                result.decision === "admit"
                                  ? "bg-green-100 text-green-700"
                                  : result.decision === "waitlist"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {result.decision.toUpperCase()}
                            </span>
                          </div>
                        </div>
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

function ApplicationFolder({
  application,
  index,
  onPaperClick,
}: {
  application: Application;
  index: number;
  onPaperClick: (appId: string, section: "activities" | "essays" | "results") => void;
}) {
  const [hoveredPaper, setHoveredPaper] = useState<number | null>(null);

  const paperItems = [
    <div
      key="activities"
      className="p-4 text-sm flex flex-col items-center justify-center h-full cursor-pointer"
      onClick={(e) => {
        e.stopPropagation();
        onPaperClick(application.id, "activities");
      }}
      onMouseEnter={() => setHoveredPaper(0)}
      onMouseLeave={() => setHoveredPaper(null)}
    >
      <div className="font-bold text-blue-600 text-2xl mb-2">📋</div>
      <div className="font-semibold text-gray-800">Activities</div>
      <div className="text-gray-500 text-xs mt-1">{application.activities.length}</div>
    </div>,
    <div
      key="essays"
      className="p-4 text-sm flex flex-col items-center justify-center h-full cursor-pointer"
      onClick={(e) => {
        e.stopPropagation();
        onPaperClick(application.id, "essays");
      }}
      onMouseEnter={() => setHoveredPaper(1)}
      onMouseLeave={() => setHoveredPaper(null)}
    >
      <div className="font-bold text-purple-600 text-2xl mb-2">✍️</div>
      <div className="font-semibold text-gray-800">Essays</div>
      <div className="text-gray-500 text-xs mt-1">{application.essays.length}</div>
    </div>,
    <div
      key="results"
      className="p-4 text-sm flex flex-col items-center justify-center h-full cursor-pointer"
      onClick={(e) => {
        e.stopPropagation();
        onPaperClick(application.id, "results");
      }}
      onMouseEnter={() => setHoveredPaper(2)}
      onMouseLeave={() => setHoveredPaper(null)}
    >
      <div className="font-bold text-green-600 text-2xl mb-2">🎓</div>
      <div className="font-semibold text-gray-800">Results</div>
      <div className="text-gray-500 text-xs mt-1">{application.results.length}</div>
    </div>,
  ];

  return (
    <div className="flex flex-col items-center">
      {/* Folder Label */}
      <div className="mb-4 text-center">
        <p className="text-sm font-medium text-gray-700">
          Application {index + 1}
        </p>
        <p className="text-xs text-gray-500">
          {new Date(application.createdAt).toLocaleDateString()}
        </p>
      </div>

      {/* Large Folder */}
      <div className="relative">
        <Folder color="#5227FF" size={4} items={paperItems} />
      </div>

      {/* Hover Preview */}
      {hoveredPaper !== null && (
        <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200 shadow-sm min-w-[200px]">
          {hoveredPaper === 0 && (
            <p className="text-xs text-gray-600 text-center">
              Click to view {application.activities.length} activities
            </p>
          )}
          {hoveredPaper === 1 && (
            <p className="text-xs text-gray-600 text-center">
              Click to view {application.essays.length} essays
            </p>
          )}
          {hoveredPaper === 2 && (
            <p className="text-xs text-gray-600 text-center">
              Click to view {application.results.length} results
            </p>
          )}
        </div>
      )}

      {/* Parse Status */}
      {application.parseStatus === "pending" && (
        <div className="mt-2 text-xs text-yellow-600">Parsing...</div>
      )}
      {application.parseStatus === "failed" && (
        <div className="mt-2 text-xs text-red-600">Parse failed</div>
      )}
    </div>
  );
}
