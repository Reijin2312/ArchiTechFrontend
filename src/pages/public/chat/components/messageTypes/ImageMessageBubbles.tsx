import type { ChatMessage } from '@/shared/api/types';
import { renderMessageContent } from '@/shared/utils/chatTextEntities';
import { CheckCheckIcon } from '../../icons';
import { buildImageGridRows } from './imageGridPattern';

export type ReplyPreview = {
  author: string;
  text: string;
};

type StatusLineProps = {
  isOwn: boolean;
  isRead: boolean;
  isEdited: boolean;
  time: string;
  editedClassName: string;
};

type SingleImageBubbleProps = {
  imageUrl: string;
  caption?: string;
  captionEntities?: ChatMessage['entities'];
  bubbleMaxWidthPx: number;
  time: string;
  isOwn: boolean;
  isRead: boolean;
  isEdited: boolean;
  replyPreview?: ReplyPreview;
  hideTail?: boolean;
};

type MultiImageBubbleProps = {
  imageUrls: string[];
  caption?: string;
  captionEntities?: ChatMessage['entities'];
  bubbleMaxWidthPx: number;
  time: string;
  isOwn: boolean;
  isRead: boolean;
  isEdited: boolean;
  replyPreview?: ReplyPreview;
  hideTail?: boolean;
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

function ImageGrid({
  imageUrls,
}: {
  imageUrls: string[];
}) {
  const rows = buildImageGridRows(imageUrls);
  return (
    <div className="relative w-full overflow-hidden bg-black">
      <div className="flex flex-col gap-[2px]">
        {rows.map((row, rowIndex) => (
          <div
            key={`image-row-${rowIndex}`}
            className="grid gap-[2px]"
            style={{ gridTemplateColumns: `repeat(${row.columns}, minmax(0, 1fr))` }}
          >
            {row.items.map((imageUrl, imageIndex) => (
              <div
                key={`${imageUrl}-${rowIndex}-${imageIndex}`}
                className={`relative overflow-hidden bg-black/30 ${
                  row.columns === 1 ? 'aspect-[16/10]' : 'aspect-square'
                }`}
              >
                <img src={imageUrl} alt="Image message" className="h-full w-full object-cover" />
              </div>
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
  imageUrl,
  caption,
  captionEntities,
  bubbleMaxWidthPx,
  time,
  isOwn,
  isRead,
  isEdited,
  replyPreview,
  hideTail = false,
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
        <img
          src={imageUrl}
          alt="Image message"
          className="block h-auto max-h-[72vh] w-auto max-w-full rounded-[18px] object-cover"
          style={{ maxWidth: bubbleMaxWidthPx }}
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
        <div className="relative w-full overflow-hidden bg-black">
          <img
            src={imageUrl}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full scale-[1.16] object-cover blur-2xl brightness-[0.88]"
          />
          <div className="relative flex w-full justify-center">
            <img
              src={imageUrl}
              alt="Image message"
              className="block h-auto max-h-[72vh] w-auto max-w-full object-contain"
              style={{ maxWidth: bubbleMaxWidthPx }}
            />
          </div>
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

      <img
        src={imageUrl}
        alt="Image message"
        className="block h-auto max-h-[72vh] w-auto max-w-full object-cover"
        style={{ maxWidth: bubbleMaxWidthPx }}
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

export function MultiImageBubble({
  imageUrls,
  caption,
  captionEntities,
  bubbleMaxWidthPx,
  time,
  isOwn,
  isRead,
  isEdited,
  replyPreview,
  hideTail = false,
}: MultiImageBubbleProps) {
  if (imageUrls.length === 0) {
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
        <ImageGrid imageUrls={imageUrls} />
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
        <ImageGrid imageUrls={imageUrls} />
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
      <ImageGrid imageUrls={imageUrls} />
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
