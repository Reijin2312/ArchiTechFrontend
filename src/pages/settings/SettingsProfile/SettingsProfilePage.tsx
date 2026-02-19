import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { http } from '@/shared/api/http';
import { endpoints } from '@/shared/api/endpoints';
import { authStore } from '@/shared/store/auth';
import { useWallpaper } from '@/shared/ui/wallpaper/useWallpaper';
import { Seo } from '@/shared/seo/seo';
import { ProgressBar } from '@/shared/ui/utils/ProgressBar';
import { StatusSelect } from '@/shared/ui/form/StatusSelect';
import { SocialLinks } from '@/shared/ui/utils/SocialLinks';
import { ThemeSelector } from '@/shared/ui/utils/ThemeSelector';
import { WallpaperPicker } from '@/shared/ui/wallpaper/WallpaperPicker';
import { BannerPicker } from '@/shared/ui/card/BannerPicker';
import { AvatarPicker } from '@/shared/ui/avatar/AvatarPicker';
import { AvatarCropperDialog } from '@/shared/ui/avatar/AvatarCropperDialog';
import { ProfileThemeProvider } from '@/shared/ui/utils/ProfileThemeContext';
import { useProfile } from '@/shared/hooks/settings/useProfile';
import { useSessions } from '@/shared/hooks/settings/useSessions';
import { useToast } from '@/shared/hooks/settings/useToast';
import { Card } from './components';
import { ProfileSection } from './ProfileSection';
import { AccountSection } from './AccountSection';
import { SessionsSection } from './SessionsSection';
import { DangerZoneSection } from './DangerZoneSection';
import { ToastStack } from './ToastStack';

export default function SettingsProfilePage() {
  useWallpaper();
  const nav = useNavigate();

  const { profile, setProfile, loading, error, setError, updateProfile } = useProfile();
  const {
    visibleSessions,
    show,
    setShow,
    from,
    setFrom,
    to,
    setTo,
    sortBy,
    setSortBy,
    since,
    loadSessions,
    revokeSession,
    sessionStatus,
  } = useSessions();
  const { toasts, pushToast, closeToast } = useToast();

  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Поля профиля
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [locationTxt, setLocationTxt] = useState('');
  const [website, setWebsite] = useState('');
  const [birthDate, setBirthDate] = useState('');

  // Учётная запись
  const [email, setEmail] = useState('');
  const [pwdDummy, setPwdDummy] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [usernameOk, setUsernameOk] = useState<boolean | null>(null);

  // Новые поля профиля
  const [bannerUrl, setBannerUrl] = useState<string>('');
  const [profileTheme, setProfileTheme] = useState<string>('default');
  const [customThemeColor1, setCustomThemeColor1] = useState<string>('#0ea5e9');
  const [customThemeColor2, setCustomThemeColor2] = useState<string>('#1e40af');
  const [profileWallpaper, setProfileWallpaper] = useState<string>('');
  const [userStatus, setUserStatus] = useState<string>('online');
  const [customStatus, setCustomStatus] = useState<string>('');
  const [socialLinks, setSocialLinks] = useState<Array<{ type: string; value: string }>>([]);
  const [avatarCropSrc, setAvatarCropSrc] = useState<string | null>(null);
  const [avatarCropOpen, setAvatarCropOpen] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const bust = (u: string) => (u ? `${u}${u.includes('?') ? '&' : '?'}v=${Date.now()}` : u);

  // Прогресс заполнения профиля
  const profileCompletion = useMemo(() => {
    if (!profile) return 0;
    let filled = 0;
    const total = 10;

    if (profile.avatarUrl) filled++;
    if (profile.displayName) filled++;
    if (profile.bio && profile.bio.length > 10) filled++;
    if (profile.location) filled++;
    if (profile.website) filled++;
    if (profile.birthDate) filled++;
    if (bannerUrl) filled++;
    if (socialLinks.length > 0) filled++;
    if ((profile.savedSkins?.length ?? 0) > 0) filled++;
    if (profile.skinUrl) filled++;

    return Math.round((filled / total) * 100);
  }, [profile, bannerUrl, socialLinks]);

  function syncAuth(partial: Partial<{ avatarUrl: string; username: string }>) {
    authStore.setState((s) => (s.user ? { user: { ...s.user, ...partial } } : s));
  }

  // Загрузка данных профиля
  useEffect(() => {
    if (!profile) return;
    
    setDisplayName(profile.displayName ?? '');
    setBio(profile.bio ?? '');
    setLocationTxt(profile.location ?? '');
    setWebsite(profile.website ?? '');
    setBirthDate(profile.birthDate ?? '');
    setEmail(profile.email ?? '');
    setNewUsername(profile.username ?? '');
    if (profile.bannerUrl) setBannerUrl(profile.bannerUrl);
    if (profile.profileTheme) setProfileTheme(profile.profileTheme);
    if (profile.customThemeColor1) setCustomThemeColor1(profile.customThemeColor1);
    if (profile.customThemeColor2) setCustomThemeColor2(profile.customThemeColor2);
    if (profile.profileWallpaper) setProfileWallpaper(profile.profileWallpaper);
    if (profile.userStatus) setUserStatus(profile.userStatus);
    if (profile.customStatus) setCustomStatus(profile.customStatus);
    if (profile.socialLinks) setSocialLinks(profile.socialLinks);
  }, [profile]);

  useEffect(() => {
    if (!error) return;
    pushToast('error', normalizeMessage(error));
    setError(null);
  }, [error, pushToast, setError]);

  useEffect(() => {
    if (!notice) return;
    pushToast('success', notice);
    setNotice(null);
  }, [notice, pushToast]);

  useEffect(() => {
    const u = newUsername.trim().toLowerCase();
    if (!u || !profile) {
      setUsernameOk(null);
      return;
    }
    if (u === (profile.username || '').toLowerCase()) {
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
        const { data, status } = await http.get(`/api/validate/username?username=${encodeURIComponent(u)}`, {
          withCredentials: true,
          signal: ctl.signal,
          validateStatus: () => true,
        });
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
  }, [newUsername, profile]);

  // Сохранение профиля
  async function saveProfile() {
    setBusy('profile');
    setNotice(null);
    setError(null);

    const result = await updateProfile({
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
      socialLinks: socialLinks && socialLinks.length > 0 ? socialLinks : undefined,
    });

    if (result.success) {
      setNotice('Профиль сохранён');
      const p = result.data;
      if (p?.bannerUrl) setBannerUrl(p.bannerUrl);
      if (p?.profileTheme) setProfileTheme(p.profileTheme);
      if (p?.customThemeColor1) setCustomThemeColor1(p.customThemeColor1);
      if (p?.customThemeColor2) setCustomThemeColor2(p.customThemeColor2);
      if (p?.profileWallpaper) setProfileWallpaper(p.profileWallpaper);
      if (p?.userStatus) setUserStatus(p.userStatus);
      if (p?.customStatus) setCustomStatus(p.customStatus);
      if (p?.socialLinks) setSocialLinks(p.socialLinks);
    } else {
      setError(result.error || 'Ошибка сохранения');
    }

    setBusy(null);
  }

  // Выход
  async function logout() {
    try {
      await http.post('/api/auth/logout', null, { withCredentials: true });
    } catch {}
    authStore.setState({ accessToken: null, user: null });
    nav('/auth/login', { replace: true });
  }

  // Загрузка аватара
  const handleAvatarCropClose = useCallback(() => {
    setAvatarCropOpen(false);
    setAvatarCropSrc(null);
    if (avatarInputRef.current) avatarInputRef.current.value = '';
  }, []);

  function handleAvatarFileChange(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarCropSrc(reader.result as string);
      setAvatarCropOpen(true);
    };
    reader.readAsDataURL(file);
  }

  async function uploadAvatarBlob(blob: Blob) {
    handleAvatarCropClose();
    setNotice(null);
    setError(null);
    setBusy('avatar-file');

    try {
      const file = new File([blob], 'avatar.png', { type: 'image/png' });
      const fd = new FormData();
      fd.append('file', file);

      const { data } = await http.post<{ avatarUrl: string }>(endpoints.profileAvatar, fd, { withCredentials: true });

      setProfile((m) => (m ? { ...m, avatarUrl: data.avatarUrl } : m));
      syncAuth({ avatarUrl: bust(data.avatarUrl) });
      setNotice('Аватар обновлён');
    } catch (e: unknown) {
      const err = e as { response?: { data?: unknown }; message?: string };
      setError(err?.response?.data as string || err?.message || 'Ошибка загрузки аватара');
    } finally {
      setBusy(null);
    }
  }

  async function changeUsername() {
    const u = newUsername.trim().toLowerCase();
    if (!u || usernameOk !== true) return;
    if (u === (profile?.username || '').toLowerCase()) {
      setNotice('Логин уже установлен');
      return;
    }
    setBusy('username');
    setError(null);
    try {
      const { status, data } = await http.post(
        endpoints.accountUsernameChange,
        { username: u },
        { withCredentials: true, headers: { 'Content-Type': 'application/json' }, validateStatus: () => true },
      );
      if (status === 200) {
        setNotice('Логин обновлён');
        nav(`/u/${encodeURIComponent(u)}`, { replace: true });
        return;
      }
      if (status === 409) {
        setUsernameOk(false);
        setError(data?.message || 'Логин уже занят');
        return;
      }
      if (status === 400) {
        setUsernameOk(false);
        setError(data?.message || 'Некорректное имя пользователя');
        return;
      }
      if (status === 401 || status === 403) {
        setError('Нужен вход в аккаунт');
        return;
      }
      setError(data?.message || `Ошибка смены логина (${status})`);
    } finally {
      setBusy(null);
    }
  }

  // Завершение сессии
  async function handleRevokeSession(tokenId: string) {
    setBusy(`sess:${tokenId}`);
    setError(null);
    const result = await revokeSession(tokenId);
    if (!result.success) {
      setError(result.error as string);
    }
    setBusy(null);
  }

  // Экспорт аккаунта
  async function exportAccount() {
    setBusy('export');
    setError(null);
    try {
      const { data } = await http.get<unknown>(endpoints.accountExport, { withCredentials: true });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'account-export.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      const err = e as { response?: { data?: unknown }; message?: string };
      setError(err?.response?.data as string || err?.message || 'Ошибка экспорта');
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <Seo title="Настройки — ArchiTech MC" robots="noindex,follow" />
      <ProfileThemeProvider themeId={profileTheme} customColor1={customThemeColor1} customColor2={customThemeColor2}>
        <div className="min-h-dvh flex flex-col">
          <main className="mx-auto grid w-full max-w-6xl grow grid-cols-12 gap-6 px-4 py-6">
            {/* Прогресс заполнения профиля */}
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
                  value={profile?.avatarUrl || ''}
                  busy={busy === 'avatar-file'}
                  loading={loading}
                  onChange={handleAvatarFileChange}
                />
              </Card>

              <SessionsSection
                visibleSessions={visibleSessions}
                show={show}
                setShow={setShow}
                from={from}
                setFrom={setFrom}
                to={to}
                setTo={setTo}
                sortBy={sortBy}
                setSortBy={setSortBy}
                busy={busy}
                onRevoke={handleRevokeSession}
                onRefresh={loadSessions}
                sessionStatus={sessionStatus}
              />

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
              <ProfileSection
                profile={profile}
                displayName={displayName}
                setDisplayName={setDisplayName}
                bio={bio}
                setBio={setBio}
                locationTxt={locationTxt}
                setLocationTxt={setLocationTxt}
                website={website}
                setWebsite={setWebsite}
                birthDate={birthDate}
                setBirthDate={setBirthDate}
                busy={busy}
                onSave={saveProfile}
              />

              <AccountSection
                email={email}
                setEmail={setEmail}
                pwdDummy={pwdDummy}
                setPwdDummy={setPwdDummy}
                newUsername={newUsername}
                setNewUsername={setNewUsername}
                usernameOk={usernameOk}
                currentUsername={profile?.username || ''}
                busy={busy}
                onUsernameChange={changeUsername}
                onError={setError}
              />

              <Card className="mt-6 relative z-40">
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
                <SocialLinks links={socialLinks as never} onChange={(links) => setSocialLinks(links as never)} editable />
              </Card>

              <Card className="mt-6 relative z-40">
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

              <Card className="mt-6">
                <h2 className="mb-4 text-sm font-semibold text-sky-300">Обои профиля</h2>
                <p className="mb-3 text-xs text-slate-400">
                  Большое изображение, которое заменит фон сайта на вашей странице профиля
                </p>
                <WallpaperPicker
                  value={profileWallpaper}
                  busy={busy === 'wallpaper'}
                  onChange={async (file: File) => {
                    setBusy('wallpaper');
                    try {
                      const fd = new FormData();
                      fd.append('file', file);
                      const { data } = await http.post<{ url: string }>('/api/v1/profile/wallpaper', fd, {
                        withCredentials: true,
                      });
                      setProfileWallpaper(data.url);
                      setProfile((m) => (m ? ({ ...m, profileWallpaper: data.url } as never) : m));
                      pushToast('success', 'Обои обновлены');
                    } catch (e: unknown) {
                      const err = e as { response?: { data?: unknown }; message?: string };
                      pushToast('error', (err?.response?.data as string) || 'Ошибка загрузки обоев');
                    } finally {
                      setBusy(null);
                    }
                  }}
                  onClear={() => setProfileWallpaper('')}
                />
              </Card>

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
                      const { data } = await http.post<{ bannerUrl: string }>('/api/v1/profile/banner', fd, {
                        withCredentials: true,
                      });
                      setBannerUrl(data.bannerUrl);
                      setProfile((m) => (m ? ({ ...m, bannerUrl: data.bannerUrl } as never) : m));
                      pushToast('success', 'Баннер обновлён');
                    } catch (e: unknown) {
                      const err = e as { response?: { data?: unknown }; message?: string };
                      pushToast('error', (err?.response?.data as string) || 'Ошибка загрузки баннера');
                    } finally {
                      setBusy(null);
                    }
                  }}
                  onClear={() => setBannerUrl('')}
                />
              </Card>

              <DangerZoneSection onLogout={logout} />

              {since && <div className="mt-3 text-center text-xs text-slate-500">Вы с нами с {since}</div>}
            </section>

            {avatarCropOpen && avatarCropSrc && (
              <AvatarCropperDialog src={avatarCropSrc} onClose={handleAvatarCropClose} onCropped={uploadAvatarBlob} />
            )}
          </main>
        </div>
      </ProfileThemeProvider>
      <ToastStack toasts={toasts} onClose={closeToast} />
    </>
  );
}

function normalizeMessage(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    if (typeof (value as { message?: string }).message === 'string') return (value as { message: string }).message;
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}
