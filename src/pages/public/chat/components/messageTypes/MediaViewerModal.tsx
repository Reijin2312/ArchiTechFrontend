import { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon, PlayIcon } from '../../icons';
import { formatFileSize } from '../../utils';

export type MediaViewerItem = {
  url: string;
  mediaType: 'image' | 'video';
  contentType?: string;
  fileName?: string;
  sizeBytes?: number;
  senderName: string;
  createdAt: string;
};

type MediaViewerModalProps = {
  items: MediaViewerItem[];
  activeIndex: number;
  onClose: () => void;
  onChangeIndex: (nextIndex: number) => void;
};

const formatViewerTimestamp = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const buildTypeLabel = (item: MediaViewerItem) => {
  const contentType = (item.contentType || '').trim();
  if (contentType) return contentType;
  return item.mediaType === 'video' ? 'video/mp4' : 'image/jpeg';
};

export function MediaViewerModal({
  items,
  activeIndex,
  onClose,
  onChangeIndex,
}: MediaViewerModalProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const safeIndex = Math.max(0, Math.min(items.length - 1, activeIndex));
  const activeItem = items[safeIndex];
  const hasMany = items.length > 1;

  const metaLine = useMemo(() => {
    if (!activeItem) return '';
    const size = formatFileSize(activeItem.sizeBytes);
    const type = buildTypeLabel(activeItem);
    return size ? `${type} • ${size}` : type;
  }, [activeItem]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (!hasMany) return;
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        onChangeIndex((safeIndex - 1 + items.length) % items.length);
      } else if (event.key === 'ArrowRight') {
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
  }, [hasMany, items.length, onChangeIndex, onClose, safeIndex]);

  if (!activeItem) {
    return null;
  }

  const content = (
    <div
      className="fixed inset-0 z-[1000] bg-black/95"
      onClick={(event) => {
        if (event.target === containerRef.current) {
          onClose();
        }
      }}
      ref={containerRef}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-end px-4 pb-3 pt-3 sm:px-6">
        <div className="pointer-events-auto flex items-center gap-2">
          <div className="rounded-full bg-black/58 px-3 py-1 text-[12px] font-[600] text-white/82">
            {safeIndex + 1} / {items.length}
          </div>
          <a
            href={activeItem.url}
            download={activeItem.fileName || undefined}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-black/58 px-3 py-1 text-[12px] font-[600] text-white/90 transition-colors hover:bg-black/74"
          >
            Download
          </a>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-full bg-black/58 text-white/92 transition-colors hover:bg-black/74"
            aria-label="Close media viewer"
          >
            <CloseIcon size={18} strokeWidth={2.4} />
          </button>
        </div>
      </div>

      {hasMany ? (
        <>
          <button
            type="button"
            onClick={() => onChangeIndex((safeIndex - 1 + items.length) % items.length)}
            className="absolute left-4 top-1/2 z-20 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-black/58 text-white/90 transition-colors hover:bg-black/74"
            aria-label="Previous media"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M14.5 5 8 12l6.5 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => onChangeIndex((safeIndex + 1) % items.length)}
            className="absolute right-4 top-1/2 z-20 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-black/58 text-white/90 transition-colors hover:bg-black/74"
            aria-label="Next media"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="m9.5 5 6.5 7-6.5 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </>
      ) : null}

      <div className="absolute inset-0 flex items-center justify-center px-4 py-16 sm:px-12 sm:py-20">
        {activeItem.mediaType === 'video' ? (
          <video
            key={activeItem.url}
            src={activeItem.url}
            controls
            autoPlay
            playsInline
            preload="metadata"
            className="max-h-[calc(100vh-110px)] max-w-[calc(100vw-72px)] bg-black object-contain shadow-[0_20px_56px_rgba(0,0,0,0.62)]"
          />
        ) : (
          <img
            src={activeItem.url}
            alt={activeItem.fileName || 'Media'}
            className="max-h-[calc(100vh-110px)] max-w-[calc(100vw-72px)] object-contain shadow-[0_20px_56px_rgba(0,0,0,0.62)]"
          />
        )}
      </div>

      <div className="pointer-events-none absolute bottom-4 left-4 z-20 max-w-[min(70vw,560px)] rounded-xl bg-black/58 px-4 py-3 text-white shadow-[0_14px_36px_rgba(0,0,0,0.45)] sm:bottom-6 sm:left-6">
        <div className="truncate text-[16px] font-[700] text-white">{activeItem.senderName}</div>
        <div className="truncate text-[13px] text-white/78">{formatViewerTimestamp(activeItem.createdAt)}</div>
        <div className="mt-[2px] truncate text-[12px] text-white/68">{metaLine}</div>
        {activeItem.mediaType === 'video' ? (
          <div className="mt-1 inline-flex items-center gap-1 text-[12px] text-white/62">
            <PlayIcon size={12} />
            Video
          </div>
        ) : null}
      </div>
    </div>
  );

  if (typeof document === 'undefined') {
    return content;
  }

  return createPortal(content, document.body);
}
