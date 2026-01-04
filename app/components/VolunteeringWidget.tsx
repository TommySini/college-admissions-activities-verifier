'use client';

import Link from 'next/link';
import { Clock3, ArrowUpRight, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { StatItem } from './widgets/StatItem';

type VolunteeringWidgetProps = {
  totalHours: number;
  active: number;
  completed: number;
  upcoming: number;
  highlight: string;
  className?: string;
};

export function VolunteeringWidget({
  totalHours,
  active,
  completed,
  upcoming,
  highlight,
  className,
}: VolunteeringWidgetProps) {
  const [animatedHours, setAnimatedHours] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const router = useRouter();

  // Animate the hours count on mount
  useEffect(() => {
    const duration = 1000;
    const steps = 30;
    const increment = totalHours / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= totalHours) {
        setAnimatedHours(totalHours);
        clearInterval(timer);
      } else {
        setAnimatedHours(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [totalHours]);

  // Calculate progress percentage for the arc (out of a goal, e.g., 100 hours)
  const goalHours = Math.max(100, Math.ceil(totalHours / 50) * 50); // Dynamic goal
  const progressPercentage = Math.min((totalHours / goalHours) * 100, 100);

  // SVG arc parameters
  const size = 120;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progressPercentage / 100) * circumference;

  // Get motivational message
  const getMotivationalMessage = () => {
    if (totalHours === 0) return 'Start your impact journey';
    if (totalHours < 10) return 'Great start! Keep going';
    if (totalHours < 50) return 'Building momentum';
    if (totalHours < 100) return 'Making real impact';
    return 'Outstanding dedication!';
  };

  return (
    <Link
      href="/volunteering"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-blue-300 hover:bg-gradient-to-br hover:from-blue-50/40 hover:to-white',
        className
      )}
    >
      {/* Background gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative flex h-full flex-col justify-between gap-4">
        {/* Header with icon */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
              Volunteering
            </p>
          </div>
          <div
            className={cn(
              'flex-shrink-0 transition-transform duration-300',
              isHovered && 'scale-110 rotate-12'
            )}
          >
            <Clock3 className="h-9 w-9 text-blue-600" />
          </div>
        </div>

        {/* Main content area with chart and stats */}
        <div className="flex items-center justify-between gap-6">
          {/* Progress Arc Chart */}
          <div className="relative flex items-center justify-center">
            <svg width={size} height={size} className="transform -rotate-90">
              {/* Background circle */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="#e2e8f0"
                strokeWidth={strokeWidth}
              />
              {/* Progress arc */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="url(#blueGradient)"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
              <defs>
                <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </svg>
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-3xl font-bold text-slate-900 tabular-nums">{animatedHours}</p>
              <p className="text-xs font-semibold text-slate-500">hours</p>
            </div>
          </div>

          {/* Stats grid */}
          <div className="flex-1 space-y-2">
            <StatItem label="Active" value={active} color="text-green-600" icon="●" />
            <StatItem label="Upcoming" value={upcoming} color="text-blue-600" icon="○" />
            <StatItem label="Completed" value={completed} color="text-slate-500" icon="✓" />
          </div>
        </div>

        {/* Bottom section with next action */}
        <div className="space-y-3 border-t border-slate-100 pt-3">
          <div className="flex items-start gap-2">
            <TrendingUp className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-500">Next milestone</p>
              <p className="text-sm font-semibold text-slate-900 truncate" title={highlight}>
                {highlight}
              </p>
            </div>
          </div>

          {/* Quick action button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              router.push('/volunteering/log-hours');
            }}
            className={cn(
              'flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-blue-700 hover:shadow-md active:scale-95',
              'group/button'
            )}
          >
            <Clock3 className="h-4 w-4" />
            Log hours
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover/button:translate-x-0.5 group-hover/button:-translate-y-0.5" />
          </button>
        </div>

        {/* Open link at bottom */}
        <div className="flex items-center gap-2 text-xs font-medium text-slate-400 group-hover:text-blue-600 transition-colors">
          View all
          <ArrowUpRight className="h-3.5 w-3.5" />
        </div>
      </div>
    </Link>
  );
}
