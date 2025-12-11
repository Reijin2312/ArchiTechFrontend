/**
 * 🔐 DEPRECATED: This file is a compatibility adapter
 * 
 * All chat functionality now uses secureChatClient from @/shared/api/secureChat
 * This file maintains backward compatibility by wrapping secureChatClient
 */

import { secureChatClient, type WebSocketEvent } from '@/shared/auth/secureChat';

export type ChatWebSocketMessage = WebSocketEvent;

class ChatWebSocketServiceAdapter {
  private unsubscribe: (() => void) | null = null;

  connect(_userId?: string) {
    secureChatClient.connect().catch(err => {
      console.error('Failed to connect secure chat client:', err);
    });
  }

  disconnect() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    secureChatClient.disconnect();
  }

  subscribe(handler: (message: ChatWebSocketMessage) => void): () => void {
    this.unsubscribe = secureChatClient.onMessage(handler);
    return () => {
      if (this.unsubscribe) {
        this.unsubscribe();
        this.unsubscribe = null;
      }
    };
  }

  isConnected(): boolean {
    // Compatibility stub - not tracked in secure client
    return true;
  }

  setSessionCredentials(sessionId: string, sessionKey?: string, sessionKeyIv?: string) {
    // ☁️ CLOUD MODEL: Credentials managed server-side via session middleware
    // This is a no-op for compatibility
    console.log('✅ Credentials managed server-side');
  }
}

export const chatWebSocket = new ChatWebSocketServiceAdapter();
