import { authStore } from '../../shared/store/auth.js';
export class CloudChatClient {
    ws = null;
    messageHandlers = new Set();
    errorHandlers = new Set();
    connectionStateHandlers = new Set();
    config;
    cachedDeviceToken = null;
    connectingPromise = null;
    disconnectRequested = false;
    connectionGeneration = 0;
    reconnectTimeout = null;
    reconnectAttempt = 0;
    heartbeatIntervalTimer = null;
    heartbeatPongTimeout = null;
    pingNonce = 0;
    static OPEN_TIMEOUT_MS = 10_000;
    static HEARTBEAT_PONG_TIMEOUT_MS = 12_000;
    static RECONNECT_BASE_DELAY_MS = 1_000;
    static RECONNECT_MAX_DELAY_MS = 30_000;
    constructor(config = {}) {
        this.config = {
            wsUrl: config.wsUrl || this.getWebSocketUrl(),
            reconnectAttempts: config.reconnectAttempts ?? 50,
            heartbeatInterval: config.heartbeatInterval ?? 25_000,
        };
        if (typeof window !== 'undefined') {
            window.addEventListener('online', this.handleNetworkOnline);
            document.addEventListener('visibilitychange', this.handleVisibilityChange);
        }
    }
    getWebSocketUrl() {
        const wsUrl = import.meta?.env?.VITE_CHAT_WS_URL;
        if (wsUrl) {
            return wsUrl;
        }
        const origin = window.location.origin;
        const url = new URL(origin);
        url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${url.protocol}//${url.host}/ws/chat`;
    }
    async connect() {
        this.disconnectRequested = false;
        if (this.ws?.readyState === WebSocket.OPEN) {
            return;
        }
        if (this.connectingPromise) {
            return this.connectingPromise;
        }
        this.clearReconnectTimer();
        const generation = this.connectionGeneration;
        const pending = this.openSecureWebSocket(generation)
            .catch((error) => {
            if (!this.disconnectRequested && generation === this.connectionGeneration) {
                this.scheduleReconnect(`connect_failed: ${this.toErrorMessage(error)}`);
            }
            throw error;
        })
            .finally(() => {
            if (this.connectingPromise === pending) {
                this.connectingPromise = null;
            }
        });
        this.connectingPromise = pending;
        return pending;
    }
    async getTicket() {
        const apiBase = import.meta?.env?.VITE_API_BASE || window.location.origin;
        const state = authStore.getState();
        const { accessToken, sessionId, deviceId } = state;
        if (!accessToken || !sessionId || !deviceId) {
            const missing = [];
            if (!accessToken)
                missing.push('accessToken');
            if (!sessionId)
                missing.push('sessionId');
            if (!deviceId)
                missing.push('deviceId');
            throw new Error(`Missing auth/session credentials for chat ticket (${missing.join(', ')}). Please re-login.`);
        }
        const response = await fetch(`${apiBase}/api/v1/chat/ws-ticket`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
                'X-Session-ID': sessionId,
                'X-Device-ID': deviceId,
            },
        });
        if (!response.ok) {
            throw new Error(`Failed to get ticket: ${response.status}`);
        }
        const data = await response.json();
        if (!data?.ticket) {
            throw new Error('Ticket response does not include ticket');
        }
        return data.ticket;
    }
    async getDeviceToken() {
        const apiBase = import.meta?.env?.VITE_API_BASE || window.location.origin;
        const state = authStore.getState();
        const { accessToken, sessionId, deviceId } = state;
        if (!accessToken || !sessionId || !deviceId) {
            throw new Error('Missing credentials for device token. Please re-login.');
        }
        const now = Date.now();
        if (this.cachedDeviceToken && this.cachedDeviceToken.expiresAt - now > 60_000) {
            return this.cachedDeviceToken.token;
        }
        const response = await fetch(`${apiBase}/api/v1/chat/ws-ticket/device-token`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
                'X-Session-ID': sessionId,
                'X-Device-ID': deviceId,
            },
        });
        if (!response.ok) {
            throw new Error(`Failed to get device token: ${response.status}`);
        }
        const { deviceToken, expiresIn } = await response.json();
        if (!deviceToken) {
            throw new Error('Device token missing');
        }
        const ttlSec = typeof expiresIn === 'number' && expiresIn > 0 ? expiresIn : 300;
        this.cachedDeviceToken = {
            token: deviceToken,
            expiresAt: now + ttlSec * 1000,
        };
        return deviceToken;
    }
    async openSecureWebSocket(generation) {
        const ticket = await this.getTicket();
        const deviceToken = await this.getDeviceToken();
        if (generation !== this.connectionGeneration || this.disconnectRequested) {
            return;
        }
        const url = `${this.config.wsUrl}?ticket=${encodeURIComponent(ticket)}&deviceToken=${encodeURIComponent(deviceToken)}`;
        await new Promise((resolve, reject) => {
            let opened = false;
            let settled = false;
            const settleResolve = () => {
                if (settled)
                    return;
                settled = true;
                resolve();
            };
            const settleReject = (error) => {
                if (settled)
                    return;
                settled = true;
                reject(error);
            };
            let socket;
            try {
                socket = new WebSocket(url);
            }
            catch (error) {
                settleReject(new Error(`Failed to create WebSocket: ${this.toErrorMessage(error)}`));
                return;
            }
            this.ws = socket;
            const openTimeout = setTimeout(() => {
                if (socket.readyState === WebSocket.CONNECTING) {
                    try {
                        socket.close(4000, 'open_timeout');
                    }
                    catch {
                        // ignore close race
                    }
                    settleReject(new Error('WebSocket open timeout'));
                }
            }, CloudChatClient.OPEN_TIMEOUT_MS);
            socket.onopen = () => {
                clearTimeout(openTimeout);
                if (generation !== this.connectionGeneration || this.disconnectRequested) {
                    try {
                        socket.close(1000, 'stale_connect');
                    }
                    catch {
                        // ignore close race
                    }
                    settleResolve();
                    return;
                }
                opened = true;
                this.reconnectAttempt = 0;
                this.startHeartbeat();
                this.notifyConnectionState('connected');
                console.log('[ChatWS] connected');
                settleResolve();
            };
            socket.onmessage = (event) => {
                if (typeof event.data !== 'string') {
                    return;
                }
                this.handleIncomingMessage(event.data);
            };
            socket.onerror = () => {
                if (!opened) {
                    settleReject(new Error('WebSocket transport error during connect'));
                }
            };
            socket.onclose = (event) => {
                clearTimeout(openTimeout);
                if (this.ws === socket) {
                    this.ws = null;
                }
                this.stopHeartbeat();
                if (generation === this.connectionGeneration && !this.disconnectRequested) {
                    this.notifyConnectionState('disconnected');
                }
                if (generation !== this.connectionGeneration || this.disconnectRequested) {
                    if (!opened) {
                        settleResolve();
                    }
                    return;
                }
                const closeReason = `code=${event.code}, reason=${event.reason || 'n/a'}`;
                console.warn('[ChatWS] disconnected', closeReason);
                if (!opened) {
                    settleReject(new Error(`WebSocket closed before open (${closeReason})`));
                    return;
                }
                this.scheduleReconnect(`socket_closed: ${closeReason}`);
            };
        });
    }
    handleIncomingMessage(raw) {
        let parsed;
        try {
            parsed = JSON.parse(raw);
        }
        catch (error) {
            console.error('[ChatWS] failed to parse message', error);
            return;
        }
        const type = typeof parsed.type === 'string' ? parsed.type : '';
        if (type === 'pong') {
            this.handlePong(parsed);
            return;
        }
        if (type === 'ping') {
            this.sendPong(parsed);
            return;
        }
        if (type === 'new_message' && parsed.message) {
            this.notifyHandlers({
                type: 'new_message',
                message: parsed.message,
                chatId: parsed.message.chatId,
            });
            return;
        }
        if (type === 'message_sent') {
            this.notifyHandlers({
                type: 'message_sent',
                chatId: parsed.chatId,
                messageId: parsed.messageId,
                clientMessageId: parsed.clientMessageId,
                sequenceNumber: parsed.sequenceNumber,
                serverTimestamp: parsed.serverTimestamp,
                groupingKey: parsed.groupingKey,
            });
            return;
        }
        if (type === 'media_updated') {
            const media = parsed.media ??
                {
                    mediaPath: parsed.mediaPath,
                    contentType: parsed.contentType,
                    sizeBytes: parsed.sizeBytes,
                    width: parsed.width,
                    height: parsed.height,
                    imageEncryptionIv: parsed.imageEncryptionIv,
                    imageKeyVersion: parsed.imageKeyVersion,
                    imageUrl: parsed.imageUrl,
                    thumbnailUrl: parsed.thumbnailUrl,
                    strippedThumbnailUrl: parsed.strippedThumbnailUrl,
                    fileName: parsed.fileName,
                    isImage: parsed.isImage,
                };
            this.notifyHandlers({
                type: 'media_updated',
                chatId: parsed.chatId,
                messageId: parsed.messageId,
                clientMessageId: parsed.clientMessageId,
                senderId: parsed.senderId ??
                    parsed.message?.senderId,
                mediaPath: media.mediaPath ?? parsed.mediaPath,
                mediaContentType: media.contentType ?? parsed.contentType,
                mediaSizeBytes: media.sizeBytes ?? parsed.sizeBytes,
                mediaWidth: media.width ?? parsed.width,
                mediaHeight: media.height ?? parsed.height,
                mediaEncryptionIv: media.imageEncryptionIv ??
                    parsed.imageEncryptionIv,
                mediaKeyVersion: media.imageKeyVersion ??
                    parsed.imageKeyVersion,
                mediaUrl: media.imageUrl ?? parsed.imageUrl,
                mediaThumbnailUrl: media.thumbnailUrl ??
                    parsed.thumbnailUrl,
                mediaStrippedThumbnailUrl: media.strippedThumbnailUrl ??
                    parsed.strippedThumbnailUrl,
                mediaFileName: media.fileName ?? parsed.fileName,
                mediaIsImage: media.isImage ?? parsed.isImage,
                media: {
                    mediaPath: media.mediaPath ?? parsed.mediaPath,
                    contentType: media.contentType ?? parsed.contentType,
                    sizeBytes: media.sizeBytes ?? parsed.sizeBytes,
                    width: media.width ?? parsed.width,
                    height: media.height ?? parsed.height,
                    imageEncryptionIv: media.imageEncryptionIv ??
                        parsed.imageEncryptionIv,
                    imageKeyVersion: media.imageKeyVersion ??
                        parsed.imageKeyVersion,
                    imageUrl: media.imageUrl ?? parsed.imageUrl,
                    thumbnailUrl: media.thumbnailUrl ??
                        parsed.thumbnailUrl,
                    strippedThumbnailUrl: media.strippedThumbnailUrl ??
                        parsed.strippedThumbnailUrl,
                    fileName: media.fileName ?? parsed.fileName,
                    isImage: media.isImage ?? parsed.isImage,
                },
            });
            return;
        }
        if (type === 'friend_request') {
            this.notifyHandlers({
                type: 'friend_request',
                userId: parsed.userId,
                displayName: parsed.displayName,
                username: parsed.username,
                requestId: parsed.requestId,
                friendRequest: {
                    userId: parsed.userId,
                    displayName: parsed.displayName,
                    username: parsed.username,
                    requestId: parsed.requestId,
                },
            });
            return;
        }
        if (type === 'friend_removed') {
            this.notifyHandlers({
                type: 'friend_removed',
                userId: parsed.userId,
                friendRequest: parsed.friendRequest,
            });
            return;
        }
        if (type === 'friend_accept') {
            this.notifyHandlers({
                type: 'friend_accept',
                userId: parsed.userId,
                displayName: parsed.displayName,
                username: parsed.username,
                requestId: parsed.requestId,
                friendRequest: {
                    userId: parsed.userId,
                    displayName: parsed.displayName,
                    username: parsed.username,
                    requestId: parsed.requestId,
                },
            });
            return;
        }
        if (type === 'friend_reject') {
            this.notifyHandlers({
                type: 'friend_reject',
                userId: parsed.userId,
                requestId: parsed.requestId,
                friendRequest: {
                    userId: parsed.userId,
                    requestId: parsed.requestId,
                },
            });
            return;
        }
        if (type === 'chat_list_changed') {
            this.notifyHandlers({
                type: 'chat_list_changed',
                chatId: parsed.chatId,
            });
            return;
        }
        if (type === 'message_read') {
            this.notifyHandlers({
                type: 'message_read',
                chatId: parsed.chatId,
                lastReadMessageId: parsed.lastReadMessageId,
            });
            return;
        }
        if (type === 'message_edited') {
            const editedPayload = parsed.message ?? {
                chatId: parsed.chatId,
                messageId: parsed.messageId,
                content: parsed.content,
                entities: parsed.entities,
            };
            this.notifyHandlers({
                type: 'message_edited',
                message: editedPayload ? { ...editedPayload, edited: true } : undefined,
                chatId: editedPayload?.chatId ?? parsed.chatId,
                messageId: editedPayload?.messageId ?? parsed.messageId,
            });
            return;
        }
        if (type === 'message_deleted') {
            this.notifyHandlers({
                type: 'message_deleted',
                chatId: parsed.chatId,
                messageId: parsed.messageId,
            });
            return;
        }
        if (type === 'typing_state') {
            this.notifyHandlers({
                type: 'typing_state',
                chatId: parsed.chatId,
                userId: parsed.userId,
                typing: !!parsed.typing,
            });
            return;
        }
        if (type === 'presence_changed') {
            const parsedLastSeenAt = typeof parsed.lastSeenAt === 'string'
                ? parsed.lastSeenAt
                : typeof parsed.last_seen_at === 'string'
                    ? parsed.last_seen_at
                    : undefined;
            this.notifyHandlers({
                type: 'presence_changed',
                userId: parsed.userId,
                online: !!parsed.online,
                lastSeenAt: parsedLastSeenAt,
            });
            return;
        }
        if (type === 'error') {
            const message = typeof parsed.message === 'string' ? parsed.message : 'WebSocket server error';
            this.notifyError(new Error(message));
        }
    }
    sendHeartbeatPing() {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            return;
        }
        const nonce = `${Date.now()}-${++this.pingNonce}`;
        const payload = {
            type: 'ping',
            ts: Date.now(),
            nonce,
        };
        try {
            this.ws.send(JSON.stringify(payload));
            this.armPongTimeout(nonce);
        }
        catch (error) {
            console.warn('[ChatWS] failed to send heartbeat ping', error);
            try {
                this.ws.close(4002, 'ping_send_failed');
            }
            catch {
                // ignore close race
            }
        }
    }
    sendPong(source) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            return;
        }
        const payload = {
            type: 'pong',
            ts: Date.now(),
        };
        if (typeof source.nonce === 'string' && source.nonce.length > 0) {
            payload.nonce = source.nonce;
        }
        try {
            this.ws.send(JSON.stringify(payload));
        }
        catch {
            // ignore
        }
    }
    handlePong(_payload) {
        this.clearPongTimeout();
    }
    startHeartbeat() {
        this.stopHeartbeat();
        if (this.config.heartbeatInterval <= 0) {
            return;
        }
        this.heartbeatIntervalTimer = setInterval(() => {
            this.sendHeartbeatPing();
        }, this.config.heartbeatInterval);
        this.sendHeartbeatPing();
    }
    stopHeartbeat() {
        if (this.heartbeatIntervalTimer !== null) {
            clearInterval(this.heartbeatIntervalTimer);
            this.heartbeatIntervalTimer = null;
        }
        this.clearPongTimeout();
    }
    armPongTimeout(nonce) {
        this.clearPongTimeout();
        this.heartbeatPongTimeout = setTimeout(() => {
            if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
                return;
            }
            console.warn('[ChatWS] heartbeat timeout (no pong)', { nonce });
            try {
                this.ws.close(4003, 'pong_timeout');
            }
            catch {
                // ignore close race
            }
        }, CloudChatClient.HEARTBEAT_PONG_TIMEOUT_MS);
    }
    clearPongTimeout() {
        if (this.heartbeatPongTimeout !== null) {
            clearTimeout(this.heartbeatPongTimeout);
            this.heartbeatPongTimeout = null;
        }
    }
    scheduleReconnect(reason) {
        if (this.disconnectRequested) {
            return;
        }
        if (this.reconnectTimeout !== null) {
            return;
        }
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            console.warn('[ChatWS] offline, waiting for network before reconnect', { reason });
            return;
        }
        if (this.reconnectAttempt >= this.config.reconnectAttempts) {
            this.notifyError(new Error(`WebSocket reconnect limit reached (${this.config.reconnectAttempts})`));
            return;
        }
        this.reconnectAttempt += 1;
        const attempt = this.reconnectAttempt;
        const delayMs = this.computeReconnectDelayMs(attempt);
        console.warn('[ChatWS] scheduling reconnect', {
            attempt,
            maxAttempts: this.config.reconnectAttempts,
            delayMs,
            reason,
        });
        this.reconnectTimeout = setTimeout(() => {
            this.reconnectTimeout = null;
            if (this.disconnectRequested) {
                return;
            }
            this.connect().catch((error) => {
                this.notifyError(error instanceof Error ? error : new Error(this.toErrorMessage(error)));
            });
        }, delayMs);
    }
    computeReconnectDelayMs(attempt) {
        const exp = Math.min(CloudChatClient.RECONNECT_MAX_DELAY_MS, CloudChatClient.RECONNECT_BASE_DELAY_MS * 2 ** (attempt - 1));
        const jitterFactor = 0.85 + Math.random() * 0.3;
        return Math.round(exp * jitterFactor);
    }
    clearReconnectTimer() {
        if (this.reconnectTimeout !== null) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
    }
    async sendMessage(message) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            throw new Error('WebSocket not connected');
        }
        const protocolMessage = {
            type: 'new_message',
            chatId: message.chatId,
            content: message.content,
            messageType: message.messageType || 'text',
            replyToId: message.replyToId,
            images: Array.isArray(message.images) && message.images.length > 0
                ? message.images.map((image) => ({
                    image_path: image.imagePath,
                    image_encrypted: image.imageEncrypted,
                    image_encryption_iv: image.imageEncryptionIv,
                    image_key_version: image.imageKeyVersion,
                    width: image.width,
                    height: image.height,
                    file_name: image.fileName,
                    content_type: image.contentType,
                    size_bytes: image.sizeBytes,
                    is_image: image.isImage,
                }))
                : undefined,
        };
        this.ws.send(JSON.stringify(protocolMessage));
    }
    async setPresenceState(online) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            throw new Error('WebSocket not connected');
        }
        const protocolMessage = {
            type: 'presence_state',
            online: !!online,
            ts: Date.now(),
        };
        this.ws.send(JSON.stringify(protocolMessage));
    }
    onMessage(handler) {
        this.messageHandlers.add(handler);
        return () => {
            this.messageHandlers.delete(handler);
        };
    }
    onError(handler) {
        this.errorHandlers.add(handler);
        return () => {
            this.errorHandlers.delete(handler);
        };
    }
    onConnectionState(handler) {
        this.connectionStateHandlers.add(handler);
        return () => {
            this.connectionStateHandlers.delete(handler);
        };
    }
    isConnected() {
        return this.ws?.readyState === WebSocket.OPEN;
    }
    notifyHandlers(event) {
        this.messageHandlers.forEach((handler) => {
            try {
                handler(event);
            }
            catch (error) {
                console.error('[ChatWS] message handler error', error);
            }
        });
    }
    notifyError(error) {
        this.errorHandlers.forEach((handler) => {
            try {
                handler(error);
            }
            catch (handlerError) {
                console.error('[ChatWS] error handler failed', handlerError);
            }
        });
    }
    notifyConnectionState(state) {
        this.connectionStateHandlers.forEach((handler) => {
            try {
                handler(state);
            }
            catch (handlerError) {
                console.error('[ChatWS] connection-state handler failed', handlerError);
            }
        });
    }
    disconnect() {
        this.disconnectRequested = true;
        this.connectionGeneration += 1;
        this.notifyConnectionState('disconnected');
        this.clearReconnectTimer();
        this.stopHeartbeat();
        this.connectingPromise = null;
        if (this.ws) {
            try {
                this.ws.close(1000, 'client_disconnect');
            }
            catch {
                // ignore close race
            }
            this.ws = null;
        }
    }
    handleNetworkOnline = () => {
        if (this.disconnectRequested) {
            return;
        }
        if (this.ws?.readyState === WebSocket.OPEN || this.connectingPromise) {
            return;
        }
        this.reconnectAttempt = 0;
        this.clearReconnectTimer();
        this.connect().catch((error) => {
            this.notifyError(error instanceof Error ? error : new Error(this.toErrorMessage(error)));
        });
    };
    handleVisibilityChange = () => {
        if (document.visibilityState !== 'visible') {
            return;
        }
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.sendHeartbeatPing();
            return;
        }
        this.handleNetworkOnline();
    };
    toErrorMessage(error) {
        if (error instanceof Error) {
            return error.message;
        }
        return typeof error === 'string' ? error : 'unknown error';
    }
}
export const cloudChatClient = new CloudChatClient();
export const secureChatClient = cloudChatClient;
