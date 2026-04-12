import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { http } from '@/shared/api/http';
import { endpoints } from '@/shared/api/endpoints';
import type {
  ChatLinkItem,
  ChatLinksResponse,
  ChatPresenceState,
  UserSearchResponse,
} from '@/shared/api/types';
import { formatPresenceStatus } from '@/shared/utils/presenceStatus';
import { Seo } from '@/shared/seo/seo';
import { routesMeta } from '@/shared/seo/routesMeta';
import { useSocialFloatingModel } from '@/shared/ui/button/social/useSocialFloatingModel';
import { ChatComposer } from './chat/components/ChatComposer';
import { ChatHeader } from './chat/components/ChatHeader';
import { ChatPlaybackBanner } from './chat/components/ChatPlaybackBanner';
import { CircleRecordingOverlay } from './chat/components/CircleRecordingOverlay';
import { ChatMessageList } from './chat/components/ChatMessageList';
import {
  GroupInfoPanel,
  type GroupInfoLinkItem,
  type GroupInfoMember,
  type GroupInfoTab,
} from './chat/components/GroupInfoPanel';
import {
  GroupAddMembersPanel,
  type GroupAddMemberCandidate,
} from './chat/components/GroupAddMembersPanel';
import { ChatSidebar, type ChatSidebarContact } from './chat/components/ChatSidebar';
import { chatPageStyles, chatWallpaperSvg } from './chat/styles';
import type { ChatPlaybackState, SidebarChat } from './chat/types';
import {
  formatChatTime,
  hashColor,
  initialOf,
  messagePreviewText,
} from './chat/utils';

const PLAYBACK_BANNER_HEIGHT = 66;
const SIDEBAR_MAX_WIDTH = 422;
const SIDEBAR_MIN_WIDTH = 92;
const GROUP_INFO_PANEL_WIDTH = 360;
const COMPOSER_TRACK_MAX_WIDTH = 960;
const COMPOSER_ACTION_BUTTON_SIZE = 58;
const COMPOSER_ACTION_GAP = 10;
const MESSAGE_COLUMN_RIGHT_EDGE_SHIFT_PX = -30;
const MESSAGE_COLUMN_BASE_MAX_WIDTH =
  COMPOSER_TRACK_MAX_WIDTH - COMPOSER_ACTION_BUTTON_SIZE - COMPOSER_ACTION_GAP;
const MESSAGE_COLUMN_MIN_MAX_WIDTH = 480;
const MESSAGE_COLUMN_MAX_WIDTH =
  Math.max(
    MESSAGE_COLUMN_MIN_MAX_WIDTH,
    Math.min(
      COMPOSER_TRACK_MAX_WIDTH,
      MESSAGE_COLUMN_BASE_MAX_WIDTH + MESSAGE_COLUMN_RIGHT_EDGE_SHIFT_PX
    )
  );
const MESSAGE_BUBBLE_MAX_WIDTH = Math.floor(MESSAGE_COLUMN_MAX_WIDTH / 2);
const GROUP_INFO_LINKS_PAGE_SIZE = 24;

type CurrentUserProfile = {
  username?: string;
  displayName?: string;
  avatarUrl?: string;
};

const PRESENCE_VISUAL_IDLE_TIMEOUT_MS = 60_000;

const resolveChatAvatarUrl = (avatarPath?: string) => {
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

const LINKS_PANEL_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
});

const decodeLinkLabel = (value: string) => {
  const normalized = value.replace(/[-_]+/g, ' ').trim();
  if (!normalized) return 'Link';
  try {
    return decodeURIComponent(normalized);
  } catch {
    return normalized;
  }
};

const getYouTubeId = (url: URL): string | null => {
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  if (host === 'youtu.be') {
    return url.pathname.split('/').filter(Boolean)[0] || null;
  }
  if (!host.includes('youtube.com')) return null;
  if (url.pathname === '/watch') return url.searchParams.get('v');
  if (url.pathname.startsWith('/shorts/')) return url.pathname.split('/')[2] || null;
  if (url.pathname.startsWith('/embed/')) return url.pathname.split('/')[2] || null;
  return null;
};

const getDailymotionId = (url: URL): string | null => {
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  if (host === 'dai.ly') {
    return url.pathname.split('/').filter(Boolean)[0] || null;
  }
  if (!host.includes('dailymotion.com')) return null;
  const parts = url.pathname.split('/').filter(Boolean);
  const idx = parts.indexOf('video');
  if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
  return null;
};

const toLinksPanelItem = (link: ChatLinkItem): GroupInfoLinkItem | null => {
  const href = link.url;
  let parsed: URL;
  try {
    parsed = new URL(href);
  } catch {
    return null;
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '');
  const pathParts = parsed.pathname.split('/').filter(Boolean);
  const rawTitle = pathParts.length > 0 ? pathParts[pathParts.length - 1] : host;
  const ytId = getYouTubeId(parsed);
  const dmId = getDailymotionId(parsed);

  const sourceLabel = host.includes('youtube.com') || host === 'youtu.be'
    ? 'YouTube'
    : host.includes('vimeo.com')
      ? 'Vimeo'
      : host.includes('rutube.ru')
        ? 'Rutube'
        : host.includes('dailymotion.com') || host === 'dai.ly'
          ? 'Dailymotion'
          : host;

  const thumbnailUrl = ytId
    ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`
    : dmId
      ? `https://www.dailymotion.com/thumbnail/video/${dmId}`
      : `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(parsed.origin)}`;

  const date = new Date(link.createdAt);
  const dateLabel = Number.isNaN(date.getTime())
    ? ''
    : LINKS_PANEL_DATE_FORMATTER.format(date);

  return {
    id: `${link.messageId}-${href}`,
    messageId: link.messageId,
    href: parsed.toString(),
    displayUrl: parsed.toString(),
    sourceLabel,
    dateLabel,
    title: link.title?.trim() || decodeLinkLabel(rawTitle),
    previewText: link.previewText?.trim() || 'Message with link',
    thumbnailUrl,
  };
};

export default function ChatPage() {
  const navigate = useNavigate();
  const model = useSocialFloatingModel({ mode: 'page' });
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isMessageSearchOpen, setIsMessageSearchOpen] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [messageSearchIndex, setMessageSearchIndex] = useState(0);
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
  const [isGroupAddMembersOpen, setIsGroupAddMembersOpen] = useState(false);
  const [groupInfoTab, setGroupInfoTab] = useState<GroupInfoTab>('members');
  const [groupNotificationsEnabled, setGroupNotificationsEnabled] = useState(true);
  const [groupInfoLinks, setGroupInfoLinks] = useState<GroupInfoLinkItem[]>([]);
  const [groupInfoLinksCursor, setGroupInfoLinksCursor] = useState<number | null>(null);
  const [groupInfoLinksHasMore, setGroupInfoLinksHasMore] = useState(true);
  const [groupInfoLinksLoading, setGroupInfoLinksLoading] = useState(false);
  const [groupAddMembersQuery, setGroupAddMembersQuery] = useState('');
  const [selectedGroupAddMemberIds, setSelectedGroupAddMemberIds] = useState<string[]>([]);
  const [isAddingGroupMembers, setIsAddingGroupMembers] = useState(false);
  const [presenceNowMs, setPresenceNowMs] = useState(() => Date.now());
  const [isDocumentVisible, setIsDocumentVisible] = useState(
    () => typeof document === 'undefined' || document.visibilityState === 'visible'
  );
  const [statusDots, setStatusDots] = useState(0);
  const [currentUserProfile, setCurrentUserProfile] = useState<CurrentUserProfile | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_MAX_WIDTH);
  const [isSidebarResizing, setIsSidebarResizing] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const autoSelectRef = useRef(false);
  const lastCircleReloadAtRef = useRef(0);
  const sidebarResizeRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const playbackHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playbackRef = useRef<ChatPlaybackState | null>(null);
  const groupInfoLinksLoadingRef = useRef(false);
  const [playback, setPlayback] = useState<ChatPlaybackState | null>(null);
  const [isPlaybackVisible, setIsPlaybackVisible] = useState(false);

  useEffect(() => {
    model.setIsOpen(true);
    model.setActiveTab('chat');
  }, []);

  useEffect(() => {
    if (autoSelectRef.current || model.selectedChat !== null || model.chats.length === 0) return;
    const firstChatId = model.chats[0].chatId;
    model.setSelectedChat(firstChatId);
    void model.loadMessages(firstChatId, false);
    autoSelectRef.current = true;
  }, [model.chats, model.selectedChat]);

  useEffect(() => {
    if (model.messages.length > 0) {
      model.scrollToBottom(false);
    }
  }, [model.messages.length]);

  useEffect(() => {
    playbackRef.current = playback;
  }, [playback]);

  const clearPlaybackHideTimer = useCallback(() => {
    if (playbackHideTimerRef.current) {
      clearTimeout(playbackHideTimerRef.current);
      playbackHideTimerRef.current = null;
    }
  }, []);

  useEffect(
    () => () => {
      clearPlaybackHideTimer();
    },
    [clearPlaybackHideTimer]
  );

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!menuRef.current || !target) return;
      if (!menuRef.current.contains(target)) setMenuOpen(false);
    };

    if (menuOpen) document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [menuOpen]);

  useEffect(() => {
    let disposed = false;

    if (!model.userId) {
      setCurrentUserProfile(null);
      return () => {
        disposed = true;
      };
    }

    void (async () => {
      try {
        const { data } = await http.get<CurrentUserProfile>(endpoints.profileMe);
        if (!disposed) {
          setCurrentUserProfile(data && typeof data === 'object' ? data : null);
        }
      } catch {
        if (!disposed) {
          setCurrentUserProfile(null);
        }
      }
    })();

    return () => {
      disposed = true;
    };
  }, [model.userId]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsDocumentVisible(document.visibilityState === 'visible');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setPresenceNowMs(Date.now());
    }, 1_000);

    return () => {
      window.clearInterval(timerId);
    };
  }, []);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setStatusDots((prev) => (prev + 1) % 4);
    }, 260);

    return () => {
      window.clearInterval(timerId);
    };
  }, []);

  const stopSidebarResize = useCallback(() => {
    setIsSidebarResizing(false);
    sidebarResizeRef.current = null;
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  }, []);

  useEffect(() => {
    if (!isSidebarResizing) return;

    const onMouseMove = (event: MouseEvent) => {
      const resize = sidebarResizeRef.current;
      if (!resize) return;
      const delta = event.clientX - resize.startX;
      const next = Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, resize.startWidth + delta));
      setSidebarWidth(next);
    };

    const onMouseUp = () => {
      stopSidebarResize();
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('blur', onMouseUp);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('blur', onMouseUp);
    };
  }, [isSidebarResizing, stopSidebarResize]);

  useEffect(
    () => () => {
      stopSidebarResize();
    },
    [stopSidebarResize]
  );

  const animatedDots = '.'.repeat(statusDots);
  const searchStatusLabel = model.isWsConnecting
    ? `соединение${animatedDots}`
    : model.isChatsRefreshing
      ? `обновление${animatedDots}`
      : null;
  const searchPlaceholder = 'Search';
  const loadingPresenceLabel = `обновление${animatedDots}`;
  const isPresenceGateOpen =
    model.isOpen &&
    model.activeTab === 'chat' &&
    isDocumentVisible &&
    presenceNowMs - model.lastActivityTime <= PRESENCE_VISUAL_IDLE_TIMEOUT_MS;
  const currentUserVisualPresence = useMemo<ChatPresenceState>(
    () => ({
      online: isPresenceGateOpen,
      lastSeenAt: new Date(model.lastActivityTime).toISOString(),
      resolved: true,
    }),
    [isPresenceGateOpen, model.lastActivityTime]
  );
  const formatPresenceLabel = useCallback(
    (presence?: ChatPresenceState) => {
      if (!presence?.resolved) {
        return loadingPresenceLabel;
      }
      return formatPresenceStatus(presence, presenceNowMs);
    },
    [loadingPresenceLabel, presenceNowMs]
  );

  const privateChatContacts = useMemo<ChatSidebarContact[]>(() => {
    const unique = new Set<string>();
    return [...model.chats]
      .filter((chat) => chat.chatType === 'PRIVATE' && !!chat.participantId)
      .sort((a, b) => {
        const left = new Date(a.lastMessage?.createdAt || a.createdAt).getTime();
        const right = new Date(b.lastMessage?.createdAt || b.createdAt).getTime();
        return right - left;
      })
      .flatMap((chat) => {
        const participantId = chat.participantId;
        if (!participantId || unique.has(participantId)) {
          return [];
        }
        unique.add(participantId);

        const meta =
          model.friends.find((item) => item.userId === participantId) ||
          model.incomingRequests.find((item) => item.userId === participantId) ||
          model.outgoingRequests.find((item) => item.userId === participantId) ||
          model.searchResults.find((item) => item.userId === participantId);

        const name = meta?.displayName || meta?.username || participantId.slice(0, 8);
        const presence = model.presenceByUser[participantId];

        return [
          {
            userId: participantId,
            name,
            avatarUrl: meta?.avatarUrl,
            avatarText: initialOf(name),
            avatarBg: hashColor(participantId),
            statusText: formatPresenceLabel(presence),
          },
        ];
      });
  }, [
    model.chats,
    model.friends,
    model.incomingRequests,
    model.outgoingRequests,
    model.searchResults,
    model.presenceByUser,
    formatPresenceLabel,
  ]);

  const searchPrivateUsers = useCallback(
    async (searchQuery: string): Promise<ChatSidebarContact[]> => {
      const normalized = searchQuery.trim();
      if (normalized.length < 2) {
        return [];
      }

      const { data } = await http.get<UserSearchResponse>(endpoints.friendsSearch(normalized, 30));

      return (data.users || []).map((entry) => {
        const displayName = entry.displayName?.trim();
        const primaryName = displayName || entry.username;
        const statusLabel =
          entry.friendStatus === 'ACCEPTED'
            ? 'friend'
            : entry.friendStatus === 'PENDING'
              ? 'request pending'
              : undefined;

        return {
          userId: entry.userId,
          name: primaryName,
          avatarUrl: entry.avatarUrl,
          avatarText: initialOf(primaryName),
          avatarBg: hashColor(entry.userId),
          secondaryText: `@${entry.username}`,
          statusText: statusLabel,
        };
      });
    },
    []
  );

  const toSidebarChat = useCallback(
    (chat: (typeof model.chats)[number]): SidebarChat => {
      const isGroup = chat.chatType === 'GROUP';
      const participantId = chat.participantId;
      const meta =
        !isGroup && participantId
          ? model.friends.find((item) => item.userId === participantId) ||
            model.incomingRequests.find((item) => item.userId === participantId) ||
            model.outgoingRequests.find((item) => item.userId === participantId) ||
            model.searchResults.find((item) => item.userId === participantId)
          : undefined;
      const privatePresence =
        !isGroup && participantId ? model.presenceByUser[participantId] : undefined;
      const name = isGroup
        ? chat.title?.trim() || `Group #${chat.chatId}`
        : meta?.displayName || meta?.username || participantId?.slice(0, 8) || 'Private chat';
      const lastMessage = chat.lastMessage;
      const previewBody = messagePreviewText(lastMessage);
      const senderMeta =
        lastMessage?.senderId
          ? model.friends.find((item) => item.userId === lastMessage.senderId) ||
            model.incomingRequests.find((item) => item.userId === lastMessage.senderId) ||
            model.outgoingRequests.find((item) => item.userId === lastMessage.senderId) ||
            model.searchResults.find((item) => item.userId === lastMessage.senderId)
          : undefined;
      const senderNameFromApi = lastMessage?.senderDisplayName?.trim() || lastMessage?.senderUsername?.trim();
      const senderNameFallback =
        senderMeta?.displayName ||
        senderMeta?.username ||
        (lastMessage?.senderId && !isGroup && lastMessage.senderId === participantId ? name : undefined) ||
        (lastMessage?.senderId ? lastMessage.senderId.slice(0, 8) : undefined);
      const senderLabel =
        !lastMessage
          ? null
          : lastMessage.senderId === model.userId
            ? 'Вы'
            : senderNameFromApi || senderNameFallback || 'Пользователь';
      const preview = senderLabel ? `${senderLabel}: ${previewBody}` : previewBody;
      const deliveryStatus =
        lastMessage?.senderId === model.userId
          ? lastMessage.status === 'pending'
            ? 'pending'
            : lastMessage.isRead
              ? 'read'
              : 'delivered'
          : undefined;

      return {
        chatId: chat.chatId,
        chatType: chat.chatType,
        participantId,
        participantIds: chat.participantIds,
        ownerId: chat.ownerId,
        memberCount: chat.memberCount,
        name,
        avatarUrl: isGroup ? resolveChatAvatarUrl(chat.avatarPath) : meta?.avatarUrl,
        avatarText: initialOf(name),
        avatarBg: hashColor(isGroup ? `group:${chat.chatId}` : participantId || `chat:${chat.chatId}`),
        isOnline: !isGroup ? !!privatePresence?.online : false,
        preview,
        time: formatChatTime(chat.lastMessage?.createdAt || chat.createdAt),
        selected: chat.chatId === model.selectedChat,
        outgoing: chat.lastMessage?.senderId === model.userId,
        unread:
          !!chat.lastMessage &&
          chat.lastMessage.senderId !== model.userId &&
          !chat.lastMessage.isRead,
        deliveryStatus,
      };
    },
    [
      model.friends,
      model.incomingRequests,
      model.outgoingRequests,
      model.presenceByUser,
      model.searchResults,
      model.selectedChat,
      model.userId,
    ]
  );

  const sidebarChats = useMemo<SidebarChat[]>(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return [...model.chats]
      .sort((a, b) => {
        const left = new Date(a.lastMessage?.createdAt || a.createdAt).getTime();
        const right = new Date(b.lastMessage?.createdAt || b.createdAt).getTime();
        return right - left;
      })
      .map(toSidebarChat)
      .filter((item) => {
        if (!normalizedQuery) return true;
        return (
          item.name.toLowerCase().includes(normalizedQuery) ||
          item.preview.toLowerCase().includes(normalizedQuery)
        );
      });
  }, [
    query,
    model.chats,
    toSidebarChat,
  ]);

  const selectedChat = useMemo(() => {
    if (model.selectedChat == null) {
      return undefined;
    }

    const visibleSelection = sidebarChats.find((item) => item.chatId === model.selectedChat);
    if (visibleSelection) {
      return visibleSelection;
    }

    const rawSelectedChat = model.chats.find((chat) => chat.chatId === model.selectedChat);
    return rawSelectedChat ? toSidebarChat(rawSelectedChat) : undefined;
  }, [model.chats, model.selectedChat, sidebarChats, toSidebarChat]);
  const selectedTypingUsers = model.selectedChat ? model.typingUsersByChat[model.selectedChat] || [] : [];
  const selectedGroupTypingCount = selectedTypingUsers.filter((id) => id !== model.userId).length;
  const selectedIsPrivateTyping =
    !!selectedChat &&
    selectedChat.chatType === 'PRIVATE' &&
    !!selectedChat.participantId &&
    selectedTypingUsers.includes(selectedChat.participantId);
  const selectedPresence =
    selectedChat?.chatType === 'PRIVATE' && selectedChat.participantId
      ? model.presenceByUser[selectedChat.participantId]
      : undefined;
  const selectedMemberCount =
    selectedChat?.memberCount ?? (selectedChat?.participantIds?.length || 1);
  const selectedGroupOnlineCount = useMemo(() => {
    if (!selectedChat || selectedChat.chatType !== 'GROUP') {
      return 0;
    }

    const uniqueParticipantIds = new Set((selectedChat.participantIds || []).filter(Boolean));
    if (model.userId) {
      uniqueParticipantIds.add(model.userId);
    }

    let onlineCount = 0;
    uniqueParticipantIds.forEach((id) => {
      if ((id === model.userId && isPresenceGateOpen) || model.presenceByUser[id]?.online) {
        onlineCount += 1;
      }
    });

    return onlineCount;
  }, [isPresenceGateOpen, model.presenceByUser, model.userId, selectedChat]);
  const selectedMembersStatusLabel = `${selectedMemberCount} ${
    selectedMemberCount === 1 ? 'member' : 'members'
  }`;
  const selectedStatus = !selectedChat
    ? 'No active chat'
    : selectedChat.chatType === 'GROUP'
      ? selectedGroupTypingCount > 0
        ? `${selectedGroupTypingCount} typing`
        : selectedGroupOnlineCount > 0
          ? `${selectedMembersStatusLabel}, ${selectedGroupOnlineCount} online`
          : selectedMembersStatusLabel
      : selectedIsPrivateTyping
        ? 'typing'
        : formatPresenceLabel(selectedPresence);
  const selectedGroupChat = selectedChat?.chatType === 'GROUP' ? selectedChat : undefined;
  const isGroupInfoVisible = isGroupInfoOpen && !!selectedGroupChat;
  const selectedGroupParticipantIdSet = useMemo(() => {
    const ids = new Set<string>((selectedGroupChat?.participantIds || []).filter(Boolean));
    if (model.userId) {
      ids.add(model.userId);
    }
    return ids;
  }, [model.userId, selectedGroupChat]);
  const groupAddMemberCandidates = useMemo<GroupAddMemberCandidate[]>(() => {
    if (!selectedGroupChat) {
      return [];
    }

    return privateChatContacts
      .filter((contact) => !selectedGroupParticipantIdSet.has(contact.userId))
      .map((contact) => ({
        userId: contact.userId,
        name: contact.name,
        avatarUrl: contact.avatarUrl,
        avatarBg: contact.avatarBg,
        avatarText: contact.avatarText,
        statusText: contact.statusText,
        isOnline: !!model.presenceByUser[contact.userId]?.online,
      }));
  }, [model.presenceByUser, privateChatContacts, selectedGroupChat, selectedGroupParticipantIdSet]);
  const filteredGroupAddMemberCandidates = useMemo(() => {
    const normalizedQuery = groupAddMembersQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return groupAddMemberCandidates;
    }
    return groupAddMemberCandidates.filter((candidate) =>
      candidate.name.toLowerCase().includes(normalizedQuery) ||
      (candidate.statusText || '').toLowerCase().includes(normalizedQuery)
    );
  }, [groupAddMemberCandidates, groupAddMembersQuery]);
  const toggleGroupAddMember = useCallback((userId: string) => {
    setSelectedGroupAddMemberIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }, []);
  const submitGroupAddMembers = useCallback(async () => {
    if (!selectedGroupChat || selectedGroupAddMemberIds.length === 0 || isAddingGroupMembers) {
      return;
    }

    setIsAddingGroupMembers(true);
    try {
      await http.post(endpoints.chatAddMembers(selectedGroupChat.chatId), {
        participantIds: selectedGroupAddMemberIds,
      });

      setSelectedGroupAddMemberIds([]);
      setGroupAddMembersQuery('');
      setIsGroupAddMembersOpen(false);

      await model.loadChats();
      if (model.selectedChat === selectedGroupChat.chatId) {
        await model.loadMessages(selectedGroupChat.chatId, false);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to add members to the group');
    } finally {
      setIsAddingGroupMembers(false);
    }
  }, [
    isAddingGroupMembers,
    model,
    selectedGroupAddMemberIds,
    selectedGroupChat,
  ]);

  useEffect(() => {
    if (selectedGroupAddMemberIds.length === 0) return;
    const candidateIds = new Set(groupAddMemberCandidates.map((candidate) => candidate.userId));
    setSelectedGroupAddMemberIds((prev) => prev.filter((id) => candidateIds.has(id)));
  }, [groupAddMemberCandidates, selectedGroupAddMemberIds.length]);

  useEffect(() => {
    setIsGroupInfoOpen(false);
    setIsGroupAddMembersOpen(false);
    setGroupInfoTab('members');
    setGroupInfoLinks([]);
    setGroupInfoLinksCursor(null);
    setGroupInfoLinksHasMore(true);
    setGroupInfoLinksLoading(false);
    groupInfoLinksLoadingRef.current = false;
    setGroupAddMembersQuery('');
    setSelectedGroupAddMemberIds([]);
    setIsAddingGroupMembers(false);
  }, [selectedChat?.chatId]);

  useEffect(() => {
    if (isGroupInfoOpen) return;
    setIsGroupAddMembersOpen(false);
    setGroupAddMembersQuery('');
    setSelectedGroupAddMemberIds([]);
    setIsAddingGroupMembers(false);
  }, [isGroupInfoOpen]);

  const normalizedMessageSearchQuery = messageSearchQuery.trim().toLowerCase();
  const messageSearchMatches = useMemo(() => {
    if (!normalizedMessageSearchQuery) return [];
    return model.messages
      .filter((message) =>
        messagePreviewText(message).toLowerCase().includes(normalizedMessageSearchQuery)
      )
      .map((message) => String(message.messageId));
  }, [model.messages, normalizedMessageSearchQuery]);

  useEffect(() => {
    if (messageSearchMatches.length === 0) {
      setMessageSearchIndex(0);
      return;
    }
    setMessageSearchIndex((prev) => Math.min(prev, messageSearchMatches.length - 1));
  }, [messageSearchMatches.length]);

  const activeMessageSearchId =
    isMessageSearchOpen && messageSearchMatches.length > 0
      ? messageSearchMatches[messageSearchIndex]
      : null;

  const resolveUserMeta = useCallback(
    (id: string) => {
      if (!id) return undefined;
      return (
        model.friends.find((item) => item.userId === id) ||
        model.incomingRequests.find((item) => item.userId === id) ||
        model.outgoingRequests.find((item) => item.userId === id) ||
        model.searchResults.find((item) => item.userId === id)
      );
    },
    [model.friends, model.incomingRequests, model.outgoingRequests, model.searchResults]
  );

  const resolveMessageUserName = useCallback(
    (id: string) => {
      if (id === model.userId) return 'You';
      const meta = resolveUserMeta(id);

      if (selectedChat?.chatType === 'PRIVATE' && selectedChat.participantId === id) {
        return selectedChat.name;
      }

      return meta?.displayName || meta?.username || id.slice(0, 8);
    },
    [model.userId, resolveUserMeta, selectedChat]
  );

  const resolveMessageUserAvatar = useCallback(
    (id: string) => {
      if (!id) return undefined;
      if (id === model.userId) {
        return currentUserProfile?.avatarUrl || (model.user as { avatarUrl?: string } | null)?.avatarUrl;
      }

      const meta = resolveUserMeta(id);
      if (selectedChat?.chatType === 'PRIVATE' && selectedChat.participantId === id) {
        return selectedChat.avatarUrl || meta?.avatarUrl;
      }

      return meta?.avatarUrl;
    },
    [currentUserProfile?.avatarUrl, model.user, model.userId, resolveUserMeta, selectedChat]
  );

  const groupInfoMembers = useMemo<GroupInfoMember[]>(() => {
    if (!selectedChat || selectedChat.chatType !== 'GROUP') {
      return [];
    }

    const participantIds = [...(selectedChat.participantIds || [])];
    if (model.userId && !participantIds.includes(model.userId)) {
      participantIds.unshift(model.userId);
    }

    const uniqueParticipantIds = Array.from(new Set(participantIds.filter(Boolean)));
    const ownerId =
      selectedChat.ownerId ||
      selectedChat.participantIds?.[0] ||
      undefined;
    const currentUserName =
      currentUserProfile?.displayName?.trim() ||
      currentUserProfile?.username?.trim() ||
      (model.user as { displayName?: string } | null)?.displayName?.trim?.() ||
      model.user?.username?.trim?.() ||
      model.userId.slice(0, 8);
    const currentUserAvatarUrl =
      currentUserProfile?.avatarUrl ||
      (model.user as { avatarUrl?: string } | null)?.avatarUrl;

    return uniqueParticipantIds.map((id) => {
      const isCurrentUser = id === model.userId;
      const userMeta = resolveUserMeta(id);
      const presence = isCurrentUser ? currentUserVisualPresence : model.presenceByUser[id];
      const userName =
        isCurrentUser
          ? currentUserName
          : userMeta?.displayName || userMeta?.username || id.slice(0, 8);
      const isOnline = !!presence?.online;

      return {
        userId: id,
        name: userName,
        avatarUrl: isCurrentUser ? currentUserAvatarUrl || userMeta?.avatarUrl : userMeta?.avatarUrl,
        avatarBg: hashColor(id),
        avatarText: initialOf(userName),
        statusText: formatPresenceLabel(presence),
        isOnline,
        isOwner: !!ownerId && id === ownerId,
      };
    });
  }, [currentUserProfile, currentUserVisualPresence, formatPresenceLabel, model.presenceByUser, model.user, model.userId, resolveUserMeta, selectedChat]);
  const groupInfoMemberCount =
    selectedChat?.chatType === 'GROUP'
      ? Math.max(selectedMemberCount, groupInfoMembers.length)
      : 0;

  const loadGroupInfoLinks = useCallback(
    async (reset = false) => {
      const chatId = selectedGroupChat?.chatId;
      if (!chatId || groupInfoLinksLoadingRef.current || groupInfoLinksLoading) {
        return;
      }
      if (!reset && !groupInfoLinksHasMore) {
        return;
      }

      groupInfoLinksLoadingRef.current = true;
      setGroupInfoLinksLoading(true);
      try {
        const before = reset ? undefined : groupInfoLinksCursor ?? undefined;
        const { data } = await http.get<ChatLinksResponse>(
          endpoints.chatLinks(chatId, before, GROUP_INFO_LINKS_PAGE_SIZE)
        );
        const nextItems = (data.items || [])
          .map(toLinksPanelItem)
          .filter((item): item is GroupInfoLinkItem => item !== null);

        setGroupInfoLinks((prev) => {
          const merged = reset ? nextItems : [...prev, ...nextItems];
          const deduplicated = new Map<string, GroupInfoLinkItem>();
          for (const item of merged) {
            deduplicated.set(item.id, item);
          }
          return Array.from(deduplicated.values());
        });
        setGroupInfoLinksCursor(data.nextBeforeMessageId ?? null);
        setGroupInfoLinksHasMore(Boolean(data.hasMore));
      } catch (error) {
        console.error('Failed to load group links:', error);
        if (reset) {
          setGroupInfoLinks([]);
        }
        setGroupInfoLinksHasMore(false);
      } finally {
        groupInfoLinksLoadingRef.current = false;
        setGroupInfoLinksLoading(false);
      }
    },
    [
      groupInfoLinksCursor,
      groupInfoLinksHasMore,
      groupInfoLinksLoading,
      selectedGroupChat?.chatId,
    ]
  );

  const handleGroupInfoLinksLoadMore = useCallback(() => {
    void loadGroupInfoLinks(false);
  }, [loadGroupInfoLinks]);

  useEffect(() => {
    if (!isGroupInfoVisible || groupInfoTab !== 'links') {
      return;
    }
    if (groupInfoLinksLoading || groupInfoLinks.length > 0 || !groupInfoLinksHasMore) {
      return;
    }
    void loadGroupInfoLinks(true);
  }, [
    groupInfoLinks.length,
    groupInfoLinksHasMore,
    groupInfoLinksLoading,
    groupInfoTab,
    isGroupInfoVisible,
    loadGroupInfoLinks,
    selectedGroupChat?.chatId,
  ]);

  const messageSearchResultItems = useMemo(() => {
    if (!normalizedMessageSearchQuery) return [];

    return model.messages
      .map((message) => {
        const searchableText = messagePreviewText(message);
        if (!searchableText.toLowerCase().includes(normalizedMessageSearchQuery)) {
          return null;
        }

        const senderId = message.senderId;
        const isOwn = senderId === model.userId;
        const senderMeta = resolveUserMeta(senderId);
        const isSelectedPrivateAuthor =
          selectedChat?.chatType === 'PRIVATE' && selectedChat.participantId === senderId;
        const senderName =
          senderMeta?.displayName ||
          senderMeta?.username ||
          (isSelectedPrivateAuthor ? selectedChat.name : senderId.slice(0, 8));
        const authorName = isOwn ? 'You' : senderName;
        const avatarUrl =
          senderMeta?.avatarUrl ||
          (isSelectedPrivateAuthor ? selectedChat.avatarUrl : undefined);
        const avatarBg =
          isSelectedPrivateAuthor
            ? selectedChat.avatarBg
            : hashColor(senderId);
        const avatarText =
          isSelectedPrivateAuthor
            ? selectedChat.avatarText
            : initialOf(senderName);

        return {
          id: String(message.messageId),
          searchableText,
          createdAt: message.createdAt,
          authorName,
          avatarUrl,
          avatarBg,
          avatarText,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [model.messages, model.userId, normalizedMessageSearchQuery, resolveUserMeta, selectedChat]);

  const refreshSignedMediaUrls = () => {
    if (!model.selectedChat) return;
    const now = Date.now();
    if (now - lastCircleReloadAtRef.current < 1500) return;
    lastCircleReloadAtRef.current = now;
    void model.loadMessages(model.selectedChat, false);
  };

  const closeMessageSearch = useCallback(() => {
    setIsMessageSearchOpen(false);
    setMessageSearchQuery('');
    setMessageSearchIndex(0);
  }, []);

  const goToNextMessageSearchResult = useCallback(() => {
    if (messageSearchMatches.length === 0) return;
    setMessageSearchIndex((prev) => (prev + 1) % messageSearchMatches.length);
  }, [messageSearchMatches.length]);

  const goToPrevMessageSearchResult = useCallback(() => {
    if (messageSearchMatches.length === 0) return;
    setMessageSearchIndex(
      (prev) => (prev - 1 + messageSearchMatches.length) % messageSearchMatches.length
    );
  }, [messageSearchMatches.length]);

  const schedulePlaybackHide = useCallback(() => {
    setIsPlaybackVisible(false);
    clearPlaybackHideTimer();
    playbackHideTimerRef.current = setTimeout(() => {
      setPlayback((prev) => (prev && prev.isPlaying ? prev : null));
      playbackHideTimerRef.current = null;
    }, 280);
  }, [clearPlaybackHideTimer]);

  const handlePlaybackStateChange = useCallback((state: ChatPlaybackState | null) => {
    if (state && state.isPlaying) {
      clearPlaybackHideTimer();
      setPlayback(state);
      setIsPlaybackVisible(true);
      return;
    }

    if (!state) {
      schedulePlaybackHide();
      return;
    }

    const active = playbackRef.current;
    if (!active || active.mediaId !== state.mediaId) return;

    const next = { ...active, ...state };
    const shouldHide =
      !next.isPlaying &&
      next.durationSec > 0 &&
      next.currentSec <= 0.05;

    setPlayback(next);

    if (shouldHide) {
      schedulePlaybackHide();
      return;
    }

    clearPlaybackHideTimer();
    setIsPlaybackVisible(true);
  }, [clearPlaybackHideTimer, schedulePlaybackHide]);

  useEffect(() => {
    schedulePlaybackHide();
    setPlayback(null);
    closeMessageSearch();
  }, [closeMessageSearch, model.selectedChat, schedulePlaybackHide]);

  return (
    <>
      <Seo {...(routesMeta['/chat'] ?? {})} />
      <div className="h-dvh min-h-dvh w-full overflow-hidden bg-[#0f1115] text-white antialiased">
        <style>{chatPageStyles}</style>

        <div
          className="tg-app flex h-full w-full"
          style={{ '--tg-message-bubble-max-width': `${MESSAGE_BUBBLE_MAX_WIDTH}px` } as Record<
            string,
            string
          >}
        >
          <div className="relative hidden h-full lg:block" style={{ width: sidebarWidth }}>
            <ChatSidebar
              width={sidebarWidth}
              query={query}
              searchPlaceholder={searchPlaceholder}
              searchStatusLabel={searchStatusLabel}
              onQueryChange={setQuery}
              chats={sidebarChats}
              contacts={privateChatContacts}
              onSelectChat={(chatId) => {
                model.setSelectedChat(chatId);
                void model.loadMessages(chatId, false);
              }}
              onCreateGroup={async ({ title, participantIds, avatarPath }) => {
                await model.createGroupChat({
                  title,
                  participantIds,
                  avatarPath,
                });
              }}
              onOpenPrivateChat={async (userId) => {
                await model.openChatWith(userId);
              }}
              onSearchPrivateUsers={searchPrivateUsers}
            />

            <button
              type="button"
              onMouseDown={(event) => {
                if (event.button !== 0) return;
                event.preventDefault();
                sidebarResizeRef.current = {
                  startX: event.clientX,
                  startWidth: sidebarWidth,
                };
                setIsSidebarResizing(true);
                document.body.style.userSelect = 'none';
                document.body.style.cursor = 'col-resize';
              }}
              className="group absolute right-[-6px] top-0 z-[45] h-full w-[12px] cursor-col-resize"
              aria-label="Resize chat sidebar"
            >
              <span
                className={`absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 rounded-full transition-colors ${
                  isSidebarResizing ? 'bg-[#9d83ff]/90' : 'bg-transparent group-hover:bg-white/20'
                }`}
              />
            </button>
          </div>

          <main className="relative flex min-w-0 flex-1 flex-col bg-[#0a0910]">
            <div className="pointer-events-none absolute left-0 right-0 top-0 z-[36]">
              <div className="pointer-events-auto">
                <ChatPlaybackBanner
                  playback={playback}
                  visible={isPlaybackVisible}
                  onClose={() => {
                    playback?.stop();
                    schedulePlaybackHide();
                  }}
                />
              </div>
            </div>

            <div
              className="relative z-[28] transition-transform duration-300"
              style={{
                transform:
                  isPlaybackVisible && playback
                    ? `translateY(${PLAYBACK_BANNER_HEIGHT}px)`
                    : 'translateY(0)',
              }}
            >
              <ChatHeader
                selectedChat={selectedChat}
                selectedStatus={selectedStatus}
                isGroupInfoOpen={isGroupInfoVisible}
                menuOpen={menuOpen}
                setMenuOpen={setMenuOpen}
                menuRef={menuRef}
                isMessageSearchOpen={isMessageSearchOpen}
                messageSearchQuery={messageSearchQuery}
                messageSearchMatchesCount={messageSearchMatches.length}
                messageSearchCurrentIndex={messageSearchIndex}
                onToggleMessageSearch={() => {
                  if (!model.selectedChat) return;
                  if (isMessageSearchOpen) {
                    closeMessageSearch();
                  } else {
                    setIsMessageSearchOpen(true);
                  }
                }}
                onCloseMessageSearch={closeMessageSearch}
                onMessageSearchQueryChange={(value) => {
                  setMessageSearchQuery(value);
                  setMessageSearchIndex(0);
                }}
                onPrevMessageSearchResult={goToPrevMessageSearchResult}
                onNextMessageSearchResult={goToNextMessageSearchResult}
                onToggleGroupInfo={() => {
                  if (selectedChat?.chatType !== 'GROUP') return;
                  setIsGroupInfoOpen((prev) => !prev);
                }}
                onNavigateHome={() => navigate('/')}
              />

              {isMessageSearchOpen ? (
                <div className="relative z-[27] overflow-hidden border-b border-black/35 bg-[#1a1b20]">
                  {!messageSearchQuery.trim() ? (
                    <div className="px-6 py-4 text-center text-[15px] text-white/55">
                      Type text to search messages in this chat.
                    </div>
                  ) : messageSearchResultItems.length === 0 ? (
                    <div className="px-6 py-4 text-center text-[15px] text-white/55">
                      {`There were no results for "${messageSearchQuery}". Try a new search.`}
                    </div>
                  ) : (
                    <div className="tg-scroll max-h-[300px] overflow-y-auto py-1.5">
                      {messageSearchResultItems.map((item, index) => {
                        const isActive = index === messageSearchIndex;
                        return (
                          <button
                            key={`search-result-${item.id}`}
                            type="button"
                            onClick={() => setMessageSearchIndex(index)}
                            className={`mx-2.5 mb-1 flex w-[calc(100%-20px)] items-start gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors ${
                              isActive ? 'bg-white/9' : 'hover:bg-white/5'
                            }`}
                          >
                            <div className="mt-[1px]">
                              <div
                                className="relative shrink-0 overflow-hidden rounded-full"
                                style={{
                                  width: 34,
                                  height: 34,
                                  background: item.avatarBg,
                                  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
                                }}
                              >
                                {item.avatarUrl ? (
                                  <img src={item.avatarUrl} alt={item.avatarText} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-white" style={{ fontSize: 14, fontWeight: 700 }}>
                                    {item.avatarText}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="truncate text-[14px] font-[700] leading-none text-white/96">
                                {item.authorName}
                              </div>
                              <div className="mt-[4px] truncate text-[13px] leading-[1.2] text-white/62">
                                {item.searchableText}
                              </div>
                            </div>

                            <div className="shrink-0 pl-1.5 text-[12px] text-white/55">
                              {formatChatTime(item.createdAt)}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <div className="relative z-0 flex min-h-0 flex-1">
              <div className="min-w-0 flex-1">
                <div
                  className="tg-scroll relative h-full overflow-y-auto"
                  data-chat-scroll-container="true"
                  style={{
                    backgroundColor: '#07070d',
                    backgroundImage: `url("data:image/svg+xml,${chatWallpaperSvg}")`,
                    backgroundSize: '256px 256px',
                  }}
                >
                  <div
                    className="mx-auto flex min-h-full w-full flex-col px-[18px] pb-[110px] pt-[12px]"
                    style={{ maxWidth: COMPOSER_TRACK_MAX_WIDTH }}
                  >
                    <div className="w-full" style={{ maxWidth: MESSAGE_COLUMN_MAX_WIDTH }}>
                      <ChatMessageList
                        messages={model.messages}
                        userId={model.userId}
                        hasSelectedChat={model.selectedChat !== null}
                        messageBubbleMaxWidthPx={MESSAGE_BUBBLE_MAX_WIDTH}
                        messagesEndRef={model.messagesEndRef}
                        matchedMessageIds={isMessageSearchOpen ? messageSearchMatches : []}
                        activeMatchedMessageId={activeMessageSearchId}
                        onCircleMediaError={refreshSignedMediaUrls}
                        onPlaybackStateChange={handlePlaybackStateChange}
                        resolveUserName={resolveMessageUserName}
                        resolveUserAvatar={resolveMessageUserAvatar}
                        onReplyMessage={(message) => {
                          model.setEditingMessage(null);
                          model.setReplyingTo(message);
                        }}
                        onEditMessage={(message) => {
                          model.setReplyingTo(null);
                          model.setEditingMessage(message);
                          model.setMessageInput(message.content || '');
                        }}
                        onDeleteMessage={(messageId) => {
                          void model.deleteMessage(messageId);
                        }}
                        onCopyMessage={(text) => {
                          model.copyMessageText(text);
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {selectedGroupChat ? (
                <div
                  className="relative hidden h-full shrink-0 overflow-hidden transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:block"
                  style={{ width: isGroupInfoVisible ? GROUP_INFO_PANEL_WIDTH : 0 }}
                >
                  <div
                    className={`absolute inset-y-0 right-0 w-[360px] transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      isGroupInfoVisible
                        ? 'translate-x-0 opacity-100'
                        : 'pointer-events-none translate-x-8 opacity-0'
                    }`}
                  >
                    {isGroupAddMembersOpen ? (
                      <GroupAddMembersPanel
                        query={groupAddMembersQuery}
                        onQueryChange={setGroupAddMembersQuery}
                        candidates={filteredGroupAddMemberCandidates}
                        selectedIds={selectedGroupAddMemberIds}
                        onToggleSelect={toggleGroupAddMember}
                        onBack={() => {
                          setIsGroupAddMembersOpen(false);
                          setGroupAddMembersQuery('');
                          setSelectedGroupAddMemberIds([]);
                        }}
                        onSubmit={() => {
                          void submitGroupAddMembers();
                        }}
                        isSubmitting={isAddingGroupMembers}
                      />
                    ) : (
                      <GroupInfoPanel
                        chat={selectedGroupChat}
                        memberCount={groupInfoMemberCount}
                        members={groupInfoMembers}
                        links={groupInfoLinks}
                        linksLoading={groupInfoLinksLoading}
                        linksHasMore={groupInfoLinksHasMore}
                        onLinksLoadMore={handleGroupInfoLinksLoadMore}
                        activeTab={groupInfoTab}
                        onTabChange={setGroupInfoTab}
                        notificationsEnabled={groupNotificationsEnabled}
                        onNotificationsEnabledChange={setGroupNotificationsEnabled}
                        onAddMembersClick={() => {
                          setIsGroupAddMembersOpen(true);
                        }}
                        onClose={() => {
                          setIsGroupAddMembersOpen(false);
                          setIsGroupInfoOpen(false);
                        }}
                      />
                    )}
                  </div>
                </div>
              ) : null}

              {selectedGroupChat ? (
                <div
                  className={`absolute inset-0 z-[46] bg-black/55 backdrop-blur-[1.5px] transition-opacity duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:hidden ${
                    isGroupInfoVisible ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
                  }`}
                  onClick={() => {
                    setIsGroupAddMembersOpen(false);
                    setIsGroupInfoOpen(false);
                  }}
                >
                  <div
                    className={`ml-auto h-full w-full max-w-[420px] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      isGroupInfoVisible ? 'translate-x-0' : 'translate-x-full'
                    }`}
                    onClick={(event) => event.stopPropagation()}
                  >
                    {isGroupAddMembersOpen ? (
                      <GroupAddMembersPanel
                        query={groupAddMembersQuery}
                        onQueryChange={setGroupAddMembersQuery}
                        candidates={filteredGroupAddMemberCandidates}
                        selectedIds={selectedGroupAddMemberIds}
                        onToggleSelect={toggleGroupAddMember}
                        onBack={() => {
                          setIsGroupAddMembersOpen(false);
                          setGroupAddMembersQuery('');
                          setSelectedGroupAddMemberIds([]);
                        }}
                        onSubmit={() => {
                          void submitGroupAddMembers();
                        }}
                        isSubmitting={isAddingGroupMembers}
                      />
                    ) : (
                      <GroupInfoPanel
                        chat={selectedGroupChat}
                        memberCount={groupInfoMemberCount}
                        members={groupInfoMembers}
                        links={groupInfoLinks}
                        linksLoading={groupInfoLinksLoading}
                        linksHasMore={groupInfoLinksHasMore}
                        onLinksLoadMore={handleGroupInfoLinksLoadMore}
                        activeTab={groupInfoTab}
                        onTabChange={setGroupInfoTab}
                        notificationsEnabled={groupNotificationsEnabled}
                        onNotificationsEnabledChange={setGroupNotificationsEnabled}
                        onAddMembersClick={() => {
                          setIsGroupAddMembersOpen(true);
                        }}
                        onClose={() => {
                          setIsGroupAddMembersOpen(false);
                          setIsGroupInfoOpen(false);
                        }}
                      />
                    )}
                  </div>
                </div>
              ) : null}

              {model.isRecordingCircle ? (
                <CircleRecordingOverlay stream={model.recordingCircleStream} />
              ) : null}
            </div>

            <div
              className={`absolute bottom-0 left-0 right-0 transition-[right] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                isGroupInfoVisible ? 'lg:right-[360px]' : 'lg:right-0'
              }`}
              data-chat-composer-container="true"
            >
              <ChatComposer model={model} />
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
