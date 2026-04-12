import { useEffect, useRef } from 'react';
import { http } from '@/shared/api/http';
import { endpoints } from '@/shared/api/endpoints';
import { secureChatClient } from '@/shared/auth/secureChat';
import { logger } from '@/shared/lib/logger';
import { useChatReadTracking } from './useChatReadTracking';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type {
  ChatPresenceResponse,
  ChatPresenceState,
  ChatMessage,
  Friend,
  FriendRequest,
  FriendsListResponse,
  PrivateChat,
  UserSearchResult,
} from '@/shared/api/types';

type SocialFloatingEffectsContext = {
  selectedChatRef: MutableRefObject<number | null>;
  selectedChat: number | null;
  userRef: MutableRefObject<any>;
  user: any;
  isOpenRef: MutableRefObject<boolean>;
  isOpen: boolean;
  friendsRef: MutableRefObject<Friend[]>;
  friends: Friend[];
  chatsRef: MutableRefObject<PrivateChat[]>;
  chats: PrivateChat[];
  setLastActivityTime: Dispatch<SetStateAction<number>>;
  lastActivityTime: number;
  setAutoScrollLocked: Dispatch<SetStateAction<boolean>>;
  messages: ChatMessage[];
  userId: string;
  markChatRead: (chatId: number, lastId: number) => Promise<void>;
  setIncomingRequests: Dispatch<SetStateAction<FriendRequest[]>>;
  setOutgoingRequests: Dispatch<SetStateAction<FriendRequest[]>>;
  setFriends: Dispatch<SetStateAction<Friend[]>>;
  setChats: Dispatch<SetStateAction<PrivateChat[]>>;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  loadFriends: () => Promise<void>;
  loadIncomingRequests: () => Promise<void>;
  loadOutgoingRequests: () => Promise<void>;
  refreshSearchIfNeeded: () => void;
  loadChats: () => Promise<void>;
  showDesktopNotification: (msg: any, currentUserId: string) => void;
  processedMessageIds: MutableRefObject<Set<number | string>>;
  typingUsersByChat: Record<number, string[]>;
  setTypingUsersByChat: Dispatch<SetStateAction<Record<number, string[]>>>;
  typingTimeoutsRef: MutableRefObject<Map<string, number>>;
  presenceByUser: Record<string, ChatPresenceState>;
  setPresenceByUser: Dispatch<SetStateAction<Record<string, ChatPresenceState>>>;
  setContextMenu: Dispatch<SetStateAction<{ x: number; y: number; message: ChatMessage } | null>>;
  contextMenu: { x: number; y: number; message: ChatMessage } | null;
  activeTab: string;
  loadMessages: (chatId: number, append?: boolean) => Promise<void>;
  searchQuery: string;
  setSearchResults: Dispatch<SetStateAction<UserSearchResult[]>>;
  searchUsers: () => Promise<void>;
  setIsWsConnecting: Dispatch<SetStateAction<boolean>>;
  disableBodyScrollLock?: boolean;
};

export function useSocialFloatingEffects(ctx: SocialFloatingEffectsContext) {
  const {
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
    setAutoScrollLocked,
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
    presenceByUser,
    setPresenceByUser,
    setContextMenu,
    contextMenu,
    activeTab,
    loadMessages,
    searchQuery,
    setSearchResults,
    searchUsers,
    setIsWsConnecting,
    disableBodyScrollLock,
  } = ctx;

  const AUTO_SCROLL_IDLE_LOCK_MS = 60_000;
  const PRESENCE_SYNC_INTERVAL_MS = 20_000;
  const lastSentPresenceGateRef = useRef<boolean | null>(null);
  const lastPresenceSyncAtRef = useRef(0);

  const parsePresenceTimestamp = (value?: string | null): number | null => {
    if (!value) return null;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const mergeHttpPresenceState = (
    previous: ChatPresenceState | undefined,
    response: ChatPresenceResponse
  ): ChatPresenceState => {
    const nextOnline = !!response.online;
    const incomingLastSeenAt = response.lastSeenAt ?? null;

    if (nextOnline) {
      return {
        online: true,
        lastSeenAt: previous?.lastSeenAt ?? incomingLastSeenAt ?? null,
        resolved: true,
      };
    }

    if (!previous?.resolved || previous?.online) {
      return {
        online: false,
        lastSeenAt: incomingLastSeenAt ?? previous?.lastSeenAt ?? null,
        resolved: true,
      };
    }

    const previousTs = parsePresenceTimestamp(previous.lastSeenAt ?? null);
    const incomingTs = parsePresenceTimestamp(incomingLastSeenAt);

    if (previousTs == null) {
      return {
        online: false,
        lastSeenAt: incomingLastSeenAt ?? null,
        resolved: true,
      };
    }

    if (incomingTs != null && incomingTs <= previousTs) {
      return {
        online: false,
        lastSeenAt: incomingLastSeenAt,
        resolved: true,
      };
    }

    return {
      online: false,
      lastSeenAt: previous.lastSeenAt ?? incomingLastSeenAt ?? null,
      resolved: true,
    };
  };

  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);
  
  useEffect(() => {
    userRef.current = user;
  }, [user]);
  
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') {
        setAutoScrollLocked(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [setAutoScrollLocked]);

  useEffect(() => {
    if (!user || !isOpen || activeTab !== 'chat' || !selectedChat) {
      return;
    }

    const elapsed = Date.now() - lastActivityTime;
    if (elapsed >= AUTO_SCROLL_IDLE_LOCK_MS) {
      setAutoScrollLocked(true);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setAutoScrollLocked(true);
    }, AUTO_SCROLL_IDLE_LOCK_MS - elapsed + 40);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [user, isOpen, activeTab, selectedChat, lastActivityTime, setAutoScrollLocked]);

  useEffect(() => {
    if (!user || !isOpen || activeTab !== 'chat' || !selectedChat) {
      return;
    }

    const unlockAutoScroll = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const inChatScrollContainer = target.closest('[data-chat-scroll-container="true"]');
      if (!inChatScrollContainer) {
        return;
      }

      setAutoScrollLocked(false);
    };

    document.addEventListener('wheel', unlockAutoScroll, { capture: true, passive: true });
    document.addEventListener('touchmove', unlockAutoScroll, { capture: true, passive: true });

    return () => {
      document.removeEventListener('wheel', unlockAutoScroll, true);
      document.removeEventListener('touchmove', unlockAutoScroll, true);
    };
  }, [user, isOpen, activeTab, selectedChat, setAutoScrollLocked]);

  useEffect(() => {
    if (!user) {
      lastSentPresenceGateRef.current = null;
      lastPresenceSyncAtRef.current = 0;
      return;
    }

    const resolvePresenceGateOpen = () => {
      if (!selectedChatRef.current) {
        return false;
      }
      if (!isOpenRef.current) {
        return false;
      }
      if (activeTab !== 'chat') {
        return false;
      }
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return false;
      }
      const idleMs = Date.now() - lastActivityTime;
      return idleMs <= AUTO_SCROLL_IDLE_LOCK_MS;
    };

    const syncPresenceGate = async (force = false) => {
      const shouldBeOnline = resolvePresenceGateOpen();
      const now = Date.now();
      const shouldResync = now - lastPresenceSyncAtRef.current >= PRESENCE_SYNC_INTERVAL_MS;
      if (!force && !shouldResync && lastSentPresenceGateRef.current === shouldBeOnline) {
        return;
      }

      try {
        await secureChatClient.setPresenceState(shouldBeOnline);
        lastSentPresenceGateRef.current = shouldBeOnline;
        lastPresenceSyncAtRef.current = now;
      } catch {
        // ignore transient WS state and retry on next tick
      }
    };

    void syncPresenceGate(true);
    const intervalId = window.setInterval(() => {
      void syncPresenceGate(false);
    }, 1_000);

    const handleVisibilityOrFocus = () => {
      void syncPresenceGate(true);
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [user, activeTab, isOpen, selectedChat, lastActivityTime]);

  useChatReadTracking({
    selectedChatRef,
    selectedChat,
    userRef,
    user,
    isOpenRef,
    activeTab,
    messages,
    lastActivityTime,
    setLastActivityTime,
    markChatRead,
  });

  useEffect(() => {
    if (!isOpen || disableBodyScrollLock) return;

    const body = document.body;
    const html = document.documentElement;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyPaddingRight = body.style.paddingRight;
    const prevHtmlOverflow = html.style.overflow;
    const scrollbarWidth = window.innerWidth - html.clientWidth;

    body.style.overflow = 'hidden';
    html.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      body.style.overflow = prevBodyOverflow;
      body.style.paddingRight = prevBodyPaddingRight;
      html.style.overflow = prevHtmlOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    friendsRef.current = friends;
  }, [friends]);

  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);

  useEffect(() => {
    if (!user) {
      setIsWsConnecting(false);
      return;
    }

    let cancelled = false;
    setIsWsConnecting(true);

    logger.chat('[chat_ws]', 'Connecting WebSocket for user:', userId);
    secureChatClient
      .connect()
      .catch((err) => console.error('Failed to connect:', err))
      .finally(() => {
        if (!cancelled) {
          setIsWsConnecting(false);
        }
      });

    return () => {
      cancelled = true;
      setIsWsConnecting(false);
      logger.chat('[chat_ws]', 'Disconnecting WebSocket');
      secureChatClient.disconnect();
      logger.chat('[chat_ws]', 'WebSocket disconnected');
    };
  }, [user, userId, setIsWsConnecting]);

  useEffect(() => {
    logger.chat('РЎР‚РЎСџРІР‚СњР Р‰', 'Setting up WebSocket subscription (ONCE on mount)');

    const unsubscribe = secureChatClient.onMessage(async (wsMessage) => {
      const currentUser = userRef.current;
      const currentChatId = selectedChatRef.current;

      if (!currentUser) return;

      if (wsMessage.type === 'friend_request') {
        const req = wsMessage.friendRequest ?? {
          userId: wsMessage.userId,
          displayName: wsMessage.displayName,
          username: wsMessage.username,
          requestId: wsMessage.requestId,
        };
        logger.chat('[friend_request]', 'New friend request received:', req);
        setIncomingRequests(prev => {
          if (req.requestId && prev.some(r => r.requestId === req.requestId)) return prev;
          if (prev.some(r => r.userId === req.userId)) return prev;
          return [req as any, ...prev];
        });
        loadIncomingRequests();
        loadOutgoingRequests();
        return;
      }

      if (wsMessage.type === 'friend_accept') {
        const reqUserId = wsMessage.friendRequest?.userId || wsMessage.userId;
        logger.chat('[friend_accept]', 'Friend request accepted:', wsMessage.friendRequest || wsMessage);
        if (reqUserId) {
          setIncomingRequests(prev => prev.filter(r => r.userId !== reqUserId));
          setOutgoingRequests(prev => prev.filter(r => r.userId !== reqUserId));
        }
        try {
          const { data } = await http.get<FriendsListResponse>(endpoints.friendsList);
          setFriends(data.friends);
          logger.chat('[friend_accept]', 'Friends list updated after accept');
        } catch (err) {
          logger.error('Failed to reload friends:', err);
        }
        loadOutgoingRequests();
        loadIncomingRequests();
        refreshSearchIfNeeded();
        return;
      }

      if (wsMessage.type === 'friend_reject') {
        const reqUserId = wsMessage.friendRequest?.userId || wsMessage.userId;
        logger.chat('[friend_reject]', 'Friend request rejected:', wsMessage.friendRequest || wsMessage);
        if (reqUserId) {
          setIncomingRequests(prev => prev.filter(r => r.userId !== reqUserId));
          setOutgoingRequests(prev => prev.filter(r => r.userId !== reqUserId));
        }
        loadIncomingRequests();
        loadOutgoingRequests();
        refreshSearchIfNeeded();
        return;
      }

      if (wsMessage.type === 'friend_removed') {
        const removerId = wsMessage.friendRequest?.userId || wsMessage.userId;
        logger.chat('[friend_removed]', 'Friend removed you:', wsMessage.friendRequest || wsMessage);
        if (removerId) {
          setFriends(prev => prev.filter(f => f.userId !== removerId));
          setOutgoingRequests(prev => prev.filter(r => r.userId !== removerId));
          setIncomingRequests(prev => prev.filter(r => r.userId !== removerId));
          setChats(prev =>
            prev.filter(
              (c) => c.chatType !== 'PRIVATE' || !c.participantId || c.participantId !== removerId
            )
          );
        }
        try {
          const { data } = await http.get<FriendsListResponse>(endpoints.friendsList);
          setFriends(data.friends);
        } catch (err) {
          logger.error('Failed to reload friends after removal:', err);
        }
        loadChats();
        loadIncomingRequests();
        loadOutgoingRequests();
        refreshSearchIfNeeded();
        return;
      }

      if (wsMessage.type === 'chat_list_changed') {
        logger.chat('[chat_list_changed]', 'Refreshing chat list for chat:', wsMessage.chatId);
        loadChats();
        return;
      }

      if (wsMessage.type === 'typing_state' && wsMessage.chatId && wsMessage.userId) {
        if (wsMessage.userId === currentUser.id) {
          return;
        }

        const chatId = wsMessage.chatId;
        const typing = !!wsMessage.typing;
        const timeoutKey = `${chatId}:${wsMessage.userId}`;
        const clearTypingTimeout = () => {
          const timerId = typingTimeoutsRef.current.get(timeoutKey);
          if (timerId !== undefined) {
            window.clearTimeout(timerId);
            typingTimeoutsRef.current.delete(timeoutKey);
          }
        };
        const removeTypingUser = () => {
          setTypingUsersByChat((prev) => {
            const currentUsers = prev[chatId] ?? [];
            if (!currentUsers.includes(wsMessage.userId!)) {
              return prev;
            }
            const nextUsers = currentUsers.filter((id) => id !== wsMessage.userId);
            const next = { ...prev };
            if (nextUsers.length === 0) {
              delete next[chatId];
            } else {
              next[chatId] = nextUsers;
            }
            return next;
          });
        };

        clearTypingTimeout();
        if (typing) {
          setTypingUsersByChat((prev) => {
            const currentUsers = prev[chatId] ?? [];
            if (currentUsers.includes(wsMessage.userId!)) {
              return prev;
            }
            return { ...prev, [chatId]: [...currentUsers, wsMessage.userId!] };
          });
          const timerId = window.setTimeout(() => {
            removeTypingUser();
            typingTimeoutsRef.current.delete(timeoutKey);
          }, 7000);
          typingTimeoutsRef.current.set(timeoutKey, timerId);
        } else {
          removeTypingUser();
        }
        return;
      }

      if (wsMessage.type === 'presence_changed' && wsMessage.userId) {
        setPresenceByUser((prev) => {
          const previous = prev[wsMessage.userId!];
          const nextLastSeenAt = wsMessage.online
            ? previous?.lastSeenAt ?? null
            : wsMessage.lastSeenAt ?? previous?.lastSeenAt ?? null;
          return {
            ...prev,
            [wsMessage.userId!]: {
              online: !!wsMessage.online,
              lastSeenAt: nextLastSeenAt,
              resolved: true,
            },
          };
        });
        return;
      }

      if (wsMessage.type === 'message_read' && wsMessage.chatId && wsMessage.lastReadMessageId) {
        console.log('РІСљвЂ¦ Received message_read event for chat', wsMessage.chatId, 'up to message', wsMessage.lastReadMessageId);
        setChats(prev => prev.map(c => {
          if (c.chatId !== wsMessage.chatId || !c.lastMessage) return c;
          if (c.lastMessage.senderId !== currentUser.id) return c;
          if (typeof c.lastMessage.messageId === 'string') return c;
          if (c.lastMessage.messageId > wsMessage.lastReadMessageId!) return c;
          return { ...c, lastMessage: { ...c.lastMessage, isRead: true } };
        }));
        setMessages(prev => prev.map(m =>
          typeof m.messageId === 'number' && m.messageId <= wsMessage.lastReadMessageId! && m.senderId === currentUser.id
            ? { ...m, isRead: true }
            : m
        ));
        loadChats();
        return;
      }

      if (wsMessage.type === 'message_edited' && wsMessage.chatId && wsMessage.messageId) {
        console.log('РІСљРЏРїС‘РЏ Received message_edited event for chat', wsMessage.chatId, 'message', wsMessage.messageId);
        
        loadChats();

        if (selectedChatRef.current !== wsMessage.chatId) {
          return;
        }
        
        if (wsMessage.message?.content !== undefined) {
          setMessages(prev => prev.map(m =>
            m.messageId === wsMessage.messageId
              ? {
                  ...m,
                  content: wsMessage.message!.content!,
                  entities: wsMessage.message?.entities ?? m.entities,
                  edited: true,
                }
              : m
          ));
        }
        return;
      }

      if (wsMessage.type === 'message_deleted' && wsMessage.chatId && wsMessage.messageId) {
        console.log('СЂСџвЂ”вЂРїС‘РЏ Received message_deleted event for chat', wsMessage.chatId, 'message', wsMessage.messageId);
        if (selectedChatRef.current === wsMessage.chatId) {
          setMessages(prev => prev.filter(m => m.messageId !== wsMessage.messageId));
        }
        loadChats();
        return;
      }

      if (wsMessage.type !== 'new_message') return;

      const msg = wsMessage.message! as any;
      const mergeMediaImages = (
        incomingImages: any[] | undefined,
        existingImages: any[] | undefined
      ) => {
        if (!incomingImages || incomingImages.length === 0) {
          return existingImages;
        }

        const isNonEmptyString = (value: unknown): value is string =>
          typeof value === 'string' && value.trim().length > 0;

        const matchByIdentity = (left: any, right: any) => {
          const leftPath = isNonEmptyString(left?.imagePath) ? left.imagePath : undefined;
          const rightPath = isNonEmptyString(right?.imagePath) ? right.imagePath : undefined;
          if (leftPath && rightPath) {
            return leftPath === rightPath;
          }

          const leftName = isNonEmptyString(left?.fileName) ? left.fileName : undefined;
          const rightName = isNonEmptyString(right?.fileName) ? right.fileName : undefined;
          if (!leftName || !rightName || leftName !== rightName) {
            return false;
          }

          const leftSize = typeof left?.sizeBytes === 'number' ? left.sizeBytes : undefined;
          const rightSize = typeof right?.sizeBytes === 'number' ? right.sizeBytes : undefined;
          if (leftSize !== undefined && rightSize !== undefined && leftSize !== rightSize) {
            return false;
          }

          const leftType = isNonEmptyString(left?.contentType) ? left.contentType : undefined;
          const rightType = isNonEmptyString(right?.contentType) ? right.contentType : undefined;
          if (leftType && rightType && leftType !== rightType) {
            return false;
          }

          return true;
        };

        return incomingImages.map((incoming, index) => {
          const existing =
            existingImages?.[index] ||
            existingImages?.find((candidate: any) => {
              if (!candidate) return false;
              return matchByIdentity(incoming, candidate);
            });

          if (!existing) {
            return incoming;
          }

          return {
            ...existing,
            ...incoming,
            imagePath: incoming?.imagePath || existing.imagePath,
            imageUrl: incoming?.imageUrl || existing.imageUrl,
            fileName: incoming?.fileName || existing.fileName,
            contentType: incoming?.contentType || existing.contentType,
            sizeBytes: incoming?.sizeBytes ?? existing.sizeBytes,
            isImage: incoming?.isImage ?? existing.isImage,
            imageKeyVersion: incoming?.imageKeyVersion ?? existing.imageKeyVersion,
          };
        });
      };

      const resolvePrimaryImageUrl = (
        directImageUrl: string | undefined,
        images: any[] | undefined
      ) => {
        if (directImageUrl) return directImageUrl;
        if (!images || images.length === 0) return undefined;
        return images.find((img: any) => !!img?.imageUrl)?.imageUrl;
      };

      logger.chat('СЂСџвЂњРЃ', 'WebSocket message received:', wsMessage);

      if (
        (
          msg.messageType === 'image' ||
          msg.messageType === 'images' ||
          msg.messageType === 'file' ||
          msg.messageType === 'files' ||
          msg.messageType === 'voice' ||
          msg.messageType === 'circle'
        ) &&
        (msg.imageUrl || (msg.images && msg.images.length)) &&
        processedMessageIds.current.has(msg.messageId)
      ) {
        console.log('СЂСџвЂќвЂћ Updating existing image message with imageUrl:', msg.messageId);
        
        // Р С›Р В±Р Р…Р С•Р Р†Р В»РЎРЏР ВµР С Р Р† РЎРѓР С—Р С‘РЎРѓР С”Р Вµ РЎвЂЎР В°РЎвЂљР С•Р Р†
        setChats(prev => prev.map(c => {
          if (c.chatId !== msg.chatId || !c.lastMessage || c.lastMessage.messageId !== msg.messageId) return c;
          const mergedImages = mergeMediaImages(msg.images, c.lastMessage.images as any[] | undefined);
          return {
            ...c,
            lastMessage: { 
              ...c.lastMessage, 
              imageUrl: resolvePrimaryImageUrl(msg.imageUrl, mergedImages) || c.lastMessage.imageUrl, 
              images: mergedImages || c.lastMessage.images 
            }
          };
        }));
        
        // Р С›Р В±Р Р…Р С•Р Р†Р В»РЎРЏР ВµР С Р Р† РЎРѓР С—Р С‘РЎРѓР С”Р Вµ РЎРѓР С•Р С•Р В±РЎвЂ°Р ВµР Р…Р С‘Р в„–
        if (currentChatId === msg.chatId) {
          setMessages(prev =>
            prev.map(m => {
              if (m.messageId !== msg.messageId) return m;
              const mergedImages = mergeMediaImages(msg.images, m.images as any[] | undefined);
              return {
                ...m,
                imageUrl: resolvePrimaryImageUrl(msg.imageUrl, mergedImages) || m.imageUrl,
                images: mergedImages || m.images,
              };
            })
          );
        }
        
        return;
      }

      if (processedMessageIds.current.has(msg.messageId)) {
        logger.chat('РІС™В РїС‘РЏ', 'Message already processed, skipping:', msg.messageId);
        return;
      }
      processedMessageIds.current.add(msg.messageId);

      showDesktopNotification(msg, currentUser.id);

      setChats(prev => prev.map(c => {
        if (c.chatId !== msg.chatId) return c;
        const lastMessage = c.lastMessage;

        const existingContent =
          lastMessage && lastMessage.messageId === msg.messageId
            ? lastMessage.content
            : undefined;
        const existingImages =
          lastMessage && lastMessage.messageId === msg.messageId
            ? (lastMessage.images as any[] | undefined)
            : undefined;
        const mergedImages = mergeMediaImages(msg.images, existingImages);

        return {
          ...c,
          lastMessage: {
            messageId: msg.messageId,
            senderId: msg.senderId,
            senderUsername: msg.senderUsername,
            senderDisplayName: msg.senderDisplayName,
            content: (existingContent ?? msg.content) || '',
            entities: msg.entities,
            messageType: msg.messageType,
            imagePath: msg.imagePath,
            imageUrl: resolvePrimaryImageUrl(msg.imageUrl, mergedImages),
            images: mergedImages,
            createdAt: msg.createdAt,
            encryptionMetadata: '',
            replyToId: msg.replyToId,
            replyToMessage: msg.replyToMessage,
            isRead: msg.isRead
          },
        };
      }));

      if (currentChatId === msg.chatId) {
        setMessages((prev) => {
          const existingIndex = prev.findIndex(m => m.messageId === msg.messageId);
          if (existingIndex !== -1) {
            const existing = prev[existingIndex];
            if (
              msg.messageType === 'image' ||
              msg.messageType === 'images' ||
              msg.messageType === 'file' ||
              msg.messageType === 'files' ||
              msg.messageType === 'voice' ||
              msg.messageType === 'circle'
            ) {
              const updated = [...prev];
              const mergedImages = mergeMediaImages(msg.images, existing.images as any[] | undefined);
              updated[existingIndex] = {
                ...existing,
                imageUrl: resolvePrimaryImageUrl(msg.imageUrl, mergedImages) || existing.imageUrl,
                imagePath: msg.imagePath || existing.imagePath,
                images: mergedImages || existing.images,
                entities: msg.entities ?? existing.entities,
              } as ChatMessage;
              return updated;
            }
            return prev;
          }
          
            if (msg.senderId === currentUser.id) {
              const incomingPrimary = Array.isArray(msg.images) && msg.images.length > 0 ? msg.images[0] : undefined;
              const incomingIdentity = {
                imagePath: msg.imagePath ?? incomingPrimary?.imagePath,
                fileName: incomingPrimary?.fileName,
                contentType: incomingPrimary?.contentType,
                sizeBytes: incomingPrimary?.sizeBytes,
              };

              const matchByIdentity = (candidate: any) => {
                if (!candidate) return false;

                const candidatePrimary =
                  Array.isArray(candidate.images) && candidate.images.length > 0
                    ? candidate.images[0]
                    : undefined;
                const candidateIdentity = {
                  imagePath: candidate.imagePath ?? candidatePrimary?.imagePath,
                  fileName: candidatePrimary?.fileName,
                  contentType: candidatePrimary?.contentType,
                  sizeBytes: candidatePrimary?.sizeBytes,
                };

                const incomingPath =
                  typeof incomingIdentity.imagePath === 'string' && incomingIdentity.imagePath.trim().length > 0
                    ? incomingIdentity.imagePath
                    : undefined;
                const candidatePath =
                  typeof candidateIdentity.imagePath === 'string' && candidateIdentity.imagePath.trim().length > 0
                    ? candidateIdentity.imagePath
                    : undefined;
                if (incomingPath && candidatePath) {
                  return incomingPath === candidatePath;
                }

                const incomingName =
                  typeof incomingIdentity.fileName === 'string' && incomingIdentity.fileName.trim().length > 0
                    ? incomingIdentity.fileName
                    : undefined;
                const candidateName =
                  typeof candidateIdentity.fileName === 'string' && candidateIdentity.fileName.trim().length > 0
                    ? candidateIdentity.fileName
                    : undefined;
                if (!incomingName || !candidateName || incomingName !== candidateName) {
                  return false;
                }

                const incomingSize = typeof incomingIdentity.sizeBytes === 'number' ? incomingIdentity.sizeBytes : undefined;
                const candidateSize = typeof candidateIdentity.sizeBytes === 'number' ? candidateIdentity.sizeBytes : undefined;
                if (incomingSize !== undefined && candidateSize !== undefined && incomingSize !== candidateSize) {
                  return false;
                }

                return true;
              };

              let tempIndex = -1;
              for (let i = prev.length - 1; i >= 0; i--) {
                const candidate = prev[i];
                const localIdMatch =
                  candidate.localId === msg.localId ||
                  (typeof candidate.messageId === 'string' && candidate.messageId.toString().startsWith('local-'));
                const identityMatch = matchByIdentity(candidate);
                const candidateStatus = candidate.status;
                if (
                  candidate.messageType === msg.messageType &&
                  (candidateStatus === 'pending' || candidateStatus === 'sent') &&
                  (localIdMatch || identityMatch)
                ) {
                  tempIndex = i;
                  break;
                }
              }
            
            if (tempIndex !== -1) {
              const tempMsg = prev[tempIndex];
              const mergedImages = mergeMediaImages(msg.images, tempMsg.images as any[] | undefined);
              
              const newMessages = [...prev];
              newMessages[tempIndex] = {
                ...tempMsg,
                ...msg,
                localId: tempMsg.localId ?? tempMsg.messageId,
                messageId: msg.messageId,
                status: msg.isRead ? 'read' : 'sent',
                content: tempMsg.content || msg.content || '',
                images: mergedImages || tempMsg.images,
                imageUrl:
                  resolvePrimaryImageUrl(msg.imageUrl, mergedImages) ?? tempMsg.imageUrl,
                imagePath: msg.imagePath ?? tempMsg.imagePath,
                replyToMessage: (msg.replyToMessage ?? tempMsg.replyToMessage) as ChatMessage | undefined,
              } as ChatMessage;
              
              return newMessages;
            }
          }

          // Р вЂўРЎРѓР В»Р С‘ РЎРЊРЎвЂљР С• Р Р…Р С•Р Р†Р С•Р Вµ РЎРѓР С•Р С•Р В±РЎвЂ°Р ВµР Р…Р С‘Р Вµ (Р Р…Р Вµ Р С•РЎвЂљ Р Р…Р В°РЎРѓ Р С‘Р В»Р С‘ Р Р…Р ВµРЎвЂљ Р Р†РЎР‚Р ВµР СР ВµР Р…Р Р…Р С•Р С–Р С•), Р Т‘Р С•Р В±Р В°Р Р†Р В»РЎРЏР ВµР С
          let replyToMessage = msg.replyToMessage as ChatMessage | undefined;
          if (!replyToMessage && msg.replyToId) {
            replyToMessage = prev.find(m => m.messageId === msg.replyToId);
          }
          
          return [...prev, {
            messageId: msg.messageId,
            senderId: msg.senderId,
            senderUsername: msg.senderUsername,
            senderDisplayName: msg.senderDisplayName,
            content: msg.content || '',
            entities: msg.entities,
            messageType: msg.messageType,
            imagePath: msg.imagePath,
            imageUrl: resolvePrimaryImageUrl(msg.imageUrl, msg.images),
            images: msg.images,
            createdAt: msg.createdAt,
            isRead: msg.isRead, // РІВРѓРїС‘РЏ Р вЂќР С•Р Р†Р ВµРЎР‚РЎРЏР ВµР С РЎРѓР ВµРЎР‚Р Р†Р ВµРЎР‚РЎС“ - Р С•Р Р… Р В·Р Р…Р В°Р ВµРЎвЂљ Р С—РЎР‚Р В°Р Р†Р С‘Р В»РЎРЉР Р…РЎвЂ№Р в„– РЎРѓРЎвЂљР В°РЎвЂљРЎС“РЎРѓ
            replyToId: msg.replyToId,
            replyToMessage,
          } as ChatMessage];
        });
       
      }

    });

    return () => {
      logger.chat('СЂСџвЂќРЉ', 'Unsubscribing from WebSocket');
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    loadIncomingRequests();
    loadOutgoingRequests();
    logger.chat('РЎР‚РЎСџРІР‚СљР вЂ°', 'Loading initial friend requests for badge counts');
  }, [user]);

  useEffect(() => {
    if (!user || !isOpen) return;
    loadFriends();
    loadChats();
    loadIncomingRequests();
    loadOutgoingRequests();
  }, [user, isOpen]);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    const handleScroll = () => setContextMenu(null);
    
    if (contextMenu) {
      document.addEventListener('click', handleClick);
      document.addEventListener('scroll', handleScroll, true);
      return () => {
        document.removeEventListener('click', handleClick);
        document.removeEventListener('scroll', handleScroll, true);
      };
    }
  }, [contextMenu]);

  useEffect(() => {
    if (!selectedChat || !user) return;
    const chat = chats.find((item) => item.chatId === selectedChat);
    if (!chat || chat.chatType !== 'GROUP') return;

    const participantIds = chat.participantIds ?? [];
    const uniqueParticipantIds = Array.from(
      new Set(
        participantIds.filter(
          (id): id is string => !!id && id !== userId
        )
      )
    );
    const unresolvedParticipantIds = uniqueParticipantIds.filter(
      (id) => !presenceByUser[id]?.resolved
    );
    if (unresolvedParticipantIds.length === 0) return;

    let cancelled = false;
    (async () => {
      const loadedStates = await Promise.all(
        unresolvedParticipantIds.map(async (targetUserId) => {
          try {
            const { data } = await http.get<ChatPresenceResponse>(endpoints.chatPresence(targetUserId));
            return { targetUserId, data };
          } catch (err) {
            logger.warn('Failed to load chat presence', { targetUserId, err });
            return null;
          }
        })
      );

      if (cancelled) return;

        setPresenceByUser((prev) => {
          let changed = false;
          const next = { ...prev };

          for (const loadedState of loadedStates) {
            if (!loadedState) continue;
            const { targetUserId, data } = loadedState;
            const previous = prev[targetUserId];
            const nextState = mergeHttpPresenceState(previous, data);

            if (
              previous?.online !== nextState.online
              || (previous?.lastSeenAt ?? null) !== (nextState.lastSeenAt ?? null)
              || previous?.resolved !== true
          ) {
            next[targetUserId] = nextState;
            changed = true;
          }
        }

        return changed ? next : prev;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedChat, user, userId, chats, presenceByUser, setPresenceByUser]);

  useEffect(() => {
    if (!selectedChat || !user || !isOpen || activeTab !== 'chat') return;
    const chat = chats.find((item) => item.chatId === selectedChat);
    if (!chat || chat.chatType !== 'PRIVATE') return;
    const participantId = chat.participantId;
    if (!participantId || participantId === userId) return;

    let cancelled = false;

    const refreshPresence = async () => {
      try {
        const { data } = await http.get<ChatPresenceResponse>(endpoints.chatPresence(participantId));
        if (cancelled) return;

        setPresenceByUser((prev) => {
          const previous = prev[participantId];
          const nextState = mergeHttpPresenceState(previous, data);

          if (
            previous?.online === nextState.online
            && (previous?.lastSeenAt ?? null) === (nextState.lastSeenAt ?? null)
            && previous?.resolved === true
          ) {
            return prev;
          }

          return { ...prev, [participantId]: nextState };
        });
      } catch (err) {
        logger.warn('Failed to refresh private chat presence', { participantId, err });
      }
    };

    void refreshPresence();
    const intervalId = window.setInterval(() => {
      void refreshPresence();
    }, 20_000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshPresence();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [selectedChat, user, userId, chats, isOpen, activeTab, setPresenceByUser]);

  useEffect(() => {
    if (!selectedChat || !isOpen || activeTab !== 'chat') return;
    loadMessages(selectedChat, false);
  }, [selectedChat, isOpen, activeTab]);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      searchUsers();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    return () => {
      typingTimeoutsRef.current.forEach((timerId) => window.clearTimeout(timerId));
      typingTimeoutsRef.current.clear();
    };
  }, []);

}



