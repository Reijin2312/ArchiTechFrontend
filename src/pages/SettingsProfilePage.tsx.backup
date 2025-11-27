import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { http } from '@/shared/api/http';
import { endpoints } from '@/shared/api/endpoints';
import { authStore } from '@/shared/store/auth';
import { useWallpaper } from '@/shared/ui/useWallpaper';
import { Seo } from '@/shared/seo/seo';
import { AvatarCropperDialog } from '@/shared/ui/AvatarCropperDialog';
import { DragDropZone } from '@/shared/ui/DragDropZone';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { Badge } from '@/shared/ui/Badge';
import { StatusSelect } from '@/shared/ui/StatusSelect';
import { SocialLinks } from '@/shared/ui/SocialLinks';
import { ProfileBanner } from '@/shared/ui/ProfileBanner';
import { ThemeSelector } from '@/shared/ui/ThemeSelector';
import { SkinGallery } from '@/shared/ui/SkinGallery';
import { Skin3DPreview } from '@/shared/ui/Skin3DPreview';
import { WallpaperPicker } from '@/shared/ui/WallpaperPicker';
import { BannerPicker } from '@/shared/ui/BannerPicker';
import { AvatarPicker } from '@/shared/ui/AvatarPicker';
import { SkinPicker } from '@/shared/ui/SkinPicker';
import { ProfileThemeProvider, useProfileTheme } from '@/shared/ui/ProfileThemeContext';

type SkinModel = 'classic' | 'slim';

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
  skinModel?: SkinModel;
  email?: string;
  registeredAt?: string;
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

type ToastEntry = { id: number; type: 'success' | 'error'; message: string; fading?: boolean };

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

  const [skinFile, setSkinFile] = useState<File | null>(null);
  const [skinUrlInput, setSkinUrlInput] = useState('');
  const [skinModel, setSkinModel] = useState<SkinModel>('classic');

  const [email, setEmail] = useState('');
  const [pwdDummy, setPwdDummy] = useState('');

  const [newUsername, setNewUsername] = useState('');
  const [usernameOk, setUsernameOk] = useState<boolean | null>(null);

  const [sessions, setSessions] = useState<Session[]>([]);

  const [delOpen, setDelOpen] = useState(false);
  const [delPwd, setDelPwd]   = useState('');
  const [delConfirm, setDelConfirm] = useState('');
  const [delBusy, setDelBusy] = useState(false);
  const [delErr, setDelErr]   = useState<string|null>(null);

  const [avatarCropSrc, setAvatarCropSrc] = useState<string | null>(null);
  const [avatarCropOpen, setAvatarCropOpen] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const toastTimers = useRef<Map<number, number[]>>(new Map());

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

  // Новые состояния для улучшенного профиля
  const [bannerUrl, setBannerUrl] = useState<string>('');
  const [profileTheme, setProfileTheme] = useState<string>('default');
  const [customThemeColor1, setCustomThemeColor1] = useState<string>('#0ea5e9');
  const [customThemeColor2, setCustomThemeColor2] = useState<string>('#1e40af');
  const [profileWallpaper, setProfileWallpaper] = useState<string>('');
  const [userStatus, setUserStatus] = useState<string>('online');
  const [customStatus, setCustomStatus] = useState<string>('');
  const [socialLinks, setSocialLinks] = useState<Array<{ type: string; value: string }>>([]);
  const [savedSkins, setSavedSkins] = useState<Array<{ id: string; name: string; url: string; model: SkinModel; savedAt: string }>>([]);
  const [achievements, setAchievements] = useState<Array<{ id: string; icon: string; title: string; description: string; unlocked: boolean; unlockedAt?: string }>>([
    { id: '1', icon: '🎨', title: 'Первый аватар', description: 'Загрузить свой первый аватар', unlocked: false },
    { id: '2', icon: '👕', title: 'Модник', description: 'Сохранить 5 скинов', unlocked: false },
    { id: '3', icon: '💯', title: 'Сотня', description: '100 сессий на сервере', unlocked: false },
    { id: '4', icon: '🏆', title: 'Легенда', description: 'Играть больше года', unlocked: false },
  ]);
  const [show3DSkin, setShow3DSkin] = useState(true);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);

  const bust = (u: string) => u ? `${u}${u.includes('?') ? '&' : '?'}v=${Date.now()}` : u;

  // Вычисление прогресса заполнения профиля
  const profileCompletion = useMemo(() => {
    if (!me) return 0;
    let filled = 0;
    const total = 10;
    
    if (me.avatarUrl) filled++;
    if (me.displayName) filled++;
    if (me.bio && me.bio.length > 10) filled++;
    if (me.location) filled++;
    if (me.website) filled++;
    if (me.birthDate) filled++;
    if (bannerUrl) filled++;
    if (socialLinks.length > 0) filled++;
    if (savedSkins.length > 0) filled++;
    if (me.skinUrl) filled++;

    return Math.round((filled / total) * 100);
  }, [me, bannerUrl, socialLinks, savedSkins]);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timers = toastTimers.current.get(id);
    if (timers) {
      timers.forEach((handle) => window.clearTimeout(handle));
      toastTimers.current.delete(id);
    }
  }, []);

  const closeToast = useCallback((id: number) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, fading: true } : t)));
    const timers = toastTimers.current.get(id);
    if (timers) {
      timers.forEach((handle) => window.clearTimeout(handle));
      toastTimers.current.delete(id);
    }
    const removeTimer = window.setTimeout(() => removeToast(id), 200);
    toastTimers.current.set(id, [removeTimer]);
  }, [removeToast]);

  const pushToast = useCallback(
    (type: 'success' | 'error', message: string) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, type, message }]);

      const hideTimer = window.setTimeout(() => {
        setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, fading: true } : t)));
      }, 3200);
      const removeTimer = window.setTimeout(() => removeToast(id), 3600);
      toastTimers.current.set(id, [hideTimer, removeTimer]);
    },
    [removeToast],
  );

  useEffect(() => {
    return () => {
      toastTimers.current.forEach((timers) => timers.forEach((handle) => window.clearTimeout(handle)));
      toastTimers.current.clear();
    };
  }, []);

  useEffect(() => {
    if (!err) return;
    pushToast('error', normalizeMessage(err));
    setErr(null);
  }, [err, pushToast]);

  useEffect(() => {
    if (!notice) return;
    pushToast('success', notice);
    setNotice(null);
  }, [notice, pushToast]);

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
        setSkinModel(p.skinModel === 'slim' ? 'slim' : 'classic');
        
        // Загрузка новых полей профиля
        if ((p as any).bannerUrl) setBannerUrl((p as any).bannerUrl);
        if ((p as any).profileTheme) setProfileTheme((p as any).profileTheme);
        if ((p as any).customThemeColor1) setCustomThemeColor1((p as any).customThemeColor1);
        if ((p as any).customThemeColor2) setCustomThemeColor2((p as any).customThemeColor2);
        if ((p as any).profileWallpaper) setProfileWallpaper((p as any).profileWallpaper);
        if ((p as any).userStatus) setUserStatus((p as any).userStatus);
        if ((p as any).customStatus) setCustomStatus((p as any).customStatus);
        if ((p as any).socialLinks) setSocialLinks((p as any).socialLinks);
        
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
        { 
          displayName, 
          bio, 
          location: locationTxt, 
          website, 
          birthDate,
          bannerUrl,
          profileTheme,
          customThemeColor1,
          customThemeColor2,
          profileWallpaper,
          userStatus,
          customStatus,
          socialLinks: socialLinks && socialLinks.length > 0 ? socialLinks : null
        },
        { withCredentials: true, headers: { 'Content-Type': 'application/json' } }
      );
      setNotice('Профиль сохранён');
      const meResp = await http.get<Profile>(endpoints.profileMe, { withCredentials: true });
      const p = meResp.data;
      setMe(p);
      if (!email && p.email) setEmail(p.email);
      
      // Обновить локальные состояния из ответа сервера
      if ((p as any).bannerUrl) setBannerUrl((p as any).bannerUrl);
      if ((p as any).profileTheme) setProfileTheme((p as any).profileTheme);
      if ((p as any).customThemeColor1) setCustomThemeColor1((p as any).customThemeColor1);
      if ((p as any).customThemeColor2) setCustomThemeColor2((p as any).customThemeColor2);
      if ((p as any).profileWallpaper) setProfileWallpaper((p as any).profileWallpaper);
      if ((p as any).userStatus) setUserStatus((p as any).userStatus);
      if ((p as any).customStatus) setCustomStatus((p as any).customStatus);
      if ((p as any).socialLinks) setSocialLinks((p as any).socialLinks);
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

  async function uploadSkinFile(file?: File) {
    const fileToUpload = file || skinFile;
    if (!fileToUpload) return;
    setBusy('skin-file'); setNotice(null); setErr(null);
    try {
      const fd = new FormData();
      fd.append('file', fileToUpload);

      const url = `${endpoints.profileSkin}?model=${encodeURIComponent(skinModel)}`;

      const { data } = await http.post<{ skinUrl: string; skinModel?: SkinModel }>(
        url, fd, { withCredentials: true }
      );

      setMe((m) =>
        m
          ? {
              ...m,
              skinUrl: data.skinUrl,
              skinModel: data.skinModel ?? skinModel,
            }
          : m
      );

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
      const urlWithModel = `${endpoints.profileSkinUrl}?model=${encodeURIComponent(skinModel)}`;

      const { data } = await http.post<{ skinUrl: string; skinModel?: SkinModel }>(
        urlWithModel,
        { url },
        { withCredentials: true, headers: { 'Content-Type': 'application/json' } }
      );

      setMe((m) =>
        m
          ? {
              ...m,
              skinUrl: data.skinUrl,
              skinModel: data.skinModel ?? skinModel,
            }
          : m
      );

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

  const handleAvatarCropClose = useCallback(() => {
    setAvatarCropOpen(false);
    setAvatarCropSrc(null);
    if (avatarInputRef.current) avatarInputRef.current.value = '';
  }, []);

  function handleAvatarFileChange(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarCropSrc(reader.result as string); // dataURL
      setAvatarCropOpen(true);
    };
    reader.readAsDataURL(file);
  }

  return (
    <>
      <Seo title="Настройки — ArchiTech MC" robots="noindex,follow" />
      <ProfileThemeProvider
        themeId={profileTheme}
        customColor1={customThemeColor1}
        customColor2={customThemeColor2}
      >
        <div className="min-h-dvh flex flex-col">
          <main className="mx-auto grid w-full max-w-6xl grow grid-cols-12 gap-6 px-4 py-6">
            {/* Прогресс заполнения профиля - полная ширина */}
            <section className="col-span-12">
              <Card>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-sm font-semibold text-sky-300">Заполненность профиля</h2>
                    <p className="text-xs text-slate-500">Заполните все поля для максимального прогресса</p>
                  </div>
                  <div className="text-2xl font-bold text-sky-400">{profileCompletion}%</div>
                </div>
                <ProgressBar value={profileCompletion} max={100} showPercentage={false} color="sky" />
              </Card>
            </section>

            {/* Левый столбец */}
            <section className="col-span-12 md:col-span-4">
              <Card>
                <h2 className="mb-3 text-sm font-semibold text-sky-300">Аватар</h2>
                <AvatarPicker
                  value={me?.avatarUrl || ''}
                  busy={busy === 'avatar-file'}
                  loading={loading}
                  onChange={handleAvatarFileChange}
                />
              </Card>

              <Card className="mt-6">
                <h2 className="mb-3 text-sm font-semibold text-sky-300">Скин</h2>
                <SkinPicker
                  value={me?.skinUrl || ''}
                  busy={busy === 'skin-file'}
                  loading={loading}
                  onChange={(file) => {
                    setSkinFile(file);
                    uploadSkinFile(file);
                  }}
                />

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
            </div>

            <div className="mt-4">
              <div className="mb-1 flex items-center gap-2">
                <label className="text-xs text-slate-400">Модель скина</label>
                <button
                  type="button"
                  title="Classic — широкие руки (Steve), Slim — узкие руки (Alex). Игра должна знать выбранную модель."
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-700 text-[10px] text-slate-400 hover:border-slate-500 hover:text-slate-300"
                >
                  ?
                </button>
              </div>
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setSkinModel('classic')}
                  className={
                    'rounded-lg border px-3 py-1 ' +
                    (skinModel === 'classic'
                      ? 'border-sky-700 bg-sky-900/40 text-sky-300'
                      : 'border-slate-700 text-slate-300 hover:border-slate-500')
                  }
                >
                  Classic (Steve)
                </button>
                <button
                  type="button"
                  onClick={() => setSkinModel('slim')}
                  className={
                    'rounded-lg border px-3 py-1 ' +
                    (skinModel === 'slim'
                      ? 'border-sky-700 bg-sky-900/40 text-sky-300'
                      : 'border-slate-700 text-slate-300 hover:border-slate-500')
                  }
                >
                  Slim (Alex)
                </button>
              </div>
            </div>
          </Card>

          {/* 3D превью скина */}
          {me?.skinUrl && show3DSkin && (
            <Card className="mt-6 flex flex-col">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-sky-300">3D Превью скина</h2>
                <button
                  type="button"
                  onClick={() => setShow3DSkin(false)}
                  className="text-xs text-slate-400 hover:text-slate-300"
                >
                  Скрыть
                </button>
              </div>
              <div className="h-[400px]">
                <Skin3DPreview 
                  skinUrl={me.skinUrl} 
                  autoRotate 
                  className="h-full w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-900"
                />
              </div>
            </Card>
          )}

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
              <div className="mt-2 flex flex-col gap-1 text-xs text-slate-400">
                {birthDate && (() => {
                  try {
                    const birth = new Date(birthDate);
                    const today = new Date();
                    let age = today.getFullYear() - birth.getFullYear();
                    const monthDiff = today.getMonth() - birth.getMonth();
                    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
                      age--;
                    }
                    return <span>Возраст: {age} {age === 1 ? 'год' : age < 5 ? 'года' : 'лет'}</span>;
                  } catch { return null; }
                })()}
                {me?.registeredAt && (() => {
                  try {
                    const reg = new Date(me.registeredAt);
                    const today = new Date();
                    let years = today.getFullYear() - reg.getFullYear();
                    const monthDiff = today.getMonth() - reg.getMonth();
                    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < reg.getDate())) {
                      years--;
                    }
                    return <span>С нами {years > 0 ? `${years} ${years === 1 ? 'год' : years < 5 ? 'года' : 'лет'}` : 'менее года'}</span>;
                  } catch { return null; }
                })()}
              </div>
            </InputRow>

            <div className="mt-4 flex justify-end">
              <button
                disabled={busy === 'profile'}
                onClick={saveProfile}
                className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-sky-600/20 transition-all"
              >
                💾 Сохранить профиль
              </button>
            </div>
          </Card>

          <Card className="mt-6">
            <h2 className="mb-4 text-sm font-semibold text-sky-300">Учётная запись</h2>

            <InputRow label="Email">
              <div className="flex w-full items-stretch gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  className={inp() + ' flex-1'}
                />
                <button
                  type="button"
                  onClick={() => nav('/settings/email')}
                  className="flex items-center justify-center rounded-xl border border-slate-700 px-3 py-2 text-sm hover:border-slate-500 hover:bg-slate-800"
                  title="Изменить email"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              </div>
            </InputRow>

            <InputRow label="Пароль">
              <div className="flex w-full items-stretch gap-2">
                <input
                  type="password"
                  value={pwdDummy}
                  onChange={(e) => setPwdDummy(e.target.value)}
                  placeholder="••••••••"
                  className={inp() + ' flex-1'}
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
                  className="flex items-center justify-center rounded-xl border border-slate-700 px-3 py-2 text-sm hover:border-slate-500 hover:bg-slate-800 disabled:opacity-50"
                  title="Изменить пароль"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              </div>
            </InputRow>

            <InputRow label="Логин">
              <div className="flex w-full items-stretch gap-2">
                <input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className={inp() + ' flex-1'} />
                <button
                  disabled={
                    busy === 'username' ||
                    !newUsername.trim() ||
                    usernameOk !== true ||
                    newUsername.trim().toLowerCase() === (me?.username || '').toLowerCase()
                  }
                  onClick={changeUsername}
                  className="flex items-center justify-center rounded-xl border border-slate-700 px-3 py-2 text-sm hover:border-slate-500 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Сменить логин"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              </div>
              {usernameOk === false && <p className="mt-1 text-xs text-red-400">Логин занят или некорректен</p>}
              {usernameOk === true && newUsername.toLowerCase() !== (me?.username || '').toLowerCase() && (
                <p className="mt-1 text-xs text-green-400">Доступен</p>
              )}
            </InputRow>
          </Card>

          {/* Статус и социальные сети */}
          <Card className="mt-6">
            <h2 className="mb-4 text-sm font-semibold text-sky-300">Статус</h2>
            <StatusSelect
              value={userStatus}
              customStatus={customStatus}
              onChange={(statusId, customText) => {
                setUserStatus(statusId);
                setCustomStatus(customText || '');
              }}
            />
          </Card>

          <Card className="mt-6">
            <h2 className="mb-4 text-sm font-semibold text-sky-300">Социальные сети</h2>
            <SocialLinks
              links={socialLinks as any}
              onChange={(links) => setSocialLinks(links as any)}
              editable
            />
          </Card>

          {/* Тема профиля */}
          <Card className="mt-6">
            <ThemeSelector
              value={profileTheme}
              customColor1={customThemeColor1}
              customColor2={customThemeColor2}
              onChange={(themeId, color1, color2) => {
                setProfileTheme(themeId);
                if (color1) setCustomThemeColor1(color1);
                if (color2) setCustomThemeColor2(color2);
              }}
            />
          </Card>

          {/* Обои профиля */}
          <Card className="mt-6">
            <h2 className="mb-4 text-sm font-semibold text-sky-300">Обои профиля</h2>
            <p className="mb-3 text-xs text-slate-400">Большое изображение, которое заменит фон сайта на вашей странице профиля</p>
            <WallpaperPicker
              value={profileWallpaper}
              busy={busy === 'wallpaper'}
              onChange={async (file: File) => {
                setBusy('wallpaper');
                try {
                  const fd = new FormData();
                  fd.append('file', file);
                  const { data } = await http.post<{ url: string }>(
                    '/api/v1/profile/wallpaper',
                    fd,
                    { withCredentials: true }
                  );
                  setProfileWallpaper(data.url);
                  setMe((m) => m ? { ...m, profileWallpaper: data.url } as any : m);
                  pushToast('success', 'Обои обновлены');
                } catch (e: any) {
                  pushToast('error', e?.response?.data || 'Ошибка загрузки обоев');
                } finally {
                  setBusy(null);
                }
              }}
              onClear={() => setProfileWallpaper('')}
            />
          </Card>

          {/* Баннер профиля */}
          <Card className="mt-6">
            <h2 className="mb-4 text-sm font-semibold text-sky-300">Баннер профиля</h2>
            <p className="mb-3 text-xs text-slate-400">Широкое изображение в шапке вашего профиля</p>
            <BannerPicker
              value={bannerUrl}
              busy={busy === 'banner'}
              onChange={async (file: File) => {
                setBusy('banner');
                try {
                  const fd = new FormData();
                  fd.append('file', file);
                  const { data } = await http.post<{ bannerUrl: string }>('/api/v1/profile/banner', fd, { withCredentials: true });
                  setBannerUrl(data.bannerUrl);
                  setMe((m) => m ? { ...m, bannerUrl: data.bannerUrl } as any : m);
                  pushToast('success', 'Баннер обновлён');
                } catch (e: any) {
                  pushToast('error', e?.response?.data || 'Ошибка загрузки баннера');
                } finally {
                  setBusy(null);
                }
              }}
              onClear={() => setBannerUrl('')}
            />
          </Card>

          {/* Галерея скинов */}
          <Card className="mt-6">
            <SkinGallery
              skins={savedSkins as any}
              onSelect={() => {}}
              onDelete={() => {}}
              onSave={() => {}}
            />
          </Card>

          {/* Достижения */}
          <Card className="mt-6">
            <h2 className="mb-4 text-sm font-semibold text-sky-300">Достижения</h2>
            <div className="grid grid-cols-2 gap-3">
              {achievements.map((achievement) => (
                <Badge
                  key={achievement.id}
                  icon={achievement.icon}
                  title={achievement.title}
                  description={achievement.description}
                  unlocked={achievement.unlocked}
                  unlockedAt={achievement.unlockedAt}
                />
              ))}
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

          {since && <div className="mt-3 text-center text-xs text-slate-500">Вы с нами с {since}</div>}
        </section>

        {avatarCropOpen && avatarCropSrc && (
          <AvatarCropperDialog
            src={avatarCropSrc}
            onClose={handleAvatarCropClose}
            onCropped={async (blob) => {
              handleAvatarCropClose();
              setNotice(null);
              setErr(null);
              setBusy('avatar-file');

              try {
                const file = new File([blob], 'avatar.png', { type: 'image/png' });
                const fd = new FormData();
                fd.append('file', file);

                const { data } = await http.post<{ avatarUrl: string }>(
                  endpoints.profileAvatar,
                  fd,
                  { withCredentials: true }
                );

                setMe((m) => (m ? { ...m, avatarUrl: data.avatarUrl } : m));
                syncAuth({ avatarUrl: bust(data.avatarUrl) });
                setNotice('Аватар обновлён');
              } catch (e: any) {
                setErr(e?.response?.data || e?.message || 'Ошибка загрузки аватара');
              } finally {
                setBusy(null);
              }
            }}
          />
        )}

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
      </ProfileThemeProvider>
      <ToastStack toasts={toasts} onClose={closeToast} />
    </>
  );
}

function Card(props: { children: React.ReactNode; className?: string }) {
  const { getThemeStyle } = useProfileTheme();
  const customStyle = getThemeStyle();
  
  const finalStyle = {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    ...customStyle
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

function normalizeMessage(value: any): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    if (typeof (value as any).message === 'string') return (value as any).message;
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function ToastStack({ toasts, onClose }: { toasts: ToastEntry[]; onClose: (id: number) => void }) {
  if (!toasts.length) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
      <div className="flex w-full max-w-sm flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-2xl border px-4 py-3 text-sm shadow-xl transition-all duration-300 ${
              toast.fading ? 'translate-y-2 opacity-0' : 'translate-y-0 opacity-100'
            } ${
              toast.type === 'error'
                ? 'border-red-800 bg-red-950/80 text-red-100'
                : 'border-sky-700 bg-sky-950/80 text-sky-100'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-1">{toast.message}</div>
              <button
                type="button"
                aria-label="Закрыть уведомление"
                onClick={() => onClose(toast.id)}
                className="text-xs text-slate-300 transition-colors hover:text-white"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}