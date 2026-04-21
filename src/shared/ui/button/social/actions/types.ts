import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type {
  ChatAdminLogResponse,
  ChatAdminRights,
  ChatPoll,
  ChatPollVotersResponse,
  ChatMessageReactionsResponse,
  ChatTopic,
  ChatTopicsResponse,
  Friend,
  FriendRequest,
  ChatGroupMediaItemsResponse,
  ChatGroupPermissions,
  ChatGroupSettings,
  ChatInviteLink,
  ChatInviteLinksResponse,
  ChatJoinRequestsResponse,
  ChatMemberRestrictions,
  UserSearchResult,
  PrivateChat,
  ChatMessage,
  UploadImageResponse,
} from '@/shared/api/types';
import type { ChatMessageStore } from './messageReconcile';

export type AttachedImage = {
  id: string;
  file: File;
  preview?: string;
  thumbnailUrl?: string;
  strippedThumbnailUrl?: string;
  width?: number;
  height?: number;
  aspectRatio?: number;
  isImage?: boolean;
  sendAsFile?: boolean;
  groupWithOthers?: boolean;
  forcedMessageType?: 'voice' | 'circle';
  contentType?: string;
  sizeBytes?: number;
  uploadedData?: UploadImageResponse;
  uploading?: boolean;
};

export type AttachImageOptions = {
  forcedMessageType?: 'voice' | 'circle';
  preview?: string;
  thumbnailUrl?: string;
  strippedThumbnailUrl?: string;
  width?: number;
  height?: number;
  aspectRatio?: number;
  sendAsFile?: boolean;
  groupWithOthers?: boolean;
};

export type SendImagesOptions = {
  attachments?: AttachedImage[];
  clearComposerDraft?: boolean;
  replyToMessageId?: number;
  resetReplyTo?: boolean;
  groupingKeyOverride?: string;
  topicId?: number;
};

export type UploadingImagePhase = 'queued' | 'uploading' | 'uploaded';

export type UploadingImageState = {
  localId: string;
  attachmentIndex: number;
  file: File;
  progress: number;
  phase: UploadingImagePhase;
  cancelable: boolean;
};

export type SocialFloatingActionsContext = {
  user: any;
  searchQuery: string;
  selectedChat: number | null;
  chats: PrivateChat[];
  messages: ChatMessage[];
  messageStore: ChatMessageStore;
  messageInput: string;
  attachedImages: AttachedImage[];
  editingMessage: ChatMessage | null;
  replyingTo: ChatMessage | null;
  markReadTimeoutRef: MutableRefObject<NodeJS.Timeout | null>;
  markReadTargetRef: MutableRefObject<{ chatId: number; lastId: number } | null>;
  sendQueueRef: MutableRefObject<Map<number, Promise<void>>>;
  pendingUploadCancelsRef: MutableRefObject<Map<string, () => void>>;
  historyBeforeByChatRef: MutableRefObject<Map<number, number>>;
  historyHasMoreByChatRef: MutableRefObject<Map<number, boolean>>;
  historyLoadingByChatRef: MutableRefObject<Set<number>>;
  activeTopicByChatRef: MutableRefObject<Map<number, number>>;
  lastProtocolSeqRef: MutableRefObject<number>;
  lastProtocolMsgIdRef: MutableRefObject<number>;
  typingThrottleRef: MutableRefObject<Map<number, { lastSentAt: number; lastState: boolean }>>;
  isFirstLoadRef: MutableRefObject<boolean>;
  messagesEndRef: MutableRefObject<HTMLDivElement | null>;
  setFriends: Dispatch<SetStateAction<Friend[]>>;
  setIncomingRequests: Dispatch<SetStateAction<FriendRequest[]>>;
  setOutgoingRequests: Dispatch<SetStateAction<FriendRequest[]>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setSearchResults: Dispatch<SetStateAction<UserSearchResult[]>>;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  setMessageStore: Dispatch<SetStateAction<ChatMessageStore>>;
  setChats: Dispatch<SetStateAction<PrivateChat[]>>;
  setSelectedChat: Dispatch<SetStateAction<number | null>>;
  setActiveTab: Dispatch<SetStateAction<'friends' | 'search' | 'requests' | 'chat'>>;
  setReplyingTo: Dispatch<SetStateAction<ChatMessage | null>>;
  setMessageInput: Dispatch<SetStateAction<string>>;
  setAttachedImages: Dispatch<SetStateAction<AttachedImage[]>>;
  setEditingMessage: Dispatch<SetStateAction<ChatMessage | null>>;
  setUploadingImages: Dispatch<SetStateAction<Map<string, UploadingImageState>>>;
  pendingMediaPreviewUrls: Map<string, string>;
  setPendingMediaPreviewUrls: Dispatch<SetStateAction<Map<string, string>>>;
  setAutoScrollLocked: Dispatch<SetStateAction<boolean>>;
  setIsChatsRefreshing: Dispatch<SetStateAction<boolean>>;
  scrollToBottom: (smooth?: boolean) => void;
};

export type SocialFriendActions = {
  loadFriends: () => Promise<void>;
  loadIncomingRequests: () => Promise<void>;
  loadOutgoingRequests: () => Promise<void>;
  searchUsers: () => Promise<void>;
  refreshSearchIfNeeded: () => void;
  sendFriendRequest: (userId: string) => Promise<void>;
  acceptRequest: (userId: string) => Promise<void>;
  rejectRequest: (userId: string) => Promise<void>;
  removeFriend: (userId: string) => Promise<void>;
  cancelRequest: (userId: string) => Promise<void>;
};

export type SocialChatActions = {
  markChatRead: (chatId: number, lastId: number) => Promise<void>;
  loadChats: () => Promise<void>;
  loadMessages: (chatId: number, append?: boolean, topicId?: number) => Promise<void>;
  loadMessagesAfter: (chatId: number, afterMessageId: number, limit?: number, topicId?: number) => Promise<void>;
  loadOlderMessages: (chatId: number, limit?: number, topicId?: number) => Promise<void>;
  setActiveTopicId: (chatId: number, topicId?: number) => void;
  getActiveTopicId: (chatId: number) => number | undefined;
  openChatWith: (participantId: string) => Promise<void>;
  createGroupChat: (payload: {
    title: string;
    participantIds?: string[];
    avatarPath?: string;
  }) => Promise<void>;
  updateGroupChat: (
    chatId: number,
    payload: {
      title?: string;
      avatarPath?: string;
    }
  ) => Promise<void>;
  addGroupMembers: (chatId: number, participantIds: string[]) => Promise<void>;
  removeGroupMembers: (chatId: number, participantIds: string[]) => Promise<void>;
  leaveGroupChat: (chatId: number) => Promise<void>;
  updateGroupMemberRole: (
    chatId: number,
    userId: string,
    role: 'OWNER' | 'ADMIN' | 'MEMBER'
  ) => Promise<void>;
  getGroupSettings: (chatId: number) => Promise<ChatGroupSettings>;
  updateGroupSettings: (
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
  ) => Promise<ChatGroupSettings>;
  getGroupPermissions: (chatId: number) => Promise<ChatGroupPermissions>;
  updateGroupPermissions: (
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
  ) => Promise<ChatGroupPermissions>;
  getInviteLinks: (chatId: number) => Promise<ChatInviteLinksResponse>;
  createInviteLink: (
    chatId: number,
    payload: {
      name?: string;
      createsJoinRequest?: boolean;
      expiresAt?: string;
      usageLimit?: number;
    }
  ) => Promise<ChatInviteLink>;
  updateInviteLink: (
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
  ) => Promise<ChatInviteLink>;
  revokeInviteLink: (chatId: number, inviteId: number) => Promise<void>;
  joinByInviteCode: (inviteCode: string) => Promise<void>;
  getJoinRequests: (
    chatId: number,
    status?: 'PENDING' | 'APPROVED' | 'DECLINED',
    before?: number,
    limit?: number
  ) => Promise<ChatJoinRequestsResponse>;
  approveJoinRequest: (chatId: number, requestId: number) => Promise<void>;
  declineJoinRequest: (chatId: number, requestId: number) => Promise<void>;
  getMemberRestrictions: (chatId: number, userId: string) => Promise<ChatMemberRestrictions>;
  updateMemberRestrictions: (
    chatId: number,
    userId: string,
    payload: {
      mutedUntil?: string | null;
      bannedUntil?: string | null;
      clearMutedUntil?: boolean;
      clearBannedUntil?: boolean;
      canSendMessages?: boolean;
      canSendMedia?: boolean;
      canSendPolls?: boolean;
      reason?: string;
    }
  ) => Promise<ChatMemberRestrictions>;
  getAdminRights: (chatId: number, userId: string) => Promise<ChatAdminRights>;
  updateAdminRights: (
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
  ) => Promise<ChatAdminRights>;
  getTopics: (chatId: number, includeDeleted?: boolean) => Promise<ChatTopicsResponse>;
  createTopic: (
    chatId: number,
    payload: {
      title: string;
      iconEmoji?: string;
    }
  ) => Promise<ChatTopic>;
  updateTopic: (
    chatId: number,
    topicId: number,
    payload: {
      title?: string;
      iconEmoji?: string;
      closed?: boolean;
      pinned?: boolean;
      deleted?: boolean;
    }
  ) => Promise<ChatTopic>;
  getMessageReactions: (chatId: number, messageId: number) => Promise<ChatMessageReactionsResponse>;
  toggleMessageReaction: (
    chatId: number,
    messageId: number,
    emoji: string
  ) => Promise<ChatMessageReactionsResponse>;
  createPoll: (
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
  ) => Promise<ChatPoll>;
  getPollVoters: (chatId: number, pollId: number) => Promise<ChatPollVotersResponse>;
  getPollByMessageId: (chatId: number, messageId: number) => Promise<ChatPoll>;
  getPoll: (chatId: number, pollId: number) => Promise<ChatPoll>;
  votePoll: (
    chatId: number,
    pollId: number,
    optionIndexes: number[]
  ) => Promise<ChatPoll>;
  closePoll: (chatId: number, pollId: number) => Promise<void>;
  pinGroupMessage: (chatId: number, messageId: number) => Promise<void>;
  unpinGroupMessage: (chatId: number) => Promise<void>;
  getGroupMedia: (chatId: number, before?: number, limit?: number) => Promise<ChatGroupMediaItemsResponse>;
  getGroupFiles: (chatId: number, before?: number, limit?: number) => Promise<ChatGroupMediaItemsResponse>;
  getGroupAdminLog: (
    chatId: number,
    before?: number,
    limit?: number,
    filters?: {
      actorUserId?: string;
      targetUserId?: string;
      eventType?: string;
    }
  ) => Promise<ChatAdminLogResponse>;
  sendTypingState: (chatId: number, typing: boolean, force?: boolean) => Promise<void>;
  sendMessageToUser: (
    recipientId: string,
    message: string,
    messageType?: 'text' | 'image' | 'images' | 'file' | 'files' | 'voice' | 'circle',
    imagePath?: string,
    imageEncrypted?: boolean,
    imageEncryptionIv?: string,
    imageKeyVersion?: number,
  ) => Promise<void>;
  sendChatMessage: (topicIdOverride?: number) => Promise<void>;
  retryFailedMessage: (messageId: number | string) => Promise<void>;
  sendMessagesWithImages: (
    chatId: number,
    textContent: string,
    options?: SendImagesOptions
  ) => Promise<void>;
  cancelPendingMediaUpload: (localId: string, attachmentIndex: number) => void;
  attachImage: (file: File, options?: AttachImageOptions) => Promise<void>;
  removeAttachedImage: (id: string) => void;
  editMessage: (messageId: number | string, newContent: string) => Promise<void>;
  deleteMessage: (messageId: number | string) => Promise<void>;
  copyMessageText: (text: string) => void;
  uploadImage: (
    file: File,
    options?: {
      forcedMessageType?: 'voice' | 'circle';
    }
  ) => Promise<void>;
};

export type SocialFloatingActions = SocialFriendActions & SocialChatActions;
