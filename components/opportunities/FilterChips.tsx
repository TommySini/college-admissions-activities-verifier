'use client';

import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface FilterChip {
  label: string;
  value: string;
  onRemove: () => void;
}

interface FilterChipsProps {
  filters: FilterChip[];
  onClearAll: () => void;
}

export function FilterChips({ filters, onClearAll }: FilterChipsProps) {
  if (filters.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-slate-600">Active filters:</span>
      {filters.map((filter, index) => (
        <Badge key={`${filter.value}-${index}`} variant="secondary" className="gap-1 pl-3 pr-2">
          {filter.label}
          <button onClick={filter.onRemove} className="ml-1 rounded-full hover:bg-slate-300 p-0.5">
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      {filters.length > 1 && (
        <button
          onClick={onClearAll}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Clear all
        </button>
      )}
    </div>
  );
}

// Quick filter chips (predefined common filters)
interface QuickFilterChip {
  label: string;
  active: boolean;
  onClick: () => void;
}

interface QuickFilterChipsProps {
  filters: QuickFilterChip[];
}

export function QuickFilterChips({ filters }: QuickFilterChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((filter) => (
        <Badge
          key={filter.label}
          variant={filter.active ? 'default' : 'outline'}
          className="cursor-pointer hover:opacity-80 transition-opacity px-3 py-1.5"
          onClick={filter.onClick}
        >
          {filter.label}
        </Badge>
      ))}
    </div>
  );
}
