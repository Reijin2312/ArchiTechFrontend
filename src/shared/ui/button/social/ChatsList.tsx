import { motion } from 'framer-motion';
import type { Friend, FriendRequest, PrivateChat, UserSearchResult } from '@/shared/api/types';

type ChatsListProps = {
  chats: PrivateChat[];
  friends: Friend[];
  incomingRequests: FriendRequest[];
  outgoingRequests: FriendRequest[];
  searchResults: UserSearchResult[];
  currentUserId: string;
  onSelectChat: (chatId: number) => void;
  selectedChatId?: number | null;
};

export function ChatsList({
  chats,
  friends,
  incomingRequests,
  outgoingRequests,
  searchResults,
  currentUserId,
  onSelectChat,
  selectedChatId = null,
}: ChatsListProps) {
  const resolveAvatarUrl = (avatarPath?: string): string | undefined => {
    if (!avatarPath) return undefined;
    const normalized = avatarPath.trim();
    if (!normalized) return undefined;
    if (
      normalized.startsWith('http://') ||
      normalized.startsWith('https://') ||
      normalized.startsWith('data:') ||
      normalized.startsWith('blob:') ||
      normalized.startsWith('/media/')
    ) {
      return normalized;
    }
    return `/media/${normalized}`;
  };

  if (chats.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-slate-400">No chats yet</p>
        <p className="mt-1 text-xs text-slate-500">Open a chat with a friend to start</p>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));

      if (diffMins < 1) return 'now';
      if (diffMins < 60) return `${diffMins}m`;

      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h`;

      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return 'yesterday';
      if (diffDays < 7) return `${diffDays}d`;

      return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-1.5">
      {chats.map((chat) => {
        const isGroupChat = chat.chatType === 'GROUP';
        const privateParticipantId = chat.participantId;
        const friend =
          !isGroupChat && privateParticipantId
            ? friends.find((item) => item.userId === privateParticipantId)
            : undefined;
        const fallbackReq =
          !isGroupChat && privateParticipantId
            ? incomingRequests.find((item) => item.userId === privateParticipantId) ||
              outgoingRequests.find((item) => item.userId === privateParticipantId)
            : undefined;
        const searchHit =
          !isGroupChat && privateParticipantId
            ? searchResults.find((item) => item.userId === privateParticipantId)
            : undefined;
        const displayName = isGroupChat
          ? chat.title?.trim() || `Group #${chat.chatId}`
          : friend?.displayName ||
            friend?.username ||
            fallbackReq?.displayName ||
            fallbackReq?.username ||
            searchHit?.displayName ||
            searchHit?.username ||
            privateParticipantId?.slice(0, 8) ||
            'Private chat';
        const avatarUrl = isGroupChat
          ? resolveAvatarUrl(chat.avatarPath)
          : friend?.avatarUrl || fallbackReq?.avatarUrl || searchHit?.avatarUrl;
        const lastMsg = chat.lastMessage;
        const hasUnread = lastMsg && lastMsg.senderId !== currentUserId && !lastMsg.isRead;
        const isOutgoing = lastMsg?.senderId === currentUserId;
        const isSelected = selectedChatId === chat.chatId;
        const senderFriend =
          lastMsg?.senderId
            ? friends.find((item) => item.userId === lastMsg.senderId) ||
              incomingRequests.find((item) => item.userId === lastMsg.senderId) ||
              outgoingRequests.find((item) => item.userId === lastMsg.senderId) ||
              searchResults.find((item) => item.userId === lastMsg.senderId)
            : undefined;
        const senderName =
          !lastMsg
            ? null
            : lastMsg.senderId === currentUserId
              ? 'Вы'
              : lastMsg.senderDisplayName?.trim() ||
                lastMsg.senderUsername?.trim() ||
                senderFriend?.displayName ||
                senderFriend?.username ||
                (!isGroupChat && lastMsg.senderId === privateParticipantId ? displayName : undefined) ||
                lastMsg.senderId.slice(0, 8);
        const previewText =
          !lastMsg
            ? ''
            : lastMsg.content?.trim()
              ? lastMsg.content
              : lastMsg.messageType === 'image' || lastMsg.messageType === 'images'
                ? 'Photo'
                : lastMsg.messageType === 'file' || lastMsg.messageType === 'files'
                  ? 'File'
                  : lastMsg.messageType === 'voice'
                    ? 'Voice message'
                    : lastMsg.messageType === 'circle'
                      ? 'Video message'
                      : 'Message';
        const preview = lastMsg && senderName ? `${senderName}: ${previewText}` : previewText;

        return (
          <motion.button
            key={chat.chatId}
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => onSelectChat(chat.chatId)}
            className={[
              'group flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition-all',
              isSelected
                ? 'border-sky-500/50 bg-sky-500/20'
                : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/70',
            ].join(' ')}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="h-12 w-12 rounded-full border border-slate-700/70 object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-700/70 bg-slate-800 text-lg font-semibold text-slate-300">
                {displayName[0]?.toUpperCase()}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="mb-0.5 flex items-start justify-between gap-2">
                <div
                  className={`truncate text-sm font-semibold ${hasUnread || isSelected ? 'text-white' : 'text-slate-200'}`}
                >
                  {displayName}
                </div>
                {lastMsg ? (
                  <div className="shrink-0 text-right">
                    <div className="text-[11px] text-slate-500">{formatDate(lastMsg.createdAt)}</div>
                    {isOutgoing ? (
                      <div className={`text-[10px] ${lastMsg.isRead ? 'text-sky-300' : 'text-slate-500'}`}>
                        {lastMsg.isRead ? 'read' : 'sent'}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {lastMsg ? (
                <div className="flex items-center gap-2">
                  <div
                    className={`flex-1 truncate text-xs ${hasUnread ? 'font-medium text-slate-200' : 'text-slate-400'}`}
                  >
                    {preview}
                  </div>
                  {hasUnread ? (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-sky-400" />
                  ) : null}
                </div>
              ) : (
                <div className="text-xs text-slate-500">No messages yet</div>
              )}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
