import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { renderMessageContent } from '../../../../../shared/utils/chatTextEntities.js';
import { CheckCheckIcon, PlayIcon } from '../../icons.js';
import { isManagedMediaSourceUrl, useManagedMediaDownload } from '../../hooks/useManagedMediaDownload.js';
import { useViewportPresence } from '../../hooks/useViewportPresence.js';
import { buildImageGridRows } from './imageGridPattern.js';
import { ensureVideoPosterMeta, getCachedVideoAspectRatio, getCachedVideoPosterUrl, } from './videoPoster.js';
function StatusLine({ isOwn, isRead, status, isEdited, time, editedClassName, }) {
    return (_jsxs(_Fragment, { children: [isEdited ? (_jsx("span", { className: `italic ${editedClassName}`, children: "edited" })) : null, _jsx("span", { children: time }), isOwn ? (_jsx("span", { className: "ml-[4px] inline-flex h-[12px] w-[12px] items-center justify-center", children: status === 'pending' ? (_jsx("span", { className: "h-3 w-3 animate-pulse rounded-full border border-white/88" })) : status === 'failed' ? (_jsx("span", { className: "text-[14px] leading-none text-[#ffb0ba]", children: "!" })) : (_jsx(CheckCheckIcon, { size: 15, strokeWidth: 2.25, className: `origin-center scale-[1.85] ${isRead ? 'text-[#d8fff0]' : ''}` })) })) : null] }));
}
function UploadOverlay({ uploadState, onCancel, }) {
    const safeProgress = Math.max(0, Math.min(100, uploadState.progress));
    const radius = 17;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference - (safeProgress / 100) * circumference;
    const canCancel = !!onCancel && uploadState.cancelable;
    return (_jsx("div", { className: "pointer-events-none absolute inset-0 z-[5] flex items-center justify-center bg-black/18 backdrop-blur-[1px]", children: _jsxs("button", { type: "button", "aria-label": "Cancel upload", onClick: (event) => {
                event.stopPropagation();
                if (!canCancel)
                    return;
                onCancel();
            }, disabled: !canCancel, className: `pointer-events-auto relative grid h-[42px] w-[42px] place-items-center rounded-full bg-black/62 text-white shadow-[0_8px_18px_rgba(0,0,0,0.42)] ${canCancel ? 'hover:bg-black/76' : 'cursor-default'}`, children: [_jsxs("svg", { className: "pointer-events-none absolute inset-0 h-full w-full -rotate-90", viewBox: "0 0 42 42", "aria-hidden": "true", children: [_jsx("circle", { cx: "21", cy: "21", r: radius, fill: "none", stroke: "rgba(255,255,255,0.28)", strokeWidth: "2.2" }), _jsx("circle", { cx: "21", cy: "21", r: radius, fill: "none", stroke: "rgba(255,255,255,0.95)", strokeWidth: "2.6", strokeLinecap: "round", strokeDasharray: circumference, strokeDashoffset: dashOffset })] }), _jsxs("span", { className: "relative block h-[14px] w-[14px]", children: [_jsx("span", { className: "absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 rotate-45 rounded-full bg-white" }), _jsx("span", { className: "absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 -rotate-45 rounded-full bg-white" })] })] }) }));
}
function VideoPlayOverlay({ compact = false }) {
    return (_jsx("span", { className: "pointer-events-none absolute inset-0 z-[3] flex items-center justify-center", children: _jsx("span", { className: `grid place-items-center rounded-full bg-black/48 text-white/95 shadow-[0_8px_18px_rgba(0,0,0,0.38)] ${compact ? 'h-8 w-8' : 'h-11 w-11'}`, children: _jsx(PlayIcon, { size: compact ? 14 : 20, className: "translate-x-[1px]" }) }) }));
}
function IncomingDownloadOverlay({ phase, progress, indeterminate, onCancel, onAction, }) {
    const safeProgress = Math.max(0, Math.min(100, progress));
    const radius = 17;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference - (safeProgress / 100) * circumference;
    const loading = phase === 'loading';
    const manual = phase === 'manual' || phase === 'canceled';
    const retryable = phase === 'error';
    const actionLabel = loading
        ? 'Cancel media loading'
        : manual
            ? 'Download media'
            : 'Retry media loading';
    return (_jsx("div", { className: "pointer-events-none absolute inset-0 z-[6] flex items-center justify-center bg-black/26 backdrop-blur-[1px]", children: _jsxs("button", { type: "button", "aria-label": actionLabel, onClick: (event) => {
                event.stopPropagation();
                if (loading) {
                    onCancel();
                }
                else {
                    onAction();
                }
            }, className: "pointer-events-auto relative grid h-[42px] w-[42px] place-items-center rounded-full bg-black/62 text-white shadow-[0_8px_18px_rgba(0,0,0,0.42)] transition-colors hover:bg-black/76", children: [_jsxs("svg", { className: `pointer-events-none absolute inset-0 h-full w-full -rotate-90 ${loading && indeterminate ? 'animate-spin' : ''}`, viewBox: "0 0 42 42", "aria-hidden": "true", children: [_jsx("circle", { cx: "21", cy: "21", r: radius, fill: "none", stroke: "rgba(255,255,255,0.28)", strokeWidth: "2.2" }), loading ? (indeterminate ? (_jsx("circle", { cx: "21", cy: "21", r: radius, fill: "none", stroke: "rgba(255,255,255,0.95)", strokeWidth: "2.6", strokeLinecap: "round", strokeDasharray: `${circumference * 0.3} ${circumference}` })) : (_jsx("circle", { cx: "21", cy: "21", r: radius, fill: "none", stroke: "rgba(255,255,255,0.95)", strokeWidth: "2.6", strokeLinecap: "round", strokeDasharray: circumference, strokeDashoffset: dashOffset }))) : retryable ? (_jsx("circle", { cx: "21", cy: "21", r: radius, fill: "none", stroke: "rgba(255,255,255,0.95)", strokeWidth: "2.6", strokeLinecap: "round", strokeDasharray: `${circumference * 0.24} ${circumference}` })) : null] }), loading ? (_jsxs("span", { className: "relative block h-[14px] w-[14px]", children: [_jsx("span", { className: "absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 rotate-45 rounded-full bg-white" }), _jsx("span", { className: "absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 -rotate-45 rounded-full bg-white" })] })) : manual ? (_jsxs("span", { className: "relative block h-[14px] w-[14px]", children: [_jsx("span", { className: "absolute left-1/2 top-[1px] h-[8px] w-[2px] -translate-x-1/2 rounded-full bg-white" }), _jsx("span", { className: "absolute left-1/2 top-[7px] h-[6px] w-[6px] -translate-x-1/2 rotate-45 border-b-[2px] border-r-[2px] border-white" }), _jsx("span", { className: "absolute left-1/2 bottom-[-1px] h-[2px] w-[8px] -translate-x-1/2 rounded-full bg-white" })] })) : (_jsxs("span", { className: "relative block h-[14px] w-[14px]", children: [_jsx("span", { className: "absolute left-1/2 top-[1px] h-[7px] w-[2px] -translate-x-1/2 rounded-full bg-white" }), _jsx("span", { className: "absolute left-1/2 top-[5px] h-[7px] w-[7px] -translate-x-1/2 rotate-45 border-b-[2px] border-r-[2px] border-white" })] }))] }) }));
}
function toIncomingLoadPhase(phase, manual) {
    if (phase === 'ready')
        return 'ready';
    if (phase === 'error')
        return 'error';
    if (phase === 'paused')
        return manual ? 'manual' : 'canceled';
    if (phase === 'canceled')
        return 'canceled';
    return 'loading';
}
const normalizeAspectRatio = (value) => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
        return undefined;
    }
    return Math.min(4, Math.max(0.25, value));
};
const DEFAULT_IMAGE_ASPECT_RATIO = 1;
const DEFAULT_VIDEO_ASPECT_RATIO = 16 / 9;
const FALLBACK_MEDIA_WIDTH_PX = 360;
const isLocalPreviewSource = (value) => !!value && (value.startsWith('blob:') || value.startsWith('data:'));
function PlaceholderLayer({ strippedPreviewUrl, previewUrl, strippedBlurPx = 14, previewBlurPx = 6, }) {
    const source = strippedPreviewUrl || previewUrl;
    if (!source) {
        return _jsx("span", { className: "absolute inset-0 bg-[#1f2129]" });
    }
    const isStripped = source === strippedPreviewUrl;
    return (_jsx("span", { className: "absolute inset-0", style: {
            backgroundImage: `url(${source})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: `blur(${isStripped ? strippedBlurPx : previewBlurPx}px)`,
            transform: 'scale(1.06)',
        } }));
}
function ProgressiveIncomingImage({ src, strippedPreviewUrl, previewUrl, sizeBytes, alt, isOwnMessage, preferredAspectRatio, disableProgressive = false, onOpenMedia, buttonClassName, imageClassName, imageStyle, ariaLabel = 'Open media', }) {
    const supportsProgressiveDownload = !disableProgressive && isManagedMediaSourceUrl(src);
    const { ref: viewportRef, isInViewport } = useViewportPresence({
        disabled: !supportsProgressiveDownload,
        rootMargin: '420px',
    });
    const managedDownload = useManagedMediaDownload({
        url: src,
        kind: 'image',
        sizeBytes,
        priority: isInViewport ? 96 : 8,
        autoStart: isInViewport,
        managed: supportsProgressiveDownload,
        inViewport: isInViewport,
    });
    const phase = supportsProgressiveDownload
        ? toIncomingLoadPhase(managedDownload.phase, managedDownload.snapshot.manual)
        : 'ready';
    const progress = supportsProgressiveDownload ? managedDownload.progress : 100;
    const indeterminate = supportsProgressiveDownload
        ? managedDownload.indeterminate
        : false;
    const resolvedSrc = supportsProgressiveDownload
        ? managedDownload.resolvedUrl || ''
        : src;
    const [displaySrc, setDisplaySrc] = useState(resolvedSrc);
    const hasInstantInitialFrame = !supportsProgressiveDownload && isLocalPreviewSource(resolvedSrc);
    const [resolvedAspectRatio, setResolvedAspectRatio] = useState(normalizeAspectRatio(preferredAspectRatio));
    useEffect(() => {
        setResolvedAspectRatio(normalizeAspectRatio(preferredAspectRatio));
    }, [preferredAspectRatio]);
    const [isImageVisible, setIsImageVisible] = useState(hasInstantInitialFrame);
    const [showPlaceholderLayer, setShowPlaceholderLayer] = useState(!hasInstantInitialFrame);
    useEffect(() => {
        if (!resolvedSrc) {
            return;
        }
        if (resolvedSrc === displaySrc) {
            return;
        }
        setDisplaySrc(resolvedSrc);
        setIsImageVisible(false);
        setShowPlaceholderLayer(true);
    }, [displaySrc, resolvedSrc]);
    useEffect(() => {
        if (!displaySrc) {
            setShowPlaceholderLayer(true);
            return;
        }
        if (!isImageVisible) {
            setShowPlaceholderLayer(true);
            return;
        }
        const timeout = window.setTimeout(() => {
            setShowPlaceholderLayer(false);
        }, 220);
        return () => {
            window.clearTimeout(timeout);
        };
    }, [displaySrc, isImageVisible]);
    const canOpen = !!onOpenMedia && (!supportsProgressiveDownload || phase === 'ready' || !!displaySrc);
    const shouldShowPlaceholder = showPlaceholderLayer;
    const shouldShowDownloadOverlay = supportsProgressiveDownload && phase !== 'ready';
    const buttonStyle = {
        ...(imageStyle || {}),
        aspectRatio: resolvedAspectRatio || DEFAULT_IMAGE_ASPECT_RATIO,
    };
    return (_jsxs("div", { ref: viewportRef, className: "relative h-full w-full", children: [_jsxs("button", { type: "button", onClick: () => {
                    if (!canOpen)
                        return;
                    onOpenMedia?.();
                }, className: `${buttonClassName} ${canOpen ? 'cursor-zoom-in' : 'cursor-default'}`, "aria-label": ariaLabel, style: buttonStyle, children: [_jsx("span", { "aria-hidden": "true", className: `pointer-events-none absolute inset-0 transition-opacity duration-300 ${shouldShowPlaceholder ? 'opacity-100' : 'opacity-0'}`, children: _jsx(PlaceholderLayer, { strippedPreviewUrl: strippedPreviewUrl, previewUrl: previewUrl, strippedBlurPx: 15, previewBlurPx: 5 }) }), displaySrc ? (_jsx("img", { src: displaySrc, alt: alt, className: `${imageClassName} transition-opacity duration-300 ${isImageVisible ? 'opacity-100' : 'opacity-0'}`, onLoad: (event) => {
                            void event;
                            setIsImageVisible(true);
                        }, loading: "lazy", decoding: "async", draggable: false })) : null] }), shouldShowDownloadOverlay ? (_jsx(IncomingDownloadOverlay, { phase: phase, progress: progress, indeterminate: indeterminate, onCancel: () => managedDownload.cancel(), onAction: () => {
                    if (managedDownload.phase === 'error') {
                        managedDownload.retry();
                    }
                    else {
                        managedDownload.start();
                    }
                } })) : null] }));
}
function ProgressiveIncomingVideo({ src, strippedPreviewUrl, previewUrl, preferredAspectRatio, contentType, sizeBytes, isOwnMessage, disableProgressive = false, onOpenMedia, buttonClassName, videoClassName, videoStyle, compactPlayIcon = false, ariaLabel = 'Open media', }) {
    const supportsProgressiveDownload = !disableProgressive && isManagedMediaSourceUrl(src);
    const { ref: viewportRef, isInViewport } = useViewportPresence({
        disabled: !supportsProgressiveDownload,
        rootMargin: '420px',
    });
    const managedDownload = useManagedMediaDownload({
        url: src,
        kind: 'video',
        sizeBytes,
        priority: isInViewport ? 88 : 8,
        autoStart: isInViewport,
        managed: supportsProgressiveDownload,
        inViewport: isInViewport,
    });
    const phase = supportsProgressiveDownload
        ? toIncomingLoadPhase(managedDownload.phase, managedDownload.snapshot.manual)
        : 'ready';
    const progress = supportsProgressiveDownload ? managedDownload.progress : 100;
    const indeterminate = supportsProgressiveDownload
        ? managedDownload.indeterminate
        : false;
    const resolvedSrc = supportsProgressiveDownload
        ? managedDownload.resolvedUrl || ''
        : src;
    const [displaySrc, setDisplaySrc] = useState(resolvedSrc);
    const hasInstantInitialFrame = !supportsProgressiveDownload && isLocalPreviewSource(resolvedSrc);
    const [isVideoVisible, setIsVideoVisible] = useState(hasInstantInitialFrame);
    const [showPlaceholderLayer, setShowPlaceholderLayer] = useState(!hasInstantInitialFrame);
    const [generatedPosterUrl, setGeneratedPosterUrl] = useState(undefined);
    const [posterFailed, setPosterFailed] = useState(false);
    const [resolvedAspectRatio, setResolvedAspectRatio] = useState(normalizeAspectRatio(preferredAspectRatio));
    useEffect(() => {
        const normalizedPreferred = normalizeAspectRatio(preferredAspectRatio);
        setResolvedAspectRatio(normalizedPreferred);
    }, [preferredAspectRatio]);
    useEffect(() => {
        if (!displaySrc) {
            setGeneratedPosterUrl(undefined);
            setResolvedAspectRatio(normalizeAspectRatio(preferredAspectRatio));
            return;
        }
        const cachedPoster = getCachedVideoPosterUrl(displaySrc);
        const normalizedPreferred = normalizeAspectRatio(preferredAspectRatio);
        const cachedAspectRatio = getCachedVideoAspectRatio(displaySrc);
        setResolvedAspectRatio(normalizedPreferred || cachedAspectRatio);
        if (cachedPoster) {
            setGeneratedPosterUrl(cachedPoster);
            return;
        }
        setGeneratedPosterUrl(undefined);
    }, [previewUrl, strippedPreviewUrl, displaySrc, preferredAspectRatio]);
    useEffect(() => {
        if (!resolvedSrc) {
            return;
        }
        if (resolvedSrc === displaySrc) {
            return;
        }
        setDisplaySrc(resolvedSrc);
        setIsVideoVisible(false);
        setShowPlaceholderLayer(true);
    }, [displaySrc, resolvedSrc]);
    useEffect(() => {
        if (previewUrl || strippedPreviewUrl || !displaySrc) {
            return;
        }
        if (supportsProgressiveDownload && phase !== 'ready') {
            return;
        }
        const cachedPoster = getCachedVideoPosterUrl(displaySrc);
        const cachedAspectRatio = getCachedVideoAspectRatio(displaySrc);
        if (cachedAspectRatio) {
            setResolvedAspectRatio(cachedAspectRatio);
        }
        if (cachedPoster) {
            setGeneratedPosterUrl(cachedPoster);
            return;
        }
        let cancelled = false;
        void (async () => {
            const meta = await ensureVideoPosterMeta(displaySrc);
            if (cancelled || !meta) {
                return;
            }
            setGeneratedPosterUrl(meta.posterDataUrl);
        })();
        return () => {
            cancelled = true;
        };
    }, [previewUrl, strippedPreviewUrl, displaySrc, supportsProgressiveDownload, phase]);
    const resolvedPosterUrl = previewUrl || strippedPreviewUrl || generatedPosterUrl;
    useEffect(() => {
        setPosterFailed(false);
    }, [resolvedPosterUrl, displaySrc]);
    useEffect(() => {
        if (!displaySrc) {
            setShowPlaceholderLayer(true);
            return;
        }
        if (!isVideoVisible) {
            setShowPlaceholderLayer(true);
            return;
        }
        const timeout = window.setTimeout(() => {
            setShowPlaceholderLayer(false);
        }, 220);
        return () => {
            window.clearTimeout(timeout);
        };
    }, [displaySrc, isVideoVisible]);
    const canOpen = !!onOpenMedia && (!supportsProgressiveDownload || phase === 'ready' || !!displaySrc);
    const useFallbackVideoFrame = !resolvedPosterUrl || posterFailed;
    const showPlaceholder = showPlaceholderLayer;
    const shouldShowDownloadOverlay = supportsProgressiveDownload && phase !== 'ready';
    const displayAspectRatio = resolvedAspectRatio || DEFAULT_VIDEO_ASPECT_RATIO;
    const effectiveVideoStyle = {
        ...videoStyle,
        aspectRatio: displayAspectRatio,
    };
    const skeletonStyle = {
        ...effectiveVideoStyle,
    };
    return (_jsxs("div", { ref: viewportRef, className: "relative h-full w-full", children: [_jsxs("button", { type: "button", onClick: () => {
                    if (!canOpen)
                        return;
                    onOpenMedia?.();
                }, className: `${buttonClassName} ${canOpen ? 'cursor-zoom-in' : 'cursor-default'}`, "aria-label": ariaLabel, children: [_jsx("span", { "aria-hidden": "true", className: `pointer-events-none absolute inset-0 transition-opacity duration-300 ${showPlaceholder ? 'opacity-100' : 'opacity-0'}`, children: _jsx(PlaceholderLayer, { strippedPreviewUrl: strippedPreviewUrl, previewUrl: previewUrl, strippedBlurPx: 14, previewBlurPx: 4 }) }), displaySrc ? (useFallbackVideoFrame ? (_jsx("video", { src: displaySrc, className: `${videoClassName} transition-opacity duration-300 ${isVideoVisible ? 'opacity-100' : 'opacity-0'}`, style: effectiveVideoStyle, playsInline: true, preload: resolvedPosterUrl ? 'metadata' : 'auto', controls: false, muted: true, onLoadedData: () => setIsVideoVisible(true), onCanPlay: () => setIsVideoVisible(true), onLoadedMetadata: () => {
                            if (resolvedPosterUrl) {
                                setIsVideoVisible(true);
                            }
                        }, children: _jsx("source", { src: displaySrc, type: contentType || 'video/mp4' }) })) : resolvedPosterUrl ? (_jsx("img", { src: resolvedPosterUrl, alt: "Video preview", className: `${videoClassName} transition-opacity duration-300 ${isVideoVisible ? 'opacity-100' : 'opacity-0'}`, style: effectiveVideoStyle, loading: "lazy", decoding: "async", draggable: false, onLoad: () => setIsVideoVisible(true), onError: () => {
                            setPosterFailed(true);
                            setIsVideoVisible(false);
                        } })) : (_jsx("span", { "aria-hidden": "true", className: `${videoClassName} block bg-[#1f2129]`, style: skeletonStyle }))) : null, _jsx(VideoPlayOverlay, { compact: compactPlayIcon })] }), shouldShowDownloadOverlay ? (_jsx(IncomingDownloadOverlay, { phase: phase, progress: progress, indeterminate: indeterminate, onCancel: () => managedDownload.cancel(), onAction: () => {
                    if (managedDownload.phase === 'error') {
                        managedDownload.retry();
                    }
                    else {
                        managedDownload.start();
                    }
                } })) : null] }));
}
function ImageGrid({ mediaItems, isOwn, uploadStates, onCancelUploadAt, onOpenMediaAt, }) {
    const rows = buildImageGridRows(mediaItems);
    let visibleMediaIndex = 0;
    return (_jsx("div", { className: "relative w-full overflow-hidden bg-black", children: _jsx("div", { className: "flex flex-col gap-[2px]", children: rows.map((row, rowIndex) => (_jsx("div", { className: "grid gap-[2px]", style: { gridTemplateColumns: `repeat(${row.columns}, minmax(0, 1fr))` }, children: row.items.map((mediaItem, imageIndex) => ((() => {
                    const currentVisibleIndex = visibleMediaIndex;
                    visibleMediaIndex += 1;
                    const uploadState = uploadStates?.[currentVisibleIndex];
                    return (_jsxs("div", { className: `relative overflow-hidden bg-black/30 ${row.columns === 1 ? 'aspect-[16/10]' : 'aspect-square'}`, children: [mediaItem.mediaType === 'video' ? (_jsx(ProgressiveIncomingVideo, { src: mediaItem.url, strippedPreviewUrl: mediaItem.strippedPreviewUrl, previewUrl: mediaItem.previewUrl, preferredAspectRatio: mediaItem.aspectRatio, contentType: mediaItem.contentType, sizeBytes: mediaItem.sizeBytes, isOwnMessage: isOwn, disableProgressive: !!uploadState, onOpenMedia: onOpenMediaAt ? () => onOpenMediaAt(currentVisibleIndex) : undefined, buttonClassName: "block h-full w-full", videoClassName: "pointer-events-none h-full w-full object-cover", compactPlayIcon: true })) : (_jsx(ProgressiveIncomingImage, { src: mediaItem.url, strippedPreviewUrl: mediaItem.strippedPreviewUrl, previewUrl: mediaItem.previewUrl, sizeBytes: mediaItem.sizeBytes, alt: "Image message", isOwnMessage: isOwn, disableProgressive: !!uploadState, onOpenMedia: onOpenMediaAt ? () => onOpenMediaAt(currentVisibleIndex) : undefined, buttonClassName: "block h-full w-full", imageClassName: "h-full w-full object-cover" })), uploadState ? (_jsx(UploadOverlay, { uploadState: uploadState, onCancel: onCancelUploadAt && uploadState.cancelable
                                    ? () => onCancelUploadAt(currentVisibleIndex)
                                    : undefined })) : null] }, `${mediaItem.url}-${mediaItem.mediaType}-${rowIndex}-${imageIndex}`));
                })())) }, `image-row-${rowIndex}`))) }) }));
}
export function ReplyPreviewBlock({ replyPreview, isOwn, }) {
    return (_jsx("div", { className: `mb-[7px] overflow-hidden rounded-[12px] ${isOwn ? 'bg-white/18' : 'bg-white/8'}`, children: _jsxs("div", { className: "flex", children: [_jsx("span", { className: `w-[4px] ${isOwn ? 'bg-white/85' : 'bg-[#b599ff]'}` }), _jsxs("div", { className: "min-w-0 px-[10px] py-[7px]", children: [_jsx("div", { className: `truncate text-[15px] font-[700] leading-none ${isOwn ? 'text-white' : 'text-[#c0a7ff]'}`, children: replyPreview.author }), _jsx("div", { className: `mt-[4px] line-clamp-1 text-[15px] leading-none ${isOwn ? 'text-white/78' : 'text-white/66'}`, children: replyPreview.text })] })] }) }));
}
const resolveSingleMediaContainerStyle = (bubbleMaxWidthPx, aspectRatio) => {
    const normalizedAspectRatio = normalizeAspectRatio(aspectRatio);
    if (!normalizedAspectRatio) {
        return {
            width: Math.min(bubbleMaxWidthPx, FALLBACK_MEDIA_WIDTH_PX),
            maxWidth: '100%',
        };
    }
    const viewportHeight = typeof window !== 'undefined' && Number.isFinite(window.innerHeight)
        ? window.innerHeight
        : 900;
    const maxHeight = Math.max(220, Math.round(viewportHeight * 0.72));
    const widthByHeight = Math.round(maxHeight * normalizedAspectRatio);
    const width = Math.max(220, Math.min(bubbleMaxWidthPx, widthByHeight));
    return {
        width,
        maxWidth: '100%',
    };
};
export function SingleImageBubble({ mediaItem, caption, captionEntities, bubbleMaxWidthPx, time, isOwn, isRead, status, isEdited, replyPreview, hideTail = false, uploadState, onCancelUpload, onOpenMedia, }) {
    const normalizedCaption = (caption || '').trim();
    const hasCaption = normalizedCaption.length > 0;
    const useFramedBubble = hasCaption || !!replyPreview;
    const useCaptionStripLayout = hasCaption;
    const rootContainerStyle = resolveSingleMediaContainerStyle(bubbleMaxWidthPx, mediaItem.aspectRatio);
    const captionPaddingClass = isEdited
        ? (isOwn ? 'pr-[96px]' : 'pr-[82px]')
        : (isOwn ? 'pr-[56px]' : 'pr-[48px]');
    const editedLabelClass = useFramedBubble
        ? (isOwn ? 'text-white/62' : 'text-white/40')
        : 'text-white/80';
    if (!useFramedBubble) {
        return (_jsxs("div", { className: "relative inline-block", style: rootContainerStyle, children: [_jsxs("div", { className: "relative", children: [mediaItem.mediaType === 'video' ? (_jsx(ProgressiveIncomingVideo, { src: mediaItem.url, strippedPreviewUrl: mediaItem.strippedPreviewUrl, previewUrl: mediaItem.previewUrl, preferredAspectRatio: mediaItem.aspectRatio, contentType: mediaItem.contentType, sizeBytes: mediaItem.sizeBytes, isOwnMessage: isOwn, disableProgressive: !!uploadState, onOpenMedia: onOpenMedia, buttonClassName: "relative block w-full", videoClassName: "pointer-events-none block h-auto max-h-[72vh] w-full max-w-full rounded-[18px] bg-black object-contain", videoStyle: { width: '100%', maxWidth: '100%' } })) : (_jsx(ProgressiveIncomingImage, { src: mediaItem.url, strippedPreviewUrl: mediaItem.strippedPreviewUrl, previewUrl: mediaItem.previewUrl, sizeBytes: mediaItem.sizeBytes, preferredAspectRatio: mediaItem.aspectRatio, alt: "Image message", isOwnMessage: isOwn, disableProgressive: !!uploadState, onOpenMedia: onOpenMedia, buttonClassName: "block", imageClassName: "block h-auto max-h-[72vh] w-auto max-w-full rounded-[18px] object-cover", imageStyle: { maxWidth: bubbleMaxWidthPx } })), uploadState ? (_jsx(UploadOverlay, { uploadState: uploadState, onCancel: uploadState.cancelable ? onCancelUpload : undefined })) : null] }), _jsx("div", { className: "absolute bottom-[8px] right-[10px] flex items-center gap-[2px] rounded-full bg-black/48 px-[7px] py-[3px] text-[14px] text-white/92 backdrop-blur-sm", children: _jsx(StatusLine, { isOwn: isOwn, isRead: isRead, status: status, isEdited: isEdited, time: time, editedClassName: editedLabelClass }) })] }));
    }
    if (useCaptionStripLayout) {
        return (_jsxs("div", { className: "relative inline-block overflow-hidden rounded-[18px]", style: rootContainerStyle, children: [_jsxs("div", { className: "relative w-full overflow-hidden bg-black", children: [mediaItem.mediaType === 'image' ? (_jsxs(_Fragment, { children: [_jsx("span", { "aria-hidden": "true", className: "pointer-events-none absolute inset-0", children: _jsx(PlaceholderLayer, { strippedPreviewUrl: mediaItem.strippedPreviewUrl, previewUrl: mediaItem.previewUrl || mediaItem.url, strippedBlurPx: 15, previewBlurPx: 5 }) }), _jsx("div", { className: "relative flex w-full justify-center", children: _jsx(ProgressiveIncomingImage, { src: mediaItem.url, strippedPreviewUrl: mediaItem.strippedPreviewUrl, previewUrl: mediaItem.previewUrl, preferredAspectRatio: mediaItem.aspectRatio, alt: "Image message", isOwnMessage: isOwn, disableProgressive: !!uploadState, onOpenMedia: onOpenMedia, buttonClassName: "block", imageClassName: "block h-auto max-h-[72vh] w-auto max-w-full object-contain", imageStyle: { maxWidth: bubbleMaxWidthPx } }) })] })) : (_jsx("div", { className: "relative flex w-full justify-center", children: _jsx(ProgressiveIncomingVideo, { src: mediaItem.url, strippedPreviewUrl: mediaItem.strippedPreviewUrl, previewUrl: mediaItem.previewUrl, preferredAspectRatio: mediaItem.aspectRatio, contentType: mediaItem.contentType, sizeBytes: mediaItem.sizeBytes, isOwnMessage: isOwn, disableProgressive: !!uploadState, onOpenMedia: onOpenMedia, buttonClassName: "relative block w-full", videoClassName: "pointer-events-none block h-auto max-h-[72vh] w-full max-w-full bg-black object-contain", videoStyle: { width: '100%', maxWidth: '100%' } }) })), uploadState ? (_jsx(UploadOverlay, { uploadState: uploadState, onCancel: uploadState.cancelable ? onCancelUpload : undefined })) : null] }), _jsxs("div", { className: `relative px-3 pb-2 pt-2 ${isOwn ? 'bg-[#967ef0] text-white' : 'bg-[#222327] text-white/95'}`, children: [replyPreview ? _jsx(ReplyPreviewBlock, { replyPreview: replyPreview, isOwn: isOwn }) : null, _jsx("div", { className: `whitespace-pre-line break-words text-[18px] leading-[1.22] tracking-[0.05px] ${captionPaddingClass}`, children: renderMessageContent(normalizedCaption, captionEntities) }), _jsx("div", { className: `absolute bottom-[6px] right-[10px] flex items-center gap-[2px] text-[14px] ${isOwn ? 'text-white/72' : 'text-white/48'}`, children: _jsx(StatusLine, { isOwn: isOwn, isRead: isRead, status: status, isEdited: isEdited, time: time, editedClassName: editedLabelClass }) })] })] }));
    }
    return (_jsxs("div", { className: `tg-bubble relative inline-block overflow-hidden p-0 ${isOwn ? 'tg-right bg-[#967ef0] text-white' : 'tg-left bg-[#222327] text-white/95'} ${hideTail ? 'tg-tail-none' : ''}`, style: rootContainerStyle, children: [replyPreview ? (_jsx("div", { className: "px-3 pt-2", children: _jsx(ReplyPreviewBlock, { replyPreview: replyPreview, isOwn: isOwn }) })) : null, _jsxs("div", { className: "relative", children: [mediaItem.mediaType === 'video' ? (_jsx(ProgressiveIncomingVideo, { src: mediaItem.url, strippedPreviewUrl: mediaItem.strippedPreviewUrl, previewUrl: mediaItem.previewUrl, preferredAspectRatio: mediaItem.aspectRatio, contentType: mediaItem.contentType, sizeBytes: mediaItem.sizeBytes, isOwnMessage: isOwn, disableProgressive: !!uploadState, onOpenMedia: onOpenMedia, buttonClassName: "relative block w-full", videoClassName: "pointer-events-none block h-auto max-h-[72vh] w-full max-w-full bg-black object-contain", videoStyle: { width: '100%', maxWidth: '100%' } })) : (_jsx(ProgressiveIncomingImage, { src: mediaItem.url, strippedPreviewUrl: mediaItem.strippedPreviewUrl, previewUrl: mediaItem.previewUrl, sizeBytes: mediaItem.sizeBytes, preferredAspectRatio: mediaItem.aspectRatio, alt: "Image message", isOwnMessage: isOwn, disableProgressive: !!uploadState, onOpenMedia: onOpenMedia, buttonClassName: "block", imageClassName: "block h-auto max-h-[72vh] w-auto max-w-full object-cover", imageStyle: { maxWidth: bubbleMaxWidthPx } })), uploadState ? (_jsx(UploadOverlay, { uploadState: uploadState, onCancel: uploadState.cancelable ? onCancelUpload : undefined })) : null] }), _jsx("div", { className: "absolute bottom-[8px] right-[10px] flex items-center gap-[2px] rounded-full bg-black/48 px-[7px] py-[3px] text-[14px] text-white/92 backdrop-blur-sm", children: _jsx(StatusLine, { isOwn: isOwn, isRead: isRead, status: status, isEdited: isEdited, time: time, editedClassName: editedLabelClass }) })] }));
}
export function MultiImageBubble({ mediaItems, caption, captionEntities, bubbleMaxWidthPx, time, isOwn, isRead, status, isEdited, replyPreview, hideTail = false, uploadStates, onCancelUploadAt, onOpenMediaAt, }) {
    if (mediaItems.length === 0) {
        return null;
    }
    const normalizedCaption = (caption || '').trim();
    const hasCaption = normalizedCaption.length > 0;
    const useFramedBubble = hasCaption || !!replyPreview;
    const useCaptionStripLayout = hasCaption;
    const captionPaddingClass = isEdited
        ? (isOwn ? 'pr-[96px]' : 'pr-[82px]')
        : (isOwn ? 'pr-[56px]' : 'pr-[48px]');
    const editedLabelClass = useFramedBubble
        ? (isOwn ? 'text-white/62' : 'text-white/40')
        : 'text-white/80';
    if (!useFramedBubble) {
        return (_jsxs("div", { className: "relative inline-block overflow-hidden rounded-[18px]", style: { maxWidth: bubbleMaxWidthPx }, children: [_jsx(ImageGrid, { mediaItems: mediaItems, isOwn: isOwn, uploadStates: uploadStates, onCancelUploadAt: onCancelUploadAt, onOpenMediaAt: onOpenMediaAt }), _jsx("div", { className: "absolute bottom-[8px] right-[10px] flex items-center gap-[2px] rounded-full bg-black/48 px-[7px] py-[3px] text-[14px] text-white/92 backdrop-blur-sm", children: _jsx(StatusLine, { isOwn: isOwn, isRead: isRead, status: status, isEdited: isEdited, time: time, editedClassName: editedLabelClass }) })] }));
    }
    if (useCaptionStripLayout) {
        return (_jsxs("div", { className: "relative inline-block overflow-hidden rounded-[18px]", style: { maxWidth: bubbleMaxWidthPx }, children: [_jsx(ImageGrid, { mediaItems: mediaItems, isOwn: isOwn, uploadStates: uploadStates, onCancelUploadAt: onCancelUploadAt, onOpenMediaAt: onOpenMediaAt }), _jsxs("div", { className: `relative px-3 pb-2 pt-2 ${isOwn ? 'bg-[#967ef0] text-white' : 'bg-[#222327] text-white/95'}`, children: [replyPreview ? _jsx(ReplyPreviewBlock, { replyPreview: replyPreview, isOwn: isOwn }) : null, _jsx("div", { className: `whitespace-pre-line break-words text-[18px] leading-[1.22] tracking-[0.05px] ${captionPaddingClass}`, children: renderMessageContent(normalizedCaption, captionEntities) }), _jsx("div", { className: `absolute bottom-[6px] right-[10px] flex items-center gap-[2px] text-[14px] ${isOwn ? 'text-white/72' : 'text-white/48'}`, children: _jsx(StatusLine, { isOwn: isOwn, isRead: isRead, status: status, isEdited: isEdited, time: time, editedClassName: editedLabelClass }) })] })] }));
    }
    return (_jsxs("div", { className: `tg-bubble relative inline-block overflow-hidden p-0 ${isOwn ? 'tg-right bg-[#967ef0] text-white' : 'tg-left bg-[#222327] text-white/95'} ${hideTail ? 'tg-tail-none' : ''}`, style: { maxWidth: bubbleMaxWidthPx }, children: [replyPreview ? (_jsx("div", { className: "px-3 pt-2", children: _jsx(ReplyPreviewBlock, { replyPreview: replyPreview, isOwn: isOwn }) })) : null, _jsx(ImageGrid, { mediaItems: mediaItems, isOwn: isOwn, uploadStates: uploadStates, onCancelUploadAt: onCancelUploadAt, onOpenMediaAt: onOpenMediaAt }), _jsx("div", { className: "absolute bottom-[8px] right-[10px] flex items-center gap-[2px] rounded-full bg-black/48 px-[7px] py-[3px] text-[14px] text-white/92 backdrop-blur-sm", children: _jsx(StatusLine, { isOwn: isOwn, isRead: isRead, status: status, isEdited: isEdited, time: time, editedClassName: editedLabelClass }) })] }));
}
