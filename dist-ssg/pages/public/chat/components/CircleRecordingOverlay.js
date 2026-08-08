import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
export function CircleRecordingOverlay({ stream }) {
    const videoRef = useRef(null);
    useEffect(() => {
        const video = videoRef.current;
        if (!video)
            return;
        if (!stream) {
            video.srcObject = null;
            return;
        }
        video.srcObject = stream;
        const maybePromise = video.play();
        if (maybePromise && typeof maybePromise.catch === 'function') {
            maybePromise.catch(() => undefined);
        }
        return () => {
            if (video) {
                video.srcObject = null;
            }
        };
    }, [stream]);
    return (_jsx("div", { className: "pointer-events-none absolute inset-0 z-[21] flex items-center justify-center px-4", children: _jsxs("div", { className: "relative h-[min(68vw,18rem)] w-[min(68vw,18rem)] rounded-full border-[4px] border-[#b39cff]/75 shadow-[0_22px_50px_rgba(110,84,205,0.46)]", children: [_jsx("div", { className: "h-full w-full overflow-hidden rounded-full bg-[#0f1115]", children: _jsx("video", { ref: videoRef, muted: true, playsInline: true, autoPlay: true, className: "h-full w-full object-cover scale-x-[-1]" }) }), _jsx("div", { className: "absolute inset-0 rounded-full ring-1 ring-white/16" }), _jsx("div", { className: "absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/45 px-2 py-1 text-[11px] font-[700] text-white backdrop-blur-sm", children: "REC" })] }) }));
}
