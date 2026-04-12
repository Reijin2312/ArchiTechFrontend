type AvatarProps = {
  size?: number;
  avatarBg: string;
  avatarText: string;
  avatarUrl?: string;
  online?: boolean;
};

export function Avatar({
  size = 54,
  avatarBg,
  avatarText,
  avatarUrl,
  online = false,
}: AvatarProps) {
  const dotSize = Math.max(14, Math.round(size * 0.28));

  return (
    <div
      className="relative shrink-0"
      style={{
        width: size,
        height: size,
      }}
    >
      <div
        className="h-full w-full overflow-hidden rounded-full"
        style={{
          background: avatarBg,
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
        }}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={avatarText} className="h-full w-full object-cover" />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-white"
            style={{ fontSize: size * 0.45, fontWeight: 700 }}
          >
            {avatarText}
          </div>
        )}
      </div>
      {online ? (
        <span
          className="pointer-events-none absolute z-[3] rounded-full border-2 border-[#0e1118] bg-[#3b82f6] shadow-[0_0_0_1px_rgba(59,130,246,0.35)]"
          style={{
            width: dotSize,
            height: dotSize,
            right: -1,
            bottom: -1,
          }}
          aria-hidden
        />
      ) : null}
    </div>
  );
}
