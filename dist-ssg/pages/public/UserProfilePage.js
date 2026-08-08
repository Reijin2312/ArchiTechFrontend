import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { http } from '../../shared/api/http.js';
import { endpoints } from '../../shared/api/endpoints.js';
import { isSelf } from '../../shared/auth/isSelf.js';
import { useWallpaper } from '../../shared/ui/wallpaper/useWallpaper.js';
import { Seo } from '../../shared/seo/seo.js';
import { Badge } from '../../shared/ui/utils/Badge.js';
import { SocialLinks } from '../../shared/ui/utils/SocialLinks.js';
import { Skin3DViewer } from '../../shared/ui/skin/Skin3DViewer.js';
import { UserSessions } from '../../shared/ui/utils/UserSessions.js';
import { ProfileThemeProvider, useProfileTheme } from '../../shared/ui/utils/ProfileThemeContext.js';
import { SERVER_IP } from '../../shared/constants.js';
export default function UserProfilePage() {
    const username = useParams().username;
    const self = isSelf(username);
    const [user, setUser] = useState(null);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState(null);
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
            .catch((e) => alive && setErr(e?.response?.data?.message || e?.message || 'Ошибка загрузки'))
            .finally(() => alive && setLoading(false));
        return () => {
            alive = false;
        };
    }, [username, self]);
    useEffect(() => {
        if (!user?.username)
            return;
        let stop = false;
        const checkPlayerStatus = async () => {
            try {
                const response = await fetch(`https://api.mcsrvstat.us/2/${SERVER_IP}`, { cache: 'no-store' });
                if (!response.ok || stop)
                    return;
                const data = await response.json();
                if (stop)
                    return;
                const isOnline = data.online && data.players?.list?.some((playerName) => playerName.toLowerCase() === user.username.toLowerCase());
                setStats((prev) => {
                    if (!prev)
                        return { online: isOnline ?? false };
                    return { ...prev, online: isOnline ?? false };
                });
            }
            catch { }
        };
        checkPlayerStatus();
        const intervalId = setInterval(checkPlayerStatus, 15000);
        return () => {
            stop = true;
            clearInterval(intervalId);
        };
    }, [user?.username]);
    const since = useMemo(() => {
        const iso = user?.registeredAt;
        if (!iso)
            return null;
        try {
            return new Date(iso).toLocaleDateString();
        }
        catch {
            return null;
        }
    }, [user?.registeredAt]);
    const profileUsername = user?.username;
    const displayName = user?.displayName?.trim?.() || '';
    const usernameText = user?.username?.trim?.() || '';
    const showDisplayName = Boolean(displayName) && displayName.toLowerCase() !== usernameText.toLowerCase();
    const achievementsHref = `/u/${encodeURIComponent(username)}/achievements`;
    const skinsHref = `/u/${encodeURIComponent(username)}/skins`;
    const previewAchievements = useMemo(() => (user?.achievements ?? []).filter((ach) => ach.unlocked).slice(0, 6), [user?.achievements]);
    const handleShareProfile = async () => {
        const shareUrl = `${window.location.origin}/u/${encodeURIComponent(username)}`;
        const shareTitle = user?.displayName || user?.username || username;
        try {
            if (navigator.share) {
                await navigator.share({
                    title: `${shareTitle} — ArchiTech MC`,
                    text: `Профиль игрока ${shareTitle}`,
                    url: shareUrl,
                });
                return;
            }
        }
        catch { }
        try {
            await navigator.clipboard.writeText(shareUrl);
        }
        catch {
            window.prompt('Ссылка на профиль:', shareUrl);
        }
    };
    return (_jsxs(_Fragment, { children: [_jsx(Seo, { title: "\u041F\u0440\u043E\u0444\u0438\u043B\u044C \u0438\u0433\u0440\u043E\u043A\u0430 \u2014 ArchiTech MC", robots: "noindex,follow" }), _jsx(ProfileThemeProvider, { themeId: user?.profileTheme, customColor1: user?.customThemeColor1, customColor2: user?.customThemeColor2, children: _jsx("div", { className: "min-h-dvh flex flex-col", children: _jsxs("main", { className: "mx-auto flex w-full max-w-6xl grow flex-col gap-6 px-4 py-6", children: [_jsxs("div", { className: "flex flex-col gap-6 md:grid md:grid-cols-12 md:items-stretch", children: [_jsx("section", { className: "order-2 flex flex-col md:col-span-3 md:order-1", children: _jsxs(Card, { className: "flex h-full flex-col", children: [_jsxs("div", { className: "mb-3 flex items-center justify-between", children: [_jsx("h2", { className: "text-sm font-semibold font-techno", children: "\u0421\u043A\u0438\u043D" }), _jsx("div", { className: "flex items-center gap-2", children: _jsx(Link, { to: skinsHref, className: "group inline-flex h-8 w-8 items-center justify-center rounded-full border border-sky-500/35 bg-[radial-gradient(circle_at_30%_20%,rgba(56,189,248,.22),rgba(15,23,42,.92))] text-sky-200 shadow-[0_0_0_1px_rgba(56,189,248,.12)_inset,0_10px_22px_-14px_rgba(0,0,0,.9)] transition hover:scale-105 hover:border-sky-300/60 hover:text-sky-100", "aria-label": "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0433\u0430\u043B\u0435\u0440\u0435\u044E \u0441\u043A\u0438\u043D\u043E\u0432", title: "\u0413\u0430\u043B\u0435\u0440\u0435\u044F \u0441\u043A\u0438\u043D\u043E\u0432", children: _jsxs("svg", { viewBox: "0 0 24 24", className: "h-4 w-4", fill: "none", "aria-hidden": "true", children: [_jsx("path", { d: "M14 5h5v5", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("path", { d: "M10 14L19 5", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("path", { d: "M19 13v6H5V5h6", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" })] }) }) })] }), _jsx("div", { className: "h-[400px] md:flex-1 md:h-auto", children: _jsx(Skin3DViewer, { className: "h-full w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-900", skinUrl: user?.skinUrl || '' }) })] }) }), _jsx("section", { className: "order-1 flex flex-col md:col-span-9 md:order-2", children: _jsxs(Card, { className: "relative flex h-full flex-col overflow-hidden", children: [user?.bannerUrl && (_jsxs("div", { className: "absolute left-0 right-0 top-0 h-48 overflow-hidden", children: [_jsx("img", { src: user.bannerUrl, alt: "Profile banner", className: "h-full w-full object-cover", style: { imageRendering: 'pixelated' } }), _jsx("div", { className: "absolute inset-0 bg-linear-to-b from-transparent via-transparent to-slate-900" })] })), self && (_jsxs(_Fragment, { children: [_jsx("button", { type: "button", onClick: handleShareProfile, className: "absolute right-14 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-900/70 text-slate-200 hover:border-slate-500 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-300 backdrop-blur-sm", "aria-label": "\u041F\u043E\u0434\u0435\u043B\u0438\u0442\u044C\u0441\u044F \u043F\u0440\u043E\u0444\u0438\u043B\u0435\u043C", title: "\u041F\u043E\u0434\u0435\u043B\u0438\u0442\u044C\u0441\u044F \u043F\u0440\u043E\u0444\u0438\u043B\u0435\u043C", children: _jsxs("svg", { viewBox: "0 0 24 24", className: "h-5 w-5", fill: "none", "aria-hidden": "true", children: [_jsx("path", { d: "M14 5h5v5", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("path", { d: "M10 14L19 5", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("path", { d: "M19 13v6H5V5h6", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" })] }) }), _jsx("a", { href: "/settings/profile", className: "absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-900/70 text-slate-200 hover:border-slate-500 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-300 backdrop-blur-sm", "aria-label": "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043F\u0440\u043E\u0444\u0438\u043B\u044C", children: _jsx("svg", { viewBox: "0 0 32 32", className: "h-5 w-5", "aria-hidden": "true", children: _jsx("path", { d: "M16.0002 10C14.8135 10 13.6535 10.3519 12.6668 11.0112C11.6801 11.6705 10.9111 12.6076 10.457 13.7039C10.0028 14.8003 9.88402 16.0067 10.1155 17.1706C10.347 18.3344 10.9185 19.4035 11.7576 20.2427C12.5967 21.0818 13.6658 21.6532 14.8297 21.8847C15.9936 22.1162 17.2 21.9974 18.2963 21.5433C19.3927 21.0892 20.3298 20.3201 20.9891 19.3334C21.6483 18.3467 22.0002 17.1867 22.0002 16C21.9986 14.4092 21.3659 12.8841 20.2411 11.7592C19.1162 10.6343 17.591 10.0017 16.0002 10ZM16.0002 20C15.2091 20 14.4358 19.7654 13.778 19.3259C13.1202 18.8864 12.6075 18.2617 12.3047 17.5308C12.002 16.7998 11.9228 15.9956 12.0771 15.2197C12.2314 14.4437 12.6124 13.731 13.1718 13.1716C13.7312 12.6122 14.444 12.2312 15.2199 12.0769C15.9958 11.9225 16.8001 12.0017 17.531 12.3045C18.2619 12.6072 18.8866 13.1199 19.3261 13.7777C19.7656 14.4355 20.0002 15.2089 20.0002 16C20.0002 17.0609 19.5788 18.0783 18.8287 18.8284C18.0785 19.5786 17.0611 20 16.0002 20ZM29.7427 13.4013C29.7149 13.2604 29.657 13.1273 29.5731 13.0108C29.4892 12.8943 29.3812 12.7973 29.2565 12.7263L25.5277 10.6013L25.5127 6.39877C25.5123 6.25403 25.4804 6.11112 25.4193 5.97991C25.3583 5.84869 25.2694 5.7323 25.159 5.63877C23.8064 4.49464 22.2488 3.61785 20.569 3.05502C20.4367 3.01024 20.2965 2.99367 20.1574 3.00637C20.0184 3.01908 19.8835 3.06077 19.7615 3.12877L16.0002 5.23127L12.2352 3.12502C12.1132 3.05664 11.9781 3.01463 11.8388 3.00171C11.6995 2.98879 11.559 3.00525 11.4265 3.05002C9.74792 3.61696 8.1921 4.4971 6.84149 5.64377C6.7312 5.73716 6.64246 5.85336 6.58139 5.98434C6.52032 6.11533 6.48837 6.258 6.48774 6.40252L6.46899 10.6088L2.74024 12.7338C2.61549 12.8048 2.50749 12.9018 2.42359 13.0183C2.33969 13.1348 2.28184 13.2679 2.25399 13.4088C1.91273 15.1236 1.91273 16.8889 2.25399 18.6038C2.28184 18.7446 2.33969 18.8778 2.42359 18.9942C2.50749 19.1107 2.61549 19.2077 2.74024 19.2788L6.46899 21.4038L6.48399 25.6063C6.48444 25.751 6.51631 25.8939 6.57738 26.0251C6.63846 26.1563 6.72729 26.2727 6.83774 26.3663C8.19033 27.5104 9.74793 28.3872 11.4277 28.95C11.56 28.9948 11.7002 29.0114 11.8393 28.9987C11.9784 28.986 12.1133 28.9443 12.2352 28.8763L16.0002 26.7688L19.7652 28.875C19.9142 28.958 20.0822 29.0011 20.2527 29C20.362 29 20.4704 28.9823 20.574 28.9475C22.2524 28.3813 23.8082 27.502 25.159 26.3563C25.2693 26.2629 25.358 26.1467 25.4191 26.0157C25.4802 25.8847 25.5121 25.742 25.5127 25.5975L25.5315 21.3913L29.2602 19.2663C29.385 19.1952 29.493 19.0982 29.5769 18.9817C29.6608 18.8653 29.7186 18.7321 29.7465 18.5913C30.0858 16.8778 30.0846 15.1143 29.7427 13.4013Z", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" }) }) })] })), _jsx("div", { className: "relative z-10 mt-28 flex justify-center", children: _jsx(Avatar, { url: user?.avatarUrl, loading: loading, online: stats?.online }) }), _jsxs("div", { className: "pt-4 text-center", children: [showDisplayName && (_jsx("div", { className: "mb-1 text-xl font-semibold text-slate-300 font-techno", children: displayName })), _jsx("div", { className: "mb-1 flex items-center justify-center gap-2", children: _jsx("h1", { className: "truncate text-2xl font-bold font-techno text-techno-glow", children: loading ? 'Загрузка…' : user ? `${user.username}` : '—' }) }), user?.customStatus && (_jsx("div", { className: "mb-2 text-sm text-slate-300 font-arcane", children: user.customStatus })), _jsxs("div", { className: "mb-4 text-xs text-slate-400 font-arcane", children: [since && _jsxs("span", { children: ["\u0441 ", since] }), self && _jsx("span", { className: "ml-2 rounded-md border border-slate-700 px-2 py-0.5 text-sky-400", children: "\u044D\u0442\u043E \u0432\u044B" })] }), _jsx("p", { className: "mx-auto max-w-2xl whitespace-pre-wrap text-sm text-slate-200", children: loading ? '…' : user?.bio || 'О себе пока ничего не указано' }), user?.socialLinks && Object.keys(user.socialLinks).length > 0 && (_jsx("div", { className: "mt-4", children: _jsx(SocialLinks, { links: user.socialLinks, onChange: () => { }, readOnly: true }) })), !self && (_jsxs("div", { className: "mt-5 flex flex-wrap items-center justify-center gap-2", children: [_jsx("button", { className: "rounded-xl border border-slate-700 px-3 py-1.5 text-sm hover:border-slate-500", children: "\u041D\u0430\u043F\u0438\u0441\u0430\u0442\u044C" }), _jsx("button", { className: "rounded-xl border border-red-800 px-3 py-1.5 text-sm text-red-400 hover:bg-red-900/20", children: "\u041F\u043E\u0436\u0430\u043B\u043E\u0432\u0430\u0442\u044C\u0441\u044F" })] }))] })] }) })] }), _jsxs("div", { className: "grid grid-cols-1 gap-6 lg:grid-cols-2", children: [_jsxs(Card, { children: [_jsxs("div", { className: "mb-3 flex items-center justify-between gap-3", children: [_jsx("h3", { className: "text-sm font-semibold text-sky-300 font-techno", children: "\u0414\u043E\u0441\u0442\u0438\u0436\u0435\u043D\u0438\u044F" }), _jsx(Link, { to: achievementsHref, className: "group inline-flex h-8 w-8 items-center justify-center rounded-full border border-sky-500/35 bg-[radial-gradient(circle_at_30%_20%,rgba(56,189,248,.22),rgba(15,23,42,.92))] text-sky-200 shadow-[0_0_0_1px_rgba(56,189,248,.12)_inset,0_10px_22px_-14px_rgba(0,0,0,.9)] transition hover:scale-105 hover:border-sky-300/60 hover:text-sky-100", "aria-label": "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0432\u0441\u0435 \u0434\u043E\u0441\u0442\u0438\u0436\u0435\u043D\u0438\u044F", title: "\u0412\u0441\u0435 \u0434\u043E\u0441\u0442\u0438\u0436\u0435\u043D\u0438\u044F", children: _jsxs("svg", { viewBox: "0 0 24 24", className: "h-4 w-4", fill: "none", "aria-hidden": "true", children: [_jsx("path", { d: "M14 5h5v5", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("path", { d: "M10 14L19 5", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("path", { d: "M19 13v6H5V5h6", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" })] }) })] }), loading ? (_jsx(Empty, { loading: true, text: "" })) : previewAchievements.length > 0 ? (_jsx("div", { className: "grid grid-cols-2 gap-3 sm:grid-cols-3", children: previewAchievements.map((ach) => (_jsx(Badge, { icon: ach.icon, title: ach.title, description: ach.description, unlocked: true, unlockedAt: ach.unlockedAt }, ach.id))) })) : (_jsx(Empty, { loading: false, text: "\u0423 \u0438\u0433\u0440\u043E\u043A\u0430 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442 \u0434\u043E\u0441\u0442\u0438\u0436\u0435\u043D\u0438\u0439" }))] }), _jsx(Card, { children: profileUsername ? (_jsx(UserSessions, { username: profileUsername })) : (_jsx(Empty, { loading: loading, text: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0441\u0435\u0441\u0441\u0438\u0438" })) })] }), err && (_jsx("div", { className: "mt-6 rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300", children: err }))] }) }) })] }));
}
function Card(props) {
    const { getThemeStyle } = useProfileTheme();
    const customStyle = getThemeStyle();
    const finalStyle = {
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        ...customStyle,
        ...props.style
    };
    return (_jsx("section", { className: `rounded-2xl border border-slate-800 backdrop-blur-md backdrop-saturate-150 p-4 shadow-[0_1px_0_#ffffff10_inset,0_20px_40px_-20px_#000] ${props.className || ''}`, style: finalStyle, children: props.children }));
}
function Avatar({ url, loading, online }) {
    return (_jsxs("div", { className: "relative h-32 w-32 rounded-3xl border-2 border-sky-700/50 bg-slate-900 shadow-[0_8px_24px_rgba(2,132,199,0.25)]", children: [loading ? (_jsx("div", { className: "h-full w-full animate-pulse rounded-3xl bg-slate-800" })) : url ? (_jsx("img", { src: url, alt: "\u0410\u0432\u0430\u0442\u0430\u0440", loading: "lazy", decoding: "async", className: "h-full w-full rounded-3xl object-cover" })) : (_jsx("div", { className: "flex h-full w-full items-center justify-center rounded-3xl text-slate-400", children: "AVA" })), typeof online === 'boolean' && !loading && (_jsx("span", { className: `absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-slate-900 ${online
                    ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,.75)]'
                    : 'bg-slate-500 shadow-[0_0_6px_rgba(100,116,139,.55)]'}`, title: online ? 'Онлайн' : 'Оффлайн', "aria-label": online ? 'Онлайн' : 'Оффлайн' }))] }));
}
function Empty({ loading, text }) {
    return loading ? (_jsx("div", { className: "h-20 animate-pulse rounded-xl bg-slate-800" })) : (_jsx("div", { className: "rounded-xl border border-slate-800 bg-slate-900 p-6 text-center text-sm text-slate-400", children: text }));
}
