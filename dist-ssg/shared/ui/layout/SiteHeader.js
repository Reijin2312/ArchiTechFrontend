import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { authStore } from '../../../shared/store/auth.js';
import { SECTIONS as RULES_SECTIONS } from '../../../pages/public/RulesPage.js';
import { WIKI_SECTIONS } from '../../../pages/public/WikiPage.js';
import { PRIVACY_SECTIONS } from '../../../pages/legal/PrivacyPolicyPage.js';
import { TERMS_SECTIONS } from '../../../pages/legal/UserAgreementPage.js';
import { SvgTelegram, SvgDiscord, SvgMenu, SvgX } from '../../../shared/ui/image/Icons.js';
import { LanguageSwitcher } from '../../../shared/i18n/LanguageSwitcher.js';
import { useI18n } from '../../../shared/i18n/I18nProvider.js';
import { SERVER_NAME, RULES_URL, WIKI_URL, 
// CHAT_URL,
MAP_URL, DISCORD_URL, TELEGRAM_URL, } from '../../../shared/constants.js';
const MAIN_URL = '/';
const ABOUT_URL = '/about';
const PRIVACY_URL = '/privacy';
const TERMS_URL = '/terms';
export default function SiteHeader() {
    const { language, t } = useI18n();
    const user = authStore((s) => s.user);
    const { pathname, search } = useLocation();
    const next = encodeURIComponent(pathname + search);
    const isRulesPage = pathname === RULES_URL;
    const isWikiPage = pathname === WIKI_URL;
    const isPrivacyPage = pathname === PRIVACY_URL;
    const isTermsPage = pathname === TERMS_URL;
    const rawMobileTocItems = isRulesPage
        ? RULES_SECTIONS
        : isWikiPage
            ? WIKI_SECTIONS
            : isPrivacyPage
                ? PRIVACY_SECTIONS
                : isTermsPage
                    ? TERMS_SECTIONS
                    : undefined;
    const mobileTocItems = rawMobileTocItems?.map((item) => ({
        ...item,
        title: localizedTocTitle(pathname, item.id, item.title, language),
    }));
    const [mobileOpen, setMobileOpen] = useState(false);
    useEffect(() => {
        setMobileOpen(false);
    }, [pathname, search]);
    const linkCls = (active) => [
        'relative px-2 py-1.5 text-sm transition-colors',
        active
            ? 'text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500 ' +
                'after:absolute after:left-1.5 after:right-1.5 after:-bottom-[3px] after:h-[2px] after:rounded-full ' +
                'after:bg-gradient-to-r after:from-sky-400 after:to-blue-500 after:content-[""]'
            : 'text-slate-300 hover:text-sky-300',
    ].join(' ');
    const isActive = (to, end = false) => {
        const t = to || '/';
        if (end)
            return pathname === t;
        return pathname === t || pathname.startsWith(t + '/');
    };
    function MobileToc({ items, onItemClick }) {
        const [active, setActive] = useState(items[0]?.id);
        const observerRef = useRef(null);
        useEffect(() => {
            const targets = items.map((item) => document.getElementById(item.id)).filter(Boolean);
            observerRef.current?.disconnect();
            observerRef.current = new IntersectionObserver((entries) => {
                const top = entries
                    .filter((entry) => entry.isIntersecting)
                    .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
                if (top)
                    setActive(top.target.id);
            }, { rootMargin: '-40% 0px -50% 0px', threshold: [0, 0.2, 0.5, 1] });
            targets.forEach((el) => observerRef.current.observe(el));
            return () => observerRef.current?.disconnect();
        }, [items]);
        return (_jsxs("div", { className: "mt-6 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-3", children: [_jsx("div", { className: "mb-2 text-xs font-semibold text-slate-300", children: t('header.onThisPage') }), _jsx("ol", { className: "space-y-1 text-xs", children: items.map((it, i) => {
                        const on = active === it.id;
                        return (_jsxs("li", { className: "flex items-start gap-2", children: [_jsx("span", { className: `inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] leading-none ${on ? 'border-sky-500 text-sky-300' : 'border-slate-700 text-slate-400'}`, children: i + 1 }), _jsx("a", { href: `#${it.id}`, onClick: onItemClick, className: on ? 'text-sky-300' : 'text-slate-200 hover:text-sky-300', "aria-current": on ? 'true' : undefined, children: it.title })] }, it.id));
                    }) })] }));
    }
    return (_jsxs(_Fragment, { children: [_jsx("header", { className: "sticky top-0 z-20 backdrop-blur supports-backdrop-filter:bg-slate-950/50 border-b border-slate-800", children: _jsxs("nav", { className: "mx-auto max-w-7xl px-4 py-3 flex items-center justify-between", children: [_jsxs(Link, { to: MAIN_URL, className: "flex items-center gap-3 text-slate-100 focus-visible:outline2 focus-visible:outline-sky-500 rounded-xl px-1 -mx-1", "aria-label": t('header.homeAria'), children: [_jsx("img", { src: "/images/favicon-192.png", alt: t('header.logoAlt'), width: 32, height: 32, decoding: "async" }), _jsx("span", { className: "font-semibold tracking-wide", children: SERVER_NAME })] }), _jsxs("div", { className: "hidden md:flex items-center gap-6 text-sm", children: [_jsx("a", { href: MAIN_URL, className: linkCls(isActive(MAIN_URL, true)), "aria-current": isActive(MAIN_URL, true) ? 'page' : undefined, children: t('header.home') }), _jsx("a", { href: ABOUT_URL, className: linkCls(isActive(ABOUT_URL)), "aria-current": isActive(ABOUT_URL) ? 'page' : undefined, children: t('header.about') }), _jsx("a", { href: RULES_URL, className: linkCls(isActive(RULES_URL)), "aria-current": isActive(RULES_URL) ? 'page' : undefined, children: t('header.rules') }), _jsx("a", { href: MAP_URL, className: linkCls(isActive(MAP_URL)), "aria-current": isActive(MAP_URL) ? 'page' : undefined, children: t('header.map') }), _jsx("a", { href: WIKI_URL, className: linkCls(isActive(WIKI_URL)), "aria-current": isActive(WIKI_URL) ? 'page' : undefined, children: t('header.wiki') }), _jsx("a", { href: TELEGRAM_URL, rel: "noopener noreferrer", "aria-label": "Telegram", className: "hover:text-white text-slate-300", children: _jsx(SvgTelegram, { className: "h-5" }) }), _jsx("a", { href: DISCORD_URL, rel: "noopener noreferrer", "aria-label": "Discord", className: "hover:text-white text-slate-300", children: _jsx(SvgDiscord, { className: "h-5" }) }), _jsx(LanguageSwitcher, {}), user ? (_jsxs(_Fragment, { children: [_jsx(Link, { to: `/u/${user.username}`, className: "rounded-xl px-3 py-1.5 border border-slate-700 hover:border-slate-500", title: t('header.profile'), children: user.username }), _jsx(Link, { to: `/u/${user.username}`, className: "ml-2 inline-flex h-8 w-8 overflow-hidden rounded-full border border-slate-700", title: t('header.profile'), children: user?.avatarUrl ? (_jsx("img", { src: user.avatarUrl, alt: t('header.profile'), width: 32, height: 32, decoding: "async", referrerPolicy: "no-referrer", className: "h-full w-full object-cover" })) : (_jsx("span", { className: "w-full text-center text-xs leading-8 text-slate-300", children: (user.username?.[0] || '?').toUpperCase() })) })] })) : (_jsx(Link, { to: `/auth/login?next=${next}`, className: "rounded-xl px-3 py-1.5 border border-slate-700 hover:border-slate-500", children: t('header.login') }))] }), _jsxs("div", { className: "flex items-center gap-2 md:hidden", children: [_jsx(LanguageSwitcher, {}), user ? (_jsx(Link, { to: `/u/${user.username}`, className: "inline-flex h-8 w-8 overflow-hidden rounded-full border border-slate-700", title: t('header.profile'), children: user?.avatarUrl ? (_jsx("img", { src: user.avatarUrl, alt: t('header.profile'), width: 32, height: 32, decoding: "async", referrerPolicy: "no-referrer", className: "h-full w-full object-cover" })) : (_jsx("span", { className: "w-full text-center text-xs leading-8 text-slate-300", children: (user.username?.[0] || '?').toUpperCase() })) })) : (_jsx(Link, { to: `/auth/login?next=${next}`, className: "inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-slate-700 text-xs text-slate-300", title: t('header.login'), children: t('header.login').charAt(0) })), _jsx("button", { type: "button", onClick: () => setMobileOpen((v) => !v), className: "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-900/70 hover:bg-slate-800", "aria-label": mobileOpen ? t('header.closeMenu') : t('header.openMenu'), children: mobileOpen ? (_jsx(SvgX, { className: "h-5 w-5" })) : (_jsx(SvgMenu, { className: "h-5 w-5" })) })] })] }) }), _jsxs("div", { className: `fixed inset-0 z-30 md:hidden transition-[opacity,visibility] ${mobileOpen ? 'opacity-100 visible pointer-events-auto' : 'opacity-0 invisible pointer-events-none'}`, children: [_jsx("button", { type: "button", className: "absolute inset-0 bg-black/50", onClick: () => setMobileOpen(false), "aria-label": t('header.closeMenu') }), _jsxs("div", { className: `absolute inset-y-0 right-0 w-72 max-w-[80%] border-l border-slate-800 p-4 flex flex-col transform transition-transform bg-slate-950/40 backdrop-blur supports-backdrop-filter:bg-slate-950/50 ${mobileOpen ? 'translate-x-0' : 'translate-x-full'}`, children: [_jsxs("div", { className: "mb-4 flex items-center justify-between", children: [_jsx("span", { className: "text-xs font-semibold tracking-[0.18em] uppercase text-slate-300", children: t('header.navigation') }), _jsx("button", { type: "button", onClick: () => setMobileOpen(false), className: "inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-900", "aria-label": t('header.closeMenu'), children: _jsx(SvgX, { className: "h-5 w-5" }) })] }), _jsxs("nav", { className: "flex flex-col gap-1 text-sm", children: [_jsx("a", { href: MAIN_URL, onClick: () => setMobileOpen(false), className: `rounded-lg px-3 py-2 ${isActive(MAIN_URL, true) ? 'bg-slate-800 text-sky-300' : 'text-slate-200 hover:bg-slate-900'}`, children: t('header.home') }), _jsx("a", { href: ABOUT_URL, onClick: () => setMobileOpen(false), className: `rounded-lg px-3 py-2 ${isActive(ABOUT_URL) ? 'bg-slate-800 text-sky-300' : 'text-slate-200 hover:bg-slate-900'}`, children: t('header.about') }), _jsx("a", { href: RULES_URL, onClick: () => setMobileOpen(false), className: `rounded-lg px-3 py-2 ${isActive(RULES_URL) ? 'bg-slate-800 text-sky-300' : 'text-slate-200 hover:bg-slate-900'}`, children: t('header.rules') }), _jsx("a", { href: MAP_URL, onClick: () => setMobileOpen(false), className: `rounded-lg px-3 py-2 ${isActive(MAP_URL) ? 'bg-slate-800 text-sky-300' : 'text-slate-200 hover:bg-slate-900'}`, children: t('header.map') }), _jsx("a", { href: WIKI_URL, onClick: () => setMobileOpen(false), className: `rounded-lg px-3 py-2 ${isActive(WIKI_URL) ? 'bg-slate-800 text-sky-300' : 'text-slate-200 hover:bg-slate-900'}`, children: t('header.wiki') })] }), _jsx("div", { className: "mt-4 flex items-center gap-3", children: user ? (_jsxs(Link, { to: `/u/${user.username}`, onClick: () => setMobileOpen(false), className: "inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-1.5 text-sm hover:border-slate-500", children: [_jsx("span", { className: "inline-flex h-7 w-7 overflow-hidden rounded-full border border-slate-700", children: user?.avatarUrl ? (_jsx("img", { src: user.avatarUrl, alt: t('header.profile'), width: 28, height: 28, decoding: "async", referrerPolicy: "no-referrer", className: "h-full w-full object-cover" })) : (_jsx("span", { className: "w-full text-center text-xs leading-7 text-slate-300", children: (user.username?.[0] || '?').toUpperCase() })) }), _jsx("span", { className: "truncate max-w-[140px]", children: user.username })] })) : (_jsx(Link, { to: `/auth/login?next=${next}`, onClick: () => setMobileOpen(false), className: "rounded-lg border border-slate-700 px-3 py-1.5 text-sm hover:border-slate-500", children: t('header.login') })) }), mobileTocItems && (_jsx(MobileToc, { items: mobileTocItems, onItemClick: () => setMobileOpen(false) })), _jsxs("div", { className: "mt-auto pt-4 border-t border-slate-800 flex items-center justify-between gap-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("img", { src: "/images/favicon-192.png", alt: t('header.logoAlt'), width: 24, height: 24, decoding: "async" }), _jsx("span", { className: "text-xs font-medium text-slate-100", children: SERVER_NAME })] }), _jsxs("div", { className: "flex items-center gap-4 text-slate-300", children: [_jsx("a", { href: TELEGRAM_URL, rel: "noopener noreferrer", "aria-label": "Telegram", className: "hover:text-white", children: _jsx(SvgTelegram, { className: "h-4" }) }), _jsx("a", { href: DISCORD_URL, rel: "noopener noreferrer", "aria-label": "Discord", className: "hover:text-white", children: _jsx(SvgDiscord, { className: "h-4" }) })] })] })] })] })] }));
}
const ENGLISH_TOC = {
    '/rules': { intro: 'Introduction', forbidden: 'Forbidden actions', chat: 'Communication', techmagic: 'Mods and resource packs', build: 'Building', farms: 'Farms and machinery', pvp: 'PVP / PVE', trade: 'Economy and trading', security: 'Security and accounts', penalties: 'Penalties' },
    '/wiki': { intro: 'Server and theme', start: 'How to start playing', mods: 'Mod list', progress: 'Tech-magic progression', commands: 'Server commands', economy: 'Economy', perf: 'Performance', faq: 'FAQ', links: 'Links' },
    '/privacy': { id1: 'General provisions', id2: 'Data and processing purposes', id3: 'Cookies and similar technologies', id4: 'Legal grounds for processing', id5: 'Third parties and international transfers', id6: 'Your data rights', id7: 'Retention and security', id8: 'Third-party links', id9: 'Communications', id10: 'Limitation of liability', id11: 'Dispute resolution', id12: 'Policy changes', id13: 'Operator contacts' },
    '/terms': { id1: 'General terms', id2: 'User responsibilities', id3: 'Disclaimer of warranties', id4: 'Content and moderation', id5: 'Intellectual property', id6: 'Enforcement and restrictions', id7: 'In-game content transactions', id8: 'Account and access transactions', id9: 'Personal data', id10: 'Other terms' },
};
function localizedTocTitle(path, id, fallback, language) {
    return language === 'en' ? ENGLISH_TOC[path]?.[id] ?? fallback : fallback;
}
