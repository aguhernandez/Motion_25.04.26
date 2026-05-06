import { useState, useCallback } from 'react';
import type { Language } from '../lib/i18n';
import { translations } from '../lib/i18n';
import type { TTranslations } from '../lib/LanguageContext';

const STORAGE_KEY = 'biomechanic_lang';

function getInitialLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'es' || stored === 'en') return stored;
  } catch {
    // ignore
  }
  return 'es';
}

export function useLanguage() {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ignore
    }
  }, []);

  const t = translations[language] as TTranslations;

  return { language, setLanguage, t };
}
