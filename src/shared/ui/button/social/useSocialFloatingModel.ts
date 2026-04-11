import { useState, useRef } from 'react';
import { authStore } from '@/shared/store/auth';
import { logger } from '@/shared/lib/logger';
import { useSocialFloatingEffects } from './useSocialFloatingEffects';
import { createSocialFloatingActions } from './createSocialFloatingActions';
import type {
  Friend,
  FriendRequest,
  UserSearchResult,
  PrivateChat,
  ChatMessage,
  UploadImageResponse
} from '@/shared/api/types';

export type Tab = 'friends' | 'search' | 'requests' | 'chat';
export type RequestsSubTab = 'incoming' | 'outgoing';
export type ImageGridLayout = {
  columns: number;
  rows: number;
  spans: { colSpan: number; rowSpan: number }[];
};

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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [typingUsersByChat, setTypingUsersByChat] = useState<Record<number, string[]>>({});
  const [presenceByUser, setPresenceByUser] = useState<Record<string, boolean>>({});
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; message: ChatMessage } | null>(null);
  const [uploadingImages, setUploadingImages] = useState<Map<string, { progress: number; file: File }>>(new Map());
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isRecordingCircle, setIsRecordingCircle] = useState(false);
  const [recordingCircleStream, setRecordingCircleStream] = useState<MediaStream | null>(null);

  const [attachedImages, setAttachedImages] = useState<Array<{
    id: string;
    file: File;
    preview?: string;
    isImage?: boolean;
    forcedMessageType?: 'voice' | 'circle';
    contentType?: string;
    sizeBytes?: number;
    uploadedData?: UploadImageResponse;
    uploading?: boolean;
  }>>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const markReadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sendInFlightRef = useRef<boolean>(false);
  const sendCooldownUntilRef = useRef<number>(0);
  const lastProtocolSeqRef = useRef<number>(0);
  const lastProtocolMsgIdRef = useRef<number>(0);
  const typingTimeoutsRef = useRef<Map<string, number>>(new Map());
  const typingThrottleRef = useRef<Map<number, { lastSentAt: number; lastState: boolean }>>(
    new Map(),
  );
  const isFirstLoadRef = useRef<boolean>(true);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const observedMessagesRef = useRef<Set<string>>(new Set());
  const processedMessageIds = useRef<Set<number | string>>(new Set());
  
  const selectedChatRef = useRef(selectedChat);
  const userRef = useRef(user);
  const isOpenRef = useRef(isOpen);
  const friendsRef = useRef<Friend[]>([]);
  const chatsRef = useRef<PrivateChat[]>([]);

  // Подбираем сетку для мультиизображений: фиксированный контейнер, предсказуемые ряды
  const getImageGridLayout = (count: number): ImageGridLayout => {
    if (count === 3) {
      return {
        columns: 2,
        rows: 2,
        spans: [
          { colSpan: 2, rowSpan: 1 }, // одно сверху
          { colSpan: 1, rowSpan: 1 },
          { colSpan: 1, rowSpan: 1 },
        ],
      };
    }

    if (count === 5) {
      return {
        columns: 6,
        rows: 2,
        spans: [
          { colSpan: 3, rowSpan: 1 },
          { colSpan: 3, rowSpan: 1 },
          { colSpan: 2, rowSpan: 1 },
          { colSpan: 2, rowSpan: 1 },
          { colSpan: 2, rowSpan: 1 },
        ],
      };
    }

    if (count === 7) {
      return {
        columns: 12,
        rows: 2,
        spans: [
          { colSpan: 4, rowSpan: 1 },
          { colSpan: 4, rowSpan: 1 },
          { colSpan: 4, rowSpan: 1 },
          { colSpan: 3, rowSpan: 1 },
          { colSpan: 3, rowSpan: 1 },
          { colSpan: 3, rowSpan: 1 },
          { colSpan: 3, rowSpan: 1 },
        ],
      };
    }

    const columns = (count === 2 || count === 4) ? 2 : 3;
    const rows = Math.max(1, Math.ceil(count / columns));
    const spans = Array.from({ length: count }, () => ({ colSpan: 1, rowSpan: 1 }));

    return { columns, rows, spans };
  };

  const scrollToBottom = (smooth = true) => {
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
    openChatWith,
    createGroupChat,
    sendTypingState,
    sendMessageToUser,
    sendChatMessage,
    sendMessagesWithImages,
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
    messageInput,
    attachedImages,
    editingMessage,
    replyingTo,
    lastActivityTime,
    markReadTimeoutRef,
    sendInFlightRef,
    sendCooldownUntilRef,
    lastProtocolSeqRef,
    lastProtocolMsgIdRef,
    typingThrottleRef,
    isFirstLoadRef,
    messagesEndRef,
    setFriends,
    setIncomingRequests,
    setOutgoingRequests,
    setLoading,
    setSearchResults,
    setMessages,
    setChats,
    setSelectedChat,
    setActiveTab,
    setReplyingTo,
    setMessageInput,
    setAttachedImages,
    setEditingMessage,
    setUploadingImages,
    scrollToBottom,
  });


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
    observerRef,
    observedMessagesRef,
    messages,
    userId,
    markChatRead,
    setIncomingRequests,
    setOutgoingRequests,
    setFriends,
    setChats,
    setMessages,
    loadFriends,
    loadIncomingRequests,
    loadOutgoingRequests,
    refreshSearchIfNeeded,
    loadChats,
    showDesktopNotification,
    processedMessageIds,
    typingUsersByChat,
    setTypingUsersByChat,
    typingTimeoutsRef,
    setPresenceByUser,
    setContextMenu,
    contextMenu,
    activeTab,
    loadMessages,
    searchQuery,
    setSearchResults,
    searchUsers,
    disableBodyScrollLock: isPageMode,
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
    messages,
    setMessages,
    messageInput,
    setMessageInput,
    typingUsersByChat,
    setTypingUsersByChat,
    presenceByUser,
    setPresenceByUser,
    lastActivityTime,
    setLastActivityTime,
    replyingTo,
    setReplyingTo,
    editingMessage,
    setEditingMessage,
    contextMenu,
    setContextMenu,
    uploadingImages,
    setUploadingImages,
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
    typingTimeoutsRef,
    typingThrottleRef,
    isFirstLoadRef,
    observerRef,
    observedMessagesRef,
    processedMessageIds,
    selectedChatRef,
    userRef,
    isOpenRef,
    friendsRef,
    chatsRef,
    getImageGridLayout,
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
    openChatWith,
    createGroupChat,
    sendTypingState,
    sendMessageToUser,
    sendChatMessage,
    sendMessagesWithImages,
    attachImage,
    removeAttachedImage,
    editMessage,
    deleteMessage,
    copyMessageText,
    uploadImage,
  };
}

export type SocialFloatingModel = ReturnType<typeof useSocialFloatingModel>;

