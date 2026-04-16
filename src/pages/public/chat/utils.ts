import type { ChatMessage } from '@/shared/api/types';
import { endpoints } from '@/shared/api/endpoints';
import { http } from '@/shared/api/http';
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

export const messagePreviewText = (message?: ChatMessage) => {
  if (!message) return 'No messages';
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
  if (message.messageType === 'voice') return 'Voice message';
  if (message.messageType === 'circle') return 'Video message';
  if (message.messageType === 'file' || message.messageType === 'files') return 'File';
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
const voiceTranscriptCache = new Map<string, string>();

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

const extractTranscriptText = (payload: unknown): string => {
  const data = payload as Record<string, unknown> | null | undefined;
  if (!data || typeof data !== 'object') return '';

  const directText = [
    data.text,
    data.transcript,
    (data.data as Record<string, unknown> | undefined)?.text,
    (data.data as Record<string, unknown> | undefined)?.transcript,
    (data.result as Record<string, unknown> | undefined)?.text,
    (data.result as Record<string, unknown> | undefined)?.transcript,
  ].find((value) => typeof value === 'string' && value.trim().length > 0) as string | undefined;

  return directText?.trim() || '';
};

export const transcribeVoiceMessageFromUrl = async ({
  fileUrl,
  fileName,
  contentType,
  signal,
}: {
  fileUrl: string;
  fileName?: string;
  contentType?: string;
  signal?: AbortSignal;
}): Promise<string> => {
  if (!fileUrl) {
    throw new Error('Voice file URL is empty');
  }

  const cachedTranscript = voiceTranscriptCache.get(fileUrl);
  if (cachedTranscript) return cachedTranscript;

  const response = await fetch(fileUrl, { signal, cache: 'force-cache' });
  if (!response.ok) {
    throw new Error(`Voice file download failed with status ${response.status}`);
  }

  const blob = await response.blob();
  if (!blob.size) {
    throw new Error('Voice file is empty');
  }

  const normalizedType = (contentType || blob.type || 'audio/webm').toLowerCase();
  const extension = normalizedType.includes('ogg')
    ? 'ogg'
    : normalizedType.includes('mp4')
      ? 'mp4'
      : normalizedType.includes('mpeg')
        ? 'mp3'
        : 'webm';
  const resolvedFileName = fileName || `voice-${Date.now()}.${extension}`;
  const file = new File([blob], resolvedFileName, {
    type: blob.type || contentType || 'audio/webm',
  });

  const sendTranscriptionRequest = async (fieldName: 'file' | 'audio') => {
    const formData = new FormData();
    formData.append(fieldName, file);
    return http.post(endpoints.chatTranscribe, formData, { signal });
  };

  let transcriptionResponse;
  try {
    transcriptionResponse = await sendTranscriptionRequest('file');
  } catch (error) {
    transcriptionResponse = await sendTranscriptionRequest('audio');
  }

  const transcript = extractTranscriptText(transcriptionResponse.data);
  if (!transcript) {
    throw new Error('Transcription response does not contain text');
  }

  voiceTranscriptCache.set(fileUrl, transcript);
  return transcript;
};
