'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Building2, Users, ArrowUpRight, UserRound, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

type Organization = {
  id: string;
  name: string;
  category?: string | null;
  presidentName?: string | null;
  isSchoolClub: boolean;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
};

type ClubsWidgetProps = {
  myOrgs: number;
  pending: number;
  clubsLive: number;
  organizations: Organization[];
  clubs: Organization[];
  highlight: string;
  className?: string;
};

export function ClubsWidget({
  myOrgs,
  pending,
  clubsLive,
  organizations,
  clubs,
  highlight,
  className,
}: ClubsWidgetProps) {
  const router = useRouter();

  // Get user's approved clubs
  const myClubs = organizations.filter((org) => org.isSchoolClub && org.status === 'APPROVED');

  // Set up tabs: "Join a Club" + one tab for each club
  const tabs = ['Join a Club', ...myClubs.map((club) => club.name)];
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:shadow-xl hover:border-emerald-300',
        className
      )}
    >
      {/* Background gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-blue-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative flex h-full flex-col">
        {/* Header with icon */}
        <div className="flex items-start justify-between gap-4 p-6 pb-4">
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
              Organizations & Clubs
            </p>
          </div>
          <div className="flex-shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">
            <Building2 className="h-9 w-9 text-emerald-600" />
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 pb-4">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
            {tabs.map((tab, index) => (
              <button
                key={index}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab(index);
                }}
                className={cn(
                  'flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200',
                  activeTab === index
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 px-6 pb-6 overflow-y-auto">
          {activeTab === 0 ? (
            // "Join a Club" tab content
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Users className="h-4 w-4 text-emerald-600" />
                <span className="font-medium">{clubsLive} clubs available</span>
              </div>

              {pending > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <p className="text-xs font-semibold text-amber-700">
                    {pending} pending application{pending !== 1 ? 's' : ''}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Spotlight
                </p>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-sm font-semibold text-slate-900" title={highlight}>
                    {highlight}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push('/clubs');
                }}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-emerald-700 hover:shadow-md active:scale-95 w-full',
                  'group/button'
                )}
              >
                <Plus className="h-4 w-4" />
                Browse all clubs
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover/button:translate-x-0.5 group-hover/button:-translate-y-0.5" />
              </button>

              <Link
                href="/organizations#submit-organization"
                className="block text-center text-xs font-medium text-slate-500 hover:text-emerald-600 transition-colors"
              >
                Submit a new organization →
              </Link>
            </div>
          ) : (
            // Individual club tab content
            <div className="space-y-4">
              {(() => {
                const club = myClubs[activeTab - 1];
                return (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-lg font-bold text-slate-900 line-clamp-2">
                          {club.name}
                        </h3>
                        <span className="flex-shrink-0 px-2 py-1 rounded-full text-[10px] font-semibold bg-green-100 text-green-700 border border-green-200">
                          Active
                        </span>
                      </div>

                      {club.category && (
                        <p className="text-xs uppercase tracking-wide font-semibold text-emerald-600">
                          {club.category}
                        </p>
                      )}
                    </div>

                    {club.presidentName && (
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-2">
                          <UserRound className="h-4 w-4 text-slate-400" />
                          <div>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                              President
                            </p>
                            <p className="text-sm font-semibold text-slate-900">
                              {club.presidentName}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex-1" />

                    <Link
                      href="/organizations#your-submissions"
                      onClick={(e) => e.stopPropagation()}
                      className="block text-center px-4 py-2.5 rounded-xl bg-slate-100 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
                    >
                      Manage my submissions
                    </Link>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
