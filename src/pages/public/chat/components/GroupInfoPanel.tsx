import { useCallback, useEffect, useMemo, useRef, useState, type UIEvent } from 'react';
import { http } from '@/shared/api/http';
import { endpoints } from '@/shared/api/endpoints';
import type {
  ChatAdminRights,
  ChatAdminLogItem,
  ChatGroupMediaItem,
  ChatGroupPermissions,
  ChatGroupSettings,
  ChatInviteLink,
  ChatJoinRequest,
  ChatMemberRestrictions,
  ChatTopic,
} from '@/shared/api/types';
import type { SidebarChat } from '../types';
import { CloseIcon, PenSquareIcon } from '../icons';
import { Avatar } from './Avatar';
import { MediaViewerModal, type MediaViewerItem } from './messageTypes/MediaViewerModal';

export type GroupInfoTab = 'members' | 'media' | 'links';

export type GroupInfoMember = {
  userId: string;
  name: string;
  avatarUrl?: string;
  avatarBg: string;
  avatarText: string;
  statusText: string;
  isOnline: boolean;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  memberTag?: string;
  isCurrentUser?: boolean;
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
  isOpen?: boolean;
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
  onOpenPrivateChat?: (userId: string) => Promise<void> | void;
  onLoadMemberRestrictions?: (userId: string) => Promise<ChatMemberRestrictions> | ChatMemberRestrictions;
  onSaveMemberRestrictions?: (
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
      canSendVideoMessages?: boolean;
      canEmbedLinks?: boolean;
      canSendPolls?: boolean;
      canInviteUsers?: boolean;
      canPinMessages?: boolean;
      canChangeInfo?: boolean;
      reason?: string;
    }
  ) => Promise<void> | void;
  onLoadMemberAdminRights?: (userId: string) => Promise<ChatAdminRights> | ChatAdminRights;
  onSaveMemberAdminRights?: (
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
  ) => Promise<void> | void;
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
  { id: 'links', label: 'Links' },
];

const LINK_META_CACHE = new Map<string, LinkPreviewMeta | null>();
const LINK_META_INFLIGHT = new Map<string, Promise<LinkPreviewMeta | null>>();
const URL_IN_TEXT_PATTERN = /(?:(?:https?:\/\/)|(?:www\.))\S+/gi;
const MAX_AVATAR_DATA_URL_LENGTH = 65500;
const MEDIA_MONTH_FORMATTER = new Intl.DateTimeFormat('en-US', { month: 'long' });
const MEDIA_MONTH_WITH_YEAR_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
});
async function fileToAvatarDataUrl(file: File): Promise<string> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
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
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

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

type MemberContextMenuAction =
  | 'send-message'
  | 'promote-admin'
  | 'edit-admin-rights'
  | 'make-owner'
  | 'restrict-user'
  | 'remove-member';

type MemberEditorMode = 'admin-rights' | 'promote-admin' | 'restrict-user';

type MemberEditorState = {
  mode: MemberEditorMode;
  member: GroupInfoMember;
};

type AdminRightsDraft = {
  canManageGroup: boolean;
  canDeleteMessages: boolean;
  canBanUsers: boolean;
  canManageInviteLinks: boolean;
  canPinMessages: boolean;
  canManageTopics: boolean;
  isAnonymous: boolean;
  canManageMembers: boolean;
  customTitle: string;
};
type AdminToggleKey = Exclude<keyof AdminRightsDraft, 'customTitle'>;

type RestrictionMediaDraft = {
  sendPhotos: boolean;
  sendVideos: boolean;
  sendStickersAndGifs: boolean;
  sendMusic: boolean;
  sendVideoMessages: boolean;
  embedLinks: boolean;
  sendPolls: boolean;
};

type RestrictionDurationId = 'FOREVER' | 'DAY' | 'WEEK' | 'MONTH' | 'CUSTOM';

type RestrictionDraft = {
  canSendMessages: boolean;
  canSendMedia: boolean;
  canAddUsers: boolean;
  canPinMessages: boolean;
  canChangeChatInfo: boolean;
  media: RestrictionMediaDraft;
  durationId: RestrictionDurationId;
  customUntilIso: string | null;
};

const DEFAULT_RESTRICTION_MEDIA_DRAFT: RestrictionMediaDraft = {
  sendPhotos: true,
  sendVideos: true,
  sendStickersAndGifs: true,
  sendMusic: true,
  sendVideoMessages: true,
  embedLinks: true,
  sendPolls: true,
};

const RESTRICTION_MEDIA_ITEMS: Array<{ key: keyof RestrictionMediaDraft; label: string }> = [
  { key: 'sendPhotos', label: 'Send Photos' },
  { key: 'sendVideos', label: 'Send Videos' },
  { key: 'sendStickersAndGifs', label: 'Send Stickers and GIFs' },
  { key: 'sendMusic', label: 'Send Music' },
  { key: 'sendVideoMessages', label: 'Send Video Messages' },
  { key: 'embedLinks', label: 'Embed Links' },
  { key: 'sendPolls', label: 'Send Polls' },
];

const DURATION_OPTIONS: Array<{
  id: RestrictionDurationId;
  label: string;
  ms?: number;
}> = [
  { id: 'FOREVER', label: 'Forever' },
  { id: 'DAY', label: '1 day', ms: 24 * 60 * 60 * 1000 },
  { id: 'WEEK', label: '1 week', ms: 7 * 24 * 60 * 60 * 1000 },
  { id: 'MONTH', label: '1 month', ms: 30 * 24 * 60 * 60 * 1000 },
  { id: 'CUSTOM', label: 'Custom' },
];

const buildDefaultAdminRightsDraft = (forPromote: boolean): AdminRightsDraft => ({
  canManageGroup: true,
  canDeleteMessages: forPromote,
  canBanUsers: forPromote,
  canManageInviteLinks: forPromote,
  canPinMessages: true,
  canManageTopics: forPromote,
  isAnonymous: false,
  canManageMembers: false,
  customTitle: forPromote ? 'admin' : '',
});

const mapAdminRightsToDraft = (rights: ChatAdminRights | null, forPromote: boolean): AdminRightsDraft => {
  if (!rights) {
    return buildDefaultAdminRightsDraft(forPromote);
  }
  return {
    canManageGroup: !!rights.canManageGroup,
    canDeleteMessages: !!rights.canDeleteMessages,
    canBanUsers: !!rights.canBanUsers,
    canManageInviteLinks: !!rights.canManageInviteLinks,
    canPinMessages: !!rights.canPinMessages,
    canManageTopics: !!rights.canManageTopics,
    isAnonymous: !!rights.isAnonymous,
    canManageMembers: !!rights.canManageMembers,
    customTitle: rights.customTitle?.trim() || '',
  };
};

const areAdminRightsEqual = (left: AdminRightsDraft | null, right: AdminRightsDraft | null) => {
  if (!left || !right) return false;
  return (
    left.canManageGroup === right.canManageGroup &&
    left.canDeleteMessages === right.canDeleteMessages &&
    left.canBanUsers === right.canBanUsers &&
    left.canManageInviteLinks === right.canManageInviteLinks &&
    left.canPinMessages === right.canPinMessages &&
    left.canManageTopics === right.canManageTopics &&
    left.isAnonymous === right.isAnonymous &&
    left.canManageMembers === right.canManageMembers &&
    left.customTitle.trim() === right.customTitle.trim()
  );
};

const countEnabledMediaPermissions = (media: RestrictionMediaDraft) =>
  RESTRICTION_MEDIA_ITEMS.reduce((total, item) => total + (media[item.key] ? 1 : 0), 0);

const parseRestrictionDuration = (mutedUntil?: string | null): {
  durationId: RestrictionDurationId;
  customUntilIso: string | null;
} => {
  if (!mutedUntil) {
    return { durationId: 'FOREVER', customUntilIso: null };
  }

  const parsed = Date.parse(mutedUntil);
  if (!Number.isFinite(parsed)) {
    return { durationId: 'FOREVER', customUntilIso: null };
  }

  const diff = Math.max(0, parsed - Date.now());
  const oneHour = 60 * 60 * 1000;

  for (const option of DURATION_OPTIONS) {
    if (!option.ms) continue;
    if (Math.abs(diff - option.ms) <= oneHour) {
      return { durationId: option.id, customUntilIso: null };
    }
  }

  return { durationId: 'CUSTOM', customUntilIso: new Date(parsed).toISOString() };
};

const mapRestrictionsToDraft = (restrictions: ChatMemberRestrictions | null): RestrictionDraft => {
  const mediaEnabled = restrictions?.canSendMedia ?? true;
  const media: RestrictionMediaDraft = {
    sendPhotos: restrictions?.canSendPhotos ?? mediaEnabled,
    sendVideos: restrictions?.canSendVideos ?? mediaEnabled,
    sendStickersAndGifs: restrictions?.canSendStickersAndGifs ?? mediaEnabled,
    sendMusic: restrictions?.canSendMusic ?? mediaEnabled,
    sendVideoMessages: restrictions?.canSendVideoMessages ?? mediaEnabled,
    embedLinks: restrictions?.canEmbedLinks ?? mediaEnabled,
    sendPolls: restrictions?.canSendPolls ?? true,
  };
  const count = countEnabledMediaPermissions(media);
  const duration = parseRestrictionDuration(restrictions?.mutedUntil);

  return {
    canSendMessages: restrictions?.canSendMessages ?? true,
    canSendMedia: restrictions?.canSendMedia ?? count > 0,
    canAddUsers: restrictions?.canInviteUsers ?? true,
    canPinMessages: restrictions?.canPinMessages ?? true,
    canChangeChatInfo: restrictions?.canChangeInfo ?? true,
    media,
    durationId: duration.durationId,
    customUntilIso: duration.customUntilIso,
  };
};

const areRestrictionDraftsEqual = (left: RestrictionDraft | null, right: RestrictionDraft | null) => {
  if (!left || !right) return false;
  return (
    left.canSendMessages === right.canSendMessages &&
    left.canSendMedia === right.canSendMedia &&
    left.canAddUsers === right.canAddUsers &&
    left.canPinMessages === right.canPinMessages &&
    left.canChangeChatInfo === right.canChangeChatInfo &&
    left.media.sendPhotos === right.media.sendPhotos &&
    left.media.sendVideos === right.media.sendVideos &&
    left.media.sendStickersAndGifs === right.media.sendStickersAndGifs &&
    left.media.sendMusic === right.media.sendMusic &&
    left.media.sendVideoMessages === right.media.sendVideoMessages &&
    left.media.embedLinks === right.media.embedLinks &&
    left.media.sendPolls === right.media.sendPolls &&
    left.durationId === right.durationId &&
    (left.customUntilIso || '') === (right.customUntilIso || '')
  );
};

const buildDurationUntilIso = (durationId: RestrictionDurationId, customUntilIso: string | null) => {
  const now = Date.now();
  if (durationId === 'CUSTOM') {
    if (!customUntilIso) return null;
    const parsed = Date.parse(customUntilIso);
    if (!Number.isFinite(parsed) || parsed <= now) return null;
    return new Date(parsed).toISOString();
  }
  const selected = DURATION_OPTIONS.find((item) => item.id === durationId);
  if (!selected?.ms) {
    return null;
  }
  return new Date(now + selected.ms).toISOString();
};

function BackArrowIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="m14.5 5.5-7 6.5 7 6.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="m5.5 12.5 4.1 4 8.9-9.5" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronDownIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronUpIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="m6 15 6-6 6 6" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ContextMessageIcon({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M5.8 18.2 4 20V7.2A2.2 2.2 0 0 1 6.2 5h11.6A2.2 2.2 0 0 1 20 7.2v7.6a2.2 2.2 0 0 1-2.2 2.2H5.8Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ContextShieldIcon({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3.5 18.7 6v5.9c0 4.2-2.7 6.9-6.7 8.6-4-1.7-6.7-4.4-6.7-8.6V6L12 3.5Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9.2 12h5.6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function ContextPromoteIcon({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3.5 18.7 6v5.9c0 4.2-2.7 6.9-6.7 8.6-4-1.7-6.7-4.4-6.7-8.6V6L12 3.5Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 8v6M9 11h6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function ContextOwnerIcon({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="m4.8 18.7 1.1-8.4 4.2 3.4L12 7.1l1.9 6.6 4.2-3.4 1.1 8.4H4.8Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8.4 18.7h7.2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function ContextTrashIcon({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4.5 7h15" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M9 7V5.8A1.8 1.8 0 0 1 10.8 4h2.4A1.8 1.8 0 0 1 15 5.8V7" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M7 7.4v9.8A2 2 0 0 0 9 19.2h6a2 2 0 0 0 2-2V7.4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function DismissAdminIcon({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M16 15.5a3.5 3.5 0 1 0-3.5-3.5"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path
        d="M5 20v-.7c0-2.1 2.4-3.8 5.5-3.8h1.4"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path d="m17.5 18.5 3-3M17.5 15.5l3 3" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function GroupEditLockIcon({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="6.5" y="10.5" width="11" height="9" rx="2.2" stroke="currentColor" strokeWidth="1.9" />
      <path d="M9 10.5V8.7a3 3 0 0 1 6 0v1.8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function GroupEditHeartIcon({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 19.3S4.8 14.8 4.8 9.7A3.8 3.8 0 0 1 12 8.3a3.8 3.8 0 0 1 7.2 1.4c0 5.1-7.2 9.6-7.2 9.6Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GroupEditPermissionsIcon({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="5.2" y="6.2" width="9.2" height="9.2" rx="1.8" stroke="currentColor" strokeWidth="1.9" />
      <rect x="9.6" y="10.6" width="9.2" height="9.2" rx="1.8" stroke="currentColor" strokeWidth="1.9" />
    </svg>
  );
}

function GroupEditRecentIcon({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="6.2" y="4.5" width="11.6" height="15" rx="2" stroke="currentColor" strokeWidth="1.9" />
      <path d="M9.2 8.8h5.6M9.2 12h5.6M9.2 15.2h5.6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function GroupEditTopicsIcon({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M7 7.6h10M7 12h10M7 16.4h10" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <circle cx="4.7" cy="7.6" r="0.9" fill="currentColor" />
      <circle cx="4.7" cy="12" r="0.9" fill="currentColor" />
      <circle cx="4.7" cy="16.4" r="0.9" fill="currentColor" />
    </svg>
  );
}

function GroupEditHistoryIcon({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="5.8" y="5.8" width="12.4" height="12.4" rx="3" stroke="currentColor" strokeWidth="1.9" />
    </svg>
  );
}

function TelegramSwitch({
  checked,
  onChange,
  disabled = false,
  dangerWhenOff = true,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  dangerWhenOff?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        if (disabled) return;
        onChange(!checked);
      }}
      disabled={disabled}
      className={`relative inline-flex h-[20px] w-[40px] items-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
        checked
          ? 'border-[#8e75f8] bg-[#8e75f8]'
          : dangerWhenOff
            ? 'border-[#ff5b67] bg-[#ff5b67]'
            : 'border-white/18 bg-white/14'
      }`}
      aria-pressed={checked}
    >
      <span
        className={`absolute h-[16px] w-[16px] rounded-full border border-[#1d1e26] bg-[#1a1b22] transition-transform ${
          checked ? 'translate-x-[22px]' : 'translate-x-[2px]'
        }`}
      />
    </button>
  );
}

function TelegramCheckbox({
  checked,
  onToggle,
}: {
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`grid h-[20px] w-[20px] place-items-center rounded-[6px] border transition-colors ${
        checked ? 'border-[#8e75f8] bg-[#8e75f8]' : 'border-white/18 bg-transparent'
      }`}
      aria-pressed={checked}
    >
      {checked ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="m6.5 12.5 3.6 3.5 7.4-8" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : null}
    </button>
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

function GroupMediaGridThumb({
  item,
  onClick,
}: {
  item: ChatGroupMediaItem;
  onClick: () => void;
}) {
  const fullPreviewUrl =
    item.thumbnailUrl ||
    (item.isImage ? item.attachmentUrl || `/media/${item.attachmentPath}` : undefined);
  const placeholderUrl =
    item.strippedThumbnailUrl ||
    item.thumbnailUrl ||
    (item.isImage ? item.attachmentUrl || `/media/${item.attachmentPath}` : undefined);
  const [isFullVisible, setIsFullVisible] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    setIsFullVisible(false);
    setLoadFailed(false);
  }, [fullPreviewUrl]);

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative block aspect-square overflow-hidden bg-[#272832] transition-opacity hover:opacity-95"
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 transition-opacity duration-300 ${
          isFullVisible ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {placeholderUrl ? (
          <span
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${placeholderUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(12px)',
              transform: 'scale(1.06)',
            }}
          />
        ) : (
          <span className="absolute inset-0 bg-[#1f2129]" />
        )}
      </span>

      {fullPreviewUrl && !loadFailed ? (
        <img
          src={fullPreviewUrl}
          alt={item.fileName || item.attachmentPath}
          className={`h-full w-full object-cover transition-opacity duration-300 ${
            isFullVisible ? 'opacity-100' : 'opacity-0'
          }`}
          loading="lazy"
          decoding="async"
          onLoad={() => setIsFullVisible(true)}
          onError={() => {
            setLoadFailed(true);
            setIsFullVisible(true);
          }}
        />
      ) : null}

      {loadFailed || (!fullPreviewUrl && !placeholderUrl) ? (
        <div className="grid h-full w-full place-items-center text-[11px] font-[700] text-white/60">
          FILE
        </div>
      ) : null}
    </button>
  );
}

export function GroupInfoPanel({
  chat,
  isOpen = false,
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
  onOpenPrivateChat,
  onLoadMemberRestrictions,
  onSaveMemberRestrictions,
  onLoadMemberAdminRights,
  onSaveMemberAdminRights,
  onCreatePoll,
  onClose,
}: GroupInfoPanelProps) {
  const inviteLink = `t.me/+group${chat.chatId.toString(36)}`;
  const hasCover = !!chat.avatarUrl;
  const panelRef = useRef<HTMLElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [isGroupEditOpen, setIsGroupEditOpen] = useState(false);
  const [showUnsavedGroupEditDialog, setShowUnsavedGroupEditDialog] = useState(false);
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
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const durationMenuRef = useRef<HTMLDivElement | null>(null);
  const groupEditAvatarInputRef = useRef<HTMLInputElement | null>(null);
  const [memberContextMenu, setMemberContextMenu] = useState<{
    userId: string;
    x: number;
    y: number;
    actions: MemberContextMenuAction[];
  } | null>(null);
  const [memberEditor, setMemberEditor] = useState<MemberEditorState | null>(null);
  const [isLoadingMemberEditor, setIsLoadingMemberEditor] = useState(false);
  const [isSavingMemberEditor, setIsSavingMemberEditor] = useState(false);
  const [adminRightsDraft, setAdminRightsDraft] = useState<AdminRightsDraft | null>(null);
  const [initialAdminRightsDraft, setInitialAdminRightsDraft] = useState<AdminRightsDraft | null>(null);
  const [restrictionDraft, setRestrictionDraft] = useState<RestrictionDraft | null>(null);
  const [initialRestrictionDraft, setInitialRestrictionDraft] = useState<RestrictionDraft | null>(null);
  const [isMediaSectionExpanded, setIsMediaSectionExpanded] = useState(false);
  const [isDurationMenuOpen, setIsDurationMenuOpen] = useState(false);
  const [showUnsavedMemberDialog, setShowUnsavedMemberDialog] = useState(false);
  const [groupMediaViewerIndex, setGroupMediaViewerIndex] = useState<number | null>(null);

  useEffect(() => {
    setEditTitle(chat.name);
    setEditAvatarPath(chat.avatarUrl || '');
    setIsGroupEditOpen(false);
    setShowUnsavedGroupEditDialog(false);
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
    setMemberContextMenu(null);
    setMemberEditor(null);
    setIsLoadingMemberEditor(false);
    setIsSavingMemberEditor(false);
    setAdminRightsDraft(null);
    setInitialAdminRightsDraft(null);
    setRestrictionDraft(null);
    setInitialRestrictionDraft(null);
    setIsMediaSectionExpanded(false);
    setIsDurationMenuOpen(false);
    setShowUnsavedMemberDialog(false);
    setGroupMediaViewerIndex(null);
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
    if (!onUpdateGroup || isSavingGroup) return true;
    setIsSavingGroup(true);
    try {
      await onUpdateGroup({
        title: editTitle,
        avatarPath: editAvatarPath,
      });
      return true;
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update group');
      return false;
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

  const selectedMenuMember = useMemo(
    () => members.find((member) => member.userId === memberContextMenu?.userId) || null,
    [memberContextMenu?.userId, members]
  );

  const buildMemberContextActions = useCallback(
    (member: GroupInfoMember): MemberContextMenuAction[] => {
      const actions: MemberContextMenuAction[] = [];

      if (!member.isCurrentUser && onOpenPrivateChat) {
        actions.push('send-message');
      }

      if (member.role === 'MEMBER' && onPromoteMember && onSaveMemberAdminRights) {
        actions.push('promote-admin');
      }

      if (
        (member.role === 'ADMIN' || member.role === 'OWNER') &&
        onSaveMemberAdminRights
      ) {
        actions.push('edit-admin-rights');
      }

      if (member.canTransferOwnership && onTransferOwnership) {
        actions.push('make-owner');
      }

      if (member.role === 'MEMBER' && onSaveMemberRestrictions) {
        actions.push('restrict-user');
      }

      if (member.canRemove && onRemoveMember) {
        actions.push('remove-member');
      }

      return actions;
    },
    [
      onOpenPrivateChat,
      onTransferOwnership,
      onPromoteMember,
      onRemoveMember,
      onSaveMemberAdminRights,
      onSaveMemberRestrictions,
    ]
  );

  const openAdminRightsEditor = useCallback(
    async (member: GroupInfoMember, mode: 'admin-rights' | 'promote-admin') => {
      setMemberContextMenu(null);
      setMemberEditor({ mode, member });
      setShowUnsavedMemberDialog(false);
      setIsDurationMenuOpen(false);
      setIsMediaSectionExpanded(false);
      setRestrictionDraft(null);
      setInitialRestrictionDraft(null);
      setIsLoadingMemberEditor(true);

      try {
        const fallbackAsPromoted = mode === 'promote-admin' || member.role === 'OWNER';
        const shouldLoad = mode === 'admin-rights' && !!onLoadMemberAdminRights;
        const rights = shouldLoad ? await onLoadMemberAdminRights(member.userId) : null;
        const nextDraft = mapAdminRightsToDraft(rights, fallbackAsPromoted);
        setAdminRightsDraft(nextDraft);
        setInitialAdminRightsDraft(nextDraft);
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Failed to load admin rights');
        const fallback = mapAdminRightsToDraft(
          null,
          mode === 'promote-admin' || member.role === 'OWNER'
        );
        setAdminRightsDraft(fallback);
        setInitialAdminRightsDraft(fallback);
      } finally {
        setIsLoadingMemberEditor(false);
      }
    },
    [onLoadMemberAdminRights]
  );

  const openRestrictionEditor = useCallback(
    async (member: GroupInfoMember) => {
      setMemberContextMenu(null);
      setMemberEditor({ mode: 'restrict-user', member });
      setShowUnsavedMemberDialog(false);
      setIsDurationMenuOpen(false);
      setIsMediaSectionExpanded(false);
      setAdminRightsDraft(null);
      setInitialAdminRightsDraft(null);
      setIsLoadingMemberEditor(true);

      try {
        const restrictions = onLoadMemberRestrictions
          ? await onLoadMemberRestrictions(member.userId)
          : null;
        const nextDraft = mapRestrictionsToDraft(restrictions);
        setRestrictionDraft(nextDraft);
        setInitialRestrictionDraft(nextDraft);
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Failed to load user permissions');
        const fallback = mapRestrictionsToDraft(null);
        setRestrictionDraft(fallback);
        setInitialRestrictionDraft(fallback);
      } finally {
        setIsLoadingMemberEditor(false);
      }
    },
    [onLoadMemberRestrictions]
  );

  const handleMemberContextAction = useCallback(
    async (action: MemberContextMenuAction, member: GroupInfoMember) => {
      setMemberContextMenu(null);

      if (action === 'send-message') {
        if (!onOpenPrivateChat) return;
        try {
          await onOpenPrivateChat(member.userId);
        } catch (error) {
          alert(error instanceof Error ? error.message : 'Failed to open private chat');
        }
        return;
      }

      if (action === 'promote-admin') {
        await openAdminRightsEditor(member, 'promote-admin');
        return;
      }

      if (action === 'edit-admin-rights') {
        await openAdminRightsEditor(member, 'admin-rights');
        return;
      }

      if (action === 'make-owner') {
        if (!confirm(`Transfer ownership to ${member.name}?`)) return;
        await runMemberAction(member.userId, onTransferOwnership, 'Failed to transfer ownership');
        return;
      }

      if (action === 'restrict-user') {
        await openRestrictionEditor(member);
        return;
      }

      if (action === 'remove-member') {
        await runMemberAction(member.userId, onRemoveMember, 'Failed to remove member');
      }
    },
    [
      onOpenPrivateChat,
      onTransferOwnership,
      onRemoveMember,
      openAdminRightsEditor,
      openRestrictionEditor,
      runMemberAction,
    ]
  );

  const isAdminRightsEditorMode =
    memberEditor?.mode === 'admin-rights' || memberEditor?.mode === 'promote-admin';
  const isRestrictionEditorMode = memberEditor?.mode === 'restrict-user';

  const isAdminRightsDirty =
    isAdminRightsEditorMode && !areAdminRightsEqual(adminRightsDraft, initialAdminRightsDraft);
  const isRestrictionDirty =
    isRestrictionEditorMode && !areRestrictionDraftsEqual(restrictionDraft, initialRestrictionDraft);
  const hasMemberEditorUnsavedChanges = isAdminRightsDirty || isRestrictionDirty;

  const saveAdminRightsEditor = useCallback(
    async (closeAfterSave = false) => {
      if (!memberEditor || !isAdminRightsEditorMode || !adminRightsDraft) {
        return true;
      }
      if (!onSaveMemberAdminRights || isSavingMemberEditor) {
        return false;
      }

      setIsSavingMemberEditor(true);
      try {
        if (memberEditor.mode === 'promote-admin' && onPromoteMember) {
          await onPromoteMember(memberEditor.member.userId);
        }

        const normalizedTitle = adminRightsDraft.customTitle.trim();
        await onSaveMemberAdminRights(memberEditor.member.userId, {
          canManageGroup: adminRightsDraft.canManageGroup,
          canDeleteMessages: adminRightsDraft.canDeleteMessages,
          canBanUsers: adminRightsDraft.canBanUsers,
          canManageInviteLinks: adminRightsDraft.canManageInviteLinks,
          canPinMessages: adminRightsDraft.canPinMessages,
          canManageTopics: adminRightsDraft.canManageTopics,
          canManageMembers: adminRightsDraft.canManageMembers,
          isAnonymous: adminRightsDraft.isAnonymous,
          canManageReactions: adminRightsDraft.canManageGroup,
          canManagePolls: adminRightsDraft.canManageGroup,
          customTitle: normalizedTitle || null,
        });

        const finalizedDraft: AdminRightsDraft = {
          ...adminRightsDraft,
          customTitle: normalizedTitle,
        };
        setAdminRightsDraft(finalizedDraft);
        setInitialAdminRightsDraft(finalizedDraft);

        if (closeAfterSave) {
          setMemberEditor(null);
          setShowUnsavedMemberDialog(false);
        }
        return true;
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Failed to save admin rights');
        return false;
      } finally {
        setIsSavingMemberEditor(false);
      }
    },
    [
      adminRightsDraft,
      isAdminRightsEditorMode,
      isSavingMemberEditor,
      memberEditor,
      onPromoteMember,
      onSaveMemberAdminRights,
    ]
  );

  const saveRestrictionEditor = useCallback(
    async (closeAfterSave = false) => {
      if (!memberEditor || !isRestrictionEditorMode || !restrictionDraft) {
        return true;
      }
      if (!onSaveMemberRestrictions || isSavingMemberEditor) {
        return false;
      }

      setIsSavingMemberEditor(true);
      try {
        const hasMediaPermission = countEnabledMediaPermissions(restrictionDraft.media) > 0;
        const mutedUntil = buildDurationUntilIso(
          restrictionDraft.durationId,
          restrictionDraft.customUntilIso
        );
        await onSaveMemberRestrictions(memberEditor.member.userId, {
          canSendMessages: restrictionDraft.canSendMessages,
          canSendMedia: hasMediaPermission && restrictionDraft.canSendMedia,
          canSendPhotos: restrictionDraft.media.sendPhotos,
          canSendVideos: restrictionDraft.media.sendVideos,
          canSendStickersAndGifs: restrictionDraft.media.sendStickersAndGifs,
          canSendMusic: restrictionDraft.media.sendMusic,
          canSendVideoMessages: restrictionDraft.media.sendVideoMessages,
          canEmbedLinks: restrictionDraft.media.embedLinks,
          canSendPolls: restrictionDraft.media.sendPolls,
          canInviteUsers: restrictionDraft.canAddUsers,
          canPinMessages: restrictionDraft.canPinMessages,
          canChangeInfo: restrictionDraft.canChangeChatInfo,
          mutedUntil: mutedUntil ?? undefined,
          clearMutedUntil: mutedUntil ? undefined : true,
        });

        const finalizedDraft: RestrictionDraft = {
          ...restrictionDraft,
          canSendMedia: hasMediaPermission && restrictionDraft.canSendMedia,
        };
        setRestrictionDraft(finalizedDraft);
        setInitialRestrictionDraft(finalizedDraft);

        if (closeAfterSave) {
          setMemberEditor(null);
          setShowUnsavedMemberDialog(false);
          setIsDurationMenuOpen(false);
        }
        return true;
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Failed to save user permissions');
        return false;
      } finally {
        setIsSavingMemberEditor(false);
      }
    },
    [isRestrictionEditorMode, isSavingMemberEditor, memberEditor, onSaveMemberRestrictions, restrictionDraft]
  );

  const saveCurrentMemberEditor = useCallback(
    async (closeAfterSave = false) => {
      if (isAdminRightsEditorMode) {
        return saveAdminRightsEditor(closeAfterSave);
      }
      if (isRestrictionEditorMode) {
        return saveRestrictionEditor(closeAfterSave);
      }
      return true;
    },
    [isAdminRightsEditorMode, isRestrictionEditorMode, saveAdminRightsEditor, saveRestrictionEditor]
  );

  const closeMemberEditor = useCallback(() => {
    if (isSavingMemberEditor) return;
    if (hasMemberEditorUnsavedChanges) {
      setShowUnsavedMemberDialog(true);
      return;
    }
    setMemberEditor(null);
    setShowUnsavedMemberDialog(false);
    setIsDurationMenuOpen(false);
  }, [hasMemberEditorUnsavedChanges, isSavingMemberEditor]);

  const memberContextMenuStyle = useMemo(() => {
    if (!memberContextMenu || !panelRef.current) {
      return null;
    }
    const panelRect = panelRef.current.getBoundingClientRect();
    const width = Math.min(256, Math.max(180, panelRect.width - 58));
    const rowHeight = 40;
    const totalHeight = 14 + memberContextMenu.actions.length * rowHeight;
    const margin = 12;
    const xInPanel = memberContextMenu.x - panelRect.left;
    const yInPanel = memberContextMenu.y - panelRect.top;
    const left = Math.max(margin, Math.min(xInPanel, panelRect.width - width - margin));
    const top = Math.max(margin, Math.min(yInPanel, panelRect.height - totalHeight - margin));
    return { left, top, width };
  }, [memberContextMenu]);

  useEffect(() => {
    if (activeTab !== 'members') {
      setMemberContextMenu(null);
      setMemberEditor(null);
      setShowUnsavedMemberDialog(false);
      setIsDurationMenuOpen(false);
    }
  }, [activeTab]);

  useEffect(() => {
    if (!isOpen) {
      setIsGroupEditOpen(false);
      setShowUnsavedGroupEditDialog(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (memberContextMenu && contextMenuRef.current && !contextMenuRef.current.contains(target)) {
        setMemberContextMenu(null);
      }
      if (isDurationMenuOpen && durationMenuRef.current && !durationMenuRef.current.contains(target)) {
        setIsDurationMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (event.defaultPrevented) return;
      if (!isOpen) return;
      const hasUnsavedGroupEditChanges =
        editTitle.trim() !== chat.name.trim() ||
        editAvatarPath.trim() !== (chat.avatarUrl || '').trim() ||
        settingsDraft.description !== (groupSettings?.description || '') ||
        settingsDraft.isPublic !== !!groupSettings?.isPublic ||
        settingsDraft.topicsEnabled !== (groupSettings?.topicsEnabled ?? false) ||
        settingsDraft.historyVisibleToNewMembers !==
          (groupSettings?.historyVisibleToNewMembers ?? true) ||
        settingsDraft.reactionMode !==
          (groupSettings?.reactionMode ?? (groupSettings?.reactionsEnabled ? 'ALL' : 'NONE'));
      if (showUnsavedGroupEditDialog) {
        event.preventDefault();
        setShowUnsavedGroupEditDialog(false);
        return;
      }
      if (isGroupEditOpen) {
        event.preventDefault();
        if (isSavingGroup || isSavingSettings) return;
        if (hasUnsavedGroupEditChanges) {
          setShowUnsavedGroupEditDialog(true);
          return;
        }
        setIsGroupEditOpen(false);
        setShowUnsavedGroupEditDialog(false);
        return;
      }
      if (showUnsavedMemberDialog) {
        event.preventDefault();
        setShowUnsavedMemberDialog(false);
        return;
      }
      if (isDurationMenuOpen) {
        event.preventDefault();
        setIsDurationMenuOpen(false);
        return;
      }
      if (memberEditor) {
        event.preventDefault();
        closeMemberEditor();
        return;
      }
      if (memberContextMenu) {
        event.preventDefault();
        setMemberContextMenu(null);
        return;
      }
      event.preventDefault();
      onClose();
    };

    const handleWindowResize = () => {
      setMemberContextMenu(null);
      setIsDurationMenuOpen(false);
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);
    window.addEventListener('resize', handleWindowResize);
    window.addEventListener('scroll', handleWindowResize, true);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
      window.removeEventListener('resize', handleWindowResize);
      window.removeEventListener('scroll', handleWindowResize, true);
    };
  }, [
    closeMemberEditor,
    editAvatarPath,
    editTitle,
    chat.avatarUrl,
    chat.name,
    groupSettings?.description,
    groupSettings?.historyVisibleToNewMembers,
    groupSettings?.isPublic,
    groupSettings?.reactionMode,
    groupSettings?.reactionsEnabled,
    groupSettings?.topicsEnabled,
    isGroupEditOpen,
    isSavingGroup,
    isSavingSettings,
    isDurationMenuOpen,
    memberContextMenu,
    memberEditor,
    isOpen,
    onClose,
    settingsDraft.description,
    settingsDraft.historyVisibleToNewMembers,
    settingsDraft.isPublic,
    settingsDraft.reactionMode,
    settingsDraft.topicsEnabled,
    showUnsavedGroupEditDialog,
    showUnsavedMemberDialog,
  ]);

  const saveSettings = useCallback(async () => {
    if (!onUpdateGroupSettings || isSavingSettings) return true;
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
      return true;
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update group settings');
      return false;
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
      if (memberContextMenu) {
        setMemberContextMenu(null);
      }
      if (isDurationMenuOpen) {
        setIsDurationMenuOpen(false);
      }
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
    },
    [
      activeTab,
      linksHasMore,
      linksLoading,
      memberContextMenu,
      mediaHasMore,
      mediaLoading,
      onLinksLoadMore,
      onMediaLoadMore,
      isDurationMenuOpen,
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

  const memberEditorTitle =
    memberEditor?.mode === 'restrict-user' ? 'User Permissions' : memberEditor ? 'Admin Rights' : '';

  const enabledMediaCount = restrictionDraft
    ? countEnabledMediaPermissions(restrictionDraft.media)
    : 0;

  const selectedDurationLabel = useMemo(() => {
    if (!restrictionDraft) return 'Forever';
    const selected = DURATION_OPTIONS.find((item) => item.id === restrictionDraft.durationId);
    if (!selected) return 'Forever';
    if (restrictionDraft.durationId !== 'CUSTOM') {
      return selected.label;
    }
    if (!restrictionDraft.customUntilIso) {
      return 'Custom';
    }
    const parsed = Date.parse(restrictionDraft.customUntilIso);
    if (!Number.isFinite(parsed)) {
      return 'Custom';
    }
    return new Date(parsed).toLocaleDateString();
  }, [restrictionDraft]);

  const dismissAdminFromEditor = useCallback(async () => {
    if (!memberEditor || !onDemoteMember || memberEditor.member.role !== 'ADMIN') {
      return;
    }
    if (isSavingMemberEditor) return;
    setIsSavingMemberEditor(true);
    try {
      await onDemoteMember(memberEditor.member.userId);
      setMemberEditor(null);
      setShowUnsavedMemberDialog(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to dismiss admin');
    } finally {
      setIsSavingMemberEditor(false);
    }
  }, [isSavingMemberEditor, memberEditor, onDemoteMember]);

  const banAndRemoveFromEditor = useCallback(async () => {
    if (!memberEditor || !onSaveMemberRestrictions) return;
    if (isSavingMemberEditor) return;

    setIsSavingMemberEditor(true);
    try {
      const untilIso = buildDurationUntilIso(
        restrictionDraft?.durationId ?? 'FOREVER',
        restrictionDraft?.customUntilIso ?? null
      );
      const fallbackForever = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString();
      await onSaveMemberRestrictions(memberEditor.member.userId, {
        bannedUntil: untilIso || fallbackForever,
      });
      if (onRemoveMember) {
        await onRemoveMember(memberEditor.member.userId);
      }
      setMemberEditor(null);
      setShowUnsavedMemberDialog(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to ban and remove member');
    } finally {
      setIsSavingMemberEditor(false);
    }
  }, [isSavingMemberEditor, memberEditor, onRemoveMember, onSaveMemberRestrictions, restrictionDraft]);

  const canSaveMemberEditor = isRestrictionEditorMode
    ? !!onSaveMemberRestrictions
    : isAdminRightsEditorMode
      ? !!onSaveMemberAdminRights
      : false;

  const adminsCount = useMemo(
    () => members.filter((member) => member.role === 'OWNER' || member.role === 'ADMIN').length,
    [members]
  );
  const permissionsEnabledCount = useMemo(
    () => Object.values(permissionsDraft).filter(Boolean).length,
    [permissionsDraft]
  );
  const permissionsTotalCount = useMemo(
    () => Object.keys(permissionsDraft).length,
    [permissionsDraft]
  );
  const visibleMediaItems = useMemo(() => mediaItems, [mediaItems]);
  const mediaViewerItems = useMemo<MediaViewerItem[]>(() => {
    const memberById = new Map(members.map((member) => [member.userId, member]));
    return visibleMediaItems.map((item) => {
      const sender = memberById.get(item.senderId);
      return {
        url: item.attachmentUrl || `/media/${item.attachmentPath}`,
        mediaType: item.isImage ? 'image' : 'video',
        contentType: item.contentType,
        fileName: item.fileName,
        sizeBytes: item.sizeBytes,
        senderName: sender ? (sender.isCurrentUser ? 'You' : sender.name) : 'Unknown',
        createdAt: item.createdAt,
      };
    });
  }, [members, visibleMediaItems]);
  const mediaSections = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const sections: Array<{
      key: string;
      label: string;
      items: Array<{ item: ChatGroupMediaItem; index: number }>;
    }> = [];

    for (const [index, item] of visibleMediaItems.entries()) {
      const timestamp = Date.parse(item.createdAt);
      const date = Number.isFinite(timestamp) ? new Date(timestamp) : null;
      const key = date
        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        : 'unknown';
      const label = date
        ? date.getFullYear() === currentYear
          ? MEDIA_MONTH_FORMATTER.format(date)
          : MEDIA_MONTH_WITH_YEAR_FORMATTER.format(date)
        : 'Unknown';

      const lastSection = sections[sections.length - 1];
      if (!lastSection || lastSection.key !== key) {
        sections.push({ key, label, items: [{ item, index }] });
        continue;
      }
      lastSection.items.push({ item, index });
    }

    return sections;
  }, [visibleMediaItems]);
  useEffect(() => {
    if (groupMediaViewerIndex === null) return;
    if (mediaViewerItems.length === 0) {
      setGroupMediaViewerIndex(null);
      return;
    }
    if (groupMediaViewerIndex >= mediaViewerItems.length) {
      setGroupMediaViewerIndex(mediaViewerItems.length - 1);
    }
  }, [groupMediaViewerIndex, mediaViewerItems]);
  const groupTypeLabel = settingsDraft.isPublic ? 'Public' : 'Private';
  const reactionsLabel =
    settingsDraft.reactionMode === 'ALL'
      ? 'All'
      : settingsDraft.reactionMode === 'SOME'
        ? 'Some'
        : 'None';
  const isGroupEditorSaving = isSavingGroup || isSavingSettings;
  const isGroupEditDirty =
    editTitle.trim() !== chat.name.trim() ||
    editAvatarPath.trim() !== (chat.avatarUrl || '').trim() ||
    settingsDraft.description !== (groupSettings?.description || '') ||
    settingsDraft.isPublic !== !!groupSettings?.isPublic ||
    settingsDraft.topicsEnabled !== (groupSettings?.topicsEnabled ?? false) ||
    settingsDraft.historyVisibleToNewMembers !==
      (groupSettings?.historyVisibleToNewMembers ?? true) ||
    settingsDraft.reactionMode !==
      (groupSettings?.reactionMode ?? (groupSettings?.reactionsEnabled ? 'ALL' : 'NONE'));

  const saveGroupEditPanel = useCallback(async () => {
    if (isGroupEditorSaving) return;
    const [groupSaved, settingsSaved] = await Promise.all([
      submitGroupEdit(),
      saveSettings(),
    ]);
    if (!groupSaved || !settingsSaved) {
      return;
    }
    setIsGroupEditOpen(false);
    setShowUnsavedGroupEditDialog(false);
  }, [isGroupEditorSaving, saveSettings, submitGroupEdit]);

  const closeGroupEditPanel = useCallback(() => {
    if (isGroupEditorSaving) return;
    if (isGroupEditDirty) {
      setShowUnsavedGroupEditDialog(true);
      return;
    }
    setIsGroupEditOpen(false);
    setShowUnsavedGroupEditDialog(false);
  }, [isGroupEditDirty, isGroupEditorSaving]);

  const handleDeleteAndLeaveGroup = useCallback(() => {
    if (onDeleteGroup) {
      void runGroupAction('delete', onDeleteGroup, 'Failed to delete group');
      return;
    }
    if (onLeaveGroup) {
      void runGroupAction('leave', onLeaveGroup, 'Failed to leave group');
    }
  }, [onDeleteGroup, onLeaveGroup, runGroupAction]);

  const handlePickGroupEditAvatar = useCallback(async (file: File | null) => {
    if (!file) return;
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      setEditAvatarPath(dataUrl);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to prepare group avatar');
    } finally {
      if (groupEditAvatarInputRef.current) {
        groupEditAvatarInputRef.current.value = '';
      }
    }
  }, []);

  return (
    <aside
      ref={panelRef}
      className="relative h-full w-full border-l border-white/10 bg-[#14151a] shadow-[-16px_0_38px_rgba(0,0,0,0.4)]"
    >
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
                setMemberContextMenu(null);
                setMemberEditor(null);
                setShowUnsavedMemberDialog(false);
                setIsDurationMenuOpen(false);
                setIsGroupEditOpen(true);
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

        {false ? (
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
                onClick={() => setIsGroupEditOpen(false)}
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
                    (() => {
                      const actions = buildMemberContextActions(member);
                      const roleLabel =
                        member.memberTag?.trim() ||
                        (member.role === 'OWNER' ? 'owner' : member.role === 'ADMIN' ? 'admin' : '');
                      const canOpenMenu = actions.length > 0 && !memberEditor && !isGroupEditOpen;
                      const openContextMenu = (clientX: number, clientY: number) => {
                        if (!canOpenMenu) return;
                        setMemberContextMenu({
                          userId: member.userId,
                          x: clientX,
                          y: clientY,
                          actions,
                        });
                      };
                      return (
                        <div
                          key={member.userId}
                          onContextMenu={(event) => {
                            if (!canOpenMenu) return;
                            event.preventDefault();
                            openContextMenu(event.clientX, event.clientY);
                          }}
                          onMouseDown={(event) => {
                            if (event.button !== 2 || !canOpenMenu) return;
                            event.preventDefault();
                            openContextMenu(event.clientX, event.clientY);
                          }}
                          className="relative flex items-start gap-3 border-b border-white/6 px-4 py-3 transition-colors hover:bg-white/[0.045]"
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
                          </div>
                          {roleLabel ? (
                            <div className="mt-[2px] shrink-0 text-right text-[13px] font-[600] uppercase tracking-[0.2px] text-white/56">
                              {roleLabel}
                            </div>
                          ) : null}
                        </div>
                      );
                    })()
                  ))}
                </div>
              )}

              <div className="hidden space-y-4 border-t border-white/8 px-4 py-4">
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
            visibleMediaItems.length === 0 ? (
              <div className="px-6 py-8 text-[14px] text-white/52">
                {mediaLoading ? 'Loading media...' : 'No media yet.'}
              </div>
            ) : (
              <div className="pb-1">
                {mediaSections.map((section) => (
                  <div key={`media-section-${section.key}`}>
                    <div className="px-4 pb-2 pt-3 text-[12px] font-[700] uppercase tracking-[0.25px] text-white/54">
                      {section.label}
                    </div>
                    <div className="grid grid-cols-3 gap-[1px] bg-black/35">
                      {section.items.map(({ item, index }) => (
                        <GroupMediaGridThumb
                          key={`${item.messageId}-${item.attachmentPath}`}
                          item={item}
                          onClick={() => setGroupMediaViewerIndex(index)}
                        />
                      ))}
                    </div>
                  </div>
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
          ) : (
            <div className="px-6 py-8 text-[14px] text-white/52">No data.</div>
          )}
        </div>
      </div>

      {!isGroupEditOpen && memberContextMenu && selectedMenuMember && memberContextMenuStyle ? (
        <div
          ref={contextMenuRef}
          className="absolute z-[120]"
          style={{
            left: memberContextMenuStyle.left,
            top: memberContextMenuStyle.top,
            width: memberContextMenuStyle.width,
          }}
        >
          <div className="w-full overflow-hidden rounded-[15px] border border-white/8 bg-[#1b1d24]/98 py-1 shadow-[0_16px_36px_rgba(0,0,0,0.56)] backdrop-blur-[8px]">
            {memberContextMenu.actions.map((action) => {
              const label =
                action === 'send-message'
                  ? 'Send Message'
                  : action === 'promote-admin'
                    ? 'Promote to admin'
                    : action === 'edit-admin-rights'
                      ? 'Edit admin rights'
                      : action === 'make-owner'
                        ? 'Make owner'
                      : action === 'restrict-user'
                        ? 'Restrict user'
                        : 'Remove from group';

              return (
                <button
                  key={action}
                  type="button"
                  onClick={() => {
                    void handleMemberContextAction(action, selectedMenuMember);
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-[14px] font-[600] text-white/95 transition-colors hover:bg-white/[0.06]"
                >
                  <div className="text-white/90">
                    {action === 'send-message' ? (
                      <ContextMessageIcon size={21} />
                    ) : action === 'promote-admin' ? (
                      <ContextPromoteIcon size={21} />
                    ) : action === 'edit-admin-rights' ? (
                      <ContextShieldIcon size={21} />
                    ) : action === 'make-owner' ? (
                      <ContextOwnerIcon size={21} />
                    ) : action === 'restrict-user' ? (
                      <ContextShieldIcon size={21} />
                    ) : (
                      <ContextTrashIcon size={21} />
                    )}
                  </div>
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {isGroupEditOpen ? (
        <div className="absolute inset-0 z-[112] bg-[#171920]">
          <div className="tg-scroll h-full overflow-y-auto border-t border-white/12">
            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-white/8 bg-[#171920] px-4 py-4">
              <button
                type="button"
                onClick={closeGroupEditPanel}
                disabled={isGroupEditorSaving}
                className="rounded-full p-1 text-white/72 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Back"
              >
                <BackArrowIcon />
              </button>
              <div className="text-[18px] font-[700] text-white">Edit</div>
              <button
                type="button"
                onClick={() => {
                  void saveGroupEditPanel();
                }}
                disabled={isGroupEditorSaving || (!onUpdateGroup && !onUpdateGroupSettings)}
                className="rounded-full p-1 text-[#8e75f8] transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Save"
              >
                <CheckIcon />
              </button>
            </div>

            <div className="px-4 pb-7 pt-6">
              <input
                ref={groupEditAvatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  void handlePickGroupEditAvatar(event.target.files?.[0] || null);
                }}
              />
              <div className="mx-auto w-fit">
                <button
                  type="button"
                  onClick={() => groupEditAvatarInputRef.current?.click()}
                  className="relative rounded-full"
                  aria-label="Change group avatar"
                >
                  <Avatar
                    size={184}
                    avatarBg={chat.avatarBg}
                    avatarText={chat.avatarText}
                    avatarUrl={editAvatarPath || chat.avatarUrl}
                  />
                  <span className="absolute inset-0 grid place-items-center text-white drop-shadow-[0_6px_18px_rgba(0,0,0,0.7)]">
                    <PenSquareIcon size={44} strokeWidth={2.2} />
                  </span>
                </button>
              </div>

              <label className="mt-6 block rounded-[18px] border border-white/10 bg-[#1a1c23] p-3">
                <div className="mb-1 text-[14px] text-white/45">Group Name</div>
                <input
                  value={editTitle}
                  onChange={(event) => setEditTitle(event.target.value)}
                  maxLength={255}
                  className="h-9 w-full bg-transparent text-[17px] text-white/95 outline-none placeholder:text-white/42"
                />
              </label>

              <label className="mt-4 block rounded-[18px] border border-white/10 bg-[#1a1c23] p-3">
                <div className="mb-1 text-[14px] text-white/45">Description</div>
                <input
                  value={settingsDraft.description}
                  onChange={(event) =>
                    setSettingsDraft((prev) => ({ ...prev, description: event.target.value }))
                  }
                  className="h-9 w-full bg-transparent text-[17px] text-white/95 outline-none placeholder:text-white/42"
                />
              </label>

              <div className="mt-3 border-y border-white/7 bg-black/24 px-3 py-3 text-[14px] text-white/58">
                You can provide an optional description for your group.
              </div>

              <div className="mt-3 overflow-hidden rounded-[14px] border border-white/8 bg-[#1b1d24]">
                <button
                  type="button"
                  onClick={() =>
                    setSettingsDraft((prev) => ({ ...prev, isPublic: !prev.isPublic }))
                  }
                  className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-white/[0.045]"
                >
                  <span className="text-white/62"><GroupEditLockIcon size={25} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[17px] text-white/95">Group Type</span>
                    <span className="block text-[14px] text-white/52">{groupTypeLabel}</span>
                  </span>
                </button>

                <div className="flex items-center gap-4 px-4 py-3">
                  <span className="text-white/62"><LinkIcon size={25} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[17px] text-white/95">Invite Links</span>
                    <span className="block text-[14px] text-white/52">{inviteLinks.length}</span>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSettingsDraft((prev) => {
                      const nextMode =
                        prev.reactionMode === 'ALL'
                          ? 'SOME'
                          : prev.reactionMode === 'SOME'
                            ? 'NONE'
                            : 'ALL';
                      return {
                        ...prev,
                        reactionMode: nextMode,
                        reactionsEnabled: nextMode !== 'NONE',
                      };
                    })
                  }
                  className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-white/[0.045]"
                >
                  <span className="text-white/62"><GroupEditHeartIcon size={25} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[17px] text-white/95">Reactions</span>
                    <span className="block text-[14px] text-white/52">{reactionsLabel}</span>
                  </span>
                </button>

                <div className="flex items-center gap-4 px-4 py-3">
                  <span className="text-white/62"><GroupEditPermissionsIcon size={25} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[17px] text-white/95">Permissions</span>
                    <span className="block text-[14px] text-white/52">{`${permissionsEnabledCount}/${permissionsTotalCount}`}</span>
                  </span>
                </div>

                <div className="flex items-center gap-4 px-4 py-3">
                  <span className="text-white/62"><GroupEditRecentIcon size={25} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[17px] text-white/95">Recent Actions</span>
                  </span>
                </div>

                <div className="flex items-center gap-4 px-4 py-3">
                  <span className="text-white/62"><GroupEditTopicsIcon size={25} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[17px] text-white/95">Topics</span>
                  </span>
                  <TelegramSwitch
                    checked={settingsDraft.topicsEnabled}
                    onChange={(next) =>
                      setSettingsDraft((prev) => ({ ...prev, topicsEnabled: next }))
                    }
                    disabled={isGroupEditorSaving}
                    dangerWhenOff={false}
                  />
                </div>
              </div>

              <div className="mt-3 border-y border-white/7 bg-black/24 px-3 py-3 text-[14px] text-white/58">
                The group chat will be divided into topics created by admins or users.
              </div>

              <div className="mt-3 overflow-hidden rounded-[14px] border border-white/8 bg-[#1b1d24]">
                <div className="flex items-center gap-4 px-4 py-3">
                  <span className="text-white/62"><ContextShieldIcon size={25} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[17px] text-white/95">Administrators</span>
                    <span className="block text-[14px] text-white/52">{adminsCount}</span>
                  </span>
                </div>

                <div className="flex items-center gap-4 px-4 py-3">
                  <span className="text-white/62"><UserPlusIcon size={25} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[17px] text-white/95">Members</span>
                    <span className="block text-[14px] text-white/52">{memberCount}</span>
                  </span>
                </div>

                <div className="flex items-center gap-4 px-4 py-3">
                  <span className="text-white/62"><DismissAdminIcon size={25} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[17px] text-white/95">Removed users</span>
                    <span className="block text-[14px] text-white/52">No removed users</span>
                  </span>
                </div>
              </div>

              <div className="mt-3 overflow-hidden rounded-[14px] border border-white/8 bg-[#1b1d24]">
                <div className="flex items-center gap-4 px-4 py-3">
                  <span className="text-white/62"><GroupEditHistoryIcon size={25} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[17px] text-white/95">Chat history for new members</span>
                  </span>
                  <TelegramSwitch
                    checked={settingsDraft.historyVisibleToNewMembers}
                    onChange={(next) =>
                      setSettingsDraft((prev) => ({ ...prev, historyVisibleToNewMembers: next }))
                    }
                    disabled={isGroupEditorSaving}
                    dangerWhenOff={false}
                  />
                </div>
              </div>

              {(onDeleteGroup || onLeaveGroup) ? (
                <button
                  type="button"
                  onClick={handleDeleteAndLeaveGroup}
                  disabled={groupActionPending !== null}
                  className="mt-3 flex w-full items-center gap-4 border-y border-white/8 px-3 py-4 text-left text-[17px] text-[#ff5b67] transition-colors hover:bg-[#ff5b67]/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ContextTrashIcon size={25} />
                  <span>{onDeleteGroup ? 'Delete and Leave Group' : 'Leave Group'}</span>
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {memberEditor ? (
        <div className="absolute inset-0 z-[110] bg-[#171920]">
          <div className="tg-scroll h-full overflow-y-auto border-t border-white/12">
            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-white/8 bg-[#171920] px-4 py-4">
              <button
                type="button"
                onClick={closeMemberEditor}
                disabled={isSavingMemberEditor}
                className="rounded-full p-1 text-white/72 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Back"
              >
                <BackArrowIcon />
              </button>
              <div className="text-[18px] font-[700] text-white">{memberEditorTitle}</div>
              <button
                type="button"
                onClick={() => {
                  void saveCurrentMemberEditor(true);
                }}
                disabled={isSavingMemberEditor || isLoadingMemberEditor || !canSaveMemberEditor}
                className="rounded-full p-1 text-[#8e75f8] transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Save"
              >
                <CheckIcon />
              </button>
            </div>

            <div className="px-4 pb-7 pt-5">
              <div className="flex items-center gap-3">
                <Avatar
                  size={76}
                  avatarBg={memberEditor.member.avatarBg}
                  avatarText={memberEditor.member.avatarText}
                  avatarUrl={memberEditor.member.avatarUrl}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[17px] font-[500] text-white/95">{memberEditor.member.name}</div>
                  <div className="mt-0.5 truncate text-[15px] text-white/52">{memberEditor.member.statusText}</div>
                </div>
              </div>

              {isLoadingMemberEditor ? (
                <div className="px-2 py-10 text-[15px] text-white/52">Loading…</div>
              ) : isAdminRightsEditorMode && adminRightsDraft ? (
                <>
                  <div className="mt-7 text-[14px] font-[600] text-[#8f74f8]">What can this admin do?</div>
                  <div className="mt-5 space-y-5">
                    {(
                      [
                        ['canManageGroup', 'Change Group Info'],
                        ['canDeleteMessages', 'Delete Messages'],
                        ['canBanUsers', 'Ban Users'],
                        ['canManageInviteLinks', 'Invite Users via Link'],
                        ['canPinMessages', 'Pin Messages'],
                        ['canManageTopics', 'Manage Video Chats'],
                        ['isAnonymous', 'Remain Anonymous'],
                        ['canManageMembers', 'Add New Admins'],
                      ] as Array<[AdminToggleKey, string]>
                    ).map(([key, label]) => (
                      <div key={key} className="flex items-center justify-between gap-4">
                        <div className="text-[16px] text-white/94">{label}</div>
                        <TelegramSwitch
                          checked={!!adminRightsDraft[key]}
                          onChange={(next) =>
                            setAdminRightsDraft((prev) => (prev ? { ...prev, [key]: next } : prev))
                          }
                          disabled={isSavingMemberEditor}
                        />
                      </div>
                    ))}
                  </div>

                  {!adminRightsDraft.canManageMembers ? (
                    <div className="mt-5 border-y border-white/7 bg-black/24 px-3 py-3 text-[14px] text-white/58">
                      This admin will not be able to add new admins.
                    </div>
                  ) : null}

                  <div className="mt-7">
                    <div className="mb-3 text-[14px] font-[600] text-[#8f74f8]">Member tag</div>
                    <label className="block rounded-[16px] border border-white/10 bg-[#1a1c23] p-3">
                      <div className="mb-1 text-[14px] text-white/45">Title</div>
                      <input
                        value={adminRightsDraft.customTitle}
                        onChange={(event) =>
                          setAdminRightsDraft((prev) =>
                            prev ? { ...prev, customTitle: event.target.value } : prev
                          )
                        }
                        placeholder="admin"
                        maxLength={24}
                        className="h-9 w-full bg-transparent text-[17px] text-white/95 outline-none placeholder:text-white/42"
                      />
                    </label>
                    <div className="mt-2 text-[14px] text-white/48">
                      A title that members will see instead of 'admin'.
                    </div>
                  </div>

                  {memberEditor.member.role === 'ADMIN' && memberEditor.member.canDemote && onDemoteMember ? (
                    <button
                      type="button"
                      onClick={() => {
                        void dismissAdminFromEditor();
                      }}
                      disabled={isSavingMemberEditor}
                      className="mt-7 flex w-full items-center gap-4 border-y border-white/7 px-3 py-4 text-left text-[17px] text-[#ff5b67] transition-colors hover:bg-[#ff5b67]/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <DismissAdminIcon />
                      <span>Dismiss Admin</span>
                    </button>
                  ) : null}
                </>
              ) : isRestrictionEditorMode && restrictionDraft ? (
                <>
                  <div className="mt-7 text-[14px] font-[600] text-[#8f74f8]">What can this user do?</div>

                  <div className="mt-5 space-y-5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-[16px] text-white/94">Send Messages</div>
                      <TelegramSwitch
                        checked={restrictionDraft.canSendMessages}
                        onChange={(next) =>
                          setRestrictionDraft((prev) => (prev ? { ...prev, canSendMessages: next } : prev))
                        }
                        disabled={isSavingMemberEditor}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-4">
                        <button
                          type="button"
                          onClick={() => setIsMediaSectionExpanded((prev) => !prev)}
                          className="flex items-center gap-1 text-[16px] text-white/94"
                        >
                          <span>{`Send Media ${enabledMediaCount}/9`}</span>
                          {isMediaSectionExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                        </button>
                        <TelegramSwitch
                          checked={restrictionDraft.canSendMedia}
                          onChange={(next) =>
                            setRestrictionDraft((prev) => {
                              if (!prev) return prev;
                              const media: RestrictionMediaDraft = {
                                sendPhotos: next,
                                sendVideos: next,
                                sendStickersAndGifs: next,
                                sendMusic: next,
                                sendVideoMessages: next,
                                embedLinks: next,
                                sendPolls: next,
                              };
                              return {
                                ...prev,
                                canSendMedia: next,
                                media,
                              };
                            })
                          }
                          disabled={isSavingMemberEditor}
                        />
                      </div>

                      {isMediaSectionExpanded ? (
                        <div className="mt-4 space-y-4">
                          {RESTRICTION_MEDIA_ITEMS.map((item) => (
                            <div key={item.key} className="flex items-center gap-4">
                              <TelegramCheckbox
                                checked={restrictionDraft.media[item.key]}
                                onToggle={() =>
                                  setRestrictionDraft((prev) => {
                                    if (!prev) return prev;
                                    const nextMedia = {
                                      ...prev.media,
                                      [item.key]: !prev.media[item.key],
                                    };
                                    const count = countEnabledMediaPermissions(nextMedia);
                                    return {
                                      ...prev,
                                      media: nextMedia,
                                      canSendMedia: count > 0,
                                    };
                                  })
                                }
                              />
                              <div className="text-[16px] text-white/94">{item.label}</div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="text-[16px] text-white/94">Add Users</div>
                      <TelegramSwitch
                        checked={restrictionDraft.canAddUsers}
                        onChange={(next) =>
                          setRestrictionDraft((prev) => (prev ? { ...prev, canAddUsers: next } : prev))
                        }
                        disabled={isSavingMemberEditor}
                      />
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="text-[16px] text-white/94">Pin Messages</div>
                      <TelegramSwitch
                        checked={restrictionDraft.canPinMessages}
                        onChange={(next) =>
                          setRestrictionDraft((prev) => (prev ? { ...prev, canPinMessages: next } : prev))
                        }
                        disabled={isSavingMemberEditor}
                      />
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="text-[16px] text-white/94">Change Chat Info</div>
                      <TelegramSwitch
                        checked={restrictionDraft.canChangeChatInfo}
                        onChange={(next) =>
                          setRestrictionDraft((prev) =>
                            prev ? { ...prev, canChangeChatInfo: next } : prev
                          )
                        }
                        disabled={isSavingMemberEditor}
                      />
                    </div>
                  </div>

                  <div className="mt-6 border-t border-white/8 pt-4">
                    <div className="relative" ref={durationMenuRef}>
                      <button
                        type="button"
                        onClick={() => setIsDurationMenuOpen((prev) => !prev)}
                        className="flex w-full items-center justify-between rounded-[16px] border border-white/10 bg-white/[0.04] px-4 py-3 text-left"
                      >
                        <div>
                          <div className="text-[16px] text-white/94">Duration</div>
                          <div className="mt-0.5 text-[15px] text-white/55">{selectedDurationLabel}</div>
                        </div>
                        <ChevronDownIcon />
                      </button>
                      {isDurationMenuOpen ? (
                        <div className="absolute right-0 top-[calc(100%+8px)] z-30 w-[210px] rounded-[18px] border border-white/8 bg-[#1b1d24] p-2 shadow-[0_14px_34px_rgba(0,0,0,0.45)]">
                          {DURATION_OPTIONS.map((option) => (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => {
                                if (option.id === 'CUSTOM') {
                                  const customDays = prompt('Custom duration in days', '2');
                                  if (customDays === null) return;
                                  const parsedDays = Number.parseFloat(customDays);
                                  if (!Number.isFinite(parsedDays) || parsedDays <= 0) {
                                    alert('Enter a valid number of days');
                                    return;
                                  }
                                  const customUntilIso = new Date(
                                    Date.now() + parsedDays * 24 * 60 * 60 * 1000
                                  ).toISOString();
                                  setRestrictionDraft((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          durationId: 'CUSTOM',
                                          customUntilIso,
                                        }
                                      : prev
                                  );
                                  setIsDurationMenuOpen(false);
                                  return;
                                }

                                setRestrictionDraft((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        durationId: option.id,
                                        customUntilIso: null,
                                      }
                                    : prev
                                );
                                setIsDurationMenuOpen(false);
                              }}
                              className="w-full rounded-[10px] px-3 py-2 text-left text-[16px] font-[600] text-white/95 transition-colors hover:bg-white/8"
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {onSaveMemberRestrictions && onRemoveMember ? (
                    <button
                      type="button"
                      onClick={() => {
                        void banAndRemoveFromEditor();
                      }}
                      disabled={isSavingMemberEditor}
                      className="mt-6 flex w-full items-center gap-4 border-y border-white/8 px-3 py-4 text-left text-[17px] text-[#ff5b67] transition-colors hover:bg-[#ff5b67]/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <DismissAdminIcon />
                      <span>Ban and remove from group</span>
                    </button>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {showUnsavedGroupEditDialog ? (
        <div className="fixed inset-0 z-[131] grid place-items-center bg-black/56 px-4">
          <div className="w-full max-w-[640px] rounded-[24px] bg-[#1f2026] p-6 shadow-[0_18px_56px_rgba(0,0,0,0.6)]">
            <div className="text-[18px] font-[700] text-white/95">Unsaved Changes</div>
            <div className="mt-5 text-[17px] leading-[1.35] text-white/90">
              Are you sure you want to discard all changes?
            </div>
            <div className="mt-7 flex justify-end gap-12">
              <button
                type="button"
                onClick={() => {
                  setShowUnsavedGroupEditDialog(false);
                  setIsGroupEditOpen(false);
                }}
                className="text-[17px] font-[600] text-[#8f74f8] transition-opacity hover:opacity-85"
              >
                DISCARD
              </button>
              <button
                type="button"
                onClick={() => {
                  void saveGroupEditPanel();
                }}
                disabled={isGroupEditorSaving}
                className="text-[17px] font-[600] text-[#8f74f8] transition-opacity hover:opacity-85 disabled:opacity-60"
              >
                SAVE
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showUnsavedMemberDialog ? (
        <div className="fixed inset-0 z-[130] grid place-items-center bg-black/56 px-4">
          <div className="w-full max-w-[640px] rounded-[24px] bg-[#1f2026] p-6 shadow-[0_18px_56px_rgba(0,0,0,0.6)]">
            <div className="text-[18px] font-[700] text-white/95">Unsaved Changes</div>
            <div className="mt-5 text-[17px] leading-[1.35] text-white/90">
              Are you sure you want to discard all changes?
            </div>
            <div className="mt-7 flex justify-end gap-12">
              <button
                type="button"
                onClick={() => {
                  setShowUnsavedMemberDialog(false);
                  setMemberEditor(null);
                  setIsDurationMenuOpen(false);
                }}
                className="text-[17px] font-[600] text-[#8f74f8] transition-opacity hover:opacity-85"
              >
                DISCARD
              </button>
              <button
                type="button"
                onClick={() => {
                  void saveCurrentMemberEditor(true);
                }}
                disabled={isSavingMemberEditor}
                className="text-[17px] font-[600] text-[#8f74f8] transition-opacity hover:opacity-85 disabled:opacity-60"
              >
                SAVE
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {groupMediaViewerIndex !== null && mediaViewerItems.length > 0 ? (
        <MediaViewerModal
          items={mediaViewerItems}
          activeIndex={groupMediaViewerIndex}
          onClose={() => setGroupMediaViewerIndex(null)}
          onChangeIndex={(nextIndex) => setGroupMediaViewerIndex(nextIndex)}
        />
      ) : null}

      {activeTab === 'members' && !memberEditor && !isGroupEditOpen && !canEditGroup && (onLeaveGroup || (isOwner && onDeleteGroup)) ? (
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

      {activeTab === 'members' && !memberEditor && !isGroupEditOpen && canAddMembers && !!onAddMembersClick ? (
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
