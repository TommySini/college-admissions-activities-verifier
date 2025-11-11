"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Folder from "@/app/components/Folder";
import Link from "next/link";

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
  activities: Array<{
    id: string;
    title: string;
    description?: string;
    role?: string;
    organization?: string;
    hours?: number;
    years?: string;
  }>;
  essays: Array<{
    id: string;
    topic: string;
    prompt?: string;
    summary?: string;
    tags: string[];
  }>;
  results: Array<{
    id: string;
    collegeName: string;
    decision: string;
    decisionRound?: string;
    rankBucket?: string;
  }>;
}

export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchApplication() {
      try {
        const res = await fetch(`/api/alumni/applications/${params.id}`);
        if (!res.ok) {
          throw new Error("Failed to fetch application");
        }
        const data = await res.json();
        setApplication(data.application);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      fetchApplication();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || "Application not found"}</p>
          <Link href="/alumni" className="text-blue-600 hover:underline">
            Back to Alumni Database
          </Link>
        </div>
      </div>
    );
  }

  const getPrivacyBadge = () => {
    const colors = {
      ANONYMOUS: "bg-gray-100 text-gray-700",
      PSEUDONYM: "bg-blue-100 text-blue-700",
      FULL: "bg-green-100 text-green-700",
    };
    return (
      <span className={`px-2 py-1 text-xs rounded-md ${colors[application.profile.privacy as keyof typeof colors]}`}>
        {application.profile.privacy}
      </span>
    );
  };

  const getDecisionBadge = (decision: string) => {
    const colors = {
      admit: "bg-green-100 text-green-700",
      waitlist: "bg-yellow-100 text-yellow-700",
      deny: "bg-red-100 text-red-700",
    };
    return (
      <span className={`px-2 py-1 text-xs rounded-md ${colors[decision as keyof typeof colors] || "bg-gray-100 text-gray-700"}`}>
        {decision.toUpperCase()}
      </span>
    );
  };

  // Create paper items for the folder
  const paperItems = [
    // Paper 1: Activities summary
    <div key="activities" className="p-2 text-xs">
      <p className="font-semibold text-gray-700">Activities</p>
      <p className="text-gray-500">{application.activities.length} items</p>
    </div>,
    // Paper 2: Essays summary
    <div key="essays" className="p-2 text-xs">
      <p className="font-semibold text-gray-700">Essays</p>
      <p className="text-gray-500">{application.essays.length} topics</p>
    </div>,
    // Paper 3: Results summary
    <div key="results" className="p-2 text-xs">
      <p className="font-semibold text-gray-700">Results</p>
      <p className="text-gray-500">{application.results.length} colleges</p>
    </div>,
  ];

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

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-gray-900">
              {application.profile.displayName || "Anonymous Alumni"}
            </h1>
            {getPrivacyBadge()}
          </div>
          {application.profile.intendedMajor && (
            <p className="text-gray-600">Major: {application.profile.intendedMajor}</p>
          )}
          {application.profile.careerInterestTags.length > 0 && (
            <div className="flex gap-2 mt-2">
              {application.profile.careerInterestTags.map((tag) => (
                <span key={tag} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md">
                  {tag}
                </span>
              ))}
            </div>
          )}
          {application.profile.contactEmail && (
            <p className="text-sm text-gray-500 mt-2">Contact: {application.profile.contactEmail}</p>
          )}
        </div>

        {/* Folder Visualization */}
        <div className="mb-8 flex justify-center">
          <Folder color="#5227FF" size={3} items={paperItems} />
        </div>

        {/* Parse Status */}
        {application.parseStatus === "pending" && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
            Parsing in progress...
          </div>
        )}
        {application.parseStatus === "failed" && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            Parsing failed: {application.parseError}
          </div>
        )}

        {/* Admission Results */}
        {application.results.length > 0 && (
          <div className="mb-8 bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Admission Results</h2>
            <div className="space-y-3">
              {application.results.map((result) => (
                <div key={result.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{result.collegeName}</p>
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
                    {getDecisionBadge(result.decision)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Activities */}
        {application.activities.length > 0 && (
          <div className="mb-8 bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Activities</h2>
            <div className="space-y-4">
              {application.activities.map((activity) => (
                <div key={activity.id} className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-1">{activity.title}</h3>
                  {activity.role && <p className="text-sm text-gray-600 mb-1">Role: {activity.role}</p>}
                  {activity.organization && (
                    <p className="text-sm text-gray-600 mb-1">Organization: {activity.organization}</p>
                  )}
                  {activity.description && <p className="text-sm text-gray-700 mb-2">{activity.description}</p>}
                  <div className="flex gap-4 text-xs text-gray-500">
                    {activity.hours && <span>{activity.hours} hours</span>}
                    {activity.years && <span>Years: {activity.years}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Essays */}
        {application.essays.length > 0 && (
          <div className="mb-8 bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Essay Topics</h2>
            <div className="space-y-4">
              {application.essays.map((essay) => (
                <div key={essay.id} className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-1">{essay.topic}</h3>
                  {essay.prompt && <p className="text-sm text-gray-600 mb-2 italic">{essay.prompt}</p>}
                  {essay.summary && <p className="text-sm text-gray-700 mb-2">{essay.summary}</p>}
                  {essay.tags.length > 0 && (
                    <div className="flex gap-2">
                      {essay.tags.map((tag) => (
                        <span key={tag} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

