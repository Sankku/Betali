import React, { createContext, useContext, useState, useEffect } from 'react';

export type DateFormatPattern =
  | 'DD/MM/YYYY'
  | 'MM/DD/YYYY'
  | 'YYYY-MM-DD'
  | 'DD-MM-YYYY'
  | 'MM-DD-YYYY';

export type DateFormatStyle = 'short' | 'medium' | 'long' | 'relative';

interface DateFormatContextType {
  datePattern: DateFormatPattern;
  dateStyle: DateFormatStyle;
  locale: string;
  timezone: string;
  setDatePattern: (pattern: DateFormatPattern) => void;
  setDateStyle: (style: DateFormatStyle) => void;
  setLocale: (locale: string) => void;
  setTimezone: (timezone: string) => void;
  formatDate: (date: Date | string, style?: DateFormatStyle) => string;
  formatDateTime: (date: Date | string, includeTime?: boolean) => string;
}

const DateFormatContext = createContext<DateFormatContextType | undefined>(undefined);

const STORAGE_KEY = 'betali_date_format_preferences';

interface DateFormatPreferences {
  datePattern: DateFormatPattern;
  dateStyle: DateFormatStyle;
  locale: string;
  timezone: string;
  timezone_user_set?: boolean;
}

/**
 * Parse a date value into a Date object.
 * Date strings without timezone info (no Z, no +HH:MM) are treated as UTC,
 * because our backend always stores UTC in TIMESTAMP WITHOUT TIME ZONE columns
 * and Supabase returns them without the Z suffix.
 */
function parseDate(date: Date | string): Date {
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
}

export function DateFormatProvider({ children }: { children: React.ReactNode }) {
  // Load from localStorage or use defaults
  const [preferences, setPreferences] = useState<DateFormatPreferences>(() => {
    const defaults: DateFormatPreferences = {
      datePattern: 'DD/MM/YYYY',
      dateStyle: 'short',
      locale: 'es-ES',
      timezone: '', // '' means auto-detect from browser
    };
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Migration: old code saved the auto-detected browser timezone as the stored value
        // (before '' was introduced as "auto-detect"). If the stored timezone is a non-empty
        // string but the user explicitly_set_timezone flag is absent, it was auto-set, not
        // user-chosen. Reset it to '' so the browser timezone is always used correctly.
        const userExplicitlySetTz = parsed.timezone_user_set === true;
        if (parsed.timezone && !userExplicitlySetTz) {
          parsed.timezone = ''; // treat as auto-detect
        }
        return { ...defaults, ...parsed };
      }
    } catch (error) {
      // Error loading preferences, using defaults
    }
    return defaults;
  });

  // On mount: migrate any stale auto-set timezone back to '' (auto-detect).
  // This also runs after Vite HMR where the useState initializer is skipped.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const userExplicitlySetTz = parsed.timezone_user_set === true;
        if (parsed.timezone && !userExplicitlySetTz) {
          setPreferences(prev => ({ ...prev, timezone: '', timezone_user_set: false }));
        }
      }
    } catch (error) {
      // ignore
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save to localStorage whenever preferences change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
      // Error saving preferences
    }
  }, [preferences]);

  const setDatePattern = (pattern: DateFormatPattern) => {
    setPreferences(prev => ({ ...prev, datePattern: pattern }));
  };

  const setDateStyle = (style: DateFormatStyle) => {
    setPreferences(prev => ({ ...prev, dateStyle: style }));
  };

  const setLocale = (locale: string) => {
    setPreferences(prev => ({ ...prev, locale }));
  };

  const setTimezone = (timezone: string) => {
    setPreferences(prev => ({ ...prev, timezone, timezone_user_set: timezone !== '' }));
  };

  const formatDate = (date: Date | string, styleOverride?: DateFormatStyle): string => {
    const dateObj = parseDate(date);

    if (isNaN(dateObj.getTime())) {
      return 'Invalid date';
    }

    const style = styleOverride || preferences.dateStyle;

    // Handle relative dates (Note: use useDateTranslations hook for translated relative dates)
    if (style === 'relative') {
      const now = new Date();
      const diffTime = now.getTime() - dateObj.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      // Fall through to normal formatting for older dates
    }

    // Use Intl.DateTimeFormat with the user's locale preference
    try {
      const options: Intl.DateTimeFormatOptions = {};

      switch (style) {
        case 'short':
          options.dateStyle = 'short';
          break;
        case 'medium':
          options.dateStyle = 'medium';
          break;
        case 'long':
          options.dateStyle = 'long';
          break;
        default:
          options.dateStyle = 'short';
      }

      // Format with user's locale
      let formatted = new Intl.DateTimeFormat(preferences.locale, options).format(dateObj);

      // For 'short' style, apply custom pattern if specified
      if (style === 'short' || !styleOverride) {
        // Extract date parts in the configured timezone (not browser local time)
        const tz = preferences.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
        const tzParts = new Intl.DateTimeFormat('en-US', {
          timeZone: tz,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).formatToParts(dateObj);
        const tzMap = Object.fromEntries(tzParts.map(p => [p.type, p.value]));
        const day = tzMap.day;
        const month = tzMap.month;
        const year = tzMap.year;

        switch (preferences.datePattern) {
          case 'DD/MM/YYYY':
            formatted = `${day}/${month}/${year}`;
            break;
          case 'MM/DD/YYYY':
            formatted = `${month}/${day}/${year}`;
            break;
          case 'YYYY-MM-DD':
            formatted = `${year}-${month}-${day}`;
            break;
          case 'DD-MM-YYYY':
            formatted = `${day}-${month}-${year}`;
            break;
          case 'MM-DD-YYYY':
            formatted = `${month}-${day}-${year}`;
            break;
        }
      }

      return formatted;
    } catch (error) {
      return dateObj.toLocaleDateString();
    }
  };

  const formatDateTime = (date: Date | string, includeTime: boolean = true): string => {
    const dateObj = parseDate(date);

    if (isNaN(dateObj.getTime())) {
      return 'Invalid date';
    }

    try {
      if (!includeTime) {
        return formatDate(date);
      }

      const datePart = formatDate(date);
      const tz = preferences.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
      const timePart = dateObj.toLocaleTimeString('en-US', {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      return `${datePart} ${timePart}`;
    } catch (error) {
      return dateObj.toLocaleString();
    }
  };

  const value: DateFormatContextType = {
    datePattern: preferences.datePattern,
    dateStyle: preferences.dateStyle,
    locale: preferences.locale,
    timezone: preferences.timezone,
    setDatePattern,
    setDateStyle,
    setLocale,
    setTimezone,
    formatDate,
    formatDateTime,
  };

  return (
    <DateFormatContext.Provider value={value}>
      {children}
    </DateFormatContext.Provider>
  );
}

export function useDateFormat() {
  const context = useContext(DateFormatContext);
  if (context === undefined) {
    throw new Error('useDateFormat must be used within a DateFormatProvider');
  }
  return context;
}
