"use client";

import { useEffect, useRef, useState } from "react";

interface Goal {
  targetHours: number;
  targetDate: string | null;
  description: string | null;
  status?: string;
}

interface HoursChartProps {
  participations: Array<{
    startDate: string;
    endDate: string | null;
    totalHours: number;
    hoursPerWeek: number | null;
    organizationName?: string | null;
    activityDescription?: string | null;
    opportunity?: {
      title: string;
      description: string;
    } | null;
  }>;
  goals?: Goal[];
  goalHours?: number; // Deprecated, use goals array instead
  goalDate?: string | null; // Deprecated, use goals array instead
  goalDescription?: string | null; // Deprecated, use goals array instead
  currentHours: number;
  colors: {
    primary: string;
    tertiary: string;
    accent: string;
  };
  timeRange?: "1W" | "1M" | "6M" | "1Y" | "2Y" | "all";
}

export function HoursChart({
  participations,
  goals,
  goalHours, // Deprecated
  goalDate, // Deprecated
  goalDescription, // Deprecated
  currentHours,
  colors,
  timeRange = "1M",
}: HoursChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hoverTargetRef = useRef<Array<{ x: number; y: number; goal: Goal }>>([]);
  const participationDotsRef = useRef<Array<{ x: number; y: number; participation: any }>>([]);
  const [tooltip, setTooltip] = useState<{ visible: boolean; x: number; y: number; content: { title: string; subtitle: string } } | null>(null);
  const [participationTooltip, setParticipationTooltip] = useState<{ visible: boolean; x: number; y: number; content: { title: string; description: string; hours: string; date: string } } | null>(null);
  
  // Zoom and pan state
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  
  // Normalize goals: use goals array if provided, otherwise fall back to single goal props
  const normalizedGoals: Goal[] = goals || (goalHours && goalDate ? [{
    targetHours: goalHours,
    targetDate: goalDate,
    description: goalDescription || null,
    status: 'active'
  }] : []);
  
  // Filter to only active goals
  const activeGoals = normalizedGoals.filter(g => !g.status || g.status === 'active');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas dimensions
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = 180;
    
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";

    // Chart dimensions - minimal padding
    const padding = { top: 10, right: 15, bottom: 30, left: 35 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate date range based on timeRange prop
    const now = new Date();
    let daysToShow = 30; // Default 1 month
    if (timeRange === "1W") {
      daysToShow = 7;
    } else if (timeRange === "1M") {
      daysToShow = 30;
    } else if (timeRange === "6M") {
      daysToShow = 180;
    } else if (timeRange === "1Y") {
      daysToShow = 365;
    } else if (timeRange === "2Y") {
      daysToShow = 730;
    } else if (timeRange === "all") {
      // Find the earliest participation date
      const earliestDate = participations.length > 0
        ? participations.reduce((earliest, p) => {
            const pStart = new Date(p.startDate);
            return pStart < earliest ? pStart : earliest;
          }, new Date(participations[0].startDate))
        : new Date(now);
      daysToShow = Math.max(30, Math.ceil((now.getTime() - earliestDate.getTime()) / (24 * 60 * 60 * 1000)));
    }
    
    // If there are goal dates in the future, extend the chart to show them
    let endDate = new Date(now);
    const futureGoalDates = activeGoals
      .filter(g => g.targetDate)
      .map(g => new Date(g.targetDate!))
      .filter(d => d > now);
    
    if (futureGoalDates.length > 0) {
      const latestGoalDate = futureGoalDates.reduce((latest, d) => d > latest ? d : latest);
      const daysUntilGoal = Math.ceil((latestGoalDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      const totalDays = daysToShow + daysUntilGoal;
      endDate = new Date(latestGoalDate);
      endDate.setHours(23, 59, 59, 999);
      daysToShow = totalDays;
    }

    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - daysToShow);
    startDate.setHours(0, 0, 0, 0);

    // Build cumulative hours data by day
    const dailyCumulative: { date: Date; hours: number }[] = [];

    // Sort participations by end date (or start date if no end date)
    const sortedParticipations = [...participations]
      .filter(p => p.totalHours > 0) // Only include participations with hours
      .sort((a, b) => {
        const aEnd = a.endDate ? new Date(a.endDate).getTime() : new Date(a.startDate).getTime();
        const bEnd = b.endDate ? new Date(b.endDate).getTime() : new Date(b.startDate).getTime();
        return aEnd - bEnd;
      });

    // Calculate cumulative hours for each day (including future days if goal exists)
    // For participations spanning multiple days, distribute hours gradually
    for (let day = 0; day <= daysToShow; day++) {
      const dayDate = new Date(startDate);
      dayDate.setDate(dayDate.getDate() + day);
      dayDate.setHours(23, 59, 59, 999); // End of day
      
      let dayCumulativeHours = 0;
      
      sortedParticipations.forEach((p) => {
        const pStart = new Date(p.startDate);
        pStart.setHours(0, 0, 0, 0);
        const pEnd = p.endDate ? new Date(p.endDate) : new Date(p.startDate);
        pEnd.setHours(23, 59, 59, 999);
        
        // For future dates, use current total hours
        if (dayDate > now) {
          dayCumulativeHours = currentHours;
          return;
        }
        
        // If participation hasn't started yet, skip
        if (dayDate < pStart) {
          return;
        }
        
        // If participation has ended, add all its hours
        if (dayDate >= pEnd) {
          dayCumulativeHours += p.totalHours;
          return;
        }
        
        // Participation is ongoing - distribute hours gradually
        const participationDuration = Math.max(1, Math.ceil((pEnd.getTime() - pStart.getTime()) / (24 * 60 * 60 * 1000)));
        const daysIntoParticipation = Math.ceil((dayDate.getTime() - pStart.getTime()) / (24 * 60 * 60 * 1000));
        const hoursSoFar = (p.totalHours / participationDuration) * daysIntoParticipation;
        dayCumulativeHours += hoursSoFar;
      });

      dailyCumulative.push({
        date: new Date(dayDate),
        hours: dayCumulativeHours,
      });
    }

    // Calculate max hours for scaling - include all goal hours
    const maxDataHours = dailyCumulative.reduce((max, d) => Math.max(max, d.hours), currentHours);
    const maxGoalHours = activeGoals.length > 0 
      ? Math.max(...activeGoals.map(g => g.targetHours))
      : 0;
    const minMaxHours = 20; // Minimum max for Y-axis
    const calculatedMax = Math.max(maxDataHours, maxGoalHours, minMaxHours) * 1.3;
    const maxHours = Math.max(calculatedMax, minMaxHours);

    // Draw all goals
    hoverTargetRef.current = [];
    activeGoals.forEach((goal) => {
      if (!goal.targetHours) return;
      
      const goalY = padding.top + chartHeight - (goal.targetHours / maxHours) * chartHeight;
      const goalStartX = padding.left;
      const goalEndX = padding.left + chartWidth;

      // Draw horizontal goal line (subtle dashed)
      ctx.strokeStyle = colors.tertiary;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(goalStartX, goalY);
      ctx.lineTo(goalStartX + chartWidth, goalY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      // Draw vertical line and intersection point if goal date exists
      if (goal.targetDate) {
        const goalDateObj = new Date(goal.targetDate);
        const daysFromStart = Math.floor((goalDateObj.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
        
        if (daysFromStart >= 0 && daysFromStart <= daysToShow) {
          const goalX = padding.left + (chartWidth / daysToShow) * daysFromStart;
          
          // Draw vertical line at due date (from intersection to bottom)
          ctx.strokeStyle = colors.tertiary;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.globalAlpha = 0.7;
          ctx.beginPath();
          ctx.moveTo(goalX, goalY);
          ctx.lineTo(goalX, padding.top + chartHeight);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.globalAlpha = 1;
          
          // Draw intersection point (goal dot)
          ctx.setLineDash([]);
          ctx.globalAlpha = 1;
          ctx.fillStyle = colors.primary;
          ctx.beginPath();
          ctx.arc(goalX, goalY, 4, 0, Math.PI * 2);
          ctx.fill();
          
          // Store for hover detection
          hoverTargetRef.current.push({ x: goalX, y: goalY, goal });
        }
      }
    });

    // Draw data line (cumulative hours) - smooth curved line
    if (dailyCumulative.length > 0 && dailyCumulative.some(d => d.hours > 0)) {
      ctx.strokeStyle = colors.primary;
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();

      const points = dailyCumulative.map((point, index) => {
        const baseY = padding.top + chartHeight - (point.hours / maxHours) * chartHeight;
        const bottomY = padding.top + chartHeight;
        // Ensure line doesn't sit exactly on the bottom axis when at 0 - keep it 1px above
        const y = baseY >= bottomY - 0.5 ? bottomY - 1 : baseY;
        return {
          x: padding.left + (chartWidth / daysToShow) * index,
          y: y,
        };
      });

      if (points.length > 0) {
        ctx.moveTo(points[0].x, points[0].y);
        
        // Use quadratic bezier curves for smooth flowy lines
        for (let i = 0; i < points.length - 1; i++) {
          const current = points[i];
          const next = points[i + 1];
          
          // Control point is the midpoint, but slightly adjusted for smoother curves
          const controlX = (current.x + next.x) / 2;
          const controlY = (current.y + next.y) / 2;
          
          // Use quadratic curve to create smooth transitions
          ctx.quadraticCurveTo(controlX, controlY, next.x, next.y);
        }
      }

      ctx.stroke();
      
      // Draw participation dots and track them for hover
      participationDotsRef.current = [];
      sortedParticipations.forEach((p) => {
        const pEnd = p.endDate ? new Date(p.endDate) : new Date(p.startDate);
        pEnd.setHours(23, 59, 59, 999);
        
        // Only draw dots for participations within the chart range
        if (pEnd >= startDate && pEnd <= endDate) {
          const daysFromStart = Math.floor((pEnd.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
          if (daysFromStart >= 0 && daysFromStart <= daysToShow) {
            // Calculate cumulative hours up to this participation
            let cumulativeHours = 0;
            sortedParticipations.forEach((prevP) => {
              const prevEnd = prevP.endDate ? new Date(prevP.endDate) : new Date(prevP.startDate);
              prevEnd.setHours(23, 59, 59, 999);
              if (prevEnd <= pEnd) {
                cumulativeHours += prevP.totalHours;
              }
            });
            
            const x = padding.left + (chartWidth / daysToShow) * daysFromStart;
            const y = padding.top + chartHeight - (cumulativeHours / maxHours) * chartHeight;
            
            // Draw dot using accent color (different from goal dot)
            ctx.fillStyle = colors.accent;
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
            
            // Store for hover detection
            participationDotsRef.current.push({ x, y, participation: p });
          }
        }
      });
    } else {
      // Draw subtle flat line when no data
      ctx.strokeStyle = colors.primary;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.moveTo(padding.left, padding.top + chartHeight);
      ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }

    // Draw current hours indicator (subtle)
    if (currentHours > 0) {
      const currentY = padding.top + chartHeight - (currentHours / maxHours) * chartHeight;
      ctx.strokeStyle = colors.accent;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 3]);
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.moveTo(padding.left, currentY);
      ctx.lineTo(padding.left + chartWidth, currentY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }

    // Y-axis labels - include current total hours
    ctx.fillStyle = "#9ca3af";
    ctx.font = "9px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    const gridLines = 3;
    
    // Calculate Y position for current hours
    const currentHoursY = padding.top + chartHeight - (currentHours / maxHours) * chartHeight;
    const currentHoursLabelY = Math.max(padding.top + 8, Math.min(padding.top + chartHeight - 8, currentHoursY));
    
    // Draw grid lines and labels
    for (let i = 0; i <= gridLines; i++) {
      const hours = (maxHours / gridLines) * (gridLines - i);
      const y = padding.top + (chartHeight / gridLines) * i;
      
      // Skip if this label would overlap with current hours label
      if (Math.abs(y - currentHoursLabelY) < 12) {
        continue;
      }
      
      ctx.fillText(hours.toFixed(0), padding.left - 6, y);
    }

    // Draw current total hours label
    if (currentHours > 0 && currentHours <= maxHours) {
      ctx.fillStyle = colors.primary;
      ctx.font = "9px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
      ctx.fillText(Math.round(currentHours).toString(), padding.left - 6, currentHoursLabelY);
    }

    // X-axis labels with abbreviated month names (only 4 dates)
    ctx.fillStyle = "#9ca3af";
    ctx.font = "8px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    
    const monthAbbreviations = ["Jan.", "Feb.", "Mar.", "Apr.", "May", "Jun.", 
                                "Jul.", "Aug.", "Sep.", "Oct.", "Nov.", "Dec."];
    
    const labelInterval = Math.floor(daysToShow / 4);
    for (let i = 0; i <= daysToShow; i += labelInterval) {
      const x = padding.left + (chartWidth / daysToShow) * i;
      const dayDate = new Date(startDate);
      dayDate.setDate(dayDate.getDate() + i);
      
      const month = monthAbbreviations[dayDate.getMonth()];
      const day = dayDate.getDate();
      ctx.fillText(`${month} ${day}`, x, padding.top + chartHeight + 6);
    }

    // Minimal axis lines only
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;
    
    // X-axis
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top + chartHeight);
    ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
    ctx.stroke();
    
    // Y-axis
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, padding.top + chartHeight);
    ctx.stroke();
  }, [participations, goalHours, goalDate, currentHours, colors, timeRange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getOrdinalSuffix = (day: number) => {
      if (day > 3 && day < 21) return 'th';
      switch (day % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
      }
    };

    const formatDate = (date: Date) => {
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
      const day = date.getDate();
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      return `${month} ${day}${getOrdinalSuffix(day)}, ${year}`;
    };

    const formatDateRange = (startDate: string, endDate: string | null) => {
      const start = new Date(startDate);
      const end = endDate ? new Date(endDate) : start;
      const isSameDay = start.toDateString() === end.toDateString();
      
      if (isSameDay) {
        return formatDate(start);
      }
      
      const startYear = start.getFullYear();
      const endYear = end.getFullYear();
      const sameYear = startYear === endYear;
      
      const startFormatted = formatDate(start);
      const endFormatted = formatDate(end);
      
      // If same year, remove year from start date
      if (sameYear) {
        const startWithoutYear = startFormatted.replace(`, ${startYear}`, '');
        return `${startWithoutYear} to ${endFormatted}`;
      }
      
      return `${startFormatted} to ${endFormatted}`;
    };

    const handleMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      // Check participation dots first
      let foundParticipation = false;
      for (const dot of participationDotsRef.current) {
        const distance = Math.sqrt((x - dot.x) ** 2 + (y - dot.y) ** 2);
        if (distance <= 8) {
          const p = dot.participation;
          const activityName = p.opportunity?.title || p.organizationName || "Activity";
          const description = p.opportunity?.description || p.activityDescription || "";
          const hours = Math.round(p.totalHours);
          const dateRange = formatDateRange(p.startDate, p.endDate);
          const dateText = p.endDate && p.endDate !== p.startDate 
            ? `${hours} hrs from ${dateRange}`
            : `${hours} hrs on ${dateRange}`;
          
          setParticipationTooltip({
            visible: true,
            x: dot.x,
            y: dot.y,
            content: {
              title: activityName,
              description,
              hours: hours.toString(),
              date: dateText,
            },
          });
          foundParticipation = true;
          break;
        }
      }
      
      if (!foundParticipation) {
        setParticipationTooltip(null);
      }
      
      // Check goal dots
      if (!foundParticipation && hoverTargetRef.current.length > 0) {
        let foundGoal = false;
        for (const goalTarget of hoverTargetRef.current) {
          const distance = Math.sqrt((x - goalTarget.x) ** 2 + (y - goalTarget.y) ** 2);
          if (distance <= 8) {
            const formattedDate = goalTarget.goal.targetDate 
              ? new Date(goalTarget.goal.targetDate).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : "No date";
            const content = {
              title: goalTarget.goal.description || "Goal",
              subtitle: `${goalTarget.goal.targetHours.toFixed(0)} hrs by ${formattedDate}`,
            };
            setTooltip({
              visible: true,
              x: goalTarget.x,
              y: goalTarget.y,
              content,
            });
            foundGoal = true;
            break;
          }
        }
        if (!foundGoal && tooltip) {
          setTooltip(null);
        }
      } else if (!foundParticipation) {
        setTooltip(null);
      }
    };

    const handleMouseLeave = () => {
      if (tooltip) {
        setTooltip(null);
      }
      if (participationTooltip) {
        setParticipationTooltip(null);
      }
    };

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [activeGoals, participations, currentHours, colors, timeRange, zoom, panOffset]);

  return (
    <div className="relative w-full">
      <canvas
        ref={canvasRef}
        className="w-full"
        style={{ height: "180px" }}
      />
      {tooltip && tooltip.visible && (
        <div
          className="pointer-events-none absolute rounded-lg bg-white/95 px-4 py-3 text-xs shadow-lg ring-1 ring-black/5"
          style={{ left: tooltip.x + 14, top: tooltip.y - 20, maxWidth: 240 }}
        >
          <div className="font-semibold text-gray-900 text-sm whitespace-nowrap">{tooltip.content.title}</div>
          <div className="mt-1 text-gray-600 whitespace-nowrap">{tooltip.content.subtitle}</div>
        </div>
      )}
      {participationTooltip && participationTooltip.visible && (
        <div
          className="pointer-events-none absolute bg-white/95 px-4 py-3 text-xs shadow-lg ring-1 ring-black/5"
          style={{ 
            left: participationTooltip.x + 14, 
            top: participationTooltip.y - 20, 
            maxWidth: 400,
            borderRadius: '0px'
          }}
        >
          <div className="font-bold text-gray-900 text-sm break-words">{participationTooltip.content.title}</div>
          <div className="mt-1 text-gray-600 text-xs break-words">{participationTooltip.content.description}</div>
          <div className="mt-1 text-gray-600 text-xs break-words">{participationTooltip.content.date}</div>
        </div>
      )}
    </div>
  );
}
