import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

type GameSession = {
  sessionId: number;
  startedAt: string;
  endedAt: string | null;
  durationMinutes: number | null;
  isActive: boolean;
};

type PlaytimeStats = {
  totalSessions: number;
  totalHours: number;
  averageMinutes: number;
  lastPlayed: string | null;
};

type SessionsData = {
  username: string;
  isOnline: boolean;
  sessions: GameSession[];
  stats: PlaytimeStats | null;
};

export function UserSessions({ username }: { username: string }) {
  const [data, setData] = useState<SessionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchSessions() {
      try {
        setLoading(true);
        const response = await fetch(`/api/v1/users/${encodeURIComponent(username)}/sessions`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch sessions');
        }

        const json = await response.json();
        if (mounted) {
          setData(json);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchSessions();

    return () => {
      mounted = false;
    };
  }, [username]);

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-slate-700 rounded w-1/3"></div>
          <div className="h-8 bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
        <p className="text-slate-400 text-sm">Не удалось загрузить сессии</p>
      </div>
    );
  }

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}ч ${mins}м`;
    }
    return `${mins}м`;
  };

  const getRelativeTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins} мин. назад`;
    if (diffHours < 24) return `${diffHours} ч. назад`;
    if (diffDays < 7) return `${diffDays} дн. назад`;
    return formatDate(isoString);
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-100">Игровые сессии</h3>
          {data.isOnline && (
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs border border-emerald-700/50 bg-emerald-500/10 text-emerald-300">
              <motion.span
                className="size-1.5 rounded-full bg-emerald-400"
                animate={{
                  scale: [1, 1.6, 1],
                  boxShadow: [
                    '0 0 0 0 rgba(34,197,94,0.6)',
                    '0 0 0 8px rgba(34,197,94,0)',
                    '0 0 0 0 rgba(34,197,94,0)',
                  ],
                }}
                transition={{ duration: 1.3, repeat: Infinity, repeatDelay: 0.7 }}
              />
              Онлайн
            </span>
          )}
        </div>
      </div>

      {data.stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 py-4 bg-slate-950/40">
          <div>
            <div className="text-xs text-slate-400 mb-1">Всего сессий</div>
            <div className="text-xl font-semibold text-slate-100">{data.stats.totalSessions}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">Наиграно</div>
            <div className="text-xl font-semibold text-slate-100">
              {data.stats.totalHours.toFixed(1)}ч
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">Средняя сессия</div>
            <div className="text-xl font-semibold text-slate-100">
              {formatDuration(data.stats.averageMinutes)}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">Последняя игра</div>
            <div className="text-sm font-medium text-slate-200">
              {data.stats.lastPlayed ? getRelativeTime(data.stats.lastPlayed) : '—'}
            </div>
          </div>
        </div>
      )}

      <div className="px-6 py-4">
        {data.sessions.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-8">
            Сессий пока нет
          </p>
        ) : (
          <div className="space-y-2">
            <div className="text-xs text-slate-400 mb-3">Последние сессии</div>
            {data.sessions.map((session) => (
              <motion.div
                key={session.sessionId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between py-3 px-4 rounded-lg border border-slate-800 bg-slate-950/40 hover:bg-slate-900/60 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-200 font-medium">
                      {formatDate(session.startedAt)}
                    </span>
                    {session.isActive && (
                      <span className="text-xs text-emerald-400 font-medium">
                        • Сейчас играет
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {session.endedAt
                      ? `до ${formatDate(session.endedAt)}`
                      : 'В игре'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-slate-100">
                    {session.durationMinutes
                      ? formatDuration(session.durationMinutes)
                      : '—'}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
