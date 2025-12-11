import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { http } from '@/shared/api/http';
import { endpoints } from '@/shared/api/endpoints';
import { authStore } from '@/shared/store/auth';
import { secureChatClient } from '@/shared/auth/secureChat';
import { logger } from '@/shared/lib/logger';
import { useSessionKeyStore } from '@/stores/sessionKeyStore';
import { ImageWithLoader, UploadProgress } from '@/shared/ui/image';
import type { 
  Friend, 
  FriendRequest, 
  UserSearchResult,
  FriendsListResponse,
  FriendRequestsResponse,
  UserSearchResponse,
  PrivateChat,
  ChatMessage,
  ChatListResponse,
  ChatMessagesResponse,
  SendMessageResponse,
  CreateChatResponse,
  UploadImageResponse
} from '@/shared/api/types';

type Tab = 'friends' | 'search' | 'requests' | 'chat';
type RequestsSubTab = 'incoming' | 'outgoing';
type ImageGridLayout = {
  columns: number;
  rows: number;
  spans: { colSpan: number; rowSpan: number }[];
};

export function SocialFloatingButton() {
  const user = authStore(s => s.user);
  const userId = user?.id || '';
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('friends');
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
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; message: ChatMessage } | null>(null);
  const [uploadingImages, setUploadingImages] = useState<Map<string, { progress: number; file: File }>>(new Map());

  const [attachedImages, setAttachedImages] = useState<Array<{
    id: string;
    file: File;
    preview?: string;
    uploadedData?: UploadImageResponse;
    uploading?: boolean;
  }>>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const markReadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstLoadRef = useRef<boolean>(true);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const observedMessagesRef = useRef<Set<string>>(new Set());
  const processedMessageIds = useRef<Set<number | string>>(new Set());
  
  const selectedChatRef = useRef(selectedChat);
  const userRef = useRef(user);
  const isOpenRef = useRef(isOpen);

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
    if (!user) return;
    
    logger.chat('рџ”Њ', 'Connecting WebSocket for user:', userId);
    secureChatClient.connect().catch(err => console.error('Failed to connect:', err));
    
    return () => {
      logger.chat('рџ”Њ', 'Disconnecting WebSocket');
      secureChatClient.disconnect();
      logger.chat('🗑️', 'WebSocket disconnected');
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        logger.chat('👁️', 'Tab became visible');
        logger.chat('✅', 'Ready to receive messages from server');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, selectedChat, isOpen]);

  useEffect(() => {
    const updateActivity = () => setLastActivityTime(Date.now());
    
    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('click', updateActivity);
    window.addEventListener('scroll', updateActivity);
    
    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('click', updateActivity);
      window.removeEventListener('scroll', updateActivity);
    };
  }, []);

  useEffect(() => {
    if (!selectedChat || !user) return;

    const inactiveTime = Date.now() - lastActivityTime;
    if (inactiveTime > 300000) {
      console.log('⚠️ User inactive, observer paused');
      return;
    }

    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
              const messageEl = entry.target as HTMLElement;
              const messageId = messageEl.dataset.messageId;
              const senderId = messageEl.dataset.senderId;
              
              if (messageId && senderId && senderId !== userId && selectedChatRef.current) {
                console.log('👀 Message', messageId, 'is visible, marking as read');
                markChatRead(selectedChatRef.current, parseInt(messageId)).catch(() => {});
              }
            }
          });
        },
        {
          root: null,
          rootMargin: '0px',
          threshold: 0.5
        }
      );
    }

    const messageElements = document.querySelectorAll('.message-item');
    messageElements.forEach(el => {
      const htmlEl = el as HTMLElement;
      const messageId = htmlEl.dataset.messageId;
      if (messageId && !observedMessagesRef.current.has(messageId)) {
        observerRef.current?.observe(el);
        observedMessagesRef.current.add(messageId);
      }
    });

    return () => {
      if (selectedChatRef.current !== selectedChat) {
        observerRef.current?.disconnect();
        observerRef.current = null;
        observedMessagesRef.current.clear();
      }
    };
  }, [selectedChat, user, messages.length, lastActivityTime]); // ← Зависит от чата, юзера, новых сообщений и активности

  useEffect(() => {
    logger.chat('рџ”Њ', 'Setting up WebSocket subscription (ONCE on mount)');

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
        // Подтягиваем свежие данные (аватар, username, id)
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
          setChats(prev => prev.filter(c => c.participantId !== removerId));
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

      if (wsMessage.type === 'message_read' && wsMessage.chatId && wsMessage.lastReadMessageId) {
        console.log('✅ Received message_read event for chat', wsMessage.chatId, 'up to message', wsMessage.lastReadMessageId);
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
        console.log('✏️ Received message_edited event for chat', wsMessage.chatId, 'message', wsMessage.messageId);
        
        loadChats();

        if (selectedChatRef.current !== wsMessage.chatId) {
          return;
        }
        
        // ☁️ CLOUD MODEL: Server sends plaintext 'content' (already decrypted)
        if (wsMessage.message?.content !== undefined) {
          setMessages(prev => prev.map(m =>
            m.messageId === wsMessage.messageId
              ? { ...m, content: wsMessage.message!.content!, edited: true }
              : m
          ));
        }
        return;
      }

      if (wsMessage.type === 'message_deleted' && wsMessage.chatId && wsMessage.messageId) {
        console.log('🗑️ Received message_deleted event for chat', wsMessage.chatId, 'message', wsMessage.messageId);
        if (selectedChatRef.current === wsMessage.chatId) {
          setMessages(prev => prev.filter(m => m.messageId !== wsMessage.messageId));
        }
        loadChats();
        return;
      }

      if (wsMessage.type !== 'new_message') return;

      const msg = wsMessage.message! as any;

      logger.chat('📨', 'WebSocket message received:', wsMessage);
      console.log('📨 Received WebSocket new_message:', {
        messageId: msg.messageId,
        messageType: msg.messageType,
        hasImagePath: !!msg.imagePath,
        hasImageUrl: !!msg.imageUrl,
        hasImages: !!(msg.images && msg.images.length),
        imagePath: msg.imagePath,
        imageUrl: msg.imageUrl?.substring(0, 100)
      });

      if ((msg.messageType === 'image' || msg.messageType === 'images') && msg.imageUrl && processedMessageIds.current.has(msg.messageId)) {
        console.log('🔄 Updating existing image message with imageUrl:', msg.messageId);
        
        // Обновляем в списке чатов
        setChats(prev => prev.map(c => {
          if (c.chatId !== msg.chatId || !c.lastMessage || c.lastMessage.messageId !== msg.messageId) return c;
          return {
            ...c,
            lastMessage: { 
              ...c.lastMessage, 
              imageUrl: msg.imageUrl || c.lastMessage.imageUrl, 
              images: (msg.images && msg.images.length ? msg.images : c.lastMessage.images) 
            }
          };
        }));
        
        // Обновляем в списке сообщений
        if (currentChatId === msg.chatId) {
          setMessages(prev => prev.map(m => 
            m.messageId === msg.messageId 
              ? { 
                  ...m, 
                  imageUrl: msg.imageUrl || m.imageUrl, 
                  images: (msg.images && msg.images.length ? msg.images : m.images) 
                } 
              : m
          ));
        }
        
        return; // Не добавляем в processedMessageIds повторно
      }

      if (processedMessageIds.current.has(msg.messageId)) {
        logger.chat('⚠️', 'Message already processed, skipping:', msg.messageId);
        return;
      }
      processedMessageIds.current.add(msg.messageId);

      // Обновляем lastMessage в списке чатов локально (plaintext из WebSocket)
      setChats(prev => prev.map(c => {
        if (c.chatId !== msg.chatId) return c;

        const existingContent = c.lastMessage?.messageId === msg.messageId
          ? c.lastMessage?.content
          : undefined;

        return {
          ...c,
          lastMessage: {
            messageId: msg.messageId,
            senderId: msg.senderId,
            content: (existingContent ?? msg.content) || '',
            messageType: msg.messageType,
            imagePath: msg.imagePath,
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
          // Проверяем что сообщение не дублируется, НО если это image с imageUrl - обновляем
          const existingIndex = prev.findIndex(m => m.messageId === msg.messageId);
          if (existingIndex !== -1) {
            // Сообщение уже есть — обновляем медиаданные, если пришли реальные URL/токены
            const existing = prev[existingIndex];
            if (msg.messageType === 'image' || msg.messageType === 'images') {
              const updated = [...prev];
              updated[existingIndex] = {
                ...existing,
                // предпочитаем серверные url с токеном
                imageUrl: msg.imageUrl || existing.imageUrl,
                imagePath: msg.imagePath || existing.imagePath,
                images: msg.images?.length ? msg.images : existing.images,
              } as ChatMessage;
              return updated;
            }
            return prev;
          }
          
          if (msg.senderId === currentUser.id) {
            // Ищем последнее локальное отправляемое сообщение (pending) текущего типа
            let tempIndex = -1;
            for (let i = prev.length - 1; i >= 0; i--) {
              const candidate = prev[i];
              const localIdMatch =
                candidate.localId === msg.localId ||
                (typeof candidate.messageId === 'string' && candidate.messageId.toString().startsWith('local-'));
              if (
                candidate.messageType === msg.messageType &&
                candidate.status === 'pending' &&
                localIdMatch
              ) {
                tempIndex = i;
                break;
              }
            }
            
            if (tempIndex !== -1) {
              const tempMsg = prev[tempIndex];
              console.log('? Replacing local pending message', tempMsg.messageId, 'with real', msg.messageId);
              
              const newMessages = [...prev];
              newMessages[tempIndex] = {
                ...tempMsg,
                ...msg,
                localId: tempMsg.localId ?? tempMsg.messageId,
                messageId: msg.messageId,
                status: msg.isRead ? 'read' : 'sent',
                content: tempMsg.content || msg.content || '',
                images: (msg.images && msg.images.length ? msg.images : tempMsg.images),
                imageUrl: msg.imageUrl ?? tempMsg.imageUrl,
                imagePath: msg.imagePath ?? tempMsg.imagePath,
                replyToMessage: (msg.replyToMessage ?? tempMsg.replyToMessage) as ChatMessage | undefined,
              } as ChatMessage;
              
              return newMessages;
            }
          }

          // Если это новое сообщение (не от нас или нет временного), добавляем
          // ☁️ Пытаемся найти replyToMessage в загруженных сообщениях если сервер не прислал
          let replyToMessage = msg.replyToMessage as ChatMessage | undefined;
          if (!replyToMessage && msg.replyToId) {
            replyToMessage = prev.find(m => m.messageId === msg.replyToId);
          }
          
          return [...prev, {
            messageId: msg.messageId,
            senderId: msg.senderId,
            content: msg.content || '',  // ☁️ Plaintext from server
            messageType: msg.messageType,
            imagePath: msg.imagePath,
            imageUrl: msg.imageUrl,
            images: msg.images,  // 🖼️ Multiple images array
            createdAt: msg.createdAt,
            isRead: msg.isRead, // ☁️ Доверяем серверу - он знает правильный статус
            replyToId: msg.replyToId,
            replyToMessage,
          } as ChatMessage];
        });
       
        if (msg.senderId !== currentUser.id && isOpen && selectedChat === msg.chatId && document.visibilityState === 'visible') {
          markChatRead(msg.chatId, msg.messageId).catch(() => {});
        }
      }

    });

    return () => {
      logger.chat('🔌', 'Unsubscribing from WebSocket');
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    loadIncomingRequests();
    loadOutgoingRequests();
    logger.chat('рџ“Љ', 'Loading initial friend requests for badge counts');
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

  const loadFriends = async () => {
    try {
      const { data } = await http.get<FriendsListResponse>(endpoints.friendsList);
      setFriends(data.friends);
    } catch (err) {
      logger.error('Failed to load friends:', err);
    }
  };

  const loadIncomingRequests = async () => {
    try {
      const { data } = await http.get<FriendRequestsResponse>(endpoints.friendsRequestsIncoming);
      setIncomingRequests(data.requests);
    } catch (err) {
      logger.error('Failed to load incoming requests:', err);
    }
  };

  const loadOutgoingRequests = async () => {
    try {
      const { data } = await http.get<FriendRequestsResponse>(endpoints.friendsRequestsOutgoing);
      setOutgoingRequests(data.requests);
    } catch (err) {
      logger.error('Failed to load outgoing requests:', err);
    }
  };

  const searchUsers = async () => {
    if (searchQuery.length < 2) return;

    setLoading(true);
    try {
      const { data } = await http.get<UserSearchResponse>(endpoints.friendsSearch(searchQuery));
      setSearchResults(data.users);
    } catch (err) {
      logger.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshSearchIfNeeded = () => {
    if (searchQuery.length >= 2) {
      searchUsers();
    }
  };

  const sendFriendRequest = async (userId: string) => {
    try {
      await http.post(endpoints.friendsRequestsSend, { userId });
      await loadOutgoingRequests();
      await searchUsers();
    } catch (err) {
      logger.error('Failed to send request:', err);
    }
  };

  const acceptRequest = async (userId: string) => {
    try {
      await http.post(endpoints.friendsRequestsAccept, { userId });
      await loadFriends();
      await loadIncomingRequests();
      await loadOutgoingRequests();
      refreshSearchIfNeeded();
    } catch (err) {
      logger.error('Failed to accept request:', err);
    }
  };

  const rejectRequest = async (userId: string) => {
    try {
      await http.post(endpoints.friendsRequestsReject, { userId });
      await loadIncomingRequests();
      await loadOutgoingRequests();
      refreshSearchIfNeeded();
    } catch (err) {
      console.error('Failed to reject request:', err);
    }
  };

  const removeFriend = async (userId: string) => {
    if (!confirm('Удалить из друзей?')) return;

    try {
      await http.post(endpoints.friendsRemove, { userId });
      await loadFriends();
      await loadChats();
      refreshSearchIfNeeded();
    } catch (err) {
      console.error('Failed to remove friend:', err);
    }
  };

  const cancelRequest = async (userId: string) => {
    try {
      await http.post(endpoints.friendsRemove, { userId });
      await loadOutgoingRequests();
      await searchUsers();
    } catch (err) {
      console.error('Failed to cancel request:', err);
    }
  };

  const markChatRead = async (chatId: number, lastId: number) => {
    const inactiveTime = Date.now() - lastActivityTime;
    if (inactiveTime > 300000) {
      console.log('⚠️ User inactive, not marking as read');
      return;
    }
    
    if (markReadTimeoutRef.current) {
      clearTimeout(markReadTimeoutRef.current);
    }
    
    markReadTimeoutRef.current = setTimeout(async () => {
      try {
        console.log('✅ Marking message', lastId, 'in chat', chatId, 'as read');
        await http.post(endpoints.chatRead, { chatId, lastReadMessageId: lastId });
        
        setMessages(prev => prev.map(m => 
          typeof m.messageId === 'number' && m.messageId <= lastId && m.senderId !== user?.id
            ? { ...m, isRead: true }
            : m
        ));
      } catch (err) {
        logger.warn('Failed to mark chat read', err);
      }
    }, 500);
  };

  const loadChats = async () => {
    try {
      const { data } = await http.get<ChatListResponse>(endpoints.chatList);
      
      const chatsWithDecrypted = await Promise.all(
        data.chats.map(async (chat) => {
          if (chat.lastMessage && chat.lastMessage.content) {
            return {
              ...chat,
              lastMessage: {
                ...chat.lastMessage,
                content: chat.lastMessage.content,
              },
            };
          }
          return chat;
        })
      );

      setChats(chatsWithDecrypted);
    } catch (err) {
      console.error('Failed to load chats:', err);
    }
  };

  const loadMessages = async (chatId: number, append = false) => {
    try {
      const { data } = await http.get<ChatMessagesResponse>(endpoints.chatMessages(chatId));
      
      const messagesWithContent = data.messages;
      
      if (!append) {
        setMessages(messagesWithContent);
      } else {
        setMessages(prev => [...prev, ...messagesWithContent]);
      }
    
      if (!append) {
        isFirstLoadRef.current = true;
        setTimeout(() => {
          console.log('🔄 Attempting scroll to bottom, ref exists:', !!messagesEndRef.current);
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
            console.log('✅ Scrolled to bottom');
          } else {
            console.warn('⚠️ messagesEndRef is null, retrying...');
            setTimeout(() => {
              if (messagesEndRef.current) {
                messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
                console.log('✅ Scrolled to bottom (retry)');
              }
            }, 100);
          }
          isFirstLoadRef.current = false;
        }, 100);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };
    
  const openChatWith = async (participantId: string) => {
    try {
      const existingChat = chats.find(c => c.participantId === participantId);
      if (existingChat) {
        console.log('✅ Chat already exists, opening chatId:', existingChat.chatId);
        setActiveTab('chat');
        setSelectedChat(existingChat.chatId);
        return;
      }

      const { data } = await http.post<CreateChatResponse>(endpoints.chatCreate, {
        participantId
      });

      await loadChats();
      setActiveTab('chat');
      setSelectedChat(data.chatId);
     
    } catch (e) {
      console.error('Failed to open chat:', e);
      alert(e instanceof Error ? e.message : 'Unable to open chat');
    }
  };

  const sendMessageToUser = async (
    recipientId: string, 
    message: string, 
    messageType: 'text' | 'image' = 'text', 
    imagePath?: string,
    imageEncrypted?: boolean,
    imageEncryptionIv?: string,
    imageKeyVersion?: number
  ) => {
    const localId = `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const createdAt = new Date().toISOString();
    
    try {
      let chat = chats.find(c => c.participantId === recipientId);
      
      if (!chat) {
        console.log('✅ Creating new chat with user:', recipientId);
        
        const { data: createData } = await http.post<{ chatId: number }>(endpoints.chatCreate, {
          participantId: recipientId
        });
        
        console.log('✅ Chat created, chatId:', createData.chatId);
        
        chat = {
          chatId: createData.chatId,
          participantId: recipientId,
          lastMessage: undefined,
          createdAt: new Date().toISOString()
        };
        setChats(prev => [chat!, ...prev]);
        setSelectedChat(createData.chatId);
      }
      
      console.log('✅ Getting chat key for chatId:', chat.chatId);
      console.log('✅ Sending plaintext message with protocol integrity...');
      
      const tempMessage: ChatMessage = {
        localId,
        messageId: localId,
        status: 'pending',
        senderId: user?.id || '',
        content: message,
        messageType,
        imagePath,
        createdAt,
        replyToId: replyingTo?.messageId,
        replyToMessage: replyingTo || undefined,
      };
      
      setMessages(prev => [...prev, tempMessage]);
      
      // Прокручиваем к концу чата
      setTimeout(() => scrollToBottom(), 0);
       
      const msgId = Date.now();
      const seqNo = Date.now();
      const timestamp = Date.now();
       
      const { data } = await http.post<SendMessageResponse>(endpoints.chatSend, {
        msg_id: msgId,
        seq_no: seqNo,
        timestamp: timestamp,
        chat_id: chat!.chatId,
        content_type: messageType,
        content: message,
        hmac: '',
        reply_to_id: replyingTo?.messageId,
        image_path: imagePath,
        image_encrypted: imageEncrypted,
        image_encryption_iv: imageEncryptionIv,
        image_key_version: imageKeyVersion,
      });
      
      console.log('✅ Message sent, messageId:', data.messageId, 'response:', data);

      setMessages(prev => prev.map(m => {
        if (m.localId === localId || m.messageId === localId) {
          return {
            ...m,
            messageId: data.messageId,
            status: m.isRead ? 'read' : 'sent',
            content: m.content || message,
            imageUrl: data.imageUrl ?? m.imageUrl,
            imagePath: imagePath ?? m.imagePath,
            isRead: false,
          };
        }
        return m;
      }));
      

      // Обновляем превью последнего сообщения в списке чатов
      setChats(prev => prev.map(c => c.chatId === chat!.chatId ? {
        ...c,
        lastMessage: {
          messageId: data.messageId,
          senderId: user?.id || '',
          content: message,
          messageType,
          imagePath,
          imageUrl: data.imageUrl, // 🔐 Сохраняем imageUrl с токеном
          createdAt,
          isRead: false,
          replyToId: replyingTo?.messageId,
          replyToMessage: replyingTo || undefined,
        } as ChatMessage
      } : c));

      // WebSocket позже может дополнить статус/прочтение тем же messageId

      setReplyingTo(null);
    } catch (e) {
      console.error('Failed to send message to user', e);
      
      // Удаляем временное сообщение при ошибке
      setMessages(prev => prev.filter(m => m.localId !== localId && m.messageId !== localId));
      
      alert(e instanceof Error ? e.message : 'Ошибка отправки сообщения');
    }
  };
  
  const sendChatMessage = async () => {
    console.log('sendChatMessage called', { selectedChat, messageInput, attachedImagesCount: attachedImages.length });
    
    // Проверяем: либо текст, либо хотя бы одно изображение
    if (!messageInput.trim() && attachedImages.length === 0) {
      console.warn('Cannot send: empty message and no images');
      return;
    }
    
    if (editingMessage) {
      await editMessage(editingMessage.messageId, messageInput.trim());
      setMessageInput('');
      setEditingMessage(null);
      setAttachedImages([]);
    } else if (selectedChat) {
      const chat = chats.find(c => c.chatId === selectedChat);
      if (!chat) {
        console.warn('Chat not found');
        return;
      }
      
      // Если есть прикрепленные изображения - отправляем их
      if (attachedImages.length > 0) {
        await sendMessagesWithImages(chat.participantId, messageInput.trim());
      } else {
        // Иначе отправляем обычное текстовое сообщение
        await sendMessageToUser(chat.participantId, messageInput.trim());
      }
      
      setMessageInput('');
      setAttachedImages([]);
      // Прокручиваем к концу после отправки
      setTimeout(() => scrollToBottom(), 100);
    }
  };

  // 🖼️ Отправка сообщений с прикрепленными изображениями
  const sendMessagesWithImages = async (recipientId: string, textContent: string) => {
    const MAX_IMAGES = 9;
    const imagesToSend = attachedImages.slice(0, MAX_IMAGES);
    
    if (imagesToSend.length === 0) return;
    
    // Создаём временное сообщение-сетка с индикаторами загрузки
    const localId = `local-img-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const tempMessage: ChatMessage = {
      localId,
      messageId: localId,
      status: 'pending',
      senderId: user?.id || '',
      content: textContent,
      messageType: imagesToSend.length === 1 ? 'image' : 'images',
      imagePath: '',
      images: imagesToSend.map((img, idx) => ({
        imagePath: '',
        imageUrl: img.preview // временно используем preview
      })),
      createdAt: new Date().toISOString(),
    };
    
    // Добавляем временное сообщение в UI
    setMessages(prev => [...prev, tempMessage]);
    
    // Очищаем preview
    setAttachedImages([]);
    setMessageInput('');
    
    setTimeout(() => scrollToBottom(), 0);
    
    try {
      let chat = chats.find(c => c.participantId === recipientId);
      
      if (!chat) {
        const { data: createData } = await http.post<{ chatId: number }>(endpoints.chatCreate, {
          participantId: recipientId
        });
        
        chat = {
          chatId: createData.chatId,
          participantId: recipientId,
          lastMessage: undefined,
          createdAt: new Date().toISOString()
        };
        setChats(prev => [chat!, ...prev]);
        setSelectedChat(createData.chatId);
      }
      
      // Загружаем все изображения ПАРАЛЛЕЛЬНО
      const finalChatId = chat.chatId; // Используем финальный chatId
      const uploadPromises = imagesToSend.map((img, idx) => {
        return (async () => {
          try {
            const form = new FormData();
            form.append('file', img.file);
            
            const { data } = await http.post<UploadImageResponse>(
              `${endpoints.chatUpload}?chatId=${finalChatId}`,
              form,
              {
                onUploadProgress: (e: any) => {
                  const progress = Math.round((e.loaded / e.total) * 100);
                  setUploadingImages(prev => {
                    const next = new Map(prev);
                    next.set(`${localId}-${idx}`, { file: img.file, progress });
                    return next;
                  });
                }
              }
            );
            
            // Обновляем временное сообщение с загруженным изображением
            setMessages(prev => prev.map(m => 
              (m.localId === localId || m.messageId === localId)
                ? {
                    ...m,
                    images: m.images?.map((img, i) =>
                      i === idx
                        ? { 
                            imagePath: data.imagePath,
                            imageUrl: data.imageUrl,
                            imageKeyVersion: data.imageKeyVersion
                          }
                        : img
                    ) || []
                  }
                : m
            ));
            
            return {
              image_path: data.imagePath,
              image_encrypted: data.imageEncrypted,
              image_encryption_iv: data.imageEncryptionIv,
              image_key_version: data.imageKeyVersion
            };
          } catch (e) {
            console.error(`Failed to upload image ${idx + 1}:`, e);
            throw e;
          }
        })();
      });
      
      // Ждём загрузки всех изображений
      const uploadedImages = await Promise.all(uploadPromises);
      
      // Очищаем индикаторы загрузки только для текущего сообщения
      setUploadingImages(prev => {
        const next = new Map(prev);
        Array.from(next.keys()).forEach(k => {
          if (k === localId || k.startsWith(`${localId}-`)) next.delete(k);
        });
        return next;
      });
      
      // Отправляем одно сообщение со всеми изображениями
      const messageType = uploadedImages.length === 1 ? 'image' : 'images';
      
      const msgId = Date.now();
      const seqNo = Date.now();
      const timestamp = Date.now();
      
      const messageData: any = {
        msg_id: msgId,
        seq_no: seqNo,
        timestamp: timestamp,
        chat_id: chat!.chatId,
        content_type: messageType,
        content: textContent,
        hmac: '',
        reply_to_id: replyingTo?.messageId,
        image_path: uploadedImages[0].image_path,
        image_encrypted: uploadedImages[0].image_encrypted,
        image_encryption_iv: uploadedImages[0].image_encryption_iv,
        image_key_version: uploadedImages[0].image_key_version,
      };
      
      if (uploadedImages.length > 1) {
        messageData.images = uploadedImages;
      }
      
      const { data } = await http.post<SendMessageResponse>(endpoints.chatSend, messageData);
      
      console.log('✅ Multi-image message sent:', data);
      
      // Заменяем временное сообщение на реальное, сохраняя localId
      setMessages(prev => prev.map(m => 
        (m.localId === localId || m.messageId === localId)
          ? {
              ...m,
              messageId: data.messageId,
              status: 'sent',
              senderId: user?.id || '',
              content: textContent,
              messageType,
              imagePath: uploadedImages[0].image_path,
              imageUrl: data.imageUrl ?? m.imageUrl,
              images: data.imageUrls?.map(img => ({
                imagePath: img.imagePath,
                imageUrl: img.imageUrl
              })) || uploadedImages.map(img => ({
                imagePath: img.image_path,
                imageUrl: `/media/${img.image_path}`
              })),
              createdAt: new Date().toISOString(),
              isRead: false,
            }
          : m
      ));

      // Обновляем lastMessage в чате
      setChats(prev => prev.map(c => 
        c.chatId === chat!.chatId 
          ? { ...c, lastMessage: {
              localId,
              messageId: data.messageId,
              senderId: user?.id || '',
              content: textContent,
              messageType,
              imagePath: uploadedImages[0].image_path,
              createdAt: new Date().toISOString(),
              status: 'sent',
            } as ChatMessage }
          : c
      ));

      setReplyingTo(null);
    } catch (e) {
      console.error('Failed to send multi-image message:', e);
      
      // Удаляем временное сообщение при ошибке
      setMessages(prev => prev.filter(m => m.localId !== localId && m.messageId !== localId));
      setUploadingImages(prev => {
        const next = new Map(prev);
        Array.from(next.keys()).forEach(k => {
          if (k === localId || k.startsWith(`${localId}-`)) next.delete(k);
        });
        return next;
      });
      
      alert(e instanceof Error ? e.message : 'Ошибка отправки сообщения');
    }
  };

  // 🖼️ Добавление изображения к отправке
  const attachImage = async (file: File) => {
    if (!selectedChat) return;
    
    const id = `attached-${Date.now()}-${Math.random()}`;
    
    // Создаем preview
    const preview = await new Promise<string>(resolve => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });
    
    setAttachedImages(prev => [...prev, {
      id,
      file,
      preview,
      uploading: false
    }]);
  };

  // 🖼️ Удаление прикрепленного изображения
  const removeAttachedImage = (id: string) => {
    setAttachedImages(prev => prev.filter(img => img.id !== id));
  };

  const editMessage = async (messageId: number | string, newContent: string) => {
    if (!selectedChat || typeof messageId === 'string') return; // Can't edit temporary messages
    
    try {
      const chat = chats.find(c => c.chatId === selectedChat);
      if (!chat) return;

      // ☁️ CLOUD MODEL: Send plaintext, server encrypts
      await http.put(endpoints.chatMessageEdit(messageId), {
        content: newContent,  // ☁️ Plaintext
      });

      setMessages(prev => prev.map(m => 
        m.messageId === messageId 
          ? { ...m, content: newContent, edited: true }
          : m
      ));
    } catch (e) {
      console.error('Failed to edit message', e);
      alert(e instanceof Error ? e.message : 'Ошибка редактирования сообщения');
    }
  };

  const deleteMessage = async (messageId: number | string) => {
    if (!selectedChat || typeof messageId === 'string') return; // Can't delete temporary messages
    
    if (!confirm('Удалить сообщение?')) return;
    
    try {
      await http.delete(endpoints.chatMessageDelete(messageId));
      setMessages(prev => prev.filter(m => m.messageId !== messageId));
      
      const chat = chats.find(c => c.chatId === selectedChat);
      if (chat?.lastMessage?.messageId === messageId) {
        const remainingMessages = messages.filter(m => m.messageId !== messageId);
        const newLastMessage = remainingMessages[remainingMessages.length - 1];
        setChats(prev => prev.map(c => 
          c.chatId === selectedChat 
            ? { ...c, lastMessage: newLastMessage }
            : c
        ));
      }
    } catch (e) {
      console.error('Failed to delete message', e);
      alert(e instanceof Error ? e.message : 'Ошибка удаления сообщения');
    }
  };

  const copyMessageText = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      console.log('Message copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy message', err);
    });
  };

  const uploadImage = async (file: File) => {
    if (!selectedChat || !file) return;
    const chat = chats.find(c => c.chatId === selectedChat);
    if (!chat) return;
    
    const localId = `local-upload-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const createdAt = new Date().toISOString();
    
    try {
      // Создаем временное сообщение с индикатором загрузки
      const tempMessage: ChatMessage = {
        localId,
        messageId: localId,
        status: 'pending',
        senderId: user?.id || '',
        content: '',
        messageType: 'image',
        createdAt,
      };
      
      setMessages(prev => [...prev, tempMessage]);
      setUploadingImages(prev => new Map(prev).set(localId, { progress: 0, file }));
      
      setTimeout(() => scrollToBottom(), 0);
      
      const form = new FormData();
      form.append('file', file);
      
      console.log('📤 Uploading image:', {
        chatId: selectedChat,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        url: `${endpoints.chatUpload}?chatId=${selectedChat}`
      });
      
      // Не указываем Content-Type вручную - браузер автоматически установит multipart/form-data с boundary
      const { data } = await http.post<UploadImageResponse>(
        `${endpoints.chatUpload}?chatId=${selectedChat}`, 
        form,
        {
          onUploadProgress: (e: any) => {
            const progress = Math.round((e.loaded / e.total) * 100);
            setUploadingImages(prev => {
              const next = new Map(prev);
              next.set(localId, { file, progress });
              return next;
            });
          }
        }
      );
      
      console.log('✅ Image uploaded successfully:', data);
      setUploadingImages(prev => {
        const next = new Map(prev);
        next.set(localId, { file, progress: 100 });
        return next;
      });
      
      // Отправляем реальное сообщение с изображением, остаемся на том же объекте
      const msgId = Date.now();
      const seqNo = Date.now();
      const timestamp = Date.now();
      
      const { data: sendRes } = await http.post<SendMessageResponse>(endpoints.chatSend, {
        msg_id: msgId,
        seq_no: seqNo,
        timestamp,
        chat_id: chat!.chatId,
        content_type: 'image',
        content: '',
        hmac: '',
        reply_to_id: replyingTo?.messageId,
        image_path: data.imagePath,
        image_encrypted: data.imageEncrypted,
        image_encryption_iv: data.imageEncryptionIv,
        image_key_version: data.imageKeyVersion,
      });
      
      setMessages(prev => prev.map(m => 
        (m.localId === localId || m.messageId === localId)
          ? {
              ...m,
              messageId: sendRes.messageId,
              status: 'sent',
              imagePath: data.imagePath,
              imageUrl: sendRes.imageUrl ?? data.imageUrl,
              createdAt: new Date().toISOString(),
              isRead: false,
            }
          : m
      ));
      
      setUploadingImages(prev => {
        const next = new Map(prev);
        next.delete(localId);
        return next;
      });
      
      setChats(prev => prev.map(c => 
        c.chatId === chat!.chatId 
          ? { ...c, lastMessage: {
              localId,
              messageId: sendRes.messageId,
              senderId: user?.id || '',
              content: '',
              messageType: 'image',
              imagePath: data.imagePath,
              createdAt: new Date().toISOString(),
              status: 'sent',
            } as ChatMessage }
          : c
      ));
    } catch (e) {
      console.error('❌ Failed to upload image:', {
        error: e,
        response: (e as any).response?.data,
        status: (e as any).response?.status,
        chatId: selectedChat,
        file: file.name
      });
      // Удаляем временное сообщение при ошибке
      setMessages(prev => prev.filter(m => m.localId !== localId && m.messageId !== localId));
      setUploadingImages(prev => {
        const next = new Map(prev);
        next.delete(localId);
        return next;
      });
      alert('Не удалось загрузить изображение');
    }
  };

  const renderChatView = () => {
    if (selectedChat == null) {
      return (
        <div className="p-4 text-center text-sm text-slate-400">
          Выберите собеседника из списка друзей чтобы начать чат.
        </div>
      );
    }
    const chat = chats.find(c => c.chatId === selectedChat);
    const friend = friends.find(f => f.userId === chat?.participantId);
    const displayName = friend?.displayName || friend?.username || chat?.participantId.slice(0, 8) || 'РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ';
    return (
      <div className="flex flex-col h-full">
        <div className="flex-none border-b border-slate-800/50 p-3 flex items-center gap-3 bg-slate-900/40">
          <button
            onClick={() => { setSelectedChat(null); setMessages([]); }}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            title="Назад к списку"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          {friend?.avatarUrl && (
            <img src={friend.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-slate-700/50 shadow-lg" />
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">{displayName}</div>
            {friend?.username && friend.displayName && (
              <div className="text-xs text-slate-400 truncate">@{friend.username}</div>
            )}
          </div>

          <button
            onClick={async () => {
              if (!confirm('Удалить чат? Все сообщения будут удалены.')) return;
              try {
                await http.delete(endpoints.chatDelete(selectedChat));
                setChats(prev => prev.filter(c => c.chatId !== selectedChat));
                setSelectedChat(null);
                setMessages([]);
              } catch (e) {
                console.error('Failed to delete chat:', e);
                alert('Ошибка удаления чата');
              }
            }}
            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all"
            title="Удалить чат"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-2">
                <div className="text-6xl opacity-20">💬</div>
                <p className="text-slate-400 text-sm">Нет сообщений</p>
                <p className="text-slate-500 text-xs">Начните общение</p>
              </div>
            </div>
          ) : (
            messages.map(m => {
              const hasCaption = Boolean(m.content && m.content.trim());

              return (
                <div 
                  key={m.localId ?? m.messageId}
                  data-message-id={m.messageId}
                  data-sender-id={m.senderId}
                  className={`message-item flex ${m.senderId === userId ? 'justify-end' : 'justify-start'} group`}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({ x: e.clientX, y: e.clientY, message: m });
                  }}
                >
                <div className={`max-w-[75%] rounded-2xl overflow-hidden text-sm whitespace-pre-wrap wrap-break-word shadow-lg relative ${
                  m.messageType === 'image' || m.messageType === 'images' ? 'p-0' : 'px-2 py-1'
                } ${
                  m.senderId === userId
                    ? 'bg-linear-to-br from-indigo-600 to-indigo-700 text-white shadow-indigo-500/30'
                    : 'bg-slate-800/90 text-slate-100 shadow-slate-900/50 border border-slate-700/50'
                }`}>
                  {m.replyToMessage && (
                    <div className={`rounded-lg border-l-2 ${m.messageType === 'image' || m.messageType === 'images' ? 'px-2 py-1 mx-3 mt-3 mb-2' : 'px-2 py-1 mb-2'} ${
                      m.senderId === userId
                        ? 'bg-indigo-800/40 border-indigo-400'
                        : 'bg-slate-700/40 border-slate-500'
                    }`}>
                      <div className={`text-[10px] font-medium mb-1 ${
                        m.senderId === userId ? 'text-indigo-300' : 'text-slate-400'
                      }`}>
                        {m.replyToMessage.senderId === userId ? 'Вы' : friends.find(f => f.userId === m.replyToMessage!.senderId)?.username || 'Пользователь'}
                      </div>
                      <div className={`text-xs opacity-80 ${m.replyToMessage.messageType === 'image' ? 'italic' : 'line-clamp-2'}`}>
                        {m.replyToMessage.messageType === 'image' ? '🖼️ Изображение' : m.replyToMessage.content}
                      </div>
                    </div>
                  )}
                  {(m.messageType === 'image' || m.messageType === 'images') && (m.imageUrl || m.imagePath || m.images) ? (
                    <div className="relative">
                      {/* Сетка изображений */}
                      {(m.messageType === 'images' || (m.messageType === 'image' && m.images?.length)) && m.images && m.images.length > 1 ? (
                        (() => {
                          const gridLayout = getImageGridLayout(m.images.length);

                          return (
                            <div
                              className={`grid gap-1 ${hasCaption ? 'p-2' : 'p-0'} w-96 max-w-full aspect-square overflow-hidden`}
                              style={{
                                gridTemplateColumns: `repeat(${gridLayout.columns}, minmax(0, 1fr))`,
                                gridTemplateRows: `repeat(${gridLayout.rows}, minmax(0, 1fr))`,
                              }}
                            >
                              {m.images.map((img, idx) => {
                                const displayUrl = img.imageUrl || (img.imagePath ? `/media/${img.imagePath}` : '');
                                const isLoading = !displayUrl;
                                const uploadKey = `${m.messageId}-${idx}`;
                                const progress = uploadingImages.get(uploadKey)?.progress || 0;
                                const span = gridLayout.spans[idx] || { colSpan: 1, rowSpan: 1 };
                                
                                return (
                                  <div
                                    key={idx}
                                    className="relative overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                                    style={{
                                      gridColumn: `span ${span.colSpan} / span ${span.colSpan}`,
                                      gridRow: `span ${span.rowSpan} / span ${span.rowSpan}`,
                                    }}
                                  >
                                    {isLoading ? (
                                      <div className="w-full h-full bg-slate-700/50 border border-slate-600 flex items-center justify-center">
                                        <div className="flex flex-col items-center gap-2">
                                          <div className="relative w-12 h-12">
                                            <svg className="w-full h-full" viewBox="0 0 100 100">
                                              <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-600" />
                                              <circle 
                                                cx="50" 
                                                cy="50" 
                                                r="45" 
                                                fill="none" 
                                                stroke="currentColor" 
                                                strokeWidth="2" 
                                                strokeDasharray={`${2.827 * progress} ${282.7}`}
                                                className="text-blue-400 transition-all"
                                                style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
                                              />
                                            </svg>
                                            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                                              {progress}%
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      <ImageWithLoader
                                        src={displayUrl}
                                        alt={`img-${idx}`}
                                        className="w-full h-full object-cover"
                                        placeholderClassName="w-full h-full bg-slate-700"
                                        onClick={() => displayUrl && window.open(displayUrl, '_blank')}
                                      />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()
                      ) : (
                        /* Одно изображение */
                        (() => {
                          const hasTempId = typeof m.messageId === 'string' && m.messageId.startsWith('temp-img-');
                          const firstImg = m.images && m.images.length ? m.images[0] : undefined;
                          const displayUrl =
                            m.imageUrl ||
                            (firstImg?.imageUrl) ||
                            (firstImg?.imagePath ? `/media/${firstImg.imagePath}` : m.imagePath ? `/media/${m.imagePath}` : '');
                          const isLoading = (!displayUrl && !hasTempId);
                          const uploadKey = hasTempId ? `${m.messageId}-0` : '';
                          const progress = uploadKey ? uploadingImages.get(uploadKey)?.progress || 0 : 0;
                          
                            return isLoading ? (
                            <div className="bg-slate-800/50 border-2 border-dashed border-slate-600 flex items-center justify-center" style={{ minHeight: '200px', minWidth: '250px' }}>
                              <div className="flex flex-col items-center gap-3">
                                <UploadProgress 
                                    progress={progress}
                                    size="lg"
                                />
                                <span className="text-xs text-slate-400">Загрузка изображения...</span>
                              </div>
                            </div>
                          ) : (
                            <ImageWithLoader
                              src={displayUrl}
                              alt="img"
                              className="max-h-96 w-full object-cover cursor-pointer hover:opacity-95 transition-opacity"
                              placeholderClassName="min-h-[200px] min-w-[250px]"
                              onClick={() => displayUrl && window.open(displayUrl, '_blank')}
                            />
                          );
                        })()
                      )}
                      {/* Время только на изображении если НЕТ текста */}
                      {!hasCaption && (
                        <div className="absolute bottom-2 right-1 px-2 py-1 rounded-full bg-black/60 backdrop-blur-md flex items-center gap-1.5 shadow-lg">
                          <span className="text-[10px] text-white font-medium">
                            {new Date(m.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {m.senderId === userId && (
                            <span className="text-[10px] -space-x-0.5 inline-flex">
                              {m.status === 'pending' ? (
                                <svg className="w-3 h-3 text-white/70 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              ) : m.isRead ? (
                                <>
                                  <span className="text-green-400">✓</span>
                                  <span className="text-green-400">✓</span>
                                </>
                              ) : (
                                <span className="text-white/70">✓</span>
                              )}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ) : null}
                  {hasCaption && (
                    <div className={`leading-relaxed ${(m.messageType === 'image' || m.messageType === 'images') ? 'px-3 pt-2' : ''}`}>
                      {m.content}
                    </div>
                  )}
                  {/* Показываем время в нижней части, если есть текст */}
                  {hasCaption ? (
                    <div className={`pl-2 pr-1 pb-1 text-[10px] text-right opacity-70 flex items-center justify-end gap-1 ${
                      m.senderId === userId ? 'text-indigo-200' : 'text-slate-400'
                    }`}>
                      {m.edited && <span className="opacity-60">ред.</span>}
                      {new Date(m.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      {m.senderId === userId && (
                        <span className="ml-0.5 -space-x-0.5 inline-flex">
                          {m.status === 'pending' ? (
                            <svg className="w-3 h-3 text-indigo-400/60 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          ) : m.isRead ? (
                            <>
                              <span className="text-indigo-300">✓</span>
                              <span className="text-indigo-300">✓</span>
                            </>
                          ) : (
                            <span className="text-indigo-400/60">✓</span>
                          )}
                        </span>
                      )}
                    </div>
                  ) : (m.messageType !== 'image' && m.messageType !== 'images') ? (
                    <div className={`mt-1 text-[10px] text-right opacity-70 flex items-center justify-end gap-1 pr-1 ${
                      m.senderId === userId ? 'text-indigo-200' : 'text-slate-400'
                    }`}>
                      {m.edited && <span className="opacity-60">ред.</span>}
                      {new Date(m.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      {m.senderId === userId && (
                        <span className="ml-0.5 -space-x-0.5 inline-flex">
                          {m.status === 'pending' ? (
                            <svg className="w-3 h-3 text-indigo-400/60 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          ) : m.isRead ? (
                            <>
                              <span className="text-indigo-300">✓</span>
                              <span className="text-indigo-300">✓</span>
                            </>
                          ) : (
                            <span className="text-indigo-400/60">✓</span>
                          )}
                        </span>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="flex-none p-3 border-t border-slate-800/50 bg-slate-900/30">
          {editingMessage && (
            <div className="mb-2 px-3 py-2 rounded-lg bg-indigo-900/40 border border-indigo-700/50 flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-indigo-400 font-medium mb-1">
                  Редактирование сообщения:
                </div>
                <div className="text-xs text-slate-300 truncate">
                  {editingMessage.content}
                </div>
              </div>
              <button
                onClick={() => {
                  setEditingMessage(null);
                  setMessageInput('');
                }}
                className="p-1 hover:bg-indigo-800 rounded transition-colors"
                title="Отменить редактирование"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          {replyingTo && (
            <div className="mb-2 px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/50 flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-indigo-400 font-medium mb-1">
                  Ответ на сообщение {replyingTo.senderId === userId ? 'себе' : friends.find(f => f.userId === replyingTo.senderId)?.username || 'пользователю'}:
                </div>
                <div className="text-xs text-slate-300 truncate">
                  {replyingTo.messageType === 'image' ? '🖼️ Изображение' : replyingTo.content}
                </div>
              </div>
              <button
                onClick={() => setReplyingTo(null)}
                className="p-1 hover:bg-slate-700 rounded transition-colors"
                title="Отменить ответ"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          <div className="flex gap-2 mb-2">
            <input
              value={messageInput}
              onChange={e => setMessageInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } }}
              className="flex-1 bg-slate-800/80 border border-slate-700/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-slate-500"
              placeholder="Введите сообщение..."
            />
            <label className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700/50 hover:bg-slate-700/80 cursor-pointer transition-colors group">
              <input 
                type="file" 
                className="hidden" 
                accept="image/*"
                multiple
                onChange={e => { 
                  const files = e.target.files;
                  if (files) {
                    for (let i = 0; i < files.length; i++) {
                      attachImage(files[i]);
                    }
                  }
                  // Очищаем input для возможности повторной загрузки того же файла
                  e.target.value = '';
                }} 
              />
              <svg className="w-5 h-5 text-slate-400 group-hover:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </label>
            <button
              onClick={sendChatMessage}
              className="px-5 py-2.5 rounded-xl bg-linear-to-br from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-sm font-medium transition-all shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>

          {/* 🖼️ Прикрепленные изображения */}
          {attachedImages.length > 0 && (
            <div className="mb-3 p-3 bg-slate-800/40 border border-slate-700/30 rounded-xl">
              <div className="text-xs text-slate-400 mb-2 font-medium">Прикрепленные изображения ({attachedImages.length}):</div>
              <div className="flex gap-2 flex-wrap">
                {attachedImages.map(img => (
                  <div 
                    key={img.id} 
                    className="relative group"
                  >
                    <div className="w-20 h-20 rounded-lg overflow-hidden border border-slate-600/50 bg-slate-900/50">
                      {img.preview ? (
                        <img src={img.preview} alt={img.file.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-slate-500 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        </div>
                      )}
                      {img.uploading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <div className="text-xs text-white">Загрузка...</div>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => removeAttachedImage(img.id)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500/80 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Удалить"
                    >
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const incomingCount = incomingRequests.length;
  const outgoingCount = outgoingRequests.length;
  const hasNotifications = incomingCount > 0;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 400, y: 50 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: 400, y: 50 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-24 right-6 w-96 max-w-[calc(100vw-3rem)] h-[600px] max-h-[calc(100vh-8rem)] z-50"
          >
            <div className="h-full flex flex-col rounded-2xl border border-slate-800 bg-slate-950/95 backdrop-blur-xl shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/60">
                <h2 className="text-lg font-semibold">Друзья</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-slate-800 rounded-lg transition-colors"
                  aria-label="Закрыть"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex gap-1 px-2 py-2 border-b border-slate-800 bg-slate-900/40">
                <TabButton
                  active={activeTab === 'chat'}
                  onClick={() => setActiveTab('chat')}
                  label="Чат"
                  count={chats.length}
                />
                <TabButton
                  active={activeTab === 'friends'}
                  onClick={() => setActiveTab('friends')}
                  label="Друзья"
                  count={friends.length}
                />
                <TabButton
                  active={activeTab === 'requests'}
                  onClick={() => setActiveTab('requests')}
                  label="Заявки"
                  count={incomingCount + outgoingCount}
                  badge={hasNotifications}
                />
                <TabButton
                  active={activeTab === 'search'}
                  onClick={() => setActiveTab('search')}
                  label="Поиск"
                />
              </div>

              <div className="flex-1 overflow-hidden">
                <AnimatePresence mode="wait">
                  {activeTab === 'friends' && (
                    <motion.div
                      key="friends"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.15 }}
                      className="h-full overflow-y-auto p-3"
                    >
                      <FriendsList friends={friends} onRemove={removeFriend} onOpenChat={openChatWith} />
                    </motion.div>
                  )}

                  {activeTab === 'search' && (
                    <motion.div
                      key="search"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.15 }}
                      className="h-full overflow-y-auto p-3"
                    >
                      <SearchUsers
                        query={searchQuery}
                        onQueryChange={setSearchQuery}
                        results={searchResults}
                        loading={loading}
                        onSendRequest={sendFriendRequest}
                        onCancelRequest={cancelRequest}
                      />
                    </motion.div>
                  )}

                  {activeTab === 'requests' && (
                    <motion.div
                      key="requests"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.15 }}
                      className="h-full overflow-y-auto p-3"
                    >
                      <div className="flex gap-2 mb-3">
                        <button
                          onClick={() => setRequestsSubTab('incoming')}
                          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            requestsSubTab === 'incoming'
                              ? 'bg-linear-to-br from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-500/30'
                              : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 border border-slate-700/50'
                          }`}
                        >
                          Входящие {incomingCount > 0 && `(${incomingCount})`}
                        </button>
                        <button
                          onClick={() => setRequestsSubTab('outgoing')}
                          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            requestsSubTab === 'outgoing'
                              ? 'bg-linear-to-br from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-500/30'
                              : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 border border-slate-700/50'
                          }`}
                        >
                          Исходящие {outgoingCount > 0 && `(${outgoingCount})`}
                        </button>
                      </div>
                      
                      {requestsSubTab === 'incoming' ? (
                        <IncomingRequests
                          requests={incomingRequests}
                          onAccept={acceptRequest}
                          onReject={rejectRequest}
                        />
                      ) : (
                        <OutgoingRequests
                          requests={outgoingRequests}
                          onCancel={cancelRequest}
                        />
                      )}
                    </motion.div>
                  )}
                  {activeTab === 'chat' && (
                    <motion.div
                      key="chat"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.15 }}
                      className="h-full flex flex-col overflow-hidden"
                    >
                      {!selectedChat ? (
                        <div className="h-full overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                          <ChatsList
                            chats={chats}
                            friends={friends}
                            incomingRequests={incomingRequests}
                            outgoingRequests={outgoingRequests}
                            searchResults={searchResults}
                            currentUserId={userId}
                            onSelectChat={(chatId) => { setSelectedChat(chatId); loadMessages(chatId); }}
                          />
                        </div>
                      ) : (
                        <div className="h-full flex flex-col overflow-hidden">
                          {renderChatView()}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Открыть социальную сеть"
      >
        {hasNotifications && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center text-xs font-bold">
            {incomingCount}
          </span>
        )}
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      </motion.button>

      {contextMenu && (
        <div
          className="fixed z-100 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 min-w-[180px]"
          style={{ 
            left: `${contextMenu.x}px`, 
            top: `${contextMenu.y}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              copyMessageText(contextMenu.message.content || '');
              setContextMenu(null);
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-slate-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Копировать
          </button>
          
          <button
            onClick={() => {
              setReplyingTo(contextMenu.message);
              setContextMenu(null);
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-slate-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            Ответить
          </button>

          {contextMenu.message.senderId === user?.id && contextMenu.message.messageType === 'text' && (
            <button
              onClick={() => {
                setEditingMessage(contextMenu.message);
                setMessageInput(contextMenu.message.content || '');
                setContextMenu(null);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-slate-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Редактировать
            </button>
          )}

          {contextMenu.message.senderId === user?.id && (
            <button
              onClick={() => {
                deleteMessage(contextMenu.message.messageId);
                setContextMenu(null);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Удалить
            </button>
          )}
        </div>
      )}
    </>
  );
}

function TabButton({ 
  active, 
  onClick, 
  label, 
  count,
  badge 
}: { 
  active: boolean
  onClick: () => void
  label: string
  count?: number
  badge?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'relative flex-1 px-3 py-1.5 rounded-lg text-sm transition-colors',
        active
          ? 'bg-indigo-600 text-white'
          : 'text-slate-300 hover:bg-slate-800'
      ].join(' ')}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className={[
          'ml-1.5 px-1.5 py-0.5 rounded-full text-xs',
          active ? 'bg-indigo-500' : 'bg-slate-700'
        ].join(' ')}>
          {count}
        </span>
      )}
      {badge && (
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full" />
      )}
    </button>
  );
}

function FriendsList({ friends, onRemove, onOpenChat }: { friends: Friend[], onRemove: (id: string) => void, onOpenChat: (userId: string) => void }) {
  if (friends.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400 text-sm">
        <p>У вас пока нет друзей</p>
        <p className="text-xs mt-1">Используйте поиск</p>
      </div>
    );
  }

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Сегодня';
      if (diffDays === 1) return 'Вчера';
      if (diffDays < 7) return `${diffDays} дн. назад`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} нед. назад`;
      if (diffDays < 365) return `${Math.floor(diffDays / 30)} мес. назад`;
      return `${Math.floor(diffDays / 365)} г. назад`;
    } catch {
      return null;
    }
  };

  return (
    <div className="space-y-2">
      {friends.map((friend) => (
        <motion.div
          key={friend.userId}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="group flex items-center gap-2 p-2 rounded-lg border border-slate-800 bg-slate-900/40 hover:bg-slate-900/60 transition-colors"
        >
          <Link to={`/u/${friend.username}`} className="flex items-center gap-2 flex-1 min-w-0">
            {friend.avatarUrl ? (
              <img
                src={friend.avatarUrl}
                alt={friend.username}
                className="w-10 h-10 rounded-lg object-cover border border-slate-700"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 text-sm">
                {friend.username[0]?.toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{friend.username}</div>
              {friend.displayName && (
                <div className="text-xs text-slate-400 truncate">{friend.displayName}</div>
              )}
              {friend.acceptedAt && (
                <div className="text-xs text-slate-500 truncate" title={`Друг с ${new Date(friend.acceptedAt).toLocaleString('ru')}`}>
                  {formatDate(friend.acceptedAt)}
                </div>
              )}
            </div>
          </Link>
          <button
            onClick={() => onOpenChat(friend.userId)}
            className="p-1.5 text-xs rounded bg-indigo-600/20 hover:bg-indigo-600/40 hover:text-indigo-300 transition-all border border-indigo-600/30"
            title="Написать"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </button>
          <button
            onClick={() => onRemove(friend.userId)}
            className="opacity-0 group-hover:opacity-100 p-1.5 text-xs rounded hover:bg-slate-800 hover:text-rose-300 transition-all"
            title="Удалить"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </motion.div>
      ))}
    </div>
  );
}

function SearchUsers({ 
  query, 
  onQueryChange, 
  results, 
  loading,
  onSendRequest,
  onCancelRequest
}: { 
  query: string
  onQueryChange: (q: string) => void
  results: UserSearchResult[]
  loading: boolean
  onSendRequest: (id: string) => void
  onCancelRequest: (id: string) => void
}) {
  return (
    <div>
      <div className="mb-3">
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Поиск по нику..."
          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-800 bg-slate-900/60 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          autoFocus
        />
      </div>

      {loading && (
        <div className="text-center py-6 text-slate-400 text-sm">Поиск...</div>
      )}

      {!loading && query.length >= 2 && results.length === 0 && (
        <div className="text-center py-6 text-slate-400 text-sm">Упс! Никого не найдено :(</div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-2">
          {results.map((user) => (
            <motion.div
              key={user.userId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 p-2 rounded-lg border border-slate-800 bg-slate-900/40"
            >
              <Link to={`/u/${user.username}`} className="flex items-center gap-2 flex-1 min-w-0">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl.startsWith('http') || user.avatarUrl.startsWith('/') ? user.avatarUrl : `/media/${user.avatarUrl}`}
                    alt={user.username}
                    className="w-10 h-10 rounded-lg object-cover border border-slate-700"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 text-sm">
                    {user.username[0]?.toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{user.username}</div>
                  {user.displayName && (
                    <div className="text-xs text-slate-400 truncate">{user.displayName}</div>
                  )}
                </div>
              </Link>

              {user.friendStatus === 'ACCEPTED' && (
                <span className="px-2 py-1 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-700/50 rounded">
                  ✓
                </span>
              )}
              {user.friendStatus === 'PENDING' && (
                <button
                  onClick={() => onCancelRequest(user.userId)}
                  className="px-2 py-1 text-xs text-amber-300 bg-amber-500/10 border border-amber-700/50 rounded hover:bg-amber-500/20"
                >
                  вЏі
                </button>
              )}
              {user.friendStatus === 'BLOCKED' && (
                <span className="px-2 py-1 text-xs text-rose-300 bg-rose-500/10 border border-rose-700/50 rounded">
                  вњ•
                </span>
              )}
              {!user.friendStatus && (
                <button
                  onClick={() => onSendRequest(user.userId)}
                  className="px-2 py-1 text-xs rounded bg-indigo-600 hover:bg-indigo-500"
                >
                  +
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function IncomingRequests({ 
  requests, 
  onAccept, 
  onReject 
}: { 
  requests: FriendRequest[]
  onAccept: (id: string) => void
  onReject: (id: string) => void
}) {
  if (requests.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400 text-sm">
        Нет входящих заявок
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {requests.map((req) => (
        <motion.div
          key={req.requestId || req.userId}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-2 rounded-lg border border-slate-800 bg-slate-900/40"
        >
          <Link to={req.username ? `/u/${req.username}` : '#'} className="flex items-center gap-2 flex-1 min-w-0">
            {req.avatarUrl ? (
              <img
                src={req.avatarUrl}
                alt={req.username}
                className="w-10 h-10 rounded-lg object-cover border border-slate-700"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 text-sm">
                {req.username?.[0]?.toUpperCase() || '?'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{req.username || 'Пользователь'}</div>
              {req.displayName && (
                <div className="text-xs text-slate-400 truncate">{req.displayName}</div>
              )}
            </div>
          </Link>
          <div className="flex gap-1">
            <button
              onClick={() => onAccept(req.userId)}
              className="p-1.5 text-xs rounded bg-emerald-600 hover:bg-emerald-500"
              title="Принять"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
            <button
              onClick={() => onReject(req.userId)}
              className="p-1.5 text-xs rounded border border-slate-700 hover:border-rose-500 hover:text-rose-300"
              title="Отклонить"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function OutgoingRequests({ 
  requests, 
  onCancel 
}: { 
  requests: FriendRequest[]
  onCancel: (id: string) => void
}) {
  if (requests.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400 text-sm">
        Нет исходящих заявок
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {requests.map((req) => (
        <motion.div
          key={req.requestId}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-2 rounded-lg border border-slate-800 bg-slate-900/40"
        >
          <Link to={`/u/${req.username}`} className="flex items-center gap-2 flex-1 min-w-0">
            {req.avatarUrl ? (
              <img
                src={req.avatarUrl}
                alt={req.username}
                className="w-10 h-10 rounded-lg object-cover border border-slate-700"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 text-sm">
                {req.username[0]?.toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{req.username}</div>
              {req.displayName && (
                <div className="text-xs text-slate-400 truncate">{req.displayName}</div>
              )}
              {req.status === 'ACCEPTED' && (
                <div className="text-xs text-emerald-300 truncate">✓ Принята</div>
              )}
              {req.status === 'REJECTED' && (
                <div className="text-xs text-rose-300 truncate">✗ Отклонена</div>
              )}
              {req.status === 'PENDING' && (
                <div className="text-xs text-amber-300 truncate">⏳ Ожидает</div>
              )}
            </div>
          </Link>
          {req.status === 'PENDING' && (
            <button
              onClick={() => onCancel(req.userId)}
              className="p-1.5 text-xs rounded border border-slate-700 hover:border-rose-500 hover:text-rose-300"
              title="Отменить"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          {req.status === 'ACCEPTED' && (
            <span className="text-xs text-slate-500 px-2">рџЋ‰</span>
          )}
        </motion.div>
      ))}
    </div>
  );
}

function ChatsList({
  chats,
  friends,
  incomingRequests,
  outgoingRequests,
  searchResults,
  currentUserId,
  onSelectChat
}: {
  chats: PrivateChat[]
  friends: Friend[]
  incomingRequests: FriendRequest[]
  outgoingRequests: FriendRequest[]
  searchResults: UserSearchResult[]
  currentUserId: string
  onSelectChat: (chatId: number) => void
}) {
  if (chats.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-6xl opacity-20 mb-3">💬</div>
        <p className="text-slate-400 text-sm">Нет чатов</p>
        <p className="text-slate-500 text-xs mt-1">Откройте чат с другом</p>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      
      if (diffMins < 1) return 'Только что';
      if (diffMins < 60) return `${diffMins} мин. назад`;
      
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} ч. назад`;
      
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return 'Вчера';
      if (diffDays < 7) return `${diffDays} дн. назад`;
      
      return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-2">
      {chats.map((chat) => {
        const friend = friends.find(f => f.userId === chat.participantId);
        const fallbackReq = incomingRequests.find(r => r.userId === chat.participantId) || outgoingRequests.find(r => r.userId === chat.participantId);
        const searchHit = searchResults.find(r => r.userId === chat.participantId);
        const displayName =
          friend?.displayName ||
          friend?.username ||
          fallbackReq?.displayName ||
          fallbackReq?.username ||
          searchHit?.displayName ||
          searchHit?.username ||
          chat.participantId.slice(0, 8);
        const avatarUrl = friend?.avatarUrl || fallbackReq?.avatarUrl || searchHit?.avatarUrl;
        const lastMsg = chat.lastMessage;
        const hasUnread = lastMsg && 
          lastMsg.senderId !== currentUserId && 
          !lastMsg.isRead;
        const isOutgoing = lastMsg?.senderId === currentUserId;

        return (
          <motion.div
            key={chat.chatId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => onSelectChat(chat.chatId)}
            className="group cursor-pointer flex items-center gap-3 p-3 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/70 hover:border-slate-700 transition-all"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-12 h-12 rounded-full object-cover border-2 border-slate-700/50"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-slate-800 border-2 border-slate-700/50 flex items-center justify-center text-slate-400 text-lg font-semibold">
                {displayName[0]?.toUpperCase()}
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className={`text-sm font-semibold truncate ${hasUnread ? 'text-white' : 'text-slate-200'}`}>
                  {displayName}
                </div>
                {lastMsg && (
                  <div className="flex flex-col items-end text-right leading-tight shrink-0">
                    <div className="text-xs text-slate-500">
                      {formatDate(lastMsg.createdAt)}
                    </div>
                    {isOutgoing && (
                      <div className="flex items-center gap-1 text-[10px] text-slate-500">
                        <svg className={`w-3.5 h-3.5 ${lastMsg.isRead ? 'text-indigo-400' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13l4 4L23 7" />
                        </svg>
                        <span>{lastMsg.isRead ? 'прочитано' : 'отправлено'}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {lastMsg ? (
                <div className="flex items-center gap-2">
                  <div className={`text-xs truncate flex-1 ${hasUnread ? 'text-slate-300 font-medium' : 'text-slate-400'}`}>
                    {lastMsg.messageType === 'image' ? '🖼️ Изображение' : lastMsg.content}
                  </div>
                  {hasUnread && (
                    <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 animate-pulse"></div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-slate-500">Нет сообщений</div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
