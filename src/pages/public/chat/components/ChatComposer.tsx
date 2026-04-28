import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { SocialFloatingModel } from '@/shared/ui/button/social/useSocialFloatingModel';
import { getMessageMediaAttachments } from '@/shared/ui/button/social/chat/mediaAttachments';
import { buildLocalMediaPreviewMeta } from '@/shared/ui/button/social/chat/localMediaPreview';
import { CloseIcon, PaperclipIcon, SendIcon, SmilePlusIcon } from '../icons';
import { formatFileSize } from '../utils';
import { EmojiHoverPanel } from './EmojiHoverPanel';
import { buildImageGridRows } from './messageTypes/imageGridPattern';

type ChatComposerProps = {
  model: SocialFloatingModel;
};

type PendingImageDraftItem = {
  id: string;
  file: File;
  previewUrl: string;
  mediaType: 'image' | 'video';
};

type PendingImageDraft = {
  items: PendingImageDraftItem[];
  caption: string;
  groupImages: boolean;
};

function ReplyArrowIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M10 7 4 12l6 5" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 12h8.5A5.5 5.5 0 0 1 19 17.5V18" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M4 20h4l10.2-10.2a1.7 1.7 0 0 0 0-2.4l-1.6-1.6a1.7 1.7 0 0 0-2.4 0L4 16v4Z" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const resolveMessagePreview = (message: NonNullable<SocialFloatingModel['replyingTo']>) => {
  const text = (message.content || '').trim();
  if (text) return text;
  if (message.messageType === 'image' || message.messageType === 'images') return 'Photo';
  if (message.messageType === 'poll') return 'Poll';
  return 'Message';
};

export function ChatComposer({ model }: ChatComposerProps) {
  const composerRootRef = useRef<HTMLDivElement | null>(null);
  const messagesRef = useRef(model.messages);
  const pendingPreviewUrlsRef = useRef<string[]>([]);
  const sendingPreviewUrlsRef = useRef<string[]>([]);
  const sendingPreviewReleaseTimersRef = useRef<Set<number>>(new Set());
  const pendingDraftChatIdRef = useRef<number | null>(null);
  const emojiHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pendingImageDraft, setPendingImageDraft] = useState<PendingImageDraft | null>(null);
  const [isPendingImageApplying, setIsPendingImageApplying] = useState(false);
  const [isEmojiPanelOpen, setIsEmojiPanelOpen] = useState(false);
  const [pendingPanelAnchor, setPendingPanelAnchor] = useState(() => ({
    x: typeof window === 'undefined' ? 0 : window.innerWidth / 2,
    y: typeof window === 'undefined' ? 0 : window.innerHeight / 2,
  }));

  const hasText = model.messageInput.trim().length > 0;
  const hasAttachments = model.attachedImages.length > 0;
  const canSend = hasText || hasAttachments;

  useEffect(() => {
    messagesRef.current = model.messages;
  }, [model.messages]);

  const handleSend = () => {
    if (model.selectedChat === null) return;
    if (!canSend) return;
    void model.sendChatMessage();
  };

  const replyingPreview = model.replyingTo ? resolveMessagePreview(model.replyingTo) : '';
  const replyingName = model.replyingTo
    ? model.replyingTo.senderId === model.userId
      ? 'You'
      : model.friends.find((friend) => friend.userId === model.replyingTo!.senderId)?.displayName ||
        model.friends.find((friend) => friend.userId === model.replyingTo!.senderId)?.username ||
        model.replyingTo.senderId.slice(0, 8)
    : '';
  const editingPreview = model.editingMessage ? resolveMessagePreview(model.editingMessage) : '';
  const hasComposerState = !!model.editingMessage || !!model.replyingTo;

  const revokePreviewUrls = (previewUrls: string[]) => {
    previewUrls.forEach((previewUrl) => {
      URL.revokeObjectURL(previewUrl);
    });
  };

  const releasePendingPreviewUrls = () => {
    if (pendingPreviewUrlsRef.current.length === 0) return;
    revokePreviewUrls(pendingPreviewUrlsRef.current);
    pendingPreviewUrlsRef.current = [];
  };

  const reservePendingPreviewUrlsForSending = () => {
    if (pendingPreviewUrlsRef.current.length === 0) return;
    sendingPreviewUrlsRef.current.push(...pendingPreviewUrlsRef.current);
    pendingPreviewUrlsRef.current = [];
  };

  const isPreviewUrlStillUsed = (previewUrl: string) => {
    const messages = messagesRef.current;
    return messages.some((message) => {
      const attachments = getMessageMediaAttachments(message);
      return attachments.some((image) => image?.imageUrl === previewUrl);
    });
  };

  const releaseSendingPreviewUrls = (previewUrls: string[]) => {
    if (previewUrls.length === 0) return [];
    const releasable = previewUrls.filter((previewUrl) => !isPreviewUrlStillUsed(previewUrl));
    if (releasable.length > 0) {
      revokePreviewUrls(releasable);
      const revoked = new Set(releasable);
      sendingPreviewUrlsRef.current = sendingPreviewUrlsRef.current.filter(
        (previewUrl) => !revoked.has(previewUrl)
      );
    }
    return previewUrls.filter((previewUrl) => !releasable.includes(previewUrl));
  };

  const scheduleSendingPreviewUrlsRelease = (previewUrls: string[], delayMs = 45_000) => {
    if (previewUrls.length === 0) return;

    const schedule = (remainingUrls: string[], timeoutMs: number) => {
      if (remainingUrls.length === 0) return;
      const timerId = window.setTimeout(() => {
        sendingPreviewReleaseTimersRef.current.delete(timerId);
        const stillUsed = releaseSendingPreviewUrls(remainingUrls);
        if (stillUsed.length > 0) {
          schedule(stillUsed, 15_000);
        }
      }, timeoutMs);
      sendingPreviewReleaseTimersRef.current.add(timerId);
    };

    schedule(previewUrls, delayMs);
  };

  const openPendingImageDraft = (files: File[]) => {
    if (files.length === 0) return;
    releasePendingPreviewUrls();
    const items = files.slice(0, 9).map((file, index) => ({
      id: `pending-${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      mediaType: ((file.type || '').toLowerCase().startsWith('video/') ? 'video' : 'image') as PendingImageDraftItem['mediaType'],
    }));
    pendingPreviewUrlsRef.current = items.map((item) => item.previewUrl);
    pendingDraftChatIdRef.current = model.selectedChat;
    setPendingImageDraft({
      items,
      caption: '',
      groupImages: items.length > 1,
    });
  };

  const closePendingImageDraft = (options?: { preservePreviewsForSending?: boolean }) => {
    if (options?.preservePreviewsForSending) {
      reservePendingPreviewUrlsForSending();
    } else {
      releasePendingPreviewUrls();
    }
    pendingDraftChatIdRef.current = null;
    setPendingImageDraft(null);
    setIsPendingImageApplying(false);
  };

  const clearEmojiHideTimeout = () => {
    if (!emojiHideTimeoutRef.current) return;
    clearTimeout(emojiHideTimeoutRef.current);
    emojiHideTimeoutRef.current = null;
  };

  const openEmojiPanel = () => {
    clearEmojiHideTimeout();
    setIsEmojiPanelOpen(true);
  };

  const closeEmojiPanelSoon = () => {
    clearEmojiHideTimeout();
    emojiHideTimeoutRef.current = setTimeout(() => {
      setIsEmojiPanelOpen(false);
      emojiHideTimeoutRef.current = null;
    }, 120);
  };

  const appendEmojiToInput = (emoji: string) => {
    const next = `${model.messageInput}${emoji}`;
    model.setMessageInput(next);
    if (model.selectedChat !== null) {
      void model.sendTypingState(model.selectedChat, next.trim().length > 0);
    }
  };

  const updatePendingPanelAnchor = () => {
    const fallbackX = typeof window === 'undefined' ? 0 : window.innerWidth / 2;
    const fallbackY = typeof window === 'undefined' ? 0 : window.innerHeight / 2;
    const root = composerRootRef.current;
    if (!root) {
      setPendingPanelAnchor({ x: fallbackX, y: fallbackY });
      return;
    }

    const targetRect = root.getBoundingClientRect();
    const panelWidth = Math.min(440, Math.max(280, window.innerWidth - 28));
    const halfPanelWidth = panelWidth / 2;
    const safeX = Math.max(
      halfPanelWidth + 14,
      Math.min(window.innerWidth - halfPanelWidth - 14, targetRect.left + targetRect.width / 2)
    );
    const safeY = Math.max(160, Math.min(window.innerHeight - 160, window.innerHeight / 2));

    setPendingPanelAnchor({
      x: safeX,
      y: safeY,
    });
  };

  const appendCaptionToInput = (caption: string) => {
    const trimmed = caption.trim();
    if (!trimmed) return;
    model.setMessageInput((prev) => {
      const current = prev.trim();
      if (!current) return trimmed;
      if (current === trimmed) return prev;
      return `${current}\n${trimmed}`;
    });
  };

  const handlePickedFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const mediaFiles = Array.from(files).filter((file) => {
      const contentType = (file.type || '').toLowerCase();
      return contentType.startsWith('image/') || contentType.startsWith('video/');
    });

    if (mediaFiles.length === 0) {
      alert('Only photos and videos are supported.');
      return;
    }

    openPendingImageDraft(mediaFiles);
  };

  const removePendingDraftItem = (itemId: string) => {
    let removedPreviewUrl: string | null = null;
    setPendingImageDraft((prev) => {
      if (!prev) return prev;
      const nextItems = prev.items.filter((item) => {
        if (item.id === itemId) {
          removedPreviewUrl = item.previewUrl;
          return false;
        }
        return true;
      });
      if (nextItems.length === 0) {
        return null;
      }
      return {
        ...prev,
        items: nextItems,
        groupImages: nextItems.length > 1 ? prev.groupImages : true,
      };
    });

    if (removedPreviewUrl) {
      URL.revokeObjectURL(removedPreviewUrl);
      pendingPreviewUrlsRef.current = pendingPreviewUrlsRef.current.filter(
        (previewUrl) => previewUrl !== removedPreviewUrl
      );
    }
  };

  const pendingGridRows = useMemo(() => {
    if (!pendingImageDraft || pendingImageDraft.items.length === 0) {
      return [];
    }
    return buildImageGridRows(pendingImageDraft.items) as Array<{
      columns: number;
      items: PendingImageDraftItem[];
    }>;
  }, [pendingImageDraft]);

  const applyPendingImage = (mode: 'add' | 'send') => {
    if (!pendingImageDraft || isPendingImageApplying) return;

    void (async () => {
      setIsPendingImageApplying(true);
      try {
        if (mode === 'send') {
          if (model.selectedChat === null) {
            throw new Error('No selected chat');
          }
          const sendingDraft = pendingImageDraft;
          const sendPreviewUrls = sendingDraft.items.map((item) => item.previewUrl);
          const attachments = await Promise.all(
            sendingDraft.items.map(async (item) => {
              const contentType = (item.file.type || '').toLowerCase();
              const mediaType = contentType.startsWith('video/') ? 'video' : 'image';
              const localPreviewMeta =
                contentType.startsWith('image/') || contentType.startsWith('video/')
                  ? await buildLocalMediaPreviewMeta(item.file, {
                      preferredPreviewUrl: item.previewUrl,
                      forceMediaType: mediaType,
                    })
                  : null;

              return {
                id: item.id,
                file: item.file,
                preview: item.previewUrl,
                thumbnailUrl: localPreviewMeta?.thumbnailUrl,
                strippedThumbnailUrl: localPreviewMeta?.strippedThumbnailUrl,
                width: localPreviewMeta?.width,
                height: localPreviewMeta?.height,
                aspectRatio: localPreviewMeta?.aspectRatio,
                isImage: contentType.startsWith('image/'),
                groupWithOthers: sendingDraft.groupImages,
                contentType: item.file.type || 'application/octet-stream',
                sizeBytes: item.file.size,
                uploading: false,
              };
            })
          );
          const replyToMessageId =
            typeof model.replyingTo?.messageId === 'number'
              ? model.replyingTo.messageId
              : undefined;
          closePendingImageDraft({ preservePreviewsForSending: true });
          try {
            await model.sendMessagesWithImages(model.selectedChat, sendingDraft.caption, {
              attachments,
              clearComposerDraft: true,
              replyToMessageId,
              resetReplyTo: true,
            });
          } finally {
            scheduleSendingPreviewUrlsRelease(sendPreviewUrls);
          }
          return;
        }

        appendCaptionToInput(pendingImageDraft.caption);
        for (const item of pendingImageDraft.items) {
          await model.attachImage(item.file, {
            preview: item.previewUrl,
            groupWithOthers: pendingImageDraft.groupImages,
          });
        }

        closePendingImageDraft();
      } catch (error) {
        setIsPendingImageApplying(false);
        alert(error instanceof Error ? error.message : 'Failed to attach media');
      }
    })();
  };

  useEffect(
    () => () => {
      releasePendingPreviewUrls();
      sendingPreviewReleaseTimersRef.current.forEach((timerId) => {
        window.clearTimeout(timerId);
      });
      sendingPreviewReleaseTimersRef.current.clear();
      if (sendingPreviewUrlsRef.current.length > 0) {
        revokePreviewUrls(sendingPreviewUrlsRef.current);
        sendingPreviewUrlsRef.current = [];
      }
    },
    []
  );

  useEffect(
    () => () => {
      clearEmojiHideTimeout();
    },
    []
  );

  useEffect(() => {
    if (!pendingImageDraft) return;
    updatePendingPanelAnchor();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closePendingImageDraft();
      }
    };
    const onResize = () => updatePendingPanelAnchor();
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
    };
  }, [pendingImageDraft]);

  useEffect(() => {
    if (!pendingImageDraft) return;
    if (pendingDraftChatIdRef.current === model.selectedChat) return;
    closePendingImageDraft();
  }, [model.selectedChat, pendingImageDraft]);

  const pendingDraftModal = pendingImageDraft ? (
    <div className="pointer-events-none fixed inset-0 z-[90]">
      <div
        className="pointer-events-auto absolute w-[min(440px,calc(100vw-28px))] overflow-hidden rounded-[16px] bg-[#1a1b20]/98 text-white shadow-[0_22px_60px_rgba(0,0,0,.55)] ring-1 ring-[#8e77ef]/28"
        style={{
          left: `${pendingPanelAnchor.x}px`,
          top: `${pendingPanelAnchor.y}px`,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div className="flex items-center justify-between px-4 pb-2 pt-3">
          <h3 className="text-[16px] font-[600] tracking-tight text-white/96">
            Selected {pendingImageDraft.items.length}{' '}
            {pendingImageDraft.items.length === 1 ? 'item' : 'items'}
          </h3>
          <button
            type="button"
            onClick={() => closePendingImageDraft()}
            className="grid h-8 w-8 place-items-center rounded-full text-[#b79cff]/80 transition-colors hover:bg-[#8e77ef]/18 hover:text-white"
            aria-label="Close media preview"
            disabled={isPendingImageApplying}
          >
            <CloseIcon size={18} strokeWidth={2.4} />
          </button>
        </div>

        <div className="px-4 pb-2">
          <div className="max-h-[min(46vh,420px)] overflow-y-auto">
            <div className="overflow-hidden rounded-[10px] bg-black/22 p-[2px]">
              <div className="flex flex-col gap-[2px]">
                {pendingGridRows.map((row, rowIndex) => (
                  <div
                    key={`pending-row-${rowIndex}`}
                    className="grid gap-[2px]"
                    style={{ gridTemplateColumns: `repeat(${row.columns}, minmax(0, 1fr))` }}
                  >
                    {row.items.map((item) => (
                      <div
                        key={item.id}
                        className={`group relative overflow-hidden bg-black/35 ${
                          row.columns === 1 ? 'aspect-[16/10]' : 'aspect-square'
                        }`}
                      >
                        {item.mediaType === 'video' ? (
                          <>
                            <video
                              src={item.previewUrl}
                              className="h-full w-full object-cover"
                              playsInline
                              preload="metadata"
                              controls={false}
                              muted
                            />
                            <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/48 px-2 py-[3px] text-[11px] font-[600] text-white/95">
                              video
                            </span>
                          </>
                        ) : (
                          <img
                            src={item.previewUrl}
                            alt={item.file.name}
                            className="h-full w-full object-cover"
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => removePendingDraftItem(item.id)}
                          className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-black/58 text-white opacity-0 transition-opacity hover:bg-black/72 group-hover:opacity-100"
                          aria-label="Remove selected media"
                          disabled={isPendingImageApplying}
                        >
                          <CloseIcon size={14} strokeWidth={2.4} />
                        </button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 pb-2">
          <div className="text-[13px] font-[600] text-[#b79cff]">Caption</div>
          <div className="mt-1 flex items-center gap-2 border-b border-[#8e77ef]/50 pb-1.5">
            <input
              value={pendingImageDraft.caption}
              onChange={(event) => {
                const value = event.target.value;
                setPendingImageDraft((prev) => (prev ? { ...prev, caption: value } : prev));
              }}
              placeholder="Write a caption"
              className="h-8 flex-1 bg-transparent text-[15px] text-white/92 placeholder:text-white/35 focus:outline-none"
              disabled={isPendingImageApplying}
            />
            <SmilePlusIcon size={18} className="text-white/35" strokeWidth={2.05} />
          </div>
        </div>

        <div className="grid grid-cols-3 border-t border-[#8e77ef]/30 px-2 py-1.5">
          <button
            type="button"
            onClick={() => applyPendingImage('add')}
            className="rounded-xl px-3 py-2 text-center text-[14px] font-[500] text-[#b79cff] transition-colors hover:bg-[#8e77ef]/14"
            disabled={isPendingImageApplying}
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => closePendingImageDraft()}
            className="rounded-xl px-3 py-2 text-center text-[14px] font-[500] text-[#b79cff] transition-colors hover:bg-[#8e77ef]/14"
            disabled={isPendingImageApplying}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => applyPendingImage('send')}
            className="rounded-xl px-3 py-2 text-center text-[14px] font-[600] text-[#b79cff] transition-colors hover:bg-[#8e77ef]/14"
            disabled={isPendingImageApplying}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {typeof document !== 'undefined' ? createPortal(pendingDraftModal, document.body) : pendingDraftModal}

      {model.attachedImages.length > 0 ? (
        <div className="px-[18px] pb-2">
          <div className="mx-auto flex w-full max-w-[960px] gap-2 overflow-x-auto rounded-2xl bg-[#1a1b20]/95 p-2 ring-1 ring-white/5">
            {model.attachedImages.map((attachment) => (
              <div
                key={attachment.id}
                className="group relative w-[92px] shrink-0 overflow-hidden rounded-xl bg-black/25 p-1.5"
              >
                <button
                  type="button"
                  onClick={() => model.removeAttachedImage(attachment.id)}
                  className="absolute right-1 top-1 z-10 grid h-5 w-5 place-items-center rounded-full bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label="Remove attachment"
                >
                  <CloseIcon size={12} strokeWidth={2.3} />
                </button>

                <div className="h-[74px] w-full overflow-hidden rounded-lg bg-black/30">
                  {attachment.isImage && attachment.preview ? (
                    <img src={attachment.preview} alt={attachment.file.name} className="h-full w-full object-cover" />
                  ) : ((attachment.contentType || attachment.file.type || '').toLowerCase().startsWith('video/') && attachment.preview) ? (
                    <video
                      src={attachment.preview}
                      className="h-full w-full object-cover"
                      playsInline
                      preload="metadata"
                      controls={false}
                      muted
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-white/70">
                      <PaperclipIcon size={18} strokeWidth={2.2} />
                      <span className="line-clamp-1 max-w-[72px] text-center text-[10px]">
                        {attachment.file.name}
                      </span>
                    </div>
                  )}
                </div>
                <div className="mt-1 truncate text-[10px] text-white/70">
                  {formatFileSize(attachment.sizeBytes ?? attachment.file.size)}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div
        ref={composerRootRef}
        className="px-[18px] pb-[10px]"
        data-chat-composer-container="true"
      >
        <div className="relative mx-auto flex w-full max-w-[960px] items-end gap-[10px]">
          <div className="flex min-h-[58px] flex-1 items-center gap-[12px] rounded-[20px] bg-[#1a1b20] px-[16px] shadow-[0_10px_18px_rgba(0,0,0,.35)] ring-1 ring-white/5">
            <div className="flex w-full flex-col gap-2 py-2">
              {hasComposerState ? (
                <div className="flex items-center gap-2">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#9d83ff]">
                    {model.editingMessage ? <EditIcon /> : <ReplyArrowIcon />}
                  </div>

                  <div className="relative min-w-0 flex-1 overflow-hidden rounded-[10px] bg-[#353142]/92 px-4 py-2.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]">
                    <span className="absolute bottom-0 left-0 top-0 w-[4px] bg-[#9d83ff]" />
                    <div className="pl-2 pr-7">
                      <div className="text-[13px] font-[600] leading-none text-[#b79cff]">
                        {model.editingMessage ? 'Editing' : `Reply to ${replyingName}`}
                      </div>
                      <div className="mt-[5px] truncate text-[15px] leading-none text-white/62">
                        {model.editingMessage ? editingPreview : replyingPreview}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (model.editingMessage) {
                          model.setEditingMessage(null);
                          model.setMessageInput('');
                        } else {
                          model.setReplyingTo(null);
                        }
                      }}
                      className="absolute right-2 top-1.5 grid h-6 w-6 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                      aria-label={model.editingMessage ? 'Cancel editing' : 'Cancel reply'}
                    >
                      <CloseIcon size={15} strokeWidth={2.4} />
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="flex items-center gap-[12px]">
                <div
                  className="relative shrink-0"
                  onMouseEnter={openEmojiPanel}
                  onMouseLeave={closeEmojiPanelSoon}
                >
                  <button
                    type="button"
                    onClick={() => {
                      clearEmojiHideTimeout();
                      setIsEmojiPanelOpen((prev) => !prev);
                    }}
                    className={`transition-colors ${
                      isEmojiPanelOpen ? 'text-[#b79cff]' : 'text-white/55 hover:text-white/78'
                    }`}
                    aria-label="Open emoji panel"
                  >
                    <SmilePlusIcon size={24} strokeWidth={2.1} />
                  </button>
                  <EmojiHoverPanel
                    open={isEmojiPanelOpen}
                    onMouseEnter={openEmojiPanel}
                    onMouseLeave={closeEmojiPanelSoon}
                    onSelectEmoji={appendEmojiToInput}
                  />
                </div>
                <textarea
                  value={model.messageInput}
                  onChange={(event) => {
                    const next = event.target.value;
                    model.setMessageInput(next);
                    if (model.selectedChat !== null) {
                      void model.sendTypingState(model.selectedChat, next.trim().length > 0);
                    }
                  }}
                  onBlur={() => {
                    if (model.selectedChat !== null) {
                      void model.sendTypingState(model.selectedChat, false, true);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      handleSend();
                    }
                  }}
                  rows={1}
                  placeholder="Message"
                  className="max-h-[180px] flex-1 resize-none bg-transparent py-2 text-[16px] text-white/90 placeholder:text-white/40 focus:outline-none"
                />
                <label className="relative cursor-pointer text-white/62 hover:text-white">
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    className="hidden"
                    onChange={(event) => {
                      handlePickedFiles(event.target.files);
                      event.target.value = '';
                    }}
                  />
                  <PaperclipIcon size={22} strokeWidth={2.1} />
                  {model.attachedImages.length > 0 ? (
                    <span className="absolute -right-2 -top-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#8e77ef] px-1 text-[10px] text-white">
                      {model.attachedImages.length}
                    </span>
                  ) : null}
                </label>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSend}
            className="grid h-[58px] w-[58px] place-items-center rounded-full bg-[#8e77ef] text-white shadow-[0_14px_28px_rgba(142,119,239,.42)] transition-opacity disabled:cursor-not-allowed disabled:opacity-55"
            disabled={model.selectedChat === null || !canSend}
          >
            <SendIcon size={24} strokeWidth={2.2} />
          </button>
        </div>
      </div>
    </>
  );
}
