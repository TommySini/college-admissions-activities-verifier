'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type ClubStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface Club {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  leadership?: string | null;
  presidentName?: string | null;
  isSchoolClub: boolean;
  contactEmail?: string | null;
  status: ClubStatus;
  createdAt: string;
  updatedAt: string;
}

const statusStyles: Record<ClubStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-700 border border-amber-200',
  APPROVED: 'bg-green-100 text-green-700 border border-green-200',
  REJECTED: 'bg-red-100 text-red-700 border border-red-200',
};

export default function ClubsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [router, status]);

  useEffect(() => {
    if (!session) {
      return;
    }

    if (session.user.role === 'admin') {
      router.push('/admin');
    }
  }, [router, session]);

  const fetchClubs = async () => {
    const response = await fetch('/api/clubs');
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to load clubs');
    }

    setClubs(data.clubs || []);
  };

  useEffect(() => {
    if (!session) {
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        await fetchClubs();
      } catch (err) {
        console.error('Error loading clubs:', err);
        setError(err instanceof Error ? err.message : 'Failed to load page data');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [session]);

  const categories = useMemo(() => {
    const uniqueCategories = new Set<string>();
    clubs.forEach((club) => {
      if (club.category && club.category.trim()) {
        uniqueCategories.add(club.category.trim());
      }
    });
    return Array.from(uniqueCategories).sort();
  }, [clubs]);

  const filteredClubs = useMemo(() => {
    let filtered = clubs;

    if (activeCategory !== 'All') {
      filtered = filtered.filter((club) => club.category === activeCategory);
    }

    if (search.trim()) {
      const query = search.toLowerCase();
      filtered = filtered.filter(
        (club) =>
          club.name.toLowerCase().includes(query) ||
          club.description?.toLowerCase().includes(query) ||
          club.leadership?.toLowerCase().includes(query) ||
          club.presidentName?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [clubs, activeCategory, search]);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading your student portal…</p>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const isStudent = session.user.role === 'student';

  return (
    <div className="min-h-screen">
      <main className="max-w-7xl mx-auto px-6 py-12">
        <header className="mb-12">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 md:gap-8">
            <div>
              <p className="text-sm uppercase tracking-wide text-slate-500 font-semibold mb-2">
                Explore & Connect
              </p>
              <h1 className="text-4xl font-bold text-slate-900">
                Discover Clubs That Match Your Interests
              </h1>
              <p className="mt-3 text-slate-600 max-w-2xl">
                {isStudent
                  ? 'Browse all active clubs on campus. Find your next passion, meet classmates who share your interests, and get involved.'
                  : 'Browse the student clubs available on campus.'}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/organizations#submit-organization"
                className="px-5 py-3 rounded-lg bg-blue-600 text-white text-sm font-semibold shadow-sm hover:bg-blue-700 transition-colors"
              >
                Submit an Organization
              </Link>
              <Link
                href="/dashboard"
                className="px-5 py-3 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 mb-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="w-full lg:w-2/5">
              <label className="block text-sm font-medium text-slate-500 mb-2">Search clubs</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      fillRule="evenodd"
                      d="M9 3.5a5.5 5.5 0 103.43 9.86l3.1 3.1a.75.75 0 101.06-1.06l-3.1-3.1A5.5 5.5 0 009 3.5zM4.5 9a4.5 4.5 0 118.53 2.09.75.75 0 00-.12.12A4.5 4.5 0 014.5 9z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Try 'Robotics', 'Service', or 'Leadership'"
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-300 focus:border-blue-500 text-sm text-slate-700 placeholder:text-slate-400"
                />
              </div>
            </div>
            <div className="w-full lg:w-3/5">
              <p className="text-sm font-medium text-slate-500 mb-3">Filter by category</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setActiveCategory('All')}
                  className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
                    activeCategory === 'All'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  All Clubs
                </button>
                {categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setActiveCategory(category)}
                    className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
                      activeCategory === category
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-slate-900">Clubs Directory</h2>
            <p className="text-sm text-slate-500">
              Showing {filteredClubs.length} club{filteredClubs.length === 1 ? '' : 's'}
            </p>
          </div>

          {filteredClubs.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
              <h3 className="text-xl font-semibold text-slate-900 mb-2">No clubs found</h3>
              <p className="text-slate-500 mb-6">
                Try adjusting your search or selecting a different category. Need help finding
                something?
              </p>
              <a
                href="mailto:activities@actifyhs.org"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors text-sm font-medium"
              >
                Contact Student Activities
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3"
                  />
                </svg>
              </a>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredClubs.map((club) => (
                <article
                  key={club.id}
                  className="bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="p-6 flex flex-col gap-4 h-full">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        {club.category && (
                          <p className="text-xs uppercase tracking-wide font-semibold text-blue-600">
                            {club.category}
                          </p>
                        )}
                        <h3 className="text-xl font-semibold text-slate-900 mt-1">{club.name}</h3>
                      </div>
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${statusStyles[club.status]}`}
                      >
                        {club.status.charAt(0) + club.status.slice(1).toLowerCase()}
                      </span>
                    </div>

                    <p className="text-sm text-slate-600 leading-relaxed">
                      {club.description || 'No description provided.'}
                    </p>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-600 space-y-3">
                      {club.leadership && (
                        <div className="flex items-start gap-3">
                          <span className="text-slate-400 mt-0.5">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              className="w-5 h-5"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                              />
                            </svg>
                          </span>
                          <div>
                            <p className="font-medium text-slate-900">Leadership & Advisor</p>
                            <p>{club.leadership}</p>
                          </div>
                        </div>
                      )}
                      {club.presidentName && (
                        <div className="flex items-start gap-3">
                          <span className="text-slate-400 mt-0.5">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              className="w-5 h-5"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                              />
                            </svg>
                          </span>
                          <div>
                            <p className="font-medium text-slate-900">President / Lead</p>
                            <p>{club.presidentName}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-auto flex flex-col gap-3">
                      {club.contactEmail && (
                        <a
                          href={`mailto:${club.contactEmail}?subject=${encodeURIComponent(
                            `Interested in ${club.name}`
                          )}`}
                          className="inline-flex items-center justify-center w-full px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
                        >
                          Contact Club Leaders
                        </a>
                      )}
                      <Link
                        href="/organizations#your-submissions"
                        className="text-center text-xs font-medium text-slate-500 hover:text-blue-600 transition-colors"
                      >
                        Manage my submissions →
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-6 text-sm text-slate-500 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p>&copy; {new Date().getFullYear()} Actify Student Life. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a href="/dashboard" className="hover:text-slate-700">
              Back to Student Dashboard
            </a>
            <a href="mailto:activities@actifyhs.org" className="hover:text-slate-700">
              Contact Activities Office
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
