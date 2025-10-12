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
}

export function DateFormatProvider({ children }: { children: React.ReactNode }) {
  // Load from localStorage or use defaults
  const [preferences, setPreferences] = useState<DateFormatPreferences>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading date format preferences:', error);
    }
    return {
      datePattern: 'DD/MM/YYYY',
      dateStyle: 'short',
      locale: 'es-ES',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  });

  // Save to localStorage whenever preferences change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.error('Error saving date format preferences:', error);
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
    setPreferences(prev => ({ ...prev, timezone }));
  };

  const formatDate = (date: Date | string, styleOverride?: DateFormatStyle): string => {
    const dateObj = date instanceof Date ? date : new Date(date);

    if (isNaN(dateObj.getTime())) {
      return 'Fecha inválida';
    }

    const style = styleOverride || preferences.dateStyle;

    // Handle relative dates
    if (style === 'relative') {
      const now = new Date();
      const diffTime = now.getTime() - dateObj.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return 'Hoy';
      if (diffDays === 1) return 'Ayer';
      if (diffDays < 7) return `Hace ${diffDays} días`;
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
        const day = dateObj.getDate().toString().padStart(2, '0');
        const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
        const year = dateObj.getFullYear();

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
      console.error('Error formatting date:', error);
      return dateObj.toLocaleDateString();
    }
  };

  const formatDateTime = (date: Date | string, includeTime: boolean = true): string => {
    const dateObj = date instanceof Date ? date : new Date(date);

    if (isNaN(dateObj.getTime())) {
      return 'Fecha inválida';
    }

    try {
      if (!includeTime) {
        return formatDate(date);
      }

      const datePart = formatDate(date);
      const timePart = dateObj.toLocaleTimeString('en-US', {
        timeZone: preferences.timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      return `${datePart} ${timePart}`;
    } catch (error) {
      console.error('Error formatting date-time:', error);
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
