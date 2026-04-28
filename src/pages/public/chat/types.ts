import type { ChatMessage, ChatType } from '@/shared/api/types';

export type SidebarChat = {
  chatId: number;
  chatType: ChatType;
  participantId?: string;
  participantIds?: string[];
  ownerId?: string;
  memberCount?: number;
  name: string;
  avatarUrl?: string;
  avatarText: string;
  avatarBg: string;
  isOnline?: boolean;
  preview: string;
  time: string;
  selected: boolean;
  outgoing: boolean;
  unread: boolean;
  deliveryStatus?: 'pending' | 'sent' | 'delivered' | 'read';
};

export type MessageRow =
  | { type: 'divider'; key: string; label: string }
  | { type: 'message'; key: string; message: ChatMessage };
