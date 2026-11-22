import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FriendsList } from './FriendsList';
import { SearchUsers } from './SearchUsers';
import { IncomingRequests } from './IncomingRequests';
import { OutgoingRequests } from './OutgoingRequests';
import { ChatsList } from './ChatsList';
import type { SocialFloatingModel } from './useSocialFloatingModel';
import { useI18n } from '@/shared/i18n/I18nProvider';

function CompactChatView({ model }: { model: SocialFloatingModel }) {
  const { language } = useI18n();
  const copy = language === 'ru'
    ? { chat: 'Чат', back: 'Назад к чатам', actions: 'Действия', full: 'Открыть полный чат', profile: 'Открыть профиль', message: 'Сообщение', send: 'Отправить', attachment: 'Вложение' }
    : { chat: 'Chat', back: 'Back to chats', actions: 'Actions', full: 'Open full chat', profile: 'Open profile', message: 'Message', send: 'Send', attachment: 'Attachment' };
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const chat = model.chats.find((item) => item.chatId === model.selectedChat);
  const participant = model.friends.find((item) => item.userId === chat?.participantId);
  const title = chat?.title?.trim() || participant?.displayName || participant?.username || copy.chat;
  const avatarUrl = chat?.chatType === 'GROUP' ? chat.avatarPath : participant?.avatarUrl;

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#171816]">
      <div className="flex items-center gap-3 border-b border-[#c5aa84]/20 px-3 py-3">
        <button
          type="button"
          onClick={() => model.setSelectedChat(null)}
          className="grid h-9 w-9 place-items-center rounded-full border border-[#c5aa84]/25 text-[#e8ddcc] hover:bg-[#c5aa84]/10"
          aria-label={copy.back}
        >
          ←
        </button>
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-9 w-9 shrink-0 rounded-full border border-[#c5aa84]/30 object-cover" />
        ) : (
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#c5aa84]/25 bg-[#34362f] text-sm font-semibold text-[#d8bc91]">
            {title.slice(0, 1).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1 truncate font-semibold text-[#f3ede4]">{title}</div>
        <div className="relative" ref={menuRef}>
          <button type="button" onClick={() => setMenuOpen((value) => !value)} className="grid h-9 w-9 place-items-center rounded-full text-[#d8bc91] transition hover:bg-[#c5aa84]/10" aria-label={copy.actions}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg>
          </button>
          {menuOpen ? (
            <div className="absolute right-0 top-[calc(100%+8px)] z-20 min-w-44 rounded-xl border border-[#c5aa84]/25 bg-[#22231f] p-1.5 shadow-2xl">
              <a href="/chat" className="block rounded-lg px-3 py-2 text-sm text-[#eee7dd] transition hover:bg-[#c5aa84]/10">{copy.full}</a>
              {participant?.username ? (
                <a href={`/u/${encodeURIComponent(participant.username)}`} className="block rounded-lg px-3 py-2 text-sm text-[#eee7dd] transition hover:bg-[#c5aa84]/10">{copy.profile}</a>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {model.messages.map((message) => {
          const own = message.senderId === model.userId;
          const attachment = message.messageType === 'image' || message.messageType === 'images';
          return (
            <div key={String(message.messageId)} className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm ${own
                ? 'bg-[#8f714d] text-white'
                : 'border border-[#c5aa84]/18 bg-[#22241f] text-[#eee7dd]'}`}>
                {!own && message.senderDisplayName ? (
                  <div className="mb-1 text-[11px] font-semibold text-[#c5aa84]">{message.senderDisplayName}</div>
                ) : null}
                {message.content ? <div className="whitespace-pre-wrap break-words">{message.content}</div> : null}
                {attachment ? <div className="mt-1 text-xs opacity-70">[{copy.attachment}]</div> : null}
              </div>
            </div>
          );
        })}
        <div ref={model.messagesEndRef} />
      </div>
      <form
        className="flex gap-2 border-t border-[#c5aa84]/20 p-3"
        onSubmit={(event) => {
          event.preventDefault();
          void model.sendChatMessage();
        }}
      >
        <textarea
          value={model.messageInput}
          onChange={(event) => model.setMessageInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              void model.sendChatMessage();
            }
          }}
          rows={1}
          placeholder={copy.message}
          className="min-h-10 flex-1 resize-none rounded-xl border border-[#c5aa84]/25 bg-[#11120f] px-3 py-2 text-sm text-white outline-none placeholder:text-[#817c72] focus:border-[#c5aa84]/60"
        />
        <button type="submit" className="rounded-xl bg-[#c5aa84] px-4 text-sm font-semibold text-[#171816] hover:bg-[#d4b98f]">
          {copy.send}
        </button>
      </form>
    </div>
  );
}

type SocialSidebarContentProps = {
  model: SocialFloatingModel;
  forceChatList?: boolean;
  forceChatOnly?: boolean;
};

export function SocialSidebarContent({
  model,
  forceChatList = false,
  forceChatOnly = false,
}: SocialSidebarContentProps) {
  const {
    activeTab,
    friends,
    removeFriend,
    openChatWith,
    searchQuery,
    setSearchQuery,
    searchResults,
    loading,
    sendFriendRequest,
    cancelRequest,
    requestsSubTab,
    setRequestsSubTab,
    incomingRequests,
    acceptRequest,
    rejectRequest,
    outgoingRequests,
    chats,
    userId,
    selectedChat,
    setSelectedChat,
    loadMessages,
  } = model;

  const incomingCount = incomingRequests.length;
  const outgoingCount = outgoingRequests.length;

  return (

    <AnimatePresence mode="wait">
      {!forceChatOnly && activeTab === 'friends' && (
        <motion.div
          key="friends"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.15 }}
          className="h-full overflow-y-auto p-3"
        >
          <FriendsList friends={friends} onRemove={removeFriend} onOpenChat={openChatWith} />
        </motion.div>
      )}

      {!forceChatOnly && activeTab === 'search' && (
        <motion.div
          key="search"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.15 }}
          className="h-full overflow-y-auto p-3"
        >
          <SearchUsers
            query={searchQuery}
            onQueryChange={setSearchQuery}
            results={searchResults}
            loading={loading}
            onSendRequest={sendFriendRequest}
            onCancelRequest={cancelRequest}
          />
        </motion.div>
      )}

      {!forceChatOnly && activeTab === 'requests' && (
        <motion.div
          key="requests"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.15 }}
          className="h-full overflow-y-auto p-3"
        >
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setRequestsSubTab('incoming')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                requestsSubTab === 'incoming'
                  ? 'bg-[#c5aa84] text-[#211f1b]'
                  : 'border border-[#c5aa84]/20 bg-[#22231f] text-[#c9c3b8] hover:bg-[#c5aa84]/10'
              }`}
            >
              Входящие {incomingCount > 0 && `(${incomingCount})`}
            </button>
            <button
              onClick={() => setRequestsSubTab('outgoing')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                requestsSubTab === 'outgoing'
                  ? 'bg-[#c5aa84] text-[#211f1b]'
                  : 'border border-[#c5aa84]/20 bg-[#22231f] text-[#c9c3b8] hover:bg-[#c5aa84]/10'
              }`}
            >
              Исходящие {outgoingCount > 0 && `(${outgoingCount})`}
            </button>
          </div>
          
          {requestsSubTab === 'incoming' ? (
            <IncomingRequests
              requests={incomingRequests}
              onAccept={acceptRequest}
              onReject={rejectRequest}
            />
          ) : (
            <OutgoingRequests
              requests={outgoingRequests}
              onCancel={cancelRequest}
            />
          )}
        </motion.div>
      )}
      {(forceChatOnly || activeTab === 'chat') && (
        <motion.div
          key="chat"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.15 }}
          className="h-full flex flex-col overflow-hidden"
        >
          {!selectedChat || forceChatList ? (
            <div className="h-full overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-[#6f624f] scrollbar-track-transparent">
              <ChatsList
                chats={chats}
                friends={friends}
                incomingRequests={incomingRequests}
                outgoingRequests={outgoingRequests}
                searchResults={searchResults}
                currentUserId={userId}
                onSelectChat={(chatId) => { setSelectedChat(chatId); loadMessages(chatId); }}
              />
            </div>
          ) : (
            <div className="h-full flex flex-col overflow-hidden">
              <CompactChatView model={model} />
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
