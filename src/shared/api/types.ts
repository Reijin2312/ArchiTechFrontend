export type Tokens = { accessToken : string; refreshToken: string }
export type User = { id : string; username: string; email: string }

export type LoginReq = { email: string; password: string }
export type LoginSuccessRes = Tokens & { 
  user: User;
  deviceId?: string;
  sessionId?: string;
  sessionKey?: string;
  sessionKeyIv?: string;
}
export type Login2faRequiredRes = {
  requires2fa: true
  challengeToken: string
  method: 'totp'
}
export type LoginRes = LoginSuccessRes | Login2faRequiredRes

export type TwoFactorStatusRes = {
  enabled: boolean
  pendingSetup: boolean
  method: 'totp'
}

export type TwoFactorSetupStartReq = { password: string }
export type TwoFactorSetupStartRes = {
  secret: string
  otpauthUri: string
  issuer: string
  accountName: string
}

export type TwoFactorSetupConfirmReq = { code: string }
export type TwoFactorDisableReq = { password: string; code: string }

export type RegisterReq = { email: string; username: string; password: string }
export type RegisterRes =
  | { needVerify: true; ticket: string; email: string }
  | { needVerify: false };


export type VerifyEmailReq = { ticket: string; code: string }
export type VerifyEmailRes = { accessToken: string }

export type ResetConfirmReq = { ticket: string; code: string }
export type ResetConfirmRes = { resetToken: string }

export type ResetFinishReq = { resetToken: string; newPassword: string }
export type Ok = { ok: true }

export type FriendStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'BLOCKED' | null

export interface Friend {
  userId: string
  username: string
  displayName?: string
  avatarUrl?: string
  friendsSince: string
  acceptedAt?: string | null
}

export interface FriendRequest {
  requestId: number
  userId: string
  username: string
  displayName?: string
  avatarUrl?: string
  createdAt: string
  status?: FriendStatus
}

export interface UserSearchResult {
  userId: string
  username: string
  displayName?: string
  avatarUrl?: string
  friendStatus: FriendStatus
}

export interface FriendsListResponse {
  friends: Friend[]
}

export interface FriendRequestsResponse {
  requests: FriendRequest[]
}

export interface UserSearchResponse {
  users: UserSearchResult[]
}

export interface FriendActionResponse {
  success: boolean
  message: string
  requestId?: number
}

export interface FriendStatusResponse {
  userId: string
  status: FriendStatus
}

export type ChatMessageEntityType =
  | 'BOLD'
  | 'ITALIC'
  | 'UNDERLINE'
  | 'STRIKETHROUGH'
  | 'SPOILER'
  | 'CODE'
  | 'PRE'
  | 'LINK'

export interface ChatMessageEntity {
  offset: number
  length: number
  type: ChatMessageEntityType
  url?: string
  language?: string
}

export interface ChatMessage {
  messageId: number | string
  chatId?: number
  topicId?: number | null
  clientMessageId?: number
  localId?: string
  status?: 'pending' | 'failed' | 'sent' | 'delivered' | 'read'
  senderId: string
  senderUsername?: string
  senderDisplayName?: string
  content: string
  messageType:
    | 'text'
    | 'image'
    | 'images'
    | 'file'
    | 'files'
    | 'voice'
    | 'circle'
    | 'group_created'
    | 'group_title_updated'
    | 'group_avatar_updated'
    | 'group_member_added'
    | 'group_members_added'
    | 'group_member_removed'
    | 'group_members_removed'
    | 'group_member_left'
    | 'group_admin_promoted'
    | 'group_admin_demoted'
    | 'group_owner_transferred'
    | 'group_description_updated'
    | 'group_public_username_updated'
    | 'group_slow_mode_updated'
    | 'group_history_visibility_updated'
    | 'group_permissions_updated'
    | 'group_admin_rights_updated'
    | 'group_member_muted'
    | 'group_member_unmuted'
    | 'group_member_banned'
    | 'group_member_unbanned'
    | 'group_message_pinned'
    | 'group_message_unpinned'
    | 'group_invite_link_created'
    | 'group_invite_link_revoked'
    | 'group_join_request_created'
    | 'group_join_request_approved'
    | 'group_join_request_declined'
    | 'group_topic_created'
    | 'group_topic_closed'
    | 'group_topic_reopened'
    | 'group_topic_deleted'
    | 'reaction'
    | 'poll'
    | 'poll_closed'
  entities?: ChatMessageEntity[]
  images?: Array<{
    imagePath: string
    imageUrl?: string
    thumbnailUrl?: string
    strippedThumbnailUrl?: string
    width?: number
    height?: number
    imageEncryptionIv?: string
    fileName?: string
    contentType?: string
    sizeBytes?: number
    isImage?: boolean
    imageKeyVersion?: number
  }>
  createdAt: string
  isRead?: boolean
  replyToId?: number | string
  replyToMessage?: ChatMessage
  edited?: boolean
  messageKeyVersion?: number
  imageKeyVersion?: number
  messageHmac?: string
  sequenceNumber?: number
  serverTimestamp?: number
  signatureTimestamp?: number
  groupingKey?: string
}

export type ChatType = 'PRIVATE' | 'GROUP'
export type ChatGroupMemberRole = 'OWNER' | 'ADMIN' | 'MEMBER'

export interface ChatGroupMember {
  userId: string
  role: ChatGroupMemberRole
  joinedAt?: string | null
}

export interface ChatConversation {
  chatId: number
  chatType: ChatType
  participantId?: string
  title?: string
  avatarPath?: string
  ownerId?: string
  description?: string
  isPublic?: boolean
  publicUsername?: string
  historyVisibleToNewMembers?: boolean
  slowModeSeconds?: number
  pinnedMessageId?: number | null
  topicsEnabled?: boolean
  reactionsEnabled?: boolean
  pollsEnabled?: boolean
  memberCount?: number
  participantIds?: string[]
  lastMessage?: ChatMessage
  createdAt: string
}

export type PrivateChat = ChatConversation

export interface ChatListResponse {
  chats: ChatConversation[]
}

export interface ChatMessagesResponse {
  messages: ChatMessage[]
}

export interface ChatLinkItem {
  messageId: number
  createdAt: string
  url: string
  title?: string
  previewText?: string
}

export interface ChatLinksResponse {
  items: ChatLinkItem[]
  hasMore: boolean
  nextBeforeMessageId?: number | null
}

export interface ChatGroupMembersResponse {
  members: ChatGroupMember[]
}

export interface ChatGroupSettings {
  chatId: number
  ownerId?: string
  title?: string
  avatarPath?: string
  description?: string
  isPublic: boolean
  publicUsername?: string
  historyVisibleToNewMembers: boolean
  slowModeSeconds: number
  pinnedMessageId?: number | null
  topicsEnabled: boolean
  reactionsEnabled: boolean
  pollsEnabled: boolean
  reactionMode?: 'ALL' | 'SOME' | 'NONE'
  allowedReactions?: string[]
}

export interface ChatGroupPermissions {
  chatId: number
  canSendMessages: boolean
  canSendMedia: boolean
  canSendPolls: boolean
  canAddWebPagePreviews: boolean
  canChangeInfo: boolean
  canInviteUsers: boolean
  canPinMessages: boolean
  updatedBy?: string
  updatedAt?: string
}

export interface ChatInviteLink {
  id: number
  chatId: number
  code: string
  link: string
  name?: string
  createdBy?: string
  createsJoinRequest: boolean
  expiresAt?: string | null
  usageLimit?: number | null
  usageCount: number
  revoked: boolean
  createdAt?: string
  updatedAt?: string
}

export interface ChatInviteLinksResponse {
  items: ChatInviteLink[]
}

export type ChatJoinRequestStatus = 'PENDING' | 'APPROVED' | 'DECLINED'

export interface ChatJoinRequest {
  id: number
  chatId: number
  userId: string
  inviteLinkId?: number | null
  status: ChatJoinRequestStatus
  requestedAt?: string
  resolvedAt?: string | null
  resolvedBy?: string | null
}

export interface ChatJoinRequestsResponse {
  items: ChatJoinRequest[]
  hasMore?: boolean
  nextBeforeId?: number | null
}

export interface ChatMemberRestrictions {
  chatId: number
  userId: string
  mutedUntil?: string | null
  bannedUntil?: string | null
  canSendMessages: boolean
  canSendMedia: boolean
  canSendPolls: boolean
  reason?: string | null
  updatedBy?: string | null
  updatedAt?: string | null
}

export interface ChatAdminRights {
  chatId: number
  userId: string
  canManageGroup: boolean
  canManageMembers: boolean
  canManageInviteLinks: boolean
  canPinMessages: boolean
  canDeleteMessages: boolean
  canBanUsers: boolean
  canManageTopics: boolean
  canManageReactions: boolean
  canManagePolls: boolean
  isAnonymous?: boolean
  customTitle?: string | null
  updatedBy?: string | null
  updatedAt?: string | null
}

export interface ChatGroupMediaItem {
  messageId: number
  senderId: string
  messageType: string
  createdAt: string
  attachmentPath: string
  attachmentUrl?: string
  thumbnailUrl?: string
  strippedThumbnailUrl?: string
  fileName?: string
  contentType?: string
  sizeBytes?: number
  isImage: boolean
  imageKeyVersion?: number
}

export interface ChatGroupMediaItemsResponse {
  items: ChatGroupMediaItem[]
  hasMore: boolean
  nextBeforeMessageId?: number | null
}

export interface ChatAdminLogItem {
  id: number
  chatId: number
  actorUserId?: string
  targetUserId?: string | null
  eventType: string
  detailsJson?: string
  createdAt: string
}

export interface ChatAdminLogResponse {
  items: ChatAdminLogItem[]
  hasMore: boolean
  nextBeforeId?: number | null
}

export interface ChatTopic {
  id: number
  chatId: number
  topMessageId?: number | null
  title: string
  iconEmoji?: string | null
  createdBy?: string
  closed: boolean
  pinned: boolean
  deleted: boolean
  createdAt?: string
  updatedAt?: string
}

export interface ChatTopicsResponse {
  items: ChatTopic[]
}

export interface ChatReactionItem {
  userId: string
  emoji: string
  createdAt?: string
}

export interface ChatMessageReactionsResponse {
  messageId: number
  total: number
  items: ChatReactionItem[]
}

export interface ChatPollOptionResult {
  optionIndex: number
  optionText: string
  votes: number
  votedByMe: boolean
  correct?: boolean | null
}

export interface ChatPoll {
  pollId: number
  messageId: number
  chatId: number
  createdBy?: string
  question: string
  allowsMultiple: boolean
  quiz?: boolean
  correctOptionIndex?: number | null
  explanation?: string | null
  anonymousVotes?: boolean
  closed: boolean
  createdAt?: string
  updatedAt?: string
  totalVotes: number
  votedByMe?: boolean
  myAnswerCorrect?: boolean | null
  options: ChatPollOptionResult[]
}

export interface ChatPollOptionVoter {
  userId: string
  username?: string | null
  displayName?: string | null
  votedAt?: string
}

export interface ChatPollOptionVoters {
  optionIndex: number
  optionText: string
  votes: number
  voters: ChatPollOptionVoter[]
}

export interface ChatPollVotersResponse {
  pollId: number
  anonymousVotes: boolean
  items: ChatPollOptionVoters[]
}

export interface SendMessageRequest {
  chatId: number
  topicId?: number
  content: string
  messageType?: 'text' | 'image' | 'images' | 'file' | 'files' | 'voice' | 'circle'
  images?: Array<{
    imagePath: string
    imageEncrypted?: boolean
    imageEncryptionIv?: string
    imageKeyVersion?: number
    width?: number
    height?: number
    fileName?: string
    contentType?: string
    sizeBytes?: number
    isImage?: boolean
  }>
  replyToId?: number
}

export interface SendMessageResponse {
  success: boolean
  messageId: number
  clientMessageId?: number
  serverTimestamp?: number
  sequenceNumber?: number
  groupingKey?: string
  images?: Array<{
    imagePath: string
    imageUrl: string
    thumbnailUrl?: string
    strippedThumbnailUrl?: string
    width?: number
    height?: number
    imageEncryptionIv?: string
    fileName?: string
    contentType?: string
    sizeBytes?: number
    isImage?: boolean
    imageKeyVersion?: number
  }>
}

export interface CreateChatRequest {
  participantId?: string
  participantIds?: string[]
  title?: string
  avatarPath?: string
  type?: 'PRIVATE' | 'GROUP'
}

export interface CreateChatResponse {
  chatId: number
  chatType: ChatType
  participantId?: string
  title?: string
  avatarPath?: string
  ownerId?: string
  memberCount?: number
  participantIds?: string[]
}

export interface UpdateGroupChatRequest {
  title?: string
  avatarPath?: string
  participantIds?: string[]
}

export interface UpdateGroupChatResponse {
  chatId: number
  chatType: ChatType
  participantId?: string
  title?: string
  avatarPath?: string
  ownerId?: string
  memberCount?: number
  participantIds?: string[]
}

export interface UploadImageResponse {
  success: boolean
  imagePath: string
  imageUrl: string
  thumbnailUrl?: string
  strippedThumbnailUrl?: string
  width?: number
  height?: number
  fileName?: string
  contentType?: string
  sizeBytes?: number
  isImage?: boolean
  // 🔐 Метаданные шифрования
  imageEncrypted?: boolean
  imageEncryptionIv?: string
  imageKeyVersion?: number
}

export interface MarkReadRequest {
  chatId: number
  lastReadMessageId: number
}

export interface ChatPresenceResponse {
  userId: string
  online: boolean
  lastSeenAt?: string | null
}

export interface ChatPresenceState {
  online: boolean
  lastSeenAt?: string | null
  resolved?: boolean
}

export interface PublicKeyRequest {
  publicKey: string
  keyType?: 'AES'
}

export interface PublicKeyResponse {
  userId: string
  publicKey: string
  keyType: string
}
