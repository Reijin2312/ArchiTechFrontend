import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { http } from '@/shared/api/http';
import { endpoints } from '@/shared/api/endpoints';
import { authStore } from '@/shared/store/auth';
import { chatWebSocket } from '@/shared/api/chatWebSocket';
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
import * as encryption from '@/shared/lib/encryption';

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
  const [encryptionKeys, setEncryptionKeys] = useState<encryption.EncryptionKeys | null>(null);
  const [recipientPublicKeys, setRecipientPublicKeys] = useState<Map<string, CryptoKey>>(new Map());
  const [recipientSignKeys, setRecipientSignKeys] = useState<Map<string, CryptoKey>>(new Map());
  
    // вњЁ РќРћР’РћР•: С…СЂР°РЅРµРЅРёРµ unwrapped chat keys РґР»СЏ РєР°Р¶РґРѕРіРѕ С‡Р°С‚Р°
    const [chatKeys, setChatKeys] = useState<Map<number, CryptoKey>>(new Map());
  
  const pendingMessagesRef = useRef<Map<string, string>>(new Map()); // nonce -> plaintext
  const processedMessageIds = useRef<Set<number | string>>(new Set()); // Р”Р»СЏ РїСЂРµРґРѕС‚РІСЂР°С‰РµРЅРёСЏ РґСѓР±Р»РµР№ (С‡РёСЃР»Рѕ РёР»Рё "С‡РёСЃР»Рѕ_decrypted")
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const selectedChatRef = useRef(selectedChat);
  const encryptionKeysRef = useRef(encryptionKeys);
  const userRef = useRef(user);
  const isOpenRef = useRef(isOpen);
  
  // РћР±РЅРѕРІР»СЏРµРј refs РїСЂРё РёР·РјРµРЅРµРЅРёРё Р·РЅР°С‡РµРЅРёР№
  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);
  
  useEffect(() => {
    encryptionKeysRef.current = encryptionKeys;
  }, [encryptionKeys]);
  
  useEffect(() => {
    userRef.current = user;
  }, [user]);
  
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  // РџРѕРґРєР»СЋС‡РµРЅРёРµ Рє WebSocket (РІСЃРµРіРґР°, РєРѕРіРґР° РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ Р·Р°Р»РѕРіРёРЅРµРЅ)
  useEffect(() => {
    if (!user) return;
    
    logger.chat('рџ”Њ', 'Connecting WebSocket for user:', user.id);
    chatWebSocket.connect(user.id);
    
    return () => {
      logger.chat('рџ”Њ', 'Disconnecting WebSocket');
      chatWebSocket.disconnect();
    };
  }, [user]);

  // РџРѕРґРїРёСЃРєР° РЅР° WebSocket СЃРѕРѕР±С‰РµРЅРёСЏ (РћР”РРќ Р РђР— РїСЂРё РјРѕРЅС‚РёСЂРѕРІР°РЅРёРё РєРѕРјРїРѕРЅРµРЅС‚Р°)
  useEffect(() => {
    logger.chat('рџ”Њ', 'Setting up WebSocket subscription (ONCE on mount)');

    const unsubscribe = chatWebSocket.subscribe(async (wsMessage) => {
      const currentUser = userRef.current;

      if (!currentUser) return;

      // ===== РћР±СЂР°Р±РѕС‚РєР° Р·Р°СЏРІРѕРє РІ РґСЂСѓР·СЊСЏ (Р’РЎР•Р“Р”Рђ, РґР°Р¶Рµ РµСЃР»Рё РѕРєРЅРѕ Р·Р°РєСЂС‹С‚Рѕ) =====
      if (wsMessage.type === 'friend_request' && wsMessage.friendRequest) {
        logger.chat('рџ“Ё', 'New friend request received:', wsMessage.friendRequest);
        setIncomingRequests(prev => {
          // РџСЂРѕРІРµСЂСЏРµРј, РЅРµС‚ Р»Рё СѓР¶Рµ С‚Р°РєРѕР№ Р·Р°СЏРІРєРё
          if (prev.some(r => r.requestId === wsMessage.friendRequest!.requestId)) {
            return prev;
          }
          return [wsMessage.friendRequest!, ...prev];
        });
        return;
      }

      if (wsMessage.type === 'friend_accept' && wsMessage.friendRequest) {
        logger.chat('вњ…', 'Friend request accepted:', wsMessage.friendRequest);
        // РЈРґР°Р»СЏРµРј РёР· РІС…РѕРґСЏС‰РёС…
        setIncomingRequests(prev => prev.filter(r => r.userId !== wsMessage.friendRequest!.userId));
        // РЈРґР°Р»СЏРµРј РёР· РёСЃС…РѕРґСЏС‰РёС…
        setOutgoingRequests(prev => prev.filter(r => r.userId !== wsMessage.friendRequest!.userId));
        // РџРµСЂРµР·Р°РіСЂСѓР¶Р°РµРј СЃРїРёСЃРѕРє РґСЂСѓР·РµР№
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

      // ===== потоковые события чата =====
      if (wsMessage.type !== 'new_message') return;

      const msg = wsMessage.message!;

      logger.chat('📨', 'WebSocket message received:', wsMessage);

      // Пропускаем дубликаты
      if (processedMessageIds.current.has(msg.messageId)) {
        logger.chat('⚠️', 'Message already processed, skipping:', msg.messageId);
        return;
      }
      processedMessageIds.current.add(msg.messageId);

      const encKeys = encryptionKeysRef.current;
      const currentChatId = selectedChatRef.current;

      if (currentChatId !== msg.chatId) {
        // Обновляем список чатов, чтобы показать новое сообщение и непрочитанные
        loadChats();
      }

      if (msg.encryptionMetadata && encKeys && currentChatId === msg.chatId) {
        (async () => {
          try {
            // РџРѕР»СѓС‡Р°РµРј chat key
            const chatKey = await ensureChatKey(msg.chatId);
            if (!chatKey) {
              logger.warn('Chat key not available for message', msg.messageId);
              // Р”РѕР±Р°РІР»СЏРµРј СЃ РѕС€РёР±РєРѕР№
              setMessages(prev => {
                if (prev.some(m => m.messageId === msg.messageId)) return prev;
                return [...prev, {
                  messageId: msg.messageId,
                  senderId: msg.senderId,
                  encryptedContent: 'рџ”’ [РљР»СЋС‡ РЅРµРґРѕСЃС‚СѓРїРµРЅ]',
                  messageType: msg.messageType,
                  imagePath: msg.imagePath,
                  createdAt: msg.createdAt,
                }];
              });
              return;
            }
            
            const metadata = typeof msg.encryptionMetadata === 'string'
              ? JSON.parse(msg.encryptionMetadata)
              : msg.encryptionMetadata;

            let senderSignKey: CryptoKey | undefined;
            if (metadata.signature) {
              try {
                const keys = await ensureRecipientKey(msg.senderId);
                senderSignKey = keys?.signKey;
              } catch (e) {
                logger.warn('Could not get sender sign key for message', msg.messageId, e);
              }
            }

            // Р Р°СЃС€РёС„СЂРѕРІС‹РІР°РµРј
            const plain = await encryption.decryptMessageWithChatKey(
              {
                encryptedContent: msg.encryptedContent,
                encryptionMetadata: metadata,
              },
              chatKey,
              senderSignKey,
            );

            // Р”РѕР±Р°РІР»СЏРµРј СѓР¶Рµ СЂР°СЃС€РёС„СЂРѕРІР°РЅРЅРѕРµ СЃРѕРѕР±С‰РµРЅРёРµ
            setMessages(prev => {
              if (prev.some(m => m.messageId === msg.messageId)) return prev;
              return [...prev, {
                messageId: msg.messageId,
                senderId: msg.senderId,
                encryptedContent: plain,
                messageType: msg.messageType,
                imagePath: msg.imagePath,
                createdAt: msg.createdAt,
              }];
            });
            markChatRead(msg.chatId, msg.messageId).catch(() => {});
          } catch (e) {
            logger.warn('Failed to decrypt message via WebSocket', msg.messageId, e);
            setMessages(prev => {
              if (prev.some(m => m.messageId === msg.messageId)) return prev;
              return [...prev, {
                messageId: msg.messageId,
                senderId: msg.senderId,
                encryptedContent: '[Could not decrypt message]',
                messageType: msg.messageType,
                imagePath: msg.imagePath,
                createdAt: msg.createdAt,
              }];
            });
          }
        })();
      } else if (currentChatId === msg.chatId) {
        setMessages(prev => {
          if (prev.some(m => m.messageId === msg.messageId)) return prev;
          return [...prev, {
            messageId: msg.messageId,
            senderId: msg.senderId,
            encryptedContent: msg.encryptedContent,
            messageType: msg.messageType,
            imagePath: msg.imagePath,
            createdAt: msg.createdAt,
          }];
        });
        markChatRead(msg.chatId, msg.messageId).catch(() => {});
      }

    });

    return () => {
      logger.chat('🔌', 'Unsubscribing from WebSocket');
      unsubscribe();
    };
  }, []);

  // Р—Р°РіСЂСѓР¶Р°РµРј Р±Р°Р·РѕРІС‹Рµ РґР°РЅРЅС‹Рµ РїСЂРё РјРѕРЅС‚РёСЂРѕРІР°РЅРёРё (РґР»СЏ СЃС‡С‘С‚С‡РёРєРѕРІ)
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
    initEncryption();
    // РџРµСЂРµР·Р°РіСЂСѓР¶Р°РµРј Р·Р°СЏРІРєРё РїСЂРё РѕС‚РєСЂС‹С‚РёРё РґР»СЏ Р°РєС‚СѓР°Р»СЊРЅРѕСЃС‚Рё
    loadIncomingRequests();
    loadOutgoingRequests();
  }, [user, isOpen]);

  // Р—Р°РіСЂСѓР¶Р°РµРј СЃРѕРѕР±С‰РµРЅРёСЏ РїСЂРё РІС‹Р±РѕСЂРµ С‡Р°С‚Р° (РѕРґРёРЅ СЂР°Р·)
  useEffect(() => {
    if (!selectedChat || !isOpen) return;
    loadMessages(selectedChat, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChat, isOpen]);
  
  // РђРІС‚РѕРїСЂРѕРєСЂСѓС‚РєР° РїСЂРё РёР·РјРµРЅРµРЅРёРё messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [messages]);

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

  // Chat related loaders and helpers
  const markChatRead = async (chatId: number, lastId: number) => {
    try {
      await http.post(endpoints.chatRead, { chatId, lastReadMessageId: lastId });
    } catch (err) {
      logger.warn('Failed to mark chat read', err);
    }
  };

  const loadChats = async () => {
    try {
      const { data } = await http.get<ChatListResponse>(endpoints.chatList);
      
      // Р Р°СЃС€РёС„СЂРѕРІС‹РІР°РµРј РїРѕСЃР»РµРґРЅРёРµ СЃРѕРѕР±С‰РµРЅРёСЏ
      const keys = encryptionKeys || await encryption.unlockKeys();
      if (!keys) {
        setChats(data.chats);
        return;
      }

      const chatsWithDecrypted = await Promise.all(
        data.chats.map(async (chat) => {
          if (!chat.lastMessage || !chat.lastMessage.encryptionMetadata) {
            return chat;
          }

          try {
            const chatKey = await ensureChatKey(chat.chatId);
            if (!chatKey) {
              return chat;
            }

            const metadata = typeof chat.lastMessage.encryptionMetadata === 'string'
              ? JSON.parse(chat.lastMessage.encryptionMetadata)
              : chat.lastMessage.encryptionMetadata;

            const decrypted = await encryption.decryptMessageWithChatKey(
              {
                encryptedContent: chat.lastMessage.encryptedContent,
                encryptionMetadata: metadata,
              },
              chatKey,
              undefined, // РџРѕРґРїРёСЃСЊ РЅРµ РїСЂРѕРІРµСЂСЏРµРј РґР»СЏ РїСЂРµРІСЊСЋ
            );

            return {
              ...chat,
              lastMessage: {
                ...chat.lastMessage,
                encryptedContent: decrypted,
              },
            };
          } catch (e) {
            console.error('Failed to decrypt last message for chat', chat.chatId, e);
            return chat;
          }
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
      
      // вњЁ РђРІС‚РѕРјР°С‚РёС‡РµСЃРєР°СЏ СЂР°Р·Р±Р»РѕРєРёСЂРѕРІРєР° РєР»СЋС‡РµР№ РµСЃР»Рё РЅСѓР¶РЅРѕ
      let currentKeys = encryptionKeys;
      if (!currentKeys) {
        console.log('рџ”ђ Encryption keys not loaded, attempting auto-unlock...');
        currentKeys = await encryption.unlockKeys();
        if (currentKeys) {
          setEncryptionKeys(currentKeys);
        } else {
          console.error('Failed to unlock encryption keys for message decryption');
          setMessages(data.messages.map(m => ({ 
            ...m, 
            encryptedContent: '[РљР»СЋС‡Рё С€РёС„СЂРѕРІР°РЅРёСЏ РЅРµРґРѕСЃС‚СѓРїРЅС‹]' 
          })));
          return;
        }
      }
      
        // вњЁ РќРћР’РћР•: Р—Р°РіСЂСѓР¶Р°РµРј chat key РґР»СЏ СЌС‚РѕРіРѕ С‡Р°С‚Р°
        const chatKey = await ensureChatKey(chatId);
        if (!chatKey) {
          console.error('Failed to get chat key for chatId:', chatId);
          setMessages(data.messages.map(m => ({ 
            ...m, 
            encryptedContent: '[РљР»СЋС‡ С‡Р°С‚Р° РЅРµ РЅР°Р№РґРµРЅ]' 
          })));
          return;
        }
      
      const decrypted: ChatMessage[] = [];
      for (const m of data.messages) {
          // вњЁ РќРћР’РћР•: Р Р°СЃС€РёС„СЂРѕРІС‹РІР°РµРј Р’РЎР• СЃРѕРѕР±С‰РµРЅРёСЏ (РІРєР»СЋС‡Р°СЏ СЃРІРѕРё) СЃ РїРѕРјРѕС‰СЊСЋ chat key
        if (m.encryptionMetadata) {
            const metadata = typeof m.encryptionMetadata === 'string' 
              ? JSON.parse(m.encryptionMetadata)
              : m.encryptionMetadata;
            
            console.log(`рџ”“ Decrypting message ${m.messageId}...`);
            
              // РџРѕР»СѓС‡Р°РµРј РєР»СЋС‡ РїРѕРґРїРёСЃРё РѕС‚РїСЂР°РІРёС‚РµР»СЏ РґР»СЏ РїСЂРѕРІРµСЂРєРё
            let senderSignKey: CryptoKey | undefined;
            if (metadata.signature) {
              try {
                const keys = await ensureRecipientKey(m.senderId);
                senderSignKey = keys?.signKey;
              } catch (e) {
                  console.warn('Could not get sender sign key for message', m.messageId, e);
              }
            }
              
          
          try {
            // Decrypt with chat key
            const dec = await encryption.decryptMessageWithChatKey({
              encryptedContent: m.encryptedContent,
              encryptionMetadata: metadata
            }, chatKey, senderSignKey);
            console.log('🔑 Message decrypted successfully');
            decrypted.push({ ...m, encryptedContent: dec });
          } catch (e) {
            console.error('Failed to decrypt message', m.messageId, ':', e);
            const errorMsg = e instanceof Error ? e.message : "";

            if (errorMsg.includes('wrong key') || errorMsg.includes('OperationError')) {
            // Retry once with refreshed chat key
              try {
                const refreshedKey = await ensureChatKey(chatId, true);
                if (refreshedKey) {
                  const decRetry = await encryption.decryptMessageWithChatKey({
                    encryptedContent: m.encryptedContent,
                    encryptionMetadata: metadata
                  }, refreshedKey, senderSignKey);
                  console.log('Message ' + m.messageId + ' decrypted successfully after key refresh');
                  decrypted.push({ ...m, encryptedContent: decRetry });
                }
              } catch (retryErr) {
                console.warn('Retry decrypt failed', retryErr);
                decrypted.push({ ...m, encryptedContent: '🔒 [Сообщение зашифровано старым ключом и не может быть расшифровано. Удалите чат и начните заново.]' });
              }
            } else {
              decrypted.push({ ...m, encryptedContent: '🔒 [Could not decrypt: ' + errorMsg + ']' });
            }
          }
        } else {
          decrypted.push(m);
        }
      }
      setMessages(append ? prev => [...prev, ...decrypted] : decrypted);
      const last = decrypted[decrypted.length - 1];
      if (last) {
        markChatRead(chatId, last.messageId).catch(() => {});
      }
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

    /**
     * вњ… РџР РћРЎРўРћ: РџРѕР»СѓС‡РёС‚СЊ chat key - Р·Р°РіСЂСѓР¶Р°РµРј wrapped key СЃ СЃРµСЂРІРµСЂР° Рё СЂР°Р·РІРѕСЂР°С‡РёРІР°РµРј
     * РќР• РіРµРЅРµСЂРёСЂСѓРµРј РЅРѕРІС‹Р№ РєР»СЋС‡ РќРРљРћР“Р”Рђ - РєР»СЋС‡ СЃРѕР·РґР°С‘С‚СЃСЏ С‚РѕР»СЊРєРѕ РїСЂРё СЃРѕР·РґР°РЅРёРё С‡Р°С‚Р°
     */
  /**
   * Получить chat key: скачиваем wrapped key и разворачиваем. Новый ключ не генерируем.
   */
  const ensureChatKey = async (chatId: number, forceReload = false): Promise<CryptoKey | null> => {
    if (!forceReload && chatKeys.has(chatId)) {
      console.log('✅ Using cached chat key for chatId:', chatId);
      return chatKeys.get(chatId)!;
    }

    if (forceReload && chatKeys.has(chatId)) {
      setChatKeys(prev => {
        const copy = new Map(prev);
        copy.delete(chatId);
        return copy;
      });
    }
  
    console.log('🔍 Chat key not in cache, fetching from server for chatId:', chatId);
  
    // Авто-разблокировка master key
    let currentKeys = encryptionKeys;
    if (!currentKeys) {
      console.log('🔓 Encryption keys not loaded, attempting auto-unlock...');
      currentKeys = await encryption.unlockKeys();
      if (currentKeys) {
        setEncryptionKeys(currentKeys);
      } else {
        console.error('Failed to unlock encryption keys');
        return null;
      }
    }
  
    try {
      console.log('📦 Fetching wrapped key from server for chatId:', chatId);
      const { data } = await http.get(endpoints.chatWrappedKeyGet(chatId));
      console.log('📦 Server response:', data);
      
      if (!data.wrappedKey) {
        console.error('⛔ Server returned empty wrapped key:', data);
        return null;
      }
      
      console.log('📦 Received wrapped key:', data.wrappedKey.substring(0, 50) + '...');
      console.log('🔓 Unwrapping chat key with private key...');
      const chatKey = await encryption.unwrapChatKey(data.wrappedKey, currentKeys.privateKey);
    
      setChatKeys(prev => new Map(prev).set(chatId, chatKey));
      console.log('✅ Chat key unwrapped and cached for chatId:', chatId);
    
      return chatKey;
    } catch (err) {
      console.error('⛔ Failed to get wrapped key:', (err as any)?.response?.status || (err as any)?.message);
      return null;
    }
  };
  
  /**
   * вњ… РћРЎРќРћР’РќРђРЇ Р¤РЈРќРљР¦РРЇ: РЎРѕР·РґР°РЅРёРµ chat key РїСЂРё СЃРѕР·РґР°РЅРёРё С‡Р°С‚Р°
   * Р“РµРЅРµСЂРёСЂСѓРµС‚ РєР»СЋС‡ Рё СЃСЂР°Р·Сѓ СЃРѕР·РґР°С‘С‚ wrapped keys РґР»СЏ РћР‘РћРРҐ СѓС‡Р°СЃС‚РЅРёРєРѕРІ
   */
  const createChatKeyForNewChat = async (participantId: string): Promise<{ chatKey: CryptoKey; wrappedForMe: string; wrappedForRecipient: string } | null> => {
    // РђРІС‚РѕРјР°С‚РёС‡РµСЃРєР°СЏ СЂР°Р·Р±Р»РѕРєРёСЂРѕРІРєР° РєР»СЋС‡РµР№ РµСЃР»Рё РЅСѓР¶РЅРѕ
    let currentKeys = encryptionKeys;
    if (!currentKeys) {
      console.log('рџ”ђ Encryption keys not loaded, attempting auto-unlock...');
      currentKeys = await encryption.unlockKeys();
      if (currentKeys) {
        setEncryptionKeys(currentKeys);
      } else {
        console.error('вќЊ Failed to unlock encryption keys');
        return null;
      }
    }
  
    try {
      // 1пёЏвѓЈ Р“РµРЅРµСЂРёСЂСѓРµРј РЅРѕРІС‹Р№ AES-256 РєР»СЋС‡ РґР»СЏ С‡Р°С‚Р°
      console.log('рџ”‘ Generating new AES-256 chat key...');
      const chatKey = await encryption.generateChatKey();
    
      // 2пёЏвѓЈ РћР±РѕСЂР°С‡РёРІР°РµРј РµРіРѕ СЃРІРѕРёРј РїСѓР±Р»РёС‡РЅС‹Рј РєР»СЋС‡РѕРј
      console.log('рџ”’ Wrapping chat key for self...');
      const wrappedForMe = await encryption.wrapChatKey(chatKey, currentKeys.publicKey);
    
      // 3пёЏвѓЈ РћР‘РЇР—РђРўР•Р›Р¬РќРћ РїРѕР»СѓС‡Р°РµРј РєР»СЋС‡ СЃРѕР±РµСЃРµРґРЅРёРєР° Рё РѕР±РѕСЂР°С‡РёРІР°РµРј РґР»СЏ РЅРµРіРѕ
      console.log('рџ”’ Getting recipient public key...');
      const recipientKeys = await ensureRecipientKey(participantId);
      if (!recipientKeys) {
        console.error('вќЊ Failed to get recipient public key');
        throw new Error('РќРµ СѓРґР°Р»РѕСЃСЊ РїРѕР»СѓС‡РёС‚СЊ РїСѓР±Р»РёС‡РЅС‹Р№ РєР»СЋС‡ СЃРѕР±РµСЃРµРґРЅРёРєР°. РЈР±РµРґРёС‚РµСЃСЊ С‡С‚Рѕ РѕРЅ Р·Р°Р»РѕРіРёРЅРёР»СЃСЏ С…РѕС‚СЏ Р±С‹ СЂР°Р·.');
      }
      
      console.log('рџ”’ Wrapping chat key for recipient...');
      const wrappedForRecipient = await encryption.wrapChatKey(chatKey, recipientKeys.encryptKey);
      console.log('вњ… Chat key wrapped for BOTH participants');
      
      return { chatKey, wrappedForMe, wrappedForRecipient };
      
    } catch (err) {
      console.error('вќЊ Failed to create chat key:', err);
      return null;
    }
  };
  
  /**
   * вљ пёЏ DEPRECATED: РќРµ РёСЃРїРѕР»СЊР·СѓРµС‚СЃСЏ - РєР»СЋС‡Рё СЃРѕР·РґР°СЋС‚СЃСЏ С‚РѕР»СЊРєРѕ РїСЂРё СЃРѕР·РґР°РЅРёРё С‡Р°С‚Р°
   */
  const generateAndSaveChatKey = async (chatId: number): Promise<CryptoKey | null> => {
    console.error('вќЊ generateAndSaveChatKey called - this should not happen!');
    return null;
  };

  const initEncryption = async () => {
    try {
      let keys = await encryption.unlockKeys();

      if (!keys) {
        await encryption.initEncryption();
        keys = await encryption.unlockKeys();
      }

      if (!keys) {
        console.error('Failed to initialize chat encryption keys');
        return;
      }

      setEncryptionKeys(keys);

      if (user?.id) {
        try {
          const { data } = await http.get(endpoints.chatKeysGet(user.id));
          const localPublicJwk = await crypto.subtle.exportKey('jwk', keys.publicKey);
          const localSignJwk = await crypto.subtle.exportKey('jwk', keys.signPublicKey);

          const serverPublicJwk = data.publicKey ? JSON.parse(data.publicKey) : null;
          const serverSignJwk = data.signPublicKey ? JSON.parse(data.signPublicKey) : null;
          const mismatch =
            !serverPublicJwk ||
            !serverSignJwk ||
            serverPublicJwk.n !== localPublicJwk.n ||
            serverSignJwk.n !== localSignJwk.n;

          if (mismatch) {
            console.warn('Server chat keys are missing or outdated, re-uploading...');
            await http.post(endpoints.chatKeysSave, {
              publicKey: JSON.stringify(localPublicJwk),
              signPublicKey: JSON.stringify(localSignJwk),
              keyType: 'RSA'
            });
          }
        } catch (e) {
          console.error('Failed to sync chat keys with server:', e);
        }
      }
    } catch (e) {
      console.error('Failed to init chat encryption', e);
    }
  };
  const ensureRecipientKey = async (userId: string): Promise<{ encryptKey: CryptoKey; signKey?: CryptoKey } | null> => {
    try {
      const { data } = await http.get(endpoints.chatKeysGet(userId));
      const encryptKey = await encryption.importPublicKey(data.publicKey);
      setRecipientPublicKeys(prev => new Map(prev).set(userId, encryptKey));

      let signKey: CryptoKey | undefined;
      if (data.signPublicKey) {
        try {
          signKey = await encryption.importSignPublicKey(data.signPublicKey);
          setRecipientSignKeys(prev => new Map(prev).set(userId, signKey!));
        } catch (err) {
          console.error('Failed to import sign key for user', userId, err);
        }
      }

      return { encryptKey, signKey };
    } catch (err) {
      console.warn('Recipient public key not found for', userId, err);
      return null;
    }
  };

  const openChatWith = async (participantId: string) => {
    try {
      const keyData = await createChatKeyForNewChat(participantId);
      if (!keyData) {
        alert('Could not prepare chat keys');
        return;
      }

      const { data } = await http.post<CreateChatResponse>(endpoints.chatCreate, {
        participantId,
        wrappedKeyForMe: keyData.wrappedForMe,
        wrappedKeyForRecipient: keyData.wrappedForRecipient
      });

      setChatKeys(prev => new Map(prev).set(data.chatId, keyData.chatKey));

      setSelectedChat(data.chatId);
      await loadChats();
      await loadMessages(data.chatId);
      setActiveTab('chat');
    } catch (e) {
      console.error('Failed to open chat:', e);
      alert(e instanceof Error ? e.message : 'Unable to open chat');
    }
  };
  const sendMessageToUser = async (recipientId: string, message: string, messageType: 'text' | 'image' = 'text', imagePath?: string) => {
    // вњЁ РђРІС‚РѕРјР°С‚РёС‡РµСЃРєР°СЏ СЂР°Р·Р±Р»РѕРєРёСЂРѕРІРєР° РєР»СЋС‡РµР№ РµСЃР»Рё РЅСѓР¶РЅРѕ
    if (!encryptionKeys) {
      console.log('Encryption keys not loaded, attempting auto-unlock...');
      const unlockedKeys = await encryption.unlockKeys();
      if (unlockedKeys) {
        setEncryptionKeys(unlockedKeys);
      } else {
        // РџС‹С‚Р°РµРјСЃСЏ РїРѕР»РЅРѕСЃС‚СЊСЋ СЃР±СЂРѕСЃРёС‚СЊ Рё РїРµСЂРµРёРЅРёС†РёР°Р»РёР·РёСЂРѕРІР°С‚СЊ РєР»СЋС‡Рё
        console.warn('Failed to unlock keys, attempting full reset...');
        const resetKeys = await encryption.resetAndReinitializeKeys();
        if (resetKeys) {
          setEncryptionKeys(resetKeys);
          console.log('вњ… Keys reset and initialized successfully');
        } else {
          alert('Could not initialize chat encryption storage. Please reload and try again.');
          return;
        }
      }
    }
    
    const currentKeys = encryptionKeys || await encryption.unlockKeys();
    if (!currentKeys) {
      alert('РљР»СЋС‡Рё С€РёС„СЂРѕРІР°РЅРёСЏ РЅРµ РёРЅРёС†РёР°Р»РёР·РёСЂРѕРІР°РЅС‹');
      return;
    }
    
    try {
      // РџСЂРѕРІРµСЂСЏРµРј РµСЃС‚СЊ Р»Рё СѓР¶Рµ С‡Р°С‚ СЃ СЌС‚РёРј РїРѕР»СЊР·РѕРІР°С‚РµР»РµРј
      let chat = chats.find(c => c.participantId === recipientId);
      
      if (!chat) {
        // РЎРѕР·РґР°С‘Рј РЅРѕРІС‹Р№ С‡Р°С‚
        console.log('рџ“ќ Creating new chat with user:', recipientId);
        
        // 1пёЏвѓЈ РЎРѕР·РґР°С‘Рј chat key Рё wrapped keys РґР»СЏ РѕР±РѕРёС…
        const keyData = await createChatKeyForNewChat(recipientId);
        if (!keyData) {
          alert('РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕР·РґР°С‚СЊ РєР»СЋС‡Рё С€РёС„СЂРѕРІР°РЅРёСЏ РґР»СЏ С‡Р°С‚Р°');
          return;
        }
        
        // 2пёЏвѓЈ РЎРѕР·РґР°С‘Рј С‡Р°С‚ РЅР° СЃРµСЂРІРµСЂРµ СЃ wrapped keys
        const { data: createData } = await http.post<{ chatId: number }>(endpoints.chatCreate, {
          participantId: recipientId,
          wrappedKeyForMe: keyData.wrappedForMe,
          wrappedKeyForRecipient: keyData.wrappedForRecipient
        });
        
        // 3пёЏвѓЈ РљСЌС€РёСЂСѓРµРј chat key
        setChatKeys(prev => new Map(prev).set(createData.chatId, keyData.chatKey));
        console.log('вњ… Chat created with wrapped keys for BOTH users, chatId:', createData.chatId);
        
        const friend = friends.find(f => f.userId === recipientId);
        chat = {
          chatId: createData.chatId,
          participantId: recipientId,
          lastMessage: undefined,
          createdAt: new Date().toISOString()
        };
        setChats(prev => [chat!, ...prev]);
        setSelectedChat(createData.chatId);
      }
      
        // вњЁ РќРћР’РћР•: РџРѕР»СѓС‡Р°РµРј chat key (РёР»Рё СЃРѕР·РґР°С‘Рј РµСЃР»Рё РЅСѓР¶РЅРѕ)
        console.log('рџ”‘ Getting chat key for chatId:', chat.chatId);
        const chatKey = await ensureChatKey(chat.chatId);
        if (!chatKey) {
          alert('РќРµ СѓРґР°Р»РѕСЃСЊ РїРѕР»СѓС‡РёС‚СЊ РєР»СЋС‡ С€РёС„СЂРѕРІР°РЅРёСЏ С‡Р°С‚Р°');
          return;
        }
      
        // вњЁ РќРћР’РћР•: РЁРёС„СЂСѓРµРј СЃ РїРѕРјРѕС‰СЊСЋ chat key (РЅРµ RSA!)
        console.log('рџ”ђ Encrypting message with chat key...');
        const encrypted = await encryption.encryptMessageWithChatKey(
        message, 
          chatKey,
        currentKeys.signPrivateKey
      );
      
        console.log('вњ… Message encrypted with chat key');
      
      // РћС‚РїСЂР°РІР»СЏРµРј РЅР° СЃРµСЂРІРµСЂ
      console.log('Sending to server...');
      
      const { data } = await http.post<SendMessageResponse>(endpoints.chatSend, {
        chatId: chat!.chatId,
        encryptedContent: encrypted.encryptedContent,
        encryptionMetadata: encrypted.encryptionMetadata,
        messageType,
        imagePath
      });
      
      console.log('✅ Message sent, messageId:', data.messageId);

      const createdAt = new Date().toISOString();
      setMessages(prev => [...prev, {
        messageId: data.messageId,
        senderId: user?.id || '',
        encryptedContent: message,
        messageType,
        imagePath,
        createdAt,
      }]);

      setChats(prev => prev.map(c => c.chatId === chat!.chatId ? {
        ...c,
        lastMessage: {
          messageId: data.messageId,
          senderId: user?.id || '',
          encryptedContent: message,
          messageType,
          imagePath,
          createdAt,
          encryptionMetadata: '',
        },
      } : c));

      markChatRead(chat!.chatId, data.messageId).catch(() => {});
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 30);
    } catch (e) {
      console.error('Failed to send message to user', e);
      alert(e instanceof Error ? e.message : 'РћС€РёР±РєР° РѕС‚РїСЂР°РІРєРё СЃРѕРѕР±С‰РµРЅРёСЏ');
    }
  };
  
  const sendChatMessage = async () => {
    console.log('sendChatMessage called', { selectedChat, messageInput, hasKeys: !!encryptionKeys });
    if (!messageInput.trim()) {
      console.warn('Cannot send: empty message');
      return;
    }
    
    // Р•СЃР»Рё РІС‹Р±СЂР°РЅ РєРѕРЅРєСЂРµС‚РЅС‹Р№ С‡Р°С‚ - РѕС‚РїСЂР°РІР»СЏРµРј РІ РЅРµРіРѕ
    if (selectedChat) {
      const chat = chats.find(c => c.chatId === selectedChat);
      if (!chat) {
        console.warn('Chat not found');
        return;
      }
      await sendMessageToUser(chat.participantId, messageInput.trim());
      setMessageInput('');
    }
  };

  const uploadImage = async (file: File) => {
    if (!selectedChat || !file || !encryptionKeys) return;
    const chat = chats.find(c => c.chatId === selectedChat);
    if (!chat) return;
    
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await http.post<UploadImageResponse>(endpoints.chatUpload, form, { headers: { 'Content-Type': 'multipart/form-data' }});
      await sendMessageToUser(chat.participantId, '', 'image', data.imagePath);
    } catch (e) {
      console.error('Failed to upload image', e);
    }
  };

  // Render chat view
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
          {/* Кнопка назад */}
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
              <div key={m.messageId} className={`flex ${m.senderId === user!.id ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words shadow-lg ${
                  m.senderId === user!.id
                    ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-indigo-500/30'
                    : 'bg-slate-800/90 text-slate-100 shadow-slate-900/50 border border-slate-700/50'
                }`}>
                  {m.messageType === 'image' && m.imagePath ? (
                    <img
                      src={`/media/${m.imagePath}`}
                      alt="img"
                      className="rounded-xl mb-2 max-h-64 w-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(`/media/${m.imagePath}`, '_blank')}
                    />
                  ) : null}
                  {m.encryptedContent && m.encryptedContent.trim() && (
                    <div className="leading-relaxed">{m.encryptedContent}</div>
                  )}
                  <div className={`mt-1.5 text-[10px] text-right opacity-70 ${
                    m.senderId === user!.id ? 'text-indigo-200' : 'text-slate-400'
                  }`}>
                    {new Date(m.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="flex-none p-3 border-t border-slate-800/50 bg-slate-900/30">
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
              className="px-5 py-2.5 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-sm font-medium transition-all shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50"
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
              РџСЂРёРєСЂРµРїРёС‚СЊ РёР·РѕР±СЂР°Р¶РµРЅРёРµ
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
      {/* Overlay */}
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

      {/* Floating Panel */}
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
              {/* Header */}
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

              {/* Tabs */}
              <div className="flex gap-1 px-2 py-2 border-b border-slate-800 bg-slate-900/40">
                <TabButton
                  active={activeTab === 'friends'}
                  onClick={() => setActiveTab('friends')}
                  label="Друзья"
                  count={friends.length}
                />
                <TabButton
                  active={activeTab === 'chat'}
                  onClick={() => setActiveTab('chat')}
                  label="Чат"
                  count={chats.length}
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

              {/* Content */}
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
                      {/* Sub-tabs РґР»СЏ Р·Р°СЏРІРѕРє */}
                      <div className="flex gap-2 mb-3">
                        <button
                          onClick={() => setRequestsSubTab('incoming')}
                          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            requestsSubTab === 'incoming'
                              ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-500/30'
                              : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 border border-slate-700/50'
                          }`}
                        >
                          Р’С…РѕРґСЏС‰РёРµ {incomingCount > 0 && `(${incomingCount})`}
                        </button>
                        <button
                          onClick={() => setRequestsSubTab('outgoing')}
                          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            requestsSubTab === 'outgoing'
                              ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-500/30'
                              : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 border border-slate-700/50'
                          }`}
                        >
                          РСЃС…РѕРґСЏС‰РёРµ {outgoingCount > 0 && `(${outgoingCount})`}
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
                        /* РЎРїРёСЃРѕРє С‡Р°С‚РѕРІ */
                        <div className="h-full overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                          <ChatsList 
                            chats={chats} 
                            friends={friends}
                            currentUserId={user!.id}
                            onSelectChat={(chatId) => { setSelectedChat(chatId); loadMessages(chatId); }}
                          />
                        </div>
                      ) : (
                        /* РћС‚РєСЂС‹С‚С‹Р№ С‡Р°С‚ */
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

      {/* Floating Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="РћС‚РєСЂС‹С‚СЊ СЃРѕС†РёР°Р»СЊРЅСѓСЋ СЃРµС‚СЊ"
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
        <p>РЈ РІР°СЃ РїРѕРєР° РЅРµС‚ РґСЂСѓР·РµР№</p>
        <p className="text-xs mt-1">РСЃРїРѕР»СЊР·СѓР№С‚Рµ РїРѕРёСЃРє</p>
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
      
      if (diffDays === 0) return 'РЎРµРіРѕРґРЅСЏ';
      if (diffDays === 1) return 'Р’С‡РµСЂР°';
      if (diffDays < 7) return `${diffDays} РґРЅ. РЅР°Р·Р°Рґ`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} РЅРµРґ. РЅР°Р·Р°Рґ`;
      if (diffDays < 365) return `${Math.floor(diffDays / 30)} РјРµСЃ. РЅР°Р·Р°Рґ`;
      return `${Math.floor(diffDays / 365)} Рі. РЅР°Р·Р°Рґ`;
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
                <div className="text-xs text-slate-500 truncate" title={`Р”СЂСѓР·СЊСЏ СЃ ${new Date(friend.acceptedAt).toLocaleString('ru')}`}>
                  {formatDate(friend.acceptedAt)}
                </div>
              )}
            </div>
          </Link>
          <button
            onClick={() => onOpenChat(friend.userId)}
            className="p-1.5 text-xs rounded bg-indigo-600/20 hover:bg-indigo-600/40 hover:text-indigo-300 transition-all border border-indigo-600/30"
            title="РќР°РїРёСЃР°С‚СЊ"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </button>
          <button
            onClick={() => onRemove(friend.userId)}
            className="opacity-0 group-hover:opacity-100 p-1.5 text-xs rounded hover:bg-slate-800 hover:text-rose-300 transition-all"
            title="РЈРґР°Р»РёС‚СЊ"
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
        <div className="text-center py-6 text-slate-400 text-sm">РќРёС‡РµРіРѕ РЅРµ РЅР°Р№РґРµРЅРѕ</div>
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
                  вњ“
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
        РќРµС‚ РІС…РѕРґСЏС‰РёС… Р·Р°СЏРІРѕРє
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
              title="РџСЂРёРЅСЏС‚СЊ"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
            <button
              onClick={() => onReject(req.userId)}
              className="p-1.5 text-xs rounded border border-slate-700 hover:border-rose-500 hover:text-rose-300"
              title="РћС‚РєР»РѕРЅРёС‚СЊ"
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
        РќРµС‚ РёСЃС…РѕРґСЏС‰РёС… Р·Р°СЏРІРѕРє
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
                <div className="text-xs text-emerald-300 truncate">вњ“ РџСЂРёРЅСЏС‚Р°</div>
              )}
              {req.status === 'REJECTED' && (
                <div className="text-xs text-rose-300 truncate">вњ• РћС‚РєР»РѕРЅРµРЅР°</div>
              )}
              {req.status === 'PENDING' && (
                <div className="text-xs text-amber-300 truncate">вЏі РћР¶РёРґР°РµС‚</div>
              )}
            </div>
          </Link>
          {req.status === 'PENDING' && (
            <button
              onClick={() => onCancel(req.userId)}
              className="p-1.5 text-xs rounded border border-slate-700 hover:border-rose-500 hover:text-rose-300"
              title="РћС‚РјРµРЅРёС‚СЊ"
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
        const hasUnread = lastMsg && (
          (lastMsg.senderId !== currentUserId) && 
          (chat.participantId === lastMsg.senderId)
        );

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
                  <div className="text-xs text-slate-500 flex-shrink-0">
                    {formatDate(lastMsg.createdAt)}
                  </div>
                )}
              </div>
              
              {lastMsg ? (
                <div className="flex items-center gap-2">
                  <div className={`text-xs truncate flex-1 ${hasUnread ? 'text-slate-300 font-medium' : 'text-slate-400'}`}>
                    {lastMsg.messageType === 'image' ? '🖼️ Изображение' : lastMsg.encryptedContent}
                  </div>
                  {hasUnread && (
                    <div className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0 animate-pulse"></div>
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
