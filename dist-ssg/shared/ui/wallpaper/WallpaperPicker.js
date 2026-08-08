import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef } from 'react';
import { DragDropZone } from '../../../shared/ui/form/DragDropZone.js';
import { ImageWithLoader } from '../../../shared/ui/image/index.js';
export function WallpaperPicker(props) {
    const inputRef = useRef(null);
    const handleClick = () => {
        if (props.busy)
            return;
        inputRef.current?.click();
    };
    const handleFile = (file) => {
        props.onChange(file);
    };
    return (_jsxs("div", { className: "space-y-3", children: [_jsxs(DragDropZone, { onFile: handleFile, accept: "image/*", maxSize: 5 * 1024 * 1024, children: [_jsx("button", { type: "button", onClick: handleClick, className: "group flex w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 px-4 py-6 text-center hover:border-sky-600 hover:bg-slate-900/80", children: props.value ? (_jsxs("div", { className: "flex w-full flex-col items-center gap-3", children: [_jsx("div", { className: "h-32 w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950", children: _jsx(ImageWithLoader, { src: props.value, alt: "\u041E\u0431\u043E\u0438 \u043F\u0440\u043E\u0444\u0438\u043B\u044F", className: "h-full w-full object-cover", placeholderClassName: "h-32 w-full" }) }), _jsx("div", { className: "text-xs text-slate-300", children: "\u041D\u0430\u0436\u043C\u0438\u0442\u0435, \u0447\u0442\u043E\u0431\u044B \u0432\u044B\u0431\u0440\u0430\u0442\u044C \u0434\u0440\u0443\u0433\u043E\u0439 \u0444\u0430\u0439\u043B, \u0438\u043B\u0438 \u043F\u0435\u0440\u0435\u0442\u0430\u0449\u0438\u0442\u0435 \u0441\u044E\u0434\u0430 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435" })] })) : (_jsxs("div", { className: "flex flex-col items-center gap-2", children: [_jsx("div", { className: "flex h-10 w-10 items-center justify-center rounded-full bg-slate-800/80 text-slate-200", children: "\uD83D\uDDBC\uFE0F" }), _jsx("div", { className: "text-xs text-slate-300", children: "\u041F\u0435\u0440\u0435\u0442\u0430\u0449\u0438\u0442\u0435 \u0441\u044E\u0434\u0430 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435 \u0438\u043B\u0438 \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \u0434\u043B\u044F \u0432\u044B\u0431\u043E\u0440\u0430 \u0444\u0430\u0439\u043B\u0430" }), _jsx("div", { className: "text-[11px] text-slate-500", children: "PNG/JPG \u0434\u043E 5 \u041C\u0411, \u0436\u0435\u043B\u0430\u0442\u0435\u043B\u044C\u043D\u043E 1920\u00D71080 \u0438\u043B\u0438 \u0448\u0438\u0440\u0435" })] })) }), _jsx("input", { ref: inputRef, type: "file", accept: "image/*", className: "hidden", onChange: (e) => {
                            const file = e.target.files?.[0];
                            if (!file)
                                return;
                            handleFile(file);
                            e.target.value = '';
                        } })] }), props.value && (_jsxs("div", { className: "flex justify-between text-xs text-slate-400", children: [_jsx("span", { children: "\u0422\u0435\u043A\u0443\u0449\u0438\u0435 \u043E\u0431\u043E\u0438 \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u044B" }), props.onClear && (_jsx("button", { type: "button", onClick: props.onClear, className: "text-[11px] text-slate-400 hover:text-red-300", children: "\u0423\u0431\u0440\u0430\u0442\u044C \u043E\u0431\u043E\u0438" }))] }))] }));
}
