import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'betali_theme_preference';

function getSystemDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyTheme(theme: ThemePreference) {
  const root = document.documentElement;
  if (theme === 'system') {
    // Always set an explicit data-theme so the full CSS override block applies
    root.setAttribute('data-theme', getSystemDark() ? 'dark' : 'light');
    root.style.colorScheme = '';
  } else {
    root.setAttribute('data-theme', theme);
    root.style.colorScheme = theme;
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        // Apply synchronously during init to avoid flash of wrong theme
        applyTheme(stored);
        return stored;
      }
    } catch {
      // ignore
    }
    applyTheme('system');
    return 'system';
  });

  useEffect(() => {
    applyTheme(theme);

    // When in system mode, listen for OS preference changes
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');
      mq.addEventListener('change', handleChange);
      return () => mq.removeEventListener('change', handleChange);
    }
  }, [theme]);

  const setTheme = (next: ThemePreference) => {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
