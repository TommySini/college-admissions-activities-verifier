'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ListChecks,
  PenSquare,
  Trophy,
  ChevronRight,
  X,
  GraduationCap,
  Upload,
} from 'lucide-react';
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
    major: '',
    tags: '',
    rankBucket: '',
    decision: '',
    search: '',
  });
  const [selectedSection, setSelectedSection] = useState<{
    appId: string;
    section: 'activities' | 'essays' | 'awards';
  } | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    async function fetchApplications() {
      try {
        const res = await fetch('/api/alumni/applications');
        if (!res.ok) throw new Error('Failed to fetch applications');
        const data = await res.json();
        setApplications(data.applications);
      } catch (err) {
        console.error('Error fetching applications:', err);
      } finally {
        setLoading(false);
      }
    }

    if (status === 'authenticated') {
      fetchApplications();
    }
  }, [status]);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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
      major: '',
      tags: '',
      rankBucket: '',
      decision: '',
      search: '',
    });
  };

  // Client-side filtering
  const filteredApplications = applications.filter((app) => {
    const profile = app.alumniProfile;
    const careerTags = profile.careerInterestTags ? JSON.parse(profile.careerInterestTags) : [];

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
      const hasTag = careerTags.some((tag: string) => tag.toLowerCase().includes(searchTags));
      if (!hasTag) return false;
    }

    // Rank bucket filter
    if (filters.rankBucket) {
      const hasRank = app.admissionResults.some((r) => r.rankBucket === filters.rankBucket);
      if (!hasRank) return false;
    }

    // Decision filter
    if (filters.decision) {
      const hasDecision = app.admissionResults.some((r) => r.decision === filters.decision);
      if (!hasDecision) return false;
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const majorMatch = profile.intendedMajor?.toLowerCase().includes(searchLower);
      const tagsMatch = careerTags.some((tag: string) => tag.toLowerCase().includes(searchLower));
      const displayNameMatch = profile.displayName?.toLowerCase().includes(searchLower);
      if (!majorMatch && !tagsMatch && !displayNameMatch) return false;
    }

    return true;
  });

  const handleCardClick = (appId: string, section: 'activities' | 'essays' | 'awards') => {
    setSelectedSection({ appId, section });
  };

  const closeModal = () => {
    setSelectedSection(null);
  };

  const selectedApp = applications.find((app) => app.id === selectedSection?.appId);

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.4em] text-slate-500">
              Alumni Database
            </p>
            <h1 className="mt-3 text-4xl font-semibold text-slate-900">Explore Alumni Profiles</h1>
            <p className="mt-2 text-base text-slate-600">
              Browse college admissions profiles from past students. Filter by major, career
              interests, and admission results.
            </p>
          </div>
          <Button variant="shimmer" size="lg" asChild className="shrink-0">
            <Link href="/alumni/upload">
              <Upload className="h-4 w-4" />
              Upload Application
            </Link>
          </Button>
        </div>

        {/* Filters */}
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between gap-4 mb-6">
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
              Filters
            </h2>
            {(filters.major ||
              filters.tags ||
              filters.rankBucket ||
              filters.decision ||
              filters.search) && (
              <Button onClick={clearFilters} variant="ghost" size="sm" className="h-8">
                <X className="h-3.5 w-3.5 mr-1" />
                Clear all
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Search</label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Search by name, major, tags..."
                className="w-full px-4 py-2 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-900 placeholder:text-slate-400"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Major</label>
              <input
                type="text"
                value={filters.major}
                onChange={(e) => handleFilterChange('major', e.target.value)}
                placeholder="e.g., Computer Science"
                className="w-full px-4 py-2 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-900 placeholder:text-slate-400"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Career Tags</label>
              <input
                type="text"
                value={filters.tags}
                onChange={(e) => handleFilterChange('tags', e.target.value)}
                placeholder="e.g., finance, technology"
                className="w-full px-4 py-2 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-900 placeholder:text-slate-400"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Rank Bucket</label>
              <select
                value={filters.rankBucket}
                onChange={(e) => handleFilterChange('rankBucket', e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-900"
              >
                <option value="">All</option>
                <option value="top5">Top 5</option>
                <option value="top10">Top 10</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Decision</label>
              <select
                value={filters.decision}
                onChange={(e) => handleFilterChange('decision', e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-900"
              >
                <option value="">All</option>
                <option value="admit">Admit</option>
                <option value="waitlist">Waitlist</option>
                <option value="deny">Deny</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Results Count */}
        <p className="text-sm text-slate-600 mb-6">
          {filteredApplications.length}{' '}
          {filteredApplications.length === 1 ? 'application' : 'applications'} found
        </p>

        {/* Applications Grid */}
        {filteredApplications.length === 0 ? (
          <Card className="p-12 text-center">
            <GraduationCap className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <p className="text-slate-900 mb-2 font-semibold text-lg">No applications found</p>
            <p className="text-sm text-slate-500">
              Try adjusting your filters or be the first to upload!
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredApplications.map((app) => (
              <Card
                key={app.id}
                className="overflow-hidden hover:-translate-y-0.5 hover:shadow-md hover:border-blue-200 transition-all duration-300"
              >
                {/* Card Header */}
                <div className="p-6 border-b border-slate-100">
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">
                    {app.alumniProfile.displayName ||
                      app.alumniProfile.intendedMajor ||
                      'Anonymous'}
                  </h3>
                  {app.alumniProfile.intendedMajor && (
                    <p className="text-sm text-slate-600">{app.alumniProfile.intendedMajor}</p>
                  )}
                  <p className="text-xs text-slate-500 mt-2">
                    Uploaded{' '}
                    {new Date(app.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>

                {/* Card Content - Clickable Sections */}
                <div className="p-4">
                  <div className="space-y-2">
                    <button
                      onClick={() => handleCardClick(app.id, 'activities')}
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-white hover:border-slate-200 hover:shadow-sm transition-all text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                          <ListChecks className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 text-sm">Activities</p>
                          <p className="text-xs text-slate-500">
                            {app.extractedActivities.length} items
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-0.5" />
                    </button>

                    <button
                      onClick={() => handleCardClick(app.id, 'essays')}
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-white hover:border-slate-200 hover:shadow-sm transition-all text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-600 transition-colors group-hover:bg-purple-600 group-hover:text-white">
                          <PenSquare className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 text-sm">Essays</p>
                          <p className="text-xs text-slate-500">
                            {app.extractedEssays.length} items
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-0.5" />
                    </button>

                    <button
                      onClick={() => handleCardClick(app.id, 'awards')}
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-white hover:border-slate-200 hover:shadow-sm transition-all text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-600 transition-colors group-hover:bg-amber-600 group-hover:text-white">
                          <Trophy className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 text-sm">Awards</p>
                          <p className="text-xs text-slate-500">
                            {app.extractedAwards.length} items
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </div>
                </div>

                {/* Parse Status */}
                {app.parseStatus === 'pending' && (
                  <div className="px-6 pb-4">
                    <div className="text-xs font-medium text-amber-700 bg-amber-50 px-3 py-2 rounded-xl border border-amber-200">
                      Parsing in progress...
                    </div>
                  </div>
                )}
                {app.parseStatus === 'failed' && (
                  <div className="px-6 pb-4">
                    <div className="text-xs font-medium text-red-700 bg-red-50 px-3 py-2 rounded-xl border border-red-200">
                      Parse failed
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal for Section Details */}
      {selectedSection && selectedApp && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-lg max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                {selectedSection.section === 'activities' && (
                  <>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                      <ListChecks className="h-5 w-5" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900">Activities</h3>
                  </>
                )}
                {selectedSection.section === 'essays' && (
                  <>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
                      <PenSquare className="h-5 w-5" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900">Essays</h3>
                  </>
                )}
                {selectedSection.section === 'awards' && (
                  <>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                      <Trophy className="h-5 w-5" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900">Awards</h3>
                  </>
                )}
              </div>
              <button
                onClick={closeModal}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              {selectedSection.section === 'activities' && (
                <div className="space-y-3">
                  {selectedApp.extractedActivities.length === 0 ? (
                    <div className="text-center py-12">
                      <ListChecks className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                      <p className="text-slate-500">No activities found</p>
                    </div>
                  ) : (
                    selectedApp.extractedActivities.map((activity) => (
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
                            <span className="font-medium">Organization:</span>{' '}
                            {activity.organization}
                          </p>
                        )}
                        {activity.description && (
                          <p className="text-sm text-slate-700 mb-2 mt-2">{activity.description}</p>
                        )}
                        <div className="flex gap-4 text-xs text-slate-500 mt-2">
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

              {selectedSection.section === 'essays' && (
                <div className="space-y-3">
                  {selectedApp.extractedEssays.length === 0 ? (
                    <div className="text-center py-12">
                      <PenSquare className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                      <p className="text-slate-500">No essays found</p>
                    </div>
                  ) : (
                    selectedApp.extractedEssays.map((essay) => (
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
                        {essay.tags && essay.tags.length > 0 && (
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

              {selectedSection.section === 'awards' && (
                <div className="space-y-3">
                  {selectedApp.extractedAwards.length === 0 ? (
                    <div className="text-center py-12">
                      <Trophy className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                      <p className="text-slate-500">No awards found</p>
                    </div>
                  ) : (
                    selectedApp.extractedAwards.map((award) => (
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
                          {award.year && (
                            <span className="text-xs text-slate-500">{award.year}</span>
                          )}
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
          </div>
        </div>
      )}
    </div>
  );
}
