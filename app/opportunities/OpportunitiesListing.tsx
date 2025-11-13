"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { OpportunityCard } from "@/components/opportunities/OpportunityCard";
import { FilterChips, QuickFilterChips } from "@/components/opportunities/FilterChips";
import { FilterPanel } from "@/components/opportunities/FilterPanel";
import { Sheet, SheetHeader, SheetTitle, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { Search, Filter, Grid, List } from "lucide-react";
import { filtersToSearchParams, parseFilters } from "@/lib/filters";
import { downloadICalFile } from "@/lib/calendar";
import { motion, AnimatePresence } from "framer-motion";

export function OpportunitiesListing() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  
  const [editions, setEditions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  
  // Parse current filters
  const currentFilters = parseFilters(searchParams);
  
  const fetchOpportunities = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(searchParams);
      const response = await fetch(`/api/opportunities?${params.toString()}`);
      const data = await response.json();
      
      setEditions(data.editions || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("Error fetching opportunities:", error);
    } finally {
      setLoading(false);
    }
  }, [searchParams]);
  
  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);
  
  const updateFilters = (newFilters: Partial<typeof currentFilters>) => {
    const merged = { ...currentFilters, ...newFilters, page: 1 };
    const params = filtersToSearchParams(merged);
    router.push(`/opportunities?${params.toString()}`);
  };
  
  const removeFilter = (key: string) => {
    const params = new URLSearchParams(searchParams);
    params.delete(key);
    router.push(`/opportunities?${params.toString()}`);
  };
  
  const clearAllFilters = () => {
    router.push("/opportunities");
  };
  
  const handleSearch = () => {
    updateFilters({ q: searchQuery });
  };
  
  const handleSave = async (editionId: string) => {
    try {
      await fetch(`/api/editions/${editionId}/save`, { method: "POST" });
      fetchOpportunities();
    } catch (error) {
      console.error("Error saving:", error);
    }
  };
  
  const handleFollow = async (editionId: string) => {
    try {
      await fetch(`/api/editions/${editionId}/follow`, { method: "POST" });
      fetchOpportunities();
    } catch (error) {
      console.error("Error following:", error);
    }
  };
  
  const handleExportCalendar = (edition: any) => {
    const opportunity = edition.opportunity;
    downloadICalFile({
      uid: edition.icsUid || edition.id,
      title: opportunity.name,
      description: opportunity.description || "",
      location: opportunity.location ? 
        [opportunity.location.city, opportunity.location.state, opportunity.location.country]
          .filter(Boolean)
          .join(", ") : undefined,
      url: opportunity.website || "",
      startDate: edition.eventStart ? new Date(edition.eventStart) : new Date(edition.registrationDeadline),
      endDate: edition.eventEnd ? new Date(edition.eventEnd) : new Date(edition.registrationDeadline),
      organizer: opportunity.provider?.name,
    });
  };

  const handleFiltersChange = (newFilters: any) => {
    const params = filtersToSearchParams({ ...newFilters, page: 1 });
    router.push(`/opportunities?${params.toString()}`);
    setFilterDrawerOpen(false);
  };
  
  // Build active filter chips
  const activeFilters = [];
  if (currentFilters.type) {
    activeFilters.push({
      label: `Type: ${currentFilters.type}`,
      value: "type",
      onRemove: () => removeFilter("type"),
    });
  }
  if (currentFilters.modality) {
    activeFilters.push({
      label: `Mode: ${currentFilters.modality}`,
      value: "modality",
      onRemove: () => removeFilter("modality"),
    });
  }
  if (currentFilters.domain) {
    activeFilters.push({
      label: `Domain: ${currentFilters.domain}`,
      value: "domain",
      onRemove: () => removeFilter("domain"),
    });
  }
  if (currentFilters.status) {
    activeFilters.push({
      label: `Status: ${currentFilters.status}`,
      value: "status",
      onRemove: () => removeFilter("status"),
    });
  }
  if (currentFilters.doneAtMySchool === "true") {
    activeFilters.push({
      label: "Done at my school",
      value: "doneAtMySchool",
      onRemove: () => removeFilter("doneAtMySchool"),
    });
  }
  if (currentFilters.popular === "true") {
    activeFilters.push({
      label: "Popular",
      value: "popular",
      onRemove: () => removeFilter("popular"),
    });
  }
  
  // Quick filter chips
  const quickFilters = [
    {
      label: "🔥 Popular",
      active: currentFilters.popular === "true",
      onClick: () => updateFilters({ popular: currentFilters.popular === "true" ? undefined : "true" }),
    },
    {
      label: "🎯 Open Now",
      active: currentFilters.status === "open",
      onClick: () => updateFilters({ status: currentFilters.status === "open" ? undefined : "open" }),
    },
    {
      label: "💰 Free",
      active: currentFilters.free === "true",
      onClick: () => updateFilters({ free: currentFilters.free === "true" ? undefined : "true" }),
    },
    {
      label: "🌐 Online",
      active: currentFilters.modality === "online",
      onClick: () => updateFilters({ modality: currentFilters.modality === "online" ? undefined : "online" }),
    },
    {
      label: "👥 Team",
      active: currentFilters.structure === "team",
      onClick: () => updateFilters({ structure: currentFilters.structure === "team" ? undefined : "team" }),
    },
  ];
  
  if (status === "unauthenticated") {
    router.push("/auth/signin");
    return null;
  }
  
  if (status === "loading" || loading) {
    return <LoadingSkeleton />;
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
              <span className="text-sm text-slate-500">Opportunities</span>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors">
                Dashboard
              </Link>
              <Link href="/opportunities/petition/new" className="px-4 py-2 text-sm font-medium text-blue-700 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors">
                + Suggest Opportunity
              </Link>
              <button onClick={() => signOut({ callbackUrl: "/auth/signin" })} className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors">
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>
      
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Header with Aurora Background */}
        <AuroraBackground className="!h-auto rounded-2xl p-6 md:p-10 mb-12" showRadialGradient>
          <header className="relative z-10 w-full">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-wide text-slate-600 dark:text-slate-300 font-semibold mb-2">
                  Explore & Discover
                </p>
                <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
                  High School Opportunities
                </h1>
                <p className="mt-3 text-slate-700 dark:text-slate-300 max-w-2xl">
                  Find competitions, programs, scholarships, internships, and more opportunities curated for high school students.
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  size="icon" 
                  onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
                  variant="shimmer"
                  className={viewMode === "grid" 
                    ? "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    : "bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                  }
                >
                  {viewMode === "grid" ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
                </Button>
                <Button 
                  onClick={() => setFilterDrawerOpen(true)}
                  variant="shimmer"
                  className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                >
                  <Filter className="h-4 w-4" />
                  Filters
                  {Object.keys(currentFilters).filter(k => k !== 'page' && k !== 'pageSize' && k !== 'q').length > 0 && (
                    <Badge variant="default" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                      {Object.keys(currentFilters).filter(k => k !== 'page' && k !== 'pageSize' && k !== 'q').length}
                    </Badge>
                  )}
                </Button>
              </div>
            </div>
          </header>
        </AuroraBackground>
        
        {/* Search & Quick Filters */}
        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 mb-10">
          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search opportunities by name, organizer, or topic..."
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-300 focus:border-blue-500 text-sm text-slate-800 placeholder:text-slate-500 dark:bg-slate-900 dark:text-slate-200 dark:placeholder:text-slate-400 dark:border-slate-700"
              />
            </div>
            <Button onClick={handleSearch}>Search</Button>
          </div>
          
          <QuickFilterChips filters={quickFilters} />
          
          {activeFilters.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <FilterChips filters={activeFilters} onClearAll={clearAllFilters} />
            </div>
          )}
        </section>
        
        {/* Results */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-slate-900">
            {total} Opportunit{total === 1 ? "y" : "ies"}
          </h2>
          <select
            value={currentFilters.sort || "relevance"}
            onChange={(e) => updateFilters({ sort: e.target.value as any })}
            className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 bg-white dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-300"
          >
            <option value="relevance">Most relevant</option>
            <option value="deadlineSoon">Deadline soon</option>
            <option value="newest">Newest / Recently updated</option>
            <option value="awardHigh">Award amount (high → low)</option>
            <option value="costLow">Cost (low → high)</option>
            <option value="popularityDesc">Popularity (high → low)</option>
          </select>
        </div>
        
        {editions.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No opportunities found</h3>
            <p className="text-slate-500 mb-6">
              Try adjusting your filters or search terms.
            </p>
            <Button onClick={clearAllFilters} variant="shimmer">
              Clear all filters
            </Button>
          </div>
        ) : (
          <motion.div
            className={viewMode === "grid" ? "grid gap-6 md:grid-cols-2 lg:grid-cols-3" : "space-y-4"}
            layout
          >
            <AnimatePresence mode="popLayout">
              {editions.map((edition) => (
                <OpportunityCard
                  key={edition.id}
                  edition={edition}
                  onSave={() => handleSave(edition.id)}
                  onFollow={() => handleFollow(edition.id)}
                  onExportCalendar={() => handleExportCalendar(edition)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
        
        {/* Pagination */}
        {total > currentFilters.pageSize && (
          <div className="mt-12 flex justify-center gap-2">
            {currentFilters.page > 1 && (
              <Button variant="shimmer" onClick={() => updateFilters({ page: currentFilters.page - 1 })}>
                Previous
              </Button>
            )}
            <div className="flex items-center gap-2 px-4">
              <span className="text-sm text-slate-600">
                Page {currentFilters.page} of {Math.ceil(total / currentFilters.pageSize)}
              </span>
            </div>
            {currentFilters.page < Math.ceil(total / currentFilters.pageSize) && (
              <Button variant="shimmer" onClick={() => updateFilters({ page: currentFilters.page + 1 })}>
                Next
              </Button>
            )}
          </div>
        )}
      </main>

      {/* Filter Drawer */}
      <Sheet open={filterDrawerOpen} onOpenChange={setFilterDrawerOpen} side="left">
        <SheetHeader onClose={() => setFilterDrawerOpen(false)}>
          <SheetTitle>Advanced Filters</SheetTitle>
        </SheetHeader>
        <SheetContent>
          <FilterPanel
            currentFilters={currentFilters}
            onFiltersChange={handleFiltersChange}
            userSchoolId={session?.user?.schoolId}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-12 bg-slate-200 rounded w-1/3"></div>
          <div className="h-24 bg-slate-200 rounded"></div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-96 bg-slate-200 rounded-2xl"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

