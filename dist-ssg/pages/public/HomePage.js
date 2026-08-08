import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { SERVER_NAME, SERVER_IP, RULES_URL, SHOP_URL, WIKI_URL, LAUNCHER_DOWNLOAD_URL } from '../../shared/constants.js';
import { useWallpaper } from '../../shared/ui/wallpaper/useWallpaper.js';
import { AnimatePresence, motion, useReducedMotion, } from 'framer-motion';
import { Seo } from '../../shared/seo/seo.js';
import { routesMeta } from '../../shared/seo/routesMeta.js';
import { ResponsiveImage } from '../../shared/ui/image/ResponsiveImage.js';
import { SvgUserPlus, SvgSkin, SvgMcBlockGrass, SvgServer, SvgModpack, SvgRoute, SvgLauncher, SvgDownload, SvgShield, SvgGitHub, SvgCheck, SvgCopy, SvgChevronDown, SvgCrown } from '../../shared/ui/image/Icons.js';
import { useIsMobile } from '../../shared/ui/utils/useIsMobile.js';
import { TEAM_MEMBERS } from '../../shared/data/team.js';
import { useTeamAvatars } from '../../shared/hooks/useTeamAvatars.js';
import { TeamGrid } from '../../shared/ui/card/TeamGrid.js';
import { useI18n } from '../../shared/i18n/I18nProvider.js';
import { homeTranslations } from '../../shared/i18n/translations.js';
// The historical online chart is temporarily hidden from the landing page.
// Keep its code below for an easy return when it becomes marketing-positive.
const ONLINE_TREND_ENABLED = false;
// The player counter is temporarily hidden from the hero.
// Keep the complete UI below so it can be restored with one flag.
const ONLINE_COUNTER_ENABLED = false;
const NEOFORGE_LOGO_URL = 'https://raw.githubusercontent.com/neoforged/Documentation/main/static/img/logo.svg';
export default function HomePage() {
    useWallpaper();
    const { language } = useI18n();
    const copy = homeTranslations[language];
    const prefersReducedMotion = useReducedMotion();
    const reduceMotion = Boolean(prefersReducedMotion);
    const isMobile = useIsMobile();
    const disableEntranceMotion = reduceMotion || isMobile;
    const disableInteractiveMotion = reduceMotion;
    const [status, setStatus] = useState(null);
    const [copyOk, setCopyOk] = useState('idle');
    const [playerAvatars, setPlayerAvatars] = useState({});
    const [showPlayersList, setShowPlayersList] = useState(false);
    const playersButtonRef = useRef(null);
    const [playersListPosition, setPlayersListPosition] = useState({ top: 0 });
    const [onlinePoints, setOnlinePoints] = useState([]);
    const [onlineRange, setOnlineRange] = useState('7d');
    // Range switching is temporarily disabled. Keep the previous stateful version
    // here so it can be restored together with the tabs in TopPlayersSection.
    // const [leaderboardRange, setLeaderboardRange] = useState<LeaderboardRange>('7d')
    const leaderboardRange = 'all';
    const [leaderboardPlayers, setLeaderboardPlayers] = useState([]);
    const [leaderboardAvatars, setLeaderboardAvatars] = useState({});
    const [leaderboardLoading, setLeaderboardLoading] = useState(true);
    const [galleryHover, setGalleryHover] = useState(false);
    const shots = useMemo(() => [
        '/images/screen10.png',
        '/images/screen13.png',
        '/images/screen9.png',
        '/images/screen4.png',
        '/images/screen11.png',
        '/images/screen1.png',
        '/images/screen3.png',
        '/images/screen12.png',
    ], []);
    const shotMeta = useMemo(() => ({
        '/images/screen1.png': { title: copy.shots.screen1[0], subtitle: copy.shots.screen1[1] },
        '/images/screen13.png': { title: copy.shots.screen13[0], subtitle: copy.shots.screen13[1] },
        '/images/screen3.png': { title: copy.shots.screen3[0], subtitle: copy.shots.screen3[1] },
        '/images/screen4.png': { title: copy.shots.screen4[0], subtitle: copy.shots.screen4[1] },
        '/images/screen9.png': { title: copy.shots.screen9[0], subtitle: copy.shots.screen9[1] },
        '/images/screen10.png': { title: copy.shots.screen10[0], subtitle: copy.shots.screen10[1] },
        '/images/screen11.png': { title: copy.shots.screen11[0], subtitle: copy.shots.screen11[1] },
        '/images/screen12.png': { title: copy.shots.screen12[0], subtitle: copy.shots.screen12[1] },
    }), [copy]);
    const [shot, setShot] = useState(shots[0]);
    const activeShotMeta = shotMeta[shot] ??
        { title: copy.fallbackShot, subtitle: copy.fallbackShotSubtitle };
    const [prevShot, setPrevShot] = useState(null);
    const [cross, setCross] = useState(true);
    const [activeIndex, setActiveIndex] = useState(0);
    const [direction, setDirection] = useState(1);
    const [sliderPaused, setSliderPaused] = useState(false);
    const thumbSpring = {
        type: 'spring',
        stiffness: 260,
        damping: 22,
        mass: 0.6,
    };
    const thumbVariants = {
        active: {
            scale: 1,
            opacity: 1,
            y: 0,
        },
        inactive: {
            scale: 0.85,
            opacity: 0.55,
            y: 2,
        },
    };
    const toName = (p) => p
        .split('/')
        .pop()
        .replace(/-[a-z0-9]{8,}(?=\.\w+$)/i, '')
        .replace(/\.(avif|webp)$/i, '.png');
    const swipeState = useRef({
        startX: 0,
        startY: 0,
        deltaX: 0,
        deltaY: 0,
        active: false,
    });
    function goRelative(direction) {
        const currentIndex = shots.indexOf(shot);
        if (currentIndex === -1)
            return;
        const nextIndex = (currentIndex + direction + shots.length) % shots.length;
        changeTo(shots[nextIndex]);
    }
    function handleTouchStart(e) {
        if (e.touches.length !== 1)
            return;
        const touch = e.touches[0];
        swipeState.current = {
            startX: touch.clientX,
            startY: touch.clientY,
            deltaX: 0,
            deltaY: 0,
            active: true,
        };
    }
    function handleTouchMove(e) {
        if (!swipeState.current.active)
            return;
        const touch = e.touches[0];
        swipeState.current.deltaX = touch.clientX - swipeState.current.startX;
        swipeState.current.deltaY = touch.clientY - swipeState.current.startY;
        if (Math.abs(swipeState.current.deltaX) > Math.abs(swipeState.current.deltaY)) {
            e.preventDefault();
        }
    }
    function handleTouchEnd() {
        if (!swipeState.current.active)
            return;
        const { deltaX, deltaY } = swipeState.current;
        swipeState.current.active = false;
        if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
            goRelative(deltaX < 0 ? 1 : -1);
        }
    }
    function handleTouchCancel() {
        swipeState.current.active = false;
    }
    const avatars = useTeamAvatars(TEAM_MEMBERS);
    function changeTo(newSrc) {
        if (newSrc === shot)
            return;
        const currIdx = shots.indexOf(shot);
        const nextIdx = shots.indexOf(newSrc);
        if (currIdx !== -1 && nextIdx !== -1) {
            setDirection(nextIdx > currIdx ? 1 : -1);
            setActiveIndex(nextIdx);
        }
        setPrevShot(shot);
        setShot(newSrc);
        setCross(false);
        requestAnimationFrame(() => {
            requestAnimationFrame(() => setCross(true));
        });
        setTimeout(() => setPrevShot(null), 320);
    }
    function applyStatusPayload(data) {
        const nextStatus = {
            online: data.online ?? false,
            version: data.version,
            motd: data.motd?.clean?.[0] || data.motd?.raw?.[0],
            players: data.online ? {
                online: data.players?.online ?? 0,
                max: data.players?.max ?? 0,
                sample: data.players?.list?.map((name) => ({ name })) ?? []
            } : undefined
        };
        setStatus(nextStatus);
    }
    useEffect(() => {
        let stop = false;
        (async () => {
            try {
                const r = await fetch(`https://api.mcsrvstat.us/2/${SERVER_IP}`, { cache: 'no-store' });
                if (!r.ok)
                    throw new Error('status failed');
                const data = await r.json();
                if (!stop)
                    applyStatusPayload(data);
            }
            catch {
                if (!stop) {
                    setStatus({ online: false });
                }
            }
        })();
        const id = setInterval(() => {
            fetch(`https://api.mcsrvstat.us/2/${SERVER_IP}`, { cache: 'no-store' })
                .then(r => (r.ok ? r.json() : null))
                .then(d => {
                if (d)
                    applyStatusPayload(d);
            })
                .catch(() => {
                setStatus((prev) => prev ?? { online: false });
            });
        }, 15000);
        return () => {
            stop = true;
            clearInterval(id);
        };
    }, []);
    useEffect(() => {
        if (!ONLINE_TREND_ENABLED)
            return;
        let stop = false;
        async function loadOnlineTrend() {
            try {
                const response = await fetch(`/api/v1/sessions/online-trend?range=${encodeURIComponent(onlineRange)}`, {
                    cache: 'no-store',
                });
                if (!response.ok)
                    throw new Error('trend failed');
                const data = (await response.json());
                const parsedPoints = (data.points ?? [])
                    .map((point) => {
                    const tsRaw = point?.ts;
                    const ts = typeof tsRaw === 'number'
                        ? tsRaw
                        : typeof tsRaw === 'string'
                            ? Date.parse(tsRaw)
                            : Number.NaN;
                    if (!Number.isFinite(ts))
                        return null;
                    const online = Math.max(0, Math.round(Number(point?.online ?? 0)));
                    return { ts, online, max: online };
                })
                    .filter((point) => point !== null)
                    .sort((a, b) => a.ts - b.ts);
                if (!stop)
                    setOnlinePoints(parsedPoints);
            }
            catch {
                if (!stop)
                    setOnlinePoints((prev) => prev);
            }
        }
        void loadOnlineTrend();
        const id = window.setInterval(() => void loadOnlineTrend(), 60_000);
        return () => {
            stop = true;
            clearInterval(id);
        };
    }, [onlineRange]);
    useEffect(() => {
        let stop = false;
        async function loadLeaderboard() {
            if (!stop)
                setLeaderboardLoading(true);
            try {
                const response = await fetch(`/api/v1/sessions/leaderboard?range=${encodeURIComponent(leaderboardRange)}&limit=5`, { cache: 'no-store' });
                if (!response.ok)
                    throw new Error('leaderboard failed');
                const data = (await response.json());
                const parsedPlayers = (data.players ?? [])
                    .map((item, index) => {
                    const username = (item?.username ?? '').trim();
                    if (!username)
                        return null;
                    const totalMinutes = Math.max(0, Math.round(Number(item?.totalMinutes ?? 0)));
                    const totalHours = Number(item?.totalHours ?? totalMinutes / 60);
                    const sessions = Math.max(0, Math.round(Number(item?.sessions ?? 0)));
                    const activeDays = Math.max(0, Math.round(Number(item?.activeDays ?? 0)));
                    const rankRaw = Math.round(Number(item?.rank ?? index + 1));
                    return {
                        rank: Math.max(1, rankRaw),
                        username,
                        totalMinutes,
                        totalHours: Number.isFinite(totalHours) ? totalHours : totalMinutes / 60,
                        sessions,
                        activeDays,
                    };
                })
                    .filter((item) => item !== null);
                if (stop)
                    return;
                setLeaderboardPlayers(parsedPlayers);
                const avatars = {};
                await Promise.all(parsedPlayers.map(async (player) => {
                    try {
                        const profileResponse = await fetch(`/api/v1/users/by-name?username=${encodeURIComponent(player.username)}`, { cache: 'no-store' });
                        if (!profileResponse.ok)
                            return;
                        const profileData = await profileResponse.json();
                        if (typeof profileData?.avatarUrl === 'string' && profileData.avatarUrl) {
                            avatars[player.username] = profileData.avatarUrl;
                        }
                    }
                    catch { }
                }));
                if (!stop)
                    setLeaderboardAvatars(avatars);
            }
            catch {
                if (!stop) {
                    setLeaderboardPlayers([]);
                    setLeaderboardAvatars({});
                }
            }
            finally {
                if (!stop)
                    setLeaderboardLoading(false);
            }
        }
        void loadLeaderboard();
        const id = window.setInterval(() => void loadLeaderboard(), 120_000);
        return () => {
            stop = true;
            clearInterval(id);
        };
    }, [leaderboardRange]);
    useEffect(() => {
        if (disableInteractiveMotion)
            return;
        if (sliderPaused)
            return;
        const id = window.setInterval(() => {
            const currentIndex = shots.indexOf(shot);
            const nextIndex = (currentIndex + 1 + shots.length) % shots.length;
            changeTo(shots[nextIndex]);
        }, 5000);
        return () => window.clearInterval(id);
    }, [shot, sliderPaused, disableInteractiveMotion]);
    const onlineText = useMemo(() => {
        if (!status)
            return "-";
        if (!status.online)
            return 'Offline';
        const c = status.players?.online ?? 0;
        const m = status.players?.max ?? 0;
        return `${c} / ${m}`;
    }, [status]);
    const onlineSeries = useMemo(() => {
        if (onlinePoints.length > 0)
            return onlinePoints;
        return [{
                ts: Date.now(),
                online: status?.players?.online ?? 0,
                max: status?.players?.max ?? 0,
            }];
    }, [onlinePoints, status?.players?.online, status?.players?.max]);
    const onlinePeak = useMemo(() => onlineSeries.reduce((max, p) => Math.max(max, p.online), 0), [onlineSeries]);
    const onlineAvg = useMemo(() => {
        if (!onlineSeries.length)
            return 0;
        const sum = onlineSeries.reduce((acc, p) => acc + p.online, 0);
        return Math.round(sum / onlineSeries.length);
    }, [onlineSeries]);
    const onlineNow = onlineSeries[onlineSeries.length - 1]?.online ?? status?.players?.online ?? 0;
    useEffect(() => {
        const players = status?.players?.sample ?? [];
        if (!players.length) {
            setPlayerAvatars({});
            return;
        }
        let alive = true;
        (async () => {
            const avatars = {};
            await Promise.all(players.map(async (player) => {
                try {
                    const r = await fetch(`/api/v1/users/by-name?username=${encodeURIComponent(player.name)}`);
                    if (!r.ok)
                        return;
                    const data = await r.json();
                    if (data.avatarUrl && alive)
                        avatars[player.name] = data.avatarUrl;
                }
                catch { }
            }));
            if (alive)
                setPlayerAvatars(avatars);
        })();
        return () => {
            alive = false;
        };
    }, [status?.players?.sample]);
    useEffect(() => {
        if (!isMobile)
            setShowPlayersList(false);
    }, [isMobile]);
    async function copyIp() {
        try {
            await navigator.clipboard.writeText(SERVER_IP);
            setCopyOk('ok');
            setTimeout(() => setCopyOk('idle'), 2000);
        }
        catch {
            setCopyOk('err');
            setTimeout(() => setCopyOk('idle'), 2000);
        }
    }
    const faqContainer = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.08, delayChildren: 0.05 },
        },
    };
    const faqItem = {
        hidden: { opacity: 0, y: 14, scale: 0.98 },
        show: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: { duration: 0.35, ease: 'easeOut' },
        },
    };
    return (_jsxs(_Fragment, { children: [_jsx(Seo, { ...routesMeta['/'] }), _jsxs("div", { className: "min-h-dvh text-slate-100 relative overflow-x-hidden", children: [_jsx(motion.section, { className: "mx-auto max-w-7xl px-4 pb-10 pt-10 md:pt-16", initial: disableEntranceMotion ? undefined : { opacity: 0, y: 24, filter: 'blur(8px)' }, animate: disableEntranceMotion ? undefined : { opacity: 1, y: 0, filter: 'blur(0px)' }, transition: { duration: 0.5, ease: 'easeOut' }, children: _jsxs("div", { className: "grid md:grid-cols-2 gap-10 md:gap-14 items-stretch", children: [_jsxs("div", { className: "md:flex md:flex-col md:h-full md:justify-between", children: [_jsxs("div", { children: [_jsx("img", { src: "/images/logo-steel-wings.png", alt: `${SERVER_NAME} Steel Wings`, className: "mb-6 block w-[420px] max-w-full select-none object-contain drop-shadow-[0_0_28px_rgba(99,102,241,0.42)] md:translate-x-16", draggable: false }), _jsx("p", { className: "mt-4 text-slate-300 max-w-prose", children: copy.hero }), _jsxs("div", { className: "mt-6 grid gap-3", children: [_jsxs("div", { className: "flex w-full items-stretch overflow-hidden rounded-xl border border-slate-800 max-w-md", children: [_jsx("div", { className: "px-3 hidden sm:grid place-items-center bg-slate-900/60 border-r border-slate-800 text-xs text-slate-300", children: "IP" }), _jsx("div", { className: "px-3 font-mono flex-1 truncate flex items-center justify-center text-center backdrop-blur-md backdrop-saturate-150", children: SERVER_IP }), _jsx("button", { onClick: copyIp, className: "px-3 py-2 bg-slate-900/60 hover:bg-slate-800 border-l border-slate-800 text-sm grid place-items-center", "aria-label": copyOk === 'ok' ? copy.copied : copyOk === 'err' ? copy.error : copy.copyIp, title: copyOk === 'ok' ? copy.copied : copyOk === 'err' ? copy.error : copy.copyIp, type: "button", children: _jsx(motion.div, { animate: copyOk === 'ok'
                                                                            ? { scale: [1, 1.2, 1], rotate: [0, -8, 0] }
                                                                            : copyOk === 'err'
                                                                                ? { x: [-2, 2, -2, 2, 0] }
                                                                                : { scale: 1, rotate: 0, x: 0 }, transition: { duration: 0.3 }, className: "grid place-items-center", children: copyOk === 'ok' ? (_jsx(SvgCheck, { className: "size-5" })) : (_jsx(SvgCopy, { className: "size-5" })) }) })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-4 text-sm text-slate-300", children: [_jsx(Badge, { label: status?.online ? copy.online : copy.offline, ok: !!status?.online, reduceMotion: disableInteractiveMotion }), ONLINE_COUNTER_ENABLED && (_jsxs("div", { className: "relative", onMouseEnter: () => !isMobile && setShowPlayersList(true), onMouseLeave: () => !isMobile && setShowPlayersList(false), children: [_jsxs("button", { ref: playersButtonRef, type: "button", onClick: () => {
                                                                                if (isMobile) {
                                                                                    const button = playersButtonRef.current;
                                                                                    if (button) {
                                                                                        const rect = button.getBoundingClientRect();
                                                                                        setPlayersListPosition({
                                                                                            top: rect.top - 8
                                                                                        });
                                                                                    }
                                                                                    setShowPlayersList((v) => !v);
                                                                                }
                                                                            }, className: "cursor-pointer bg-transparent border-0 text-sm text-slate-300 p-0 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded", children: [copy.players, ": ", _jsx("strong", { className: "text-slate-100", children: onlineText })] }), _jsx(AnimatePresence, { children: showPlayersList && status?.online && status?.players?.sample && status.players.sample.length > 0 && (_jsxs(_Fragment, { children: [isMobile && (_jsx("div", { className: "fixed inset-0 z-40 bg-black/20", onClick: () => setShowPlayersList(false) })), _jsxs(motion.div, { initial: { opacity: 0, y: 8, scale: 0.95 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: 8, scale: 0.95 }, transition: { duration: 0.2 }, className: `${isMobile ? 'fixed right-4' : 'absolute left-0 top-full mt-2'} z-50 ${isMobile ? 'w-[calc(100vw-2rem)] max-w-64' : 'w-64'} rounded-xl border border-slate-800 bg-slate-950/95 backdrop-blur-md shadow-xl p-3`, style: isMobile ? {
                                                                                            top: `${playersListPosition.top}px`,
                                                                                            transform: 'translateY(-100%)'
                                                                                        } : undefined, children: [_jsxs("div", { className: "text-xs font-semibold text-slate-400 mb-2 px-1 flex items-center justify-between gap-2", children: [_jsxs("span", { children: [copy.onlinePlayers, " (", status.players.sample.length, ")"] }), isMobile && (_jsx("button", { type: "button", onClick: () => setShowPlayersList(false), className: "text-slate-400 hover:text-white text-xs", children: copy.close }))] }), _jsx("div", { className: "max-h-64 overflow-y-auto space-y-1.5", children: status.players.sample.map((player) => {
                                                                                                    const avatar = playerAvatars[player.name];
                                                                                                    return (_jsxs(Link, { to: `/u/${encodeURIComponent(player.name)}`, className: "flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-900/60 transition-colors group", children: [avatar ? (_jsx("img", { src: avatar, alt: player.name, width: 24, height: 24, className: "w-6 h-6 rounded-lg object-cover border border-slate-700", loading: "lazy", decoding: "async" })) : (_jsx("div", { className: "w-6 h-6 rounded-lg border border-slate-700 bg-slate-800 flex items-center justify-center text-xs text-slate-400", children: player.name[0]?.toUpperCase() || '?' })), _jsx("span", { className: "text-sm text-slate-200 group-hover:text-slate-100 truncate flex-1", children: player.name })] }, player.name));
                                                                                                }) })] })] })) })] })), _jsxs("span", { className: "inline-flex items-center gap-2", children: [_jsx("img", { src: NEOFORGE_LOGO_URL, alt: "", "aria-hidden": "true", className: "size-6 shrink-0 object-contain" }), _jsxs("span", { children: [copy.version, ": ", _jsx("strong", { className: "text-slate-100", children: "1.21.1 NeoForge" })] })] }), typeof status?.tps === 'number' && _jsxs("span", { children: ["TPS: ", _jsx("strong", { className: "text-slate-100", children: status.tps.toFixed(1) })] }), typeof status?.latencyMs === 'number' && _jsxs("span", { children: [copy.ping, ": ", _jsxs("strong", { className: "text-slate-100", children: [status.latencyMs, "ms"] })] })] })] })] }), _jsxs("div", { className: "mt-7 flex flex-wrap items-center gap-2 md:mt-0 md:mb-2", children: [_jsxs("a", { href: LAUNCHER_DOWNLOAD_URL, className: "inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-center shadow-[0_0_24px_rgba(79,70,229,0.45)] transition hover:bg-indigo-500", children: [_jsx(SvgDownload, { className: "size-5" }), copy.downloadLauncher] }), _jsx("a", { href: "https://github.com/Reijin2312/ArchiTech_Launcher", target: "_blank", rel: "noreferrer noopener", "aria-label": copy.launcherSourceAria, title: copy.launcherSource, className: "inline-flex size-11 items-center justify-center text-slate-400 transition hover:scale-110 hover:text-white", children: _jsx(SvgGitHub, { className: "size-6" }) })] })] }), _jsxs("div", { className: "relative flex h-full max-w-full flex-col overflow-x-hidden px-2 md:overflow-visible", onMouseEnter: () => {
                                        setSliderPaused(true);
                                        setGalleryHover(true);
                                    }, onMouseLeave: () => {
                                        setSliderPaused(false);
                                        setGalleryHover(false);
                                    }, onFocus: () => {
                                        setSliderPaused(true);
                                        setGalleryHover(true);
                                    }, onBlur: () => {
                                        setSliderPaused(false);
                                        setGalleryHover(false);
                                    }, onTouchStart: handleTouchStart, onTouchMove: handleTouchMove, onTouchEnd: handleTouchEnd, onTouchCancel: handleTouchCancel, children: [_jsx("div", { className: "aspect-16/10 w-full overflow-hidden rounded-2xl border border-slate-800 shadow-xl", children: _jsxs("div", { className: "relative h-full w-full overflow-hidden", children: [_jsx(AnimatePresence, { initial: false, custom: direction, children: _jsx(motion.div, { className: "absolute inset-0 h-full w-full", custom: direction, initial: disableInteractiveMotion ? false : { opacity: 0, x: 40 * direction, scale: 1.02 }, animate: { opacity: 1, x: 0, scale: 1 }, exit: disableInteractiveMotion ? { opacity: 0 } : { opacity: 0, x: -40 * direction, scale: 0.98 }, transition: { type: 'spring', stiffness: 260, damping: 30 }, children: _jsx(ResponsiveImage, { name: toName(shot), alt: copy.galleryAlt, eager: true, width: 1600, height: 900, sizes: "(max-width:640px) 100vw, (max-width:1024px) 80vw, 1200px", className: "h-full w-full object-cover" }) }, shot) }), _jsx(motion.div, { className: "pointer-events-none absolute inset-x-0 bottom-0 p-4 sm:p-5", initial: false, animate: galleryHover ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }, transition: disableInteractiveMotion
                                                            ? { duration: 0.12 }
                                                            : { type: 'spring', stiffness: 280, damping: 28, mass: 0.65 }, children: _jsxs("div", { className: "w-fit max-w-[90%] rounded-xl border border-slate-700/80 bg-slate-950/90 px-4 py-2.5 shadow-[0_10px_30px_rgba(2,6,23,0.62)]", children: [_jsx("div", { className: "text-[10px] uppercase tracking-[0.14em] text-indigo-300/95", children: copy.gallery }), _jsx("div", { className: "mt-1 text-sm font-semibold text-slate-100", children: activeShotMeta.title }), _jsx("div", { className: "text-xs text-slate-300", children: activeShotMeta.subtitle })] }) })] }) }), _jsxs(motion.div, { className: "mt-3 flex w-full flex-nowrap gap-3 overflow-x-auto py-2 px-2 no-scrollbar md:w-[calc(100%+3rem)] md:-mx-2", layout: true, children: [shots.map((_, i) => {
                                                    const idx = (activeIndex + i) % shots.length;
                                                    const src = shots[idx];
                                                    const isActive = shot === src;
                                                    return (_jsx(motion.button, { layout: true, variants: thumbVariants, animate: isActive ? 'active' : 'inactive', whileHover: { scale: 1.05, opacity: 1 }, whileTap: { scale: 0.95 }, transition: thumbSpring, onClick: () => changeTo(src), "aria-label": copy.showScreenshot, className: [
                                                            'group relative flex-none w-16 aspect-square rounded-xl ring-offset-2 ring-offset-slate-950 border',
                                                            i === 0 ? 'origin-left' : i === shots.length - 1 ? 'origin-right' : 'origin-center',
                                                            isActive
                                                                ? 'border-transparent ring-2 ring-indigo-500/40'
                                                                : 'border-slate-800 ring-0 ring-transparent',
                                                        ].join(' '), children: _jsx(ResponsiveImage, { name: toName(src), alt: "", width: 160, height: 160, sizes: "64px", className: "h-full w-full object-cover rounded-xl" }) }, src));
                                                }), _jsx("div", { className: "flex-none w-4", "aria-hidden": true })] })] })] }) }), _jsx(motion.section, { className: "mx-auto max-w-7xl px-4 py-10", initial: disableEntranceMotion ? undefined : { y: 24 }, animate: disableEntranceMotion ? undefined : { y: 0 }, transition: { duration: 0.5, ease: 'easeOut' }, children: _jsxs("div", { className: "grid gap-4 md:grid-cols-2 lg:grid-cols-4", children: [_jsx(CardCTA, { title: _jsxs("span", { className: "inline-flex items-center gap-2", children: [_jsx(SvgServer, { className: "h-5" }), copy.cards[0][0]] }), text: copy.cards[0][1], href: "/about", button: copy.cards[0][2], reduceMotion: disableInteractiveMotion }), _jsx(CardCTA, { title: _jsxs("span", { className: "inline-flex items-center gap-2", children: [_jsx(SvgModpack, { className: "h-5" }), copy.cards[1][0]] }), text: copy.cards[1][1], href: `${WIKI_URL}#mods`, button: copy.cards[1][2], reduceMotion: disableInteractiveMotion }), _jsx(CardCTA, { title: _jsxs("span", { className: "inline-flex items-center gap-2", children: [_jsx(SvgRoute, { className: "h-5" }), copy.cards[2][0]] }), text: copy.cards[2][1], href: SHOP_URL, button: copy.cards[2][2], reduceMotion: disableInteractiveMotion }), _jsx(CardCTA, { title: _jsxs("span", { className: "inline-flex items-center gap-2", children: [_jsx(SvgLauncher, { className: "h-5" }), copy.cards[3][0]] }), text: copy.cards[3][1], href: LAUNCHER_DOWNLOAD_URL, button: copy.cards[3][2], reduceMotion: disableInteractiveMotion })] }) }), _jsxs(motion.section, { className: "mx-auto max-w-7xl px-4 py-10", variants: faqContainer, initial: disableEntranceMotion ? undefined : 'hidden', whileInView: disableEntranceMotion ? undefined : 'show', viewport: { once: true, margin: '-10% 0px' }, children: [_jsx(motion.h2, { className: "text-2xl font-semibold mb-6 font-techno", variants: disableEntranceMotion ? undefined : faqItem, children: copy.team }), _jsx(TeamGrid, { team: TEAM_MEMBERS, avatars: avatars, disableMotion: disableEntranceMotion })] }), _jsxs(motion.section, { className: "mx-auto max-w-7xl px-4 py-10", variants: faqContainer, initial: disableEntranceMotion ? undefined : 'hidden', whileInView: disableEntranceMotion ? undefined : 'show', viewport: { once: true, margin: '-10% 0px' }, children: [_jsx(motion.h2, { className: "text-2xl font-semibold mb-6 font-techno", variants: disableEntranceMotion ? undefined : faqItem, children: copy.leaderboard }), _jsx(TopPlayersSection, { players: leaderboardPlayers, avatars: leaderboardAvatars, loading: leaderboardLoading, range: leaderboardRange, disableMotion: disableInteractiveMotion })] }), _jsxs(motion.section, { className: "mx-auto max-w-7xl px-4 py-10", variants: faqContainer, initial: disableEntranceMotion ? undefined : 'hidden', whileInView: disableEntranceMotion ? undefined : 'show', viewport: { once: true, margin: '-10% 0px' }, children: [_jsx(motion.h2, { className: "text-2xl font-semibold mb-6 font-techno", variants: disableEntranceMotion ? undefined : faqItem, children: copy.faq }), _jsxs(motion.div, { className: "grid gap-3", children: [_jsx(motion.div, { variants: disableEntranceMotion ? undefined : faqItem, children: _jsx(Faq, { icon: _jsx(SvgRoute, { className: "size-5" }), q: copy.faqItems.start, a: _jsx(StepsGuide, { disableMotion: disableEntranceMotion }) }) }), _jsx(motion.div, { variants: disableEntranceMotion ? undefined : faqItem, children: _jsx(Faq, { q: copy.faqItems.launcher, icon: _jsx(SvgLauncher, { className: "size-5" }), a: _jsx(FaqInfoCard, { label: copy.faqItems.launcherLabel, children: copy.faqItems.launcherAnswer }) }) }), _jsx(motion.div, { variants: disableEntranceMotion ? undefined : faqItem, children: _jsx(Faq, { q: copy.faqItems.safety, icon: _jsx(SvgShield, { className: "size-5" }), a: _jsxs(FaqInfoCard, { label: copy.faqItems.safetyLabel, children: [copy.faqItems.safetyBefore, ' ', _jsx("a", { href: "https://github.com/Reijin2312/ArchiTech_Launcher", target: "_blank", rel: "noreferrer noopener", className: "text-sky-300 underline decoration-sky-400/60 underline-offset-2 hover:text-sky-200", children: copy.faqItems.safetyLink }), copy.faqItems.safetyAfter] }) }) }), _jsx(motion.div, { variants: disableEntranceMotion ? undefined : faqItem, children: _jsx(Faq, { q: copy.faqItems.free, icon: _jsx(SvgUserPlus, { className: "size-5" }), a: _jsx(FaqInfoCard, { label: copy.faqItems.freeLabel, children: copy.faqItems.freeAnswer }) }) }), _jsx(motion.div, { variants: disableEntranceMotion ? undefined : faqItem, children: _jsx(Faq, { q: copy.faqItems.license, icon: _jsx(SvgShield, { className: "size-5" }), a: _jsx(FaqInfoCard, { label: copy.faqItems.licenseLabel, children: copy.faqItems.licenseAnswer }) }) }), _jsx(motion.div, { variants: disableEntranceMotion ? undefined : faqItem, children: _jsx(Faq, { q: copy.faqItems.mods, icon: _jsx(SvgModpack, { className: "size-5" }), a: _jsx(FaqInfoCard, { label: copy.faqItems.modsLabel, children: _jsxs(_Fragment, { children: [_jsx("span", { children: copy.faqItems.modsAnswer }), ' ', _jsx("a", { href: `${WIKI_URL}#mods`, className: "mt-2 inline-flex text-sky-300 underline decoration-sky-400/60 underline-offset-2 hover:text-sky-200", children: copy.faqItems.modsLink })] }) }) }) }), _jsx(motion.div, { variants: disableEntranceMotion ? undefined : faqItem, children: _jsx(Faq, { q: copy.faqItems.skins, icon: _jsx(SvgSkin, { className: "size-5" }), a: _jsx(FaqInfoCard, { label: copy.faqItems.skinsLabel, children: copy.faqItems.skinsAnswer }) }) }), _jsx(motion.div, { variants: disableEntranceMotion ? undefined : faqItem, children: _jsx(Faq, { q: copy.faqItems.wipes, icon: _jsx(SvgMcBlockGrass, { className: "size-5" }), a: _jsxs("div", { className: "relative overflow-hidden rounded-2xl border border-slate-800 bg-linear-to-br from-slate-950/80 via-slate-900/60 to-slate-900/20 backdrop-blur-md backdrop-saturate-150 px-4 py-4 sm:px-5 sm:py-5 group transition", children: [_jsx("div", { className: "pointer-events-none absolute -top-20 -right-16 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" }), _jsx("div", { className: "pointer-events-none absolute -bottom-24 -left-20 h-40 w-40 rounded-full bg-sky-500/10 blur-3xl" }), _jsx("div", { className: "absolute inset-x-0 top-0 h-px bg-linear-to-r from-indigo-500/40 via-sky-500/60 to-emerald-500/40 opacity-80" }), _jsx("div", { className: "flex items-start gap-3", children: _jsxs("div", { className: "space-y-1", children: [_jsx("div", { className: "inline-flex items-center gap-2 text-[11px] uppercase tracking-wide text-slate-400", children: _jsx("span", { className: "rounded-full border border-slate-700/80 bg-slate-950/60 px-2 py-0.5", children: copy.faqItems.wipesLabel }) }), _jsxs("p", { className: "text-sm text-slate-300", children: [_jsx("b", { children: copy.faqItems.wipesStrong }), copy.faqItems.wipesAnswer] })] }) }), _jsxs("dl", { className: "mt-4 grid gap-2 text-[11px] text-slate-300 sm:grid-cols-3", children: [_jsxs("div", { className: "rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2", children: [_jsx("dt", { className: "text-slate-400", children: copy.faqItems.fullWipe }), _jsx("dd", { className: "font-medium text-slate-100", children: copy.faqItems.never })] }), _jsxs("div", { className: "rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2", children: [_jsx("dt", { className: "text-slate-400", children: copy.faqItems.currentSeason }), _jsx("dd", { className: "font-medium text-slate-100", children: copy.faqItems.partial })] }), _jsxs("div", { className: "rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2", children: [_jsx("dt", { className: "text-slate-400", children: copy.faqItems.bases }), _jsx("dd", { className: "font-medium text-slate-100", children: copy.faqItems.unaffected })] })] })] }) }) }), _jsx(motion.div, { variants: disableEntranceMotion ? undefined : faqItem, children: _jsx(Faq, { q: copy.faqItems.rules, icon: _jsx(SvgShield, { className: "size-5" }), a: _jsxs("div", { className: "relative overflow-hidden rounded-2xl border border-slate-800 bg-linear-to-br from-slate-950/80 via-slate-900/60 to-slate-900/20 backdrop-blur-md backdrop-saturate-150 px-4 py-4 sm:px-5 sm:py-5 group transition", children: [_jsx("div", { className: "pointer-events-none absolute -top-24 -left-16 h-40 w-40 rounded-full bg-rose-500/12 blur-3xl" }), _jsx("div", { className: "pointer-events-none absolute -bottom-24 -right-20 h-40 w-40 rounded-full bg-amber-400/10 blur-3xl" }), _jsx("div", { className: "absolute inset-x-0 top-0 h-px bg-linear-to-r from-emerald-500/40 via-sky-500/60 to-indigo-500/40 opacity-80" }), _jsxs("div", { className: "flex items-start gap-3", children: [_jsx("div", { className: "mt-0.5 size-9 shrink-0 grid place-items-center rounded-xl bg-emerald-600/20 text-emerald-300", children: _jsx("span", { className: "text-sm font-semibold", children: "!" }) }), _jsxs("div", { className: "space-y-1", children: [_jsx("div", { className: "inline-flex items-center gap-2 text-[11px] uppercase tracking-wide text-slate-400", children: _jsx("span", { className: "rounded-full border border-slate-700/80 bg-slate-950/60 px-2 py-0.5", children: copy.faqItems.rulesLabel }) }), _jsx("div", { className: "text-sm font-semibold text-slate-100", children: copy.faqItems.rulesTruth }), _jsxs("ul", { className: "mt-1 space-y-1 text-sm text-slate-300", children: [_jsx("li", { children: copy.faqItems.rule1 }), _jsx("li", { children: copy.faqItems.rule2 }), _jsx("li", { children: copy.faqItems.rule3 })] })] })] }), _jsxs("div", { className: "mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-400", children: [_jsx("span", { className: "rounded-full border border-slate-700/80 bg-slate-950/60 px-2 py-1", children: copy.faqItems.rulesDetails }), _jsx(Link, { to: RULES_URL, className: "inline-flex items-center gap-1 rounded-full border border-emerald-500/70 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-400 transition", children: copy.faqItems.rulesOpen })] })] }) }) })] })] })] })] }));
}
function Badge({ label, ok, reduceMotion }) {
    return (_jsxs("span", { className: [
            'inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs border',
            ok
                ? 'border-emerald-700/50 bg-emerald-500/10 text-emerald-300'
                : 'border-rose-700/50 bg-rose-500/10 text-rose-300',
        ].join(' '), children: [_jsx(motion.span, { className: "size-1.5 rounded-full", style: { backgroundColor: ok ? '#22c55e' : '#ef4444' }, "aria-hidden": true, animate: reduceMotion || !ok
                    ? { scale: 1, boxShadow: 'none' }
                    : {
                        scale: [1, 1.6, 1],
                        boxShadow: [
                            '0 0 0 0 rgba(34,197,94,0.6)',
                            '0 0 0 8px rgba(34,197,94,0)',
                            '0 0 0 0 rgba(34,197,94,0)',
                        ],
                    }, transition: reduceMotion ? undefined : { duration: 1.3, repeat: Infinity, repeatDelay: 0.7 } }), label] }));
}
function buildSmoothSvgPath(points) {
    if (!points.length)
        return '';
    if (points.length === 1)
        return `M ${points[0].x} ${points[0].y}`;
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i += 1) {
        const current = points[i];
        path += ` L ${current.x} ${current.y}`;
    }
    return path;
}
function OnlineTrendSection({ points, range, onRangeChange, current, peak, average, disableMotion, }) {
    const [hoverIndex, setHoverIndex] = useState(null);
    const gradientScopeId = useId().replace(/:/g, '');
    const areaGradientId = `online-area-gradient-${gradientScopeId}`;
    const lineShineGradientId = `online-line-shine-gradient-${gradientScopeId}`;
    const chart = useMemo(() => {
        const sorted = [...points].sort((a, b) => a.ts - b.ts);
        const safe = sorted.length ? sorted : [{ ts: Date.now(), online: 0, max: 0 }];
        const width = 960;
        const height = 280;
        const padX = 26;
        const padY = 18;
        const minTs = safe[0].ts;
        const maxTs = safe[safe.length - 1].ts;
        const tsSpan = Math.max(1, maxTs - minTs);
        const maxOnline = Math.max(10, ...safe.map((p) => p.online), ...safe.map((p) => p.max));
        const toX = (ts) => padX + ((ts - minTs) / tsSpan) * (width - padX * 2);
        const toY = (value) => height - padY - (value / maxOnline) * (height - padY * 2);
        const linePoints = safe.map((p) => ({ x: toX(p.ts), y: toY(p.online), ts: p.ts, online: p.online }));
        const linePath = buildSmoothSvgPath(linePoints);
        const first = linePoints[0];
        const last = linePoints[linePoints.length - 1];
        const areaPath = `${linePath} L ${last.x} ${height - padY} L ${first.x} ${height - padY} Z`;
        const tickValues = [0, 0.25, 0.5, 0.75, 1].map((ratio) => Math.round(maxOnline * ratio));
        const formatTs = (ts) => range === '24h'
            ? new Date(ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
            : new Date(ts).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
        const midTs = minTs + tsSpan / 2;
        return {
            width,
            height,
            padX,
            padY,
            linePath,
            areaPath,
            linePoints,
            tickValues,
            maxOnline,
            labels: {
                start: formatTs(minTs),
                mid: formatTs(midTs),
                end: formatTs(maxTs),
            },
        };
    }, [points, range]);
    useEffect(() => {
        setHoverIndex(null);
    }, [range, chart.linePoints.length]);
    const hoveredPoint = hoverIndex == null || chart.linePoints.length === 0
        ? null
        : chart.linePoints[Math.min(Math.max(hoverIndex, 0), chart.linePoints.length - 1)];
    const hoveredMeta = useMemo(() => {
        if (!hoveredPoint)
            return null;
        const tooltipWidth = 168;
        const tooltipHeight = 48;
        const x = Math.min(chart.width - chart.padX - tooltipWidth, Math.max(chart.padX, hoveredPoint.x - tooltipWidth / 2));
        const y = Math.max(chart.padY, hoveredPoint.y - tooltipHeight - 10);
        const timeText = range === '24h'
            ? new Date(hoveredPoint.ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
            : new Date(hoveredPoint.ts).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
        return {
            x,
            y,
            timeText,
            valueText: `\u041e\u043d\u043b\u0430\u0439\u043d: ${hoveredPoint.online}`,
        };
    }, [chart.padX, chart.padY, chart.width, hoveredPoint, range]);
    function handlePointerMove(e) {
        if (!chart.linePoints.length)
            return;
        const svg = e.currentTarget;
        const ctm = svg.getScreenCTM();
        if (!ctm)
            return;
        const point = svg.createSVGPoint();
        point.x = e.clientX;
        point.y = e.clientY;
        const local = point.matrixTransform(ctm.inverse());
        const localX = Math.min(chart.width, Math.max(0, local.x));
        let bestIndex = 0;
        let bestDistance = Number.POSITIVE_INFINITY;
        for (let i = 0; i < chart.linePoints.length; i += 1) {
            const d = Math.abs(chart.linePoints[i].x - localX);
            if (d < bestDistance) {
                bestDistance = d;
                bestIndex = i;
            }
        }
        setHoverIndex(bestIndex);
    }
    const rangeTitle = range === '24h'
        ? '\u0437\u0430 24 \u0447\u0430\u0441\u0430'
        : range === '7d'
            ? '\u0437\u0430 7 \u0434\u043d\u0435\u0439'
            : '\u0437\u0430 30 \u0434\u043d\u0435\u0439';
    const rangeTabs = [
        { value: '24h', label: '24\u0447' },
        { value: '7d', label: '7\u0434' },
        { value: '30d', label: '30\u0434' },
    ];
    const rangePillLayoutId = `online-range-pill-${gradientScopeId}`;
    return (_jsxs("div", { className: "rounded-2xl border border-slate-800 bg-linear-to-b from-slate-900/70 to-slate-900/20 p-5 backdrop-blur-md backdrop-saturate-150", children: [_jsxs("div", { className: "mb-4 flex flex-wrap items-center justify-between gap-3", children: [_jsxs("div", { className: "text-sm font-medium text-slate-200 font-arcane uppercase", children: ['\u0414\u0438\u043d\u0430\u043c\u0438\u043a\u0430', " ", rangeTitle] }), _jsx("div", { className: "inline-flex rounded-xl border border-slate-700 bg-slate-950/60 p-1", children: rangeTabs.map((tab) => {
                            const active = range === tab.value;
                            return (_jsxs("button", { type: "button", onClick: () => onRangeChange(tab.value), className: "relative rounded-lg px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-slate-800", children: [active && (_jsx(motion.span, { layoutId: rangePillLayoutId, transition: disableMotion
                                            ? { duration: 0 }
                                            : { type: 'spring', stiffness: 420, damping: 34, mass: 0.85 }, className: "absolute inset-0 rounded-lg bg-indigo-600 shadow-[0_6px_18px_rgba(99,102,241,0.4)]" })), _jsx("span", { className: `relative z-10 ${active ? 'text-white' : 'text-slate-300'}`, children: tab.label })] }, tab.value));
                        }) })] }), _jsxs("div", { className: "mb-4 grid w-full grid-cols-3 gap-2 sm:gap-3", children: [_jsx(MetricCard, { label: "\u0421\u0435\u0439\u0447\u0430\u0441", value: current, accent: "text-emerald-300" }), _jsx(MetricCard, { label: "\u041F\u0438\u043A", value: peak, accent: "text-sky-300" }), _jsx(MetricCard, { label: "\u0421\u0440\u0435\u0434\u043D\u0438\u0439", value: average, accent: "text-indigo-300" })] }), _jsx("div", { className: "rounded-xl border border-slate-800 bg-slate-950/60 p-2 sm:p-3", children: _jsx("div", { className: "-mx-1 overflow-x-auto px-1", children: _jsxs("svg", { viewBox: `0 0 ${chart.width} ${chart.height}`, className: "h-72 w-[720px] min-w-[720px] sm:h-64 sm:w-full sm:min-w-0", role: "img", "aria-label": "\u0413\u0440\u0430\u0444\u0438\u043A \u043E\u043D\u043B\u0430\u0439\u043D\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430", onPointerMove: handlePointerMove, onPointerDown: handlePointerMove, onPointerLeave: () => setHoverIndex(null), children: [_jsxs("defs", { children: [_jsxs("linearGradient", { id: areaGradientId, x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "0%", stopColor: "#6366f1", stopOpacity: "0.35" }), _jsx("stop", { offset: "100%", stopColor: "#6366f1", stopOpacity: "0.02" })] }), !disableMotion && (_jsxs("linearGradient", { id: lineShineGradientId, gradientUnits: "userSpaceOnUse", x1: -chart.width, y1: 0, x2: 0, y2: 0, children: [_jsx("stop", { offset: "0%", stopColor: "#ffffff", stopOpacity: "0" }), _jsx("stop", { offset: "44%", stopColor: "#ffffff", stopOpacity: "0" }), _jsx("stop", { offset: "50%", stopColor: "#e0e7ff", stopOpacity: "0.95" }), _jsx("stop", { offset: "56%", stopColor: "#ffffff", stopOpacity: "0" }), _jsx("stop", { offset: "100%", stopColor: "#ffffff", stopOpacity: "0" }), _jsx("animate", { attributeName: "x1", from: -chart.width, to: chart.width, dur: "3.4s", repeatCount: "indefinite" }), _jsx("animate", { attributeName: "x2", from: 0, to: chart.width * 2, dur: "3.4s", repeatCount: "indefinite" })] }))] }), chart.tickValues.map((tick) => {
                                const y = chart.height - chart.padY - (tick / chart.maxOnline) * (chart.height - chart.padY * 2);
                                return (_jsxs("g", { children: [_jsx("line", { x1: chart.padX, y1: y, x2: chart.width - chart.padX, y2: y, stroke: "rgba(148,163,184,0.16)", strokeWidth: "1" }), _jsx("text", { x: chart.padX - 8, y: y + 4, textAnchor: "end", fill: "rgba(148,163,184,0.8)", fontSize: "11", children: tick })] }, `tick-${tick}`));
                            }), _jsx("path", { d: chart.areaPath, fill: `url(#${areaGradientId})` }), _jsx("path", { d: chart.linePath, fill: "none", stroke: "#818cf8", strokeWidth: "3", strokeLinecap: "butt", strokeLinejoin: "miter", style: disableMotion ? undefined : { filter: 'drop-shadow(0 0 6px rgba(129,140,248,0.45))' } }), !disableMotion && (_jsx("path", { d: chart.linePath, fill: "none", stroke: `url(#${lineShineGradientId})`, strokeWidth: "4.5", strokeLinecap: "butt", strokeLinejoin: "miter", pointerEvents: "none", style: { filter: 'drop-shadow(0 0 12px rgba(199,210,254,0.55))' } })), hoveredPoint && (_jsx("g", { pointerEvents: "none", children: _jsx("line", { x1: hoveredPoint.x, y1: chart.padY, x2: hoveredPoint.x, y2: chart.height - chart.padY, stroke: "rgba(129,140,248,0.45)", strokeWidth: "1.2", strokeDasharray: "4 4" }) })), chart.linePoints.length > 0 && !hoveredPoint && (_jsx("circle", { cx: chart.linePoints[chart.linePoints.length - 1].x, cy: chart.linePoints[chart.linePoints.length - 1].y, r: "5", fill: "#a5b4fc" })), hoveredPoint && hoveredMeta && (_jsxs("g", { pointerEvents: "none", children: [_jsx("circle", { cx: hoveredPoint.x, cy: hoveredPoint.y, r: "5.5", fill: "#a5b4fc" }), _jsxs("g", { transform: `translate(${hoveredMeta.x}, ${hoveredMeta.y})`, children: [_jsx("rect", { width: "168", height: "48", rx: "8", fill: "rgba(2,6,23,0.94)", stroke: "rgba(99,102,241,0.55)" }), _jsx("text", { x: "10", y: "18", fill: "rgba(226,232,240,0.95)", fontSize: "11", fontWeight: "600", children: hoveredMeta.timeText }), _jsx("text", { x: "10", y: "34", fill: "rgba(148,163,184,0.95)", fontSize: "11", children: hoveredMeta.valueText })] })] })), _jsx("text", { x: chart.padX, y: chart.height - 2, fill: "rgba(148,163,184,0.75)", fontSize: "11", children: chart.labels.start }), _jsx("text", { x: chart.width / 2, y: chart.height - 2, textAnchor: "middle", fill: "rgba(148,163,184,0.75)", fontSize: "11", children: chart.labels.mid }), _jsx("text", { x: chart.width - chart.padX, y: chart.height - 2, textAnchor: "end", fill: "rgba(148,163,184,0.75)", fontSize: "11", children: chart.labels.end })] }) }) })] }));
}
function TopPlayersSection({ players, avatars, loading, range, 
// onRangeChange,
disableMotion, }) {
    const { language } = useI18n();
    const rangeLabel = range === 'all' ? (language === 'ru' ? 'всё время' : 'all time') : range === '7d' ? '7d' : '30d';
    const leadersPrefix = language === 'ru' ? 'Лидеры по игровому времени за' : 'Playtime leaders for';
    /* Range tabs are temporarily hidden while the leaderboard is fixed to `all`.
    const rangeTabs: Array<{ value: LeaderboardRange; label: string }> = [
      { value: '7d', label: '7\u0434' },
      { value: '30d', label: '30\u0434' },
      { value: 'all', label: '\u0432\u0441\u0451' },
    ]
    const rangePillLayoutId = `leaderboard-range-pill-${useId().replace(/:/g, '')}`
    */
    if (loading) {
        return (_jsxs("div", { className: "rounded-2xl border border-slate-800 bg-linear-to-b from-slate-900/70 to-slate-900/20 p-5 backdrop-blur-md backdrop-saturate-150", children: [_jsx("div", { className: "mb-4 flex items-center justify-between gap-2", children: _jsxs("div", { className: "text-sm text-slate-300 font-arcane uppercase", children: [leadersPrefix, " ", rangeLabel] }) }), _jsx("div", { className: "space-y-2", children: [0, 1, 2].map((idx) => (_jsx("div", { className: "h-16 animate-pulse rounded-xl border border-slate-800 bg-slate-900/60" }, idx))) })] }));
    }
    return (_jsxs("div", { className: "rounded-2xl border border-slate-800 bg-linear-to-b from-slate-900/70 to-slate-900/20 p-5 backdrop-blur-md backdrop-saturate-150", children: [_jsx("div", { className: "mb-4 flex items-center justify-between gap-2", children: _jsxs("div", { className: "text-sm text-slate-300 font-arcane uppercase", children: [leadersPrefix, " ", rangeLabel] }) }), players.length === 0 ? (_jsx("div", { className: "rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-5 text-sm text-slate-400", children: language === 'ru' ? 'Пока нет данных для рейтинга.' : 'No leaderboard data yet.' })) : (_jsx("div", { className: "space-y-2", children: players.map((player, index) => {
                    const isKing = index === 0;
                    const isSilver = index === 1;
                    const isBronze = index === 2;
                    const isTopThree = index < 3;
                    const avatar = avatars[player.username];
                    const hours = player.totalHours >= 10 ? Math.round(player.totalHours).toString() : player.totalHours.toFixed(1);
                    const cardTone = isKing
                        ? 'border-amber-300/70 bg-linear-to-r from-amber-500/20 via-slate-900/84 to-slate-900/92 shadow-[0_0_22px_rgba(251,191,36,0.5)]'
                        : isSilver
                            ? 'border-slate-200/65 bg-linear-to-r from-slate-200/14 via-slate-900/88 to-slate-900/92 shadow-[0_0_20px_rgba(226,232,240,0.38)]'
                            : isBronze
                                ? 'border-orange-300/65 bg-linear-to-r from-orange-500/16 via-slate-900/88 to-slate-900/92 shadow-[0_0_20px_rgba(251,146,60,0.35)]'
                                : 'border-slate-800 bg-slate-950/60';
                    const rankTextTone = isKing
                        ? 'text-amber-200'
                        : isSilver
                            ? 'text-slate-200'
                            : isBronze
                                ? 'text-orange-200'
                                : 'text-slate-400';
                    const nameTone = isKing
                        ? 'text-amber-100'
                        : isSilver
                            ? 'text-slate-100'
                            : isBronze
                                ? 'text-orange-100'
                                : 'text-slate-100';
                    const hoursTone = isKing
                        ? 'text-amber-200'
                        : isSilver
                            ? 'text-slate-200'
                            : isBronze
                                ? 'text-orange-300'
                                : 'text-sky-300';
                    const avatarTone = isKing
                        ? 'border-amber-300/70 ring-2 ring-amber-300/40'
                        : isSilver
                            ? 'border-slate-300/65 ring-2 ring-slate-300/30'
                            : isBronze
                                ? 'border-orange-300/70 ring-2 ring-orange-300/30'
                                : 'border-slate-700';
                    const glowShadowMin = isKing
                        ? '0 0 0 1px rgba(251,191,36,0.54), 0 0 20px rgba(251,191,36,0.42), inset 0 0 11px rgba(251,191,36,0.18)'
                        : isSilver
                            ? '0 0 0 1px rgba(226,232,240,0.45), 0 0 18px rgba(226,232,240,0.32), inset 0 0 9px rgba(226,232,240,0.16)'
                            : '0 0 0 1px rgba(251,146,60,0.44), 0 0 18px rgba(251,146,60,0.3), inset 0 0 9px rgba(251,146,60,0.15)';
                    const glowShadowMax = isKing
                        ? '0 0 0 1px rgba(251,191,36,0.76), 0 0 30px rgba(251,191,36,0.68), inset 0 0 16px rgba(251,191,36,0.26)'
                        : isSilver
                            ? '0 0 0 1px rgba(226,232,240,0.68), 0 0 26px rgba(226,232,240,0.5), inset 0 0 14px rgba(226,232,240,0.24)'
                            : '0 0 0 1px rgba(251,146,60,0.68), 0 0 26px rgba(251,146,60,0.48), inset 0 0 14px rgba(251,146,60,0.22)';
                    const glowOrbTone = isKing ? 'bg-amber-200/42' : isSilver ? 'bg-slate-100/38' : 'bg-orange-200/40';
                    return (_jsxs(motion.div, { whileHover: disableMotion ? undefined : { y: -2, scale: 1.005 }, className: [
                            'relative overflow-hidden rounded-xl border px-3 py-2.5',
                            cardTone,
                        ].join(' '), children: [isTopThree && !disableMotion && (_jsxs(_Fragment, { children: [_jsx(motion.div, { className: "pointer-events-none absolute inset-0 rounded-xl mix-blend-screen", animate: {
                                            boxShadow: [glowShadowMin, glowShadowMax, glowShadowMin],
                                            opacity: [0.48, 0.86, 0.48],
                                        }, transition: { duration: 2.8 + index * 0.35, repeat: Infinity, ease: 'easeInOut' } }), _jsx(motion.div, { className: `pointer-events-none absolute -top-10 left-0 h-28 w-28 rounded-full blur-3xl mix-blend-screen ${glowOrbTone}`, animate: {
                                            x: ['-30%', '320%', '0%'],
                                            y: [0, 8, 0],
                                            opacity: [0.28, 0.72, 0.28],
                                        }, transition: { duration: 4.1 + index * 0.45, repeat: Infinity, ease: 'easeInOut' } })] })), _jsxs("div", { className: "relative z-10 flex items-center gap-3", children: [_jsxs("div", { className: [
                                            'relative size-11 shrink-0 overflow-hidden rounded-xl border bg-slate-900',
                                            avatarTone,
                                        ].join(' '), children: [avatar ? (_jsx("img", { src: avatar, alt: player.username, className: "h-full w-full object-cover", loading: "lazy", decoding: "async" })) : (_jsx("div", { className: "grid h-full w-full place-items-center text-sm font-semibold text-slate-300", children: player.username[0]?.toUpperCase() ?? '?' })), isKing && (_jsx("div", { className: "absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full border border-amber-300/70 bg-amber-400/90 text-slate-950 shadow-[0_0_12px_rgba(251,191,36,0.65)]", children: _jsx(SvgCrown, { className: "h-3 w-3" }) }))] }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("span", { className: `text-xs font-semibold ${rankTextTone}`, children: ["#", player.rank] }), _jsx("span", { className: `truncate text-sm font-semibold ${nameTone}`, children: player.username })] }), _jsxs("div", { className: "text-[11px] text-slate-400", children: [player.activeDays, " ", language === 'ru' ? 'дн. активности ·' : 'active days ·', " ", player.sessions, " ", language === 'ru' ? 'сессий' : 'sessions'] })] }), _jsxs("div", { className: "text-right", children: [_jsxs("div", { className: `text-lg font-semibold leading-none ${hoursTone}`, children: [hours, language === 'ru' ? 'ч' : 'h'] }), _jsx("div", { className: "mt-1 text-[11px] text-slate-400", children: language === 'ru' ? 'наиграно' : 'played' })] })] })] }, player.username));
                }) }))] }));
}
function MetricCard({ label, value, accent }) {
    return (_jsxs("div", { className: "grid aspect-square place-content-center gap-1 rounded-xl border border-slate-800 bg-slate-950/50 p-1 text-center sm:aspect-auto sm:px-3 sm:py-2 sm:text-left sm:place-content-start", children: [_jsx("div", { className: "text-xs leading-none text-slate-300 sm:text-[11px]", children: label }), _jsx("div", { className: `text-xl leading-none font-semibold sm:text-xl ${accent}`, children: value })] }));
}
const SHINE_EVERY = 4.5;
const SHINE_DURATION = 0.85;
function CardCTA({ title, text, href, button, reduceMotion, }) {
    const initialDelay = useMemo(() => Math.random() * SHINE_EVERY, []);
    return (_jsxs(motion.div, { whileHover: { y: -4, scale: 1.01 }, className: "relative rounded-2xl border border-slate-800 p-5 bg-linear-to-b from-slate-900/60 to-slate-900/20 backdrop-blur-md backdrop-saturate-150 overflow-hidden", children: [!reduceMotion && (_jsx(motion.span, { "aria-hidden": true, className: "pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-linear-to-r from-transparent via-white/10 to-transparent", initial: { x: '-40%', opacity: 0 }, animate: { x: ['-40%', '160%'], opacity: [0, 1, 0] }, transition: {
                    duration: SHINE_DURATION,
                    ease: 'easeOut',
                    delay: initialDelay,
                    repeat: Infinity,
                    repeatType: 'loop',
                    repeatDelay: SHINE_EVERY
                }, style: { willChange: 'transform, opacity' } })), _jsx("div", { className: "font-medium text-lg", children: title }), _jsx("div", { className: "text-sm text-slate-300 mt-1 mb-4", children: text }), _jsx("a", { href: href, className: "inline-flex rounded-xl px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-sm", children: button })] }));
}
function StepsGuide({ disableMotion }) {
    const { language } = useI18n();
    const copy = homeTranslations[language].steps;
    const spring = { type: 'spring', stiffness: 380, damping: 26, mass: 0.6 };
    const container = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.06 } }
    };
    const item = {
        hidden: { opacity: 0, y: 14, scale: 0.98, filter: 'blur(6px)' },
        show: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', transition: spring }
    };
    return (_jsxs(motion.div, { className: "grid gap-4 md:grid-cols-3", variants: disableMotion ? undefined : container, initial: disableMotion ? undefined : 'hidden', whileInView: disableMotion ? undefined : 'show', viewport: disableMotion ? undefined : { once: true, margin: '-10% 0px' }, children: [_jsxs(motion.div, { variants: disableMotion ? undefined : item, whileHover: { y: -6, scale: 1.01 }, whileTap: { scale: 0.99 }, className: "relative rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden will-change-transform", children: [_jsx(motion.span, { "aria-hidden": true, className: "absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-indigo-500 via-sky-500 to-emerald-500 origin-left", initial: disableMotion ? undefined : { scaleX: 0 }, animate: disableMotion ? undefined : { scaleX: 1 }, transition: disableMotion ? undefined : { duration: 0.5 } }), _jsxs("div", { className: "p-5", children: [_jsx("div", { className: "size-10 rounded-xl bg-sky-600/20 grid place-items-center text-sky-300 mb-3", children: _jsx(SvgUserPlus, { className: "h-5" }) }), _jsx("div", { className: "text-lg font-semibold mb-2", children: copy.register }), _jsxs("div", { className: "min-h-[112px] rounded-xl border border-slate-800 bg-slate-900/60 p-4", children: [_jsx(Link, { to: "/auth/login", className: "inline-flex rounded-xl px-4 py-2 bg-indigo-600 hover:bg-indigo-500", children: copy.registerAction }), _jsx("div", { className: "text-xs text-slate-400 mt-3", children: copy.registerHint })] })] })] }), _jsxs(motion.div, { variants: disableMotion ? undefined : item, whileHover: { y: -6, scale: 1.01 }, whileTap: { scale: 0.99 }, className: "relative rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden will-change-transform", children: [_jsx(motion.span, { "aria-hidden": true, className: "absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-indigo-500 via-sky-500 to-emerald-500 origin-left", initial: disableMotion ? undefined : { scaleX: 0 }, animate: disableMotion ? undefined : { scaleX: 1 }, transition: disableMotion ? undefined : { duration: 0.6, delay: 0.05 } }), _jsxs("div", { className: "p-5", children: [_jsx("div", { className: "size-10 rounded-xl bg-indigo-600/20 grid place-items-center text-indigo-300 mb-3", children: _jsx(SvgLauncher, { className: "h-5" }) }), _jsx("div", { className: "text-lg font-semibold mb-2", children: copy.launcher }), _jsxs("div", { className: "min-h-[112px] rounded-xl border border-slate-800 bg-slate-900/60 p-4", children: [_jsx("a", { href: LAUNCHER_DOWNLOAD_URL, className: "inline-flex rounded-xl px-4 py-2 bg-indigo-600 hover:bg-indigo-500", children: copy.launcherAction }), _jsx("div", { className: "text-xs text-slate-400 mt-3", children: copy.launcherHint })] })] })] }), _jsxs(motion.div, { variants: disableMotion ? undefined : item, whileHover: { y: -6, scale: 1.01 }, whileTap: { scale: 0.99 }, className: "relative rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden will-change-transform", children: [_jsx(motion.span, { "aria-hidden": true, className: "absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-indigo-500 via-sky-500 to-emerald-500 origin-left", initial: disableMotion ? undefined : { scaleX: 0 }, animate: disableMotion ? undefined : { scaleX: 1 }, transition: disableMotion ? undefined : { duration: 0.6, delay: 0.1 } }), _jsxs("div", { className: "p-5", children: [_jsx("div", { className: "size-10 rounded-xl bg-teal-600/20 grid place-items-center text-teal-300 mb-3", children: _jsx(SvgMcBlockGrass, { className: "h-5" }) }), _jsx("div", { className: "text-lg font-semibold mb-2", children: copy.join }), _jsx("div", { className: "min-h-[112px] rounded-xl border border-slate-800 bg-slate-900/60 p-4", children: _jsx("div", { className: "rounded-xl border border-teal-500/30 bg-teal-500/10 px-4 py-3 text-center text-sm text-teal-100", children: copy.joinHint }) })] })] })] }));
}
function FaqInfoCard({ label, children }) {
    return (_jsxs("div", { className: "relative overflow-hidden rounded-2xl border border-slate-800 bg-linear-to-br from-slate-950/80 via-slate-900/60 to-slate-900/20 px-4 py-4 sm:px-5 sm:py-5", children: [_jsx("div", { className: "pointer-events-none absolute -right-16 -top-20 h-40 w-40 rounded-full bg-sky-500/10 blur-3xl" }), _jsx("div", { className: "pointer-events-none absolute -bottom-24 -left-20 h-40 w-40 rounded-full bg-indigo-500/10 blur-3xl" }), _jsx("div", { className: "absolute inset-x-0 top-0 h-px bg-linear-to-r from-indigo-500/40 via-sky-500/60 to-emerald-500/40" }), _jsxs("div", { className: "relative", children: [_jsx("div", { className: "mb-2 inline-flex rounded-full border border-slate-700/80 bg-slate-950/60 px-2 py-0.5 text-[11px] uppercase tracking-wide text-slate-400", children: label }), _jsx("div", { className: "text-sm text-slate-300", children: children })] })] }));
}
function Faq({ q, a, icon }) {
    const [open, setOpen] = useState(false);
    return (_jsxs("div", { className: "rounded-2xl border border-slate-800 overflow-hidden backdrop-blur-md backdrop-saturate-150", children: [_jsxs("button", { onClick: () => setOpen(v => !v), className: "w-full text-left px-4 py-3 bg-slate-900/50 hover:bg-slate-900/70 flex items-center justify-between", children: [_jsxs("span", { className: "flex items-center gap-3 font-medium", children: [icon && _jsx("span", { className: "shrink-0 text-sky-300", "aria-hidden": "true", children: icon }), _jsx("span", { children: q })] }), _jsx(motion.span, { className: "text-slate-400 inline-block", animate: { rotate: open ? 180 : 0 }, transition: { type: 'spring', stiffness: 400, damping: 24 }, children: _jsx(SvgChevronDown, { className: "size-5" }) })] }), _jsx(AnimatePresence, { initial: false, children: open && (_jsx(motion.div, { initial: { height: 0, opacity: 0, filter: 'blur(6px)' }, animate: { height: 'auto', opacity: 1, filter: 'blur(0px)' }, exit: { height: 0, opacity: 0, filter: 'blur(6px)' }, transition: { duration: 0.3, ease: 'easeInOut' }, className: "overflow-hidden", children: _jsx("div", { className: "px-4 py-3 text-sm text-slate-300", children: a }) }, "faq-content")) })] }));
}
