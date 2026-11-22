import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CheckCheckIcon, CloseIcon, PenSquareIcon, SearchIcon } from '../icons';
import type { SidebarChat } from '../types';
import { Avatar } from './Avatar';
import { useI18n } from '@/shared/i18n/I18nProvider';

export type ChatSidebarContact = {
  userId: string;
  name: string;
  avatarUrl?: string;
  avatarText: string;
  avatarBg: string;
  secondaryText?: string;
  statusText?: string;
};

type ChatSidebarProps = {
  width: number;
  query: string;
  searchPlaceholder?: string;
  searchStatusLabel?: string | null;
  onQueryChange: (value: string) => void;
  chats: SidebarChat[];
  contacts: ChatSidebarContact[];
  onSelectChat: (chatId: number) => void;
  onCreateGroup: (payload: {
    title: string;
    participantIds: string[];
    avatarPath?: string;
  }) => Promise<void>;
  onOpenPrivateChat: (userId: string) => Promise<void>;
  onSearchPrivateUsers: (query: string) => Promise<ChatSidebarContact[]>;
};

type CreationMode = 'none' | 'groupMembers' | 'groupDetails' | 'privateChat';

function BackIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="m15 19-7-7 7-7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowRightIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="m9 5 7 7-7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GroupIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PrivateChatIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function CameraPlusIcon({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M15.5 8h1A3.5 3.5 0 0 1 20 11.5v4A3.5 3.5 0 0 1 16.5 19h-9A3.5 3.5 0 0 1 4 15.5v-4A3.5 3.5 0 0 1 7.5 8h1.2l.7-1.4A2 2 0 0 1 11.2 5h1.6a2 2 0 0 1 1.8 1.1L15.5 8Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="13" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M19.5 5.5v4m-2-2h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SingleCheckIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="m6 12 3.2 3.2L18 6.4" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Checkbox({ checked, compact = false }: { checked: boolean; compact?: boolean }) {
  return (
    <span
      className={`inline-flex items-center justify-center border transition-colors ${
        compact ? 'h-[30px] w-[30px] rounded-[9px]' : 'h-9 w-9 rounded-[11px]'
      } ${
        checked
          ? 'border-[#c5aa84] bg-[#c5aa84] text-white'
          : 'border-white/35 bg-transparent text-transparent'
      }`}
    >
      <svg width={compact ? 14 : 18} height={compact ? 14 : 18} viewBox="0 0 24 24" fill="none">
        <path d="m5 12 4 4 10-10" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function ComposeMenuItem({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[14px] font-[640] text-white/94 transition-colors hover:bg-white/8"
    >
      <span className="text-white/88">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function ChatRow({
  item,
  compact,
  onClick,
}: {
  item: SidebarChat;
  compact: boolean;
  onClick: () => void;
}) {
  if (compact) {
    const showOnlineDot = item.chatType === 'PRIVATE' && !!item.isOnline;
    return (
      <button
        type="button"
        onClick={onClick}
        className={`mx-auto mb-[10px] grid h-[64px] w-[64px] place-items-center rounded-[18px] outline-none transition-colors focus:outline-none focus-visible:outline-none focus-visible:ring-0 ${
          item.selected ? 'bg-[#c5aa84]' : 'hover:bg-white/[0.035]'
        }`}
        title={item.name}
      >
        <Avatar
          size={48}
          avatarBg={item.avatarBg}
          avatarText={item.avatarText}
          avatarUrl={item.avatarUrl}
          online={showOnlineDot}
        />
      </button>
    );
  }

  const deliveryIcon =
    item.deliveryStatus === 'read' ? (
      <CheckCheckIcon size={13} strokeWidth={2.2} className="origin-center scale-[1.9] text-[#d8fff0]" />
    ) : item.deliveryStatus === 'delivered' ? (
      <CheckCheckIcon
        size={13}
        strokeWidth={2.2}
        className={`origin-center scale-[1.9] ${item.selected ? 'text-white/88' : 'text-[#9da0af]'}`}
      />
    ) : item.deliveryStatus === 'sent' || item.deliveryStatus === 'pending' ? (
      <span className={`inline-flex origin-center scale-[1.9] ${item.selected ? 'text-white/82' : 'text-[#8d90a0]'}`}>
        <SingleCheckIcon size={13} />
      </span>
    ) : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`mx-[8px] mb-[2px] flex w-[calc(100%-16px)] items-start gap-[12px] rounded-[16px] px-[12px] py-[11px] text-left outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 ${
        item.selected ? 'bg-[#c5aa84] text-white' : 'text-white hover:bg-white/[0.035]'
      }`}
      style={item.selected ? { boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' } : undefined}
    >
      <Avatar
        size={48}
        avatarBg={item.avatarBg}
        avatarText={item.avatarText}
        avatarUrl={item.avatarUrl}
        online={item.chatType === 'PRIVATE' && !!item.isOnline}
      />

      <div className="min-w-0 flex-1 pt-[1px]">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex flex-1 items-center gap-1.5">
            {item.chatType === 'GROUP' ? (
              <span className={item.selected ? 'text-white/95' : 'text-white/72'}>
                <GroupIcon size={15} />
              </span>
            ) : null}
            <div className="min-w-0 flex-1 truncate text-[18px] font-[600] leading-[1.1] tracking-[0.1px]">
              {item.name}
            </div>
          </div>
          <div
            className={`flex shrink-0 items-center gap-[4px] text-[14px] ${
              item.selected ? 'text-white/90' : 'text-[#8f91a0]'
            }`}
          >
            <span>{item.time}</span>
          </div>
        </div>

        <div
          className={`mt-[6px] flex items-center justify-between gap-[8px] text-[15px] leading-[1.2] ${
            item.selected ? 'text-white/90' : 'text-[#9c9eaa]'
          }`}
        >
          <div className="flex min-w-0 flex-1 items-center gap-[6px]">
            {item.unread ? <span className="h-2 w-2 rounded-full bg-[#e9d7bd]" /> : null}
            <span className="truncate">{item.preview}</span>
          </div>
          <span className="inline-flex h-[14px] min-w-[14px] items-center justify-end leading-none">{item.outgoing ? deliveryIcon : null}</span>
        </div>
      </div>
    </button>
  );
}

function ContactRow({
  contact,
  selected,
  onToggle,
  onClick,
  withCheckbox,
  disabled,
  dense,
}: {
  contact: ChatSidebarContact;
  selected?: boolean;
  onToggle?: () => void;
  onClick?: () => void;
  withCheckbox?: boolean;
  disabled?: boolean;
  dense?: boolean;
}) {
  const subtitle = [contact.secondaryText, contact.statusText].filter(Boolean).join(' • ');

  return (
    <button
      type="button"
      onClick={withCheckbox ? onToggle : onClick}
      disabled={disabled}
      className={`flex w-full items-center text-left transition-colors hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-65 ${
        dense ? 'gap-2.5 rounded-[12px] px-4 py-1.5' : 'gap-3 rounded-[14px] px-4 py-2'
      }`}
    >
      {withCheckbox ? <Checkbox checked={!!selected} compact={!!dense} /> : null}
      <Avatar
        size={dense ? 52 : 58}
        avatarBg={contact.avatarBg}
        avatarText={contact.avatarText}
        avatarUrl={contact.avatarUrl}
      />
      <div className="min-w-0 flex-1">
        <div
          className={`truncate font-[600] text-white/96 ${dense ? 'text-[15px] leading-[1.15]' : 'text-[17px]'}`}
        >
          {contact.name}
        </div>
        {subtitle ? (
          <div className={`truncate text-white/56 ${dense ? 'mt-0.5 text-[13px]' : 'mt-1 text-[15px]'}`}>
            {subtitle}
          </div>
        ) : null}
      </div>
      {disabled ? (
        <span className="text-[12px] text-white/45">...</span>
      ) : null}
    </button>
  );
}

const MAX_AVATAR_DATA_URL_LENGTH = 65500;

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

export function ChatSidebar({
  width,
  query,
  searchPlaceholder = 'Search',
  searchStatusLabel = null,
  onQueryChange,
  chats,
  contacts,
  onSelectChat,
  onCreateGroup,
  onOpenPrivateChat,
  onSearchPrivateUsers,
}: ChatSidebarProps) {
  const { language } = useI18n();
  const copy = language === 'ru'
    ? {
        search: 'Поиск', searchChats: 'Искать чаты', empty: 'Чатов пока нет', newGroup: 'Новая группа',
        newPrivate: 'Новый личный чат', closeCompose: 'Закрыть меню создания', openCompose: 'Создать чат',
        back: 'Назад', addMembers: 'Добавить участников', addPeople: 'Поиск людей…', noContacts: 'Подходящих контактов нет',
        continueGroup: 'Перейти к настройке группы', groupName: 'Название группы', pickAvatar: 'Выбрать аватар группы',
        createGroup: 'Создать группу', searchPeople: 'Поиск людей…', searching: 'Ищем пользователей…', noUsers: 'Пользователи не найдены',
        createFailed: 'Не удалось создать группу', openFailed: 'Не удалось открыть личный чат', avatarFailed: 'Не удалось подготовить аватар группы', searchFailed: 'Не удалось найти пользователей',
      }
    : {
        search: 'Search', searchChats: 'Search chats', empty: 'No chats yet', newGroup: 'New Group',
        newPrivate: 'New Private Chat', closeCompose: 'Close compose menu', openCompose: 'Open compose menu',
        back: 'Back', addMembers: 'Add Members', addPeople: 'Add people…', noContacts: 'No contacts from existing private chats',
        continueGroup: 'Continue to group details', groupName: 'Group Name', pickAvatar: 'Pick group avatar',
        createGroup: 'Create group', searchPeople: 'Search people…', searching: 'Searching users…', noUsers: 'No users found',
        createFailed: 'Failed to create group', openFailed: 'Failed to open private chat', avatarFailed: 'Failed to prepare group avatar', searchFailed: 'Failed to search users',
      };
  const isCompact = width <= 122;
  const isSearchHidden = width <= 270;
  const [isCompactSearchOpen, setIsCompactSearchOpen] = useState(false);
  const compactSearchInputRef = useRef<HTMLInputElement | null>(null);

  const [composeMenuOpen, setComposeMenuOpen] = useState(false);
  const [creationMode, setCreationMode] = useState<CreationMode>('none');
  const [memberQuery, setMemberQuery] = useState('');
  const [privateQuery, setPrivateQuery] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [groupTitle, setGroupTitle] = useState('');
  const [groupAvatarDataUrl, setGroupAvatarDataUrl] = useState<string | undefined>(undefined);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [openingPrivateChatId, setOpeningPrivateChatId] = useState<string | null>(null);
  const [privateSearchResults, setPrivateSearchResults] = useState<ChatSidebarContact[]>([]);
  const [isPrivateSearching, setIsPrivateSearching] = useState(false);
  const [privateSearchError, setPrivateSearchError] = useState<string | null>(null);
  const [displayedSearchStatus, setDisplayedSearchStatus] = useState('');

  const composePanelRef = useRef<HTMLDivElement | null>(null);
  const groupAvatarInputRef = useRef<HTMLInputElement | null>(null);
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
    if (!composeMenuOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target || !composePanelRef.current) return;
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
      if (!normalized) return true;
      return (
        contact.name.toLowerCase().includes(normalized) ||
        (contact.statusText || '').toLowerCase().includes(normalized)
      );
    });
  }, [contacts, memberQuery]);

  const filteredPrivateContacts = useMemo(() => {
    const normalized = privateQuery.trim().toLowerCase();
    return contacts.filter((contact) => {
      if (!normalized) return true;
      return (
        contact.name.toLowerCase().includes(normalized) ||
        (contact.secondaryText || '').toLowerCase().includes(normalized) ||
        (contact.statusText || '').toLowerCase().includes(normalized)
      );
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
          if (privateSearchRequestSeqRef.current !== requestSeq) return;
          setPrivateSearchResults(users);
        } catch (error) {
          if (privateSearchRequestSeqRef.current !== requestSeq) return;
          setPrivateSearchResults([]);
          setPrivateSearchError(
            error instanceof Error ? error.message : copy.searchFailed
          );
        } finally {
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

  const toggleMember = (userId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmitGroup = async () => {
    if (!canSubmitGroup) return;

    setIsCreatingGroup(true);
    try {
      await onCreateGroup({
        title: groupTitle.trim(),
        participantIds: selectedMemberIds,
        avatarPath: groupAvatarDataUrl,
      });
      closeCreationFlow();
    } catch (error) {
      alert(error instanceof Error ? error.message : copy.createFailed);
      setIsCreatingGroup(false);
    }
  };

  const handleOpenPrivateChat = async (userId: string) => {
    if (!userId || openingPrivateChatId) return;
    setOpeningPrivateChatId(userId);
    try {
      await onOpenPrivateChat(userId);
      closeCreationFlow();
    } catch (error) {
      alert(error instanceof Error ? error.message : copy.openFailed);
      setOpeningPrivateChatId(null);
    }
  };

  const handlePickGroupAvatar = async (file: File | null) => {
    if (!file) return;

    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      setGroupAvatarDataUrl(dataUrl);
    } catch (error) {
      alert(error instanceof Error ? error.message : copy.avatarFailed);
    } finally {
      if (groupAvatarInputRef.current) {
        groupAvatarInputRef.current.value = '';
      }
    }
  };

  const renderCreationHeader = (
    title: string,
    onBack: () => void,
    searchValue: string,
    onSearchChange: (value: string) => void,
    placeholder: string
  ) => (
    <>
      <div className="flex h-[78px] items-center gap-3 px-4">
        <button
          type="button"
          onClick={onBack}
          className="grid h-10 w-10 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/10"
          aria-label={copy.back}
        >
          <BackIcon />
        </button>

        <div className="text-[17px] font-[700] text-white/96">{title}</div>
      </div>

      <div className="px-4 pb-2">
        <div className="flex h-[50px] items-center gap-3 rounded-[16px] bg-[#242620] px-4 text-white/65 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]">
          <SearchIcon size={20} strokeWidth={2.35} />
          <input
            type="text"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={placeholder}
            className="w-full bg-transparent text-[17px] text-white/92 placeholder:text-white/42 focus:outline-none"
          />
        </div>
      </div>
    </>
  );

  const renderGroupMembersScreen = () => (
    <div className="flex h-full flex-col bg-[#242620]">
      {renderCreationHeader(copy.addMembers, closeCreationFlow, memberQuery, setMemberQuery, copy.addPeople)}

      <div className="tg-scroll flex-1 overflow-y-auto pb-[86px] pt-1">
        {filteredGroupContacts.length === 0 ? (
          <div className="px-5 py-8 text-sm text-white/55">{copy.noContacts}</div>
        ) : (
          filteredGroupContacts.map((contact) => (
            <ContactRow
              key={contact.userId}
              contact={contact}
              withCheckbox
              dense
              selected={selectedMemberIds.includes(contact.userId)}
              onToggle={() => toggleMember(contact.userId)}
            />
          ))
        )}
      </div>

      <button
        type="button"
        onClick={() => setCreationMode('groupDetails')}
        className="absolute bottom-[22px] right-[16px] grid h-[68px] w-[68px] place-items-center rounded-full bg-[#c5aa84] text-[#211f1b] shadow-[0_14px_30px_rgba(0,0,0,.38)] transition-transform hover:scale-[1.03]"
        aria-label={copy.continueGroup}
      >
        <ArrowRightIcon size={28} />
      </button>
    </div>
  );

  const renderGroupDetailsScreen = () => (
    <div className="flex h-full flex-col bg-[#242620]">
      <div className="flex h-[78px] items-center gap-3 px-4">
        <button
          type="button"
          onClick={() => setCreationMode('groupMembers')}
          className="grid h-10 w-10 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/10"
          aria-label={copy.back}
          disabled={isCreatingGroup}
        >
          <BackIcon />
        </button>
        <div className="text-[17px] font-[700] text-white/96">{copy.newGroup}</div>
      </div>

      <div className="px-4 pt-2">
        <input
          ref={groupAvatarInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            void handlePickGroupAvatar(event.target.files?.[0] || null);
          }}
        />

        <button
          type="button"
          onClick={() => groupAvatarInputRef.current?.click()}
          disabled={isCreatingGroup}
          className="mx-auto grid h-[190px] w-[190px] place-items-center overflow-hidden rounded-full bg-linear-to-br from-[#d1b68d] to-[#765d3f] text-white shadow-[0_18px_36px_rgba(0,0,0,0.42)] transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-80"
          aria-label={copy.pickAvatar}
        >
          {groupAvatarDataUrl ? (
            <img src={groupAvatarDataUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <CameraPlusIcon />
          )}
        </button>

        <div className="mt-8 rounded-[18px] border border-white/10 bg-[#242620] px-4 py-2.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]">
          <input
            value={groupTitle}
            onChange={(event) => setGroupTitle(event.target.value)}
            placeholder={copy.groupName}
            maxLength={255}
            disabled={isCreatingGroup}
            className="h-10 w-full bg-transparent text-[18px] text-white/95 placeholder:text-white/45 focus:outline-none disabled:cursor-not-allowed"
          />
        </div>
      </div>

      {canSubmitGroup ? (
        <button
          type="button"
          onClick={() => {
            void handleSubmitGroup();
          }}
          className="absolute bottom-[22px] right-[16px] grid h-[68px] w-[68px] place-items-center rounded-full bg-[#c5aa84] text-[#211f1b] shadow-[0_14px_30px_rgba(0,0,0,.38)] transition-transform hover:scale-[1.03]"
          aria-label={copy.createGroup}
        >
          {isCreatingGroup ? (
            <span className="h-6 w-6 animate-spin rounded-full border-[3px] border-white border-r-transparent" />
          ) : (
            <ArrowRightIcon size={28} />
          )}
        </button>
      ) : null}
    </div>
  );

  const renderPrivateChatScreen = () => (
    <div className="flex h-full flex-col bg-[#242620]">
      {renderCreationHeader(copy.newPrivate, closeCreationFlow, privateQuery, setPrivateQuery, copy.searchPeople)}

      <div className="tg-scroll flex-1 overflow-y-auto pb-[30px] pt-1">
        {privateQuery.trim().length >= 2 && isPrivateSearching ? (
          <div className="px-5 py-8 text-sm text-white/55">{copy.searching}</div>
        ) : privateSearchError ? (
          <div className="px-5 py-8 text-sm text-[#ffb4b4]">{privateSearchError}</div>
        ) : (privateQuery.trim().length >= 2 ? privateSearchResults : filteredPrivateContacts).length === 0 ? (
          <div className="px-5 py-8 text-sm text-white/55">
            {privateQuery.trim().length >= 2
              ? copy.noUsers
              : copy.noContacts}
          </div>
        ) : (
          (privateQuery.trim().length >= 2 ? privateSearchResults : filteredPrivateContacts).map((contact) => (
            <ContactRow
              key={contact.userId}
              contact={contact}
              onClick={() => {
                void handleOpenPrivateChat(contact.userId);
              }}
              disabled={openingPrivateChatId === contact.userId}
            />
          ))
        )}
      </div>
    </div>
  );

  if (creationMode === 'groupMembers') {
    return (
      <aside className="tg-sidebar hidden h-full flex-col bg-[#242620] lg:flex" style={{ width }}>
        {renderGroupMembersScreen()}
      </aside>
    );
  }

  if (creationMode === 'groupDetails') {
    return (
      <aside className="tg-sidebar hidden h-full flex-col bg-[#242620] lg:flex" style={{ width }}>
        {renderGroupDetailsScreen()}
      </aside>
    );
  }

  if (creationMode === 'privateChat') {
    return (
      <aside className="tg-sidebar hidden h-full flex-col bg-[#242620] lg:flex" style={{ width }}>
        {renderPrivateChatScreen()}
      </aside>
    );
  }

  return (
    <aside
      className="tg-sidebar hidden h-full flex-col bg-[#242620] lg:flex"
      style={{ width }}
    >
      <div className="flex h-[66px] items-center gap-[14px] px-[16px] pt-[4px]">
        {!isSearchHidden ? (
          <div className="flex h-[42px] flex-1 items-center gap-[10px] rounded-full bg-[#171816] px-[18px] text-white/45 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
            <SearchIcon size={20} strokeWidth={2.4} />
            <div className="relative min-w-0 flex-1">
              <input
                type="text"
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder={
                  isSearchStatusVisible
                    ? ''
                    : searchPlaceholder === 'Search' ? copy.search : searchPlaceholder
                }
                className="w-full bg-transparent text-[17px] font-[450] text-white/90 placeholder:text-white/45 focus:outline-none"
              />
              {displayedSearchStatus ? (
                <span
                  className={`pointer-events-none absolute inset-y-0 left-0 flex items-center text-[17px] font-[450] text-white/50 transition-opacity duration-300 ${
                    isSearchStatusVisible ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  {displayedSearchStatus}
                </span>
              ) : null}
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsCompactSearchOpen((prev) => !prev)}
            className={`grid h-[38px] w-[38px] place-items-center rounded-full transition-colors ${
              isCompactSearchOpen ? 'bg-white/12 text-[#e0c59e]' : 'text-white/78 hover:bg-white/10'
            }`}
            aria-label={copy.searchChats}
          >
            {isCompactSearchOpen ? (
              <CloseIcon size={21} strokeWidth={2.3} />
            ) : (
              <SearchIcon size={21} strokeWidth={2.3} />
            )}
          </button>
        )}

      </div>

      {isSearchHidden && isCompactSearchOpen ? (
        <div className="px-[12px] pb-[8px]">
          <div className="flex h-[38px] items-center gap-2 rounded-full bg-[#171816] px-[12px] text-white/55 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
            <SearchIcon size={17} strokeWidth={2.4} />
            <div className="relative min-w-0 flex-1">
              <input
                ref={compactSearchInputRef}
                type="text"
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder={
                  isSearchStatusVisible
                    ? ''
                    : searchPlaceholder === 'Search' ? copy.search : searchPlaceholder
                }
                className="w-full bg-transparent text-[14px] text-white/90 placeholder:text-white/42 focus:outline-none"
              />
              {displayedSearchStatus ? (
                <span
                  className={`pointer-events-none absolute inset-y-0 left-0 flex items-center text-[14px] text-white/45 transition-opacity duration-300 ${
                    isSearchStatusVisible ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  {displayedSearchStatus}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <div className={`tg-scroll flex-1 overflow-y-auto pb-[94px] ${isCompact ? 'pt-[10px]' : 'pt-[6px]'}`}>
        {chats.length === 0 ? (
          <div className="px-5 py-8 text-sm text-white/55">{copy.empty}</div>
        ) : (
          chats.map((chat) => (
            <ChatRow
              key={chat.chatId}
              item={chat}
              compact={isCompact}
              onClick={() => onSelectChat(chat.chatId)}
            />
          ))
        )}
      </div>

      {!isCompact ? (
        <div ref={composePanelRef} className="absolute bottom-[24px] right-[16px] z-20 flex flex-col items-end">
          {composeMenuOpen ? (
            <div className="mb-2.5 min-w-[184px] overflow-hidden rounded-[12px] border border-white/10 bg-[#1b1c22]/98 shadow-[0_14px_28px_rgba(0,0,0,0.45)]">
              <ComposeMenuItem
                label={copy.newGroup}
                icon={<GroupIcon size={16} />}
                onClick={() => {
                  setComposeMenuOpen(false);
                  setCreationMode('groupMembers');
                }}
              />
              <ComposeMenuItem
                label={copy.newPrivate}
                icon={<PrivateChatIcon size={16} />}
                onClick={() => {
                  setComposeMenuOpen(false);
                  setCreationMode('privateChat');
                }}
              />
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => setComposeMenuOpen((prev) => !prev)}
            className="grid h-[68px] w-[68px] place-items-center rounded-full bg-[#c5aa84] text-[#211f1b] shadow-[0_14px_30px_rgba(0,0,0,.38)]"
            aria-label={composeMenuOpen ? copy.closeCompose : copy.openCompose}
          >
            {composeMenuOpen ? (
              <CloseIcon size={30} strokeWidth={2.1} />
            ) : (
              <PenSquareIcon size={26} strokeWidth={2.1} />
            )}
          </button>
        </div>
      ) : null}
    </aside>
  );
}

