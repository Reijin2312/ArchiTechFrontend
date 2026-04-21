import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { http } from '@/shared/api/http';
import { endpoints } from '@/shared/api/endpoints';
import type {
  ChatAdminRights,
  ChatAdminLogItem,
  ChatGroupMediaItem,
  ChatGroupMediaItemsResponse,
  ChatGroupMemberRole,
  ChatGroupMembersResponse,
  ChatGroupPermissions,
  ChatGroupSettings,
  ChatInviteLinksResponse,
  ChatJoinRequestsResponse,
  ChatLinkItem,
  ChatLinksResponse,
  ChatMemberRestrictions,
  ChatTopic,
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
const CHAT_STICKY_BOTTOM_THRESHOLD_PX = 96;

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
  const [groupSettings, setGroupSettings] = useState<ChatGroupSettings | null>(null);
  const [groupPermissions, setGroupPermissions] = useState<ChatGroupPermissions | null>(null);
  const [selectedGroupAdminRights, setSelectedGroupAdminRights] = useState<ChatAdminRights | null>(null);
  const [groupInviteLinks, setGroupInviteLinks] = useState<ChatInviteLinksResponse['items']>([]);
  const [groupJoinRequests, setGroupJoinRequests] = useState<ChatJoinRequestsResponse['items']>([]);
  const [groupTopics, setGroupTopics] = useState<ChatTopic[]>([]);
  const [groupAdminLogItems, setGroupAdminLogItems] = useState<ChatAdminLogItem[]>([]);
  const [groupAdminLogCursor, setGroupAdminLogCursor] = useState<number | null>(null);
  const [groupAdminLogHasMore, setGroupAdminLogHasMore] = useState(true);
  const [groupAdminLogLoading, setGroupAdminLogLoading] = useState(false);
  const [groupMediaItems, setGroupMediaItems] = useState<ChatGroupMediaItem[]>([]);
  const [groupMediaCursor, setGroupMediaCursor] = useState<number | null>(null);
  const [groupMediaHasMore, setGroupMediaHasMore] = useState(true);
  const [groupMediaLoading, setGroupMediaLoading] = useState(false);
  const [groupFileItems, setGroupFileItems] = useState<ChatGroupMediaItem[]>([]);
  const [groupFilesCursor, setGroupFilesCursor] = useState<number | null>(null);
  const [groupFilesHasMore, setGroupFilesHasMore] = useState(true);
  const [groupFilesLoading, setGroupFilesLoading] = useState(false);
  const [groupAddMembersQuery, setGroupAddMembersQuery] = useState('');
  const [selectedGroupAddMemberIds, setSelectedGroupAddMemberIds] = useState<string[]>([]);
  const [isAddingGroupMembers, setIsAddingGroupMembers] = useState(false);
  const [groupMembersByUserId, setGroupMembersByUserId] = useState<
    Record<string, { role: ChatGroupMemberRole; joinedAt?: string | null }>
  >({});
  const [groupMemberTagsByUserId, setGroupMemberTagsByUserId] = useState<Record<string, string>>({});
  const [selectedGroupTopicId, setSelectedGroupTopicId] = useState<number | undefined>(undefined);
  const [isGroupMembersLoading, setIsGroupMembersLoading] = useState(false);
  const [presenceNowMs, setPresenceNowMs] = useState(() => Date.now());
  const [isDocumentVisible, setIsDocumentVisible] = useState(
    () => typeof document === 'undefined' || document.visibilityState === 'visible'
  );
  const [statusDots, setStatusDots] = useState(0);
  const [currentUserProfile, setCurrentUserProfile] = useState<CurrentUserProfile | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_MAX_WIDTH);
  const [isSidebarResizing, setIsSidebarResizing] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const lastCircleReloadAtRef = useRef(0);
  const sidebarResizeRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const playbackHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playbackRef = useRef<ChatPlaybackState | null>(null);
  const groupInfoLinksLoadingRef = useRef(false);
  const groupMediaLoadingRef = useRef(false);
  const groupFilesLoadingRef = useRef(false);
  const groupAdminLogLoadingRef = useRef(false);
  const [playback, setPlayback] = useState<ChatPlaybackState | null>(null);
  const [isPlaybackVisible, setIsPlaybackVisible] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [pendingIncomingCount, setPendingIncomingCount] = useState(0);
  const lastSeenIncomingMessageIdRef = useRef(0);
  const historyLoadInFlightRef = useRef(false);
  const lastHistoryLoadAttemptAtRef = useRef(0);

  useEffect(() => {
    model.setIsOpen(true);
    model.setActiveTab('chat');
  }, []);

  const getMaxIncomingServerMessageId = useCallback(
    (sourceMessages: typeof model.messages) => {
      if (!model.selectedChat || !model.userId) {
        return 0;
      }
      return sourceMessages.reduce((maxId, message) => {
        if (message.chatId !== model.selectedChat) return maxId;
        if (message.senderId === model.userId) return maxId;
        if (typeof message.messageId !== 'number') return maxId;
        return message.messageId > maxId ? message.messageId : maxId;
      }, 0);
    },
    [model.selectedChat, model.userId]
  );

  useEffect(() => {
    if (!model.selectedChat) {
      setPendingIncomingCount(0);
      setIsNearBottom(true);
      lastSeenIncomingMessageIdRef.current = 0;
      return;
    }

    const initialMaxIncomingId = getMaxIncomingServerMessageId(model.messages);
    lastSeenIncomingMessageIdRef.current = initialMaxIncomingId;
    setPendingIncomingCount(0);
  }, [model.selectedChat, model.messages, getMaxIncomingServerMessageId]);

  useEffect(() => {
    if (!model.selectedChat) {
      return;
    }

    const scrollContainer = document.querySelector<HTMLElement>(
      '[data-chat-scroll-container="true"]'
    );
    if (!scrollContainer) {
      return;
    }

    const syncBottomState = () => {
      const distanceToBottom =
        scrollContainer.scrollHeight - (scrollContainer.scrollTop + scrollContainer.clientHeight);
      const nearBottom = distanceToBottom <= CHAT_STICKY_BOTTOM_THRESHOLD_PX;
      setIsNearBottom(nearBottom);
      if (!nearBottom) {
        return;
      }

      const maxIncomingId = getMaxIncomingServerMessageId(model.messages);
      if (maxIncomingId > lastSeenIncomingMessageIdRef.current) {
        lastSeenIncomingMessageIdRef.current = maxIncomingId;
      }
      setPendingIncomingCount(0);
    };

    syncBottomState();
    scrollContainer.addEventListener('scroll', syncBottomState, { passive: true });
    window.addEventListener('resize', syncBottomState, { passive: true });

    return () => {
      scrollContainer.removeEventListener('scroll', syncBottomState);
      window.removeEventListener('resize', syncBottomState);
    };
  }, [model.selectedChat, model.messages, getMaxIncomingServerMessageId]);

  useEffect(() => {
    if (!model.selectedChat || !model.userId) {
      setPendingIncomingCount(0);
      return;
    }

    const maxIncomingId = getMaxIncomingServerMessageId(model.messages);
    if (isNearBottom) {
      if (maxIncomingId > lastSeenIncomingMessageIdRef.current) {
        lastSeenIncomingMessageIdRef.current = maxIncomingId;
      }
      setPendingIncomingCount(0);
      return;
    }

    const unseenIncomingCount = model.messages.reduce((count, message) => {
      if (message.chatId !== model.selectedChat) return count;
      if (message.senderId === model.userId) return count;
      if (typeof message.messageId !== 'number') return count;
      if (message.messageId <= lastSeenIncomingMessageIdRef.current) return count;
      return count + 1;
    }, 0);
    setPendingIncomingCount(unseenIncomingCount);
  }, [
    model.messages,
    model.selectedChat,
    model.userId,
    isNearBottom,
    getMaxIncomingServerMessageId,
  ]);

  useEffect(() => {
    if (!model.selectedChat) {
      historyLoadInFlightRef.current = false;
      return;
    }

    const scrollContainer = document.querySelector<HTMLElement>(
      '[data-chat-scroll-container="true"]'
    );
    if (!scrollContainer) {
      return;
    }

    const maybeLoadOlder = () => {
      if (scrollContainer.scrollTop > 140) {
        return;
      }
      if (historyLoadInFlightRef.current) {
        return;
      }
      const now = Date.now();
      if (now - lastHistoryLoadAttemptAtRef.current < 280) {
        return;
      }
      lastHistoryLoadAttemptAtRef.current = now;
      historyLoadInFlightRef.current = true;
      void model.loadOlderMessages(model.selectedChat!, 50).finally(() => {
        historyLoadInFlightRef.current = false;
      });
    };

    maybeLoadOlder();
    scrollContainer.addEventListener('scroll', maybeLoadOlder, { passive: true });
    return () => {
      scrollContainer.removeEventListener('scroll', maybeLoadOlder);
    };
  }, [model.selectedChat, model.loadOlderMessages, model.messages.length]);

  const handleJumpToBottom = useCallback(() => {
    model.setAutoScrollLocked(false);
    model.scrollToBottom(true);
    const maxIncomingId = getMaxIncomingServerMessageId(model.messages);
    if (maxIncomingId > 0) {
      lastSeenIncomingMessageIdRef.current = maxIncomingId;
    }
    setPendingIncomingCount(0);
    setIsNearBottom(true);
  }, [model, getMaxIncomingServerMessageId]);

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
  const visibleMessages = useMemo(() => {
    if (!selectedChat) {
      return [];
    }
    if (!selectedGroupChat || !selectedGroupTopicId) {
      return model.messages;
    }
    return model.messages.filter((message) => {
      if (typeof message.topicId !== 'number') {
        return false;
      }
      return message.topicId === selectedGroupTopicId;
    });
  }, [model.messages, selectedChat, selectedGroupChat, selectedGroupTopicId]);
  const isGroupInfoVisible = isGroupInfoOpen && !!selectedGroupChat;
  const selectedGroupParticipantIdSet = useMemo(() => {
    const ids = new Set<string>([
      ...(selectedGroupChat?.participantIds || []),
      ...Object.keys(groupMembersByUserId),
    ].filter(Boolean));
    if (model.userId) {
      ids.add(model.userId);
    }
    return ids;
  }, [groupMembersByUserId, model.userId, selectedGroupChat]);
  const loadGroupMembers = useCallback(async (chatId: number) => {
    if (!Number.isFinite(chatId) || chatId <= 0) {
      setGroupMembersByUserId({});
      setGroupMemberTagsByUserId({});
      return;
    }

    setIsGroupMembersLoading(true);
    try {
      const { data } = await http.get<ChatGroupMembersResponse>(endpoints.chatMembers(chatId));
      const next: Record<string, { role: ChatGroupMemberRole; joinedAt?: string | null }> = {};
      const adminOrOwnerIds: string[] = [];
      for (const member of data.members || []) {
        if (!member?.userId) continue;
        const role = (member.role || 'MEMBER').toUpperCase();
        const normalizedRole: ChatGroupMemberRole =
          role === 'OWNER' || role === 'ADMIN' || role === 'MEMBER' ? role : 'MEMBER';
        next[member.userId] = {
          role: normalizedRole,
          joinedAt: member.joinedAt,
        };
        if (normalizedRole === 'OWNER' || normalizedRole === 'ADMIN') {
          adminOrOwnerIds.push(member.userId);
        }
      }

      const nextTags: Record<string, string> = {};
      if (adminOrOwnerIds.length > 0) {
        const rightsResults = await Promise.allSettled(
          adminOrOwnerIds.map(async (userId) => {
            const rights = await model.getAdminRights(chatId, userId);
            return { userId, customTitle: rights.customTitle?.trim() || '' };
          })
        );

        for (const result of rightsResults) {
          if (result.status !== 'fulfilled') continue;
          if (!result.value.customTitle) continue;
          nextTags[result.value.userId] = result.value.customTitle;
        }
      }

      setGroupMembersByUserId(next);
      setGroupMemberTagsByUserId(nextTags);
    } catch (error) {
      console.error('Failed to load group members:', error);
      setGroupMembersByUserId({});
      setGroupMemberTagsByUserId({});
    } finally {
      setIsGroupMembersLoading(false);
    }
  }, [model]);

  const loadGroupMeta = useCallback(async (chatId: number) => {
    if (!Number.isFinite(chatId) || chatId <= 0) {
      setGroupSettings(null);
      setGroupPermissions(null);
      setGroupInviteLinks([]);
      setGroupJoinRequests([]);
      setGroupTopics([]);
      setGroupAdminLogItems([]);
      setGroupAdminLogCursor(null);
      setGroupAdminLogHasMore(true);
      setGroupAdminLogLoading(false);
      return;
    }

    const [
      settingsResult,
      permissionsResult,
      adminRightsResult,
      inviteResult,
      joinRequestsResult,
      topicsResult,
      adminLogResult,
    ] = await Promise.allSettled([
      model.getGroupSettings(chatId),
      model.getGroupPermissions(chatId),
      model.userId ? model.getAdminRights(chatId, model.userId) : Promise.resolve(null),
      model.getInviteLinks(chatId),
      model.getJoinRequests(chatId, 'PENDING'),
      model.getTopics(chatId, false),
      model.getGroupAdminLog(chatId, undefined, 40),
    ]);

    if (settingsResult.status === 'fulfilled') {
      setGroupSettings(settingsResult.value);
    } else {
      setGroupSettings(null);
    }

    if (permissionsResult.status === 'fulfilled') {
      setGroupPermissions(permissionsResult.value);
    } else {
      setGroupPermissions(null);
    }

    if (adminRightsResult.status === 'fulfilled') {
      setSelectedGroupAdminRights(adminRightsResult.value);
    } else {
      setSelectedGroupAdminRights(null);
    }

    if (inviteResult.status === 'fulfilled') {
      setGroupInviteLinks(inviteResult.value.items || []);
    } else {
      setGroupInviteLinks([]);
    }

    if (joinRequestsResult.status === 'fulfilled') {
      setGroupJoinRequests(joinRequestsResult.value.items || []);
    } else {
      setGroupJoinRequests([]);
    }

    if (topicsResult.status === 'fulfilled') {
      setGroupTopics(topicsResult.value.items || []);
    } else {
      setGroupTopics([]);
    }

    if (adminLogResult.status === 'fulfilled') {
      const firstPage = adminLogResult.value.items || [];
      setGroupAdminLogItems(firstPage);
      setGroupAdminLogCursor(adminLogResult.value.nextBeforeId ?? null);
      setGroupAdminLogHasMore(Boolean(adminLogResult.value.hasMore));
    } else {
      setGroupAdminLogItems([]);
      setGroupAdminLogCursor(null);
      setGroupAdminLogHasMore(false);
    }
  }, [model]);

  useEffect(() => {
    if (!selectedGroupChat) {
      setGroupMembersByUserId({});
      setGroupMemberTagsByUserId({});
      setIsGroupMembersLoading(false);
      return;
    }
    void loadGroupMembers(selectedGroupChat.chatId);
  }, [loadGroupMembers, selectedGroupChat]);

  useEffect(() => {
    if (!selectedGroupChat || !isGroupInfoVisible) {
      return;
    }
    void loadGroupMeta(selectedGroupChat.chatId);
  }, [isGroupInfoVisible, loadGroupMeta, selectedGroupChat]);

  useEffect(() => {
    if (!selectedGroupChat || !selectedGroupTopicId) {
      return;
    }
    const exists = groupTopics.some((topic) => topic.id === selectedGroupTopicId && !topic.deleted);
    if (exists) {
      return;
    }
    setSelectedGroupTopicId(undefined);
    model.setActiveTopicId(selectedGroupChat.chatId, undefined);
    void model.loadMessages(selectedGroupChat.chatId, false, undefined);
  }, [groupTopics, model, selectedGroupChat, selectedGroupTopicId]);

  const selectedGroupCurrentRole = useMemo<ChatGroupMemberRole>(() => {
    if (!selectedGroupChat || !model.userId) {
      return 'MEMBER';
    }
    const fromApi = groupMembersByUserId[model.userId]?.role;
    if (fromApi) {
      return fromApi;
    }
    const ownerFallbackId =
      Object.entries(groupMembersByUserId).find(([, value]) => value.role === 'OWNER')?.[0] ||
      selectedGroupChat.ownerId ||
      selectedGroupChat.participantIds?.[0];
    if (ownerFallbackId && ownerFallbackId === model.userId) {
      return 'OWNER';
    }
    return 'MEMBER';
  }, [groupMembersByUserId, model.userId, selectedGroupChat]);

  const isGroupOwner = selectedGroupCurrentRole === 'OWNER';
  const isGroupAdmin = selectedGroupCurrentRole === 'ADMIN';
  const canManageGroupMembers =
    isGroupOwner || (isGroupAdmin && !!selectedGroupAdminRights?.canManageMembers);
  const canEditGroupInfo =
    isGroupOwner || (isGroupAdmin && !!selectedGroupAdminRights?.canManageGroup);
  const canManageInviteLinks =
    isGroupOwner || (isGroupAdmin && !!selectedGroupAdminRights?.canManageInviteLinks);
  const canManageJoinRequests = canManageInviteLinks || canManageGroupMembers;
  const canBanGroupMembers =
    isGroupOwner || (isGroupAdmin && !!selectedGroupAdminRights?.canBanUsers);
  const canPinGroupMessages =
    isGroupOwner || (isGroupAdmin && !!selectedGroupAdminRights?.canPinMessages);
  const canManageTopics =
    isGroupOwner || (isGroupAdmin && !!selectedGroupAdminRights?.canManageTopics);
  const canManagePolls =
    isGroupOwner || (isGroupAdmin && !!selectedGroupAdminRights?.canManagePolls);
  const canDeleteAnyGroupMessage =
    isGroupOwner || (isGroupAdmin && !!selectedGroupAdminRights?.canDeleteMessages);
  const canViewAdminLog =
    isGroupOwner || (isGroupAdmin && !!selectedGroupAdminRights?.canManageGroup);
  const canCreatePollInGroup =
    isGroupOwner ||
    (isGroupAdmin && !!selectedGroupAdminRights?.canManagePolls) ||
    (!!groupPermissions?.canSendMessages && !!groupPermissions?.canSendPolls);
  const canAddGroupMembers = canManageGroupMembers;
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
      await model.addGroupMembers(selectedGroupChat.chatId, selectedGroupAddMemberIds);

      setSelectedGroupAddMemberIds([]);
      setGroupAddMembersQuery('');
      setIsGroupAddMembersOpen(false);
      await loadGroupMembers(selectedGroupChat.chatId);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to add members to the group');
    } finally {
      setIsAddingGroupMembers(false);
    }
  }, [
    isAddingGroupMembers,
    model,
    loadGroupMembers,
    selectedGroupAddMemberIds,
    selectedGroupChat,
  ]);
  const updateGroupInfo = useCallback(
    async (payload: { title?: string; avatarPath?: string }) => {
      if (!selectedGroupChat) return;
      await model.updateGroupChat(selectedGroupChat.chatId, payload);
      await loadGroupMembers(selectedGroupChat.chatId);
      await loadGroupMeta(selectedGroupChat.chatId);
    },
    [loadGroupMembers, loadGroupMeta, model, selectedGroupChat]
  );

  const updateGroupSettings = useCallback(
    async (payload: {
      description?: string;
      isPublic?: boolean;
      publicUsername?: string;
      historyVisibleToNewMembers?: boolean;
      slowModeSeconds?: number;
      topicsEnabled?: boolean;
      reactionsEnabled?: boolean;
      reactionMode?: 'ALL' | 'SOME' | 'NONE';
      allowedReactions?: string[];
      pollsEnabled?: boolean;
    }) => {
      if (!selectedGroupChat) return;
      const nextSettings = await model.updateGroupSettings(selectedGroupChat.chatId, payload);
      setGroupSettings(nextSettings);
      await loadGroupMeta(selectedGroupChat.chatId);
    },
    [loadGroupMeta, model, selectedGroupChat]
  );

  const updateGroupPermissions = useCallback(
    async (payload: {
      canSendMessages?: boolean;
      canSendMedia?: boolean;
      canSendPolls?: boolean;
      canAddWebPagePreviews?: boolean;
      canChangeInfo?: boolean;
      canInviteUsers?: boolean;
      canPinMessages?: boolean;
    }) => {
      if (!selectedGroupChat) return;
      const nextPermissions = await model.updateGroupPermissions(selectedGroupChat.chatId, payload);
      setGroupPermissions(nextPermissions);
      await loadGroupMeta(selectedGroupChat.chatId);
    },
    [loadGroupMeta, model, selectedGroupChat]
  );

  const createInviteLink = useCallback(
    async (payload: { name?: string; createsJoinRequest?: boolean; expiresAt?: string; usageLimit?: number }) => {
      if (!selectedGroupChat) return;
      await model.createInviteLink(selectedGroupChat.chatId, payload);
      await loadGroupMeta(selectedGroupChat.chatId);
    },
    [loadGroupMeta, model, selectedGroupChat]
  );

  const updateInviteLink = useCallback(
    async (
      inviteId: number,
      payload: {
        name?: string;
        createsJoinRequest?: boolean;
        expiresAt?: string;
        clearExpiresAt?: boolean;
        usageLimit?: number;
        clearUsageLimit?: boolean;
      }
    ) => {
      if (!selectedGroupChat) return;
      await model.updateInviteLink(selectedGroupChat.chatId, inviteId, payload);
      await loadGroupMeta(selectedGroupChat.chatId);
    },
    [loadGroupMeta, model, selectedGroupChat]
  );

  const revokeInviteLink = useCallback(
    async (inviteId: number) => {
      if (!selectedGroupChat) return;
      await model.revokeInviteLink(selectedGroupChat.chatId, inviteId);
      await loadGroupMeta(selectedGroupChat.chatId);
    },
    [loadGroupMeta, model, selectedGroupChat]
  );

  const approveJoinRequest = useCallback(
    async (requestId: number) => {
      if (!selectedGroupChat) return;
      await model.approveJoinRequest(selectedGroupChat.chatId, requestId);
      await loadGroupMeta(selectedGroupChat.chatId);
      await loadGroupMembers(selectedGroupChat.chatId);
    },
    [loadGroupMembers, loadGroupMeta, model, selectedGroupChat]
  );

  const declineJoinRequest = useCallback(
    async (requestId: number) => {
      if (!selectedGroupChat) return;
      await model.declineJoinRequest(selectedGroupChat.chatId, requestId);
      await loadGroupMeta(selectedGroupChat.chatId);
    },
    [loadGroupMeta, model, selectedGroupChat]
  );

  const createTopic = useCallback(
    async (payload: { title: string; iconEmoji?: string }) => {
      if (!selectedGroupChat) return;
      await model.createTopic(selectedGroupChat.chatId, payload);
      await loadGroupMeta(selectedGroupChat.chatId);
    },
    [loadGroupMeta, model, selectedGroupChat]
  );

  const toggleTopicClosed = useCallback(
    async (topicId: number, closed: boolean) => {
      if (!selectedGroupChat) return;
      await model.updateTopic(selectedGroupChat.chatId, topicId, { closed });
      await loadGroupMeta(selectedGroupChat.chatId);
    },
    [loadGroupMeta, model, selectedGroupChat]
  );

  const deleteTopic = useCallback(
    async (topicId: number) => {
      if (!selectedGroupChat) return;
      await model.updateTopic(selectedGroupChat.chatId, topicId, { deleted: true });
      await loadGroupMeta(selectedGroupChat.chatId);
    },
    [loadGroupMeta, model, selectedGroupChat]
  );

  const openTopicThread = useCallback(
    async (topicId?: number) => {
      if (!selectedGroupChat) return;
      const normalizedTopicId =
        typeof topicId === 'number' && Number.isFinite(topicId) && topicId > 0
          ? Math.trunc(topicId)
          : undefined;
      setSelectedGroupTopicId(normalizedTopicId);
      model.setActiveTopicId(selectedGroupChat.chatId, normalizedTopicId);
      await model.loadMessages(selectedGroupChat.chatId, false, normalizedTopicId);
    },
    [model, selectedGroupChat]
  );

  const pinGroupMessage = useCallback(
    async (messageId: number) => {
      if (!selectedGroupChat) return;
      await model.pinGroupMessage(selectedGroupChat.chatId, messageId);
      await loadGroupMeta(selectedGroupChat.chatId);
    },
    [loadGroupMeta, model, selectedGroupChat]
  );

  const unpinGroupMessage = useCallback(async () => {
    if (!selectedGroupChat) return;
    await model.unpinGroupMessage(selectedGroupChat.chatId);
    await loadGroupMeta(selectedGroupChat.chatId);
  }, [loadGroupMeta, model, selectedGroupChat]);

  const loadMessageReactions = useCallback(
    async (chatId: number, messageId: number) => model.getMessageReactions(chatId, messageId),
    [model]
  );

  const toggleMessageReaction = useCallback(
    async (chatId: number, messageId: number, emoji: string) =>
      model.toggleMessageReaction(chatId, messageId, emoji),
    [model]
  );

  const loadPollByMessageId = useCallback(
    async (chatId: number, messageId: number) => {
      try {
        return await model.getPollByMessageId(chatId, messageId);
      } catch (error) {
        console.error('Failed to load poll by message id:', error);
        return null;
      }
    },
    [model]
  );

  const votePoll = useCallback(
    async (chatId: number, pollId: number, optionIndexes: number[]) =>
      model.votePoll(chatId, pollId, optionIndexes),
    [model]
  );

  const loadPollVoters = useCallback(
    async (chatId: number, pollId: number) => model.getPollVoters(chatId, pollId),
    [model]
  );

  const closePoll = useCallback(
    async (chatId: number, pollId: number) => {
      await model.closePoll(chatId, pollId);
      if (selectedGroupChat?.chatId === chatId) {
        await loadGroupMeta(chatId);
      }
    },
    [loadGroupMeta, model, selectedGroupChat]
  );

  const createGroupPoll = useCallback(
    async (payload: {
      question: string;
      allowsMultiple?: boolean;
      quiz?: boolean;
      correctOptionIndex?: number;
      explanation?: string;
      anonymousVotes?: boolean;
      options: string[];
    }) => {
      if (!selectedGroupChat) return;
      await model.createPoll(selectedGroupChat.chatId, {
        ...payload,
        topicId: selectedGroupTopicId,
      });
      await model.loadMessages(selectedGroupChat.chatId, false, selectedGroupTopicId);
      await loadGroupMeta(selectedGroupChat.chatId);
    },
    [loadGroupMeta, model, selectedGroupChat, selectedGroupTopicId]
  );

  const muteGroupMember = useCallback(
    async (userId: string) => {
      if (!selectedGroupChat) return;
      const mutedUntil = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      await model.updateMemberRestrictions(selectedGroupChat.chatId, userId, {
        mutedUntil,
      });
      await loadGroupMeta(selectedGroupChat.chatId);
    },
    [loadGroupMeta, model, selectedGroupChat]
  );

  const unmuteGroupMember = useCallback(
    async (userId: string) => {
      if (!selectedGroupChat) return;
      await model.updateMemberRestrictions(selectedGroupChat.chatId, userId, {
        clearMutedUntil: true,
      });
      await loadGroupMeta(selectedGroupChat.chatId);
    },
    [loadGroupMeta, model, selectedGroupChat]
  );

  const banGroupMember = useCallback(
    async (userId: string) => {
      if (!selectedGroupChat) return;
      const bannedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await model.updateMemberRestrictions(selectedGroupChat.chatId, userId, {
        bannedUntil,
      });
      await loadGroupMeta(selectedGroupChat.chatId);
    },
    [loadGroupMeta, model, selectedGroupChat]
  );

  const unbanGroupMember = useCallback(
    async (userId: string) => {
      if (!selectedGroupChat) return;
      await model.updateMemberRestrictions(selectedGroupChat.chatId, userId, {
        clearBannedUntil: true,
      });
      await loadGroupMeta(selectedGroupChat.chatId);
    },
    [loadGroupMeta, model, selectedGroupChat]
  );

  const removeGroupMember = useCallback(
    async (userId: string) => {
      if (!selectedGroupChat) return;
      await model.removeGroupMembers(selectedGroupChat.chatId, [userId]);
      await loadGroupMembers(selectedGroupChat.chatId);
      await loadGroupMeta(selectedGroupChat.chatId);
    },
    [loadGroupMembers, loadGroupMeta, model, selectedGroupChat]
  );

  const promoteGroupMember = useCallback(
    async (userId: string) => {
      if (!selectedGroupChat) return;
      await model.updateGroupMemberRole(selectedGroupChat.chatId, userId, 'ADMIN');
      await loadGroupMembers(selectedGroupChat.chatId);
      await loadGroupMeta(selectedGroupChat.chatId);
    },
    [loadGroupMembers, loadGroupMeta, model, selectedGroupChat]
  );

  const demoteGroupMember = useCallback(
    async (userId: string) => {
      if (!selectedGroupChat) return;
      await model.updateGroupMemberRole(selectedGroupChat.chatId, userId, 'MEMBER');
      await loadGroupMembers(selectedGroupChat.chatId);
      await loadGroupMeta(selectedGroupChat.chatId);
    },
    [loadGroupMembers, loadGroupMeta, model, selectedGroupChat]
  );

  const transferGroupOwnership = useCallback(
    async (userId: string) => {
      if (!selectedGroupChat) return;
      await model.updateGroupMemberRole(selectedGroupChat.chatId, userId, 'OWNER');
      await loadGroupMembers(selectedGroupChat.chatId);
      await loadGroupMeta(selectedGroupChat.chatId);
    },
    [loadGroupMembers, loadGroupMeta, model, selectedGroupChat]
  );

  const openMemberPrivateChat = useCallback(
    async (userId: string) => {
      if (!userId || userId === model.userId) return;
      await model.openChatWith(userId);
      setIsGroupInfoOpen(false);
      setIsGroupAddMembersOpen(false);
      setGroupInfoTab('members');
    },
    [model]
  );

  const loadMemberAdminRights = useCallback(
    async (userId: string) => {
      if (!selectedGroupChat) {
        throw new Error('Group is not selected');
      }
      return model.getAdminRights(selectedGroupChat.chatId, userId);
    },
    [model, selectedGroupChat]
  );

  const saveMemberAdminRights = useCallback(
    async (
      userId: string,
      payload: {
        canManageGroup?: boolean;
        canManageMembers?: boolean;
        canManageInviteLinks?: boolean;
        canPinMessages?: boolean;
        canDeleteMessages?: boolean;
        canBanUsers?: boolean;
        canManageTopics?: boolean;
        canManageReactions?: boolean;
        canManagePolls?: boolean;
        isAnonymous?: boolean;
        customTitle?: string | null;
      }
    ) => {
      if (!selectedGroupChat) return;
      await model.updateAdminRights(selectedGroupChat.chatId, userId, payload);
      await loadGroupMembers(selectedGroupChat.chatId);
      await loadGroupMeta(selectedGroupChat.chatId);
    },
    [loadGroupMembers, loadGroupMeta, model, selectedGroupChat]
  );

  const loadMemberRestrictions = useCallback(
    async (userId: string): Promise<ChatMemberRestrictions> => {
      if (!selectedGroupChat) {
        throw new Error('Group is not selected');
      }
      return model.getMemberRestrictions(selectedGroupChat.chatId, userId);
    },
    [model, selectedGroupChat]
  );

  const saveMemberRestrictions = useCallback(
    async (
      userId: string,
      payload: {
        mutedUntil?: string | null;
        bannedUntil?: string | null;
        clearMutedUntil?: boolean;
        clearBannedUntil?: boolean;
        canSendMessages?: boolean;
        canSendMedia?: boolean;
        canSendPhotos?: boolean;
        canSendVideos?: boolean;
        canSendStickersAndGifs?: boolean;
        canSendMusic?: boolean;
        canSendFiles?: boolean;
        canSendVoiceMessages?: boolean;
        canSendVideoMessages?: boolean;
        canEmbedLinks?: boolean;
        canSendPolls?: boolean;
        canInviteUsers?: boolean;
        canPinMessages?: boolean;
        canChangeInfo?: boolean;
        reason?: string;
      }
    ) => {
      if (!selectedGroupChat) return;
      await model.updateMemberRestrictions(selectedGroupChat.chatId, userId, payload);
      await loadGroupMeta(selectedGroupChat.chatId);
    },
    [loadGroupMeta, model, selectedGroupChat]
  );

  const leaveSelectedGroup = useCallback(async () => {
    if (!selectedGroupChat) return;
    await model.leaveGroupChat(selectedGroupChat.chatId);
    setIsGroupInfoOpen(false);
  }, [model, selectedGroupChat]);

  const deleteSelectedGroup = useCallback(async () => {
    if (!selectedGroupChat) return;
    await http.delete(endpoints.chatDelete(selectedGroupChat.chatId));
    setIsGroupInfoOpen(false);
    if (model.selectedChat === selectedGroupChat.chatId) {
      model.setSelectedChat(null);
    }
    await model.loadChats();
  }, [model, selectedGroupChat]);

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
    setGroupSettings(null);
    setGroupPermissions(null);
    setSelectedGroupAdminRights(null);
    setGroupInviteLinks([]);
    setGroupJoinRequests([]);
    setGroupTopics([]);
    setGroupAdminLogItems([]);
    setGroupMediaItems([]);
    setGroupMediaCursor(null);
    setGroupMediaHasMore(true);
    setGroupMediaLoading(false);
    groupMediaLoadingRef.current = false;
    setGroupFileItems([]);
    setGroupFilesCursor(null);
    setGroupFilesHasMore(true);
    setGroupFilesLoading(false);
    groupFilesLoadingRef.current = false;
    setGroupAddMembersQuery('');
    setSelectedGroupAddMemberIds([]);
    setIsAddingGroupMembers(false);
    setGroupMembersByUserId({});
    setGroupMemberTagsByUserId({});
    setIsGroupMembersLoading(false);
    setSelectedGroupTopicId(
      selectedChat?.chatId ? model.getActiveTopicId(selectedChat.chatId) : undefined
    );
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
    return visibleMessages
      .filter((message) =>
        messagePreviewText(message).toLowerCase().includes(normalizedMessageSearchQuery)
      )
      .map((message) => String(message.messageId));
  }, [visibleMessages, normalizedMessageSearchQuery]);

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

    const participantIds = [
      ...(selectedChat.participantIds || []),
      ...Object.keys(groupMembersByUserId),
    ];
    if (model.userId && !participantIds.includes(model.userId)) {
      participantIds.unshift(model.userId);
    }

    const uniqueParticipantIds = Array.from(new Set(participantIds.filter(Boolean)));
    const ownerId =
      Object.entries(groupMembersByUserId).find(([, value]) => value.role === 'OWNER')?.[0] ||
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
      const role =
        groupMembersByUserId[id]?.role ||
        (ownerId && id === ownerId ? 'OWNER' : 'MEMBER');
      const canManageThisMember =
        !isCurrentUser &&
        ((isGroupOwner && role !== 'OWNER') ||
          (canManageGroupMembers && selectedGroupCurrentRole === 'ADMIN' && role === 'MEMBER'));
      const canTransferOwnership =
        isGroupOwner && !isCurrentUser && role !== 'OWNER';
      const canPromote =
        isGroupOwner && !isCurrentUser && role === 'MEMBER';
      const canDemote =
        isGroupOwner && !isCurrentUser && role === 'ADMIN';
      const canRemove = canManageThisMember;

      return {
        userId: id,
        name: userName,
        avatarUrl: isCurrentUser ? currentUserAvatarUrl || userMeta?.avatarUrl : userMeta?.avatarUrl,
        avatarBg: hashColor(id),
        avatarText: initialOf(userName),
        statusText: formatPresenceLabel(presence),
        isOnline,
        role,
        memberTag: groupMemberTagsByUserId[id],
        isCurrentUser,
        canTransferOwnership,
        canPromote,
        canDemote,
        canRemove,
      };
    });
  }, [
    currentUserProfile,
    currentUserVisualPresence,
    formatPresenceLabel,
    groupMemberTagsByUserId,
    groupMembersByUserId,
    model.presenceByUser,
    model.user,
    model.userId,
    resolveUserMeta,
    selectedChat,
    canManageGroupMembers,
    isGroupOwner,
    selectedGroupCurrentRole,
  ]);
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

  const loadGroupMediaItems = useCallback(
    async (reset = false) => {
      const chatId = selectedGroupChat?.chatId;
      if (!chatId || groupMediaLoadingRef.current || groupMediaLoading) {
        return;
      }
      if (!reset && !groupMediaHasMore) {
        return;
      }

      groupMediaLoadingRef.current = true;
      setGroupMediaLoading(true);
      try {
        const before = reset ? undefined : groupMediaCursor ?? undefined;
        const data: ChatGroupMediaItemsResponse = await model.getGroupMedia(chatId, before, 30);
        const nextItems = (data.items || []).filter(
          (item) => (item.messageType || '').toLowerCase() !== 'circle'
        );
        setGroupMediaItems((prev) => {
          const merged = reset ? nextItems : [...prev, ...nextItems];
          const deduplicated = new Map<string, ChatGroupMediaItem>();
          merged.forEach((item) => {
            deduplicated.set(`${item.messageId}-${item.attachmentPath}`, item);
          });
          return Array.from(deduplicated.values());
        });
        setGroupMediaCursor(data.nextBeforeMessageId ?? null);
        setGroupMediaHasMore(Boolean(data.hasMore));
      } catch (error) {
        console.error('Failed to load group media:', error);
        if (reset) {
          setGroupMediaItems([]);
        }
        setGroupMediaHasMore(false);
      } finally {
        groupMediaLoadingRef.current = false;
        setGroupMediaLoading(false);
      }
    },
    [
      groupMediaCursor,
      groupMediaHasMore,
      groupMediaLoading,
      model,
      selectedGroupChat?.chatId,
    ]
  );

  const loadGroupFileItems = useCallback(
    async (reset = false) => {
      const chatId = selectedGroupChat?.chatId;
      if (!chatId || groupFilesLoadingRef.current || groupFilesLoading) {
        return;
      }
      if (!reset && !groupFilesHasMore) {
        return;
      }

      groupFilesLoadingRef.current = true;
      setGroupFilesLoading(true);
      try {
        const before = reset ? undefined : groupFilesCursor ?? undefined;
        const data: ChatGroupMediaItemsResponse = await model.getGroupFiles(chatId, before, 30);
        const nextItems = data.items || [];
        setGroupFileItems((prev) => {
          const merged = reset ? nextItems : [...prev, ...nextItems];
          const deduplicated = new Map<string, ChatGroupMediaItem>();
          merged.forEach((item) => {
            deduplicated.set(`${item.messageId}-${item.attachmentPath}`, item);
          });
          return Array.from(deduplicated.values());
        });
        setGroupFilesCursor(data.nextBeforeMessageId ?? null);
        setGroupFilesHasMore(Boolean(data.hasMore));
      } catch (error) {
        console.error('Failed to load group files:', error);
        if (reset) {
          setGroupFileItems([]);
        }
        setGroupFilesHasMore(false);
      } finally {
        groupFilesLoadingRef.current = false;
        setGroupFilesLoading(false);
      }
    },
    [
      groupFilesCursor,
      groupFilesHasMore,
      groupFilesLoading,
      model,
      selectedGroupChat?.chatId,
    ]
  );

  const loadGroupAdminLog = useCallback(
    async (reset = false) => {
      const chatId = selectedGroupChat?.chatId;
      if (!chatId || groupAdminLogLoadingRef.current || groupAdminLogLoading) {
        return;
      }
      if (!reset && !groupAdminLogHasMore) {
        return;
      }

      groupAdminLogLoadingRef.current = true;
      setGroupAdminLogLoading(true);
      try {
        const before = reset ? undefined : groupAdminLogCursor ?? undefined;
        const data = await model.getGroupAdminLog(chatId, before, 40);
        const nextItems = data.items || [];
        setGroupAdminLogItems((prev) => {
          const merged = reset ? nextItems : [...prev, ...nextItems];
          const deduplicated = new Map<number, ChatAdminLogItem>();
          merged.forEach((item) => {
            deduplicated.set(item.id, item);
          });
          return Array.from(deduplicated.values());
        });
        setGroupAdminLogCursor(data.nextBeforeId ?? null);
        setGroupAdminLogHasMore(Boolean(data.hasMore));
      } catch (error) {
        console.error('Failed to load admin log:', error);
        if (reset) {
          setGroupAdminLogItems([]);
        }
        setGroupAdminLogHasMore(false);
      } finally {
        groupAdminLogLoadingRef.current = false;
        setGroupAdminLogLoading(false);
      }
    },
    [
      groupAdminLogCursor,
      groupAdminLogHasMore,
      groupAdminLogLoading,
      model,
      selectedGroupChat?.chatId,
    ]
  );

  const handleGroupAdminLogLoadMore = useCallback(() => {
    void loadGroupAdminLog(false);
  }, [loadGroupAdminLog]);

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

  useEffect(() => {
    if (!isGroupInfoVisible || groupInfoTab !== 'media') {
      return;
    }
    if (groupMediaLoading || groupMediaItems.length > 0 || !groupMediaHasMore) {
      return;
    }
    void loadGroupMediaItems(true);
  }, [
    groupInfoTab,
    groupMediaHasMore,
    groupMediaItems.length,
    groupMediaLoading,
    isGroupInfoVisible,
    loadGroupMediaItems,
    selectedGroupChat?.chatId,
  ]);

  useEffect(() => {
    if (!isGroupInfoVisible || groupInfoTab !== 'files') {
      return;
    }
    if (groupFilesLoading || groupFileItems.length > 0 || !groupFilesHasMore) {
      return;
    }
    void loadGroupFileItems(true);
  }, [
    groupFileItems.length,
    groupFilesHasMore,
    groupFilesLoading,
    groupInfoTab,
    isGroupInfoVisible,
    loadGroupFileItems,
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

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (event.defaultPrevented) return;

      if (isGroupAddMembersOpen) {
        event.preventDefault();
        setIsGroupAddMembersOpen(false);
        setGroupAddMembersQuery('');
        setSelectedGroupAddMemberIds([]);
        return;
      }

      if (isGroupInfoOpen) {
        // Let GroupInfoPanel handle Esc while it is open (including its nested states).
        return;
      }

      if (isMessageSearchOpen) {
        event.preventDefault();
        closeMessageSearch();
        return;
      }

      if (menuOpen) {
        event.preventDefault();
        setMenuOpen(false);
        return;
      }

      if (model.selectedChat !== null) {
        event.preventDefault();
        model.setSelectedChat(null);
      }
    };

    window.addEventListener('keydown', onEscape);
    return () => {
      window.removeEventListener('keydown', onEscape);
    };
  }, [
    closeMessageSearch,
    isGroupAddMembersOpen,
    isGroupInfoOpen,
    isMessageSearchOpen,
    menuOpen,
    model,
  ]);

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

            <div className="relative z-0 flex min-h-0 flex-1 overflow-hidden">
              <div
                className={`relative min-w-0 flex-1 transform-gpu transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  isGroupInfoVisible ? 'lg:-translate-x-[180px]' : 'lg:translate-x-0'
                }`}
                style={{ willChange: isGroupInfoVisible ? 'transform' : undefined }}
              >
                <div
                  className="tg-scroll relative h-full overflow-y-auto"
                  data-chat-scroll-container="true"
                  style={{
                    backgroundColor: '#07070d',
                    backgroundImage: `url("data:image/svg+xml,${chatWallpaperSvg}")`,
                    backgroundSize: '256px 256px',
                  }}
                >
                  {model.selectedChat === null ? (
                    <div className="absolute inset-0 grid place-items-center px-6">
                      <div className="max-w-[460px] text-center text-[24px] font-[600] leading-[1.2] text-white/52">
                        Выберите, кому хотите написать
                      </div>
                    </div>
                  ) : null}
                  <div
                    className="mx-auto flex min-h-full w-full flex-col px-[18px] pb-[110px] pt-[12px]"
                    data-chat-scroll-content="true"
                    style={{ maxWidth: COMPOSER_TRACK_MAX_WIDTH }}
                  >
                    {model.selectedChat !== null ? (
                      <div className="w-full" style={{ maxWidth: MESSAGE_COLUMN_MAX_WIDTH }}>
                        <ChatMessageList
                          messages={visibleMessages}
                          chatId={selectedChat?.chatId ?? null}
                          isGroupChat={selectedChat?.chatType === 'GROUP'}
                          reactionsEnabled={selectedChat?.chatType === 'GROUP' ? (groupSettings?.reactionsEnabled ?? true) : true}
                          pollsEnabled={selectedChat?.chatType === 'GROUP' ? (groupSettings?.pollsEnabled ?? true) : false}
                          canManagePolls={canManagePolls}
                          userId={model.userId}
                          hasSelectedChat={model.selectedChat !== null}
                          messageBubbleMaxWidthPx={MESSAGE_BUBBLE_MAX_WIDTH}
                          uploadingImages={model.uploadingImages}
                          pendingMediaPreviewUrls={model.pendingMediaPreviewUrls}
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
                          canDeleteMessage={(message) =>
                            message.senderId === model.userId ||
                            (selectedChat?.chatType === 'GROUP' && canDeleteAnyGroupMessage)
                          }
                          onCopyMessage={(text) => {
                            model.copyMessageText(text);
                          }}
                          onCancelPendingUpload={(localId, attachmentIndex) => {
                            model.cancelPendingMediaUpload(localId, attachmentIndex);
                          }}
                          onRetryMessage={(messageId) => {
                            void model.retryFailedMessage(messageId);
                          }}
                          onLoadMessageReactions={loadMessageReactions}
                          onToggleMessageReaction={toggleMessageReaction}
                          onLoadPollByMessageId={loadPollByMessageId}
                          onLoadPollVoters={loadPollVoters}
                          onVotePoll={votePoll}
                          onClosePoll={closePoll}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
                {model.selectedChat !== null && !isNearBottom ? (
                  <div className="pointer-events-none absolute bottom-[124px] right-[24px] z-[38]">
                    <button
                      type="button"
                      onClick={handleJumpToBottom}
                      className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-[#7f67e8] px-4 py-2 text-[13px] font-[700] text-white shadow-[0_12px_26px_rgba(41,24,92,0.45)] transition-colors hover:bg-[#8f78ef]"
                    >
                      <span aria-hidden="true">↓</span>
                      <span>
                        {pendingIncomingCount > 0
                          ? `${pendingIncomingCount} new`
                          : 'Latest messages'}
                      </span>
                    </button>
                  </div>
                ) : null}
              </div>

              {selectedGroupChat ? (
                <div
                  className="absolute inset-y-0 right-0 z-[44] hidden overflow-hidden lg:block"
                  style={{ width: GROUP_INFO_PANEL_WIDTH }}
                >
                  <div
                    className={`absolute inset-y-0 right-0 w-[360px] transform-gpu transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      isGroupInfoVisible
                        ? 'translate-x-0 opacity-100'
                        : 'pointer-events-none translate-x-full opacity-0'
                    }`}
                    style={{ willChange: isGroupInfoVisible ? 'transform, opacity' : undefined }}
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
                        isOpen={isGroupInfoVisible}
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
                        canEditGroup={canEditGroupInfo}
                        canAddMembers={canAddGroupMembers && !isGroupMembersLoading}
                        isOwner={isGroupOwner}
                        onUpdateGroup={canEditGroupInfo ? updateGroupInfo : undefined}
                        onTransferOwnership={isGroupOwner ? transferGroupOwnership : undefined}
                        onPromoteMember={canManageGroupMembers ? promoteGroupMember : undefined}
                        onDemoteMember={canManageGroupMembers ? demoteGroupMember : undefined}
                        onRemoveMember={canManageGroupMembers ? removeGroupMember : undefined}
                        onLeaveGroup={leaveSelectedGroup}
                        onDeleteGroup={deleteSelectedGroup}
                        groupSettings={groupSettings}
                        groupPermissions={groupPermissions}
                        inviteLinks={groupInviteLinks}
                        joinRequests={groupJoinRequests}
                        topics={groupTopics}
                        activeTopicId={selectedGroupTopicId}
                        adminLogItems={canViewAdminLog ? groupAdminLogItems : []}
                        adminLogLoading={canViewAdminLog ? groupAdminLogLoading : false}
                        adminLogHasMore={canViewAdminLog ? groupAdminLogHasMore : false}
                        onAdminLogLoadMore={canViewAdminLog ? handleGroupAdminLogLoadMore : undefined}
                        mediaItems={groupMediaItems}
                        mediaLoading={groupMediaLoading}
                        mediaHasMore={groupMediaHasMore}
                        onMediaLoadMore={() => {
                          void loadGroupMediaItems(false);
                        }}
                        fileItems={groupFileItems}
                        filesLoading={groupFilesLoading}
                        filesHasMore={groupFilesHasMore}
                        onFilesLoadMore={() => {
                          void loadGroupFileItems(false);
                        }}
                        onUpdateGroupSettings={canEditGroupInfo ? updateGroupSettings : undefined}
                        onUpdateGroupPermissions={canEditGroupInfo ? updateGroupPermissions : undefined}
                        onCreateInviteLink={canManageInviteLinks ? createInviteLink : undefined}
                        onUpdateInviteLink={canManageInviteLinks ? updateInviteLink : undefined}
                        onRevokeInviteLink={canManageInviteLinks ? revokeInviteLink : undefined}
                        onApproveJoinRequest={canManageJoinRequests ? approveJoinRequest : undefined}
                        onDeclineJoinRequest={canManageJoinRequests ? declineJoinRequest : undefined}
                        onCreateTopic={canManageTopics ? createTopic : undefined}
                        onToggleTopicClosed={canManageTopics ? toggleTopicClosed : undefined}
                        onDeleteTopic={canManageTopics ? deleteTopic : undefined}
                        onOpenTopic={groupSettings?.topicsEnabled ? openTopicThread : undefined}
                        onPinMessage={canPinGroupMessages ? pinGroupMessage : undefined}
                        onUnpinMessage={canPinGroupMessages ? unpinGroupMessage : undefined}
                        onMuteMember={canBanGroupMembers ? muteGroupMember : undefined}
                        onUnmuteMember={canBanGroupMembers ? unmuteGroupMember : undefined}
                        onBanMember={canBanGroupMembers ? banGroupMember : undefined}
                        onUnbanMember={canBanGroupMembers ? unbanGroupMember : undefined}
                        onOpenPrivateChat={openMemberPrivateChat}
                        onLoadMemberRestrictions={canBanGroupMembers ? loadMemberRestrictions : undefined}
                        onSaveMemberRestrictions={canBanGroupMembers ? saveMemberRestrictions : undefined}
                        onLoadMemberAdminRights={canManageGroupMembers ? loadMemberAdminRights : undefined}
                        onSaveMemberAdminRights={canManageGroupMembers ? saveMemberAdminRights : undefined}
                        onCreatePoll={
                          groupSettings?.pollsEnabled && canCreatePollInGroup
                            ? createGroupPoll
                            : undefined
                        }
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
                    className={`ml-auto h-full w-full max-w-[420px] transform-gpu transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
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
                        isOpen={isGroupInfoVisible}
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
                        canEditGroup={canEditGroupInfo}
                        canAddMembers={canAddGroupMembers && !isGroupMembersLoading}
                        isOwner={isGroupOwner}
                        onUpdateGroup={canEditGroupInfo ? updateGroupInfo : undefined}
                        onTransferOwnership={isGroupOwner ? transferGroupOwnership : undefined}
                        onPromoteMember={canManageGroupMembers ? promoteGroupMember : undefined}
                        onDemoteMember={canManageGroupMembers ? demoteGroupMember : undefined}
                        onRemoveMember={canManageGroupMembers ? removeGroupMember : undefined}
                        onLeaveGroup={leaveSelectedGroup}
                        onDeleteGroup={deleteSelectedGroup}
                        groupSettings={groupSettings}
                        groupPermissions={groupPermissions}
                        inviteLinks={groupInviteLinks}
                        joinRequests={groupJoinRequests}
                        topics={groupTopics}
                        activeTopicId={selectedGroupTopicId}
                        adminLogItems={canViewAdminLog ? groupAdminLogItems : []}
                        adminLogLoading={canViewAdminLog ? groupAdminLogLoading : false}
                        adminLogHasMore={canViewAdminLog ? groupAdminLogHasMore : false}
                        onAdminLogLoadMore={canViewAdminLog ? handleGroupAdminLogLoadMore : undefined}
                        mediaItems={groupMediaItems}
                        mediaLoading={groupMediaLoading}
                        mediaHasMore={groupMediaHasMore}
                        onMediaLoadMore={() => {
                          void loadGroupMediaItems(false);
                        }}
                        fileItems={groupFileItems}
                        filesLoading={groupFilesLoading}
                        filesHasMore={groupFilesHasMore}
                        onFilesLoadMore={() => {
                          void loadGroupFileItems(false);
                        }}
                        onUpdateGroupSettings={canEditGroupInfo ? updateGroupSettings : undefined}
                        onUpdateGroupPermissions={canEditGroupInfo ? updateGroupPermissions : undefined}
                        onCreateInviteLink={canManageInviteLinks ? createInviteLink : undefined}
                        onUpdateInviteLink={canManageInviteLinks ? updateInviteLink : undefined}
                        onRevokeInviteLink={canManageInviteLinks ? revokeInviteLink : undefined}
                        onApproveJoinRequest={canManageJoinRequests ? approveJoinRequest : undefined}
                        onDeclineJoinRequest={canManageJoinRequests ? declineJoinRequest : undefined}
                        onCreateTopic={canManageTopics ? createTopic : undefined}
                        onToggleTopicClosed={canManageTopics ? toggleTopicClosed : undefined}
                        onDeleteTopic={canManageTopics ? deleteTopic : undefined}
                        onOpenTopic={groupSettings?.topicsEnabled ? openTopicThread : undefined}
                        onPinMessage={canPinGroupMessages ? pinGroupMessage : undefined}
                        onUnpinMessage={canPinGroupMessages ? unpinGroupMessage : undefined}
                        onMuteMember={canBanGroupMembers ? muteGroupMember : undefined}
                        onUnmuteMember={canBanGroupMembers ? unmuteGroupMember : undefined}
                        onBanMember={canBanGroupMembers ? banGroupMember : undefined}
                        onUnbanMember={canBanGroupMembers ? unbanGroupMember : undefined}
                        onOpenPrivateChat={openMemberPrivateChat}
                        onLoadMemberRestrictions={canBanGroupMembers ? loadMemberRestrictions : undefined}
                        onSaveMemberRestrictions={canBanGroupMembers ? saveMemberRestrictions : undefined}
                        onLoadMemberAdminRights={canManageGroupMembers ? loadMemberAdminRights : undefined}
                        onSaveMemberAdminRights={canManageGroupMembers ? saveMemberAdminRights : undefined}
                        onCreatePoll={
                          groupSettings?.pollsEnabled && canCreatePollInGroup
                            ? createGroupPoll
                            : undefined
                        }
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
              className={`absolute bottom-0 left-0 right-0 transform-gpu transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                isGroupInfoVisible ? 'lg:-translate-x-[180px]' : 'lg:translate-x-0'
              }`}
              style={{ willChange: isGroupInfoVisible ? 'transform' : undefined }}
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
