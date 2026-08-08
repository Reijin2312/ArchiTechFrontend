import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
export function FriendsList({ friends, onRemove, onOpenChat }) {
    const [openMenuUserId, setOpenMenuUserId] = useState(null);
    useEffect(() => {
        const handleClickOutside = (event) => {
            const target = event.target;
            if (!target?.closest('[data-friend-menu]')) {
                setOpenMenuUserId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);
    if (friends.length === 0) {
        return (_jsxs("div", { className: "text-center py-8 text-slate-400 text-sm", children: [_jsx("p", { children: "\u0423 \u0432\u0430\u0441 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442 \u0434\u0440\u0443\u0437\u0435\u0439" }), _jsx("p", { className: "text-xs mt-1", children: "\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u043F\u043E\u0438\u0441\u043A" })] }));
    }
    const formatDate = (dateStr) => {
        if (!dateStr)
            return null;
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            if (diffDays === 0)
                return 'Сегодня';
            if (diffDays === 1)
                return 'Вчера';
            if (diffDays < 7)
                return `${diffDays} дн. назад`;
            if (diffDays < 30)
                return `${Math.floor(diffDays / 7)} нед. назад`;
            if (diffDays < 365)
                return `${Math.floor(diffDays / 30)} мес. назад`;
            return `${Math.floor(diffDays / 365)} г. назад`;
        }
        catch {
            return null;
        }
    };
    return (_jsx("div", { className: "space-y-2", children: friends.map((friend) => (_jsxs(motion.div, { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, className: "flex items-center gap-2 p-2 rounded-lg border border-slate-800 bg-slate-900/40 hover:bg-slate-900/60 transition-colors", children: [_jsxs(Link, { to: `/u/${friend.username}`, className: "flex items-center gap-2 flex-1 min-w-0", children: [friend.avatarUrl ? (_jsx("img", { src: friend.avatarUrl, alt: friend.username, className: "w-10 h-10 rounded-lg object-cover border border-slate-700" })) : (_jsx("div", { className: "w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 text-sm", children: friend.username[0]?.toUpperCase() })), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("div", { className: "text-sm font-medium truncate", children: friend.username }), friend.displayName && (_jsx("div", { className: "text-xs text-slate-400 truncate", children: friend.displayName })), friend.acceptedAt && (_jsx("div", { className: "text-xs text-slate-500 truncate", title: `Друг с ${new Date(friend.acceptedAt).toLocaleString('ru')}`, children: formatDate(friend.acceptedAt) }))] })] }), _jsx("button", { onClick: () => onOpenChat(friend.userId), className: "p-1.5 text-xs rounded bg-indigo-600/20 hover:bg-indigo-600/40 hover:text-indigo-300 transition-all border border-indigo-600/30", title: "\u041D\u0430\u043F\u0438\u0441\u0430\u0442\u044C", children: _jsx("svg", { className: "w-4 h-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" }) }) }), _jsxs("div", { className: "relative", "data-friend-menu": true, children: [_jsx("button", { onClick: (e) => {
                                e.stopPropagation();
                                setOpenMenuUserId((prev) => (prev === friend.userId ? null : friend.userId));
                            }, className: "p-1.5 rounded border border-slate-700/70 bg-slate-900/70 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors", title: "\u041C\u0435\u043D\u044E \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0439", "aria-haspopup": "menu", "aria-expanded": openMenuUserId === friend.userId, "aria-label": "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043C\u0435\u043D\u044E \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0439", children: _jsxs("svg", { className: "w-4 h-4", fill: "currentColor", viewBox: "0 0 24 24", children: [_jsx("circle", { cx: "6", cy: "12", r: "1.8" }), _jsx("circle", { cx: "12", cy: "12", r: "1.8" }), _jsx("circle", { cx: "18", cy: "12", r: "1.8" })] }) }), openMenuUserId === friend.userId && (_jsx("div", { className: "absolute right-0 top-full mt-1 z-20 min-w-[180px] rounded-lg border border-slate-700 bg-slate-900 shadow-xl overflow-hidden", children: _jsx("button", { onClick: () => {
                                    setOpenMenuUserId(null);
                                    onRemove(friend.userId);
                                }, className: "w-full px-3 py-2 text-left text-sm text-rose-300 hover:bg-rose-500/10 transition-colors", children: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0438\u0437 \u0434\u0440\u0443\u0437\u0435\u0439" }) }))] })] }, friend.userId))) }));
}
