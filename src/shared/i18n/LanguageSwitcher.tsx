import { useEffect, useRef, useState } from 'react';
import { useI18n } from './I18nProvider';
import type { Language } from './translations';

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  const choose = (next: Language) => {
    setLanguage(next);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={t('language.label')}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-slate-900/70 transition hover:border-sky-500/60 hover:bg-slate-800"
      >
        <FlagIcon language={language} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-11 z-50 min-w-40 overflow-hidden rounded-xl border border-slate-700 bg-slate-950/95 p-1.5 shadow-2xl backdrop-blur-xl">
          <LanguageOption language="ru" current={language} label={t('language.ru')} onChoose={choose} />
          <LanguageOption language="en" current={language} label={t('language.en')} onChoose={choose} />
        </div>
      )}
    </div>
  );
}

function LanguageOption({ language, current, label, onChoose }: { language: Language; current: Language; label: string; onChoose: (language: Language) => void }) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={current === language}
      onClick={() => onChoose(language)}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${current === language ? 'bg-sky-500/15 text-sky-200' : 'text-slate-200 hover:bg-slate-800'}`}
    >
      <FlagIcon language={language} />
      <span>{label}</span>
    </button>
  );
}

export function FlagIcon({ language }: { language: Language }) {
  if (language === 'ru') {
    return <span aria-hidden="true" className="grid h-4 w-6 shrink-0 overflow-hidden rounded-[3px] border border-white/20 shadow-sm"><span className="bg-white" /><span className="bg-[#1751a5]" /><span className="bg-[#d52b1e]" /></span>;
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 60 36" className="h-4 w-6 shrink-0 overflow-hidden rounded-[3px] border border-white/20 shadow-sm">
      <rect width="60" height="36" fill="#012169" /><path d="M0 0 60 36M60 0 0 36" stroke="#fff" strokeWidth="8" /><path d="M0 0 60 36M60 0 0 36" stroke="#c8102e" strokeWidth="4" /><path d="M30 0v36M0 18h60" stroke="#fff" strokeWidth="12" /><path d="M30 0v36M0 18h60" stroke="#c8102e" strokeWidth="7" />
    </svg>
  );
}
