import { motion, AnimatePresence } from 'framer-motion';
import { SocialChatView } from './social/SocialChatView';
import { SocialSidebarTabs } from './social/SocialSidebarTabs';
import { SocialSidebarContent } from './social/SocialSidebarContent';
import { useSocialFloatingModel } from './social/useSocialFloatingModel';

export function SocialFloatingButton() {
  const model = useSocialFloatingModel();

  const incomingCount = model.incomingRequests.length;
  const outgoingCount = model.outgoingRequests.length;
  const hasNotifications = incomingCount > 0;

  return (
    <>
      <AnimatePresence>
        {model.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
            onClick={model.closeMessenger}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {model.isOpen && (
          <motion.div
            initial={model.isFullscreen ? { opacity: 0, scale: 0.98 } : { opacity: 0, x: 400, y: 50 }}
            animate={model.isFullscreen ? { opacity: 1, scale: 1 } : { opacity: 1, x: 0, y: 0 }}
            exit={model.isFullscreen ? { opacity: 0, scale: 0.98 } : { opacity: 0, x: 400, y: 50 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={model.isFullscreen
              ? 'fixed inset-0 z-50'
              : 'fixed bottom-24 right-6 w-96 max-w-[calc(100vw-3rem)] h-[600px] max-h-[calc(100vh-8rem)] z-50'}
          >
            <div className={`h-full flex flex-col border border-slate-800 bg-slate-950/95 backdrop-blur-xl shadow-2xl overflow-hidden ${model.isFullscreen ? 'rounded-none' : 'rounded-2xl'}`}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/60">
                <h2 className="text-lg font-semibold">Friends</h2>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => model.setIsFullscreen(prev => !prev)}
                    className="p-1 hover:bg-slate-800 rounded-lg transition-colors"
                    aria-label={model.isFullscreen ? 'Minimize window' : 'Fullscreen'}
                    title={model.isFullscreen ? 'Minimize window' : 'Fullscreen'}
                  >
                    {model.isFullscreen ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9H4V4m11 0h5v5m0 6v5h-5m-6 0H4v-5" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 4H4v4m16 0V4h-4m0 16h4v-4M4 16v4h4" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={model.closeMessenger}
                    className="p-1 hover:bg-slate-800 rounded-lg transition-colors"
                    aria-label="Close"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {model.isFullscreen ? (
                <div className="flex flex-1 min-h-0 max-lg:flex-col">
                  <div className="w-[360px] min-w-[300px] max-w-[38vw] border-r border-slate-800 bg-slate-950/80 flex flex-col max-lg:w-full max-lg:min-w-0 max-lg:max-w-none max-lg:h-[45%] max-lg:border-r-0 max-lg:border-b">
                    <SocialSidebarTabs
                      model={model}
                      incomingCount={incomingCount}
                      outgoingCount={outgoingCount}
                      hasNotifications={hasNotifications}
                    />
                    <div className="flex-1 overflow-hidden">
                      <SocialSidebarContent model={model} forceChatList />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 bg-slate-950/40">
                    {model.selectedChat ? (
                      <div className="h-full flex flex-col overflow-hidden">
                        <SocialChatView model={model} showBackButton={false} />
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center p-8 text-center">
                        <div className="max-w-md space-y-3">
                          <div className="text-6xl opacity-20">CHAT</div>
                          <p className="text-lg font-medium text-slate-200">Select a chat on the left</p>
                          <p className="text-sm text-slate-400">Open the Chat tab and pick any contact.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <SocialSidebarTabs
                    model={model}
                    incomingCount={incomingCount}
                    outgoingCount={outgoingCount}
                    hasNotifications={hasNotifications}
                  />
                  <div className="flex-1 overflow-hidden">
                    <SocialSidebarContent model={model} />
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!model.isFullscreen && (
        <motion.button
          onClick={() =>
            model.setIsOpen((prev) => {
              const next = !prev;
              if (next) {
                model.setActiveTab('chat');
                void model.requestDesktopNotificationPermission();
              }
              return next;
            })
          }
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Open social panel"
        >
          {hasNotifications && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center text-xs font-bold">
              {incomingCount}
            </span>
          )}
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </motion.button>
      )}

      {model.contextMenu && (
        <div
          className="fixed z-100 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 min-w-[180px]"
          style={{
            left: `${model.contextMenu.x}px`,
            top: `${model.contextMenu.y}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              model.copyMessageText(model.contextMenu?.message.content || '');
              model.setContextMenu(null);
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-slate-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy
          </button>

          <button
            onClick={() => {
              if (model.contextMenu) {
                model.setReplyingTo(model.contextMenu.message);
              }
              model.setContextMenu(null);
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-slate-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            Reply
          </button>

          {model.contextMenu.message.senderId === model.user?.id && model.contextMenu.message.messageType === 'text' && (
            <button
              onClick={() => {
                if (model.contextMenu) {
                  model.setEditingMessage(model.contextMenu.message);
                  model.setMessageInput(model.contextMenu.message.content || '');
                }
                model.setContextMenu(null);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-slate-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
          )}

          {model.contextMenu.message.senderId === model.user?.id && (
            <button
              onClick={() => {
                const ctx = model.contextMenu;
                if (!ctx) return;
                model.deleteMessage(ctx.message.messageId);
                model.setContextMenu(null);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          )}
        </div>
      )}
    </>
  );
}
