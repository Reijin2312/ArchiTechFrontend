import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { useI18n } from './I18nProvider.js';
export function LanguageSwitcher() {
    const { language, setLanguage, t } = useI18n();
    const [open, setOpen] = useState(false);
    const rootRef = useRef(null);
    useEffect(() => {
        if (!open)
            return;
        const close = (event) => {
            if (!rootRef.current?.contains(event.target))
                setOpen(false);
        };
        const escape = (event) => {
            if (event.key === 'Escape')
                setOpen(false);
        };
        document.addEventListener('mousedown', close);
        document.addEventListener('keydown', escape);
        return () => {
            document.removeEventListener('mousedown', close);
            document.removeEventListener('keydown', escape);
        };
    }, [open]);
    const choose = (next) => {
        setLanguage(next);
        setOpen(false);
    };
    return (_jsxs("div", { ref: rootRef, className: "relative", children: [_jsx("button", { type: "button", onClick: () => setOpen((value) => !value), "aria-label": t('language.label'), "aria-haspopup": "menu", "aria-expanded": open, className: "inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-slate-900/70 transition hover:border-sky-500/60 hover:bg-slate-800", children: _jsx(FlagIcon, { language: language }) }), open && (_jsxs("div", { role: "menu", className: "absolute right-0 top-11 z-50 min-w-40 overflow-hidden rounded-xl border border-slate-700 bg-slate-950/95 p-1.5 shadow-2xl backdrop-blur-xl", children: [_jsx(LanguageOption, { language: "ru", current: language, label: t('language.ru'), onChoose: choose }), _jsx(LanguageOption, { language: "en", current: language, label: t('language.en'), onChoose: choose })] }))] }));
}
function LanguageOption({ language, current, label, onChoose }) {
    return (_jsxs("button", { type: "button", role: "menuitemradio", "aria-checked": current === language, onClick: () => onChoose(language), className: `flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${current === language ? 'bg-sky-500/15 text-sky-200' : 'text-slate-200 hover:bg-slate-800'}`, children: [_jsx(FlagIcon, { language: language }), _jsx("span", { children: label })] }));
}
export function FlagIcon({ language }) {
    if (language === 'ru') {
        return _jsxs("span", { "aria-hidden": "true", className: "grid h-4 w-6 shrink-0 overflow-hidden rounded-[3px] border border-white/20 shadow-sm", children: [_jsx("span", { className: "bg-white" }), _jsx("span", { className: "bg-[#1751a5]" }), _jsx("span", { className: "bg-[#d52b1e]" })] });
    }
    return (_jsxs("svg", { "aria-hidden": "true", viewBox: "0 0 60 36", className: "h-4 w-6 shrink-0 overflow-hidden rounded-[3px] border border-white/20 shadow-sm", children: [_jsx("rect", { width: "60", height: "36", fill: "#012169" }), _jsx("path", { d: "M0 0 60 36M60 0 0 36", stroke: "#fff", strokeWidth: "8" }), _jsx("path", { d: "M0 0 60 36M60 0 0 36", stroke: "#c8102e", strokeWidth: "4" }), _jsx("path", { d: "M30 0v36M0 18h60", stroke: "#fff", strokeWidth: "12" }), _jsx("path", { d: "M30 0v36M0 18h60", stroke: "#c8102e", strokeWidth: "7" })] }));
}
