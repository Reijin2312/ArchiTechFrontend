export type LocalMediaPreviewMeta = {
  mediaType: 'image' | 'video';
  previewUrl?: string;
  thumbnailUrl?: string;
  strippedThumbnailUrl?: string;
  width?: number;
  height?: number;
  aspectRatio?: number;
};

type BuildLocalMediaPreviewOptions = {
  preferredPreviewUrl?: string;
  forceMediaType?: 'image' | 'video';
};

const THUMBNAIL_MAX_EDGE_PX = 512;
const STRIPPED_MAX_EDGE_PX = 32;
const THUMBNAIL_JPEG_QUALITY = 0.78;
const STRIPPED_JPEG_QUALITY = 0.28;
const VIDEO_SEEK_TIMEOUT_MS = 4_000;

const positiveNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }
  return undefined;
};

const resolveMediaType = (
  file: File,
  forceMediaType?: 'image' | 'video'
): 'image' | 'video' | null => {
  if (forceMediaType) return forceMediaType;
  const contentType = (file.type || '').toLowerCase();
  if (contentType.startsWith('image/')) return 'image';
  if (contentType.startsWith('video/')) return 'video';
  return null;
};

const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> =>
  new Promise((resolve, reject) => {
    const timerId = window.setTimeout(() => {
      reject(new Error('Timed out while generating media preview'));
    }, timeoutMs);

    promise
      .then((value) => {
        window.clearTimeout(timerId);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timerId);
        reject(error);
      });
  });

const canvasToJpegDataUrl = (canvas: HTMLCanvasElement, quality: number) => {
  try {
    const url = canvas.toDataURL('image/jpeg', quality);
    if (!url || url === 'data:,') {
      return undefined;
    }
    return url;
  } catch {
    return undefined;
  }
};

const buildScaledCanvas = (
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  maxEdge: number
) => {
  const safeSourceWidth = Math.max(1, Math.round(sourceWidth));
  const safeSourceHeight = Math.max(1, Math.round(sourceHeight));
  const scale =
    Math.max(safeSourceWidth, safeSourceHeight) > maxEdge
      ? maxEdge / Math.max(safeSourceWidth, safeSourceHeight)
      : 1;

  const targetWidth = Math.max(1, Math.round(safeSourceWidth * scale));
  const targetHeight = Math.max(1, Math.round(safeSourceHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) {
    return null;
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(source, 0, 0, targetWidth, targetHeight);
  return canvas;
};

const readImageFromBlobUrl = (blobUrl: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to decode image preview'));
    image.src = blobUrl;
  });

const generateImagePreviewMeta = async (
  file: File,
  preferredPreviewUrl?: string
): Promise<LocalMediaPreviewMeta | null> => {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await withTimeout(readImageFromBlobUrl(objectUrl), VIDEO_SEEK_TIMEOUT_MS);
    const width = positiveNumber(image.naturalWidth);
    const height = positiveNumber(image.naturalHeight);
    if (!width || !height) {
      return null;
    }

    const thumbnailCanvas = buildScaledCanvas(image, width, height, THUMBNAIL_MAX_EDGE_PX);
    const strippedCanvas = buildScaledCanvas(image, width, height, STRIPPED_MAX_EDGE_PX);
    const thumbnailUrl = thumbnailCanvas
      ? canvasToJpegDataUrl(thumbnailCanvas, THUMBNAIL_JPEG_QUALITY)
      : undefined;
    const strippedThumbnailUrl = strippedCanvas
      ? canvasToJpegDataUrl(strippedCanvas, STRIPPED_JPEG_QUALITY)
      : undefined;

    return {
      mediaType: 'image',
      previewUrl: preferredPreviewUrl || thumbnailUrl,
      thumbnailUrl,
      strippedThumbnailUrl,
      width,
      height,
      aspectRatio: width / height,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const waitForVideoEvent = (
  video: HTMLVideoElement,
  eventName: 'loadedmetadata' | 'seeked' | 'loadeddata',
  timeoutMs: number
) =>
  withTimeout(
    new Promise<void>((resolve, reject) => {
      const onSuccess = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error(`Failed while waiting for ${eventName}`));
      };
      const cleanup = () => {
        video.removeEventListener(eventName, onSuccess);
        video.removeEventListener('error', onError);
      };

      video.addEventListener(eventName, onSuccess, { once: true });
      video.addEventListener('error', onError, { once: true });
    }),
    timeoutMs
  );

const generateVideoPreviewMeta = async (
  file: File,
  preferredPreviewUrl?: string
): Promise<LocalMediaPreviewMeta | null> => {
  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.preload = 'metadata';
  video.muted = true;
  video.playsInline = true;

  try {
    video.src = objectUrl;
    video.load();
    await waitForVideoEvent(video, 'loadedmetadata', VIDEO_SEEK_TIMEOUT_MS);

    const width = positiveNumber(video.videoWidth);
    const height = positiveNumber(video.videoHeight);
    if (!width || !height) {
      return null;
    }

    if (video.readyState < 2) {
      const duration = positiveNumber(video.duration) || 0;
      const seekTarget =
        duration > 0.16 ? Math.min(0.14, Math.max(0.01, duration * 0.12)) : 0;
      if (seekTarget > 0) {
        video.currentTime = seekTarget;
        await waitForVideoEvent(video, 'seeked', VIDEO_SEEK_TIMEOUT_MS);
      } else {
        await waitForVideoEvent(video, 'loadeddata', VIDEO_SEEK_TIMEOUT_MS);
      }
    }

    const thumbnailCanvas = buildScaledCanvas(video, width, height, THUMBNAIL_MAX_EDGE_PX);
    const strippedCanvas = buildScaledCanvas(video, width, height, STRIPPED_MAX_EDGE_PX);
    const thumbnailUrl = thumbnailCanvas
      ? canvasToJpegDataUrl(thumbnailCanvas, THUMBNAIL_JPEG_QUALITY)
      : undefined;
    const strippedThumbnailUrl = strippedCanvas
      ? canvasToJpegDataUrl(strippedCanvas, STRIPPED_JPEG_QUALITY)
      : undefined;

    return {
      mediaType: 'video',
      previewUrl: preferredPreviewUrl || thumbnailUrl,
      thumbnailUrl,
      strippedThumbnailUrl,
      width,
      height,
      aspectRatio: width / height,
    };
  } finally {
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(objectUrl);
  }
};

export const buildLocalMediaPreviewMeta = async (
  file: File,
  options?: BuildLocalMediaPreviewOptions
): Promise<LocalMediaPreviewMeta | null> => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return null;
  }

  const mediaType = resolveMediaType(file, options?.forceMediaType);
  if (!mediaType) {
    return null;
  }

  try {
    if (mediaType === 'video') {
      return await generateVideoPreviewMeta(file, options?.preferredPreviewUrl);
    }
    return await generateImagePreviewMeta(file, options?.preferredPreviewUrl);
  } catch {
    return null;
  }
};
