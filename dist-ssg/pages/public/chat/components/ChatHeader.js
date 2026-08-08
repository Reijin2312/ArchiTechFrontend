import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { CloseIcon, MoreVerticalIcon, PhoneIcon, SearchIcon } from '../icons.js';
import { Avatar } from './Avatar.js';
function UpIcon({ size = 22 }) {
    return (_jsx("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", children: _jsx("path", { d: "m6 15 6-6 6 6", stroke: "currentColor", strokeWidth: "2.4", strokeLinecap: "round", strokeLinejoin: "round" }) }));
}
function DownIcon({ size = 22 }) {
    return (_jsx("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", children: _jsx("path", { d: "m6 9 6 6 6-6", stroke: "currentColor", strokeWidth: "2.4", strokeLinecap: "round", strokeLinejoin: "round" }) }));
}
export function ChatHeader({ selectedChat, selectedStatus, isGroupInfoOpen, menuOpen, setMenuOpen, menuRef, isMessageSearchOpen, messageSearchQuery, messageSearchMatchesCount, messageSearchCurrentIndex, onToggleMessageSearch, onCloseMessageSearch, onMessageSearchQueryChange, onPrevMessageSearchResult, onNextMessageSearchResult, onToggleGroupInfo, onNavigateHome, }) {
    const searchInputRef = useRef(null);
    const [typingDots, setTypingDots] = useState(0);
    const isTypingStatus = /\btyping$/i.test(selectedStatus);
    const renderedStatus = isTypingStatus ? `${selectedStatus}${'.'.repeat(typingDots)}` : selectedStatus;
    useEffect(() => {
        if (!isMessageSearchOpen)
            return;
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
    return (_jsxs("div", { className: "relative flex h-[66px] items-center justify-between bg-[#1a1b20] px-[18px] shadow-[inset_0_-1px_0_rgba(255,255,255,0.045)]", children: [_jsxs("div", { className: "flex min-w-0 items-center gap-[12px]", children: [selectedChat ? (_jsx(Avatar, { size: 44, avatarBg: selectedChat.avatarBg, avatarText: selectedChat.avatarText, avatarUrl: selectedChat.avatarUrl })) : (_jsx("div", { className: "grid h-[44px] w-[44px] place-items-center rounded-full bg-[#2a2b31] text-xs text-white/50", children: "?" })), isMessageSearchOpen ? (_jsxs("div", { className: "flex h-[44px] min-w-[220px] flex-1 items-center gap-2 rounded-full bg-[#111216] px-[14px] text-white/70 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]", children: [_jsx(SearchIcon, { size: 20, strokeWidth: 2.3 }), _jsx("input", { ref: searchInputRef, type: "text", value: messageSearchQuery, onChange: (event) => onMessageSearchQueryChange(event.target.value), onKeyDown: (event) => {
                                    if (event.key === 'Enter') {
                                        event.preventDefault();
                                        if (event.shiftKey) {
                                            onPrevMessageSearchResult();
                                        }
                                        else {
                                            onNextMessageSearchResult();
                                        }
                                    }
                                    if (event.key === 'Escape') {
                                        event.preventDefault();
                                        onCloseMessageSearch();
                                    }
                                }, placeholder: "Search in chat", className: "w-full bg-transparent text-[18px] font-[600] leading-none text-white placeholder:text-white/35 focus:outline-none" })] })) : (canToggleGroupInfo ? (_jsxs("button", { type: "button", onClick: onToggleGroupInfo, className: "group min-w-0 text-left outline-none focus:outline-none focus-visible:outline-none", "aria-label": isGroupInfoOpen ? 'Hide group info' : 'Show group info', children: [_jsxs("div", { className: "flex min-w-0 items-center gap-1.5", children: [_jsx("span", { className: "truncate text-[17px] font-[700] leading-none tracking-[0.1px]", children: selectedChat?.name || 'Select chat' }), _jsx("span", { className: `shrink-0 text-white/60 transition-transform duration-200 group-hover:text-white/90 ${isGroupInfoOpen ? 'rotate-180 text-[#bca8ff]' : ''}`, children: _jsx(DownIcon, { size: 18 }) })] }), _jsx("div", { className: "mt-[5px] text-[14px] leading-none text-white/58", children: renderedStatus })] })) : (_jsxs("div", { children: [_jsx("div", { className: "text-[17px] font-[700] leading-none tracking-[0.1px]", children: selectedChat?.name || 'Select chat' }), _jsx("div", { className: "mt-[5px] text-[14px] leading-none text-white/58", children: selectedChat ? renderedStatus : 'No active chat' })] })))] }), isMessageSearchOpen ? (_jsxs("div", { className: "ml-3 flex shrink-0 items-center gap-2 text-white/78", children: [_jsx("div", { className: "min-w-[44px] text-right text-[13px] font-[600] text-white/58", children: searchCounter }), _jsx("button", { type: "button", onClick: onPrevMessageSearchResult, className: "rounded-full p-1 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:text-white/30", "aria-label": "Previous message match", disabled: messageSearchMatchesCount === 0, children: _jsx(UpIcon, {}) }), _jsx("button", { type: "button", onClick: onNextMessageSearchResult, className: "rounded-full p-1 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:text-white/30", "aria-label": "Next message match", disabled: messageSearchMatchesCount === 0, children: _jsx(DownIcon, {}) }), _jsx("button", { type: "button", onClick: onCloseMessageSearch, className: "rounded-full p-1 transition-colors hover:bg-white/10", "aria-label": "Close message search", children: _jsx(CloseIcon, { size: 22, strokeWidth: 2.3 }) })] })) : (_jsxs("div", { className: "flex items-center gap-[24px] text-white/78", children: [_jsx(PhoneIcon, { size: 24, strokeWidth: 2.15 }), _jsx("button", { type: "button", onClick: onToggleMessageSearch, className: "rounded-full p-1 transition-colors hover:bg-white/10", "aria-label": "Search in current chat", children: _jsx(SearchIcon, { size: 23, strokeWidth: 2.2 }) }), _jsxs("div", { className: "relative", ref: menuRef, children: [_jsx("button", { type: "button", onClick: () => setMenuOpen((prev) => !prev), className: "rounded-full p-1 transition-colors hover:bg-white/10", "aria-label": "Chat menu", children: _jsx(MoreVerticalIcon, { size: 24 }) }), menuOpen ? (_jsx("div", { className: "absolute right-0 top-[calc(100%+10px)] z-20 min-w-[180px] overflow-hidden rounded-xl border border-white/10 bg-[#1e1f26] shadow-2xl", children: _jsx("button", { type: "button", onClick: onNavigateHome, className: "w-full px-4 py-2.5 text-left text-sm text-white/90 transition-colors hover:bg-white/10", children: '\u041d\u0430 \u0433\u043b\u0430\u0432\u043d\u0443\u044e' }) })) : null] })] }))] }));
}
