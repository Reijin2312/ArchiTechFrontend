import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { http } from '@/shared/api/http';
import { endpoints } from '@/shared/api/endpoints';
import { authStore } from '@/shared/store/auth';
import { useWallpaper } from '@/shared/ui/useWallpaper';
import { Seo } from '@/shared/seo/seo';

type Profile = {
  id: string;
  userId?: string;
  username: string;
  displayName: string;
  bio: string;
  location: string;
  website: string;
  birthDate?: string | null;
  avatarUrl: string;
  skinUrl: string;
  email?: string;
};

type Session = {
  tokenId: string;
  familyId: string;
  expiresAt: string;
  replacedBy: string | null;
  revokedAt: string | null;
  deviceId: string | null;
  ip: string | null;
  ua: string | null;
  createdAt: string;
};

type Status = 'active' | 'expired' | 'replaced' | 'revoked';

function sessionStatus(s: Session): Status {
  if (s.revokedAt) return 'revoked';
  if (s.replacedBy) return 'replaced';
  if (Date.parse(s.expiresAt) < Date.now()) return 'expired';
  return 'active';
}

export default function SettingsProfilePage() {
  useWallpaper();

  const nav = useNavigate();
  const location = useLocation();

  const [me, setMe] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [locationTxt, setLocationTxt] = useState('');
  const [website, setWebsite] = useState('');
  const [birthDate, setBirthDate] = useState(me?.birthDate ?? '');

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUrlInput, setAvatarUrlInput] = useState('');

  const [skinFile, setSkinFile] = useState<File | null>(null);
  const [skinUrlInput, setSkinUrlInput] = useState('');

  const [email, setEmail] = useState('');
  const [pwdDummy, setPwdDummy] = useState('');

  const [newUsername, setNewUsername] = useState('');
  const [usernameOk, setUsernameOk] = useState<boolean | null>(null);

  const [phone, setPhone] = useState('');
  const [phoneCode, setPhoneCode] = useState('');

  const [sessions, setSessions] = useState<Session[]>([]);

  const [delOpen, setDelOpen] = useState(false);
  const [delPwd, setDelPwd]   = useState('');
  const [delConfirm, setDelConfirm] = useState('');
  const [delBusy, setDelBusy] = useState(false);
  const [delErr, setDelErr]   = useState<string|null>(null);

  const [show, setShow] = useState<{ active: boolean; expired: boolean; replaced: boolean; revoked: boolean }>({
    active: true,
    expired: false,
    replaced: false,
    revoked: false,
  });
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  type SortKey = 'created_desc' | 'created_asc' | 'expires_desc' | 'expires_asc';
  const [sortBy, setSortBy] = useState<SortKey>('created_desc');

  const bust = (u: string) => u ? `${u}${u.includes('?') ? '&' : '?'}v=${Date.now()}` : u;

  function syncAuth(partial: Partial<{ avatarUrl: string; username: string }>) {
    authStore.setState(s => s.user ? { user: { ...s.user, ...partial } } : s);
  }

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);
    setNotice(null);
    (async () => {
      try {
        const meResp = await http.get<Profile>(endpoints.profileMe, { withCredentials: true });
        if (!alive) return;
        const p = meResp.data;
        setMe(p);
        setDisplayName(p.displayName ?? '');
        setBio(p.bio ?? '');
        setLocationTxt(p.location ?? '');
        setWebsite(p.website ?? '');
        setBirthDate(p.birthDate ?? '');
        setEmail(p.email ?? '');
        setNewUsername(p.username ?? '');
        try {
          const sessResp = await http.get<{ sessions: Session[] }>(endpoints.accountSessions, { withCredentials: true });
          if (alive) setSessions(sessResp.data.sessions || []);
        } catch {}
      } catch (e: any) {
        if (alive) setErr(e?.response?.data || e?.message || 'Ошибка загрузки');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const u = newUsername.trim().toLowerCase();
    if (!u || !me) {
      setUsernameOk(null);
      return;
    }
    if (u === (me.username || '').toLowerCase()) {
      setUsernameOk(true);
      return;
    }
    const re = /^[a-z0-9_]{3,20}$/;
    if (!re.test(u)) {
      setUsernameOk(false);
      return;
    }
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const { data, status } = await http.get(
          `/api/validate/username?username=${encodeURIComponent(u)}`,
          { withCredentials: true, signal: ctl.signal, validateStatus: () => true }
        );
        if (status === 200) setUsernameOk(data?.valid === true && data?.available === true);
        else if (status === 404) setUsernameOk(true);
        else setUsernameOk(false);
      } catch {
        setUsernameOk(null);
      }
    }, 300);
    return () => {
      ctl.abort();
      clearTimeout(t);
    };
  }, [newUsername, me]);

  const since = useMemo(() => {
    if (!sessions.length) return null;
    const created = sessions.reduce((min, s) => Math.min(min, Date.parse(s.createdAt)), Number.POSITIVE_INFINITY);
    if (!isFinite(created)) return null;
    try {
      return new Date(created).toLocaleDateString();
    } catch {
      return null;
    }
  }, [sessions]);

  const visibleSessions = useMemo(() => {
    let list = sessions.filter((s) => show[sessionStatus(s)]);
  
    const fromTs = from ? Date.parse(from) : -Infinity;
    const toTs = to ? Date.parse(to) : Infinity;
    list = list.filter((s) => {
      const t = Date.parse(s.createdAt);
      return t >= fromTs && t <= toTs;
    });
    
    const latest = new Map<string, Session>();
    for (const s of list) {
      const prev = latest.get(s.familyId);
      if (!prev || Date.parse(prev.createdAt) < Date.parse(s.createdAt)) latest.set(s.familyId, s);
    }
    list = Array.from(latest.values()).filter((s) => !s.replacedBy);
    
    const cmp = (a: Session, b: Session) => {
      const ca = Date.parse(a.createdAt),
        cb = Date.parse(b.createdAt);
      const ea = Date.parse(a.expiresAt),
        eb = Date.parse(b.expiresAt);
      switch (sortBy) {
        case 'created_asc':
          return ca - cb;
        case 'created_desc':
          return cb - ca;
        case 'expires_asc':
          return ea - eb;
        case 'expires_desc':
          return eb - ea;
      }
    };
    return list.sort(cmp);
  }, [sessions, show, from, to, sortBy]);

  async function saveProfile() {
    setBusy('profile');
    setNotice(null);
    setErr(null);
    try {
      await http.put(
        endpoints.profileMe,
        { displayName, bio, location: locationTxt, website, birthDate },
        { withCredentials: true, headers: { 'Content-Type': 'application/json' } }
      );
      setNotice('Профиль сохранён');
      const meResp = await http.get<Profile>(endpoints.profileMe, { withCredentials: true });
      setMe(meResp.data);
      if (!email && meResp.data.email) setEmail(meResp.data.email);
    } catch (e: any) {
      setErr(e?.response?.data || e?.message || 'Ошибка сохранения профиля');
    } finally {
      setBusy(null);
    }
  }

  async function logout() {
    try { await http.post('/api/auth/logout', null, { withCredentials: true }); } catch {}
    authStore.setState({ accessToken: null, user: null });
    nav('/auth/login', { replace: true });
  }

  async function deleteAccount() {
    if (delConfirm !== 'DELETE' || !delPwd) return;
    setDelBusy(true); setDelErr(null);
    try {
      const token = authStore.getState().accessToken;
      await http.delete('/api/v1/account', {
        withCredentials: false,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        data: { password: delPwd }
      });
      await logout();
    } catch (e: any) {
      const msg = e?.response?.data || e?.message || 'Не удалось удалить аккаунт';
      setDelErr(String(msg));
    } finally { setDelBusy(false); }
  }

  async function uploadAvatarFile() {
    if (!avatarFile) return;
    setBusy('avatar-file');
    setNotice(null);
    setErr(null);
    try {
      const fd = new FormData();
      fd.append('file', avatarFile);
      const { data } = await http.post<{ avatarUrl: string }>(endpoints.profileAvatar, fd, { withCredentials: true });
      setMe((m) => (m ? { ...m, avatarUrl: data.avatarUrl } : m));
      syncAuth({ avatarUrl: bust(data.avatarUrl) });
      setAvatarFile(null);
      setNotice('Аватар обновлён');
    } catch (e: any) {
      setErr(e?.response?.data || e?.message || 'Ошибка загрузки аватара');
    } finally {
      setBusy(null);
    }
  }

  async function uploadAvatarUrl() {
    const url = avatarUrlInput.trim();
    if (!url) return;
    setBusy('avatar-url');
    setNotice(null);
    setErr(null);
    try {
      const { data } = await http.post<{ avatarUrl: string }>(
        `${endpoints.profileAvatar}/url`,
        { url },
        { withCredentials: true, headers: { 'Content-Type': 'application/json' } }
      );
      setMe((m) => (m ? { ...m, avatarUrl: data.avatarUrl } : m));
      syncAuth({ avatarUrl: bust(data.avatarUrl) }); 
      setAvatarUrlInput('');
      setNotice('Аватар обновлён');
    } catch (e: any) {
      setErr(e?.response?.data || e?.message || 'Ошибка загрузки по URL');
    } finally {
      setBusy(null);
    }
  }

  async function uploadSkinFile() {
    if (!skinFile) return;
    setBusy('skin-file'); setNotice(null); setErr(null);
    try {
      const fd = new FormData();
      fd.append('file', skinFile);
      const { data } = await http.post<{ skinUrl: string }>(endpoints.profileSkin, fd, { withCredentials: true });
      setMe((m) => (m ? { ...m, skinUrl: data.skinUrl } : m));
      setSkinFile(null);
      setNotice('Скин обновлён');
    } catch (e: any) {
      setErr(e?.response?.data || e?.message || 'Ошибка загрузки скина');
    } finally { setBusy(null); }
  }

  async function uploadSkinUrl() {
    const url = skinUrlInput.trim();
    if (!url) return;
    setBusy('skin-url'); setNotice(null); setErr(null);
    try {
      const { data } = await http.post<{ skinUrl: string }>(
        endpoints.profileSkinUrl,
        { url },
        { withCredentials: true, headers: { 'Content-Type': 'application/json' } }
      );
      setMe((m) => (m ? { ...m, skinUrl: data.skinUrl } : m));
      setSkinUrlInput('');
      setNotice('Скин обновлён');
    } catch (e: any) {
      setErr(e?.response?.data || e?.message || 'Ошибка загрузки по URL');
    } finally { setBusy(null); }
  }

  async function changeUsername() {
    const u = newUsername.trim().toLowerCase();
    if (!u || usernameOk !== true) return;
    if (u === (me?.username || '').toLowerCase()) {
      setNotice('Логин уже установлен');
      return;
    }
    setBusy('username');
    setErr(null);
    try {
      const { status, data } = await http.post(
        endpoints.accountUsernameChange,
        { username: u },
        { withCredentials: true, headers: { 'Content-Type': 'application/json' }, validateStatus: () => true }
      );
      if (status === 200) {
        setNotice('Логин обновлён');
        nav(`/u/${encodeURIComponent(u)}`, { replace: true });
        return;
      }
      if (status === 409) {
        setUsernameOk(false);
        setErr(data?.message || 'Логин уже занят');
        return;
      }
      if (status === 400) {
        setUsernameOk(false);
        setErr(data?.message || 'Некорректное имя пользователя');
        return;
      }
      if (status === 401 || status === 403) {
        setErr('Нужен вход в аккаунт');
        return;
      }
      setErr(data?.message || `Ошибка смены логина (${status})`);
    } finally {
      setBusy(null);
    }
  }

  async function bindPhone() {
    if (!phone?.trim()) return;
    setBusy('phone');
    setNotice(null);
    setErr(null);
    try {
      await http.post(
        endpoints.accountPhoneBind,
        { phone: phone.trim() },
        { withCredentials: true, headers: { 'Content-Type': 'application/json' } }
      );
      setNotice('Код отправлен. Введите код подтверждения ниже.');
    } catch (e: any) {
      setErr(e?.response?.data || e?.message || 'Ошибка привязки телефона');
    } finally {
      setBusy(null);
    }
  }

  async function verifyPhone() {
    if (!phoneCode?.trim()) return;
    setBusy('phone-verify');
    setNotice(null);
    setErr(null);
    try {
      await http.post(
        endpoints.accountPhoneVerify,
        { code: phoneCode.trim() },
        { withCredentials: true, headers: { 'Content-Type': 'application/json' } }
      );
      setNotice('Телефон подтверждён');
      setPhoneCode('');
    } catch (e: any) {
      setErr(e?.response?.data || e?.message || 'Ошибка подтверждения телефона');
    } finally {
      setBusy(null);
    }
  }

  async function refreshSessions() {
    try {
      const resp = await http.get<{ sessions: Session[] }>(endpoints.accountSessions, { withCredentials: true });
      setSessions(resp.data.sessions || []);
    } catch {}
  }

  async function revokeSession(tokenId: string) {
    setBusy(`sess:${tokenId}`);
    setErr(null);
    try {
      await http.delete(`${endpoints.accountSessions}/${encodeURIComponent(tokenId)}`, { withCredentials: true });
      await refreshSessions();
    } catch (e: any) {
      setErr(e?.response?.data || e?.message || 'Ошибка завершения сессии');
    } finally {
      setBusy(null);
    }
  }

  async function exportAccount() {
    setBusy('export');
    setErr(null);
    try {
      const { data } = await http.get<any>(endpoints.accountExport, { withCredentials: true });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'account-export.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setErr(e?.response?.data || e?.message || 'Ошибка экспорта');
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
    <Seo title="Настройки — ArchiTech MC" robots="noindex,follow" />
    <div className="min-h-dvh flex flex-col">
      <main className="mx-auto grid w-full max-w-6xl grow grid-cols-12 gap-6 px-4 py-6">
        {/* Левый столбец */}
        <section className="col-span-12 md:col-span-4">
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-sky-300">Аватар</h2>
            <div className="flex items-center gap-4">
              <div className="h-28 w-28 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
                {loading ? (
                  <div className="h-full w-full animate-pulse bg-slate-800" />
                ) : (
                  <img src={me?.avatarUrl} alt="avatar" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm file:mr-3 file:rounded-lg file:border file:border-slate-700 file:bg-slate-900 file:px2 file:py-1.5 file:text-sm hover:file:border-slate-500"
                />
                <button
                  disabled={!avatarFile || busy === 'avatar-file'}
                  onClick={uploadAvatarFile}
                  className="rounded-xl border border-slate-700 px-3 py-1.5 text-sm hover:border-slate-500 disabled:opacity-50"
                >
                  Загрузить файл
                </button>
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-xs text-slate-400">URL картинки</label>
              <div className="flex gap-2">
                <input
                  value={avatarUrlInput}
                  onChange={(e) => setAvatarUrlInput(e.target.value)}
                  placeholder="https://…"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-slate-600"
                />
                <button
                  disabled={!avatarUrlInput || busy === 'avatar-url'}
                  onClick={uploadAvatarUrl}
                  className="rounded-xl border border-slate-700 px-3 py-2 text-sm hover:border-slate-500 disabled:opacity-50"
                >
                  Применить
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-500">До 2 МБ. PNG/JPG, обрежется до квадрата 512×512.</p>
            </div>
          </Card>

          <Card className="mt-6">
            <h2 className="mb-3 text-sm font-semibold text-sky-300">Скин</h2>
            <div className="flex items-center gap-4">
              <div className="h-28 w-28 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
                {loading ? (
                  <div className="h-full w-full animate-pulse bg-slate-800" />
                ) : (
                  <img src={me?.skinUrl} alt="skin" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSkinFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm file:mr-3 file:rounded-lg file:border file:border-slate-700 file:bg-slate-900 file:px2 file:py-1.5 file:text-sm hover:file:border-slate-500"
                />
                <button
                  disabled={!skinFile || busy === 'skin-file'}
                  onClick={uploadSkinFile}
                  className="rounded-xl border border-slate-700 px-3 py-1.5 text-sm hover:border-slate-500 disabled:opacity-50"
                >
                  Загрузить файл
                </button>
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-xs text-slate-400">URL картинки</label>
              <div className="flex gap-2">
                <input
                  value={skinUrlInput}
                  onChange={(e) => setSkinUrlInput(e.target.value)}
                  placeholder="https://…"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-slate-600"
                />
                <button
                  disabled={!skinUrlInput || busy === 'skin-url'}
                  onClick={uploadSkinUrl}
                  className="rounded-xl border border-slate-700 px-3 py-2 text-sm hover:border-slate-500 disabled:opacity-50"
                >
                  Применить
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-500">До 2 МБ. PNG/JPG. Без обрезки.</p>
            </div>
          </Card>

          <Card className="mt-6">
            <h2 className="mb-3 text-sm font-semibold text-sky-300">Сессии</h2>

            {/* фильтры статусов */}
            <div className="mb-3 flex flex-wrap gap-2 text-xs">
              {(['active', 'expired', 'replaced', 'revoked'] as Status[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setShow((prev) => ({ ...prev, [k]: !prev[k] }))}
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
                          onClick={() => revokeSession(s.tokenId)}
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
                  onClick={refreshSessions}
                  className="rounded-lg border border-slate-700 px-2.5 py-1 text-[11px] hover:border-slate-500"
                >
                  Обновить
                </button>
              </div>
            </div>
          </Card>

          <Card className="mt-6">
            <h2 className="mb-3 text-sm font-semibold text-sky-300">Экспорт аккаунта</h2>
            <button
              disabled={busy === 'export'}
              onClick={exportAccount}
              className="rounded-xl border border-slate-700 px-3 py-1.5 text-sm hover:border-slate-500 disabled:opacity-50"
            >
              Скачать JSON
            </button>
          </Card>
        </section>

        {/* Правый столбец */}
        <section className="col-span-12 md:col-span-8">
          <Card>
            <h2 className="mb-4 text-sm font-semibold text-sky-300">Профиль</h2>

            <InputRow label="Отображаемое имя">
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={inp()} />
            </InputRow>

            <InputRow label="О себе">
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} className={inp()} />
            </InputRow>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <InputRow label="Город/местоположение">
                <input value={locationTxt} onChange={(e) => setLocationTxt(e.target.value)} className={inp()} />
              </InputRow>
              <InputRow label="Сайт">
                <input value={website} onChange={(e) => setWebsite(e.target.value)} className={inp()} placeholder="https://…" />
              </InputRow>
            </div>

            <InputRow label="Дата рождения">
              <input
                type="date"
                value={birthDate || ""}
                onChange={(e) => setBirthDate(e.target.value || "")}
                className={inp()}
                min="1900-01-01"
                max={new Date().toISOString().slice(0, 10)}
              />
            </InputRow>

            <div className="mt-4 flex justify-end">
              <button
                disabled={busy === 'profile'}
                onClick={saveProfile}
                className="rounded-xl border border-slate-700 px-3 py-1.5 text-sm hover:border-slate-500 disabled:opacity-50"
              >
                Сохранить профиль
              </button>
            </div>
          </Card>

          <Card className="mt-6">
            <h2 className="mb-4 text-sm font-semibold text-sky-300">Учётная запись</h2>

            <InputRow label="Email">
              <div className="flex w-full items-center gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  className={inp()}
                />
                <button
                  type="button"
                  onClick={() => nav('/settings/email')}
                  className="whitespace-nowrap rounded-xl border border-slate-700 px-3 py-2 text-sm hover:border-slate-500"
                >
                  Изменить
                </button>
              </div>
            </InputRow>

            <InputRow label="Пароль">
              <div className="flex w-full items-center gap-2">
                <input
                  type="password"
                  value={pwdDummy}
                  onChange={(e) => setPwdDummy(e.target.value)}
                  placeholder="••••••••"
                  className={inp()}
                />
                <button
                  type="button"
                  disabled={busy === 'pwd'}
                  onClick={async () => {
                    setErr(null);
                    const emailVal = (email || '').trim();
                    if (!emailVal) {
                      setErr('Введите email для сброса пароля');
                      return;
                    }
                    setBusy('pwd');
                    try {
                      const next = location.pathname + (location.search || '') || '/profile';
                      const { data } = await http.post(
                        endpoints.resetBegin,
                        { email: emailVal },
                        { withCredentials: true, headers: { 'Content-Type': 'application/json' } }
                      );
                      const qs = new URLSearchParams({ ticket: data.ticket, email: emailVal, next }).toString();
                      nav('/auth/reset/code?' + qs, { replace: true });
                    } catch (e: any) {
                      setErr(e?.response?.data || e?.message || 'Не удалось начать сброс пароля');
                    } finally {
                      setBusy(null);
                    }
                  }}
                  className="whitespace-nowrap rounded-xl border border-slate-700 px-3 py-2 text-sm hover:border-slate-500 disabled:opacity-50"
                >
                  Изменить
                </button>
              </div>
            </InputRow>

            <InputRow label="Логин">
              <div className="flex w-full items-center gap-2">
                <input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className={inp()} />
                <button
                  disabled={
                    busy === 'username' ||
                    !newUsername.trim() ||
                    usernameOk !== true ||
                    newUsername.trim().toLowerCase() === (me?.username || '').toLowerCase()
                  }
                  onClick={changeUsername}
                  className="whitespace-nowrap rounded-xl border border-slate-700 px-3 py-2 text-sm hover:border-slate-500 disabled:opacity-50"
                >
                  Сменить
                </button>
              </div>
              {usernameOk === false && <p className="mt-1 text-xs text-red-400">Логин занят или некорректен</p>}
              {usernameOk === true && newUsername.toLowerCase() !== (me?.username || '').toLowerCase() && (
                <p className="mt-1 text-xs text-green-400">Доступен</p>
              )}
            </InputRow>
          </Card>

          {/* Телефон */}
          <Card className="mt-6">
            <h2 className="mb-4 text-sm font-semibold text-sky-300">Телефон</h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <InputRow label="Номер">
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+49 151 2345678"
                  className={inp()}
                />
              </InputRow>
              <div className="flex items-end">
                <button
                  disabled={busy === 'phone' || !phone.trim()}
                  onClick={bindPhone}
                  className="h-10 rounded-xl border border-slate-700 px-3 text-sm hover:border-slate-500 disabled:opacity-50"
                >
                  Отправить код
                </button>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
              <InputRow label="Код подтверждения">
                <input
                  value={phoneCode}
                  onChange={(e) => setPhoneCode(e.target.value)}
                  placeholder="123456"
                  className={inp()}
                />
              </InputRow>
              <div className="flex items-end">
                <button
                  disabled={busy === 'phone-verify' || !phoneCode.trim()}
                  onClick={verifyPhone}
                  className="h-10 rounded-xl border border-slate-700 px-3 text-sm hover:border-slate-500 disabled:opacity-50"
                >
                  Подтвердить телефон
                </button>
              </div>
            </div>
          </Card>

          <Card className="mt-6">
            <h2 className="mb-4 text-sm font-semibold text-red-300">Опасная зона</h2>

            <div className="space-y-3">
              <button
                onClick={logout}
                className="w-full rounded-xl border border-red-800 px-3 py-2 text-sm text-red-300 hover:bg-red-900/20"
              >
                Выйти из аккаунта
              </button>

              <div className="rounded-xl border border-red-900/60 bg-red-950/20 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-red-300">Удалить аккаунт</div>
                    <div className="text-xs text-red-400/80">Действие необратимо! Восстановить аккаунт после удаления невозможно.</div>
                  </div>
                  <button
                    onClick={() => setDelOpen(true)}
                    className="rounded-lg border border-red-800 px-3 py-2 text-sm text-red-300 hover:bg-red-900/20"
                  >
                    Удалить…
                  </button>
                </div>
              </div>
            </div>
          </Card>

          {err && <div className="mt-6 rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300 backdrop-blur-md backdrop-saturate-150">{String(err)}</div>}
          {notice && <div className="mt-3 rounded-xl border border-sky-800 bg-sky-950/40 p-3 text-sm text-sky-300 backdrop-blur-md backdrop-saturate-150">{notice}</div>}
          {since && <div className="mt-3 text-center text-xs text-slate-500">Вы с нами с {since}</div>}
        </section>

        {delOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={() => setDelOpen(false)} />
            <div className="relative z-10 w-[520px] max-w-[95vw] rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-xl">
              <h3 className="mb-2 text-base font-semibold text-red-300">Удалить аккаунт</h3>
              <p className="mb-4 text-sm text-slate-300">
                Это действие необратимо. Введите <b>DELETE</b> и пароль для подтверждения.
              </p>

              <div className="mb-3">
                <label className="mb-1 block text-xs text-slate-400">Подтверждение</label>
                <input
                  value={delConfirm}
                  onChange={(e) => setDelConfirm(e.target.value)}
                  placeholder="DELETE"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-slate-500"
                />
              </div>

              <div className="mb-3">
                <label className="mb-1 block text-xs text-slate-400">Пароль</label>
                <input
                  type="password"
                  value={delPwd}
                  onChange={(e) => setDelPwd(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-slate-500"
                />
              </div>

              {delErr && <div className="mb-3 rounded-xl border border-red-800 bg-red-950/40 p-2 text-sm text-red-300">{delErr}</div>}

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setDelOpen(false)}
                  className="rounded-xl border border-slate-700 px-3 py-2 text-sm hover:border-slate-500"
                >
                  Отмена
                </button>
                <button
                  onClick={deleteAccount}
                  disabled={delBusy || delConfirm !== 'DELETE' || !delPwd}
                  className="rounded-xl border border-red-800 px-3 py-2 text-sm text-red-300 hover:bg-red-900/20 disabled:opacity-50"
                >
                  {delBusy ? 'Удаляю…' : 'Удалить'}
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
    </>
  );
}

function Card(props: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-[0_1px_0_#ffffff10_inset,0_20px_40px_-20px_#000 backdrop-blur-md backdrop-saturate-150] ${props.className || ''}`}>
      {props.children}
    </section>
  );
}

function InputRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="mb-1 block text-xs text-slate-400">{label}</label>
      {children}
    </div>
  );
}

function inp() {
  return 'w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-slate-600';
}

function fmt(x?: string) {
  if (!x) return '—';
  try {
    return new Date(x).toLocaleString();
  } catch {
    return x!;
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