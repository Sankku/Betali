// Solo exportamos `es` de forma síncrona — es el locale por defecto.
// El locale 'en' se carga dinámicamente en LanguageContext cuando el usuario lo selecciona.
export { es } from './es';
export type Locale = 'es' | 'en';
export type { TranslationKeys } from './es';
