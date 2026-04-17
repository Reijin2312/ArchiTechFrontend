import { useEffect, useState, type CSSProperties } from 'react';
import type { ChatMessage } from '@/shared/api/types';
import { renderMessageContent } from '@/shared/utils/chatTextEntities';
import { CheckCheckIcon, PlayIcon } from '../../icons';
import { isManagedMediaSourceUrl, useManagedMediaDownload } from '../../hooks/useManagedMediaDownload';
import { useViewportPresence } from '../../hooks/useViewportPresence';
import { buildImageGridRows } from './imageGridPattern';
import {
  ensureVideoPosterMeta,
  getCachedVideoAspectRatio,
  getCachedVideoPosterUrl,
} from './videoPoster';

export type ReplyPreview = {
  author: string;
  text: string;
};

export type ImageUploadState = {
  progress: number;
  phase: 'queued' | 'uploading' | 'uploaded';
  cancelable: boolean;
};

export type ImageBubbleMediaItem = {
  url: string;
  strippedPreviewUrl?: string;
  previewUrl?: string;
  mediaType: 'image' | 'video';
  contentType?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  aspectRatio?: number;
};

type IncomingImageLoadPhase =
  | 'loading'
  | 'ready'
  | 'manual'
  | 'canceled'
  | 'error';

type StatusLineProps = {
  isOwn: boolean;
  isRead: boolean;
  status?: 'pending' | 'failed' | 'sent' | 'delivered' | 'read';
  isEdited: boolean;
  time: string;
  editedClassName: string;
};

type SingleImageBubbleProps = {
  mediaItem: ImageBubbleMediaItem;
  caption?: string;
  captionEntities?: ChatMessage['entities'];
  bubbleMaxWidthPx: number;
  time: string;
  isOwn: boolean;
  isRead: boolean;
  status?: 'pending' | 'failed' | 'sent' | 'delivered' | 'read';
  isEdited: boolean;
  replyPreview?: ReplyPreview;
  hideTail?: boolean;
  uploadState?: ImageUploadState;
  onCancelUpload?: () => void;
  onOpenMedia?: () => void;
};

type MultiImageBubbleProps = {
  mediaItems: ImageBubbleMediaItem[];
  caption?: string;
  captionEntities?: ChatMessage['entities'];
  bubbleMaxWidthPx: number;
  time: string;
  isOwn: boolean;
  isRead: boolean;
  status?: 'pending' | 'failed' | 'sent' | 'delivered' | 'read';
  isEdited: boolean;
  replyPreview?: ReplyPreview;
  hideTail?: boolean;
  uploadStates?: Array<ImageUploadState | undefined>;
  onCancelUploadAt?: (visibleIndex: number) => void;
  onOpenMediaAt?: (visibleIndex: number) => void;
};

function StatusLine({
  isOwn,
  isRead,
  status,
  isEdited,
  time,
  editedClassName,
}: StatusLineProps) {
  return (
    <>
      {isEdited ? (
        <span className={`italic ${editedClassName}`}>edited</span>
      ) : null}
      <span>{time}</span>
      {isOwn ? (
        <span className="ml-[4px] inline-flex h-[12px] w-[12px] items-center justify-center">
          {status === 'pending' ? (
            <span className="h-3 w-3 animate-pulse rounded-full border border-white/88" />
          ) : status === 'failed' ? (
            <span className="text-[14px] leading-none text-[#ffb0ba]">!</span>
          ) : (
            <CheckCheckIcon
              size={15}
              strokeWidth={2.25}
              className={`origin-center scale-[1.85] ${isRead ? 'text-[#d8fff0]' : ''}`}
            />
          )}
        </span>
      ) : null}
    </>
  );
}

function UploadOverlay({
  uploadState,
  onCancel,
}: {
  uploadState: ImageUploadState;
  onCancel?: () => void;
}) {
  const safeProgress = Math.max(0, Math.min(100, uploadState.progress));
  const radius = 17;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (safeProgress / 100) * circumference;
  const canCancel = !!onCancel && uploadState.cancelable;

  return (
    <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center bg-black/18 backdrop-blur-[1px]">
      <button
        type="button"
        aria-label="Cancel upload"
        onClick={(event) => {
          event.stopPropagation();
          if (!canCancel) return;
          onCancel();
        }}
        disabled={!canCancel}
        className={`pointer-events-auto relative grid h-[42px] w-[42px] place-items-center rounded-full bg-black/62 text-white shadow-[0_8px_18px_rgba(0,0,0,0.42)] ${
          canCancel ? 'hover:bg-black/76' : 'cursor-default'
        }`}
      >
        <svg className="pointer-events-none absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 42 42" aria-hidden="true">
          <circle
            cx="21"
            cy="21"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.28)"
            strokeWidth="2.2"
          />
          <circle
            cx="21"
            cy="21"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.95)"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <span className="relative block h-[14px] w-[14px]">
          <span className="absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 rotate-45 rounded-full bg-white" />
          <span className="absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 -rotate-45 rounded-full bg-white" />
        </span>
      </button>
    </div>
  );
}

function VideoPlayOverlay({ compact = false }: { compact?: boolean }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-[3] flex items-center justify-center">
      <span
        className={`grid place-items-center rounded-full bg-black/48 text-white/95 shadow-[0_8px_18px_rgba(0,0,0,0.38)] ${
          compact ? 'h-8 w-8' : 'h-11 w-11'
        }`}
      >
        <PlayIcon size={compact ? 14 : 20} className="translate-x-[1px]" />
      </span>
    </span>
  );
}

function IncomingDownloadOverlay({
  phase,
  progress,
  indeterminate,
  onCancel,
  onAction,
}: {
  phase: IncomingImageLoadPhase;
  progress: number;
  indeterminate: boolean;
  onCancel: () => void;
  onAction: () => void;
}) {
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

  return (
    <div className="pointer-events-none absolute inset-0 z-[6] flex items-center justify-center bg-black/26 backdrop-blur-[1px]">
      <button
        type="button"
        aria-label={actionLabel}
        onClick={(event) => {
          event.stopPropagation();
          if (loading) {
            onCancel();
          } else {
            onAction();
          }
        }}
        className="pointer-events-auto relative grid h-[42px] w-[42px] place-items-center rounded-full bg-black/62 text-white shadow-[0_8px_18px_rgba(0,0,0,0.42)] transition-colors hover:bg-black/76"
      >
        <svg
          className={`pointer-events-none absolute inset-0 h-full w-full -rotate-90 ${loading && indeterminate ? 'animate-spin' : ''}`}
          viewBox="0 0 42 42"
          aria-hidden="true"
        >
          <circle
            cx="21"
            cy="21"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.28)"
            strokeWidth="2.2"
          />
          {loading ? (
            indeterminate ? (
              <circle
                cx="21"
                cy="21"
                r={radius}
                fill="none"
                stroke="rgba(255,255,255,0.95)"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeDasharray={`${circumference * 0.3} ${circumference}`}
              />
            ) : (
              <circle
                cx="21"
                cy="21"
                r={radius}
                fill="none"
                stroke="rgba(255,255,255,0.95)"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
              />
            )
          ) : retryable ? (
            <circle
              cx="21"
              cy="21"
              r={radius}
              fill="none"
              stroke="rgba(255,255,255,0.95)"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeDasharray={`${circumference * 0.24} ${circumference}`}
            />
          ) : null}
        </svg>
        {loading ? (
          <span className="relative block h-[14px] w-[14px]">
            <span className="absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 rotate-45 rounded-full bg-white" />
            <span className="absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 -rotate-45 rounded-full bg-white" />
          </span>
        ) : manual ? (
          <span className="relative block h-[14px] w-[14px]">
            <span className="absolute left-1/2 top-[1px] h-[8px] w-[2px] -translate-x-1/2 rounded-full bg-white" />
            <span className="absolute left-1/2 top-[7px] h-[6px] w-[6px] -translate-x-1/2 rotate-45 border-b-[2px] border-r-[2px] border-white" />
            <span className="absolute left-1/2 bottom-[-1px] h-[2px] w-[8px] -translate-x-1/2 rounded-full bg-white" />
          </span>
        ) : (
          <span className="relative block h-[14px] w-[14px]">
            <span className="absolute left-1/2 top-[1px] h-[7px] w-[2px] -translate-x-1/2 rounded-full bg-white" />
            <span className="absolute left-1/2 top-[5px] h-[7px] w-[7px] -translate-x-1/2 rotate-45 border-b-[2px] border-r-[2px] border-white" />
          </span>
        )}
      </button>
    </div>
  );
}

function toIncomingLoadPhase(phase: string, manual: boolean): IncomingImageLoadPhase {
  if (phase === 'ready') return 'ready';
  if (phase === 'error') return 'error';
  if (phase === 'paused') return manual ? 'manual' : 'canceled';
  if (phase === 'canceled') return 'canceled';
  return 'loading';
}

const normalizeAspectRatio = (value?: number) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }
  return Math.min(4, Math.max(0.25, value));
};

function PlaceholderLayer({
  strippedPreviewUrl,
  previewUrl,
  strippedBlurPx = 14,
  previewBlurPx = 6,
}: {
  strippedPreviewUrl?: string;
  previewUrl?: string;
  strippedBlurPx?: number;
  previewBlurPx?: number;
}) {
  const source = strippedPreviewUrl || previewUrl;
  if (!source) {
    return <span className="absolute inset-0 bg-[#1f2129]" />;
  }

  const isStripped = source === strippedPreviewUrl;
  return (
    <span
      className="absolute inset-0"
      style={{
        backgroundImage: `url(${source})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        filter: `blur(${isStripped ? strippedBlurPx : previewBlurPx}px)`,
        transform: 'scale(1.06)',
      }}
    />
  );
}

function ProgressiveIncomingImage({
  src,
  strippedPreviewUrl,
  previewUrl,
  sizeBytes,
  alt,
  isOwnMessage,
  preferredAspectRatio,
  disableProgressive = false,
  onOpenMedia,
  buttonClassName,
  imageClassName,
  imageStyle,
  ariaLabel = 'Open media',
}: {
  src: string;
  strippedPreviewUrl?: string;
  previewUrl?: string;
  sizeBytes?: number;
  alt: string;
  isOwnMessage: boolean;
  preferredAspectRatio?: number;
  disableProgressive?: boolean;
  onOpenMedia?: () => void;
  buttonClassName: string;
  imageClassName: string;
  imageStyle?: CSSProperties;
  ariaLabel?: string;
}) {
  const supportsProgressiveDownload =
    !disableProgressive && isManagedMediaSourceUrl(src);
  const { ref: viewportRef, isInViewport } = useViewportPresence<HTMLDivElement>({
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
  const phase: IncomingImageLoadPhase = supportsProgressiveDownload
    ? toIncomingLoadPhase(managedDownload.phase, managedDownload.snapshot.manual)
    : 'ready';
  const progress = supportsProgressiveDownload ? managedDownload.progress : 100;
  const indeterminate = supportsProgressiveDownload
    ? managedDownload.indeterminate
    : false;
  const resolvedSrc = supportsProgressiveDownload
    ? managedDownload.resolvedUrl || ''
    : src;
  const [resolvedAspectRatio, setResolvedAspectRatio] = useState<number | undefined>(
    normalizeAspectRatio(preferredAspectRatio)
  );
  useEffect(() => {
    const normalized = normalizeAspectRatio(preferredAspectRatio);
    if (normalized) {
      setResolvedAspectRatio(normalized);
    }
  }, [preferredAspectRatio]);
  useEffect(() => {
    if (resolvedAspectRatio) return;
    const candidate = previewUrl || strippedPreviewUrl || '';
    if (!candidate) return;

    let cancelled = false;
    const probe = new Image();
    probe.decoding = 'async';
    probe.onload = () => {
      if (cancelled) return;
      const width = probe.naturalWidth || 0;
      const height = probe.naturalHeight || 0;
      if (width > 0 && height > 0) {
        setResolvedAspectRatio(width / height);
      }
    };
    probe.src = candidate;
    return () => {
      cancelled = true;
      probe.onload = null;
    };
  }, [resolvedAspectRatio, previewUrl, strippedPreviewUrl]);
  const [isImageVisible, setIsImageVisible] = useState(false);
  const [showPlaceholderLayer, setShowPlaceholderLayer] = useState(true);
  useEffect(() => {
    setIsImageVisible(false);
    if (!resolvedSrc) {
      setShowPlaceholderLayer(true);
      return;
    }
  }, [resolvedSrc]);
  useEffect(() => {
    if (!resolvedSrc) {
      setShowPlaceholderLayer(true);
      return;
    }
    if (supportsProgressiveDownload && phase !== 'ready') {
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
  }, [isImageVisible, phase, resolvedSrc, supportsProgressiveDownload]);

  const canOpen = !!onOpenMedia && (!supportsProgressiveDownload || phase === 'ready');
  const shouldShowPlaceholder = showPlaceholderLayer;
  const buttonStyle: CSSProperties | undefined = resolvedAspectRatio
    ? {
        ...(imageStyle || {}),
        aspectRatio: resolvedAspectRatio,
      }
    : imageStyle;

  return (
    <div ref={viewportRef} className="relative h-full w-full">
      <button
        type="button"
        onClick={() => {
          if (!canOpen) return;
          onOpenMedia?.();
        }}
        className={`${buttonClassName} ${canOpen ? 'cursor-zoom-in' : 'cursor-default'}`}
        aria-label={ariaLabel}
        style={buttonStyle}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 transition-opacity duration-300 ${
            shouldShowPlaceholder ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <PlaceholderLayer
            strippedPreviewUrl={strippedPreviewUrl}
            previewUrl={previewUrl}
            strippedBlurPx={15}
            previewBlurPx={5}
          />
        </span>
        {resolvedSrc ? (
          <img
            src={resolvedSrc}
            alt={alt}
            className={`${imageClassName} transition-opacity duration-300 ${
              isImageVisible ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={(event) => {
              const target = event.currentTarget;
              const width = target.naturalWidth || 0;
              const height = target.naturalHeight || 0;
              if (width > 0 && height > 0) {
                setResolvedAspectRatio(width / height);
              }
              setIsImageVisible(true);
            }}
            loading="lazy"
            decoding="async"
            draggable={false}
          />
        ) : null}
      </button>

      {supportsProgressiveDownload && phase !== 'ready' ? (
        <IncomingDownloadOverlay
          phase={phase}
          progress={progress}
          indeterminate={indeterminate}
          onCancel={() => managedDownload.cancel()}
          onAction={() => {
            if (managedDownload.phase === 'error') {
              managedDownload.retry();
            } else {
              managedDownload.start();
            }
          }}
        />
      ) : null}
    </div>
  );
}

function ProgressiveIncomingVideo({
  src,
  strippedPreviewUrl,
  previewUrl,
  contentType,
  sizeBytes,
  isOwnMessage,
  disableProgressive = false,
  onOpenMedia,
  buttonClassName,
  videoClassName,
  videoStyle,
  compactPlayIcon = false,
  ariaLabel = 'Open media',
}: {
  src: string;
  strippedPreviewUrl?: string;
  previewUrl?: string;
  contentType?: string;
  sizeBytes?: number;
  isOwnMessage: boolean;
  disableProgressive?: boolean;
  onOpenMedia?: () => void;
  buttonClassName: string;
  videoClassName: string;
  videoStyle?: CSSProperties;
  compactPlayIcon?: boolean;
  ariaLabel?: string;
}) {
  const supportsProgressiveDownload =
    !disableProgressive && isManagedMediaSourceUrl(src);
  const { ref: viewportRef, isInViewport } = useViewportPresence<HTMLDivElement>({
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
  const phase: IncomingImageLoadPhase = supportsProgressiveDownload
    ? toIncomingLoadPhase(managedDownload.phase, managedDownload.snapshot.manual)
    : 'ready';
  const progress = supportsProgressiveDownload ? managedDownload.progress : 100;
  const indeterminate = supportsProgressiveDownload
    ? managedDownload.indeterminate
    : false;
  const resolvedSrc = supportsProgressiveDownload
    ? managedDownload.resolvedUrl || ''
    : src;
  const [isVideoVisible, setIsVideoVisible] = useState(false);
  const [showPlaceholderLayer, setShowPlaceholderLayer] = useState(true);
  const [generatedPosterUrl, setGeneratedPosterUrl] = useState<string | undefined>(undefined);
  const [posterFailed, setPosterFailed] = useState(false);
  const [resolvedAspectRatio, setResolvedAspectRatio] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!resolvedSrc) {
      setGeneratedPosterUrl(undefined);
      setResolvedAspectRatio(undefined);
      return;
    }
    const cachedPoster = getCachedVideoPosterUrl(resolvedSrc);
    const cachedAspectRatio = getCachedVideoAspectRatio(resolvedSrc);
    setResolvedAspectRatio(cachedAspectRatio);
    if (cachedPoster) {
      setGeneratedPosterUrl(cachedPoster);
      return;
    }
    setGeneratedPosterUrl(undefined);
  }, [previewUrl, strippedPreviewUrl, resolvedSrc]);

  useEffect(() => {
    if (!resolvedSrc) {
      return;
    }
    if (supportsProgressiveDownload && phase !== 'ready') {
      return;
    }

    const cachedAspectRatio = getCachedVideoAspectRatio(resolvedSrc);
    if (cachedAspectRatio) {
      setResolvedAspectRatio(cachedAspectRatio);
      return;
    }

    let cancelled = false;
    const probe = document.createElement('video');
    probe.preload = 'metadata';
    probe.muted = true;
    probe.playsInline = true;

    const cleanup = () => {
      probe.removeEventListener('loadedmetadata', onLoadedMetadata);
      probe.removeEventListener('error', onError);
      probe.removeAttribute('src');
      probe.load();
    };

    const onLoadedMetadata = () => {
      if (cancelled) {
        cleanup();
        return;
      }
      const width = probe.videoWidth || 0;
      const height = probe.videoHeight || 0;
      if (width > 0 && height > 0) {
        setResolvedAspectRatio(width / height);
      }
      cleanup();
    };

    const onError = () => {
      cleanup();
    };

    probe.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
    probe.addEventListener('error', onError, { once: true });
    probe.src = resolvedSrc;
    probe.load();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [resolvedSrc, supportsProgressiveDownload, phase]);

  useEffect(() => {
    if (previewUrl || strippedPreviewUrl || !resolvedSrc) {
      return;
    }
    if (supportsProgressiveDownload && phase !== 'ready') {
      return;
    }

    const cachedPoster = getCachedVideoPosterUrl(resolvedSrc);
    const cachedAspectRatio = getCachedVideoAspectRatio(resolvedSrc);
    if (cachedAspectRatio) {
      setResolvedAspectRatio(cachedAspectRatio);
    }
    if (cachedPoster) {
      setGeneratedPosterUrl(cachedPoster);
      return;
    }

    let cancelled = false;
    void (async () => {
      const meta = await ensureVideoPosterMeta(resolvedSrc);
      if (cancelled || !meta) {
        return;
      }
      setGeneratedPosterUrl(meta.posterDataUrl);
      setResolvedAspectRatio(meta.aspectRatio);
    })();

    return () => {
      cancelled = true;
    };
  }, [previewUrl, strippedPreviewUrl, resolvedSrc, supportsProgressiveDownload, phase]);

  const resolvedPosterUrl = previewUrl || strippedPreviewUrl || generatedPosterUrl;
  useEffect(() => {
    setPosterFailed(false);
  }, [resolvedPosterUrl, resolvedSrc]);

  useEffect(() => {
    setIsVideoVisible(false);
    if (!resolvedSrc) {
      setShowPlaceholderLayer(true);
      return;
    }
  }, [resolvedSrc]);
  useEffect(() => {
    if (!resolvedSrc) {
      setShowPlaceholderLayer(true);
      return;
    }
    if (supportsProgressiveDownload && phase !== 'ready') {
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
  }, [isVideoVisible, phase, resolvedSrc, supportsProgressiveDownload]);

  const canOpen = !!onOpenMedia && (!supportsProgressiveDownload || phase === 'ready');
  const useFallbackVideoFrame = !resolvedPosterUrl || posterFailed;
  const showPlaceholder = showPlaceholderLayer;
  const displayAspectRatio = resolvedAspectRatio || 16 / 9;
  const effectiveVideoStyle: CSSProperties = {
    ...videoStyle,
    aspectRatio: displayAspectRatio,
  };
  const skeletonStyle: CSSProperties = {
    ...effectiveVideoStyle,
  };

  return (
    <div ref={viewportRef} className="relative h-full w-full">
      <button
        type="button"
        onClick={() => {
          if (!canOpen) return;
          onOpenMedia?.();
        }}
        className={`${buttonClassName} ${canOpen ? 'cursor-zoom-in' : 'cursor-default'}`}
        aria-label={ariaLabel}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 transition-opacity duration-300 ${
            showPlaceholder ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <PlaceholderLayer
            strippedPreviewUrl={strippedPreviewUrl}
            previewUrl={previewUrl}
            strippedBlurPx={14}
            previewBlurPx={4}
          />
        </span>
        {resolvedSrc ? (
          useFallbackVideoFrame ? (
            <video
              src={resolvedSrc}
              className={`${videoClassName} transition-opacity duration-300 ${
                isVideoVisible ? 'opacity-100' : 'opacity-0'
              }`}
              style={effectiveVideoStyle}
              playsInline
              preload={resolvedPosterUrl ? 'metadata' : 'auto'}
              controls={false}
              muted
              onLoadedData={() => setIsVideoVisible(true)}
              onCanPlay={() => setIsVideoVisible(true)}
              onLoadedMetadata={() => {
                if (resolvedPosterUrl) {
                  setIsVideoVisible(true);
                }
              }}
            >
              <source src={resolvedSrc} type={contentType || 'video/mp4'} />
            </video>
          ) : resolvedPosterUrl ? (
            <img
              src={resolvedPosterUrl}
              alt="Video preview"
              className={`${videoClassName} transition-opacity duration-300 ${
                isVideoVisible ? 'opacity-100' : 'opacity-0'
              }`}
              style={effectiveVideoStyle}
              loading="lazy"
              decoding="async"
              draggable={false}
              onLoad={() => setIsVideoVisible(true)}
              onError={() => {
                setPosterFailed(true);
                setIsVideoVisible(false);
              }}
            />
          ) : (
            <span
              aria-hidden="true"
              className={`${videoClassName} block bg-[#1f2129]`}
              style={skeletonStyle}
            />
          )
        ) : null}
        <VideoPlayOverlay compact={compactPlayIcon} />
      </button>

      {supportsProgressiveDownload && phase !== 'ready' ? (
        <IncomingDownloadOverlay
          phase={phase}
          progress={progress}
          indeterminate={indeterminate}
          onCancel={() => managedDownload.cancel()}
          onAction={() => {
            if (managedDownload.phase === 'error') {
              managedDownload.retry();
            } else {
              managedDownload.start();
            }
          }}
        />
      ) : null}
    </div>
  );
}

function ImageGrid({
  mediaItems,
  isOwn,
  uploadStates,
  onCancelUploadAt,
  onOpenMediaAt,
}: {
  mediaItems: ImageBubbleMediaItem[];
  isOwn: boolean;
  uploadStates?: Array<ImageUploadState | undefined>;
  onCancelUploadAt?: (visibleIndex: number) => void;
  onOpenMediaAt?: (visibleIndex: number) => void;
}) {
  const rows = buildImageGridRows(mediaItems);
  let visibleMediaIndex = 0;
  return (
    <div className="relative w-full overflow-hidden bg-black">
      <div className="flex flex-col gap-[2px]">
        {rows.map((row, rowIndex) => (
          <div
            key={`image-row-${rowIndex}`}
            className="grid gap-[2px]"
            style={{ gridTemplateColumns: `repeat(${row.columns}, minmax(0, 1fr))` }}
          >
            {row.items.map((mediaItem, imageIndex) => (
              (() => {
                const currentVisibleIndex = visibleMediaIndex;
                visibleMediaIndex += 1;
                const uploadState = uploadStates?.[currentVisibleIndex];
                return (
                  <div
                    key={`${mediaItem.url}-${mediaItem.mediaType}-${rowIndex}-${imageIndex}`}
                    className={`relative overflow-hidden bg-black/30 ${
                      row.columns === 1 ? 'aspect-[16/10]' : 'aspect-square'
                    }`}
                  >
                    {mediaItem.mediaType === 'video' ? (
                      <ProgressiveIncomingVideo
                        src={mediaItem.url}
                        strippedPreviewUrl={mediaItem.strippedPreviewUrl}
                        previewUrl={mediaItem.previewUrl}
                        contentType={mediaItem.contentType}
                        sizeBytes={mediaItem.sizeBytes}
                        isOwnMessage={isOwn}
                        disableProgressive={!!uploadState}
                        onOpenMedia={
                          onOpenMediaAt ? () => onOpenMediaAt(currentVisibleIndex) : undefined
                        }
                        buttonClassName="block h-full w-full"
                        videoClassName="pointer-events-none h-full w-full object-cover"
                        compactPlayIcon
                      />
                    ) : (
                      <ProgressiveIncomingImage
                        src={mediaItem.url}
                        strippedPreviewUrl={mediaItem.strippedPreviewUrl}
                        previewUrl={mediaItem.previewUrl}
                        sizeBytes={mediaItem.sizeBytes}
                        alt="Image message"
                        isOwnMessage={isOwn}
                        disableProgressive={!!uploadState}
                        onOpenMedia={
                          onOpenMediaAt ? () => onOpenMediaAt(currentVisibleIndex) : undefined
                        }
                        buttonClassName="block h-full w-full"
                        imageClassName="h-full w-full object-cover"
                      />
                    )}
                    {uploadState ? (
                      <UploadOverlay
                        uploadState={uploadState}
                        onCancel={
                          onCancelUploadAt && uploadState.cancelable
                            ? () => onCancelUploadAt(currentVisibleIndex)
                            : undefined
                        }
                      />
                    ) : null}
                  </div>
                );
              })()
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ReplyPreviewBlock({
  replyPreview,
  isOwn,
}: {
  replyPreview: ReplyPreview;
  isOwn: boolean;
}) {
  return (
    <div
      className={`mb-[7px] overflow-hidden rounded-[12px] ${
        isOwn ? 'bg-white/18' : 'bg-white/8'
      }`}
    >
      <div className="flex">
        <span className={`w-[4px] ${isOwn ? 'bg-white/85' : 'bg-[#b599ff]'}`} />
        <div className="min-w-0 px-[10px] py-[7px]">
          <div className={`truncate text-[15px] font-[700] leading-none ${isOwn ? 'text-white' : 'text-[#c0a7ff]'}`}>
            {replyPreview.author}
          </div>
          <div className={`mt-[4px] line-clamp-1 text-[15px] leading-none ${isOwn ? 'text-white/78' : 'text-white/66'}`}>
            {replyPreview.text}
          </div>
        </div>
      </div>
    </div>
  );
}

const resolveSingleMediaContainerStyle = (
  bubbleMaxWidthPx: number,
  aspectRatio?: number
): CSSProperties => {
  const normalizedAspectRatio = normalizeAspectRatio(aspectRatio);
  if (!normalizedAspectRatio) {
    return { maxWidth: bubbleMaxWidthPx };
  }

  const viewportHeight =
    typeof window !== 'undefined' && Number.isFinite(window.innerHeight)
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

export function SingleImageBubble({
  mediaItem,
  caption,
  captionEntities,
  bubbleMaxWidthPx,
  time,
  isOwn,
  isRead,
  status,
  isEdited,
  replyPreview,
  hideTail = false,
  uploadState,
  onCancelUpload,
  onOpenMedia,
}: SingleImageBubbleProps) {
  const normalizedCaption = (caption || '').trim();
  const hasCaption = normalizedCaption.length > 0;
  const useFramedBubble = hasCaption || !!replyPreview;
  const useCaptionStripLayout = hasCaption;
  const rootContainerStyle: CSSProperties =
    mediaItem.mediaType === 'video'
      ? { width: bubbleMaxWidthPx, maxWidth: '100%' }
      : resolveSingleMediaContainerStyle(bubbleMaxWidthPx, mediaItem.aspectRatio);
  const captionPaddingClass = isEdited
    ? (isOwn ? 'pr-[96px]' : 'pr-[82px]')
    : (isOwn ? 'pr-[56px]' : 'pr-[48px]');
  const editedLabelClass = useFramedBubble
    ? (isOwn ? 'text-white/62' : 'text-white/40')
    : 'text-white/80';

  if (!useFramedBubble) {
    return (
      <div className="relative inline-block" style={rootContainerStyle}>
        <div className="relative">
          {mediaItem.mediaType === 'video' ? (
            <ProgressiveIncomingVideo
              src={mediaItem.url}
              strippedPreviewUrl={mediaItem.strippedPreviewUrl}
              previewUrl={mediaItem.previewUrl}
              contentType={mediaItem.contentType}
              sizeBytes={mediaItem.sizeBytes}
              isOwnMessage={isOwn}
              disableProgressive={!!uploadState}
              onOpenMedia={onOpenMedia}
              buttonClassName="relative block w-full"
              videoClassName="pointer-events-none block h-auto max-h-[72vh] w-full max-w-full rounded-[18px] bg-black object-contain"
              videoStyle={{ width: '100%', maxWidth: '100%' }}
            />
          ) : (
            <ProgressiveIncomingImage
              src={mediaItem.url}
              strippedPreviewUrl={mediaItem.strippedPreviewUrl}
              previewUrl={mediaItem.previewUrl}
              sizeBytes={mediaItem.sizeBytes}
              preferredAspectRatio={mediaItem.aspectRatio}
              alt="Image message"
              isOwnMessage={isOwn}
              disableProgressive={!!uploadState}
              onOpenMedia={onOpenMedia}
              buttonClassName="block"
              imageClassName="block h-auto max-h-[72vh] w-auto max-w-full rounded-[18px] object-cover"
              imageStyle={{ maxWidth: bubbleMaxWidthPx }}
            />
          )}
          {uploadState ? (
            <UploadOverlay
              uploadState={uploadState}
              onCancel={uploadState.cancelable ? onCancelUpload : undefined}
            />
          ) : null}
        </div>
        <div className="absolute bottom-[8px] right-[10px] flex items-center gap-[2px] rounded-full bg-black/48 px-[7px] py-[3px] text-[14px] text-white/92 backdrop-blur-sm">
          <StatusLine
            isOwn={isOwn}
            isRead={isRead}
            status={status}
            isEdited={isEdited}
            time={time}
            editedClassName={editedLabelClass}
          />
        </div>
      </div>
    );
  }

  if (useCaptionStripLayout) {
    return (
      <div
        className="relative inline-block overflow-hidden rounded-[18px]"
        style={rootContainerStyle}
      >
        <div className="relative w-full overflow-hidden bg-black">
          {mediaItem.mediaType === 'image' ? (
            <>
              <span aria-hidden="true" className="pointer-events-none absolute inset-0">
                <PlaceholderLayer
                  strippedPreviewUrl={mediaItem.strippedPreviewUrl}
                  previewUrl={mediaItem.previewUrl || mediaItem.url}
                  strippedBlurPx={15}
                  previewBlurPx={5}
                />
              </span>
              <div className="relative flex w-full justify-center">
                <ProgressiveIncomingImage
                  src={mediaItem.url}
                  strippedPreviewUrl={mediaItem.strippedPreviewUrl}
                  previewUrl={mediaItem.previewUrl}
                  preferredAspectRatio={mediaItem.aspectRatio}
                  alt="Image message"
                  isOwnMessage={isOwn}
                  disableProgressive={!!uploadState}
                  onOpenMedia={onOpenMedia}
                  buttonClassName="block"
                  imageClassName="block h-auto max-h-[72vh] w-auto max-w-full object-contain"
                  imageStyle={{ maxWidth: bubbleMaxWidthPx }}
                />
              </div>
            </>
          ) : (
            <div className="relative flex w-full justify-center">
              <ProgressiveIncomingVideo
                src={mediaItem.url}
                strippedPreviewUrl={mediaItem.strippedPreviewUrl}
                previewUrl={mediaItem.previewUrl}
                contentType={mediaItem.contentType}
                sizeBytes={mediaItem.sizeBytes}
                isOwnMessage={isOwn}
                disableProgressive={!!uploadState}
                onOpenMedia={onOpenMedia}
                buttonClassName="relative block w-full"
                videoClassName="pointer-events-none block h-auto max-h-[72vh] w-full max-w-full bg-black object-contain"
                videoStyle={{ width: '100%', maxWidth: '100%' }}
              />
            </div>
          )}
          {uploadState ? (
            <UploadOverlay
              uploadState={uploadState}
              onCancel={uploadState.cancelable ? onCancelUpload : undefined}
            />
          ) : null}
        </div>
        <div
          className={`relative px-3 pb-2 pt-2 ${
            isOwn ? 'bg-[#967ef0] text-white' : 'bg-[#222327] text-white/95'
          }`}
        >
          {replyPreview ? <ReplyPreviewBlock replyPreview={replyPreview} isOwn={isOwn} /> : null}
          <div
            className={`whitespace-pre-line break-words text-[18px] leading-[1.22] tracking-[0.05px] ${captionPaddingClass}`}
          >
            {renderMessageContent(normalizedCaption, captionEntities)}
          </div>
          <div
            className={`absolute bottom-[6px] right-[10px] flex items-center gap-[2px] text-[14px] ${
              isOwn ? 'text-white/72' : 'text-white/48'
            }`}
          >
            <StatusLine
              isOwn={isOwn}
              isRead={isRead}
              status={status}
              isEdited={isEdited}
              time={time}
              editedClassName={editedLabelClass}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`tg-bubble relative inline-block overflow-hidden p-0 ${
        isOwn ? 'tg-right bg-[#967ef0] text-white' : 'tg-left bg-[#222327] text-white/95'
      } ${hideTail ? 'tg-tail-none' : ''}`}
      style={rootContainerStyle}
    >
      {replyPreview ? (
        <div className="px-3 pt-2">
          <ReplyPreviewBlock replyPreview={replyPreview} isOwn={isOwn} />
        </div>
      ) : null}

      <div className="relative">
        {mediaItem.mediaType === 'video' ? (
          <ProgressiveIncomingVideo
            src={mediaItem.url}
            strippedPreviewUrl={mediaItem.strippedPreviewUrl}
            previewUrl={mediaItem.previewUrl}
            contentType={mediaItem.contentType}
            sizeBytes={mediaItem.sizeBytes}
            isOwnMessage={isOwn}
            disableProgressive={!!uploadState}
            onOpenMedia={onOpenMedia}
            buttonClassName="relative block w-full"
            videoClassName="pointer-events-none block h-auto max-h-[72vh] w-full max-w-full bg-black object-contain"
            videoStyle={{ width: '100%', maxWidth: '100%' }}
          />
        ) : (
          <ProgressiveIncomingImage
            src={mediaItem.url}
            strippedPreviewUrl={mediaItem.strippedPreviewUrl}
            previewUrl={mediaItem.previewUrl}
            sizeBytes={mediaItem.sizeBytes}
            preferredAspectRatio={mediaItem.aspectRatio}
            alt="Image message"
            isOwnMessage={isOwn}
            disableProgressive={!!uploadState}
            onOpenMedia={onOpenMedia}
            buttonClassName="block"
            imageClassName="block h-auto max-h-[72vh] w-auto max-w-full object-cover"
            imageStyle={{ maxWidth: bubbleMaxWidthPx }}
          />
        )}
        {uploadState ? (
          <UploadOverlay
            uploadState={uploadState}
            onCancel={uploadState.cancelable ? onCancelUpload : undefined}
          />
        ) : null}
      </div>

      <div className="absolute bottom-[8px] right-[10px] flex items-center gap-[2px] rounded-full bg-black/48 px-[7px] py-[3px] text-[14px] text-white/92 backdrop-blur-sm">
        <StatusLine
          isOwn={isOwn}
          isRead={isRead}
          status={status}
          isEdited={isEdited}
          time={time}
          editedClassName={editedLabelClass}
        />
      </div>
    </div>
  );
}

export function MultiImageBubble({
  mediaItems,
  caption,
  captionEntities,
  bubbleMaxWidthPx,
  time,
  isOwn,
  isRead,
  status,
  isEdited,
  replyPreview,
  hideTail = false,
  uploadStates,
  onCancelUploadAt,
  onOpenMediaAt,
}: MultiImageBubbleProps) {
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
    return (
      <div
        className="relative inline-block overflow-hidden rounded-[18px]"
        style={{ maxWidth: bubbleMaxWidthPx }}
      >
        <ImageGrid
          mediaItems={mediaItems}
          isOwn={isOwn}
          uploadStates={uploadStates}
          onCancelUploadAt={onCancelUploadAt}
          onOpenMediaAt={onOpenMediaAt}
        />
        <div className="absolute bottom-[8px] right-[10px] flex items-center gap-[2px] rounded-full bg-black/48 px-[7px] py-[3px] text-[14px] text-white/92 backdrop-blur-sm">
          <StatusLine
            isOwn={isOwn}
            isRead={isRead}
            status={status}
            isEdited={isEdited}
            time={time}
            editedClassName={editedLabelClass}
          />
        </div>
      </div>
    );
  }

  if (useCaptionStripLayout) {
    return (
      <div
        className="relative inline-block overflow-hidden rounded-[18px]"
        style={{ maxWidth: bubbleMaxWidthPx }}
      >
        <ImageGrid
          mediaItems={mediaItems}
          isOwn={isOwn}
          uploadStates={uploadStates}
          onCancelUploadAt={onCancelUploadAt}
          onOpenMediaAt={onOpenMediaAt}
        />
        <div
          className={`relative px-3 pb-2 pt-2 ${
            isOwn ? 'bg-[#967ef0] text-white' : 'bg-[#222327] text-white/95'
          }`}
        >
          {replyPreview ? <ReplyPreviewBlock replyPreview={replyPreview} isOwn={isOwn} /> : null}
          <div
            className={`whitespace-pre-line break-words text-[18px] leading-[1.22] tracking-[0.05px] ${captionPaddingClass}`}
          >
            {renderMessageContent(normalizedCaption, captionEntities)}
          </div>
          <div
            className={`absolute bottom-[6px] right-[10px] flex items-center gap-[2px] text-[14px] ${
              isOwn ? 'text-white/72' : 'text-white/48'
            }`}
          >
            <StatusLine
              isOwn={isOwn}
              isRead={isRead}
              status={status}
              isEdited={isEdited}
              time={time}
              editedClassName={editedLabelClass}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`tg-bubble relative inline-block overflow-hidden p-0 ${
        isOwn ? 'tg-right bg-[#967ef0] text-white' : 'tg-left bg-[#222327] text-white/95'
      } ${hideTail ? 'tg-tail-none' : ''}`}
      style={{ maxWidth: bubbleMaxWidthPx }}
    >
      {replyPreview ? (
        <div className="px-3 pt-2">
          <ReplyPreviewBlock replyPreview={replyPreview} isOwn={isOwn} />
        </div>
      ) : null}
      <ImageGrid
        mediaItems={mediaItems}
        isOwn={isOwn}
        uploadStates={uploadStates}
        onCancelUploadAt={onCancelUploadAt}
        onOpenMediaAt={onOpenMediaAt}
      />
      <div className="absolute bottom-[8px] right-[10px] flex items-center gap-[2px] rounded-full bg-black/48 px-[7px] py-[3px] text-[14px] text-white/92 backdrop-blur-sm">
        <StatusLine
          isOwn={isOwn}
          isRead={isRead}
          status={status}
          isEdited={isEdited}
          time={time}
          editedClassName={editedLabelClass}
        />
      </div>
    </div>
  );
}
