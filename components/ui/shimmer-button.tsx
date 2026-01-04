'use client';

import * as React from 'react';
import type { CSSProperties } from 'react';
import { cn } from '@/lib/cn';

export interface ShimmerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  shimmerColor?: string;
  shimmerSize?: string; // e.g. "0.05em"
  borderRadius?: string; // e.g. "100px"
  shimmerDuration?: string; // e.g. "3s"
  background?: string; // e.g. "rgba(0,0,0,1)"
  className?: string;
  children?: React.ReactNode;
}

export const ShimmerButton = React.forwardRef<HTMLButtonElement, ShimmerButtonProps>(
  (
    {
      shimmerColor = '#93c5fd', // blue-300
      shimmerSize = '0.05em',
      shimmerDuration = '3s',
      borderRadius = '100px',
      background = 'linear-gradient(90deg, #1e40af 0%, #2563eb 50%, #60a5fa 100%)', // blue gradient
      className,
      children,
      'aria-label': ariaLabel,
      ...props
    },
    ref
  ) => {
    // Respect reduced motion
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

    return (
      <button
        ref={ref}
        aria-label={ariaLabel ?? (typeof children === 'string' ? children : 'Button')}
        style={
          {
            '--spread': '90deg',
            '--shimmer-color': shimmerColor,
            '--radius': borderRadius,
            '--speed': shimmerDuration,
            '--cut': shimmerSize,
            '--bg': background,
            '--fg': '#ffffff', // white text
          } as CSSProperties
        }
        className={cn(
          'group relative z-0 inline-flex items-center justify-center overflow-hidden whitespace-nowrap border border-white/10 px-6 py-3 [background:var(--bg)] [color:var(--fg)] [border-radius:var(--radius)]',
          'transform-gpu transition-transform duration-300 ease-in-out active:translate-y-px',
          // make sure focus styles exist
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-400 dark:focus-visible:ring-blue-500',
          className
        )}
        {...props}
      >
        {/* Spark container (disabled if reduced motion) */}
        {!reduceMotion && (
          <div
            className={cn(
              '-z-30 blur-[2px]',
              'pointer-events-none absolute inset-0 overflow-visible [container-type:size]'
            )}
            aria-hidden="true"
          >
            <div className="absolute inset-0 h-[100cqh] animate-shimmer-slide [aspect-ratio:1] [border-radius:0] [mask:none]">
              <div className="animate-spin-around absolute -inset-full w-auto rotate-0 [background:conic-gradient(from_calc(270deg-(var(--spread)*0.5)),transparent_0,var(--shimmer-color)_var(--spread),transparent_var(--spread))] [translate:0_0]" />
            </div>
          </div>
        )}

        {/* Content - wrapped to ensure text is on top */}
        <span className="relative z-10">{children}</span>

        {/* Highlight */}
        <div
          className={cn(
            'insert-0 pointer-events-none absolute size-full -z-10',
            'rounded-2xl px-4 py-1.5 text-sm font-medium shadow-[inset_0_-8px_10px_#ffffff1f]',
            'transform-gpu transition-all duration-300 ease-in-out',
            'group-hover:shadow-[inset_0_-6px_10px_#ffffff3f]',
            'group-active:shadow-[inset_0_-10px_10px_#ffffff3f]'
          )}
          aria-hidden="true"
        />

        {/* Backdrop */}
        <div
          className={cn(
            'pointer-events-none absolute -z-20 [background:var(--bg)] [border-radius:var(--radius)] [inset:var(--cut)]'
          )}
          aria-hidden="true"
        />
      </button>
    );
  }
);

ShimmerButton.displayName = 'ShimmerButton';
