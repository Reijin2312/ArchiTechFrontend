import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
const DEFAULT_STATUSES = [
    { id: 'online', emoji: '🟢', label: 'В сети', color: 'text-emerald-400' },
    { id: 'playing', emoji: '🎮', label: 'Играю', color: 'text-sky-400' },
    { id: 'building', emoji: '🏗️', label: 'Строю', color: 'text-amber-400' },
    { id: 'afk', emoji: '💤', label: 'AFK', color: 'text-slate-400' },
    { id: 'dnd', emoji: '⛔', label: 'Не беспокоить', color: 'text-red-400' },
];
export function StatusSelect({ value, customStatus, onChange, className = '' }) {
    const [open, setOpen] = useState(false);
    const [editingCustom, setEditingCustom] = useState(false);
    const [customText, setCustomText] = useState(customStatus || '');
    const selected = DEFAULT_STATUSES.find((s) => s.id === value) || DEFAULT_STATUSES[0];
    return (_jsxs("div", { className: `relative ${className}`, children: [_jsxs("button", { type: "button", onClick: () => setOpen(!open), className: "flex w-full items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm hover:border-slate-600 transition-colors", children: [_jsx("span", { className: "text-lg", children: selected.emoji }), _jsx("span", { className: selected.color || 'text-slate-300', children: customStatus || selected.label }), _jsx("span", { className: "ml-auto text-slate-500", children: "\u25BC" })] }), _jsx(AnimatePresence, { children: open && (_jsxs(_Fragment, { children: [_jsx("div", { className: "fixed inset-0 z-20", onClick: () => setOpen(false) }), _jsx(motion.div, { initial: { opacity: 0, y: -10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 }, className: "absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-xl", children: _jsxs("div", { className: "max-h-64 overflow-y-auto", children: [DEFAULT_STATUSES.map((status) => (_jsxs("button", { type: "button", onClick: () => {
                                            onChange(status.id);
                                            setEditingCustom(false);
                                            setOpen(false);
                                        }, className: `flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${status.id === value
                                            ? 'bg-slate-800'
                                            : 'hover:bg-slate-900'}`, children: [_jsx("span", { className: "text-lg", children: status.emoji }), _jsx("span", { className: status.color || 'text-slate-300', children: status.label })] }, status.id))), _jsx("div", { className: "border-t border-slate-800 p-2", children: editingCustom ? (_jsxs("div", { className: "flex gap-2", children: [_jsx("input", { type: "text", value: customText, onChange: (e) => setCustomText(e.target.value), placeholder: "\u0421\u0432\u043E\u0439 \u0441\u0442\u0430\u0442\u0443\u0441...", maxLength: 50, className: "flex-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm outline-none focus:border-slate-500", autoFocus: true }), _jsx("button", { type: "button", onClick: () => {
                                                        onChange(value || 'online', customText);
                                                        setEditingCustom(false);
                                                        setOpen(false);
                                                    }, className: "rounded-lg bg-sky-600 px-3 py-1.5 text-sm hover:bg-sky-500", children: "\u2713" })] })) : (_jsx("button", { type: "button", onClick: () => setEditingCustom(true), className: "w-full rounded-lg px-2 py-1.5 text-left text-sm text-slate-400 hover:bg-slate-900 hover:text-slate-300", children: "\u270F\uFE0F \u0421\u0432\u043E\u0439 \u0441\u0442\u0430\u0442\u0443\u0441" })) })] }) })] })) })] }));
}
