import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCheckIcon, CloseIcon, MenuIcon, PenSquareIcon, SearchIcon } from '../icons.js';
import { Avatar } from './Avatar.js';
function BackIcon({ size = 28 }) {
    return (_jsx("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", children: _jsx("path", { d: "m15 19-7-7 7-7", stroke: "currentColor", strokeWidth: "2.2", strokeLinecap: "round", strokeLinejoin: "round" }) }));
}
function ArrowRightIcon({ size = 28 }) {
    return (_jsx("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", children: _jsx("path", { d: "m9 5 7 7-7 7", stroke: "currentColor", strokeWidth: "2.2", strokeLinecap: "round", strokeLinejoin: "round" }) }));
}
function ChannelIcon({ size = 24 }) {
    return (_jsxs("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", children: [_jsx("path", { d: "M14 8.5 19.5 6v12L14 15.5v-7Z", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("path", { d: "M14 8.5H8.5A2.5 2.5 0 0 0 6 11v2a2.5 2.5 0 0 0 2.5 2.5H14V8.5Z", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("path", { d: "m10 15.5 1.2 3.1a1.8 1.8 0 0 1-1.67 2.44H8.7", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("path", { d: "M20.5 10.25a2.5 2.5 0 0 1 0 3.5", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round" })] }));
}
function GroupIcon({ size = 24 }) {
    return (_jsxs("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", children: [_jsx("path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("circle", { cx: "9", cy: "7", r: "4", stroke: "currentColor", strokeWidth: "2" }), _jsx("path", { d: "M22 21v-2a4 4 0 0 0-3-3.87", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("path", { d: "M16 3.13a4 4 0 0 1 0 7.75", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" })] }));
}
function PrivateChatIcon({ size = 24 }) {
    return (_jsxs("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", children: [_jsx("path", { d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("circle", { cx: "12", cy: "7", r: "4", stroke: "currentColor", strokeWidth: "2" })] }));
}
function CameraPlusIcon({ size = 64 }) {
    return (_jsxs("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", children: [_jsx("path", { d: "M15.5 8h1A3.5 3.5 0 0 1 20 11.5v4A3.5 3.5 0 0 1 16.5 19h-9A3.5 3.5 0 0 1 4 15.5v-4A3.5 3.5 0 0 1 7.5 8h1.2l.7-1.4A2 2 0 0 1 11.2 5h1.6a2 2 0 0 1 1.8 1.1L15.5 8Z", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("circle", { cx: "12", cy: "13", r: "3", stroke: "currentColor", strokeWidth: "1.8" }), _jsx("path", { d: "M19.5 5.5v4m-2-2h4", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round" })] }));
}
function SingleCheckIcon({ size = 13 }) {
    return (_jsx("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", children: _jsx("path", { d: "m6 12 3.2 3.2L18 6.4", stroke: "currentColor", strokeWidth: "2.3", strokeLinecap: "round", strokeLinejoin: "round" }) }));
}
function Checkbox({ checked, compact = false }) {
    return (_jsx("span", { className: `inline-flex items-center justify-center border transition-colors ${compact ? 'h-[30px] w-[30px] rounded-[9px]' : 'h-9 w-9 rounded-[11px]'} ${checked
            ? 'border-[#8e77ef] bg-[#8e77ef] text-white'
            : 'border-white/35 bg-transparent text-transparent'}`, children: _jsx("svg", { width: compact ? 14 : 18, height: compact ? 14 : 18, viewBox: "0 0 24 24", fill: "none", children: _jsx("path", { d: "m5 12 4 4 10-10", stroke: "currentColor", strokeWidth: "2.4", strokeLinecap: "round", strokeLinejoin: "round" }) }) }));
}
function ComposeMenuItem({ label, icon, onClick, }) {
    return (_jsxs("button", { type: "button", onClick: onClick, className: "flex w-full items-center gap-2.5 px-3 py-2 text-left text-[14px] font-[640] text-white/94 transition-colors hover:bg-white/8", children: [_jsx("span", { className: "text-white/88", children: icon }), _jsx("span", { children: label })] }));
}
function TopMiniAvatars() {
    return (_jsx("div", { className: "flex items-center gap-[10px]", children: _jsxs("div", { className: "relative flex items-center -space-x-[8px]", children: [_jsx("div", { className: "grid h-[42px] w-[42px] place-items-center rounded-full text-[20px] ring-2 ring-[#1a1b20]", style: { background: 'linear-gradient(135deg, #14d4b4 0%, #41d2f3 100%)' }, children: "A" }), _jsx("div", { className: "grid h-[42px] w-[42px] place-items-center rounded-full text-[20px] ring-2 ring-[#1a1b20]", style: { background: 'linear-gradient(135deg, #7b3ff6 0%, #ff9d3f 100%)' }, children: "T" })] }) }));
}
function ChatRow({ item, compact, onClick, }) {
    if (compact) {
        const showOnlineDot = item.chatType === 'PRIVATE' && !!item.isOnline;
        return (_jsx("button", { type: "button", onClick: onClick, className: `mx-auto mb-[10px] grid h-[64px] w-[64px] place-items-center rounded-[18px] outline-none transition-colors focus:outline-none focus-visible:outline-none focus-visible:ring-0 ${item.selected ? 'bg-[#8f79ee]' : 'hover:bg-white/[0.035]'}`, title: item.name, children: _jsx(Avatar, { size: 48, avatarBg: item.avatarBg, avatarText: item.avatarText, avatarUrl: item.avatarUrl, online: showOnlineDot }) }));
    }
    const deliveryIcon = item.deliveryStatus === 'read' ? (_jsx(CheckCheckIcon, { size: 13, strokeWidth: 2.2, className: "origin-center scale-[1.9] text-[#d8fff0]" })) : item.deliveryStatus === 'delivered' ? (_jsx(CheckCheckIcon, { size: 13, strokeWidth: 2.2, className: `origin-center scale-[1.9] ${item.selected ? 'text-white/88' : 'text-[#9da0af]'}` })) : item.deliveryStatus === 'sent' || item.deliveryStatus === 'pending' ? (_jsx("span", { className: `inline-flex origin-center scale-[1.9] ${item.selected ? 'text-white/82' : 'text-[#8d90a0]'}`, children: _jsx(SingleCheckIcon, { size: 13 }) })) : null;
    return (_jsxs("button", { type: "button", onClick: onClick, className: `mx-[8px] mb-[2px] flex w-[calc(100%-16px)] items-start gap-[12px] rounded-[16px] px-[12px] py-[11px] text-left outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 ${item.selected ? 'bg-[#8f79ee] text-white' : 'text-white hover:bg-white/[0.035]'}`, style: item.selected ? { boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' } : undefined, children: [_jsx(Avatar, { size: 48, avatarBg: item.avatarBg, avatarText: item.avatarText, avatarUrl: item.avatarUrl, online: item.chatType === 'PRIVATE' && !!item.isOnline }), _jsxs("div", { className: "min-w-0 flex-1 pt-[1px]", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("div", { className: "min-w-0 flex flex-1 items-center gap-1.5", children: [item.chatType === 'GROUP' ? (_jsx("span", { className: item.selected ? 'text-white/95' : 'text-white/72', children: _jsx(GroupIcon, { size: 15 }) })) : null, _jsx("div", { className: "min-w-0 flex-1 truncate text-[18px] font-[600] leading-[1.1] tracking-[0.1px]", children: item.name })] }), _jsx("div", { className: `flex shrink-0 items-center gap-[4px] text-[14px] ${item.selected ? 'text-white/90' : 'text-[#8f91a0]'}`, children: _jsx("span", { children: item.time }) })] }), _jsxs("div", { className: `mt-[6px] flex items-center justify-between gap-[8px] text-[15px] leading-[1.2] ${item.selected ? 'text-white/90' : 'text-[#9c9eaa]'}`, children: [_jsxs("div", { className: "flex min-w-0 flex-1 items-center gap-[6px]", children: [item.unread ? _jsx("span", { className: "h-2 w-2 rounded-full bg-[#d6cbff]" }) : null, _jsx("span", { className: "truncate", children: item.preview })] }), _jsx("span", { className: "inline-flex h-[14px] min-w-[14px] items-center justify-end leading-none", children: item.outgoing ? deliveryIcon : null })] })] })] }));
}
function ContactRow({ contact, selected, onToggle, onClick, withCheckbox, disabled, dense, }) {
    const subtitle = [contact.secondaryText, contact.statusText].filter(Boolean).join(' • ');
    return (_jsxs("button", { type: "button", onClick: withCheckbox ? onToggle : onClick, disabled: disabled, className: `flex w-full items-center text-left transition-colors hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-65 ${dense ? 'gap-2.5 rounded-[12px] px-4 py-1.5' : 'gap-3 rounded-[14px] px-4 py-2'}`, children: [withCheckbox ? _jsx(Checkbox, { checked: !!selected, compact: !!dense }) : null, _jsx(Avatar, { size: dense ? 52 : 58, avatarBg: contact.avatarBg, avatarText: contact.avatarText, avatarUrl: contact.avatarUrl }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("div", { className: `truncate font-[600] text-white/96 ${dense ? 'text-[15px] leading-[1.15]' : 'text-[17px]'}`, children: contact.name }), subtitle ? (_jsx("div", { className: `truncate text-white/56 ${dense ? 'mt-0.5 text-[13px]' : 'mt-1 text-[15px]'}`, children: subtitle })) : null] }), disabled ? (_jsx("span", { className: "text-[12px] text-white/45", children: "..." })) : null] }));
}
const MAX_AVATAR_DATA_URL_LENGTH = 65500;
async function fileToAvatarDataUrl(file) {
    const objectUrl = URL.createObjectURL(file);
    try {
        const image = await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Unable to read image'));
            img.src = objectUrl;
        });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Canvas is not available');
        }
        const maxSourceSide = Math.max(image.width, image.height, 1);
        const targetSides = [320, 256, 220, 192, 160];
        const qualities = [0.9, 0.82, 0.74, 0.66, 0.58];
        for (const targetSide of targetSides) {
            const scale = Math.min(1, targetSide / maxSourceSide);
            const width = Math.max(1, Math.round(image.width * scale));
            const height = Math.max(1, Math.round(image.height * scale));
            canvas.width = width;
            canvas.height = height;
            ctx.clearRect(0, 0, width, height);
            ctx.drawImage(image, 0, 0, width, height);
            for (const quality of qualities) {
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                if (dataUrl.length <= MAX_AVATAR_DATA_URL_LENGTH) {
                    return dataUrl;
                }
            }
        }
        throw new Error('Avatar image is too large');
    }
    finally {
        URL.revokeObjectURL(objectUrl);
    }
}
export function ChatSidebar({ width, query, searchPlaceholder = 'Search', searchStatusLabel = null, onQueryChange, chats, contacts, onSelectChat, onCreateGroup, onOpenPrivateChat, onSearchPrivateUsers, }) {
    const isCompact = width <= 122;
    const isSearchHidden = width <= 270;
    const isTabsHidden = width <= 320;
    const [isCompactSearchOpen, setIsCompactSearchOpen] = useState(false);
    const compactSearchInputRef = useRef(null);
    const [composeMenuOpen, setComposeMenuOpen] = useState(false);
    const [creationMode, setCreationMode] = useState('none');
    const [memberQuery, setMemberQuery] = useState('');
    const [privateQuery, setPrivateQuery] = useState('');
    const [selectedMemberIds, setSelectedMemberIds] = useState([]);
    const [groupTitle, setGroupTitle] = useState('');
    const [groupAvatarDataUrl, setGroupAvatarDataUrl] = useState(undefined);
    const [isCreatingGroup, setIsCreatingGroup] = useState(false);
    const [openingPrivateChatId, setOpeningPrivateChatId] = useState(null);
    const [privateSearchResults, setPrivateSearchResults] = useState([]);
    const [isPrivateSearching, setIsPrivateSearching] = useState(false);
    const [privateSearchError, setPrivateSearchError] = useState(null);
    const [displayedSearchStatus, setDisplayedSearchStatus] = useState('');
    const composePanelRef = useRef(null);
    const groupAvatarInputRef = useRef(null);
    const privateSearchRequestSeqRef = useRef(0);
    const isCreatingFlowOpen = creationMode !== 'none';
    useEffect(() => {
        if (!isSearchHidden) {
            setIsCompactSearchOpen(false);
        }
    }, [isSearchHidden]);
    useEffect(() => {
        if (isCompactSearchOpen) {
            compactSearchInputRef.current?.focus();
        }
    }, [isCompactSearchOpen]);
    useEffect(() => {
        if (!composeMenuOpen)
            return;
        const onPointerDown = (event) => {
            const target = event.target;
            if (!target || !composePanelRef.current)
                return;
            if (!composePanelRef.current.contains(target)) {
                setComposeMenuOpen(false);
            }
        };
        window.addEventListener('mousedown', onPointerDown);
        return () => window.removeEventListener('mousedown', onPointerDown);
    }, [composeMenuOpen]);
    useEffect(() => {
        if (searchStatusLabel && searchStatusLabel.trim().length > 0) {
            setDisplayedSearchStatus(searchStatusLabel);
            return;
        }
        const timeoutId = window.setTimeout(() => {
            setDisplayedSearchStatus('');
        }, 280);
        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [searchStatusLabel]);
    useEffect(() => {
        if (isCreatingFlowOpen) {
            setComposeMenuOpen(false);
        }
    }, [isCreatingFlowOpen]);
    const closeCreationFlow = () => {
        setCreationMode('none');
        setMemberQuery('');
        setPrivateQuery('');
        setSelectedMemberIds([]);
        setGroupTitle('');
        setGroupAvatarDataUrl(undefined);
        setIsCreatingGroup(false);
        setOpeningPrivateChatId(null);
    };
    const canSubmitGroup = groupTitle.trim().length > 0 && !isCreatingGroup;
    const isSearchStatusVisible = !!searchStatusLabel && query.trim().length === 0;
    const filteredGroupContacts = useMemo(() => {
        const normalized = memberQuery.trim().toLowerCase();
        return contacts.filter((contact) => {
            if (!normalized)
                return true;
            return (contact.name.toLowerCase().includes(normalized) ||
                (contact.statusText || '').toLowerCase().includes(normalized));
        });
    }, [contacts, memberQuery]);
    const filteredPrivateContacts = useMemo(() => {
        const normalized = privateQuery.trim().toLowerCase();
        return contacts.filter((contact) => {
            if (!normalized)
                return true;
            return (contact.name.toLowerCase().includes(normalized) ||
                (contact.secondaryText || '').toLowerCase().includes(normalized) ||
                (contact.statusText || '').toLowerCase().includes(normalized));
        });
    }, [contacts, privateQuery]);
    useEffect(() => {
        const normalized = privateQuery.trim();
        if (normalized.length < 2) {
            privateSearchRequestSeqRef.current += 1;
            setPrivateSearchResults([]);
            setPrivateSearchError(null);
            setIsPrivateSearching(false);
            return;
        }
        const requestSeq = privateSearchRequestSeqRef.current + 1;
        privateSearchRequestSeqRef.current = requestSeq;
        setIsPrivateSearching(true);
        setPrivateSearchError(null);
        const timerId = window.setTimeout(() => {
            void (async () => {
                try {
                    const users = await onSearchPrivateUsers(normalized);
                    if (privateSearchRequestSeqRef.current !== requestSeq)
                        return;
                    setPrivateSearchResults(users);
                }
                catch (error) {
                    if (privateSearchRequestSeqRef.current !== requestSeq)
                        return;
                    setPrivateSearchResults([]);
                    setPrivateSearchError(error instanceof Error ? error.message : 'Failed to search users');
                }
                finally {
                    if (privateSearchRequestSeqRef.current === requestSeq) {
                        setIsPrivateSearching(false);
                    }
                }
            })();
        }, 220);
        return () => {
            window.clearTimeout(timerId);
        };
    }, [onSearchPrivateUsers, privateQuery]);
    const toggleMember = (userId) => {
        setSelectedMemberIds((prev) => prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]);
    };
    const handleSubmitGroup = async () => {
        if (!canSubmitGroup)
            return;
        setIsCreatingGroup(true);
        try {
            await onCreateGroup({
                title: groupTitle.trim(),
                participantIds: selectedMemberIds,
                avatarPath: groupAvatarDataUrl,
            });
            closeCreationFlow();
        }
        catch (error) {
            alert(error instanceof Error ? error.message : 'Failed to create group');
            setIsCreatingGroup(false);
        }
    };
    const handleOpenPrivateChat = async (userId) => {
        if (!userId || openingPrivateChatId)
            return;
        setOpeningPrivateChatId(userId);
        try {
            await onOpenPrivateChat(userId);
            closeCreationFlow();
        }
        catch (error) {
            alert(error instanceof Error ? error.message : 'Failed to open private chat');
            setOpeningPrivateChatId(null);
        }
    };
    const handlePickGroupAvatar = async (file) => {
        if (!file)
            return;
        try {
            const dataUrl = await fileToAvatarDataUrl(file);
            setGroupAvatarDataUrl(dataUrl);
        }
        catch (error) {
            alert(error instanceof Error ? error.message : 'Failed to prepare group avatar');
        }
        finally {
            if (groupAvatarInputRef.current) {
                groupAvatarInputRef.current.value = '';
            }
        }
    };
    const renderCreationHeader = (title, onBack, searchValue, onSearchChange, placeholder) => (_jsxs(_Fragment, { children: [_jsxs("div", { className: "flex h-[78px] items-center gap-3 px-4", children: [_jsx("button", { type: "button", onClick: onBack, className: "grid h-10 w-10 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/10", "aria-label": "Back", children: _jsx(BackIcon, {}) }), _jsx("div", { className: "text-[17px] font-[700] text-white/96", children: title })] }), _jsx("div", { className: "px-4 pb-2", children: _jsxs("div", { className: "flex h-[50px] items-center gap-3 rounded-[16px] bg-[#1f2026] px-4 text-white/65 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]", children: [_jsx(SearchIcon, { size: 20, strokeWidth: 2.35 }), _jsx("input", { type: "text", value: searchValue, onChange: (event) => onSearchChange(event.target.value), placeholder: placeholder, className: "w-full bg-transparent text-[17px] text-white/92 placeholder:text-white/42 focus:outline-none" })] }) })] }));
    const renderGroupMembersScreen = () => (_jsxs("div", { className: "flex h-full flex-col bg-[#1a1b20]", children: [renderCreationHeader('Add Members', closeCreationFlow, memberQuery, setMemberQuery, 'Add people...'), _jsx("div", { className: "tg-scroll flex-1 overflow-y-auto pb-[86px] pt-1", children: filteredGroupContacts.length === 0 ? (_jsx("div", { className: "px-5 py-8 text-sm text-white/55", children: "No contacts from existing private chats" })) : (filteredGroupContacts.map((contact) => (_jsx(ContactRow, { contact: contact, withCheckbox: true, dense: true, selected: selectedMemberIds.includes(contact.userId), onToggle: () => toggleMember(contact.userId) }, contact.userId)))) }), _jsx("button", { type: "button", onClick: () => setCreationMode('groupDetails'), className: "absolute bottom-[22px] right-[16px] grid h-[68px] w-[68px] place-items-center rounded-full bg-[#8e77ef] text-white shadow-[0_14px_30px_rgba(142,119,239,.45)] transition-transform hover:scale-[1.03]", "aria-label": "Continue to group details", children: _jsx(ArrowRightIcon, { size: 28 }) })] }));
    const renderGroupDetailsScreen = () => (_jsxs("div", { className: "flex h-full flex-col bg-[#1a1b20]", children: [_jsxs("div", { className: "flex h-[78px] items-center gap-3 px-4", children: [_jsx("button", { type: "button", onClick: () => setCreationMode('groupMembers'), className: "grid h-10 w-10 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/10", "aria-label": "Back", disabled: isCreatingGroup, children: _jsx(BackIcon, {}) }), _jsx("div", { className: "text-[17px] font-[700] text-white/96", children: "New Group" })] }), _jsxs("div", { className: "px-4 pt-2", children: [_jsx("input", { ref: groupAvatarInputRef, type: "file", accept: "image/*", className: "hidden", onChange: (event) => {
                            void handlePickGroupAvatar(event.target.files?.[0] || null);
                        } }), _jsx("button", { type: "button", onClick: () => groupAvatarInputRef.current?.click(), disabled: isCreatingGroup, className: "mx-auto grid h-[190px] w-[190px] place-items-center overflow-hidden rounded-full bg-linear-to-br from-[#a795ea] to-[#7f6be8] text-white shadow-[0_18px_36px_rgba(142,119,239,0.45)] transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-80", "aria-label": "Pick group avatar", children: groupAvatarDataUrl ? (_jsx("img", { src: groupAvatarDataUrl, alt: "Group avatar", className: "h-full w-full object-cover" })) : (_jsx(CameraPlusIcon, {})) }), _jsx("div", { className: "mt-8 rounded-[18px] border border-white/10 bg-[#1c1d23] px-4 py-2.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]", children: _jsx("input", { value: groupTitle, onChange: (event) => setGroupTitle(event.target.value), placeholder: "Group Name", maxLength: 255, disabled: isCreatingGroup, className: "h-10 w-full bg-transparent text-[18px] text-white/95 placeholder:text-white/45 focus:outline-none disabled:cursor-not-allowed" }) })] }), canSubmitGroup ? (_jsx("button", { type: "button", onClick: () => {
                    void handleSubmitGroup();
                }, className: "absolute bottom-[22px] right-[16px] grid h-[68px] w-[68px] place-items-center rounded-full bg-[#8e77ef] text-white shadow-[0_14px_30px_rgba(142,119,239,.45)] transition-transform hover:scale-[1.03]", "aria-label": "Create group", children: isCreatingGroup ? (_jsx("span", { className: "h-6 w-6 animate-spin rounded-full border-[3px] border-white border-r-transparent" })) : (_jsx(ArrowRightIcon, { size: 28 })) })) : null] }));
    const renderPrivateChatScreen = () => (_jsxs("div", { className: "flex h-full flex-col bg-[#1a1b20]", children: [renderCreationHeader('New Private Chat', closeCreationFlow, privateQuery, setPrivateQuery, 'Search people...'), _jsx("div", { className: "tg-scroll flex-1 overflow-y-auto pb-[30px] pt-1", children: privateQuery.trim().length >= 2 && isPrivateSearching ? (_jsx("div", { className: "px-5 py-8 text-sm text-white/55", children: "Searching users..." })) : privateSearchError ? (_jsx("div", { className: "px-5 py-8 text-sm text-[#ffb4b4]", children: privateSearchError })) : (privateQuery.trim().length >= 2 ? privateSearchResults : filteredPrivateContacts).length === 0 ? (_jsx("div", { className: "px-5 py-8 text-sm text-white/55", children: privateQuery.trim().length >= 2
                        ? 'No users found'
                        : 'No contacts from existing private chats' })) : ((privateQuery.trim().length >= 2 ? privateSearchResults : filteredPrivateContacts).map((contact) => (_jsx(ContactRow, { contact: contact, onClick: () => {
                        void handleOpenPrivateChat(contact.userId);
                    }, disabled: openingPrivateChatId === contact.userId }, contact.userId)))) })] }));
    if (creationMode === 'groupMembers') {
        return (_jsx("aside", { className: "tg-sidebar hidden h-full flex-col bg-[#1a1b20] lg:flex", style: { width }, children: renderGroupMembersScreen() }));
    }
    if (creationMode === 'groupDetails') {
        return (_jsx("aside", { className: "tg-sidebar hidden h-full flex-col bg-[#1a1b20] lg:flex", style: { width }, children: renderGroupDetailsScreen() }));
    }
    if (creationMode === 'privateChat') {
        return (_jsx("aside", { className: "tg-sidebar hidden h-full flex-col bg-[#1a1b20] lg:flex", style: { width }, children: renderPrivateChatScreen() }));
    }
    return (_jsxs("aside", { className: "tg-sidebar hidden h-full flex-col bg-[#1a1b20] lg:flex", style: { width }, children: [_jsxs("div", { className: "flex h-[66px] items-center gap-[14px] px-[16px] pt-[4px]", children: [_jsx("button", { className: "grid h-[38px] w-[38px] place-items-center rounded-full text-white/82", children: _jsx(MenuIcon, { size: 28, strokeWidth: 2.2 }) }), !isSearchHidden ? (_jsxs("div", { className: "flex h-[42px] flex-1 items-center gap-[10px] rounded-full bg-[#111216] px-[18px] text-white/45 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]", children: [_jsx(SearchIcon, { size: 20, strokeWidth: 2.4 }), _jsxs("div", { className: "relative min-w-0 flex-1", children: [_jsx("input", { type: "text", value: query, onChange: (event) => onQueryChange(event.target.value), placeholder: searchPlaceholder, className: "w-full bg-transparent text-[17px] font-[450] text-white/90 placeholder:text-white/45 focus:outline-none" }), displayedSearchStatus ? (_jsx("span", { className: `pointer-events-none absolute inset-y-0 left-0 flex items-center text-[17px] font-[450] text-white/50 transition-opacity duration-300 ${isSearchStatusVisible ? 'opacity-100' : 'opacity-0'}`, children: displayedSearchStatus })) : null] })] })) : (_jsx("button", { type: "button", onClick: () => setIsCompactSearchOpen((prev) => !prev), className: `grid h-[38px] w-[38px] place-items-center rounded-full transition-colors ${isCompactSearchOpen ? 'bg-white/12 text-[#b39cff]' : 'text-white/78 hover:bg-white/10'}`, "aria-label": "Search chats", children: isCompactSearchOpen ? (_jsx(CloseIcon, { size: 21, strokeWidth: 2.3 })) : (_jsx(SearchIcon, { size: 21, strokeWidth: 2.3 })) })), !isCompact && !isSearchHidden ? _jsx(TopMiniAvatars, {}) : null] }), isSearchHidden && isCompactSearchOpen ? (_jsx("div", { className: "px-[12px] pb-[8px]", children: _jsxs("div", { className: "flex h-[38px] items-center gap-2 rounded-full bg-[#111216] px-[12px] text-white/55 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]", children: [_jsx(SearchIcon, { size: 17, strokeWidth: 2.4 }), _jsxs("div", { className: "relative min-w-0 flex-1", children: [_jsx("input", { ref: compactSearchInputRef, type: "text", value: query, onChange: (event) => onQueryChange(event.target.value), placeholder: searchPlaceholder, className: "w-full bg-transparent text-[14px] text-white/90 placeholder:text-white/42 focus:outline-none" }), displayedSearchStatus ? (_jsx("span", { className: `pointer-events-none absolute inset-y-0 left-0 flex items-center text-[14px] text-white/45 transition-opacity duration-300 ${isSearchStatusVisible ? 'opacity-100' : 'opacity-0'}`, children: displayedSearchStatus })) : null] })] }) })) : null, !isTabsHidden ? (_jsx("div", { className: "overflow-hidden px-[28px] pt-[4px]", children: _jsxs("div", { className: "flex items-end gap-[32px] whitespace-nowrap text-[17px] font-[600] text-white/78", children: [_jsxs("div", { className: "relative pb-[13px] text-[#9d83ff]", children: ["Chats", _jsx("span", { className: "absolute bottom-0 left-0 h-[2.5px] w-full rounded-full bg-[#9d83ff]" })] }), _jsx("div", { className: "pb-[13px]", children: "ArchiTech" }), _jsxs("div", { className: "flex items-center gap-[8px] pb-[13px]", children: [_jsx("span", { children: "News" }), _jsx("span", { className: "grid h-[22px] min-w-[22px] place-items-center rounded-full bg-white/16 px-[6px] text-[13px] text-white", children: "2" })] })] }) })) : null, _jsx("div", { className: `tg-scroll flex-1 overflow-y-auto pb-[94px] ${isCompact ? 'pt-[10px]' : 'pt-[6px]'}`, children: chats.length === 0 ? (_jsx("div", { className: "px-5 py-8 text-sm text-white/55", children: "No chats yet" })) : (chats.map((chat) => (_jsx(ChatRow, { item: chat, compact: isCompact, onClick: () => onSelectChat(chat.chatId) }, chat.chatId)))) }), !isCompact ? (_jsxs("div", { ref: composePanelRef, className: "absolute bottom-[24px] right-[16px] z-20 flex flex-col items-end", children: [composeMenuOpen ? (_jsxs("div", { className: "mb-2.5 min-w-[184px] overflow-hidden rounded-[12px] border border-white/10 bg-[#1b1c22]/98 shadow-[0_14px_28px_rgba(0,0,0,0.45)]", children: [_jsx(ComposeMenuItem, { label: "New Channel", icon: _jsx(ChannelIcon, { size: 16 }), onClick: () => {
                                    setComposeMenuOpen(false);
                                    alert('Channels are not implemented yet');
                                } }), _jsx(ComposeMenuItem, { label: "New Group", icon: _jsx(GroupIcon, { size: 16 }), onClick: () => {
                                    setComposeMenuOpen(false);
                                    setCreationMode('groupMembers');
                                } }), _jsx(ComposeMenuItem, { label: "New Private Chat", icon: _jsx(PrivateChatIcon, { size: 16 }), onClick: () => {
                                    setComposeMenuOpen(false);
                                    setCreationMode('privateChat');
                                } })] })) : null, _jsx("button", { type: "button", onClick: () => setComposeMenuOpen((prev) => !prev), className: "grid h-[68px] w-[68px] place-items-center rounded-full bg-[#8e77ef] text-white shadow-[0_14px_30px_rgba(142,119,239,.45)]", "aria-label": composeMenuOpen ? 'Close compose menu' : 'Open compose menu', children: composeMenuOpen ? (_jsx(CloseIcon, { size: 30, strokeWidth: 2.1 })) : (_jsx(PenSquareIcon, { size: 26, strokeWidth: 2.1 })) })] })) : null] }));
}
