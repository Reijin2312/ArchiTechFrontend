import { authStore } from '@/shared/store/auth'

export interface TextEntity {
  offset: number
  length: number
  type: 'BOLD' | 'ITALIC' | 'UNDERLINE' | 'STRIKETHROUGH' | 'SPOILER' | 'CODE' | 'PRE' | 'LINK'
  url?: string
  language?: string
}

export interface ChatMessage {
  chatId: number
  content: string
  messageType?: 'text' | 'image' | 'images' | 'file' | 'files' | 'voice' | 'circle'
  replyToId?: number
  imagePath?: string
  entities?: TextEntity[]
}

export interface ReceivedMessage {
  messageId: number
  chatId: number
  senderId: string
  content: string
  messageType: 'text' | 'image' | 'images' | 'file' | 'files' | 'voice' | 'circle'
  entities?: TextEntity[]
  imagePath?: string
  imageUrl?: string
  createdAt: string
  isRead: boolean
  edited?: boolean
  replyToId?: number
  replyToMessage?: ReceivedMessage
}

export interface WebSocketEvent {
  type:
    | 'new_message'
    | 'friend_request'
    | 'friend_accept'
    | 'friend_reject'
    | 'friend_removed'
    | 'chat_list_changed'
    | 'message_read'
    | 'message_edited'
    | 'message_deleted'
    | 'typing_state'
    | 'presence_changed'
  message?: ReceivedMessage
  chatId?: number
  messageId?: number
  lastReadMessageId?: number
  userId?: string
  typing?: boolean
  online?: boolean
  lastSeenAt?: string
  displayName?: string
  username?: string
  requestId?: number
  friendRequest?: any
}

export interface WebSocketConfig {
  wsUrl?: string
  reconnectAttempts?: number
  heartbeatInterval?: number
}

type AnyRecord = Record<string, unknown>

export class CloudChatClient {
  private ws: WebSocket | null = null
  private messageHandlers: Set<(msg: WebSocketEvent) => void> = new Set()
  private errorHandlers: Set<(error: Error) => void> = new Set()
  private config: Required<WebSocketConfig>

  private cachedDeviceToken: { token: string; expiresAt: number } | null = null

  private connectingPromise: Promise<void> | null = null
  private disconnectRequested = false
  private connectionGeneration = 0

  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null
  private reconnectAttempt = 0

  private heartbeatIntervalTimer: ReturnType<typeof setInterval> | null = null
  private heartbeatPongTimeout: ReturnType<typeof setTimeout> | null = null
  private pingNonce = 0

  private static readonly OPEN_TIMEOUT_MS = 10_000
  private static readonly HEARTBEAT_PONG_TIMEOUT_MS = 12_000
  private static readonly RECONNECT_BASE_DELAY_MS = 1_000
  private static readonly RECONNECT_MAX_DELAY_MS = 30_000

  constructor(config: WebSocketConfig = {}) {
    this.config = {
      wsUrl: config.wsUrl || this.getWebSocketUrl(),
      reconnectAttempts: config.reconnectAttempts ?? 50,
      heartbeatInterval: config.heartbeatInterval ?? 25_000,
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleNetworkOnline)
      document.addEventListener('visibilitychange', this.handleVisibilityChange)
    }
  }

  private getWebSocketUrl(): string {
    const wsUrl = (import.meta as any)?.env?.VITE_CHAT_WS_URL as string
    if (wsUrl) {
      return wsUrl
    }

    const origin = window.location.origin
    const url = new URL(origin)
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${url.protocol}//${url.host}/ws/chat`
  }

  async connect(): Promise<void> {
    this.disconnectRequested = false

    if (this.ws?.readyState === WebSocket.OPEN) {
      return
    }

    if (this.connectingPromise) {
      return this.connectingPromise
    }

    this.clearReconnectTimer()

    const generation = this.connectionGeneration
    const pending = this.openSecureWebSocket(generation)
      .catch((error) => {
        if (!this.disconnectRequested && generation === this.connectionGeneration) {
          this.scheduleReconnect(`connect_failed: ${this.toErrorMessage(error)}`)
        }
        throw error
      })
      .finally(() => {
        if (this.connectingPromise === pending) {
          this.connectingPromise = null
        }
      })

    this.connectingPromise = pending
    return pending
  }

  private async getTicket(): Promise<string> {
    const apiBase = ((import.meta as any)?.env?.VITE_API_BASE as string) || window.location.origin

    const state = authStore.getState()
    const { accessToken, sessionId, deviceId } = state

    if (!accessToken || !sessionId || !deviceId) {
      const missing: string[] = []
      if (!accessToken) missing.push('accessToken')
      if (!sessionId) missing.push('sessionId')
      if (!deviceId) missing.push('deviceId')
      throw new Error(`Missing auth/session credentials for chat ticket (${missing.join(', ')}). Please re-login.`)
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
    })

    if (!response.ok) {
      throw new Error(`Failed to get ticket: ${response.status}`)
    }

    const data = await response.json()
    if (!data?.ticket) {
      throw new Error('Ticket response does not include ticket')
    }

    return data.ticket
  }

  private async getDeviceToken(): Promise<string> {
    const apiBase = ((import.meta as any)?.env?.VITE_API_BASE as string) || window.location.origin
    const state = authStore.getState()
    const { accessToken, sessionId, deviceId } = state

    if (!accessToken || !sessionId || !deviceId) {
      throw new Error('Missing credentials for device token. Please re-login.')
    }

    const now = Date.now()
    if (this.cachedDeviceToken && this.cachedDeviceToken.expiresAt - now > 60_000) {
      return this.cachedDeviceToken.token
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
    })

    if (!response.ok) {
      throw new Error(`Failed to get device token: ${response.status}`)
    }

    const { deviceToken, expiresIn } = await response.json()
    if (!deviceToken) {
      throw new Error('Device token missing')
    }

    const ttlSec = typeof expiresIn === 'number' && expiresIn > 0 ? expiresIn : 300
    this.cachedDeviceToken = {
      token: deviceToken,
      expiresAt: now + ttlSec * 1000,
    }

    return deviceToken
  }

  private async openSecureWebSocket(generation: number): Promise<void> {
    const ticket = await this.getTicket()
    const deviceToken = await this.getDeviceToken()

    if (generation !== this.connectionGeneration || this.disconnectRequested) {
      return
    }

    const url = `${this.config.wsUrl}?ticket=${encodeURIComponent(ticket)}&deviceToken=${encodeURIComponent(deviceToken)}`

    await new Promise<void>((resolve, reject) => {
      let opened = false
      let settled = false

      const settleResolve = () => {
        if (settled) return
        settled = true
        resolve()
      }

      const settleReject = (error: Error) => {
        if (settled) return
        settled = true
        reject(error)
      }

      let socket: WebSocket
      try {
        socket = new WebSocket(url)
      } catch (error) {
        settleReject(new Error(`Failed to create WebSocket: ${this.toErrorMessage(error)}`))
        return
      }

      this.ws = socket

      const openTimeout = setTimeout(() => {
        if (socket.readyState === WebSocket.CONNECTING) {
          try {
            socket.close(4000, 'open_timeout')
          } catch {
            // ignore close race
          }
          settleReject(new Error('WebSocket open timeout'))
        }
      }, CloudChatClient.OPEN_TIMEOUT_MS)

      socket.onopen = () => {
        clearTimeout(openTimeout)

        if (generation !== this.connectionGeneration || this.disconnectRequested) {
          try {
            socket.close(1000, 'stale_connect')
          } catch {
            // ignore close race
          }
          settleResolve()
          return
        }

        opened = true
        this.reconnectAttempt = 0
        this.startHeartbeat()
        console.log('[ChatWS] connected')
        settleResolve()
      }

      socket.onmessage = (event) => {
        if (typeof event.data !== 'string') {
          return
        }
        this.handleIncomingMessage(event.data)
      }

      socket.onerror = () => {
        if (!opened) {
          settleReject(new Error('WebSocket transport error during connect'))
        }
      }

      socket.onclose = (event) => {
        clearTimeout(openTimeout)

        if (this.ws === socket) {
          this.ws = null
        }

        this.stopHeartbeat()

        if (generation !== this.connectionGeneration || this.disconnectRequested) {
          if (!opened) {
            settleResolve()
          }
          return
        }

        const closeReason = `code=${event.code}, reason=${event.reason || 'n/a'}`
        console.warn('[ChatWS] disconnected', closeReason)

        if (!opened) {
          settleReject(new Error(`WebSocket closed before open (${closeReason})`))
          return
        }

        this.scheduleReconnect(`socket_closed: ${closeReason}`)
      }
    })
  }

  private handleIncomingMessage(raw: string): void {
    let parsed: AnyRecord
    try {
      parsed = JSON.parse(raw) as AnyRecord
    } catch (error) {
      console.error('[ChatWS] failed to parse message', error)
      return
    }

    const type = typeof parsed.type === 'string' ? parsed.type : ''

    if (type === 'pong') {
      this.handlePong(parsed)
      return
    }

    if (type === 'ping') {
      this.sendPong(parsed)
      return
    }

    if (type === 'new_message' && parsed.message) {
      this.notifyHandlers({
        type: 'new_message',
        message: parsed.message as ReceivedMessage,
        chatId: (parsed.message as AnyRecord).chatId as number | undefined,
      })
      return
    }

    if (type === 'friend_request') {
      this.notifyHandlers({
        type: 'friend_request',
        userId: parsed.userId as string | undefined,
        displayName: parsed.displayName as string | undefined,
        username: parsed.username as string | undefined,
        requestId: parsed.requestId as number | undefined,
        friendRequest: {
          userId: parsed.userId,
          displayName: parsed.displayName,
          username: parsed.username,
          requestId: parsed.requestId,
        },
      })
      return
    }

    if (type === 'friend_removed') {
      this.notifyHandlers({
        type: 'friend_removed',
        userId: parsed.userId as string | undefined,
        friendRequest: parsed.friendRequest,
      })
      return
    }

    if (type === 'friend_accept') {
      this.notifyHandlers({
        type: 'friend_accept',
        userId: parsed.userId as string | undefined,
        displayName: parsed.displayName as string | undefined,
        username: parsed.username as string | undefined,
        requestId: parsed.requestId as number | undefined,
        friendRequest: {
          userId: parsed.userId,
          displayName: parsed.displayName,
          username: parsed.username,
          requestId: parsed.requestId,
        },
      })
      return
    }

    if (type === 'friend_reject') {
      this.notifyHandlers({
        type: 'friend_reject',
        userId: parsed.userId as string | undefined,
        requestId: parsed.requestId as number | undefined,
        friendRequest: {
          userId: parsed.userId,
          requestId: parsed.requestId,
        },
      })
      return
    }

    if (type === 'chat_list_changed') {
      this.notifyHandlers({
        type: 'chat_list_changed',
        chatId: parsed.chatId as number | undefined,
      })
      return
    }

    if (type === 'message_read') {
      this.notifyHandlers({
        type: 'message_read',
        chatId: parsed.chatId as number | undefined,
        lastReadMessageId: parsed.lastReadMessageId as number | undefined,
      })
      return
    }

    if (type === 'message_edited') {
      const editedPayload =
        (parsed.message as AnyRecord | undefined) ?? {
          chatId: parsed.chatId,
          messageId: parsed.messageId,
          content: parsed.content,
          entities: parsed.entities,
        }

      this.notifyHandlers({
        type: 'message_edited',
        message: editedPayload ? ({ ...editedPayload, edited: true } as unknown as ReceivedMessage) : undefined,
        chatId: (editedPayload?.chatId as number | undefined) ?? (parsed.chatId as number | undefined),
        messageId: (editedPayload?.messageId as number | undefined) ?? (parsed.messageId as number | undefined),
      })
      return
    }

    if (type === 'message_deleted') {
      this.notifyHandlers({
        type: 'message_deleted',
        chatId: parsed.chatId as number | undefined,
        messageId: parsed.messageId as number | undefined,
      })
      return
    }

    if (type === 'typing_state') {
      this.notifyHandlers({
        type: 'typing_state',
        chatId: parsed.chatId as number | undefined,
        userId: parsed.userId as string | undefined,
        typing: !!parsed.typing,
      })
      return
    }

    if (type === 'presence_changed') {
      const parsedLastSeenAt =
        typeof parsed.lastSeenAt === 'string'
          ? parsed.lastSeenAt
          : typeof parsed.last_seen_at === 'string'
            ? parsed.last_seen_at
            : undefined
      this.notifyHandlers({
        type: 'presence_changed',
        userId: parsed.userId as string | undefined,
        online: !!parsed.online,
        lastSeenAt: parsedLastSeenAt,
      })
      return
    }

    if (type === 'error') {
      const message = typeof parsed.message === 'string' ? parsed.message : 'WebSocket server error'
      this.notifyError(new Error(message))
    }
  }

  private sendHeartbeatPing(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return
    }

    const nonce = `${Date.now()}-${++this.pingNonce}`
    const payload = {
      type: 'ping',
      ts: Date.now(),
      nonce,
    }

    try {
      this.ws.send(JSON.stringify(payload))
      this.armPongTimeout(nonce)
    } catch (error) {
      console.warn('[ChatWS] failed to send heartbeat ping', error)
      try {
        this.ws.close(4002, 'ping_send_failed')
      } catch {
        // ignore close race
      }
    }
  }

  private sendPong(source: AnyRecord): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return
    }

    const payload: AnyRecord = {
      type: 'pong',
      ts: Date.now(),
    }

    if (typeof source.nonce === 'string' && source.nonce.length > 0) {
      payload.nonce = source.nonce
    }

    try {
      this.ws.send(JSON.stringify(payload))
    } catch {
      // ignore
    }
  }

  private handlePong(_payload: AnyRecord): void {
    this.clearPongTimeout()
  }

  private startHeartbeat(): void {
    this.stopHeartbeat()

    if (this.config.heartbeatInterval <= 0) {
      return
    }

    this.heartbeatIntervalTimer = setInterval(() => {
      this.sendHeartbeatPing()
    }, this.config.heartbeatInterval)

    this.sendHeartbeatPing()
  }

  private stopHeartbeat(): void {
    if (this.heartbeatIntervalTimer !== null) {
      clearInterval(this.heartbeatIntervalTimer)
      this.heartbeatIntervalTimer = null
    }
    this.clearPongTimeout()
  }

  private armPongTimeout(nonce: string): void {
    this.clearPongTimeout()

    this.heartbeatPongTimeout = setTimeout(() => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        return
      }

      console.warn('[ChatWS] heartbeat timeout (no pong)', { nonce })
      try {
        this.ws.close(4003, 'pong_timeout')
      } catch {
        // ignore close race
      }
    }, CloudChatClient.HEARTBEAT_PONG_TIMEOUT_MS)
  }

  private clearPongTimeout(): void {
    if (this.heartbeatPongTimeout !== null) {
      clearTimeout(this.heartbeatPongTimeout)
      this.heartbeatPongTimeout = null
    }
  }

  private scheduleReconnect(reason: string): void {
    if (this.disconnectRequested) {
      return
    }

    if (this.reconnectTimeout !== null) {
      return
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      console.warn('[ChatWS] offline, waiting for network before reconnect', { reason })
      return
    }

    if (this.reconnectAttempt >= this.config.reconnectAttempts) {
      this.notifyError(
        new Error(
          `WebSocket reconnect limit reached (${this.config.reconnectAttempts})`
        )
      )
      return
    }

    this.reconnectAttempt += 1
    const attempt = this.reconnectAttempt
    const delayMs = this.computeReconnectDelayMs(attempt)

    console.warn('[ChatWS] scheduling reconnect', {
      attempt,
      maxAttempts: this.config.reconnectAttempts,
      delayMs,
      reason,
    })

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null

      if (this.disconnectRequested) {
        return
      }

      this.connect().catch((error) => {
        this.notifyError(error instanceof Error ? error : new Error(this.toErrorMessage(error)))
      })
    }, delayMs)
  }

  private computeReconnectDelayMs(attempt: number): number {
    const exp = Math.min(
      CloudChatClient.RECONNECT_MAX_DELAY_MS,
      CloudChatClient.RECONNECT_BASE_DELAY_MS * 2 ** (attempt - 1)
    )

    const jitterFactor = 0.85 + Math.random() * 0.3
    return Math.round(exp * jitterFactor)
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimeout !== null) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
  }

  async sendMessage(message: ChatMessage): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected')
    }

    const protocolMessage = {
      type: 'new_message',
      chatId: message.chatId,
      content: message.content,
      messageType: message.messageType || 'text',
      replyToId: message.replyToId,
      imagePath: message.imagePath,
    }

    this.ws.send(JSON.stringify(protocolMessage))
  }

  async setPresenceState(online: boolean): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected')
    }

    const protocolMessage = {
      type: 'presence_state',
      online: !!online,
      ts: Date.now(),
    }

    this.ws.send(JSON.stringify(protocolMessage))
  }

  onMessage(handler: (event: WebSocketEvent) => void): () => void {
    this.messageHandlers.add(handler)
    return () => {
      this.messageHandlers.delete(handler)
    }
  }

  onError(handler: (error: Error) => void): () => void {
    this.errorHandlers.add(handler)
    return () => {
      this.errorHandlers.delete(handler)
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  private notifyHandlers(event: WebSocketEvent): void {
    this.messageHandlers.forEach((handler) => {
      try {
        handler(event)
      } catch (error) {
        console.error('[ChatWS] message handler error', error)
      }
    })
  }

  private notifyError(error: Error): void {
    this.errorHandlers.forEach((handler) => {
      try {
        handler(error)
      } catch (handlerError) {
        console.error('[ChatWS] error handler failed', handlerError)
      }
    })
  }

  disconnect(): void {
    this.disconnectRequested = true
    this.connectionGeneration += 1

    this.clearReconnectTimer()
    this.stopHeartbeat()

    this.connectingPromise = null

    if (this.ws) {
      try {
        this.ws.close(1000, 'client_disconnect')
      } catch {
        // ignore close race
      }
      this.ws = null
    }
  }

  private handleNetworkOnline = () => {
    if (this.disconnectRequested) {
      return
    }

    if (this.ws?.readyState === WebSocket.OPEN || this.connectingPromise) {
      return
    }

    this.reconnectAttempt = 0
    this.clearReconnectTimer()

    this.connect().catch((error) => {
      this.notifyError(error instanceof Error ? error : new Error(this.toErrorMessage(error)))
    })
  }

  private handleVisibilityChange = () => {
    if (document.visibilityState !== 'visible') {
      return
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.sendHeartbeatPing()
      return
    }

    this.handleNetworkOnline()
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message
    }
    return typeof error === 'string' ? error : 'unknown error'
  }
}

export const cloudChatClient = new CloudChatClient()
export const secureChatClient = cloudChatClient
