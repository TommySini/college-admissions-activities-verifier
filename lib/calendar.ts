/**
 * Calendar export utility - generates .ics files for events
 * Extracted from finance-competitions page for reuse across platform
 */

export interface CalendarEvent {
  uid?: string;
  title: string;
  description?: string;
  location?: string;
  url?: string;
  startDate: Date;
  endDate: Date;
  organizer?: string;
}

export function formatICalDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

export function generateICalContent(event: CalendarEvent): string {
  const icalLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Actify Opportunities//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.uid || `${Date.now()}@actify.app`}`,
    `DTSTART:${formatICalDate(event.startDate)}`,
    `DTEND:${formatICalDate(event.endDate)}`,
    `DTSTAMP:${formatICalDate(new Date())}`,
    `SUMMARY:${event.title}`,
  ];

  if (event.description) {
    // Escape special characters for iCal
    const escapedDesc = event.description
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
    icalLines.push(`DESCRIPTION:${escapedDesc}`);
  }

  if (event.location) {
    icalLines.push(`LOCATION:${event.location}`);
  }

  if (event.url) {
    icalLines.push(`URL:${event.url}`);
  }

  if (event.organizer) {
    icalLines.push(`ORGANIZER;CN=${event.organizer}:MAILTO:noreply@actify.app`);
  }

  icalLines.push('STATUS:CONFIRMED');
  icalLines.push('SEQUENCE:0');
  icalLines.push('END:VEVENT');
  icalLines.push('END:VCALENDAR');

  return icalLines.join('\r\n');
}

export function downloadICalFile(event: CalendarEvent, filename?: string) {
  const icalContent = generateICalContent(event);
  const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `${event.title.replace(/[^a-z0-9]/gi, '-')}.ics`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Export multiple events as a single calendar file
 */
export function downloadMultipleEvents(
  events: CalendarEvent[],
  filename: string = 'opportunities.ics'
) {
  const icalLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Actify Opportunities//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  events.forEach((event) => {
    icalLines.push('BEGIN:VEVENT');
    icalLines.push(`UID:${event.uid || `${Date.now()}-${Math.random()}@actify.app`}`);
    icalLines.push(`DTSTART:${formatICalDate(event.startDate)}`);
    icalLines.push(`DTEND:${formatICalDate(event.endDate)}`);
    icalLines.push(`DTSTAMP:${formatICalDate(new Date())}`);
    icalLines.push(`SUMMARY:${event.title}`);

    if (event.description) {
      const escapedDesc = event.description
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n');
      icalLines.push(`DESCRIPTION:${escapedDesc}`);
    }

    if (event.location) {
      icalLines.push(`LOCATION:${event.location}`);
    }

    if (event.url) {
      icalLines.push(`URL:${event.url}`);
    }

    icalLines.push('STATUS:CONFIRMED');
    icalLines.push('END:VEVENT');
  });

  icalLines.push('END:VCALENDAR');

  const icalContent = icalLines.join('\r\n');
  const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
