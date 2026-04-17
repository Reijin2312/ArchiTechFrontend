import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { authStore } from '@/shared/store/auth';
import { logger } from '@/shared/lib/logger';
import { useSocialFloatingEffects } from './useSocialFloatingEffects';
import { createSocialFloatingActions } from './createSocialFloatingActions';
import {
  createMessageStore,
  messageStoreToArray,
  projectChatsFromMessageStore,
  type ChatMessageStore,
} from './actions/messageReconcile';
import type {
  Friend,
  FriendRequest,
  UserSearchResult,
  PrivateChat,
  ChatMessage,
  ChatPresenceState,
  UploadImageResponse
} from '@/shared/api/types';
import type { UploadingImageState } from './actions/types';

export type Tab = 'friends' | 'search' | 'requests' | 'chat';
export type RequestsSubTab = 'incoming' | 'outgoing';
type SocialFloatingModelOptions = {
  mode?: 'floating' | 'page';
};

export function useSocialFloatingModel(options: SocialFloatingModelOptions = {}) {
  const mode = options.mode ?? 'floating';
  const isPageMode = mode === 'page';

  const user = authStore(s => s.user);
  const userId = user?.id || '';
  const [isOpen, setIsOpen] = useState(isPageMode);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const [requestsSubTab, setRequestsSubTab] = useState<RequestsSubTab>('incoming');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [chats, setChats] = useState<PrivateChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<number | null>(null);
  const [messageStore, setMessageStore] = useState<ChatMessageStore>(() => createMessageStore([]));
  const messages = useMemo(() => {
    if (!selectedChat) {
      return [];
    }
    return messageStoreToArray(messageStore).filter(
      (message) => message.chatId === selectedChat
    );
  }, [messageStore, selectedChat]);
  const setMessages: Dispatch<SetStateAction<ChatMessage[]>> = (value) => {
    setMessageStore((previousStore) => {
      const previousMessages = messageStoreToArray(previousStore);
      const nextMessages =
        typeof value === 'function'
          ? (value as (prev: ChatMessage[]) => ChatMessage[])(previousMessages)
          : value;
      return createMessageStore(nextMessages, userId);
    });
  };
  const [messageInput, setMessageInput] = useState('');
  const [typingUsersByChat, setTypingUsersByChat] = useState<Record<number, string[]>>({});
  const [presenceByUser, setPresenceByUser] = useState<Record<string, ChatPresenceState>>({});
  const [isWsConnecting, setIsWsConnecting] = useState(false);
  const [isChatsRefreshing, setIsChatsRefreshing] = useState(false);
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());
  const [autoScrollLocked, setAutoScrollLockedState] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; message: ChatMessage } | null>(null);
  const [uploadingImages, setUploadingImages] = useState<Map<string, UploadingImageState>>(new Map());
  const [pendingMediaPreviewUrls, setPendingMediaPreviewUrls] = useState<Map<string, string>>(
    new Map()
  );
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isRecordingCircle, setIsRecordingCircle] = useState(false);
  const [recordingCircleStream, setRecordingCircleStream] = useState<MediaStream | null>(null);

  const [attachedImages, setAttachedImages] = useState<Array<{
    id: string;
    file: File;
    preview?: string;
    thumbnailUrl?: string;
    strippedThumbnailUrl?: string;
    width?: number;
    height?: number;
    aspectRatio?: number;
    isImage?: boolean;
    groupWithOthers?: boolean;
    forcedMessageType?: 'voice' | 'circle';
    contentType?: string;
    sizeBytes?: number;
    uploadedData?: UploadImageResponse;
    uploading?: boolean;
  }>>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pendingMediaPreviewUrlsRef = useRef<Map<string, string>>(new Map());
  const markReadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const markReadTargetRef = useRef<{ chatId: number; lastId: number } | null>(null);
  const sendQueueRef = useRef<Map<number, Promise<void>>>(new Map());
  const pendingUploadCancelsRef = useRef<Map<string, () => void>>(new Map());
  const historyBeforeByChatRef = useRef<Map<number, number>>(new Map());
  const historyHasMoreByChatRef = useRef<Map<number, boolean>>(new Map());
  const historyLoadingByChatRef = useRef<Set<number>>(new Set());
  const lastProtocolSeqRef = useRef<number>(0);
  const lastProtocolMsgIdRef = useRef<number>(0);
  const typingTimeoutsRef = useRef<Map<string, number>>(new Map());
  const typingThrottleRef = useRef<Map<number, { lastSentAt: number; lastState: boolean }>>(
    new Map(),
  );
  const isFirstLoadRef = useRef<boolean>(true);
  const autoScrollLockedRef = useRef(false);

  const setAutoScrollLocked: Dispatch<SetStateAction<boolean>> = (value) => {
    setAutoScrollLockedState((prev) => {
      const next = typeof value === 'function'
        ? (value as (previous: boolean) => boolean)(prev)
        : value;
      autoScrollLockedRef.current = next;
      return next;
    });
  };
  
  const selectedChatRef = useRef(selectedChat);
  const userRef = useRef(user);
  const isOpenRef = useRef(isOpen);
  const friendsRef = useRef<Friend[]>([]);
  const chatsRef = useRef<PrivateChat[]>([]);

  const scrollToBottom = (smooth = true) => {
    if (autoScrollLockedRef.current) {
      return;
    }
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  const closeMessenger = () => {
    if (isPageMode) {
      setSelectedChat(null);
      setMessages([]);
      return;
    }
    setIsOpen(false);
    setIsFullscreen(false);
    setActiveTab('chat');
  };

  useEffect(() => {
    setChats((previousChats) => projectChatsFromMessageStore(previousChats, messageStore));
  }, [messageStore]);

  const normalizeAssetUrl = (url?: string): string | undefined => {
    if (!url) return undefined;
    try {
      return new URL(url, window.location.origin).toString();
    } catch {
      return undefined;
    }
  };

  const requestDesktopNotificationPermission = async () => {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'default') return;

    try {
      await Notification.requestPermission();
    } catch (err) {
      logger.warn('Failed to request Notification permission:', err);
    }
  };

  const getNotificationBody = (msg: any): string => {
    const text = typeof msg.content === 'string' ? msg.content.trim() : '';
    if (text) return text;

    if (msg.messageType === 'files') {
      const count = Array.isArray(msg.images) ? msg.images.length : 0;
      return count > 1 ? `${count} файлов` : 'Файл';
    }
    if (msg.messageType === 'file') {
      return 'Файл';
    }
    if (msg.messageType === 'voice') {
      return 'Голосовое сообщение';
    }
    if (msg.messageType === 'circle') {
      return 'Видеосообщение';
    }

    if (msg.messageType === 'images') {
      const count = Array.isArray(msg.images) ? msg.images.length : 0;
      return count > 1 ? `${count} изображений` : 'Изображение';
    }
    if (msg.messageType === 'image') {
      return 'Изображение';
    }
    return 'Новое сообщение';
  };

  const showDesktopNotification = (msg: any, currentUserId: string) => {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    if (msg.senderId === currentUserId) return;

    const isBackgroundTab = document.visibilityState !== 'visible' || !document.hasFocus();
    if (!isBackgroundTab) return;

    const sender = friendsRef.current.find((friend) => friend.userId === msg.senderId);
    const chat = chatsRef.current.find((item) => item.chatId === msg.chatId);
    const title =
      sender?.displayName ||
      sender?.username ||
      (chat?.chatType === 'GROUP'
        ? chat.title?.trim() || `Group #${chat.chatId}`
        : chat?.participantId?.slice(0, 8)) ||
      'Новое сообщение';
    const icon =
      normalizeAssetUrl(sender?.avatarUrl) ||
      normalizeAssetUrl('/images/favicon-192.png');
    const badge = normalizeAssetUrl('/images/favicon-32.png');

    const notification = new Notification(title, {
      body: getNotificationBody(msg),
      icon,
      badge,
      tag: `chat-${msg.chatId}-${msg.messageId ?? Date.now()}`,
    });

    notification.onclick = () => {
      window.focus();
      setIsOpen(true);
      setActiveTab('chat');
      setSelectedChat(msg.chatId);
      notification.close();
    };
  };


  const {
    loadFriends,
    loadIncomingRequests,
    loadOutgoingRequests,
    searchUsers,
    refreshSearchIfNeeded,
    sendFriendRequest,
    acceptRequest,
    rejectRequest,
    removeFriend,
    cancelRequest,
    markChatRead,
    loadChats,
    loadMessages,
    loadMessagesAfter,
    loadOlderMessages,
    openChatWith,
    createGroupChat,
    sendTypingState,
    sendMessageToUser,
    sendChatMessage,
    retryFailedMessage,
    sendMessagesWithImages,
    cancelPendingMediaUpload,
    attachImage,
    removeAttachedImage,
    editMessage,
    deleteMessage,
    copyMessageText,
    uploadImage,
  } = createSocialFloatingActions({
    user,
    searchQuery,
    selectedChat,
    chats,
    messages,
    messageStore,
    messageInput,
    attachedImages,
    editingMessage,
    replyingTo,
    markReadTimeoutRef,
    sendQueueRef,
    pendingUploadCancelsRef,
    historyBeforeByChatRef,
    historyHasMoreByChatRef,
    historyLoadingByChatRef,
    lastProtocolSeqRef,
    lastProtocolMsgIdRef,
    typingThrottleRef,
    isFirstLoadRef,
    messagesEndRef,
    markReadTargetRef,
    setFriends,
    setIncomingRequests,
    setOutgoingRequests,
    setLoading,
    setSearchResults,
    setMessages,
    setMessageStore,
    setChats,
    setSelectedChat,
    setActiveTab,
    setReplyingTo,
    setMessageInput,
    setAttachedImages,
    setEditingMessage,
    setUploadingImages,
    pendingMediaPreviewUrls,
    setPendingMediaPreviewUrls,
    setAutoScrollLocked,
    setIsChatsRefreshing,
    scrollToBottom,
  });

  useEffect(() => {
    pendingMediaPreviewUrlsRef.current = pendingMediaPreviewUrls;
  }, [pendingMediaPreviewUrls]);

  useEffect(() => {
    return () => {
      for (const url of pendingMediaPreviewUrlsRef.current.values()) {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      }
    };
  }, []);


  useSocialFloatingEffects({
    selectedChatRef,
    selectedChat,
    userRef,
    user,
    isOpenRef,
    isOpen,
    friendsRef,
    friends,
    chatsRef,
    chats,
    setLastActivityTime,
    lastActivityTime,
    messages,
    userId,
    markChatRead,
    setIncomingRequests,
    setOutgoingRequests,
    setFriends,
    setChats,
    setMessageStore,
    loadFriends,
    loadIncomingRequests,
    loadOutgoingRequests,
    refreshSearchIfNeeded,
    loadChats,
    showDesktopNotification,
    setTypingUsersByChat,
    typingTimeoutsRef,
    presenceByUser,
    setPresenceByUser,
    setContextMenu,
    contextMenu,
    activeTab,
    loadMessages,
    loadMessagesAfter,
    searchQuery,
    setSearchResults,
    searchUsers,
    disableBodyScrollLock: isPageMode,
    setAutoScrollLocked,
    setIsWsConnecting,
  });


  return {
    isOpen,
    setIsOpen,
    isFullscreen,
    setIsFullscreen,
    activeTab,
    setActiveTab,
    requestsSubTab,
    setRequestsSubTab,
    friends,
    setFriends,
    incomingRequests,
    setIncomingRequests,
    outgoingRequests,
    setOutgoingRequests,
    searchQuery,
    setSearchQuery,
    searchResults,
    setSearchResults,
    loading,
    setLoading,
    chats,
    setChats,
    selectedChat,
    setSelectedChat,
    messageStore,
    setMessageStore,
    messages,
    setMessages,
    messageInput,
    setMessageInput,
    typingUsersByChat,
    setTypingUsersByChat,
    presenceByUser,
    setPresenceByUser,
    isWsConnecting,
    setIsWsConnecting,
    isChatsRefreshing,
    setIsChatsRefreshing,
    lastActivityTime,
    setLastActivityTime,
    autoScrollLocked,
    setAutoScrollLocked,
    replyingTo,
    setReplyingTo,
    editingMessage,
    setEditingMessage,
    contextMenu,
    setContextMenu,
    uploadingImages,
    setUploadingImages,
    pendingMediaPreviewUrls,
    setPendingMediaPreviewUrls,
    isRecordingVoice,
    setIsRecordingVoice,
    isRecordingCircle,
    setIsRecordingCircle,
    recordingCircleStream,
    setRecordingCircleStream,
    attachedImages,
    setAttachedImages,
    user,
    userId,
    messagesEndRef,
    markReadTimeoutRef,
    markReadTargetRef,
    typingTimeoutsRef,
    typingThrottleRef,
    isFirstLoadRef,
    selectedChatRef,
    userRef,
    isOpenRef,
    friendsRef,
    chatsRef,
    scrollToBottom,
    closeMessenger,
    normalizeAssetUrl,
    requestDesktopNotificationPermission,
    getNotificationBody,
    showDesktopNotification,
    loadFriends,
    loadIncomingRequests,
    loadOutgoingRequests,
    searchUsers,
    refreshSearchIfNeeded,
    sendFriendRequest,
    acceptRequest,
    rejectRequest,
    removeFriend,
    cancelRequest,
    markChatRead,
    loadChats,
    loadMessages,
    loadMessagesAfter,
    loadOlderMessages,
    openChatWith,
    createGroupChat,
    sendTypingState,
    sendMessageToUser,
    sendChatMessage,
    retryFailedMessage,
    sendMessagesWithImages,
    cancelPendingMediaUpload,
    attachImage,
    removeAttachedImage,
    editMessage,
    deleteMessage,
    copyMessageText,
    uploadImage,
  };
}

export type SocialFloatingModel = ReturnType<typeof useSocialFloatingModel>;





