// src/pages/SettingsProfilePage.tsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { http } from '@/shared/api/http';
import { endpoints } from '@/shared/api/endpoints';

type Profile = {
  id: string;
  userId?: string;
  username: string;
  displayName: string;
  bio: string;
  location: string;
  website: string;
  social: string; // JSON string
  avatarUrl: string;
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

export default function SettingsProfilePage() {
  const nav = useNavigate();

  // base
  const [me, setMe] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // profile form
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [social, setSocial] = useState(''); // raw JSON

  // avatar
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUrlInput, setAvatarUrlInput] = useState('');

  // account
  const [newUsername, setNewUsername] = useState('');
  const [usernameOk, setUsernameOk] = useState<boolean | null>(null);

  const [newEmail, setNewEmail] = useState('');
  const [emailOk, setEmailOk] = useState<boolean | null>(null);
  const [emailCode, setEmailCode] = useState('');

  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [newPwd2, setNewPwd2] = useState('');

  // phone
  const [phone, setPhone] = useState('');
  const [phoneCode, setPhoneCode] = useState('');

  // sessions
  const [sessions, setSessions] = useState<Session[]>([]);

  // bootstrap
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);
    setNotice(null);
    (async () => {
      try {
        const meResp = await http.get<Profile>(endpoints.profileMe); // GET /api/v1/profile
        if (!alive) return;
        const p = meResp.data;
        setMe(p);
        setDisplayName(p.displayName ?? '');
        setBio(p.bio ?? '');
        setLocation(p.location ?? '');
        setWebsite(p.website ?? '');
        setSocial(p.social ?? '{}');
        setNewUsername(p.username ?? '');

        try {
          const sessResp = await http.get<{ sessions: Session[] }>(endpoints.accountSessions); // GET /api/v1/account/sessions
          if (alive) setSessions(sessResp.data.sessions || []);
        } catch { /* optional */ }
      } catch (e: any) {
        if (alive) setErr(e?.response?.data || e?.message || 'Ошибка загрузки');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // live username check
  useEffect(() => {
    const u = newUsername?.trim();
    if (!u || !me) { setUsernameOk(null); return; }
    if (u === me.username) { setUsernameOk(true); return; }
    const ctl = new AbortController();
    const run = async () => {
      try {
        const { data } = await http.get<{ ok: boolean }>(`/api/validate/username?value=${encodeURIComponent(u)}`, { signal: ctl.signal });
        setUsernameOk(!!data.ok);
      } catch { setUsernameOk(null); }
    };
    const t = setTimeout(run, 300);
    return () => { ctl.abort(); clearTimeout(t); };
  }, [newUsername, me]);

  // live email check
  useEffect(() => {
    const m = newEmail?.trim();
    if (!m) { setEmailOk(null); return; }
    const ctl = new AbortController();
    const run = async () => {
      try {
        const { data } = await http.get<{ ok: boolean }>(`/api/validate/email?value=${encodeURIComponent(m)}`, { signal: ctl.signal });
        setEmailOk(!!data.ok);
      } catch { setEmailOk(null); }
    };
    const t = setTimeout(run, 300);
    return () => { ctl.abort(); clearTimeout(t); };
  }, [newEmail]);

  const since = useMemo(() => {
    if (!sessions.length) return null;
    const created = sessions.reduce((min, s) => Math.min(min, Date.parse(s.createdAt)), Number.POSITIVE_INFINITY);
    if (!isFinite(created)) return null;
    try { return new Date(created).toLocaleDateString(); } catch { return null; }
  }, [sessions]);

  // actions
  async function saveProfile() {
    setBusy('profile'); setNotice(null); setErr(null);
    try {
      if (social?.trim()) JSON.parse(social);
    } catch {
      setBusy(null);
      setErr('Поле social должно быть корректным JSON');
      return;
    }
    try {
      await http.put(endpoints.profileMe, { displayName, bio, location, website, social: social || '{}' }); // PUT /api/v1/profile
      setNotice('Профиль сохранён');
      const meResp = await http.get<Profile>(endpoints.profileMe);
      setMe(meResp.data);
    } catch (e: any) {
      setErr(e?.response?.data || e?.message || 'Ошибка сохранения профиля');
    } finally {
      setBusy(null);
    }
  }

  async function uploadAvatarFile() {
    if (!avatarFile) return;
    setBusy('avatar-file'); setNotice(null); setErr(null);
    try {
      const fd = new FormData();
      fd.append('file', avatarFile);
      // ВАЖНО: не указывать Content-Type вручную, чтобы браузер проставил boundary.
      const { data } = await http.post<{ avatarUrl: string }>(endpoints.profileAvatar, fd); // POST /api/v1/profile/avatar
      setMe((m) => m ? { ...m, avatarUrl: data.avatarUrl } : m);
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
    setBusy('avatar-url'); setNotice(null); setErr(null);
    try {
      const { data } = await http.post<{ avatarUrl: string }>(`${endpoints.profileAvatar}/url`, { url }); // POST /api/v1/profile/avatar/url
      setMe((m) => m ? { ...m, avatarUrl: data.avatarUrl } : m);
      setAvatarUrlInput('');
      setNotice('Аватар обновлён');
    } catch (e: any) {
      setErr(e?.response?.data || e?.message || 'Ошибка загрузки по URL');
    } finally {
      setBusy(null);
    }
  }

  async function changeUsername() {
    if (!newUsername?.trim() || usernameOk === false) return;
    setBusy('username'); setNotice(null); setErr(null);
    try {
      await http.post(endpoints.accountUsernameChange, { username: newUsername.trim() }); // /api/v1/account/username/change
      setNotice('Логин обновлён');
      nav(`/u/${encodeURIComponent(newUsername.trim())}`, { replace: true });
    } catch (e: any) {
      setErr(e?.response?.data || e?.message || 'Ошибка смены логина');
    } finally {
      setBusy(null);
    }
  }

  async function changeEmail() {
    if (!newEmail?.trim() || emailOk === false) return;
    setBusy('email'); setNotice(null); setErr(null);
    try {
      await http.post(endpoints.accountEmailChange, { email: newEmail.trim() }); // begin /api/v1/account/email/change
      setNotice('Код отправлен на почту. Введите код ниже и подтвердите.');
    } catch (e: any) {
      setErr(e?.response?.data || e?.message || 'Ошибка запроса смены email');
    } finally {
      setBusy(null);
    }
  }

  async function confirmEmail() {
    if (!emailCode?.trim()) return;
    setBusy('email-confirm'); setNotice(null); setErr(null);
    try {
      await http.post(endpoints.accountEmailConfirm, { code: emailCode.trim() }); // /api/v1/account/email/confirm
      setNotice('Email подтверждён');
    } catch (e: any) {
      setErr(e?.response?.data || e?.message || 'Неверный или просроченный код');
    } finally {
      setBusy(null);
    }
  }

  async function changePassword() {
    if (!oldPwd || !newPwd || newPwd !== newPwd2) {
      setErr('Проверьте пароль и подтверждение'); return;
    }
    setBusy('password'); setNotice(null); setErr(null);
    try {
      await http.post(endpoints.accountPasswordChange, { oldPassword: oldPwd, newPassword: newPwd }); // /api/v1/account/password/change
      setNotice('Пароль обновлён');
      setOldPwd(''); setNewPwd(''); setNewPwd2('');
    } catch (e: any) {
      setErr(e?.response?.data || e?.message || 'Ошибка смены пароля');
    } finally {
      setBusy(null);
    }
  }

  async function bindPhone() {
    if (!phone?.trim()) return;
    setBusy('phone'); setNotice(null); setErr(null);
    try {
      await http.post(endpoints.accountPhoneBind, { phone: phone.trim() }); // /api/v1/account/phone/bind
      setNotice('Код отправлен. Введите код подтверждения ниже.');
    } catch (e: any) {
      setErr(e?.response?.data || e?.message || 'Ошибка привязки телефона');
    } finally {
      setBusy(null);
    }
  }

  async function verifyPhone() {
    if (!phoneCode?.trim()) return;
    setBusy('phone-verify'); setNotice(null); setErr(null);
    try {
      await http.post(endpoints.accountPhoneVerify, { code: phoneCode.trim() }); // /api/v1/account/phone/verify
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
      const resp = await http.get<{ sessions: Session[] }>(endpoints.accountSessions);
      setSessions(resp.data.sessions || []);
    } catch { /* ignore */ }
  }

  async function revokeSession(tokenId: string) {
    setBusy(`sess:${tokenId}`); setErr(null);
    try {
      await http.delete(`${endpoints.accountSessions}/${encodeURIComponent(tokenId)}`); // DELETE /api/v1/account/sessions/{tokenId}
      await refreshSessions();
    } catch (e: any) {
      setErr(e?.response?.data || e?.message || 'Ошибка завершения сессии');
    } finally {
      setBusy(null);
    }
  }

  async function exportAccount() {
    setBusy('export'); setErr(null);
    try {
      const { data } = await http.get<any>(endpoints.accountExport); // /api/v1/account/export
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'account-export.json'; a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setErr(e?.response?.data || e?.message || 'Ошибка экспорта');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-dvh bg-slate-950 text-slate-100 flex flex-col">
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
                  className="block w-full text-sm file:mr-3 file:rounded-lg file:border file:border-slate-700 file:bg-slate-900 file:px-3 file:py-1.5 file:text-sm hover:file:border-slate-500"
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
            <h2 className="mb-3 text-sm font-semibold text-sky-300">Сессии</h2>
            <div className="space-y-2">
              {sessions.length === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400">Нет активных сессий</div>
              ) : (
                sessions.map((s) => {
                  const status = s.revokedAt
                    ? 'revoked'
                    : s.replacedBy
                      ? 'replaced'
                      : Date.parse(s.expiresAt) < Date.now()
                        ? 'expired'
                        : 'active';
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
                <input value={location} onChange={(e) => setLocation(e.target.value)} className={inp()} />
              </InputRow>
              <InputRow label="Сайт">
                <input value={website} onChange={(e) => setWebsite(e.target.value)} className={inp()} placeholder="https://…" />
              </InputRow>
            </div>

            <InputRow label="Social JSON">
              <textarea
                value={social}
                onChange={(e) => setSocial(e.target.value)}
                rows={5}
                spellCheck={false}
                className={`${inp()} font-mono`}
                placeholder='{"tg":"@name","gh":"user"}'
              />
              <p className="mt-1 text-xs text-slate-500">Ключи и ссылки в формате JSON.</p>
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

            <InputRow label="Логин">
              <div className="flex w-full items-center gap-2">
                <input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className={inp()} />
                <button
                  disabled={busy === 'username' || !newUsername?.trim() || usernameOk === false}
                  onClick={changeUsername}
                  className="whitespace-nowrap rounded-xl border border-slate-700 px-3 py-1.5 text-sm hover:border-slate-500 disabled:opacity-50"
                >
                  Сменить
                </button>
              </div>
              {usernameOk === false && <p className="mt-1 text-xs text-red-400">Логин занят или некорректен</p>}
              {usernameOk === true && newUsername !== me?.username && <p className="mt-1 text-xs text-green-400">Доступен</p>}
            </InputRow>

            <InputRow label="Email">
              <div className="flex w-full items-center gap-2">
                <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className={inp()} />
                <button
                  disabled={busy === 'email' || !newEmail?.trim() || emailOk === false}
                  onClick={changeEmail}
                  className="whitespace-nowrap rounded-xl border border-slate-700 px-3 py-1.5 text-sm hover:border-slate-500 disabled:opacity-50"
                >
                  Отправить код
                </button>
              </div>
              {emailOk === false && <p className="mt-1 text-xs text-red-400">Email уже используется или некорректен</p>}

              <div className="mt-3 flex items-center gap-2">
                <input
                  value={emailCode}
                  onChange={(e) => setEmailCode(e.target.value)}
                  placeholder="Код из письма"
                  className={inp()}
                />
                <button
                  disabled={busy === 'email-confirm' || !emailCode?.trim()}
                  onClick={confirmEmail}
                  className="whitespace-nowrap rounded-xl border border-slate-700 px-3 py-1.5 text-sm hover:border-slate-500 disabled:opacity-50"
                >
                  Подтвердить
                </button>
              </div>
            </InputRow>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <InputRow label="Текущий пароль">
                <input type="password" value={oldPwd} onChange={(e) => setOldPwd(e.target.value)} className={inp()} />
              </InputRow>
              <InputRow label="Новый пароль">
                <input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} className={inp()} />
              </InputRow>
              <InputRow label="Повторите пароль">
                <input type="password" value={newPwd2} onChange={(e) => setNewPwd2(e.target.value)} className={inp()} />
              </InputRow>
            </div>

            <div className="mt-2 flex justify-end">
              <button
                disabled={busy === 'password'}
                onClick={changePassword}
                className="rounded-xl border border-slate-700 px-3 py-1.5 text-sm hover:border-slate-500 disabled:opacity-50"
              >
                Сменить пароль
              </button>
            </div>
          </Card>

          <Card className="mt-6">
            <h2 className="mb-4 text-sm font-semibold text-sky-300">Телефон</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <InputRow label="Номер">
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+49…" className={inp()} />
              </InputRow>
              <div className="flex items-end">
                <button
                  disabled={busy === 'phone' || !phone?.trim()}
                  onClick={bindPhone}
                  className="h-10 rounded-xl border border-slate-700 px-3 text-sm hover:border-slate-500 disabled:opacity-50"
                >
                  Отправить код
                </button>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
              <InputRow label="Код подтверждения">
                <input value={phoneCode} onChange={(e) => setPhoneCode(e.target.value)} className={inp()} />
              </InputRow>
              <div className="flex items-end">
                <button
                  disabled={busy === 'phone-verify' || !phoneCode?.trim()}
                  onClick={verifyPhone}
                  className="h-10 rounded-xl border border-slate-700 px-3 text-sm hover:border-slate-500 disabled:opacity-50"
                >
                  Подтвердить телефон
                </button>
              </div>
            </div>
          </Card>

          {err && (
            <div className="mt-6 rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">{String(err)}</div>
          )}
          {notice && (
            <div className="mt-3 rounded-xl border border-sky-800 bg-sky-950/40 p-3 text-sm text-sky-300">{notice}</div>
          )}
          {since && (
            <div className="mt-3 text-center text-xs text-slate-500">Вы с нами с {since}</div>
          )}
        </section>
      </main>
    </div>
  );
}

/* ===== UI helpers ===== */

function Card(props: { children: React.ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-[0_1px_0_#ffffff10_inset,0_20px_40px_-20px_#000] ${props.className || ''}`}
    >
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
  try { return new Date(x).toLocaleString(); } catch { return x; }
}

function badgeClass(status: 'active' | 'expired' | 'replaced' | 'revoked' | string) {
  switch (status) {
    case 'active':   return 'rounded-md border border-green-800 px-2 py-0.5 text-green-400';
    case 'expired':  return 'rounded-md border border-slate-700 px-2 py-0.5 text-slate-400';
    case 'replaced': return 'rounded-md border border-amber-800 px-2 py-0.5 text-amber-300';
    case 'revoked':  return 'rounded-md border border-red-800 px-2 py-0.5 text-red-300';
    default:         return 'rounded-md border border-slate-700 px-2 py-0.5 text-slate-400';
  }
}
