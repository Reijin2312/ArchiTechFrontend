import { useCallback, useEffect, useMemo, useRef, useState, type UIEvent } from 'react';
import { http } from '@/shared/api/http';
import { endpoints } from '@/shared/api/endpoints';
import type {
  ChatAdminLogItem,
  ChatGroupMediaItem,
  ChatGroupPermissions,
  ChatGroupSettings,
  ChatInviteLink,
  ChatJoinRequest,
  ChatTopic,
} from '@/shared/api/types';
import type { SidebarChat } from '../types';
import { CloseIcon, PenSquareIcon } from '../icons';
import { Avatar } from './Avatar';

export type GroupInfoTab = 'members' | 'media' | 'files' | 'links';

export type GroupInfoMember = {
  userId: string;
  name: string;
  avatarUrl?: string;
  avatarBg: string;
  avatarText: string;
  statusText: string;
  isOnline: boolean;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  canTransferOwnership?: boolean;
  canPromote?: boolean;
  canDemote?: boolean;
  canRemove?: boolean;
};

export type GroupInfoLinkItem = {
  id: string;
  messageId: number;
  href: string;
  displayUrl: string;
  sourceLabel: string;
  dateLabel: string;
  title: string;
  previewText: string;
  thumbnailUrl?: string;
};

type GroupInfoPanelProps = {
  chat: SidebarChat;
  memberCount: number;
  members: GroupInfoMember[];
  links: GroupInfoLinkItem[];
  linksLoading: boolean;
  linksHasMore: boolean;
  onLinksLoadMore: () => void;
  activeTab: GroupInfoTab;
  onTabChange: (tab: GroupInfoTab) => void;
  notificationsEnabled: boolean;
  onNotificationsEnabledChange: (next: boolean) => void;
  canEditGroup?: boolean;
  canAddMembers?: boolean;
  isOwner?: boolean;
  onUpdateGroup?: (payload: { title?: string; avatarPath?: string }) => Promise<void> | void;
  onTransferOwnership?: (userId: string) => Promise<void> | void;
  onPromoteMember?: (userId: string) => Promise<void> | void;
  onDemoteMember?: (userId: string) => Promise<void> | void;
  onRemoveMember?: (userId: string) => Promise<void> | void;
  onLeaveGroup?: () => Promise<void> | void;
  onDeleteGroup?: () => Promise<void> | void;
  onAddMembersClick?: () => void;
  groupSettings?: ChatGroupSettings | null;
  groupPermissions?: ChatGroupPermissions | null;
  inviteLinks?: ChatInviteLink[];
  joinRequests?: ChatJoinRequest[];
  topics?: ChatTopic[];
  activeTopicId?: number;
  adminLogItems?: ChatAdminLogItem[];
  adminLogLoading?: boolean;
  adminLogHasMore?: boolean;
  onAdminLogLoadMore?: () => void;
  mediaItems?: ChatGroupMediaItem[];
  mediaLoading?: boolean;
  mediaHasMore?: boolean;
  onMediaLoadMore?: () => void;
  fileItems?: ChatGroupMediaItem[];
  filesLoading?: boolean;
  filesHasMore?: boolean;
  onFilesLoadMore?: () => void;
  onUpdateGroupSettings?: (payload: {
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
  }) => Promise<void> | void;
  onUpdateGroupPermissions?: (payload: {
    canSendMessages?: boolean;
    canSendMedia?: boolean;
    canSendPolls?: boolean;
    canAddWebPagePreviews?: boolean;
    canChangeInfo?: boolean;
    canInviteUsers?: boolean;
    canPinMessages?: boolean;
  }) => Promise<void> | void;
  onCreateInviteLink?: (payload: {
    name?: string;
    createsJoinRequest?: boolean;
    expiresAt?: string;
    usageLimit?: number;
  }) => Promise<void> | void;
  onUpdateInviteLink?: (
    inviteId: number,
    payload: {
      name?: string;
      createsJoinRequest?: boolean;
      expiresAt?: string;
      clearExpiresAt?: boolean;
      usageLimit?: number;
      clearUsageLimit?: boolean;
    }
  ) => Promise<void> | void;
  onRevokeInviteLink?: (inviteId: number) => Promise<void> | void;
  onApproveJoinRequest?: (requestId: number) => Promise<void> | void;
  onDeclineJoinRequest?: (requestId: number) => Promise<void> | void;
  onCreateTopic?: (payload: { title: string; iconEmoji?: string }) => Promise<void> | void;
  onToggleTopicClosed?: (topicId: number, closed: boolean) => Promise<void> | void;
  onDeleteTopic?: (topicId: number) => Promise<void> | void;
  onOpenTopic?: (topicId?: number) => Promise<void> | void;
  onPinMessage?: (messageId: number) => Promise<void> | void;
  onUnpinMessage?: () => Promise<void> | void;
  onMuteMember?: (userId: string) => Promise<void> | void;
  onUnmuteMember?: (userId: string) => Promise<void> | void;
  onBanMember?: (userId: string) => Promise<void> | void;
  onUnbanMember?: (userId: string) => Promise<void> | void;
  onCreatePoll?: (payload: {
    question: string;
    allowsMultiple?: boolean;
    quiz?: boolean;
    correctOptionIndex?: number;
    explanation?: string;
    anonymousVotes?: boolean;
    options: string[];
  }) => Promise<void> | void;
  onClose: () => void;
};

type LinkPreviewMeta = {
  sourceLabel?: string;
  title?: string;
  description?: string;
  thumbnailUrl?: string;
};

type BackendLinkPreviewMeta = {
  providerName?: string;
  title?: string;
  description?: string;
  thumbnailUrl?: string;
};

const GROUP_INFO_TABS: Array<{ id: GroupInfoTab; label: string }> = [
  { id: 'members', label: 'Members' },
  { id: 'media', label: 'Media' },
  { id: 'files', label: 'Files' },
  { id: 'links', label: 'Links' },
];

const LINK_META_CACHE = new Map<string, LinkPreviewMeta | null>();
const LINK_META_INFLIGHT = new Map<string, Promise<LinkPreviewMeta | null>>();
const URL_IN_TEXT_PATTERN = /(?:(?:https?:\/\/)|(?:www\.))\S+/gi;

function normalizePreviewText(text: string, fallback = 'Message with link') {
  const withoutUrls = text.replace(URL_IN_TEXT_PATTERN, ' ');
  const compact = withoutUrls.replace(/\s+/g, ' ').trim();
  return compact || fallback;
}

function buildOEmbedEndpoints(href: string): string[] {
  let parsed: URL;
  try {
    parsed = new URL(href);
  } catch {
    return [];
  }

  const encodedUrl = encodeURIComponent(parsed.toString());
  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  const endpoints: string[] = [];

  if (host.includes('youtube.com') || host === 'youtu.be') {
    endpoints.push(`https://www.youtube.com/oembed?url=${encodedUrl}&format=json`);
  } else if (host.includes('vimeo.com')) {
    endpoints.push(`https://vimeo.com/api/oembed.json?url=${encodedUrl}`);
  } else if (host.includes('dailymotion.com') || host === 'dai.ly') {
    endpoints.push(`https://www.dailymotion.com/services/oembed?url=${encodedUrl}`);
  } else if (host.includes('rutube.ru')) {
    endpoints.push(`https://rutube.ru/api/oembed/?url=${encodedUrl}`);
  } else if (host.includes('spotify.com')) {
    endpoints.push(`https://open.spotify.com/oembed?url=${encodedUrl}`);
  }

  endpoints.push(`https://noembed.com/embed?url=${encodedUrl}`);
  return endpoints;
}

async function fetchLinkPreviewMeta(href: string): Promise<LinkPreviewMeta | null> {
  try {
    const response = await http.get<BackendLinkPreviewMeta | null>(endpoints.chatLinkPreview(href));
    const payload = response.data;
    if (payload && typeof payload === 'object') {
      const backendMeta: LinkPreviewMeta = {
        sourceLabel: payload.providerName?.trim() || undefined,
        title: payload.title?.trim() || undefined,
        description: payload.description?.trim() || undefined,
        thumbnailUrl: payload.thumbnailUrl?.trim() || undefined,
      };
      if (
        backendMeta.sourceLabel ||
        backendMeta.title ||
        backendMeta.description ||
        backendMeta.thumbnailUrl
      ) {
        return backendMeta;
      }
    }
  } catch {
    // fall through to direct oEmbed/noembed as a secondary fallback.
  }

  const oembedEndpoints = buildOEmbedEndpoints(href);
  if (oembedEndpoints.length === 0) {
    return null;
  }

  for (const endpoint of oembedEndpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });
      if (!response.ok) continue;

      const payload = (await response.json()) as {
        provider_name?: string;
        title?: string;
        author_name?: string;
        thumbnail_url?: string;
        description?: string;
      };
      if (!payload) continue;

      return {
        sourceLabel: payload.provider_name?.trim() || undefined,
        title: payload.title?.trim() || undefined,
        description:
          payload.description?.trim() ||
          (payload.author_name?.trim() ? `by ${payload.author_name.trim()}` : undefined),
        thumbnailUrl: payload.thumbnail_url?.trim() || undefined,
      };
    } catch {
      continue;
    }
  }

  return null;
}

function LinkIcon({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M10 14 8.2 15.8a3.5 3.5 0 0 1-5-5L6 8a3.5 3.5 0 0 1 5 0M14 10l1.8-1.8a3.5 3.5 0 1 1 5 5L18 16a3.5 3.5 0 0 1-5 0"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="m8.8 12.6 6.4-1.2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function BellIcon({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M15 18H5.8a1.8 1.8 0 0 1-1.6-2.6l1.2-2.3V9.8a5.6 5.6 0 1 1 11.2 0v3.3l1.2 2.3A1.8 1.8 0 0 1 16.2 18H15Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9 18a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function UserPlusIcon({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 18.5c0-2.4 2.7-4.5 6-4.5s6 2.1 6 4.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M19.5 7v5M17 9.5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function GroupInfoLinkRow({ item }: { item: GroupInfoLinkItem }) {
  const [meta, setMeta] = useState<LinkPreviewMeta | null>(null);

  useEffect(() => {
    let disposed = false;

    const cached = LINK_META_CACHE.get(item.href);
    if (cached !== undefined) {
      setMeta(cached);
      return () => {
        disposed = true;
      };
    }

    void (async () => {
      const pending =
        LINK_META_INFLIGHT.get(item.href) ??
        fetchLinkPreviewMeta(item.href).finally(() => {
          LINK_META_INFLIGHT.delete(item.href);
        });
      LINK_META_INFLIGHT.set(item.href, pending);

      const loadedMeta = await pending;
      LINK_META_CACHE.set(item.href, loadedMeta);
      if (!disposed) {
        setMeta(loadedMeta);
      }
    })();

    return () => {
      disposed = true;
    };
  }, [item.href]);

  const resolvedSource = meta?.sourceLabel || item.sourceLabel;
  const resolvedTitle = meta?.title || item.title;
  const resolvedPreview = useMemo(
    () => normalizePreviewText(meta?.description || item.previewText, 'Message with link'),
    [meta?.description, item.previewText]
  );
  const resolvedThumbnail = meta?.thumbnailUrl || item.thumbnailUrl;

  return (
    <a
      href={item.href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-3 border-b border-white/6 px-4 py-3 transition-colors hover:bg-white/[0.045]"
    >
      <div className="mt-0.5 h-[64px] w-[64px] shrink-0 overflow-hidden rounded-[10px] bg-[#2a2b34]">
        {resolvedThumbnail ? (
          <img src={resolvedThumbnail} alt={resolvedSource} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-white/48">
            <LinkIcon size={22} />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="truncate text-[16px] font-[600] leading-tight text-white/95">{resolvedTitle}</div>
          <div className="shrink-0 text-[13px] text-white/48">{item.dateLabel}</div>
        </div>
        <div className="mt-1 truncate text-[14px] text-white/62">{resolvedPreview}</div>
        <div className="mt-[6px] truncate text-[14px] text-[#9f88ff] underline underline-offset-2">
          {item.displayUrl}
        </div>
      </div>
    </a>
  );
}

export function GroupInfoPanel({
  chat,
  memberCount,
  members,
  links,
  linksLoading,
  linksHasMore,
  onLinksLoadMore,
  activeTab,
  onTabChange,
  notificationsEnabled,
  onNotificationsEnabledChange,
  canEditGroup = false,
  canAddMembers = true,
  isOwner = false,
  onUpdateGroup,
  onTransferOwnership,
  onPromoteMember,
  onDemoteMember,
  onRemoveMember,
  onLeaveGroup,
  onDeleteGroup,
  onAddMembersClick,
  groupSettings,
  groupPermissions,
  inviteLinks = [],
  joinRequests = [],
  topics = [],
  activeTopicId,
  adminLogItems = [],
  adminLogLoading = false,
  adminLogHasMore = false,
  onAdminLogLoadMore,
  mediaItems = [],
  mediaLoading = false,
  mediaHasMore = false,
  onMediaLoadMore,
  fileItems = [],
  filesLoading = false,
  filesHasMore = false,
  onFilesLoadMore,
  onUpdateGroupSettings,
  onUpdateGroupPermissions,
  onCreateInviteLink,
  onUpdateInviteLink,
  onRevokeInviteLink,
  onApproveJoinRequest,
  onDeclineJoinRequest,
  onCreateTopic,
  onToggleTopicClosed,
  onDeleteTopic,
  onOpenTopic,
  onPinMessage,
  onUnpinMessage,
  onMuteMember,
  onUnmuteMember,
  onBanMember,
  onUnbanMember,
  onCreatePoll,
  onClose,
}: GroupInfoPanelProps) {
  const inviteLink = `t.me/+group${chat.chatId.toString(36)}`;
  const hasCover = !!chat.avatarUrl;
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(chat.name);
  const [editAvatarPath, setEditAvatarPath] = useState(chat.avatarUrl || '');
  const [isSavingGroup, setIsSavingGroup] = useState(false);
  const [memberActionPendingId, setMemberActionPendingId] = useState<string | null>(null);
  const [groupActionPending, setGroupActionPending] = useState<'leave' | 'delete' | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);
  const [isInvitePending, setIsInvitePending] = useState(false);
  const [inviteNameDraft, setInviteNameDraft] = useState('');
  const [inviteNeedsApproval, setInviteNeedsApproval] = useState(false);
  const [topicTitleDraft, setTopicTitleDraft] = useState('');
  const [topicEmojiDraft, setTopicEmojiDraft] = useState('');
  const [pinMessageIdDraft, setPinMessageIdDraft] = useState('');
  const [pollQuestionDraft, setPollQuestionDraft] = useState('');
  const [pollOptionsDraft, setPollOptionsDraft] = useState('Yes\nNo');
  const [pollAllowsMultipleDraft, setPollAllowsMultipleDraft] = useState(false);
  const [pollQuizDraft, setPollQuizDraft] = useState(false);
  const [pollCorrectOptionDraft, setPollCorrectOptionDraft] = useState('');
  const [pollExplanationDraft, setPollExplanationDraft] = useState('');
  const [pollAnonymousVotesDraft, setPollAnonymousVotesDraft] = useState(true);
  const [settingsDraft, setSettingsDraft] = useState({
    description: '',
    isPublic: false,
    publicUsername: '',
    historyVisibleToNewMembers: true,
    slowModeSeconds: 0,
    topicsEnabled: false,
    reactionsEnabled: true,
    reactionMode: 'ALL' as 'ALL' | 'SOME' | 'NONE',
    allowedReactionsText: '',
    pollsEnabled: true,
  });
  const [permissionsDraft, setPermissionsDraft] = useState({
    canSendMessages: true,
    canSendMedia: true,
    canSendPolls: true,
    canAddWebPagePreviews: true,
    canChangeInfo: false,
    canInviteUsers: false,
    canPinMessages: false,
  });

  useEffect(() => {
    setEditTitle(chat.name);
    setEditAvatarPath(chat.avatarUrl || '');
    setIsEditOpen(false);
    setIsSavingGroup(false);
    setMemberActionPendingId(null);
    setGroupActionPending(null);
    setIsSavingSettings(false);
    setIsSavingPermissions(false);
    setIsInvitePending(false);
    setInviteNameDraft('');
    setInviteNeedsApproval(false);
    setTopicTitleDraft('');
    setTopicEmojiDraft('');
    setPinMessageIdDraft('');
    setPollQuestionDraft('');
    setPollOptionsDraft('Yes\nNo');
    setPollAllowsMultipleDraft(false);
    setPollQuizDraft(false);
    setPollCorrectOptionDraft('');
    setPollExplanationDraft('');
    setPollAnonymousVotesDraft(true);
  }, [chat.avatarUrl, chat.chatId, chat.name]);

  useEffect(() => {
    setSettingsDraft({
      description: groupSettings?.description || '',
      isPublic: !!groupSettings?.isPublic,
      publicUsername: groupSettings?.publicUsername || '',
      historyVisibleToNewMembers: groupSettings?.historyVisibleToNewMembers ?? true,
      slowModeSeconds: groupSettings?.slowModeSeconds ?? 0,
      topicsEnabled: groupSettings?.topicsEnabled ?? false,
      reactionsEnabled: groupSettings?.reactionsEnabled ?? true,
      reactionMode: groupSettings?.reactionMode ?? (groupSettings?.reactionsEnabled ? 'ALL' : 'NONE'),
      allowedReactionsText: (groupSettings?.allowedReactions || []).join(' '),
      pollsEnabled: groupSettings?.pollsEnabled ?? true,
    });
    setPinMessageIdDraft(groupSettings?.pinnedMessageId ? String(groupSettings.pinnedMessageId) : '');
  }, [groupSettings]);

  useEffect(() => {
    setPermissionsDraft({
      canSendMessages: groupPermissions?.canSendMessages ?? true,
      canSendMedia: groupPermissions?.canSendMedia ?? true,
      canSendPolls: groupPermissions?.canSendPolls ?? true,
      canAddWebPagePreviews: groupPermissions?.canAddWebPagePreviews ?? true,
      canChangeInfo: groupPermissions?.canChangeInfo ?? false,
      canInviteUsers: groupPermissions?.canInviteUsers ?? false,
      canPinMessages: groupPermissions?.canPinMessages ?? false,
    });
  }, [groupPermissions]);

  const submitGroupEdit = useCallback(async () => {
    if (!onUpdateGroup || isSavingGroup) return;
    setIsSavingGroup(true);
    try {
      await onUpdateGroup({
        title: editTitle,
        avatarPath: editAvatarPath,
      });
      setIsEditOpen(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update group');
    } finally {
      setIsSavingGroup(false);
    }
  }, [editAvatarPath, editTitle, isSavingGroup, onUpdateGroup]);

  const runMemberAction = useCallback(
    async (
      userId: string,
      action?: (userId: string) => Promise<void> | void,
      fallbackError = 'Failed to update member'
    ) => {
      if (!action || memberActionPendingId) return;
      setMemberActionPendingId(userId);
      try {
        await action(userId);
      } catch (error) {
        alert(error instanceof Error ? error.message : fallbackError);
      } finally {
        setMemberActionPendingId(null);
      }
    },
    [memberActionPendingId]
  );

  const runGroupAction = useCallback(
    async (
      actionType: 'leave' | 'delete',
      action?: () => Promise<void> | void,
      fallbackError = 'Failed to update group'
    ) => {
      if (!action || groupActionPending) return;
      setGroupActionPending(actionType);
      try {
        await action();
      } catch (error) {
        alert(error instanceof Error ? error.message : fallbackError);
      } finally {
        setGroupActionPending(null);
      }
    },
    [groupActionPending]
  );

  const saveSettings = useCallback(async () => {
    if (!onUpdateGroupSettings || isSavingSettings) return;
    setIsSavingSettings(true);
    try {
      await onUpdateGroupSettings({
        description: settingsDraft.description,
        isPublic: settingsDraft.isPublic,
        publicUsername: settingsDraft.publicUsername || undefined,
        historyVisibleToNewMembers: settingsDraft.historyVisibleToNewMembers,
        slowModeSeconds: Number.isFinite(settingsDraft.slowModeSeconds)
          ? Math.max(0, Math.floor(settingsDraft.slowModeSeconds))
          : 0,
        topicsEnabled: settingsDraft.topicsEnabled,
        reactionsEnabled:
          settingsDraft.reactionMode === 'NONE' ? false : settingsDraft.reactionsEnabled,
        reactionMode: settingsDraft.reactionMode,
        allowedReactions:
          settingsDraft.allowedReactionsText
            .split(/[\s,]+/)
            .map((item) => item.trim())
            .filter((item) => item.length > 0),
        pollsEnabled: settingsDraft.pollsEnabled,
      });
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update group settings');
    } finally {
      setIsSavingSettings(false);
    }
  }, [isSavingSettings, onUpdateGroupSettings, settingsDraft]);

  const savePermissions = useCallback(async () => {
    if (!onUpdateGroupPermissions || isSavingPermissions) return;
    setIsSavingPermissions(true);
    try {
      await onUpdateGroupPermissions({
        canSendMessages: permissionsDraft.canSendMessages,
        canSendMedia: permissionsDraft.canSendMedia,
        canSendPolls: permissionsDraft.canSendPolls,
        canAddWebPagePreviews: permissionsDraft.canAddWebPagePreviews,
        canChangeInfo: permissionsDraft.canChangeInfo,
        canInviteUsers: permissionsDraft.canInviteUsers,
        canPinMessages: permissionsDraft.canPinMessages,
      });
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update permissions');
    } finally {
      setIsSavingPermissions(false);
    }
  }, [isSavingPermissions, onUpdateGroupPermissions, permissionsDraft]);

  const createInvite = useCallback(async () => {
    if (!onCreateInviteLink || isInvitePending) return;
    setIsInvitePending(true);
    try {
      await onCreateInviteLink({
        name: inviteNameDraft || undefined,
        createsJoinRequest: inviteNeedsApproval,
      });
      setInviteNameDraft('');
      setInviteNeedsApproval(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to create invite link');
    } finally {
      setIsInvitePending(false);
    }
  }, [inviteNameDraft, inviteNeedsApproval, isInvitePending, onCreateInviteLink]);

  const createTopic = useCallback(async () => {
    if (!onCreateTopic) return;
    const normalizedTitle = topicTitleDraft.trim();
    if (!normalizedTitle) {
      return;
    }
    try {
      await onCreateTopic({
        title: normalizedTitle,
        iconEmoji: topicEmojiDraft.trim() || undefined,
      });
      setTopicTitleDraft('');
      setTopicEmojiDraft('');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to create topic');
    }
  }, [onCreateTopic, topicEmojiDraft, topicTitleDraft]);

  const createPoll = useCallback(async () => {
    if (!onCreatePoll) return;
    const question = pollQuestionDraft.trim();
    if (!question) {
      alert('Poll question is required');
      return;
    }
    const options = pollOptionsDraft
      .split('\n')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
    if (options.length < 2) {
      alert('Provide at least 2 poll options');
      return;
    }
    if (options.length > 10) {
      alert('Maximum 10 poll options');
      return;
    }
    const quiz = pollQuizDraft;
    const allowsMultiple = quiz ? false : pollAllowsMultipleDraft;
    let correctOptionIndex: number | undefined;
    if (quiz) {
      const parsedIndex = Number.parseInt(pollCorrectOptionDraft.trim(), 10);
      if (!Number.isFinite(parsedIndex)) {
        alert('For quiz poll, provide correct option index (1-based)');
        return;
      }
      const zeroBased = parsedIndex - 1;
      if (zeroBased < 0 || zeroBased >= options.length) {
        alert(`Correct option index must be between 1 and ${options.length}`);
        return;
      }
      correctOptionIndex = zeroBased;
    }
    try {
      await onCreatePoll({
        question,
        allowsMultiple,
        quiz,
        correctOptionIndex,
        explanation: pollExplanationDraft.trim() || undefined,
        anonymousVotes: pollAnonymousVotesDraft,
        options,
      });
      setPollQuestionDraft('');
      setPollOptionsDraft('Yes\nNo');
      setPollAllowsMultipleDraft(false);
      setPollQuizDraft(false);
      setPollCorrectOptionDraft('');
      setPollExplanationDraft('');
      setPollAnonymousVotesDraft(true);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to create poll');
    }
  }, [
    onCreatePoll,
    pollAllowsMultipleDraft,
    pollAnonymousVotesDraft,
    pollCorrectOptionDraft,
    pollExplanationDraft,
    pollOptionsDraft,
    pollQuestionDraft,
    pollQuizDraft,
  ]);

  const pinMessage = useCallback(async () => {
    if (!onPinMessage) return;
    const parsed = Number(pinMessageIdDraft);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      alert('Enter a valid message id to pin');
      return;
    }
    try {
      await onPinMessage(Math.floor(parsed));
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to pin message');
    }
  }, [onPinMessage, pinMessageIdDraft]);

  const handlePanelScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      const target = event.currentTarget;
      const remaining = target.scrollHeight - target.scrollTop - target.clientHeight;
      if (remaining > 240) {
        return;
      }
      if (activeTab === 'links' && !linksLoading && linksHasMore) {
        onLinksLoadMore();
        return;
      }
      if (activeTab === 'media' && !mediaLoading && mediaHasMore && onMediaLoadMore) {
        onMediaLoadMore();
        return;
      }
      if (activeTab === 'files' && !filesLoading && filesHasMore && onFilesLoadMore) {
        onFilesLoadMore();
      }
    },
    [
      activeTab,
      filesHasMore,
      filesLoading,
      linksHasMore,
      linksLoading,
      mediaHasMore,
      mediaLoading,
      onFilesLoadMore,
      onLinksLoadMore,
      onMediaLoadMore,
    ]
  );

  useEffect(() => {
    if (activeTab !== 'links' || linksLoading || !linksHasMore) {
      return;
    }
    const element = scrollRef.current;
    if (!element) {
      return;
    }
    if (element.scrollHeight - element.clientHeight <= 40) {
      onLinksLoadMore();
    }
  }, [activeTab, links.length, linksHasMore, linksLoading, onLinksLoadMore]);

  useEffect(() => {
    if (activeTab !== 'media' || mediaLoading || !mediaHasMore || !onMediaLoadMore) {
      return;
    }
    if (mediaItems.length > 0) {
      return;
    }
    onMediaLoadMore();
  }, [activeTab, mediaHasMore, mediaItems.length, mediaLoading, onMediaLoadMore]);

  useEffect(() => {
    if (activeTab !== 'files' || filesLoading || !filesHasMore || !onFilesLoadMore) {
      return;
    }
    if (fileItems.length > 0) {
      return;
    }
    onFilesLoadMore();
  }, [activeTab, fileItems.length, filesHasMore, filesLoading, onFilesLoadMore]);

  return (
    <aside className="relative h-full w-full border-l border-white/10 bg-[#14151a] shadow-[-16px_0_38px_rgba(0,0,0,0.4)]">
      <div ref={scrollRef} className="tg-scroll h-full overflow-y-auto" onScroll={handlePanelScroll}>
        <div className="relative h-[328px] overflow-hidden">
          {hasCover ? (
            <img src={chat.avatarUrl} alt={chat.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,#4a3b73_0%,#23242d_58%,#16171d_100%)]">
              <span className="text-[120px] font-[800] leading-none text-white/92">{chat.avatarText}</span>
            </div>
          )}

          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,11,15,0.38)_0%,rgba(11,11,15,0.1)_44%,rgba(11,11,15,0.84)_100%)]" />

          <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-white/92 transition-colors hover:bg-black/25"
              aria-label="Close group info"
            >
              <CloseIcon size={24} strokeWidth={2.4} />
            </button>

            <div className="text-[18px] font-[700] text-white">Group Info</div>

            <button
              type="button"
              onClick={() => {
                if (!canEditGroup) return;
                setIsEditOpen((prev) => !prev);
              }}
              disabled={!canEditGroup}
              className="rounded-full p-1.5 text-white/92 transition-colors hover:bg-black/25"
              aria-label="Edit group"
            >
              <PenSquareIcon size={23} strokeWidth={2.2} />
            </button>
          </div>

          <div className="absolute inset-x-0 bottom-0 px-4 pb-5">
            <div className="truncate text-[33px] font-[700] leading-[1.02] text-white drop-shadow-[0_5px_16px_rgba(0,0,0,0.45)]">
              {chat.name}
            </div>
            <div className="mt-1 text-[15px] text-white/78">
              {memberCount} {memberCount === 1 ? 'member' : 'members'}
            </div>
          </div>
        </div>

        {isEditOpen ? (
          <div className="space-y-3 border-b border-white/8 bg-[#171820] px-4 py-4">
            <div className="text-[13px] font-[600] uppercase tracking-[0.3px] text-white/55">
              Edit Group
            </div>
            <label className="block">
              <span className="mb-1.5 block text-[13px] text-white/60">Title</span>
              <input
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
                maxLength={255}
                className="h-10 w-full rounded-[10px] border border-white/12 bg-[#20222d] px-3 text-[14px] text-white/95 outline-none transition-colors focus:border-[#8f73ff]"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[13px] text-white/60">Avatar URL or data URL</span>
              <input
                value={editAvatarPath}
                onChange={(event) => setEditAvatarPath(event.target.value)}
                className="h-10 w-full rounded-[10px] border border-white/12 bg-[#20222d] px-3 text-[14px] text-white/95 outline-none transition-colors focus:border-[#8f73ff]"
              />
            </label>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="rounded-[10px] border border-white/14 px-3 py-1.5 text-[13px] text-white/75 transition-colors hover:bg-white/8"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  void submitGroupEdit();
                }}
                disabled={isSavingGroup}
                className="rounded-[10px] bg-[#7d65e8] px-3 py-1.5 text-[13px] font-[600] text-white transition-colors hover:bg-[#8f78ef] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSavingGroup ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : null}

        <div className="bg-[#1c1d24]">
          <div className="flex items-center gap-3 px-5 py-4 text-white/78">
            <LinkIcon />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-[500] text-white/96">{inviteLink}</div>
              <div className="text-[14px] text-white/58">Link</div>
            </div>
          </div>

          <div className="flex items-center gap-3 px-5 pb-5 pt-3 text-white/78">
            <BellIcon />
            <div className="min-w-0 flex-1 text-[15px] font-[500] text-white/96">Notifications</div>
            <button
              type="button"
              onClick={() => onNotificationsEnabledChange(!notificationsEnabled)}
              className={`relative inline-flex h-8 w-[58px] items-center rounded-full border transition-colors ${
                notificationsEnabled
                  ? 'border-[#7e65e8] bg-[#7e65e8]'
                  : 'border-white/18 bg-white/12'
              }`}
              aria-label="Toggle group notifications"
            >
              <span
                className={`inline-block h-[26px] w-[26px] rounded-full bg-[#111217] transition-transform ${
                  notificationsEnabled ? 'translate-x-[30px]' : 'translate-x-[2px]'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="mt-[14px] bg-[#16171d]">
          <div className="flex border-b border-t border-white/8 px-2">
            {GROUP_INFO_TABS.map((tab) => {
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTabChange(tab.id)}
                  className={`relative flex-1 px-2 pb-3 pt-2.5 text-center text-[15px] font-[600] transition-colors ${
                    isActive ? 'text-[#a790ff]' : 'text-white/56 hover:text-white/84'
                  }`}
                >
                  {tab.label}
                  {isActive ? (
                    <span className="absolute bottom-0 left-1/2 h-[3px] w-[78%] -translate-x-1/2 rounded-full bg-[#8f73ff]" />
                  ) : null}
                </button>
              );
            })}
          </div>

          {activeTab === 'members' ? (
            <div>
              {members.length === 0 ? (
                <div className="px-6 py-8 text-[14px] text-white/52">No members info available.</div>
              ) : (
                <div>
                  {members.map((member) => (
                    <div
                      key={member.userId}
                      className="flex items-start gap-3 border-b border-white/6 px-4 py-3 transition-colors hover:bg-white/[0.045]"
                    >
                      <div className="pt-[1px]">
                        <Avatar
                          size={55}
                          avatarBg={member.avatarBg}
                          avatarText={member.avatarText}
                          avatarUrl={member.avatarUrl}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[17px] font-[500] leading-tight text-white/95">
                          {member.name}
                        </div>
                        <div
                          className={`mt-[1px] truncate text-[14px] ${
                            member.isOnline ? 'text-[#9f88ff]' : 'text-white/52'
                          }`}
                        >
                          {member.statusText}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {onMuteMember ? (
                            <button
                              type="button"
                              onClick={() => {
                                void runMemberAction(member.userId, onMuteMember, 'Failed to mute member');
                              }}
                              disabled={memberActionPendingId === member.userId}
                              className="rounded-[8px] border border-white/14 px-2 py-1 text-[11px] font-[600] text-white/72 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Mute
                            </button>
                          ) : null}
                          {onUnmuteMember ? (
                            <button
                              type="button"
                              onClick={() => {
                                void runMemberAction(member.userId, onUnmuteMember, 'Failed to unmute member');
                              }}
                              disabled={memberActionPendingId === member.userId}
                              className="rounded-[8px] border border-white/14 px-2 py-1 text-[11px] font-[600] text-white/72 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Unmute
                            </button>
                          ) : null}
                          {onBanMember ? (
                            <button
                              type="button"
                              onClick={() => {
                                void runMemberAction(member.userId, onBanMember, 'Failed to ban member');
                              }}
                              disabled={memberActionPendingId === member.userId}
                              className="rounded-[8px] border border-[#9f3f54]/40 px-2 py-1 text-[11px] font-[600] text-[#ffb3c3] transition-colors hover:bg-[#9f3f54]/20 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Ban
                            </button>
                          ) : null}
                          {onUnbanMember ? (
                            <button
                              type="button"
                              onClick={() => {
                                void runMemberAction(member.userId, onUnbanMember, 'Failed to unban member');
                              }}
                              disabled={memberActionPendingId === member.userId}
                              className="rounded-[8px] border border-white/14 px-2 py-1 text-[11px] font-[600] text-white/72 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Unban
                            </button>
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-[2px] shrink-0 text-right">
                        <div className="text-[13px] font-[600] uppercase tracking-[0.2px] text-white/56">
                          {member.role.toLowerCase()}
                        </div>
                      </div>
                      {member.canTransferOwnership || member.canPromote || member.canDemote || member.canRemove ? (
                        <div className="mt-[1px] flex shrink-0 flex-col items-end gap-1">
                          {member.canTransferOwnership ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (!confirm(`Transfer ownership to ${member.name}?`)) return;
                                void runMemberAction(
                                  member.userId,
                                  onTransferOwnership,
                                  'Failed to transfer ownership'
                                );
                              }}
                              disabled={memberActionPendingId === member.userId}
                              className="rounded-[8px] border border-[#8f73ff]/45 px-2 py-1 text-[11px] font-[600] text-[#d7c9ff] transition-colors hover:bg-[#8f73ff]/18 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Make owner
                            </button>
                          ) : null}
                          {member.canPromote ? (
                            <button
                              type="button"
                              onClick={() => {
                                void runMemberAction(
                                  member.userId,
                                  onPromoteMember,
                                  'Failed to promote member'
                                );
                              }}
                              disabled={memberActionPendingId === member.userId}
                              className="rounded-[8px] border border-white/14 px-2 py-1 text-[11px] font-[600] text-white/72 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Promote
                            </button>
                          ) : null}
                          {member.canDemote ? (
                            <button
                              type="button"
                              onClick={() => {
                                void runMemberAction(
                                  member.userId,
                                  onDemoteMember,
                                  'Failed to demote member'
                                );
                              }}
                              disabled={memberActionPendingId === member.userId}
                              className="rounded-[8px] border border-white/14 px-2 py-1 text-[11px] font-[600] text-white/72 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Demote
                            </button>
                          ) : null}
                          {member.canRemove ? (
                            <button
                              type="button"
                              onClick={() => {
                                void runMemberAction(
                                  member.userId,
                                  onRemoveMember,
                                  'Failed to remove member'
                                );
                              }}
                              disabled={memberActionPendingId === member.userId}
                              className="rounded-[8px] border border-[#9f3f54]/40 px-2 py-1 text-[11px] font-[600] text-[#ffb3c3] transition-colors hover:bg-[#9f3f54]/20 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Remove
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-4 border-t border-white/8 px-4 py-4">
                <div className="rounded-[12px] border border-white/10 bg-[#1a1c24] p-3">
                  <div className="mb-2 text-[13px] font-[700] uppercase tracking-[0.4px] text-white/60">
                    Group Settings
                  </div>
                  <label className="mb-2 block">
                    <span className="mb-1 block text-[12px] text-white/55">Description</span>
                    <input
                      value={settingsDraft.description}
                      onChange={(event) =>
                        setSettingsDraft((prev) => ({ ...prev, description: event.target.value }))
                      }
                      className="h-9 w-full rounded-[8px] border border-white/12 bg-[#20222d] px-2.5 text-[13px] text-white/95 outline-none"
                    />
                  </label>
                  <label className="mb-2 block">
                    <span className="mb-1 block text-[12px] text-white/55">Public username</span>
                    <input
                      value={settingsDraft.publicUsername}
                      onChange={(event) =>
                        setSettingsDraft((prev) => ({ ...prev, publicUsername: event.target.value }))
                      }
                      className="h-9 w-full rounded-[8px] border border-white/12 bg-[#20222d] px-2.5 text-[13px] text-white/95 outline-none"
                    />
                  </label>
                  <label className="mb-2 block">
                    <span className="mb-1 block text-[12px] text-white/55">Slow mode (seconds)</span>
                    <input
                      type="number"
                      min={0}
                      max={3600}
                      value={settingsDraft.slowModeSeconds}
                      onChange={(event) =>
                        setSettingsDraft((prev) => ({
                          ...prev,
                          slowModeSeconds: Number(event.target.value) || 0,
                        }))
                      }
                      className="h-9 w-full rounded-[8px] border border-white/12 bg-[#20222d] px-2.5 text-[13px] text-white/95 outline-none"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-[12px] text-white/72">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settingsDraft.isPublic}
                        onChange={(event) =>
                          setSettingsDraft((prev) => ({ ...prev, isPublic: event.target.checked }))
                        }
                      />
                      Public
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settingsDraft.historyVisibleToNewMembers}
                        onChange={(event) =>
                          setSettingsDraft((prev) => ({
                            ...prev,
                            historyVisibleToNewMembers: event.target.checked,
                          }))
                        }
                      />
                      History visible
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settingsDraft.topicsEnabled}
                        onChange={(event) =>
                          setSettingsDraft((prev) => ({ ...prev, topicsEnabled: event.target.checked }))
                        }
                      />
                      Topics
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settingsDraft.reactionsEnabled}
                        onChange={(event) =>
                          setSettingsDraft((prev) => ({
                            ...prev,
                            reactionsEnabled: event.target.checked,
                            reactionMode: event.target.checked
                              ? (prev.reactionMode === 'NONE' ? 'ALL' : prev.reactionMode)
                              : 'NONE',
                          }))
                        }
                      />
                      Reactions
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settingsDraft.pollsEnabled}
                        onChange={(event) =>
                          setSettingsDraft((prev) => ({ ...prev, pollsEnabled: event.target.checked }))
                        }
                      />
                      Polls
                    </label>
                  </div>
                  <label className="mt-2 block">
                    <span className="mb-1 block text-[12px] text-white/55">Reaction mode</span>
                    <select
                      value={settingsDraft.reactionMode}
                      onChange={(event) => {
                        const nextMode = event.target.value as 'ALL' | 'SOME' | 'NONE';
                        setSettingsDraft((prev) => ({
                          ...prev,
                          reactionMode: nextMode,
                          reactionsEnabled: nextMode !== 'NONE',
                        }));
                      }}
                      className="h-9 w-full rounded-[8px] border border-white/12 bg-[#20222d] px-2.5 text-[13px] text-white/95 outline-none"
                    >
                      <option value="ALL">All</option>
                      <option value="SOME">Some</option>
                      <option value="NONE">None</option>
                    </select>
                  </label>
                  <label className="mt-2 block">
                    <span className="mb-1 block text-[12px] text-white/55">
                      Allowed reactions (space/comma-separated)
                    </span>
                    <input
                      value={settingsDraft.allowedReactionsText}
                      onChange={(event) =>
                        setSettingsDraft((prev) => ({
                          ...prev,
                          allowedReactionsText: event.target.value,
                        }))
                      }
                      placeholder="👍 ❤️ 🔥"
                      className="h-9 w-full rounded-[8px] border border-white/12 bg-[#20222d] px-2.5 text-[13px] text-white/95 outline-none"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      void saveSettings();
                    }}
                    disabled={isSavingSettings || !onUpdateGroupSettings}
                    className="mt-3 rounded-[8px] bg-[#7d65e8] px-3 py-1.5 text-[12px] font-[700] text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSavingSettings ? 'Saving...' : 'Save settings'}
                  </button>
                </div>

                <div className="rounded-[12px] border border-white/10 bg-[#1a1c24] p-3">
                  <div className="mb-2 text-[13px] font-[700] uppercase tracking-[0.4px] text-white/60">
                    Permissions
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[12px] text-white/72">
                    {(
                      [
                        ['canSendMessages', 'Send messages'],
                        ['canSendMedia', 'Send media'],
                        ['canSendPolls', 'Send polls'],
                        ['canAddWebPagePreviews', 'Web previews'],
                        ['canChangeInfo', 'Change info'],
                        ['canInviteUsers', 'Invite users'],
                        ['canPinMessages', 'Pin messages'],
                      ] as Array<[keyof typeof permissionsDraft, string]>
                    ).map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={permissionsDraft[key]}
                          onChange={(event) =>
                            setPermissionsDraft((prev) => ({ ...prev, [key]: event.target.checked }))
                          }
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      void savePermissions();
                    }}
                    disabled={isSavingPermissions || !onUpdateGroupPermissions}
                    className="mt-3 rounded-[8px] bg-[#7d65e8] px-3 py-1.5 text-[12px] font-[700] text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSavingPermissions ? 'Saving...' : 'Save permissions'}
                  </button>
                </div>

                <div className="rounded-[12px] border border-white/10 bg-[#1a1c24] p-3">
                  <div className="mb-2 text-[13px] font-[700] uppercase tracking-[0.4px] text-white/60">
                    Pin Message
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      value={pinMessageIdDraft}
                      onChange={(event) => setPinMessageIdDraft(event.target.value)}
                      placeholder="Message ID"
                      className="h-9 flex-1 rounded-[8px] border border-white/12 bg-[#20222d] px-2.5 text-[13px] text-white/95 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        void pinMessage();
                      }}
                      disabled={!onPinMessage}
                      className="rounded-[8px] border border-white/14 px-2.5 py-1.5 text-[12px] text-white/80 disabled:opacity-50"
                    >
                      Pin
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!onUnpinMessage) return;
                        void onUnpinMessage();
                      }}
                      disabled={!onUnpinMessage}
                      className="rounded-[8px] border border-white/14 px-2.5 py-1.5 text-[12px] text-white/80 disabled:opacity-50"
                    >
                      Unpin
                    </button>
                  </div>
                </div>

                <div className="rounded-[12px] border border-white/10 bg-[#1a1c24] p-3">
                  <div className="mb-2 text-[13px] font-[700] uppercase tracking-[0.4px] text-white/60">
                    Invite Links
                  </div>
                  <div className="mb-2 flex items-center gap-2">
                    <input
                      value={inviteNameDraft}
                      onChange={(event) => setInviteNameDraft(event.target.value)}
                      placeholder="Invite name"
                      className="h-9 flex-1 rounded-[8px] border border-white/12 bg-[#20222d] px-2.5 text-[13px] text-white/95 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        void createInvite();
                      }}
                      disabled={isInvitePending || !onCreateInviteLink}
                      className="rounded-[8px] bg-[#7d65e8] px-2.5 py-1.5 text-[12px] font-[700] text-white disabled:opacity-60"
                    >
                      Create
                    </button>
                  </div>
                  <label className="mb-3 flex items-center gap-2 text-[12px] text-white/70">
                    <input
                      type="checkbox"
                      checked={inviteNeedsApproval}
                      onChange={(event) => setInviteNeedsApproval(event.target.checked)}
                    />
                    Require approval
                  </label>
                  <div className="space-y-2">
                    {inviteLinks.length === 0 ? (
                      <div className="text-[12px] text-white/45">No invite links</div>
                    ) : (
                      inviteLinks.map((invite) => (
                        <div key={invite.id} className="rounded-[8px] border border-white/8 px-2.5 py-2">
                          <div className="truncate text-[12px] text-white/85">{invite.link}</div>
                          <div className="mt-1 text-[11px] text-white/52">
                            uses: {invite.usageCount}
                            {invite.usageLimit ? `/${invite.usageLimit}` : ''}
                            {invite.revoked ? ' • revoked' : ''}
                          </div>
                          {!invite.revoked && onRevokeInviteLink ? (
                            <div className="mt-1.5 flex flex-wrap gap-2">
                              {onUpdateInviteLink ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextName = prompt(
                                      'Invite name',
                                      invite.name && invite.name.trim().length > 0
                                        ? invite.name
                                        : ''
                                    );
                                    if (nextName === null) return;
                                    void onUpdateInviteLink(invite.id, { name: nextName });
                                  }}
                                  className="rounded-[8px] border border-white/14 px-2 py-1 text-[11px] font-[600] text-white/80"
                                >
                                  Edit
                                </button>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => {
                                  void onRevokeInviteLink(invite.id);
                                }}
                                className="rounded-[8px] border border-[#9f3f54]/40 px-2 py-1 text-[11px] font-[600] text-[#ffb3c3]"
                              >
                                Revoke
                              </button>
                            </div>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-[12px] border border-white/10 bg-[#1a1c24] p-3">
                  <div className="mb-2 text-[13px] font-[700] uppercase tracking-[0.4px] text-white/60">
                    Join Requests
                  </div>
                  {joinRequests.length === 0 ? (
                    <div className="text-[12px] text-white/45">No pending requests</div>
                  ) : (
                    <div className="space-y-2">
                      {joinRequests.map((request) => (
                        <div key={request.id} className="rounded-[8px] border border-white/8 px-2.5 py-2">
                          <div className="text-[12px] text-white/85">{request.userId}</div>
                          <div className="mt-1 text-[11px] text-white/52">{request.status}</div>
                          {request.status === 'PENDING' ? (
                            <div className="mt-1.5 flex gap-2">
                              {onApproveJoinRequest ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    void onApproveJoinRequest(request.id);
                                  }}
                                  className="rounded-[8px] border border-white/14 px-2 py-1 text-[11px] text-white/80"
                                >
                                  Approve
                                </button>
                              ) : null}
                              {onDeclineJoinRequest ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    void onDeclineJoinRequest(request.id);
                                  }}
                                  className="rounded-[8px] border border-[#9f3f54]/40 px-2 py-1 text-[11px] text-[#ffb3c3]"
                                >
                                  Decline
                                </button>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-[12px] border border-white/10 bg-[#1a1c24] p-3">
                  <div className="mb-2 text-[13px] font-[700] uppercase tracking-[0.4px] text-white/60">
                    Topics
                  </div>
                  <div className="mb-2 flex items-center gap-2">
                    <input
                      value={topicTitleDraft}
                      onChange={(event) => setTopicTitleDraft(event.target.value)}
                      placeholder="Topic title"
                      className="h-9 flex-1 rounded-[8px] border border-white/12 bg-[#20222d] px-2.5 text-[13px] text-white/95 outline-none"
                    />
                    <input
                      value={topicEmojiDraft}
                      onChange={(event) => setTopicEmojiDraft(event.target.value)}
                      placeholder="Emoji"
                      className="h-9 w-20 rounded-[8px] border border-white/12 bg-[#20222d] px-2.5 text-[13px] text-white/95 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        void createTopic();
                      }}
                      disabled={!onCreateTopic}
                      className="rounded-[8px] bg-[#7d65e8] px-2.5 py-1.5 text-[12px] font-[700] text-white disabled:opacity-60"
                    >
                      Create
                    </button>
                  </div>
                  {onOpenTopic ? (
                    <div className="mb-2">
                      <button
                        type="button"
                        onClick={() => {
                          void onOpenTopic(undefined);
                        }}
                        className={`rounded-[8px] border px-2.5 py-1 text-[11px] font-[600] transition-colors ${
                          !activeTopicId
                            ? 'border-[#7d65e8]/70 bg-[#7d65e8]/24 text-white'
                            : 'border-white/14 text-white/78 hover:bg-white/10'
                        }`}
                      >
                        All Topics
                      </button>
                    </div>
                  ) : null}
                  <div className="space-y-2">
                    {topics.length === 0 ? (
                      <div className="text-[12px] text-white/45">No topics</div>
                    ) : (
                      topics.map((topic) => (
                        <div key={topic.id} className="rounded-[8px] border border-white/8 px-2.5 py-2">
                          <div className="truncate text-[12px] text-white/88">
                            {topic.iconEmoji ? `${topic.iconEmoji} ` : ''}
                            {topic.title}
                          </div>
                          <div className="mt-1 text-[11px] text-white/52">
                            {topic.closed ? 'closed' : 'open'}
                            {topic.deleted ? ' • deleted' : ''}
                            {typeof topic.topMessageId === 'number' ? ` • top #${topic.topMessageId}` : ''}
                          </div>
                          <div className="mt-1.5 flex flex-wrap gap-2">
                            {onOpenTopic && !topic.deleted ? (
                              <button
                                type="button"
                                onClick={() => {
                                  void onOpenTopic(topic.id);
                                }}
                                className={`rounded-[8px] border px-2 py-1 text-[11px] ${
                                  activeTopicId === topic.id
                                    ? 'border-[#7d65e8]/70 bg-[#7d65e8]/24 text-white'
                                    : 'border-white/14 text-white/80'
                                }`}
                              >
                                Open
                              </button>
                            ) : null}
                            {onToggleTopicClosed ? (
                              <button
                                type="button"
                                onClick={() => {
                                  void onToggleTopicClosed(topic.id, !topic.closed);
                                }}
                                className="rounded-[8px] border border-white/14 px-2 py-1 text-[11px] text-white/80"
                              >
                                {topic.closed ? 'Reopen' : 'Close'}
                              </button>
                            ) : null}
                            {!topic.deleted && onDeleteTopic ? (
                              <button
                                type="button"
                                onClick={() => {
                                  void onDeleteTopic(topic.id);
                                }}
                                className="rounded-[8px] border border-[#9f3f54]/40 px-2 py-1 text-[11px] text-[#ffb3c3]"
                              >
                                Delete
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-[12px] border border-white/10 bg-[#1a1c24] p-3">
                  <div className="mb-2 text-[13px] font-[700] uppercase tracking-[0.4px] text-white/60">
                    Create Poll
                  </div>
                  <label className="mb-2 block">
                    <span className="mb-1 block text-[12px] text-white/55">Question</span>
                    <input
                      value={pollQuestionDraft}
                      onChange={(event) => setPollQuestionDraft(event.target.value)}
                      placeholder="Poll question"
                      className="h-9 w-full rounded-[8px] border border-white/12 bg-[#20222d] px-2.5 text-[13px] text-white/95 outline-none"
                    />
                  </label>
                  <label className="mb-2 block">
                    <span className="mb-1 block text-[12px] text-white/55">
                      Options (one per line)
                    </span>
                    <textarea
                      value={pollOptionsDraft}
                      onChange={(event) => setPollOptionsDraft(event.target.value)}
                      className="min-h-[90px] w-full resize-y rounded-[8px] border border-white/12 bg-[#20222d] px-2.5 py-2 text-[13px] text-white/95 outline-none"
                    />
                  </label>
                  <label className="mb-3 flex items-center gap-2 text-[12px] text-white/70">
                    <input
                      type="checkbox"
                      checked={pollQuizDraft}
                      onChange={(event) => setPollQuizDraft(event.target.checked)}
                    />
                    Quiz mode
                  </label>
                  <label className="mb-3 flex items-center gap-2 text-[12px] text-white/70">
                    <input
                      type="checkbox"
                      checked={pollAllowsMultipleDraft}
                      onChange={(event) => setPollAllowsMultipleDraft(event.target.checked)}
                      disabled={pollQuizDraft}
                    />
                    Allow multiple answers
                  </label>
                  <label className="mb-3 flex items-center gap-2 text-[12px] text-white/70">
                    <input
                      type="checkbox"
                      checked={pollAnonymousVotesDraft}
                      onChange={(event) => setPollAnonymousVotesDraft(event.target.checked)}
                    />
                    Anonymous votes
                  </label>
                  {pollQuizDraft ? (
                    <>
                      <label className="mb-2 block">
                        <span className="mb-1 block text-[12px] text-white/55">
                          Correct option index (1-based)
                        </span>
                        <input
                          value={pollCorrectOptionDraft}
                          onChange={(event) => setPollCorrectOptionDraft(event.target.value)}
                          placeholder="1"
                          className="h-9 w-full rounded-[8px] border border-white/12 bg-[#20222d] px-2.5 text-[13px] text-white/95 outline-none"
                        />
                      </label>
                      <label className="mb-2 block">
                        <span className="mb-1 block text-[12px] text-white/55">Explanation</span>
                        <textarea
                          value={pollExplanationDraft}
                          onChange={(event) => setPollExplanationDraft(event.target.value)}
                          className="min-h-[64px] w-full resize-y rounded-[8px] border border-white/12 bg-[#20222d] px-2.5 py-2 text-[13px] text-white/95 outline-none"
                        />
                      </label>
                    </>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      void createPoll();
                    }}
                    disabled={!onCreatePoll}
                    className="rounded-[8px] bg-[#7d65e8] px-3 py-1.5 text-[12px] font-[700] text-white disabled:opacity-60"
                  >
                    Create poll
                  </button>
                </div>

                <div className="rounded-[12px] border border-white/10 bg-[#1a1c24] p-3">
                  <div className="mb-2 text-[13px] font-[700] uppercase tracking-[0.4px] text-white/60">
                    Admin Log
                  </div>
                  {adminLogItems.length === 0 ? (
                    <div className="text-[12px] text-white/45">
                      {adminLogLoading ? 'Loading admin log...' : 'No admin events'}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {adminLogItems.map((entry) => (
                        <div key={entry.id} className="rounded-[8px] border border-white/8 px-2.5 py-2">
                          <div className="text-[12px] text-white/86">{entry.eventType}</div>
                          <div className="mt-1 text-[11px] text-white/50">
                            actor: {entry.actorUserId || 'unknown'}
                          </div>
                          <div className="text-[11px] text-white/50">{entry.createdAt}</div>
                        </div>
                      ))}
                      {onAdminLogLoadMore ? (
                        <div className="pt-1">
                          {adminLogLoading ? (
                            <div className="text-[11px] text-white/52">Loading more...</div>
                          ) : adminLogHasMore ? (
                            <button
                              type="button"
                              onClick={onAdminLogLoadMore}
                              className="rounded-[8px] border border-white/14 px-2.5 py-1 text-[11px] text-white/76"
                            >
                              Load more
                            </button>
                          ) : (
                            <div className="text-[11px] text-white/44">All events loaded</div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : activeTab === 'links' ? (
            links.length === 0 ? (
              <div className="px-6 py-8 text-[14px] text-white/52">
                {linksLoading ? 'Loading links...' : 'No links yet.'}
              </div>
            ) : (
              <div className="pb-1">
                {links.map((item) => (
                  <GroupInfoLinkRow key={item.id} item={item} />
                ))}
                {linksLoading ? (
                  <div className="px-4 py-3 text-[13px] text-white/46">Loading more...</div>
                ) : linksHasMore ? (
                  <div className="px-4 py-3 text-[13px] text-white/46">Scroll to load more links</div>
                ) : (
                  <div className="px-4 py-3 text-[13px] text-white/38">All links are loaded</div>
                )}
              </div>
            )
          ) : activeTab === 'media' ? (
            mediaItems.length === 0 ? (
              <div className="px-6 py-8 text-[14px] text-white/52">
                {mediaLoading ? 'Loading media...' : 'No media yet.'}
              </div>
            ) : (
              <div className="pb-1">
                {mediaItems.map((item) => (
                  <a
                    key={`${item.messageId}-${item.attachmentPath}`}
                    href={item.attachmentUrl || `/media/${item.attachmentPath}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 border-b border-white/6 px-4 py-3 transition-colors hover:bg-white/[0.045]"
                  >
                    <div className="h-14 w-14 overflow-hidden rounded-[10px] bg-[#272832]">
                      {item.thumbnailUrl || item.attachmentUrl ? (
                        <img
                          src={item.thumbnailUrl || item.attachmentUrl}
                          alt={item.fileName || item.attachmentPath}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] text-white/90">
                        {item.fileName || item.attachmentPath}
                      </div>
                      <div className="text-[12px] text-white/52">{item.contentType || item.messageType}</div>
                    </div>
                  </a>
                ))}
                {mediaLoading ? (
                  <div className="px-4 py-3 text-[13px] text-white/46">Loading more...</div>
                ) : mediaHasMore ? (
                  <div className="px-4 py-3 text-[13px] text-white/46">Scroll to load more</div>
                ) : (
                  <div className="px-4 py-3 text-[13px] text-white/38">All media loaded</div>
                )}
              </div>
            )
          ) : activeTab === 'files' ? (
            fileItems.length === 0 ? (
              <div className="px-6 py-8 text-[14px] text-white/52">
                {filesLoading ? 'Loading files...' : 'No files yet.'}
              </div>
            ) : (
              <div className="pb-1">
                {fileItems.map((item) => (
                  <a
                    key={`${item.messageId}-${item.attachmentPath}`}
                    href={item.attachmentUrl || `/media/${item.attachmentPath}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 border-b border-white/6 px-4 py-3 transition-colors hover:bg-white/[0.045]"
                  >
                    <div className="grid h-14 w-14 place-items-center rounded-[10px] bg-[#272832] text-[11px] text-white/62">
                      FILE
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] text-white/90">
                        {item.fileName || item.attachmentPath}
                      </div>
                      <div className="text-[12px] text-white/52">{item.contentType || item.messageType}</div>
                    </div>
                  </a>
                ))}
                {filesLoading ? (
                  <div className="px-4 py-3 text-[13px] text-white/46">Loading more...</div>
                ) : filesHasMore ? (
                  <div className="px-4 py-3 text-[13px] text-white/46">Scroll to load more</div>
                ) : (
                  <div className="px-4 py-3 text-[13px] text-white/38">All files loaded</div>
                )}
              </div>
            )
          ) : (
            <div className="px-6 py-8 text-[14px] text-white/52">No data.</div>
          )}
        </div>
      </div>

      {activeTab === 'members' && (onLeaveGroup || (isOwner && onDeleteGroup)) ? (
        <div className="absolute bottom-6 left-5 flex items-center gap-2">
          {onLeaveGroup ? (
            <button
              type="button"
              onClick={() => {
                if (!confirm('Leave this group?')) return;
                void runGroupAction('leave', onLeaveGroup, 'Failed to leave group');
              }}
              disabled={groupActionPending !== null}
              className="rounded-[10px] border border-white/16 bg-[#1e1f26] px-3 py-2 text-[13px] font-[600] text-white/78 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {groupActionPending === 'leave' ? 'Leaving...' : 'Leave'}
            </button>
          ) : null}
          {isOwner && onDeleteGroup ? (
            <button
              type="button"
              onClick={() => {
                if (!confirm('Delete this group for all members?')) return;
                void runGroupAction('delete', onDeleteGroup, 'Failed to delete group');
              }}
              disabled={groupActionPending !== null}
              className="rounded-[10px] border border-[#9f3f54]/45 bg-[#25181e] px-3 py-2 text-[13px] font-[600] text-[#ffb6c5] transition-colors hover:bg-[#9f3f54]/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {groupActionPending === 'delete' ? 'Deleting...' : 'Delete'}
            </button>
          ) : null}
        </div>
      ) : null}

      {activeTab === 'members' && canAddMembers && !!onAddMembersClick ? (
        <button
          type="button"
          onClick={onAddMembersClick}
          className="absolute bottom-6 right-5 grid h-[66px] w-[66px] place-items-center rounded-full bg-[#7d65e8] text-white shadow-[0_14px_26px_rgba(126,102,235,0.45)] transition-colors hover:bg-[#927cff]"
          aria-label="Add member"
        >
          <UserPlusIcon size={31} />
        </button>
      ) : null}
    </aside>
  );
}
