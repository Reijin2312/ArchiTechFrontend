import { http } from '@/shared/api/http';
import { endpoints } from '@/shared/api/endpoints';
import type { Friend, PrivateChat } from '@/shared/api/types';
import type { SocialFloatingModel } from '../useSocialFloatingModel';

type ChatHeaderProps = {
  model: SocialFloatingModel;
  selectedChat: number;
  chat?: PrivateChat;
  friend?: Friend;
  displayName: string;
  showBackButton: boolean;
};

const iconButtonClass =
  'inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-300 transition-colors hover:bg-slate-800/80 hover:text-white';

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

export function ChatHeader({
  model,
  selectedChat,
  chat,
  friend,
  displayName,
  showBackButton,
}: ChatHeaderProps) {
  const { user, setSelectedChat, setMessages, setChats, typingUsersByChat, presenceByUser } = model;

  const chatTypingUsers = typingUsersByChat[selectedChat] ?? [];
  const isGroupChat = chat?.chatType === 'GROUP';
  const memberCount =
    chat?.memberCount ?? (Array.isArray(chat?.participantIds) ? chat?.participantIds.length : undefined);
  const isFriendTyping = !!friend && chatTypingUsers.includes(friend.userId);
  const isFriendOnline = friend ? presenceByUser[friend.userId] : undefined;
  const groupTypingCount = chatTypingUsers.filter((id) => id !== user?.id).length;
  const groupStatus =
    groupTypingCount > 0
      ? `${groupTypingCount} typing...`
      : `${memberCount ?? 1} ${(memberCount ?? 1) === 1 ? 'member' : 'members'}`;
  const chatAvatarUrl = isGroupChat ? resolveAvatarUrl(chat?.avatarPath) : friend?.avatarUrl;

  const statusText = isGroupChat
    ? groupStatus
    : isFriendTyping
      ? 'typing...'
      : isFriendOnline === undefined
        ? friend?.username && friend.displayName
          ? `@${friend.username}`
          : 'recently active'
        : isFriendOnline
          ? 'online'
          : 'last seen recently';

  return (
    <div className="flex-none border-b border-slate-800/80 bg-slate-900/95 px-3 py-2.5 sm:px-4">
      <div className="flex items-center gap-3">
        {showBackButton ? (
          <button
            type="button"
            onClick={() => {
              setSelectedChat(null);
              setMessages([]);
            }}
            className={`${iconButtonClass} lg:hidden`}
            title="Back to chat list"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        ) : null}

        {chatAvatarUrl ? (
          <img
            src={chatAvatarUrl}
            alt={displayName}
            className="h-11 w-11 rounded-full border border-slate-700/70 object-cover"
          />
        ) : (
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-700/70 bg-slate-800 text-sm font-semibold text-slate-300">
            {displayName[0]?.toUpperCase() || '?'}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="truncate text-[17px] font-semibold text-slate-100">{displayName}</div>
          <div className="truncate text-xs text-slate-400">{statusText}</div>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <button type="button" className={iconButtonClass} title="Call">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 5.75A2.75 2.75 0 0 1 5.75 3h1.1a2 2 0 0 1 1.95 1.56l.58 2.62a2 2 0 0 1-.58 1.84l-1.07 1.07a15.05 15.05 0 0 0 6.2 6.2l1.06-1.07a2 2 0 0 1 1.84-.58l2.63.58a2 2 0 0 1 1.55 1.95v1.1A2.75 2.75 0 0 1 18.25 21h-.5C9.6 21 3 14.4 3 6.25v-.5Z"
              />
            </svg>
          </button>

          <button type="button" className={iconButtonClass} title="Search">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
              />
            </svg>
          </button>

          <button
            type="button"
            onClick={async () => {
              if (!confirm('Delete this chat and all messages?')) return;
              try {
                await http.delete(endpoints.chatDelete(selectedChat));
                setChats((prev) => prev.filter((chat) => chat.chatId !== selectedChat));
                setSelectedChat(null);
                setMessages([]);
              } catch (error) {
                console.error('Failed to delete chat:', error);
                alert('Could not delete chat');
              }
            }}
            className={iconButtonClass}
            title="Delete chat"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 7h12m-9 0V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0 1 12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2l1-12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
