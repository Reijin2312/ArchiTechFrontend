import { useEffect, useRef, useState, type RefObject } from 'react';
import { CloseIcon, MoreVerticalIcon, SearchIcon } from '../icons';
import type { SidebarChat } from '../types';
import { Avatar } from './Avatar';
import { useI18n } from '@/shared/i18n/I18nProvider';

type ChatHeaderProps = {
  selectedChat?: SidebarChat;
  selectedStatus: string;
  isGroupInfoOpen: boolean;
  menuOpen: boolean;
  setMenuOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
  menuRef: RefObject<HTMLDivElement | null>;
  isMessageSearchOpen: boolean;
  messageSearchQuery: string;
  messageSearchMatchesCount: number;
  messageSearchCurrentIndex: number;
  onToggleMessageSearch: () => void;
  onCloseMessageSearch: () => void;
  onMessageSearchQueryChange: (value: string) => void;
  onPrevMessageSearchResult: () => void;
  onNextMessageSearchResult: () => void;
  onToggleGroupInfo: () => void;
  onNavigateHome: () => void;
};

function UpIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="m6 15 6-6 6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DownIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChatHeader({
  selectedChat,
  selectedStatus,
  isGroupInfoOpen,
  menuOpen,
  setMenuOpen,
  menuRef,
  isMessageSearchOpen,
  messageSearchQuery,
  messageSearchMatchesCount,
  messageSearchCurrentIndex,
  onToggleMessageSearch,
  onCloseMessageSearch,
  onMessageSearchQueryChange,
  onPrevMessageSearchResult,
  onNextMessageSearchResult,
  onToggleGroupInfo,
  onNavigateHome,
}: ChatHeaderProps) {
  const { language } = useI18n();
  const copy = language === 'ru'
    ? { select: 'Выберите чат', inactive: 'Чат не выбран', search: 'Поиск в чате', previous: 'Предыдущее совпадение', next: 'Следующее совпадение', closeSearch: 'Закрыть поиск', menu: 'Меню чата', home: 'На главную', hideInfo: 'Скрыть информацию о группе', showInfo: 'Показать информацию о группе' }
    : { select: 'Select chat', inactive: 'No active chat', search: 'Search in chat', previous: 'Previous message match', next: 'Next message match', closeSearch: 'Close message search', menu: 'Chat menu', home: 'Home', hideInfo: 'Hide group info', showInfo: 'Show group info' };
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [typingDots, setTypingDots] = useState(0);
  const isTypingStatus = /\btyping$/i.test(selectedStatus);
  const renderedStatus = isTypingStatus ? `${selectedStatus}${'.'.repeat(typingDots)}` : selectedStatus;

  useEffect(() => {
    if (!isMessageSearchOpen) return;
    searchInputRef.current?.focus();
  }, [isMessageSearchOpen]);

  useEffect(() => {
    if (!isTypingStatus) {
      setTypingDots(0);
      return;
    }

    const timerId = window.setInterval(() => {
      setTypingDots((prev) => (prev + 1) % 4);
    }, 240);

    return () => {
      window.clearInterval(timerId);
    };
  }, [isTypingStatus]);

  const searchCounter = messageSearchMatchesCount > 0 ? `${messageSearchCurrentIndex + 1}/${messageSearchMatchesCount}` : '0/0';
  const canToggleGroupInfo = !isMessageSearchOpen && selectedChat?.chatType === 'GROUP';

  return (
    <div className="relative flex h-[66px] items-center justify-between bg-[#242620] px-[18px] shadow-[inset_0_-1px_0_rgba(255,255,255,0.045)]">
      <div className="flex min-w-0 items-center gap-[12px]">
        {selectedChat ? (
          <Avatar
            size={44}
            avatarBg={selectedChat.avatarBg}
            avatarText={selectedChat.avatarText}
            avatarUrl={selectedChat.avatarUrl}
          />
        ) : (
          <div className="grid h-[44px] w-[44px] place-items-center rounded-full bg-[#33352e] text-xs text-white/50">
            ?
          </div>
        )}

        {isMessageSearchOpen ? (
          <div className="flex h-[44px] min-w-[220px] flex-1 items-center gap-2 rounded-full bg-[#171816] px-[14px] text-white/70 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
            <SearchIcon size={20} strokeWidth={2.3} />
            <input
              ref={searchInputRef}
              type="text"
              value={messageSearchQuery}
              onChange={(event) => onMessageSearchQueryChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  if (event.shiftKey) {
                    onPrevMessageSearchResult();
                  } else {
                    onNextMessageSearchResult();
                  }
                }
                if (event.key === 'Escape') {
                  event.preventDefault();
                  onCloseMessageSearch();
                }
              }}
              placeholder={copy.search}
              className="w-full bg-transparent text-[18px] font-[600] leading-none text-white placeholder:text-white/35 focus:outline-none"
            />
          </div>
        ) : (
          canToggleGroupInfo ? (
            <button
              type="button"
              onClick={onToggleGroupInfo}
              className="group min-w-0 text-left outline-none focus:outline-none focus-visible:outline-none"
              aria-label={isGroupInfoOpen ? copy.hideInfo : copy.showInfo}
            >
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="truncate text-[17px] font-[700] leading-none tracking-[0.1px]">
                  {selectedChat?.name || copy.select}
                </span>
                <span
                  className={`shrink-0 text-white/60 transition-transform duration-200 group-hover:text-white/90 ${
                    isGroupInfoOpen ? 'rotate-180 text-[#e0c59e]' : ''
                  }`}
                >
                  <DownIcon size={18} />
                </span>
              </div>
              <div className="mt-[5px] text-[14px] leading-none text-white/58">
                {renderedStatus}
              </div>
            </button>
          ) : (
            <div>
              <div className="text-[17px] font-[700] leading-none tracking-[0.1px]">
                {selectedChat?.name || copy.select}
              </div>
              <div className="mt-[5px] text-[14px] leading-none text-white/58">
                {selectedChat ? renderedStatus : copy.inactive}
              </div>
            </div>
          )
        )}
      </div>

      {isMessageSearchOpen ? (
        <div className="ml-3 flex shrink-0 items-center gap-2 text-white/78">
          <div className="min-w-[44px] text-right text-[13px] font-[600] text-white/58">{searchCounter}</div>
          <button
            type="button"
            onClick={onPrevMessageSearchResult}
            className="rounded-full p-1 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:text-white/30"
            aria-label={copy.previous}
            disabled={messageSearchMatchesCount === 0}
          >
            <UpIcon />
          </button>
          <button
            type="button"
            onClick={onNextMessageSearchResult}
            className="rounded-full p-1 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:text-white/30"
            aria-label={copy.next}
            disabled={messageSearchMatchesCount === 0}
          >
            <DownIcon />
          </button>
          <button
            type="button"
            onClick={onCloseMessageSearch}
            className="rounded-full p-1 transition-colors hover:bg-white/10"
            aria-label={copy.closeSearch}
          >
            <CloseIcon size={22} strokeWidth={2.3} />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-[18px] text-white/78">
          <button
            type="button"
            onClick={onToggleMessageSearch}
            className="rounded-full p-1 transition-colors hover:bg-white/10"
            aria-label={copy.search}
          >
            <SearchIcon size={23} strokeWidth={2.2} />
          </button>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="rounded-full p-1 transition-colors hover:bg-white/10"
              aria-label={copy.menu}
            >
              <MoreVerticalIcon size={24} />
            </button>

            {menuOpen ? (
              <div className="absolute right-0 top-[calc(100%+10px)] z-20 min-w-[180px] overflow-hidden rounded-xl border border-white/10 bg-[#242620] shadow-2xl">
                <button
                  type="button"
                  onClick={onNavigateHome}
                  className="w-full px-4 py-2.5 text-left text-sm text-white/90 transition-colors hover:bg-white/10"
                >
                  {copy.home}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}

    </div>
  );
}
