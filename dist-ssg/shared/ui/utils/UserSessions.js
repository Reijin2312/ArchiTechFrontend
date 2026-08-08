import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
export function UserSessions({ username }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [nowTs, setNowTs] = useState(() => Date.now());
    const hasActiveSession = data?.sessions?.some((session) => session.isActive) ?? false;
    useEffect(() => {
        let mounted = true;
        async function fetchSessions() {
            try {
                setLoading(true);
                const apiBase = import.meta?.env?.VITE_API_BASE || window.location.origin;
                const baseUrl = apiBase.replace(/\/$/, '');
                const response = await fetch(`${baseUrl}/api/v1/users/${encodeURIComponent(username)}/sessions`);
                if (!response.ok) {
                    throw new Error('Failed to fetch sessions');
                }
                const json = await response.json();
                if (mounted) {
                    setData(json);
                    setError(null);
                }
            }
            catch (err) {
                if (mounted) {
                    setError(err instanceof Error ? err.message : 'Unknown error');
                }
            }
            finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        }
        fetchSessions();
        return () => {
            mounted = false;
        };
    }, [username]);
    useEffect(() => {
        if (!hasActiveSession)
            return;
        setNowTs(Date.now());
        const id = setInterval(() => setNowTs(Date.now()), 30000);
        return () => clearInterval(id);
    }, [hasActiveSession]);
    if (loading) {
        return (_jsx("div", { className: "rounded-xl border border-slate-800 bg-slate-900/40 p-6", children: _jsxs("div", { className: "animate-pulse space-y-3", children: [_jsx("div", { className: "h-4 bg-slate-700 rounded w-1/3" }), _jsx("div", { className: "h-8 bg-slate-700 rounded" })] }) }));
    }
    if (error || !data) {
        return (_jsx("div", { className: "rounded-xl border border-slate-800 bg-slate-900/40 p-6", children: _jsx("p", { className: "text-slate-400 text-sm", children: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0441\u0435\u0441\u0441\u0438\u0438" }) }));
    }
    const formatDate = (isoString) => {
        const date = new Date(isoString);
        return new Intl.DateTimeFormat('ru-RU', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    };
    const formatDuration = (minutes) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0) {
            return `${hours}ч ${mins}м`;
        }
        return `${mins}м`;
    };
    const getActiveMinutes = (startedAt) => {
        const started = Date.parse(startedAt);
        if (Number.isNaN(started))
            return null;
        const minutes = Math.floor((nowTs - started) / 60000);
        return Math.max(0, minutes);
    };
    const getRelativeTime = (isoString) => {
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        if (diffMins < 60)
            return `${diffMins} мин. назад`;
        if (diffHours < 24)
            return `${diffHours} ч. назад`;
        if (diffDays < 7)
            return `${diffDays} дн. назад`;
        return formatDate(isoString);
    };
    return (_jsxs("div", { className: "rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden", children: [_jsx("div", { className: "px-6 py-4 border-b border-slate-800", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h3", { className: "text-lg font-semibold text-slate-100", children: "\u0418\u0433\u0440\u043E\u0432\u044B\u0435 \u0441\u0435\u0441\u0441\u0438\u0438" }), data.isOnline && (_jsxs("span", { className: "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs border border-emerald-700/50 bg-emerald-500/10 text-emerald-300", children: [_jsx(motion.span, { className: "size-1.5 rounded-full bg-emerald-400", animate: {
                                        scale: [1, 1.6, 1],
                                        boxShadow: [
                                            '0 0 0 0 rgba(34,197,94,0.6)',
                                            '0 0 0 8px rgba(34,197,94,0)',
                                            '0 0 0 0 rgba(34,197,94,0)',
                                        ],
                                    }, transition: { duration: 1.3, repeat: Infinity, repeatDelay: 0.7 } }), "\u041E\u043D\u043B\u0430\u0439\u043D"] }))] }) }), data.stats && (_jsxs("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4 px-6 py-4 bg-slate-950/40", children: [_jsxs("div", { children: [_jsx("div", { className: "text-xs text-slate-400 mb-1", children: "\u0412\u0441\u0435\u0433\u043E \u0441\u0435\u0441\u0441\u0438\u0439" }), _jsx("div", { className: "text-xl font-semibold text-slate-100", children: data.stats.totalSessions })] }), _jsxs("div", { children: [_jsx("div", { className: "text-xs text-slate-400 mb-1", children: "\u041D\u0430\u0438\u0433\u0440\u0430\u043D\u043E" }), _jsxs("div", { className: "text-xl font-semibold text-slate-100", children: [data.stats.totalHours.toFixed(1), "\u0447"] })] }), _jsxs("div", { children: [_jsx("div", { className: "text-xs text-slate-400 mb-1", children: "\u0421\u0440\u0435\u0434\u043D\u044F\u044F \u0441\u0435\u0441\u0441\u0438\u044F" }), _jsx("div", { className: "text-xl font-semibold text-slate-100", children: formatDuration(data.stats.averageMinutes) })] }), _jsxs("div", { children: [_jsx("div", { className: "text-xs text-slate-400 mb-1", children: "\u041F\u043E\u0441\u043B\u0435\u0434\u043D\u044F\u044F \u0438\u0433\u0440\u0430" }), _jsx("div", { className: "text-sm font-medium text-slate-200", children: data.stats.lastPlayed ? getRelativeTime(data.stats.lastPlayed) : '—' })] })] })), _jsx("div", { className: "px-6 py-4", children: data.sessions.length === 0 ? (_jsx("p", { className: "text-slate-400 text-sm text-center py-8", children: "\u0421\u0435\u0441\u0441\u0438\u0439 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442" })) : (_jsxs("div", { className: "space-y-2", children: [_jsx("div", { className: "text-xs text-slate-400 mb-3", children: "\u041F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0435 \u0441\u0435\u0441\u0441\u0438\u0438" }), data.sessions.map((session) => {
                            const activeMinutes = session.isActive ? getActiveMinutes(session.startedAt) : null;
                            const durationMinutes = session.durationMinutes ?? activeMinutes;
                            return (_jsxs(motion.div, { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, className: "flex items-center justify-between py-3 px-4 rounded-lg border border-slate-800 bg-slate-950/40 hover:bg-slate-900/60 transition-colors", children: [_jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-sm text-slate-200 font-medium", children: formatDate(session.startedAt) }), session.isActive && (_jsx("span", { className: "text-xs text-emerald-400 font-medium", children: "\u0421\u0435\u0439\u0447\u0430\u0441 \u0432 \u0438\u0433\u0440\u0435" }))] }), _jsx("div", { className: "text-xs text-slate-400 mt-0.5", children: session.endedAt
                                                    ? `до ${formatDate(session.endedAt)}`
                                                    : 'Идет до сих пор' })] }), _jsx("div", { className: "text-right", children: _jsx("div", { className: "text-sm font-medium text-slate-100", children: durationMinutes != null
                                                ? formatDuration(durationMinutes)
                                                : '-' }) })] }, session.sessionId));
                        })] })) })] }));
}
