import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWallpaper } from '../../shared/ui/wallpaper/useWallpaper.js';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Seo } from '../../shared/seo/seo.js';
import { routesMeta } from '../../shared/seo/routesMeta.js';
import { ResponsiveImage } from '../../shared/ui/image/ResponsiveImage.js';
import { SvgModpack, SvgShield, SvgGitHub, SvgChevronDown } from '../../shared/ui/image/Icons.js';
import { useIsMobile } from '../../shared/ui/utils/useIsMobile.js';
import { SERVER_NAME, DISCORD_URL, TELEGRAM_URL, LAUNCHER_DOWNLOAD_URL } from '../../shared/constants.js';
import { useI18n } from '../../shared/i18n/I18nProvider.js';
import { aboutTranslations, englishSeasons } from '../../shared/i18n/aboutTranslations.js';
const SEASONS = [
    {
        number: 1,
        name: 'Мир островов',
        period: 'Май 2022 — Октябрь 2022',
        description: 'Первый сезон был пробной попыткой понять, насколько интересно будет играть с друзьями на локальном сервере «только для своих», который поднимался через локальную сеть. Мир сезона — «Мир островов» — жил на небольшой, разрозненной сборке модов, но уже тогда Create занял ключевое место в геймплее и стал символом технического направления сервера. Первой базой стала яма под домом в деревне на спавне, которую выкопали kiduvl и Raijin — простая стартовая точка, из которой позже выросли привычки и подходы, перекочевавшие в следующие сезоны.',
        features: ['Постройка игроком Raijin базы и спавна, восточный стиль которых затем будет мигрировать с сезона на сезон',
            'Мирная жизнь Kelbor_Hal на островке под названием Нострамо, который впоследствии был взорван его же руками',
            'Основание первой и единственной промзоны Медуза-1 Vlad2509',
            'Прокладывание титанической железной дороги, соединяющей спавн, базу игрока kookyxa и Медузу-1',
            'Совместными силами прокладывается метро, которое так ни разу и не было запущено',
            'Kelbor_Hal сооружает гранитную башню Энунция, скребущую небеса, которая была расстреляна из огромной пушки в знак окончания первого сезона и закрытия сервера'],
        screenshots: ['/images/screen6.png', '/images/screen7.png', '/images/screen8.png'],
        players: [
            { username: 'Raijin', role: 'Основатель' },
            { username: 'Kelbor_Hal', role: 'Администратор' },
            { username: 'kookyxa', role: 'Игрок' },
            { username: 'kiduvl', role: 'Игрок' },
            { username: 'Anjelka63', role: 'Игрок' },
            { username: 'Orter', role: 'Игрок' },
            { username: 'Vlad2509', role: 'Игрок' },
        ],
        legacy: true
    },
    {
        number: 2,
        name: 'Мир равнин',
        period: 'Ноябрь 2022 — Май 2023',
        description: 'Второй сезон стал воплощением желания снова собраться той же компанией и начать заново — уже с опытом и ожиданием больших проектов. Новый мир — «Мир равнин», новая сборка модов, знакомые лица. Центрами жизни сезона стали спавн и промзона «Олимпия». Спавн представлял собой горную долину с озером, где Kelbor_Hal начал строительство черного замка. Позже озеро полностью преобразилось: kiduvl засадил его «ельбезами» — гигантскими деревьями, которые стали визуальной визиткой сезона. «Олимпия» же закрепила статус сервера как технической площадки: Kelbor_Hal отвечал за архитектуру и внешний облик, а Raijin — за внутреннее наполнение, инфраструктуру и связность мира, включая железную дорогу и вокзалы на обеих станциях. Сезон завершился раньше, чем успел раскрыться: обстоятельства поставили точку, и ни один крупный проект не был доведён до полного финала.',
        features: ['Запуск сезона в мире «Мир равнин» с обновлённой сборкой модов и возвращением старой компании',
            'Начало строительства черного замка на озере спавна игроком Kelbor_Hal',
            'Полное преобразование озера спавна «ельбезами» — гигантскими деревьями',
            'Основание и развитие промзоны «Олимпия» как главного технического проекта сезона',
            'Архитектурный дизайн цеха и территории «Олимпии» от Kelbor_Hal и техническое наполнение от Raijin',
            'Прокладка железной дороги между спавном и «Олимпией», строительство вокзалов на каждой станции',
            'Раннее завершение сезона, из-за чего проекты так и остались на стадии «почти получилось»'],
        screenshots: ['/images/screen3.png', '/images/screen4.png'],
        players: [
            { username: 'Raijin', role: 'Основатель' },
            { username: 'Kelbor_Hal', role: 'Администратор' },
            { username: 'Wolle', role: 'Тех. Админ' },
            { username: 'kiduvl', role: 'Игрок' },
            { username: 'Sile_Scorp', role: 'Игрок' },
            { username: 'kookyxa', role: 'Игрок' },
            { username: 'anton_roma', role: 'Игрок' }
        ],
        legacy: true
    },
    {
        number: 3,
        name: 'Промышленная революция',
        period: 'Июнь 2023 — Декабрь 2023',
        description: 'Третий сезон стал переходным: обновили версию игры, пересобрали модпак и начали проверять, как это всё держится в долгой игре. Часть решений прижилась сразу, часть пришлось менять уже по ходу сезона.',
        features: ['Переезд на новую версию Minecraft и пересборка модпака', 'Первая крупная правка серверной экономики', 'Тест ранних версий самописных модов в реальной игре', 'Подготовка базы под формат мира без вайпов'],
        screenshots: ['/images/screen5.png', '/images/screen6.png'],
        players: [
            { username: 'Raijin', role: 'Владелец' },
            { username: 'Kelbor_Hal', role: 'Администратор' },
            { username: 'Wolle', role: 'Тех. Админ' },
            { username: 'Sile_Scorp', role: 'Дизайнер' },
            { username: 'Explyp', role: 'Python-программист' },
            { username: 'NephiliM', role: 'Игрок' },
            { username: 'kiduvl', role: 'Игрок' },
            { username: 'kookyxa', role: 'Игрок' },
            { username: 'anton_roma', role: 'Игрок' }
        ],
        legacy: true
    },
    {
        number: 4,
        name: 'Инфинити',
        period: '20 июля 2025 года — Настоящее время',
        description: 'Это текущий сезон. Мир перенесли из третьего сезона вместе с дорогами и постройками, так что никто не стартовал с пустого места. Идея простая: развивать один живой мир без регулярных обнулений.',
        features: ['Полные вайпы отключены', 'Техника и магия развиваются параллельно', 'Упор на долгие совместные проекты', 'Экономика меняется аккуратно, без резких обнулений'],
        screenshots: [
            '/images/screen10.png',
            '/images/screen12.png'
        ],
        players: [
            { username: 'Raijin', role: 'Владелец & программист' },
            { username: 'Kelbor_Hal', role: 'Мл. Админ' },
            { username: 'Wolle', role: 'Тех. Админ' },
            { username: 'Sile_Scorp', role: 'Дизайнер' },
            { username: 'Explyp', role: 'Python-программист' },
            { username: 'NephiliM', role: 'Игрок' },
            { username: 'kiduvl', role: 'Игрок' },
            { username: 'kookyxa', role: 'Игрок' },
            { username: 'anton_roma', role: 'Игрок' }
        ],
        legacy: false
    }
];
function cx(...v) {
    return v.filter(Boolean).join(' ');
}
function GlassCard({ className, children }) {
    return (_jsx("div", { className: cx('rounded-2xl border border-slate-700/80 bg-slate-900/22 backdrop-blur-xl backdrop-saturate-180 shadow-xl shadow-slate-950/25 ring-1 ring-white/6', className), children: children }));
}
export default function AboutServerPage() {
    useWallpaper();
    const { language } = useI18n();
    const copy = aboutTranslations[language];
    const seasons = useMemo(() => language === 'en'
        ? SEASONS.map((season, index) => ({ ...season, ...englishSeasons[index], features: [...englishSeasons[index].features] }))
        : SEASONS, [language]);
    const prefersReducedMotion = useReducedMotion();
    const reduceMotion = Boolean(prefersReducedMotion);
    const isMobile = useIsMobile();
    const disableEntranceMotion = reduceMotion || isMobile;
    const disableInteractiveMotion = reduceMotion || isMobile;
    const [expandedSeason, setExpandedSeason] = useState(null);
    const [playerAvatars, setPlayerAvatars] = useState({});
    const heroScreenshot = '/images/screen2.png';
    const toName = (p) => p
        .split('/')
        .pop()
        .replace(/-[a-z0-9]{8,}(?=\.\w+$)/i, '')
        .replace(/\.(avif|webp)$/i, '.png');
    // Загрузка аватаров игроков
    useEffect(() => {
        const allPlayers = seasons.flatMap((s) => s.players.map((p) => p.username));
        const uniquePlayers = Array.from(new Set(allPlayers));
        const controller = new AbortController();
        let alive = true;
        (async () => {
            const avatars = {};
            await Promise.all(uniquePlayers.map(async (username) => {
                try {
                    const r = await fetch(`/api/v1/users/by-name?username=${encodeURIComponent(username)}`, {
                        signal: controller.signal
                    });
                    if (!r.ok)
                        return;
                    const data = await r.json();
                    if (data.avatarUrl && alive)
                        avatars[username] = data.avatarUrl;
                }
                catch { }
            }));
            if (alive)
                setPlayerAvatars(avatars);
        })();
        return () => {
            alive = false;
            controller.abort();
        };
    }, [seasons]);
    const containerVariants = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.09, delayChildren: 0.06 } }
    };
    const itemVariants = {
        hidden: { opacity: 0, y: 18, scale: 0.99 },
        show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.42, ease: 'easeOut' } }
    };
    return (_jsxs(_Fragment, { children: [_jsx(Seo, { ...routesMeta['/about'] }), _jsxs("div", { className: "min-h-dvh text-slate-100 relative overflow-x-hidden", children: [_jsxs("div", { className: "pointer-events-none absolute inset-0 overflow-hidden", children: [_jsx("div", { className: "absolute -top-28 right-[-18%] h-112 w-md rounded-full bg-indigo-500/14 blur-[120px]" }), _jsx("div", { className: "absolute -bottom-36 left-[-20%] h-128 w-lg rounded-full bg-sky-500/12 blur-[140px]" }), _jsx("div", { className: "absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.10),transparent_55%)]" }), _jsx("div", { className: "absolute inset-0 opacity-[0.07] bg-[radial-gradient(circle,white_1px,transparent_1px)] bg-size-[26px_26px]" })] }), _jsx(motion.section, { className: "mx-auto max-w-7xl px-4 pb-8 pt-10 md:pt-16 relative", initial: disableEntranceMotion ? undefined : { opacity: 0, y: 22, filter: 'blur(8px)' }, animate: disableEntranceMotion ? undefined : { opacity: 1, y: 0, filter: 'blur(0px)' }, transition: { duration: 0.5, ease: 'easeOut' }, children: _jsxs(GlassCard, { className: "p-6 md:p-10 bg-slate-900/10 backdrop-blur-none backdrop-saturate-100", children: [_jsxs("div", { className: "text-center max-w-4xl mx-auto", children: [_jsxs("h1", { className: "text-3xl md:text-4xl font-bold mb-4", children: [copy.title, " ", _jsx("span", { className: "text-indigo-400", children: SERVER_NAME })] }), _jsx("p", { className: "text-lg text-slate-300", children: copy.lead })] }), _jsxs(motion.div, { className: "mt-8 grid gap-6 md:grid-cols-3 md:items-stretch", variants: disableEntranceMotion ? undefined : containerVariants, initial: disableEntranceMotion ? undefined : 'hidden', animate: disableEntranceMotion ? undefined : 'show', children: [_jsx(motion.div, { className: "h-full", variants: disableEntranceMotion ? undefined : itemVariants, children: _jsxs(GlassCard, { className: "flex h-full flex-col p-6 bg-slate-900/16 backdrop-blur-2xl backdrop-saturate-200 border-slate-600/80 ring-1 ring-white/12 shadow-[0_20px_40px_-24px_rgba(0,0,0,.85)]", children: [_jsx("div", { className: "size-12 rounded-xl bg-indigo-600/20 grid place-items-center text-indigo-300 mb-4 ring-1 ring-white/10", children: _jsx(SvgShield, { className: "h-6" }) }), _jsx("h3", { className: "text-xl font-semibold mb-2", children: copy.cards[0][0] }), _jsx("p", { className: "text-slate-300 text-sm", children: copy.cards[0][1] })] }) }), _jsx(motion.div, { className: "h-full", variants: disableEntranceMotion ? undefined : itemVariants, children: _jsxs(GlassCard, { className: "flex h-full flex-col p-6 bg-slate-900/16 backdrop-blur-2xl backdrop-saturate-200 border-slate-600/80 ring-1 ring-white/12 shadow-[0_20px_40px_-24px_rgba(0,0,0,.85)]", children: [_jsx("div", { className: "size-12 rounded-xl bg-emerald-600/20 grid place-items-center text-emerald-300 mb-4 ring-1 ring-white/10", children: _jsx(SvgModpack, { className: "h-6" }) }), _jsx("h3", { className: "text-xl font-semibold mb-2", children: copy.cards[1][0] }), _jsx("p", { className: "text-slate-300 text-sm", children: copy.cards[1][1] })] }) }), _jsx(motion.div, { className: "h-full", variants: disableEntranceMotion ? undefined : itemVariants, children: _jsxs(GlassCard, { className: "flex h-full flex-col p-6 bg-slate-900/16 backdrop-blur-2xl backdrop-saturate-200 border-slate-600/80 ring-1 ring-white/12 shadow-[0_20px_40px_-24px_rgba(0,0,0,.85)]", children: [_jsx("div", { className: "size-12 rounded-xl bg-sky-600/20 grid place-items-center text-sky-300 mb-4 ring-1 ring-white/10", children: _jsx(SvgGitHub, { className: "h-6" }) }), _jsx("h3", { className: "text-xl font-semibold mb-2", children: copy.cards[2][0] }), _jsx("p", { className: "text-slate-300 text-sm", children: copy.cards[2][1] })] }) })] })] }) }), _jsx(motion.section, { id: "gallery", className: "mx-auto max-w-7xl px-4 py-10 relative", initial: disableEntranceMotion ? undefined : { opacity: 0, y: 22 }, animate: disableEntranceMotion ? undefined : { opacity: 1, y: 0 }, transition: { duration: 0.5, ease: 'easeOut', delay: 0.08 }, children: _jsx("div", { className: "rounded-2xl p-px bg-linear-to-br from-indigo-500/35 via-slate-800/20 to-sky-500/25 shadow-2xl shadow-indigo-900/20", children: _jsx("div", { className: "aspect-video w-full overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-900/30", children: _jsx(ResponsiveImage, { name: toName(heroScreenshot), alt: copy.worldAlt, eager: true, width: 1920, height: 1080, sizes: "(max-width: 1280px) 100vw, 1280px", className: "h-full w-full object-cover" }) }) }) }), _jsxs(motion.section, { id: "seasons", className: "mx-auto max-w-7xl px-4 py-10 relative", variants: containerVariants, initial: disableEntranceMotion ? undefined : 'hidden', whileInView: disableEntranceMotion ? undefined : 'show', viewport: { once: true, margin: '-10% 0px' }, children: [_jsx("h2", { className: "text-2xl md:text-3xl font-semibold mb-8 text-center", children: copy.history }), _jsx("div", { className: "grid gap-4", children: seasons.map((season) => {
                                    const isOpen = expandedSeason === season.number;
                                    const isCurrent = !season.legacy;
                                    return (_jsx(motion.div, { variants: disableEntranceMotion ? undefined : itemVariants, className: "relative", children: _jsxs("div", { className: cx('rounded-2xl border overflow-hidden backdrop-blur-xl backdrop-saturate-180 transition-all shadow-lg shadow-slate-950/20', isCurrent
                                                ? 'border-indigo-500/45 bg-linear-to-br from-indigo-900/20 to-slate-900/14 ring-1 ring-indigo-300/20'
                                                : 'border-slate-700/80 bg-slate-900/20 ring-1 ring-white/6'), children: [_jsxs("button", { onClick: () => setExpandedSeason(isOpen ? null : season.number), className: "w-full text-left px-5 py-4 hover:bg-slate-900/25 flex items-center justify-between transition-colors", "aria-expanded": isOpen, "aria-controls": `season-panel-${season.number}`, children: [_jsxs("div", { className: "flex items-center gap-4 min-w-0", children: [_jsx("div", { className: cx('size-12 rounded-xl grid place-items-center text-xl font-bold ring-1 ring-white/10 shrink-0', isCurrent ? 'bg-indigo-600/25 text-indigo-200' : 'bg-slate-700/25 text-slate-300'), children: season.number }), _jsxs("div", { className: "min-w-0", children: [_jsxs("div", { className: "flex items-center gap-3 flex-wrap", children: [_jsx("h3", { className: "text-xl font-semibold truncate", children: season.name }), isCurrent && (_jsx("span", { className: "text-xs px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-200 border border-emerald-500/25", children: copy.current }))] }), _jsx("p", { className: "text-sm text-slate-400 mt-1", children: season.period })] })] }), _jsx(motion.span, { className: "text-slate-400", animate: { rotate: isOpen ? 180 : 0 }, transition: { type: 'spring', stiffness: 380, damping: 26 }, children: _jsx(SvgChevronDown, { className: "size-5" }) })] }), _jsx(AnimatePresence, { initial: false, children: isOpen && (_jsx(motion.div, { id: `season-panel-${season.number}`, initial: { height: 0, opacity: 0 }, animate: { height: 'auto', opacity: 1 }, exit: { height: 0, opacity: 0 }, transition: { duration: 0.28, ease: 'easeInOut' }, className: "overflow-hidden border-t border-slate-800/80", children: _jsxs("div", { className: "px-5 py-4 space-y-6", children: [_jsx("p", { className: "text-slate-300", children: season.description }), _jsxs("div", { children: [_jsx("h4", { className: "text-sm font-semibold text-slate-400 mb-2", children: copy.events }), _jsx("ul", { className: "space-y-2", children: season.features.map((feature, idx) => (_jsxs("li", { className: "flex items-start gap-2 text-sm text-slate-300", children: [_jsx("span", { className: "text-indigo-400 mt-0.5", children: "\u25B8" }), _jsx("span", { children: feature })] }, idx))) })] }), season.screenshots.length > 0 && (_jsxs("div", { children: [_jsx("h4", { className: "text-sm font-semibold text-slate-400 mb-3", children: copy.builds }), _jsx("div", { className: "grid grid-cols-2 gap-3", children: season.screenshots.map((screenshot, idx) => (_jsx(motion.div, { whileHover: disableInteractiveMotion ? undefined : { scale: 1.03 }, transition: { type: 'spring', stiffness: 320, damping: 24 }, className: "aspect-video rounded-lg overflow-hidden border border-slate-700/50 shadow-md", children: _jsx(ResponsiveImage, { name: toName(screenshot), alt: `${season.name} — ${copy.screenshot} ${idx + 1}`, width: 640, height: 360, sizes: "(max-width: 768px) 50vw, 320px", className: "h-full w-full object-cover" }) }, screenshot))) })] })), season.players.length > 0 && (_jsxs("div", { children: [_jsxs("h4", { className: "text-sm font-semibold text-slate-400 mb-3", children: [copy.players, " (", season.players.length, ")"] }), _jsx("div", { className: "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3", children: season.players.map((player) => {
                                                                                const avatar = playerAvatars[player.username];
                                                                                return (_jsxs(Link, { to: `/u/${encodeURIComponent(player.username)}`, className: "flex flex-col items-center gap-2 p-3 rounded-xl border border-slate-700/45 bg-slate-900/24 backdrop-blur-md backdrop-saturate-150 hover:bg-slate-800/38 hover:border-slate-600 transition-all group", children: [avatar ? (_jsx("img", { src: avatar, alt: player.username, width: 48, height: 48, className: "w-12 h-12 rounded-lg object-cover border border-slate-700 group-hover:border-slate-600 transition-colors", loading: "lazy", decoding: "async" })) : (_jsx("div", { className: "w-12 h-12 rounded-lg border border-slate-700 bg-linear-to-br from-slate-800 to-slate-900 flex items-center justify-center text-lg text-slate-300 group-hover:border-slate-600 transition-colors", children: player.username[0]?.toUpperCase() || '?' })), _jsxs("div", { className: "text-center w-full", children: [_jsx("div", { className: "text-sm text-slate-200 group-hover:text-slate-100 truncate transition-colors", children: player.username }), player.role && _jsx("div", { className: "text-xs text-slate-500 truncate", children: language === 'en' ? englishRole(player.role) : player.role })] })] }, player.username));
                                                                            }) })] }))] }) })) })] }) }, season.number));
                                }) })] }), _jsx(motion.section, { id: "join", className: "mx-auto max-w-7xl px-4 py-10 mb-10 relative", initial: disableEntranceMotion ? undefined : { opacity: 0, y: 22 }, animate: disableEntranceMotion ? undefined : { opacity: 1, y: 0 }, transition: { duration: 0.5, ease: 'easeOut', delay: 0.12 }, children: _jsx("div", { className: "rounded-3xl p-px bg-linear-to-br from-indigo-500/45 via-slate-800/20 to-sky-500/30 shadow-2xl shadow-indigo-900/20", children: _jsxs("div", { className: "relative rounded-3xl border border-slate-800/70 p-8 md:p-12 bg-slate-900/35 backdrop-blur-md backdrop-saturate-150 overflow-hidden text-center", children: [_jsx("div", { className: "pointer-events-none absolute -top-32 -right-32 h-64 w-64 rounded-full bg-indigo-500/14 blur-3xl" }), _jsx("div", { className: "pointer-events-none absolute -bottom-32 -left-32 h-64 w-64 rounded-full bg-sky-500/14 blur-3xl" }), _jsxs("div", { className: "relative z-10", children: [_jsx("h2", { className: "text-2xl md:text-3xl font-bold mb-4", children: copy.join }), _jsx("p", { className: "text-lg text-slate-300 mb-6 max-w-2xl mx-auto", children: copy.joinText }), _jsxs("div", { className: "flex flex-wrap gap-4 justify-center", children: [_jsx("a", { href: LAUNCHER_DOWNLOAD_URL, className: "inline-flex rounded-xl px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors shadow-lg shadow-indigo-900/20", children: copy.download }), _jsx(Link, { to: "/", className: "inline-flex rounded-xl px-6 py-3 border border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-white font-medium transition-colors", children: copy.home })] }), _jsxs("div", { className: "mt-6 flex flex-wrap gap-4 justify-center text-sm text-slate-400", children: [_jsx("a", { href: DISCORD_URL, className: "hover:text-indigo-300 transition-colors", children: "Discord" }), _jsx("span", { children: "\u2022" }), _jsx("a", { href: TELEGRAM_URL, className: "hover:text-indigo-300 transition-colors", children: "Telegram" }), _jsx("span", { children: "\u2022" }), _jsx("a", { href: "/wiki", className: "hover:text-indigo-300 transition-colors", children: copy.wiki }), _jsx("span", { children: "\u2022" }), _jsx("a", { href: "/rules", className: "hover:text-indigo-300 transition-colors", children: copy.rules })] })] })] }) }) })] })] }));
}
function englishRole(role) {
    if (/Python/i.test(role))
        return 'Python developer';
    if (/Дизайнер/i.test(role))
        return 'Designer';
    if (/Тех/i.test(role))
        return 'Technical admin';
    if (/Мл\./i.test(role))
        return 'Junior admin';
    if (/Администратор/i.test(role))
        return 'Administrator';
    if (/Основатель/i.test(role))
        return 'Founder';
    if (/Владелец/i.test(role))
        return 'Owner & developer';
    return 'Player';
}
