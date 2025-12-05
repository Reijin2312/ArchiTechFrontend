export type Tokens = { accessToken : string; refreshToken: string }
export type User = { id : string; username: string; email: string }

export type LoginReq = { email: string; password: string }
// 🔐 PHASE 2 ACTIVE: Backend now returns sessionId, sessionKey, sessionKeyIv
export type LoginRes = Tokens & { 
  user: User;
  deviceId?: string;          // Device identifier for WS authentication
  sessionId?: string;          // Session ID for protocol validation (Phase 2)
  sessionKey?: string;         // Encrypted session key (safe to send)
  sessionKeyIv?: string;       // IV for session key decryption
}

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
  content: string  // ☁️ CLOUD MODEL: Plaintext content from server
  messageType: 'text' | 'image'
  imagePath?: string
  imageUrl?: string
  createdAt: string
  isRead?: boolean
  replyToId?: number
  replyToMessage?: ChatMessage
  edited?: boolean
  // 🔐 Key versions for tracking encrypted/decrypted state
  messageKeyVersion?: number
  imageKeyVersion?: number
  // 🔐 Protocol security metadata
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
  content: string  // ☁️ Plaintext content (server encrypts before storage)
  messageType?: 'text' | 'image'
  imagePath?: string
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