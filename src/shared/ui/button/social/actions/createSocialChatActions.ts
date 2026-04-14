import { http } from '@/shared/api/http';
import { endpoints } from '@/shared/api/endpoints';
import { logger } from '@/shared/lib/logger';
import { buildMessageTextAndEntities } from '@/shared/utils/chatTextEntities';
import type {
  ChatListResponse,
  ChatMessage,
  ChatMessagesResponse,
  CreateChatResponse,
  SendMessageResponse,
  UploadImageResponse,
} from '@/shared/api/types';
import type { AttachedImage, SocialChatActions, SocialFloatingActionsContext } from './types';

export function createSocialChatActions(ctx: SocialFloatingActionsContext): SocialChatActions {
  const {
    user,
    selectedChat,
    chats,
    messages,
    messageInput,
    attachedImages,
    editingMessage,
    replyingTo,
    markReadTimeoutRef,
    markReadTargetRef,
    sendInFlightRef,
    sendCooldownUntilRef,
    pendingUploadCancelsRef,
    lastProtocolSeqRef,
    lastProtocolMsgIdRef,
    typingThrottleRef,
    isFirstLoadRef,
    messagesEndRef,
    setMessages,
    setChats,
    setSelectedChat,
    setActiveTab,
    setReplyingTo,
    setMessageInput,
    setAttachedImages,
    setEditingMessage,
    setUploadingImages,
    setAutoScrollLocked,
    setIsChatsRefreshing,
    scrollToBottom,
  } = ctx;

  const nextProtocolEnvelope = () => {
    const timestamp = Date.now();
    const nextSeqNo = Math.max(timestamp, lastProtocolSeqRef.current + 1);
    lastProtocolSeqRef.current = nextSeqNo;

    const randomSuffix = Math.floor(Math.random() * 1024);
    const candidateMsgId = timestamp * 1024 + randomSuffix;
    const nextMsgId = Math.max(candidateMsgId, lastProtocolMsgIdRef.current + 1);
    lastProtocolMsgIdRef.current = nextMsgId;

    return { msgId: nextMsgId, seqNo: nextSeqNo, timestamp };
  };

  const MAX_ATTACHMENTS = 9;
  const toUploadStateKey = (localId: string, attachmentIndex: number) =>
    `${localId}-${attachmentIndex}`;

  const clearUploadStatesByLocalId = (localId: string) => {
    setUploadingImages((prev) => {
      if (prev.size === 0) return prev;
      const next = new Map(prev);
      let changed = false;
      for (const key of next.keys()) {
        if (key.startsWith(`${localId}-`)) {
          next.delete(key);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  };
  const isLocalPreviewUrl = (value?: string) => {
    if (!value) return false;
    return value.startsWith('blob:') || value.startsWith('data:');
  };

  const pickStableMediaUrl = (
    existingUrl: string | undefined,
    ...remoteCandidates: Array<string | undefined>
  ) => {
    if (isLocalPreviewUrl(existingUrl)) {
      return existingUrl;
    }

    for (const candidate of remoteCandidates) {
      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        return candidate;
      }
    }

    return existingUrl;
  };
  type LooseAttachmentPayload = {
    imagePath?: string;
    image_path?: string;
    imageUrl?: string;
    image_url?: string;
    thumbnailUrl?: string;
    thumbnail_url?: string;
    strippedThumbnailUrl?: string;
    stripped_thumbnail_url?: string;
    fileName?: string;
    file_name?: string;
    contentType?: string;
    content_type?: string;
    sizeBytes?: number;
    size_bytes?: number;
    isImage?: boolean;
    is_image?: boolean;
    imageKeyVersion?: number;
    image_key_version?: number;
  };
  const pickStringValue = (...candidates: unknown[]): string | undefined => {
    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        return candidate;
      }
    }
    return undefined;
  };
  const pickNumberValue = (...candidates: unknown[]): number | undefined => {
    for (const candidate of candidates) {
      if (typeof candidate === 'number' && Number.isFinite(candidate)) {
        return candidate;
      }
    }
    return undefined;
  };
  const pickBooleanValue = (...candidates: unknown[]): boolean | undefined => {
    for (const candidate of candidates) {
      if (typeof candidate === 'boolean') {
        return candidate;
      }
    }
    return undefined;
  };
  const normalizeAttachmentPayload = (payload?: LooseAttachmentPayload) => {
    if (!payload) {
      return {
        imagePath: undefined,
        imageUrl: undefined,
        thumbnailUrl: undefined,
        strippedThumbnailUrl: undefined,
        fileName: undefined,
        contentType: undefined,
        sizeBytes: undefined,
        isImage: undefined,
        imageKeyVersion: undefined,
      };
    }

    return {
      imagePath: pickStringValue(payload.imagePath, payload.image_path),
      imageUrl: pickStringValue(payload.imageUrl, payload.image_url),
      thumbnailUrl: pickStringValue(payload.thumbnailUrl, payload.thumbnail_url),
      strippedThumbnailUrl: pickStringValue(
        payload.strippedThumbnailUrl,
        payload.stripped_thumbnail_url
      ),
      fileName: pickStringValue(payload.fileName, payload.file_name),
      contentType: pickStringValue(payload.contentType, payload.content_type),
      sizeBytes: pickNumberValue(payload.sizeBytes, payload.size_bytes),
      isImage: pickBooleanValue(payload.isImage, payload.is_image),
      imageKeyVersion: pickNumberValue(payload.imageKeyVersion, payload.image_key_version),
    };
  };
  type MediaPrefetchKind = 'image' | 'video' | 'audio' | 'file';

  const resolveMediaPrefetchKind = (
    messageType: string | undefined,
    contentType: string | undefined,
    isImage?: boolean
  ): MediaPrefetchKind => {
    const normalizedMessageType = (messageType || '').toLowerCase();
    const normalizedContentType = (contentType || '').toLowerCase();
    if (normalizedMessageType === 'voice' || normalizedContentType.startsWith('audio/')) {
      return 'audio';
    }
    if (normalizedMessageType === 'circle' || normalizedContentType.startsWith('video/')) {
      return 'video';
    }
    if (
      isImage ||
      normalizedMessageType === 'image' ||
      normalizedMessageType === 'images' ||
      normalizedContentType.startsWith('image/')
    ) {
      return 'image';
    }
    return 'file';
  };

  const mediaPrefetchCache = new Map<string, Promise<boolean>>();
  const prefetchMediaReady = (url: string, kind: MediaPrefetchKind, timeoutMs = 20_000): Promise<boolean> => {
    if (!url) return Promise.resolve(false);
    if (isLocalPreviewUrl(url)) return Promise.resolve(true);
    if (typeof window === 'undefined') return Promise.resolve(true);

    const cacheKey = `${kind}:${url}`;
    const cached = mediaPrefetchCache.get(cacheKey);
    if (cached) return cached;

    const task = new Promise<boolean>((resolve) => {
      let settled = false;
      let timeoutId: number | null = null;

      const done = (ok: boolean) => {
        if (settled) return;
        settled = true;
        if (timeoutId !== null) {
          window.clearTimeout(timeoutId);
        }
        resolve(ok);
      };

      timeoutId = window.setTimeout(() => done(false), timeoutMs);

      try {
        if (kind === 'image') {
          const img = new Image();
          img.onload = () => done(true);
          img.onerror = () => done(false);
          img.src = url;
          return;
        }

        if (kind === 'video' || kind === 'audio') {
          const media = document.createElement(kind);
          media.preload = 'metadata';
          if (kind === 'video') {
            media.muted = true;
            (media as HTMLVideoElement).playsInline = true;
          }

          const cleanup = () => {
            media.removeEventListener('loadedmetadata', onReady);
            media.removeEventListener('canplay', onReady);
            media.removeEventListener('error', onError);
            media.removeAttribute('src');
            media.load();
          };
          const onReady = () => {
            cleanup();
            done(true);
          };
          const onError = () => {
            cleanup();
            done(false);
          };

          media.addEventListener('loadedmetadata', onReady, { once: true });
          media.addEventListener('canplay', onReady, { once: true });
          media.addEventListener('error', onError, { once: true });
          media.src = url;
          media.load();
          return;
        }

        void fetch(url, { method: 'HEAD', credentials: 'include' })
          .then((response) => done(response.ok))
          .catch(() => done(false));
      } catch {
        done(false);
      }
    });

    mediaPrefetchCache.set(cacheKey, task);
    return task;
  };

  const scheduleMediaSwapAfterPrefetch = (params: {
    localId: string;
    messageId: number;
    chatId: number;
    attachmentIndex: number;
    currentUrl?: string;
    remoteUrl?: string;
    remotePath?: string;
    messageType?: string;
    contentType?: string;
    isImage?: boolean;
  }) => {
    const {
      localId,
      messageId,
      chatId,
      attachmentIndex,
      currentUrl,
      remoteUrl,
      remotePath,
      messageType,
      contentType,
      isImage,
    } = params;

    if (!remoteUrl || !currentUrl) return;
    if (!isLocalPreviewUrl(currentUrl)) return;
    if (currentUrl === remoteUrl) return;

    const kind = resolveMediaPrefetchKind(messageType, contentType, isImage);

    void (async () => {
      const ready = await prefetchMediaReady(remoteUrl, kind);
      if (!ready) return;

      setMessages((prev) => {
        let changed = false;
        const next = prev.map((message) => {
          const matches =
            message.localId === localId ||
            message.messageId === localId ||
            message.messageId === messageId;
          if (!matches) {
            return message;
          }

          let messageChanged = false;
          let nextMessage = message;

          if (Array.isArray(message.images) && message.images.length > attachmentIndex) {
            const currentAttachment = message.images[attachmentIndex];
            if (currentAttachment) {
              const attachmentUrl = currentAttachment.imageUrl;
              if (attachmentUrl === currentUrl || isLocalPreviewUrl(attachmentUrl)) {
                const nextImages = [...message.images];
                nextImages[attachmentIndex] = {
                  ...currentAttachment,
                  imageUrl: remoteUrl,
                  imagePath: remotePath || currentAttachment.imagePath,
                };
                nextMessage = {
                  ...nextMessage,
                  images: nextImages,
                };
                messageChanged = true;
              }
            }
          }

          if (attachmentIndex === 0) {
            const topLevelUrl = nextMessage.imageUrl;
            if (topLevelUrl === currentUrl || isLocalPreviewUrl(topLevelUrl)) {
              nextMessage = {
                ...nextMessage,
                imageUrl: remoteUrl,
                imagePath: remotePath || nextMessage.imagePath,
              };
              messageChanged = true;
            }
          }

          if (!messageChanged) {
            return message;
          }

          changed = true;
          return nextMessage;
        });

        return changed ? next : prev;
      });

      if (attachmentIndex === 0) {
        setChats((prev) => {
          let changed = false;
          const next = prev.map((chat) => {
            if (chat.chatId !== chatId || !chat.lastMessage) {
              return chat;
            }

            const lastMessage = chat.lastMessage;
            const matches =
              lastMessage.localId === localId ||
              lastMessage.messageId === localId ||
              lastMessage.messageId === messageId;
            if (!matches) {
              return chat;
            }

            const lastUrl = lastMessage.imageUrl;
            if (lastUrl !== currentUrl && !isLocalPreviewUrl(lastUrl)) {
              return chat;
            }

            changed = true;
            return {
              ...chat,
              lastMessage: {
                ...lastMessage,
                imageUrl: remoteUrl,
                imagePath: remotePath || lastMessage.imagePath,
              },
            };
          });

          return changed ? next : prev;
        });
      }

      if (currentUrl.startsWith('blob:')) {
        URL.revokeObjectURL(currentUrl);
      }
    })();
  };
  const shouldSendAttachmentsSeparately = (attachments: AttachedImage[]) =>
    attachments.length > 1 && attachments.every((attachment) => attachment.groupWithOthers === false);

  const isImageAttachment = (attachment: {
    isImage?: boolean;
    sendAsFile?: boolean;
    forcedMessageType?: 'voice' | 'circle';
    contentType?: string;
    file?: File;
  }) => {
    if (attachment.forcedMessageType === 'voice' || attachment.forcedMessageType === 'circle') {
      return false;
    }
    if (attachment.isImage !== undefined) {
      return attachment.isImage;
    }
    const contentType =
      (attachment.contentType || attachment.file?.type || '').trim().toLowerCase();
    return contentType.startsWith('image/');
  };

  const isAudioAttachment = (attachment: {
    sendAsFile?: boolean;
    forcedMessageType?: 'voice' | 'circle';
    contentType?: string;
    file?: File;
  }) => {
    if (attachment.forcedMessageType === 'voice') {
      return true;
    }
    const contentType =
      (attachment.contentType || attachment.file?.type || '').trim().toLowerCase();
    return contentType.startsWith('audio/');
  };

  const isCircleAttachment = (attachment: {
    sendAsFile?: boolean;
    forcedMessageType?: 'voice' | 'circle';
    contentType?: string;
    file?: File;
  }) => {
    return attachment.forcedMessageType === 'circle';
  };

  const isVideoAttachment = (attachment: {
    sendAsFile?: boolean;
    forcedMessageType?: 'voice' | 'circle';
    contentType?: string;
    file?: File;
  }) => {
    if (attachment.forcedMessageType === 'voice' || attachment.forcedMessageType === 'circle') {
      return false;
    }
    if (attachment.sendAsFile) {
      return false;
    }
    const contentType =
      (attachment.contentType || attachment.file?.type || '').trim().toLowerCase();
    return contentType.startsWith('video/');
  };

  const isVisualMediaAttachment = (attachment: {
    isImage?: boolean;
    sendAsFile?: boolean;
    forcedMessageType?: 'voice' | 'circle';
    contentType?: string;
    file?: File;
  }) => isImageAttachment(attachment) || isVideoAttachment(attachment);

  const resolveSingleAttachmentMessageType = (
    attachment: {
      isImage?: boolean;
      sendAsFile?: boolean;
      forcedMessageType?: 'voice' | 'circle';
      contentType?: string;
      file?: File;
    }
  ): 'image' | 'file' | 'voice' | 'circle' => {
    if (attachment.forcedMessageType === 'voice') return 'voice';
    if (attachment.forcedMessageType === 'circle') return 'circle';
    if (isImageAttachment(attachment)) {
      return 'image';
    }
    if (isAudioAttachment(attachment)) {
      return 'voice';
    }
    if (isCircleAttachment(attachment)) {
      return 'circle';
    }
    if (isVideoAttachment(attachment)) {
      return 'image';
    }
    return 'file';
  };

  const resolveAttachmentMessageType = (
    attachments: Array<{
      isImage?: boolean;
      sendAsFile?: boolean;
      forcedMessageType?: 'voice' | 'circle';
      contentType?: string;
      file?: File;
    }>
  ): 'image' | 'images' | 'file' | 'files' | 'voice' | 'circle' => {
    if (attachments.length === 1) {
      return resolveSingleAttachmentMessageType(attachments[0]);
    }
    const allVisualMedia = attachments.length > 0 && attachments.every(isVisualMediaAttachment);
    if (allVisualMedia) {
      return 'images';
    }
    return 'files';
  };

  const sendTypingState = async (chatId: number, typing: boolean, force = false) => {
    if (!chatId) return;

    const now = Date.now();
    const previous = typingThrottleRef.current.get(chatId);
    const throttleMs = typing ? 1200 : 300;

    if (
      !force &&
      previous &&
      previous.lastState === typing &&
      now - previous.lastSentAt < throttleMs
    ) {
      return;
    }

    try {
      await http.post(endpoints.chatTyping, {
        chat_id: chatId,
        typing,
      });
      typingThrottleRef.current.set(chatId, { lastSentAt: Date.now(), lastState: typing });
    } catch (err) {
      logger.warn('Failed to send typing state', err);
    }
  };

  const markChatRead = async (chatId: number, lastId: number) => {
    if (chatId <= 0 || !Number.isFinite(lastId) || lastId <= 0) {
      return;
    }

    const pending = markReadTargetRef.current;
    if (
      pending
      && pending.chatId === chatId
      && lastId <= pending.lastId
      && markReadTimeoutRef.current
    ) {
      return;
    }

    if (!pending || pending.chatId !== chatId || lastId > pending.lastId) {
      markReadTargetRef.current = { chatId, lastId };
    }

    if (markReadTimeoutRef.current) {
      clearTimeout(markReadTimeoutRef.current);
    }

    markReadTimeoutRef.current = setTimeout(async () => {
      const target = markReadTargetRef.current;
      markReadTargetRef.current = null;
      markReadTimeoutRef.current = null;

      if (!target) {
        return;
      }

      try {
        await http.post(endpoints.chatRead, {
          chatId: target.chatId,
          lastReadMessageId: target.lastId,
        });

        setMessages(prev => prev.map(m =>
          typeof m.messageId === 'number' && m.messageId <= target.lastId && m.senderId !== user?.id
            ? { ...m, isRead: true }
            : m
        ));
      } catch (err) {
        logger.warn('Failed to mark chat read', err);
      }
    }, 220);
  };

  const toMessageDomId = (messageId: number | string) =>
    `chat-message-${String(messageId).replace(/[^a-zA-Z0-9_-]/g, '_')}`;

  const resolveMessageElement = (messageId: number): HTMLElement | null => {
    if (typeof document === 'undefined') {
      return null;
    }

    const byData = document.querySelector<HTMLElement>(`.message-item[data-message-id="${messageId}"]`);
    if (byData) {
      return byData;
    }

    return document.getElementById(toMessageDomId(messageId));
  };

  const resolveMessageScrollContainer = (): HTMLElement | null => {
    const end = messagesEndRef.current;
    if (!end || typeof window === 'undefined') {
      return null;
    }

    const tgScroll = end.closest('.tg-scroll');
    if (tgScroll instanceof HTMLElement) {
      return tgScroll;
    }

    let current: HTMLElement | null = end.parentElement;
    while (current) {
      const style = window.getComputedStyle(current);
      const scrollableY = style.overflowY === 'auto' || style.overflowY === 'scroll';
      if (scrollableY && current.scrollHeight > current.clientHeight + 2) {
        return current;
      }
      current = current.parentElement;
    }

    return null;
  };


  const loadChats = async () => {
    setIsChatsRefreshing(true);
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
    } finally {
      setIsChatsRefreshing(false);
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

      const unreadIncomingMessageIds = !append
        ? messagesWithContent.reduce<number[]>((acc, message) => {
            if (
              message.senderId === user?.id
              || message.isRead
              || typeof message.messageId !== 'number'
            ) {
              return acc;
            }

            acc.push(message.messageId);
            return acc;
          }, [])
        : [];

      const sortedUnreadIncomingMessageIds = unreadIncomingMessageIds.length > 0
        ? [...unreadIncomingMessageIds].sort((a, b) => a - b)
        : [];
      const firstUnreadIncomingMessageId = sortedUnreadIncomingMessageIds.length > 0
        ? sortedUnreadIncomingMessageIds[0]
        : 0;
      const lastUnreadIncomingMessageId = sortedUnreadIncomingMessageIds.length > 0
        ? sortedUnreadIncomingMessageIds[sortedUnreadIncomingMessageIds.length - 1]
        : 0;

      if (!append) {
        isFirstLoadRef.current = true;
        setTimeout(() => {
          const scrollContainer = resolveMessageScrollContainer();
          const firstUnreadElement = firstUnreadIncomingMessageId > 0
            ? resolveMessageElement(firstUnreadIncomingMessageId)
            : null;
          const lastUnreadElement = lastUnreadIncomingMessageId > 0
            ? resolveMessageElement(lastUnreadIncomingMessageId)
            : null;

          const epsilon = 2;
          let shouldPinFirstUnreadToTop = false;
          if (firstUnreadElement && lastUnreadElement && scrollContainer) {
            const firstRect = firstUnreadElement.getBoundingClientRect();
            const lastRect = lastUnreadElement.getBoundingClientRect();
            const unreadChunkHeight = Math.max(0, lastRect.bottom - firstRect.top);
            shouldPinFirstUnreadToTop = unreadChunkHeight > scrollContainer.clientHeight + epsilon;
          }

          if (
            firstUnreadIncomingMessageId > 0
            && shouldPinFirstUnreadToTop
            && firstUnreadElement
          ) {
            if (scrollContainer) {
              const messageRect = firstUnreadElement.getBoundingClientRect();
              const containerRect = scrollContainer.getBoundingClientRect();
              scrollContainer.scrollTop += messageRect.top - containerRect.top;
            } else {
              firstUnreadElement.scrollIntoView({ behavior: 'auto', block: 'start' });
            }
          } else if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
          }

          const tryMarkReadOnOpen = () => {
            if (sortedUnreadIncomingMessageIds.length === 0) {
              return;
            }

            const scrollContainer = resolveMessageScrollContainer();
            if (!scrollContainer) {
              return;
            }

            const containerRect = scrollContainer.getBoundingClientRect();
            const epsilon = 2;
            let lastVisibleUnreadIncomingMessageId = 0;

            for (const messageId of sortedUnreadIncomingMessageIds) {
              const element = resolveMessageElement(messageId);
              if (!element) {
                continue;
              }

              const rect = element.getBoundingClientRect();
              const visibleTop = Math.max(rect.top, containerRect.top + epsilon);
              const visibleBottom = Math.min(rect.bottom, containerRect.bottom - epsilon);
              const visibleHeight = Math.max(0, visibleBottom - visibleTop);
              if (visibleHeight < 1) {
                continue;
              }

              if (messageId > lastVisibleUnreadIncomingMessageId) {
                lastVisibleUnreadIncomingMessageId = messageId;
              }
            }

            if (lastVisibleUnreadIncomingMessageId > 0) {
              void markChatRead(chatId, lastVisibleUnreadIncomingMessageId);
            }
          };

          tryMarkReadOnOpen();
          setTimeout(tryMarkReadOnOpen, 140);

          isFirstLoadRef.current = false;
        }, 100);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const findPrivateChatByParticipant = (participantId: string) =>
    chats.find((chat) => chat.chatType === 'PRIVATE' && chat.participantId === participantId);

  const openChatWith = async (participantId: string) => {
    try {
      const existingChat = findPrivateChatByParticipant(participantId);
      if (existingChat) {
        setActiveTab('chat');
        setSelectedChat(existingChat.chatId);
        return;
      }

      const { data } = await http.post<CreateChatResponse>(endpoints.chatCreate, {
        participantId,
      });

      await loadChats();
      setActiveTab('chat');
      setSelectedChat(data.chatId);
    } catch (e) {
      console.error('Failed to open chat:', e);
      alert(e instanceof Error ? e.message : 'Unable to open chat');
    }
  };

  const createGroupChat = async (payload: {
    title: string;
    participantIds?: string[];
    avatarPath?: string;
  }) => {
    const title = payload.title.trim();
    if (!title) {
      throw new Error('Group title is required');
    }

    const uniqueParticipantIds = Array.from(
      new Set((payload.participantIds || []).filter((id) => id && id.trim().length > 0))
    );

    const { data } = await http.post<CreateChatResponse>(endpoints.chatCreate, {
      type: 'GROUP',
      title,
      avatarPath: payload.avatarPath,
      participantIds: uniqueParticipantIds,
    });

    await loadChats();
    setActiveTab('chat');
    setSelectedChat(data.chatId);
  };

  const sendMessageToChat = async (
    chatId: number,
    message: string,
    messageType: 'text' | 'image' | 'images' | 'file' | 'files' | 'voice' | 'circle' = 'text',
    imagePath?: string,
    imageEncrypted?: boolean,
    imageEncryptionIv?: string,
    imageKeyVersion?: number
  ) => {
    const localId = `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const createdAt = new Date().toISOString();
    const parsed = buildMessageTextAndEntities(message);
    const isVoiceOrCircle = messageType === 'voice' || messageType === 'circle';
    const normalizedContent = isVoiceOrCircle ? '' : parsed.content;
    const normalizedEntities =
      !isVoiceOrCircle && parsed.entities.length > 0 ? parsed.entities : undefined;

    try {
      const tempMessage: ChatMessage = {
        localId,
        messageId: localId,
        status: 'pending',
        senderId: user?.id || '',
        content: normalizedContent,
        entities: normalizedEntities,
        messageType,
        imagePath,
        createdAt,
        replyToId: replyingTo?.messageId,
        replyToMessage: replyingTo || undefined,
      };

      setMessages((prev) => [...prev, tempMessage]);
      setTimeout(() => scrollToBottom(), 0);

      const { msgId, seqNo, timestamp } = nextProtocolEnvelope();
      const { data } = await http.post<SendMessageResponse>(endpoints.chatSend, {
        msg_id: msgId,
        seq_no: seqNo,
        timestamp,
        chat_id: chatId,
        content_type: messageType,
        content: normalizedContent,
        entities: normalizedEntities,
        hmac: '',
        reply_to_id: replyingTo?.messageId,
        image_path: imagePath,
        image_encrypted: imageEncrypted,
        image_encryption_iv: imageEncryptionIv,
        image_key_version: imageKeyVersion,
      });

      setMessages((prev) =>
        prev.map((m) => {
          if (m.localId === localId || m.messageId === localId) {
            return {
              ...m,
              messageId: data.messageId,
              status: m.isRead ? 'read' : 'sent',
              content: m.content || normalizedContent,
              entities: m.entities ?? normalizedEntities,
              imageUrl: data.imageUrl ?? m.imageUrl,
              imagePath: imagePath ?? m.imagePath,
              isRead: false,
            };
          }
          return m;
        })
      );

      setChats((prev) =>
        prev.map((c) =>
          c.chatId === chatId
            ? {
                ...c,
                lastMessage: {
                  messageId: data.messageId,
                  senderId: user?.id || '',
                  content: normalizedContent,
                  entities: normalizedEntities,
                  messageType,
                  imagePath,
                  imageUrl: data.imageUrl,
                  createdAt,
                  isRead: false,
                  replyToId: replyingTo?.messageId,
                  replyToMessage: replyingTo || undefined,
                } as ChatMessage,
              }
            : c
        )
      );

      setReplyingTo(null);
    } catch (e) {
      console.error('Failed to send message', e);
      setMessages((prev) => prev.filter((m) => m.localId !== localId && m.messageId !== localId));
      alert(e instanceof Error ? e.message : 'Ошибка отправки сообщения');
    }
  };

  const sendMessageToUser = async (
    recipientId: string,
    message: string,
    messageType: 'text' | 'image' | 'images' | 'file' | 'files' | 'voice' | 'circle' = 'text',
    imagePath?: string,
    imageEncrypted?: boolean,
    imageEncryptionIv?: string,
    imageKeyVersion?: number
  ) => {
    let chat = findPrivateChatByParticipant(recipientId);
    if (!chat) {
      const { data: createData } = await http.post<CreateChatResponse>(endpoints.chatCreate, {
        participantId: recipientId,
      });

      chat = {
        chatId: createData.chatId,
        chatType: createData.chatType || 'PRIVATE',
        participantId: createData.participantId || recipientId,
        title: createData.title,
        avatarPath: createData.avatarPath,
        memberCount: createData.memberCount,
        participantIds: createData.participantIds,
        lastMessage: undefined,
        createdAt: new Date().toISOString(),
      };
      setChats((prev) => [chat!, ...prev]);
      setSelectedChat(createData.chatId);
    }

    await sendMessageToChat(
      chat.chatId,
      message,
      messageType,
      imagePath,
      imageEncrypted,
      imageEncryptionIv,
      imageKeyVersion
    );
  };

  const cancelPendingMediaUpload = (localId: string, attachmentIndex: number) => {
    const key = toUploadStateKey(localId, attachmentIndex);
    const cancel = pendingUploadCancelsRef.current.get(key);
    if (cancel) {
      cancel();
    }
  };

  const sendChatMessage = async () => {
    console.log('sendChatMessage called', { selectedChat, messageInput, attachedImagesCount: attachedImages.length });
    const draftText = messageInput;
    const attachmentsToSend = attachedImages.slice(0, MAX_ATTACHMENTS);

    if (!draftText.trim() && attachmentsToSend.length === 0) {
      console.warn('Cannot send: empty message and no attachments');
      return;
    }

    const now = Date.now();
    if (sendInFlightRef.current) {
      console.debug('Skipping duplicate send while previous request is in flight');
      return;
    }
    if (now < sendCooldownUntilRef.current) {
      console.debug('Skipping duplicate send in cooldown window');
      return;
    }

    if (selectedChat) {
      setAutoScrollLocked(false);
    }

    sendInFlightRef.current = true;
    sendCooldownUntilRef.current = now + 700;

    try {
      if (editingMessage) {
        await editMessage(editingMessage.messageId, draftText);
        setMessageInput('');
        setEditingMessage(null);
        setAttachedImages([]);
      } else if (selectedChat) {
        const replyToMessageId =
          typeof replyingTo?.messageId === 'number' ? replyingTo.messageId : undefined;

        if (attachmentsToSend.length > 0) {
          if (shouldSendAttachmentsSeparately(attachmentsToSend)) {
            for (let index = 0; index < attachmentsToSend.length; index += 1) {
              await sendMessagesWithImages(selectedChat, index === 0 ? draftText : '', {
                attachments: [attachmentsToSend[index]],
                clearComposerDraft: index === 0,
                replyToMessageId: index === 0 ? replyToMessageId : undefined,
                resetReplyTo: index === 0,
              });
            }
          } else {
            await sendMessagesWithImages(selectedChat, draftText, {
              attachments: attachmentsToSend,
              clearComposerDraft: true,
              replyToMessageId,
              resetReplyTo: true,
            });
          }
        } else {
          await sendMessageToChat(selectedChat, draftText);
        }

        setMessageInput('');
        setAttachedImages([]);
        setTimeout(() => scrollToBottom(), 100);
      }
    } finally {
      sendInFlightRef.current = false;
      if (selectedChat) {
        await sendTypingState(selectedChat, false, true);
      }
    }
  };

  // рџ–јпёЏ РћС‚РїСЂР°РІРєР° СЃРѕРѕР±С‰РµРЅРёР№ СЃ РїСЂРёРєСЂРµРїР»РµРЅРЅС‹РјРё РёР·РѕР±СЂР°Р¶РµРЅРёСЏРјРё
  const sendMessagesWithImages = async (
    chatId: number,
    textContent: string,
    options?: {
      attachments?: AttachedImage[];
      clearComposerDraft?: boolean;
      replyToMessageId?: number;
      resetReplyTo?: boolean;
    }
  ) => {
    const attachmentsToSend = (options?.attachments ?? attachedImages).slice(0, MAX_ATTACHMENTS);
    if (attachmentsToSend.length === 0) return;

    const clearComposerDraft = options?.clearComposerDraft ?? true;
    const resetReplyTo = options?.resetReplyTo ?? true;
    const tempMessageType = resolveAttachmentMessageType(attachmentsToSend);
    const isVoiceOrCircle = tempMessageType === 'voice' || tempMessageType === 'circle';
    const parsed = buildMessageTextAndEntities(textContent);
    const normalizedContent = isVoiceOrCircle ? '' : parsed.content;
    const normalizedEntities =
      !isVoiceOrCircle && parsed.entities.length > 0 ? parsed.entities : undefined;

    if (isVoiceOrCircle && attachmentsToSend.length !== 1) {
      throw new Error('Voice/circle message must contain exactly one attachment');
    }

    const localId = `local-img-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const tempMessage: ChatMessage = {
      localId,
      messageId: localId,
      status: 'pending',
      senderId: user?.id || '',
      content: normalizedContent,
      entities: normalizedEntities,
      messageType: tempMessageType,
      imagePath: '',
      images: attachmentsToSend.map((fileRef) => ({
        imagePath: '',
        imageUrl: fileRef.preview,
        fileName: fileRef.file.name,
        contentType: fileRef.contentType || fileRef.file.type || 'application/octet-stream',
        sizeBytes: fileRef.sizeBytes ?? fileRef.file.size,
        isImage: isImageAttachment(fileRef),
      })),
      createdAt: new Date().toISOString(),
    };

    type UploadedAttachmentPayload = {
      image_path: string;
      image_url?: string;
      thumbnail_url?: string;
      stripped_thumbnail_url?: string;
      image_encrypted?: boolean;
      image_encryption_iv?: string;
      image_key_version?: number;
      file_name: string;
      content_type: string;
      size_bytes: number;
      is_image: boolean;
    };

    const canceledIndices = new Set<number>();
    const uploadedByIndex = new Map<number, UploadedAttachmentPayload>();
    const controllersByIndex = new Map<number, AbortController>();

    const hasActiveAttachments = () =>
      attachmentsToSend.some((_, attachmentIndex) => !canceledIndices.has(attachmentIndex));

    const removePendingCancelHandler = (attachmentIndex: number) => {
      pendingUploadCancelsRef.current.delete(toUploadStateKey(localId, attachmentIndex));
    };

    const removeTempMessageIfAllCanceled = () => {
      if (hasActiveAttachments()) return;
      setMessages((prev) =>
        prev.filter((message) => message.localId !== localId && message.messageId !== localId)
      );
    };

    const clearCanceledImagePreview = (attachmentIndex: number) => {
      setMessages((prev) =>
        prev.map((message) => {
          if (message.localId !== localId && message.messageId !== localId) {
            return message;
          }

          const nextImages = (message.images || []).map((image, idx) =>
            idx === attachmentIndex
              ? {
                  ...image,
                  imagePath: '',
                  imageUrl: undefined,
                }
              : image
          );

          const firstVisible = nextImages.find(
            (image) =>
              (typeof image.imageUrl === 'string' && image.imageUrl.trim().length > 0) ||
              (typeof image.imagePath === 'string' && image.imagePath.trim().length > 0)
          );

          return {
            ...message,
            images: nextImages,
            imagePath: firstVisible?.imagePath || '',
            imageUrl: firstVisible?.imageUrl,
          };
        })
      );
    };

    const requestCancelAttachment = (attachmentIndex: number) => {
      if (canceledIndices.has(attachmentIndex)) {
        return;
      }

      canceledIndices.add(attachmentIndex);
      uploadedByIndex.delete(attachmentIndex);
      removePendingCancelHandler(attachmentIndex);

      const uploadKey = toUploadStateKey(localId, attachmentIndex);
      setUploadingImages((prev) => {
        if (!prev.has(uploadKey)) return prev;
        const next = new Map(prev);
        next.delete(uploadKey);
        return next;
      });

      const controller = controllersByIndex.get(attachmentIndex);
      if (controller && !controller.signal.aborted) {
        controller.abort();
      }
      controllersByIndex.delete(attachmentIndex);

      clearCanceledImagePreview(attachmentIndex);
      removeTempMessageIfAllCanceled();
    };

    for (let attachmentIndex = 0; attachmentIndex < attachmentsToSend.length; attachmentIndex += 1) {
      const attachment = attachmentsToSend[attachmentIndex];
      const uploadKey = toUploadStateKey(localId, attachmentIndex);

      pendingUploadCancelsRef.current.set(uploadKey, () => {
        requestCancelAttachment(attachmentIndex);
      });

      setUploadingImages((prev) => {
        const next = new Map(prev);
        next.set(uploadKey, {
          localId,
          attachmentIndex,
          file: attachment.file,
          progress: 0,
          phase: 'queued',
          cancelable: true,
        });
        return next;
      });
    }

    setMessages((prev) => [...prev, tempMessage]);
    if (clearComposerDraft) {
      setAttachedImages([]);
      setMessageInput('');
    }
    setTimeout(() => scrollToBottom(), 0);

    try {
      const finalChatId = chatId;

      for (let attachmentIndex = 0; attachmentIndex < attachmentsToSend.length; attachmentIndex += 1) {
        if (canceledIndices.has(attachmentIndex) || !hasActiveAttachments()) {
          continue;
        }

        const attachment = attachmentsToSend[attachmentIndex];
        const uploadKey = toUploadStateKey(localId, attachmentIndex);
        const form = new FormData();
        form.append('file', attachment.file);

        const uploadAsFile = !!attachment.sendAsFile && !attachment.forcedMessageType;
        const uploadUrl = `${endpoints.chatUpload}?chatId=${finalChatId}${uploadAsFile ? '&asFile=true' : ''}`;

        const uploadDebugMeta = {
          chatId: finalChatId,
          localId,
          uploadIndex: attachmentIndex,
          uploadCount: attachmentsToSend.length,
          fileName: attachment.file.name,
          fileType: attachment.file.type,
          fileSize: attachment.file.size,
          attachmentContentType: attachment.contentType,
          attachmentIsImage: isImageAttachment(attachment),
          uploadAsFile,
        };

        logger.info('[chat.upload] start', uploadDebugMeta);

        const uploadController = new AbortController();
        controllersByIndex.set(attachmentIndex, uploadController);

        setUploadingImages((prev) => {
          const existing = prev.get(uploadKey);
          if (!existing) return prev;
          const next = new Map(prev);
          next.set(uploadKey, {
            ...existing,
            phase: 'uploading',
            progress: Math.max(existing.progress, 1),
          });
          return next;
        });

        try {
          const { data } = await http.post<UploadImageResponse>(uploadUrl, form, {
            signal: uploadController.signal,
            onUploadProgress: (event: any) => {
              const total = typeof event.total === 'number' && event.total > 0 ? event.total : 0;
              const loaded = typeof event.loaded === 'number' ? event.loaded : 0;
              const progress = total > 0 ? Math.round((loaded / total) * 100) : 0;
              setUploadingImages((prev) => {
                const existing = prev.get(uploadKey);
                if (!existing) return prev;
                const next = new Map(prev);
                next.set(uploadKey, {
                  ...existing,
                  phase: 'uploading',
                  progress,
                });
                return next;
              });
            },
          });

          if (canceledIndices.has(attachmentIndex)) {
            continue;
          }

          logger.info('[chat.upload] success', {
            ...uploadDebugMeta,
            responseImagePath: data.imagePath,
            responseContentType: data.contentType,
            responseIsImage: data.isImage,
            responseSizeBytes: data.sizeBytes,
          });

          const normalizedUploadAttachment = normalizeAttachmentPayload(
            data as unknown as LooseAttachmentPayload
          );
          const uploadedAttachment: UploadedAttachmentPayload = {
            image_path: data.imagePath,
            image_url: data.imageUrl,
            thumbnail_url: normalizedUploadAttachment.thumbnailUrl,
            stripped_thumbnail_url: normalizedUploadAttachment.strippedThumbnailUrl,
            image_encrypted: data.imageEncrypted,
            image_encryption_iv: data.imageEncryptionIv,
            image_key_version: data.imageKeyVersion,
            file_name: data.fileName || attachment.file.name,
            content_type: data.contentType || attachment.file.type || 'application/octet-stream',
            size_bytes: data.sizeBytes ?? attachment.file.size,
            is_image: data.isImage ?? isImageAttachment(attachment),
          };

          uploadedByIndex.set(attachmentIndex, uploadedAttachment);

          setUploadingImages((prev) => {
            const existing = prev.get(uploadKey);
            if (!existing) return prev;
            const next = new Map(prev);
            next.set(uploadKey, {
              ...existing,
              phase: 'uploaded',
              progress: 100,
            });
            return next;
          });

          setMessages((prev) =>
            prev.map((message) =>
              message.localId === localId || message.messageId === localId
                ? {
                    ...message,
                    images:
                      message.images?.map((image, idx) =>
                        idx === attachmentIndex
                          ? {
                              imagePath: data.imagePath,
                              imageUrl: image.imageUrl || data.imageUrl,
                              thumbnailUrl:
                                normalizedUploadAttachment.thumbnailUrl ||
                                image.thumbnailUrl,
                              strippedThumbnailUrl:
                                normalizedUploadAttachment.strippedThumbnailUrl ||
                                image.strippedThumbnailUrl,
                              fileName: data.fileName || attachment.file.name,
                              contentType:
                                data.contentType ||
                                attachment.file.type ||
                                'application/octet-stream',
                              sizeBytes: data.sizeBytes ?? attachment.file.size,
                              isImage: data.isImage ?? isImageAttachment(attachment),
                              imageKeyVersion: data.imageKeyVersion,
                            }
                          : image
                      ) || []
                  }
                : message
            )
          );
        } catch (uploadError) {
          const err = uploadError as any;
          const wasCanceled =
            uploadController.signal.aborted ||
            err?.code === 'ERR_CANCELED' ||
            err?.name === 'CanceledError' ||
            canceledIndices.has(attachmentIndex);

          if (!wasCanceled) {
            logger.error('[chat.upload] failed', {
              ...uploadDebugMeta,
              errorMessage: err?.message,
              responseStatus: err?.response?.status,
              responseData: err?.response?.data,
              responseHeaders: err?.response?.headers,
            });
            throw uploadError;
          }
        } finally {
          controllersByIndex.delete(attachmentIndex);
        }
      }

      const uploadedIndexes = Array.from(uploadedByIndex.keys()).sort((a, b) => a - b);
      if (uploadedIndexes.length === 0) {
        clearUploadStatesByLocalId(localId);
        removeTempMessageIfAllCanceled();
        return;
      }

      uploadedIndexes.forEach((attachmentIndex) => {
        removePendingCancelHandler(attachmentIndex);
        const uploadKey = toUploadStateKey(localId, attachmentIndex);
        setUploadingImages((prev) => {
          const existing = prev.get(uploadKey);
          if (!existing) return prev;
          const next = new Map(prev);
          next.set(uploadKey, { ...existing, cancelable: false });
          return next;
        });
      });

      const uploadedAttachments = uploadedIndexes.map((attachmentIndex) => uploadedByIndex.get(attachmentIndex)!);
      const effectiveAttachments = uploadedIndexes.map((attachmentIndex) => attachmentsToSend[attachmentIndex]);
      const messageType = resolveAttachmentMessageType(effectiveAttachments);
      const { msgId, seqNo, timestamp } = nextProtocolEnvelope();

      const messageData: any = {
        msg_id: msgId,
        seq_no: seqNo,
        timestamp,
        chat_id: finalChatId,
        content_type: messageType,
        content: normalizedContent,
        entities: normalizedEntities,
        hmac: '',
        reply_to_id: options?.replyToMessageId,
        image_path: uploadedAttachments[0].image_path,
        image_encrypted: uploadedAttachments[0].image_encrypted,
        image_encryption_iv: uploadedAttachments[0].image_encryption_iv,
        image_key_version: uploadedAttachments[0].image_key_version,
        file_name: uploadedAttachments[0].file_name,
        file_content_type: uploadedAttachments[0].content_type,
        file_size_bytes: uploadedAttachments[0].size_bytes,
        file_is_image: uploadedAttachments[0].is_image,
      };

      if (uploadedAttachments.length > 1) {
        messageData.images = uploadedAttachments.map((item) => ({
          image_path: item.image_path,
          image_encrypted: item.image_encrypted,
          image_encryption_iv: item.image_encryption_iv,
          image_key_version: item.image_key_version,
          file_name: item.file_name,
          content_type: item.content_type,
          size_bytes: item.size_bytes,
          is_image: item.is_image,
        }));
      }

      const { data } = await http.post<SendMessageResponse>(endpoints.chatSend, messageData);

      setMessages((prev) =>
        prev.map((message) => {
          if (message.localId !== localId && message.messageId !== localId) {
            return message;
          }

          return {
            ...message,
            messageId: data.messageId,
            status: 'sent',
            senderId: user?.id || '',
            content: normalizedContent,
            entities: message.entities ?? normalizedEntities,
            messageType,
            imagePath: uploadedAttachments[0].image_path,
            imageUrl: pickStableMediaUrl(
              message.imageUrl,
              data.imageUrl,
              uploadedAttachments[0].image_url,
              `/media/${uploadedAttachments[0].image_path}`
            ),
            images: uploadedAttachments.map((item, index) => {
              const fromResponse = normalizeAttachmentPayload(
                data.imageUrls?.[index] as LooseAttachmentPayload | undefined
              );
              const singleAttachmentUrl = uploadedAttachments.length === 1 ? data.imageUrl : undefined;
              const previousImage = message.images?.[uploadedIndexes[index]];
              return {
                imagePath: fromResponse.imagePath || item.image_path,
                imageUrl: pickStableMediaUrl(
                  previousImage?.imageUrl,
                  fromResponse.imageUrl,
                  singleAttachmentUrl,
                  item.image_url,
                  `/media/${item.image_path}`
                ),
                thumbnailUrl: fromResponse.thumbnailUrl || item.thumbnail_url,
                strippedThumbnailUrl:
                  fromResponse.strippedThumbnailUrl || item.stripped_thumbnail_url,
                fileName: fromResponse.fileName || item.file_name,
                contentType: fromResponse.contentType || item.content_type,
                sizeBytes: fromResponse.sizeBytes ?? item.size_bytes,
                isImage: fromResponse.isImage ?? item.is_image,
                imageKeyVersion: fromResponse.imageKeyVersion ?? item.image_key_version,
              };
            }),
            createdAt: new Date().toISOString(),
            isRead: false,
          };
        })
      );

      clearUploadStatesByLocalId(localId);

      setChats((prev) =>
        prev.map((chat) =>
          chat.chatId === finalChatId
            ? {
                ...chat,
                lastMessage: {
                  localId,
                  messageId: data.messageId,
                  senderId: user?.id || '',
                  content: normalizedContent,
                  entities: normalizedEntities,
                  messageType,
                  imagePath: uploadedAttachments[0].image_path,
                  imageUrl:
                    normalizeAttachmentPayload(
                      data.imageUrls?.[0] as LooseAttachmentPayload | undefined
                    ).imageUrl ||
                    data.imageUrl ||
                    uploadedAttachments[0].image_url,
                  images: uploadedAttachments.map((item, index) => {
                    const responseAttachment = normalizeAttachmentPayload(
                      data.imageUrls?.[index] as LooseAttachmentPayload | undefined
                    );
                    return {
                      imagePath: responseAttachment.imagePath || item.image_path,
                      imageUrl:
                        responseAttachment.imageUrl ||
                        (uploadedAttachments.length === 1 ? data.imageUrl : undefined) ||
                        item.image_url,
                      thumbnailUrl: responseAttachment.thumbnailUrl || item.thumbnail_url,
                      strippedThumbnailUrl:
                        responseAttachment.strippedThumbnailUrl || item.stripped_thumbnail_url,
                      fileName: responseAttachment.fileName || item.file_name,
                      contentType: responseAttachment.contentType || item.content_type,
                      sizeBytes: responseAttachment.sizeBytes ?? item.size_bytes,
                      isImage: responseAttachment.isImage ?? item.is_image,
                      imageKeyVersion:
                        responseAttachment.imageKeyVersion ?? item.image_key_version,
                    };
                  }),
                  createdAt: new Date().toISOString(),
                  status: 'sent',
                } as ChatMessage,
              }
            : chat
        )
      );

      uploadedAttachments.forEach((attachment, index) => {
        const responseAttachment = normalizeAttachmentPayload(
          data.imageUrls?.[index] as LooseAttachmentPayload | undefined
        );
        const singleAttachmentUrl = uploadedAttachments.length === 1 ? data.imageUrl : undefined;
        const remoteUrl =
          responseAttachment.imageUrl ||
          singleAttachmentUrl ||
          attachment.image_url ||
          (attachment.image_path ? `/media/${attachment.image_path}` : undefined);
        const remotePath = responseAttachment.imagePath || attachment.image_path;
        const currentUrl = effectiveAttachments[index]?.preview;

        scheduleMediaSwapAfterPrefetch({
          localId,
          messageId: data.messageId,
          chatId: finalChatId,
          attachmentIndex: index,
          currentUrl,
          remoteUrl,
          remotePath,
          messageType,
          contentType: attachment.content_type,
          isImage: attachment.is_image,
        });
      });

      if (resetReplyTo) {
        setReplyingTo(null);
      }
    } catch (error) {
      const err = error as any;
      logger.error('[chat.upload] multi-attachment send failed', {
        chatId,
        localId,
        attachments: attachmentsToSend.map((attachment, idx) => ({
          idx,
          fileName: attachment.file.name,
          fileType: attachment.file.type,
          fileSize: attachment.file.size,
          attachmentContentType: attachment.contentType,
          attachmentIsImage: isImageAttachment(attachment),
        })),
        errorMessage: err?.message,
        responseStatus: err?.response?.status,
        responseData: err?.response?.data,
      });
      console.error('Failed to send multi-attachment message:', error);

      setMessages((prev) =>
        prev.filter((message) => message.localId !== localId && message.messageId !== localId)
      );
      clearUploadStatesByLocalId(localId);
      alert(
        error instanceof Error
          ? error.message
          : 'РћС€РёР±РєР° РѕС‚РїСЂР°РІРєРё СЃРѕРѕР±С‰РµРЅРёСЏ'
      );
    } finally {
      for (let attachmentIndex = 0; attachmentIndex < attachmentsToSend.length; attachmentIndex += 1) {
        removePendingCancelHandler(attachmentIndex);
      }
      controllersByIndex.forEach((controller) => {
        if (!controller.signal.aborted) {
          controller.abort();
        }
      });
      controllersByIndex.clear();
    }
  };

  const attachImage = async (
    file: File,
    options?: {
      forcedMessageType?: 'voice' | 'circle';
      preview?: string;
      sendAsFile?: boolean;
      groupWithOthers?: boolean;
    }
  ) => {
    if (!selectedChat) return;
    
    const id = `attached-${Date.now()}-${Math.random()}`;
    const fileType = (file.type || '').toLowerCase();
    const forcedMessageType = options?.forcedMessageType;
    const isRawImage = fileType.startsWith('image/');
    const sendAsFile = !forcedMessageType && !!options?.sendAsFile;
    const isImage = !sendAsFile && isRawImage;
    let preview: string | undefined = options?.preview;

    if (!preview && isRawImage) {
      preview = await new Promise<string>(resolve => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });
    }
    
    const nextAttachment = {
      id,
      file,
      preview,
      isImage,
      sendAsFile,
      groupWithOthers: options?.groupWithOthers ?? true,
      forcedMessageType,
      contentType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
      uploading: false
    };

    setAttachedImages(prev => forcedMessageType ? [nextAttachment] : [...prev, nextAttachment]);
    if (forcedMessageType) {
      setMessageInput('');
    }
  };

  // рџ–јпёЏ РЈРґР°Р»РµРЅРёРµ РїСЂРёРєСЂРµРїР»РµРЅРЅРѕРіРѕ РёР·РѕР±СЂР°Р¶РµРЅРёСЏ
  const removeAttachedImage = (id: string) => {
    setAttachedImages(prev => prev.filter(img => img.id !== id));
  };

  const editMessage = async (messageId: number | string, newContent: string) => {
    if (!selectedChat || typeof messageId === 'string') return;
    
    try {
      const parsed = buildMessageTextAndEntities(newContent);
      const normalizedContent = parsed.content;
      const normalizedEntities = parsed.entities.length > 0 ? parsed.entities : undefined;
      const chat = chats.find(c => c.chatId === selectedChat);
      if (!chat) return;

      await http.put(endpoints.chatMessageEdit(messageId), {
        content: normalizedContent,
        entities: normalizedEntities,
      });

      setMessages(prev => prev.map(m => 
        m.messageId === messageId 
          ? { ...m, content: normalizedContent, entities: normalizedEntities, edited: true }
          : m
      ));
    } catch (e) {
      console.error('Failed to edit message', e);
      alert(e instanceof Error ? e.message : 'РћС€РёР±РєР° СЂРµРґР°РєС‚РёСЂРѕРІР°РЅРёСЏ СЃРѕРѕР±С‰РµРЅРёСЏ');
    }
  };

  const deleteMessage = async (messageId: number | string) => {
    if (!selectedChat || typeof messageId === 'string') return;
    
    if (!confirm('РЈРґР°Р»РёС‚СЊ СЃРѕРѕР±С‰РµРЅРёРµ?')) return;
    
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
      alert(e instanceof Error ? e.message : 'РћС€РёР±РєР° СѓРґР°Р»РµРЅРёСЏ СЃРѕРѕР±С‰РµРЅРёСЏ');
    }
  };

  const copyMessageText = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      console.log('Message copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy message', err);
    });
  };

  const uploadImage = async (
    file: File,
    options?: { forcedMessageType?: 'voice' | 'circle' }
  ) => {
    if (!selectedChat || !file) return;
    const chat = chats.find(c => c.chatId === selectedChat);
    if (!chat) return;
    const forcedMessageType = options?.forcedMessageType;
    const isImage = (file.type || '').toLowerCase().startsWith('image/');
    const messageType =
      forcedMessageType === 'voice'
        ? 'voice'
        : forcedMessageType === 'circle'
          ? 'circle'
          : isImage
            ? 'image'
            : (file.type || '').toLowerCase().startsWith('audio/')
              ? 'voice'
              : 'file';
    
    const localId = `local-upload-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const uploadKey = toUploadStateKey(localId, 0);
    const createdAt = new Date().toISOString();
    const fallbackContentType = file.type || 'application/octet-stream';
    const localPreviewUrl =
      messageType === 'image' || messageType === 'voice' || messageType === 'circle'
        ? URL.createObjectURL(file)
        : undefined;
    let canceled = false;
    const uploadController = new AbortController();

    const removeTempMessage = () => {
      setMessages(prev => prev.filter(m => m.localId !== localId && m.messageId !== localId));
    };

    const cancelUpload = () => {
      if (canceled) return;
      canceled = true;
      pendingUploadCancelsRef.current.delete(uploadKey);
      if (!uploadController.signal.aborted) {
        uploadController.abort();
      }
      clearUploadStatesByLocalId(localId);
      removeTempMessage();
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl);
      }
    };
    
    try {
      // РЎРѕР·РґР°РµРј РІСЂРµРјРµРЅРЅРѕРµ СЃРѕРѕР±С‰РµРЅРёРµ СЃ РёРЅРґРёРєР°С‚РѕСЂРѕРј Р·Р°РіСЂСѓР·РєРё
      const tempMessage: ChatMessage = {
        localId,
        messageId: localId,
        status: 'pending',
        senderId: user?.id || '',
        content: '',
        messageType,
        imageUrl: localPreviewUrl,
        images: [{
          imagePath: '',
          imageUrl: localPreviewUrl,
          fileName: file.name,
          contentType: fallbackContentType,
          sizeBytes: file.size,
          isImage,
        }],
        createdAt,
      };
      
      pendingUploadCancelsRef.current.set(uploadKey, cancelUpload);
      setMessages(prev => [...prev, tempMessage]);
      setUploadingImages(prev => {
        const next = new Map(prev);
        next.set(uploadKey, {
          localId,
          attachmentIndex: 0,
          file,
          progress: 0,
          phase: 'queued',
          cancelable: true,
        });
        return next;
      });
      
      setTimeout(() => scrollToBottom(), 0);
      
      const form = new FormData();
      form.append('file', file);

      setUploadingImages(prev => {
        const existing = prev.get(uploadKey);
        if (!existing) return prev;
        const next = new Map(prev);
        next.set(uploadKey, {
          ...existing,
          phase: 'uploading',
          progress: Math.max(1, existing.progress),
        });
        return next;
      });
      
      const { data } = await http.post<UploadImageResponse>(
        `${endpoints.chatUpload}?chatId=${selectedChat}`, 
        form,
        {
          signal: uploadController.signal,
          onUploadProgress: (e: any) => {
            if (canceled) return;
            const total = typeof e.total === 'number' && e.total > 0 ? e.total : 0;
            const loaded = typeof e.loaded === 'number' ? e.loaded : 0;
            const progress = total > 0 ? Math.round((loaded / total) * 100) : 0;
            setUploadingImages(prev => {
              const existing = prev.get(uploadKey);
              if (!existing) return prev;
              const next = new Map(prev);
              next.set(uploadKey, {
                ...existing,
                progress,
                phase: 'uploading',
              });
              return next;
            });
          }
        }
      );
      
      if (canceled) {
        return;
      }

      setUploadingImages(prev => {
        const existing = prev.get(uploadKey);
        if (!existing) return prev;
        const next = new Map(prev);
        next.set(uploadKey, {
          ...existing,
          progress: 100,
          phase: 'uploaded',
          cancelable: true,
        });
        return next;
      });
      
      // РћС‚РїСЂР°РІР»СЏРµРј СЂРµР°Р»СЊРЅРѕРµ СЃРѕРѕР±С‰РµРЅРёРµ СЃ РёР·РѕР±СЂР°Р¶РµРЅРёРµРј, РѕСЃС‚Р°РµРјСЃСЏ РЅР° С‚РѕРј Р¶Рµ РѕР±СЉРµРєС‚Рµ
      if (canceled) {
        return;
      }

      const { msgId, seqNo, timestamp } = nextProtocolEnvelope();
      
      const { data: sendRes } = await http.post<SendMessageResponse>(endpoints.chatSend, {
        msg_id: msgId,
        seq_no: seqNo,
        timestamp,
        chat_id: chat!.chatId,
        content_type: messageType,
        content: '',
        hmac: '',
        reply_to_id: replyingTo?.messageId,
        image_path: data.imagePath,
        image_encrypted: data.imageEncrypted,
        image_encryption_iv: data.imageEncryptionIv,
        image_key_version: data.imageKeyVersion,
        file_name: data.fileName || file.name,
        file_content_type: data.contentType || file.type || 'application/octet-stream',
        file_size_bytes: data.sizeBytes ?? file.size,
        file_is_image: data.isImage ?? isImage,
      });

      if (canceled) {
        return;
      }

      const normalizedUploadAttachment = normalizeAttachmentPayload(
        data as unknown as LooseAttachmentPayload
      );
      const responseAttachment = normalizeAttachmentPayload(
        sendRes.imageUrls?.[0] as LooseAttachmentPayload | undefined
      );
      const resolvedRemoteUrl =
        responseAttachment.imageUrl ?? sendRes.imageUrl ?? data.imageUrl;
      const resolvedImagePath =
        responseAttachment.imagePath || data.imagePath;
      const resolvedThumbnailUrl =
        responseAttachment.thumbnailUrl || normalizedUploadAttachment.thumbnailUrl;
      const resolvedStrippedThumbnailUrl =
        responseAttachment.strippedThumbnailUrl ||
        normalizedUploadAttachment.strippedThumbnailUrl;
      const resolvedContentType =
        responseAttachment.contentType || data.contentType || fallbackContentType;
      const resolvedSizeBytes = responseAttachment.sizeBytes ?? data.sizeBytes ?? file.size;
      const resolvedIsImage = responseAttachment.isImage ?? data.isImage ?? isImage;
      const resolvedImageKeyVersion =
        responseAttachment.imageKeyVersion ?? data.imageKeyVersion;
      
      setMessages(prev => prev.map(m => 
        (m.localId === localId || m.messageId === localId)
          ? {
              ...m,
              messageId: sendRes.messageId,
              status: 'sent',
              imagePath: resolvedImagePath || m.imagePath,
              imageUrl: pickStableMediaUrl(
                m.imageUrl,
                resolvedRemoteUrl,
                resolvedImagePath ? `/media/${resolvedImagePath}` : undefined
              ),
              images: [{
                imagePath: resolvedImagePath || m.imagePath || '',
                imageUrl: pickStableMediaUrl(
                  m.images?.[0]?.imageUrl ?? m.imageUrl,
                  resolvedRemoteUrl,
                  resolvedImagePath ? `/media/${resolvedImagePath}` : undefined
                ),
                thumbnailUrl: resolvedThumbnailUrl,
                strippedThumbnailUrl: resolvedStrippedThumbnailUrl,
                fileName: data.fileName || file.name,
                contentType: resolvedContentType,
                sizeBytes: resolvedSizeBytes,
                isImage: resolvedIsImage,
                imageKeyVersion: resolvedImageKeyVersion,
              }],
              createdAt: new Date().toISOString(),
              isRead: false,
            }
          : m
      ));

      clearUploadStatesByLocalId(localId);
      pendingUploadCancelsRef.current.delete(uploadKey);
      
      setChats(prev => prev.map(c => 
        c.chatId === chat!.chatId 
          ? { ...c, lastMessage: {
              localId,
              messageId: sendRes.messageId,
              senderId: user?.id || '',
              content: '',
              messageType,
              imagePath: resolvedImagePath,
              imageUrl: resolvedRemoteUrl,
              images: [{
                imagePath: resolvedImagePath || '',
                imageUrl: resolvedRemoteUrl,
                thumbnailUrl: resolvedThumbnailUrl,
                strippedThumbnailUrl: resolvedStrippedThumbnailUrl,
                fileName: data.fileName || file.name,
                contentType: resolvedContentType,
                sizeBytes: resolvedSizeBytes,
                isImage: resolvedIsImage,
                imageKeyVersion: resolvedImageKeyVersion,
              }],
              createdAt: new Date().toISOString(),
              status: 'sent',
            } as ChatMessage }
          : c
      ));

      scheduleMediaSwapAfterPrefetch({
        localId,
        messageId: sendRes.messageId,
        chatId: chat.chatId,
        attachmentIndex: 0,
        currentUrl: localPreviewUrl,
        remoteUrl:
          resolvedRemoteUrl ||
          (resolvedImagePath ? `/media/${resolvedImagePath}` : undefined),
        remotePath: resolvedImagePath,
        messageType,
        contentType: resolvedContentType,
        isImage: resolvedIsImage,
      });
    } catch (e) {
      const err = e as any;
      const wasCanceled =
        canceled ||
        uploadController.signal.aborted ||
        err?.code === 'ERR_CANCELED' ||
        err?.name === 'CanceledError';

      if (wasCanceled) {
        removeTempMessage();
        if (localPreviewUrl) {
          URL.revokeObjectURL(localPreviewUrl);
        }
        clearUploadStatesByLocalId(localId);
        pendingUploadCancelsRef.current.delete(uploadKey);
        return;
      }

      logger.error('[chat.upload] single attachment failed', {
        chatId: selectedChat,
        localId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        responseStatus: err?.response?.status,
        responseData: err?.response?.data,
        errorMessage: err?.message,
      });

      removeTempMessage();
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl);
      }
      clearUploadStatesByLocalId(localId);
      pendingUploadCancelsRef.current.delete(uploadKey);
      alert('Failed to upload attachment');
    } finally {
      pendingUploadCancelsRef.current.delete(uploadKey);
    }
  };

  return {
    markChatRead,
    loadChats,
    loadMessages,
    openChatWith,
    createGroupChat,
    sendTypingState,
    sendMessageToUser,
    sendChatMessage,
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



