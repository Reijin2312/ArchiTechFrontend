import type { ChatMessage } from '@/shared/api/types';
import { renderMessageContent } from '@/shared/utils/chatTextEntities';
import { CheckCheckIcon, PlayIcon } from '../../icons';
import { buildImageGridRows } from './imageGridPattern';

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
  mediaType: 'image' | 'video';
  contentType?: string;
};

type StatusLineProps = {
  isOwn: boolean;
  isRead: boolean;
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
          <CheckCheckIcon
            size={15}
            strokeWidth={2.25}
            className={`origin-center scale-[1.85] ${isRead ? 'text-[#d8fff0]' : ''}`}
          />
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

function ImageGrid({
  mediaItems,
  uploadStates,
  onCancelUploadAt,
  onOpenMediaAt,
}: {
  mediaItems: ImageBubbleMediaItem[];
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
                    <button
                      type="button"
                      onClick={() => onOpenMediaAt?.(currentVisibleIndex)}
                      className={`block h-full w-full ${onOpenMediaAt ? 'cursor-zoom-in' : 'cursor-default'}`}
                      aria-label="Open media"
                    >
                      {mediaItem.mediaType === 'video' ? (
                        <>
                          <video
                            src={mediaItem.url}
                            className="pointer-events-none h-full w-full object-cover"
                            playsInline
                            preload="metadata"
                            controls={false}
                            muted
                          />
                          <VideoPlayOverlay compact />
                        </>
                      ) : (
                        <img src={mediaItem.url} alt="Image message" className="h-full w-full object-cover" />
                      )}
                    </button>
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

export function SingleImageBubble({
  mediaItem,
  caption,
  captionEntities,
  bubbleMaxWidthPx,
  time,
  isOwn,
  isRead,
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
  const captionPaddingClass = isEdited
    ? (isOwn ? 'pr-[96px]' : 'pr-[82px]')
    : (isOwn ? 'pr-[56px]' : 'pr-[48px]');
  const editedLabelClass = useFramedBubble
    ? (isOwn ? 'text-white/62' : 'text-white/40')
    : 'text-white/80';

  if (!useFramedBubble) {
    return (
      <div className="relative inline-block" style={{ maxWidth: bubbleMaxWidthPx }}>
        <div className="relative">
          {mediaItem.mediaType === 'video' ? (
            <button
              type="button"
              onClick={onOpenMedia}
              className={`relative block ${onOpenMedia ? 'cursor-zoom-in' : 'cursor-default'}`}
              aria-label="Open media"
            >
              <video
                src={mediaItem.url}
                controls={false}
                playsInline
                preload="metadata"
                muted
                className="pointer-events-none block h-auto max-h-[72vh] w-auto max-w-full rounded-[18px] bg-black object-contain"
                style={{ maxWidth: bubbleMaxWidthPx }}
              />
              <VideoPlayOverlay />
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenMedia}
              className={`block ${onOpenMedia ? 'cursor-zoom-in' : 'cursor-default'}`}
              aria-label="Open media"
            >
              <img
                src={mediaItem.url}
                alt="Image message"
                className="block h-auto max-h-[72vh] w-auto max-w-full rounded-[18px] object-cover"
                style={{ maxWidth: bubbleMaxWidthPx }}
              />
            </button>
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
        <div className="relative w-full overflow-hidden bg-black">
          {mediaItem.mediaType === 'image' ? (
            <>
              <img
                src={mediaItem.url}
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 h-full w-full scale-[1.16] object-cover blur-2xl brightness-[0.88]"
              />
              <div className="relative flex w-full justify-center">
                <button
                  type="button"
                  onClick={onOpenMedia}
                  className={`block ${onOpenMedia ? 'cursor-zoom-in' : 'cursor-default'}`}
                  aria-label="Open media"
                >
                  <img
                    src={mediaItem.url}
                    alt="Image message"
                    className="block h-auto max-h-[72vh] w-auto max-w-full object-contain"
                    style={{ maxWidth: bubbleMaxWidthPx }}
                  />
                </button>
              </div>
            </>
          ) : (
            <div className="relative flex w-full justify-center">
              <button
                type="button"
                onClick={onOpenMedia}
                className={`relative block ${onOpenMedia ? 'cursor-zoom-in' : 'cursor-default'}`}
                aria-label="Open media"
              >
                <video
                  src={mediaItem.url}
                  controls={false}
                  playsInline
                  preload="metadata"
                  muted
                  className="pointer-events-none block h-auto max-h-[72vh] w-auto max-w-full bg-black object-contain"
                  style={{ maxWidth: bubbleMaxWidthPx }}
                />
                <VideoPlayOverlay />
              </button>
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

      <div className="relative">
        {mediaItem.mediaType === 'video' ? (
          <button
            type="button"
            onClick={onOpenMedia}
            className={`relative block ${onOpenMedia ? 'cursor-zoom-in' : 'cursor-default'}`}
            aria-label="Open media"
          >
            <video
              src={mediaItem.url}
              controls={false}
              playsInline
              preload="metadata"
              muted
              className="pointer-events-none block h-auto max-h-[72vh] w-auto max-w-full bg-black object-contain"
              style={{ maxWidth: bubbleMaxWidthPx }}
            />
            <VideoPlayOverlay />
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenMedia}
            className={`block ${onOpenMedia ? 'cursor-zoom-in' : 'cursor-default'}`}
            aria-label="Open media"
          >
            <img
              src={mediaItem.url}
              alt="Image message"
              className="block h-auto max-h-[72vh] w-auto max-w-full object-cover"
              style={{ maxWidth: bubbleMaxWidthPx }}
            />
          </button>
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
          uploadStates={uploadStates}
          onCancelUploadAt={onCancelUploadAt}
          onOpenMediaAt={onOpenMediaAt}
        />
        <div className="absolute bottom-[8px] right-[10px] flex items-center gap-[2px] rounded-full bg-black/48 px-[7px] py-[3px] text-[14px] text-white/92 backdrop-blur-sm">
          <StatusLine
            isOwn={isOwn}
            isRead={isRead}
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
        uploadStates={uploadStates}
        onCancelUploadAt={onCancelUploadAt}
        onOpenMediaAt={onOpenMediaAt}
      />
      <div className="absolute bottom-[8px] right-[10px] flex items-center gap-[2px] rounded-full bg-black/48 px-[7px] py-[3px] text-[14px] text-white/92 backdrop-blur-sm">
        <StatusLine
          isOwn={isOwn}
          isRead={isRead}
          isEdited={isEdited}
          time={time}
          editedClassName={editedLabelClass}
        />
      </div>
    </div>
  );
}
