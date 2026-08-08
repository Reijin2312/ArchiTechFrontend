import { openDB } from 'idb';
const POLICY_STORAGE_KEY = 'chat-media-auto-download-policy-v1';
const MB = 1024 * 1024;
const DEFAULT_POLICY = {
    image: {
        enabled: true,
        wifiMaxBytes: 25 * MB,
        cellularMaxBytes: 4 * MB,
    },
    video: {
        enabled: true,
        wifiMaxBytes: 20 * MB,
        cellularMaxBytes: 3 * MB,
    },
};
const DB_NAME = 'chat-media-cache-db';
const DB_VERSION = 1;
const MEDIA_STORE = 'media';
const MAX_CACHE_ENTRIES = 500;
function clonePolicy(policy) {
    return {
        image: { ...policy.image },
        video: { ...policy.video },
    };
}
function sanitizePolicy(policy) {
    const fallback = clonePolicy(DEFAULT_POLICY);
    if (!policy || typeof policy !== 'object') {
        return fallback;
    }
    const source = policy;
    const sanitizeKind = (key, defaults) => {
        const value = source[key];
        if (!value || typeof value !== 'object') {
            return { ...defaults };
        }
        const record = value;
        const enabled = typeof record.enabled === 'boolean' ? record.enabled : defaults.enabled;
        const wifiMaxBytes = typeof record.wifiMaxBytes === 'number' && Number.isFinite(record.wifiMaxBytes)
            ? Math.max(0, record.wifiMaxBytes)
            : defaults.wifiMaxBytes;
        const cellularMaxBytes = typeof record.cellularMaxBytes === 'number' &&
            Number.isFinite(record.cellularMaxBytes)
            ? Math.max(0, record.cellularMaxBytes)
            : defaults.cellularMaxBytes;
        return {
            enabled,
            wifiMaxBytes,
            cellularMaxBytes,
        };
    };
    return {
        image: sanitizeKind('image', fallback.image),
        video: sanitizeKind('video', fallback.video),
    };
}
function loadPolicyFromStorage() {
    if (typeof window === 'undefined') {
        return clonePolicy(DEFAULT_POLICY);
    }
    try {
        const raw = window.localStorage.getItem(POLICY_STORAGE_KEY);
        if (!raw) {
            return clonePolicy(DEFAULT_POLICY);
        }
        return sanitizePolicy(JSON.parse(raw));
    }
    catch {
        return clonePolicy(DEFAULT_POLICY);
    }
}
function savePolicyToStorage(policy) {
    if (typeof window === 'undefined') {
        return;
    }
    try {
        window.localStorage.setItem(POLICY_STORAGE_KEY, JSON.stringify(policy));
    }
    catch {
        // Ignore storage quota and privacy mode errors.
    }
}
function resolveNetworkClass() {
    if (typeof navigator === 'undefined') {
        return 'wifi';
    }
    const nav = navigator;
    const connection = nav.connection;
    const saveData = !!connection?.saveData;
    const type = (connection?.type || '').toLowerCase();
    const effectiveType = (connection?.effectiveType || '').toLowerCase();
    if (saveData) {
        return 'cellular';
    }
    if (type.includes('cellular')) {
        return 'cellular';
    }
    if (effectiveType === '2g' || effectiveType === '3g' || effectiveType === 'slow-2g') {
        return 'cellular';
    }
    return 'wifi';
}
function isLikelyOnline() {
    if (typeof navigator === 'undefined') {
        return true;
    }
    return navigator.onLine !== false;
}
function toCacheKey(sourceUrl) {
    if (!sourceUrl)
        return sourceUrl;
    if (sourceUrl.startsWith('blob:') || sourceUrl.startsWith('data:')) {
        return sourceUrl;
    }
    try {
        const parsed = new URL(sourceUrl, window.location.origin);
        if (parsed.pathname.startsWith('/media/chat_images/') ||
            parsed.pathname.startsWith('/media/chat_files/')) {
            parsed.searchParams.delete('token');
        }
        const normalizedSearch = parsed.searchParams.toString();
        return `${parsed.origin}${parsed.pathname}${normalizedSearch ? `?${normalizedSearch}` : ''}`;
    }
    catch {
        return sourceUrl;
    }
}
class ChatMediaDownloadManager {
    listeners = new Map();
    tasks = new Map();
    dbPromise;
    maxParallelDownloads = 3;
    maxRetryAttempts = 4;
    activeDownloads = 0;
    scheduling = false;
    policy = loadPolicyFromStorage();
    constructor() {
        this.dbPromise = openDB(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(MEDIA_STORE)) {
                    const store = db.createObjectStore(MEDIA_STORE, { keyPath: 'key' });
                    store.createIndex('updatedAt', 'updatedAt');
                }
            },
        });
        if (typeof window !== 'undefined') {
            window.addEventListener('online', this.handleOnline);
            window.addEventListener('focus', this.handleOnline);
        }
    }
    getPolicy() {
        return clonePolicy(this.policy);
    }
    updatePolicy(partial) {
        const nextPolicy = sanitizePolicy({
            ...this.policy,
            ...partial,
            image: { ...this.policy.image, ...(partial.image || {}) },
            video: { ...this.policy.video, ...(partial.video || {}) },
        });
        this.policy = nextPolicy;
        savePolicyToStorage(nextPolicy);
        this.requestSchedule();
        return clonePolicy(this.policy);
    }
    subscribe(url, listener) {
        if (!url) {
            listener({
                url: '',
                phase: 'idle',
                progress: 0,
                indeterminate: false,
                retries: 0,
                fromCache: false,
                loadedBytes: 0,
                kind: 'image',
                manual: false,
            });
            return () => undefined;
        }
        const task = this.getOrCreateTask(url, 'image');
        task.lastTouchedAt = Date.now();
        const listenerSet = this.listeners.get(url) || new Set();
        listenerSet.add(listener);
        this.listeners.set(url, listenerSet);
        listener(this.toSnapshot(task));
        return () => {
            const set = this.listeners.get(url);
            if (!set)
                return;
            set.delete(listener);
            if (set.size === 0) {
                this.listeners.delete(url);
            }
        };
    }
    getSnapshot(url) {
        const task = this.tasks.get(url);
        if (!task)
            return null;
        return this.toSnapshot(task);
    }
    request(url, options) {
        if (!url)
            return;
        const task = this.getOrCreateTask(url, options.kind);
        task.kind = options.kind;
        task.sizeBytes = options.sizeBytes ?? task.sizeBytes;
        task.priority = options.priority;
        task.autoStartRequested = options.autoStart;
        task.lastTouchedAt = Date.now();
        this.emit(task);
        if (task.phase === 'ready') {
            return;
        }
        if (!task.cacheChecked) {
            task.cacheChecked = true;
            void this.tryLoadFromPersistentCache(task).then((cached) => {
                if (cached) {
                    return;
                }
                if (!options.autoStart) {
                    this.markTaskAsManualPaused(task);
                    return;
                }
                this.enqueueTask(task, {
                    respectPolicy: true,
                    force: false,
                });
            });
            return;
        }
        if (!options.autoStart) {
            this.markTaskAsManualPaused(task);
            return;
        }
        this.enqueueTask(task, {
            respectPolicy: true,
            force: false,
        });
    }
    retry(url) {
        const task = this.tasks.get(url);
        if (!task)
            return;
        task.error = undefined;
        task.pauseReason = undefined;
        task.phase = 'idle';
        this.enqueueTask(task, {
            respectPolicy: false,
            force: true,
        });
    }
    start(url) {
        const task = this.tasks.get(url);
        if (!task)
            return;
        task.pauseReason = undefined;
        this.enqueueTask(task, {
            respectPolicy: false,
            force: true,
        });
    }
    cancel(url) {
        const task = this.tasks.get(url);
        if (!task)
            return;
        task.manual = true;
        task.pauseReason = 'manual';
        task.waitUntil = 0;
        if (task.phase === 'downloading' && task.controller) {
            task.phase = 'canceled';
            task.controller.abort();
            task.controller = null;
        }
        else {
            task.phase = 'canceled';
        }
        this.emit(task);
    }
    pause(url, options) {
        const task = this.tasks.get(url);
        if (!task)
            return;
        const reason = options?.reason || 'manual';
        task.manual = reason === 'manual';
        task.pauseReason = reason;
        task.waitUntil = 0;
        if (task.phase === 'downloading' && task.controller) {
            task.phase = 'paused';
            task.controller.abort();
            task.controller = null;
        }
        else if (task.phase === 'queued' || task.phase === 'idle' || task.phase === 'error') {
            task.phase = 'paused';
        }
        this.emit(task);
    }
    resume(url, options) {
        const task = this.tasks.get(url);
        if (!task)
            return;
        task.pauseReason = undefined;
        task.manual = false;
        this.enqueueTask(task, {
            respectPolicy: options?.respectPolicy !== false,
            force: false,
        });
    }
    setPriority(url, priority) {
        const task = this.tasks.get(url);
        if (!task)
            return;
        if (task.priority === priority)
            return;
        task.priority = priority;
        task.lastTouchedAt = Date.now();
        if (task.phase === 'queued') {
            this.requestSchedule();
        }
    }
    handleOnline = () => {
        this.requestSchedule();
    };
    getOrCreateTask(url, kind) {
        const existing = this.tasks.get(url);
        if (existing)
            return existing;
        const task = {
            url,
            cacheKey: toCacheKey(url),
            kind,
            phase: 'idle',
            progress: 0,
            indeterminate: false,
            retries: 0,
            loadedBytes: 0,
            fromCache: false,
            manual: false,
            priority: 0,
            queuedAt: 0,
            waitUntil: 0,
            autoStartRequested: true,
            cacheChecked: false,
            controller: null,
            blob: null,
            lastTouchedAt: Date.now(),
        };
        this.tasks.set(url, task);
        return task;
    }
    toSnapshot(task) {
        return {
            url: task.url,
            phase: task.phase,
            progress: task.progress,
            indeterminate: task.indeterminate,
            resolvedUrl: task.resolvedUrl,
            error: task.error,
            retries: task.retries,
            fromCache: task.fromCache,
            loadedBytes: task.loadedBytes,
            totalBytes: task.totalBytes,
            kind: task.kind,
            manual: task.manual,
        };
    }
    emit(task) {
        const listeners = this.listeners.get(task.url);
        if (!listeners || listeners.size === 0)
            return;
        const snapshot = this.toSnapshot(task);
        listeners.forEach((listener) => listener(snapshot));
    }
    markTaskAsManualPaused(task) {
        task.manual = true;
        task.pauseReason = 'manual';
        task.waitUntil = 0;
        task.error = undefined;
        task.indeterminate = false;
        if (task.phase === 'downloading' && task.controller) {
            task.phase = 'paused';
            task.controller.abort();
            task.controller = null;
        }
        else if (task.phase !== 'ready') {
            task.phase = 'paused';
        }
        this.emit(task);
    }
    shouldAutoDownload(task) {
        const kindPolicy = this.policy[task.kind];
        if (!kindPolicy.enabled) {
            return false;
        }
        const networkClass = resolveNetworkClass();
        const maxBytes = networkClass === 'wifi'
            ? kindPolicy.wifiMaxBytes
            : kindPolicy.cellularMaxBytes;
        if (maxBytes <= 0) {
            return false;
        }
        if (!task.sizeBytes || task.sizeBytes <= 0) {
            return true;
        }
        return task.sizeBytes <= maxBytes;
    }
    enqueueTask(task, options) {
        if (task.phase === 'ready' || task.phase === 'downloading') {
            return;
        }
        if (!options.force && options.respectPolicy && !this.shouldAutoDownload(task)) {
            task.phase = 'paused';
            task.manual = true;
            task.pauseReason = 'manual';
            task.error = undefined;
            this.emit(task);
            return;
        }
        task.phase = 'queued';
        task.indeterminate = false;
        task.error = undefined;
        task.queuedAt = Date.now();
        task.waitUntil = 0;
        task.manual = false;
        task.pauseReason = undefined;
        this.emit(task);
        this.requestSchedule();
    }
    requestSchedule() {
        if (this.scheduling)
            return;
        this.scheduling = true;
        queueMicrotask(() => {
            this.scheduling = false;
            void this.schedule();
        });
    }
    async schedule() {
        if (this.activeDownloads >= this.maxParallelDownloads) {
            return;
        }
        if (!isLikelyOnline()) {
            return;
        }
        while (this.activeDownloads < this.maxParallelDownloads) {
            const task = this.pickNextQueuedTask();
            if (!task) {
                break;
            }
            await this.startDownload(task);
        }
    }
    pickNextQueuedTask() {
        const now = Date.now();
        const queuedTasks = [...this.tasks.values()].filter((task) => {
            if (task.phase !== 'queued')
                return false;
            if (task.waitUntil > now)
                return false;
            return true;
        });
        if (queuedTasks.length === 0) {
            return null;
        }
        queuedTasks.sort((a, b) => {
            if (a.priority !== b.priority) {
                return b.priority - a.priority;
            }
            return a.queuedAt - b.queuedAt;
        });
        return queuedTasks[0] || null;
    }
    async startDownload(task) {
        if (task.phase !== 'queued') {
            return;
        }
        this.activeDownloads += 1;
        task.phase = 'downloading';
        task.indeterminate = true;
        task.error = undefined;
        task.loadedBytes = 0;
        task.totalBytes = undefined;
        task.progress = 0;
        const controller = new AbortController();
        task.controller = controller;
        this.emit(task);
        try {
            const response = await fetch(task.url, {
                method: 'GET',
                signal: controller.signal,
                credentials: 'include',
                cache: 'force-cache',
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const contentLengthHeader = response.headers.get('content-length');
            const totalBytes = contentLengthHeader && Number.isFinite(Number(contentLengthHeader))
                ? Number(contentLengthHeader)
                : 0;
            if (totalBytes > 0) {
                task.totalBytes = totalBytes;
                task.indeterminate = false;
            }
            else {
                task.totalBytes = undefined;
                task.indeterminate = true;
            }
            this.emit(task);
            const blob = await this.readResponseBlobWithProgress(response, task, controller.signal);
            if (controller.signal.aborted) {
                return;
            }
            task.retries = 0;
            task.fromCache = false;
            task.blob = blob;
            task.loadedBytes = blob.size;
            task.totalBytes = blob.size;
            task.progress = 100;
            task.indeterminate = false;
            if (task.resolvedUrl) {
                URL.revokeObjectURL(task.resolvedUrl);
            }
            task.resolvedUrl = URL.createObjectURL(blob);
            task.phase = 'ready';
            this.emit(task);
            void this.storeInPersistentCache(task, blob, response.headers.get('content-type') || undefined);
        }
        catch (error) {
            if (controller.signal.aborted) {
                const currentPhase = task.phase;
                if (currentPhase !== 'canceled' && currentPhase !== 'paused') {
                    task.phase = 'paused';
                    task.pauseReason = task.pauseReason || 'manual';
                    this.emit(task);
                }
                return;
            }
            this.handleDownloadFailure(task, error);
        }
        finally {
            if (task.controller === controller) {
                task.controller = null;
            }
            this.activeDownloads = Math.max(0, this.activeDownloads - 1);
            this.requestSchedule();
        }
    }
    async readResponseBlobWithProgress(response, task, signal) {
        if (!response.body) {
            const blob = await response.blob();
            task.loadedBytes = blob.size;
            task.totalBytes = blob.size;
            task.progress = 100;
            task.indeterminate = false;
            this.emit(task);
            return blob;
        }
        const reader = response.body.getReader();
        const chunks = [];
        let loadedBytes = 0;
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }
            if (signal.aborted) {
                throw new DOMException('Aborted', 'AbortError');
            }
            if (!value) {
                continue;
            }
            const chunk = new Uint8Array(value);
            chunks.push(chunk);
            loadedBytes += chunk.byteLength;
            task.loadedBytes = loadedBytes;
            if (task.totalBytes && task.totalBytes > 0) {
                task.progress = Math.max(1, Math.min(99, Math.round((loadedBytes / task.totalBytes) * 100)));
                task.indeterminate = false;
            }
            else {
                task.progress = task.progress < 95 ? task.progress + (task.progress < 35 ? 8 : 3) : task.progress;
                task.indeterminate = true;
            }
            this.emit(task);
        }
        return new Blob(chunks, {
            type: response.headers.get('content-type') || undefined,
        });
    }
    handleDownloadFailure(task, error) {
        const message = error instanceof Error
            ? error.message
            : typeof error === 'string'
                ? error
                : 'Failed to download media';
        if (!isLikelyOnline()) {
            task.phase = 'queued';
            task.indeterminate = false;
            task.error = 'Waiting for connection';
            task.waitUntil = 0;
            this.emit(task);
            return;
        }
        task.retries += 1;
        if (task.retries <= this.maxRetryAttempts) {
            const retryDelay = Math.min(16_000, 800 * (2 ** (task.retries - 1)));
            task.phase = 'queued';
            task.error = `Retrying in ${Math.ceil(retryDelay / 1000)}s`;
            task.waitUntil = Date.now() + retryDelay;
            task.indeterminate = false;
            this.emit(task);
            window.setTimeout(() => {
                if (task.phase === 'queued') {
                    task.waitUntil = 0;
                    this.requestSchedule();
                }
            }, retryDelay + 24);
            return;
        }
        task.phase = 'error';
        task.indeterminate = false;
        task.error = message;
        this.emit(task);
    }
    async tryLoadFromPersistentCache(task) {
        if (task.blob) {
            if (!task.resolvedUrl) {
                task.resolvedUrl = URL.createObjectURL(task.blob);
            }
            task.phase = 'ready';
            task.progress = 100;
            task.indeterminate = false;
            task.fromCache = true;
            task.error = undefined;
            this.emit(task);
            return true;
        }
        try {
            const db = await this.dbPromise;
            const cached = await db.get(MEDIA_STORE, task.cacheKey);
            if (!cached || !cached.blob) {
                return false;
            }
            task.blob = cached.blob;
            if (task.resolvedUrl) {
                URL.revokeObjectURL(task.resolvedUrl);
            }
            task.resolvedUrl = URL.createObjectURL(cached.blob);
            task.phase = 'ready';
            task.progress = 100;
            task.indeterminate = false;
            task.fromCache = true;
            task.error = undefined;
            task.loadedBytes = cached.sizeBytes;
            task.totalBytes = cached.sizeBytes;
            this.emit(task);
            return true;
        }
        catch {
            return false;
        }
    }
    async storeInPersistentCache(task, blob, contentType) {
        try {
            const db = await this.dbPromise;
            const tx = db.transaction(MEDIA_STORE, 'readwrite');
            const store = tx.objectStore(MEDIA_STORE);
            await store.put({
                key: task.cacheKey,
                sourceUrl: task.url,
                kind: task.kind,
                contentType,
                sizeBytes: blob.size,
                blob,
                updatedAt: Date.now(),
            });
            const count = await store.count();
            if (count > MAX_CACHE_ENTRIES) {
                let toDelete = count - MAX_CACHE_ENTRIES;
                const index = store.index('updatedAt');
                let cursor = await index.openCursor();
                while (cursor && toDelete > 0) {
                    await cursor.delete();
                    toDelete -= 1;
                    cursor = await cursor.continue();
                }
            }
            await tx.done;
        }
        catch {
            // Ignore cache write errors to keep UI responsive.
        }
    }
}
export const chatMediaDownloadManager = new ChatMediaDownloadManager();
export const getMediaAutoDownloadPolicy = () => chatMediaDownloadManager.getPolicy();
export const updateMediaAutoDownloadPolicy = (partial) => chatMediaDownloadManager.updatePolicy(partial);
