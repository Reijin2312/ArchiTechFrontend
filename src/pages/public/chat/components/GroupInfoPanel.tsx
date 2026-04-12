import { useCallback, useEffect, useMemo, useRef, useState, type UIEvent } from 'react';
import { http } from '@/shared/api/http';
import { endpoints } from '@/shared/api/endpoints';
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
  isOwner?: boolean;
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
  onClose,
}: GroupInfoPanelProps) {
  const inviteLink = `t.me/+group${chat.chatId.toString(36)}`;
  const hasCover = !!chat.avatarUrl;
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const handlePanelScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      if (activeTab !== 'links' || linksLoading || !linksHasMore) {
        return;
      }
      const target = event.currentTarget;
      const remaining = target.scrollHeight - target.scrollTop - target.clientHeight;
      if (remaining <= 240) {
        onLinksLoadMore();
      }
    },
    [activeTab, linksHasMore, linksLoading, onLinksLoadMore]
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
            members.length === 0 ? (
              <div className="px-6 py-8 text-[14px] text-white/52">No members info available.</div>
            ) : (
              <div>
                {members.map((member) => (
                  <div
                    key={member.userId}
                    className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-white/[0.045]"
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
                    {member.isOwner ? (
                      <div className="mt-[2px] shrink-0 text-[14px] font-[500] text-white/56">owner</div>
                    ) : null}
                  </div>
                ))}
              </div>
            )
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
          ) : (
            <div className="px-6 py-8 text-[14px] text-white/52">
              {activeTab === 'media' && 'No media yet.'}
              {activeTab === 'files' && 'No files yet.'}
            </div>
          )}
        </div>
      </div>

      {activeTab === 'members' ? (
        <button
          type="button"
          className="absolute bottom-6 right-5 grid h-[66px] w-[66px] place-items-center rounded-full bg-[#7d65e8] text-white shadow-[0_14px_26px_rgba(126,102,235,0.45)] transition-colors hover:bg-[#927cff]"
          aria-label="Add member"
        >
          <UserPlusIcon size={31} />
        </button>
      ) : null}
    </aside>
  );
}
