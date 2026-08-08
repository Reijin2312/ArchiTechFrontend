import { useEffect, useState } from 'react';
import { chatMediaDownloadManager, } from './mediaDownloadManager.js';
const buildSnapshot = (url, kind, phase, resolvedUrl) => ({
    url,
    phase,
    progress: phase === 'ready' ? 100 : 0,
    indeterminate: false,
    resolvedUrl,
    retries: 0,
    fromCache: false,
    loadedBytes: 0,
    kind,
    manual: false,
});
export const isManagedMediaSourceUrl = (value) => {
    if (typeof window === 'undefined')
        return false;
    if (!value)
        return false;
    if (value.startsWith('blob:') || value.startsWith('data:'))
        return false;
    try {
        const parsed = new URL(value, window.location.origin);
        if (!/^https?:$/i.test(parsed.protocol)) {
            return false;
        }
        return parsed.origin === window.location.origin;
    }
    catch {
        return false;
    }
};
export function useManagedMediaDownload({ url, kind, sizeBytes, priority = 60, autoStart = true, managed = true, inViewport, pauseWhenNotVisible = true, }) {
    const normalizedUrl = (url || '').trim();
    const canManage = managed && isManagedMediaSourceUrl(normalizedUrl);
    const [snapshot, setSnapshot] = useState(() => {
        if (!normalizedUrl) {
            return buildSnapshot('', kind, 'idle');
        }
        if (!canManage) {
            return buildSnapshot(normalizedUrl, kind, 'ready', normalizedUrl);
        }
        return (chatMediaDownloadManager.getSnapshot(normalizedUrl) ||
            buildSnapshot(normalizedUrl, kind, 'idle'));
    });
    useEffect(() => {
        if (!normalizedUrl) {
            setSnapshot(buildSnapshot('', kind, 'idle'));
            return;
        }
        if (!canManage) {
            setSnapshot(buildSnapshot(normalizedUrl, kind, 'ready', normalizedUrl));
            return;
        }
        const current = chatMediaDownloadManager.getSnapshot(normalizedUrl) ||
            buildSnapshot(normalizedUrl, kind, 'idle');
        setSnapshot(current);
    }, [canManage, kind, normalizedUrl]);
    useEffect(() => {
        if (!canManage || !normalizedUrl)
            return undefined;
        const unsubscribe = chatMediaDownloadManager.subscribe(normalizedUrl, setSnapshot);
        return unsubscribe;
    }, [canManage, normalizedUrl]);
    useEffect(() => {
        if (!canManage || !normalizedUrl)
            return;
        chatMediaDownloadManager.request(normalizedUrl, {
            kind,
            sizeBytes,
            priority,
            autoStart,
        });
    }, [
        autoStart,
        canManage,
        kind,
        normalizedUrl,
        priority,
        sizeBytes,
    ]);
    useEffect(() => {
        if (!canManage || !normalizedUrl)
            return;
        chatMediaDownloadManager.setPriority(normalizedUrl, priority);
    }, [canManage, normalizedUrl, priority]);
    useEffect(() => {
        if (!canManage || !normalizedUrl || !pauseWhenNotVisible || autoStart === false) {
            return;
        }
        if (inViewport === false) {
            if (snapshot.phase === 'idle' ||
                snapshot.phase === 'queued' ||
                snapshot.phase === 'downloading') {
                chatMediaDownloadManager.pause(normalizedUrl, { reason: 'viewport' });
            }
            return;
        }
        if (inViewport === true &&
            snapshot.phase === 'paused' &&
            !snapshot.manual) {
            chatMediaDownloadManager.resume(normalizedUrl, { respectPolicy: true });
        }
    }, [
        autoStart,
        canManage,
        inViewport,
        normalizedUrl,
        pauseWhenNotVisible,
        snapshot.manual,
        snapshot.phase,
    ]);
    return {
        snapshot,
        phase: snapshot.phase,
        progress: snapshot.progress,
        indeterminate: snapshot.indeterminate,
        resolvedUrl: snapshot.resolvedUrl,
        error: snapshot.error,
        retries: snapshot.retries,
        fromCache: snapshot.fromCache,
        loadedBytes: snapshot.loadedBytes,
        totalBytes: snapshot.totalBytes,
        managed: canManage,
        start: () => {
            if (!canManage || !normalizedUrl)
                return;
            chatMediaDownloadManager.start(normalizedUrl);
        },
        retry: () => {
            if (!canManage || !normalizedUrl)
                return;
            chatMediaDownloadManager.retry(normalizedUrl);
        },
        cancel: () => {
            if (!canManage || !normalizedUrl)
                return;
            chatMediaDownloadManager.cancel(normalizedUrl);
        },
        pause: () => {
            if (!canManage || !normalizedUrl)
                return;
            chatMediaDownloadManager.pause(normalizedUrl, { reason: 'manual' });
        },
        resume: (respectPolicy = true) => {
            if (!canManage || !normalizedUrl)
                return;
            chatMediaDownloadManager.resume(normalizedUrl, { respectPolicy });
        },
        setPriority: (nextPriority) => {
            if (!canManage || !normalizedUrl)
                return;
            chatMediaDownloadManager.setPriority(normalizedUrl, nextPriority);
        },
    };
}
