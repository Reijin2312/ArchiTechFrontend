import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { http } from '@/shared/api/http';
import { endpoints } from '@/shared/api/endpoints';
import { authStore } from '@/shared/store/auth';
import { chatWebSocket } from '@/shared/api/chatWebSocket';
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

type Tab = 'friends' | 'search' | 'incoming' | 'outgoing' | 'chat';

export function SocialFloatingButton() {
  const user = authStore(s => s.user);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('friends');
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
  
    // ✨ НОВОЕ: хранение unwrapped chat keys для каждого чата
    const [chatKeys, setChatKeys] = useState<Map<number, CryptoKey>>(new Map());
  
  const pendingMessagesRef = useRef<Map<string, string>>(new Map()); // nonce -> plaintext
  const processedMessageIds = useRef<Set<number | string>>(new Set()); // Для предотвращения дублей (число или "число_decrypted")
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const selectedChatRef = useRef(selectedChat);
  const encryptionKeysRef = useRef(encryptionKeys);
  const userRef = useRef(user);
  const isOpenRef = useRef(isOpen);
  
  // Обновляем refs при изменении значений
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

  // Подключение к WebSocket (только при открытии/закрытии)
  useEffect(() => {
    if (!user || !isOpen) return;
    
    chatWebSocket.connect(user.id);
    
    return () => {
      chatWebSocket.disconnect();
    };
  }, [user, isOpen]);

  // Подписка на WebSocket сообщения (ОДИН РАЗ при монтировании компонента)
  useEffect(() => {
    console.log('🔌 Setting up WebSocket subscription (ONCE on mount)');

    const unsubscribe = chatWebSocket.subscribe(async (wsMessage) => {
      const currentUser = userRef.current;
      const isCurrentlyOpen = isOpenRef.current;

      if (!currentUser || !isCurrentlyOpen) return;

      if (wsMessage.type !== 'new_message') return;
      if (selectedChatRef.current !== wsMessage.chatId) return;

      const msg = wsMessage.message;

      console.log('WebSocket message received:', wsMessage);

      // Дедупликация по messageId (на случай StrictMode / нескольких подписчиков)
      if (processedMessageIds.current.has(msg.messageId)) {
        console.log('❌ Message already processed, skipping:', msg.messageId);
        return;
      }
      processedMessageIds.current.add(msg.messageId);

      // ✨ НОВОЕ: Показываем зашифрованный текст, затем асинхронно расшифровываем
      let decryptedText = msg.encryptedContent; // Временно показываем шифротекст

      const baseMessage: ChatMessage = {
        messageId: msg.messageId,
        senderId: msg.senderId,
        encryptedContent: decryptedText,
        messageType: msg.messageType,
        imagePath: msg.imagePath,
        createdAt: msg.createdAt,
      };

      // ---------- 2. Обновляем state БЕЗ побочных эффектов ----------
      setMessages(prev => {
        // Идемпотентность: не добавляем повторно одно и то же messageId,
        // даже если updater вызовут два раза (StrictMode)
        if (prev.some(m => m.messageId === msg.messageId)) {
          return prev;
        }
        return [...prev, baseMessage];
      });

      // ✨ НОВОЕ: Асинхронная расшифровка ВСЕХ сообщений через chat key
      const encKeys = encryptionKeysRef.current;
      const currentChatId = selectedChatRef.current;

      if (msg.encryptionMetadata && encKeys && currentChatId === msg.chatId) {
        (async () => {
          try {
            // Получаем chat key (должен быть уже в кэше)
            const chatKey = await ensureChatKey(msg.chatId);
            if (!chatKey) {
              console.warn('Chat key not available for message', msg.messageId);
              return;
            }
            
            const metadata = typeof msg.encryptionMetadata === 'string'
              ? JSON.parse(msg.encryptionMetadata)
              : msg.encryptionMetadata;

            let senderSignKey: CryptoKey | undefined;
            if (metadata.signature) {
              try {
                const keys = await ensureRecipientKey(msg.senderId);
                senderSignKey = keys.signKey;
              } catch (e) {
                console.warn('Could not get sender sign key for message', msg.messageId, e);
              }
            }

            // ✨ ИСПОЛЬЗУЕМ CHAT KEY
            const plain = await encryption.decryptMessageWithChatKey(
              {
                encryptedContent: msg.encryptedContent,
                encryptionMetadata: metadata,
              },
              chatKey,
              senderSignKey,
            );

            setMessages(prev =>
              prev.map(m =>
                m.messageId === msg.messageId
                  ? { ...m, encryptedContent: plain }
                  : m,
              ),
            );
          } catch (e) {
            console.warn('Failed to decrypt message via WebSocket', msg.messageId, e);
          }
        })();
      }

    });

    return () => {
      console.log('🧹 Unsubscribing from WebSocket');
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user || !isOpen) return;
    loadFriends();
    loadIncomingRequests();
    loadOutgoingRequests();
    loadChats();
    initEncryption();
  }, [user, isOpen]);

  // Загружаем сообщения при выборе чата (один раз)
  useEffect(() => {
    if (!selectedChat || !isOpen) return;
    loadMessages(selectedChat, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChat, isOpen]);
  
  // Автопрокрутка при изменении messages
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
      console.error('Failed to load friends:', err);
    }
  };

  const loadIncomingRequests = async () => {
    try {
      const { data } = await http.get<FriendRequestsResponse>(endpoints.friendsRequestsIncoming);
      setIncomingRequests(data.requests);
    } catch (err) {
      console.error('Failed to load incoming requests:', err);
    }
  };

  const loadOutgoingRequests = async () => {
    try {
      const { data } = await http.get<FriendRequestsResponse>(endpoints.friendsRequestsOutgoing);
      setOutgoingRequests(data.requests);
    } catch (err) {
      console.error('Failed to load outgoing requests:', err);
    }
  };

  const searchUsers = async () => {
    if (searchQuery.length < 2) return;
    
    setLoading(true);
    try {
      const { data } = await http.get<UserSearchResponse>(endpoints.friendsSearch(searchQuery));
      setSearchResults(data.users);
    } catch (err) {
      console.error('Search failed:', err);
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
      console.error('Failed to send request:', err);
    }
  };

  const acceptRequest = async (userId: string) => {
    try {
      await http.post(endpoints.friendsRequestsAccept, { userId });
      await loadFriends();
      await loadIncomingRequests();
    } catch (err) {
      console.error('Failed to accept request:', err);
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
    if (!confirm('Удалить из друзей?')) return;
    
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
  const loadChats = async () => {
    try {
      const { data } = await http.get<ChatListResponse>(endpoints.chatList);
      setChats(data.chats);
    } catch (err) {
      console.error('Failed to load chats:', err);
    }
  };

  const loadMessages = async (chatId: number, append = false) => {
    try {
      const { data } = await http.get<ChatMessagesResponse>(endpoints.chatMessages(chatId));
      
      // ✨ Автоматическая разблокировка ключей если нужно
      let currentKeys = encryptionKeys;
      if (!currentKeys) {
        console.log('🔐 Encryption keys not loaded, attempting auto-unlock...');
        currentKeys = await encryption.unlockKeys();
        if (currentKeys) {
          setEncryptionKeys(currentKeys);
        } else {
          console.error('Failed to unlock encryption keys for message decryption');
          setMessages(data.messages.map(m => ({ 
            ...m, 
            encryptedContent: '[Ключи шифрования недоступны]' 
          })));
          return;
        }
      }
      
        // ✨ НОВОЕ: Загружаем chat key для этого чата
        const chatKey = await ensureChatKey(chatId);
        if (!chatKey) {
          console.error('Failed to get chat key for chatId:', chatId);
          setMessages(data.messages.map(m => ({ 
            ...m, 
            encryptedContent: '[Ключ чата не найден]' 
          })));
          return;
        }
      
      const decrypted: ChatMessage[] = [];
      for (const m of data.messages) {
          // ✨ НОВОЕ: Расшифровываем ВСЕ сообщения (включая свои) с помощью chat key
        if (m.encryptionMetadata) {
          try {
            const metadata = typeof m.encryptionMetadata === 'string' 
              ? JSON.parse(m.encryptionMetadata)
              : m.encryptionMetadata;
            
            console.log(`🔓 Decrypting message ${m.messageId}...`);
            
              // Получаем ключ подписи отправителя для проверки
            let senderSignKey: CryptoKey | undefined;
            if (metadata.signature) {
              try {
                const keys = await ensureRecipientKey(m.senderId);
                senderSignKey = keys.signKey;
              } catch (e) {
                  console.warn('Could not get sender sign key for message', m.messageId, e);
              }
            }
              
              // ✨ ИСПОЛЬЗУЕМ CHAT KEY для расшифровки
              const dec = await encryption.decryptMessageWithChatKey({
              encryptedContent: m.encryptedContent,
              encryptionMetadata: metadata
              }, chatKey, senderSignKey);
            console.log(`✅ Message ${m.messageId} decrypted successfully`);
            decrypted.push({ ...m, encryptedContent: dec });
          } catch (e) {
            console.error('❌ Failed to decrypt message', m.messageId, ':', e);
            const errorMsg = e instanceof Error ? e.message : '';
            
            // Если это проблема с неверным ключом - информируем пользователя
            if (errorMsg.includes('wrong key') || errorMsg.includes('OperationError')) {
              decrypted.push({ 
                ...m, 
                encryptedContent: '🔒 [Сообщение зашифровано старым ключом и не может быть расшифровано. Удалите чат и начните заново.]' 
              });
            } else {
              decrypted.push({ 
                ...m, 
                encryptedContent: '[Не удалось расшифровать: ' + errorMsg + ']' 
              });
            }
          }
        } else {
          decrypted.push(m);
        }
      }
      setMessages(append ? prev => [...prev, ...decrypted] : decrypted);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

    /**
     * ✨ НОВАЯ ФУНКЦИЯ: Получить или создать chat key для чата
     * Если ключ существует на сервере - разворачиваем его
     * Если нет - генерируем новый и сохраняем wrapped версии для обоих участников
     */
    const ensureChatKey = async (chatId: number): Promise<CryptoKey | null> => {
      // Проверяем есть ли уже в памяти
      if (chatKeys.has(chatId)) {
        console.log('✅ Using cached chat key for chatId:', chatId);
        return chatKeys.get(chatId)!;
      }
    
      console.log('💾 Chat key not in cache, need to fetch/unwrap for chatId:', chatId);
    
      // ✨ Автоматическая разблокировка ключей если нужно
      let currentKeys = encryptionKeys;
      if (!currentKeys) {
        console.log('🔐 Encryption keys not loaded, attempting auto-unlock...');
        currentKeys = await encryption.unlockKeys();
        if (currentKeys) {
          setEncryptionKeys(currentKeys);
        } else {
          console.error('Failed to unlock encryption keys');
          return null;
        }
      }
    
      try {
        // Пытаемся загрузить wrapped key с сервера
        console.log('🔍 Fetching wrapped key from server for chatId:', chatId);
        const { data } = await http.get(endpoints.chatWrappedKeyGet(chatId));
      
        console.log('📦 Received wrapped key:', data.wrappedKey.substring(0, 50) + '...');
      
        // Разворачиваем ключ своим приватным ключом
        console.log('🔓 Unwrapping chat key with private key...');
        const chatKey = await encryption.unwrapChatKey(data.wrappedKey, currentKeys.privateKey);
      
        // Кэшируем
        setChatKeys(prev => new Map(prev).set(chatId, chatKey));
        console.log('✅ Chat key unwrapped and cached for chatId:', chatId);
      
        return chatKey;
      } catch (err: any) {
        // Если ключ не найден (404) - генерируем новый
        if (err?.response?.status === 404) {
          console.log('🔑 No wrapped key found on server, generating new chat key...');
          return await generateAndSaveChatKey(chatId);
        }
      
        console.error('❌ Failed to get wrapped key:', err);
        return null;
      }
    };
  
  /**
   * ✨ НОВАЯ ФУНКЦИЯ: Генерация и сохранение нового chat key
   * Если получатель ещё не сгенерировал ключи - сохраняем только свой wrapped key
   * ⚠️ ВАЖНО: Генерирует новый ключ ТОЛЬКО если его нет на сервере
   */
  const generateAndSaveChatKey = async (chatId: number): Promise<CryptoKey | null> => {
    // ✨ Автоматическая разблокировка ключей если нужно
    let currentKeys = encryptionKeys;
    if (!currentKeys) {
      console.log('🔐 Encryption keys not loaded, attempting auto-unlock...');
      currentKeys = await encryption.unlockKeys();
      if (currentKeys) {
        setEncryptionKeys(currentKeys);
      } else {
        console.error('Failed to unlock encryption keys');
        return null;
      }
    }
  
    try {
      // ⚠️ ВАЖНО: Сначала проверяем, может уже есть wrapped key на сервере
      // (это может произойти если собеседник уже создал ключ для нас)
      try {
        console.log('🔍 Double-checking if wrapped key exists on server...');
        const { data } = await http.get(endpoints.chatWrappedKeyGet(chatId));
        if (data.wrappedKey) {
          console.log('✅ Found existing wrapped key, unwrapping instead of generating new...');
          const existingKey = await encryption.unwrapChatKey(data.wrappedKey, currentKeys.privateKey);
          setChatKeys(prev => new Map(prev).set(chatId, existingKey));
          return existingKey;
        }
      } catch (e) {
        // 404 = ключа нет, продолжаем генерацию
        console.log('No existing wrapped key found, will generate new one');
      }
      
      // Получаем информацию о чате и собеседнике
      const chat = chats.find(c => c.chatId === chatId);
      if (!chat) {
        console.error('Chat not found:', chatId);
        return null;
      }
    
      // Генерируем новый AES-256 ключ для чата
      console.log('🔑 Generating new AES-256 chat key...');
      const chatKey = await encryption.generateChatKey();
    
      // Оборачиваем его своим публичным ключом
      console.log('🔒 Wrapping chat key for self...');
      const wrappedForMe = await encryption.wrapChatKey(chatKey, currentKeys.publicKey);
    
      // ✅ Пытаемся обернуть для собеседника (но не требуем его ключ обязательно)
      let recipientWrappedKey: string | null = null;
      try {
        console.log('🔒 Attempting to wrap chat key for recipient...');
        const recipientKeys = await ensureRecipientKey(chat.participantId);
        if (recipientKeys) {
          recipientWrappedKey = await encryption.wrapChatKey(chatKey, recipientKeys.encryptKey);
          console.log('✅ Recipient wrapped key created');
        }
      } catch (e) {
        console.warn('⚠️ Could not wrap key for recipient (will wrap when they log in):', e);
      }
    
    // Сохраняем свой wrapped key на сервере (обязательно)
    console.log('💾 Saving my wrapped key to server...');
    await http.post(endpoints.chatWrappedKeySave, {
      chatId,
      wrappedKey: wrappedForMe
    });
  
    // ✅ Если удалось обернуть для собеседника - сохраняем и его wrapped key
    if (recipientWrappedKey) {
      console.log('💾 Saving recipient wrapped key to server...');
      await http.post(endpoints.chatWrappedKeySaveForParticipant, {
        chatId,
        participantId: chat.participantId,
        wrappedKey: recipientWrappedKey
      });
      console.log('✅ Recipient wrapped key saved');
    }      // Кэшируем
      setChatKeys(prev => new Map(prev).set(chatId, chatKey));
      console.log('✅ New chat key generated and saved');
    
      return chatKey;
    } catch (err) {
      console.error('Failed to generate and save chat key:', err);
      return null;
    }
  };  const initEncryption = async () => {
    console.log('Initializing encryption...');
    // ✅ ИСПРАВЛЕНО: Используем loadKeysLegacy (временно без пароля)
    const existing = await encryption.loadKeysLegacy();
    if (existing) {
      console.log('Loaded existing keys');
      
      // 🔍 ДИАГНОСТИКА: Проверяем что ключи на сервере совпадают с локальными
      try {
        const userId = user?.id;
        if (userId) {
          console.log('🔍 Checking if server keys match local keys...');
          const { data } = await http.get(endpoints.chatKeysGet(userId));
          
          const localPublicJwk = await crypto.subtle.exportKey('jwk', existing.publicKey);
          const localSignJwk = await crypto.subtle.exportKey('jwk', existing.signPublicKey);
          
          const serverPublicJwk = JSON.parse(data.publicKey);
          const serverSignJwk = JSON.parse(data.signPublicKey);
          
          console.log('Local publicKey n:', localPublicJwk.n?.substring(0, 20));
          console.log('Server publicKey n:', serverPublicJwk.n?.substring(0, 20));
          console.log('Match?', localPublicJwk.n === serverPublicJwk.n);
          
          if (localPublicJwk.n !== serverPublicJwk.n) {
            console.error('❌ SERVER KEYS MISMATCH! Need to re-upload.');
            
            // Перезагружаем ключи на сервер
            await http.post(endpoints.chatKeysSave, {
              publicKey: JSON.stringify(localPublicJwk),
              signPublicKey: JSON.stringify(localSignJwk),
              keyType: 'RSA'
            });
            console.log('✅ Keys re-uploaded to server');
          } else {
            console.log('✅ Server keys match local keys');
          }
        }
      } catch (e) {
        console.error('Failed to check server keys:', e);
      }
      
      setEncryptionKeys(existing);
      return;
    }
    console.log('Generating new key pair...');
    await encryption.initEncryption();
    // Перезагружаем ключи
    const newKeys = await encryption.loadKeysLegacy();
    if (newKeys) {
      setEncryptionKeys(newKeys);
    }
  };

  const ensureRecipientKey = async (userId: string): Promise<{ encryptKey: CryptoKey; signKey?: CryptoKey } | null> => {
    console.log('Ensuring recipient key for:', userId);
    
    // 🔧 ВРЕМЕННО: Всегда загружаем свежие ключи с сервера (без кэша)
    // TODO: Добавить время жизни кэша или invalidation
    console.log('Fetching fresh public keys from server for:', userId);
    
    try {
      const { data } = await http.get(endpoints.chatKeysGet(userId));
      console.log('Received key data:', data);
      console.log('signPublicKey type:', typeof data.signPublicKey);
      console.log('signPublicKey value:', data.signPublicKey?.substring(0, 50));
      
      const key = await encryption.importPublicKey(data.publicKey);
      setRecipientPublicKeys(prev => new Map(prev).set(userId, key));
      
      let signKey: CryptoKey | undefined;
      
      // Также кэшируем ключ подписи если есть
      if (data.signPublicKey && data.signPublicKey !== '') {
        try {
          console.log('Importing sign public key...');
          signKey = await encryption.importSignPublicKey(data.signPublicKey);
          setRecipientSignKeys(prev => new Map(prev).set(userId, signKey!));
          console.log('✅ Sign key imported successfully');
        } catch (e) {
          console.error('❌ Failed to import sign key:', e);
          console.error('   Sign key was:', data.signPublicKey);
        }
      } else {
        console.warn('⚠️ No signPublicKey from server');
      }
      
      console.log('Keys imported and cached for:', userId);
      return { encryptKey: key, signKey };
    } catch (e) {
      console.warn('⚠️ Recipient key not found for:', userId);
      // ✅ НЕ выбрасываем ошибку — возвращаем null и работаем без wrapped key получателя
      return null;
    }
  };

  const openChatWith = async (participantId: string) => {
    try {
      // ✨ Автоматическая разблокировка ключей если нужно
      if (!encryptionKeys) {
        console.log('🔐 Encryption keys not loaded, attempting auto-unlock...');
        const unlockedKeys = await encryption.unlockKeys();
        if (unlockedKeys) {
          setEncryptionKeys(unlockedKeys);
        } else {
          // Пытаемся полностью сбросить и переинициализировать ключи
          console.warn('⚠️ Failed to unlock keys, attempting full reset...');
          const resetKeys = await encryption.resetAndReinitializeKeys();
          if (resetKeys) {
            setEncryptionKeys(resetKeys);
            console.log('✅ Keys reset and initialized successfully');
          } else {
            alert('Не удалось инициализировать ключи шифрования. Перезагрузите страницу и попробуйте снова.');
            return;
          }
        }
      }
      
      const currentKeys = encryptionKeys || await encryption.unlockKeys();
      if (!currentKeys) {
        alert('Ключи шифрования не инициализированы');
        return;
      }
      
      console.log('🔑 Generating chat key for new chat...');
      const chatKey = await encryption.generateChatKey();
      
      // Wrap для себя
      const wrappedForMe = await encryption.wrapChatKey(chatKey, currentKeys.publicKey);
      
      // ✅ Попытка wrap для собеседника (может быть null если ключа нет)
      const recipientKeys = await ensureRecipientKey(participantId);
      const wrappedForRecipient = recipientKeys 
        ? await encryption.wrapChatKey(chatKey, recipientKeys.encryptKey)
        : null;
      
      console.log('💾 Creating chat with wrapped keys...');
      const { data } = await http.post<CreateChatResponse>(endpoints.chatCreate, { 
        participantId,
        wrappedKeyForMe: wrappedForMe,
        wrappedKeyForRecipient: wrappedForRecipient || undefined // null → undefined для бэкенда
      });
      
      // Кэшируем chat key
      setChatKeys(prev => new Map(prev).set(data.chatId, chatKey));
      console.log('✅ Chat created with wrapped keys');
      
      if (!wrappedForRecipient) {
        console.warn('⚠️ Recipient will need to generate wrapped key on first login');
      }
      
      setSelectedChat(data.chatId);
      await loadChats();
      await loadMessages(data.chatId);
      setActiveTab('chat');
    } catch (e) {
      console.error('Failed to open chat', e);
      alert(e instanceof Error ? e.message : 'Не удалось открыть чат');
    }
  };

  // Отправить сообщение пользователю (с автосозданием чата если нужно)
  const sendMessageToUser = async (recipientId: string, message: string, messageType: 'text' | 'image' = 'text', imagePath?: string) => {
    // ✨ Автоматическая разблокировка ключей если нужно
    if (!encryptionKeys) {
      console.log('🔐 Encryption keys not loaded, attempting auto-unlock...');
      const unlockedKeys = await encryption.unlockKeys();
      if (unlockedKeys) {
        setEncryptionKeys(unlockedKeys);
      } else {
        // Пытаемся полностью сбросить и переинициализировать ключи
        console.warn('⚠️ Failed to unlock keys, attempting full reset...');
        const resetKeys = await encryption.resetAndReinitializeKeys();
        if (resetKeys) {
          setEncryptionKeys(resetKeys);
          console.log('✅ Keys reset and initialized successfully');
        } else {
          alert('Не удалось инициализировать ключи шифрования. Перезагрузите страницу и попробуйте снова.');
          return;
        }
      }
    }
    
    const currentKeys = encryptionKeys || await encryption.unlockKeys();
    if (!currentKeys) {
      alert('Ключи шифрования не инициализированы');
      return;
    }
    
    try {
      // Проверяем есть ли уже чат с этим пользователем
      let chat = chats.find(c => c.participantId === recipientId);
      
      if (!chat) {
        // Создаём новый чат
        console.log('Creating new chat with user:', recipientId);
        
          // ✨ НОВОЕ: Генерируем chat key и wrapped keys
          console.log('🔑 Generating chat key for new chat...');
          const newChatKey = await encryption.generateChatKey();
        
          // Wrap для себя
          const wrappedForMe = await encryption.wrapChatKey(newChatKey, currentKeys.publicKey);
        
          // ✅ Попытка wrap для собеседника (может быть null)
          const recipientKeys = await ensureRecipientKey(recipientId);
          const wrappedForRecipient = recipientKeys 
            ? await encryption.wrapChatKey(newChatKey, recipientKeys.encryptKey)
            : null;
        
        const { data: createData } = await http.post<{ chatId: number }>(endpoints.chatCreate, {
            participantId: recipientId,
            wrappedKeyForMe: wrappedForMe,
            wrappedKeyForRecipient: wrappedForRecipient || undefined
        });
        
          // Кэшируем chat key
          setChatKeys(prev => new Map(prev).set(createData.chatId, newChatKey));
          console.log('✅ Chat created with wrapped keys, chatId:', createData.chatId);
        
          if (!wrappedForRecipient) {
            console.warn('⚠️ Recipient will need to generate wrapped key on first login');
          }
        
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
      
        // ✨ НОВОЕ: Получаем chat key (или создаём если нужно)
        console.log('🔑 Getting chat key for chatId:', chat.chatId);
        const chatKey = await ensureChatKey(chat.chatId);
        if (!chatKey) {
          alert('Не удалось получить ключ шифрования чата');
          return;
        }
      
        // ✨ НОВОЕ: Шифруем с помощью chat key (не RSA!)
        console.log('🔐 Encrypting message with chat key...');
        const encrypted = await encryption.encryptMessageWithChatKey(
        message, 
          chatKey,
        encryptionKeys.signPrivateKey
      );
      
        console.log('✅ Message encrypted with chat key');
      
      // Отправляем на сервер
      console.log('Sending to server...');
      
      const { data } = await http.post<SendMessageResponse>(endpoints.chatSend, {
        chatId: chat!.chatId,
        encryptedContent: encrypted.encryptedContent,
        encryptionMetadata: encrypted.encryptionMetadata,
        messageType,
        imagePath
      });
      
      console.log('✅ Message sent, messageId:', data.messageId);
      
      // ✅ ИСПРАВЛЕНО: Больше не кэшируем plaintext
      // Pending автоматически очистится при получении через WebSocket
      
      // Не добавляем сообщение локально - оно придёт через WebSocket
      // Обновляем список чатов
      loadChats();
      
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 30);
    } catch (e) {
      console.error('Failed to send message to user', e);
      alert(e instanceof Error ? e.message : 'Ошибка отправки сообщения');
    }
  };
  
  const sendChatMessage = async () => {
    console.log('sendChatMessage called', { selectedChat, messageInput, hasKeys: !!encryptionKeys });
    if (!messageInput.trim()) {
      console.warn('Cannot send: empty message');
      return;
    }
    
    // Если выбран конкретный чат - отправляем в него
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
      await sendMessageToUser(chat.participantId, '[image]' + data.imagePath, 'image', data.imagePath);
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
    const displayName = friend?.displayName || friend?.username || chat?.participantId.slice(0, 8) || 'Пользователь';
    return (
      <div className="flex flex-col h-full">
        <div className="flex-none border-b border-slate-800 p-2 flex items-center gap-2">
          {friend?.avatarUrl && (
            <img src={friend.avatarUrl} alt="" className="w-8 h-8 rounded-lg object-cover border border-slate-700" />
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{displayName}</div>
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
            className="px-2 py-1 text-xs bg-red-600/20 hover:bg-red-600/40 rounded transition-colors"
            title="Удалить чат"
          >
            🗑️
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">Нет сообщений</div>
          ) : (
            messages.map(m => (
              <div key={m.messageId} className={`flex ${m.senderId === user!.id ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap wrap-break-word ${m.senderId === user!.id ? 'bg-indigo-600/60' : 'bg-slate-800/70'}`}>
                  {m.messageType === 'image' && m.imagePath ? (
                    <img src={`/media/${m.imagePath}`} alt="img" className="rounded mb-1 max-h-64 max-w-full object-contain cursor-pointer" onClick={() => window.open(`/media/${m.imagePath}`, '_blank')} />
                  ) : null}
                  {m.messageType === 'text' && m.encryptedContent}
                  <div className="mt-1 text-[10px] text-slate-400 text-right">
                    {new Date(m.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="flex-none p-2 border-t border-slate-800 space-y-2">
          <div className="flex gap-2">
            <input
              value={messageInput}
              onChange={e => setMessageInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } }}
              className="flex-1 bg-slate-800/60 border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Сообщение..."
            />
            <button
              onClick={sendChatMessage}
              className="px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-sm font-medium"
            >Отправить</button>
          </div>
          <div>
            <label className="text-xs text-slate-400 cursor-pointer inline-flex items-center gap-2">
              <input type="file" className="hidden" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f); }} />
              <span className="px-2 py-1 rounded border border-slate-700 hover:border-indigo-500">Загрузить картинку</span>
            </label>
          </div>
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
                  active={activeTab === 'incoming'}
                  onClick={() => setActiveTab('incoming')}
                  label="Входящие"
                  count={incomingCount}
                  badge={hasNotifications}
                />
                <TabButton
                  active={activeTab === 'outgoing'}
                  onClick={() => setActiveTab('outgoing')}
                  label="Исходящие"
                  count={outgoingCount}
                />
                <TabButton
                  active={activeTab === 'search'}
                  onClick={() => setActiveTab('search')}
                  label="Поиск"
                />
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-3">
                <AnimatePresence mode="wait">
                  {activeTab === 'friends' && (
                    <motion.div
                      key="friends"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.15 }}
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

                  {activeTab === 'incoming' && (
                    <motion.div
                      key="incoming"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.15 }}
                    >
                      <IncomingRequests
                        requests={incomingRequests}
                        onAccept={acceptRequest}
                        onReject={rejectRequest}
                      />
                    </motion.div>
                  )}

                  {activeTab === 'outgoing' && (
                    <motion.div
                      key="outgoing"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.15 }}
                    >
                      <OutgoingRequests
                        requests={outgoingRequests}
                        onCancel={cancelRequest}
                      />
                    </motion.div>
                  )}
                  {activeTab === 'chat' && (
                    <motion.div
                      key="chat"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.15 }}
                      className="h-full"
                    >
                      <div className="mb-2 flex flex-wrap gap-1">
                        {chats.map(c => (
                          <button
                            key={c.chatId}
                            onClick={() => { setSelectedChat(c.chatId); loadMessages(c.chatId); }}
                            className={`px-2 py-1 rounded text-xs border ${selectedChat === c.chatId ? 'border-indigo-500 bg-indigo-600/30' : 'border-slate-700 bg-slate-800/40 hover:border-slate-600'}`}
                          >
                            {c.participantId.slice(0,8)}
                          </button>
                        ))}
                      </div>
                      {renderChatView()}
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
                <div className="text-xs text-slate-500 truncate" title={`Друзья с ${new Date(friend.acceptedAt).toLocaleString('ru')}`}>
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
        <div className="text-center py-6 text-slate-400 text-sm">Ничего не найдено</div>
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
                    src={user.avatarUrl}
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
                  ⏳
                </button>
              )}
              {user.friendStatus === 'BLOCKED' && (
                <span className="px-2 py-1 text-xs text-rose-300 bg-rose-500/10 border border-rose-700/50 rounded">
                  ✕
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
                <div className="text-xs text-rose-300 truncate">✕ Отклонена</div>
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
            <span className="text-xs text-slate-500 px-2">🎉</span>
          )}
        </motion.div>
      ))}
    </div>
  );
}
