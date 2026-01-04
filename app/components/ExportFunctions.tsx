'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Verification, Activity } from '../types';

// Type declaration for jsPDF with autoTable
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable?: {
      finalY: number;
    };
  }
}

export function exportToPDF(verifications: any[], activities: Activity[], profileName: string) {
  const doc = new jsPDF();

  // Title
  doc.setFontSize(20);
  doc.text('College Admissions Activities', 14, 20);
  doc.setFontSize(16);
  doc.text(`Profile: ${profileName}`, 14, 30);
  doc.setFontSize(12);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 40);

  let yPos = 50;

  // Verified Activities Section
  if (verifications.length > 0) {
    doc.setFontSize(14);
    doc.text('Verified Activities', 14, yPos);
    yPos += 10;

    const verifiedData = verifications
      .filter((v) => v.status === 'accepted')
      .map((v) => [
        v.title,
        v.organization?.name || 'N/A',
        v.position || 'N/A',
        v.category || 'N/A',
        new Date(v.startDate).toLocaleDateString(),
        v.endDate ? new Date(v.endDate).toLocaleDateString() : 'Present',
      ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Title', 'Organization', 'Position', 'Category', 'Start', 'End']],
      body: verifiedData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 66, 66] },
    });

    yPos = (doc.lastAutoTable?.finalY || yPos) + 15;
  }

  // Self-Added Activities Section
  if (activities.length > 0) {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.text('Self-Added Activities', 14, yPos);
    yPos += 10;

    const activityData = activities.map((a) => [
      a.name,
      a.organization || 'N/A',
      a.position || 'N/A',
      a.category,
      new Date(a.startDate).toLocaleDateString(),
      a.endDate ? new Date(a.endDate).toLocaleDateString() : 'Present',
      a.totalHours ? a.totalHours.toString() : 'N/A',
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Name', 'Organization', 'Position', 'Category', 'Start', 'End', 'Hours']],
      body: activityData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 66, 66] },
    });
  }

  // Save the PDF
  doc.save(`${profileName}-activities-${Date.now()}.pdf`);
}

export function exportToCSV(
  verifications: Verification[],
  activities: Activity[],
  profileName: string
) {
  const rows: string[][] = [];

  // Header
  rows.push([
    'Type',
    'Title/Name',
    'Organization',
    'Position',
    'Category',
    'Start Date',
    'End Date',
    'Total Hours',
    'Status',
    'Description',
  ]);

  // Verified Activities
  verifications
    .filter((v) => v.status === 'accepted')
    .forEach((v) => {
      rows.push([
        'Verified',
        v.title,
        v.organizationName,
        v.position || '',
        v.category || '',
        new Date(v.startDate).toLocaleDateString(),
        v.endDate ? new Date(v.endDate).toLocaleDateString() : 'Present',
        '',
        'Accepted',
        v.description || '',
      ]);
    });

  // Self-Added Activities
  activities.forEach((a) => {
    rows.push([
      'Self-Added',
      a.name,
      a.organization || '',
      a.position || '',
      a.category,
      new Date(a.startDate).toLocaleDateString(),
      a.endDate ? new Date(a.endDate).toLocaleDateString() : 'Present',
      a.totalHours ? a.totalHours.toString() : '',
      a.verified ? 'Verified' : 'Unverified',
      a.description || '',
    ]);
  });

  // Convert to CSV string
  const csvContent = rows
    .map((row) =>
      row
        .map((cell) => {
          // Escape quotes and wrap in quotes if contains comma, quote, or newline
          const cellStr = String(cell || '');
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        })
        .join(',')
    )
    .join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${profileName}-activities-${Date.now()}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
