type AvatarProps = {
  size?: number;
  avatarBg: string;
  avatarText: string;
  avatarUrl?: string;
};

export function Avatar({
  size = 54,
  avatarBg,
  avatarText,
  avatarUrl,
}: AvatarProps) {
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-full"
      style={{
        width: size,
        height: size,
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
  );
}
