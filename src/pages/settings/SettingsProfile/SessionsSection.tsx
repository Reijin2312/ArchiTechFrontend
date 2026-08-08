import React from 'react';
import { Card } from './components';
import type { Session, Status, SortKey, SessionFilters } from './types';
import { useI18n } from '@/shared/i18n/I18nProvider';
import { profileTranslations } from '@/shared/i18n/profileTranslations';

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

function fmt(x: string | undefined, language: 'ru' | 'en') {
  if (!x) return '—';
  try {
    return new Date(x).toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return x;
  }
}

function parseDeviceName(ua: string | null | undefined, unknownDevice: string): string {
  if (!ua) return unknownDevice;
  
  if (ua.includes('Windows NT 10')) return 'Windows 10/11';
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac OS X')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  
  return unknownDevice;
}

function parseBrowser(ua?: string | null): string {
  if (!ua) return '';
  
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('Chrome/')) return 'Chrome';
  if (ua.includes('Firefox/')) return 'Firefox';
  if (ua.includes('Safari/') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Opera') || ua.includes('OPR/')) return 'Opera';
  
  return '';
}

function getDeviceIcon(ua?: string | null): string {
  if (!ua) return '🖥️';
  
  if (ua.includes('Windows')) return '🪟';
  if (ua.includes('Mac')) return '🍎';
  if (ua.includes('Linux')) return '🐧';
  if (ua.includes('Android')) return '📱';
  if (ua.includes('iPhone') || ua.includes('iPad')) return '📱';
  
  return '🖥️';
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
  const { language } = useI18n();
  const copy = profileTranslations[language].settings;
  return (
    <Card className="mt-6">
      <h2 className="mb-3 text-sm font-semibold text-sky-300">{copy.sessions}</h2>

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
          {copy.all}
        </button>
        <button
          type="button"
          onClick={() => setShow({ active: true, expired: false, replaced: false, revoked: false })}
          className="rounded-lg border border-slate-700 px-2.5 py-1 text-slate-300 hover:border-slate-500"
        >
          {copy.activeOnly}
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
          <option value="created_desc">{copy.newestFirst}</option>
          <option value="created_asc">{copy.newestLast}</option>
          <option value="expires_desc">{copy.expiresDesc}</option>
          <option value="expires_asc">{copy.expiresAsc}</option>
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
          {copy.resetFilters}
        </button>
      </div>

      <div className="space-y-2">
        {visibleSessions.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400">
            {copy.noSessions}
          </div>
        ) : (
          visibleSessions.map((s) => {
            const status = sessionStatus(s);
            const deviceName = parseDeviceName(s.ua, copy.unknownDevice);
            const browser = parseBrowser(s.ua);
            const deviceIcon = getDeviceIcon(s.ua);
            
            return (
              <div key={s.tokenId} className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-xs hover:border-slate-700 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{deviceIcon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-200 flex items-center gap-2">
                          {deviceName}
                          {browser && (
                            <span className="text-slate-400 font-normal">· {browser}</span>
                          )}
                        </div>
                        {s.deviceId && (
                          <div className="text-slate-500 font-mono text-[10px] truncate mt-0.5">
                            ID: {s.deviceId}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {s.ip && (
                      <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                        <span>📍</span>
                        <span className="font-mono">{s.ip}</span>
                      </div>
                    )}
                    
                    <div className="text-slate-500 space-y-0.5 mt-2">
                      <div>🕐 {copy.created} {fmt(s.createdAt, language)}</div>
                      <div>⏰ {copy.expires} {fmt(s.expiresAt, language)}</div>
                      {s.revokedAt && <div>🚫 {copy.revoked} {fmt(s.revokedAt, language)}</div>}
                      {s.replacedBy && <div>🔄 {copy.replaced}</div>}
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    <span className={badgeClass(status)}>{status}</span>
                    {status === 'active' && (
                      <button
                        disabled={busy === `sess:${s.tokenId}`}
                        onClick={() => onRevoke(s.tokenId)}
                        className="rounded-lg border border-red-800 px-3 py-1.5 text-[11px] text-red-300 hover:bg-red-900/20 disabled:opacity-50 transition-colors"
                      >
                        {busy === `sess:${s.tokenId}` ? copy.ending : copy.end}
                      </button>
                    )}
                  </div>
                </div>
                
                {s.ua && (
                  <details className="mt-3 pt-3 border-t border-slate-800">
                    <summary className="cursor-pointer text-slate-500 hover:text-slate-400 text-[10px]">
                      User Agent
                    </summary>
                    <div className="mt-2 p-2 bg-slate-950 rounded text-[10px] font-mono text-slate-400 break-all">
                      {s.ua}
                    </div>
                  </details>
                )}
              </div>
            );
          })
        )}
        <div className="flex justify-end">
          <button
            onClick={onRefresh}
            className="rounded-lg border border-slate-700 px-2.5 py-1 text-[11px] hover:border-slate-500"
          >
            🔄 {copy.refresh}
          </button>
        </div>
      </div>
    </Card>
  );
}
