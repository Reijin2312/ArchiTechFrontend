import { authStore } from '@/shared/store/auth'



export interface ChatMessage {
  chatId: number
  content: string
  messageType?: 'text' | 'image'
  replyToId?: number
  imagePath?: string
}

export interface ReceivedMessage {
  messageId: number
  chatId: number
  senderId: string
  content: string
  messageType: 'text' | 'image'
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
    | 'message_read'
    | 'message_edited'
    | 'message_deleted'
  message?: ReceivedMessage
  chatId?: number
  messageId?: number
  lastReadMessageId?: number
  userId?: string
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

export class CloudChatClient {
  private ws: WebSocket | null = null
  private messageHandlers: Set<(msg: WebSocketEvent) => void> = new Set()
  private errorHandlers: Set<(error: Error) => void> = new Set()
  private config: Required<WebSocketConfig>
  private cachedDeviceToken: { token: string; expiresAt: number } | null = null
  
  constructor(config: WebSocketConfig = {}) {
    this.config = {
      wsUrl: config.wsUrl || this.getWebSocketUrl(),
      reconnectAttempts: config.reconnectAttempts || 5,
      heartbeatInterval: config.heartbeatInterval || 30000
    }
    
    this.restoreCredentialsFromStorage()
  }
  
  private restoreCredentialsFromStorage(): void {
    console.log('✅ Session credentials will be restored from refresh endpoint');
  }
  
  private getWebSocketUrl(): string {
    const wsUrl = (import.meta as any)?.env?.VITE_CHAT_WS_URL as string
    
    if (wsUrl) return wsUrl
    
    const origin = window.location.origin
    const url = new URL(origin)
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    
    return `${url.protocol}//${url.host}/ws/chat`
  }
  
  /**
   * Подключение к серверу
   */
  async connect(): Promise<void> {
    const ticket = await this.getTicket()
    const deviceToken = await this.getDeviceToken()
    const url = `${this.config.wsUrl}?ticket=${encodeURIComponent(ticket)}&deviceToken=${encodeURIComponent(deviceToken)}`
    console.log('🌐 Opening chat WebSocket', { url })
    
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url)
        
        this.ws.onopen = () => {
          console.log('☁️ Cloud chat WebSocket connected')
          resolve()
        }
        
        this.ws.onmessage = (event) => {
          this.handleMessage(event.data).catch(err => {
            console.error('❌ Message handling error:', err)
            this.errorHandlers.forEach(handler => handler(err))
          })
        }
        
        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error)
          reject(new Error('WebSocket connection failed'))
        }
        
        this.ws.onclose = (event) => {
          console.log('🔌 Cloud chat WebSocket disconnected', { code: event.code, reason: event.reason })
          this.ws = null
        }
        
      } catch (error) {
        reject(error)
      }
    })
  }
  
  private async getTicket(): Promise<string> {
    const apiBase = (import.meta as any)?.env?.VITE_API_BASE as string || window.location.origin
    
    const state = authStore.getState()
    const { accessToken, sessionId, deviceId } = state

    if (!accessToken || !sessionId || !deviceId) {
      const missing = [];
      if (!accessToken) missing.push('accessToken');
      if (!sessionId) missing.push('sessionId');
      if (!deviceId) missing.push('deviceId');
      throw new Error(`Missing auth/session credentials for chat ticket (${missing.join(', ')}). Please re-login.`)
    }

    console.log('[ChatTicket] sending ticket request', {
      sessionId: sessionId.slice(0, 8),
      deviceId: deviceId.slice(0, 8),
      accessTokenPresent: !!accessToken
    });

    const response = await fetch(`${apiBase}/api/v1/chat/ws-ticket`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'X-Session-ID': sessionId,
        'X-Device-ID': deviceId
      }
    })
    
    if (!response.ok) {
      throw new Error(`Failed to get ticket: ${response.status}`)
    }
    
    const data = await response.json()
    return data.ticket
  }

  private async getDeviceToken(): Promise<string> {
    const apiBase = (import.meta as any)?.env?.VITE_API_BASE as string || window.location.origin
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
        'X-Device-ID': deviceId
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to get device token: ${response.status}`)
    }

    const { deviceToken, expiresIn } = await response.json()
    if (!deviceToken) {
      throw new Error('Device token missing')
    }

    this.cachedDeviceToken = { token: deviceToken, expiresAt: now + expiresIn * 1000 }
    return deviceToken
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
      imagePath: message.imagePath
    }
    
    this.ws.send(JSON.stringify(protocolMessage))
    
    console.log('☁️ Message sent (plaintext over TLS):', {
      chatId: message.chatId,
      contentLength: message.content.length
    })
  }
  
  private async handleMessage(data: string): Promise<void> {
    try {
      const parsed = JSON.parse(data)
      
      if (parsed.type === 'new_message' && parsed.message) {
        this.notifyHandlers({
          type: 'new_message',
          message: parsed.message,
          chatId: parsed.message.chatId
        })
      } else if (parsed.type === 'friend_request') {
        const payload = {
          type: 'friend_request' as const,
          userId: parsed.userId,
          displayName: parsed.displayName,
          username: parsed.username,
          requestId: parsed.requestId,
          friendRequest: {
            userId: parsed.userId,
            displayName: parsed.displayName,
            username: parsed.username,
            requestId: parsed.requestId
          }
        }
        this.notifyHandlers(payload)
      } else if (parsed.type === 'friend_removed') {
        const payload = {
          type: 'friend_removed' as const,
          userId: parsed.userId,
          friendRequest: parsed.friendRequest
        }
        this.notifyHandlers(payload)
      } else if (parsed.type === 'friend_accept') {
        const payload = {
          type: 'friend_accept' as const,
          userId: parsed.userId,
          displayName: parsed.displayName,
          username: parsed.username,
          requestId: parsed.requestId,
          friendRequest: {
            userId: parsed.userId,
            displayName: parsed.displayName,
            username: parsed.username,
            requestId: parsed.requestId
          }
        }
        this.notifyHandlers(payload)
      } else if (parsed.type === 'friend_reject') {
        const payload = {
          type: 'friend_reject' as const,
          userId: parsed.userId,
          requestId: parsed.requestId,
          friendRequest: {
            userId: parsed.userId,
            requestId: parsed.requestId
          }
        }
        this.notifyHandlers(payload)
      } else if (parsed.type === 'message_read') {
        this.notifyHandlers({
          type: 'message_read',
          chatId: parsed.chatId,
          lastReadMessageId: parsed.lastReadMessageId
        })
      } else if (parsed.type === 'message_edited') {
        const editedPayload: any = parsed.message || {
          chatId: parsed.chatId,
          messageId: parsed.messageId,
          content: parsed.content
        }

        this.notifyHandlers({
          type: 'message_edited',
          message: editedPayload ? { ...editedPayload, edited: true } : undefined,
          chatId: editedPayload?.chatId ?? parsed.chatId,
          messageId: editedPayload?.messageId ?? parsed.messageId
        })
      } else if (parsed.type === 'message_deleted') {
        this.notifyHandlers({
          type: 'message_deleted',
          chatId: parsed.chatId,
          messageId: parsed.messageId
        })
      } else if (parsed.type === 'error') {
        console.error('Server error:', parsed.message)
        this.errorHandlers.forEach(h => h(new Error(parsed.message)))
      }
      
    } catch (err) {
      console.error('Failed to parse message:', err)
    }
  }
  
  /**
   * Подписаться на входящие сообщения
   */
  onMessage(handler: (event: WebSocketEvent) => void): () => void {
    this.messageHandlers.add(handler)
    return () => this.messageHandlers.delete(handler)
  }
  
  /**
   * Подписаться на ошибки
   */
  onError(handler: (error: Error) => void): () => void {
    this.errorHandlers.add(handler)
    return () => this.errorHandlers.delete(handler)
  }
  
  /**
   * Уведомить всех обработчиков
   */
  private notifyHandlers(event: WebSocketEvent): void {
    this.messageHandlers.forEach(handler => {
      try {
        handler(event)
      } catch (err) {
        console.error('Handler error:', err)
      }
    })
  }
  
  /**
   * Отключиться
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.messageHandlers.clear()
    this.errorHandlers.clear()
  }
}

export const cloudChatClient = new CloudChatClient()

// Экспортируем для обратной совместимости
export const secureChatClient = cloudChatClient
