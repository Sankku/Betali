import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date using the user's preferred format from localStorage
 * Falls back to DD/MM/YYYY if no preference is set
 */
export function formatDate(date: Date | string): string {
  // Strings without timezone info come from TIMESTAMP WITHOUT TIME ZONE columns
  // and must be treated as UTC (Supabase strips the Z when returning them).
  const dateObj = (() => {
    if (date instanceof Date) return date;
    if (
      typeof date === 'string' &&
      date.length > 0 &&
      !date.endsWith('Z') &&
      !date.includes('+') &&
      !/[+-]\d{2}:\d{2}$/.test(date)
    ) {
      return new Date(date + 'Z');
    }
    return new Date(date);
  })();

  if (isNaN(dateObj.getTime())) {
    return 'Fecha inválida';
  }

  try {
    // Load user preferences from localStorage
    const stored = localStorage.getItem('betali_date_format_preferences');
    let datePattern = 'DD/MM/YYYY';
    let tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

    if (stored) {
      const preferences = JSON.parse(stored);
      datePattern = preferences.datePattern || 'DD/MM/YYYY';
      if (preferences.timezone) tz = preferences.timezone;
    }

    // Extract date parts in the user's configured timezone
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(dateObj);
    const partsMap = Object.fromEntries(parts.map(p => [p.type, p.value]));
    const day = partsMap.day;
    const month = partsMap.month;
    const year = partsMap.year;

    switch (datePattern) {
      case 'DD/MM/YYYY':
        return `${day}/${month}/${year}`;
      case 'MM/DD/YYYY':
        return `${month}/${day}/${year}`;
      case 'YYYY-MM-DD':
        return `${year}-${month}-${day}`;
      case 'DD-MM-YYYY':
        return `${day}-${month}-${year}`;
      case 'MM-DD-YYYY':
        return `${month}-${day}-${year}`;
      default:
        return `${day}/${month}/${year}`;
    }
  } catch (error) {
    return dateObj.toLocaleDateString();
  }
}