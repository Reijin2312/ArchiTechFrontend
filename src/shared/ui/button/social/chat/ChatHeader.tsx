import { http } from '@/shared/api/http';
import { endpoints } from '@/shared/api/endpoints';
import type { Friend } from '@/shared/api/types';
import type { SocialFloatingModel } from '../useSocialFloatingModel';

type ChatHeaderProps = {
  model: SocialFloatingModel;
  selectedChat: number;
  friend?: Friend;
  displayName: string;
  showBackButton: boolean;
};

export function ChatHeader({
  model,
  selectedChat,
  friend,
  displayName,
  showBackButton,
}: ChatHeaderProps) {
  const { setSelectedChat, setMessages, setChats, typingUsersByChat, presenceByUser } = model;

  const chatTypingUsers = typingUsersByChat[selectedChat] ?? [];
  const isFriendTyping = !!friend && chatTypingUsers.includes(friend.userId);
  const isFriendOnline = friend ? presenceByUser[friend.userId] : undefined;

  const statusText = isFriendTyping
    ? 'печатает...'
    : isFriendOnline === undefined
      ? friend?.username && friend.displayName
        ? `@${friend.username}`
        : ''
      : isFriendOnline
        ? 'онлайн'
        : 'не в сети';

  return (
        <div className="flex-none border-b border-slate-800/50 p-3 flex items-center gap-3 bg-slate-900/40">
          {showBackButton && (
            <button
              onClick={() => { setSelectedChat(null); setMessages([]); }}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              title="Назад к списку"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          
          {friend?.avatarUrl && (
            <img src={friend.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-slate-700/50 shadow-lg" />
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">{displayName}</div>
            {statusText ? <div className="text-xs text-slate-400 truncate">{statusText}</div> : null}
          </div>

          <button
            onClick={async () => {
              if (!confirm('Удалить чат? Все сообщения будут удалены.')) return;
              try {
                await http.delete(endpoints.chatDelete(selectedChat));
                setChats(prev => prev.filter(c => c.chatId !== selectedChat));
                setSelectedChat(null);
                setMessages([]);
              } catch (e) {
                console.error('Failed to delete chat:', e);
                alert('Ошибка удаления чата');
              }
            }}
            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all"
            title="Удалить чат"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
  );
}
