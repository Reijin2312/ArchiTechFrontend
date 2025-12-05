import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { http } from '@/shared/api/http';
import { endpoints } from '@/shared/api/endpoints';
import { authStore } from '@/shared/store/auth';
import { secureChatClient } from '@/shared/api/secureChat';
import { logger } from '@/shared/lib/logger';
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

export function SocialFloatingButton() {
  const user = authStore(s => s.user);
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
  
  const processedMessageIds = useRef<Set<number | string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const markReadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstLoadRef = useRef<boolean>(true);
  
  const selectedChatRef = useRef(selectedChat);
  const userRef = useRef(user);
  const isOpenRef = useRef(isOpen);

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
    
    logger.chat('рџ”Њ', 'Connecting WebSocket for user:', user.id);
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

    const observer = new IntersectionObserver(
      (entries) => {
        const inactiveTime = Date.now() - lastActivityTime;
        if (inactiveTime > 300000) {
          console.log('⚠️ User inactive, observer paused');
          return;
        }

        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            const messageEl = entry.target as HTMLElement;
            const messageId = messageEl.dataset.messageId;
            const senderId = messageEl.dataset.senderId;
            
            if (messageId && senderId && senderId !== user.id && selectedChat) {
              console.log('👀 Message', messageId, 'is visible, marking as read');
              markChatRead(selectedChat, parseInt(messageId)).catch(() => {});
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

    const messageElements = document.querySelectorAll('.message-item');
    console.log('🔍 Observing', messageElements.length, 'messages');
    messageElements.forEach(el => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, [messages, selectedChat, user, lastActivityTime]);

  useEffect(() => {
    logger.chat('рџ”Њ', 'Setting up WebSocket subscription (ONCE on mount)');

    const unsubscribe = secureChatClient.onMessage(async (wsMessage) => {
      const currentUser = userRef.current;
      const currentChatId = selectedChatRef.current;

      if (!currentUser) return;

      if (wsMessage.type === 'friend_request' && wsMessage.friendRequest) {
        logger.chat('рџ“Ё', 'New friend request received:', wsMessage.friendRequest);
        setIncomingRequests(prev => {
          if (prev.some(r => r.requestId === wsMessage.friendRequest!.requestId)) {
            return prev;
          }
          return [wsMessage.friendRequest!, ...prev];
        });
        return;
      }

      if (wsMessage.type === 'friend_accept' && wsMessage.friendRequest) {
        logger.chat('вњ…', 'Friend request accepted:', wsMessage.friendRequest);
        setIncomingRequests(prev => prev.filter(r => r.userId !== wsMessage.friendRequest!.userId));
        setOutgoingRequests(prev => prev.filter(r => r.userId !== wsMessage.friendRequest!.userId));
        try {
          const { data } = await http.get<FriendsListResponse>(endpoints.friendsList);
          setFriends(data.friends);
          logger.chat('вњ…', 'Friends list updated after accept');
        } catch (err) {
          logger.error('Failed to reload friends:', err);
        }
        return;
      }

      if (wsMessage.type === 'friend_reject' && wsMessage.friendRequest) {
        logger.chat('вќЊ', 'Friend request rejected:', wsMessage.friendRequest);
        setIncomingRequests(prev => prev.filter(r => r.userId !== wsMessage.friendRequest!.userId));
        setOutgoingRequests(prev => prev.filter(r => r.userId !== wsMessage.friendRequest!.userId));
        return;
      }

      if (wsMessage.type === 'message_read' && wsMessage.chatId && wsMessage.lastReadMessageId) {
        console.log('✅ Received message_read event for chat', wsMessage.chatId, 'up to message', wsMessage.lastReadMessageId);
        setMessages(prev => prev.map(m =>
          m.messageId <= wsMessage.lastReadMessageId! && m.senderId === currentUser.id
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

      const msg = wsMessage.message!;

      logger.chat('📨', 'WebSocket message received:', wsMessage);

      if (processedMessageIds.current.has(msg.messageId)) {
        logger.chat('⚠️', 'Message already processed, skipping:', msg.messageId);
        return;
      }
      processedMessageIds.current.add(msg.messageId);

      if (currentChatId !== msg.chatId) {
        loadChats();
      }

      // ☁️ CLOUD MODEL: Server sends plaintext 'content'
      if (currentChatId === msg.chatId) {
        setMessages((prev) => {
          if (prev.some((m) => m.messageId === msg.messageId)) return prev;
          return [...prev, {
            messageId: msg.messageId,
            senderId: msg.senderId,
            content: msg.content || '',  // ☁️ Plaintext from server
            messageType: msg.messageType,
            imagePath: msg.imagePath,
            imageUrl: msg.imageUrl,
            createdAt: msg.createdAt,
            isRead: msg.senderId === currentUser.id ? msg.isRead : false,
            replyToId: msg.replyToId,
            replyToMessage: msg.replyToMessage as ChatMessage | undefined,
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
    } catch (err) {
      logger.error('Failed to accept request:', err);
    }
  };

  const rejectRequest = async (userId: string) => {
    try {
      await http.post(endpoints.friendsRequestsReject, { userId });
      await loadIncomingRequests();
    } catch (err) {
      console.error('Failed to reject request:', err);
    }
  };

  const removeFriend = async (userId: string) => {
    if (!confirm('РЈРґР°Р»РёС‚СЊ РёР· РґСЂСѓР·РµР№?')) return;
    
    try {
      await http.post(endpoints.friendsRemove, { userId });
      await loadFriends();
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
          m.messageId <= lastId && m.senderId !== user?.id
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
          // ☁️ CLOUD MODEL: Server already sends plaintext in 'content' field
          if (chat.lastMessage && chat.lastMessage.content) {
            return {
              ...chat,
              lastMessage: {
                ...chat.lastMessage,
                content: chat.lastMessage.content,  // Already plaintext from server
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
      
      // ☁️ CLOUD MODEL: Server sends plaintext in 'content' field
      // No transformation needed - use messages as-is
      const messagesWithContent = data.messages;
      
      // 🔧 FIX: Мерджим со старыми сообщениями чтобы сохранить статус isRead
      if (!append) {
        setMessages(prev => {
          const merged = messagesWithContent.map(newMsg => {
            const oldMsg = prev.find(m => m.messageId === newMsg.messageId);
            // Если сообщение уже было помечено как прочитанное локально - сохраняем этот статус
            if (oldMsg && oldMsg.isRead && !newMsg.isRead) {
              return { ...newMsg, isRead: true };
            }
            return newMsg;
          });
          return merged;
        });
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
  
  // ☁️ CLOUD MODEL: No client-side chat key management needed
  // Server handles all encryption/decryption, clients work with plaintext
   
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
      // ☁️ CLOUD MODEL: No client-side encryption needed
      // const chatKey = await ensureChatKey(chat.chatId);
      // if (!chatKey) {
      //   alert('Ключ шифрования не получен');
      //   return;
      // }
    
      console.log('✅ Sending plaintext message with protocol integrity...');
      // ☁️ CLOUD MODEL: Plaintext + HMAC over TLS
      // Build ProtocolMessage with integrity protection
      
      const sessionKey = useSessionKeyStore.getState().getCurrentSessionKey();
      if (!sessionKey) {
        alert('Ключ сессии недоступен');
        return;
      }
      
      const msgId = Date.now();
      const seqNo = Date.now(); // Client-side seq for REST (server validates)
      const timestamp = Date.now();
      
      // HMAC computation: chatId + contentType + content + seq_no + timestamp
      const hmacData = `${chat!.chatId}${messageType}${message}${seqNo}${timestamp}`;
      const hmac = CryptoJS.HmacSHA256(hmacData, sessionKey).toString(CryptoJS.enc.Base64);
      
      const { data } = await http.post<SendMessageResponse>(endpoints.chatSend, {
        msg_id: msgId,
        seq_no: seqNo,
        timestamp: timestamp,
        chat_id: chat!.chatId,
        content_type: messageType,
        content: message,  // ☁️ Plaintext
        hmac: hmac,
        reply_to_id: replyingTo?.messageId,
      });
      
      console.log('✅ Message sent, messageId:', data.messageId);

      const createdAt = new Date().toISOString();
      setMessages(prev => [...prev, {
        messageId: data.messageId,
        senderId: user?.id || '',
        content: message,  // ☁️ CLOUD MODEL: plaintext content
        messageType,
        imagePath,
        createdAt,
        replyToId: replyingTo?.messageId,
        replyToMessage: replyingTo || undefined,
      }]);

      setChats(prev => prev.map(c => c.chatId === chat!.chatId ? {
        ...c,
        lastMessage: {
          messageId: data.messageId,
          senderId: user?.id || '',
          content: message,  // ☁️ CLOUD MODEL: plaintext content
          messageType,
          imagePath,
          createdAt,
          encryptionMetadata: '',
          replyToId: replyingTo?.messageId,
        },
      } : c));

      setReplyingTo(null);
    } catch (e) {
      console.error('Failed to send message to user', e);
      alert(e instanceof Error ? e.message : 'Ошибка отправки сообщения');
    }
  };
  
  const sendChatMessage = async () => {
    console.log('sendChatMessage called', { selectedChat, messageInput });
    if (!messageInput.trim()) {
      console.warn('Cannot send: empty message');
      return;
    }
    
    if (editingMessage) {
      await editMessage(editingMessage.messageId, messageInput.trim());
      setMessageInput('');
      setEditingMessage(null);
    } else if (selectedChat) {
      const chat = chats.find(c => c.chatId === selectedChat);
      if (!chat) {
        console.warn('Chat not found');
        return;
      }
      await sendMessageToUser(chat.participantId, messageInput.trim());
      setMessageInput('');
    }
  };

  const editMessage = async (messageId: number, newContent: string) => {
    if (!selectedChat) return;
    
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

  const deleteMessage = async (messageId: number) => {
    if (!selectedChat) return;
    
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
    
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await http.post<UploadImageResponse>(
        `${endpoints.chatUpload}?chatId=${selectedChat}`, 
        form, 
        { headers: { 'Content-Type': 'multipart/form-data' }}
      );
      
      await sendMessageToUser(
        chat.participantId, 
        '', 
        'image', 
        data.imagePath,
        data.imageEncrypted,
        data.imageEncryptionIv,
        data.imageKeyVersion
      );
    } catch (e) {
      console.error('Failed to upload image', e);
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
            messages.map(m => (
              <div 
                key={m.messageId}
                data-message-id={m.messageId}
                data-sender-id={m.senderId}
                className={`message-item flex ${m.senderId === user!.id ? 'justify-end' : 'justify-start'} group`}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({ x: e.clientX, y: e.clientY, message: m });
                }}
              >
                <div className={`max-w-[75%] rounded-2xl text-sm whitespace-pre-wrap wrap-break-word shadow-lg relative ${
                  m.messageType === 'image' ? 'p-0' : 'px-3 py-1.5'
                } ${
                  m.senderId === user!.id
                    ? 'bg-linear-to-br from-indigo-600 to-indigo-700 text-white shadow-indigo-500/30'
                    : 'bg-slate-800/90 text-slate-100 shadow-slate-900/50 border border-slate-700/50'
                }`}>
                  {m.replyToMessage && (
                    <div className={`p-2 rounded-lg border-l-2 ${m.messageType === 'image' ? 'mx-3 mt-3 mb-2' : 'mb-2'} ${
                      m.senderId === user!.id
                        ? 'bg-indigo-800/40 border-indigo-400'
                        : 'bg-slate-700/40 border-slate-500'
                    }`}>
                      <div className={`text-[10px] font-medium mb-1 ${
                        m.senderId === user!.id ? 'text-indigo-300' : 'text-slate-400'
                      }`}>
                        {m.replyToMessage.senderId === user!.id ? 'Вы' : friends.find(f => f.userId === m.replyToMessage!.senderId)?.username || 'Пользователь'}
                      </div>
                      <div className={`text-xs opacity-80 ${m.replyToMessage.messageType === 'image' ? 'italic' : 'line-clamp-2'}`}>
                        {m.replyToMessage.messageType === 'image' ? '🖼️ Изображение' : m.replyToMessage.content}
                      </div>
                    </div>
                  )}
                  {m.messageType === 'image' && (m.imageUrl || m.imagePath) ? (
                    <div className="relative">
                      <img
                        src={m.imageUrl || `/media/${m.imagePath}`}
                        alt="img"
                        className="rounded-2xl max-h-96 w-full object-cover cursor-pointer hover:opacity-95 transition-opacity"
                        onClick={() => window.open(m.imageUrl || `/media/${m.imagePath}`, '_blank')}
                      />
                      <div className="absolute bottom-2 right-2 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md flex items-center gap-1.5 shadow-lg">
                        <span className="text-[10px] text-white font-medium">
                          {new Date(m.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {m.senderId === user!.id && (
                          <span className="text-[10px] -space-x-0.5 inline-flex">
                            {m.isRead ? (
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
                    </div>
                  ) : null}
                  {m.content && m.content.trim() && (
                    <div className="leading-relaxed">{m.content}</div>
                  )}
                  {m.messageType !== 'image' && (
                    <div className={`mt-1.5 text-[10px] text-right opacity-70 flex items-center justify-end gap-1 ${
                      m.senderId === user!.id ? 'text-indigo-200' : 'text-slate-400'
                    }`}>
                      {m.edited && <span className="opacity-60">ред.</span>}
                      {new Date(m.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      {m.senderId === user!.id && (
                        <span className="ml-1 -space-x-0.5 inline-flex">
                          {m.isRead ? (
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
                  )}
                </div>
              </div>
            ))
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
                  Ответ на сообщение {replyingTo.senderId === user!.id ? 'себе' : friends.find(f => f.userId === replyingTo.senderId)?.username || 'пользователю'}:
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
            <button
              onClick={sendChatMessage}
              className="px-5 py-2.5 rounded-xl bg-linear-to-br from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-sm font-medium transition-all shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>

          <label className="inline-flex items-center gap-2 cursor-pointer group">
            <input type="file" className="hidden" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f); }} />
            <span className="text-xs text-slate-400 group-hover:text-indigo-400 transition-colors flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Прикрепить изображение
            </span>
          </label>
        </div>
      </div>
    );
  };

  if (!user) return null;

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
                            currentUserId={user!.id}
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
  currentUserId,
  onSelectChat 
}: { 
  chats: PrivateChat[]
  friends: Friend[]
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
        const displayName = friend?.displayName || friend?.username || chat.participantId.slice(0, 8);
        const lastMsg = chat.lastMessage;
        const hasUnread = lastMsg && 
          lastMsg.senderId !== currentUserId && 
          !lastMsg.isRead;

        return (
          <motion.div
            key={chat.chatId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => onSelectChat(chat.chatId)}
            className="group cursor-pointer flex items-center gap-3 p-3 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/70 hover:border-slate-700 transition-all"
          >
            {friend?.avatarUrl ? (
              <img
                src={friend.avatarUrl}
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
                  <div className="text-xs text-slate-500 shrink-0">
                    {formatDate(lastMsg.createdAt)}
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