import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon, PlayIcon } from '../../icons.js';
import { formatFileSize } from '../../utils.js';
const VIEWER_ENTER_DURATION_CLASS = 'duration-[220ms]';
const VIEWER_EXIT_DURATION_CLASS = 'duration-[260ms]';
const VIEWER_CLOSE_DELAY_MS = 260;
const formatViewerTimestamp = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
        return value;
    return date.toLocaleString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};
const buildTypeLabel = (item) => {
    const contentType = (item.contentType || '').trim();
    if (contentType)
        return contentType;
    return item.mediaType === 'video' ? 'video/mp4' : 'image/jpeg';
};
export function MediaViewerModal({ items, activeIndex, onClose, onChangeIndex, }) {
    const containerRef = useRef(null);
    const closeTimerRef = useRef(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const safeIndex = Math.max(0, Math.min(items.length - 1, activeIndex));
    const activeItem = items[safeIndex];
    const hasMany = items.length > 1;
    const metaLine = useMemo(() => {
        if (!activeItem)
            return '';
        const size = formatFileSize(activeItem.sizeBytes);
        const type = buildTypeLabel(activeItem);
        return size ? `${type} | ${size}` : type;
    }, [activeItem]);
    const clearCloseTimer = useCallback(() => {
        if (closeTimerRef.current !== null) {
            window.clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }
    }, []);
    const beginClose = useCallback(() => {
        if (isClosing)
            return;
        setIsClosing(true);
        clearCloseTimer();
        closeTimerRef.current = window.setTimeout(() => {
            onClose();
        }, VIEWER_CLOSE_DELAY_MS);
    }, [clearCloseTimer, isClosing, onClose]);
    useEffect(() => {
        const frameId = window.requestAnimationFrame(() => {
            setIsVisible(true);
        });
        return () => window.cancelAnimationFrame(frameId);
    }, []);
    useEffect(() => () => {
        clearCloseTimer();
    }, [clearCloseTimer]);
    useEffect(() => {
        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                beginClose();
                return;
            }
            if (isClosing || !hasMany)
                return;
            if (event.key === 'ArrowLeft') {
                event.preventDefault();
                onChangeIndex((safeIndex - 1 + items.length) % items.length);
            }
            else if (event.key === 'ArrowRight') {
                event.preventDefault();
                onChangeIndex((safeIndex + 1) % items.length);
            }
        };
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', onKeyDown);
        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [beginClose, hasMany, isClosing, items.length, onChangeIndex, safeIndex]);
    if (!activeItem) {
        return null;
    }
    const transitionDurationClass = isClosing
        ? VIEWER_EXIT_DURATION_CLASS
        : VIEWER_ENTER_DURATION_CLASS;
    const overlayMotionClass = isClosing
        ? 'opacity-0 pointer-events-none'
        : isVisible
            ? 'opacity-100'
            : 'opacity-0';
    const stageMotionClass = isClosing
        ? 'opacity-0 translate-y-3 scale-[0.955] blur-[1px]'
        : isVisible
            ? 'opacity-100 translate-y-0 scale-100 blur-0'
            : 'opacity-0 translate-y-2 scale-[0.985] blur-[0.3px]';
    const topChromeMotionClass = isClosing
        ? 'opacity-0 -translate-y-2'
        : isVisible
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 -translate-y-1';
    const bottomChromeMotionClass = isClosing
        ? 'opacity-0 translate-y-2'
        : isVisible
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-1';
    const content = (_jsxs("div", { className: `fixed inset-0 z-[1000] bg-black/95 transition-opacity ${transitionDurationClass} ease-[cubic-bezier(0.22,1,0.36,1)] ${overlayMotionClass}`, onClick: (event) => {
            if (event.target === containerRef.current) {
                beginClose();
            }
        }, ref: containerRef, children: [_jsx("div", { className: `pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-end px-4 pb-3 pt-3 transition-[opacity,transform] ${transitionDurationClass} ease-[cubic-bezier(0.22,1,0.36,1)] sm:px-6 ${topChromeMotionClass}`, children: _jsxs("div", { className: "pointer-events-auto flex items-center gap-2", children: [_jsxs("div", { className: "rounded-full bg-black/58 px-3 py-1 text-[12px] font-[600] text-white/82", children: [safeIndex + 1, " / ", items.length] }), _jsx("a", { href: activeItem.url, download: activeItem.fileName || undefined, target: "_blank", rel: "noreferrer", className: "rounded-full bg-black/58 px-3 py-1 text-[12px] font-[600] text-white/90 transition-colors hover:bg-black/74", children: "Download" }), _jsx("button", { type: "button", onClick: beginClose, disabled: isClosing, className: "grid h-10 w-10 place-items-center rounded-full bg-black/58 text-white/92 transition-colors hover:bg-black/74 disabled:cursor-default disabled:opacity-70", "aria-label": "Close media viewer", children: _jsx(CloseIcon, { size: 18, strokeWidth: 2.4 }) })] }) }), hasMany ? (_jsxs(_Fragment, { children: [_jsx("button", { type: "button", onClick: () => onChangeIndex((safeIndex - 1 + items.length) % items.length), disabled: isClosing, className: "absolute left-4 top-1/2 z-20 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-black/58 text-white/90 transition-colors hover:bg-black/74 disabled:cursor-default disabled:opacity-70", "aria-label": "Previous media", children: _jsx("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", children: _jsx("path", { d: "M14.5 5 8 12l6.5 7", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round" }) }) }), _jsx("button", { type: "button", onClick: () => onChangeIndex((safeIndex + 1) % items.length), disabled: isClosing, className: "absolute right-4 top-1/2 z-20 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-black/58 text-white/90 transition-colors hover:bg-black/74 disabled:cursor-default disabled:opacity-70", "aria-label": "Next media", children: _jsx("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", children: _jsx("path", { d: "m9.5 5 6.5 7-6.5 7", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round" }) }) })] })) : null, _jsx("div", { className: `absolute inset-0 flex items-center justify-center px-4 py-16 transition-[opacity,transform,filter] ${transitionDurationClass} ease-[cubic-bezier(0.22,1,0.36,1)] sm:px-12 sm:py-20 ${stageMotionClass}`, children: activeItem.mediaType === 'video' ? (_jsx("video", { src: activeItem.url, controls: true, autoPlay: true, playsInline: true, preload: "metadata", className: "max-h-[calc(100vh-110px)] max-w-[calc(100vw-72px)] bg-black object-contain shadow-[0_20px_56px_rgba(0,0,0,0.62)]" }, activeItem.url)) : (_jsx("img", { src: activeItem.url, alt: activeItem.fileName || 'Media', className: "max-h-[calc(100vh-110px)] max-w-[calc(100vw-72px)] object-contain shadow-[0_20px_56px_rgba(0,0,0,0.62)]" })) }), _jsxs("div", { className: `pointer-events-none absolute bottom-4 left-4 z-20 max-w-[min(70vw,560px)] rounded-xl bg-black/58 px-4 py-3 text-white shadow-[0_14px_36px_rgba(0,0,0,0.45)] transition-[opacity,transform] ${transitionDurationClass} ease-[cubic-bezier(0.22,1,0.36,1)] sm:bottom-6 sm:left-6 ${bottomChromeMotionClass}`, children: [_jsx("div", { className: "truncate text-[16px] font-[700] text-white", children: activeItem.senderName }), _jsx("div", { className: "truncate text-[13px] text-white/78", children: formatViewerTimestamp(activeItem.createdAt) }), _jsx("div", { className: "mt-[2px] truncate text-[12px] text-white/68", children: metaLine }), activeItem.mediaType === 'video' ? (_jsxs("div", { className: "mt-1 inline-flex items-center gap-1 text-[12px] text-white/62", children: [_jsx(PlayIcon, { size: 12 }), "Video"] })) : null] })] }));
    if (typeof document === 'undefined') {
        return content;
    }
    return createPortal(content, document.body);
}
