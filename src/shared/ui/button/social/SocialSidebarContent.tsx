import { AnimatePresence, motion } from 'framer-motion';
import { FriendsList } from './FriendsList';
import { SearchUsers } from './SearchUsers';
import { IncomingRequests } from './IncomingRequests';
import { OutgoingRequests } from './OutgoingRequests';
import { ChatsList } from './ChatsList';
import type { SocialFloatingModel } from './useSocialFloatingModel';

function CompactChatView({ model }: { model: SocialFloatingModel }) {
  const chat = model.chats.find((item) => item.chatId === model.selectedChat);
  const participant = model.friends.find((item) => item.userId === chat?.participantId);
  const title = chat?.title?.trim() || participant?.displayName || participant?.username || 'Chat';

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#171816]">
      <div className="flex items-center gap-3 border-b border-[#c5aa84]/20 px-3 py-3">
        <button
          type="button"
          onClick={() => model.setSelectedChat(null)}
          className="grid h-9 w-9 place-items-center rounded-full border border-[#c5aa84]/25 text-[#e8ddcc] hover:bg-[#c5aa84]/10"
          aria-label="Back to chats"
        >
          ←
        </button>
        <div className="min-w-0 flex-1 truncate font-semibold text-[#f3ede4]">{title}</div>
        <a href="/chat" className="text-xs text-[#c5aa84] hover:text-[#ead4b3]">Open full chat</a>
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
                {attachment ? <div className="mt-1 text-xs opacity-70">[Attachment]</div> : null}
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
          placeholder="Message"
          className="min-h-10 flex-1 resize-none rounded-xl border border-[#c5aa84]/25 bg-[#11120f] px-3 py-2 text-sm text-white outline-none placeholder:text-[#817c72] focus:border-[#c5aa84]/60"
        />
        <button type="submit" className="rounded-xl bg-[#c5aa84] px-4 text-sm font-semibold text-[#171816] hover:bg-[#d4b98f]">
          Send
        </button>
      </form>
    </div>
  );
}

type SocialSidebarContentProps = {
  model: SocialFloatingModel;
  forceChatList?: boolean;
};

export function SocialSidebarContent({
  model,
  forceChatList = false,
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
      {activeTab === 'friends' && (
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

      {activeTab === 'search' && (
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

      {activeTab === 'requests' && (
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
      {activeTab === 'chat' && (
        <motion.div
          key="chat"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.15 }}
          className="h-full flex flex-col overflow-hidden"
        >
          {!selectedChat || forceChatList ? (
            <div className="h-full overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
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
