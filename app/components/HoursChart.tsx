"use client";

import { useEffect, useRef } from "react";

interface HoursChartProps {
  participations: Array<{
    startDate: string;
    endDate: string | null;
    totalHours: number;
    hoursPerWeek: number | null;
  }>;
  goalHours?: number;
  goalDate?: string | null;
  currentHours: number;
  colors: {
    primary: string;
    tertiary: string;
    accent: string;
  };
}

export function HoursChart({
  participations,
  goalHours,
  goalDate,
  currentHours,
  colors,
}: HoursChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

    // Calculate date range (past month - 30 days)
    const now = new Date();
    const daysToShow = 30;
    const startDate = new Date(now);
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

    // Calculate cumulative hours for each day
    for (let day = 0; day <= daysToShow; day++) {
      const dayDate = new Date(startDate);
      dayDate.setDate(dayDate.getDate() + day);
      dayDate.setHours(23, 59, 59, 999); // End of day
      
      // Sum all participations that ended on or before this day
      let dayCumulativeHours = 0;
      sortedParticipations.forEach((p) => {
        const pEnd = p.endDate ? new Date(p.endDate) : new Date(p.startDate);
        pEnd.setHours(23, 59, 59, 999);
        
        // If participation ended on or before this day, add its hours
        if (pEnd <= dayDate) {
          dayCumulativeHours += p.totalHours;
        }
      });

      dailyCumulative.push({
        date: new Date(dayDate),
        hours: dayCumulativeHours,
      });
    }

    // Calculate max hours for scaling
    const maxDataHours = Math.max(...dailyCumulative.map(d => d.hours), currentHours);
    const maxHours = Math.max(maxDataHours, goalHours || 0, 10) * 1.1;

    // Draw goal line if exists (subtle)
    if (goalHours) {
      const goalY = padding.top + chartHeight - (goalHours / maxHours) * chartHeight;
      const goalStartX = padding.left;
      
      // Calculate goal end X based on goal date
      let goalEndX = padding.left + chartWidth;
      if (goalDate) {
        const goalDateObj = new Date(goalDate);
        const daysFromStart = Math.floor((goalDateObj.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
        if (daysFromStart >= 0 && daysFromStart <= daysToShow) {
          goalEndX = padding.left + (chartWidth / daysToShow) * daysFromStart;
        }
      }

      // Draw goal line (subtle dashed)
      ctx.strokeStyle = colors.tertiary;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(goalStartX, goalY);
      ctx.lineTo(goalEndX, goalY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }

    // Draw data line (cumulative hours) - clean single line, no dots
    if (dailyCumulative.length > 0 && dailyCumulative.some(d => d.hours > 0)) {
      ctx.strokeStyle = colors.primary;
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();

      dailyCumulative.forEach((point, index) => {
        const x = padding.left + (chartWidth / daysToShow) * index;
        const y = padding.top + chartHeight - (point.hours / maxHours) * chartHeight;

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();
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

    // Minimal Y-axis labels (only 3)
    ctx.fillStyle = "#9ca3af";
    ctx.font = "9px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    const gridLines = 3;
    for (let i = 0; i <= gridLines; i++) {
      const hours = (maxHours / gridLines) * (gridLines - i);
      const y = padding.top + (chartHeight / gridLines) * i;
      ctx.fillText(hours.toFixed(0), padding.left - 6, y);
    }

    // X-axis labels with month names (only 4 dates)
    ctx.fillStyle = "#9ca3af";
    ctx.font = "8px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    
    const monthNames = ["January", "February", "March", "April", "May", "June", 
                       "July", "August", "September", "October", "November", "December"];
    
    const labelInterval = Math.floor(daysToShow / 4);
    for (let i = 0; i <= daysToShow; i += labelInterval) {
      const x = padding.left + (chartWidth / daysToShow) * i;
      const dayDate = new Date(startDate);
      dayDate.setDate(dayDate.getDate() + i);
      
      const month = monthNames[dayDate.getMonth()];
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
  }, [participations, goalHours, goalDate, currentHours, colors]);

  return (
    <div className="w-full">
      <canvas
        ref={canvasRef}
        className="w-full"
        style={{ height: "180px" }}
      />
    </div>
  );
}
