import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Section as BaseSection } from '@/shared/ui/layout/PageSidebar';
import { useI18n } from '@/shared/i18n/I18nProvider';
import type { TranslationKey } from '@/shared/i18n/translations';

type ModCatalogItem = {
  id: string;
  slug: string;
  title: string;
  description: string;
  author: string;
  version: string;
  versions: string[];
  iconUrl: string;
  projectUrl: string;
  tags: string[];
  downloads: number;
  followers: number;
  client: boolean;
  server: boolean;
};

type ModCatalog = {
  generatedAt: string;
  ready: boolean;
  total: number;
  matched: number;
  tags: string[];
  mods: ModCatalogItem[];
};

const PAGE_SIZE = 36;

export function ModCatalogSection({ disableMotion }: { disableMotion?: boolean }) {
  const { language, t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const [catalog, setCatalog] = useState<ModCatalog | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase('ru'));
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!expanded) return;
    const controller = new AbortController();
    fetch('/api/v1/public/mods', { signal: controller.signal, cache: 'no-cache' })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<ModCatalog>;
      })
      .then((value) => {
        setCatalog(value);
        setError(false);
      })
      .catch((reason: unknown) => {
        if (!(reason instanceof DOMException && reason.name === 'AbortError')) setError(true);
      });
    return () => controller.abort();
  }, [expanded]);

  const filtered = useMemo(() => {
    const mods = catalog?.mods ?? [];
    return mods.filter((mod) => {
      const haystack = `${mod.title} ${mod.author} ${mod.description} ${mod.tags.join(' ')}`.toLocaleLowerCase('ru');
      const matchesQuery = !deferredQuery || haystack.includes(deferredQuery);
      const matchesTags = selectedTags.length === 0 || selectedTags.every((tag) => mod.tags.includes(tag));
      return matchesQuery && matchesTags;
    });
  }, [catalog, deferredQuery, selectedTags]);

  useEffect(() => setVisibleCount(PAGE_SIZE), [deferredQuery, selectedTags]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || visibleCount >= filtered.length) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisibleCount((count) => Math.min(count + PAGE_SIZE, filtered.length));
      },
      { rootMargin: '500px 0px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filtered.length, visibleCount]);

  const toggleTag = (tag: string) => {
    setSelectedTags((current) => current.includes(tag) ? current.filter((value) => value !== tag) : [...current, tag]);
  };

  return (
    <BaseSection id="mods" title={t('wiki.sectionMods')} n={3} disableMotion={disableMotion}>
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-4 rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-left transition hover:border-sky-500/50 hover:bg-slate-900"
      >
        <span>
          <span className="block text-sm font-semibold text-slate-100">{expanded ? t('mods.hide') : t('mods.show')}</span>
          {!expanded && <span className="mt-0.5 block text-xs text-slate-400">{t('mods.collapsedHint')}</span>}
        </span>
        <ChevronIcon expanded={expanded} />
      </button>

      {expanded && <div className="mt-4">
      <div className="mb-4 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-300">
            {catalog?.ready ? modCountLabel(catalog.total, language, t) : t('mods.loading')}
          </p>
          <label className="relative block w-full sm:w-64">
            <SearchIcon />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('mods.search')}
              className="w-full rounded-xl border border-slate-700 bg-slate-950/80 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/15"
            />
          </label>
        </div>

        {!!catalog?.tags.length && (
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1" aria-label={t('mods.tagFilter')}>
            {catalog.tags.map((tag) => {
              const active = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  aria-pressed={active}
                  className={`shrink-0 rounded-full border px-3 py-1 text-xs transition ${active ? 'border-sky-400 bg-sky-500/20 text-sky-200' : 'border-slate-700 bg-slate-900/70 text-slate-300 hover:border-slate-500'}`}
                >
                  {displayTag(tag, language)}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          {t('mods.error')}
        </div>
      )}

      {!error && !catalog && <ModCardsSkeleton />}

      {!error && catalog && (
        <>
          <div className="space-y-2.5" aria-live="polite">
            {filtered.slice(0, visibleCount).map((mod) => <ModCard key={mod.id} mod={mod} />)}
          </div>
          {filtered.length === 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-8 text-center text-sm text-slate-400">
              {t('mods.empty')}
            </div>
          )}
          <div ref={sentinelRef} className="h-px" aria-hidden="true" />
          {visibleCount < filtered.length && (
            <button
              type="button"
              onClick={() => setVisibleCount((count) => Math.min(count + PAGE_SIZE, filtered.length))}
              className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-900/70 py-2 text-sm text-slate-300 hover:border-sky-500/60 hover:text-sky-200"
            >
              {t('mods.more')}
            </button>
          )}
        </>
      )}
      </div>}
    </BaseSection>
  );
}

function ModCard({ mod }: { mod: ModCatalogItem }) {
  const { language, t } = useI18n();
  const environment = mod.client && mod.server ? t('mods.clientServer') : mod.client ? t('mods.client') : t('mods.server');
  const content = (
    <>
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-sky-400/15 bg-slate-950/80 shadow-inner">
        <FallbackModIcon />
        {mod.iconUrl ? (
          <img src={mod.iconUrl} alt="" width={56} height={56} loading="lazy" decoding="async" onError={(event) => { event.currentTarget.style.display = 'none'; }} className="absolute inset-0 h-full w-full object-cover" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
          <h3 className="min-w-0 truncate font-semibold text-slate-100 group-hover:text-sky-200">{mod.title}</h3>
          <span className="truncate text-xs text-slate-500">{t('mods.by', { author: mod.author })}</span>
        </div>
        <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-300">{mod.description}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Tag>{environment}</Tag>
          {mod.version && <Tag>v{mod.version}</Tag>}
          {mod.tags.slice(0, 3).map((tag) => <Tag key={tag}>{displayTag(tag, language)}</Tag>)}
          {mod.tags.length > 3 && <Tag>+{mod.tags.length - 3}</Tag>}
        </div>
      </div>
      <div className="flex w-full shrink-0 justify-end gap-4 border-t border-slate-800/80 pt-2 text-xs text-slate-400 sm:w-[6.75rem] sm:flex-col sm:items-end sm:gap-2 sm:border-0 sm:pt-0">
        <Stat icon="download" value={compact(mod.downloads, language)} label={t('mods.downloads')} />
        <Stat icon="heart" value={compact(mod.followers, language)} label={t('mods.followers')} />
      </div>
    </>
  );

  const className = 'group flex flex-wrap items-start gap-3 rounded-2xl border border-slate-800 bg-slate-900/65 p-3 shadow-[0_12px_35px_-25px_rgba(56,189,248,.65)] transition hover:border-sky-500/35 hover:bg-slate-900/85 sm:flex-nowrap';
  const style = { contentVisibility: 'auto', containIntrinsicSize: '112px' } as React.CSSProperties;
  return mod.projectUrl ? (
    <a className={className} style={style} href={mod.projectUrl} target="_blank" rel="noreferrer" aria-label={t('mods.modrinthAria', { title: mod.title })}>
      {content}
    </a>
  ) : <article className={className} style={style}>{content}</article>;
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-slate-700/80 bg-slate-950/60 px-2 py-0.5 text-[11px] text-slate-400">{children}</span>;
}

function Stat({ icon, value, label }: { icon: 'download' | 'heart'; value: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5" title={label}>
      {icon === 'download' ? <DownloadIcon /> : <HeartIcon />}
      <span>{value}</span>
    </span>
  );
}

function ModCardsSkeleton() {
  const { t } = useI18n();
  return (
    <div className="space-y-2.5" aria-label={t('mods.loadingAria')}>
      {[0, 1, 2].map((value) => (
        <div key={value} className="flex animate-pulse gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
          <div className="h-14 w-14 rounded-xl bg-slate-800" />
          <div className="flex-1 space-y-2"><div className="h-4 w-1/2 rounded bg-slate-800" /><div className="h-3 w-full rounded bg-slate-800" /><div className="h-3 w-2/3 rounded bg-slate-800" /></div>
        </div>
      ))}
    </div>
  );
}

function displayTag(value: string, language: 'ru' | 'en') {
  const normalized = value.replace(/[-_]/g, ' ');
  return normalized.charAt(0).toLocaleUpperCase(language) + normalized.slice(1);
}

function compact(value: number, language: 'ru' | 'en') {
  return new Intl.NumberFormat(language === 'ru' ? 'ru-RU' : 'en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function modCountLabel(count: number, language: 'ru' | 'en', t: (key: TranslationKey, values?: Record<string, string | number>) => string) {
  const category = language === 'ru' ? new Intl.PluralRules('ru-RU').select(count) : new Intl.PluralRules('en-US').select(count);
  const key: TranslationKey = category === 'one' ? 'mods.current_one' : category === 'few' ? 'mods.current_few' : 'mods.current_many';
  return t(key, { count });
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={`h-5 w-5 shrink-0 text-sky-400 transition-transform ${expanded ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6" /></svg>;
}

function SearchIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>;
}

function DownloadIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 text-sky-400"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 20h14" /></svg>;
}

function HeartIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 text-rose-400"><path d="M20.8 5.8a5.5 5.5 0 0 0-7.8 0L12 6.9l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 22l8.8-8.4a5.5 5.5 0 0 0 0-7.8Z" /></svg>;
}

function FallbackModIcon() {
  return <svg aria-hidden="true" viewBox="0 0 56 56" fill="none" className="h-full w-full p-3 text-sky-400"><path d="m28 8 17 9.5v20L28 48l-17-10.5v-20L28 8Z" stroke="currentColor" strokeWidth="2"/><path d="m11 17.5 17 10 17-10M28 27.5V48" stroke="currentColor" strokeWidth="2"/></svg>;
}
