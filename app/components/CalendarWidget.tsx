'use client';

import { Calendar as CalendarIcon, ArrowUpRight, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useMemo } from 'react';

type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  source: 'activity' | 'opportunity';
};

type CalendarWidgetProps = {
  events: CalendarEvent[];
  className?: string;
};

export function CalendarWidget({ events, className }: CalendarWidgetProps) {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today);
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  // Get days in month
  const daysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonth + 1, 0).getDate();
  }, [currentYear, currentMonth]);

  // Get first day of month (0 = Sunday)
  const firstDayOfMonth = useMemo(() => {
    return new Date(currentYear, currentMonth, 1).getDay();
  }, [currentYear, currentMonth]);

  // Group events by date
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, CalendarEvent[]> = {};
    events.forEach((event) => {
      const dateKey = new Date(event.date).toDateString();
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(event);
    });
    return grouped;
  }, [events]);

  // Get events for selected date
  const selectedDateEvents = useMemo(() => {
    const dateKey = selectedDate.toDateString();
    return eventsByDate[dateKey] || [];
  }, [eventsByDate, selectedDate]);

  // Check if a date has events
  const hasEvents = (day: number) => {
    const date = new Date(currentYear, currentMonth, day);
    return eventsByDate[date.toDateString()]?.length > 0;
  };

  // Check if date is today
  const isToday = (day: number) => {
    const date = new Date(currentYear, currentMonth, day);
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Check if date is selected
  const isSelected = (day: number) => {
    const date = new Date(currentYear, currentMonth, day);
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  return (
    <div
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-blue-300 hover:bg-gradient-to-br hover:from-blue-50/40 hover:to-white',
        className
      )}
    >
      {/* Background gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative flex h-full flex-col justify-between gap-4">
        {/* Header with icon */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Calendar</p>
          </div>
          <div className="flex-shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">
            <CalendarIcon className="h-9 w-9 text-blue-600" />
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="space-y-3">
          {/* Month/Year Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              {monthNames[currentMonth]} {currentYear}
            </h3>
            <div className="flex gap-1">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  if (currentMonth === 0) {
                    setCurrentMonth(11);
                    setCurrentYear(currentYear - 1);
                  } else {
                    setCurrentMonth(currentMonth - 1);
                  }
                }}
                className="p-1 rounded hover:bg-slate-100 transition-colors"
              >
                <ArrowUpRight className="h-3 w-3 rotate-[-135deg] text-slate-600" />
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  if (currentMonth === 11) {
                    setCurrentMonth(0);
                    setCurrentYear(currentYear + 1);
                  } else {
                    setCurrentMonth(currentMonth + 1);
                  }
                }}
                className="p-1 rounded hover:bg-slate-100 transition-colors"
              >
                <ArrowUpRight className="h-3 w-3 rotate-45 text-slate-600" />
              </button>
            </div>
          </div>

          {/* Day Labels */}
          <div className="grid grid-cols-7 gap-1">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
              <div key={idx} className="text-center text-[10px] font-semibold text-slate-500">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before month starts */}
            {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
              <div key={`empty-${idx}`} className="aspect-square" />
            ))}

            {/* Actual days */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1;
              return (
                <button
                  key={day}
                  onClick={(e) => {
                    e.preventDefault();
                    setSelectedDate(new Date(currentYear, currentMonth, day));
                  }}
                  className={cn(
                    'relative aspect-square rounded-lg text-[11px] font-medium transition-all duration-200',
                    isSelected(day)
                      ? 'bg-blue-600 text-white shadow-md scale-105'
                      : isToday(day)
                        ? 'bg-blue-100 text-blue-700 font-semibold'
                        : 'text-slate-700 hover:bg-slate-100'
                  )}
                >
                  {day}
                  {hasEvents(day) && (
                    <Circle
                      className={cn(
                        'absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 fill-current',
                        isSelected(day) ? 'text-white' : 'text-blue-600'
                      )}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Date Events */}
        <div className="space-y-2 border-t border-slate-100 pt-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {selectedDateEvents.length > 0
              ? `${selectedDateEvents.length} ${selectedDateEvents.length === 1 ? 'event' : 'events'} on ${selectedDate.getDate()}/${selectedDate.getMonth() + 1}`
              : 'No events'}
          </p>
          {selectedDateEvents.length > 0 ? (
            <div className="space-y-1.5 max-h-[80px] overflow-y-auto pr-1 custom-scrollbar">
              {selectedDateEvents.map((event) => (
                <div
                  key={event.id}
                  className="p-2 rounded-lg bg-slate-50 border border-slate-100 hover:bg-white hover:border-blue-200 transition-all duration-200"
                >
                  <p className="text-xs font-semibold text-slate-900 line-clamp-1">{event.title}</p>
                  <p className="text-[10px] text-slate-500 capitalize">{event.source}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-2">Select a date with events</p>
          )}
        </div>

        {/* Open link at bottom */}
        <div className="flex items-center gap-2 text-xs font-medium text-slate-400 group-hover:text-blue-600 transition-colors">
          View schedule
          <ArrowUpRight className="h-3.5 w-3.5" />
        </div>
      </div>
    </div>
  );
}
