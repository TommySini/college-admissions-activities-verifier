"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type DifficultyLevel = "Beginner" | "Intermediate" | "Advanced";
type CompetitionType = "Trading" | "Investment" | "Case Study" | "Quiz" | "Hackathon" | "Other";

interface FinanceCompetition {
  id: string;
  name: string;
  organizer: string;
  type: CompetitionType;
  difficulty: DifficultyLevel;
  registrationDeadline: string; // ISO date string
  competitionDate: string; // ISO date string
  endDate?: string; // ISO date string for multi-day competitions
  prizeAmount: string;
  prizeDescription: string;
  description: string;
  eligibility: string;
  websiteUrl: string;
  location: "Online" | "In-Person" | "Hybrid";
  maxTeamSize?: number;
  registrationFee?: string;
  tags: string[];
}

// Sample finance competition data
const COMPETITIONS: FinanceCompetition[] = [
  {
    id: "1",
    name: "Wharton Investment Competition",
    organizer: "Wharton School of Business",
    type: "Investment",
    difficulty: "Advanced",
    registrationDeadline: "2025-01-15",
    competitionDate: "2025-02-10",
    endDate: "2025-02-15",
    prizeAmount: "$10,000",
    prizeDescription: "First place: $5,000, Second: $3,000, Third: $2,000",
    description: "A prestigious investment competition where teams manage a virtual portfolio and compete for the highest returns.",
    eligibility: "High school students (grades 9-12)",
    websiteUrl: "https://example.com/wharton-competition",
    location: "Online",
    tags: ["Investment", "Portfolio Management", "Finance"],
  },
  {
    id: "2",
    name: "Fed Challenge",
    organizer: "Federal Reserve",
    type: "Case Study",
    difficulty: "Advanced",
    registrationDeadline: "2025-02-01",
    competitionDate: "2025-03-20",
    prizeAmount: "Scholarships",
    prizeDescription: "Winners receive scholarships and recognition from the Federal Reserve",
    description: "Teams analyze economic conditions and present monetary policy recommendations to Federal Reserve judges.",
    eligibility: "High school students",
    websiteUrl: "https://example.com/fed-challenge",
    location: "In-Person",
    tags: ["Economics", "Monetary Policy", "Public Speaking"],
  },
  {
    id: "3",
    name: "Stock Market Game",
    organizer: "SIFMA Foundation",
    type: "Trading",
    difficulty: "Beginner",
    registrationDeadline: "2025-01-20",
    competitionDate: "2025-02-01",
    endDate: "2025-04-30",
    prizeAmount: "Various Prizes",
    prizeDescription: "Regional and national prizes for top-performing teams",
    description: "A 10-week simulation where students invest a virtual $100,000 in stocks, bonds, and mutual funds.",
    eligibility: "Students in grades 4-12",
    websiteUrl: "https://example.com/stock-market-game",
    location: "Online",
    tags: ["Trading", "Stocks", "Investing"],
  },
  {
    id: "4",
    name: "DECA Finance Challenge",
    organizer: "DECA Inc.",
    type: "Case Study",
    difficulty: "Intermediate",
    registrationDeadline: "2025-01-10",
    competitionDate: "2025-02-25",
    prizeAmount: "Scholarships & Awards",
    prizeDescription: "Scholarships and recognition at regional and national levels",
    description: "Students analyze financial scenarios and present solutions to business professionals.",
    eligibility: "DECA members in grades 9-12",
    websiteUrl: "https://example.com/deca-finance",
    location: "Hybrid",
    tags: ["Business", "Finance", "Case Study"],
  },
  {
    id: "5",
    name: "Finance Olympiad",
    organizer: "International Finance Education",
    type: "Quiz",
    difficulty: "Intermediate",
    registrationDeadline: "2025-02-15",
    competitionDate: "2025-03-10",
    prizeAmount: "$5,000",
    prizeDescription: "Top 3 teams receive cash prizes and certificates",
    description: "A comprehensive quiz competition covering financial markets, economics, and investment strategies.",
    eligibility: "High school students worldwide",
    websiteUrl: "https://example.com/finance-olympiad",
    location: "Online",
    maxTeamSize: 3,
    tags: ["Quiz", "Finance Knowledge", "Global"],
  },
  {
    id: "6",
    name: "FinTech Innovation Hackathon",
    organizer: "Tech Finance Alliance",
    type: "Hackathon",
    difficulty: "Advanced",
    registrationDeadline: "2025-02-20",
    competitionDate: "2025-03-15",
    endDate: "2025-03-16",
    prizeAmount: "$15,000",
    prizeDescription: "First: $7,500, Second: $4,500, Third: $3,000",
    description: "Build innovative financial technology solutions in a 48-hour hackathon.",
    eligibility: "High school and college students",
    websiteUrl: "https://example.com/fintech-hackathon",
    location: "Hybrid",
    maxTeamSize: 5,
    registrationFee: "$25",
    tags: ["FinTech", "Coding", "Innovation"],
  },
  {
    id: "7",
    name: "Personal Finance Challenge",
    organizer: "Jump$tart Coalition",
    type: "Quiz",
    difficulty: "Beginner",
    registrationDeadline: "2025-01-30",
    competitionDate: "2025-02-20",
    prizeAmount: "Certificates & Recognition",
    prizeDescription: "Certificates for all participants, special recognition for top performers",
    description: "Test your knowledge of personal finance, budgeting, credit, and financial planning.",
    eligibility: "Students in grades 6-12",
    websiteUrl: "https://example.com/personal-finance-challenge",
    location: "Online",
    tags: ["Personal Finance", "Budgeting", "Financial Literacy"],
  },
  {
    id: "8",
    name: "Cryptocurrency Trading Competition",
    organizer: "Crypto Education Network",
    type: "Trading",
    difficulty: "Intermediate",
    registrationDeadline: "2025-02-10",
    competitionDate: "2025-03-01",
    endDate: "2025-03-31",
    prizeAmount: "$8,000",
    prizeDescription: "Top traders receive cash prizes and mentorship opportunities",
    description: "Compete in a month-long cryptocurrency trading simulation with real-time market data.",
    eligibility: "High school students (ages 14-18)",
    websiteUrl: "https://example.com/crypto-competition",
    location: "Online",
    tags: ["Cryptocurrency", "Trading", "Blockchain"],
  },
];

export default function FinanceCompetitionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedCompetition, setSelectedCompetition] = useState<FinanceCompetition | null>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<CompetitionType | "All">("All");
  const [filterDifficulty, setFilterDifficulty] = useState<DifficultyLevel | "All">("All");
  const [filterLocation, setFilterLocation] = useState<"All" | "Online" | "In-Person" | "Hybrid">("All");
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }
    
    if (!session || status !== "authenticated") {
      return;
    }
  }, [status, session, router]);

  useEffect(() => {
    // Load bookmarks from localStorage
    const saved = localStorage.getItem("finance-competition-bookmarks");
    if (saved) {
      setBookmarkedIds(new Set(JSON.parse(saved)));
    }
  }, []);

  const toggleBookmark = (id: string) => {
    const newBookmarks = new Set(bookmarkedIds);
    if (newBookmarks.has(id)) {
      newBookmarks.delete(id);
    } else {
      newBookmarks.add(id);
    }
    setBookmarkedIds(newBookmarks);
    localStorage.setItem("finance-competition-bookmarks", JSON.stringify(Array.from(newBookmarks)));
  };

  const filteredCompetitions = useMemo(() => {
    let competitions = COMPETITIONS;

    // Search filter
    if (search.trim()) {
      const query = search.toLowerCase();
      competitions = competitions.filter(
        (comp) =>
          comp.name.toLowerCase().includes(query) ||
          comp.organizer.toLowerCase().includes(query) ||
          comp.description.toLowerCase().includes(query) ||
          comp.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Type filter
    if (filterType !== "All") {
      competitions = competitions.filter((comp) => comp.type === filterType);
    }

    // Difficulty filter
    if (filterDifficulty !== "All") {
      competitions = competitions.filter((comp) => comp.difficulty === filterDifficulty);
    }

    // Location filter
    if (filterLocation !== "All") {
      competitions = competitions.filter((comp) => comp.location === filterLocation);
    }

    return competitions;
  }, [search, filterType, filterDifficulty, filterLocation]);

  // Get competitions for the selected month
  const competitionsForMonth = useMemo(() => {
    return filteredCompetitions.filter((comp) => {
      const compDate = new Date(comp.competitionDate);
      return compDate.getMonth() === selectedMonth && compDate.getFullYear() === selectedYear;
    });
  }, [filteredCompetitions, selectedMonth, selectedYear]);

  // Calendar helper functions
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1).getDay();
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const getCompetitionsForDate = (day: number) => {
    const date = new Date(selectedYear, selectedMonth, day);
    return filteredCompetitions.filter((comp) => {
      const compDate = new Date(comp.competitionDate);
      return (
        compDate.getDate() === date.getDate() &&
        compDate.getMonth() === date.getMonth() &&
        compDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const navigateMonth = (direction: "prev" | "next") => {
    if (direction === "prev") {
      if (selectedMonth === 0) {
        setSelectedMonth(11);
        setSelectedYear(selectedYear - 1);
      } else {
        setSelectedMonth(selectedMonth - 1);
      }
    } else {
      if (selectedMonth === 11) {
        setSelectedMonth(0);
        setSelectedYear(selectedYear + 1);
      } else {
        setSelectedMonth(selectedMonth + 1);
      }
    }
  };

  const exportToCalendar = (competition: FinanceCompetition) => {
    const startDate = new Date(competition.competitionDate);
    const endDate = competition.endDate ? new Date(competition.endDate) : startDate;
    
    // Create iCal format
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    };

    const icalContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Finance Competitions//EN",
      "BEGIN:VEVENT",
      `DTSTART:${formatDate(startDate)}`,
      `DTEND:${formatDate(endDate)}`,
      `SUMMARY:${competition.name}`,
      `DESCRIPTION:${competition.description}\\n\\nOrganizer: ${competition.organizer}\\nPrize: ${competition.prizeAmount}`,
      `LOCATION:${competition.location}`,
      `URL:${competition.websiteUrl}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([icalContent], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${competition.name.replace(/\s+/g, "-")}.ics`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50">
      {/* Navigation */}
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
              <span className="text-sm text-slate-500">Finance Competitions</span>
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
                Extracurricular Opportunities
              </p>
              <h1 className="text-4xl font-bold text-slate-900">
                Finance Competitions Database
              </h1>
              <p className="mt-3 text-slate-600 max-w-2xl">
                Discover and track finance competitions, trading challenges, and investment opportunities. 
                Plan your participation with our interactive calendar.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setViewMode(viewMode === "calendar" ? "list" : "calendar")}
                className="px-5 py-3 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-2"
              >
                {viewMode === "calendar" ? (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                    List View
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Calendar View
                  </>
                )}
              </button>
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
          <div className="space-y-6">
            {/* Search */}
            <div className="w-full">
              <label className="block text-sm font-medium text-slate-500 mb-2">
                Search competitions
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 103.43 9.86l3.1 3.1a.75.75 0 101.06-1.06l-3.1-3.1A5.5 5.5 0 009 3.5zM4.5 9a4.5 4.5 0 118.53 2.09.75.75 0 00-.12.12A4.5 4.5 0 014.5 9z" clipRule="evenodd" />
                  </svg>
                </span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, organizer, or topic..."
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-300 focus:border-blue-500 text-sm text-slate-700 placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-3">Filter by type</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setFilterType("All")}
                    className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
                      filterType === "All"
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    All
                  </button>
                  {(["Trading", "Investment", "Case Study", "Quiz", "Hackathon", "Other"] as CompetitionType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFilterType(type)}
                      className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
                        filterType === type
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-500 mb-3">Filter by difficulty</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setFilterDifficulty("All")}
                    className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
                      filterDifficulty === "All"
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    All
                  </button>
                  {(["Beginner", "Intermediate", "Advanced"] as DifficultyLevel[]).map((difficulty) => (
                    <button
                      key={difficulty}
                      type="button"
                      onClick={() => setFilterDifficulty(difficulty)}
                      className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
                        filterDifficulty === difficulty
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      {difficulty}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-500 mb-3">Filter by location</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setFilterLocation("All")}
                    className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
                      filterLocation === "All"
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    All
                  </button>
                  {(["Online", "In-Person", "Hybrid"] as const).map((location) => (
                    <button
                      key={location}
                      type="button"
                      onClick={() => setFilterLocation(location)}
                      className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
                        filterLocation === location
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      {location}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-slate-900">
            {viewMode === "calendar" ? "Calendar View" : "List View"}
          </h2>
          <p className="text-sm text-slate-500">
            Showing {filteredCompetitions.length} competition{filteredCompetitions.length === 1 ? "" : "s"}
            {bookmarkedIds.size > 0 && ` • ${bookmarkedIds.size} bookmarked`}
          </p>
        </div>

        {/* Calendar View */}
        {viewMode === "calendar" && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => navigateMonth("prev")}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h3 className="text-2xl font-bold text-slate-900">
                {monthNames[selectedMonth]} {selectedYear}
              </h3>
              <button
                onClick={() => navigateMonth("next")}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
              {/* Day headers */}
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="text-center text-sm font-semibold text-slate-600 py-2">
                  {day}
                </div>
              ))}

              {/* Empty cells for days before month starts */}
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}

              {/* Calendar days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const competitions = getCompetitionsForDate(day);
                const isToday =
                  day === new Date().getDate() &&
                  selectedMonth === new Date().getMonth() &&
                  selectedYear === new Date().getFullYear();

                return (
                  <div
                    key={day}
                    className={`aspect-square border border-slate-200 rounded-lg p-2 ${
                      isToday ? "bg-blue-50 border-blue-300" : "bg-white"
                    } ${competitions.length > 0 ? "hover:bg-slate-50 cursor-pointer" : ""}`}
                    onClick={() => competitions.length > 0 && setSelectedCompetition(competitions[0])}
                  >
                    <div className={`text-sm font-medium mb-1 ${isToday ? "text-blue-600" : "text-slate-700"}`}>
                      {day}
                    </div>
                    {competitions.length > 0 && (
                      <div className="space-y-1">
                        {competitions.slice(0, 2).map((comp) => (
                          <div
                            key={comp.id}
                            className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded truncate"
                            title={comp.name}
                          >
                            {comp.name}
                          </div>
                        ))}
                        {competitions.length > 2 && (
                          <div className="text-xs text-slate-500">+{competitions.length - 2} more</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Competitions for selected month */}
            {competitionsForMonth.length > 0 && (
              <div className="mt-8 pt-6 border-t border-slate-200">
                <h4 className="text-lg font-semibold text-slate-900 mb-4">
                  Competitions in {monthNames[selectedMonth]} {selectedYear}
                </h4>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {competitionsForMonth.map((competition) => (
                    <CompetitionCard
                      key={competition.id}
                      competition={competition}
                      isBookmarked={bookmarkedIds.has(competition.id)}
                      onBookmark={() => toggleBookmark(competition.id)}
                      onClick={() => setSelectedCompetition(competition)}
                      onExport={() => exportToCalendar(competition)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* List View */}
        {viewMode === "list" && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredCompetitions.length === 0 ? (
              <div className="col-span-full bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
                <h3 className="text-xl font-semibold text-slate-900 mb-2">No competitions found</h3>
                <p className="text-slate-500">
                  Try adjusting your search or filters to find competitions.
                </p>
              </div>
            ) : (
              filteredCompetitions.map((competition) => (
                <CompetitionCard
                  key={competition.id}
                  competition={competition}
                  isBookmarked={bookmarkedIds.has(competition.id)}
                  onBookmark={() => toggleBookmark(competition.id)}
                  onClick={() => setSelectedCompetition(competition)}
                  onExport={() => exportToCalendar(competition)}
                />
              ))
            )}
          </div>
        )}

        {/* Competition Details Modal */}
        {selectedCompetition && (
          <CompetitionModal
            competition={selectedCompetition}
            isBookmarked={bookmarkedIds.has(selectedCompetition.id)}
            onBookmark={() => toggleBookmark(selectedCompetition.id)}
            onClose={() => setSelectedCompetition(null)}
            onExport={() => exportToCalendar(selectedCompetition)}
          />
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 mt-24">
        <div className="max-w-7xl mx-auto px-6 py-6 text-sm text-slate-500 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p>&copy; {new Date().getFullYear()} Actify. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="hover:text-slate-700">
              Back to Dashboard
            </Link>
            <a href="mailto:activities@actifyhs.org" className="hover:text-slate-700">
              Contact Activities Office
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function CompetitionCard({
  competition,
  isBookmarked,
  onBookmark,
  onClick,
  onExport,
}: {
  competition: FinanceCompetition;
  isBookmarked: boolean;
  onBookmark: () => void;
  onClick: () => void;
  onExport: () => void;
}) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const isRegistrationOpen = new Date(competition.registrationDeadline) >= new Date();
  const daysUntilDeadline = Math.ceil(
    (new Date(competition.registrationDeadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <article
      className="bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="p-6 flex flex-col gap-4 h-full">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-xl font-semibold text-slate-900">{competition.name}</h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onBookmark();
                }}
                className="text-slate-400 hover:text-yellow-500 transition-colors"
              >
                <svg
                  className={`w-5 h-5 ${isBookmarked ? "fill-yellow-500 text-yellow-500" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                  />
                </svg>
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-2">{competition.organizer}</p>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-medium border border-blue-100">
                {competition.type}
              </span>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                  competition.difficulty === "Beginner"
                    ? "bg-green-50 text-green-600 border-green-100"
                    : competition.difficulty === "Intermediate"
                    ? "bg-yellow-50 text-yellow-600 border-yellow-100"
                    : "bg-red-50 text-red-600 border-red-100"
                }`}
              >
                {competition.difficulty}
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-50 text-slate-600 text-xs font-medium border border-slate-100">
                {competition.location}
              </span>
            </div>
          </div>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed line-clamp-2">{competition.description}</p>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-600 space-y-2">
          <div className="flex items-start gap-3">
            <span className="text-slate-400 mt-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12.75h6.75m-6.75 3H12m3.75-9H12m-9 .375v12.75c0 1.012.818 1.83 1.83 1.83h12.75c1.012 0 1.83-.818 1.83-1.83V6.375c0-1.012-.818-1.83-1.83-1.83H4.83c-1.012 0-1.83.818-1.83 1.83z" />
              </svg>
            </span>
            <div>
              <p className="font-medium text-slate-900">Competition Date</p>
              <p>{formatDate(competition.competitionDate)}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-slate-400 mt-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            <div>
              <p className="font-medium text-slate-900">Registration Deadline</p>
              <p className={isRegistrationOpen ? "" : "text-red-600"}>
                {formatDate(competition.registrationDeadline)}
                {isRegistrationOpen && daysUntilDeadline > 0 && (
                  <span className="ml-2 text-xs">({daysUntilDeadline} days left)</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-slate-400 mt-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.818.182L12 18l2.182-.636L15 15.182V6m-3 2.818L9.818 8.182 9 8v6.182l.818.182L12 15l2.182-.636L15 14.182V8l-.818.182L12 8.818z" />
              </svg>
            </span>
            <div>
              <p className="font-medium text-slate-900">Prize</p>
              <p>{competition.prizeAmount}</p>
            </div>
          </div>
        </div>

        <div className="mt-auto flex gap-2">
          <a
            href={competition.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            Learn More
          </a>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExport();
            }}
            className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-100 transition-colors"
            title="Export to calendar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      </div>
    </article>
  );
}

function CompetitionModal({
  competition,
  isBookmarked,
  onBookmark,
  onClose,
  onExport,
}: {
  competition: FinanceCompetition;
  isBookmarked: boolean;
  onBookmark: () => void;
  onClose: () => void;
  onExport: () => void;
}) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const isRegistrationOpen = new Date(competition.registrationDeadline) >= new Date();
  const daysUntilDeadline = Math.ceil(
    (new Date(competition.registrationDeadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-3xl font-bold text-slate-900">{competition.name}</h2>
                <button
                  onClick={onBookmark}
                  className="text-slate-400 hover:text-yellow-500 transition-colors"
                >
                  <svg
                    className={`w-6 h-6 ${isBookmarked ? "fill-yellow-500 text-yellow-500" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                    />
                  </svg>
                </button>
              </div>
              <p className="text-lg text-slate-600 mb-4">{competition.organizer}</p>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-sm font-medium border border-blue-100">
                  {competition.type}
                </span>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${
                    competition.difficulty === "Beginner"
                      ? "bg-green-50 text-green-600 border-green-100"
                      : competition.difficulty === "Intermediate"
                      ? "bg-yellow-50 text-yellow-600 border-yellow-100"
                      : "bg-red-50 text-red-600 border-red-100"
                  }`}
                >
                  {competition.difficulty}
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-50 text-slate-600 text-sm font-medium border border-slate-100">
                  {competition.location}
                </span>
                {competition.maxTeamSize && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-purple-50 text-purple-600 text-sm font-medium border border-purple-100">
                    Team size: {competition.maxTeamSize}
                  </span>
                )}
                {competition.registrationFee && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-orange-50 text-orange-600 text-sm font-medium border border-orange-100">
                    Fee: {competition.registrationFee}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Description */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Description</h3>
            <p className="text-slate-600 leading-relaxed">{competition.description}</p>
          </div>

          {/* Details Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Important Dates</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">Competition Date</p>
                  <p className="text-slate-900">{formatDate(competition.competitionDate)}</p>
                  {competition.endDate && (
                    <p className="text-slate-600 text-sm">to {formatDate(competition.endDate)}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Registration Deadline</p>
                  <p className={isRegistrationOpen ? "text-slate-900" : "text-red-600"}>
                    {formatDate(competition.registrationDeadline)}
                  </p>
                  {isRegistrationOpen && daysUntilDeadline > 0 && (
                    <p className="text-sm text-blue-600">
                      {daysUntilDeadline} day{daysUntilDeadline === 1 ? "" : "s"} remaining
                    </p>
                  )}
                  {!isRegistrationOpen && (
                    <p className="text-sm text-red-600">Registration closed</p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Prizes & Eligibility</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">Prize Amount</p>
                  <p className="text-slate-900 font-semibold">{competition.prizeAmount}</p>
                  <p className="text-sm text-slate-600 mt-1">{competition.prizeDescription}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Eligibility</p>
                  <p className="text-slate-900">{competition.eligibility}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tags */}
          {competition.tags.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {competition.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-6 border-t border-slate-200">
            <a
              href={competition.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
            >
              Visit Competition Website
            </a>
            <button
              onClick={onExport}
              className="px-6 py-3 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Export to Calendar
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

