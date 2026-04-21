import { http } from '@/shared/api/http';
import { endpoints } from '@/shared/api/endpoints';
import { logger } from '@/shared/lib/logger';
import { buildMessageTextAndEntities } from '@/shared/utils/chatTextEntities';
import type {
  ChatAdminLogResponse,
  ChatAdminRights,
  ChatGroupMediaItemsResponse,
  ChatGroupPermissions,
  ChatGroupSettings,
  ChatInviteLink,
  ChatInviteLinksResponse,
  ChatJoinRequestsResponse,
  ChatListResponse,
  ChatMemberRestrictions,
  ChatMessageReactionsResponse,
  ChatMessage,
  ChatMessagesResponse,
  ChatPoll,
  ChatPollVotersResponse,
  ChatTopic,
  ChatTopicsResponse,
  CreateChatResponse,
  SendMessageResponse,
  UploadImageResponse,
} from '@/shared/api/types';
import type { AttachedImage, SocialChatActions, SocialFloatingActionsContext } from './types';
import { getMessageMediaAttachments } from '../chat/mediaAttachments';
import { buildLocalMediaPreviewMeta } from '../chat/localMediaPreview';
import {
  mergeHistoryWithPendingInStore,
  patchMessagesInStore,
  removeMessageFromStore,
  upsertMessageInStore,
  upsertMessagesInStore,
} from './messageReconcile';

export function createSocialChatActions(ctx: SocialFloatingActionsContext): SocialChatActions {
  const {
    user,
    selectedChat,
    chats,
    messageStore,
    messageInput,
    attachedImages,
    editingMessage,
    replyingTo,
    markReadTimeoutRef,
    markReadTargetRef,
    sendQueueRef,
    pendingUploadCancelsRef,
    historyBeforeByChatRef,
    historyHasMoreByChatRef,
    historyLoadingByChatRef,
    activeTopicByChatRef,
    lastProtocolSeqRef,
    lastProtocolMsgIdRef,
    typingThrottleRef,
    isFirstLoadRef,
    messagesEndRef,
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
  } = ctx;

  const nextClientMessageId = () => {
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 1024);
    const candidateMsgId = timestamp * 1024 + randomSuffix;
    const nextMsgId = Math.max(candidateMsgId, lastProtocolMsgIdRef.current + 1);
    lastProtocolMsgIdRef.current = nextMsgId;
    return nextMsgId;
  };

  const nextProtocolEnvelope = (clientMessageId?: number) => {
    const timestamp = Date.now();
    const nextSeqNo = Math.max(timestamp, lastProtocolSeqRef.current + 1);
    lastProtocolSeqRef.current = nextSeqNo;

    return { msgId: clientMessageId ?? nextClientMessageId(), seqNo: nextSeqNo, timestamp };
  };

  const normalizeTopicId = (topicId?: number | null) => {
    if (typeof topicId !== 'number' || !Number.isFinite(topicId) || topicId <= 0) {
      return undefined;
    }
    return Math.trunc(topicId);
  };

  const getActiveTopicId = (chatId: number) => {
    if (!Number.isFinite(chatId) || chatId <= 0) {
      return undefined;
    }
    return normalizeTopicId(activeTopicByChatRef.current.get(chatId));
  };

  const setActiveTopicId = (chatId: number, topicId?: number) => {
    if (!Number.isFinite(chatId) || chatId <= 0) {
      return;
    }
    const normalizedTopicId = normalizeTopicId(topicId);
    if (normalizedTopicId) {
      activeTopicByChatRef.current.set(chatId, normalizedTopicId);
    } else {
      activeTopicByChatRef.current.delete(chatId);
    }
    historyBeforeByChatRef.current.delete(chatId);
    historyHasMoreByChatRef.current.delete(chatId);
    historyLoadingByChatRef.current.delete(chatId);
  };

  const enqueueByChat = async (chatId: number, task: () => Promise<void>) => {
    const queue = sendQueueRef.current;
    const previous = queue.get(chatId) ?? Promise.resolve();
    const run = previous.catch(() => undefined).then(task);
    queue.set(chatId, run);
    try {
      await run;
    } finally {
      if (queue.get(chatId) === run) {
        queue.delete(chatId);
      }
    }
  };

  const MAX_ATTACHMENTS = 9;
  const MAX_TEXT_CHUNK_LENGTH = 4096;
  const toUploadStateKey = (localId: string, attachmentIndex: number) =>
    `${localId}-${attachmentIndex}`;

  const splitTextForSend = (text: string, limit = MAX_TEXT_CHUNK_LENGTH) => {
    if (!text || text.length <= limit) {
      return [text];
    }

    const chunks: string[] = [];
    let remaining = text;
    while (remaining.length > limit) {
      let splitIndex = remaining.lastIndexOf('\n', limit);
      if (splitIndex < Math.floor(limit * 0.7)) {
        splitIndex = remaining.lastIndexOf(' ', limit);
      }
      if (splitIndex <= 0) {
        splitIndex = limit;
      }

      chunks.push(remaining.slice(0, splitIndex).trimEnd());
      remaining = remaining.slice(splitIndex).trimStart();
    }

    if (remaining.length > 0) {
      chunks.push(remaining);
    }
    return chunks.filter((chunk) => chunk.length > 0);
  };

  const normalizeHistoryMessage = (chatId: number, message: ChatMessage): ChatMessage => ({
    ...message,
    chatId: message.chatId ?? chatId,
    replyToMessage: message.replyToMessage
      ? {
          ...message.replyToMessage,
          chatId: message.replyToMessage.chatId ?? chatId,
        }
      : message.replyToMessage,
  });

  const normalizeHistoryBatch = (chatId: number, messages: ChatMessage[]) =>
    messages.map((message) => normalizeHistoryMessage(chatId, message));

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

  const upsertPendingMediaPreviewUrl = (key: string, nextUrl: string) => {
    setPendingMediaPreviewUrls((prev) => {
      const current = prev.get(key);
      if (current === nextUrl) {
        return prev;
      }
      if (current && current.startsWith('blob:')) {
        URL.revokeObjectURL(current);
      }
      const next = new Map(prev);
      next.set(key, nextUrl);
      return next;
    });
  };

  const clearPendingMediaPreviewUrlByKey = (key: string) => {
    setPendingMediaPreviewUrls((prev) => {
      const current = prev.get(key);
      if (!current) {
        return prev;
      }
      const next = new Map(prev);
      next.delete(key);
      if (current.startsWith('blob:')) {
        URL.revokeObjectURL(current);
      }
      return next;
    });
  };

  const clearPendingMediaPreviewUrlsByLocalId = (localId: string) => {
    setPendingMediaPreviewUrls((prev) => {
      if (prev.size === 0) {
        return prev;
      }
      const next = new Map(prev);
      let changed = false;
      for (const [key, url] of prev.entries()) {
        if (!key.startsWith(`${localId}-`)) {
          continue;
        }
        next.delete(key);
        changed = true;
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      }
      return changed ? next : prev;
    });
  };

  const INITIAL_HISTORY_PAGE_LIMIT = 50;

  const getOldestServerMessageIdForChat = (chatId: number) => {
    let oldest = Number.MAX_SAFE_INTEGER;
    for (const key of messageStore.orderedIds) {
      const message = messageStore.byId[key];
      if (!message || message.chatId !== chatId) continue;
      if (typeof message.messageId !== 'number' || !Number.isFinite(message.messageId)) {
        continue;
      }
      if (message.messageId < oldest) {
        oldest = message.messageId;
      }
    }
    return oldest === Number.MAX_SAFE_INTEGER ? 0 : oldest;
  };

  const setHistoryCursorFromBatch = (
    chatId: number,
    batch: ChatMessage[],
    limit = INITIAL_HISTORY_PAGE_LIMIT
  ) => {
    const oldestInBatch = batch.reduce((oldest, message) => {
      if (typeof message.messageId !== 'number' || !Number.isFinite(message.messageId)) {
        return oldest;
      }
      return oldest === 0 || message.messageId < oldest ? message.messageId : oldest;
    }, 0);

    if (oldestInBatch > 0) {
      const previousOldest = historyBeforeByChatRef.current.get(chatId) ?? 0;
      if (previousOldest <= 0 || oldestInBatch < previousOldest) {
        historyBeforeByChatRef.current.set(chatId, oldestInBatch);
      }
    }

    if (batch.length < limit) {
      historyHasMoreByChatRef.current.set(chatId, false);
      return;
    }

    if (!historyHasMoreByChatRef.current.has(chatId)) {
      historyHasMoreByChatRef.current.set(chatId, true);
    }
  };
  type LooseAttachmentPayload = {
    imagePath?: string;
    imageUrl?: string;
    thumbnailUrl?: string;
    strippedThumbnailUrl?: string;
    width?: number;
    height?: number;
    fileName?: string;
    contentType?: string;
    sizeBytes?: number;
    isImage?: boolean;
    imageKeyVersion?: number;
    imageEncryptionIv?: string;
  };
  const normalizeAttachmentPayload = (payload?: LooseAttachmentPayload) => {
    if (!payload) {
      return {
        imagePath: undefined,
        imageUrl: undefined,
        thumbnailUrl: undefined,
        strippedThumbnailUrl: undefined,
        width: undefined,
        height: undefined,
        fileName: undefined,
        contentType: undefined,
        sizeBytes: undefined,
        isImage: undefined,
        imageKeyVersion: undefined,
        imageEncryptionIv: undefined,
      };
    }

    return {
      imagePath: typeof payload.imagePath === 'string' ? payload.imagePath : undefined,
      imageUrl: typeof payload.imageUrl === 'string' ? payload.imageUrl : undefined,
      thumbnailUrl: typeof payload.thumbnailUrl === 'string' ? payload.thumbnailUrl : undefined,
      strippedThumbnailUrl:
        typeof payload.strippedThumbnailUrl === 'string'
          ? payload.strippedThumbnailUrl
          : undefined,
      width:
        typeof payload.width === 'number' && Number.isFinite(payload.width) && payload.width > 0
          ? payload.width
          : undefined,
      height:
        typeof payload.height === 'number' && Number.isFinite(payload.height) && payload.height > 0
          ? payload.height
          : undefined,
      fileName: typeof payload.fileName === 'string' ? payload.fileName : undefined,
      contentType: typeof payload.contentType === 'string' ? payload.contentType : undefined,
      sizeBytes:
        typeof payload.sizeBytes === 'number' && Number.isFinite(payload.sizeBytes)
          ? payload.sizeBytes
          : undefined,
      isImage: typeof payload.isImage === 'boolean' ? payload.isImage : undefined,
      imageKeyVersion:
        typeof payload.imageKeyVersion === 'number' && Number.isFinite(payload.imageKeyVersion)
          ? payload.imageKeyVersion
          : undefined,
      imageEncryptionIv:
        typeof payload.imageEncryptionIv === 'string' ? payload.imageEncryptionIv : undefined,
    };
  };
  const shouldSendAttachmentsSeparately = (attachments: AttachedImage[]) =>
    attachments.length > 1 && attachments.every((attachment) => attachment.groupWithOthers === false);

  const isGroupedAlbumAttachment = (attachment: AttachedImage) =>
    (attachment.groupWithOthers ?? true) &&
    !attachment.sendAsFile &&
    attachment.forcedMessageType !== 'voice' &&
    attachment.forcedMessageType !== 'circle' &&
    isVisualMediaAttachment(attachment);

  const shouldSendAsGroupedAlbum = (attachments: AttachedImage[]) =>
    attachments.length > 1 && attachments.every(isGroupedAlbumAttachment);

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

  const normalizeMediaContentType = (value?: string) => {
    const normalized = (value || '').trim().toLowerCase();
    return normalized || 'application/octet-stream';
  };

  const resolveIsImageFlag = (contentType: string, fallback?: boolean) => {
    if (contentType.startsWith('video/')) {
      return false;
    }
    if (contentType.startsWith('image/')) {
      return true;
    }
    return !!fallback;
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

  const toRetryableUploadedAttachments = (message: ChatMessage) => {
    const fallbackMediaType =
      message.messageType === 'image' ||
      message.messageType === 'images' ||
      message.messageType === 'voice' ||
      message.messageType === 'circle'
        ? message.messageType !== 'voice' && message.messageType !== 'circle'
        : false;

    const source = getMessageMediaAttachments(message).map((attachment) => ({
      ...attachment,
      isImage: attachment.isImage ?? fallbackMediaType,
      imageKeyVersion: attachment.imageKeyVersion ?? message.imageKeyVersion,
    }));

    return source
      .map((rawAttachment, index) => {
        const normalized = normalizeAttachmentPayload(rawAttachment as LooseAttachmentPayload);
        const imagePath = normalized.imagePath || '';
        if (!imagePath) return null;
        const fallbackFileName = imagePath.split('/').pop() || `attachment-${index + 1}`;
        const normalizedContentType = normalizeMediaContentType(
          normalized.contentType || 'application/octet-stream'
        );
        return {
          imagePath,
          imageUrl: normalized.imageUrl || (imagePath ? `/media/${imagePath}` : undefined),
          thumbnailUrl: normalized.thumbnailUrl,
          strippedThumbnailUrl: normalized.strippedThumbnailUrl,
          width: normalized.width,
          height: normalized.height,
          fileName: normalized.fileName || fallbackFileName,
          contentType: normalizedContentType,
          sizeBytes: normalized.sizeBytes ?? 0,
          isImage: resolveIsImageFlag(normalizedContentType, normalized.isImage ?? fallbackMediaType),
          imageKeyVersion: normalized.imageKeyVersion,
          imageEncryptionIv: normalized.imageEncryptionIv,
          imageEncrypted: !!normalized.imageEncryptionIv,
        };
      })
      .filter((attachment): attachment is NonNullable<typeof attachment> => !!attachment);
  };

  type SendAttachmentPayload = {
    imagePath: string;
    imageEncrypted?: boolean;
    imageEncryptionIv?: string;
    imageKeyVersion?: number;
    width?: number;
    height?: number;
    fileName?: string;
    contentType?: string;
    sizeBytes?: number;
    isImage?: boolean;
    imageUrl?: string;
    thumbnailUrl?: string;
    strippedThumbnailUrl?: string;
  };

  const buildSendRequestPayload = (params: {
    chatId: number;
    topicId?: number;
    messageType: string;
    content: string;
    entities?: ChatMessage['entities'];
    replyToMessageId?: number;
    clientMessageId: number;
    groupingKey?: string;
    attachments?: SendAttachmentPayload[];
  }) => {
    const {
      chatId,
      topicId,
      messageType,
      content,
      entities,
      replyToMessageId,
      clientMessageId,
      groupingKey,
      attachments = [],
    } = params;

    const { msgId, seqNo, timestamp } = nextProtocolEnvelope(clientMessageId);
    const payload: any = {
      msg_id: msgId,
      seq_no: seqNo,
      timestamp,
      chat_id: chatId,
      content_type: messageType,
      content,
      entities,
      hmac: '',
      reply_to_id: replyToMessageId,
    };

    if (topicId && topicId > 0) {
      payload.topic_id = topicId;
    }

    if (groupingKey) {
      payload.grouping_key = groupingKey;
    }

    if (attachments.length > 0) {
      payload.images = attachments.map((item) => ({
        image_path: item.imagePath,
        image_encrypted: item.imageEncrypted,
        image_encryption_iv: item.imageEncryptionIv,
        image_key_version: item.imageKeyVersion,
        file_name: item.fileName,
        content_type: item.contentType,
        size_bytes: item.sizeBytes,
        is_image: item.isImage,
      }));
    }

    return payload;
  };

  const resolveFinalizedImages = (
    attachments: SendAttachmentPayload[],
    response: SendMessageResponse
  ) => {
    const responseImages = Array.isArray(response.images) ? response.images : [];
    const count = Math.max(
      attachments.length,
      responseImages.length
    );
    if (count === 0) {
      return [];
    }

    const finalizedImages = new Array<NonNullable<ChatMessage['images']>[number]>();
    for (let index = 0; index < count; index += 1) {
      const localAttachment = attachments[index];
      const fromResponse = normalizeAttachmentPayload(
        responseImages[index] as LooseAttachmentPayload | undefined
      );
      const imagePath = fromResponse.imagePath || localAttachment?.imagePath || '';
      const imageUrl =
        fromResponse.imageUrl ||
        localAttachment?.imageUrl ||
        (imagePath ? `/media/${imagePath}` : undefined);

      if (!imagePath && !imageUrl) {
        continue;
      }

      finalizedImages.push({
        imagePath,
        imageUrl,
        thumbnailUrl: fromResponse.thumbnailUrl || localAttachment?.thumbnailUrl,
        strippedThumbnailUrl:
          fromResponse.strippedThumbnailUrl || localAttachment?.strippedThumbnailUrl,
        width: fromResponse.width ?? localAttachment?.width,
        height: fromResponse.height ?? localAttachment?.height,
        fileName: fromResponse.fileName || localAttachment?.fileName,
        contentType: fromResponse.contentType || localAttachment?.contentType,
        sizeBytes: fromResponse.sizeBytes ?? localAttachment?.sizeBytes,
        isImage: fromResponse.isImage ?? localAttachment?.isImage,
        imageKeyVersion: fromResponse.imageKeyVersion ?? localAttachment?.imageKeyVersion,
      });
    }

    return finalizedImages;
  };

  const sendPreparedMessage = async (params: {
    chatId: number;
    topicId?: number;
    messageType: ChatMessage['messageType'];
    content: string;
    entities?: ChatMessage['entities'];
    replyToMessageId?: number;
    clientMessageId: number;
    groupingKey?: string;
    attachments: SendAttachmentPayload[];
    tempMessage: ChatMessage;
  }) => {
    const {
      chatId,
      topicId,
      messageType,
      content,
      entities,
      replyToMessageId,
      clientMessageId,
      groupingKey,
      attachments,
      tempMessage,
    } = params;

    const payload = buildSendRequestPayload({
      chatId,
      topicId,
      messageType,
      content,
      entities,
      replyToMessageId,
      clientMessageId,
      groupingKey,
      attachments,
    });

    const { data } = await http.post<SendMessageResponse>(endpoints.chatSend, payload);
    const finalizedImages = resolveFinalizedImages(attachments, data);

    const acknowledgedMessage: ChatMessage = {
      ...tempMessage,
      messageId: data.messageId,
      clientMessageId: data.clientMessageId ?? clientMessageId,
      // Keep message pending until WS message_sent/new_message finalizes it.
      status: 'pending',
      images: finalizedImages.length > 0 ? finalizedImages : tempMessage.images,
      groupingKey: data.groupingKey || groupingKey,
      isRead: false,
      topicId: topicId ?? tempMessage.topicId,
      sequenceNumber: data.sequenceNumber,
      serverTimestamp: data.serverTimestamp,
      signatureTimestamp: data.serverTimestamp,
      messageType,
      content,
      entities,
    };

    return { data, acknowledgedMessage };
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

        setMessageStore((prev) =>
          patchMessagesInStore(
            prev,
            (message) =>
              typeof message.messageId === 'number' &&
              message.messageId <= target.lastId &&
              message.senderId !== user?.id,
            () => ({ isRead: true }),
            user?.id
          )
        );
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

      const lastMessages = chatsWithDecrypted
        .filter((chat) => !!chat.lastMessage)
        .map((chat) => ({
          ...chat.lastMessage!,
          chatId: chat.chatId,
        }));

      setMessageStore((prev) => upsertMessagesInStore(prev, lastMessages, user?.id));
      setChats(
        chatsWithDecrypted.map((chat) => ({
          ...chat,
          lastMessage: undefined,
        }))
      );
    } catch (err) {
      console.error('Failed to load chats:', err);
    } finally {
      setIsChatsRefreshing(false);
    }
  };

  const loadMessages = async (chatId: number, append = false, topicId?: number) => {
    const normalizedTopicId = normalizeTopicId(topicId);
    if (typeof topicId !== 'undefined') {
      setActiveTopicId(chatId, normalizedTopicId);
    }
    const effectiveTopicId = normalizedTopicId ?? getActiveTopicId(chatId);
    try {
      const aggregatedBatch: ChatMessage[] = [];
      let beforeCursor: number | undefined;
      let rounds = 0;
      const maxRounds = append ? 1 : 6;
      let exhaustedHistory = false;

      while (rounds < maxRounds) {
        const { data } = await http.get<ChatMessagesResponse>(
          endpoints.chatMessages(chatId, beforeCursor, INITIAL_HISTORY_PAGE_LIMIT, undefined, effectiveTopicId)
        );
        const incomingBatch = normalizeHistoryBatch(chatId, data.messages || []);
        if (incomingBatch.length === 0) {
          break;
        }

        aggregatedBatch.push(...incomingBatch);

        const oldestInBatch = incomingBatch.reduce((oldest, message) => {
          if (typeof message.messageId !== 'number' || !Number.isFinite(message.messageId)) {
            return oldest;
          }
          return oldest === 0 || message.messageId < oldest ? message.messageId : oldest;
        }, 0);

        if (incomingBatch.length < INITIAL_HISTORY_PAGE_LIMIT || oldestInBatch <= 0) {
          exhaustedHistory = true;
          break;
        }
        if (beforeCursor && oldestInBatch >= beforeCursor) {
          break;
        }

        beforeCursor = oldestInBatch;
        rounds += 1;
      }

      const messagesWithContent = aggregatedBatch;

      historyLoadingByChatRef.current.delete(chatId);
      historyHasMoreByChatRef.current.set(chatId, true);
      historyBeforeByChatRef.current.delete(chatId);
      setHistoryCursorFromBatch(chatId, messagesWithContent, INITIAL_HISTORY_PAGE_LIMIT);
      if (exhaustedHistory) {
        historyHasMoreByChatRef.current.set(chatId, false);
      }

      setMessageStore((prev) =>
        mergeHistoryWithPendingInStore(prev, messagesWithContent, user?.id)
      );

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
      historyLoadingByChatRef.current.delete(chatId);
    }
  };

  const loadMessagesAfter = async (
    chatId: number,
    afterMessageId: number,
    limit = 100,
    topicId?: number
  ) => {
    if (chatId <= 0 || !Number.isFinite(afterMessageId) || afterMessageId <= 0) {
      return;
    }
    const effectiveTopicId = normalizeTopicId(topicId) ?? getActiveTopicId(chatId);

    try {
      let cursor = afterMessageId;
      let rounds = 0;
      const maxRounds = 20;
      const mergedBatch: ChatMessage[] = [];

      while (rounds < maxRounds) {
        const { data } = await http.get<ChatMessagesResponse>(
          endpoints.chatMessages(chatId, undefined, limit, cursor, effectiveTopicId)
        );
        const incomingMessages = normalizeHistoryBatch(chatId, data.messages || []);
        if (incomingMessages.length === 0) {
          break;
        }

        mergedBatch.push(...incomingMessages);

        const nextCursor = incomingMessages.reduce((maxMessageId, message) => {
          if (typeof message.messageId !== 'number') {
            return maxMessageId;
          }
          return Math.max(maxMessageId, message.messageId);
        }, cursor);

        if (nextCursor <= cursor || incomingMessages.length < limit) {
          break;
        }

        cursor = nextCursor;
        rounds += 1;
      }

      if (mergedBatch.length === 0) {
        return;
      }

      setHistoryCursorFromBatch(chatId, mergedBatch, limit);
      setMessageStore((prev) => mergeHistoryWithPendingInStore(prev, mergedBatch, user?.id));
    } catch (err) {
      logger.warn('Failed to load missed messages after reconnect', {
        chatId,
        afterMessageId,
        limit,
        err,
      });
    }
  };

  const loadOlderMessages = async (
    chatId: number,
    limit = INITIAL_HISTORY_PAGE_LIMIT,
    topicId?: number
  ) => {
    if (chatId <= 0) {
      return;
    }
    const effectiveTopicId = normalizeTopicId(topicId) ?? getActiveTopicId(chatId);

    const loadingSet = historyLoadingByChatRef.current;
    if (loadingSet.has(chatId)) {
      return;
    }

    const hasMore = historyHasMoreByChatRef.current.get(chatId);
    if (hasMore === false) {
      return;
    }

    let beforeMessageId = historyBeforeByChatRef.current.get(chatId) ?? 0;
    if (beforeMessageId <= 0) {
      beforeMessageId = getOldestServerMessageIdForChat(chatId);
      if (beforeMessageId > 0) {
        historyBeforeByChatRef.current.set(chatId, beforeMessageId);
      }
    }
    if (!Number.isFinite(beforeMessageId) || beforeMessageId <= 0) {
      historyHasMoreByChatRef.current.set(chatId, false);
      return;
    }

    loadingSet.add(chatId);
    try {
      const { data } = await http.get<ChatMessagesResponse>(
        endpoints.chatMessages(chatId, beforeMessageId, limit, undefined, effectiveTopicId)
      );
      const batch = normalizeHistoryBatch(chatId, data.messages || []);

      if (batch.length === 0) {
        historyHasMoreByChatRef.current.set(chatId, false);
        return;
      }

      setMessageStore((prev) => mergeHistoryWithPendingInStore(prev, batch, user?.id));
      const previousOldest = beforeMessageId;
      setHistoryCursorFromBatch(chatId, batch, limit);
      const nextOldest = historyBeforeByChatRef.current.get(chatId) ?? previousOldest;
      if (nextOldest >= previousOldest) {
        historyHasMoreByChatRef.current.set(chatId, false);
      }
    } catch (err) {
      logger.warn('Failed to load older messages', { chatId, beforeMessageId, limit, err });
    } finally {
      loadingSet.delete(chatId);
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

  const updateGroupChat = async (
    chatId: number,
    payload: {
      title?: string;
      avatarPath?: string;
    }
  ) => {
    if (!Number.isFinite(chatId) || chatId <= 0) {
      throw new Error('chatId is required');
    }

    const requestPayload: {
      title?: string;
      avatarPath?: string;
    } = {};
    if (typeof payload.title === 'string') {
      requestPayload.title = payload.title;
    }
    if (typeof payload.avatarPath === 'string') {
      requestPayload.avatarPath = payload.avatarPath;
    }
    if (!('title' in requestPayload) && !('avatarPath' in requestPayload)) {
      throw new Error('Nothing to update');
    }

    await http.patch(endpoints.chatUpdateGroup(chatId), requestPayload);
    await loadChats();
    if (selectedChat === chatId) {
      await loadMessages(chatId, false);
    }
  };

  const addGroupMembers = async (chatId: number, participantIds: string[]) => {
    if (!Number.isFinite(chatId) || chatId <= 0) {
      throw new Error('chatId is required');
    }
    const uniqueParticipantIds = Array.from(
      new Set((participantIds || []).filter((id) => !!id && id.trim().length > 0))
    );
    if (uniqueParticipantIds.length === 0) {
      return;
    }

    await http.post(endpoints.chatAddMembers(chatId), {
      participantIds: uniqueParticipantIds,
    });
    await loadChats();
    if (selectedChat === chatId) {
      await loadMessages(chatId, false);
    }
  };

  const removeGroupMembers = async (chatId: number, participantIds: string[]) => {
    if (!Number.isFinite(chatId) || chatId <= 0) {
      throw new Error('chatId is required');
    }
    const uniqueParticipantIds = Array.from(
      new Set((participantIds || []).filter((id) => !!id && id.trim().length > 0))
    );
    if (uniqueParticipantIds.length === 0) {
      return;
    }

    await http.delete(endpoints.chatRemoveMembers(chatId), {
      data: {
        participantIds: uniqueParticipantIds,
      },
    });
    await loadChats();
    if (selectedChat === chatId) {
      await loadMessages(chatId, false);
    }
  };

  const leaveGroupChat = async (chatId: number) => {
    if (!Number.isFinite(chatId) || chatId <= 0) {
      throw new Error('chatId is required');
    }

    await http.post(endpoints.chatLeave(chatId));
    if (selectedChat === chatId) {
      setSelectedChat(null);
    }
    await loadChats();
  };

  const updateGroupMemberRole = async (
    chatId: number,
    userId: string,
    role: 'OWNER' | 'ADMIN' | 'MEMBER'
  ) => {
    if (!Number.isFinite(chatId) || chatId <= 0) {
      throw new Error('chatId is required');
    }
    if (!userId || userId.trim().length === 0) {
      throw new Error('userId is required');
    }

    await http.patch(endpoints.chatMemberRole(chatId, userId), {
      role,
    });
    await loadChats();
    if (selectedChat === chatId) {
      await loadMessages(chatId, false);
    }
  };

  const ensureValidChatId = (chatId: number) => {
    if (!Number.isFinite(chatId) || chatId <= 0) {
      throw new Error('chatId is required');
    }
  };

  const getGroupSettings = async (chatId: number) => {
    ensureValidChatId(chatId);
    const { data } = await http.get<ChatGroupSettings>(endpoints.chatGroupSettings(chatId));
    return data;
  };

  const updateGroupSettings = async (
    chatId: number,
    payload: {
      description?: string;
      isPublic?: boolean;
      publicUsername?: string;
      historyVisibleToNewMembers?: boolean;
      slowModeSeconds?: number;
      topicsEnabled?: boolean;
      reactionsEnabled?: boolean;
      reactionMode?: 'ALL' | 'SOME' | 'NONE';
      allowedReactions?: string[];
      pollsEnabled?: boolean;
    }
  ) => {
    ensureValidChatId(chatId);
    const { data } = await http.patch<ChatGroupSettings>(endpoints.chatGroupSettings(chatId), payload);
    await loadChats();
    if (selectedChat === chatId) {
      await loadMessages(chatId, false);
    }
    return data;
  };

  const getGroupPermissions = async (chatId: number) => {
    ensureValidChatId(chatId);
    const { data } = await http.get<ChatGroupPermissions>(endpoints.chatGroupPermissions(chatId));
    return data;
  };

  const updateGroupPermissions = async (
    chatId: number,
    payload: {
      canSendMessages?: boolean;
      canSendMedia?: boolean;
      canSendPolls?: boolean;
      canAddWebPagePreviews?: boolean;
      canChangeInfo?: boolean;
      canInviteUsers?: boolean;
      canPinMessages?: boolean;
    }
  ) => {
    ensureValidChatId(chatId);
    const { data } = await http.patch<ChatGroupPermissions>(
      endpoints.chatGroupPermissions(chatId),
      payload
    );
    return data;
  };

  const getInviteLinks = async (chatId: number) => {
    ensureValidChatId(chatId);
    const { data } = await http.get<ChatInviteLinksResponse>(endpoints.chatInvites(chatId));
    return data;
  };

  const createInviteLink = async (
    chatId: number,
    payload: {
      name?: string;
      createsJoinRequest?: boolean;
      expiresAt?: string;
      usageLimit?: number;
    }
  ) => {
    ensureValidChatId(chatId);
    const { data } = await http.post<ChatInviteLink>(endpoints.chatInvites(chatId), payload);
    return data;
  };

  const updateInviteLink = async (
    chatId: number,
    inviteId: number,
    payload: {
      name?: string;
      createsJoinRequest?: boolean;
      expiresAt?: string;
      clearExpiresAt?: boolean;
      usageLimit?: number;
      clearUsageLimit?: boolean;
    }
  ) => {
    ensureValidChatId(chatId);
    if (!Number.isFinite(inviteId) || inviteId <= 0) {
      throw new Error('inviteId is required');
    }
    const { data } = await http.patch<ChatInviteLink>(
      endpoints.chatInviteUpdate(chatId, inviteId),
      payload
    );
    return data;
  };

  const revokeInviteLink = async (chatId: number, inviteId: number) => {
    ensureValidChatId(chatId);
    if (!Number.isFinite(inviteId) || inviteId <= 0) {
      throw new Error('inviteId is required');
    }
    await http.post(endpoints.chatInviteRevoke(chatId, inviteId));
  };

  const joinByInviteCode = async (inviteCode: string) => {
    const normalized = inviteCode.trim();
    if (!normalized) {
      throw new Error('inviteCode is required');
    }
    await http.post(endpoints.chatJoinByInvite(normalized));
    await loadChats();
  };

  const getJoinRequests = async (
    chatId: number,
    status?: 'PENDING' | 'APPROVED' | 'DECLINED',
    before?: number,
    limit = 100
  ) => {
    ensureValidChatId(chatId);
    const { data } = await http.get<ChatJoinRequestsResponse>(
      endpoints.chatJoinRequests(chatId, status, before, limit)
    );
    return data;
  };

  const approveJoinRequest = async (chatId: number, requestId: number) => {
    ensureValidChatId(chatId);
    if (!Number.isFinite(requestId) || requestId <= 0) {
      throw new Error('requestId is required');
    }
    await http.post(endpoints.chatJoinRequestApprove(chatId, requestId));
    await loadChats();
    if (selectedChat === chatId) {
      await loadMessages(chatId, false);
    }
  };

  const declineJoinRequest = async (chatId: number, requestId: number) => {
    ensureValidChatId(chatId);
    if (!Number.isFinite(requestId) || requestId <= 0) {
      throw new Error('requestId is required');
    }
    await http.post(endpoints.chatJoinRequestDecline(chatId, requestId));
  };

  const getMemberRestrictions = async (chatId: number, userId: string) => {
    ensureValidChatId(chatId);
    if (!userId || userId.trim().length === 0) {
      throw new Error('userId is required');
    }
    const { data } = await http.get<ChatMemberRestrictions>(
      endpoints.chatMemberRestrictions(chatId, userId)
    );
    return data;
  };

  const updateMemberRestrictions = async (
    chatId: number,
    userId: string,
    payload: {
      mutedUntil?: string | null;
      bannedUntil?: string | null;
      clearMutedUntil?: boolean;
      clearBannedUntil?: boolean;
      canSendMessages?: boolean;
      canSendMedia?: boolean;
      canSendPhotos?: boolean;
      canSendVideos?: boolean;
      canSendStickersAndGifs?: boolean;
      canSendMusic?: boolean;
      canSendFiles?: boolean;
      canSendVoiceMessages?: boolean;
      canSendVideoMessages?: boolean;
      canEmbedLinks?: boolean;
      canSendPolls?: boolean;
      canInviteUsers?: boolean;
      canPinMessages?: boolean;
      canChangeInfo?: boolean;
      reason?: string;
    }
  ) => {
    ensureValidChatId(chatId);
    if (!userId || userId.trim().length === 0) {
      throw new Error('userId is required');
    }
    const { data } = await http.patch<ChatMemberRestrictions>(
      endpoints.chatMemberRestrictions(chatId, userId),
      payload
    );
    await loadChats();
    if (selectedChat === chatId) {
      await loadMessages(chatId, false);
    }
    return data;
  };

  const getAdminRights = async (chatId: number, userId: string) => {
    ensureValidChatId(chatId);
    if (!userId || userId.trim().length === 0) {
      throw new Error('userId is required');
    }
    const { data } = await http.get<ChatAdminRights>(endpoints.chatMemberAdminRights(chatId, userId));
    return data;
  };

  const updateAdminRights = async (
    chatId: number,
    userId: string,
    payload: {
      canManageGroup?: boolean;
      canManageMembers?: boolean;
      canManageInviteLinks?: boolean;
      canPinMessages?: boolean;
      canDeleteMessages?: boolean;
      canBanUsers?: boolean;
      canManageTopics?: boolean;
      canManageReactions?: boolean;
      canManagePolls?: boolean;
      isAnonymous?: boolean;
      customTitle?: string | null;
    }
  ) => {
    ensureValidChatId(chatId);
    if (!userId || userId.trim().length === 0) {
      throw new Error('userId is required');
    }
    const { data } = await http.patch<ChatAdminRights>(
      endpoints.chatMemberAdminRights(chatId, userId),
      payload
    );
    await loadChats();
    if (selectedChat === chatId) {
      await loadMessages(chatId, false);
    }
    return data;
  };

  const getTopics = async (chatId: number, includeDeleted?: boolean) => {
    ensureValidChatId(chatId);
    const { data } = await http.get<ChatTopicsResponse>(endpoints.chatTopics(chatId, includeDeleted));
    return data;
  };

  const createTopic = async (
    chatId: number,
    payload: {
      title: string;
      iconEmoji?: string;
    }
  ) => {
    ensureValidChatId(chatId);
    const { data } = await http.post<ChatTopic>(endpoints.chatTopics(chatId), payload);
    await loadChats();
    if (selectedChat === chatId) {
      await loadMessages(chatId, false);
    }
    return data;
  };

  const updateTopic = async (
    chatId: number,
    topicId: number,
    payload: {
      title?: string;
      iconEmoji?: string;
      closed?: boolean;
      pinned?: boolean;
      deleted?: boolean;
    }
  ) => {
    ensureValidChatId(chatId);
    if (!Number.isFinite(topicId) || topicId <= 0) {
      throw new Error('topicId is required');
    }
    const { data } = await http.patch<ChatTopic>(endpoints.chatTopicUpdate(chatId, topicId), payload);
    await loadChats();
    if (selectedChat === chatId) {
      await loadMessages(chatId, false);
    }
    return data;
  };

  const getMessageReactions = async (chatId: number, messageId: number) => {
    ensureValidChatId(chatId);
    if (!Number.isFinite(messageId) || messageId <= 0) {
      throw new Error('messageId is required');
    }
    const { data } = await http.get<ChatMessageReactionsResponse>(
      endpoints.chatMessageReactions(chatId, messageId)
    );
    return data;
  };

  const toggleMessageReaction = async (chatId: number, messageId: number, emoji: string) => {
    ensureValidChatId(chatId);
    if (!Number.isFinite(messageId) || messageId <= 0) {
      throw new Error('messageId is required');
    }
    const normalizedEmoji = emoji.trim();
    if (!normalizedEmoji) {
      throw new Error('emoji is required');
    }
    const { data } = await http.post<ChatMessageReactionsResponse>(
      endpoints.chatToggleReaction(chatId, messageId),
      { emoji: normalizedEmoji }
    );
    return data;
  };

  const createPoll = async (
    chatId: number,
    payload: {
      question: string;
      allowsMultiple?: boolean;
      quiz?: boolean;
      correctOptionIndex?: number;
      explanation?: string;
      anonymousVotes?: boolean;
      topicId?: number;
      options: string[];
    }
  ) => {
    ensureValidChatId(chatId);
    const { data } = await http.post<ChatPoll>(endpoints.chatCreatePoll(chatId), payload);
    await loadChats();
    if (selectedChat === chatId) {
      await loadMessages(chatId, false);
    }
    return data;
  };

  const getPoll = async (chatId: number, pollId: number) => {
    ensureValidChatId(chatId);
    if (!Number.isFinite(pollId) || pollId <= 0) {
      throw new Error('pollId is required');
    }
    const { data } = await http.get<ChatPoll>(endpoints.chatPoll(chatId, pollId));
    return data;
  };

  const getPollByMessageId = async (chatId: number, messageId: number) => {
    ensureValidChatId(chatId);
    if (!Number.isFinite(messageId) || messageId <= 0) {
      throw new Error('messageId is required');
    }
    const { data } = await http.get<ChatPoll>(endpoints.chatPollByMessage(chatId, messageId));
    return data;
  };

  const getPollVoters = async (chatId: number, pollId: number) => {
    ensureValidChatId(chatId);
    if (!Number.isFinite(pollId) || pollId <= 0) {
      throw new Error('pollId is required');
    }
    const { data } = await http.get<ChatPollVotersResponse>(endpoints.chatPollVoters(chatId, pollId));
    return data;
  };

  const votePoll = async (chatId: number, pollId: number, optionIndexes: number[]) => {
    ensureValidChatId(chatId);
    if (!Number.isFinite(pollId) || pollId <= 0) {
      throw new Error('pollId is required');
    }
    const { data } = await http.post<ChatPoll>(endpoints.chatPollVote(chatId, pollId), {
      optionIndexes,
    });
    return data;
  };

  const closePoll = async (chatId: number, pollId: number) => {
    ensureValidChatId(chatId);
    if (!Number.isFinite(pollId) || pollId <= 0) {
      throw new Error('pollId is required');
    }
    await http.post(endpoints.chatPollClose(chatId, pollId));
    await loadChats();
    if (selectedChat === chatId) {
      await loadMessages(chatId, false);
    }
  };

  const pinGroupMessage = async (chatId: number, messageId: number) => {
    ensureValidChatId(chatId);
    if (!Number.isFinite(messageId) || messageId <= 0) {
      throw new Error('messageId is required');
    }
    await http.post(endpoints.chatPinMessage(chatId, messageId));
    await loadChats();
    if (selectedChat === chatId) {
      await loadMessages(chatId, false);
    }
  };

  const unpinGroupMessage = async (chatId: number) => {
    ensureValidChatId(chatId);
    await http.post(endpoints.chatUnpinMessage(chatId));
    await loadChats();
    if (selectedChat === chatId) {
      await loadMessages(chatId, false);
    }
  };

  const getGroupMedia = async (chatId: number, before?: number, limit = 30) => {
    ensureValidChatId(chatId);
    const { data } = await http.get<ChatGroupMediaItemsResponse>(endpoints.chatMedia(chatId, before, limit));
    return data;
  };

  const getGroupFiles = async (chatId: number, before?: number, limit = 30) => {
    ensureValidChatId(chatId);
    const { data } = await http.get<ChatGroupMediaItemsResponse>(endpoints.chatFiles(chatId, before, limit));
    return data;
  };

  const getGroupAdminLog = async (
    chatId: number,
    before?: number,
    limit = 40,
    filters?: {
      actorUserId?: string;
      targetUserId?: string;
      eventType?: string;
    }
  ) => {
    ensureValidChatId(chatId);
    const { data } = await http.get<ChatAdminLogResponse>(
      endpoints.chatAdminLog(chatId, before, limit, filters)
    );
    return data;
  };

  const sendTextMessageToChat = async (
    chatId: number,
    message: string,
    overrideReplyToId?: number,
    options?: { useCurrentReplyTarget?: boolean; topicId?: number }
  ) => {
    const useCurrentReplyTarget = options?.useCurrentReplyTarget ?? true;
    const localId = `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const clientMessageId = nextClientMessageId();
    const createdAt = new Date().toISOString();
    const parsed = buildMessageTextAndEntities(message);
    const normalizedContent = parsed.content;
    const normalizedEntities = parsed.entities.length > 0 ? parsed.entities : undefined;
    const replyToMessageId =
      overrideReplyToId ??
      (useCurrentReplyTarget && typeof replyingTo?.messageId === 'number'
        ? replyingTo.messageId
        : undefined);
    const resolvedTopicId =
      normalizeTopicId(options?.topicId) ??
      (useCurrentReplyTarget
        ? normalizeTopicId(replyingTo?.topicId as number | undefined)
        : undefined) ??
      getActiveTopicId(chatId);

    try {
      const tempMessage: ChatMessage = {
        chatId,
        localId,
        messageId: localId,
        clientMessageId,
        status: 'pending',
        senderId: user?.id || '',
        content: normalizedContent,
        entities: normalizedEntities,
        messageType: 'text',
        createdAt,
        topicId: resolvedTopicId,
        replyToId: replyToMessageId,
        replyToMessage: useCurrentReplyTarget ? replyingTo || undefined : undefined,
      };

      setMessageStore((prev) => upsertMessageInStore(prev, tempMessage, user?.id));
      setTimeout(() => scrollToBottom(), 0);

      const { acknowledgedMessage } = await sendPreparedMessage({
        chatId,
        topicId: resolvedTopicId,
        messageType: 'text',
        content: normalizedContent,
        entities: normalizedEntities,
        replyToMessageId,
        clientMessageId,
        attachments: [],
        tempMessage,
      });

      setMessageStore((prev) =>
        upsertMessageInStore(
          prev,
          {
            ...acknowledgedMessage,
            localId,
          },
          user?.id
        )
      );

      if (useCurrentReplyTarget) {
        setReplyingTo(null);
      }
    } catch (e) {
      console.error('Failed to send message', e);
      setMessageStore((prev) =>
        upsertMessageInStore(
          prev,
          {
            chatId,
            messageId: localId,
            localId,
            clientMessageId,
            status: 'failed',
            senderId: user?.id || '',
            content: normalizedContent,
            entities: normalizedEntities,
            messageType: 'text',
            createdAt,
            topicId: resolvedTopicId,
          },
          user?.id
        )
      );
      alert(e instanceof Error ? e.message : 'РћС€РёР±РєР° РѕС‚РїСЂР°РІРєРё СЃРѕРѕР±С‰РµРЅРёСЏ');
    }
  };

  const toSyntheticAttachmentFromPreuploaded = (params: {
    imagePath: string;
    messageType: 'text' | 'image' | 'images' | 'file' | 'files' | 'voice' | 'circle';
    imageEncrypted?: boolean;
    imageEncryptionIv?: string;
    imageKeyVersion?: number;
  }): AttachedImage => {
    const normalizedType: ChatMessage['messageType'] =
      params.messageType === 'images'
        ? 'image'
        : params.messageType === 'files'
          ? 'file'
          : params.messageType;
    const normalizedContentType =
      normalizedType === 'voice'
        ? 'audio/ogg'
        : normalizedType === 'circle'
          ? 'video/mp4'
          : normalizedType === 'file'
            ? 'application/octet-stream'
            : 'image/jpeg';
    const inferredFileName = params.imagePath.split('/').pop() || `attachment-${Date.now()}`;

    const uploadedData: UploadImageResponse = {
      success: true,
      imagePath: params.imagePath,
      imageUrl: `/media/${params.imagePath}`,
      fileName: inferredFileName,
      contentType: normalizedContentType,
      sizeBytes: 0,
      isImage: normalizedType === 'image',
      imageEncrypted: typeof params.imageEncrypted === 'boolean' ? params.imageEncrypted : true,
      imageEncryptionIv: params.imageEncryptionIv,
      imageKeyVersion: params.imageKeyVersion,
    };

    return {
      id: `preuploaded-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      file: new File([], inferredFileName, { type: normalizedContentType }),
      isImage: normalizedType === 'image',
      sendAsFile: normalizedType === 'file',
      groupWithOthers: false,
      forcedMessageType:
        normalizedType === 'voice' || normalizedType === 'circle' ? normalizedType : undefined,
      contentType: normalizedContentType,
      sizeBytes: 0,
      uploadedData,
      uploading: false,
    };
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

    await enqueueByChat(chat.chatId, async () => {
      if (messageType === 'text' && !imagePath) {
        await sendMessagesWithImages(chat!.chatId, message, {
          attachments: [],
          clearComposerDraft: false,
          resetReplyTo: false,
        });
        return;
      }

      if (!imagePath) {
        throw new Error('imagePath is required for media messages');
      }

      await sendMessagesWithImages(chat!.chatId, message, {
        attachments: [
          toSyntheticAttachmentFromPreuploaded({
            imagePath,
            messageType,
            imageEncrypted,
            imageEncryptionIv,
            imageKeyVersion,
          }),
        ],
        clearComposerDraft: false,
        resetReplyTo: false,
      });
    });
  };

  const cancelPendingMediaUpload = (localId: string, attachmentIndex: number) => {
    const key = toUploadStateKey(localId, attachmentIndex);
    const cancel = pendingUploadCancelsRef.current.get(key);
    if (cancel) {
      cancel();
    }
  };

  const sendChatMessage = async (topicIdOverride?: number) => {
    console.log('sendChatMessage called', { selectedChat, messageInput, attachedImagesCount: attachedImages.length });
    const draftText = messageInput;
    const attachmentsToSend = attachedImages.slice(0, MAX_ATTACHMENTS);

    if (!draftText.trim() && attachmentsToSend.length === 0) {
      console.warn('Cannot send: empty message and no attachments');
      return;
    }

    if (selectedChat) {
      setAutoScrollLocked(false);
    }

    try {
      if (editingMessage) {
        await editMessage(editingMessage.messageId, draftText);
        setMessageInput('');
        setEditingMessage(null);
        setAttachedImages([]);
      } else if (selectedChat) {
        const targetChatId = selectedChat;
        const activeTopicId = normalizeTopicId(topicIdOverride) ?? getActiveTopicId(targetChatId);
        await enqueueByChat(targetChatId, async () => {
          const replyToMessageId =
            typeof replyingTo?.messageId === 'number' ? replyingTo.messageId : undefined;

          if (attachmentsToSend.length > 0) {
            if (shouldSendAttachmentsSeparately(attachmentsToSend)) {
              for (let index = 0; index < attachmentsToSend.length; index += 1) {
                await sendMessagesWithImages(targetChatId, index === 0 ? draftText : '', {
                  attachments: [attachmentsToSend[index]],
                  clearComposerDraft: index === 0,
                  replyToMessageId: index === 0 ? replyToMessageId : undefined,
                  resetReplyTo: index === 0,
                  topicId: activeTopicId,
                });
              }
            } else if (shouldSendAsGroupedAlbum(attachmentsToSend)) {
              const groupingKey = `album-${Date.now()}-${Math.random().toString(16).slice(2)}`;
              for (let index = 0; index < attachmentsToSend.length; index += 1) {
                await sendMessagesWithImages(targetChatId, index === 0 ? draftText : '', {
                  attachments: [attachmentsToSend[index]],
                  clearComposerDraft: false,
                  replyToMessageId: index === 0 ? replyToMessageId : undefined,
                  resetReplyTo: false,
                  groupingKeyOverride: groupingKey,
                  topicId: activeTopicId,
                });
              }
              setAttachedImages([]);
              setMessageInput('');
              setReplyingTo(null);
            } else {
              await sendMessagesWithImages(targetChatId, draftText, {
                attachments: attachmentsToSend,
                clearComposerDraft: true,
                replyToMessageId,
                resetReplyTo: true,
                topicId: activeTopicId,
              });
            }
          } else {
            const textChunks = splitTextForSend(draftText);
            for (let chunkIndex = 0; chunkIndex < textChunks.length; chunkIndex += 1) {
              await sendMessagesWithImages(targetChatId, textChunks[chunkIndex], {
                attachments: [],
                clearComposerDraft: false,
                replyToMessageId: chunkIndex === 0 ? replyToMessageId : undefined,
                resetReplyTo: chunkIndex === 0,
                topicId: activeTopicId,
              });
            }
          }
        });

        setMessageInput('');
        setAttachedImages([]);
        setTimeout(() => scrollToBottom(), 100);
      }
    } finally {
      if (selectedChat) {
        await sendTypingState(selectedChat, false, true);
      }
    }
  };

  // рџ–јпёЏ РћС‚РїСЂР°РІРєР° СЃРѕРѕР±С‰РµРЅРёР№ СЃ РїСЂРёРєСЂРµРїР»РµРЅРЅС‹РјРё РёР·РѕР±СЂР°Р¶РµРЅРёСЏРјРё
  const retryFailedMessage = async (messageId: number | string) => {
    const failedMessage = (() => {
      for (let i = messageStore.orderedIds.length - 1; i >= 0; i -= 1) {
        const key = messageStore.orderedIds[i];
        const message = messageStore.byId[key];
        if (!message) continue;
        if (message.messageId === messageId || message.localId === messageId) {
          return message;
        }
      }
      return undefined;
    })();
    if (!failedMessage) return;
    if (failedMessage.status !== 'failed') return;
    if (failedMessage.senderId !== (user?.id || '')) return;

    const chatId = failedMessage.chatId ?? selectedChat;
    if (!chatId) return;

    const messageType = failedMessage.messageType;
    const sendableMessageTypes = new Set([
      'text',
      'image',
      'images',
      'file',
      'files',
      'voice',
      'circle',
    ]);
    if (!sendableMessageTypes.has(messageType)) {
      return;
    }

    await enqueueByChat(chatId, async () => {
      const clientMessageId = failedMessage.clientMessageId ?? nextClientMessageId();
      const isVoiceOrCircle = messageType === 'voice' || messageType === 'circle';
      const parsed = buildMessageTextAndEntities(failedMessage.content || '');
      const normalizedContent = isVoiceOrCircle ? '' : failedMessage.content || parsed.content;
      const normalizedEntities =
        !isVoiceOrCircle
          ? failedMessage.entities && failedMessage.entities.length > 0
            ? failedMessage.entities
            : parsed.entities.length > 0
              ? parsed.entities
              : undefined
          : undefined;
      const replyToMessageId =
        typeof failedMessage.replyToId === 'number' ? failedMessage.replyToId : undefined;
      const uploadedAttachments = toRetryableUploadedAttachments(failedMessage);

      if (messageType !== 'text' && uploadedAttachments.length === 0) {
        alert('Cannot retry media message without uploaded media path. Reattach and send again.');
        return;
      }

      setMessageStore((prev) =>
        upsertMessageInStore(
          prev,
          {
            messageId: failedMessage.messageId,
            localId: failedMessage.localId,
            chatId,
            clientMessageId,
            status: 'pending',
            content: normalizedContent,
            entities: normalizedEntities,
            messageType,
          },
          user?.id
        )
      );

      try {
        const sendAttachments = uploadedAttachments.map((attachment) => ({
          imagePath: attachment.imagePath,
          imageEncrypted: attachment.imageEncrypted,
          imageEncryptionIv: attachment.imageEncryptionIv,
          imageKeyVersion: attachment.imageKeyVersion,
          width: attachment.width,
          height: attachment.height,
          fileName: attachment.fileName,
          contentType: attachment.contentType,
          sizeBytes: attachment.sizeBytes,
          isImage: attachment.isImage,
          imageUrl: attachment.imageUrl,
          thumbnailUrl: attachment.thumbnailUrl,
          strippedThumbnailUrl: attachment.strippedThumbnailUrl,
        }));
        const retryTempMessage: ChatMessage = {
          ...failedMessage,
          chatId,
          localId: failedMessage.localId,
          clientMessageId,
          content: normalizedContent,
          entities: normalizedEntities,
          messageType: messageType as ChatMessage['messageType'],
        };
        const { acknowledgedMessage } = await sendPreparedMessage({
          chatId,
          topicId: normalizeTopicId(
            typeof failedMessage.topicId === 'number' ? failedMessage.topicId : undefined
          ),
          messageType: messageType as ChatMessage['messageType'],
          content: normalizedContent,
          entities: normalizedEntities,
          replyToMessageId,
          clientMessageId,
          groupingKey: failedMessage.groupingKey,
          attachments: sendAttachments,
          tempMessage: retryTempMessage,
        });

        setMessageStore((prev) =>
          upsertMessageInStore(
            prev,
            {
              ...acknowledgedMessage,
              localId: failedMessage.localId,
            },
            user?.id
          )
        );
        if (typeof failedMessage.localId === 'string') {
          clearPendingMediaPreviewUrlsByLocalId(failedMessage.localId);
        }
      } catch (error) {
        const err = error as any;
        logger.error('[chat.send.retry] failed', {
          chatId,
          messageId: failedMessage.messageId,
          clientMessageId,
          messageType,
          responseStatus: err?.response?.status,
          responseData: err?.response?.data,
          errorMessage: err?.message,
        });

        setMessageStore((prev) =>
          upsertMessageInStore(
            prev,
            {
              messageId: failedMessage.messageId,
              localId: failedMessage.localId,
              chatId,
              clientMessageId,
              status: 'failed',
              content: normalizedContent,
              entities: normalizedEntities,
              messageType,
            },
            user?.id
          )
        );
        alert(error instanceof Error ? error.message : 'Failed to retry message');
      }
    });
  };
  const sendMessagesWithImages = async (
    chatId: number,
    textContent: string,
    options?: {
      attachments?: AttachedImage[];
      clearComposerDraft?: boolean;
      replyToMessageId?: number;
      resetReplyTo?: boolean;
      groupingKeyOverride?: string;
      topicId?: number;
    }
  ) => {
    const attachmentsToSend = (options?.attachments ?? attachedImages).slice(0, MAX_ATTACHMENTS);
    if (attachmentsToSend.length === 0) {
      await sendTextMessageToChat(chatId, textContent, options?.replyToMessageId, {
        topicId: options?.topicId,
      });
      if (options?.clearComposerDraft ?? true) {
        setAttachedImages([]);
        setMessageInput('');
      }
      if (options?.resetReplyTo ?? true) {
        setReplyingTo(null);
      }
      return;
    }

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
    const groupingKey =
      options?.groupingKeyOverride ||
      (attachmentsToSend.length > 1
        ? `album-${Date.now()}-${Math.random().toString(16).slice(2)}`
        : undefined);
    const resolvedTopicId = normalizeTopicId(options?.topicId) ?? getActiveTopicId(chatId);
    const clientMessageId = nextClientMessageId();
    const createdAt = new Date().toISOString();
    const tempMessage: ChatMessage = {
      chatId,
      localId,
      messageId: localId,
      clientMessageId,
      status: 'pending',
      senderId: user?.id || '',
      content: normalizedContent,
      entities: normalizedEntities,
      messageType: tempMessageType,
      images: attachmentsToSend.map((fileRef) => {
        const seededAttachment = fileRef.uploadedData
          ? normalizeAttachmentPayload(fileRef.uploadedData as unknown as LooseAttachmentPayload)
          : null;
        const resolvedContentType = normalizeMediaContentType(
          fileRef.contentType || fileRef.file.type || seededAttachment?.contentType
        );
        return {
          imagePath: seededAttachment?.imagePath || '',
          imageUrl: seededAttachment?.imageUrl,
          thumbnailUrl: seededAttachment?.thumbnailUrl,
          strippedThumbnailUrl: seededAttachment?.strippedThumbnailUrl,
          width: seededAttachment?.width ?? fileRef.width,
          height: seededAttachment?.height ?? fileRef.height,
          fileName:
            seededAttachment?.fileName ||
            fileRef.file.name,
          contentType: resolvedContentType,
          sizeBytes:
            seededAttachment?.sizeBytes ??
            fileRef.sizeBytes ??
            fileRef.file.size,
          isImage: resolveIsImageFlag(
            resolvedContentType,
            seededAttachment?.isImage ?? isImageAttachment(fileRef)
          ),
          imageKeyVersion: seededAttachment?.imageKeyVersion,
          imageEncryptionIv: seededAttachment?.imageEncryptionIv,
        };
      }),
      createdAt,
      groupingKey,
      topicId: resolvedTopicId,
      replyToId: options?.replyToMessageId,
    };

    type UploadedAttachmentPayload = {
      imagePath: string;
      imageUrl?: string;
      thumbnailUrl?: string;
      strippedThumbnailUrl?: string;
      width?: number;
      height?: number;
      imageEncrypted?: boolean;
      imageEncryptionIv?: string;
      imageKeyVersion?: number;
      fileName: string;
      contentType: string;
      sizeBytes: number;
      isImage: boolean;
    };

    const canceledIndices = new Set<number>();
    const uploadedByIndex = new Map<number, UploadedAttachmentPayload>();
    const controllersByIndex = new Map<number, AbortController>();

    const hasActiveAttachments = () =>
      attachmentsToSend.some((_, attachmentIndex) => !canceledIndices.has(attachmentIndex));

    const hydrateAttachmentLocalPreview = (attachmentIndex: number) => {
      const attachment = attachmentsToSend[attachmentIndex];
      if (!attachment || attachment.uploadedData) {
        return;
      }
      const isCircleAttachmentForPreview = attachment.forcedMessageType === 'circle';
      if (!isVisualMediaAttachment(attachment) && !isCircleAttachmentForPreview) {
        return;
      }

      const hasEnoughLocalMeta =
        typeof attachment.width === 'number' &&
        attachment.width > 0 &&
        typeof attachment.height === 'number' &&
        attachment.height > 0;
      if (hasEnoughLocalMeta) {
        return;
      }

      const forceMediaType =
        isCircleAttachmentForPreview || isVideoAttachment(attachment)
          ? 'video'
          : 'image';

      void buildLocalMediaPreviewMeta(attachment.file, {
        preferredPreviewUrl: attachment.preview,
        forceMediaType,
      }).then((meta) => {
        if (!meta || canceledIndices.has(attachmentIndex)) {
          return;
        }

        const nextAttachment = {
          ...attachment,
          preview: attachment.preview || meta.previewUrl,
          thumbnailUrl: attachment.thumbnailUrl || meta.thumbnailUrl,
          strippedThumbnailUrl:
            attachment.strippedThumbnailUrl || meta.strippedThumbnailUrl,
          width: attachment.width || meta.width,
          height: attachment.height || meta.height,
          aspectRatio: attachment.aspectRatio || meta.aspectRatio,
        };
        attachmentsToSend[attachmentIndex] = nextAttachment;

        setMessageStore((prev) =>
          patchMessagesInStore(
            prev,
            (message) => message.localId === localId || message.messageId === localId,
            (message) => ({
              images:
                message.images?.map((image, idx) =>
                  idx === attachmentIndex
                    ? {
                        ...image,
                        width: image.width ?? nextAttachment.width ?? meta.width,
                        height: image.height ?? nextAttachment.height ?? meta.height,
                      }
                    : image
                ) || [],
            }),
            user?.id
          )
        );
      });
    };

    const removePendingCancelHandler = (attachmentIndex: number) => {
      pendingUploadCancelsRef.current.delete(toUploadStateKey(localId, attachmentIndex));
    };

    const removeTempMessageIfAllCanceled = () => {
      if (hasActiveAttachments()) return;
      setMessageStore((prev) => removeMessageFromStore(prev, localId, user?.id));
      clearPendingMediaPreviewUrlsByLocalId(localId);
    };

    const clearCanceledImagePreview = (attachmentIndex: number) => {
      setMessageStore((prev) =>
        patchMessagesInStore(
          prev,
          (message) => message.localId === localId || message.messageId === localId,
          (message) => {
            const nextImages = (message.images || []).map((image, idx) =>
              idx === attachmentIndex
                ? {
                    ...image,
                    imagePath: '',
                    imageUrl: undefined,
                    thumbnailUrl: undefined,
                    strippedThumbnailUrl: undefined,
                    width: undefined,
                    height: undefined,
                  }
                : image
            );

            return {
              images: nextImages,
            };
          },
          user?.id
        )
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
      clearPendingMediaPreviewUrlByKey(uploadKey);

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
      const seededAttachment = attachment.uploadedData
        ? normalizeAttachmentPayload(attachment.uploadedData as unknown as LooseAttachmentPayload)
        : null;
      if (seededAttachment?.imagePath) {
        continue;
      }
      const uploadKey = toUploadStateKey(localId, attachmentIndex);
      const existingPreviewUrl = pendingMediaPreviewUrls.get(uploadKey);
      const shouldTrackPreview =
        isVisualMediaAttachment(attachment) || attachment.forcedMessageType === 'circle';
      if (!existingPreviewUrl && shouldTrackPreview) {
        upsertPendingMediaPreviewUrl(uploadKey, URL.createObjectURL(attachment.file));
      }

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

    setMessageStore((prev) => upsertMessageInStore(prev, tempMessage, user?.id));
    for (let attachmentIndex = 0; attachmentIndex < attachmentsToSend.length; attachmentIndex += 1) {
      hydrateAttachmentLocalPreview(attachmentIndex);
    }
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
        const seededUpload = attachment.uploadedData;
        const seededAttachment = seededUpload
          ? normalizeAttachmentPayload(seededUpload as unknown as LooseAttachmentPayload)
          : null;
        if (seededAttachment?.imagePath) {
          const resolvedContentType = normalizeMediaContentType(
            attachment.file.type || seededAttachment.contentType
          );
          uploadedByIndex.set(attachmentIndex, {
            imagePath: seededAttachment.imagePath,
            imageUrl:
              seededAttachment.imageUrl ||
              (seededAttachment.imagePath ? `/media/${seededAttachment.imagePath}` : undefined),
            thumbnailUrl: seededAttachment.thumbnailUrl,
            strippedThumbnailUrl: seededAttachment.strippedThumbnailUrl,
            width: seededAttachment.width ?? attachment.width,
            height: seededAttachment.height ?? attachment.height,
            imageEncrypted: seededUpload?.imageEncrypted,
            imageEncryptionIv: seededUpload?.imageEncryptionIv || seededAttachment.imageEncryptionIv,
            imageKeyVersion: seededUpload?.imageKeyVersion || seededAttachment.imageKeyVersion,
            fileName:
              seededAttachment.fileName ||
              attachment.file.name,
            contentType: resolvedContentType,
            sizeBytes:
              seededAttachment.sizeBytes ??
              attachment.file.size,
            isImage: resolveIsImageFlag(
              resolvedContentType,
              seededAttachment.isImage ?? isImageAttachment(attachment)
            ),
          });
          removePendingCancelHandler(attachmentIndex);
          continue;
        }
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
          const resolvedContentType = normalizeMediaContentType(
            attachment.file.type || data.contentType
          );
          const resolvedIsImage = resolveIsImageFlag(
            resolvedContentType,
            data.isImage ?? isImageAttachment(attachment)
          );
          const uploadedAttachment: UploadedAttachmentPayload = {
            imagePath: data.imagePath,
            imageUrl: data.imageUrl,
            thumbnailUrl: normalizedUploadAttachment.thumbnailUrl,
            strippedThumbnailUrl: normalizedUploadAttachment.strippedThumbnailUrl,
            width: normalizedUploadAttachment.width ?? attachment.width,
            height: normalizedUploadAttachment.height ?? attachment.height,
            imageEncrypted: data.imageEncrypted,
            imageEncryptionIv: data.imageEncryptionIv,
            imageKeyVersion: data.imageKeyVersion,
            fileName: data.fileName || attachment.file.name,
            contentType: resolvedContentType,
            sizeBytes: data.sizeBytes ?? attachment.file.size,
            isImage: resolvedIsImage,
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

          setMessageStore((prev) =>
            patchMessagesInStore(
              prev,
              (message) => message.localId === localId || message.messageId === localId,
              (message) => ({
                images:
                  message.images?.map((image, idx) =>
                        idx === attachmentIndex
                          ? {
                              imagePath: data.imagePath,
                              imageUrl:
                                image.imageUrl &&
                                !image.imageUrl.startsWith('blob:') &&
                                !image.imageUrl.startsWith('data:')
                                  ? image.imageUrl
                                  : data.imageUrl,
                              thumbnailUrl:
                                normalizedUploadAttachment.thumbnailUrl ||
                                image.thumbnailUrl,
                          strippedThumbnailUrl:
                            normalizedUploadAttachment.strippedThumbnailUrl ||
                            image.strippedThumbnailUrl,
                          width:
                            normalizedUploadAttachment.width ??
                            image.width ??
                            attachment.width,
                          height:
                            normalizedUploadAttachment.height ??
                            image.height ??
                            attachment.height,
                          fileName: data.fileName || attachment.file.name,
                          contentType: resolvedContentType,
                          sizeBytes: data.sizeBytes ?? attachment.file.size,
                          isImage: resolvedIsImage,
                          imageKeyVersion: data.imageKeyVersion,
                        }
                      : image
                  ) || [],
              }),
              user?.id
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
      const sendAttachments: SendAttachmentPayload[] = uploadedAttachments.map((item) => ({
        imagePath: item.imagePath,
        imageEncrypted: item.imageEncrypted,
        imageEncryptionIv: item.imageEncryptionIv,
        imageKeyVersion: item.imageKeyVersion,
        width: item.width,
        height: item.height,
        fileName: item.fileName,
        contentType: item.contentType,
        sizeBytes: item.sizeBytes,
        isImage: item.isImage,
        imageUrl: item.imageUrl || (item.imagePath ? `/media/${item.imagePath}` : undefined),
        thumbnailUrl: item.thumbnailUrl,
        strippedThumbnailUrl: item.strippedThumbnailUrl,
      }));

      const mediaTempMessage: ChatMessage = {
        ...tempMessage,
        chatId: finalChatId,
        senderId: user?.id || '',
        content: normalizedContent,
        entities: normalizedEntities,
        messageType,
        createdAt,
        groupingKey,
      };
      const { acknowledgedMessage } = await sendPreparedMessage({
        chatId: finalChatId,
        topicId: resolvedTopicId,
        messageType,
        content: normalizedContent,
        entities: normalizedEntities,
        replyToMessageId: options?.replyToMessageId,
        clientMessageId,
        groupingKey,
        attachments: sendAttachments,
        tempMessage: mediaTempMessage,
      });

      setMessageStore((prev) =>
        upsertMessageInStore(
          prev,
          {
            ...acknowledgedMessage,
            localId,
          },
          user?.id
        )
      );

      clearUploadStatesByLocalId(localId);
      clearPendingMediaPreviewUrlsByLocalId(localId);
      effectiveAttachments.forEach((attachment) => {
        const preview = attachment?.preview;
        if (preview && preview.startsWith('blob:')) {
          URL.revokeObjectURL(preview);
        }
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

      setMessageStore((prev) => {
        const hasExistingPending = prev.orderedIds.some((id) => {
          const item = prev.byId[id];
          return !!item && (item.localId === localId || item.messageId === localId);
        });
        if (hasExistingPending) {
          return patchMessagesInStore(
            prev,
            (message) => message.localId === localId || message.messageId === localId,
            () => ({ status: 'failed' }),
            user?.id
          );
        }
        return upsertMessageInStore(
          prev,
          {
            ...tempMessage,
            status: 'failed',
          },
          user?.id
        );
      });
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
      thumbnailUrl?: string;
      strippedThumbnailUrl?: string;
      width?: number;
      height?: number;
      aspectRatio?: number;
      sendAsFile?: boolean;
      groupWithOthers?: boolean;
    }
  ) => {
    if (!selectedChat) return;
    
    const id = `attached-${Date.now()}-${Math.random()}`;
    const fileType = (file.type || '').toLowerCase();
    const forcedMessageType = options?.forcedMessageType;
    const isRawImage = fileType.startsWith('image/');
    const isRawVideo = fileType.startsWith('video/');
    const sendAsFile = !forcedMessageType && !!options?.sendAsFile;
    const isImage = !sendAsFile && isRawImage;
    let preview: string | undefined = options?.preview;
    const shouldGenerateVisualPreview =
      !sendAsFile &&
      (isRawImage || isRawVideo || forcedMessageType === 'circle');
    const generatedPreviewMeta = shouldGenerateVisualPreview
      ? await buildLocalMediaPreviewMeta(file, {
          preferredPreviewUrl: preview,
          forceMediaType:
            forcedMessageType === 'circle' || isRawVideo ? 'video' : 'image',
        })
      : null;

    if (!preview && generatedPreviewMeta?.previewUrl) {
      preview = generatedPreviewMeta.previewUrl;
    }
    if (!preview && isRawImage) {
      preview = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve((event.target?.result as string) || '');
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      });
    }

    const nextAttachment = {
      id,
      file,
      preview,
      thumbnailUrl: options?.thumbnailUrl || generatedPreviewMeta?.thumbnailUrl,
      strippedThumbnailUrl:
        options?.strippedThumbnailUrl || generatedPreviewMeta?.strippedThumbnailUrl,
      width: options?.width || generatedPreviewMeta?.width,
      height: options?.height || generatedPreviewMeta?.height,
      aspectRatio: options?.aspectRatio || generatedPreviewMeta?.aspectRatio,
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

      setMessageStore((prev) =>
        patchMessagesInStore(
          prev,
          (message) => message.messageId === messageId,
          () => ({ content: normalizedContent, entities: normalizedEntities, edited: true }),
          user?.id
        )
      );
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
      setMessageStore((prev) => removeMessageFromStore(prev, messageId, user?.id));
      
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

    await sendMessagesWithImages(selectedChat, '', {
      attachments: [
        {
          id: `direct-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          file,
          forcedMessageType: options?.forcedMessageType,
          isImage: !options?.forcedMessageType && (file.type || '').toLowerCase().startsWith('image/'),
          sendAsFile: !options?.forcedMessageType && !(file.type || '').toLowerCase().startsWith('image/'),
          contentType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
          groupWithOthers: false,
        },
      ],
      clearComposerDraft: false,
      replyToMessageId: typeof replyingTo?.messageId === 'number' ? replyingTo.messageId : undefined,
      resetReplyTo: true,
    });
  };
  return {
    markChatRead,
    loadChats,
    loadMessages,
    loadMessagesAfter,
    loadOlderMessages,
    setActiveTopicId,
    getActiveTopicId,
    openChatWith,
    createGroupChat,
    updateGroupChat,
    addGroupMembers,
    removeGroupMembers,
    leaveGroupChat,
    updateGroupMemberRole,
    getGroupSettings,
    updateGroupSettings,
    getGroupPermissions,
    updateGroupPermissions,
    getInviteLinks,
    createInviteLink,
    updateInviteLink,
    revokeInviteLink,
    joinByInviteCode,
    getJoinRequests,
    approveJoinRequest,
    declineJoinRequest,
    getMemberRestrictions,
    updateMemberRestrictions,
    getAdminRights,
    updateAdminRights,
    getTopics,
    createTopic,
    updateTopic,
    getMessageReactions,
    toggleMessageReaction,
    createPoll,
    getPollByMessageId,
    getPollVoters,
    getPoll,
    votePoll,
    closePoll,
    pinGroupMessage,
    unpinGroupMessage,
    getGroupMedia,
    getGroupFiles,
    getGroupAdminLog,
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





