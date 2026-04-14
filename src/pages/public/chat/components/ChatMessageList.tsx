import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type RefObject } from 'react';
import type { ChatMessage } from '@/shared/api/types';
import { http } from '@/shared/api/http';
import { endpoints } from '@/shared/api/endpoints';
import {
  buildMessageTextAndEntities,
  extractMessageLinks,
  renderMessageContent,
  type ChatResolvedLink,
} from '@/shared/utils/chatTextEntities';
import { CheckCheckIcon, PauseIcon, PlayIcon } from '../icons';
import type { ChatPlaybackState, MessageRow } from '../types';
import {
  MultiImageBubble,
  ReplyPreviewBlock,
  SingleImageBubble,
  type ReplyPreview,
} from './messageTypes/ImageMessageBubbles';
import {
  buildFallbackWaveform,
  formatDivider,
  formatDuration,
  formatFileSize,
  formatMessageTime,
  getMessageAttachments,
  hashColor,
  initialOf,
  isAudioContentType,
  isMessageRead,
  isVideoContentType,
  loadWaveformFromAudioUrl,
  messagePreviewText,
  resolveAttachmentUrl,
  transcribeVoiceMessageFromUrl,
} from '../utils';

type PendingUploadState = {
  localId: string;
  attachmentIndex: number;
  progress: number;
  phase: 'queued' | 'uploading' | 'uploaded';
  cancelable: boolean;
  file: File;
};

type ChatMessageListProps = {
  messages: ChatMessage[];
  userId: string;
  hasSelectedChat: boolean;
  messageBubbleMaxWidthPx?: number;
  uploadingImages?: Map<string, PendingUploadState>;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  matchedMessageIds: string[];
  activeMatchedMessageId: string | null;
  onCircleMediaError?: () => void;
  resolveUserName: (userId: string) => string;
  resolveUserAvatar?: (userId: string) => string | undefined;
  onPlaybackStateChange?: (state: ChatPlaybackState | null) => void;
  onReplyMessage: (message: ChatMessage) => void;
  onEditMessage: (message: ChatMessage) => void;
  onDeleteMessage: (messageId: number | string) => void;
  onCopyMessage: (text: string) => void;
  onCancelPendingUpload?: (localId: string, attachmentIndex: number) => void;
};

type MessageTextBubbleProps = {
  content: string;
  entities?: ChatMessage['entities'];
  videoPreview: VideoLinkPreview | null;
  bubbleMaxWidthPx: number;
  time: string;
  isOwn: boolean;
  isRead: boolean;
  isEdited: boolean;
  replyPreview?: ReplyPreview;
  hideTail?: boolean;
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
  hideTail?: boolean;
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
  uploadState?: PendingUploadState;
  onCancelUpload?: () => void;
};

type GroupServiceMessageType =
  | 'group_created'
  | 'group_title_updated'
  | 'group_avatar_updated'
  | 'group_members_added';

const IMAGE_FILE_PATTERN = /\.(png|jpe?g|gif|webp|avif|bmp|svg)(?:$|[?#])/i;
const BUBBLE_CHAIN_WINDOW_MS = 5 * 60 * 1000;
const MESSAGE_ROW_BASE_GAP_PX = 4;
const MESSAGE_ROW_EXPANDED_GAP_PX = MESSAGE_ROW_BASE_GAP_PX * 2;

function toGroupServiceMessageType(value?: string): GroupServiceMessageType | null {
  switch ((value || '').toLowerCase()) {
    case 'group_created':
      return 'group_created';
    case 'group_title_updated':
      return 'group_title_updated';
    case 'group_avatar_updated':
      return 'group_avatar_updated';
    case 'group_member_added':
    case 'group_members_added':
    case 'group_participants_added':
      return 'group_members_added';
    default:
      return null;
  }
}

function parseSystemPayload(content: string): { title?: string; avatarUrl?: string } {
  const trimmed = content.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
    return {};
  }

  try {
    const parsed = JSON.parse(trimmed) as {
      title?: unknown;
      groupTitle?: unknown;
      avatarUrl?: unknown;
      avatarPath?: unknown;
    };
    const title =
      typeof parsed.title === 'string' && parsed.title.trim().length > 0
        ? parsed.title.trim()
        : typeof parsed.groupTitle === 'string' && parsed.groupTitle.trim().length > 0
          ? parsed.groupTitle.trim()
          : undefined;
    const avatarUrl =
      typeof parsed.avatarUrl === 'string' && parsed.avatarUrl.trim().length > 0
        ? parsed.avatarUrl.trim()
        : typeof parsed.avatarPath === 'string' && parsed.avatarPath.trim().length > 0
          ? parsed.avatarPath.trim()
          : undefined;

    return { title, avatarUrl };
  } catch {
    return {};
  }
}

function parseAddedMembers(content: string): string[] {
  const trimmed = content.trim();
  if (!trimmed) {
    return [];
  }

  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
    const lowered = trimmed.toLowerCase();
    if (lowered.includes('добав') || lowered.includes('added')) {
      return [];
    }
    return trimmed
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
  }

  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    const candidates = [
      parsed.addedUsers,
      parsed.members,
      parsed.usernames,
      parsed.addedUserNames,
      parsed.addedDisplayNames,
    ];

    for (const candidate of candidates) {
      if (!Array.isArray(candidate)) continue;
      const normalized = candidate
        .map((value) => (typeof value === 'string' ? value.trim() : ''))
        .filter((value) => value.length > 0);
      if (normalized.length > 0) {
        return normalized;
      }
    }
  } catch {
    return [];
  }

  return [];
}

function resolveGroupServiceAvatarUrl(
  message: ChatMessage,
  attachments: ReturnType<typeof getMessageAttachments>
): string | undefined {
  for (const attachment of attachments) {
    const url = resolveAttachmentUrl(attachment);
    if (!url) continue;

    const contentType = (attachment.contentType || '').toLowerCase();
    const isImageAttachment = attachment.isImage || contentType.startsWith('image/');
    if (isImageAttachment || IMAGE_FILE_PATTERN.test(url)) {
      return url;
    }
  }

  const payload = parseSystemPayload(message.content || '');
  const payloadUrl = payload.avatarUrl?.trim();
  if (payloadUrl) {
    if (payloadUrl.startsWith('/media/')) {
      return payloadUrl;
    }
    if (
      payloadUrl.startsWith('http://') ||
      payloadUrl.startsWith('https://') ||
      payloadUrl.startsWith('data:') ||
      payloadUrl.startsWith('blob:')
    ) {
      return payloadUrl;
    }
  }

  const rawContent = (message.content || '').trim();
  if (!rawContent) return undefined;
  if (
    rawContent.startsWith('/media/') ||
    rawContent.startsWith('http://') ||
    rawContent.startsWith('https://') ||
    rawContent.startsWith('data:') ||
    rawContent.startsWith('blob:')
  ) {
    return rawContent;
  }

  return undefined;
}

function GroupServiceMessageBubble({
  message,
  messageType,
  actorName,
  attachments,
}: {
  message: ChatMessage;
  messageType: GroupServiceMessageType;
  actorName: string;
  attachments: ReturnType<typeof getMessageAttachments>;
}) {
  const payload = parseSystemPayload(message.content || '');
  const contentTitle = (payload.title || message.content || '').trim();
  const safeTitle = contentTitle || 'Без названия';

  let text = `${actorName} updated group`;
  if (messageType === 'group_created') {
    text = `${actorName} создал(а) группу «${safeTitle}»`;
  } else if (messageType === 'group_title_updated') {
    text = `${actorName} изменил(а) название группы на «${safeTitle}»`;
  } else if (messageType === 'group_avatar_updated') {
    text = `${actorName} обновил(а) фотографию группы`;
  } else if (messageType === 'group_members_added') {
    const addedMembers = parseAddedMembers(message.content || '');
    if (addedMembers.length === 1) {
      text = `${actorName} добавил(а) ${addedMembers[0]}`;
    } else if (addedMembers.length > 1) {
      text = `${actorName} добавил(а) ${addedMembers.join(', ')}`;
    } else {
      const content = (message.content || '').trim();
      text = content || `${actorName} добавил(а) новых участников`;
    }
  }

  const avatarUrl =
    messageType === 'group_avatar_updated'
      ? resolveGroupServiceAvatarUrl(message, attachments)
      : undefined;

  return (
    <div className="my-[7px] flex flex-col items-center gap-[8px]">
      <div className="max-w-[90%] rounded-[14px] bg-[#4c285c]/86 px-[10px] py-[5px] text-center text-[15px] font-[600] leading-[1.15] text-white shadow-[0_6px_18px_rgba(0,0,0,0.28)] backdrop-blur-sm">
        {text}
      </div>
      {avatarUrl ? (
        <div className="h-[128px] w-[128px] overflow-hidden rounded-full shadow-[0_16px_34px_rgba(0,0,0,0.34)]">
          <img src={avatarUrl} alt="Group avatar updated" className="h-full w-full object-cover" />
        </div>
      ) : null}
    </div>
  );
}

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

const isTailBubbleMessage = (message: ChatMessage) =>
  toGroupServiceMessageType(message.messageType) === null && message.messageType !== 'circle';

const messageTimestamp = (value: string): number | null => {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
};

const areBubblesGrouped = (left?: ChatMessage, right?: ChatMessage) => {
  if (!left || !right) return false;
  if (!isTailBubbleMessage(left) || !isTailBubbleMessage(right)) return false;
  if (left.senderId !== right.senderId) return false;

  const leftTimestamp = messageTimestamp(left.createdAt);
  const rightTimestamp = messageTimestamp(right.createdAt);
  if (leftTimestamp == null || rightTimestamp == null) return false;

  const diffMs = rightTimestamp - leftTimestamp;
  return diffMs >= 0 && diffMs <= BUBBLE_CHAIN_WINDOW_MS;
};

const getMessageRowBottomGapPx = (current: ChatMessage, next?: ChatMessage) => {
  if (!next) return MESSAGE_ROW_BASE_GAP_PX;
  if (current.senderId !== next.senderId) return MESSAGE_ROW_EXPANDED_GAP_PX;

  const currentTimestamp = messageTimestamp(current.createdAt);
  const nextTimestamp = messageTimestamp(next.createdAt);
  if (currentTimestamp == null || nextTimestamp == null) {
    return MESSAGE_ROW_BASE_GAP_PX;
  }

  const diffMs = nextTimestamp - currentTimestamp;
  if (diffMs > BUBBLE_CHAIN_WINDOW_MS) {
    return MESSAGE_ROW_EXPANDED_GAP_PX;
  }

  return MESSAGE_ROW_BASE_GAP_PX;
};

const VIDEO_FILE_PATTERN = /\.(mp4|webm|mov|m4v|ogv|m3u8)(?:$|[?#])/i;
const VIDEO_HINT_PATTERN =
  /(\/(watch|video|videos|clip|clips|reel|reels|short|shorts|player|embed|stream|live)\b|[?&](v|video|vid|id)=)/i;
const VIDEO_META_CACHE = new Map<string, VideoPreviewMeta | null>();
const VIDEO_META_CACHE_VERSION = '2';
const DEFAULT_MESSAGE_BUBBLE_MAX_WIDTH_PX = 760;

type VideoPreviewMeta = {
  providerName?: string;
  title?: string;
  description?: string;
  authorName?: string;
  thumbnailUrl?: string;
  durationLabel?: string;
  embedUrl?: string;
  embedWidth?: number;
  embedHeight?: number;
};

type BackendLinkPreviewMeta = {
  providerName?: string;
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  embedUrl?: string;
  durationSeconds?: number;
  embedWidth?: number;
  embedHeight?: number;
};

function toPositiveNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return undefined;
}

function extractIframeSrc(html?: string): string | undefined {
  if (!html) return undefined;
  const match = html.match(/<iframe[^>]*\s+src=['"]([^'"]+)['"]/i);
  const src = match?.[1]?.trim();
  return src || undefined;
}

function toHighResSpotifyThumbnail(url?: string): string | undefined {
  if (!url) return undefined;
  return url.replace(
    /(ab67616d|ab676563)[0-9a-f]{8}/i,
    '$10000b273'
  );
}

function getVideoMetaCacheKey(url: string): string {
  return `${VIDEO_META_CACHE_VERSION}:${url}`;
}

type SpotifyEntityKind =
  | 'track'
  | 'episode'
  | 'album'
  | 'playlist'
  | 'show'
  | 'artist'
  | 'unknown';

function getSpotifyEntityKindFromUrl(url?: string): SpotifyEntityKind | undefined {
  if (!url) return undefined;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return undefined;
  }

  const host = parsed.hostname.toLowerCase();
  if (!host.includes('spotify.com')) return undefined;

  const parts = parsed.pathname.split('/').filter(Boolean).map((part) => part.toLowerCase());
  const knownKinds = new Set<SpotifyEntityKind>(['track', 'episode', 'album', 'playlist', 'show', 'artist']);

  if (parts[0] === 'embed' && parts[1] && knownKinds.has(parts[1] as SpotifyEntityKind)) {
    return parts[1] as SpotifyEntityKind;
  }
  if (parts[0] && knownKinds.has(parts[0] as SpotifyEntityKind)) {
    return parts[0] as SpotifyEntityKind;
  }

  const uri = parsed.searchParams.get('uri');
  if (uri) {
    const uriParts = uri.split(':');
    if (uriParts.length >= 2) {
      const kind = uriParts[1]?.toLowerCase();
      if (kind && knownKinds.has(kind as SpotifyEntityKind)) {
        return kind as SpotifyEntityKind;
      }
    }
  }

  return 'unknown';
}

function getSpotifyInlineEmbedAspectRatio(kind?: SpotifyEntityKind): number {
  if (kind === 'track' || kind === 'episode') {
    return 456 / 397;
  }
  return 456 / 352;
}

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
  } else if (normalizedSource === 'spotify') {
    endpoints.push(`https://open.spotify.com/oembed?url=${encodedUrl}`);
  }

  endpoints.push(`https://noembed.com/embed?url=${encodedUrl}`);
  return endpoints;
}

async function fetchBackendVideoPreviewMeta(previewUrl: string): Promise<VideoPreviewMeta | null> {
  try {
    const response = await http.get<BackendLinkPreviewMeta | null>(endpoints.chatLinkPreview(previewUrl));
    const payload = response.data;
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const durationLabel =
      typeof payload.durationSeconds === 'number' && payload.durationSeconds > 0
        ? formatDuration(payload.durationSeconds)
        : undefined;

    const meta: VideoPreviewMeta = {
      providerName: payload.providerName?.trim() || undefined,
      title: payload.title?.trim() || undefined,
      description: payload.description?.trim() || undefined,
      thumbnailUrl: payload.thumbnailUrl?.trim() || undefined,
      embedUrl: payload.embedUrl?.trim() || undefined,
      durationLabel,
      embedWidth: toPositiveNumber(payload.embedWidth),
      embedHeight: toPositiveNumber(payload.embedHeight),
    };

    if (
      !meta.providerName &&
      !meta.title &&
      !meta.description &&
      !meta.thumbnailUrl &&
      !meta.embedUrl &&
      !meta.durationLabel
    ) {
      return null;
    }

    return meta;
  } catch {
    return null;
  }
}

async function fetchVideoPreviewMeta(preview: VideoLinkPreview): Promise<VideoPreviewMeta | null> {
  const backendMeta = await fetchBackendVideoPreviewMeta(preview.url);
  const backendHasEmbedDimensions =
    !!backendMeta &&
    typeof backendMeta.embedWidth === 'number' &&
    backendMeta.embedWidth > 0 &&
    typeof backendMeta.embedHeight === 'number' &&
    backendMeta.embedHeight > 0;

  if (backendMeta && backendHasEmbedDimensions) {
    return backendMeta;
  }

  const oembedEndpoints = buildOEmbedEndpoints(preview);
  for (const endpoint of oembedEndpoints) {
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
        iframe_url?: string;
        html?: string;
        width?: number | string;
        height?: number | string;
      };
      if (!payload) continue;

      const durationLabel =
        typeof payload.duration === 'number' && payload.duration > 0
          ? formatDuration(payload.duration)
          : undefined;
      const description =
        payload.description?.trim() ||
        (payload.author_name ? `by ${payload.author_name}` : undefined);

      const embedUrl = payload.iframe_url?.trim() || extractIframeSrc(payload.html);

      const meta: VideoPreviewMeta = {
        providerName: payload.provider_name?.trim(),
        title: payload.title?.trim(),
        description,
        authorName: payload.author_name?.trim(),
        thumbnailUrl: payload.thumbnail_url?.trim(),
        durationLabel,
        embedUrl,
        embedWidth: toPositiveNumber(payload.width),
        embedHeight: toPositiveNumber(payload.height),
      };

      if (!backendMeta) {
        return meta;
      }

      return {
        ...backendMeta,
        ...meta,
        providerName: backendMeta.providerName || meta.providerName,
        title: backendMeta.title || meta.title,
        description: backendMeta.description || meta.description,
        thumbnailUrl: backendMeta.thumbnailUrl || meta.thumbnailUrl,
        // Keep embed URL and dimensions from the same source to avoid iframe viewport mismatch.
        embedUrl: meta.embedUrl || backendMeta.embedUrl,
        durationLabel: backendMeta.durationLabel || meta.durationLabel,
        embedWidth: backendMeta.embedWidth || meta.embedWidth,
        embedHeight: backendMeta.embedHeight || meta.embedHeight,
      };
    } catch {
      continue;
    }
  }

  return backendMeta;
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

  const spotifyEntity = getSpotifyEntity(parsed, host);
  if (spotifyEntity) {
    return {
      sourceLabel: 'Spotify',
      title: decodeLinkTitle(spotifyEntity.id),
      description: 'Listen on Spotify',
      url: parsed.toString(),
      embedUrl: `https://open.spotify.com/embed/${spotifyEntity.kind}/${spotifyEntity.id}?utm_source=chat_preview`,
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

function getSpotifyEntity(
  url: URL,
  host: string
): { kind: 'track' | 'album' | 'playlist' | 'episode' | 'show'; id: string } | null {
  if (!host.includes('spotify.com')) return null;

  const parts = url.pathname.split('/').filter(Boolean);
  if (parts.length < 2) return null;

  const kindRaw = parts[0]?.toLowerCase();
  const id = parts[1];
  if (!id) return null;

  const supportedKinds = new Set(['track', 'album', 'playlist', 'episode', 'show']);
  if (!kindRaw || !supportedKinds.has(kindRaw)) return null;

  return {
    kind: kindRaw as 'track' | 'album' | 'playlist' | 'episode' | 'show',
    id,
  };
}

function isRutubeVideoId(value?: string): boolean {
  if (!value) return false;
  return /^[0-9a-f]{32}$/i.test(value);
}

function getRutubeVideoId(url: URL, host: string): string | null {
  if (!host.includes('rutube.ru')) return null;
  const parts = url.pathname.split('/').filter(Boolean);

  const idx = parts.indexOf('video');
  if (idx >= 0) {
    const next = parts[idx + 1];
    if (next?.toLowerCase() === 'private' && isRutubeVideoId(parts[idx + 2])) {
      return parts[idx + 2];
    }
    if (isRutubeVideoId(next)) {
      return next;
    }
  }

  const embedIdx = parts.indexOf('embed');
  if (embedIdx > 0 && parts[embedIdx - 1] === 'play' && isRutubeVideoId(parts[embedIdx + 1])) {
    return parts[embedIdx + 1];
  }

  for (let i = parts.length - 1; i >= 0; i -= 1) {
    if (isRutubeVideoId(parts[i])) {
      return parts[i];
    }
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

function VideoLinkPreviewCard({
  preview,
  isOwn,
  maxWidthPx,
}: {
  preview: VideoLinkPreview;
  isOwn: boolean;
  maxWidthPx: number;
}) {
  const [isPlayingInline, setIsPlayingInline] = useState(false);
  const [meta, setMeta] = useState<VideoPreviewMeta | null>(null);
  const resolvedEmbedUrl = meta?.embedUrl || preview.embedUrl;
  const canInlinePlay = !!preview.directVideoUrl || !!resolvedEmbedUrl;
  const resolvedSource = meta?.providerName || preview.sourceLabel;
  const isSpotifyCard = resolvedSource.trim().toLowerCase() === 'spotify';
  const resolvedTitle = meta?.title || preview.title;
  const resolvedDescription = meta?.description || preview.description;
  const resolvedPosterUrlRaw = meta?.thumbnailUrl || preview.posterUrl;
  const resolvedPosterUrl = isSpotifyCard
    ? toHighResSpotifyThumbnail(resolvedPosterUrlRaw)
    : resolvedPosterUrlRaw;
  const resolvedDuration = preview.durationLabel || meta?.durationLabel;
  const resolvedEmbedWidth = meta?.embedWidth;
  const resolvedEmbedHeight = meta?.embedHeight;
  const spotifyEntityKind =
    getSpotifyEntityKindFromUrl(resolvedEmbedUrl) ||
    getSpotifyEntityKindFromUrl(preview.embedUrl) ||
    getSpotifyEntityKindFromUrl(preview.url);
  const spotifyInlineAspectRatio = getSpotifyInlineEmbedAspectRatio(spotifyEntityKind);
  const embedAspectRatio =
    typeof resolvedEmbedWidth === 'number' &&
    resolvedEmbedWidth > 0 &&
    typeof resolvedEmbedHeight === 'number' &&
    resolvedEmbedHeight > 0
      ? resolvedEmbedWidth / resolvedEmbedHeight
      : undefined;
  const mediaAspectRatio = isPlayingInline
    ? (isSpotifyCard ? spotifyInlineAspectRatio : embedAspectRatio || 16 / 9)
    : (isSpotifyCard ? 1 : 16 / 9);
  const mediaPaddingTop = `${100 / mediaAspectRatio}%`;

  useEffect(() => {
    let disposed = false;
    const cacheKey = getVideoMetaCacheKey(preview.url);

    const cached = VIDEO_META_CACHE.get(cacheKey);
    if (cached !== undefined) {
      setMeta(cached);
      return () => {
        disposed = true;
      };
    }

    void (async () => {
      const loadedMeta = await fetchVideoPreviewMeta(preview);
      VIDEO_META_CACHE.set(cacheKey, loadedMeta);
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
      style={{ width: '100%', maxWidth: maxWidthPx }}
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

      <div
        className="relative w-full overflow-hidden bg-[#6557b7]/66 transition-[padding] duration-150 ease-out"
        style={{ paddingTop: mediaPaddingTop }}
      >
        {isPlayingInline && preview.directVideoUrl ? (
          <video
            src={preview.directVideoUrl}
            controls
            autoPlay
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : isPlayingInline && resolvedEmbedUrl ? (
          <iframe
            src={resolvedEmbedUrl}
            title={resolvedTitle}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            className="absolute inset-0 h-full w-full border-0"
          />
        ) : (
          <button
            type="button"
            onClick={handlePlay}
            className="group absolute inset-0 h-full w-full"
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
  bubbleMaxWidthPx,
  time,
  isOwn,
  isRead,
  isEdited,
  replyPreview,
  hideTail = false,
}: MessageTextBubbleProps) {
  const bubbleWidthStyle = videoPreview
    ? { width: `min(100%, ${bubbleMaxWidthPx}px)` }
    : undefined;
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
    <div
      className={`tg-bubble relative ${isOwn ? 'tg-right bg-[#967ef0] text-white' : 'tg-left bg-[#222327] text-white/95'} ${hideTail ? 'tg-tail-none' : ''}`}
      style={bubbleWidthStyle}
    >
      {replyPreview ? <ReplyPreviewBlock replyPreview={replyPreview} isOwn={isOwn} /> : null}
      <div className={`whitespace-pre-line break-words text-[18px] leading-[1.22] tracking-[0.05px] ${textPaddingClass}`}>
        {renderMessageContent(content, entities)}
      </div>
      {videoPreview ? (
        <VideoLinkPreviewCard preview={videoPreview} isOwn={isOwn} maxWidthPx={bubbleMaxWidthPx} />
      ) : null}
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
  hideTail = false,
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
    <div className={`tg-bubble relative ${bubbleClass} ${hideTail ? 'tg-tail-none' : ''}`}>
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

function CircleUploadOverlay({
  uploadState,
  onCancelUpload,
}: {
  uploadState: PendingUploadState;
  onCancelUpload?: () => void;
}) {
  const safeProgress = Math.max(0, Math.min(100, uploadState.progress));
  const radius = 17;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (safeProgress / 100) * circumference;
  const canCancel = !!onCancelUpload && uploadState.cancelable;

  return (
    <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center rounded-full bg-black/26 backdrop-blur-[1px]">
      <button
        type="button"
        aria-label="Cancel upload"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (!canCancel) return;
          onCancelUpload();
        }}
        disabled={!canCancel}
        className={`pointer-events-auto relative grid h-[44px] w-[44px] place-items-center rounded-full bg-black/64 text-white shadow-[0_10px_22px_rgba(0,0,0,0.48)] ${
          canCancel ? 'hover:bg-black/78' : 'cursor-default'
        }`}
      >
        <svg className="pointer-events-none absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 44 44" aria-hidden="true">
          <circle
            cx="22"
            cy="22"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.32)"
            strokeWidth="2.3"
          />
          <circle
            cx="22"
            cy="22"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.96)"
            strokeWidth="2.7"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <span className="relative block h-[15px] w-[15px]">
          <span className="absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 rotate-45 rounded-full bg-white" />
          <span className="absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 -rotate-45 rounded-full bg-white" />
        </span>
      </button>
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
  uploadState,
  onCancelUpload,
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
  const hasUploadState = !!uploadState;

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
    if (hasUploadState) return;
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
        aria-label={
          hasUploadState
            ? 'Uploading video note'
            : isPlaying
              ? 'Pause video note'
              : 'Play video note'
        }
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

        {mediaPhase === 'ready' && !hasUploadState ? (
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
            <div className="grid h-[50px] w-[50px] place-items-center rounded-full bg-black/45 text-white shadow-[0_8px_16px_rgba(0,0,0,0.35)]">
              {isPlaying ? <PauseIcon size={22} /> : <PlayIcon size={22} className="translate-x-[1px]" />}
            </div>
          </div>
        ) : null}
        {hasUploadState ? (
          <CircleUploadOverlay
            uploadState={uploadState}
            onCancelUpload={uploadState.cancelable ? onCancelUpload : undefined}
          />
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
  bubbleMaxWidthPx,
  uploadingImages,
  onCircleMediaError,
  isCircleMuted,
  onToggleCircleMuted,
  resolveUserName,
  resolveUserAvatar,
  onPlaybackStateChange,
  onCancelPendingUpload,
  isSearchMatch,
  isSearchActive,
  hideTail,
  showEdgeAvatar,
  rowBottomGapPx,
}: {
  message: ChatMessage;
  userId: string;
  bubbleMaxWidthPx: number;
  uploadingImages?: ChatMessageListProps['uploadingImages'];
  onCircleMediaError?: () => void;
  isCircleMuted: boolean;
  onToggleCircleMuted: () => void;
  resolveUserName: (userId: string) => string;
  resolveUserAvatar?: (userId: string) => string | undefined;
  onPlaybackStateChange?: (state: ChatPlaybackState) => void;
  onCancelPendingUpload?: (localId: string, attachmentIndex: number) => void;
  isSearchMatch: boolean;
  isSearchActive: boolean;
  hideTail: boolean;
  showEdgeAvatar: boolean;
  rowBottomGapPx: number;
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
  const circleAttachmentItem =
    message.messageType === 'circle'
      ? (() => {
          const indexed = attachments.map((attachment, attachmentIndex) => ({
            attachment,
            attachmentIndex,
            resolvedUrl: resolveAttachmentUrl(attachment),
          }));
          const byVideoType = indexed.find((item) => isVideoContentType(item.attachment.contentType));
          return byVideoType ?? indexed[0];
        })()
      : undefined;
  const circleAttachment = circleAttachmentItem?.attachment;
  const imageAttachmentItems =
    message.messageType === 'image' || message.messageType === 'images'
      ? attachments
          .map((attachment, attachmentIndex) => {
            const resolvedUrl = resolveAttachmentUrl(attachment);
            if (!resolvedUrl) return null;
            const contentType = (attachment.contentType || '').toLowerCase();
            const isImage =
              attachment.isImage ||
              contentType.startsWith('image/') ||
              IMAGE_FILE_PATTERN.test(resolvedUrl);
            if (!isImage) return null;
            return {
              attachment,
              attachmentIndex,
              resolvedUrl,
            };
          })
          .filter((item): item is {
            attachment: ReturnType<typeof getMessageAttachments>[number];
            attachmentIndex: number;
            resolvedUrl: string;
          } => item !== null)
      : [];
  const groupServiceMessageType = toGroupServiceMessageType(message.messageType);
  const isCircleMessage = message.messageType === 'circle' && !!circleAttachment;
  const mediaId = `${message.messageType}-${String(message.messageId)}`;
  const author = isOwn ? 'You' : resolveUserName(message.senderId);
  const edgeAvatarName =
    message.senderDisplayName?.trim() ||
    message.senderUsername?.trim() ||
    resolveUserName(message.senderId) ||
    message.senderId.slice(0, 8);
  const edgeAvatarUrl = resolveUserAvatar?.(message.senderId);
  const edgeAvatarText = initialOf(edgeAvatarName);
  const edgeAvatarStyle = edgeAvatarUrl ? undefined : { background: hashColor(message.senderId) };
  const serviceActorName =
    message.senderDisplayName?.trim() ||
    message.senderUsername?.trim() ||
    resolveUserName(message.senderId) ||
    message.senderId.slice(0, 8);
  const rowHighlightClass = `rounded-[22px] transition-shadow ${
    isSearchActive
      ? 'shadow-[0_0_0_2px_rgba(179,156,255,0.95),0_8px_24px_rgba(108,78,204,0.35)]'
      : isSearchMatch
        ? 'shadow-[0_0_0_1px_rgba(179,156,255,0.5)]'
        : ''
  }`;

  const voiceUrl = voiceAttachment ? resolveAttachmentUrl(voiceAttachment) : '';
  const circleUrl = circleAttachmentItem?.resolvedUrl || '';
  const imageUrls = imageAttachmentItems.map((item) => item.resolvedUrl);
  const messageLocalId =
    message.localId || (typeof message.messageId === 'string' ? message.messageId : undefined);
  const imageUploadStates = imageAttachmentItems.map((item) => {
    if (!messageLocalId || !uploadingImages) {
      return undefined;
    }
    return uploadingImages.get(`${messageLocalId}-${item.attachmentIndex}`);
  });
  const circleUploadState =
    messageLocalId && uploadingImages && circleAttachmentItem
      ? uploadingImages.get(`${messageLocalId}-${circleAttachmentItem.attachmentIndex}`)
      : undefined;
  const replyPreview: ReplyPreview | undefined = message.replyToMessage
    ? {
        author:
          message.replyToMessage.senderId === userId
            ? 'You'
            : resolveUserName(message.replyToMessage.senderId),
        text: messagePreviewText(message.replyToMessage),
      }
    : undefined;

  if (groupServiceMessageType) {
    return (
      <div className="mb-[2px] flex justify-center">
        <div className={rowHighlightClass} style={{ maxWidth: bubbleMaxWidthPx }}>
          <GroupServiceMessageBubble
            message={message}
            messageType={groupServiceMessageType}
            actorName={serviceActorName}
            attachments={attachments}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${isCircleMessage ? 'my-[20px]' : ''} flex ${
        isOwn ? 'justify-end' : 'justify-start'
      }`}
      style={isCircleMessage ? undefined : { marginBottom: rowBottomGapPx }}
    >
      <div
        className={`${rowHighlightClass} relative`}
        style={{ maxWidth: bubbleMaxWidthPx }}
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
            hideTail={hideTail}
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
            uploadState={circleUploadState}
            onCancelUpload={() => {
              if (!onCancelPendingUpload || !messageLocalId || !circleAttachmentItem) return;
              onCancelPendingUpload(messageLocalId, circleAttachmentItem.attachmentIndex);
            }}
          />
        ) : imageUrls.length > 1 ? (
          <MultiImageBubble
            imageUrls={imageUrls}
            caption={hasTextContent ? renderContent : ''}
            captionEntities={hasTextContent ? renderEntities : undefined}
            bubbleMaxWidthPx={bubbleMaxWidthPx}
            time={time}
            isOwn={isOwn}
            isRead={isRead}
            isEdited={isEdited}
            replyPreview={replyPreview}
            hideTail={hideTail}
            uploadStates={imageUploadStates}
            onCancelUploadAt={(visibleIndex) => {
              if (!onCancelPendingUpload || !messageLocalId) return;
              const attachmentItem = imageAttachmentItems[visibleIndex];
              if (!attachmentItem) return;
              onCancelPendingUpload(messageLocalId, attachmentItem.attachmentIndex);
            }}
          />
        ) : imageUrls.length === 1 ? (
          <SingleImageBubble
            imageUrl={imageUrls[0]}
            caption={hasTextContent ? renderContent : ''}
            captionEntities={hasTextContent ? renderEntities : undefined}
            bubbleMaxWidthPx={bubbleMaxWidthPx}
            time={time}
            isOwn={isOwn}
            isRead={isRead}
            isEdited={isEdited}
            replyPreview={replyPreview}
            hideTail={hideTail}
            uploadState={imageUploadStates[0]}
            onCancelUpload={() => {
              if (!onCancelPendingUpload || !messageLocalId) return;
              const firstItem = imageAttachmentItems[0];
              if (!firstItem) return;
              onCancelPendingUpload(messageLocalId, firstItem.attachmentIndex);
            }}
          />
        ) : (
          <MessageTextBubble
            content={hasTextContent ? renderContent : messagePreviewText(message)}
            entities={hasTextContent ? renderEntities : undefined}
            videoPreview={videoPreview}
            bubbleMaxWidthPx={bubbleMaxWidthPx}
            time={time}
            isOwn={isOwn}
            isRead={isRead}
            isEdited={isEdited}
            replyPreview={replyPreview}
            hideTail={hideTail}
          />
        )}

        {(message.messageType === 'voice' || message.messageType === 'circle') && hasTextContent ? (
          <div
            className={`mt-1 px-2 text-[15px] leading-[1.2] ${
              isOwn ? 'text-white/88 text-right' : 'text-white/75 text-left'
            }`}
          >
            {renderMessageContent(renderContent, renderEntities)}
            {videoPreview ? (
              <VideoLinkPreviewCard
                preview={videoPreview}
                isOwn={isOwn}
                maxWidthPx={bubbleMaxWidthPx}
              />
            ) : null}
          </div>
        ) : null}
        {showEdgeAvatar ? (
          <span
            className={`pointer-events-none absolute bottom-[-2px] z-10 grid h-[42px] w-[42px] place-items-center overflow-hidden rounded-full border border-black/35 text-[11px] font-[700] text-white shadow-[0_6px_12px_rgba(0,0,0,0.4)] ${
              isOwn ? '-right-[50px]' : '-left-[50px]'
            }`}
            style={edgeAvatarStyle}
          >
            {edgeAvatarUrl ? (
              <img src={edgeAvatarUrl} alt={edgeAvatarName} className="h-full w-full object-cover" />
            ) : (
              edgeAvatarText
            )}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function ChatMessageList({
  messages,
  userId,
  hasSelectedChat,
  messageBubbleMaxWidthPx = DEFAULT_MESSAGE_BUBBLE_MAX_WIDTH_PX,
  uploadingImages,
  messagesEndRef,
  matchedMessageIds,
  activeMatchedMessageId,
  onCircleMediaError,
  resolveUserName,
  resolveUserAvatar,
  onPlaybackStateChange,
  onReplyMessage,
  onEditMessage,
  onDeleteMessage,
  onCopyMessage,
  onCancelPendingUpload,
}: ChatMessageListProps) {
  const [isCircleMuted, setIsCircleMuted] = useState(true);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; message: ChatMessage } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const hasInitializedMessagesRef = useRef(false);
  const previousMessageIdsRef = useRef<Set<string>>(new Set());
  const [enteringMessageIds, setEnteringMessageIds] = useState<Set<string>>(new Set());
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

  const bubbleVisualStateByMessageId = useMemo(() => {
    const visualStateById = new Map<string, { hideTail: boolean; showEdgeAvatar: boolean }>();
    const bubbleMessages = messages.filter((message) => isTailBubbleMessage(message));

    for (let index = 0; index < bubbleMessages.length; index += 1) {
      const current = bubbleMessages[index];
      const previous = index > 0 ? bubbleMessages[index - 1] : undefined;
      const next = index < bubbleMessages.length - 1 ? bubbleMessages[index + 1] : undefined;
      const groupedWithPrevious = areBubblesGrouped(previous, current);
      const groupedWithNext = areBubblesGrouped(current, next);

      visualStateById.set(String(current.messageId), {
        hideTail: groupedWithNext,
        showEdgeAvatar: !groupedWithNext,
      });
    }

    return visualStateById;
  }, [messages]);

  const messageRowBottomGapByMessageId = useMemo(() => {
    const gapById = new Map<string, number>();

    for (let index = 0; index < messages.length; index += 1) {
      const current = messages[index];
      const next = index < messages.length - 1 ? messages[index + 1] : undefined;
      gapById.set(String(current.messageId), getMessageRowBottomGapPx(current, next));
    }

    return gapById;
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

  useEffect(() => {
    const currentMessageIds = new Set(messages.map((message) => String(message.messageId)));

    if (!hasInitializedMessagesRef.current) {
      hasInitializedMessagesRef.current = true;
      previousMessageIdsRef.current = currentMessageIds;
      return;
    }

    const newlyAddedIds = [...currentMessageIds].filter((id) => !previousMessageIdsRef.current.has(id));
    previousMessageIdsRef.current = currentMessageIds;

    if (newlyAddedIds.length === 0) {
      return;
    }

    setEnteringMessageIds((prev) => {
      const next = new Set(prev);
      newlyAddedIds.forEach((id) => next.add(id));
      return next;
    });

    const timerId = window.setTimeout(() => {
      setEnteringMessageIds((prev) => {
        if (prev.size === 0) return prev;
        const next = new Set(prev);
        newlyAddedIds.forEach((id) => next.delete(id));
        return next;
      });
    }, 170);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [messages]);

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
  const contextIsGroupServiceMessage =
    !!contextMenu && toGroupServiceMessageType(contextMenu.message.messageType) !== null;
  const menuCopyText = contextMenu
    ? (contextMenu.message.content || '').trim() || messagePreviewText(contextMenu.message)
    : '';

  return (
    <>
      <style>{`
        @keyframes chatMessageEnterQuick {
          from { opacity: 0; transform: translate3d(0, 10px, 0); }
          to { opacity: 1; transform: translate3d(0, 0, 0); }
        }
        .chat-message-enter-quick {
          animation: chatMessageEnterQuick 170ms cubic-bezier(0.18, 0.8, 0.2, 1);
          will-change: opacity, transform;
        }
      `}</style>
      {!hasSelectedChat ? (
        <div className="py-10 text-center text-white/50">Select a chat on the left</div>
      ) : rows.length === 0 ? (
        <div className="py-10 text-center text-white/50">No messages yet</div>
      ) : (
        rows.map((row) =>
          row.type === 'divider' ? (
            <DateDivider key={row.key} label={row.label} />
          ) : (() => {
              const messageId = String(row.message.messageId);
              const bubbleVisualState = bubbleVisualStateByMessageId.get(messageId);
              return (
                <div
                  key={row.key}
                  id={toMessageDomId(row.message.messageId)}
                  className={enteringMessageIds.has(messageId) ? 'chat-message-enter-quick' : undefined}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    setContextMenu({ x: event.clientX, y: event.clientY, message: row.message });
                  }}
                >
                  <ChatMessageRow
                    message={row.message}
                    userId={userId}
                    bubbleMaxWidthPx={messageBubbleMaxWidthPx}
                    uploadingImages={uploadingImages}
                    onCircleMediaError={onCircleMediaError}
                    isCircleMuted={isCircleMuted}
                    onToggleCircleMuted={() => setIsCircleMuted((prev) => !prev)}
                    resolveUserName={resolveUserName}
                    resolveUserAvatar={resolveUserAvatar}
                    onPlaybackStateChange={onPlaybackStateChange || undefined}
                    onCancelPendingUpload={onCancelPendingUpload}
                    isSearchMatch={matchedMessageIdSet.has(messageId)}
                    isSearchActive={messageId === activeMatchedMessageId}
                    hideTail={bubbleVisualState?.hideTail ?? false}
                    showEdgeAvatar={bubbleVisualState?.showEdgeAvatar ?? false}
                    rowBottomGapPx={
                      messageRowBottomGapByMessageId.get(messageId) ??
                      MESSAGE_ROW_BASE_GAP_PX
                    }
                  />
                </div>
              );
            })()
        )
      )}
      <div ref={messagesEndRef} />

      {contextMenu ? (
        <div
          ref={contextMenuRef}
          className="fixed z-[80] min-w-[210px] overflow-hidden rounded-2xl border border-white/12 bg-[#201d28]/98 p-1.5 shadow-[0_20px_44px_rgba(0,0,0,0.5)] backdrop-blur-md"
          style={{ left: safeMenuLeft, top: safeMenuTop }}
        >
          {!contextIsGroupServiceMessage ? (
            <>
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
            </>
          ) : null}

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
