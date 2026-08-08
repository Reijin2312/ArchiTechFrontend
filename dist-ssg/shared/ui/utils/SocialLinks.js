import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { SvgDiscord, SvgTelegram } from '../image/Icons.js';
const SOCIAL_ICONS = {
    discord: { icon: _jsx(SvgDiscord, { className: "h-5" }), placeholder: 'username#1234', color: 'text-indigo-400' },
    telegram: { icon: _jsx(SvgTelegram, { className: "h-5" }), placeholder: '@username', color: 'text-sky-400' },
    vk: { icon: '🔵', placeholder: 'vk.com/username', color: 'text-blue-400' },
    youtube: { icon: '▶️', placeholder: '@channel', color: 'text-red-400' },
    twitch: { icon: '📺', placeholder: 'username', color: 'text-purple-400' },
    github: { icon: '🐙', placeholder: 'username', color: 'text-slate-300' },
    custom: { icon: '🔗', placeholder: 'https://...', color: 'text-slate-400' },
};
export function SocialLinks({ links, onChange, editable = false, readOnly = false, className = '' }) {
    const [editing, setEditing] = useState(false);
    const normalizedLinks = Array.isArray(links)
        ? links
        : Object.entries(links).map(([type, value]) => ({
            type: type,
            value: String(value)
        }));
    const [editLinks, setEditLinks] = useState(normalizedLinks);
    const handleSave = () => {
        const filtered = editLinks.filter((l) => l.value.trim());
        onChange?.(Array.isArray(links) ? filtered : Object.fromEntries(filtered.map(l => [l.type, l.value])));
        setEditing(false);
    };
    const handleAdd = (type) => {
        setEditLinks([...editLinks, { type, value: '', label: undefined }]);
    };
    const handleRemove = (index) => {
        setEditLinks(editLinks.filter((_, i) => i !== index));
    };
    const handleChange = (index, value) => {
        const newLinks = [...editLinks];
        newLinks[index].value = value;
        setEditLinks(newLinks);
    };
    if (editable && editing) {
        return (_jsxs("div", { className: `space-y-3 ${className}`, children: [editLinks.map((link, idx) => {
                    const config = SOCIAL_ICONS[link.type] || SOCIAL_ICONS.custom;
                    return (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-900", children: typeof config.icon === 'string' ? (_jsx("span", { className: "text-lg", children: config.icon })) : (config.icon) }), _jsx("input", { type: "text", value: link.value, onChange: (e) => handleChange(idx, e.target.value), placeholder: config.placeholder, className: "flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-slate-500" }), _jsx("button", { type: "button", onClick: () => handleRemove(idx), className: "h-10 w-10 rounded-lg border border-red-800 text-red-400 hover:bg-red-900/20", children: "\u2715" })] }, idx));
                }), _jsx("div", { className: "flex flex-wrap gap-2", children: Object.keys(SOCIAL_ICONS).map((type) => (_jsxs("button", { type: "button", onClick: () => handleAdd(type), className: "rounded-lg border border-slate-700 px-3 py-1.5 text-xs hover:border-slate-500", children: ["+ ", type] }, type))) }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx("button", { type: "button", onClick: () => {
                                setEditLinks(normalizedLinks);
                                setEditing(false);
                            }, className: "rounded-lg border border-slate-700 px-3 py-1.5 text-sm hover:border-slate-500", children: "\u041E\u0442\u043C\u0435\u043D\u0430" }), _jsx("button", { type: "button", onClick: handleSave, className: "rounded-lg bg-sky-600 px-3 py-1.5 text-sm hover:bg-sky-500", children: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C" })] })] }));
    }
    return (_jsx("div", { className: className, children: normalizedLinks.length === 0 ? (editable && !readOnly ? (_jsx("button", { type: "button", onClick: () => setEditing(true), className: "w-full rounded-xl border border-dashed border-slate-700 py-3 text-sm text-slate-400 hover:border-slate-500 hover:text-slate-300", children: "+ \u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0441\u043E\u0446\u0441\u0435\u0442\u0438" })) : (_jsx("div", { className: "text-sm text-slate-500", children: "\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u044B" }))) : (_jsxs("div", { className: "flex flex-wrap justify-center gap-2", children: [normalizedLinks.map((link, idx) => {
                    const config = SOCIAL_ICONS[link.type] || SOCIAL_ICONS.custom;
                    return (_jsxs("a", { href: link.type === 'custom' ? link.value : `#${link.value}`, target: "_blank", rel: "noopener noreferrer", className: `flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-sm hover:border-slate-500 transition-colors ${config.color}`, title: link.label || link.value, children: [typeof config.icon === 'string' ? (_jsx("span", { children: config.icon })) : (config.icon), _jsx("span", { className: "max-w-[120px] truncate", children: link.value })] }, idx));
                }), editable && !readOnly && (_jsx("button", { type: "button", onClick: () => setEditing(true), className: "rounded-lg border border-slate-700 px-3 py-1.5 text-sm hover:border-slate-500", children: "\u270F\uFE0F" }))] })) }));
}
