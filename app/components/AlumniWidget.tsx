'use client';

import Link from 'next/link';
import { GraduationCap, ArrowUpRight, Sparkles, Upload, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';

type AlumniProfile = {
  id: string;
  displayName?: string | null;
  intendedMajor?: string | null;
  university?: string | null;
  location?: string | null;
  createdAt: string;
};

type AlumniWidgetProps = {
  profiles: AlumniProfile[];
  total: number;
  uniqueMajors: number;
  newThisMonth: number;
  highlight: string;
  className?: string;
};

export function AlumniWidget({
  profiles,
  total,
  uniqueMajors,
  newThisMonth,
  highlight,
  className,
}: AlumniWidgetProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMajor, setSelectedMajor] = useState('');
  const [selectedApplicationType, setSelectedApplicationType] = useState('');
  const [selectedPrestige, setSelectedPrestige] = useState('');

  // Extract unique majors for filter
  const availableMajors = useMemo(() => {
    const majors = Array.from(new Set(profiles.map((p) => p.intendedMajor).filter(Boolean))).sort();
    return majors as string[];
  }, [profiles]);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('q', searchTerm);
    if (selectedMajor) params.set('major', selectedMajor);
    if (selectedApplicationType) params.set('applicationType', selectedApplicationType);
    if (selectedPrestige) params.set('prestige', selectedPrestige);
    router.push(`/alumni${params.toString() ? `?${params.toString()}` : ''}`);
  };

  return (
    <div
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300',
        className
      )}
    >
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-100" />

      <div className="relative flex h-full flex-col gap-4">
        {/* Header with icon */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
              Alumni Network
            </p>
            <p className="mt-1 text-sm text-slate-600">Search {total} profiles</p>
          </div>
          <div className="flex-shrink-0">
            <GraduationCap className="h-9 w-9 text-indigo-600" />
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-indigo-50 p-2.5 text-center">
            <p className="text-lg font-bold text-indigo-600">{total}</p>
            <p className="text-[10px] font-medium text-slate-600 uppercase tracking-wide">
              Profiles
            </p>
          </div>
          <div className="rounded-lg bg-purple-50 p-2.5 text-center">
            <p className="text-lg font-bold text-purple-600">{uniqueMajors}</p>
            <p className="text-[10px] font-medium text-slate-600 uppercase tracking-wide">Majors</p>
          </div>
          <div className="rounded-lg bg-blue-50 p-2.5 text-center">
            <p className="text-lg font-bold text-blue-600">{newThisMonth}</p>
            <p className="text-[10px] font-medium text-slate-600 uppercase tracking-wide">New</p>
          </div>
        </div>

        {/* Filter Section */}
        <div className="space-y-3 flex-1">
          <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Search Filters
          </p>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, major, or university..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
              className="w-full pl-8 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
            />
          </div>

          {/* Major Filter */}
          <select
            value={selectedMajor}
            onChange={(e) => setSelectedMajor(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
          >
            <option value="">All majors</option>
            {availableMajors.map((major) => (
              <option key={major} value={major}>
                {major}
              </option>
            ))}
          </select>

          {/* Application Type Filter */}
          <select
            value={selectedApplicationType}
            onChange={(e) => setSelectedApplicationType(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
          >
            <option value="">All application types</option>
            <option value="ED">Early Decision (ED)</option>
            <option value="EA">Early Action (EA)</option>
            <option value="RD">Regular Decision (RD)</option>
          </select>

          {/* Prestige Filter */}
          <select
            value={selectedPrestige}
            onChange={(e) => setSelectedPrestige(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
          >
            <option value="">All school rankings</option>
            <option value="top5">Top 5 Schools</option>
            <option value="top10">Top 10 Schools</option>
            <option value="top20">Top 20 Schools</option>
            <option value="top50">Top 50 Schools</option>
            <option value="other">Other Schools</option>
          </select>

          {/* Search Button */}
          <button
            onClick={handleSearch}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm hover:shadow-md"
          >
            <Search className="h-4 w-4" />
            Search Alumni
          </button>
        </div>

        {/* Highlight section */}
        <div className="space-y-3 border-t border-slate-100 pt-3">
          <div className="flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-500">Inspiration</p>
              <p className="text-sm font-semibold text-slate-900 truncate" title={highlight}>
                {highlight}
              </p>
            </div>
          </div>

          {/* Quick action buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                router.push('/alumni/upload');
              }}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition-all duration-200 hover:bg-indigo-700 hover:shadow-md active:scale-95"
            >
              <Upload className="h-3.5 w-3.5" />
              Share
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                router.push('/alumni');
              }}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition-all duration-200 hover:bg-indigo-100 hover:border-indigo-300 active:scale-95"
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
              View All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
