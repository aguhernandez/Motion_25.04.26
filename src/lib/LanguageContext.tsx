import { createContext, useContext } from 'react';
import type { Language } from './i18n';
import { translations } from './i18n';

export type TTranslations = typeof translations[Language];

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TTranslations;
  darkMode: boolean;
  onToggleDark: () => void;
}

export const LanguageContext = createContext<LanguageContextValue>({
  language: 'es',
  setLanguage: () => {},
  t: translations['es'] as TTranslations,
  darkMode: true,
  onToggleDark: () => {},
});

export function useT() {
  return useContext(LanguageContext);
}
