import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { motion, useReducedMotion } from 'framer-motion';
import { Seo } from '../../shared/seo/seo.js';
import { routesMeta } from '../../shared/seo/routesMeta.js';
import { useWallpaper } from '../../shared/ui/wallpaper/useWallpaper.js';
import { useIsMobile } from '../../shared/ui/utils/useIsMobile.js';
import { TEAM_MEMBERS } from '../../shared/data/team.js';
import { useTeamAvatars } from '../../shared/hooks/useTeamAvatars.js';
import { TeamGrid } from '../../shared/ui/card/TeamGrid.js';
import { SvgTelegram, SvgDiscord, SvgArrowUpRight, SvgShield, SvgHeadphones, } from '../../shared/ui/image/Icons.js';
import { DISCORD_URL, TELEGRAM_URL, SUPPORT_EMAIL } from '../../shared/constants.js';
const CONTACT_CARDS = [
    {
        id: 'support',
        title: 'Поддержка',
        description: 'Если не запускается лаунчер, не пускает на сервер или что-то сломалось в игре — пишите сюда.',
        icon: 'support',
        badge: 'Техвопросы',
        meta: 'Чтобы не терять время, приложите скрин и что именно уже пробовали сделать.',
        actions: [
            { label: 'Перейти в поддержку', href: DISCORD_URL, external: true, variant: 'primary' },
            { label: 'Написать на почту', href: `mailto:${SUPPORT_EMAIL}`, variant: 'secondary' },
        ],
    },
    {
        id: 'moderation',
        title: 'Модерация',
        description: 'Жалобы на игроков, спорные ситуации по правилам и апелляции по наказаниям.',
        icon: 'moderation',
        badge: 'Жалобы и апелляции',
        meta: 'По жалобам нужны доказательства: скриншоты, видео или логи.',
        actions: [
            { label: 'Открыть гайд', href: '/rules#penalties', variant: 'primary' },
            { label: 'Написать модераторам', href: DISCORD_URL, external: true, variant: 'secondary' },
        ],
    },
    {
        id: 'telegram',
        title: 'Telegram-канал',
        description: 'Там публикуем обновления, техработы и короткие новости по серверу.',
        icon: 'telegram',
        badge: 'Анонсы сервера',
        actions: [
            { label: 'Перейти в канал', href: TELEGRAM_URL, external: true, variant: 'primary' },
        ],
    },
    {
        id: 'discord',
        title: 'Discord сервер',
        description: 'Основное общение комьюнити: текстовые каналы, голос, помощь и быстрый контакт с командой.',
        icon: 'discord',
        badge: 'Голос и чат',
        meta: 'Если нужна помощь по игре, удобнее всего писать именно в Discord.',
        actions: [
            { label: 'Перейти на сервер', href: DISCORD_URL, external: true, variant: 'primary' },
        ],
    },
];
const cardVariants = {
    hidden: { opacity: 0, y: 18, scale: 0.98 },
    show: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { duration: 0.45, ease: 'easeOut' },
    },
};
const gridVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.08, delayChildren: 0.05 },
    },
};
const ICONS = {
    support: _jsx(SvgHeadphones, { className: "h-5 w-5 text-indigo-200" }),
    moderation: _jsx(SvgShield, { className: "h-5 w-5 text-emerald-200" }),
    telegram: _jsx(SvgTelegram, { className: "h-5 w-5 text-sky-200" }),
    discord: _jsx(SvgDiscord, { className: "h-5 w-5 text-violet-200" }),
};
function ContactActionButton({ action }) {
    const className = action.variant === 'secondary'
        ? 'inline-flex items-center gap-1 rounded-xl border border-slate-700/70 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-500 hover:text-white'
        : 'inline-flex items-center gap-1 rounded-xl bg-sky-600/90 px-4 py-2 text-sm font-medium text-white shadow shadow-sky-900/50 transition hover:bg-sky-500';
    const rel = action.external ? 'noreferrer noopener' : undefined;
    const target = action.external ? '_blank' : undefined;
    return (_jsxs("a", { href: action.href, target: target, rel: rel, className: className, children: [action.label, action.external && _jsx(SvgArrowUpRight, { className: "h-4 w-4" })] }));
}
export default function ContactsPage() {
    useWallpaper();
    const isMobile = useIsMobile();
    const reduceMotion = useReducedMotion();
    const disableMotion = Boolean(reduceMotion) || isMobile;
    const avatars = useTeamAvatars(TEAM_MEMBERS);
    return (_jsxs(_Fragment, { children: [_jsx(Seo, { ...routesMeta['/contacts'] }), _jsxs("div", { className: "relative mx-auto max-w-7xl px-4 py-10 text-slate-100", children: [_jsxs(motion.section, { className: "mx-auto max-w-4xl text-center mb-10", initial: disableMotion ? undefined : { opacity: 0, y: 20, filter: 'blur(8px)' }, animate: disableMotion ? undefined : { opacity: 1, y: 0, filter: 'blur(0px)' }, transition: { duration: 0.5, ease: 'easeOut' }, children: [_jsx("p", { className: "text-sm uppercase tracking-[0.35em] text-slate-400", children: "\u0421\u0432\u044F\u0437\u044C" }), _jsx("h1", { className: "mt-3 text-3xl font-semibold leading-tight", children: "\u041A\u043E\u043D\u0442\u0430\u043A\u0442\u044B ArchiTech MC" }), _jsx("p", { className: "mt-4 text-base text-slate-300", children: "\u0417\u0434\u0435\u0441\u044C \u0432\u0441\u0451, \u0447\u0442\u043E \u043D\u0443\u0436\u043D\u043E \u0434\u043B\u044F \u0441\u0432\u044F\u0437\u0438: \u0442\u0435\u0445\u043F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u0430, \u043C\u043E\u0434\u0435\u0440\u0430\u0446\u0438\u044F, Discord \u0438 Telegram. \u0411\u0435\u0437 \u043B\u0438\u0448\u043D\u0435\u0433\u043E \u2014 \u043F\u0440\u043E\u0441\u0442\u043E \u0432\u044B\u0431\u0438\u0440\u0430\u0439\u0442\u0435 \u043D\u0443\u0436\u043D\u044B\u0439 \u043A\u0430\u043D\u0430\u043B." })] }), _jsx(motion.section, { className: "grid gap-4 md:grid-cols-2", variants: disableMotion ? undefined : gridVariants, initial: disableMotion ? undefined : 'hidden', animate: disableMotion ? undefined : 'show', children: CONTACT_CARDS.map((card) => (_jsxs(motion.article, { variants: disableMotion ? undefined : cardVariants, className: "relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60 p-5 backdrop-blur-md", children: [_jsx("div", { className: "pointer-events-none absolute inset-0 opacity-50 blur-3xl", children: _jsx("div", { className: "absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-sky-500/10" }) }), _jsxs("div", { className: "relative flex flex-col gap-4", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "grid h-12 w-12 place-items-center rounded-2xl border border-slate-800 bg-slate-900/80", children: ICONS[card.icon] }), _jsxs("div", { children: [_jsx("div", { className: "text-sm uppercase tracking-[0.18em] text-slate-400", children: card.badge }), _jsx("h2", { className: "text-xl font-semibold text-slate-50", children: card.title })] })] }), _jsx("p", { className: "text-sm text-slate-300", children: card.description }), _jsx("div", { className: "flex flex-wrap gap-2", children: card.actions.map((action) => (_jsx(ContactActionButton, { action: action }, action.label))) }), card.meta && _jsx("p", { className: "text-xs text-slate-400", children: card.meta })] })] }, card.id))) }), _jsxs(motion.section, { className: "mt-14", initial: disableMotion ? undefined : { opacity: 0, y: 20 }, whileInView: disableMotion ? undefined : { opacity: 1, y: 0 }, viewport: disableMotion ? undefined : { once: true, margin: '-10% 0px' }, transition: { duration: 0.5, ease: 'easeOut' }, children: [_jsxs("div", { className: "flex flex-col gap-3 mb-6 text-center", children: [_jsx("p", { className: "text-sm uppercase tracking-[0.35em] text-slate-400", children: "\u041A\u043E\u043C\u0430\u043D\u0434\u0430" }), _jsx("h2", { className: "text-2xl font-semibold", children: "\u0410\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044F \u0438 \u043A\u043E\u043C\u0430\u043D\u0434\u0430" })] }), _jsx(TeamGrid, { team: TEAM_MEMBERS, avatars: avatars, disableMotion: disableMotion })] })] })] }));
}
