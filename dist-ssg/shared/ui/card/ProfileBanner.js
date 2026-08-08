import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { DragDropZone } from '../../../shared/ui/form/DragDropZone.js';
import { ImageWithLoader } from '../../../shared/ui/image/index.js';
export function ProfileBanner({ bannerUrl, editable = false, onUpload, loading = false, className = '' }) {
    const [previewUrl, setPreviewUrl] = useState(null);
    const handleFile = (file) => {
        if (!editable || !onUpload)
            return;
        const reader = new FileReader();
        reader.onload = () => {
            setPreviewUrl(reader.result);
        };
        reader.readAsDataURL(file);
        onUpload(file);
    };
    const displayUrl = previewUrl || bannerUrl;
    return (_jsx(DragDropZone, { onFile: handleFile, accept: "image/*", maxSize: 5 * 1024 * 1024, className: className, children: _jsxs("div", { className: "relative h-48 w-full overflow-hidden rounded-2xl border border-slate-800 bg-linear-to-br from-indigo-950/50 via-slate-900/50 to-slate-950/50", children: [displayUrl ? (_jsx(ImageWithLoader, { src: displayUrl, alt: "\u0411\u0430\u043D\u043D\u0435\u0440 \u043F\u0440\u043E\u0444\u0438\u043B\u044F", className: "h-full w-full object-cover pointer-events-none", placeholderClassName: "h-48 w-full" })) : (_jsx("div", { className: "flex h-full w-full items-center justify-center pointer-events-none", children: _jsxs("div", { className: "text-center text-slate-500", children: [_jsx("div", { className: "mb-2 text-4xl", children: "\uD83D\uDDBC\uFE0F" }), editable && _jsx("div", { className: "text-sm", children: "\u041F\u0435\u0440\u0435\u0442\u0430\u0449\u0438\u0442\u0435 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435 \u0438\u043B\u0438 \u043A\u043B\u0438\u043A\u043D\u0438\u0442\u0435 \u0434\u043B\u044F \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438" })] }) })), editable && (_jsxs("label", { className: "absolute bottom-4 right-4 z-20 cursor-pointer rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm backdrop-blur-sm hover:border-slate-500 transition-colors pointer-events-auto", children: [_jsx("input", { type: "file", accept: "image/*", onChange: (e) => {
                                const file = e.target.files?.[0];
                                if (file)
                                    handleFile(file);
                                e.target.value = '';
                            }, className: "hidden" }), "\uD83D\uDCF7 \u0418\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u0431\u0430\u043D\u043D\u0435\u0440"] })), loading && (_jsx("div", { className: "absolute inset-0 z-30 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm pointer-events-none", children: _jsx("div", { className: "h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-sky-500" }) }))] }) }));
}
