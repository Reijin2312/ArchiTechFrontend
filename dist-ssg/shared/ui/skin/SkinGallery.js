import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
export function SkinGallery({ skins, currentSkinUrl, onSelect, onDelete, onSave, maxSkins = 10, className = '' }) {
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const handleDelete = (skinId) => {
        if (deleteConfirm === skinId) {
            onDelete(skinId);
            setDeleteConfirm(null);
        }
        else {
            setDeleteConfirm(skinId);
            setTimeout(() => setDeleteConfirm(null), 3000);
        }
    };
    return (_jsxs("div", { className: className, children: [_jsxs("div", { className: "mb-3 flex items-center justify-between", children: [_jsxs("div", { className: "text-sm font-semibold text-slate-300", children: ["\u0421\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u0435 \u0441\u043A\u0438\u043D\u044B (", skins.length, "/", maxSkins, ")"] }), currentSkinUrl && skins.length < maxSkins && (_jsx("button", { type: "button", onClick: () => {
                            const name = prompt('Название скина:');
                            if (name)
                                onSave(name.trim(), currentSkinUrl, 'classic');
                        }, className: "rounded-lg border border-sky-700 px-2.5 py-1 text-xs text-sky-300 hover:bg-sky-900/20", children: "\uD83D\uDCBE \u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0442\u0435\u043A\u0443\u0449\u0438\u0439" }))] }), skins.length === 0 ? (_jsxs("div", { className: "rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500", children: [_jsx("div", { className: "mb-2 text-2xl", children: "\uD83D\uDC55" }), "\u0423 \u0432\u0430\u0441 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u0445 \u0441\u043A\u0438\u043D\u043E\u0432"] })) : (_jsx("div", { className: "grid grid-cols-2 gap-3 sm:grid-cols-3", children: _jsx(AnimatePresence, { mode: "popLayout", children: skins.map((skin) => {
                        const isCurrent = skin.url === currentSkinUrl;
                        return (_jsxs(motion.div, { layout: true, initial: { opacity: 0, scale: 0.8 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.8 }, className: `group relative overflow-hidden rounded-xl border transition-all ${isCurrent
                                ? 'border-sky-500 ring-2 ring-sky-500/40'
                                : 'border-slate-700 hover:border-slate-500'}`, children: [_jsxs("button", { type: "button", onClick: () => onSelect(skin), className: "w-full", children: [_jsx("div", { className: "aspect-square w-full bg-slate-900", children: _jsx("img", { src: skin.url, alt: skin.name, className: "h-full w-full object-cover", loading: "lazy", decoding: "async" }) }), _jsxs("div", { className: "bg-slate-900/80 px-2 py-1.5 backdrop-blur-sm", children: [_jsx("div", { className: "truncate text-xs font-medium text-slate-200", children: skin.name }), _jsx("div", { className: "text-[10px] text-slate-500", children: skin.model === 'slim' ? 'Slim' : 'Classic' })] })] }), _jsx("button", { type: "button", onClick: () => handleDelete(skin.id), className: `absolute right-2 top-2 rounded-lg border px-2 py-1 text-xs transition-all ${deleteConfirm === skin.id
                                        ? 'border-red-700 bg-red-900/80 text-red-200'
                                        : 'border-slate-700 bg-slate-900/80 text-slate-300 opacity-0 group-hover:opacity-100'}`, title: deleteConfirm === skin.id ? 'Нажмите ещё раз для удаления' : 'Удалить', children: deleteConfirm === skin.id ? '⚠️' : '🗑️' }), isCurrent && (_jsx("div", { className: "absolute left-2 top-2 rounded-full bg-sky-500 px-2 py-0.5 text-[10px] font-medium text-white", children: "\u2713 \u0422\u0435\u043A\u0443\u0449\u0438\u0439" }))] }, skin.id));
                    }) }) }))] }));
}
