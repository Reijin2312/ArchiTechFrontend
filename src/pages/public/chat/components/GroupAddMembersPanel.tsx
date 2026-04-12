import { useMemo } from 'react';
import { Avatar } from './Avatar';

export type GroupAddMemberCandidate = {
  userId: string;
  name: string;
  avatarUrl?: string;
  avatarBg: string;
  avatarText: string;
  statusText?: string;
  isOnline?: boolean;
};

type GroupAddMembersPanelProps = {
  query: string;
  onQueryChange: (value: string) => void;
  candidates: GroupAddMemberCandidate[];
  selectedIds: string[];
  onToggleSelect: (userId: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
};

function BackIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="m15 19-7-7 7-7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SearchIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="7.4" stroke="currentColor" strokeWidth="2.15" />
      <path d="m20 20-4-4" stroke="currentColor" strokeWidth="2.15" strokeLinecap="round" />
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

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      className={`inline-flex h-[30px] w-[30px] items-center justify-center rounded-[9px] border transition-colors ${
        checked
          ? 'border-[#8e77ef] bg-[#8e77ef] text-white'
          : 'border-white/35 bg-transparent text-transparent'
      }`}
    >
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none">
        <path d="m5 12 4 4 10-10" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export function GroupAddMembersPanel({
  query,
  onQueryChange,
  candidates,
  selectedIds,
  onToggleSelect,
  onBack,
  onSubmit,
  isSubmitting = false,
}: GroupAddMembersPanelProps) {
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedCount = selectedIds.length;

  return (
    <aside className="relative h-full w-full border-l border-white/10 bg-[#14151a] shadow-[-16px_0_38px_rgba(0,0,0,0.4)]">
      <div className="flex h-full flex-col bg-[#1a1b20]">
        <div className="flex h-[78px] items-center gap-3 px-4">
          <button
            type="button"
            onClick={onBack}
            className="grid h-10 w-10 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/10"
            aria-label="Back to group info"
          >
            <BackIcon />
          </button>
          <div className="text-[17px] font-[700] text-white/96">Add Members</div>
        </div>

        <div className="px-4 pb-2">
          <div className="flex h-[50px] items-center gap-3 rounded-[16px] bg-[#1f2026] px-4 text-white/65 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]">
            <SearchIcon size={20} />
            <input
              type="text"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Add people..."
              className="w-full bg-transparent text-[17px] text-white/92 placeholder:text-white/42 focus:outline-none"
            />
          </div>
        </div>

        <div className="tg-scroll flex-1 overflow-y-auto pb-[88px] pt-1">
          {candidates.length === 0 ? (
            <div className="px-5 py-8 text-sm text-white/55">No users from private chats to add.</div>
          ) : (
            candidates.map((candidate) => (
              <button
                key={candidate.userId}
                type="button"
                className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.045]"
                onClick={() => onToggleSelect(candidate.userId)}
              >
                <div className="pt-[1px]">
                  <Avatar
                    size={55}
                    avatarBg={candidate.avatarBg}
                    avatarText={candidate.avatarText}
                    avatarUrl={candidate.avatarUrl}
                    online={!!candidate.isOnline}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-[17px] font-[500] leading-tight text-white/95">
                    {candidate.name}
                  </div>
                  <div className={`mt-[1px] truncate text-[14px] ${candidate.isOnline ? 'text-[#9f88ff]' : 'text-white/52'}`}>
                    {candidate.statusText || 'offline'}
                  </div>
                </div>

                <div className="pt-[10px]">
                  <Checkbox checked={selectedSet.has(candidate.userId)} />
                </div>
              </button>
            ))
          )}
        </div>

        {selectedCount > 0 ? (
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting}
            className="absolute bottom-[22px] right-[16px] grid h-[68px] w-[68px] place-items-center rounded-full bg-[#8e77ef] text-white shadow-[0_14px_30px_rgba(142,119,239,.45)] transition-transform hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-80"
            aria-label="Add selected members"
          >
            {isSubmitting ? (
              <span className="h-6 w-6 animate-spin rounded-full border-[3px] border-white border-r-transparent" />
            ) : (
              <ArrowRightIcon size={28} />
            )}
          </button>
        ) : null}
      </div>
    </aside>
  );
}
