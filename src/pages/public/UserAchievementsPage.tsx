import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { http } from '@/shared/api/http';
import { endpoints } from '@/shared/api/endpoints';
import { isSelf } from '@/shared/auth/isSelf';
import { useWallpaper } from '@/shared/ui/wallpaper/useWallpaper';
import { Seo } from '@/shared/seo/seo';
import { ProfileThemeProvider, useProfileTheme } from '@/shared/ui/utils/ProfileThemeContext';

type Achievement = {
  id: string;
  icon: string;
  title: string;
  description: string;
  unlocked: boolean;
  unlockedAt?: string;
  sortOrder?: number;
  pinned?: boolean;
};

type PublicUser = {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  profileTheme?: string;
  customThemeColor1?: string;
  customThemeColor2?: string;
  profileWallpaper?: string;
  achievements?: Achievement[];
  stats?: Record<string, unknown>;
  minecraftStats?: Record<string, unknown>;
  gameStats?: Record<string, unknown>;
  mcStats?: Record<string, unknown>;
};

type Me = PublicUser & { email?: string };

type FilterMode = 'all' | 'unlocked' | 'locked';

type Metric = {
  id: string;
  label: string;
  value: string;
  hint: string;
  icon: string;
};

const FILTERS: Array<{ id: FilterMode; label: string }> = [
  { id: 'all', label: 'Все' },
  { id: 'unlocked', label: 'Открытые' },
  { id: 'locked', label: 'Скрытые' },
];

export default function UserAchievementsPage() {
  const username = useParams().username ?? '';
  const self = isSelf(username);

  const [user, setUser] = useState<PublicUser | Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>('all');
  const [query, setQuery] = useState('');

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
      })
      .catch((e) => alive && setErr(e?.response?.data?.message || e?.message || 'Ошибка загрузки достижений'))
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [username, self]);

  const achievements = useMemo(() => user?.achievements ?? [], [user?.achievements]);
  const total = achievements.length;
  const unlockedCount = useMemo(() => achievements.filter((a) => a.unlocked).length, [achievements]);
  const lockedCount = Math.max(0, total - unlockedCount);
  const progress = total > 0 ? Math.round((unlockedCount / total) * 100) : 0;

  const sortedAchievements = useMemo(() => {
    return [...achievements].sort((a, b) => {
      if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;

      const aSort = typeof a.sortOrder === 'number' ? a.sortOrder : Number.MAX_SAFE_INTEGER;
      const bSort = typeof b.sortOrder === 'number' ? b.sortOrder : Number.MAX_SAFE_INTEGER;
      if (aSort !== bSort) return aSort - bSort;

      const aTime = a.unlockedAt ? Date.parse(a.unlockedAt) : 0;
      const bTime = b.unlockedAt ? Date.parse(b.unlockedAt) : 0;
      if (aTime !== bTime) return bTime - aTime;

      return a.title.localeCompare(b.title, 'ru');
    });
  }, [achievements]);

  const pinned = useMemo(() => {
    const withPin = achievements.filter((a) => a.unlocked && a.pinned);
    if (withPin.length > 0) {
      return [...withPin]
        .sort((a, b) => {
          const aTime = a.unlockedAt ? Date.parse(a.unlockedAt) : 0;
          const bTime = b.unlockedAt ? Date.parse(b.unlockedAt) : 0;
          return bTime - aTime;
        })
        .slice(0, 6);
    }

    return [...achievements]
      .filter((a) => a.unlocked)
      .sort((a, b) => {
        const aTime = a.unlockedAt ? Date.parse(a.unlockedAt) : 0;
        const bTime = b.unlockedAt ? Date.parse(b.unlockedAt) : 0;
        return bTime - aTime;
      })
      .slice(0, 6);
  }, [achievements]);

  const visibleCatalog = useMemo(() => {
    const q = normalizeText(query);
    return sortedAchievements.filter((a) => {
      if (filter === 'unlocked' && !a.unlocked) return false;
      if (filter === 'locked' && a.unlocked) return false;
      if (!q) return true;
      const hay = normalizeText(`${a.title} ${a.description}`);
      return hay.includes(q);
    });
  }, [sortedAchievements, filter, query]);

  const displayName = user?.displayName || user?.username || username;
  const metrics = useMemo(() => buildMetrics(user), [user]);
  const leftMetrics = metrics.slice(0, 3);
  const rightMetrics = metrics.slice(3, 6);

  return (
    <>
      <Seo title={`Достижения ${displayName} — ArchiTech MC`} robots="noindex,follow" />
      <ProfileThemeProvider
        themeId={user?.profileTheme}
        customColor1={user?.customThemeColor1}
        customColor2={user?.customThemeColor2}
      >
        <div className="min-h-dvh">
          <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6">
            <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/70 p-5 shadow-[0_24px_60px_-30px_rgba(0,0,0,.85)] md:p-6">
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute -left-20 top-0 h-56 w-56 rounded-full bg-sky-500/12 blur-3xl" />
                <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-indigo-500/12 blur-3xl" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(251,191,36,.18),transparent_45%)]" />
              </div>

              <div className="relative z-10 mb-6 flex items-start justify-center">
                <div className="inline-flex items-center justify-center gap-4">
                  <div className="h-14 w-14 overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900 shadow-[0_8px_24px_-12px_rgba(14,165,233,.45)]">
                    {user?.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt="Аватар"
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-lg font-semibold text-slate-300">
                        {(displayName?.charAt(0) || '?').toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="text-center">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Достижения игрока</div>
                    <h1 className="mt-1 text-2xl font-semibold text-slate-100 md:text-3xl">{displayName}</h1>
                  </div>
                </div>
                <Link
                  to={`/u/${encodeURIComponent(username)}`}
                  className="absolute right-0 top-0 inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-sm text-slate-200 hover:border-slate-500"
                >
                  <span aria-hidden="true">↩</span>
                  К профилю
                </Link>
              </div>

              <div className="relative z-10 grid gap-4 lg:grid-cols-[1fr_280px_1fr] lg:items-center">
                <div className="grid gap-3">
                  {leftMetrics.map((metric) => (
                    <MetricCard key={metric.id} metric={metric} />
                  ))}
                </div>

                <div className="mx-auto w-full max-w-[280px] rounded-3xl border border-amber-500/30 bg-slate-950/70 p-5 shadow-[0_0_0_1px_rgba(251,191,36,.2)_inset,0_18px_45px_-28px_rgba(251,191,36,.55)]">
                  <div className="mb-3 text-center text-xs uppercase tracking-[0.14em] text-amber-200/85">Рейтинг архива</div>
                  <div
                    className="mx-auto grid h-44 w-44 place-items-center rounded-full p-[12px]"
                    style={{
                      background: `conic-gradient(from 200deg, rgba(14,165,233,.95) ${progress * 3.6}deg, rgba(51,65,85,.45) ${progress * 3.6}deg 360deg)`,
                    }}
                  >
                    <div className="flex h-full w-full flex-col items-center justify-center rounded-full border border-slate-700 bg-slate-950/90 text-center">
                      <div className="text-4xl leading-none">🏆</div>
                      <div className="mt-1 text-3xl leading-none font-semibold text-slate-100">
                        {unlockedCount}/{total}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3">
                  {rightMetrics.map((metric) => (
                    <MetricCard key={metric.id} metric={metric} />
                  ))}
                </div>
              </div>
            </section>

            <section className="relative overflow-hidden rounded-2xl border border-amber-400/25 bg-[linear-gradient(180deg,rgba(15,23,42,.9),rgba(9,14,28,.94))] p-4 shadow-[0_24px_60px_-34px_rgba(0,0,0,.95)]">
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-0 bg-[repeating-linear-gradient(135deg,rgba(255,255,255,.02)_0px,rgba(255,255,255,.02)_2px,transparent_2px,transparent_8px)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0,rgba(251,191,36,.13),transparent_45%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_0_100%,rgba(56,189,248,.08),transparent_40%)]" />
              </div>
              <div className="relative z-10 mb-3 flex flex-col items-center justify-center gap-1 text-center">
                <h2 className="text-base font-semibold uppercase tracking-[0.12em] text-amber-100">Закрепленные награды</h2>
                <span className="rounded-full border border-amber-300/30 bg-slate-950/50 px-2 py-0.5 text-xs text-amber-100/90">
                  {pinned.length}
                </span>
              </div>

              {loading ? (
                <div className="flex gap-3 overflow-hidden">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <EmptyLoading key={idx} className="h-28 w-32 shrink-0" />
                  ))}
                </div>
              ) : pinned.length > 0 ? (
                <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
                  {pinned.map((achievement) => (
                    <PinnedRibbonItem key={achievement.id} achievement={achievement} />
                  ))}
                </div>
              ) : (
                <EmptyText text="Пока нет закрепленных наград" />
              )}
            </section>

            <section>
              <Card>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-slate-100">Каталог достижений</h2>
                  <div className="inline-flex rounded-xl border border-slate-700 bg-slate-900/80 p-1">
                    {FILTERS.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setFilter(item.id)}
                        className={`rounded-lg px-3 py-1.5 text-sm transition ${
                          filter === item.id
                            ? 'bg-sky-500/20 text-sky-200 shadow-[0_0_0_1px_rgba(56,189,248,.35)_inset]'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Поиск по названию или описанию"
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-500/60"
                  />
                </div>

                {loading ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, idx) => (
                      <EmptyLoading key={idx} className="h-24" />
                    ))}
                  </div>
                ) : visibleCatalog.length > 0 ? (
                  <>
                    <div className="mb-3 text-xs text-slate-400">
                      Показано {visibleCatalog.length} • Открыто {unlockedCount} • Закрыто {lockedCount}
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                      {visibleCatalog.map((achievement) => (
                        <AchievementTile key={achievement.id} achievement={achievement} />
                      ))}
                    </div>
                  </>
                ) : (
                  <EmptyText text="По текущему фильтру ничего не найдено" />
                )}
              </Card>
            </section>

            {err && (
              <div className="rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
                {err}
              </div>
            )}
          </main>
        </div>
      </ProfileThemeProvider>
    </>
  );
}

function Card(props: { children: React.ReactNode; className?: string }) {
  const { getThemeStyle } = useProfileTheme();
  const customStyle = getThemeStyle();
  return (
    <section
      className={`rounded-2xl border border-slate-800 bg-slate-950/65 p-4 shadow-[0_1px_0_#ffffff10_inset,0_20px_40px_-20px_#000] backdrop-blur-md backdrop-saturate-150 ${props.className ?? ''}`}
      style={{ ...customStyle }}
    >
      {props.children}
    </section>
  );
}

function MetricCard({ metric }: { metric: Metric }) {
  const rightAligned = metric.id === 'deaths' || metric.id === 'playHours' || metric.id === 'walkedKm';
  return (
    <article
      className={`rounded-2xl border border-slate-800/90 bg-slate-900/75 p-3 shadow-[0_10px_30px_-24px_rgba(56,189,248,.55)] ${
        rightAligned ? 'text-right' : ''
      }`}
    >
      <div className={`mb-2 flex items-center gap-2 text-slate-400 ${rightAligned ? 'justify-end' : ''}`}>
        <span className="text-lg">{metric.icon}</span>
        <span className="text-xs uppercase tracking-[0.08em]">{metric.label}</span>
      </div>
      <div className="text-2xl font-semibold text-slate-100">{metric.value}</div>
      <div className="text-xs text-slate-500">{metric.hint}</div>
    </article>
  );
}

function PinnedRibbonItem({ achievement }: { achievement: Achievement }) {
  const unlockedAt = formatDate(achievement.unlockedAt);
  return (
    <article className="group w-32 shrink-0">
      <div className="relative rounded-xl border border-amber-300/25 bg-black/35 p-2 shadow-[0_14px_28px_-18px_rgba(0,0,0,.9)]">
        <div className="pointer-events-none absolute inset-0 rounded-xl bg-[radial-gradient(circle_at_50%_0,rgba(251,191,36,.18),transparent_55%)]" />
        <div className="relative mx-auto mb-2 grid h-16 w-16 place-items-center rounded-full border border-amber-200/35 bg-[radial-gradient(circle,rgba(251,191,36,.24),rgba(2,6,23,.6)_72%)] text-2xl">
          {achievement.icon || '🏅'}
        </div>
        <div className="relative text-center">
          <div className="truncate text-xs font-semibold uppercase tracking-[0.06em] text-amber-100">{achievement.title}</div>
          <div className="mt-0.5 text-[10px] text-amber-100/65">{unlockedAt ?? 'закреплено'}</div>
        </div>
      </div>
    </article>
  );
}

function AchievementTile({ achievement }: { achievement: Achievement }) {
  const unlocked = !!achievement.unlocked;
  const unlockedAt = formatDate(achievement.unlockedAt);

  return (
    <article
      className={`relative overflow-hidden rounded-xl border p-3 transition ${
        unlocked
          ? 'border-amber-600/35 bg-linear-to-br from-amber-900/25 via-slate-900/70 to-slate-950/85'
          : 'border-slate-800 bg-slate-900/70'
      } min-h-24`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_100%_0,rgba(251,191,36,.18),transparent_45%)]" />

      {!unlocked && (
        <div className="absolute inset-0 bg-slate-950/55 backdrop-blur-[1px]">
          <div className="absolute right-2 top-2 rounded-full border border-slate-700 bg-slate-900/90 px-1.5 py-0.5 text-[11px] text-slate-300">
            🔒
          </div>
        </div>
      )}

      <div className="relative z-10 flex items-start gap-3">
        <div className={`text-3xl ${unlocked ? '' : 'grayscale'}`}>{achievement.icon || '🏅'}</div>
        <div className="min-w-0 flex-1">
          <div className={`truncate text-sm font-semibold ${unlocked ? 'text-amber-200' : 'text-slate-300'}`}>
            {achievement.title}
          </div>
          <div className="mt-0.5 line-clamp-2 text-xs text-slate-400">{achievement.description}</div>
          {unlockedAt && (
            <div className="mt-2 text-[11px] text-slate-500">
              Получено: <span className="text-slate-300">{unlockedAt}</span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function EmptyLoading({ className = 'h-20' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl border border-slate-800 bg-slate-900 ${className}`} />;
}

function EmptyText({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 text-center text-sm text-slate-400">{text}</div>
  );
}

function formatDate(iso?: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('ru-RU');
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function buildMetrics(user: PublicUser | Me | null): Metric[] {
  const roots = [user, user?.stats, user?.minecraftStats, user?.gameStats, user?.mcStats].filter(Boolean) as Record<
    string,
    unknown
  >[];

  const mobKills = findNumber(roots, ['mobKills', 'mobsKilled', 'mob_kills', 'kills.mob']);
  const blocksPlaced = findNumber(roots, ['blocksPlaced', 'blocks_placed', 'placedBlocks', 'world.blocksPlaced']);
  const blocksBroken = findNumber(roots, ['blocksBroken', 'blocksMined', 'blocks_broken', 'blocks_mined']);
  const deaths = findNumber(roots, ['deaths', 'playerDeaths', 'death_count']);
  const playHours = readPlayHours(roots);
  const walkedKm = readDistanceKm(roots);

  return [
    { id: 'mobKills', icon: '⚔️', label: 'Убито мобов', value: formatMetricValue(mobKills), hint: '' },
    { id: 'blocksPlaced', icon: '🧱', label: 'Поставлено блоков', value: formatMetricValue(blocksPlaced), hint: '' },
    { id: 'blocksBroken', icon: '⛏️', label: 'Добыто блоков', value: formatMetricValue(blocksBroken), hint: '' },
    { id: 'deaths', icon: '☠️', label: 'Смертей', value: formatMetricValue(deaths), hint: '' },
    { id: 'playHours', icon: '⌛', label: 'Часов в мире', value: formatMetricValue(playHours), hint: '' },
    { id: 'walkedKm', icon: '🧭', label: 'Пройдено км', value: formatMetricValue(walkedKm, 1), hint: '' },
  ];
}

function formatMetricValue(value: number | null, maxFractionDigits = 0): string {
  if (value == null || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: maxFractionDigits }).format(value);
}

function readPlayHours(roots: Record<string, unknown>[]): number | null {
  const directHours = findNumber(roots, ['playHours', 'play_time_hours', 'timePlayedHours']);
  if (directHours != null) return directHours;

  const minutes = findNumber(roots, ['playMinutes', 'play_time_minutes', 'timePlayedMinutes']);
  if (minutes != null) return minutes / 60;

  const seconds = findNumber(roots, ['playSeconds', 'play_time_seconds', 'timePlayedSeconds']);
  if (seconds != null) return seconds / 3600;

  const ticks = findNumber(roots, ['playTicks', 'play_time_ticks', 'playTime']);
  if (ticks != null) return ticks / 72000;

  return null;
}

function readDistanceKm(roots: Record<string, unknown>[]): number | null {
  const km = findNumber(roots, ['distanceKm', 'distance_km', 'walkedKm']);
  if (km != null) return km;

  const meters = findNumber(roots, ['distanceMeters', 'distance_meters', 'walkedMeters']);
  if (meters != null) return meters / 1000;

  const cm = findNumber(roots, ['distanceCm', 'distance_cm', 'walkedCm', 'walk_one_cm']);
  if (cm != null) return cm / 100000;

  return null;
}

function findNumber(roots: Record<string, unknown>[], keys: string[]): number | null {
  for (const root of roots) {
    for (const key of keys) {
      const value = key.includes('.') ? readPath(root, key) : root[key];
      const num = toNumber(value);
      if (num != null) return num;
    }
  }
  return null;
}

function readPath(source: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = source;
  for (const part of parts) {
    if (current == null || typeof current !== 'object' || !(part in (current as Record<string, unknown>))) {
      return null;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
