export type Tokens = { accessToken : string; refreshToken: string }
export type User = { id : string; username: string; email: string }

export type LoginReq = { email: string; password: string }
export type LoginRes = Tokens & { user: User }

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

export interface ChatMessage {
  messageId: number
  senderId: string
  encryptedContent: string
  messageType: 'text' | 'image'
  imagePath?: string
  imageUrl?: string
  encryptionMetadata?: string
  createdAt: string
  isRead?: boolean
  replyToId?: number
  replyToMessage?: ChatMessage
  edited?: boolean
  // 🔐 Версии ключей и HMAC для проверки целостности
  messageKeyVersion?: number
  imageKeyVersion?: number
  messageHmac?: string
  sequenceNumber?: number
  signatureTimestamp?: number
}

export interface PrivateChat {
  chatId: number
  participantId: string
  lastMessage?: ChatMessage
  createdAt: string
}

export interface ChatListResponse {
  chats: PrivateChat[]
}

export interface ChatMessagesResponse {
  messages: ChatMessage[]
}

export interface SendMessageRequest {
  chatId: number
  encryptedContent: string
  messageType?: 'text' | 'image'
  imagePath?: string
  encryptionMetadata?: Record<string, any>
  replyToId?: number
}

export interface SendMessageResponse {
  success: boolean
  messageId: number
}

export interface CreateChatRequest {
  participantId: string
}

export interface CreateChatResponse {
  chatId: number
  participantId: string
}

export interface UploadImageResponse {
  success: boolean
  imagePath: string
  imageUrl: string
  // 🔐 Метаданные шифрования
  imageEncrypted?: boolean
  imageEncryptionIv?: string
  imageKeyVersion?: number
}

export interface MarkReadRequest {
  chatId: number
  lastReadMessageId: number
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