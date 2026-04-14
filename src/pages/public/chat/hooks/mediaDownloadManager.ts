import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export type ManagedMediaKind = 'image' | 'video' | 'audio' | 'file';
export type ManagedMediaPhase =
  | 'idle'
  | 'queued'
  | 'downloading'
  | 'paused'
  | 'canceled'
  | 'error'
  | 'ready';

type ManagedNetworkClass = 'wifi' | 'cellular';

export type ManagedMediaSnapshot = {
  url: string;
  phase: ManagedMediaPhase;
  progress: number;
  indeterminate: boolean;
  resolvedUrl?: string;
  error?: string;
  retries: number;
  fromCache: boolean;
  loadedBytes: number;
  totalBytes?: number;
  kind: ManagedMediaKind;
  manual: boolean;
};

type MediaKindPolicy = {
  enabled: boolean;
  wifiMaxBytes: number;
  cellularMaxBytes: number;
};

export type MediaAutoDownloadPolicy = {
  image: MediaKindPolicy;
  video: MediaKindPolicy;
  audio: MediaKindPolicy;
  file: MediaKindPolicy;
};

type MediaDownloadTask = {
  url: string;
  cacheKey: string;
  kind: ManagedMediaKind;
  sizeBytes?: number;
  phase: ManagedMediaPhase;
  progress: number;
  indeterminate: boolean;
  resolvedUrl?: string;
  error?: string;
  retries: number;
  loadedBytes: number;
  totalBytes?: number;
  fromCache: boolean;
  manual: boolean;
  priority: number;
  queuedAt: number;
  waitUntil: number;
  autoStartRequested: boolean;
  cacheChecked: boolean;
  controller: AbortController | null;
  blob: Blob | null;
  lastTouchedAt: number;
  pauseReason?: 'manual' | 'viewport';
};

type Listener = (snapshot: ManagedMediaSnapshot) => void;

type RequestOptions = {
  kind: ManagedMediaKind;
  sizeBytes?: number;
  priority: number;
  autoStart: boolean;
};

type PauseOptions = {
  reason?: 'manual' | 'viewport';
};

type ResumeOptions = {
  respectPolicy?: boolean;
};

const POLICY_STORAGE_KEY = 'chat-media-auto-download-policy-v1';

const MB = 1024 * 1024;
const DEFAULT_POLICY: MediaAutoDownloadPolicy = {
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
  audio: {
    enabled: true,
    wifiMaxBytes: 16 * MB,
    cellularMaxBytes: 3 * MB,
  },
  file: {
    enabled: true,
    wifiMaxBytes: 10 * MB,
    cellularMaxBytes: 2 * MB,
  },
};

interface MediaCacheDB extends DBSchema {
  media: {
    key: string;
    value: {
      key: string;
      sourceUrl: string;
      kind: ManagedMediaKind;
      contentType?: string;
      sizeBytes: number;
      blob: Blob;
      updatedAt: number;
    };
    indexes: {
      updatedAt: number;
    };
  };
}

const DB_NAME = 'chat-media-cache-db';
const DB_VERSION = 1;
const MEDIA_STORE = 'media';
const MAX_CACHE_ENTRIES = 500;

function clonePolicy(policy: MediaAutoDownloadPolicy): MediaAutoDownloadPolicy {
  return {
    image: { ...policy.image },
    video: { ...policy.video },
    audio: { ...policy.audio },
    file: { ...policy.file },
  };
}

function sanitizePolicy(policy: unknown): MediaAutoDownloadPolicy {
  const fallback = clonePolicy(DEFAULT_POLICY);
  if (!policy || typeof policy !== 'object') {
    return fallback;
  }

  const source = policy as Record<string, unknown>;
  const sanitizeKind = (
    key: keyof MediaAutoDownloadPolicy,
    defaults: MediaKindPolicy
  ): MediaKindPolicy => {
    const value = source[key];
    if (!value || typeof value !== 'object') {
      return { ...defaults };
    }
    const record = value as Record<string, unknown>;
    const enabled =
      typeof record.enabled === 'boolean' ? record.enabled : defaults.enabled;
    const wifiMaxBytes =
      typeof record.wifiMaxBytes === 'number' && Number.isFinite(record.wifiMaxBytes)
        ? Math.max(0, record.wifiMaxBytes)
        : defaults.wifiMaxBytes;
    const cellularMaxBytes =
      typeof record.cellularMaxBytes === 'number' &&
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
    audio: sanitizeKind('audio', fallback.audio),
    file: sanitizeKind('file', fallback.file),
  };
}

function loadPolicyFromStorage(): MediaAutoDownloadPolicy {
  if (typeof window === 'undefined') {
    return clonePolicy(DEFAULT_POLICY);
  }
  try {
    const raw = window.localStorage.getItem(POLICY_STORAGE_KEY);
    if (!raw) {
      return clonePolicy(DEFAULT_POLICY);
    }
    return sanitizePolicy(JSON.parse(raw));
  } catch {
    return clonePolicy(DEFAULT_POLICY);
  }
}

function savePolicyToStorage(policy: MediaAutoDownloadPolicy): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(POLICY_STORAGE_KEY, JSON.stringify(policy));
  } catch {
    // Ignore storage quota and privacy mode errors.
  }
}

function resolveNetworkClass(): ManagedNetworkClass {
  if (typeof navigator === 'undefined') {
    return 'wifi';
  }

  const nav = navigator as Navigator & {
    connection?: {
      effectiveType?: string;
      saveData?: boolean;
      type?: string;
    };
  };
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

function isLikelyOnline(): boolean {
  if (typeof navigator === 'undefined') {
    return true;
  }
  return navigator.onLine !== false;
}

function toCacheKey(sourceUrl: string): string {
  if (!sourceUrl) return sourceUrl;
  if (sourceUrl.startsWith('blob:') || sourceUrl.startsWith('data:')) {
    return sourceUrl;
  }

  try {
    const parsed = new URL(sourceUrl, window.location.origin);
    if (
      parsed.pathname.startsWith('/media/chat_images/') ||
      parsed.pathname.startsWith('/media/chat_files/')
    ) {
      parsed.searchParams.delete('token');
    }
    const normalizedSearch = parsed.searchParams.toString();
    return `${parsed.origin}${parsed.pathname}${normalizedSearch ? `?${normalizedSearch}` : ''}`;
  } catch {
    return sourceUrl;
  }
}

class ChatMediaDownloadManager {
  private readonly listeners = new Map<string, Set<Listener>>();
  private readonly tasks = new Map<string, MediaDownloadTask>();
  private readonly dbPromise: Promise<IDBPDatabase<MediaCacheDB>>;
  private readonly maxParallelDownloads = 3;
  private readonly maxRetryAttempts = 4;
  private activeDownloads = 0;
  private scheduling = false;
  private policy = loadPolicyFromStorage();

  constructor() {
    this.dbPromise = openDB<MediaCacheDB>(DB_NAME, DB_VERSION, {
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

  getPolicy(): MediaAutoDownloadPolicy {
    return clonePolicy(this.policy);
  }

  updatePolicy(partial: Partial<MediaAutoDownloadPolicy>): MediaAutoDownloadPolicy {
    const nextPolicy = sanitizePolicy({
      ...this.policy,
      ...partial,
      image: { ...this.policy.image, ...(partial.image || {}) },
      video: { ...this.policy.video, ...(partial.video || {}) },
      audio: { ...this.policy.audio, ...(partial.audio || {}) },
      file: { ...this.policy.file, ...(partial.file || {}) },
    });
    this.policy = nextPolicy;
    savePolicyToStorage(nextPolicy);
    this.requestSchedule();
    return clonePolicy(this.policy);
  }

  subscribe(url: string, listener: Listener): () => void {
    if (!url) {
      listener({
        url: '',
        phase: 'idle',
        progress: 0,
        indeterminate: false,
        retries: 0,
        fromCache: false,
        loadedBytes: 0,
        kind: 'file',
        manual: false,
      });
      return () => undefined;
    }

    const task = this.getOrCreateTask(url, 'file');
    task.lastTouchedAt = Date.now();
    const listenerSet = this.listeners.get(url) || new Set<Listener>();
    listenerSet.add(listener);
    this.listeners.set(url, listenerSet);
    listener(this.toSnapshot(task));

    return () => {
      const set = this.listeners.get(url);
      if (!set) return;
      set.delete(listener);
      if (set.size === 0) {
        this.listeners.delete(url);
      }
    };
  }

  getSnapshot(url: string): ManagedMediaSnapshot | null {
    const task = this.tasks.get(url);
    if (!task) return null;
    return this.toSnapshot(task);
  }

  request(url: string, options: RequestOptions): void {
    if (!url) return;

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

  retry(url: string): void {
    const task = this.tasks.get(url);
    if (!task) return;
    task.error = undefined;
    task.pauseReason = undefined;
    task.phase = 'idle';
    this.enqueueTask(task, {
      respectPolicy: false,
      force: true,
    });
  }

  start(url: string): void {
    const task = this.tasks.get(url);
    if (!task) return;
    task.pauseReason = undefined;
    this.enqueueTask(task, {
      respectPolicy: false,
      force: true,
    });
  }

  cancel(url: string): void {
    const task = this.tasks.get(url);
    if (!task) return;

    task.manual = true;
    task.pauseReason = 'manual';
    task.waitUntil = 0;
    if (task.phase === 'downloading' && task.controller) {
      task.phase = 'canceled';
      task.controller.abort();
      task.controller = null;
    } else {
      task.phase = 'canceled';
    }
    this.emit(task);
  }

  pause(url: string, options?: PauseOptions): void {
    const task = this.tasks.get(url);
    if (!task) return;
    const reason = options?.reason || 'manual';
    task.manual = reason === 'manual';
    task.pauseReason = reason;
    task.waitUntil = 0;

    if (task.phase === 'downloading' && task.controller) {
      task.phase = 'paused';
      task.controller.abort();
      task.controller = null;
    } else if (task.phase === 'queued' || task.phase === 'idle' || task.phase === 'error') {
      task.phase = 'paused';
    }
    this.emit(task);
  }

  resume(url: string, options?: ResumeOptions): void {
    const task = this.tasks.get(url);
    if (!task) return;
    task.pauseReason = undefined;
    task.manual = false;
    this.enqueueTask(task, {
      respectPolicy: options?.respectPolicy !== false,
      force: false,
    });
  }

  setPriority(url: string, priority: number): void {
    const task = this.tasks.get(url);
    if (!task) return;
    if (task.priority === priority) return;
    task.priority = priority;
    task.lastTouchedAt = Date.now();
    if (task.phase === 'queued') {
      this.requestSchedule();
    }
  }

  private readonly handleOnline = () => {
    this.requestSchedule();
  };

  private getOrCreateTask(url: string, kind: ManagedMediaKind): MediaDownloadTask {
    const existing = this.tasks.get(url);
    if (existing) return existing;

    const task: MediaDownloadTask = {
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

  private toSnapshot(task: MediaDownloadTask): ManagedMediaSnapshot {
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

  private emit(task: MediaDownloadTask): void {
    const listeners = this.listeners.get(task.url);
    if (!listeners || listeners.size === 0) return;
    const snapshot = this.toSnapshot(task);
    listeners.forEach((listener) => listener(snapshot));
  }

  private markTaskAsManualPaused(task: MediaDownloadTask): void {
    task.manual = true;
    task.pauseReason = 'manual';
    task.waitUntil = 0;
    task.error = undefined;
    task.indeterminate = false;

    if (task.phase === 'downloading' && task.controller) {
      task.phase = 'paused';
      task.controller.abort();
      task.controller = null;
    } else if (task.phase !== 'ready') {
      task.phase = 'paused';
    }

    this.emit(task);
  }

  private shouldAutoDownload(task: MediaDownloadTask): boolean {
    const kindPolicy = this.policy[task.kind];
    if (!kindPolicy.enabled) {
      return false;
    }
    const networkClass = resolveNetworkClass();
    const maxBytes =
      networkClass === 'wifi'
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

  private enqueueTask(
    task: MediaDownloadTask,
    options: { respectPolicy: boolean; force: boolean }
  ): void {
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

  private requestSchedule(): void {
    if (this.scheduling) return;
    this.scheduling = true;
    queueMicrotask(() => {
      this.scheduling = false;
      void this.schedule();
    });
  }

  private async schedule(): Promise<void> {
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

  private pickNextQueuedTask(): MediaDownloadTask | null {
    const now = Date.now();
    const queuedTasks = [...this.tasks.values()].filter((task) => {
      if (task.phase !== 'queued') return false;
      if (task.waitUntil > now) return false;
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

  private async startDownload(task: MediaDownloadTask): Promise<void> {
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
      const totalBytes =
        contentLengthHeader && Number.isFinite(Number(contentLengthHeader))
          ? Number(contentLengthHeader)
          : 0;
      if (totalBytes > 0) {
        task.totalBytes = totalBytes;
        task.indeterminate = false;
      } else {
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
    } catch (error) {
      if (controller.signal.aborted) {
        const currentPhase = task.phase as ManagedMediaPhase;
        if (currentPhase !== 'canceled' && currentPhase !== 'paused') {
          task.phase = 'paused';
          task.pauseReason = task.pauseReason || 'manual';
          this.emit(task);
        }
        return;
      }
      this.handleDownloadFailure(task, error);
    } finally {
      if (task.controller === controller) {
        task.controller = null;
      }
      this.activeDownloads = Math.max(0, this.activeDownloads - 1);
      this.requestSchedule();
    }
  }

  private async readResponseBlobWithProgress(
    response: Response,
    task: MediaDownloadTask,
    signal: AbortSignal
  ): Promise<Blob> {
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
    const chunks: Uint8Array<ArrayBuffer>[] = [];
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
      } else {
        task.progress = task.progress < 95 ? task.progress + (task.progress < 35 ? 8 : 3) : task.progress;
        task.indeterminate = true;
      }
      this.emit(task);
    }

    return new Blob(chunks, {
      type: response.headers.get('content-type') || undefined,
    });
  }

  private handleDownloadFailure(task: MediaDownloadTask, error: unknown): void {
    const message =
      error instanceof Error
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

  private async tryLoadFromPersistentCache(task: MediaDownloadTask): Promise<boolean> {
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
    } catch {
      return false;
    }
  }

  private async storeInPersistentCache(
    task: MediaDownloadTask,
    blob: Blob,
    contentType?: string
  ): Promise<void> {
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
    } catch {
      // Ignore cache write errors to keep UI responsive.
    }
  }
}

export const chatMediaDownloadManager = new ChatMediaDownloadManager();

export const getMediaAutoDownloadPolicy = () =>
  chatMediaDownloadManager.getPolicy();

export const updateMediaAutoDownloadPolicy = (
  partial: Partial<MediaAutoDownloadPolicy>
) => chatMediaDownloadManager.updatePolicy(partial);
