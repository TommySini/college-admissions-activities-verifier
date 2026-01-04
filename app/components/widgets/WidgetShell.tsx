'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, type ReactNode } from 'react';

type WidgetShellProps = {
  href: string;
  title: string;
  subtitle?: string;
  icon: ReactNode;
  iconColor?: string;
  hoverGradient?: string;
  children: ReactNode;
  footerLink?: string;
  className?: string;
};

export function WidgetShell({
  href,
  title,
  subtitle,
  icon,
  iconColor = 'text-blue-600',
  hoverGradient = 'hover:from-blue-50/40 hover:to-white hover:border-blue-300',
  children,
  footerLink = 'View all',
  className,
}: WidgetShellProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Link
      href={href}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:bg-gradient-to-br',
        hoverGradient,
        className
      )}
    >
      {/* Background gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative flex h-full flex-col justify-between gap-4">
        {/* Header with icon */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{title}</p>
            {subtitle && <p className="mt-1 text-[10px] font-medium text-blue-600">{subtitle}</p>}
          </div>
          <div
            className={cn(
              'flex-shrink-0 transition-transform duration-300',
              isHovered && 'scale-110 rotate-12'
            )}
          >
            <div className={iconColor}>{icon}</div>
          </div>
        </div>

        {/* Main content */}
        {children}

        {/* Open link at bottom */}
        <div className="flex items-center gap-2 text-xs font-medium text-slate-400 group-hover:text-blue-600 transition-colors">
          {footerLink}
          <ArrowUpRight className="h-3.5 w-3.5" />
        </div>
      </div>
    </Link>
  );
}
