import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type RefObject } from 'react';
import type { ChatMessage } from '@/shared/api/types';
import {
  buildMessageTextAndEntities,
  extractMessageLinks,
  renderMessageContent,
  type ChatResolvedLink,
} from '@/shared/utils/chatTextEntities';
import { CheckCheckIcon, PauseIcon, PlayIcon } from '../icons';
import type { ChatPlaybackState, MessageRow } from '../types';
import {
  buildFallbackWaveform,
  formatDivider,
  formatDuration,
  formatFileSize,
  formatMessageTime,
  getMessageAttachments,
  isAudioContentType,
  isMessageRead,
  isVideoContentType,
  loadWaveformFromAudioUrl,
  messagePreviewText,
  resolveAttachmentUrl,
  transcribeVoiceMessageFromUrl,
} from '../utils';

type ChatMessageListProps = {
  messages: ChatMessage[];
  userId: string;
  hasSelectedChat: boolean;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  matchedMessageIds: string[];
  activeMatchedMessageId: string | null;
  onCircleMediaError?: () => void;
  resolveUserName: (userId: string) => string;
  onPlaybackStateChange?: (state: ChatPlaybackState | null) => void;
  onReplyMessage: (message: ChatMessage) => void;
  onEditMessage: (message: ChatMessage) => void;
  onDeleteMessage: (messageId: number | string) => void;
  onCopyMessage: (text: string) => void;
};

type ReplyPreview = {
  author: string;
  text: string;
};

type MessageTextBubbleProps = {
  content: string;
  entities?: ChatMessage['entities'];
  videoPreview: VideoLinkPreview | null;
  time: string;
  isOwn: boolean;
  isRead: boolean;
  isEdited: boolean;
  replyPreview?: ReplyPreview;
};

type VideoLinkPreview = {
  sourceLabel: string;
  title: string;
  description: string;
  url: string;
  posterUrl?: string;
  embedUrl?: string;
  directVideoUrl?: string;
  durationLabel?: string;
};

type VoiceMessageBubbleProps = {
  mediaId: string;
  author: string;
  fileUrl?: string;
  fileName?: string;
  contentType?: string;
  sizeBytes?: number;
  createdAt: string;
  isRead: boolean;
  isOwn: boolean;
  isEdited: boolean;
  onPlaybackStateChange?: (state: ChatPlaybackState) => void;
};

type CircleMessageBubbleProps = {
  mediaId: string;
  author: string;
  fileUrl?: string;
  contentType?: string;
  createdAt: string;
  isRead: boolean;
  isEdited: boolean;
  status?: string;
  isOwn: boolean;
  isMuted: boolean;
  onToggleMuted: () => void;
  onMediaError?: () => void;
  onPlaybackStateChange?: (state: ChatPlaybackState) => void;
};

function DateDivider({ label }: { label: string }) {
  return (
    <div className="my-[7px] flex justify-center">
      <div className="rounded-[14px] bg-[#4c285c]/86 px-[10px] py-[5px] text-[15px] font-[600] leading-none text-white shadow-[0_6px_18px_rgba(0,0,0,0.28)] backdrop-blur-sm">
        {label}
      </div>
    </div>
  );
}

const toMessageDomId = (messageId: string | number) =>
  `chat-message-${String(messageId).replace(/[^a-zA-Z0-9_-]/g, '_')}`;

const VIDEO_FILE_PATTERN = /\.(mp4|webm|mov|m4v|ogv|m3u8)(?:$|[?#])/i;
const VIDEO_HINT_PATTERN =
  /(\/(watch|video|videos|clip|clips|reel|reels|short|shorts|player|embed|stream|live)\b|[?&](v|video|vid|id)=)/i;
const VIDEO_META_CACHE = new Map<string, VideoPreviewMeta | null>();

type VideoPreviewMeta = {
  providerName?: string;
  title?: string;
  description?: string;
  authorName?: string;
  thumbnailUrl?: string;
  durationLabel?: string;
};

function buildOEmbedEndpoints(preview: VideoLinkPreview): string[] {
  const encodedUrl = encodeURIComponent(preview.url);
  const normalizedSource = preview.sourceLabel.toLowerCase();
  const endpoints: string[] = [];

  if (normalizedSource === 'youtube') {
    endpoints.push(`https://www.youtube.com/oembed?url=${encodedUrl}&format=json`);
  } else if (normalizedSource === 'vimeo') {
    endpoints.push(`https://vimeo.com/api/oembed.json?url=${encodedUrl}`);
  } else if (normalizedSource === 'dailymotion') {
    endpoints.push(`https://www.dailymotion.com/services/oembed?url=${encodedUrl}`);
  } else if (normalizedSource === 'rutube') {
    endpoints.push(`https://rutube.ru/api/oembed/?url=${encodedUrl}`);
  }

  endpoints.push(`https://noembed.com/embed?url=${encodedUrl}`);
  return endpoints;
}

async function fetchVideoPreviewMeta(preview: VideoLinkPreview): Promise<VideoPreviewMeta | null> {
  const endpoints = buildOEmbedEndpoints(preview);
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });
      if (!response.ok) continue;

      const payload = (await response.json()) as {
        provider_name?: string;
        title?: string;
        author_name?: string;
        thumbnail_url?: string;
        description?: string;
        duration?: number;
      };
      if (!payload) continue;

      const durationLabel =
        typeof payload.duration === 'number' && payload.duration > 0
          ? formatDuration(payload.duration)
          : undefined;
      const description =
        payload.description?.trim() ||
        (payload.author_name ? `by ${payload.author_name}` : undefined);

      const meta: VideoPreviewMeta = {
        providerName: payload.provider_name?.trim(),
        title: payload.title?.trim(),
        description,
        authorName: payload.author_name?.trim(),
        thumbnailUrl: payload.thumbnail_url?.trim(),
        durationLabel,
      };

      return meta;
    } catch {
      continue;
    }
  }

  return null;
}

function getPrimaryVideoPreview(
  content: string,
  entities?: ChatMessage['entities']
): VideoLinkPreview | null {
  const links = extractMessageLinks(content, entities);
  for (const link of links) {
    const preview = toVideoLinkPreview(link);
    if (preview) return preview;
  }
  return null;
}

function toVideoLinkPreview(link: ChatResolvedLink): VideoLinkPreview | null {
  let parsed: URL;
  try {
    parsed = new URL(link.href);
  } catch {
    return null;
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  const readableHost = host.replace(/^m\./, '');

  const youtubeId = getYouTubeVideoId(parsed, host);
  if (youtubeId) {
    const youtubePathParts = parsed.pathname.split('/').filter(Boolean);
    const youtubeTail = youtubePathParts.length > 0 ? youtubePathParts[youtubePathParts.length - 1] : '';
    return {
      sourceLabel: 'YouTube',
      title: decodeLinkTitle(youtubeTail || youtubeId),
      description: 'Watch on YouTube',
      url: parsed.toString(),
      posterUrl: `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
      embedUrl: `https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1`,
    };
  }

  const vimeoId = getVimeoVideoId(parsed, host);
  if (vimeoId) {
    return {
      sourceLabel: 'Vimeo',
      title: decodeLinkTitle(vimeoId),
      description: 'Watch on Vimeo',
      url: parsed.toString(),
      embedUrl: `https://player.vimeo.com/video/${vimeoId}?autoplay=1`,
    };
  }

  const dailymotionId = getDailymotionVideoId(parsed, host);
  if (dailymotionId) {
    return {
      sourceLabel: 'Dailymotion',
      title: decodeLinkTitle(dailymotionId),
      description: 'Watch on Dailymotion',
      url: parsed.toString(),
      embedUrl: `https://www.dailymotion.com/embed/video/${dailymotionId}?autoplay=1`,
    };
  }

  const rutubeId = getRutubeVideoId(parsed, host);
  if (rutubeId) {
    return {
      sourceLabel: 'Rutube',
      title: decodeLinkTitle(rutubeId),
      description: 'Watch on Rutube',
      url: parsed.toString(),
      embedUrl: `https://rutube.ru/play/embed/${rutubeId}/?autoplay=1`,
    };
  }

  const normalizedHref = parsed.toString();
  if (VIDEO_FILE_PATTERN.test(normalizedHref)) {
    return {
      sourceLabel: readableHost,
      title: decodeLinkTitle(parsed.pathname.split('/').pop() || 'video'),
      description: 'Direct video file',
      url: normalizedHref,
      directVideoUrl: normalizedHref,
    };
  }

  const pathAndQuery = `${parsed.pathname}${parsed.search}`.toLowerCase();
  const likelyVideo = VIDEO_HINT_PATTERN.test(pathAndQuery);
  if (!likelyVideo) {
    return null;
  }

  const genericPathParts = parsed.pathname.split('/').filter(Boolean);
  const genericTail = genericPathParts.length > 0 ? genericPathParts[genericPathParts.length - 1] : '';
  return {
    sourceLabel: readableHost,
    title: decodeLinkTitle(genericTail || parsed.hostname),
    description: 'Video link preview',
    url: normalizedHref,
  };
}

function getYouTubeVideoId(url: URL, host: string): string | null {
  if (host === 'youtu.be') {
    const shortId = url.pathname.split('/').filter(Boolean)[0];
    return shortId || null;
  }
  if (!host.includes('youtube.com')) return null;
  if (url.pathname === '/watch') {
    return url.searchParams.get('v');
  }
  if (url.pathname.startsWith('/shorts/')) {
    return url.pathname.split('/')[2] || null;
  }
  if (url.pathname.startsWith('/embed/')) {
    return url.pathname.split('/')[2] || null;
  }
  return null;
}

function getVimeoVideoId(url: URL, host: string): string | null {
  if (!host.includes('vimeo.com')) return null;
  const parts = url.pathname.split('/').filter(Boolean);
  const numeric = parts.find((part) => /^\d+$/.test(part));
  return numeric || null;
}

function getDailymotionVideoId(url: URL, host: string): string | null {
  if (host === 'dai.ly') {
    return url.pathname.split('/').filter(Boolean)[0] || null;
  }
  if (!host.includes('dailymotion.com')) return null;
  const parts = url.pathname.split('/').filter(Boolean);
  const idx = parts.indexOf('video');
  if (idx >= 0 && parts[idx + 1]) {
    return parts[idx + 1];
  }
  return null;
}

function getRutubeVideoId(url: URL, host: string): string | null {
  if (!host.includes('rutube.ru')) return null;
  const parts = url.pathname.split('/').filter(Boolean);
  const idx = parts.indexOf('video');
  if (idx >= 0 && parts[idx + 1]) {
    return parts[idx + 1];
  }
  return null;
}

function decodeLinkTitle(value: string): string {
  const normalized = value.replace(/[-_]+/g, ' ').trim();
  if (!normalized) return 'Video';
  try {
    return decodeURIComponent(normalized);
  } catch {
    return normalized;
  }
}

function ReplyPreviewBlock({
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

function VideoLinkPreviewCard({
  preview,
  isOwn,
}: {
  preview: VideoLinkPreview;
  isOwn: boolean;
}) {
  const [isPlayingInline, setIsPlayingInline] = useState(false);
  const [meta, setMeta] = useState<VideoPreviewMeta | null>(null);
  const canInlinePlay = !!preview.directVideoUrl || !!preview.embedUrl;
  const resolvedSource = meta?.providerName || preview.sourceLabel;
  const resolvedTitle = meta?.title || preview.title;
  const resolvedDescription = meta?.description || preview.description;
  const resolvedPosterUrl = meta?.thumbnailUrl || preview.posterUrl;
  const resolvedDuration = preview.durationLabel || meta?.durationLabel;

  useEffect(() => {
    let disposed = false;

    const cached = VIDEO_META_CACHE.get(preview.url);
    if (cached !== undefined) {
      setMeta(cached);
      return () => {
        disposed = true;
      };
    }

    void (async () => {
      const loadedMeta = await fetchVideoPreviewMeta(preview);
      VIDEO_META_CACHE.set(preview.url, loadedMeta);
      if (!disposed) {
        setMeta(loadedMeta);
      }
    })();

    return () => {
      disposed = true;
    };
  }, [preview.url, preview.sourceLabel, preview.embedUrl, preview.directVideoUrl]);

  const handlePlay = () => {
    if (canInlinePlay) {
      setIsPlayingInline(true);
      return;
    }
    window.open(preview.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className={`mt-[9px] overflow-hidden rounded-[13px] border ${
        isOwn ? 'border-white/26 bg-white/10' : 'border-white/12 bg-black/16'
      }`}
    >
      <div className={`border-l-[4px] px-3 py-2.5 ${isOwn ? 'border-white/70 bg-white/8' : 'border-[#af93ff] bg-white/[0.03]'}`}>
        <div className={`text-[13px] font-[700] ${isOwn ? 'text-white/88' : 'text-[#d2c2ff]'}`}>
          {resolvedSource}
        </div>
        <div className="mt-[2px] line-clamp-1 text-[17px] font-[700] leading-tight text-white">
          {resolvedTitle}
        </div>
        <div className={`mt-[3px] line-clamp-2 text-[14px] leading-[1.24] ${isOwn ? 'text-white/84' : 'text-white/72'}`}>
          {resolvedDescription}
        </div>
        {resolvedDuration ? (
          <div className="mt-2 inline-flex rounded-full bg-black/33 px-2 py-[1px] text-[12px] font-[600] text-white/92">
            {resolvedDuration}
          </div>
        ) : null}
      </div>

      <div className="relative aspect-video overflow-hidden bg-[#6557b7]/66">
        {isPlayingInline && preview.directVideoUrl ? (
          <video
            src={preview.directVideoUrl}
            controls
            autoPlay
            playsInline
            className="h-full w-full object-cover"
          />
        ) : isPlayingInline && preview.embedUrl ? (
          <iframe
            src={preview.embedUrl}
            title={resolvedTitle}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            className="h-full w-full border-0"
          />
        ) : (
          <button
            type="button"
            onClick={handlePlay}
            className="group relative h-full w-full"
            aria-label={`Play video from ${resolvedSource}`}
          >
            {resolvedPosterUrl ? (
              <img src={resolvedPosterUrl} alt={resolvedTitle} className="h-full w-full object-cover" />
            ) : null}
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(38,28,84,0.36)_0%,rgba(38,28,84,0.58)_100%)]" />
            <span className="absolute left-1/2 top-1/2 grid h-[46px] w-[46px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[#4f438f]/88 text-white shadow-[0_14px_28px_rgba(0,0,0,0.38)] transition-transform duration-200 group-hover:scale-105">
              <PlayIcon size={21} />
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

function MessageTextBubble({
  content,
  entities,
  videoPreview,
  time,
  isOwn,
  isRead,
  isEdited,
  replyPreview,
}: MessageTextBubbleProps) {
  const textPaddingClass = videoPreview
    ? ''
    : isEdited
      ? (isOwn ? 'pr-[96px]' : 'pr-[82px]')
      : (isOwn ? 'pr-[56px]' : 'pr-[48px]');

  const statusLine = (
    <>
      {isEdited ? (
        <span className={`italic ${isOwn ? 'text-white/62' : 'text-white/40'}`}>
          edited
        </span>
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

  return (
    <div className={`tg-bubble relative ${isOwn ? 'tg-right bg-[#967ef0] text-white' : 'tg-left bg-[#222327] text-white/95'}`}>
      {replyPreview ? <ReplyPreviewBlock replyPreview={replyPreview} isOwn={isOwn} /> : null}
      <div className={`whitespace-pre-line text-[18px] leading-[1.22] tracking-[0.05px] ${textPaddingClass}`}>
        {renderMessageContent(content, entities)}
      </div>
      {videoPreview ? <VideoLinkPreviewCard preview={videoPreview} isOwn={isOwn} /> : null}
      {videoPreview ? (
        <div className={`mt-[6px] flex items-center justify-end gap-[2px] pr-[2px] text-[14px] ${isOwn ? 'text-white/72' : 'text-white/48'}`}>
          {statusLine}
        </div>
      ) : (
        <div className={`absolute bottom-[6px] right-[10px] flex items-center gap-[2px] text-[14px] ${isOwn ? 'text-white/72' : 'text-white/48'}`}>
          {statusLine}
        </div>
      )}
    </div>
  );
}

function VoiceMessageBubble({
  mediaId,
  author,
  fileUrl,
  fileName,
  contentType,
  sizeBytes,
  createdAt,
  isRead,
  isOwn,
  isEdited,
  onPlaybackStateChange,
}: VoiceMessageBubbleProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const transcribeAbortRef = useRef<AbortController | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [durationSec, setDurationSec] = useState(0);
  const [currentSec, setCurrentSec] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  const fallbackWaveform = useMemo(
    () => buildFallbackWaveform(`${fileUrl || ''}|${fileName || ''}|${sizeBytes || 0}`),
    [fileName, fileUrl, sizeBytes]
  );
  const [waveform, setWaveform] = useState<number[]>(fallbackWaveform);

  const getDuration = () => {
    const audio = audioRef.current;
    if (!audio) return durationSec;
    return Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : durationSec;
  };

  const seekBy = (deltaSec: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const duration = getDuration();
    const current = audio.currentTime || 0;
    const next = duration > 0 ? Math.min(duration, Math.max(0, current + deltaSec)) : Math.max(0, current + deltaSec);
    audio.currentTime = next;
    setCurrentSec(next);
    if (!audio.paused) {
      onPlaybackStateChange?.({
        mediaId,
        kind: 'voice',
        author,
        createdAt,
        currentSec: next,
        durationSec: duration,
        isPlaying: true,
        togglePlay: () => {
          void togglePlayback();
        },
        seekBy,
        stop: stopPlayback,
      });
    }
  };

  const stopPlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setCurrentSec(0);
    setIsPlaying(false);
    onPlaybackStateChange?.({
      mediaId,
      kind: 'voice',
      author,
      createdAt,
      currentSec: 0,
      durationSec: getDuration(),
      isPlaying: false,
      togglePlay: () => {
        void togglePlayback();
      },
      seekBy,
      stop: stopPlayback,
    });
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => {
      if (Number.isFinite(audio.duration)) {
        setDurationSec(audio.duration);
      }
    };
    const onTimeUpdate = () => {
      const current = audio.currentTime || 0;
      const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : durationSec;
      setCurrentSec(current);
      if (!audio.paused) {
        onPlaybackStateChange?.({
          mediaId,
          kind: 'voice',
          author,
          createdAt,
          currentSec: current,
          durationSec: duration,
          isPlaying: true,
          togglePlay: () => {
            void togglePlayback();
          },
          seekBy,
          stop: stopPlayback,
        });
      }
    };
    const onPlay = () => {
      const current = audio.currentTime || 0;
      const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : durationSec;
      setIsPlaying(true);
      onPlaybackStateChange?.({
        mediaId,
        kind: 'voice',
        author,
        createdAt,
        currentSec: current,
        durationSec: duration,
        isPlaying: true,
        togglePlay: () => {
          void togglePlayback();
        },
        seekBy,
        stop: stopPlayback,
      });
    };
    const onPause = () => {
      const current = audio.currentTime || 0;
      const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : durationSec;
      setIsPlaying(false);
      onPlaybackStateChange?.({
        mediaId,
        kind: 'voice',
        author,
        createdAt,
        currentSec: current,
        durationSec: duration,
        isPlaying: false,
        togglePlay: () => {
          void togglePlayback();
        },
        seekBy,
        stop: stopPlayback,
      });
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentSec(0);
      onPlaybackStateChange?.({
        mediaId,
        kind: 'voice',
        author,
        createdAt,
        currentSec: 0,
        durationSec: Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : durationSec,
        isPlaying: false,
        togglePlay: () => {
          void togglePlayback();
        },
        seekBy,
        stop: stopPlayback,
      });
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
  }, [author, createdAt, durationSec, fileUrl, mediaId, onPlaybackStateChange]);

  useEffect(() => {
    setWaveform(fallbackWaveform);
    setCurrentSec(0);
    setDurationSec(0);
    setIsPlaying(false);
  }, [fallbackWaveform, fileUrl]);

  useEffect(() => {
    transcribeAbortRef.current?.abort();
    transcribeAbortRef.current = null;
    setTranscript(null);
    setTranscriptionError(null);
    setIsTranscribing(false);
  }, [fileUrl]);

  useEffect(
    () => () => {
      transcribeAbortRef.current?.abort();
      transcribeAbortRef.current = null;
    },
    []
  );

  useEffect(() => {
    if (!fileUrl) return;

    let cancelled = false;
    const abortController = new AbortController();

    const buildRealWaveform = async () => {
      try {
        const result = await loadWaveformFromAudioUrl({
          fileUrl,
          bars: fallbackWaveform.length,
          signal: abortController.signal,
        });
        if (cancelled || !result || result.waveform.length === 0) return;

        setWaveform(result.waveform);
        if (result.durationSec) {
          setDurationSec((prev) => (prev > 0 ? prev : result.durationSec || 0));
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
  }, [fallbackWaveform.length, fileUrl]);

  const playbackProgress = durationSec > 0 ? Math.min(1, Math.max(0, currentSec / durationSec)) : 0;
  const activeBars = Math.round(playbackProgress * waveform.length);
  const timeText = formatMessageTime(createdAt);
  const durationText = formatDuration(isPlaying ? currentSec : durationSec);
  const sizeText = formatFileSize(sizeBytes);

  const togglePlayback = async () => {
    if (!fileUrl) return;
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (audio.paused) {
        await audio.play();
      } else {
        audio.pause();
      }
    } catch (error) {
      console.warn('Voice playback failed', error);
    }
  };

  const handleTranscribe = async () => {
    if (!fileUrl || isTranscribing) return;

    transcribeAbortRef.current?.abort();
    const abortController = new AbortController();
    transcribeAbortRef.current = abortController;

    setIsTranscribing(true);
    setTranscriptionError(null);

    try {
      const transcriptText = await transcribeVoiceMessageFromUrl({
        fileUrl,
        fileName,
        contentType,
        signal: abortController.signal,
      });
      setTranscript(transcriptText || 'Speech was not recognized.');
      setTranscriptionError(null);
    } catch (error) {
      if (abortController.signal.aborted) {
        return;
      }
      console.warn('Voice transcription failed', error);
      setTranscriptionError('Failed to transcribe this voice message.');
    } finally {
      if (transcribeAbortRef.current === abortController) {
        transcribeAbortRef.current = null;
      }
      setIsTranscribing(false);
    }
  };

  const seek = (event: ReactMouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !durationSec) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / Math.max(1, rect.width);
    const next = Math.max(0, Math.min(1, ratio));
    audio.currentTime = next * durationSec;
    setCurrentSec(audio.currentTime);
  };

  const bubbleClass = isOwn ? 'tg-right bg-[#967ef0] text-white' : 'tg-left bg-[#222327] text-white/95';
  const activeBarClass = isOwn ? 'bg-white/95' : 'bg-white/85';
  const inactiveBarClass = isOwn ? 'bg-white/35' : 'bg-white/25';
  const playButtonClass = isOwn
    ? 'grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/18 text-white transition-colors hover:bg-white/28'
    : 'grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/12 text-white transition-colors hover:bg-white/22';
  const transcribeButtonClass = isOwn
    ? 'grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-white/18 text-white transition-colors hover:bg-white/28 disabled:cursor-not-allowed disabled:opacity-70'
    : 'grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[#8e77ef]/65 text-white transition-colors hover:bg-[#8e77ef]/85 disabled:cursor-not-allowed disabled:opacity-70';
  const transcriptClass = isOwn
    ? 'mt-2 rounded-[10px] bg-white/18 px-3 py-2 text-[13px] leading-[1.25] text-white/95'
    : 'mt-2 rounded-[10px] bg-white/10 px-3 py-2 text-[13px] leading-[1.25] text-white/88';
  const transcriptErrorClass = isOwn
    ? 'mt-2 rounded-[10px] bg-[#4f2c44]/85 px-3 py-2 text-[12px] leading-[1.25] text-[#ffd2e1]'
    : 'mt-2 rounded-[10px] bg-[#4a2e3e]/82 px-3 py-2 text-[12px] leading-[1.25] text-[#ffcbda]';

  return (
    <div className={`tg-bubble relative ${bubbleClass}`}>
      {fileUrl ? (
        <audio ref={audioRef} preload="metadata">
          <source src={fileUrl} type={contentType || 'audio/webm'} />
        </audio>
      ) : null}

      <div className="flex min-w-[280px] items-center gap-3">
        <button
          type="button"
          onClick={togglePlayback}
          className={playButtonClass}
          disabled={!fileUrl}
          aria-label={isPlaying ? 'Pause voice message' : 'Play voice message'}
        >
          {isPlaying ? <PauseIcon size={19} /> : <PlayIcon size={19} className="translate-x-[1px]" />}
        </button>

        <div className="min-w-0 flex-1">
          <div
            className={`flex h-4 items-end gap-[2px] ${fileUrl ? 'cursor-pointer' : 'cursor-default'}`}
            onClick={fileUrl ? seek : undefined}
            role={fileUrl ? 'slider' : undefined}
            aria-label="Voice playback position"
          >
            {waveform.map((value, index) => {
              const barHeight = Math.max(3, Math.round(value * 13));
              const isActive = index < activeBars;
              return (
                <span
                  key={`voice-bar-${index}`}
                  className={`w-[3px] rounded-full ${isActive ? activeBarClass : inactiveBarClass}`}
                  style={{ height: `${barHeight}px` }}
                />
              );
            })}
          </div>

          <div className={`mt-[5px] flex items-center justify-between text-[12px] ${isOwn ? 'text-white/78' : 'text-white/62'}`}>
            <span>
              {fileUrl ? durationText : 'Preparing'}
              {sizeText ? ` | ${sizeText}` : ''}
            </span>
            <span className="inline-flex items-center gap-1">
              {isEdited ? (
                <span className={`italic ${isOwn ? 'text-white/62' : 'text-white/40'}`}>
                  edited
                </span>
              ) : null}
              {timeText}
              {isOwn ? (
                <span className="ml-[4px] inline-flex h-[11px] w-[11px] items-center justify-center">
                  <CheckCheckIcon
                    size={13}
                    strokeWidth={2.2}
                    className={`origin-center scale-[1.9] ${isRead ? 'text-[#d8fff0]' : 'text-white/65'}`}
                  />
                </span>
              ) : null}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleTranscribe}
          disabled={!fileUrl || isTranscribing}
          className={transcribeButtonClass}
          title="Transcribe voice to text"
          aria-label="Transcribe voice to text"
        >
          {isTranscribing ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
          ) : (
            <span className="text-[12px] font-[700] leading-none">→A</span>
          )}
        </button>
      </div>

      {transcript ? <div className={transcriptClass}>{transcript}</div> : null}
      {!transcript && transcriptionError ? <div className={transcriptErrorClass}>{transcriptionError}</div> : null}
    </div>
  );
}

function CircleMessageBubble({
  mediaId,
  author,
  fileUrl,
  contentType,
  createdAt,
  isRead,
  isEdited,
  status,
  isOwn,
  isMuted,
  onToggleMuted,
  onMediaError,
  onPlaybackStateChange,
}: CircleMessageBubbleProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const progressRafRef = useRef<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [durationSec, setDurationSec] = useState(0);
  const [currentSec, setCurrentSec] = useState(0);
  const [mediaPhase, setMediaPhase] = useState<'processing' | 'ready' | 'error'>('processing');
  const [resolvedFileUrl, setResolvedFileUrl] = useState<string | null>(null);
  const circleDisplaySize = 'min(36vw, 280px)';
  const circleSize = 176;
  const ringStrokeWidth = 4;
  const ringCenter = circleSize / 2;
  const radius = ringCenter - ringStrokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const progressDasharray = `${circumference} ${circumference}`;
  const playbackProgress = durationSec > 0 ? Math.min(1, Math.max(0, currentSec / durationSec)) : 0;
  const ringProgress = mediaPhase === 'ready' ? playbackProgress : 0;
  const hasRingProgress = ringProgress > 0;
  const dashOffset = circumference * (1 - ringProgress);
  const ringColor = isOwn ? 'rgb(214, 202, 255)' : 'rgb(196, 203, 223)';

  const getDuration = () => {
    const video = videoRef.current;
    if (!video) return durationSec;
    return Number.isFinite(video.duration) && video.duration > 0 ? video.duration : durationSec;
  };

  const seekBy = (deltaSec: number) => {
    const video = videoRef.current;
    if (!video) return;
    const duration = getDuration();
    const current = video.currentTime || 0;
    const next = duration > 0 ? Math.min(duration, Math.max(0, current + deltaSec)) : Math.max(0, current + deltaSec);
    video.currentTime = next;
    setCurrentSec(next);
    if (!video.paused) {
      onPlaybackStateChange?.({
        mediaId,
        kind: 'circle',
        author,
        createdAt,
        currentSec: next,
        durationSec: duration,
        isPlaying: true,
        togglePlay: () => {
          void togglePlayback();
        },
        seekBy,
        stop: stopPlayback,
      });
    }
  };

  const stopPlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (progressRafRef.current !== null) {
      cancelAnimationFrame(progressRafRef.current);
      progressRafRef.current = null;
    }
    video.pause();
    video.currentTime = 0;
    setCurrentSec(0);
    setIsPlaying(false);
    onPlaybackStateChange?.({
      mediaId,
      kind: 'circle',
      author,
      createdAt,
      currentSec: 0,
      durationSec: getDuration(),
      isPlaying: false,
      togglePlay: () => {
        void togglePlayback();
      },
      seekBy,
      stop: stopPlayback,
    });
  };

  useEffect(() => {
    if (progressRafRef.current !== null) {
      cancelAnimationFrame(progressRafRef.current);
      progressRafRef.current = null;
    }
    setIsPlaying(false);
    setDurationSec(0);
    setCurrentSec(0);
    setResolvedFileUrl(null);
    setMediaPhase('processing');

    if (!fileUrl) {
      setMediaPhase('processing');
      return;
    }

    setResolvedFileUrl(fileUrl);
    setMediaPhase('ready');
  }, [fileUrl]);

  useEffect(() => {
    if (mediaPhase !== 'ready' || !isPlaying) {
      if (progressRafRef.current !== null) {
        cancelAnimationFrame(progressRafRef.current);
        progressRafRef.current = null;
      }
      return;
    }

    const tick = () => {
      const video = videoRef.current;
      if (!video || video.paused) {
        progressRafRef.current = null;
        return;
      }

      const next = video.currentTime || 0;
      setCurrentSec((prev) => (Math.abs(prev - next) < 0.004 ? prev : next));
      progressRafRef.current = requestAnimationFrame(tick);
    };

    progressRafRef.current = requestAnimationFrame(tick);
    return () => {
      if (progressRafRef.current !== null) {
        cancelAnimationFrame(progressRafRef.current);
        progressRafRef.current = null;
      }
    };
  }, [isPlaying, mediaPhase]);

  useEffect(() => {
    return () => {
      if (progressRafRef.current !== null) {
        cancelAnimationFrame(progressRafRef.current);
        progressRafRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || mediaPhase !== 'ready' || !resolvedFileUrl) return;

    const onLoadedMetadata = () => {
      if (Number.isFinite(video.duration)) {
        setDurationSec(video.duration);
      }
    };
    const onTimeUpdate = () => {
      const current = video.currentTime || 0;
      const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : durationSec;
      setCurrentSec(current);
      if (!video.paused) {
        onPlaybackStateChange?.({
          mediaId,
          kind: 'circle',
          author,
          createdAt,
          currentSec: current,
          durationSec: duration,
          isPlaying: true,
          togglePlay: () => {
            void togglePlayback();
          },
          seekBy,
          stop: stopPlayback,
        });
      }
    };
    const onPlay = () => {
      const current = video.currentTime || 0;
      const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : durationSec;
      setIsPlaying(true);
      onPlaybackStateChange?.({
        mediaId,
        kind: 'circle',
        author,
        createdAt,
        currentSec: current,
        durationSec: duration,
        isPlaying: true,
        togglePlay: () => {
          void togglePlayback();
        },
        seekBy,
        stop: stopPlayback,
      });
    };
    const onPause = () => {
      const current = video.currentTime || 0;
      const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : durationSec;
      setIsPlaying(false);
      onPlaybackStateChange?.({
        mediaId,
        kind: 'circle',
        author,
        createdAt,
        currentSec: current,
        durationSec: duration,
        isPlaying: false,
        togglePlay: () => {
          void togglePlayback();
        },
        seekBy,
        stop: stopPlayback,
      });
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentSec(0);
      video.currentTime = 0;
      onPlaybackStateChange?.({
        mediaId,
        kind: 'circle',
        author,
        createdAt,
        currentSec: 0,
        durationSec: Number.isFinite(video.duration) && video.duration > 0 ? video.duration : durationSec,
        isPlaying: false,
        togglePlay: () => {
          void togglePlayback();
        },
        seekBy,
        stop: stopPlayback,
      });
    };
    const onError = () => {
      setMediaPhase('error');
      setIsPlaying(false);
      onMediaError?.();
      onPlaybackStateChange?.({
        mediaId,
        kind: 'circle',
        author,
        createdAt,
        currentSec: 0,
        durationSec: 0,
        isPlaying: false,
        togglePlay: () => {
          void togglePlayback();
        },
        seekBy,
        stop: stopPlayback,
      });
    };

    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('ended', onEnded);
    video.addEventListener('error', onError);

    return () => {
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('error', onError);
    };
  }, [author, createdAt, durationSec, mediaId, mediaPhase, onMediaError, onPlaybackStateChange, resolvedFileUrl]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

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

  const messageTime = formatMessageTime(createdAt);
  const duration = formatDuration(isPlaying ? currentSec : durationSec);
  const metaDuration = mediaPhase === 'ready' ? duration : mediaPhase === 'error' ? 'Not ready' : 'Preparing';

  return (
    <div
      className="relative inline-flex max-w-full overflow-visible"
      style={{
        width: circleDisplaySize,
        height: circleDisplaySize,
      }}
    >
      <button
        type="button"
        onClick={togglePlayback}
        className="group relative h-full w-full overflow-hidden rounded-full border-2 border-white/24 bg-transparent p-0 shadow-[0_16px_36px_rgba(0,0,0,0.35)]"
        aria-label={isPlaying ? 'Pause video note' : 'Play video note'}
      >
        {mediaPhase === 'ready' && resolvedFileUrl ? (
          <video
            ref={videoRef}
            src={resolvedFileUrl}
            preload="metadata"
            playsInline
            muted={isMuted}
            className="h-full w-full rounded-full object-cover"
          >
            <source src={resolvedFileUrl} type={contentType || 'video/webm'} />
          </video>
        ) : (
          <div className="relative h-full w-full overflow-hidden rounded-full bg-[#222327]">
            <div className="absolute inset-0 animate-pulse bg-[radial-gradient(circle_at_25%_20%,rgba(151,132,226,0.30),transparent_58%)]" />
            <div
              className="absolute inset-0 animate-pulse bg-[radial-gradient(circle_at_78%_74%,rgba(75,64,125,0.55),transparent_62%)]"
              style={{ animationDelay: '700ms' }}
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
            stroke="rgba(255,255,255,0.33)"
            strokeWidth={ringStrokeWidth}
          />
          <circle
            cx={ringCenter}
            cy={ringCenter}
            r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth={ringStrokeWidth}
            strokeLinecap={hasRingProgress ? 'round' : 'butt'}
            strokeDasharray={progressDasharray}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${ringCenter} ${ringCenter})`}
            className="will-change-[stroke-dashoffset]"
          />
        </svg>

        {mediaPhase === 'ready' ? (
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
            <div className="grid h-[50px] w-[50px] place-items-center rounded-full bg-black/45 text-white shadow-[0_8px_16px_rgba(0,0,0,0.35)]">
              {isPlaying ? <PauseIcon size={22} /> : <PlayIcon size={22} className="translate-x-[1px]" />}
            </div>
          </div>
        ) : null}

      </button>

      <div className="absolute left-[-16px] top-[-2px] z-10 inline-flex items-center rounded-full bg-[#4e2b63]/92 px-[8px] py-[3px] text-[12px] font-[700] leading-none text-white shadow-[0_8px_18px_rgba(0,0,0,0.34)] backdrop-blur-sm">
        <span>{metaDuration}</span>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleMuted();
          }}
          className="ml-[4px] grid h-[16px] w-[16px] place-items-center rounded-full bg-black/25 text-white/95 transition-colors hover:bg-black/40"
          aria-label={isMuted ? 'Enable circle audio' : 'Disable circle audio'}
          title={isMuted ? 'Enable audio for circles' : 'Disable audio for circles'}
        >
          <span className="relative block h-[12px] w-[12px]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="h-[12px] w-[12px]">
              <path d="M5 9v6h4l5 4V5L9 9H5Z" fill="currentColor" />
            </svg>
            {isMuted ? (
              <svg
                width="6"
                height="6"
                viewBox="0 0 24 24"
                fill="none"
                className="absolute -right-[1px] top-1/2 h-[6px] w-[6px] -translate-y-1/2"
              >
                <path d="M6 6 18 18M18 6 6 18" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
              </svg>
            ) : null}
          </span>
        </button>
      </div>

      {isOwn ? (
        <div className="pointer-events-none absolute bottom-[-12px] right-[6px] z-10 inline-flex items-center gap-[3px] rounded-full bg-[#7c60db]/95 px-[8px] py-[4px] text-[14px] font-[600] leading-none text-white shadow-[0_8px_18px_rgba(33,20,64,0.42)]">
          {isEdited ? <span className="italic text-white/68">edited</span> : null}
          {messageTime}
          <span className="ml-[4px] inline-flex">
            {status === 'pending' ? (
              <span className="h-3 w-3 animate-pulse rounded-full border border-white/80" />
            ) : (
              <CheckCheckIcon
                size={13}
                strokeWidth={2.2}
                className={`origin-center scale-[1.9] ${isRead ? 'text-[#e2fff4]' : 'text-white/78'}`}
              />
            )}
          </span>
        </div>
      ) : (
        <div className="pointer-events-none absolute bottom-[-12px] right-[6px] z-10 rounded-full bg-black/55 px-[8px] py-[4px] text-[13px] font-[600] leading-none text-white/88 backdrop-blur-sm">
          {isEdited ? <span className="mr-1 italic text-white/64">edited</span> : null}
          {messageTime}
        </div>
      )}
    </div>
  );
}

function ChatMessageRow({
  message,
  userId,
  onCircleMediaError,
  isCircleMuted,
  onToggleCircleMuted,
  resolveUserName,
  onPlaybackStateChange,
  isSearchMatch,
  isSearchActive,
}: {
  message: ChatMessage;
  userId: string;
  onCircleMediaError?: () => void;
  isCircleMuted: boolean;
  onToggleCircleMuted: () => void;
  resolveUserName: (userId: string) => string;
  onPlaybackStateChange?: (state: ChatPlaybackState) => void;
  isSearchMatch: boolean;
  isSearchActive: boolean;
}) {
  const isOwn = message.senderId === userId;
  const isEdited = !!message.edited;
  const time = formatMessageTime(message.createdAt);
  const isRead = isMessageRead(message);
  const attachments = getMessageAttachments(message);
  const textContent = message.content || '';
  const hasTextContent = textContent.trim().length > 0;
  const fallbackParsed = buildMessageTextAndEntities(textContent);
  const renderContent = message.entities && message.entities.length > 0 ? textContent : fallbackParsed.content;
  const renderEntities = message.entities && message.entities.length > 0 ? message.entities : fallbackParsed.entities;
  const videoPreview = hasTextContent ? getPrimaryVideoPreview(renderContent, renderEntities) : null;

  const fallbackAttachment = attachments[0];
  const voiceAttachment =
    message.messageType === 'voice'
      ? attachments.find((attachment) => isAudioContentType(attachment.contentType)) || fallbackAttachment
      : undefined;
  const circleAttachment =
    message.messageType === 'circle'
      ? attachments.find((attachment) => isVideoContentType(attachment.contentType)) || fallbackAttachment
      : undefined;
  const isCircleMessage = message.messageType === 'circle' && !!circleAttachment;
  const mediaId = `${message.messageType}-${String(message.messageId)}`;
  const author = isOwn ? 'You' : resolveUserName(message.senderId);

  const voiceUrl = voiceAttachment ? resolveAttachmentUrl(voiceAttachment) : '';
  const circleUrl = circleAttachment ? resolveAttachmentUrl(circleAttachment) : '';
  const replyPreview: ReplyPreview | undefined = message.replyToMessage
    ? {
        author:
          message.replyToMessage.senderId === userId
            ? 'You'
            : resolveUserName(message.replyToMessage.senderId),
        text: messagePreviewText(message.replyToMessage),
      }
    : undefined;

  return (
    <div
      className={`${isCircleMessage ? 'my-[20px]' : 'mb-[4px]'} flex ${
        isOwn ? 'justify-end' : 'justify-start'
      }`}
    >
      <div
        className={`max-w-[820px] rounded-[22px] transition-shadow ${
          isSearchActive
            ? 'shadow-[0_0_0_2px_rgba(179,156,255,0.95),0_8px_24px_rgba(108,78,204,0.35)]'
            : isSearchMatch
              ? 'shadow-[0_0_0_1px_rgba(179,156,255,0.5)]'
              : ''
        }`}
      >
        {message.messageType === 'voice' && voiceAttachment ? (
          <VoiceMessageBubble
            mediaId={mediaId}
            author={author}
            fileUrl={voiceUrl || undefined}
            fileName={voiceAttachment.fileName}
            contentType={voiceAttachment.contentType}
            sizeBytes={voiceAttachment.sizeBytes}
            createdAt={message.createdAt}
            isRead={isRead}
            isOwn={isOwn}
            isEdited={isEdited}
            onPlaybackStateChange={onPlaybackStateChange}
          />
        ) : message.messageType === 'circle' && circleAttachment ? (
          <CircleMessageBubble
            mediaId={mediaId}
            author={author}
            fileUrl={circleUrl || undefined}
            contentType={circleAttachment.contentType}
            createdAt={message.createdAt}
            isRead={isRead}
            isEdited={isEdited}
            status={message.status}
            isOwn={isOwn}
            isMuted={isCircleMuted}
            onToggleMuted={onToggleCircleMuted}
            onMediaError={onCircleMediaError}
            onPlaybackStateChange={onPlaybackStateChange}
          />
        ) : (
          <MessageTextBubble
            content={hasTextContent ? renderContent : messagePreviewText(message)}
            entities={hasTextContent ? renderEntities : undefined}
            videoPreview={videoPreview}
            time={time}
            isOwn={isOwn}
            isRead={isRead}
            isEdited={isEdited}
            replyPreview={replyPreview}
          />
        )}

        {(message.messageType === 'voice' || message.messageType === 'circle') && hasTextContent ? (
          <div
            className={`mt-1 px-2 text-[15px] leading-[1.2] ${
              isOwn ? 'text-white/88 text-right' : 'text-white/75 text-left'
            }`}
          >
            {renderMessageContent(renderContent, renderEntities)}
            {videoPreview ? <VideoLinkPreviewCard preview={videoPreview} isOwn={isOwn} /> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ChatMessageList({
  messages,
  userId,
  hasSelectedChat,
  messagesEndRef,
  matchedMessageIds,
  activeMatchedMessageId,
  onCircleMediaError,
  resolveUserName,
  onPlaybackStateChange,
  onReplyMessage,
  onEditMessage,
  onDeleteMessage,
  onCopyMessage,
}: ChatMessageListProps) {
  const [isCircleMuted, setIsCircleMuted] = useState(true);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; message: ChatMessage } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const matchedMessageIdSet = useMemo(() => new Set(matchedMessageIds), [matchedMessageIds]);

  const rows = useMemo<MessageRow[]>(() => {
    const output: MessageRow[] = [];
    let lastDateKey = '';

    for (const message of messages) {
      const dateKey = new Date(message.createdAt).toDateString();
      if (dateKey !== lastDateKey) {
        output.push({
          type: 'divider',
          key: `divider-${message.messageId}-${dateKey}`,
          label: formatDivider(message.createdAt),
        });
        lastDateKey = dateKey;
      }

      output.push({
        type: 'message',
        key: `msg-${message.messageId}`,
        message,
      });
    }

    return output;
  }, [messages]);

  useEffect(() => {
    if (!hasSelectedChat) {
      onPlaybackStateChange?.(null);
    }
  }, [hasSelectedChat, onPlaybackStateChange]);

  useEffect(() => {
    if (!activeMatchedMessageId) return;
    const element = document.getElementById(toMessageDomId(activeMatchedMessageId));
    if (!element) return;
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeMatchedMessageId]);

  useEffect(() => {
    if (!contextMenu) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!contextMenuRef.current || !target) return;
      if (!contextMenuRef.current.contains(target)) {
        setContextMenu(null);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setContextMenu(null);
      }
    };

    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onEscape);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onEscape);
    };
  }, [contextMenu]);

  const safeMenuLeft = contextMenu ? Math.min(contextMenu.x, window.innerWidth - 220) : 0;
  const safeMenuTop = contextMenu ? Math.min(contextMenu.y, window.innerHeight - 232) : 0;
  const canEdit =
    !!contextMenu &&
    contextMenu.message.senderId === userId &&
    typeof contextMenu.message.messageId === 'number';
  const canDelete =
    !!contextMenu &&
    contextMenu.message.senderId === userId &&
    typeof contextMenu.message.messageId === 'number';
  const menuCopyText = contextMenu
    ? (contextMenu.message.content || '').trim() || messagePreviewText(contextMenu.message)
    : '';

  return (
    <>
      {!hasSelectedChat ? (
        <div className="py-10 text-center text-white/50">Select a chat on the left</div>
      ) : rows.length === 0 ? (
        <div className="py-10 text-center text-white/50">No messages yet</div>
      ) : (
        rows.map((row) =>
          row.type === 'divider' ? (
            <DateDivider key={row.key} label={row.label} />
          ) : (
            <div
              key={row.key}
              id={toMessageDomId(row.message.messageId)}
              onContextMenu={(event) => {
                event.preventDefault();
                setContextMenu({ x: event.clientX, y: event.clientY, message: row.message });
              }}
            >
              <ChatMessageRow
                message={row.message}
                userId={userId}
                onCircleMediaError={onCircleMediaError}
                isCircleMuted={isCircleMuted}
                onToggleCircleMuted={() => setIsCircleMuted((prev) => !prev)}
                resolveUserName={resolveUserName}
                onPlaybackStateChange={onPlaybackStateChange || undefined}
                isSearchMatch={matchedMessageIdSet.has(String(row.message.messageId))}
                isSearchActive={String(row.message.messageId) === activeMatchedMessageId}
              />
            </div>
          )
        )
      )}
      <div ref={messagesEndRef} />

      {contextMenu ? (
        <div
          ref={contextMenuRef}
          className="fixed z-[80] min-w-[210px] overflow-hidden rounded-2xl border border-white/12 bg-[#201d28]/98 p-1.5 shadow-[0_20px_44px_rgba(0,0,0,0.5)] backdrop-blur-md"
          style={{ left: safeMenuLeft, top: safeMenuTop }}
        >
          <button
            type="button"
            onClick={() => {
              onReplyMessage(contextMenu.message);
              setContextMenu(null);
            }}
            className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm text-white/92 transition-colors hover:bg-white/10"
          >
            Reply
          </button>

          <button
            type="button"
            onClick={() => {
              onCopyMessage(menuCopyText);
              setContextMenu(null);
            }}
            className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm text-white/92 transition-colors hover:bg-white/10"
          >
            Copy text
          </button>

          <button
            type="button"
            onClick={() => {
              if (!canEdit) return;
              onEditMessage(contextMenu.message);
              setContextMenu(null);
            }}
            disabled={!canEdit}
            className={`flex w-full items-center rounded-xl px-3 py-2 text-left text-sm transition-colors ${
              canEdit ? 'text-white/92 hover:bg-white/10' : 'cursor-not-allowed text-white/35'
            }`}
          >
            Edit
          </button>

          <button
            type="button"
            onClick={() => {
              if (!canDelete) return;
              onDeleteMessage(contextMenu.message.messageId);
              setContextMenu(null);
            }}
            disabled={!canDelete}
            className={`flex w-full items-center rounded-xl px-3 py-2 text-left text-sm transition-colors ${
              canDelete ? 'text-[#ff9fb9] hover:bg-[#ff7da2]/16' : 'cursor-not-allowed text-[#ff9fb9]/45'
            }`}
          >
            Delete
          </button>
        </div>
      ) : null}
    </>
  );
}
