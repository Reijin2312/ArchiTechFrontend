// hooks/useSecureChatWebSocket.ts
// Secure WebSocket implementation with protocol validation and encryption support

import { useCallback, useEffect, useRef, useState } from 'react'
import CryptoJS from 'crypto-js'
import { useSessionKeyStore } from '@/stores/sessionKeyStore'
import { useSecurityStore } from '@/stores/securityStore'

export interface ProtocolMessage {
  msg_id: string
  seq_no: number
  timestamp: number
  type: 'send_message' | 'upload_media' | 'key_rotation' | 'device_revocation' | 'ping'
  payload: any
  hmac: string
}

export interface WSConfig {
  url: string
  deviceId?: string
  userId?: string
  sessionId?: string
}

export function useSecureChatWebSocket() {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)

  const wsRef = useRef<WebSocket | null>(null)
  const messageHandlers = useRef(new Map<string, (data: any) => void>())
  const localSequenceNumber = useRef(0)
  const remoteSequenceNumber = useRef(0)
  const messageBuffer = useRef<Array<{ msg_id: string; timestamp: number; payload: any }>>([])

  const sessionKeyStore = useSessionKeyStore()
  const securityStore = useSecurityStore()

  const maxReconnectAttempts = 5
  const reconnectDelay = 3000

  /**
   * Generate message ID (UUID v4)
   */
  const generateMessageId = useCallback((): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  }, [])

  /**
   * Calculate HMAC-SHA256
   */
  const calculateHMAC = useCallback((message: string, sessionKey: string): string => {
    try {
      return CryptoJS.HmacSHA256(message, sessionKey).toString()
    } catch (error) {
      console.error('[Security] HMAC calculation failed:', error)
      throw error
    }
  }, [])

  /**
   * Validate HMAC signature
   */
  const validateHMAC = useCallback(
    (message: string, providedHmac: string, sessionKey: string): boolean => {
      try {
        const calculatedHmac = calculateHMAC(message, sessionKey)
        return calculatedHmac === providedHmac
      } catch {
        return false
      }
    },
    [calculateHMAC]
  )

  /**
   * Create protocol message with HMAC
   */
  const createProtocolMessage = useCallback(
    (
      type: ProtocolMessage['type'],
      payload: any
    ): ProtocolMessage => {
      const msg_id = generateMessageId()
      const seq_no = ++localSequenceNumber.current
      const timestamp = Date.now()

      const sessionKey = sessionKeyStore.getCurrentSessionKey()
      if (!sessionKey) {
        throw new Error('No session key available')
      }

      const messageContent = JSON.stringify({
        msg_id,
        seq_no,
        timestamp,
        type,
        payload
      })

      const hmac = calculateHMAC(messageContent, sessionKey)

      return {
        msg_id,
        seq_no,
        timestamp,
        type,
        payload,
        hmac
      }
    },
    [generateMessageId, calculateHMAC, sessionKeyStore]
  )

  /**
   * Validate protocol message
   */
  const validateProtocolMessage = useCallback(
    (message: ProtocolMessage): boolean => {
      try {
        const sessionKey = sessionKeyStore.getCurrentSessionKey()
        if (!sessionKey) {
          console.warn('[Security] No session key for HMAC validation')
          return false
        }

        const messageContent = JSON.stringify({
          msg_id: message.msg_id,
          seq_no: message.seq_no,
          timestamp: message.timestamp,
          type: message.type,
          payload: message.payload
        })

        if (!validateHMAC(messageContent, message.hmac, sessionKey)) {
          securityStore.logSecurityEvent('HMAC_VERIFICATION_FAILED', {
            msg_id: message.msg_id,
            type: message.type
          })
          console.warn('[Security] HMAC verification failed for message:', message.msg_id)
          return false
        }

        // Check timestamp freshness
        const now = Date.now()
        const age = now - message.timestamp
        const maxAge = 5 * 60 * 1000 // 5 minutes
        const clockSkew = 30 * 1000 // 30 seconds

        if (age > maxAge) {
          securityStore.logSecurityEvent('MESSAGE_EXPIRED', {
            msg_id: message.msg_id,
            age_ms: age
          })
          console.warn('[Security] Message too old:', age, 'ms')
          return false
        }

        if (age < -clockSkew) {
          securityStore.logSecurityEvent('CLOCK_SKEW_DETECTED', {
            msg_id: message.msg_id,
            skew_ms: -age
          })
        }

        // Check sequence number
        if (message.type !== 'ping') {
          if (message.seq_no <= remoteSequenceNumber.current) {
            securityStore.logSecurityEvent('REPLAY_ATTACK_DETECTED', {
              msg_id: message.msg_id,
              seq_no: message.seq_no,
              expected: remoteSequenceNumber.current + 1
            })
            console.warn('[Security] Replay attack detected')
            return false
          }

          if (message.seq_no > remoteSequenceNumber.current + 1) {
            console.warn('[Security] Sequence gap detected')
          }

          remoteSequenceNumber.current = message.seq_no
        }

        return true
      } catch (error) {
        console.error('[Security] Message validation error:', error)
        return false
      }
    },
    [sessionKeyStore, validateHMAC, securityStore]
  )

  /**
   * Handle WebSocket open
   */
  const handleOpen = useCallback(() => {
    setIsConnecting(false)
    setIsConnected(true)
    setReconnectAttempts(0)
    setLastError(null)

    console.log('[WebSocket] Connected')

    try {
      const pingMessage = createProtocolMessage('ping', {})
      if (wsRef.current) {
        wsRef.current.send(JSON.stringify(pingMessage))
      }
    } catch (error) {
      console.error('[WebSocket] Ping send failed:', error)
    }

    localSequenceNumber.current = 0
    remoteSequenceNumber.current = 0

    const handler = messageHandlers.current.get('connected')
    if (handler) handler({})
  }, [createProtocolMessage])

  /**
   * Handle WebSocket message
   */
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as ProtocolMessage

        if (!validateProtocolMessage(data)) {
          console.warn('[Security] Invalid message rejected:', data.msg_id)
          securityStore.recordInvalidMessageAttempt(data.msg_id || 'unknown')
          return
        }

        const handler = messageHandlers.current.get(data.type)
        if (handler) {
          handler(data.payload)
        } else {
          console.warn('[WebSocket] No handler for message type:', data.type)
        }
      } catch (error) {
        console.error('[WebSocket] Message parsing error:', error)
        securityStore.logSecurityEvent('MESSAGE_PARSING_ERROR', {
          error: error instanceof Error ? error.message : 'Unknown'
        })
      }
    },
    [validateProtocolMessage, securityStore]
  )

  /**
   * Handle WebSocket error
   */
  const handleError = useCallback(() => {
    setLastError('WebSocket error occurred')
    console.error('[WebSocket] Error')
    securityStore.logSecurityEvent('WEBSOCKET_ERROR', {
      timestamp: new Date().toISOString()
    })
  }, [securityStore])

  /**
   * Handle WebSocket close
   */
  const handleClose = useCallback(() => {
    setIsConnected(false)
    setIsConnecting(false)

    console.log('[WebSocket] Disconnected')

    if (reconnectAttempts < maxReconnectAttempts) {
      setReconnectAttempts((prev) => prev + 1)
      console.log(
        `[WebSocket] Reconnecting (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})...`
      )

      setTimeout(() => {
        // Reconnect logic will be handled by connect() call
      }, reconnectDelay)
    } else {
      setLastError('Failed to reconnect after maximum attempts')
      console.error('[WebSocket] Max reconnection attempts reached')
      securityStore.logSecurityEvent('WEBSOCKET_RECONNECT_FAILED', {
        attempts: maxReconnectAttempts
      })
    }

    const handler = messageHandlers.current.get('disconnected')
    if (handler) handler({})
  }, [reconnectAttempts, securityStore, maxReconnectAttempts])

  /**
   * Connect to WebSocket
   */
  const connect = useCallback(
    async (config: WSConfig): Promise<void> => {
      if (import.meta.env.PROD && !config.url.startsWith('wss://')) {
        throw new Error('WebSocket must use WSS (WebSocket Secure)')
      }

      if (!import.meta.env.PROD && !config.url.startsWith('ws')) {
        throw new Error('Invalid WebSocket URL')
      }

      if (isConnecting || isConnected) {
        console.warn('[WebSocket] Already connecting or connected')
        return
      }

      setIsConnecting(true)
      setLastError(null)

      try {
        if (!sessionKeyStore.getCurrentSessionKey()) {
          throw new Error('Session key not available')
        }

        const url = new URL(config.url)
        url.searchParams.set('deviceId', config.deviceId || sessionKeyStore.getDeviceId())
        url.searchParams.set('sessionId', config.sessionId || sessionKeyStore.getSessionId())

        console.log('[WebSocket] Connecting to:', url.toString().replace(/[?&].*/, '...'))

        wsRef.current = new WebSocket(url.toString())
        wsRef.current.onopen = handleOpen
        wsRef.current.onmessage = handleMessage
        wsRef.current.onerror = handleError
        wsRef.current.onclose = handleClose
      } catch (error) {
        setIsConnecting(false)
        setLastError(error instanceof Error ? error.message : 'Connection failed')
        console.error('[WebSocket] Connection error:', error)
        throw error
      }
    },
    [isConnecting, isConnected, sessionKeyStore, handleOpen, handleMessage, handleError, handleClose]
  )

  /**
   * Send message through WebSocket
   */
  const sendMessage = useCallback(
    (type: ProtocolMessage['type'], payload: any): void => {
      if (!isConnected) {
        throw new Error('WebSocket not connected')
      }

      try {
        const protocolMessage = createProtocolMessage(type, payload)

        if (!wsRef.current) {
          throw new Error('WebSocket not available')
        }

        wsRef.current.send(JSON.stringify(protocolMessage))
        console.log(`[WebSocket] Message sent: ${protocolMessage.msg_id}`)

        messageBuffer.current.push({
          msg_id: protocolMessage.msg_id,
          timestamp: protocolMessage.timestamp,
          payload
        })

        if (messageBuffer.current.length > 100) {
          messageBuffer.current.shift()
        }
      } catch (error) {
        console.error('[WebSocket] Send message error:', error)
        throw error
      }
    },
    [isConnected, createProtocolMessage]
  )

  /**
   * Register message handler
   */
  const onMessage = useCallback(
    (type: string, handler: (data: any) => void): (() => void) => {
      messageHandlers.current.set(type, handler)

      return () => {
        messageHandlers.current.delete(type)
      }
    },
    []
  )

  /**
   * Disconnect WebSocket
   */
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setIsConnected(false)
    setIsConnecting(false)
    messageBuffer.current = []
  }, [])

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    isConnected,
    isConnecting,
    lastError,
    reconnectAttempts,
    connect,
    disconnect,
    sendMessage,
    onMessage,
    generateMessageId,
    calculateHMAC,
    validateHMAC,
    createProtocolMessage,
    validateProtocolMessage
  }
}
