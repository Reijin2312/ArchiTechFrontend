import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import type { SocialFloatingModel } from '../useSocialFloatingModel';

type ChatComposerProps = {
  model: SocialFloatingModel;
};

export function ChatComposer({ model }: ChatComposerProps) {
  const {
    editingMessage,
    setEditingMessage,
    messageInput,
    setMessageInput,
    replyingTo,
    userId,
    friends,
    setReplyingTo,
    sendChatMessage,
    sendTypingState,
    selectedChat,
    attachImage,
    attachedImages,
    removeAttachedImage,
    isRecordingVoice,
    setIsRecordingVoice,
    isRecordingCircle,
    setIsRecordingCircle,
    setRecordingCircleStream,
    uploadImage,
  } = model;

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const MAX_COMPOSER_TEXTAREA_HEIGHT = 220;
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordingKindRef = useRef<'voice' | 'circle' | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const actionButtonRef = useRef<HTMLButtonElement | null>(null);
  const cancelZoneRef = useRef<HTMLDivElement | null>(null);
  const holdStartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const holdTriggeredRef = useRef(false);
  const sendImmediatelyOnStopRef = useRef(false);
  const discardRecordingOnStopRef = useRef(false);
  const isRecordingActiveRef = useRef(false);
  const recordingStartedAtRef = useRef<number | null>(null);
  const [recordingMode, setRecordingMode] = useState<'voice' | 'circle'>('voice');
  const [isRecordingLocked, setIsRecordingLocked] = useState(false);
  const [isPointerInCancelZone, setIsPointerInCancelZone] = useState(false);
  const [recordingElapsedMs, setRecordingElapsedMs] = useState(0);
  const [lockHintProgress, setLockHintProgress] = useState(0);

  const isRecordingActive = isRecordingVoice || isRecordingCircle;
  const hasText = messageInput.trim().length > 0;
  const hasDraftAttachments = attachedImages.length > 0;
  const shouldShowSendButton = hasText || hasDraftAttachments || isRecordingLocked;
  const shouldShowRecordWaves = isRecordingActive && !isRecordingLocked;
  const isCancelGestureActive =
    isRecordingActive &&
    !isRecordingLocked &&
    isPointerInCancelZone &&
    activePointerIdRef.current !== null;

  useEffect(() => {
    isRecordingActiveRef.current = isRecordingActive;
  }, [isRecordingActive]);

  useEffect(() => {
    if (!isRecordingActive) {
      recordingStartedAtRef.current = null;
      setRecordingElapsedMs(0);
      return;
    }
    if (recordingStartedAtRef.current === null) {
      recordingStartedAtRef.current = Date.now();
    }

    const tick = () => {
      if (recordingStartedAtRef.current === null) {
        setRecordingElapsedMs(0);
        return;
      }
      setRecordingElapsedMs(Math.max(0, Date.now() - recordingStartedAtRef.current));
    };

    tick();
    const timerId = window.setInterval(tick, 100);
    return () => {
      window.clearInterval(timerId);
    };
  }, [isRecordingActive]);

  const clearHoldStartTimeout = () => {
    if (holdStartTimeoutRef.current !== null) {
      clearTimeout(holdStartTimeoutRef.current);
      holdStartTimeoutRef.current = null;
    }
  };

  useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.style.height = '0px';
    const nextHeight = Math.min(input.scrollHeight, MAX_COMPOSER_TEXTAREA_HEIGHT);
    input.style.height = `${nextHeight}px`;
    input.style.overflowY = input.scrollHeight > MAX_COMPOSER_TEXTAREA_HEIGHT ? 'auto' : 'hidden';
  }, [messageInput]);

  useEffect(() => {
    return () => {
      clearHoldStartTimeout();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
    };
  }, []);

  const selectMimeType = (kind: 'voice' | 'circle') => {
    const candidates =
      kind === 'voice'
        ? ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']
        : ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    for (const candidate of candidates) {
      if ((window as any).MediaRecorder?.isTypeSupported?.(candidate)) {
        return candidate;
      }
    }
    return '';
  };

  const clearRecordingState = () => {
    clearHoldStartTimeout();
    activePointerIdRef.current = null;
    holdTriggeredRef.current = false;
    sendImmediatelyOnStopRef.current = false;
    discardRecordingOnStopRef.current = false;
    recordingChunksRef.current = [];
    recordingKindRef.current = null;
    mediaRecorderRef.current = null;
    recordingStartedAtRef.current = null;
    setRecordingElapsedMs(0);
    setLockHintProgress(0);
    setIsPointerInCancelZone(false);
    setRecordingCircleStream(null);
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsRecordingVoice(false);
    setIsRecordingCircle(false);
    setIsRecordingLocked(false);
  };

  const startRecording = async (kind: 'voice' | 'circle') => {
    if (!(window as any).MediaRecorder) {
      alert('MediaRecorder is not supported in this browser');
      return;
    }
    if (isRecordingVoice || isRecordingCircle) {
      return;
    }

    try {
      const constraints: MediaStreamConstraints =
        kind === 'voice'
          ? { audio: true }
          : {
              audio: true,
              video: {
                width: { ideal: 640 },
                height: { ideal: 640 },
                facingMode: 'user',
              },
            };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const mimeType = selectMimeType(kind);
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

      recordingKindRef.current = kind;
      recordingChunksRef.current = [];
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      if (kind === 'voice') {
        setRecordingCircleStream(null);
        setIsRecordingVoice(true);
      } else {
        setRecordingCircleStream(stream);
        setIsRecordingCircle(true);
      }

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const recordedKind = recordingKindRef.current;
        const chunks = [...recordingChunksRef.current];
        const type = recorder.mimeType || (recordedKind === 'voice' ? 'audio/webm' : 'video/webm');
        const shouldSendImmediately = sendImmediatelyOnStopRef.current;
        const shouldDiscard = discardRecordingOnStopRef.current;
        const blob = new Blob(chunks, { type });
        const extension = type.includes('ogg') ? 'ogg' : 'webm';
        const fileName =
          recordedKind === 'voice'
            ? `voice-${Date.now()}.${extension}`
            : `circle-${Date.now()}.${extension}`;
        const file = new File([blob], fileName, { type });
        const preview =
          !shouldSendImmediately && recordedKind === 'circle' ? URL.createObjectURL(blob) : undefined;
        if (recordedKind && !shouldDiscard) {
          if (shouldSendImmediately) {
            void uploadImage(file);
          } else {
            void attachImage(file, { forcedMessageType: recordedKind, preview });
          }
        }
        clearRecordingState();
      };

      recorder.start(250);
    } catch (error) {
      clearRecordingState();
      alert(error instanceof Error ? error.message : 'Failed to start recording');
    }
  };

  const stopRecording = (sendImmediately = false, discard = false) => {
    sendImmediatelyOnStopRef.current = sendImmediately;
    discardRecordingOnStopRef.current = discard;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      clearRecordingState();
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

  const toggleRecordingMode = () => {
    setRecordingMode((prev) => (prev === 'voice' ? 'circle' : 'voice'));
  };

  const handleRecordButtonPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || isRecordingActive || isRecordingLocked || shouldShowSendButton) {
      return;
    }
    event.preventDefault();
    activePointerIdRef.current = event.pointerId;
    holdTriggeredRef.current = false;
    setLockHintProgress(0);
    clearHoldStartTimeout();
    holdStartTimeoutRef.current = setTimeout(() => {
      holdTriggeredRef.current = true;
      void startRecording(recordingMode);
    }, 280);
  };

  const handleRecordButtonClick = () => {
    if (shouldShowSendButton || isRecordingActiveRef.current) {
      return;
    }
    if (holdTriggeredRef.current) {
      holdTriggeredRef.current = false;
      return;
    }
    toggleRecordingMode();
  };

  useEffect(() => {
    const handlePointerUp = (event: PointerEvent) => {
      if (activePointerIdRef.current === null || activePointerIdRef.current !== event.pointerId) {
        return;
      }

      activePointerIdRef.current = null;
      clearHoldStartTimeout();

      if (!isRecordingActiveRef.current) {
        return;
      }

      const pointerInCancelZone = isPointerInsideCancelZone(event.clientX, event.clientY);
      setIsPointerInCancelZone(pointerInCancelZone);
      setLockHintProgress(0);
      if (pointerInCancelZone) {
        setIsRecordingLocked(false);
        stopRecording(false, true);
        return;
      }

      if (isPointerInsideActionButton(event.clientX, event.clientY)) {
        setIsRecordingLocked(false);
        stopRecording(true);
      } else {
        setIsRecordingLocked(true);
        setIsPointerInCancelZone(false);
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (activePointerIdRef.current === null || activePointerIdRef.current !== event.pointerId) {
        return;
      }
      if (!isRecordingActiveRef.current || isRecordingLocked) {
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
      if (isRecordingActiveRef.current) {
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
  }, [isRecordingLocked, recordingMode, shouldShowSendButton]);

  const handlePrimaryButtonClick = () => {
    if (isRecordingLocked && isRecordingActive) {
      stopRecording(true);
      return;
    }
    void sendChatMessage();
  };

  const replaceSelection = (nextText: string, selectionStart: number, selectionEnd: number) => {
    setMessageInput(nextText);
    requestAnimationFrame(() => {
      if (!inputRef.current) return;
      inputRef.current.focus();
      inputRef.current.setSelectionRange(selectionStart, selectionEnd);
    });
  };

  const insertAtSelection = (insertText: string) => {
    const input = inputRef.current;
    if (!input) return;
    const start = input.selectionStart ?? messageInput.length;
    const end = input.selectionEnd ?? messageInput.length;
    const next = messageInput.slice(0, start) + insertText + messageInput.slice(end);
    const caret = start + insertText.length;
    replaceSelection(next, caret, caret);
  };

  const wrapSelection = (open: string, close = open) => {
    const input = inputRef.current;
    if (!input) return;
    const start = input.selectionStart ?? messageInput.length;
    const end = input.selectionEnd ?? messageInput.length;
    const selected = messageInput.slice(start, end);
    const next = messageInput.slice(0, start) + open + selected + close + messageInput.slice(end);
    const selectionFrom = start + open.length;
    const selectionTo = selectionFrom + selected.length;
    replaceSelection(next, selectionFrom, selectionTo);
  };

  const wrapSelectionAsPre = () => {
    const input = inputRef.current;
    if (!input) return;
    const start = input.selectionStart ?? messageInput.length;
    const end = input.selectionEnd ?? messageInput.length;
    const selected = messageInput.slice(start, end);
    const preWrapped = selected ? `\`\`\`\n${selected}\n\`\`\`` : '\`\`\`\n\n\`\`\`';
    const next = messageInput.slice(0, start) + preWrapped + messageInput.slice(end);
    const caretStart = start + 4;
    const caretEnd = selected ? caretStart + selected.length : caretStart;
    replaceSelection(next, caretStart, caretEnd);
  };

  const handleComposerKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && !e.altKey) {
      const key = e.key.toLowerCase();
      if (key === 'b') {
        e.preventDefault();
        wrapSelection('**');
        return;
      }
      if (key === 'i') {
        e.preventDefault();
        wrapSelection('_');
        return;
      }
      if (key === 'u') {
        e.preventDefault();
        wrapSelection('__');
        return;
      }
      if (key === 'e') {
        e.preventDefault();
        wrapSelection('`');
        return;
      }
      if (key === 'x' && e.shiftKey) {
        e.preventDefault();
        wrapSelection('~~');
        return;
      }
      if (key === 's' && e.shiftKey) {
        e.preventDefault();
        wrapSelection('||');
        return;
      }
      if (key === 'p' && e.shiftKey) {
        e.preventDefault();
        wrapSelectionAsPre();
        return;
      }
    }

    if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault();
      insertAtSelection('\n\n');
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendChatMessage();
    }
  };

  const handleInputChange = (nextValue: string) => {
    setMessageInput(nextValue);
    if (selectedChat) {
      void sendTypingState(selectedChat, nextValue.trim().length > 0);
    }
  };

  const formatFileSize = (size?: number) => {
    if (!size || size <= 0) return '';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatRecordingTimer = (valueMs: number) => {
    const safeMs = Math.max(0, valueMs);
    const totalSeconds = Math.floor(safeMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const tenths = Math.floor((safeMs % 1000) / 100);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`;
  };

  return (
    <div className="flex-none p-3 border-t border-slate-800/50 bg-slate-900/30">
      {editingMessage && (
        <div className="mb-2 px-3 py-2 rounded-lg bg-indigo-900/40 border border-indigo-700/50 flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-xs text-indigo-400 font-medium mb-1">Editing message:</div>
            <div className="text-xs text-slate-300 truncate">{editingMessage.content}</div>
          </div>
          <button
            onClick={() => {
              setEditingMessage(null);
              setMessageInput('');
            }}
            className="p-1 hover:bg-indigo-800 rounded transition-colors"
            title="Cancel edit"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {replyingTo && (
        <div className="mb-2 px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/50 flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-xs text-indigo-400 font-medium mb-1">
              Reply to {replyingTo.senderId === userId ? 'yourself' : friends.find(f => f.userId === replyingTo.senderId)?.username || 'user'}:
            </div>
            <div className="text-xs text-slate-300 truncate">
              {(replyingTo.messageType === 'image' || replyingTo.messageType === 'images')
                ? '🖼️ Image'
                : (replyingTo.messageType === 'file' || replyingTo.messageType === 'files')
                  ? '📎 File'
                  : replyingTo.messageType === 'voice'
                    ? '🎤 Voice'
                    : replyingTo.messageType === 'circle'
                      ? '⭕ Video note'
                  : replyingTo.content}
            </div>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
            title="Cancel reply"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="relative mb-2">
        {isRecordingActive && !isRecordingLocked ? (
          <div
            ref={cancelZoneRef}
            aria-hidden
            className="pointer-events-none absolute left-0 right-0 -top-8 h-7"
          />
        ) : null}

        <div className="flex items-end gap-2">
          {isRecordingActive ? (
            <div
              className={`flex min-h-[42px] flex-1 items-center gap-4 rounded-xl border px-4 py-2.5 text-sm transition-colors ${
                isPointerInCancelZone
                  ? 'border-red-500/60 bg-red-900/20'
                  : 'border-slate-700/50 bg-slate-800/80'
              }`}
            >
              <div className="flex items-center gap-2 text-white">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                <span className="tabular-nums">{formatRecordingTimer(recordingElapsedMs)}</span>
              </div>
              {isRecordingLocked ? (
                <button
                  type="button"
                  className="mx-auto text-sm font-medium text-sky-400 transition-colors hover:text-sky-300"
                  onClick={() => {
                    setIsRecordingLocked(false);
                    stopRecording(false, true);
                  }}
                >
                  Отмена
                </button>
              ) : (
                <div
                  className={`truncate text-sm ${
                    isPointerInCancelZone ? 'text-red-300' : 'text-slate-400'
                  }`}
                >
                  Move here and release to cancel
                </div>
              )}
            </div>
          ) : (
            <textarea
              ref={inputRef}
              value={messageInput}
              onChange={e => handleInputChange(e.target.value)}
              onBlur={() => {
                if (selectedChat) {
                  void sendTypingState(selectedChat, false, true);
                }
              }}
              onKeyDown={handleComposerKeyDown}
              rows={1}
              className="flex-1 bg-slate-800/80 border border-slate-700/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-slate-500 resize-none min-h-[42px]"
              placeholder="Type a message..."
            />
          )}

          {!isRecordingActive ? (
            <label className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700/50 hover:bg-slate-700/80 cursor-pointer transition-colors group shrink-0">
              <input
                type="file"
                className="hidden"
                multiple
                onChange={e => {
                  const files = e.target.files;
                  if (files) {
                    for (let i = 0; i < files.length; i++) {
                      attachImage(files[i]);
                    }
                  }
                  e.target.value = '';
                }}
              />
              <svg className="w-5 h-5 text-slate-400 group-hover:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l7.071-7.071a4 4 0 10-5.657-5.657L5.757 10.757a6 6 0 108.486 8.486L20 13" />
              </svg>
            </label>
          ) : null}

          {shouldShowSendButton ? (
            <button
              ref={actionButtonRef}
              type="button"
              onClick={handlePrimaryButtonClick}
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-linear-to-br from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-sm font-medium transition-all shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 shrink-0"
              title={isRecordingLocked ? 'Send recording' : 'Send message'}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          ) : (
            <button
              ref={actionButtonRef}
              type="button"
              onPointerDown={handleRecordButtonPointerDown}
              onClick={handleRecordButtonClick}
              className={`relative inline-flex items-center justify-center w-10 h-10 rounded-xl border transition-colors shrink-0 ${
                isCancelGestureActive
                  ? 'bg-red-600/90 border-red-500 text-white'
                  : shouldShowRecordWaves
                  ? 'bg-sky-500/90 border-sky-400 text-white'
                  : 'bg-slate-800/80 border-slate-700/50 text-slate-400 hover:bg-slate-700/80 hover:text-indigo-400'
              }`}
              title={
                recordingMode === 'voice'
                  ? 'Click to switch to video note, hold to record voice'
                  : 'Click to switch to voice, hold to record video note'
              }
            >
              {isRecordingActive && !isRecordingLocked ? (
                <div className="pointer-events-none absolute -top-[104px] left-1/2 -translate-x-1/2">
                  <div
                    className={`relative h-24 w-12 overflow-hidden rounded-[24px] border bg-slate-900/95 transition-colors ${
                      lockHintProgress > 0.75
                        ? 'border-sky-400/80 shadow-lg shadow-sky-500/20'
                        : 'border-slate-700/70'
                    }`}
                  >
                    <div
                      className={`absolute inset-x-1 bottom-1 rounded-[18px] transition-all duration-100 ${
                        isPointerInCancelZone ? 'bg-red-500/25' : 'bg-sky-400/25'
                      }`}
                      style={{ height: `${18 + lockHintProgress * 70}%` }}
                    />
                    <div className="absolute inset-x-0 top-2 flex justify-center text-slate-200">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V8a4 4 0 118 0v3m-9 0h10a1 1 0 011 1v7a1 1 0 01-1 1H7a1 1 0 01-1-1v-7a1 1 0 011-1z" />
                      </svg>
                    </div>
                    <div className="absolute inset-x-0 bottom-2 flex justify-center text-slate-300">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M7 14l5-5 5 5" />
                      </svg>
                    </div>
                  </div>
                </div>
              ) : null}

              {shouldShowRecordWaves ? (
                <>
                  <span className="pointer-events-none absolute -inset-1 rounded-full bg-sky-300/35 animate-ping" />
                  <span
                    className="pointer-events-none absolute -inset-2 rounded-full bg-sky-400/25 animate-ping"
                    style={{ animationDelay: '120ms' }}
                  />
                </>
              ) : null}

              {recordingMode === 'voice' ? (
                <svg className="relative z-10 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 1v11m0 0a4 4 0 004-4V5a4 4 0 10-8 0v3a4 4 0 004 4zm-7 0a7 7 0 0014 0M8 21h8" />
                </svg>
              ) : (
                <svg className="relative z-10 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 7h8a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2z" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>

      {attachedImages.length > 0 && (
        <div className="mb-3 p-3 bg-slate-800/40 border border-slate-700/30 rounded-xl">
          <div className="text-xs text-slate-400 mb-2 font-medium">Attachments ({attachedImages.length}):</div>
          <div className="flex gap-2 flex-wrap">
            {attachedImages.map(img => (
              <div key={img.id} className="relative group">
                <div className="w-20 h-20 rounded-lg overflow-hidden border border-slate-600/50 bg-slate-900/50">
                  {img.isImage && img.preview ? (
                    <img src={img.preview} alt={img.file.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1 px-1 text-center">
                      <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7V5a2 2 0 012-2h6a2 2 0 012 2v2m-1 0H8a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2V9a2 2 0 00-2-2z" />
                      </svg>
                      <div className="text-[10px] leading-tight text-slate-300 line-clamp-2">{img.file.name}</div>
                      <div className="text-[9px] text-slate-500">{formatFileSize(img.sizeBytes ?? img.file.size)}</div>
                    </div>
                  )}
                  {img.uploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="text-xs text-white">Uploading...</div>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => removeAttachedImage(img.id)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500/80 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove"
                >
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
