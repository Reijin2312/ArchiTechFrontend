const VIDEO_POSTER_CACHE_LIMIT = 300;
const videoPosterCache = new Map();
const pendingPosterTasks = new Map();
function getSafeAspectRatio(width, height) {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
        return 16 / 9;
    }
    return width / height;
}
function rememberVideoPosterMeta(url, meta) {
    if (!url || !meta.posterDataUrl)
        return;
    if (!videoPosterCache.has(url) && videoPosterCache.size >= VIDEO_POSTER_CACHE_LIMIT) {
        const oldestKey = videoPosterCache.keys().next().value;
        if (oldestKey) {
            videoPosterCache.delete(oldestKey);
        }
    }
    videoPosterCache.set(url, meta);
}
export function getCachedVideoPosterMeta(url) {
    if (!url)
        return undefined;
    return videoPosterCache.get(url);
}
export function getCachedVideoPosterUrl(url) {
    return getCachedVideoPosterMeta(url)?.posterDataUrl;
}
export function getCachedVideoAspectRatio(url) {
    return getCachedVideoPosterMeta(url)?.aspectRatio;
}
async function generateVideoPosterMeta(videoUrl, options) {
    if (!videoUrl || typeof document === 'undefined') {
        return null;
    }
    const preferredTimeSec = Math.max(0, options?.preferredTimeSec ?? 0.2);
    const timeoutMs = Math.max(3_000, options?.timeoutMs ?? 8_000);
    const maxWidth = Math.max(320, options?.maxWidth ?? 720);
    return new Promise((resolve) => {
        let settled = false;
        let timeoutId = null;
        let waitingForSeek = false;
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.muted = true;
        video.playsInline = true;
        const finish = (result) => {
            if (settled)
                return;
            settled = true;
            if (timeoutId !== null) {
                window.clearTimeout(timeoutId);
            }
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('loadeddata', handleLoadedData);
            video.removeEventListener('seeked', handleSeeked);
            video.removeEventListener('error', handleError);
            video.removeAttribute('src');
            video.load();
            resolve(result);
        };
        const captureFrame = () => {
            const sourceWidth = video.videoWidth || 0;
            const sourceHeight = video.videoHeight || 0;
            if (sourceWidth <= 0 || sourceHeight <= 0) {
                finish(null);
                return;
            }
            const scale = sourceWidth > maxWidth ? maxWidth / sourceWidth : 1;
            const drawWidth = Math.max(1, Math.round(sourceWidth * scale));
            const drawHeight = Math.max(1, Math.round(sourceHeight * scale));
            const canvas = document.createElement('canvas');
            canvas.width = drawWidth;
            canvas.height = drawHeight;
            const context = canvas.getContext('2d', { alpha: false });
            if (!context) {
                finish(null);
                return;
            }
            try {
                context.drawImage(video, 0, 0, drawWidth, drawHeight);
                const posterDataUrl = canvas.toDataURL('image/jpeg', 0.82);
                if (!posterDataUrl) {
                    finish(null);
                    return;
                }
                finish({
                    posterDataUrl,
                    width: sourceWidth,
                    height: sourceHeight,
                    aspectRatio: getSafeAspectRatio(sourceWidth, sourceHeight),
                });
            }
            catch {
                finish(null);
            }
        };
        const handleSeeked = () => {
            waitingForSeek = false;
            captureFrame();
        };
        const handleLoadedData = () => {
            if (waitingForSeek) {
                return;
            }
            captureFrame();
        };
        const handleLoadedMetadata = () => {
            const duration = Number.isFinite(video.duration) ? video.duration : 0;
            const targetTime = duration > 1
                ? Math.min(Math.max(duration * 0.18, preferredTimeSec), 1.2)
                : preferredTimeSec;
            if (targetTime > 0.01) {
                try {
                    waitingForSeek = true;
                    video.currentTime = targetTime;
                    return;
                }
                catch {
                    waitingForSeek = false;
                }
            }
            captureFrame();
        };
        const handleError = () => {
            finish(null);
        };
        timeoutId = window.setTimeout(() => finish(null), timeoutMs);
        video.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
        video.addEventListener('loadeddata', handleLoadedData, { once: true });
        video.addEventListener('seeked', handleSeeked, { once: true });
        video.addEventListener('error', handleError, { once: true });
        video.src = videoUrl;
        video.load();
    });
}
export async function ensureVideoPosterMeta(videoUrl, options) {
    if (!videoUrl) {
        return null;
    }
    const cached = videoPosterCache.get(videoUrl);
    if (cached) {
        return cached;
    }
    const pending = pendingPosterTasks.get(videoUrl);
    if (pending) {
        return pending;
    }
    const task = generateVideoPosterMeta(videoUrl, options)
        .then((meta) => {
        if (meta) {
            rememberVideoPosterMeta(videoUrl, meta);
        }
        return meta;
    })
        .finally(() => {
        pendingPosterTasks.delete(videoUrl);
    });
    pendingPosterTasks.set(videoUrl, task);
    return task;
}
