'use client';

import { useEffect, useState } from 'react';

type ProgressRingProps = {
  value: number;
  goal: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  gradientId?: string;
  gradientFrom?: string;
  gradientTo?: string;
};

export function ProgressRing({
  value,
  goal,
  size = 120,
  strokeWidth = 8,
  label,
  sublabel,
  gradientId = 'progressGradient',
  gradientFrom = '#3b82f6',
  gradientTo = '#8b5cf6',
}: ProgressRingProps) {
  const [animatedValue, setAnimatedValue] = useState(0);

  // Animate the value on mount
  useEffect(() => {
    const duration = 1000;
    const steps = 30;
    const increment = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setAnimatedValue(value);
        clearInterval(timer);
      } else {
        setAnimatedValue(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  // Calculate progress percentage
  const progressPercentage = Math.min((value / Math.max(goal, 1)) * 100, 100);

  // SVG arc parameters
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progressPercentage / 100) * circumference;

  return (
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
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={gradientFrom} />
            <stop offset="100%" stopColor={gradientTo} />
          </linearGradient>
        </defs>
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-3xl font-bold text-slate-900 tabular-nums">
          {label !== undefined ? label : animatedValue}
        </p>
        <p className="text-xs font-semibold text-slate-500">
          {sublabel !== undefined ? sublabel : Math.round(progressPercentage) + '%'}
        </p>
      </div>
    </div>
  );
}
