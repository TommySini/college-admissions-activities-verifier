'use client';

import Link from 'next/link';
import { Activity, Plus, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

type ActivityData = {
  id: string;
  name: string;
  category: string;
  status: string;
  verified?: boolean;
  verificationStatus?: string;
};

type ActivitiesWidgetProps = {
  total: number;
  verified: number;
  pending: number;
  activities: ActivityData[];
  highlight: string;
  className?: string;
};

export function ActivitiesWidget({
  total,
  verified,
  pending,
  activities,
  highlight,
  className,
}: ActivitiesWidgetProps) {
  const router = useRouter();

  return (
    <Link
      href="/activities"
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-purple-300 hover:bg-gradient-to-br hover:from-purple-50/40 hover:to-white',
        className
      )}
    >
      {/* Background gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative flex h-full flex-col justify-between gap-4">
        {/* Header with icon */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
              Activities
            </p>
          </div>
          <div className="flex-shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">
            <Activity className="h-9 w-9 text-purple-600" />
          </div>
        </div>

        {/* All Activities List */}
        <div className="flex-1 min-h-0 space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            All activities
          </p>
          {activities.length > 0 ? (
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="group/item p-2 rounded-xl bg-slate-50 border border-slate-100 hover:bg-white hover:border-purple-200 hover:shadow-sm transition-all duration-200"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-900 line-clamp-1 group-hover/item:text-purple-600 transition-colors">
                      {activity.name}
                    </p>
                    <p className="text-[10px] text-slate-500 line-clamp-1">{activity.category}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <Activity className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <p className="text-xs text-slate-500">No activities yet</p>
                <p className="text-[10px] text-slate-400 mt-1">Start tracking your journey</p>
              </div>
            </div>
          )}
        </div>

        {/* Quick action button */}
        <div className="space-y-3 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              router.push('/activities');
            }}
            className={cn(
              'flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-purple-700 hover:shadow-md active:scale-95 w-full',
              'group/button'
            )}
          >
            <Plus className="h-4 w-4" />
            Add activity
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover/button:translate-x-0.5 group-hover/button:-translate-y-0.5" />
          </button>
        </div>

        {/* Open link at bottom */}
        <div className="flex items-center gap-2 text-xs font-medium text-slate-400 group-hover:text-purple-600 transition-colors">
          View all
          <ArrowUpRight className="h-3.5 w-3.5" />
        </div>
      </div>
    </Link>
  );
}
