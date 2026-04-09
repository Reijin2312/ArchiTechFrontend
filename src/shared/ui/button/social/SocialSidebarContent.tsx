import { AnimatePresence, motion } from 'framer-motion';
import { FriendsList } from './FriendsList';
import { SearchUsers } from './SearchUsers';
import { IncomingRequests } from './IncomingRequests';
import { OutgoingRequests } from './OutgoingRequests';
import { ChatsList } from './ChatsList';
import { SocialChatView } from './SocialChatView';
import type { SocialFloatingModel } from './useSocialFloatingModel';

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
                  ? 'bg-linear-to-br from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-500/30'
                  : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 border border-slate-700/50'
              }`}
            >
              Входящие {incomingCount > 0 && `(${incomingCount})`}
            </button>
            <button
              onClick={() => setRequestsSubTab('outgoing')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                requestsSubTab === 'outgoing'
                  ? 'bg-linear-to-br from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-500/30'
                  : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 border border-slate-700/50'
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
              <SocialChatView model={model} />
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
