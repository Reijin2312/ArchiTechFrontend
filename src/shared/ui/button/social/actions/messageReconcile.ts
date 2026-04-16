import type { ChatMessage, PrivateChat } from '@/shared/api/types';
import { getMessageMediaAttachments } from '../chat/mediaAttachments';

type LooseImage = {
  imagePath?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  strippedThumbnailUrl?: string;
  width?: number;
  height?: number;
  imageEncryptionIv?: string;
  fileName?: string;
  contentType?: string;
  sizeBytes?: number;
  isImage?: boolean;
  imageKeyVersion?: number;
};

type ChatMediaPatch = {
  messageId?: number;
  clientMessageId?: number;
  senderId?: string;
  mediaPath?: string;
  contentType?: string;
  sizeBytes?: number;
  imageEncryptionIv?: string;
  imageKeyVersion?: number;
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isLocalUrl = (value?: string) =>
  !!value && (value.startsWith('blob:') || value.startsWith('data:'));

const normalizeImage = (input: LooseImage) => {
  const imagePath = isNonEmptyString(input.imagePath) ? input.imagePath : '';
  const imageUrl = isNonEmptyString(input.imageUrl) ? input.imageUrl : undefined;
  const thumbnailUrl = isNonEmptyString(input.thumbnailUrl) ? input.thumbnailUrl : undefined;
  const strippedThumbnailUrl = isNonEmptyString(input.strippedThumbnailUrl)
    ? input.strippedThumbnailUrl
    : undefined;
  const width = isFiniteNumber(input.width) && input.width > 0 ? input.width : undefined;
  const height = isFiniteNumber(input.height) && input.height > 0 ? input.height : undefined;
  const fileName = isNonEmptyString(input.fileName) ? input.fileName : undefined;
  const contentType = isNonEmptyString(input.contentType) ? input.contentType : undefined;
  const sizeBytes = isFiniteNumber(input.sizeBytes) ? input.sizeBytes : undefined;
  const isImage = typeof input.isImage === 'boolean' ? input.isImage : undefined;
  const imageKeyVersion = isFiniteNumber(input.imageKeyVersion) ? input.imageKeyVersion : undefined;
  const imageEncryptionIv = isNonEmptyString(input.imageEncryptionIv)
    ? input.imageEncryptionIv
    : undefined;

  return {
    imagePath,
    imageUrl,
    thumbnailUrl,
    strippedThumbnailUrl,
    width,
    height,
    fileName,
    contentType,
    sizeBytes,
    isImage,
    imageKeyVersion,
    imageEncryptionIv,
  };
};

const messageTimestampMs = (message: ChatMessage): number => {
  const fromServer = message.serverTimestamp ?? message.signatureTimestamp;
  if (typeof fromServer === 'number' && Number.isFinite(fromServer)) {
    return fromServer;
  }
  const parsed = Date.parse(message.createdAt || '');
  return Number.isFinite(parsed) ? parsed : 0;
};

const messageNumericId = (message: ChatMessage): number => {
  if (typeof message.messageId === 'number' && Number.isFinite(message.messageId)) {
    return message.messageId;
  }
  if (typeof message.clientMessageId === 'number' && Number.isFinite(message.clientMessageId)) {
    return message.clientMessageId;
  }
  return 0;
};

const messageTieBreaker = (message: ChatMessage): string => {
  if (typeof message.messageId === 'number' && Number.isFinite(message.messageId)) {
    return `n:${String(message.messageId).padStart(20, '0')}`;
  }
  if (typeof message.clientMessageId === 'number' && Number.isFinite(message.clientMessageId)) {
    return `c:${String(message.clientMessageId).padStart(20, '0')}`;
  }
  const localPart =
    (typeof message.messageId === 'string' && message.messageId.length > 0
      ? message.messageId
      : message.localId) || '';
  return `s:${localPart}`;
};

const sortMessages = (items: ChatMessage[]) =>
  [...items].sort((left, right) => {
    const tsDiff = messageTimestampMs(left) - messageTimestampMs(right);
    if (tsDiff !== 0) return tsDiff;
    const idDiff = messageNumericId(left) - messageNumericId(right);
    if (idDiff !== 0) return idDiff;
    return messageTieBreaker(left).localeCompare(messageTieBreaker(right));
  });

const canonicalImages = (message: Partial<ChatMessage>) =>
  getMessageMediaAttachments(message as ChatMessage).map((item) =>
    normalizeImage(item as LooseImage)
  );

const mergeImage = (
  existing: ReturnType<typeof normalizeImage> | undefined,
  incoming: ReturnType<typeof normalizeImage>
) => {
  const incomingUrl = incoming.imageUrl;
  const existingUrl = existing?.imageUrl;
  const resolvedUrl =
    isNonEmptyString(incomingUrl) && !isLocalUrl(incomingUrl)
      ? incomingUrl
      : isNonEmptyString(existingUrl) && !isLocalUrl(existingUrl)
        ? existingUrl
        : undefined;

  return {
    imagePath: incoming.imagePath || existing?.imagePath || '',
    imageUrl: resolvedUrl,
    thumbnailUrl: incoming.thumbnailUrl || existing?.thumbnailUrl,
    strippedThumbnailUrl: incoming.strippedThumbnailUrl || existing?.strippedThumbnailUrl,
    width: incoming.width ?? existing?.width,
    height: incoming.height ?? existing?.height,
    fileName: incoming.fileName || existing?.fileName,
    contentType: incoming.contentType || existing?.contentType,
    sizeBytes: incoming.sizeBytes ?? existing?.sizeBytes,
    isImage: incoming.isImage ?? existing?.isImage,
    imageKeyVersion: incoming.imageKeyVersion ?? existing?.imageKeyVersion,
    imageEncryptionIv: incoming.imageEncryptionIv ?? existing?.imageEncryptionIv,
  };
};

const mergeImages = (existing: Partial<ChatMessage>, incoming: Partial<ChatMessage>) => {
  const existingImages = canonicalImages(existing);
  const incomingImages = canonicalImages(incoming);

  if (incomingImages.length === 0) {
    return existingImages;
  }

  return incomingImages.map((incomingImage, index) => {
    const byPath =
      isNonEmptyString(incomingImage.imagePath) &&
      existingImages.find((candidate) => candidate.imagePath === incomingImage.imagePath);
    const existingImage = byPath || existingImages[index];
    return mergeImage(existingImage, incomingImage);
  });
};

const mergeStatus = (existing: ChatMessage | undefined, incoming: Partial<ChatMessage>) => {
  const incomingStatus = incoming.status;
  if (incomingStatus) return incomingStatus;

  const hasServerId =
    typeof incoming.messageId === 'number' && Number.isFinite(incoming.messageId);
  if (hasServerId) {
    return existing?.status === 'read' ? 'read' : 'sent';
  }

  return existing?.status;
};

export const mergeMessage = (
  existing: ChatMessage | undefined,
  incoming: Partial<ChatMessage>
): ChatMessage => {
  const mergedImages = mergeImages(existing ?? {}, incoming);

  const createdAt =
    (isNonEmptyString(incoming.createdAt) ? incoming.createdAt : undefined) ??
    existing?.createdAt ??
    new Date().toISOString();
  const messageType =
    (isNonEmptyString(incoming.messageType) ? incoming.messageType : undefined) ??
    existing?.messageType ??
    'text';

  return {
    messageId: incoming.messageId ?? existing?.messageId ?? `local-${Date.now()}`,
    chatId: incoming.chatId ?? existing?.chatId,
    clientMessageId: incoming.clientMessageId ?? existing?.clientMessageId,
    localId: incoming.localId ?? existing?.localId,
    status: mergeStatus(existing, incoming),
    senderId: incoming.senderId ?? existing?.senderId ?? '',
    senderUsername: incoming.senderUsername ?? existing?.senderUsername,
    senderDisplayName: incoming.senderDisplayName ?? existing?.senderDisplayName,
    content: incoming.content ?? existing?.content ?? '',
    messageType,
    entities: incoming.entities ?? existing?.entities,
    images: mergedImages.length > 0 ? mergedImages : undefined,
    createdAt,
    isRead: incoming.isRead ?? existing?.isRead,
    replyToId: incoming.replyToId ?? existing?.replyToId,
    replyToMessage: incoming.replyToMessage ?? existing?.replyToMessage,
    edited: incoming.edited ?? existing?.edited,
    messageKeyVersion: incoming.messageKeyVersion ?? existing?.messageKeyVersion,
    imageKeyVersion: incoming.imageKeyVersion ?? existing?.imageKeyVersion,
    messageHmac: incoming.messageHmac ?? existing?.messageHmac,
    serverTimestamp:
      incoming.serverTimestamp ??
      incoming.signatureTimestamp ??
      existing?.serverTimestamp ??
      existing?.signatureTimestamp,
    signatureTimestamp:
      incoming.signatureTimestamp ??
      incoming.serverTimestamp ??
      existing?.signatureTimestamp ??
      existing?.serverTimestamp,
    sequenceNumber: incoming.sequenceNumber ?? existing?.sequenceNumber,
    groupingKey: incoming.groupingKey ?? existing?.groupingKey,
  };
};

const findByServerOrClientId = (
  messages: ChatMessage[],
  messageId: number | string | undefined,
  clientMessageId: number | undefined,
  currentUserId?: string
) => {
  if (typeof messageId === 'number' && Number.isFinite(messageId)) {
    const indexByServerId = messages.findIndex((message) => message.messageId === messageId);
    if (indexByServerId >= 0) return indexByServerId;
  }

  if (clientMessageId != null && Number.isFinite(clientMessageId)) {
    const indexByClientId = messages.findIndex((message) => {
      if (message.clientMessageId !== clientMessageId) return false;
      if (!currentUserId) return true;
      return message.senderId === currentUserId;
    });
    if (indexByClientId >= 0) return indexByClientId;
  }

  return -1;
};

export const upsertMessage = (
  messages: ChatMessage[],
  incoming: Partial<ChatMessage>,
  currentUserId?: string
) => {
  const index = findByServerOrClientId(
    messages,
    incoming.messageId,
    incoming.clientMessageId,
    currentUserId
  );
  if (index < 0) {
    return sortMessages([...messages, mergeMessage(undefined, incoming)]);
  }

  const next = [...messages];
  next[index] = mergeMessage(messages[index], incoming);
  return sortMessages(next);
};

export const mergeHistoryWithPending = (
  existingMessages: ChatMessage[],
  loadedMessages: ChatMessage[],
  currentUserId?: string
) => {
  let next = [...existingMessages];
  for (const loadedMessage of loadedMessages) {
    next = upsertMessage(next, loadedMessage, currentUserId);
  }
  return sortMessages(next);
};

export const patchMediaMetadata = (messages: ChatMessage[], patch: ChatMediaPatch) => {
  if (!patch.mediaPath) {
    return messages;
  }
  const hasServerMessageId = typeof patch.messageId === 'number' && Number.isFinite(patch.messageId);
  const hasClientMessageId =
    typeof patch.clientMessageId === 'number' && Number.isFinite(patch.clientMessageId);
  if (!hasServerMessageId && !hasClientMessageId) {
    return messages;
  }

  return messages.map((message) => {
    const byServerId = hasServerMessageId && message.messageId === patch.messageId;
    const byClientId = hasClientMessageId && message.clientMessageId === patch.clientMessageId;
    if (!byServerId && !byClientId) return message;
    const images = canonicalImages(message);
    if (images.length === 0) return message;

    let changed = false;
    const nextImages = images.map((image) => {
      if (image.imagePath !== patch.mediaPath) return image;
      changed = true;
      return {
        ...image,
        contentType: patch.contentType || image.contentType,
        sizeBytes: patch.sizeBytes ?? image.sizeBytes,
        imageEncryptionIv: patch.imageEncryptionIv ?? image.imageEncryptionIv,
        imageKeyVersion: patch.imageKeyVersion ?? image.imageKeyVersion,
      };
    });

    if (!changed) return message;
    return {
      ...message,
      images: nextImages,
    };
  });
};

export const projectLastMessage = (chats: PrivateChat[], message: ChatMessage) =>
  message.chatId == null
    ? chats
    :
  chats.map((chat) =>
    chat.chatId === message.chatId
      ? {
          ...chat,
          lastMessage: mergeMessage(chat.lastMessage, message),
        }
      : chat
  );

type MessageStoreKey = string;

export type ChatMessageStore = {
  byId: Record<MessageStoreKey, ChatMessage>;
  byServerId: Record<string, MessageStoreKey>;
  byClientId: Record<string, MessageStoreKey>;
  byLocalId: Record<string, MessageStoreKey>;
  orderedIds: MessageStoreKey[];
};

const emptyMessageStore = (): ChatMessageStore => ({
  byId: {},
  byServerId: {},
  byClientId: {},
  byLocalId: {},
  orderedIds: [],
});

const toServerKey = (messageId: number) => `srv:${messageId}`;
const toLocalMessageKey = (messageId: string) => `loc:${messageId}`;
const toClientKey = (senderId: string, clientMessageId: number) =>
  `${senderId || '__unknown__'}:${clientMessageId}`;

const resolveStoreIdentityKey = (
  incoming: Partial<ChatMessage>,
  currentUserId?: string
): MessageStoreKey | undefined => {
  if (typeof incoming.messageId === 'number' && Number.isFinite(incoming.messageId)) {
    return toServerKey(incoming.messageId);
  }

  if (isNonEmptyString(incoming.localId)) {
    return toLocalMessageKey(incoming.localId);
  }

  if (typeof incoming.messageId === 'string' && incoming.messageId.length > 0) {
    return toLocalMessageKey(incoming.messageId);
  }

  if (typeof incoming.clientMessageId === 'number' && Number.isFinite(incoming.clientMessageId)) {
    return `tmp:${toClientKey(incoming.senderId || currentUserId || '', incoming.clientMessageId)}`;
  }

  return undefined;
};

const findStoreKey = (
  store: ChatMessageStore,
  incoming: Partial<ChatMessage>,
  currentUserId?: string
): MessageStoreKey | undefined => {
  if (typeof incoming.messageId === 'number' && Number.isFinite(incoming.messageId)) {
    const byServer = store.byServerId[String(incoming.messageId)];
    if (byServer) return byServer;
  }

  if (typeof incoming.clientMessageId === 'number' && Number.isFinite(incoming.clientMessageId)) {
    const senderId = incoming.senderId || currentUserId || '';
    const byClient = store.byClientId[toClientKey(senderId, incoming.clientMessageId)];
    if (byClient) return byClient;
  }

  if (isNonEmptyString(incoming.localId)) {
    const byLocalId = store.byLocalId[incoming.localId];
    if (byLocalId) return byLocalId;
  }

  if (typeof incoming.messageId === 'string' && incoming.messageId.length > 0) {
    const byLocalMessageId = store.byLocalId[incoming.messageId];
    if (byLocalMessageId) return byLocalMessageId;

    const directKey = toLocalMessageKey(incoming.messageId);
    if (store.byId[directKey]) return directKey;
  }

  const fallback = resolveStoreIdentityKey(incoming, currentUserId);
  if (fallback && store.byId[fallback]) {
    return fallback;
  }

  return undefined;
};

const sortStoreOrderedIds = (store: ChatMessageStore) => {
  const ordered = Object.entries(store.byId)
    .sort((left, right) => {
      const tsDiff = messageTimestampMs(left[1]) - messageTimestampMs(right[1]);
      if (tsDiff !== 0) return tsDiff;
      const idDiff = messageNumericId(left[1]) - messageNumericId(right[1]);
      if (idDiff !== 0) return idDiff;
      return messageTieBreaker(left[1]).localeCompare(messageTieBreaker(right[1]));
    })
    .map(([key]) => key);

  return ordered;
};

const cleanIndexRefs = (index: Record<string, MessageStoreKey>, removedKey: MessageStoreKey) => {
  for (const [indexKey, mappedKey] of Object.entries(index)) {
    if (mappedKey === removedKey) {
      delete index[indexKey];
    }
  }
};

const attachIndexes = (store: ChatMessageStore, key: MessageStoreKey, message: ChatMessage) => {
  if (typeof message.messageId === 'number' && Number.isFinite(message.messageId)) {
    store.byServerId[String(message.messageId)] = key;
  }

  if (
    typeof message.clientMessageId === 'number' &&
    Number.isFinite(message.clientMessageId) &&
    isNonEmptyString(message.senderId)
  ) {
    store.byClientId[toClientKey(message.senderId, message.clientMessageId)] = key;
  }

  if (isNonEmptyString(message.localId)) {
    store.byLocalId[message.localId] = key;
  }

  if (typeof message.messageId === 'string' && message.messageId.length > 0) {
    store.byLocalId[message.messageId] = key;
  }
};

export const upsertMessageInStore = (
  store: ChatMessageStore,
  incoming: Partial<ChatMessage>,
  currentUserId?: string
) => {
  const existingKey = findStoreKey(store, incoming, currentUserId);
  const existing = existingKey ? store.byId[existingKey] : undefined;
  const merged = mergeMessage(existing, incoming);
  const preferredKey = resolveStoreIdentityKey(merged, currentUserId) ?? existingKey;
  const nextKey = preferredKey ?? `tmp:${Date.now()}:${Math.random().toString(16).slice(2)}`;

  const next: ChatMessageStore = {
    byId: { ...store.byId },
    byServerId: { ...store.byServerId },
    byClientId: { ...store.byClientId },
    byLocalId: { ...store.byLocalId },
    orderedIds: store.orderedIds,
  };

  if (existingKey && existingKey !== nextKey) {
    delete next.byId[existingKey];
    cleanIndexRefs(next.byServerId, existingKey);
    cleanIndexRefs(next.byClientId, existingKey);
    cleanIndexRefs(next.byLocalId, existingKey);
  }

  next.byId[nextKey] = merged;
  attachIndexes(next, nextKey, merged);
  next.orderedIds = sortStoreOrderedIds(next);
  return next;
};

export const upsertMessagesInStore = (
  store: ChatMessageStore,
  incomingMessages: Array<Partial<ChatMessage>>,
  currentUserId?: string
) => {
  let next = store;
  for (const incoming of incomingMessages) {
    next = upsertMessageInStore(next, incoming, currentUserId);
  }
  return next;
};

export const mergeHistoryWithPendingInStore = (
  store: ChatMessageStore,
  loadedMessages: ChatMessage[],
  currentUserId?: string
) => upsertMessagesInStore(store, loadedMessages, currentUserId);

export const removeMessageFromStore = (
  store: ChatMessageStore,
  messageId: number | string,
  currentUserId?: string
) => {
  const key =
    findStoreKey(store, { messageId }, currentUserId) ||
    (typeof messageId === 'number' ? store.byServerId[String(messageId)] : store.byLocalId[messageId]);
  if (!key) return store;

  const next: ChatMessageStore = {
    byId: { ...store.byId },
    byServerId: { ...store.byServerId },
    byClientId: { ...store.byClientId },
    byLocalId: { ...store.byLocalId },
    orderedIds: store.orderedIds,
  };

  delete next.byId[key];
  cleanIndexRefs(next.byServerId, key);
  cleanIndexRefs(next.byClientId, key);
  cleanIndexRefs(next.byLocalId, key);
  next.orderedIds = sortStoreOrderedIds(next);
  return next;
};

export const patchMediaMetadataInStore = (store: ChatMessageStore, patch: ChatMediaPatch) => {
  if (!patch.mediaPath) {
    return store;
  }
  const hasServerMessageId = typeof patch.messageId === 'number' && Number.isFinite(patch.messageId);
  const hasClientMessageId =
    typeof patch.clientMessageId === 'number' && Number.isFinite(patch.clientMessageId);
  const hasSenderId = isNonEmptyString(patch.senderId);
  if (!hasServerMessageId && !(hasClientMessageId && hasSenderId)) {
    return store;
  }

  let key: string | undefined;
  if (hasServerMessageId) {
    key = store.byServerId[String(patch.messageId)];
  }
  if (!key && hasClientMessageId && hasSenderId) {
    key = store.byClientId[toClientKey(patch.senderId!, patch.clientMessageId!)];
  }
  if (!key) return store;

  const existing = store.byId[key];
  if (!existing) return store;
  const patched = patchMediaMetadata([existing], patch)[0];
  if (!patched || patched === existing) return store;

  const next: ChatMessageStore = {
    ...store,
    byId: {
      ...store.byId,
      [key]: patched,
    },
  };
  next.orderedIds = sortStoreOrderedIds(next);
  return next;
};

export const patchMessagesInStore = (
  store: ChatMessageStore,
  predicate: (message: ChatMessage) => boolean,
  patchBuilder: (message: ChatMessage) => Partial<ChatMessage> | undefined,
  currentUserId?: string
) => {
  let next = store;
  let changed = false;
  const sourceIds = [...store.orderedIds];

  for (const key of sourceIds) {
    const message = next.byId[key];
    if (!message || !predicate(message)) {
      continue;
    }

    const patch = patchBuilder(message);
    if (!patch) {
      continue;
    }

    const messageRecord = message as unknown as Record<string, unknown>;
    const hasDiff = Object.entries(patch).some(([field, value]) => {
      const previous = messageRecord[field];
      return previous !== value;
    });
    if (!hasDiff) {
      continue;
    }

    next = upsertMessageInStore(next, { ...message, ...patch }, currentUserId);
    changed = true;
  }

  return changed ? next : store;
};

export const messageStoreToArray = (store: ChatMessageStore): ChatMessage[] =>
  store.orderedIds.map((key) => store.byId[key]).filter((value): value is ChatMessage => !!value);

export const createMessageStore = (messages: ChatMessage[], currentUserId?: string) => {
  let next = emptyMessageStore();
  for (const message of messages) {
    next = upsertMessageInStore(next, message, currentUserId);
  }
  return next;
};

export const getLatestMessagesByChatFromStore = (store: ChatMessageStore) => {
  const latestByChat = new Map<number, ChatMessage>();
  for (const key of store.orderedIds) {
    const message = store.byId[key];
    if (!message || message.chatId == null) continue;
    latestByChat.set(message.chatId, message);
  }
  return latestByChat;
};

export const projectChatsFromMessageStore = (
  chats: PrivateChat[],
  store: ChatMessageStore
): PrivateChat[] => {
  const latestByChat = getLatestMessagesByChatFromStore(store);
  let changed = false;

  const next = chats.map((chat) => {
    const projected = latestByChat.get(chat.chatId);
    if (!projected) {
      if (!chat.lastMessage) return chat;
      changed = true;
      return {
        ...chat,
        lastMessage: undefined,
      };
    }

    if (chat.lastMessage === projected) {
      return chat;
    }

    if (
      chat.lastMessage &&
      chat.lastMessage.messageId === projected.messageId &&
      chat.lastMessage.status === projected.status &&
      chat.lastMessage.isRead === projected.isRead &&
      chat.lastMessage.edited === projected.edited &&
      chat.lastMessage.content === projected.content
    ) {
      return chat;
    }

    changed = true;
    return {
      ...chat,
      lastMessage: projected,
    };
  });

  return changed ? next : chats;
};
