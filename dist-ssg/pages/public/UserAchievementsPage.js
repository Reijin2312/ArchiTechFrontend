import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { http } from '../../shared/api/http.js';
import { endpoints } from '../../shared/api/endpoints.js';
import { isSelf } from '../../shared/auth/isSelf.js';
import { useWallpaper } from '../../shared/ui/wallpaper/useWallpaper.js';
import { Seo } from '../../shared/seo/seo.js';
import { ProfileThemeProvider, useProfileTheme } from '../../shared/ui/utils/ProfileThemeContext.js';
const FILTERS = [
    { id: 'all', label: 'Все' },
    { id: 'unlocked', label: 'Открытые' },
    { id: 'locked', label: 'Скрытые' },
];
export default function UserAchievementsPage() {
    const username = useParams().username ?? '';
    const self = isSelf(username);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState(null);
    const [filter, setFilter] = useState('all');
    const [query, setQuery] = useState('');
    useWallpaper(user?.profileWallpaper || '/images/bg.avif');
    useEffect(() => {
        let alive = true;
        setLoading(true);
        setErr(null);
        const req = self ? http.get(endpoints.profileMe) : http.get(endpoints.userByName(username));
        req
            .then(({ data }) => {
            if (!alive)
                return;
            setUser(data);
        })
            .catch((e) => alive && setErr(e?.response?.data?.message || e?.message || 'Ошибка загрузки достижений'))
            .finally(() => alive && setLoading(false));
        return () => {
            alive = false;
        };
    }, [username, self]);
    const achievements = useMemo(() => user?.achievements ?? [], [user?.achievements]);
    const total = achievements.length;
    const unlockedCount = useMemo(() => achievements.filter((a) => a.unlocked).length, [achievements]);
    const lockedCount = Math.max(0, total - unlockedCount);
    const progress = total > 0 ? Math.round((unlockedCount / total) * 100) : 0;
    const sortedAchievements = useMemo(() => {
        return [...achievements].sort((a, b) => {
            if (a.unlocked !== b.unlocked)
                return a.unlocked ? -1 : 1;
            const aSort = typeof a.sortOrder === 'number' ? a.sortOrder : Number.MAX_SAFE_INTEGER;
            const bSort = typeof b.sortOrder === 'number' ? b.sortOrder : Number.MAX_SAFE_INTEGER;
            if (aSort !== bSort)
                return aSort - bSort;
            const aTime = a.unlockedAt ? Date.parse(a.unlockedAt) : 0;
            const bTime = b.unlockedAt ? Date.parse(b.unlockedAt) : 0;
            if (aTime !== bTime)
                return bTime - aTime;
            return a.title.localeCompare(b.title, 'ru');
        });
    }, [achievements]);
    const pinned = useMemo(() => {
        const withPin = achievements.filter((a) => a.unlocked && a.pinned);
        if (withPin.length > 0) {
            return [...withPin]
                .sort((a, b) => {
                const aTime = a.unlockedAt ? Date.parse(a.unlockedAt) : 0;
                const bTime = b.unlockedAt ? Date.parse(b.unlockedAt) : 0;
                return bTime - aTime;
            })
                .slice(0, 6);
        }
        return [...achievements]
            .filter((a) => a.unlocked)
            .sort((a, b) => {
            const aTime = a.unlockedAt ? Date.parse(a.unlockedAt) : 0;
            const bTime = b.unlockedAt ? Date.parse(b.unlockedAt) : 0;
            return bTime - aTime;
        })
            .slice(0, 6);
    }, [achievements]);
    const visibleCatalog = useMemo(() => {
        const q = normalizeText(query);
        return sortedAchievements.filter((a) => {
            if (filter === 'unlocked' && !a.unlocked)
                return false;
            if (filter === 'locked' && a.unlocked)
                return false;
            if (!q)
                return true;
            const hay = normalizeText(`${a.title} ${a.description}`);
            return hay.includes(q);
        });
    }, [sortedAchievements, filter, query]);
    const displayName = user?.displayName || user?.username || username;
    const metrics = useMemo(() => buildMetrics(user), [user]);
    const leftMetrics = metrics.slice(0, 3);
    const rightMetrics = metrics.slice(3, 6);
    return (_jsxs(_Fragment, { children: [_jsx(Seo, { title: `Достижения ${displayName} — ArchiTech MC`, robots: "noindex,follow" }), _jsx(ProfileThemeProvider, { themeId: user?.profileTheme, customColor1: user?.customThemeColor1, customColor2: user?.customThemeColor2, children: _jsx("div", { className: "min-h-dvh", children: _jsxs("main", { className: "mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6", children: [_jsxs("section", { className: "relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/70 p-5 shadow-[0_24px_60px_-30px_rgba(0,0,0,.85)] md:p-6", children: [_jsxs("div", { className: "pointer-events-none absolute inset-0", children: [_jsx("div", { className: "absolute -left-20 top-0 h-56 w-56 rounded-full bg-sky-500/12 blur-3xl" }), _jsx("div", { className: "absolute right-0 top-0 h-56 w-56 rounded-full bg-indigo-500/12 blur-3xl" }), _jsx("div", { className: "absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(251,191,36,.18),transparent_45%)]" })] }), _jsxs("div", { className: "relative z-10 mb-6 flex items-start justify-center", children: [_jsxs("div", { className: "inline-flex items-center justify-center gap-4", children: [_jsx("div", { className: "h-14 w-14 overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900 shadow-[0_8px_24px_-12px_rgba(14,165,233,.45)]", children: user?.avatarUrl ? (_jsx("img", { src: user.avatarUrl, alt: "\u0410\u0432\u0430\u0442\u0430\u0440", loading: "lazy", decoding: "async", className: "h-full w-full object-cover" })) : (_jsx("div", { className: "grid h-full w-full place-items-center text-lg font-semibold text-slate-300", children: (displayName?.charAt(0) || '?').toUpperCase() })) }), _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "text-xs uppercase tracking-[0.18em] text-slate-400", children: "\u0414\u043E\u0441\u0442\u0438\u0436\u0435\u043D\u0438\u044F \u0438\u0433\u0440\u043E\u043A\u0430" }), _jsx("h1", { className: "mt-1 text-2xl font-semibold text-slate-100 md:text-3xl", children: displayName })] })] }), _jsxs(Link, { to: `/u/${encodeURIComponent(username)}`, className: "absolute right-0 top-0 inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-sm text-slate-200 hover:border-slate-500", children: [_jsx("span", { "aria-hidden": "true", children: "\u21A9" }), "\u041A \u043F\u0440\u043E\u0444\u0438\u043B\u044E"] })] }), _jsxs("div", { className: "relative z-10 grid gap-4 lg:grid-cols-[1fr_280px_1fr] lg:items-center", children: [_jsx("div", { className: "grid gap-3", children: leftMetrics.map((metric) => (_jsx(MetricCard, { metric: metric }, metric.id))) }), _jsxs("div", { className: "mx-auto w-full max-w-[280px] rounded-3xl border border-amber-500/30 bg-slate-950/70 p-5 shadow-[0_0_0_1px_rgba(251,191,36,.2)_inset,0_18px_45px_-28px_rgba(251,191,36,.55)]", children: [_jsx("div", { className: "mb-3 text-center text-xs uppercase tracking-[0.14em] text-amber-200/85", children: "\u0420\u0435\u0439\u0442\u0438\u043D\u0433 \u0430\u0440\u0445\u0438\u0432\u0430" }), _jsx("div", { className: "mx-auto grid h-44 w-44 place-items-center rounded-full p-[12px]", style: {
                                                            background: `conic-gradient(from 200deg, rgba(14,165,233,.95) ${progress * 3.6}deg, rgba(51,65,85,.45) ${progress * 3.6}deg 360deg)`,
                                                        }, children: _jsxs("div", { className: "flex h-full w-full flex-col items-center justify-center rounded-full border border-slate-700 bg-slate-950/90 text-center", children: [_jsx("div", { className: "text-4xl leading-none", children: "\uD83C\uDFC6" }), _jsxs("div", { className: "mt-1 text-3xl leading-none font-semibold text-slate-100", children: [unlockedCount, "/", total] })] }) })] }), _jsx("div", { className: "grid gap-3", children: rightMetrics.map((metric) => (_jsx(MetricCard, { metric: metric }, metric.id))) })] })] }), _jsxs("section", { className: "relative overflow-hidden rounded-2xl border border-amber-400/25 bg-[linear-gradient(180deg,rgba(15,23,42,.9),rgba(9,14,28,.94))] p-4 shadow-[0_24px_60px_-34px_rgba(0,0,0,.95)]", children: [_jsxs("div", { className: "pointer-events-none absolute inset-0", children: [_jsx("div", { className: "absolute inset-0 bg-[repeating-linear-gradient(135deg,rgba(255,255,255,.02)_0px,rgba(255,255,255,.02)_2px,transparent_2px,transparent_8px)]" }), _jsx("div", { className: "absolute inset-0 bg-[radial-gradient(circle_at_50%_0,rgba(251,191,36,.13),transparent_45%)]" }), _jsx("div", { className: "absolute inset-0 bg-[radial-gradient(circle_at_0_100%,rgba(56,189,248,.08),transparent_40%)]" })] }), _jsx("div", { className: "relative z-10 mb-3 flex flex-col items-center justify-center gap-1 text-center", children: _jsx("h2", { className: "text-base font-semibold uppercase tracking-[0.12em] text-amber-100", children: "\u0417\u0430\u043A\u0440\u0435\u043F\u043B\u0435\u043D\u043D\u044B\u0435 \u043D\u0430\u0433\u0440\u0430\u0434\u044B" }) }), loading ? (_jsx("div", { className: "flex gap-3 overflow-hidden", children: Array.from({ length: 6 }).map((_, idx) => (_jsx(EmptyLoading, { className: "h-28 w-32 shrink-0" }, idx))) })) : pinned.length > 0 ? (_jsx("div", { className: "-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]", children: pinned.map((achievement) => (_jsx(PinnedRibbonItem, { achievement: achievement }, achievement.id))) })) : (_jsx(EmptyText, { text: "\u041F\u043E\u043A\u0430 \u043D\u0435\u0442 \u0437\u0430\u043A\u0440\u0435\u043F\u043B\u0435\u043D\u043D\u044B\u0445 \u043D\u0430\u0433\u0440\u0430\u0434" }))] }), _jsx("section", { children: _jsxs(Card, { children: [_jsxs("div", { className: "mb-4 flex flex-wrap items-center justify-between gap-3", children: [_jsx("h2", { className: "text-lg font-semibold text-slate-100", children: "\u041A\u0430\u0442\u0430\u043B\u043E\u0433 \u0434\u043E\u0441\u0442\u0438\u0436\u0435\u043D\u0438\u0439" }), _jsx("div", { className: "inline-flex rounded-xl border border-slate-700 bg-slate-900/80 p-1", children: FILTERS.map((item) => (_jsx("button", { type: "button", onClick: () => setFilter(item.id), className: `rounded-lg px-3 py-1.5 text-sm transition ${filter === item.id
                                                            ? 'bg-sky-500/20 text-sky-200 shadow-[0_0_0_1px_rgba(56,189,248,.35)_inset]'
                                                            : 'text-slate-300 hover:text-white'}`, children: item.label }, item.id))) })] }), _jsx("div", { className: "mb-4", children: _jsx("input", { value: query, onChange: (e) => setQuery(e.target.value), placeholder: "\u041F\u043E\u0438\u0441\u043A \u043F\u043E \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u044E \u0438\u043B\u0438 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u044E", className: "w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-500/60" }) }), loading ? (_jsx("div", { className: "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3", children: Array.from({ length: 6 }).map((_, idx) => (_jsx(EmptyLoading, { className: "h-24" }, idx))) })) : visibleCatalog.length > 0 ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "mb-3 text-xs text-slate-400", children: ["\u041F\u043E\u043A\u0430\u0437\u0430\u043D\u043E ", visibleCatalog.length, " \u2022 \u041E\u0442\u043A\u0440\u044B\u0442\u043E ", unlockedCount, " \u2022 \u0417\u0430\u043A\u0440\u044B\u0442\u043E ", lockedCount] }), _jsx("div", { className: "grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3", children: visibleCatalog.map((achievement) => (_jsx(AchievementTile, { achievement: achievement }, achievement.id))) })] })) : (_jsx(EmptyText, { text: "\u041F\u043E \u0442\u0435\u043A\u0443\u0449\u0435\u043C\u0443 \u0444\u0438\u043B\u044C\u0442\u0440\u0443 \u043D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E" }))] }) }), err && (_jsx("div", { className: "rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300", children: err }))] }) }) })] }));
}
function Card(props) {
    const { getThemeStyle } = useProfileTheme();
    const customStyle = getThemeStyle();
    return (_jsx("section", { className: `rounded-2xl border border-slate-800 bg-slate-950/65 p-4 shadow-[0_1px_0_#ffffff10_inset,0_20px_40px_-20px_#000] backdrop-blur-md backdrop-saturate-150 ${props.className ?? ''}`, style: { ...customStyle }, children: props.children }));
}
function MetricCard({ metric }) {
    const rightAligned = metric.id === 'deaths' || metric.id === 'playHours' || metric.id === 'walkedKm';
    return (_jsxs("article", { className: `rounded-2xl border border-slate-800/90 bg-slate-900/75 p-3 shadow-[0_10px_30px_-24px_rgba(56,189,248,.55)] ${rightAligned ? 'text-right' : ''}`, children: [_jsxs("div", { className: `mb-2 flex items-center gap-2 text-slate-400 ${rightAligned ? 'justify-end' : ''}`, children: [_jsx("span", { className: "text-lg", children: metric.icon }), _jsx("span", { className: "text-xs uppercase tracking-[0.08em]", children: metric.label })] }), _jsx("div", { className: "text-2xl font-semibold text-slate-100", children: metric.value }), _jsx("div", { className: "text-xs text-slate-500", children: metric.hint })] }));
}
function PinnedRibbonItem({ achievement }) {
    const unlockedAt = formatDate(achievement.unlockedAt);
    return (_jsx("article", { className: "group w-32 shrink-0", children: _jsxs("div", { className: "relative rounded-xl border border-amber-300/25 bg-black/35 p-2 shadow-[0_14px_28px_-18px_rgba(0,0,0,.9)]", children: [_jsx("div", { className: "pointer-events-none absolute inset-0 rounded-xl bg-[radial-gradient(circle_at_50%_0,rgba(251,191,36,.18),transparent_55%)]" }), _jsx("div", { className: "relative mx-auto mb-2 grid h-16 w-16 place-items-center rounded-full border border-amber-200/35 bg-[radial-gradient(circle,rgba(251,191,36,.24),rgba(2,6,23,.6)_72%)] text-2xl", children: achievement.icon || '🏅' }), _jsxs("div", { className: "relative text-center", children: [_jsx("div", { className: "truncate text-xs font-semibold uppercase tracking-[0.06em] text-amber-100", children: achievement.title }), _jsx("div", { className: "mt-0.5 text-[10px] text-amber-100/65", children: unlockedAt ?? 'закреплено' })] })] }) }));
}
function AchievementTile({ achievement }) {
    const unlocked = !!achievement.unlocked;
    const unlockedAt = formatDate(achievement.unlockedAt);
    return (_jsxs("article", { className: `relative overflow-hidden rounded-xl border p-3 transition ${unlocked
            ? 'border-amber-600/35 bg-linear-to-br from-amber-900/25 via-slate-900/70 to-slate-950/85'
            : 'border-slate-800 bg-slate-900/70'} min-h-24`, children: [_jsx("div", { className: "pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_100%_0,rgba(251,191,36,.18),transparent_45%)]" }), !unlocked && (_jsx("div", { className: "absolute inset-0 bg-slate-950/55 backdrop-blur-[1px]", children: _jsx("div", { className: "absolute right-2 top-2 rounded-full border border-slate-700 bg-slate-900/90 px-1.5 py-0.5 text-[11px] text-slate-300", children: "\uD83D\uDD12" }) })), _jsxs("div", { className: "relative z-10 flex items-start gap-3", children: [_jsx("div", { className: `text-3xl ${unlocked ? '' : 'grayscale'}`, children: achievement.icon || '🏅' }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("div", { className: `truncate text-sm font-semibold ${unlocked ? 'text-amber-200' : 'text-slate-300'}`, children: achievement.title }), _jsx("div", { className: "mt-0.5 line-clamp-2 text-xs text-slate-400", children: achievement.description }), unlockedAt && (_jsxs("div", { className: "mt-2 text-[11px] text-slate-500", children: ["\u041F\u043E\u043B\u0443\u0447\u0435\u043D\u043E: ", _jsx("span", { className: "text-slate-300", children: unlockedAt })] }))] })] })] }));
}
function EmptyLoading({ className = 'h-20' }) {
    return _jsx("div", { className: `animate-pulse rounded-xl border border-slate-800 bg-slate-900 ${className}` });
}
function EmptyText({ text }) {
    return (_jsx("div", { className: "rounded-xl border border-slate-800 bg-slate-900 p-5 text-center text-sm text-slate-400", children: text }));
}
function formatDate(iso) {
    if (!iso)
        return null;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime()))
        return null;
    return date.toLocaleDateString('ru-RU');
}
function normalizeText(value) {
    return value.trim().toLowerCase();
}
function buildMetrics(user) {
    const roots = [user, user?.stats, user?.minecraftStats, user?.gameStats, user?.mcStats].filter(Boolean);
    const mobKills = findNumber(roots, ['mobKills', 'mobsKilled', 'mob_kills', 'kills.mob']);
    const blocksPlaced = findNumber(roots, ['blocksPlaced', 'blocks_placed', 'placedBlocks', 'world.blocksPlaced']);
    const blocksBroken = findNumber(roots, ['blocksBroken', 'blocksMined', 'blocks_broken', 'blocks_mined']);
    const deaths = findNumber(roots, ['deaths', 'playerDeaths', 'death_count']);
    const playHours = readPlayHours(roots);
    const walkedKm = readDistanceKm(roots);
    return [
        { id: 'mobKills', icon: '⚔️', label: 'Убито мобов', value: formatMetricValue(mobKills), hint: '' },
        { id: 'blocksPlaced', icon: '🧱', label: 'Поставлено блоков', value: formatMetricValue(blocksPlaced), hint: '' },
        { id: 'blocksBroken', icon: '⛏️', label: 'Добыто блоков', value: formatMetricValue(blocksBroken), hint: '' },
        { id: 'deaths', icon: '☠️', label: 'Смертей', value: formatMetricValue(deaths), hint: '' },
        { id: 'playHours', icon: '⌛', label: 'Часов в мире', value: formatMetricValue(playHours), hint: '' },
        { id: 'walkedKm', icon: '🧭', label: 'Пройдено км', value: formatMetricValue(walkedKm, 1), hint: '' },
    ];
}
function formatMetricValue(value, maxFractionDigits = 0) {
    if (value == null || Number.isNaN(value))
        return '—';
    return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: maxFractionDigits }).format(value);
}
function readPlayHours(roots) {
    const directHours = findNumber(roots, ['playHours', 'play_time_hours', 'timePlayedHours']);
    if (directHours != null)
        return directHours;
    const minutes = findNumber(roots, ['playMinutes', 'play_time_minutes', 'timePlayedMinutes']);
    if (minutes != null)
        return minutes / 60;
    const seconds = findNumber(roots, ['playSeconds', 'play_time_seconds', 'timePlayedSeconds']);
    if (seconds != null)
        return seconds / 3600;
    const ticks = findNumber(roots, ['playTicks', 'play_time_ticks', 'playTime']);
    if (ticks != null)
        return ticks / 72000;
    return null;
}
function readDistanceKm(roots) {
    const km = findNumber(roots, ['distanceKm', 'distance_km', 'walkedKm']);
    if (km != null)
        return km;
    const meters = findNumber(roots, ['distanceMeters', 'distance_meters', 'walkedMeters']);
    if (meters != null)
        return meters / 1000;
    const cm = findNumber(roots, ['distanceCm', 'distance_cm', 'walkedCm', 'walk_one_cm']);
    if (cm != null)
        return cm / 100000;
    return null;
}
function findNumber(roots, keys) {
    for (const root of roots) {
        for (const key of keys) {
            const value = key.includes('.') ? readPath(root, key) : root[key];
            const num = toNumber(value);
            if (num != null)
                return num;
        }
    }
    return null;
}
function readPath(source, path) {
    const parts = path.split('.');
    let current = source;
    for (const part of parts) {
        if (current == null || typeof current !== 'object' || !(part in current)) {
            return null;
        }
        current = current[part];
    }
    return current;
}
function toNumber(value) {
    if (typeof value === 'number' && Number.isFinite(value))
        return value;
    if (typeof value === 'string') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}
