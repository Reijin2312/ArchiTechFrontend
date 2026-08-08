import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { translations } from './translations';
import type { Language, TranslationKey } from './translations';

const STORAGE_KEY = 'architech-language';

type Translate = (key: TranslationKey, values?: Record<string, string | number>) => string;
type I18nValue = { language: Language; setLanguage: (language: Language) => void; t: Translate };

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => preferredLanguage());

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* storage can be disabled */ }
  }, []);

  const t = useCallback<Translate>((key, values) => {
    let value: string = translations[language][key];
    if (values) {
      for (const [name, replacement] of Object.entries(values)) {
        value = value.split(`{${name}}`).join(String(replacement));
      }
    }
    return value;
  }, [language]);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dataset.language = language;
  }, [language]);

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);
  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside I18nProvider');
  return value;
}

function preferredLanguage(): Language {
  if (typeof window === 'undefined') return 'ru';
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'ru' || stored === 'en') return stored;
  } catch { /* storage can be disabled */ }

  const locales = navigator.languages?.length ? navigator.languages : [navigator.language];
  if (locales.some((locale) => /^ru(?:-|$)/i.test(locale))) return 'ru';
  const russianRegions = new Set(['RU', 'BY', 'KZ', 'KG']);
  if (locales.some((locale) => russianRegions.has(locale.split('-')[1]?.toUpperCase()))) return 'ru';
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
  if (RUSSIAN_TIME_ZONES.has(zone)) return 'ru';
  return 'en';
}

const RUSSIAN_TIME_ZONES = new Set([
  'Europe/Kaliningrad', 'Europe/Moscow', 'Europe/Kirov', 'Europe/Volgograd',
  'Europe/Saratov', 'Europe/Ulyanovsk', 'Europe/Samara', 'Asia/Yekaterinburg',
  'Asia/Omsk', 'Asia/Novosibirsk', 'Asia/Barnaul', 'Asia/Tomsk', 'Asia/Krasnoyarsk',
  'Asia/Irkutsk', 'Asia/Chita', 'Asia/Yakutsk', 'Asia/Khandyga', 'Asia/Vladivostok',
  'Asia/Ust-Nera', 'Asia/Magadan', 'Asia/Sakhalin', 'Asia/Srednekolymsk',
  'Asia/Kamchatka', 'Asia/Anadyr',
]);
