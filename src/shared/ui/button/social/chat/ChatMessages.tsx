import { ImageWithLoader, UploadProgress } from '@/shared/ui/image';
import { buildMessageTextAndEntities, renderMessageContent } from '@/shared/utils/chatTextEntities';
import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import type { SocialFloatingModel } from '../useSocialFloatingModel';

type ChatMessagesProps = {
  model: SocialFloatingModel;
};

type VoiceMessageBubbleProps = {
  fileUrl: string;
  fileName?: string;
  contentType?: string;
  sizeBytes?: number;
  createdAt: string;
  isRead?: boolean;
  isOwn: boolean;
};

type CircleMessageBubbleProps = {
  fileUrl?: string;
  contentType?: string;
  createdAt: string;
  isRead?: boolean;
  status?: string;
  isOwn: boolean;
  onMediaError?: () => void;
};

const formatVoiceDuration = (value: number) => {
  const safe = Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const formatVoiceSize = (size?: number) => {
  if (!size || size <= 0) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const WAVEFORM_BARS = 78;

const buildFallbackWaveform = (seed: string, bars = WAVEFORM_BARS): number[] => {
  let state = 0;
  for (let i = 0; i < seed.length; i += 1) {
    state = (state * 31 + seed.charCodeAt(i)) >>> 0;
  }

  const output: number[] = [];
  for (let i = 0; i < bars; i += 1) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const noise = state / 0xffffffff;
    const x = i / Math.max(1, bars - 1);
    const envelope = 0.32 + 0.68 * Math.sin(Math.PI * x);
    const height = 0.18 + (0.82 * envelope + 0.18 * noise) * 0.78;
    output.push(Math.min(1, Math.max(0.12, height)));
  }

  return output;
};

const buildWaveformFromAudio = (samples: Float32Array, bars = WAVEFORM_BARS): number[] => {
  if (!samples.length || bars <= 0) {
    return [];
  }

  const chunkSize = Math.max(1, Math.floor(samples.length / bars));
  const values: number[] = [];

  for (let barIndex = 0; barIndex < bars; barIndex += 1) {
    const start = barIndex * chunkSize;
    const end = barIndex === bars - 1 ? samples.length : Math.min(samples.length, start + chunkSize);
    if (start >= end) {
      values.push(0.12);
      continue;
    }

    let sumSquares = 0;
    let peak = 0;
    for (let i = start; i < end; i += 1) {
      const v = Math.abs(samples[i]);
      sumSquares += v * v;
      if (v > peak) peak = v;
    }

    const rms = Math.sqrt(sumSquares / (end - start));
    const energy = Math.max(rms, peak * 0.65);
    values.push(energy);
  }

  const maxEnergy = Math.max(...values, 1e-6);
  const normalized = values.map((value) => Math.min(1, Math.max(0.12, value / maxEnergy)));

  const smoothed = normalized.map((value, i, arr) => {
    const prev = arr[Math.max(0, i - 1)];
    const next = arr[Math.min(arr.length - 1, i + 1)];
    return Math.min(1, Math.max(0.12, value * 0.5 + prev * 0.25 + next * 0.25));
  });

  return smoothed;
};

const mixRgbColor = (
  from: [number, number, number],
  to: [number, number, number],
  t: number
) => {
  const clamped = Math.min(1, Math.max(0, t));
  const r = Math.round(from[0] + (to[0] - from[0]) * clamped);
  const g = Math.round(from[1] + (to[1] - from[1]) * clamped);
  const b = Math.round(from[2] + (to[2] - from[2]) * clamped);
  return `rgb(${r}, ${g}, ${b})`;
};

function VoiceMessageBubble(props: VoiceMessageBubbleProps) {
  const { fileUrl, fileName, contentType, sizeBytes, createdAt, isRead, isOwn } = props;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPlaybackStarted, setHasPlaybackStarted] = useState(false);
  const [durationSec, setDurationSec] = useState(0);
  const [currentSec, setCurrentSec] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);

  const fallbackWaveform = useMemo(
    () => buildFallbackWaveform(`${fileUrl}|${fileName || ''}|${sizeBytes || 0}`),
    [fileName, fileUrl, sizeBytes]
  );
  const [waveform, setWaveform] = useState<number[]>(fallbackWaveform);

  const progress =
    hasPlaybackStarted && durationSec > 0
      ? Math.min(1, Math.max(0, currentSec / durationSec))
      : 0;
  const displaySeconds = hasPlaybackStarted ? currentSec : durationSec;
  const durationLabel = formatVoiceDuration(displaySeconds > 0 ? displaySeconds : durationSec);
  const sizeLabel = formatVoiceSize(sizeBytes);

  useEffect(() => {
    setWaveform(fallbackWaveform);
    setCurrentSec(0);
    setDurationSec(0);
    setHasPlaybackStarted(false);
    setIsPlaying(false);
  }, [fallbackWaveform, fileUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => {
      if (Number.isFinite(audio.duration)) {
        setDurationSec(audio.duration);
      }
    };
    const onTimeUpdate = () => setCurrentSec(audio.currentTime || 0);
    const onPlay = () => {
      setHasPlaybackStarted(true);
      setIsPlaying(true);
    };
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentSec(0);
      setHasPlaybackStarted(false);
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
    };
  }, [fileUrl]);

  useEffect(() => {
    let cancelled = false;
    const abortController = new AbortController();

    const buildRealWaveform = async () => {
      try {
        const response = await fetch(fileUrl, {
          signal: abortController.signal,
          cache: 'force-cache',
        });
        if (!response.ok) {
          throw new Error(`Waveform fetch failed with status ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        if (abortController.signal.aborted || cancelled) return;

        const AudioContextCtor =
          window.AudioContext ||
          (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextCtor) {
          return;
        }

        const audioContext = new AudioContextCtor();
        try {
          const decoded = await audioContext.decodeAudioData(arrayBuffer.slice(0));
          if (cancelled) return;

          const channelData = decoded.getChannelData(0);
          const realWaveform = buildWaveformFromAudio(channelData);
          if (realWaveform.length > 0) {
            setWaveform(realWaveform);
          }

          if (Number.isFinite(decoded.duration) && decoded.duration > 0) {
            setDurationSec((prev) => (prev > 0 ? prev : decoded.duration));
          }
        } finally {
          await audioContext.close().catch(() => undefined);
        }
      } catch (error) {
        if (!cancelled && !abortController.signal.aborted) {
          console.debug('Voice waveform fallback is used', error);
        }
      }
    };

    void buildRealWaveform();
    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [fileUrl]);

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (audio.paused) {
        if (!hasPlaybackStarted && audio.currentTime !== 0) {
          audio.currentTime = 0;
          setCurrentSec(0);
        }
        await audio.play();
      } else {
        audio.pause();
      }
    } catch (error) {
      console.warn('Voice playback failed', error);
    }
  };

  const seekTo = (event: ReactMouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !durationSec || !hasPlaybackStarted) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const relative = (event.clientX - rect.left) / Math.max(1, rect.width);
    const clamped = Math.min(1, Math.max(0, relative));
    audio.currentTime = clamped * durationSec;
    setCurrentSec(audio.currentTime);
  };

  const handleTranscribe = async () => {
    setIsTranscribing(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 420));
      setTranscript('Voice-to-text endpoint is not configured yet.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const bubbleClass = isOwn
    ? 'rounded-2xl bg-linear-to-br from-indigo-600 to-indigo-700 px-3 py-2 text-white shadow-lg shadow-indigo-500/25'
    : 'rounded-2xl bg-slate-800/90 border border-slate-700/60 px-3 py-2 text-slate-100 shadow-lg shadow-slate-900/50';
  const playButtonClass = isOwn
    ? 'flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-400 text-white transition hover:bg-indigo-300'
    : 'flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-700 text-slate-100 transition hover:bg-slate-600';
  const activeWaveStart = isOwn ? ([224, 231, 255] as [number, number, number]) : ([226, 232, 240] as [number, number, number]);
  const activeWaveEnd = isOwn ? ([165, 180, 252] as [number, number, number]) : ([148, 163, 184] as [number, number, number]);
  const inactiveWaveColor = isOwn ? 'rgba(165, 180, 252, 0.33)' : 'rgba(100, 116, 139, 0.52)';
  const metaTextClass = isOwn ? 'text-indigo-100/90' : 'text-slate-300';
  const dotClass = isOwn ? 'text-indigo-300/90' : 'text-slate-400';
  const timeClass = isOwn ? 'text-indigo-100/90' : 'text-slate-300/90';
  const unreadTickClass = isOwn ? 'text-indigo-100/90' : 'text-slate-300/90';
  const transcribeButtonClass = isOwn
    ? 'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/60 text-indigo-100 transition hover:bg-indigo-500/80 disabled:cursor-not-allowed disabled:opacity-70'
    : 'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-700/80 text-slate-200 transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-70';
  const transcriptClass = isOwn
    ? 'mt-1 rounded-md bg-indigo-900/35 px-2 py-1 text-[11px] text-indigo-50'
    : 'mt-1 rounded-md bg-slate-900/40 px-2 py-1 text-[11px] text-slate-200';

  return (
    <div className={bubbleClass}>
      <audio ref={audioRef} preload="metadata">
        <source src={fileUrl} type={contentType || 'audio/ogg'} />
      </audio>

      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={togglePlayback}
          className={playButtonClass}
          title={isPlaying ? 'Pause voice message' : 'Play voice message'}
        >
          {isPlaying ? (
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
              <path d="M8 6h3v12H8zM13 6h3v12h-3z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
              <path d="M8 5.5v13l10-6.5z" />
            </svg>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div
            className="flex h-4 cursor-pointer items-center gap-[2px]"
            onClick={seekTo}
            role="slider"
            aria-label="Voice playback position"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
          >
            {waveform.map((value, index) => {
              const normalizedIndex = index / Math.max(1, waveform.length - 1);
              const active = normalizedIndex <= progress;
              const activeZone = progress > 0 ? Math.min(1, normalizedIndex / progress) : 0;
              const playedColor = mixRgbColor(activeWaveStart, activeWaveEnd, activeZone);
              const barColor = active ? playedColor : inactiveWaveColor;
              const barOpacity = active
                ? Math.max(0.78, 1 - Math.max(0, progress - normalizedIndex) * 0.5)
                : 0.82;
              return (
                <span
                  key={`bar-${index}`}
                  className="w-[3px] rounded-full transition-[background-color,opacity] duration-150"
                  style={{
                    height: `${Math.round(value * 13)}px`,
                    backgroundColor: barColor,
                    opacity: barOpacity,
                  }}
                />
              );
            })}
          </div>

          <div className={`mt-1 flex items-center gap-1.5 text-[11px] ${metaTextClass}`}>
            <span>{durationLabel}</span>
            {sizeLabel ? <span>{`, ${sizeLabel}`}</span> : null}
            <span className={dotClass}>•</span>
            <span className={`ml-auto text-[10px] ${timeClass}`}>
              {new Date(createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
              {isOwn ? (
                <span className="ml-1.5 -space-x-0.5 inline-flex align-middle">
                  {isRead ? (
                    <>
                      <span className="text-[#7de4b7]">✓</span>
                      <span className="text-[#7de4b7]">✓</span>
                    </>
                  ) : (
                    <span className={unreadTickClass}>✓</span>
                  )}
                </span>
              ) : null}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleTranscribe}
          disabled={isTranscribing}
          className={transcribeButtonClass}
          title="Convert voice to text"
        >
          {isTranscribing ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" />
          ) : (
            <span className="text-xs font-semibold">→A</span>
          )}
        </button>
      </div>

      {transcript ? (
        <div className={transcriptClass}>
          {transcript}
        </div>
      ) : null}
    </div>
  );
}

function CircleMessageBubble(props: CircleMessageBubbleProps) {
  const { fileUrl, contentType, createdAt, isRead, status, isOwn, onMediaError } = props;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [durationSec, setDurationSec] = useState(0);
  const [currentSec, setCurrentSec] = useState(0);
  const [mediaPhase, setMediaPhase] = useState<'processing' | 'downloading' | 'ready' | 'error'>('processing');
  const [resolvedFileUrl, setResolvedFileUrl] = useState<string | null>(null);

  const circleSize = 176;
  const ringStrokeWidth = 4;
  const ringCenter = circleSize / 2;
  const radius = ringCenter - ringStrokeWidth / 2;
  const playbackProgress = durationSec > 0 ? Math.min(1, Math.max(0, currentSec / durationSec)) : 0;
  const ringProgressColor = isOwn ? 'rgb(165, 180, 252)' : 'rgb(148, 163, 184)';
  const circumference = 2 * Math.PI * radius;
  const ringProgress = mediaPhase === 'ready' ? playbackProgress : 0.08;
  const dashOffset = circumference * (1 - ringProgress);
  const messageTime = new Date(createdAt).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });

  useEffect(() => {
    setIsPlaying(false);
    setDurationSec(0);
    setCurrentSec(0);
    setResolvedFileUrl(null);
    setMediaPhase('processing');

    if (!fileUrl) {
      setMediaPhase('processing');
      return;
    }

    const normalizedFileUrl = fileUrl.trim();

    if (!normalizedFileUrl) {
      setMediaPhase('processing');
      return;
    }

    if (normalizedFileUrl.startsWith('blob:') || normalizedFileUrl.startsWith('data:')) {
      setResolvedFileUrl(normalizedFileUrl);
      setMediaPhase('ready');
      return;
    }

    const isChatMediaUrl = /\/media\/chat_(files|images)\//.test(normalizedFileUrl);
    const hasTokenQuery = normalizedFileUrl.includes('token=');
    if (isChatMediaUrl && !hasTokenQuery) {
      // Wait for WS/refresh payload with a signed media URL to avoid request storm with invalid URL.
      setMediaPhase('processing');
      return;
    }

    setResolvedFileUrl(normalizedFileUrl);
    setMediaPhase('ready');
  }, [fileUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || mediaPhase !== 'ready' || !resolvedFileUrl) return;

    const onLoadedMetadata = () => {
      if (Number.isFinite(video.duration)) {
        setDurationSec(video.duration);
      }
    };
    const onTimeUpdate = () => setCurrentSec(video.currentTime || 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onError = () => {
      setIsPlaying(false);
      setMediaPhase('error');
      onMediaError?.();
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentSec(0);
      video.currentTime = 0;
    };

    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('error', onError);
    video.addEventListener('ended', onEnded);

    return () => {
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('error', onError);
      video.removeEventListener('ended', onEnded);
    };
  }, [mediaPhase, onMediaError, resolvedFileUrl]);

  const togglePlayback = async () => {
    if (mediaPhase !== 'ready') return;
    const video = videoRef.current;
    if (!video) return;
    try {
      if (video.paused) {
        await video.play();
      } else {
        video.pause();
      }
    } catch (error) {
      console.warn('Circle playback failed', error);
    }
  };

  return (
    <div className="relative inline-flex h-44 w-44">
      <button
        type="button"
        onClick={togglePlayback}
        className="relative h-44 w-44 cursor-pointer overflow-visible rounded-full border-none bg-transparent p-0"
        aria-label={isPlaying ? 'Pause video note' : 'Play video note'}
      >
        {mediaPhase === 'ready' && resolvedFileUrl ? (
          <video
            ref={videoRef}
            src={resolvedFileUrl}
            preload="metadata"
            playsInline
            className="h-44 w-44 rounded-full object-cover"
          >
            <source src={resolvedFileUrl} type={contentType || 'video/mp4'} />
          </video>
        ) : (
          <div className="relative h-44 w-44 overflow-hidden rounded-full bg-slate-800/95">
            <div className="absolute inset-0 animate-pulse bg-[radial-gradient(circle_at_25%_20%,rgba(148,163,184,0.20),transparent_58%)]" />
            <div
              className="absolute inset-0 animate-pulse bg-[radial-gradient(circle_at_78%_74%,rgba(71,85,105,0.45),transparent_62%)]"
              style={{ animationDelay: '700ms' }}
            />
            <div
              className="absolute inset-0 animate-pulse bg-[radial-gradient(circle_at_50%_45%,rgba(30,41,59,0.45),transparent_72%)]"
              style={{ animationDelay: '350ms' }}
            />
          </div>
        )}

        <svg
          viewBox={`0 0 ${circleSize} ${circleSize}`}
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <circle
            cx={ringCenter}
            cy={ringCenter}
            r={radius}
            fill="none"
            stroke="rgba(148, 163, 184, 0.32)"
            strokeWidth={ringStrokeWidth}
          />
          <circle
            cx={ringCenter}
            cy={ringCenter}
            r={radius}
            fill="none"
            stroke={ringProgressColor}
            strokeWidth={ringStrokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${ringCenter} ${ringCenter})`}
            className="transition-[stroke-dashoffset] duration-100"
          />
        </svg>

        <div className="pointer-events-none absolute bottom-1.5 left-1.5 rounded-xl bg-slate-900/70 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
          {mediaPhase === 'ready'
            ? formatVoiceDuration(isPlaying ? currentSec : durationSec)
            : mediaPhase === 'error'
              ? 'Not ready'
              : 'Preparing'}
          <span className="ml-1.5 text-white/80">•</span>
        </div>

        {isOwn ? (
          <div className="pointer-events-none absolute bottom-1.5 right-1.5 rounded-xl bg-slate-900/70 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
            {messageTime}
            <span className="ml-1.5 -space-x-0.5 inline-flex align-middle">
              {status === 'pending' ? (
                <svg className="h-3 w-3 animate-pulse text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : isRead ? (
                <>
                  <span className="text-[#7de4b7]">✓</span>
                  <span className="text-[#7de4b7]">✓</span>
                </>
              ) : (
                <span className="text-white/80">✓</span>
              )}
            </span>
          </div>
        ) : null}
      </button>
    </div>
  );
}

export function ChatMessages({ model }: ChatMessagesProps) {
  const {
    messages,
    userId,
    selectedChat,
    loadMessages,
    setContextMenu,
    friends,
    getImageGridLayout,
    uploadingImages,
    messagesEndRef,
  } = model;
  const lastCircleReloadAtRef = useRef(0);

  const formatFileSize = (size?: number) => {
    if (!size || size <= 0) return '';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const resolveFileName = (path?: string, fallback?: string) => {
    if (fallback) return fallback;
    if (!path) return 'file';
    const slash = path.lastIndexOf('/');
    return slash >= 0 ? path.slice(slash + 1) : path;
  };

  const isAudioContentType = (value?: string) => (value || '').toLowerCase().startsWith('audio/');
  const isVideoContentType = (value?: string) => (value || '').toLowerCase().startsWith('video/');
  const refreshSignedMediaUrls = () => {
    if (!selectedChat) return;
    const now = Date.now();
    if (now - lastCircleReloadAtRef.current < 1500) return;
    lastCircleReloadAtRef.current = now;
    void loadMessages(selectedChat, false);
  };
  const resolveMediaUrl = (value?: string) => {
    if (!value) return '';
    const normalized = value.trim();
    if (!normalized) return '';
    if (normalized.startsWith('blob:') || normalized.startsWith('data:')) {
      return normalized;
    }
    const isChatMediaUrl = /\/media\/chat_(files|images)\//.test(normalized);
    if (isChatMediaUrl && !normalized.includes('token=')) {
      return '';
    }
    return normalized;
  };

  return (
    <div className="h-full overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-2">
            <div className="text-6xl opacity-20">💬</div>
            <p className="text-slate-400 text-sm">No messages yet</p>
            <p className="text-slate-500 text-xs">Start the conversation</p>
          </div>
        </div>
      ) : (
        messages.map((m) => {
          const hasCaption = Boolean(m.content && m.content.trim());
          const isImageMessage = m.messageType === 'image' || m.messageType === 'images';
          const isFileMessage =
            m.messageType === 'file' ||
            m.messageType === 'files' ||
            m.messageType === 'voice' ||
            m.messageType === 'circle';
          const isMediaMessage = isImageMessage || isFileMessage;

          const fallbackParsed = buildMessageTextAndEntities(m.content || '');
          const renderContent = m.entities && m.entities.length > 0 ? (m.content || '') : fallbackParsed.content;
          const renderEntities = m.entities && m.entities.length > 0 ? m.entities : fallbackParsed.entities;

          const attachments = m.images && m.images.length > 0
            ? m.images
            : (m.imagePath || m.imageUrl)
              ? [{ imagePath: m.imagePath || '', imageUrl: m.imageUrl, isImage: isImageMessage }]
              : [];
          const isVoiceOnlyMessage =
            m.messageType === 'voice' &&
            attachments.length > 0 &&
            attachments.every((file) => isAudioContentType(file.contentType || ''));
          const isCircleOnlyMessage =
            m.messageType === 'circle' &&
            attachments.length > 0;

          return (
            <div
              key={m.localId ?? m.messageId}
              data-message-id={m.messageId}
              data-sender-id={m.senderId}
              className={`message-item flex ${m.senderId === userId ? 'justify-end' : 'justify-start'} group`}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({ x: e.clientX, y: e.clientY, message: m });
              }}
            >
              <div
                className={
                  isVoiceOnlyMessage || isCircleOnlyMessage
                    ? 'max-w-[75%] relative text-sm whitespace-pre-wrap wrap-break-word p-0 bg-transparent shadow-none border-0 overflow-visible'
                    : `max-w-[75%] rounded-2xl overflow-hidden text-sm whitespace-pre-wrap wrap-break-word shadow-lg relative ${
                        isMediaMessage ? 'p-0' : 'px-2 py-1'
                      } ${
                        m.senderId === userId
                          ? 'bg-linear-to-br from-indigo-600 to-indigo-700 text-white shadow-indigo-500/30'
                          : 'bg-slate-800/90 text-slate-100 shadow-slate-900/50 border border-slate-700/50'
                      }`
                }
              >
                {m.replyToMessage && (
                  <div
                    className={`rounded-lg border-l-2 ${
                      isMediaMessage ? 'px-2 py-1 mx-3 mt-3 mb-2' : 'px-2 py-1 mb-2'
                    } ${m.senderId === userId ? 'bg-indigo-800/40 border-indigo-400' : 'bg-slate-700/40 border-slate-500'}`}
                  >
                    <div className={`text-[10px] font-medium mb-1 ${m.senderId === userId ? 'text-indigo-300' : 'text-slate-400'}`}>
                      {m.replyToMessage.senderId === userId
                        ? 'You'
                        : friends.find(f => f.userId === m.replyToMessage!.senderId)?.username || 'User'}
                    </div>
                    <div
                      className={`text-xs opacity-80 ${(m.replyToMessage.messageType === 'image' || m.replyToMessage.messageType === 'images') ? 'italic' : 'line-clamp-2'}`}
                    >
                      {(m.replyToMessage.messageType === 'image' || m.replyToMessage.messageType === 'images')
                        ? '🖼️ Image'
                        : (m.replyToMessage.messageType === 'file' || m.replyToMessage.messageType === 'files')
                          ? '📎 File'
                          : m.replyToMessage.messageType === 'voice'
                            ? '🎤 Voice'
                            : m.replyToMessage.messageType === 'circle'
                              ? '⭕ Video note'
                          : m.replyToMessage.content}
                    </div>
                  </div>
                )}

                {isImageMessage && attachments.length > 0 ? (
                  <div className="relative">
                    {attachments.length > 1 ? (
                      (() => {
                        const gridLayout = getImageGridLayout(attachments.length);
                        return (
                          <div
                            className={`grid gap-1 ${hasCaption ? 'p-2' : 'p-0'} w-96 max-w-full aspect-square overflow-hidden`}
                            style={{
                              gridTemplateColumns: `repeat(${gridLayout.columns}, minmax(0, 1fr))`,
                              gridTemplateRows: `repeat(${gridLayout.rows}, minmax(0, 1fr))`,
                            }}
                          >
                            {attachments.map((img, idx) => {
                              const displayUrl = img.imageUrl || (img.imagePath ? `/media/${img.imagePath}` : '');
                              const isLoading = !displayUrl;
                              const uploadKey = `${m.messageId}-${idx}`;
                              const progress = uploadingImages.get(uploadKey)?.progress || 0;
                              const span = gridLayout.spans[idx] || { colSpan: 1, rowSpan: 1 };

                              return (
                                <div
                                  key={idx}
                                  className="relative overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                                  style={{
                                    gridColumn: `span ${span.colSpan} / span ${span.colSpan}`,
                                    gridRow: `span ${span.rowSpan} / span ${span.rowSpan}`,
                                  }}
                                >
                                  {isLoading ? (
                                    <div className="w-full h-full bg-slate-700/50 border border-slate-600 flex items-center justify-center">
                                      <div className="relative w-12 h-12">
                                        <svg className="w-full h-full" viewBox="0 0 100 100">
                                          <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-600" />
                                          <circle
                                            cx="50"
                                            cy="50"
                                            r="45"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeDasharray={`${2.827 * progress} ${282.7}`}
                                            className="text-blue-400 transition-all"
                                            style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
                                          />
                                        </svg>
                                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">{progress}%</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <ImageWithLoader
                                      src={displayUrl}
                                      alt={`img-${idx}`}
                                      className="w-full h-full object-cover"
                                      placeholderClassName="w-full h-full bg-slate-700"
                                      onClick={() => displayUrl && window.open(displayUrl, '_blank')}
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()
                    ) : (
                      (() => {
                        const hasTempId = typeof m.messageId === 'string' && m.messageId.startsWith('temp-img-');
                        const firstImg = attachments[0];
                        const displayUrl = firstImg?.imageUrl || (firstImg?.imagePath ? `/media/${firstImg.imagePath}` : '');
                        const isLoading = !displayUrl && !hasTempId;
                        const uploadKey = hasTempId ? `${m.messageId}-0` : '';
                        const progress = uploadKey ? uploadingImages.get(uploadKey)?.progress || 0 : 0;

                        return isLoading ? (
                          <div className="bg-slate-800/50 border-2 border-dashed border-slate-600 flex items-center justify-center" style={{ minHeight: '200px', minWidth: '250px' }}>
                            <div className="flex flex-col items-center gap-3">
                              <UploadProgress progress={progress} size="lg" />
                              <span className="text-xs text-slate-400">Uploading image...</span>
                            </div>
                          </div>
                        ) : (
                          <ImageWithLoader
                            src={displayUrl}
                            alt="img"
                            className="max-h-96 w-full object-cover cursor-pointer hover:opacity-95 transition-opacity"
                            placeholderClassName="min-h-[200px] min-w-[250px]"
                            onClick={() => displayUrl && window.open(displayUrl, '_blank')}
                          />
                        );
                      })()
                    )}

                    {!hasCaption && (
                      <div className="absolute bottom-2 right-1 px-2 py-1 rounded-full bg-black/60 backdrop-blur-md flex items-center gap-1.5 shadow-lg">
                        <span className="text-[10px] text-white font-medium">
                          {new Date(m.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {m.senderId === userId && (
                          <span className="text-[10px] -space-x-0.5 inline-flex">
                            {m.status === 'pending' ? (
                              <svg className="w-3 h-3 text-white/70 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            ) : m.isRead ? (
                              <>
                                <span className="text-green-400">✓</span>
                                <span className="text-green-400">✓</span>
                              </>
                            ) : (
                              <span className="text-white/70">✓</span>
                            )}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ) : null}

                {isFileMessage && attachments.length > 0 ? (
                  <div className={isCircleOnlyMessage ? 'p-0' : `${hasCaption ? 'px-3 pt-3 pb-1' : 'p-3'} space-y-2`}>
                    {attachments.map((file, idx) => {
                      const attachmentLevelUrl = resolveMediaUrl(file.imageUrl);
                      const singleAttachmentMessageUrl =
                        attachments.length === 1 ? resolveMediaUrl(m.imageUrl) : '';
                      const fileUrl = attachmentLevelUrl || singleAttachmentMessageUrl;
                      const fileName = resolveFileName(file.imagePath, file.fileName);
                      const sizeLabel = formatFileSize(file.sizeBytes);
                      const contentType = file.contentType || 'application/octet-stream';
                      const isAudio = isAudioContentType(contentType);
                      const isVideo = isVideoContentType(contentType);
                      const isVoiceMessage = m.messageType === 'voice' && isAudio;
                      const isCircleMessage = m.messageType === 'circle' && isVideo;

                      if (isCircleMessage) {
                        return (
                          <CircleMessageBubble
                            key={`${m.messageId}-circle-${idx}`}
                            fileUrl={fileUrl || undefined}
                            contentType={contentType}
                            createdAt={m.createdAt}
                            isRead={m.isRead}
                            status={m.status}
                            isOwn={m.senderId === userId}
                            onMediaError={refreshSignedMediaUrls}
                          />
                        );
                      }

                      if (isVoiceMessage && fileUrl) {
                        return (
                          <VoiceMessageBubble
                            key={`${m.messageId}-voice-${idx}`}
                            fileUrl={fileUrl}
                            fileName={fileName}
                            contentType={contentType}
                            sizeBytes={file.sizeBytes}
                            createdAt={m.createdAt}
                            isRead={m.isRead}
                            isOwn={m.senderId === userId}
                          />
                        );
                      }

                      return (
                        <div
                          key={`${m.messageId}-file-${idx}`}
                          className="rounded-xl bg-black/20 border border-white/10 p-2"
                        >
                          {isCircleMessage && fileUrl ? (
                            <div className="mx-auto mb-2 h-44 w-44 overflow-hidden rounded-full border border-white/15 bg-black/30">
                              <video
                                controls
                                preload="metadata"
                                src={fileUrl}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : null}

                          <a
                            href={fileUrl || '#'}
                            target={fileUrl ? "_blank" : undefined}
                            rel={fileUrl ? "noreferrer" : undefined}
                            className={`flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors ${
                              fileUrl ? 'hover:bg-black/20' : 'opacity-70 cursor-default'
                            }`}
                          >
                            <svg className="w-4 h-4 shrink-0 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7V5a2 2 0 012-2h6a2 2 0 012 2v2m-1 0H8a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2V9a2 2 0 00-2-2z" />
                            </svg>
                            <div className="min-w-0">
                              <div className="truncate text-xs font-medium">{fileName}</div>
                              <div className="text-[10px] opacity-70">
                                {contentType}{sizeLabel ? ` • ${sizeLabel}` : ''}
                              </div>
                            </div>
                          </a>
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                {hasCaption && (
                  <div className={`leading-relaxed ${isMediaMessage ? 'px-3 pt-2' : ''}`}>
                    {renderMessageContent(renderContent, renderEntities)}
                  </div>
                )}

                {hasCaption && !isCircleOnlyMessage ? (
                  <div
                    className={`pl-2 pr-1 pb-1 text-[10px] text-right opacity-70 flex items-center justify-end gap-1 ${
                      m.senderId === userId ? 'text-indigo-200' : 'text-slate-400'
                    }`}
                  >
                    {m.edited && <span className="opacity-60">ред.</span>}
                    {new Date(m.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    {m.senderId === userId && (
                      <span className="ml-0.5 -space-x-0.5 inline-flex">
                        {m.status === 'pending' ? (
                          <svg className="w-3 h-3 text-indigo-400/60 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : m.isRead ? (
                          <>
                            <span className="text-indigo-300">✓</span>
                            <span className="text-indigo-300">✓</span>
                          </>
                        ) : (
                          <span className="text-indigo-400/60">✓</span>
                        )}
                      </span>
                    )}
                  </div>
                ) : !isImageMessage && m.messageType !== 'voice' && m.messageType !== 'circle' ? (
                  <div
                    className={`mt-1 text-[10px] text-right opacity-70 flex items-center justify-end gap-1 pr-1 ${
                      m.senderId === userId ? 'text-indigo-200' : 'text-slate-400'
                    }`}
                  >
                    {m.edited && <span className="opacity-60">ред.</span>}
                    {new Date(m.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    {m.senderId === userId && (
                      <span className="ml-0.5 -space-x-0.5 inline-flex">
                        {m.status === 'pending' ? (
                          <svg className="w-3 h-3 text-indigo-400/60 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : m.isRead ? (
                          <>
                            <span className="text-indigo-300">✓</span>
                            <span className="text-indigo-300">✓</span>
                          </>
                        ) : (
                          <span className="text-indigo-400/60">✓</span>
                        )}
                      </span>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}

