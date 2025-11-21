import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { http } from '@/shared/api/http';
import { endpoints } from '@/shared/api/endpoints';
import { isSelf } from '@/shared/auth/isSelf';
import { useWallpaper } from '@/shared/ui/useWallpaper';
import { Seo } from '@/shared/seo/seo';
import { ProfileBanner } from '@/shared/ui/ProfileBanner';
import { Badge } from '@/shared/ui/Badge';
import { SocialLinks } from '@/shared/ui/SocialLinks';
import { getThemeGradient } from '@/shared/ui/ThemeSelector';
import { Skin3DViewer } from '@/shared/ui/Skin3DViewer';
import { UserSessions } from '@/shared/ui/UserSessions';
import { ProfileThemeProvider, useProfileTheme } from '@/shared/ui/ProfileThemeContext';

type PublicUser = {
  id: string;
  username: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  skinUrl?: string;
  bannerUrl?: string;
  profileTheme?: string;
  customThemeColor1?: string;
  customThemeColor2?: string;
  profileWallpaper?: string;
  customStatus?: string;
  socialLinks?: Array<{ type: string; value: string }>;
  registeredAt?: string;
};

type Me = PublicUser & { email?: string };

type Stats = {
  servers?: number;
  sessions?: number;
  achievements?: number;
  registeredAt?: string;
  online?: boolean
};

type McStatus = {
  online: boolean;
  version?: string;
  motd?: string;
  players?: { online: number; max: number; sample?: { name: string }[] };
  latencyMs?: number;
  tps?: number;
};

import { SERVER_IP } from '@/shared/constants';

export default function UserProfilePage() {
  const username = useParams().username!;
  const self = isSelf(username);

  const [user, setUser] = useState<PublicUser | Me | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Use profile wallpaper if available, otherwise default
  useWallpaper(user?.profileWallpaper || '/images/bg.avif');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);

    const req = self ? http.get<Me>(endpoints.profileMe) : http.get<PublicUser>(endpoints.userByName(username));

    req
      .then(({ data }) => {
        if (!alive) return;
        setUser(data);
        setStats((s) => s ?? { servers: 3, sessions: 128, achievements: 16, online: false });
      })
      .catch((e) => alive && setErr(e?.response?.data?.message || e?.message || 'Ошибка загрузки'))
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [username, self]);

  useEffect(() => {
    if (!user?.username) return;

    let stop = false;

    const checkPlayerStatus = async () => {
      try {
        const response = await fetch(`https://api.mcsrvstat.us/2/${SERVER_IP}`, { cache: 'no-store' });
        if (!response.ok || stop) return;
        const data = await response.json();
        if (stop) return;

        const isOnline = data.online && data.players?.list?.some(
          (playerName: string) => playerName.toLowerCase() === user.username.toLowerCase()
        );

        setStats((prev) => {
          if (!prev) return { online: isOnline ?? false };
          return { ...prev, online: isOnline ?? false };
        });
      } catch {}
    };

    checkPlayerStatus();

    const intervalId = setInterval(checkPlayerStatus, 15000);

    return () => {
      stop = true;
      clearInterval(intervalId);
    };
  }, [user?.username]);

  const since = useMemo(() => {
    const iso = user?.registeredAt;
    if (!iso) return null;
    try { return new Date(iso).toLocaleDateString(); } catch { return null; }
  }, [user?.registeredAt]);

  return (
    <>
    <Seo title="Профиль игрока — ArchiTech MC" robots="noindex,follow" />
    
    <ProfileThemeProvider
      themeId={(user as any)?.profileTheme}
      customColor1={(user as any)?.customThemeColor1}
      customColor2={(user as any)?.customThemeColor2}
    >
    <div className="min-h-dvh flex flex-col">
      <main className="mx-auto flex w-full max-w-6xl grow flex-col gap-6 px-4 py-6">
        <div className="flex flex-col gap-6 md:grid md:grid-cols-12 md:items-stretch">
          <section className="order-2 flex flex-col md:col-span-3 md:order-1">
            <Card className="flex h-full flex-col">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Скин</h2>
                <div className="text-xs text-slate-400">3D</div>
              </div>
              <div className="h-[400px] md:flex-1 md:h-auto">
                <Skin3DViewer
                  className="h-full w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-900"
                  skinUrl={(user as any)?.skinUrl || ''}
                />
              </div>
            </Card>
          </section>

          <section className="order-1 flex flex-col md:col-span-9 md:order-2">
            <Card className="relative flex h-full flex-col overflow-hidden">
            
            {/* Banner background with gradient fade */}
            {(user as any)?.bannerUrl && (
              <div className="absolute left-0 right-0 top-0 h-48 overflow-hidden">
                <img
                  src={(user as any).bannerUrl}
                  alt="Profile banner"
                  className="h-full w-full object-cover"
                  style={{ imageRendering: 'pixelated' }}
                />
                <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-slate-900" />
              </div>
            )}
            
            {self && (
              <a
                href="/settings/profile"
                className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-900/70 text-slate-200 hover:border-slate-500 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-300 backdrop-blur-sm"
                aria-label="Редактировать профиль"
              >
                <svg
                  viewBox="0 0 32 32"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path
                    d="M16.0002 10C14.8135 10 13.6535 10.3519 12.6668 11.0112C11.6801 11.6705 10.9111 12.6076 10.457 13.7039C10.0028 14.8003 9.88402 16.0067 10.1155 17.1706C10.347 18.3344 10.9185 19.4035 11.7576 20.2427C12.5967 21.0818 13.6658 21.6532 14.8297 21.8847C15.9936 22.1162 17.2 21.9974 18.2963 21.5433C19.3927 21.0892 20.3298 20.3201 20.9891 19.3334C21.6483 18.3467 22.0002 17.1867 22.0002 16C21.9986 14.4092 21.3659 12.8841 20.2411 11.7592C19.1162 10.6343 17.591 10.0017 16.0002 10ZM16.0002 20C15.2091 20 14.4358 19.7654 13.778 19.3259C13.1202 18.8864 12.6075 18.2617 12.3047 17.5308C12.002 16.7998 11.9228 15.9956 12.0771 15.2197C12.2314 14.4437 12.6124 13.731 13.1718 13.1716C13.7312 12.6122 14.444 12.2312 15.2199 12.0769C15.9958 11.9225 16.8001 12.0017 17.531 12.3045C18.2619 12.6072 18.8866 13.1199 19.3261 13.7777C19.7656 14.4355 20.0002 15.2089 20.0002 16C20.0002 17.0609 19.5788 18.0783 18.8287 18.8284C18.0785 19.5786 17.0611 20 16.0002 20ZM29.7427 13.4013C29.7149 13.2604 29.657 13.1273 29.5731 13.0108C29.4892 12.8943 29.3812 12.7973 29.2565 12.7263L25.5277 10.6013L25.5127 6.39877C25.5123 6.25403 25.4804 6.11112 25.4193 5.97991C25.3583 5.84869 25.2694 5.7323 25.159 5.63877C23.8064 4.49464 22.2488 3.61785 20.569 3.05502C20.4367 3.01024 20.2965 2.99367 20.1574 3.00637C20.0184 3.01908 19.8835 3.06077 19.7615 3.12877L16.0002 5.23127L12.2352 3.12502C12.1132 3.05664 11.9781 3.01463 11.8388 3.00171C11.6995 2.98879 11.559 3.00525 11.4265 3.05002C9.74792 3.61696 8.1921 4.4971 6.84149 5.64377C6.7312 5.73716 6.64246 5.85336 6.58139 5.98434C6.52032 6.11533 6.48837 6.258 6.48774 6.40252L6.46899 10.6088L2.74024 12.7338C2.61549 12.8048 2.50749 12.9018 2.42359 13.0183C2.33969 13.1348 2.28184 13.2679 2.25399 13.4088C1.91273 15.1236 1.91273 16.8889 2.25399 18.6038C2.28184 18.7446 2.33969 18.8778 2.42359 18.9942C2.50749 19.1107 2.61549 19.2077 2.74024 19.2788L6.46899 21.4038L6.48399 25.6063C6.48444 25.751 6.51631 25.8939 6.57738 26.0251C6.63846 26.1563 6.72729 26.2727 6.83774 26.3663C8.19033 27.5104 9.74793 28.3872 11.4277 28.95C11.56 28.9948 11.7002 29.0114 11.8393 28.9987C11.9784 28.986 12.1133 28.9443 12.2352 28.8763L16.0002 26.7688L19.7652 28.875C19.9142 28.958 20.0822 29.0011 20.2527 29C20.362 29 20.4704 28.9823 20.574 28.9475C22.2524 28.3813 23.8082 27.502 25.159 26.3563C25.2693 26.2629 25.358 26.1467 25.4191 26.0157C25.4802 25.8847 25.5121 25.742 25.5127 25.5975L25.5315 21.3913L29.2602 19.2663C29.385 19.1952 29.493 19.0982 29.5769 18.9817C29.6608 18.8653 29.7186 18.7321 29.7465 18.5913C30.0858 16.8778 30.0846 15.1143 29.7427 13.4013Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
            )}

            <div className="relative z-10 mt-28 flex justify-center">
              <Avatar url={(user as any)?.avatarUrl} loading={loading} />
            </div>

            <div className="pt-4 text-center">
              {(user as any)?.displayName && (
                <div className="mb-1 text-xl font-semibold text-slate-300">
                  {(user as any).displayName}
                </div>
              )}
              <div className="mb-1 flex items-center justify-center gap-2">
                <h1 className="truncate text-2xl font-bold">
                  {loading ? 'Загрузка…' : user ? `${user.username}` : '—'}
                </h1>
                {stats?.online != null && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${
                      stats.online ? 'border-green-700 text-green-400' : 'border-slate-700 text-slate-400'
                    }`}
                    title={stats.online ? 'Онлайн' : 'Оффлайн'}
                  >
                    <span className={`h-2 w-2 rounded-full ${stats.online ? 'bg-green-500' : 'bg-slate-500'}`} />
                    {stats.online ? 'online' : 'offline'}
                  </span>
                )}
              </div>

              {/* Custom Status */}
              {(user as any)?.customStatus && (
                <div className="mb-2 text-sm text-slate-300">
                  {(user as any).customStatus}
                </div>
              )}

              <div className="mb-4 text-xs text-slate-400">
                {since && <span>с {since}</span>}
                {self && <span className="ml-2 rounded-md border border-slate-700 px-2 py-0.5 text-sky-400">это вы</span>}
              </div>

              <p className="mx-auto max-w-2xl whitespace-pre-wrap text-sm text-slate-200">
                {loading ? '…' : user?.bio || 'Описание не заполнено'}
              </p>

              {/* Social Links */}
              {(user as any)?.socialLinks && Object.keys((user as any).socialLinks).length > 0 && (
                <div className="mt-4">
                  <SocialLinks 
                    links={(user as any).socialLinks} 
                    onChange={() => {}} 
                    readOnly 
                  />
                </div>
              )}

              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                {self ? (
                  <>
                    {}
                    <button className="rounded-xl border border-slate-700 px-3 py-1.5 text-sm hover:border-slate-500">
                      Поделиться
                    </button>
                  </>
                ) : (
                  <>
                    <button className="rounded-xl border border-slate-700 px-3 py-1.5 text-sm hover:border-slate-500">
                      Написать
                    </button>
                    <button className="rounded-xl border border-red-800 px-3 py-1.5 text-sm text-red-400 hover:bg-red-900/20">
                      Пожаловаться
                    </button>
                  </>
                )}
              </div>

              <div className="mt-6 grid grid-cols-3 gap-2 text-center text-sm">
                <Stat label="Сервера" value={stats?.servers} loading={loading} />
                <Stat label="Сессии" value={stats?.sessions} loading={loading} />
                <Stat label="Ачивки" value={stats?.achievements} loading={loading} />
              </div>
            </div>
          </Card>
          </section>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <h3 className="mb-3 text-sm font-semibold text-sky-300">Достижения</h3>
              {loading ? (
                <Empty loading={true} text="" />
              ) : (user as any)?.achievements && (user as any).achievements.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {(user as any).achievements
                    .filter((ach: any) => ach.unlocked)
                    .map((ach: any, idx: number) => (
                      <Badge
                        key={idx}
                        icon={ach.icon}
                        title={ach.title}
                        description={ach.description}
                        unlocked={true}
                        unlockedAt={ach.unlockedAt}
                      />
                    ))}
                </div>
              ) : (
                <Empty loading={false} text="Нет достижений" />
              )}
            </Card>
          </div>

        <UserSessions username={username} />

        {err && (
          <div className="mt-6 rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
            {err}
          </div>
        )}
      </main>

    </div>
    </ProfileThemeProvider>
    </>
  );
}

function Card(props: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const { getThemeStyle } = useProfileTheme();
  const customStyle = getThemeStyle();
  const hasCustomTheme = Object.keys(customStyle).length > 0;
  
  const finalStyle = {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    ...customStyle,
    ...props.style
  };
  
  return (
    <section
      className={`rounded-2xl border border-slate-800 backdrop-blur-md backdrop-saturate-150 p-4 shadow-[0_1px_0_#ffffff10_inset,0_20px_40px_-20px_#000] ${props.className || ''}`}
      style={finalStyle}
    >
      {props.children}
    </section>
  );
}

function Avatar({ url, loading }: { url?: string; loading: boolean }) {
  return (
    <div className="h-32 w-32 rounded-3xl border-2 border-sky-700/50 bg-slate-900 shadow-[0_8px_24px_rgba(2,132,199,0.25)]">
      {loading ? (
        <div className="h-full w-full animate-pulse rounded-3xl bg-slate-800" />
      ) : url ? (
        <img
          src={url}
          alt="Аватар"
          width={128}
          height={128}
          loading="lazy"
          decoding="async"
          className="h-full w-full rounded-3xl object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-3xl text-slate-400">AVA</div>
      )}
    </div>
  );
}

function Stat({ label, value, loading }: { label: string; value?: number; loading: boolean }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
      <div className="text-lg font-semibold text-sky-300">{loading ? '…' : value ?? 0}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  );
}

function Empty({ loading, text }: { loading: boolean; text: string }) {
  return loading ? (
    <div className="h-20 animate-pulse rounded-xl bg-slate-800" />
  ) : (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-center text-sm text-slate-400">{text}</div>
  );
}
