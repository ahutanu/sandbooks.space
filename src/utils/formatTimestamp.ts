import {
  formatDistanceToNow,
  format,
  isToday,
  isYesterday,
  differenceInDays,
  differenceInWeeks,
  differenceInMinutes,
} from 'date-fns';

export interface TimestampData {
  relative: string;    // "2 hours ago", "Yesterday"
  absolute: string;    // "November 19, 2025 at 10:30 AM"
  datetime: string;    // ISO format for <time> element
}

/**
 * Format ISO timestamp for display with accessibility support
 * Implements smart relative time formatting
 *
 * @param isoDate - ISO 8601 date string
 * @returns Object with relative display, absolute format, and ISO datetime
 *
 * @example
 * formatTimestamp('2025-11-19T10:30:00Z')
 * // { relative: '2 hours ago', absolute: 'November 19, 2025 at 10:30 AM', datetime: '2025-11-19T10:30:00Z' }
 */
export function formatTimestamp(isoDate: string): TimestampData {
  const date = new Date(isoDate);
  const now = new Date();

  // Handle invalid dates
  if (isNaN(date.getTime())) {
    return {
      relative: 'Unknown',
      absolute: 'Unknown date',
      datetime: isoDate,
    };
  }

  let relative: string;

  // Today - show time-based relative format
  if (isToday(date)) {
    const minutesDiff = differenceInMinutes(now, date);

    if (minutesDiff < 1) {
      relative = 'Just now';
    } else if (minutesDiff < 60) {
      relative = `${minutesDiff} minute${minutesDiff === 1 ? '' : 's'} ago`;
    } else {
      relative = formatDistanceToNow(date, { addSuffix: true });
    }
  }
  // Yesterday
  else if (isYesterday(date)) {
    relative = 'Yesterday';
  }
  // Within last week
  else if (differenceInDays(now, date) < 7) {
    relative = formatDistanceToNow(date, { addSuffix: true });
  }
  // Within current year
  else if (differenceInWeeks(now, date) < 52) {
    relative = format(date, 'MMM d'); // "Nov 19"
  }
  // Over 1 year old
  else {
    relative = format(date, 'MMM d, yyyy'); // "Nov 19, 2024"
  }

  // Absolute format for accessibility (aria-label and tooltip)
  const absolute = format(date, 'MMMM d, yyyy \'at\' h:mm a');

  return {
    relative,
    absolute,
    datetime: isoDate,
  };
}
