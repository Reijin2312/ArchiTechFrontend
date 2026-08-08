import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card } from './components.js';
function fmt(x) {
    if (!x)
        return '—';
    try {
        return new Date(x).toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    catch {
        return x;
    }
}
function parseDeviceName(ua) {
    if (!ua)
        return 'Неизвестное устройство';
    if (ua.includes('Windows NT 10'))
        return 'Windows 10/11';
    if (ua.includes('Windows'))
        return 'Windows';
    if (ua.includes('Mac OS X'))
        return 'macOS';
    if (ua.includes('Linux'))
        return 'Linux';
    if (ua.includes('Android'))
        return 'Android';
    if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad'))
        return 'iOS';
    return 'Неизвестное устройство';
}
function parseBrowser(ua) {
    if (!ua)
        return '';
    if (ua.includes('Edg/'))
        return 'Edge';
    if (ua.includes('Chrome/'))
        return 'Chrome';
    if (ua.includes('Firefox/'))
        return 'Firefox';
    if (ua.includes('Safari/') && !ua.includes('Chrome'))
        return 'Safari';
    if (ua.includes('Opera') || ua.includes('OPR/'))
        return 'Opera';
    return '';
}
function getDeviceIcon(ua) {
    if (!ua)
        return '🖥️';
    if (ua.includes('Windows'))
        return '🪟';
    if (ua.includes('Mac'))
        return '🍎';
    if (ua.includes('Linux'))
        return '🐧';
    if (ua.includes('Android'))
        return '📱';
    if (ua.includes('iPhone') || ua.includes('iPad'))
        return '📱';
    return '🖥️';
}
function badgeClass(status) {
    switch (status) {
        case 'active':
            return 'rounded-md border border-green-800 px-2 py-0.5 text-green-400';
        case 'expired':
            return 'rounded-md border border-slate-700 px-2 py-0.5 text-slate-400';
        case 'replaced':
            return 'rounded-md border border-amber-800 px-2 py-0.5 text-amber-300';
        case 'revoked':
            return 'rounded-md border border-red-800 px-2 py-0.5 text-red-300';
        default:
            return 'rounded-md border border-slate-700 px-2 py-0.5 text-slate-400';
    }
}
export function SessionsSection({ visibleSessions, show, setShow, from, setFrom, to, setTo, sortBy, setSortBy, busy, onRevoke, onRefresh, sessionStatus, }) {
    return (_jsxs(Card, { className: "mt-6", children: [_jsx("h2", { className: "mb-3 text-sm font-semibold text-sky-300", children: "\u0421\u0435\u0441\u0441\u0438\u0438" }), _jsxs("div", { className: "mb-3 flex flex-wrap gap-2 text-xs", children: [['active', 'expired', 'replaced', 'revoked'].map((k) => (_jsx("button", { type: "button", onClick: () => setShow({ ...show, [k]: !show[k] }), className: `rounded-lg border px-2.5 py-1 ${show[k] ? 'border-sky-700 text-sky-300' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`, title: k, children: k }, k))), _jsx("button", { type: "button", onClick: () => setShow({ active: true, expired: true, replaced: true, revoked: true }), className: "rounded-lg border border-slate-700 px-2.5 py-1 text-slate-300 hover:border-slate-500", children: "\u0432\u0441\u0435" }), _jsx("button", { type: "button", onClick: () => setShow({ active: true, expired: false, replaced: false, revoked: false }), className: "rounded-lg border border-slate-700 px-2.5 py-1 text-slate-300 hover:border-slate-500", children: "\u0442\u043E\u043B\u044C\u043A\u043E active" })] }), _jsxs("div", { className: "mb-3 flex flex-wrap items-center gap-2 text-xs", children: [_jsx("input", { type: "datetime-local", value: from, onChange: (e) => setFrom(e.target.value), className: "rounded-lg border border-slate-800 bg-slate-900 px-2 py-1" }), _jsx("input", { type: "datetime-local", value: to, onChange: (e) => setTo(e.target.value), className: "rounded-lg border border-slate-800 bg-slate-900 px-2 py-1" }), _jsxs("select", { value: sortBy, onChange: (e) => setSortBy(e.target.value), className: "rounded-lg border border-slate-800 bg-slate-900 px-2 py-1", children: [_jsx("option", { value: "created_desc", children: "\u041D\u043E\u0432\u044B\u0435 \u0441\u0432\u0435\u0440\u0445\u0443" }), _jsx("option", { value: "created_asc", children: "\u041D\u043E\u0432\u044B\u0435 \u0441\u043D\u0438\u0437\u0443" }), _jsx("option", { value: "expires_desc", children: "\u041F\u043E \u0438\u0441\u0442\u0435\u0447\u0435\u043D\u0438\u044E \u2193" }), _jsx("option", { value: "expires_asc", children: "\u041F\u043E \u0438\u0441\u0442\u0435\u0447\u0435\u043D\u0438\u044E \u2191" })] }), _jsx("button", { type: "button", onClick: () => {
                            setShow({ active: true, expired: false, replaced: false, revoked: false });
                            setFrom('');
                            setTo('');
                            setSortBy('created_desc');
                        }, className: "rounded-lg border border-slate-700 px-2.5 py-1 hover:border-slate-500", children: "\u0421\u0431\u0440\u043E\u0441\u0438\u0442\u044C \u0444\u0438\u043B\u044C\u0442\u0440\u044B" })] }), _jsxs("div", { className: "space-y-2", children: [visibleSessions.length === 0 ? (_jsx("div", { className: "rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400", children: "\u041D\u0435\u0442 \u0441\u0435\u0441\u0441\u0438\u0439 \u043F\u043E \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u043E\u043C\u0443 \u0444\u0438\u043B\u044C\u0442\u0440\u0443" })) : (visibleSessions.map((s) => {
                        const status = sessionStatus(s);
                        const deviceName = parseDeviceName(s.ua);
                        const browser = parseBrowser(s.ua);
                        const deviceIcon = getDeviceIcon(s.ua);
                        return (_jsxs("div", { className: "rounded-xl border border-slate-800 bg-slate-900 p-4 text-xs hover:border-slate-700 transition-colors", children: [_jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx("span", { className: "text-lg", children: deviceIcon }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "font-semibold text-slate-200 flex items-center gap-2", children: [deviceName, browser && (_jsxs("span", { className: "text-slate-400 font-normal", children: ["\u00B7 ", browser] }))] }), s.deviceId && (_jsxs("div", { className: "text-slate-500 font-mono text-[10px] truncate mt-0.5", children: ["ID: ", s.deviceId] }))] })] }), s.ip && (_jsxs("div", { className: "flex items-center gap-1.5 text-slate-400 mb-1", children: [_jsx("span", { children: "\uD83D\uDCCD" }), _jsx("span", { className: "font-mono", children: s.ip })] })), _jsxs("div", { className: "text-slate-500 space-y-0.5 mt-2", children: [_jsxs("div", { children: ["\uD83D\uDD50 \u0421\u043E\u0437\u0434\u0430\u043D\u0430: ", fmt(s.createdAt)] }), _jsxs("div", { children: ["\u23F0 \u0418\u0441\u0442\u0435\u043A\u0430\u0435\u0442: ", fmt(s.expiresAt)] }), s.revokedAt && _jsxs("div", { children: ["\uD83D\uDEAB \u041E\u0442\u043E\u0437\u0432\u0430\u043D\u0430: ", fmt(s.revokedAt)] }), s.replacedBy && _jsx("div", { children: "\uD83D\uDD04 \u0417\u0430\u043C\u0435\u043D\u0435\u043D\u0430 \u043D\u043E\u0432\u043E\u0439 \u0441\u0435\u0441\u0441\u0438\u0435\u0439" })] })] }), _jsxs("div", { className: "flex flex-col items-end gap-2", children: [_jsx("span", { className: badgeClass(status), children: status }), status === 'active' && (_jsx("button", { disabled: busy === `sess:${s.tokenId}`, onClick: () => onRevoke(s.tokenId), className: "rounded-lg border border-red-800 px-3 py-1.5 text-[11px] text-red-300 hover:bg-red-900/20 disabled:opacity-50 transition-colors", children: busy === `sess:${s.tokenId}` ? 'Завершение...' : 'Завершить' }))] })] }), s.ua && (_jsxs("details", { className: "mt-3 pt-3 border-t border-slate-800", children: [_jsx("summary", { className: "cursor-pointer text-slate-500 hover:text-slate-400 text-[10px]", children: "User Agent" }), _jsx("div", { className: "mt-2 p-2 bg-slate-950 rounded text-[10px] font-mono text-slate-400 break-all", children: s.ua })] }))] }, s.tokenId));
                    })), _jsx("div", { className: "flex justify-end", children: _jsx("button", { onClick: onRefresh, className: "rounded-lg border border-slate-700 px-2.5 py-1 text-[11px] hover:border-slate-500", children: "\uD83D\uDD04 \u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C" }) })] })] }));
}
