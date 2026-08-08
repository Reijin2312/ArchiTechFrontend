import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Section as BaseSection } from '../../../shared/ui/layout/PageSidebar.js';
import { useI18n } from '../../../shared/i18n/I18nProvider.js';
const PAGE_SIZE = 36;
export function ModCatalogSection({ disableMotion }) {
    const { language, t } = useI18n();
    const [expanded, setExpanded] = useState(false);
    const [catalog, setCatalog] = useState(null);
    const [error, setError] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedTags, setSelectedTags] = useState([]);
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase('ru'));
    const sentinelRef = useRef(null);
    useEffect(() => {
        if (!expanded)
            return;
        const controller = new AbortController();
        fetch('/api/v1/public/mods', { signal: controller.signal, cache: 'no-cache' })
            .then((response) => {
            if (!response.ok)
                throw new Error(`HTTP ${response.status}`);
            return response.json();
        })
            .then((value) => {
            setCatalog(value);
            setError(false);
        })
            .catch((reason) => {
            if (!(reason instanceof DOMException && reason.name === 'AbortError'))
                setError(true);
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
        if (!sentinel || visibleCount >= filtered.length)
            return;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting)
                setVisibleCount((count) => Math.min(count + PAGE_SIZE, filtered.length));
        }, { rootMargin: '500px 0px' });
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [filtered.length, visibleCount]);
    const toggleTag = (tag) => {
        setSelectedTags((current) => current.includes(tag) ? current.filter((value) => value !== tag) : [...current, tag]);
    };
    return (_jsxs(BaseSection, { id: "mods", title: t('wiki.sectionMods'), n: 3, disableMotion: disableMotion, children: [_jsxs("button", { type: "button", onClick: () => setExpanded((value) => !value), "aria-expanded": expanded, className: "flex w-full items-center justify-between gap-4 rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-left transition hover:border-sky-500/50 hover:bg-slate-900", children: [_jsxs("span", { children: [_jsx("span", { className: "block text-sm font-semibold text-slate-100", children: expanded ? t('mods.hide') : t('mods.show') }), !expanded && _jsx("span", { className: "mt-0.5 block text-xs text-slate-400", children: t('mods.collapsedHint') })] }), _jsx(ChevronIcon, { expanded: expanded })] }), expanded && _jsxs("div", { className: "mt-4", children: [_jsxs("div", { className: "mb-4 space-y-3", children: [_jsxs("div", { className: "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between", children: [_jsx("p", { className: "text-sm text-slate-300", children: catalog?.ready ? modCountLabel(catalog.total, language, t) : t('mods.loading') }), _jsxs("label", { className: "relative block w-full sm:w-64", children: [_jsx(SearchIcon, {}), _jsx("input", { value: query, onChange: (event) => setQuery(event.target.value), placeholder: t('mods.search'), className: "w-full rounded-xl border border-slate-700 bg-slate-950/80 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/15" })] })] }), !!catalog?.tags.length && (_jsx("div", { className: "no-scrollbar flex gap-2 overflow-x-auto pb-1", "aria-label": t('mods.tagFilter'), children: catalog.tags.map((tag) => {
                                    const active = selectedTags.includes(tag);
                                    return (_jsx("button", { type: "button", onClick: () => toggleTag(tag), "aria-pressed": active, className: `shrink-0 rounded-full border px-3 py-1 text-xs transition ${active ? 'border-sky-400 bg-sky-500/20 text-sky-200' : 'border-slate-700 bg-slate-900/70 text-slate-300 hover:border-slate-500'}`, children: displayTag(tag, language) }, tag));
                                }) }))] }), error && (_jsx("div", { className: "rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100", children: t('mods.error') })), !error && !catalog && _jsx(ModCardsSkeleton, {}), !error && catalog && (_jsxs(_Fragment, { children: [_jsx("div", { className: "space-y-2.5", "aria-live": "polite", children: filtered.slice(0, visibleCount).map((mod) => _jsx(ModCard, { mod: mod }, mod.id)) }), filtered.length === 0 && (_jsx("div", { className: "rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-8 text-center text-sm text-slate-400", children: t('mods.empty') })), _jsx("div", { ref: sentinelRef, className: "h-px", "aria-hidden": "true" }), visibleCount < filtered.length && (_jsx("button", { type: "button", onClick: () => setVisibleCount((count) => Math.min(count + PAGE_SIZE, filtered.length)), className: "mt-3 w-full rounded-xl border border-slate-700 bg-slate-900/70 py-2 text-sm text-slate-300 hover:border-sky-500/60 hover:text-sky-200", children: t('mods.more') }))] }))] })] }));
}
function ModCard({ mod }) {
    const { language, t } = useI18n();
    const environment = mod.client && mod.server ? t('mods.clientServer') : mod.client ? t('mods.client') : t('mods.server');
    const content = (_jsxs(_Fragment, { children: [_jsxs("div", { className: "relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-sky-400/15 bg-slate-950/80 shadow-inner", children: [_jsx(FallbackModIcon, {}), mod.iconUrl ? (_jsx("img", { src: mod.iconUrl, alt: "", width: 56, height: 56, loading: "lazy", decoding: "async", onError: (event) => { event.currentTarget.style.display = 'none'; }, className: "absolute inset-0 h-full w-full object-cover" })) : null] }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("div", { className: "flex min-w-0 flex-wrap items-baseline gap-x-2", children: [_jsx("h3", { className: "min-w-0 truncate font-semibold text-slate-100 group-hover:text-sky-200", children: mod.title }), _jsx("span", { className: "truncate text-xs text-slate-500", children: t('mods.by', { author: mod.author }) })] }), _jsx("p", { className: "mt-1 line-clamp-2 text-sm leading-5 text-slate-300", children: mod.description }), _jsxs("div", { className: "mt-2 flex flex-wrap gap-1.5", children: [_jsx(Tag, { children: environment }), mod.version && _jsxs(Tag, { children: ["v", mod.version] }), mod.tags.slice(0, 3).map((tag) => _jsx(Tag, { children: displayTag(tag, language) }, tag)), mod.tags.length > 3 && _jsxs(Tag, { children: ["+", mod.tags.length - 3] })] })] }), _jsxs("div", { className: "flex w-full shrink-0 justify-end gap-4 border-t border-slate-800/80 pt-2 text-xs text-slate-400 sm:w-[6.75rem] sm:flex-col sm:items-end sm:gap-2 sm:border-0 sm:pt-0", children: [_jsx(Stat, { icon: "download", value: compact(mod.downloads, language), label: t('mods.downloads') }), _jsx(Stat, { icon: "heart", value: compact(mod.followers, language), label: t('mods.followers') })] })] }));
    const className = 'group flex flex-wrap items-start gap-3 rounded-2xl border border-slate-800 bg-slate-900/65 p-3 shadow-[0_12px_35px_-25px_rgba(56,189,248,.65)] transition hover:border-sky-500/35 hover:bg-slate-900/85 sm:flex-nowrap';
    const style = { contentVisibility: 'auto', containIntrinsicSize: '112px' };
    return mod.projectUrl ? (_jsx("a", { className: className, style: style, href: mod.projectUrl, target: "_blank", rel: "noreferrer", "aria-label": t('mods.modrinthAria', { title: mod.title }), children: content })) : _jsx("article", { className: className, style: style, children: content });
}
function Tag({ children }) {
    return _jsx("span", { className: "rounded-full border border-slate-700/80 bg-slate-950/60 px-2 py-0.5 text-[11px] text-slate-400", children: children });
}
function Stat({ icon, value, label }) {
    return (_jsxs("span", { className: "inline-flex items-center gap-1.5", title: label, children: [icon === 'download' ? _jsx(DownloadIcon, {}) : _jsx(HeartIcon, {}), _jsx("span", { children: value })] }));
}
function ModCardsSkeleton() {
    const { t } = useI18n();
    return (_jsx("div", { className: "space-y-2.5", "aria-label": t('mods.loadingAria'), children: [0, 1, 2].map((value) => (_jsxs("div", { className: "flex animate-pulse gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-3", children: [_jsx("div", { className: "h-14 w-14 rounded-xl bg-slate-800" }), _jsxs("div", { className: "flex-1 space-y-2", children: [_jsx("div", { className: "h-4 w-1/2 rounded bg-slate-800" }), _jsx("div", { className: "h-3 w-full rounded bg-slate-800" }), _jsx("div", { className: "h-3 w-2/3 rounded bg-slate-800" })] })] }, value))) }));
}
function displayTag(value, language) {
    const normalized = value.replace(/[-_]/g, ' ');
    return normalized.charAt(0).toLocaleUpperCase(language) + normalized.slice(1);
}
function compact(value, language) {
    return new Intl.NumberFormat(language === 'ru' ? 'ru-RU' : 'en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}
function modCountLabel(count, language, t) {
    const category = language === 'ru' ? new Intl.PluralRules('ru-RU').select(count) : new Intl.PluralRules('en-US').select(count);
    const key = category === 'one' ? 'mods.current_one' : category === 'few' ? 'mods.current_few' : 'mods.current_many';
    return t(key, { count });
}
function ChevronIcon({ expanded }) {
    return _jsx("svg", { "aria-hidden": "true", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", className: `h-5 w-5 shrink-0 text-sky-400 transition-transform ${expanded ? 'rotate-180' : ''}`, children: _jsx("path", { d: "m6 9 6 6 6-6" }) });
}
function SearchIcon() {
    return _jsxs("svg", { "aria-hidden": "true", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", className: "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500", children: [_jsx("circle", { cx: "11", cy: "11", r: "6.5" }), _jsx("path", { d: "m16 16 4 4" })] });
}
function DownloadIcon() {
    return _jsx("svg", { "aria-hidden": "true", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", className: "h-4 w-4 text-sky-400", children: _jsx("path", { d: "M12 3v12m0 0 4-4m-4 4-4-4M5 20h14" }) });
}
function HeartIcon() {
    return _jsx("svg", { "aria-hidden": "true", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", className: "h-4 w-4 text-rose-400", children: _jsx("path", { d: "M20.8 5.8a5.5 5.5 0 0 0-7.8 0L12 6.9l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 22l8.8-8.4a5.5 5.5 0 0 0 0-7.8Z" }) });
}
function FallbackModIcon() {
    return _jsxs("svg", { "aria-hidden": "true", viewBox: "0 0 56 56", fill: "none", className: "h-full w-full p-3 text-sky-400", children: [_jsx("path", { d: "m28 8 17 9.5v20L28 48l-17-10.5v-20L28 8Z", stroke: "currentColor", strokeWidth: "2" }), _jsx("path", { d: "m11 17.5 17 10 17-10M28 27.5V48", stroke: "currentColor", strokeWidth: "2" })] });
}
