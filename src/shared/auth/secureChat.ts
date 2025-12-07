import { authStore } from '@/shared/store/auth'

/**
 * ☁️ CLOUD CHAT MODEL (Server-side encryption)
 * 
 * Архитектура:
 * - Клиент отправляет plaintext над TLS (аутентифицирован через session key)
 * - Сервер: plaintext → AES-256-GCM (KMS chat-key) → store in DB encrypted
 * - Сервер: DB (encrypted) → decrypt → send plaintext over TLS
 * - История синхронизируется между устройствами автоматически
 * 
 * ✅ Преимущества:
 * - Мгновенная синхронизация истории между устройствами
 * - Поддержка мультивхода
 * - Сервер может искать, индексировать, создавать резервные копии
 * - Упрощенная модель безопасности (trust server infrastructure)
 */

// ☁️ CLOUD MODEL: Session management handled server-side
// useSessionKeyStore removed - not needed for cloud encryption model

export interface ChatMessage {
  chatId: number
  content: string // Plaintext - отправляем как есть над TLS
  messageType?: 'text' | 'image'
  replyToId?: number
  imagePath?: string
}

export interface ReceivedMessage {
  messageId: number
  chatId: number
  senderId: string
  content: string // Plaintext от сервера
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
  type: 'new_message' | 'friend_request' | 'friend_accept' | 'friend_reject' | 'message_read' | 'message_edited' | 'message_deleted'
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

/**
 * ☁️ Клиент для облачного чата
 * 
 * Использование:
 * ```typescript
 * const chatClient = new CloudChatClient()
 * await chatClient.connect()
 * 
 * // Отправка plaintext
 * await chatClient.sendMessage({
 *   chatId: 1,
 *   content: "Hello, world!"
 * })
 * 
 * // Получение plaintext
 * chatClient.onMessage((msg) => {
 *   console.log(msg.message?.content) // Already decrypted on server
 * })
 * ```
 */
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
    
    // 🔐 Restore session credentials from storage on page reload
    this.restoreCredentialsFromStorage()
  }
  
  /**
   * 🔐 Session credentials now restored from refresh endpoint, not storage.
   * This prevents XSS attacks from stealing credentials.
   */
  private restoreCredentialsFromStorage(): void {
    // 🔐 DEPRECATED: Credentials now come from refresh endpoint on bootstrap
    // authStore will be populated by bootstrap.ts
    console.log('✅ Session credentials will be restored from refresh endpoint');
  }
  
  private getWebSocketUrl(): string {
    const wsUrl = (import.meta as any)?.env?.VITE_CHAT_WS_URL as string
    
    if (wsUrl) return wsUrl
    
    // Default: same origin, Vite proxies /ws to backend ws port
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
  
  /**
   * Получить ticket для подключения
   */
  private async getTicket(): Promise<string> {
    const apiBase = (import.meta as any)?.env?.VITE_API_BASE as string || window.location.origin
    
    // ☁️ CLOUD MODEL: Headers managed server-side via session middleware
    const state = authStore.getState()
    const { accessToken, sessionId: storeSessionId, deviceId: storeDeviceId } = state
    
    // Try to get from authStore first, then from storage
    const sessionId = storeSessionId 
      || sessionStorage.getItem('__session_id__') 
      || localStorage.getItem('__session_id__')
    const deviceId = storeDeviceId 
      || sessionStorage.getItem('__server_device_id__') 
      || localStorage.getItem('__server_device_id__')

    if (!accessToken || !sessionId || !deviceId) {
      const missing = [];
      if (!accessToken) missing.push('accessToken');
      if (!sessionId) missing.push('sessionId');
      if (!deviceId) missing.push('deviceId');
      throw new Error(`Missing auth/session credentials for chat ticket (${missing.join(', ')}). Please re-login.`)
    }

    // Debug log to trace headers sent for ticket request (no secrets)
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

  /**
   * Получить deviceToken (обязателен для WS, сервер проверяет device binding)
   */
  private async getDeviceToken(): Promise<string> {
    const apiBase = (import.meta as any)?.env?.VITE_API_BASE as string || window.location.origin
    const state = authStore.getState()
    const { accessToken, sessionId: storeSessionId, deviceId: storeDeviceId } = state
    
    // Try to get from authStore first, then from storage
    const sessionId = storeSessionId 
      || sessionStorage.getItem('__session_id__') 
      || localStorage.getItem('__session_id__')
    const deviceId = storeDeviceId 
      || sessionStorage.getItem('__server_device_id__') 
      || localStorage.getItem('__server_device_id__')

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
  
  /**
   * ☁️ Отправить сообщение (plaintext над TLS)
   * 
   * Сервер будет:
   * 1. Получить plaintext от клиента
   * 2. Зашифровать AES-256-GCM (KMS chat-key)
   * 3. Сохранить encrypted в БД
   * 4. Отправить plaintext всем участникам
   */
  async sendMessage(message: ChatMessage): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected')
    }
    
    // ☁️ Отправляем plaintext - сервер сам зашифрует
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
  
  /**
   * ☁️ Обработка входящего сообщения
   * 
   * Сервер уже расшифровал, получаем plaintext
   */
  private async handleMessage(data: string): Promise<void> {
    try {
      const parsed = JSON.parse(data)
      
      if (parsed.type === 'new_message' && parsed.message) {
        // Plaintext уже на клиенте
        this.notifyHandlers({
          type: 'new_message',
          message: parsed.message,
          chatId: parsed.message.chatId
        })
      } else if (parsed.type === 'friend_request') {
        this.notifyHandlers({
          type: 'friend_request',
          userId: parsed.userId,
          displayName: parsed.displayName,
          username: parsed.username,
          requestId: parsed.requestId
        })
      } else if (parsed.type === 'friend_accept') {
        this.notifyHandlers({
          type: 'friend_accept',
          userId: parsed.userId,
          displayName: parsed.displayName,
          username: parsed.username
        })
      } else if (parsed.type === 'friend_reject') {
        this.notifyHandlers({
          type: 'friend_reject',
          userId: parsed.userId,
          requestId: parsed.requestId
        })
      } else if (parsed.type === 'message_read') {
        this.notifyHandlers({
          type: 'message_read',
          chatId: parsed.chatId,
          lastReadMessageId: parsed.lastReadMessageId
        })
      } else if (parsed.type === 'message_edited' && parsed.message) {
        this.notifyHandlers({
          type: 'message_edited',
          message: { ...parsed.message, edited: true },
          chatId: parsed.message.chatId,
          messageId: parsed.message.messageId
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

/**
 * ☁️ Singleton instance
 */
export const cloudChatClient = new CloudChatClient()

// Экспортируем для обратной совместимости
export const secureChatClient = cloudChatClient
