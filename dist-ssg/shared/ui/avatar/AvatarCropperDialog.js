import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import Cropper from 'react-easy-crop';
function createImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = (e) => reject(e);
        img.src = url;
    });
}
const TARGET_SIZE = 512;
async function getCroppedImg(imageSrc, crop) {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx)
        throw new Error('no canvas context');
    canvas.width = TARGET_SIZE;
    canvas.height = TARGET_SIZE;
    ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, TARGET_SIZE, TARGET_SIZE);
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob)
                return reject(new Error('failed to create blob'));
            resolve(blob);
        }, 'image/png');
    });
}
export function AvatarCropperDialog({ src, onClose, onCropped }) {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1.2);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const handleCropComplete = (_, pixels) => {
        setCroppedAreaPixels(pixels);
    };
    const handleConfirm = async () => {
        if (!croppedAreaPixels)
            return;
        const blob = await getCroppedImg(src, croppedAreaPixels);
        onCropped(blob);
    };
    return (_jsxs("div", { className: "fixed inset-0 z-50 flex items-center justify-center", children: [_jsx("div", { className: "absolute inset-0 bg-black/60", onClick: onClose }), _jsxs("div", { className: "relative z-10 w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-xl", children: [_jsx("h2", { className: "mb-3 text-sm font-semibold text-sky-300", children: "\u041E\u0431\u0440\u0435\u0437\u043A\u0430 \u0430\u0432\u0430\u0442\u0430\u0440\u0430" }), _jsx("div", { className: "relative h-72 w-full overflow-hidden rounded-xl bg-slate-900", children: _jsx(Cropper, { image: src, crop: crop, zoom: zoom, aspect: 1, cropShape: "round" // визуально — круг
                            , showGrid: false, onCropChange: setCrop, onZoomChange: setZoom, onCropComplete: handleCropComplete }) }), _jsx("div", { className: "mt-4", children: _jsx("input", { type: "range", min: 1, max: 3, step: 0.01, value: zoom, onChange: (e) => setZoom(Number(e.target.value)), className: "w-full" }) }), _jsxs("div", { className: "mt-4 flex justify-end gap-2", children: [_jsx("button", { type: "button", onClick: onClose, className: "rounded-xl border border-slate-700 px-3 py-1.5 text-sm hover:border-slate-500", children: "\u041E\u0442\u043C\u0435\u043D\u0430" }), _jsx("button", { type: "button", onClick: handleConfirm, className: "rounded-xl border border-sky-700 px-3 py-1.5 text-sm text-sky-300 hover:border-sky-500", children: "\u041E\u0431\u0440\u0435\u0437\u0430\u0442\u044C \u0438 \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C" })] })] })] }));
}
