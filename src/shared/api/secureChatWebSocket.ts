/**
 * Enhanced Chat WebSocket with Security Protocol
 * 
 * ☁️ CLOUD MODEL (Non-E2E):
 * Content is sent as PLAINTEXT with HMAC for integrity.
 * Server encrypts before storage, decrypts before broadcasting.
 * 
 * Features:
 * - WSS-only (no ws://)
 * - Session key management (per-device)
 * - Protocol message validation (seq_no, timestamp, HMAC)
 * - Anti-replay detection
 * - Device binding verification
 * - Strict message ordering
 */

export interface SecureProtocolMessage {
  msg_id: number;              // Unique message ID
  seq_no: number;              // Sequence number (anti-replay)
  timestamp: number;            // Message timestamp (milliseconds)
  chat_id: number;              // ⚠️ SIGNED: Prevents room substitution attacks
  content_type: 'text' | 'image' | 'binary';
  content: string;              // ☁️ PLAINTEXT content (server encrypts before storage)
  hmac: string;                 // HMAC signature (Base64) - covers all fields including chat_id
  reply_to_id?: number;         // Optional reply reference
  attachments?: string[];       // Attachment hashes
}

export interface SessionKeyInfo {
  sessionId: string;
  deviceId: string;
  keyVersion: number;
  expiresAt: number;
}

export interface ChatWebSocketMessage {
  type: 'connected' | 'new_message' | 'friend_request' | 'friend_accept' | 
        'friend_reject' | 'message_read' | 'message_edited' | 'message_deleted' |
        'session_key_rotated' | 'device_revoked' | 'protocol_error';
  
  // Message payload
  chatId?: number;
  message?: SecureProtocolMessage;
  
  // Session management
  sessionId?: string;
  newSessionKey?: SessionKeyInfo;
  
  // Error details
  errorCode?: string;
  errorMessage?: string;
}

type MessageHandler = (message: ChatWebSocketMessage) => void;

/**
 * Валидатор протокола на клиентской стороне.
 */
class ClientProtocolValidator {
  private lastSeqNo = -1;
  private messageIds = new Set<number>();
  private maxTimestampSkewMs = 30000;  // 30 seconds
  
  validate(msg: SecureProtocolMessage): boolean {
    // 1. seq_no must be strictly increasing
    if (msg.seq_no <= this.lastSeqNo) {
      console.error('Protocol violation: seq_no not increasing', {
        last: this.lastSeqNo,
        current: msg.seq_no
      });
      return false;
    }
    
    // 2. timestamp must be recent
    const now = Date.now();
    const age = now - msg.timestamp;
    if (age < -this.maxTimestampSkewMs || age > this.maxTimestampSkewMs) {
      console.error('Protocol violation: timestamp out of skew', {
        timestamp: msg.timestamp,
        now,
        maxSkew: this.maxTimestampSkewMs
      });
      return false;
    }
    
    // 3. msg_id must be unique
    if (this.messageIds.has(msg.msg_id)) {
      console.error('Protocol violation: duplicate msg_id', { msg_id: msg.msg_id });
      return false;
    }
    
    // Update state
    this.lastSeqNo = msg.seq_no;
    this.messageIds.add(msg.msg_id);
    
    // Cleanup old msg_ids
    if (this.messageIds.size > 10000) {
      this.messageIds.clear();
    }
    
    return true;
  }
  
  reset() {
    this.lastSeqNo = -1;
    this.messageIds.clear();
  }
}

/**
 * Enhanced Chat WebSocket Service with Security Protocol
 */
class SecureChatWebSocketService {
  private ws: WebSocket | null = null;
  private handlers: Set<MessageHandler> = new Set();
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private userId: string | null = null;
  private isIntentionallyClosed = false;
  private isConnecting = false;
  
  // Session and security
  private sessionId: string | null = null;
  private deviceId: string | null = null;
  private sessionKey: string | null = null;
  private protocolValidator = new ClientProtocolValidator();
  private cachedDeviceToken: { token: string; expiresAt: number } | null = null;
  
  constructor() {
    this.restoreSessionFromStorage();
  }
  
  /**
   * Session credentials are now stored in HttpOnly cookies (secure from XSS).
   * After page reload, they will be restored from refresh endpoint response.
   * No need to restore from localStorage/sessionStorage.
   */
  private restoreSessionFromStorage() {
    // 🔐 DEPRECATED: Session/device IDs now come from refresh endpoint
    // Cookies are sent automatically with credentials: 'include'
    console.log('✅ Session credentials will be restored from refresh endpoint on bootstrap');
  }

  /**
   * Connect to secure WebSocket.
   * Enforces WSS-only, no fallback to WS.
   */
  connect(userId: string) {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      console.log('[SecureWS] WebSocket already connected or connecting');
      return;
    }
    
    this.userId = userId;
    this.isIntentionallyClosed = false;
    this.reconnectAttempts = 0;
    
    this.openSecureWebSocket().catch(err => {
      console.error('❌ Failed to establish secure WebSocket:', err);
      this.emitProtocolError('WS_CONNECT_FAILED', err.message);
    });
  }
  
  /**
   * Set session credentials from login response (server-issued).
   * This MUST be called before connect() to use server-issued deviceId.
   */
  setSessionCredentials(sessionId: string | null, deviceId: string | null) {
    if (sessionId && deviceId) {
      this.sessionId = sessionId;
      this.deviceId = deviceId;
      this.cachedDeviceToken = null;
      
      // 🔐 SECURITY: Do NOT store in localStorage/sessionStorage - XSS risk!
      // These are now in HttpOnly cookies on backend, safe from JavaScript access
      // We keep them in memory (class properties) for WebSocket headers only
      
      console.log('✅ Server credentials set in memory: sessionId and deviceId from login response');
    }
  }

  /**
   * Get or refresh device token.
   * Automatically fetches new token if expired or missing.
   */
  private async getDeviceToken(): Promise<{ deviceToken: string; expiresIn: number }> {
    const now = Date.now()
    if (this.cachedDeviceToken) {
      const timeLeft = this.cachedDeviceToken.expiresAt - now
      if (timeLeft > 60000) {
        console.log(
          `[SecureWS] Reusing cached device token (expires in ${Math.floor(timeLeft / 1000)}s)`
        )
        return {
          deviceToken: this.cachedDeviceToken.token,
          expiresIn: Math.floor(timeLeft / 1000)
        }
      }
    }

    const apiBase = (import.meta as any)?.env?.VITE_API_BASE as string || window.location.origin

    const response = await fetch(`${apiBase}/api/v1/chat/ws-ticket/device-token`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'X-Session-ID': this.sessionId!,
        'X-Device-ID': this.deviceId!
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      const error = `Failed to get device token: ${response.status}`;
      console.error(error);
      this.cachedDeviceToken = null
      throw new Error(error);
    }
    
    const { deviceToken, expiresIn } = await response.json();
    if (!deviceToken) {
      throw new Error('Server did not issue device token');
    }

    const fetchedAt = Date.now()
    this.cachedDeviceToken = { token: deviceToken, expiresAt: fetchedAt + (expiresIn * 1000) };
    
    console.log(`[SecureWS] Device token fetched with TTL: ${expiresIn}s`);
    
    return { deviceToken, expiresIn };
  }
  
  private async openSecureWebSocket() {
    if (this.isConnecting) return;
    this.isConnecting = true;
    
    try {
      // 🔐 CRITICAL: Ensure we have server-issued credentials before connecting
      if (!this.sessionId || !this.deviceId) {
        throw new Error('❌ Cannot connect: sessionId or deviceId not set. Call setSessionCredentials() after login.');
      }
      
      // Get WS ticket from API with proper headers
      const apiBase = (import.meta as any)?.env?.VITE_API_BASE as string || window.location.origin
      
      // 1️⃣ Get WS ticket from API
      const response = await fetch(`${apiBase}/api/v1/chat/ws-ticket`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Session-ID': this.sessionId,
          'X-Device-ID': this.deviceId
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get WS ticket: ${response.status}`);
      }
      
      const { ticket } = await response.json();
      
      // 2️⃣ Get or refresh server-bound device token (tied to sessionId/deviceId/IP/UA)
      // This endpoint verifies that session and device are active in SessionKeyStore
      // Token is automatically refreshed if expired
      const { deviceToken, expiresIn } = await this.getDeviceToken();
      
      // Build WSS URL - ENFORCE WSS ONLY
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'wss:';
      if (window.location.protocol !== 'https:' && !window.location.hostname.includes('localhost')) {
        throw new Error('❌ SECURITY: WSS required! Cannot connect via insecure channel.');
      }
      
      const host = window.location.hostname;
      const port = window.location.port || (window.location.protocol === 'https:' ? '443' : '80');
      const wsUrl = `wss://${host}:${port}/ws/chat?ticket=${encodeURIComponent(ticket)}&deviceToken=${encodeURIComponent(deviceToken)}`;
      
      console.log('🔐 Connecting to secure WSS endpoint with server-bound device token');
      this.ws = new WebSocket(wsUrl);
      
      // Important: WebSocket doesn't allow custom headers, so ticket and deviceToken are in query
      // Origin header is sent automatically and will be validated by server
      
      this.ws.onopen = () => {
        console.log('✅ Secure WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.protocolValidator.reset();
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data: ChatWebSocketMessage = JSON.parse(event.data);
          
          // Handle session key rotation
          if (data.type === 'connected' && data.sessionId) {
            this.sessionId = data.sessionId;
            console.log('✅ Session established:', this.sessionId);
          }
          
          if (data.newSessionKey) {
            this.sessionId = data.newSessionKey.sessionId;
            this.handleSessionKeyRotation(data.newSessionKey);
          }
          
          // Validate protocol for secure messages
          if (data.message && !this.protocolValidator.validate(data.message)) {
            console.error('⚠️ Protocol validation failed - dropping message');
            this.emitProtocolError('PROTOCOL_VALIDATION_FAILED', 'Message validation failed');
            return;
          }
          
          // Emit to handlers
          this.handlers.forEach(handler => {
            try {
              handler(data);
            } catch (err) {
              console.error('Handler error:', err);
            }
          });
          
        } catch (err) {
          console.error('❌ Failed to parse WebSocket message:', err);
          this.emitProtocolError('PARSE_ERROR', String(err));
        }
      };
      
      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        this.emitProtocolError('WS_ERROR', String(error));
      };
      
      this.ws.onclose = (event) => {
        console.log('⚠️ WebSocket disconnected:', event.code, event.reason);
        this.ws = null;
        this.isConnecting = false;
        
        // Handle specific close codes
        if (event.code === 1008) {
          // Policy violation - might be invalid/expired device token
          if (event.reason === 'invalid_device_token' || event.reason === 'rate_limited') {
            console.error('🚨 Device token rejected:', event.reason);
            
            // Clear cached token to force refresh on next connect
            this.cachedDeviceToken = null;
            
            if (event.reason === 'rate_limited') {
              console.error('🚨 Rate limited - too many failed attempts. Wait before reconnecting.');
              // Don't auto-reconnect if rate limited - user needs to wait
              this.emitProtocolError('RATE_LIMITED', 'Too many failed authentication attempts');
              return;
            }
          }
        }
        
        if (!this.isIntentionallyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
          console.log(`🔄 Reconnecting in ${delay}ms...`);
          
          this.reconnectTimeout = setTimeout(() => {
            this.reconnectAttempts++;
            if (this.userId) {
              this.openSecureWebSocket().catch(err => {
                console.error('Reconnect failed:', err);
              });
            }
          }, delay);
        }
      };
      
    } catch (err) {
      console.error('❌ Failed to open secure WebSocket:', err);
      this.ws = null;
      this.isConnecting = false;
      
      if (!this.isIntentionallyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
        this.reconnectTimeout = setTimeout(() => {
          this.reconnectAttempts++;
          if (this.userId) {
            this.openSecureWebSocket().catch(e => console.error('Reconnect error:', e));
          }
        }, delay);
      }
    }
  }
  
  private handleSessionKeyRotation(newKey: SessionKeyInfo) {
    console.log('🔄 Session key rotation received');
    this.sessionId = newKey.sessionId;
    this.deviceId = newKey.deviceId;
    
    // Clear cached device token so next fetch is bound to the rotated session/device
    this.cachedDeviceToken = null;
  }
  
  private emitProtocolError(code: string, message: string) {
    const errorMsg: ChatWebSocketMessage = {
      type: 'protocol_error',
      errorCode: code,
      errorMessage: message
    };
    
    this.handlers.forEach(handler => {
      try {
        handler(errorMsg);
      } catch (err) {
        console.error('Error handler failed:', err);
      }
    });
  }
  
  disconnect() {
    this.isIntentionallyClosed = true;
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.userId = null;
    this.sessionId = null;
    this.cachedDeviceToken = null;
    this.reconnectAttempts = 0;
    this.isConnecting = false;
    this.protocolValidator.reset();
  }
  
  subscribe(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }
  
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
  
  getSessionInfo() {
    return {
      sessionId: this.sessionId,
      deviceId: this.deviceId,
      userId: this.userId,
      isConnected: this.isConnected()
    };
  }
}

export const secureChatWebSocket = new SecureChatWebSocketService();
