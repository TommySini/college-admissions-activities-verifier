'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ListChecks, PenSquare, Trophy, ArrowLeft, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';

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

type TabType = 'activities' | 'essays' | 'awards';

export default function AlumniProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('activities');
  const [selectedAppIndex, setSelectedAppIndex] = useState(0);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch the first application to get profile info
        const res = await fetch(`/api/alumni/applications/${params.id}`);
        if (!res.ok) {
          throw new Error('Failed to fetch application');
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
        setError(err instanceof Error ? err.message : 'Unknown error');
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Profile not found'}</p>
          <Link href="/alumni" className="text-blue-600 hover:underline">
            Back to Alumni Database
          </Link>
        </div>
      </div>
    );
  }

  const currentApp = applications[selectedAppIndex];

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                  <span className="text-white font-bold text-xl">A</span>
                </div>
                <span className="text-xl font-bold text-slate-900">Actify</span>
              </Link>
              <div className="h-6 w-px bg-slate-300 mx-2"></div>
              <Link
                href="/alumni"
                className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                Alumni Database
              </Link>
            </div>
            <Link
              href="/alumni"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Browse
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        {/* Profile Header */}
        <Card className="text-center mb-8 p-8">
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 border border-blue-200">
              <GraduationCap className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <h1 className="text-3xl font-semibold text-slate-900 mb-2">
            {profile.displayName || 'Anonymous Alumni'}
          </h1>
          {profile.intendedMajor && (
            <p className="text-lg text-slate-600 mb-3">{profile.intendedMajor}</p>
          )}
          {profile.careerInterestTags && profile.careerInterestTags.length > 0 && (
            <div className="flex gap-2 justify-center flex-wrap mt-4">
              {profile.careerInterestTags.map((tag: string) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          {profile.contactEmail && (
            <p className="text-sm text-slate-500 mt-4">Contact: {profile.contactEmail}</p>
          )}
        </Card>

        {/* Application Selector */}
        {applications.length > 1 && (
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Select Application
            </label>
            <select
              value={selectedAppIndex}
              onChange={(e) => setSelectedAppIndex(Number(e.target.value))}
              className="w-full max-w-md px-4 py-2 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-900"
            >
              {applications.map((app, index) => (
                <option key={app.id} value={index}>
                  Application {index + 1} -{' '}
                  {new Date(app.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 flex justify-center">
          <div className="inline-flex rounded-full bg-slate-100 p-1">
            <button
              onClick={() => setActiveTab('activities')}
              className={cn(
                'inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-200',
                activeTab === 'activities'
                  ? 'bg-white border border-slate-200 shadow-sm text-slate-900'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <ListChecks className="h-4 w-4" />
              <span>Activities ({currentApp.activities.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('essays')}
              className={cn(
                'inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-200',
                activeTab === 'essays'
                  ? 'bg-white border border-slate-200 shadow-sm text-slate-900'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <PenSquare className="h-4 w-4" />
              <span>Essays ({currentApp.essays.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('awards')}
              className={cn(
                'inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-200',
                activeTab === 'awards'
                  ? 'bg-white border border-slate-200 shadow-sm text-slate-900'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <Trophy className="h-4 w-4" />
              <span>Awards ({currentApp.awards.length})</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <Card className="overflow-hidden">
          <div className="p-6">
            {activeTab === 'activities' && (
              <div className="space-y-3">
                {currentApp.activities.length === 0 ? (
                  <div className="text-center py-12">
                    <ListChecks className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                    <p className="text-slate-500">No activities found</p>
                  </div>
                ) : (
                  currentApp.activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all"
                    >
                      <h4 className="font-semibold text-slate-900 mb-2">{activity.title}</h4>
                      {activity.role && (
                        <p className="text-sm text-slate-600 mb-1">
                          <span className="font-medium">Role:</span> {activity.role}
                        </p>
                      )}
                      {activity.organization && (
                        <p className="text-sm text-slate-600 mb-1">
                          <span className="font-medium">Organization:</span> {activity.organization}
                        </p>
                      )}
                      {activity.description && (
                        <p className="text-sm text-slate-700 mb-2 mt-2">{activity.description}</p>
                      )}
                      <div className="flex gap-3 text-xs mt-2">
                        {activity.hours && (
                          <Badge variant="secondary" className="text-xs">
                            {activity.hours} hours
                          </Badge>
                        )}
                        {activity.years && (
                          <Badge variant="secondary" className="text-xs">
                            Years: {activity.years}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'essays' && (
              <div className="space-y-3">
                {currentApp.essays.length === 0 ? (
                  <div className="text-center py-12">
                    <PenSquare className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                    <p className="text-slate-500">No essays found</p>
                  </div>
                ) : (
                  currentApp.essays.map((essay) => (
                    <div
                      key={essay.id}
                      className="p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all"
                    >
                      <h4 className="font-semibold text-slate-900 mb-2">{essay.topic}</h4>
                      {essay.prompt && (
                        <p className="text-sm text-slate-600 mb-2 italic border-l-2 border-slate-300 pl-3">
                          {essay.prompt}
                        </p>
                      )}
                      {essay.summary && (
                        <p className="text-sm text-slate-700 mb-2">{essay.summary}</p>
                      )}
                      {essay.tags.length > 0 && (
                        <div className="flex gap-2 flex-wrap mt-3">
                          {essay.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'awards' && (
              <div className="space-y-3">
                {currentApp.awards.length === 0 ? (
                  <div className="text-center py-12">
                    <Trophy className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                    <p className="text-slate-500">No awards found</p>
                  </div>
                ) : (
                  currentApp.awards.map((award) => (
                    <div
                      key={award.id}
                      className="p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all"
                    >
                      <h4 className="font-semibold text-slate-900 mb-2">{award.title}</h4>
                      <div className="flex gap-3 text-sm text-slate-600 mb-2">
                        {award.level && (
                          <Badge variant="secondary" className="text-xs capitalize">
                            {award.level}
                          </Badge>
                        )}
                        {award.year && <span className="text-xs text-slate-500">{award.year}</span>}
                      </div>
                      {award.description && (
                        <p className="text-sm text-slate-700 mt-2">{award.description}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Parse Status */}
        {currentApp.parseStatus === 'pending' && (
          <div className="mt-6 text-center">
            <div className="inline-block px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-sm font-medium">
              Parsing in progress...
            </div>
          </div>
        )}
        {currentApp.parseStatus === 'failed' && (
          <div className="mt-6 text-center">
            <div className="inline-block px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-medium">
              Parse failed: {currentApp.parseError}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
