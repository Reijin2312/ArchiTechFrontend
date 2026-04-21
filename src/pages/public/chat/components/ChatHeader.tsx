import { useEffect, useRef, useState, type RefObject } from 'react';
import { CloseIcon, MoreVerticalIcon, PhoneIcon, SearchIcon } from '../icons';
import type { SidebarChat } from '../types';
import { Avatar } from './Avatar';

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
    <div className="relative flex h-[66px] items-center justify-between bg-[#1a1b20] px-[18px] shadow-[inset_0_-1px_0_rgba(255,255,255,0.045)]">
      <div className="flex min-w-0 items-center gap-[12px]">
        {selectedChat ? (
          <Avatar
            size={44}
            avatarBg={selectedChat.avatarBg}
            avatarText={selectedChat.avatarText}
            avatarUrl={selectedChat.avatarUrl}
          />
        ) : (
          <div className="grid h-[44px] w-[44px] place-items-center rounded-full bg-[#2a2b31] text-xs text-white/50">
            ?
          </div>
        )}

        {isMessageSearchOpen ? (
          <div className="flex h-[44px] min-w-[220px] flex-1 items-center gap-2 rounded-full bg-[#111216] px-[14px] text-white/70 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
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
              placeholder="Search in chat"
              className="w-full bg-transparent text-[18px] font-[600] leading-none text-white placeholder:text-white/35 focus:outline-none"
            />
          </div>
        ) : (
          canToggleGroupInfo ? (
            <button
              type="button"
              onClick={onToggleGroupInfo}
              className="group min-w-0 text-left outline-none focus:outline-none focus-visible:outline-none"
              aria-label={isGroupInfoOpen ? 'Hide group info' : 'Show group info'}
            >
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="truncate text-[17px] font-[700] leading-none tracking-[0.1px]">
                  {selectedChat?.name || 'Select chat'}
                </span>
                <span
                  className={`shrink-0 text-white/60 transition-transform duration-200 group-hover:text-white/90 ${
                    isGroupInfoOpen ? 'rotate-180 text-[#bca8ff]' : ''
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
                {selectedChat?.name || 'Select chat'}
              </div>
              <div className="mt-[5px] text-[14px] leading-none text-white/58">
                {selectedChat ? renderedStatus : 'No active chat'}
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
            aria-label="Previous message match"
            disabled={messageSearchMatchesCount === 0}
          >
            <UpIcon />
          </button>
          <button
            type="button"
            onClick={onNextMessageSearchResult}
            className="rounded-full p-1 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:text-white/30"
            aria-label="Next message match"
            disabled={messageSearchMatchesCount === 0}
          >
            <DownIcon />
          </button>
          <button
            type="button"
            onClick={onCloseMessageSearch}
            className="rounded-full p-1 transition-colors hover:bg-white/10"
            aria-label="Close message search"
          >
            <CloseIcon size={22} strokeWidth={2.3} />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-[24px] text-white/78">
          <PhoneIcon size={24} strokeWidth={2.15} />
          <button
            type="button"
            onClick={onToggleMessageSearch}
            className="rounded-full p-1 transition-colors hover:bg-white/10"
            aria-label="Search in current chat"
          >
            <SearchIcon size={23} strokeWidth={2.2} />
          </button>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="rounded-full p-1 transition-colors hover:bg-white/10"
              aria-label="Chat menu"
            >
              <MoreVerticalIcon size={24} />
            </button>

            {menuOpen ? (
              <div className="absolute right-0 top-[calc(100%+10px)] z-20 min-w-[180px] overflow-hidden rounded-xl border border-white/10 bg-[#1e1f26] shadow-2xl">
                <button
                  type="button"
                  onClick={onNavigateHome}
                  className="w-full px-4 py-2.5 text-left text-sm text-white/90 transition-colors hover:bg-white/10"
                >
                  {'\u041d\u0430 \u0433\u043b\u0430\u0432\u043d\u0443\u044e'}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}

    </div>
  );
}
