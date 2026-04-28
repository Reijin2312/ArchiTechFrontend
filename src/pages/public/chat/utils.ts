import type { ChatMessage } from '@/shared/api/types';
import {
  getMessageMediaAttachments,
  type ChatMediaAttachment,
} from '@/shared/ui/button/social/chat/mediaAttachments';

export type MessageAttachment = ChatMediaAttachment;

const IMAGE_FILE_PATTERN = /\.(png|jpe?g|gif|webp|avif|bmp|svg)(?:$|[?#])/i;
const VIDEO_FILE_PATTERN = /\.(mp4|webm|mov|m4v|ogv|m3u8|mkv|avi)(?:$|[?#])/i;

export const hashColor = (seed: string) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const hueA = hash % 360;
  const hueB = (hueA + 42) % 360;
  return `linear-gradient(135deg, hsl(${hueA} 72% 46%) 0%, hsl(${hueB} 68% 36%) 100%)`;
};

export const initialOf = (value: string) => (value.trim().charAt(0) || '?').toUpperCase();

export const formatChatTime = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const formatMessageTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
};

export const formatDivider = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
};

const parseGroupServiceMembers = (rawContent: string) =>
  rawContent
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

const resolveGroupServiceActor = (message: ChatMessage) =>
  message.senderDisplayName?.trim() ||
  message.senderUsername?.trim() ||
  'Someone';

const parsePollQuestion = (rawContent: string) => {
  const trimmed = rawContent.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
    return '';
  }
  try {
    const parsed = JSON.parse(trimmed) as { question?: unknown };
    return typeof parsed.question === 'string' ? parsed.question.trim() : '';
  } catch {
    return '';
  }
};

const toGroupServicePreview = (message: ChatMessage): string | null => {
  const type = message.messageType;
  if (
    type !== 'group_created' &&
    type !== 'group_title_updated' &&
    type !== 'group_avatar_updated' &&
    type !== 'group_member_added' &&
    type !== 'group_members_added' &&
    type !== 'group_member_removed' &&
    type !== 'group_members_removed' &&
    type !== 'group_member_left' &&
    type !== 'group_admin_promoted' &&
    type !== 'group_admin_demoted' &&
    type !== 'group_owner_transferred' &&
    type !== 'group_description_updated' &&
    type !== 'group_public_username_updated' &&
    type !== 'group_slow_mode_updated' &&
    type !== 'group_history_visibility_updated' &&
    type !== 'group_permissions_updated' &&
    type !== 'group_admin_rights_updated' &&
    type !== 'group_member_muted' &&
    type !== 'group_member_unmuted' &&
    type !== 'group_member_banned' &&
    type !== 'group_member_unbanned' &&
    type !== 'group_message_pinned' &&
    type !== 'group_message_unpinned' &&
    type !== 'group_invite_link_created' &&
    type !== 'group_invite_link_revoked' &&
    type !== 'group_join_request_created' &&
    type !== 'group_join_request_approved' &&
    type !== 'group_join_request_declined' &&
    type !== 'group_topic_created' &&
    type !== 'group_topic_closed' &&
    type !== 'group_topic_reopened' &&
    type !== 'group_topic_deleted' &&
    type !== 'reaction' &&
    type !== 'poll_closed'
  ) {
    return null;
  }

  const actor = resolveGroupServiceActor(message);
  const content = (message.content || '').trim();
  const members = parseGroupServiceMembers(content);

  if (type === 'group_created') {
    return content ? `${actor} created group "${content}"` : `${actor} created the group`;
  }
  if (type === 'group_title_updated') {
    return content ? `${actor} changed group title to "${content}"` : `${actor} changed the group title`;
  }
  if (type === 'group_avatar_updated') {
    return `${actor} updated group photo`;
  }
  if (type === 'group_member_added' || type === 'group_members_added') {
    if (members.length === 1) return `${actor} added ${members[0]}`;
    if (members.length > 1) return `${actor} added ${members.join(', ')}`;
    return `${actor} added members`;
  }
  if (type === 'group_member_removed' || type === 'group_members_removed') {
    if (members.length === 1) return `${actor} removed ${members[0]}`;
    if (members.length > 1) return `${actor} removed ${members.join(', ')}`;
    return `${actor} removed members`;
  }
  if (type === 'group_member_left') {
    return `${actor} left the group`;
  }
  if (type === 'group_admin_promoted') {
    if (members.length === 1) return `${actor} promoted ${members[0]} to admin`;
    if (members.length > 1) return `${actor} promoted ${members.join(', ')} to admins`;
    return `${actor} promoted a new admin`;
  }
  if (type === 'group_admin_demoted') {
    if (members.length === 1) return `${actor} demoted ${members[0]}`;
    if (members.length > 1) return `${actor} demoted ${members.join(', ')}`;
    return `${actor} changed admin rights`;
  }
  if (type === 'group_owner_transferred') {
    if (members.length === 1) return `${actor} transferred ownership to ${members[0]}`;
    if (members.length > 1) return `${actor} transferred ownership to ${members.join(', ')}`;
    return `${actor} transferred ownership`;
  }
  if (type === 'group_description_updated') return `${actor} updated group description`;
  if (type === 'group_public_username_updated') return `${actor} updated public username`;
  if (type === 'group_slow_mode_updated') return `${actor} updated slow mode`;
  if (type === 'group_history_visibility_updated') return `${actor} updated history visibility`;
  if (type === 'group_permissions_updated') return `${actor} updated group permissions`;
  if (type === 'group_admin_rights_updated') return `${actor} updated admin rights`;
  if (type === 'group_member_muted') return `${actor} muted a member`;
  if (type === 'group_member_unmuted') return `${actor} unmuted a member`;
  if (type === 'group_member_banned') return `${actor} banned a member`;
  if (type === 'group_member_unbanned') return `${actor} unbanned a member`;
  if (type === 'group_message_pinned') return `${actor} pinned a message`;
  if (type === 'group_message_unpinned') return `${actor} unpinned a message`;
  if (type === 'group_invite_link_created') return `${actor} created an invite link`;
  if (type === 'group_invite_link_revoked') return `${actor} revoked an invite link`;
  if (type === 'group_join_request_created') return `${actor} requested to join`;
  if (type === 'group_join_request_approved') return `${actor} approved a join request`;
  if (type === 'group_join_request_declined') return `${actor} declined a join request`;
  if (type === 'group_topic_created') return `${actor} created a topic`;
  if (type === 'group_topic_closed') return `${actor} closed a topic`;
  if (type === 'group_topic_reopened') return `${actor} reopened a topic`;
  if (type === 'group_topic_deleted') return `${actor} deleted a topic`;
  if (type === 'reaction') return `${actor} reacted to a message`;
  if (type === 'poll_closed') return `${actor} closed a poll`;
  return null;
};

export const messagePreviewText = (message?: ChatMessage) => {
  if (!message) return 'No messages';
  const servicePreview = toGroupServicePreview(message);
  if (servicePreview) return servicePreview;
  if (message.messageType === 'poll') {
    const question = parsePollQuestion(message.content || '');
    return question ? `Poll: ${question}` : 'Poll';
  }
  const text = (message.content || '').trim();
  if (text) return text;
  const attachments = getMessageAttachments(message);
  const hasVideoAttachment = attachments.some((attachment) => {
    const contentType = (attachment.contentType || '').toLowerCase();
    if (isVideoContentType(contentType)) return true;
    const resolvedUrl = resolveAttachmentUrl(attachment);
    return VIDEO_FILE_PATTERN.test(resolvedUrl);
  });
  const hasImageAttachment = attachments.some((attachment) => {
    const contentType = (attachment.contentType || '').toLowerCase();
    if (attachment.isImage || contentType.startsWith('image/')) return true;
    const resolvedUrl = resolveAttachmentUrl(attachment);
    return IMAGE_FILE_PATTERN.test(resolvedUrl);
  });

  if (hasVideoAttachment) return 'Video message';
  if (hasImageAttachment) return 'Photo';

  if (message.messageType === 'image' || message.messageType === 'images') return 'Photo';
  return 'Message';
};

export const isMessageRead = (message: ChatMessage) =>
  !!message.isRead;

export const isAudioContentType = (value?: string) =>
  (value || '').toLowerCase().startsWith('audio/');

export const isVideoContentType = (value?: string) =>
  (value || '').toLowerCase().startsWith('video/');

export const resolveMediaUrl = (value?: string) => {
  if (!value) return '';
  const normalized = value.trim();
  if (!normalized) return '';
  if (normalized.startsWith('blob:') || normalized.startsWith('data:')) {
    return normalized;
  }
  return normalized;
};

export const getMessageAttachments = (message: ChatMessage): MessageAttachment[] => {
  return getMessageMediaAttachments(message);
};

export const resolveAttachmentUrl = (attachment: MessageAttachment) => {
  const direct = resolveMediaUrl(attachment.imageUrl);
  if (direct) return direct;

  if (!attachment.imagePath) return '';
  const normalizedPath = attachment.imagePath.startsWith('/media/')
    ? attachment.imagePath
    : `/media/${attachment.imagePath}`;
  return resolveMediaUrl(normalizedPath);
};

export const formatDuration = (valueSec: number) => {
  const safe = Number.isFinite(valueSec) && valueSec > 0 ? Math.floor(valueSec) : 0;
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export const formatFileSize = (size?: number) => {
  if (!size || size <= 0) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

export const buildFallbackWaveform = (seed: string, bars = 56): number[] => {
  let state = 0;
  for (let i = 0; i < seed.length; i += 1) {
    state = (state * 31 + seed.charCodeAt(i)) >>> 0;
  }

  const output: number[] = [];
  for (let i = 0; i < bars; i += 1) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const noise = state / 0xffffffff;
    const x = i / Math.max(1, bars - 1);
    const envelope = 0.35 + 0.65 * Math.sin(Math.PI * x);
    const height = 0.18 + (0.72 * envelope + 0.28 * noise) * 0.72;
    output.push(Math.min(1, Math.max(0.14, height)));
  }

  return output;
};

export const buildWaveformFromAudioSamples = (samples: Float32Array, bars = 56): number[] => {
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

  return normalized.map((value, i, arr) => {
    const prev = arr[Math.max(0, i - 1)];
    const next = arr[Math.min(arr.length - 1, i + 1)];
    return Math.min(1, Math.max(0.12, value * 0.5 + prev * 0.25 + next * 0.25));
  });
};

const voiceWaveformCache = new Map<string, { waveform: number[]; durationSec?: number }>();

export const loadWaveformFromAudioUrl = async ({
  fileUrl,
  bars = 56,
  signal,
}: {
  fileUrl: string;
  bars?: number;
  signal?: AbortSignal;
}): Promise<{ waveform: number[]; durationSec?: number } | null> => {
  if (!fileUrl || typeof window === 'undefined') return null;

  const cacheKey = `${bars}|${fileUrl}`;
  const cached = voiceWaveformCache.get(cacheKey);
  if (cached) return cached;

  const response = await fetch(fileUrl, { signal, cache: 'force-cache' });
  if (!response.ok) {
    throw new Error(`Waveform fetch failed with status ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  if (signal?.aborted) return null;

  const AudioContextCtor =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return null;

  const audioContext = new AudioContextCtor();
  try {
    const decoded = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    if (signal?.aborted) return null;

    const waveform = buildWaveformFromAudioSamples(decoded.getChannelData(0), bars);
    if (!waveform.length) return null;

    const result = {
      waveform,
      durationSec:
        Number.isFinite(decoded.duration) && decoded.duration > 0
          ? decoded.duration
          : undefined,
    };
    voiceWaveformCache.set(cacheKey, result);
    return result;
  } finally {
    await audioContext.close().catch(() => undefined);
  }
};
