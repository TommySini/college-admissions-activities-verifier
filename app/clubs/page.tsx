"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type ClubCategory =
  | "Academic"
  | "Arts"
  | "Community Service"
  | "Culture & Identity"
  | "Leadership"
  | "STEM"
  | "Wellness"
  | "Athletics";

interface Club {
  id: string;
  name: string;
  category: ClubCategory;
  description: string;
  meetingSchedule: string;
  location: string;
  advisor: string;
  contactEmail: string;
  highlights?: string[];
}

const CLUBS: Club[] = [
  {
    id: "club-student-council",
    name: "Student Council",
    category: "Leadership",
    description:
      "Represent the student body, plan school-wide events, and collaborate with administrators to enhance school culture.",
    meetingSchedule: "Mondays • 3:15 – 4:30 PM",
    location: "Room 204 • Activities Wing",
    advisor: "Ms. Alvarez",
    contactEmail: "studentcouncil@actifyhs.org",
    highlights: [
      "Open to grades 9 – 12",
      "Leadership workshops each semester",
      "Hosts the annual Winter Formal and Spirit Week",
    ],
  },
  {
    id: "club-robotics",
    name: "Robotics & Engineering",
    category: "STEM",
    description:
      "Design, build, and program robots for regional competitions while exploring engineering disciplines and teamwork.",
    meetingSchedule: "Tuesdays & Thursdays • 3:30 – 5:30 PM",
    location: "Innovation Lab • Lower Level",
    advisor: "Dr. Chen",
    contactEmail: "robotics@actifyhs.org",
    highlights: [
      "Competes in FIRST Robotics Challenge",
      "Access to 3D printers and CNC tools",
      "Beginner-friendly onboarding in September",
    ],
  },
  {
    id: "club-green-team",
    name: "Green Team",
    category: "Community Service",
    description:
      "Lead sustainability initiatives, manage the campus garden, and partner with local organizations for environmental advocacy.",
    meetingSchedule: "Wednesdays • 3:20 – 4:30 PM",
    location: "Room 118 • Science Building",
    advisor: "Mr. Patel",
    contactEmail: "greenteam@actifyhs.org",
    highlights: [
      "Organizes Earth Week campus-wide",
      "Hosts quarterly community clean-ups",
      "Manages recycling and composting on campus",
    ],
  },
  {
    id: "club-chorale",
    name: "Chorale Ensemble",
    category: "Arts",
    description:
      "Perform choral works from classical to contemporary genres. Vocal training, music theory, and seasonal performances.",
    meetingSchedule: "Tuesdays • 3:15 – 4:45 PM",
    location: "Performing Arts Center • Choir Room",
    advisor: "Mrs. Lang",
    contactEmail: "chorale@actifyhs.org",
    highlights: [
      "Performs at winter and spring concerts",
      "Auditions in September & January",
      "Collaborates with theater and orchestra",
    ],
  },
  {
    id: "club-model-un",
    name: "Model United Nations",
    category: "Academic",
    description:
      "Debate global issues, draft resolutions, and represent countries at regional conferences with other schools.",
    meetingSchedule: "Fridays • 3:15 – 4:30 PM",
    location: "Room 305 • Humanities Hall",
    advisor: "Mr. Davenport",
    contactEmail: "mun@actifyhs.org",
    highlights: [
      "Travels to three conferences annually",
      "Open to newcomers—training provided",
      "Hosts our school’s spring invitational",
    ],
  },
  {
    id: "club-latinx-alliance",
    name: "Latinx Student Alliance",
    category: "Culture & Identity",
    description:
      "Celebrate Latinx culture, host educational events, and create a supportive community for students and allies.",
    meetingSchedule: "Wednesdays • 3:30 – 4:30 PM",
    location: "Community Commons",
    advisor: "Ms. Rivera",
    contactEmail: "latinxalliance@actifyhs.org",
    highlights: [
      "Leads Hispanic Heritage Month programming",
      "Partners with local cultural organizations",
      "Hosts monthly family nights",
    ],
  },
  {
    id: "club-fitness",
    name: "Mind & Body Wellness Club",
    category: "Wellness",
    description:
      "Explore mindfulness, yoga, nutrition, and overall wellness through student-led workshops and guest speakers.",
    meetingSchedule: "Mondays • 3:20 – 4:20 PM",
    location: "Fitness Studio • Athletics Center",
    advisor: "Coach Williams",
    contactEmail: "wellnessclub@actifyhs.org",
    highlights: [
      "Weekly yoga and meditation sessions",
      "Hosts Wellness Week each spring",
      "Collaborates with school counselors",
    ],
  },
  {
    id: "club-journalism",
    name: "Digital Journalism & Media",
    category: "Academic",
    description:
      "Produce the school’s digital newspaper and podcast. Learn reporting, storytelling, and multimedia production.",
    meetingSchedule: "Tuesdays • 3:15 – 4:45 PM",
    location: "Media Lab • Library",
    advisor: "Ms. Nguyen",
    contactEmail: "journalism@actifyhs.org",
    highlights: [
      "Publishes monthly digital issues",
      "Hosts workshops with local journalists",
      "Opportunities in photography & design",
    ],
  },
  {
    id: "club-debate",
    name: "Speech & Debate",
    category: "Academic",
    description:
      "Sharpen public speaking and argumentation by competing in speech, Lincoln-Douglas, and policy debate formats.",
    meetingSchedule: "Mondays & Thursdays • 3:30 – 5:30 PM",
    location: "Room 210 • Humanities Hall",
    advisor: "Mr. Rios",
    contactEmail: "debate@actifyhs.org",
    highlights: [
      "Weekly practice rounds & coaching",
      "Travels to state and national tournaments",
      "Beginner workshops in September",
    ],
  },
  {
    id: "club-girls-who-code",
    name: "Girls Who Code",
    category: "STEM",
    description:
      "Support female and non-binary students in coding through collaborative projects, mentorship, and real-world applications.",
    meetingSchedule: "Wednesdays • 3:15 – 4:45 PM",
    location: "Innovation Lab • Lower Level",
    advisor: "Mrs. Thompson",
    contactEmail: "gwc@actifyhs.org",
    highlights: [
      "Project teams build community-focused apps",
      "Mentorship from alumnae in tech fields",
      "Hosts annual Spring Hackathon",
    ],
  },
  {
    id: "club-intramural-sports",
    name: "Intramural Sports League",
    category: "Athletics",
    description:
      "Join friendly, rotating seasonal leagues—basketball, futsal, pickleball, and ultimate frisbee. Open to all skill levels.",
    meetingSchedule: "Daily rotation • 3:30 – 5:00 PM",
    location: "Athletics Center & Turf Field",
    advisor: "Coach Martinez",
    contactEmail: "intramurals@actifyhs.org",
    highlights: [
      "Seasonal tournaments with prizes",
      "Open-gym hours on Fridays",
      "Co-ed teams encouraged",
    ],
  },
];

const CATEGORY_LABELS: Record<ClubCategory, string> = {
  Academic: "Academic",
  Arts: "Arts",
  "Community Service": "Community Service",
  "Culture & Identity": "Culture & Identity",
  Leadership: "Leadership",
  STEM: "STEM",
  Wellness: "Wellness",
  Athletics: "Athletics",
};

export default function ClubsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<ClubCategory | "All">("All");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [router, status]);

  useEffect(() => {
    if (!session) {
      return;
    }

    if (session.user.role === "verifier") {
      router.push("/dashboard");
    } else if (session.user.role === "admin") {
      router.push("/admin");
    }
  }, [router, session]);

  const filteredClubs = useMemo(() => {
    let clubs = CLUBS;

    if (activeCategory !== "All") {
      clubs = clubs.filter((club) => club.category === activeCategory);
    }

    if (search.trim()) {
      const query = search.toLowerCase();
      clubs = clubs.filter(
        (club) =>
          club.name.toLowerCase().includes(query) ||
          club.description.toLowerCase().includes(query) ||
          club.advisor.toLowerCase().includes(query) ||
          club.highlights?.some((item) => item.toLowerCase().includes(query))
      );
    }

    return clubs;
  }, [activeCategory, search]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading your student portal…</p>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const isStudent = session.user.role === "student";

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-sm">
                  <span className="text-white font-bold text-xl">A</span>
                </div>
                <span className="text-xl font-bold text-slate-900">Actify</span>
              </Link>
              <div className="h-6 w-px bg-slate-200 mx-2" />
              <span className="text-sm text-slate-500">Student Clubs Directory</span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/profile"
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Profile
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/auth/signin" })}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
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
                  ? "Browse all active clubs on campus. Find your next passion, meet classmates who share your interests, and get involved."
                  : "Browse the student clubs available on campus."}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="mailto:activities@actifyhs.org?subject=Start a Club Inquiry"
                className="px-5 py-3 rounded-lg bg-blue-600 text-white text-sm font-semibold shadow-sm hover:bg-blue-700 transition-colors"
              >
                Start a New Club
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

        {/* Search & Filters */}
        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 mb-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="w-full lg:w-2/5">
              <label className="block text-sm font-medium text-slate-500 mb-2">
                Search clubs
              </label>
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
                  placeholder="Try “Robotics”, “Service”, or “Leadership”"
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-300 focus:border-blue-500 text-sm text-slate-700 placeholder:text-slate-400"
                />
              </div>
            </div>
            <div className="w-full lg:w-3/5">
              <p className="text-sm font-medium text-slate-500 mb-3">Filter by category</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setActiveCategory("All")}
                  className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
                    activeCategory === "All"
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  All Clubs
                </button>
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveCategory(key as ClubCategory)}
                    className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
                      activeCategory === key
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Results */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-slate-900">Clubs Directory</h2>
            <p className="text-sm text-slate-500">
              Showing {filteredClubs.length} club{filteredClubs.length === 1 ? "" : "s"}
            </p>
          </div>

          {filteredClubs.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
              <h3 className="text-xl font-semibold text-slate-900 mb-2">No clubs found</h3>
              <p className="text-slate-500 mb-6">
                Try adjusting your search or selecting a different category. Need help finding something?
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
                      <div>
                        <p className="text-xs uppercase tracking-wide font-semibold text-blue-600">
                          {club.category}
                        </p>
                        <h3 className="text-xl font-semibold text-slate-900 mt-1">{club.name}</h3>
                      </div>
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-medium border border-blue-100">
                        {club.meetingSchedule.split("•")[0].trim()}
                      </span>
                    </div>

                    <p className="text-sm text-slate-600 leading-relaxed">{club.description}</p>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-600 space-y-2">
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
                              d="M8.625 12.75h6.75m-6.75 3H12m3.75-9H12m-9 .375v12.75c0 1.012.818 1.83 1.83 1.83h12.75c1.012 0 1.83-.818 1.83-1.83V6.375c0-1.012-.818-1.83-1.83-1.83H4.83c-1.012 0-1.83.818-1.83 1.83z"
                            />
                          </svg>
                        </span>
                        <div>
                          <p className="font-medium text-slate-900">Meeting Times</p>
                          <p>{club.meetingSchedule}</p>
                        </div>
                      </div>
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
                              d="M12 7.5a4.5 4.5 0 100 9 4.5 4.5 0 000-9z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 3v4.5M12 16.5V21M3 12h4.5M16.5 12H21M5.636 5.636l3.182 3.182M15.182 15.182l3.182 3.182M5.636 18.364l3.182-3.182M15.182 8.818l3.182-3.182"
                            />
                          </svg>
                        </span>
                        <div>
                          <p className="font-medium text-slate-900">Advisor</p>
                          <p>{club.advisor}</p>
                        </div>
                      </div>
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
                              d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19.5 10.5c0 7.456-7.5 11.25-7.5 11.25S4.5 17.956 4.5 10.5a7.5 7.5 0 1115 0z"
                            />
                          </svg>
                        </span>
                        <div>
                          <p className="font-medium text-slate-900">Location</p>
                          <p>{club.location}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-auto">
                      <div className="flex flex-wrap gap-2 mb-4">
                        {club.highlights?.map((highlight) => (
                          <span
                            key={highlight}
                            className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium"
                          >
                            {highlight}
                          </span>
                        ))}
                      </div>
                      <a
                        href={`mailto:${club.contactEmail}?subject=${encodeURIComponent(
                          `Interested in ${club.name}`
                        )}`}
                        className="inline-flex items-center justify-center w-full px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
                      >
                        Contact Club Leaders
                      </a>
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


