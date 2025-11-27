import React from 'react';
import { Card } from './components';
import type { Session, Status, SortKey, SessionFilters } from './types';

interface SessionsSectionProps {
  visibleSessions: Session[];
  show: SessionFilters;
  setShow: (filters: SessionFilters) => void;
  from: string;
  setFrom: (v: string) => void;
  to: string;
  setTo: (v: string) => void;
  sortBy: SortKey;
  setSortBy: (v: SortKey) => void;
  busy: string | null;
  onRevoke: (tokenId: string) => void;
  onRefresh: () => void;
  sessionStatus: (s: Session) => Status;
}

function fmt(x?: string) {
  if (!x) return '—';
  try {
    return new Date(x).toLocaleString();
  } catch {
    return x;
  }
}

function badgeClass(status: Status | string) {
  switch (status) {
    case 'active':
      return 'rounded-md border border-green-800 px-2 py-0.5 text-green-400';
    case 'expired':
      return 'rounded-md border border-slate-700 px-2 py-0.5 text-slate-400';
    case 'replaced':
      return 'rounded-md border border-amber-800 px-2 py-0.5 text-amber-300';
    case 'revoked':
      return 'rounded-md border border-red-800 px-2 py-0.5 text-red-300';
    default:
      return 'rounded-md border border-slate-700 px-2 py-0.5 text-slate-400';
  }
}

export function SessionsSection({
  visibleSessions,
  show,
  setShow,
  from,
  setFrom,
  to,
  setTo,
  sortBy,
  setSortBy,
  busy,
  onRevoke,
  onRefresh,
  sessionStatus,
}: SessionsSectionProps) {
  return (
    <Card className="mt-6">
      <h2 className="mb-3 text-sm font-semibold text-sky-300">Сессии</h2>

      {/* фильтры статусов */}
      <div className="mb-3 flex flex-wrap gap-2 text-xs">
        {(['active', 'expired', 'replaced', 'revoked'] as Status[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setShow({ ...show, [k]: !show[k] })}
            className={`rounded-lg border px-2.5 py-1 ${
              show[k] ? 'border-sky-700 text-sky-300' : 'border-slate-700 text-slate-400 hover:border-slate-500'
            }`}
            title={k}
          >
            {k}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShow({ active: true, expired: true, replaced: true, revoked: true })}
          className="rounded-lg border border-slate-700 px-2.5 py-1 text-slate-300 hover:border-slate-500"
        >
          все
        </button>
        <button
          type="button"
          onClick={() => setShow({ active: true, expired: false, replaced: false, revoked: false })}
          className="rounded-lg border border-slate-700 px-2.5 py-1 text-slate-300 hover:border-slate-500"
        >
          только active
        </button>
      </div>

      {/* даты + сорт + сброс */}
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <input
          type="datetime-local"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded-lg border border-slate-800 bg-slate-900 px-2 py-1"
        />
        <input
          type="datetime-local"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="rounded-lg border border-slate-800 bg-slate-900 px-2 py-1"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
          className="rounded-lg border border-slate-800 bg-slate-900 px-2 py-1"
        >
          <option value="created_desc">Новые сверху</option>
          <option value="created_asc">Новые снизу</option>
          <option value="expires_desc">По истечению ↓</option>
          <option value="expires_asc">По истечению ↑</option>
        </select>
        <button
          type="button"
          onClick={() => {
            setShow({ active: true, expired: false, replaced: false, revoked: false });
            setFrom('');
            setTo('');
            setSortBy('created_desc');
          }}
          className="rounded-lg border border-slate-700 px-2.5 py-1 hover:border-slate-500"
        >
          Сбросить фильтры
        </button>
      </div>

      <div className="space-y-2">
        {visibleSessions.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400">
            Нет сессий по выбранному фильтру
          </div>
        ) : (
          visibleSessions.map((s) => {
            const status = sessionStatus(s);
            return (
              <div key={s.tokenId} className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-xs">
                <div className="flex items-center justify-between">
                  <div className="font-mono text-slate-300 truncate">{s.ip || '—'}</div>
                  <span className={badgeClass(status)}>{status}</span>
                </div>
                <div className="mt-1 truncate text-slate-400">{s.ua || '—'}</div>
                <div className="mt-1 text-slate-500">
                  Создана: {fmt(s.createdAt)} · Истекает: {fmt(s.expiresAt)}
                  {s.revokedAt ? ` · Отозвана: ${fmt(s.revokedAt)}` : ''}
                  {s.replacedBy ? ` · Заменена` : ''}
                </div>
                <div className="mt-2 flex justify-end">
                  <button
                    disabled={busy === `sess:${s.tokenId}` || status !== 'active'}
                    onClick={() => onRevoke(s.tokenId)}
                    className="rounded-lg border border-red-800 px-2.5 py-1 text-[11px] text-red-300 hover:bg-red-900/20 disabled:opacity-50"
                  >
                    Завершить
                  </button>
                </div>
              </div>
            );
          })
        )}
        <div className="flex justify-end">
          <button
            onClick={onRefresh}
            className="rounded-lg border border-slate-700 px-2.5 py-1 text-[11px] hover:border-slate-500"
          >
            Обновить
          </button>
        </div>
      </div>
    </Card>
  );
}
