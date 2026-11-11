import { useEffect, useRef } from 'react';
import type { SocialFloatingModel } from './useSocialFloatingModel';
import type { ChatMessage } from '@/shared/api/types';

type Props = { model: SocialFloatingModel; showBackButton?: boolean };

export function SocialChatView({ model, showBackButton = true }: Props) {
  const endRef = useRef<HTMLDivElement>(null);
  const chat = model.chats.find(c => c.chatId === model.selectedChat);
  const global = chat?.chatType === 'GROUP';
  const person = model.friends.find(f => f.userId === chat?.participantId);
  const title = global ? 'Общий чат ArchiTech'
    : (person?.displayName || person?.username || chat?.title || 'Личные сообщения');
  const messages = model.messages.filter(m => m.messageType === 'text');
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [model.selectedChat, messages.length]);
  if (!model.selectedChat) {
    return <div className="p-5 text-center text-sm text-[#aaa598]">Выберите переписку</div>;
  }
  const yours = (m: ChatMessage) => m.senderId === model.userId;
  const onSend = () => {
    if (model.messageInput.trim()) void model.sendChatMessage();
  };
  return (
    <div className="flex h-full min-h-0 flex-col bg-[#1c1e1a]">
      <div className="flex shrink-0 items-center gap-3 border-b border-[#3c3d35] px-4 py-3">
        {showBackButton && (
          <button type="button" aria-label="К списку чатов"
            className="rounded-md px-2 py-1 text-[#c5aa84] hover:bg-[#30322c]"
            onClick={() => model.setSelectedChat(null)}>←</button>
        )}
        <div className="min-w-0 flex-1 truncate text-sm font-semibold text-[#f2efe9]">{title}</div>
        {global && <span className="text-[11px] text-[#aaa598]">Minecraft + сайт</span>}
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-4">
        {messages.length === 0 && (
          <p className="py-8 text-center text-xs text-[#aaa598]">Пока нет сообщений</p>
        )}
        {messages.map(m => (
          <div key={m.messageId}
            className={yours(m) ? 'group flex flex-col items-end' : 'group flex flex-col items-start'}>
            <div className={yours(m)
              ? 'max-w-[90%] rounded-xl bg-[#3b382e] px-3 py-2'
              : 'max-w-[90%] rounded-xl bg-[#292b26] px-3 py-2'}>
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold text-[#d5bd99]">
                  {yours(m) ? 'Вы' : (m.senderDisplayName || m.senderUsername || 'Игрок')}
                </span>
                <span className="text-[10px] text-[#938e83]">
                  {m.createdAt ? new Date(m.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : ''}
                  {m.edited ? ' · изм.' : ''}
                </span>
              </div>
              {m.replyToMessage && (
                <div className="mb-1 border-l-2 border-[#ab916e] pl-2 text-xs text-[#aaa598]">
                  {m.replyToMessage.content}
                </div>
              )}
              <p className="whitespace-pre-wrap break-words text-sm leading-5 text-[#eee9e0]">{m.content}</p>
              <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-[#a79a85] opacity-80 group-hover:opacity-100">
                <button type="button" onClick={() => model.setReplyingTo(m)}
                  className="hover:text-[#e9d7b8]">Ответить</button>
                <button type="button" onClick={() => { void navigator.clipboard?.writeText(m.content); }}
                  className="hover:text-[#e9d7b8]">Копировать</button>
                <button type="button" onClick={() => {
                  if (typeof m.messageId === 'number' && model.selectedChat) {
                    void model.toggleMessageReaction(model.selectedChat, m.messageId, '👍');
                  }
                }} className="hover:text-[#e9d7b8]">👍</button>
                {yours(m) && (
                  <>
                    <button type="button" onClick={() => {
                      model.setEditingMessage(m);
                      model.setMessageInput(m.content);
                    }} className="hover:text-[#e9d7b8]">Изменить</button>
                    <button type="button" onClick={() => { void model.deleteMessage(m.messageId); }}
                      className="hover:text-[#d8a5a0]">Удалить</button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      {model.replyingTo && (
        <div className="flex items-center justify-between gap-2 border-t border-[#3c3d35] bg-[#262820] px-3 py-2 text-xs">
          <span className="min-w-0 truncate text-[#c9b594]">Ответ: {model.replyingTo.content}</span>
          <button type="button" onClick={() => model.setReplyingTo(null)} aria-label="Отменить ответ">✕</button>
        </div>
      )}
      {model.editingMessage && (
        <div className="flex items-center justify-between gap-2 border-t border-[#3c3d35] bg-[#262820] px-3 py-2 text-xs">
          <span className="text-[#c9b594]">Редактирование сообщения</span>
          <button type="button" onClick={() => {
            model.setEditingMessage(null);
            model.setMessageInput('');
          }} aria-label="Отменить изменение">✕</button>
        </div>
      )}
      <form onSubmit={e => { e.preventDefault(); onSend(); }}
        className="flex shrink-0 gap-2 border-t border-[#3c3d35] bg-[#23251f] p-3">
        <textarea value={model.messageInput}
          onChange={e => model.setMessageInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          maxLength={256} rows={2}
          placeholder={global ? 'Сообщение всем игрокам…' : 'Написать сообщение…'}
          className="min-h-11 max-h-24 min-w-0 flex-1 resize-none rounded-lg border border-[#46463b] bg-[#1b1d19] px-3 py-2 text-sm text-[#f2efe9] outline-none placeholder:text-[#898679] focus:border-[#bda27c]"
        />
        <button type="submit" disabled={!model.messageInput.trim()}
          className="self-end rounded-lg bg-[#c5aa84] px-3 py-2.5 text-sm font-semibold text-[#221f19] transition-colors hover:bg-[#dfc49d] disabled:opacity-50">
          Отправить
        </button>
      </form>
    </div>
  );
}
