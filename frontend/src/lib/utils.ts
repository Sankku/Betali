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
  const dateObj = date instanceof Date ? date : new Date(date);

  if (isNaN(dateObj.getTime())) {
    return 'Fecha inválida';
  }

  try {
    // Load user preferences from localStorage
    const stored = localStorage.getItem('betali_date_format_preferences');
    let datePattern = 'DD/MM/YYYY';

    if (stored) {
      const preferences = JSON.parse(stored);
      datePattern = preferences.datePattern || 'DD/MM/YYYY';
    }

    const day = dateObj.getDate().toString().padStart(2, '0');
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const year = dateObj.getFullYear();

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
    console.error('Error formatting date:', error);
    return dateObj.toLocaleDateString();
  }
}