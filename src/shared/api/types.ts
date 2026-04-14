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
  localId?: string
  status?: 'pending' | 'sent' | 'delivered' | 'read'
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
  entities?: ChatMessageEntity[]
  imagePath?: string
  imageUrl?: string
  images?: Array<{
    imagePath: string
    imageUrl?: string
    thumbnailUrl?: string
    strippedThumbnailUrl?: string
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
  signatureTimestamp?: number
}

export type ChatType = 'PRIVATE' | 'GROUP'

export interface ChatConversation {
  chatId: number
  chatType: ChatType
  participantId?: string
  title?: string
  avatarPath?: string
  ownerId?: string
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

export interface SendMessageRequest {
  chatId: number
  content: string
  messageType?: 'text' | 'image' | 'images' | 'file' | 'files' | 'voice' | 'circle'
  imagePath?: string
  replyToId?: number
}

export interface SendMessageResponse {
  success: boolean
  messageId: number
  imageUrl?: string
  imageUrls?: Array<{
    imagePath: string
    imageUrl: string
    thumbnailUrl?: string
    strippedThumbnailUrl?: string
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
