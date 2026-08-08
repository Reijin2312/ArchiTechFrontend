import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { http } from '../../../shared/api/http.js';
import { endpoints } from '../../../shared/api/endpoints.js';
import { authStore } from '../../../shared/store/auth.js';
import { useWallpaper } from '../../../shared/ui/wallpaper/useWallpaper.js';
import { Seo } from '../../../shared/seo/seo.js';
import { ProgressBar } from '../../../shared/ui/utils/ProgressBar.js';
import { StatusSelect } from '../../../shared/ui/form/StatusSelect.js';
import { SocialLinks } from '../../../shared/ui/utils/SocialLinks.js';
import { ThemeSelector } from '../../../shared/ui/utils/ThemeSelector.js';
import { WallpaperPicker } from '../../../shared/ui/wallpaper/WallpaperPicker.js';
import { BannerPicker } from '../../../shared/ui/card/BannerPicker.js';
import { AvatarPicker } from '../../../shared/ui/avatar/AvatarPicker.js';
import { AvatarCropperDialog } from '../../../shared/ui/avatar/AvatarCropperDialog.js';
import { ProfileThemeProvider } from '../../../shared/ui/utils/ProfileThemeContext.js';
import { useProfile } from '../../../shared/hooks/settings/useProfile.js';
import { useSessions } from '../../../shared/hooks/settings/useSessions.js';
import { useToast } from '../../../shared/hooks/settings/useToast.js';
import { Card } from './components.js';
import { ProfileSection } from './ProfileSection.js';
import { AccountSection } from './AccountSection.js';
import { SessionsSection } from './SessionsSection.js';
import { DangerZoneSection } from './DangerZoneSection.js';
import { ToastStack } from './ToastStack.js';
export default function SettingsProfilePage() {
    useWallpaper();
    const nav = useNavigate();
    const { profile, setProfile, loading, error, setError, updateProfile } = useProfile();
    const { visibleSessions, show, setShow, from, setFrom, to, setTo, sortBy, setSortBy, since, loadSessions, revokeSession, sessionStatus, } = useSessions();
    const { toasts, pushToast, closeToast } = useToast();
    const [busy, setBusy] = useState(null);
    const [notice, setNotice] = useState(null);
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
    const [usernameOk, setUsernameOk] = useState(null);
    // Новые поля профиля
    const [bannerUrl, setBannerUrl] = useState('');
    const [profileTheme, setProfileTheme] = useState('default');
    const [customThemeColor1, setCustomThemeColor1] = useState('#0ea5e9');
    const [customThemeColor2, setCustomThemeColor2] = useState('#1e40af');
    const [profileWallpaper, setProfileWallpaper] = useState('');
    const [userStatus, setUserStatus] = useState('online');
    const [customStatus, setCustomStatus] = useState('');
    const [socialLinks, setSocialLinks] = useState([]);
    const [avatarCropSrc, setAvatarCropSrc] = useState(null);
    const [avatarCropOpen, setAvatarCropOpen] = useState(false);
    const avatarInputRef = useRef(null);
    const bust = (u) => (u ? `${u}${u.includes('?') ? '&' : '?'}v=${Date.now()}` : u);
    // Прогресс заполнения профиля
    const profileCompletion = useMemo(() => {
        if (!profile)
            return 0;
        let filled = 0;
        const total = 10;
        if (profile.avatarUrl)
            filled++;
        if (profile.displayName)
            filled++;
        if (profile.bio && profile.bio.length > 10)
            filled++;
        if (profile.location)
            filled++;
        if (profile.website)
            filled++;
        if (profile.birthDate)
            filled++;
        if (bannerUrl)
            filled++;
        if (socialLinks.length > 0)
            filled++;
        if ((profile.savedSkins?.length ?? 0) > 0)
            filled++;
        if (profile.skinUrl)
            filled++;
        return Math.round((filled / total) * 100);
    }, [profile, bannerUrl, socialLinks]);
    function syncAuth(partial) {
        authStore.setState((s) => (s.user ? { user: { ...s.user, ...partial } } : s));
    }
    // Загрузка данных профиля
    useEffect(() => {
        if (!profile)
            return;
        setDisplayName(profile.displayName ?? '');
        setBio(profile.bio ?? '');
        setLocationTxt(profile.location ?? '');
        setWebsite(profile.website ?? '');
        setBirthDate(profile.birthDate ?? '');
        setEmail(profile.email ?? '');
        setNewUsername(profile.username ?? '');
        if (profile.bannerUrl)
            setBannerUrl(profile.bannerUrl);
        if (profile.profileTheme)
            setProfileTheme(profile.profileTheme);
        if (profile.customThemeColor1)
            setCustomThemeColor1(profile.customThemeColor1);
        if (profile.customThemeColor2)
            setCustomThemeColor2(profile.customThemeColor2);
        if (profile.profileWallpaper)
            setProfileWallpaper(profile.profileWallpaper);
        if (profile.userStatus)
            setUserStatus(profile.userStatus);
        if (profile.customStatus)
            setCustomStatus(profile.customStatus);
        if (profile.socialLinks)
            setSocialLinks(profile.socialLinks);
    }, [profile]);
    useEffect(() => {
        if (!error)
            return;
        pushToast('error', normalizeMessage(error));
        setError(null);
    }, [error, pushToast, setError]);
    useEffect(() => {
        if (!notice)
            return;
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
                if (status === 200)
                    setUsernameOk(data?.valid === true && data?.available === true);
                else if (status === 404)
                    setUsernameOk(true);
                else
                    setUsernameOk(false);
            }
            catch {
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
            if (p?.bannerUrl)
                setBannerUrl(p.bannerUrl);
            if (p?.profileTheme)
                setProfileTheme(p.profileTheme);
            if (p?.customThemeColor1)
                setCustomThemeColor1(p.customThemeColor1);
            if (p?.customThemeColor2)
                setCustomThemeColor2(p.customThemeColor2);
            if (p?.profileWallpaper)
                setProfileWallpaper(p.profileWallpaper);
            if (p?.userStatus)
                setUserStatus(p.userStatus);
            if (p?.customStatus)
                setCustomStatus(p.customStatus);
            if (p?.socialLinks)
                setSocialLinks(p.socialLinks);
        }
        else {
            setError(result.error || 'Ошибка сохранения');
        }
        setBusy(null);
    }
    // Выход
    async function logout() {
        try {
            await http.post('/api/auth/logout', null, { withCredentials: true });
        }
        catch { }
        authStore.setState({ accessToken: null, user: null });
        nav('/auth/login', { replace: true });
    }
    // Загрузка аватара
    const handleAvatarCropClose = useCallback(() => {
        setAvatarCropOpen(false);
        setAvatarCropSrc(null);
        if (avatarInputRef.current)
            avatarInputRef.current.value = '';
    }, []);
    function handleAvatarFileChange(file) {
        const reader = new FileReader();
        reader.onload = () => {
            setAvatarCropSrc(reader.result);
            setAvatarCropOpen(true);
        };
        reader.readAsDataURL(file);
    }
    async function uploadAvatarBlob(blob) {
        handleAvatarCropClose();
        setNotice(null);
        setError(null);
        setBusy('avatar-file');
        try {
            const file = new File([blob], 'avatar.png', { type: 'image/png' });
            const fd = new FormData();
            fd.append('file', file);
            const { data } = await http.post(endpoints.profileAvatar, fd, { withCredentials: true });
            setProfile((m) => (m ? { ...m, avatarUrl: data.avatarUrl } : m));
            syncAuth({ avatarUrl: bust(data.avatarUrl) });
            setNotice('Аватар обновлён');
        }
        catch (e) {
            const err = e;
            setError(err?.response?.data || err?.message || 'Ошибка загрузки аватара');
        }
        finally {
            setBusy(null);
        }
    }
    async function changeUsername() {
        const u = newUsername.trim().toLowerCase();
        if (!u || usernameOk !== true)
            return;
        if (u === (profile?.username || '').toLowerCase()) {
            setNotice('Логин уже установлен');
            return;
        }
        setBusy('username');
        setError(null);
        try {
            const { status, data } = await http.post(endpoints.accountUsernameChange, { username: u }, { withCredentials: true, headers: { 'Content-Type': 'application/json' }, validateStatus: () => true });
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
        }
        finally {
            setBusy(null);
        }
    }
    // Завершение сессии
    async function handleRevokeSession(tokenId) {
        setBusy(`sess:${tokenId}`);
        setError(null);
        const result = await revokeSession(tokenId);
        if (!result.success) {
            setError(result.error);
        }
        setBusy(null);
    }
    // Экспорт аккаунта
    async function exportAccount() {
        setBusy('export');
        setError(null);
        try {
            const { data } = await http.get(endpoints.accountExport, { withCredentials: true });
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'account-export.json';
            a.click();
            URL.revokeObjectURL(url);
        }
        catch (e) {
            const err = e;
            setError(err?.response?.data || err?.message || 'Ошибка экспорта');
        }
        finally {
            setBusy(null);
        }
    }
    return (_jsxs(_Fragment, { children: [_jsx(Seo, { title: "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u2014 ArchiTech MC", robots: "noindex,follow" }), _jsx(ProfileThemeProvider, { themeId: profileTheme, customColor1: customThemeColor1, customColor2: customThemeColor2, children: _jsx("div", { className: "min-h-dvh flex flex-col", children: _jsxs("main", { className: "mx-auto grid w-full max-w-6xl grow grid-cols-12 gap-6 px-4 py-6", children: [_jsx("section", { className: "col-span-12", children: _jsxs(Card, { children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-sm font-semibold text-sky-300", children: "\u0417\u0430\u043F\u043E\u043B\u043D\u0435\u043D\u043D\u043E\u0441\u0442\u044C \u043F\u0440\u043E\u0444\u0438\u043B\u044F" }), _jsx("p", { className: "text-xs text-slate-500", children: "\u0417\u0430\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u0432\u0441\u0435 \u043F\u043E\u043B\u044F \u0434\u043B\u044F \u043C\u0430\u043A\u0441\u0438\u043C\u0430\u043B\u044C\u043D\u043E\u0433\u043E \u043F\u0440\u043E\u0433\u0440\u0435\u0441\u0441\u0430" })] }), _jsxs("div", { className: "text-2xl font-bold text-sky-400", children: [profileCompletion, "%"] })] }), _jsx(ProgressBar, { value: profileCompletion, max: 100, showPercentage: false, color: "sky" })] }) }), _jsxs("section", { className: "col-span-12 md:col-span-4", children: [_jsxs(Card, { children: [_jsx("h2", { className: "mb-3 text-sm font-semibold text-sky-300", children: "\u0410\u0432\u0430\u0442\u0430\u0440" }), _jsx(AvatarPicker, { value: profile?.avatarUrl || '', busy: busy === 'avatar-file', loading: loading, onChange: handleAvatarFileChange })] }), _jsx(SessionsSection, { visibleSessions: visibleSessions, show: show, setShow: setShow, from: from, setFrom: setFrom, to: to, setTo: setTo, sortBy: sortBy, setSortBy: setSortBy, busy: busy, onRevoke: handleRevokeSession, onRefresh: loadSessions, sessionStatus: sessionStatus }), _jsxs(Card, { className: "mt-6", children: [_jsx("h2", { className: "mb-3 text-sm font-semibold text-sky-300", children: "\u042D\u043A\u0441\u043F\u043E\u0440\u0442 \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0430" }), _jsx("button", { disabled: busy === 'export', onClick: exportAccount, className: "rounded-xl border border-slate-700 px-3 py-1.5 text-sm hover:border-slate-500 disabled:opacity-50", children: "\u0421\u043A\u0430\u0447\u0430\u0442\u044C JSON" })] })] }), _jsxs("section", { className: "col-span-12 md:col-span-8", children: [_jsx(ProfileSection, { profile: profile, displayName: displayName, setDisplayName: setDisplayName, bio: bio, setBio: setBio, locationTxt: locationTxt, setLocationTxt: setLocationTxt, website: website, setWebsite: setWebsite, birthDate: birthDate, setBirthDate: setBirthDate, busy: busy, onSave: saveProfile }), _jsx(AccountSection, { email: email, setEmail: setEmail, pwdDummy: pwdDummy, setPwdDummy: setPwdDummy, newUsername: newUsername, setNewUsername: setNewUsername, usernameOk: usernameOk, currentUsername: profile?.username || '', busy: busy, onUsernameChange: changeUsername, onError: setError }), _jsxs(Card, { className: "mt-6 relative z-40", children: [_jsx("h2", { className: "mb-4 text-sm font-semibold text-sky-300", children: "\u0421\u0442\u0430\u0442\u0443\u0441" }), _jsx(StatusSelect, { value: userStatus, customStatus: customStatus, onChange: (statusId, customText) => {
                                                    setUserStatus(statusId);
                                                    setCustomStatus(customText || '');
                                                } })] }), _jsxs(Card, { className: "mt-6", children: [_jsx("h2", { className: "mb-4 text-sm font-semibold text-sky-300", children: "\u0421\u043E\u0446\u0438\u0430\u043B\u044C\u043D\u044B\u0435 \u0441\u0435\u0442\u0438" }), _jsx(SocialLinks, { links: socialLinks, onChange: (links) => setSocialLinks(links), editable: true })] }), _jsx(Card, { className: "mt-6 relative z-40", children: _jsx(ThemeSelector, { value: profileTheme, customColor1: customThemeColor1, customColor2: customThemeColor2, onChange: (themeId, color1, color2) => {
                                                setProfileTheme(themeId);
                                                if (color1)
                                                    setCustomThemeColor1(color1);
                                                if (color2)
                                                    setCustomThemeColor2(color2);
                                            } }) }), _jsxs(Card, { className: "mt-6", children: [_jsx("h2", { className: "mb-4 text-sm font-semibold text-sky-300", children: "\u041E\u0431\u043E\u0438 \u043F\u0440\u043E\u0444\u0438\u043B\u044F" }), _jsx("p", { className: "mb-3 text-xs text-slate-400", children: "\u0411\u043E\u043B\u044C\u0448\u043E\u0435 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435, \u043A\u043E\u0442\u043E\u0440\u043E\u0435 \u0437\u0430\u043C\u0435\u043D\u0438\u0442 \u0444\u043E\u043D \u0441\u0430\u0439\u0442\u0430 \u043D\u0430 \u0432\u0430\u0448\u0435\u0439 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0435 \u043F\u0440\u043E\u0444\u0438\u043B\u044F" }), _jsx(WallpaperPicker, { value: profileWallpaper, busy: busy === 'wallpaper', onChange: async (file) => {
                                                    setBusy('wallpaper');
                                                    try {
                                                        const fd = new FormData();
                                                        fd.append('file', file);
                                                        const { data } = await http.post('/api/v1/profile/wallpaper', fd, {
                                                            withCredentials: true,
                                                        });
                                                        setProfileWallpaper(data.url);
                                                        setProfile((m) => (m ? { ...m, profileWallpaper: data.url } : m));
                                                        pushToast('success', 'Обои обновлены');
                                                    }
                                                    catch (e) {
                                                        const err = e;
                                                        pushToast('error', err?.response?.data || 'Ошибка загрузки обоев');
                                                    }
                                                    finally {
                                                        setBusy(null);
                                                    }
                                                }, onClear: () => setProfileWallpaper('') })] }), _jsxs(Card, { className: "mt-6", children: [_jsx("h2", { className: "mb-4 text-sm font-semibold text-sky-300", children: "\u0411\u0430\u043D\u043D\u0435\u0440 \u043F\u0440\u043E\u0444\u0438\u043B\u044F" }), _jsx("p", { className: "mb-3 text-xs text-slate-400", children: "\u0428\u0438\u0440\u043E\u043A\u043E\u0435 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435 \u0432 \u0448\u0430\u043F\u043A\u0435 \u0432\u0430\u0448\u0435\u0433\u043E \u043F\u0440\u043E\u0444\u0438\u043B\u044F" }), _jsx(BannerPicker, { value: bannerUrl, busy: busy === 'banner', onChange: async (file) => {
                                                    setBusy('banner');
                                                    try {
                                                        const fd = new FormData();
                                                        fd.append('file', file);
                                                        const { data } = await http.post('/api/v1/profile/banner', fd, {
                                                            withCredentials: true,
                                                        });
                                                        setBannerUrl(data.bannerUrl);
                                                        setProfile((m) => (m ? { ...m, bannerUrl: data.bannerUrl } : m));
                                                        pushToast('success', 'Баннер обновлён');
                                                    }
                                                    catch (e) {
                                                        const err = e;
                                                        pushToast('error', err?.response?.data || 'Ошибка загрузки баннера');
                                                    }
                                                    finally {
                                                        setBusy(null);
                                                    }
                                                }, onClear: () => setBannerUrl('') })] }), _jsx(DangerZoneSection, { onLogout: logout }), since && _jsxs("div", { className: "mt-3 text-center text-xs text-slate-500", children: ["\u0412\u044B \u0441 \u043D\u0430\u043C\u0438 \u0441 ", since] })] }), avatarCropOpen && avatarCropSrc && (_jsx(AvatarCropperDialog, { src: avatarCropSrc, onClose: handleAvatarCropClose, onCropped: uploadAvatarBlob }))] }) }) }), _jsx(ToastStack, { toasts: toasts, onClose: closeToast })] }));
}
function normalizeMessage(value) {
    if (!value)
        return '';
    if (typeof value === 'string')
        return value;
    if (typeof value === 'object') {
        if (typeof value.message === 'string')
            return value.message;
        try {
            return JSON.stringify(value);
        }
        catch {
            return String(value);
        }
    }
    return String(value);
}
