import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { es, Locale, TranslationKeys } from '../locales';

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'betali_language_preference';

// Helper function to get nested value from object using dot notation
function getNestedValue(obj: any, path: string): string {
  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return path; // Return key if not found
    }
  }

  return typeof current === 'string' ? current : path;
}

// Helper function to replace placeholders in translation strings
function replacePlaceholders(text: string, params?: Record<string, string | number>): string {
  if (!params) return text;

  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return params[key]?.toString() || match;
  });
}

// Cache for dynamically loaded locales so we don't re-fetch on locale toggle
const localeCache: Record<string, any> = { es };

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Load from localStorage or use default (Spanish)
  const [locale, setLocaleState] = useState<Locale>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && (stored === 'es' || stored === 'en')) {
        return stored as Locale;
      }
    } catch (error) {
      // Error loading preference, using default
    }
    return 'es'; // Default to Spanish
  });

  // Current translations object — starts with `es` synchronously, switches async
  const [currentTranslations, setCurrentTranslations] = useState<any>(es);
  const pendingLocaleRef = useRef<Locale | null>(null);

  // Load locale file dynamically — only 'en' needs a network round-trip; 'es' is always cached
  useEffect(() => {
    if (localeCache[locale]) {
      setCurrentTranslations(localeCache[locale]);
      return;
    }
    pendingLocaleRef.current = locale;
    import('../locales/en').then(({ en }) => {
      localeCache['en'] = en;
      if (pendingLocaleRef.current === 'en') {
        setCurrentTranslations(en);
      }
    });
  }, [locale]);

  // Save to localStorage whenever locale changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch (error) {
      // Error saving preference
    }
  }, [locale]);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    const translation = getNestedValue(currentTranslations, key);
    return replacePlaceholders(translation, params);
  };

  const value: LanguageContextType = {
    locale,
    setLocale,
    t,
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}
