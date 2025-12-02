import { http } from '@/shared/api/http';
import { endpoints } from '@/shared/api/endpoints';

export interface ChatWebSocketMessage {
  type: 'new_message' | 'friend_request' | 'friend_accept' | 'friend_reject' | 'message_read' | 'message_edited' | 'message_deleted';
  chatId?: number;
  lastReadMessageId?: number;
  messageId?: number;
  encryptedContent?: string;
  encryptionMetadata?: string | {
    iv: string;
    encryptedKey: string;
    timestamp: number;
    nonce: string;
    signature?: string;
  };
  message?: {
    messageId: number;
    chatId: number;
    senderId: string;
    encryptedContent: string;
    messageType: 'text' | 'image';
    imagePath?: string;
    imageUrl?: string;
    encryptionMetadata?: string | {
      iv: string;
      encryptedKey: string;
      timestamp: number;
      nonce: string;
      signature?: string;
    };
    createdAt: string;
    isRead?: boolean;
    readByUser1: boolean;
    readByUser2: boolean;
    deliveredAt?: string;
    readAt?: string;
    replyToId?: number;
    replyToMessage?: {
      messageId: number;
      senderId: string;
      encryptedContent: string;
      messageType: 'text' | 'image';
      createdAt: string;
    };
  };
  // Для заявок в друзья
  friendRequest?: {
    requestId: number;
    userId: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
    status?: 'PENDING' | 'ACCEPTED' | 'REJECTED';
    createdAt: string;
  };
}

type MessageHandler = (message: ChatWebSocketMessage) => void;

class ChatWebSocketService {
  private ws: WebSocket | null = null;
  private handlers: Set<MessageHandler> = new Set();
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private userId: string | null = null;
  private isIntentionallyClosed = false;
  private isConnecting = false;

  connect(userId: string) {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      console.log('WebSocket already connected or connecting');
      return;
    }

    this.userId = userId;
    this.isIntentionallyClosed = false;
    this.reconnectAttempts = 0;

    this.openWithTicket().catch(err => {
      console.error('Failed to open WebSocket with ticket:', err);
    });
  }

  private async openWithTicket() {
    if (this.isConnecting) return;
    this.isConnecting = true;

    try {
      const { data } = await http.post<{ ticket: string }>(endpoints.chatWsTicket);
      const ticket = data.ticket;

      const envUrl = (import.meta as any)?.env?.VITE_CHAT_WS_URL as string | undefined;
      const envPort = (import.meta as any)?.env?.VITE_CHAT_WS_PORT as string | undefined;
      const apiOrigin = (import.meta as any)?.env?.VITE_API_BASE as string | undefined;

      if (envUrl) {
        const fullUrl = `${envUrl}?ticket=${encodeURIComponent(ticket)}`;
        console.log('Connecting to WebSocket (env URL):', fullUrl, 'for user:', this.userId);
        this.ws = new WebSocket(fullUrl);
      } else {
        const base = apiOrigin ? new URL(apiOrigin) : new URL(window.location.origin);
        const protocol = base.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = base.hostname;
        const port = envPort || '51789';
        const wsUrl = `${protocol}//${host}:${port}/ws/chat?ticket=${encodeURIComponent(ticket)}`;
        console.log('Connecting to WebSocket:', wsUrl, 'for user:', this.userId);
        this.ws = new WebSocket(wsUrl);
      }


      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const data: ChatWebSocketMessage = JSON.parse(event.data);
        
          this.handlers.forEach(handler => {
            try {
              handler(data);
            } catch (err) {
              console.error('Handler error:', err);
            }
          });
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.ws = null;
        this.isConnecting = false;

        if (!this.isIntentionallyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
          console.log(
            `Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`
          );

          this.reconnectTimeout = setTimeout(() => {
            this.reconnectAttempts++;
            if (this.userId) {
              this.openWithTicket().catch(err => {
                console.error('Reconnect failed:', err);
              });
            }
          }, delay);
        }
      };
    } catch (err) {
      console.error('Failed to create WebSocket (ticket request failed):', err);
      this.ws = null;
      this.isConnecting = false;

      if (!this.isIntentionallyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
        console.log(
          `Reconnecting in ${delay}ms after ticket failure (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`
        );

        this.reconnectTimeout = setTimeout(() => {
          this.reconnectAttempts++;
          if (this.userId) {
            this.openWithTicket().catch(e => console.error('Reconnect after ticket failure error:', e));
          }
        }, delay);
      }
    }
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
    this.reconnectAttempts = 0;
    this.isConnecting = false;
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
}

export const chatWebSocket = new ChatWebSocketService();
