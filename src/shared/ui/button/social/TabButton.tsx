type TabButtonProps = {
  active: boolean
  onClick: () => void
  label: string
  count?: number
  badge?: boolean
}

export function TabButton({
  active,
  onClick,
  label,
  count,
  badge
}: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={[
        'relative flex-1 px-3 py-1.5 rounded-lg text-sm transition-colors',
        active
          ? 'bg-indigo-600 [.at-secondary-skin_&]:bg-[#c8ae88] [.at-secondary-skin_&]:text-[#211f1b] text-white'
          : 'text-slate-300 [.at-secondary-skin_&]:text-[#c9c3b8] hover:bg-slate-800'
      ].join(' ')}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className={[
          'ml-1.5 px-1.5 py-0.5 rounded-full text-xs',
          active ? 'bg-indigo-500' : 'bg-slate-700 [.at-secondary-skin_&]:bg-[#404037]'
        ].join(' ')}>
          {count}
        </span>
      )}
      {badge && (
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full" />
      )}
    </button>
  );
}
