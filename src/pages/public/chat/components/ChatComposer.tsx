import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import type { SocialFloatingModel } from '@/shared/ui/button/social/useSocialFloatingModel';
import { getMessageMediaAttachments } from '@/shared/ui/button/social/chat/mediaAttachments';
import { buildLocalMediaPreviewMeta } from '@/shared/ui/button/social/chat/localMediaPreview';
import { CloseIcon, MicIcon, PaperclipIcon, SendIcon, SmilePlusIcon, VideoIcon } from '../icons';
import { formatFileSize } from '../utils';
import { useChatRecorder } from '../hooks/useChatRecorder';
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
  sendAsFile: boolean;
  groupImages: boolean;
};

const formatRecordingTimer = (valueMs: number) => {
  const safeMs = Math.max(0, valueMs);
  const totalSeconds = Math.floor(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const tenths = Math.floor((safeMs % 1000) / 100);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`;
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
  if (message.messageType === 'voice') return 'Voice message';
  if (message.messageType === 'circle') return 'Video message';
  if (message.messageType === 'file' || message.messageType === 'files') return 'File';
  return 'Message';
};

export function ChatComposer({ model }: ChatComposerProps) {
  const recorder = useChatRecorder({
    onRecorded: async (file, kind) => {
      await model.uploadImage(file, { forcedMessageType: kind });
    },
  });
  const actionButtonRef = useRef<HTMLButtonElement | null>(null);
  const composerRootRef = useRef<HTMLDivElement | null>(null);
  const cancelZoneRef = useRef<HTMLDivElement | null>(null);
  const holdStartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const holdTriggeredRef = useRef(false);
  const isRecordingRef = useRef(recorder.isRecording);
  const messagesRef = useRef(model.messages);
  const pendingPreviewUrlsRef = useRef<string[]>([]);
  const sendingPreviewUrlsRef = useRef<string[]>([]);
  const sendingPreviewReleaseTimersRef = useRef<Set<number>>(new Set());
  const pendingDraftChatIdRef = useRef<number | null>(null);
  const emojiHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isRecordingLocked, setIsRecordingLocked] = useState(false);
  const [isPointerInCancelZone, setIsPointerInCancelZone] = useState(false);
  const [lockHintProgress, setLockHintProgress] = useState(0);
  const [pendingImageDraft, setPendingImageDraft] = useState<PendingImageDraft | null>(null);
  const [isPendingImageApplying, setIsPendingImageApplying] = useState(false);
  const [isEmojiPanelOpen, setIsEmojiPanelOpen] = useState(false);
  const [pendingPanelAnchor, setPendingPanelAnchor] = useState(() => ({
    x: typeof window === 'undefined' ? 0 : window.innerWidth / 2,
    y: typeof window === 'undefined' ? 0 : window.innerHeight / 2,
  }));

  useEffect(() => {
    model.setIsRecordingVoice(recorder.recordingKind === 'voice');
    model.setIsRecordingCircle(recorder.recordingKind === 'circle');
    model.setRecordingCircleStream(recorder.recordingKind === 'circle' ? recorder.previewStream : null);
  }, [
    model,
    recorder.previewStream,
    recorder.recordingKind,
  ]);

  useEffect(
    () => () => {
      model.setIsRecordingVoice(false);
      model.setIsRecordingCircle(false);
      model.setRecordingCircleStream(null);
    },
    [model]
  );

  useEffect(
    () => () => {
      clearHoldStartTimeout();
    },
    []
  );

  const hasText = model.messageInput.trim().length > 0;
  const hasAttachments = model.attachedImages.length > 0;
  const canSendText = hasText || hasAttachments;
  const shouldShowSendButton = canSendText || isRecordingLocked;
  const shouldShowRecordWaves = recorder.isRecording && !isRecordingLocked;
  const isCancelGestureActive =
    recorder.isRecording &&
    !isRecordingLocked &&
    isPointerInCancelZone &&
    activePointerIdRef.current !== null;

  useEffect(() => {
    isRecordingRef.current = recorder.isRecording;
    if (!recorder.isRecording) {
      setIsRecordingLocked(false);
      setIsPointerInCancelZone(false);
      setLockHintProgress(0);
    }
  }, [recorder.isRecording]);

  useEffect(() => {
    messagesRef.current = model.messages;
  }, [model.messages]);

  const handleSend = () => {
    if (model.selectedChat === null) return;
    if (!canSendText) return;
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

  const openPendingImageDraft = (files: File[], sendAsFile = false) => {
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
      sendAsFile,
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

    const picked = Array.from(files);
    const mediaFiles = picked.filter((file) => {
      const contentType = (file.type || '').toLowerCase();
      return contentType.startsWith('image/') || contentType.startsWith('video/');
    });
    const nonMediaFiles = picked.filter((file) => {
      const contentType = (file.type || '').toLowerCase();
      return !contentType.startsWith('image/') && !contentType.startsWith('video/');
    });

    nonMediaFiles.forEach((file) => {
      void model.attachImage(file, { sendAsFile: true });
    });

    if (mediaFiles.length === 0) return;
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
                !sendingDraft.sendAsFile &&
                (contentType.startsWith('image/') || contentType.startsWith('video/'))
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
                sendAsFile: sendingDraft.sendAsFile,
                isImage:
                  !sendingDraft.sendAsFile &&
                  contentType.startsWith('image/'),
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
            // Keep local previews for a while to avoid visible flicker while remote media becomes renderable.
            scheduleSendingPreviewUrlsRelease(sendPreviewUrls);
          }
          return;
        }

        appendCaptionToInput(pendingImageDraft.caption);
        for (const item of pendingImageDraft.items) {
          await model.attachImage(item.file, {
            preview: item.previewUrl,
            sendAsFile: pendingImageDraft.sendAsFile,
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

  const clearHoldStartTimeout = () => {
    if (holdStartTimeoutRef.current !== null) {
      clearTimeout(holdStartTimeoutRef.current);
      holdStartTimeoutRef.current = null;
    }
  };

  const isPointerInsideCancelZone = (clientX: number, clientY: number) => {
    const zone = cancelZoneRef.current;
    if (!zone) {
      return false;
    }
    const rect = zone.getBoundingClientRect();
    return (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    );
  };

  const isPointerInsideActionButton = (clientX: number, clientY: number) => {
    const button = actionButtonRef.current;
    if (!button) {
      return false;
    }
    const rect = button.getBoundingClientRect();
    return (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    );
  };

  const computeLockHintProgress = (clientY: number) => {
    const button = actionButtonRef.current;
    if (!button) {
      return 0;
    }
    const rect = button.getBoundingClientRect();
    const startY = rect.top + rect.height / 2;
    const endY = startY - 140;
    const raw = (startY - clientY) / (startY - endY);
    return Math.max(0, Math.min(1, raw));
  };

  const handleRecordButtonPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (
      event.button !== 0 ||
      recorder.isRecording ||
      isRecordingLocked ||
      shouldShowSendButton ||
      recorder.isStarting ||
      model.selectedChat === null
    ) {
      return;
    }
    event.preventDefault();
    activePointerIdRef.current = event.pointerId;
    holdTriggeredRef.current = false;
    setLockHintProgress(0);
    setIsPointerInCancelZone(false);
    clearHoldStartTimeout();
    holdStartTimeoutRef.current = setTimeout(() => {
      holdTriggeredRef.current = true;
      void recorder.startRecording(recorder.recordingMode).catch((error) => {
        alert(error instanceof Error ? error.message : 'Failed to start recording');
      });
    }, 280);
  };

  const handleRecordButtonClick = () => {
    if (shouldShowSendButton || recorder.isRecording || recorder.isStarting) {
      return;
    }
    if (holdTriggeredRef.current) {
      holdTriggeredRef.current = false;
      return;
    }
    recorder.toggleRecordingMode();
  };

  useEffect(() => {
    const handlePointerUp = (event: PointerEvent) => {
      if (activePointerIdRef.current === null || activePointerIdRef.current !== event.pointerId) {
        return;
      }

      activePointerIdRef.current = null;
      clearHoldStartTimeout();

      if (!isRecordingRef.current) {
        return;
      }

      const pointerInCancelZone = isPointerInsideCancelZone(event.clientX, event.clientY);
      setIsPointerInCancelZone(pointerInCancelZone);
      setLockHintProgress(0);
      if (pointerInCancelZone) {
        setIsRecordingLocked(false);
        recorder.stopRecording({ discard: true });
        return;
      }

      if (isPointerInsideActionButton(event.clientX, event.clientY)) {
        setIsRecordingLocked(false);
        recorder.stopRecording();
      } else {
        setIsRecordingLocked(true);
        setIsPointerInCancelZone(false);
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (activePointerIdRef.current === null || activePointerIdRef.current !== event.pointerId) {
        return;
      }
      if (!isRecordingRef.current || isRecordingLocked) {
        setIsPointerInCancelZone(false);
        setLockHintProgress(0);
        return;
      }
      setIsPointerInCancelZone(isPointerInsideCancelZone(event.clientX, event.clientY));
      setLockHintProgress(computeLockHintProgress(event.clientY));
    };

    const handlePointerCancel = (event: PointerEvent) => {
      if (activePointerIdRef.current === null || activePointerIdRef.current !== event.pointerId) {
        return;
      }
      activePointerIdRef.current = null;
      clearHoldStartTimeout();
      setIsPointerInCancelZone(false);
      setLockHintProgress(0);
      if (isRecordingRef.current) {
        setIsRecordingLocked(true);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerCancel);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
    };
  }, [isRecordingLocked, recorder, shouldShowSendButton]);

  const handlePrimaryButtonClick = () => {
    if (model.selectedChat === null || recorder.isStarting) return;
    if (isRecordingLocked && recorder.isRecording) {
      setIsRecordingLocked(false);
      recorder.stopRecording();
      return;
    }
    handleSend();
  };

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
                          className="absolute right-1.5 top-1.5 z-10 grid h-6 w-6 place-items-center rounded-full bg-black/52 text-white/92 opacity-100 transition-colors hover:bg-black/72"
                          aria-label="Remove media from selection"
                          disabled={isPendingImageApplying}
                        >
                          <CloseIcon size={13} strokeWidth={2.4} />
                        </button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {pendingImageDraft.items.length > 1 ? (
          <div className="px-4 pb-2 pt-1">
            <label className="flex items-center gap-2.5 text-[14px] text-white/94">
              <input
                type="checkbox"
                checked={pendingImageDraft.groupImages}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setPendingImageDraft((prev) => (prev ? { ...prev, groupImages: checked } : prev));
                }}
                className="h-5 w-5 rounded-[5px] border border-[#8e77ef]/55 bg-transparent accent-[#8e77ef]"
                disabled={isPendingImageApplying}
              />
              Group
            </label>
          </div>
        ) : null}

        <div className="px-4 pb-3 pt-1">
          <label className="flex items-center gap-2.5 text-[14px] text-white/94">
            <input
              type="checkbox"
              checked={pendingImageDraft.sendAsFile}
              onChange={(event) => {
                const checked = event.target.checked;
                setPendingImageDraft((prev) => (prev ? { ...prev, sendAsFile: checked } : prev));
              }}
              className="h-5 w-5 rounded-[5px] border border-[#8e77ef]/55 bg-transparent accent-[#8e77ef]"
              disabled={isPendingImageApplying}
            />
            Send as files
          </label>
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

      {model.attachedImages.length > 0 && !recorder.isRecording ? (
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
                      {attachment.forcedMessageType === 'circle' ? (
                        <VideoIcon size={20} strokeWidth={2.2} />
                      ) : attachment.forcedMessageType === 'voice' ? (
                        <MicIcon size={20} strokeWidth={2.2} />
                      ) : (
                        <PaperclipIcon size={18} strokeWidth={2.2} />
                      )}
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
          {recorder.isRecording && !isRecordingLocked ? (
            <div
              ref={cancelZoneRef}
              aria-hidden
              className="pointer-events-none absolute inset-x-[18px] -top-8 h-7"
            />
          ) : null}

          <div className="flex min-h-[58px] flex-1 items-center gap-[12px] rounded-[20px] bg-[#1a1b20] px-[16px] shadow-[0_10px_18px_rgba(0,0,0,.35)] ring-1 ring-white/5">
            {recorder.isRecording ? (
              <div className="flex w-full items-center justify-between gap-4 py-[2px]">
                <div className="flex items-center gap-3 text-white/90">
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#ff7da2]" />
                  <span className="text-[15px] font-[500]">
                    {recorder.recordingKind === 'voice' ? 'Voice' : 'Video note'} {formatRecordingTimer(recorder.recordingElapsedMs)}
                  </span>
                </div>
                {isRecordingLocked ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsRecordingLocked(false);
                      recorder.stopRecording({ discard: true });
                    }}
                    className="rounded-full px-3 py-1 text-[13px] font-[600] text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    Cancel
                  </button>
                ) : (
                  <div
                    className={`text-[13px] font-[500] ${
                      isPointerInCancelZone ? 'text-[#ffb3cb]' : 'text-white/58'
                    }`}
                  >
                    Move here and release to cancel
                  </div>
                )}
              </div>
            ) : (
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
            )}
          </div>

          {shouldShowSendButton ? (
            <button
              ref={actionButtonRef}
              type="button"
              onClick={handlePrimaryButtonClick}
              className="grid h-[58px] w-[58px] place-items-center rounded-full bg-[#8e77ef] text-white shadow-[0_14px_28px_rgba(142,119,239,.42)] transition-opacity disabled:cursor-not-allowed disabled:opacity-55"
              disabled={model.selectedChat === null || recorder.isStarting}
            >
              <SendIcon size={24} strokeWidth={2.2} />
            </button>
          ) : (
            <button
              ref={actionButtonRef}
              type="button"
              onPointerDown={handleRecordButtonPointerDown}
              onClick={handleRecordButtonClick}
              className={`relative grid h-[58px] w-[58px] place-items-center rounded-full text-white shadow-[0_14px_28px_rgba(142,119,239,.42)] transition-colors ${
                isCancelGestureActive ? 'bg-[#d95484]' : 'bg-[#8e77ef]'
              }`}
              disabled={model.selectedChat === null || recorder.isStarting}
              title={
                recorder.recordingMode === 'voice'
                  ? 'Click to switch to video note, hold to record voice'
                  : 'Click to switch to voice, hold to record video note'
              }
            >
              {recorder.isRecording && !isRecordingLocked ? (
                <div className="pointer-events-none absolute -top-[104px] left-1/2 -translate-x-1/2">
                  <div
                    className={`relative h-24 w-12 overflow-hidden rounded-[24px] border bg-[#1a1b20]/98 transition-colors ${
                      lockHintProgress > 0.75
                        ? 'border-[#a592ff] shadow-[0_10px_24px_rgba(142,119,239,0.34)]'
                        : 'border-white/15'
                    }`}
                  >
                    <div
                      className={`absolute inset-x-1 bottom-1 rounded-[18px] transition-all duration-100 ${
                        isPointerInCancelZone ? 'bg-[#ff7da2]/40' : 'bg-[#8e77ef]/40'
                      }`}
                      style={{ height: `${18 + lockHintProgress * 70}%` }}
                    />
                    <div className="absolute inset-x-0 top-2 flex justify-center text-white/85">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V8a4 4 0 118 0v3m-9 0h10a1 1 0 011 1v7a1 1 0 01-1 1H7a1 1 0 01-1-1v-7a1 1 0 011-1z" />
                      </svg>
                    </div>
                    <div className="absolute inset-x-0 bottom-2 flex justify-center text-white/75">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M7 14l5-5 5 5" />
                      </svg>
                    </div>
                  </div>
                </div>
              ) : null}

              {shouldShowRecordWaves ? (
                <>
                  <span className="pointer-events-none absolute -inset-1 rounded-full bg-[#a592ff]/35 animate-ping" />
                  <span
                    className="pointer-events-none absolute -inset-2 rounded-full bg-[#8e77ef]/25 animate-ping"
                    style={{ animationDelay: '120ms' }}
                  />
                </>
              ) : null}

              {recorder.recordingMode === 'voice' ? (
                <MicIcon size={24} strokeWidth={2.25} />
              ) : (
                <VideoIcon size={23} strokeWidth={2.2} />
              )}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
