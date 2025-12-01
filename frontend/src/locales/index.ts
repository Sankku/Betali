import { es } from './es';
import { en } from './en';

export const translations = {
  es,
  en,
} as const;

export type Locale = keyof typeof translations;
export type { TranslationKeys } from './es';
