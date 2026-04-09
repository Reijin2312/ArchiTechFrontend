import { motion } from 'framer-motion'
import type { Friend, FriendRequest, PrivateChat, UserSearchResult } from '@/shared/api/types'

type ChatsListProps = {
  chats: PrivateChat[]
  friends: Friend[]
  incomingRequests: FriendRequest[]
  outgoingRequests: FriendRequest[]
  searchResults: UserSearchResult[]
  currentUserId: string
  onSelectChat: (chatId: number) => void
}

export function ChatsList({
  chats,
  friends,
  incomingRequests,
  outgoingRequests,
  searchResults,
  currentUserId,
  onSelectChat
}: ChatsListProps) {
  if (chats.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-6xl opacity-20 mb-3">рџ’¬</div>
        <p className="text-slate-400 text-sm">РќРµС‚ С‡Р°С‚РѕРІ</p>
        <p className="text-slate-500 text-xs mt-1">РћС‚РєСЂРѕР№С‚Рµ С‡Р°С‚ СЃ РґСЂСѓРіРѕРј</p>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      
      if (diffMins < 1) return 'РўРѕР»СЊРєРѕ С‡С‚Рѕ';
      if (diffMins < 60) return `${diffMins} РјРёРЅ. РЅР°Р·Р°Рґ`;
      
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} С‡. РЅР°Р·Р°Рґ`;
      
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return 'Р’С‡РµСЂР°';
      if (diffDays < 7) return `${diffDays} РґРЅ. РЅР°Р·Р°Рґ`;
      
      return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-2">
      {chats.map((chat) => {
        const friend = friends.find(f => f.userId === chat.participantId);
        const fallbackReq = incomingRequests.find(r => r.userId === chat.participantId) || outgoingRequests.find(r => r.userId === chat.participantId);
        const searchHit = searchResults.find(r => r.userId === chat.participantId);
        const displayName =
          friend?.displayName ||
          friend?.username ||
          fallbackReq?.displayName ||
          fallbackReq?.username ||
          searchHit?.displayName ||
          searchHit?.username ||
          chat.participantId.slice(0, 8);
        const avatarUrl = friend?.avatarUrl || fallbackReq?.avatarUrl || searchHit?.avatarUrl;
        const lastMsg = chat.lastMessage;
        const hasUnread = lastMsg && 
          lastMsg.senderId !== currentUserId && 
          !lastMsg.isRead;
        const isOutgoing = lastMsg?.senderId === currentUserId;

        return (
          <motion.div
            key={chat.chatId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => onSelectChat(chat.chatId)}
            className="group cursor-pointer flex items-center gap-3 p-3 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/70 hover:border-slate-700 transition-all"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-12 h-12 rounded-full object-cover border-2 border-slate-700/50"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-slate-800 border-2 border-slate-700/50 flex items-center justify-center text-slate-400 text-lg font-semibold">
                {displayName[0]?.toUpperCase()}
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className={`text-sm font-semibold truncate ${hasUnread ? 'text-white' : 'text-slate-200'}`}>
                  {displayName}
                </div>
                {lastMsg && (
                  <div className="flex flex-col items-end text-right leading-tight shrink-0">
                    <div className="text-xs text-slate-500">
                      {formatDate(lastMsg.createdAt)}
                    </div>
                    {isOutgoing && (
                      <div className="flex items-center gap-1 text-[10px] text-slate-500">
                        <svg className={`w-3.5 h-3.5 ${lastMsg.isRead ? 'text-indigo-400' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13l4 4L23 7" />
                        </svg>
                        <span>{lastMsg.isRead ? 'РїСЂРѕС‡РёС‚Р°РЅРѕ' : 'РѕС‚РїСЂР°РІР»РµРЅРѕ'}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {lastMsg ? (
                <div className="flex items-center gap-2">
                  <div className={`text-xs truncate flex-1 ${hasUnread ? 'text-slate-300 font-medium' : 'text-slate-400'}`}>
                    {lastMsg.content?.trim()
                      ? lastMsg.content
                      : (lastMsg.messageType === 'image' || lastMsg.messageType === 'images')
                        ? '🖼️ Изображение'
                        : (lastMsg.messageType === 'file' || lastMsg.messageType === 'files')
                          ? '📎 Файл'
                          : lastMsg.messageType === 'voice'
                            ? '🎤 Голосовое сообщение'
                            : lastMsg.messageType === 'circle'
                              ? '⭕ Видеосообщение'
                              : 'Новое сообщение'}
                  </div>
                  {hasUnread && (
                    <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 animate-pulse"></div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-slate-500">РќРµС‚ СЃРѕРѕР±С‰РµРЅРёР№</div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

