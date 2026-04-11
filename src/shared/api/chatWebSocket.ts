
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
    return secureChatClient.isConnected();
  }

  setSessionCredentials(sessionId: string, sessionKey?: string, sessionKeyIv?: string) {
    console.log('✅ Credentials managed server-side');
  }
}

export const chatWebSocket = new ChatWebSocketServiceAdapter();
