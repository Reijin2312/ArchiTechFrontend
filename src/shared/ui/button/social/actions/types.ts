import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type {
  Friend,
  FriendRequest,
  UserSearchResult,
  PrivateChat,
  ChatMessage,
  UploadImageResponse,
} from '@/shared/api/types';
import type { ChatMessageStore } from './messageReconcile';

export type AttachedImage = {
  id: string;
  file: File;
  preview?: string;
  thumbnailUrl?: string;
  strippedThumbnailUrl?: string;
  width?: number;
  height?: number;
  aspectRatio?: number;
  isImage?: boolean;
  sendAsFile?: boolean;
  groupWithOthers?: boolean;
  forcedMessageType?: 'voice' | 'circle';
  contentType?: string;
  sizeBytes?: number;
  uploadedData?: UploadImageResponse;
  uploading?: boolean;
};

export type AttachImageOptions = {
  forcedMessageType?: 'voice' | 'circle';
  preview?: string;
  thumbnailUrl?: string;
  strippedThumbnailUrl?: string;
  width?: number;
  height?: number;
  aspectRatio?: number;
  sendAsFile?: boolean;
  groupWithOthers?: boolean;
};

export type SendImagesOptions = {
  attachments?: AttachedImage[];
  clearComposerDraft?: boolean;
  replyToMessageId?: number;
  resetReplyTo?: boolean;
  groupingKeyOverride?: string;
};

export type UploadingImagePhase = 'queued' | 'uploading' | 'uploaded';

export type UploadingImageState = {
  localId: string;
  attachmentIndex: number;
  file: File;
  progress: number;
  phase: UploadingImagePhase;
  cancelable: boolean;
};

export type SocialFloatingActionsContext = {
  user: any;
  searchQuery: string;
  selectedChat: number | null;
  chats: PrivateChat[];
  messages: ChatMessage[];
  messageStore: ChatMessageStore;
  messageInput: string;
  attachedImages: AttachedImage[];
  editingMessage: ChatMessage | null;
  replyingTo: ChatMessage | null;
  markReadTimeoutRef: MutableRefObject<NodeJS.Timeout | null>;
  markReadTargetRef: MutableRefObject<{ chatId: number; lastId: number } | null>;
  sendQueueRef: MutableRefObject<Map<number, Promise<void>>>;
  pendingUploadCancelsRef: MutableRefObject<Map<string, () => void>>;
  historyBeforeByChatRef: MutableRefObject<Map<number, number>>;
  historyHasMoreByChatRef: MutableRefObject<Map<number, boolean>>;
  historyLoadingByChatRef: MutableRefObject<Set<number>>;
  lastProtocolSeqRef: MutableRefObject<number>;
  lastProtocolMsgIdRef: MutableRefObject<number>;
  typingThrottleRef: MutableRefObject<Map<number, { lastSentAt: number; lastState: boolean }>>;
  isFirstLoadRef: MutableRefObject<boolean>;
  messagesEndRef: MutableRefObject<HTMLDivElement | null>;
  setFriends: Dispatch<SetStateAction<Friend[]>>;
  setIncomingRequests: Dispatch<SetStateAction<FriendRequest[]>>;
  setOutgoingRequests: Dispatch<SetStateAction<FriendRequest[]>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setSearchResults: Dispatch<SetStateAction<UserSearchResult[]>>;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  setMessageStore: Dispatch<SetStateAction<ChatMessageStore>>;
  setChats: Dispatch<SetStateAction<PrivateChat[]>>;
  setSelectedChat: Dispatch<SetStateAction<number | null>>;
  setActiveTab: Dispatch<SetStateAction<'friends' | 'search' | 'requests' | 'chat'>>;
  setReplyingTo: Dispatch<SetStateAction<ChatMessage | null>>;
  setMessageInput: Dispatch<SetStateAction<string>>;
  setAttachedImages: Dispatch<SetStateAction<AttachedImage[]>>;
  setEditingMessage: Dispatch<SetStateAction<ChatMessage | null>>;
  setUploadingImages: Dispatch<SetStateAction<Map<string, UploadingImageState>>>;
  setAutoScrollLocked: Dispatch<SetStateAction<boolean>>;
  setIsChatsRefreshing: Dispatch<SetStateAction<boolean>>;
  scrollToBottom: (smooth?: boolean) => void;
};

export type SocialFriendActions = {
  loadFriends: () => Promise<void>;
  loadIncomingRequests: () => Promise<void>;
  loadOutgoingRequests: () => Promise<void>;
  searchUsers: () => Promise<void>;
  refreshSearchIfNeeded: () => void;
  sendFriendRequest: (userId: string) => Promise<void>;
  acceptRequest: (userId: string) => Promise<void>;
  rejectRequest: (userId: string) => Promise<void>;
  removeFriend: (userId: string) => Promise<void>;
  cancelRequest: (userId: string) => Promise<void>;
};

export type SocialChatActions = {
  markChatRead: (chatId: number, lastId: number) => Promise<void>;
  loadChats: () => Promise<void>;
  loadMessages: (chatId: number, append?: boolean) => Promise<void>;
  loadMessagesAfter: (chatId: number, afterMessageId: number, limit?: number) => Promise<void>;
  loadOlderMessages: (chatId: number, limit?: number) => Promise<void>;
  openChatWith: (participantId: string) => Promise<void>;
  createGroupChat: (payload: {
    title: string;
    participantIds?: string[];
    avatarPath?: string;
  }) => Promise<void>;
  sendTypingState: (chatId: number, typing: boolean, force?: boolean) => Promise<void>;
  sendMessageToUser: (
    recipientId: string,
    message: string,
    messageType?: 'text' | 'image' | 'images' | 'file' | 'files' | 'voice' | 'circle',
    imagePath?: string,
    imageEncrypted?: boolean,
    imageEncryptionIv?: string,
    imageKeyVersion?: number,
  ) => Promise<void>;
  sendChatMessage: () => Promise<void>;
  retryFailedMessage: (messageId: number | string) => Promise<void>;
  sendMessagesWithImages: (
    chatId: number,
    textContent: string,
    options?: SendImagesOptions
  ) => Promise<void>;
  cancelPendingMediaUpload: (localId: string, attachmentIndex: number) => void;
  attachImage: (file: File, options?: AttachImageOptions) => Promise<void>;
  removeAttachedImage: (id: string) => void;
  editMessage: (messageId: number | string, newContent: string) => Promise<void>;
  deleteMessage: (messageId: number | string) => Promise<void>;
  copyMessageText: (text: string) => void;
  uploadImage: (
    file: File,
    options?: {
      forcedMessageType?: 'voice' | 'circle';
    }
  ) => Promise<void>;
};

export type SocialFloatingActions = SocialFriendActions & SocialChatActions;
