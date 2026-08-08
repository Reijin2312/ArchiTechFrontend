import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { http } from '../../shared/api/http.js';
import { endpoints } from '../../shared/api/endpoints.js';
import { isSelf } from '../../shared/auth/isSelf.js';
import { useWallpaper } from '../../shared/ui/wallpaper/useWallpaper.js';
import { Seo } from '../../shared/seo/seo.js';
import { ProfileThemeProvider } from '../../shared/ui/utils/ProfileThemeContext.js';
import { Skin3DViewer } from '../../shared/ui/skin/Skin3DViewer.js';
import { useToast } from '../../shared/hooks/settings/useToast.js';
import { ToastStack } from '../../pages/settings/SettingsProfile/ToastStack.js';
const MAX_SLOTS = 10;
const MAX_UPLOAD_SIZE = 2 * 1024 * 1024;
export default function UserSkinsPage() {
    const username = useParams().username ?? '';
    const self = isSelf(username);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState(null);
    const [notice, setNotice] = useState(null);
    const [busy, setBusy] = useState(null);
    const [selectedSlot, setSelectedSlot] = useState(0);
    const [activeSlotOverride, setActiveSlotOverride] = useState(null);
    const [dragOverSlot, setDragOverSlot] = useState(null);
    const [uploadModel, setUploadModel] = useState('classic');
    const fileInputRef = useRef(null);
    const { toasts, pushToast, closeToast } = useToast();
    useWallpaper(user?.profileWallpaper || '/images/bg.avif');
    useEffect(() => {
        let alive = true;
        setLoading(true);
        setErr(null);
        setNotice(null);
        setActiveSlotOverride(null);
        const req = self
            ? http.get(endpoints.profileMe, { withCredentials: true })
            : http.get(endpoints.userByName(username));
        req
            .then(({ data }) => {
            if (!alive)
                return;
            const normalized = normalizeUser(data);
            const normalizedSavedSkins = applyActiveSavedSkinId(normalizeSavedSkins(normalized.savedSkins), normalized.activeSavedSkinId);
            const next = { ...normalized, savedSkins: normalizedSavedSkins };
            setUser(next);
            setSelectedSlot(resolveInitialSelectedSlot(next, normalizedSavedSkins));
        })
            .catch((e) => {
            if (!alive)
                return;
            setErr(toErrorText(e, 'Не удалось загрузить галерею скинов'));
        })
            .finally(() => {
            if (alive)
                setLoading(false);
        });
        return () => {
            alive = false;
        };
    }, [username, self]);
    useEffect(() => {
        if (!notice)
            return;
        pushToast('success', notice);
        setNotice(null);
    }, [notice, pushToast]);
    const savedSkins = useMemo(() => applyActiveSavedSkinId(normalizeSavedSkins(user?.savedSkins), user?.activeSavedSkinId), [user?.savedSkins, user?.activeSavedSkinId]);
    const slots = useMemo(() => buildSlots(savedSkins), [savedSkins]);
    const selectedSkin = slots[selectedSlot];
    const selectedSkinLegacy = Boolean(selectedSkin && isLegacyActiveSkinUrl(selectedSkin.url));
    const legacySlotsCount = useMemo(() => slots.filter((slot) => Boolean(slot && isLegacyActiveSkinUrl(slot.url))).length, [slots]);
    const allEmpty = slots.every((slot) => !slot);
    const hasCurrentSkin = Boolean(user?.skinUrl);
    const displayName = user?.displayName || user?.username || username;
    const profileHref = `/u/${encodeURIComponent(username)}`;
    const activeSkinPath = useMemo(() => canonicalSkinPath(user?.skinUrl), [user?.skinUrl]);
    const activeSlotFromStored = useMemo(() => slots.findIndex((slot) => Boolean(slot?.active)), [slots]);
    const activeSlotFromPath = useMemo(() => slots.findIndex((slot) => {
        if (!slot || !activeSkinPath)
            return false;
        return canonicalSkinPath(slot.url) === activeSkinPath;
    }), [slots, activeSkinPath]);
    const carouselSlots = useMemo(() => {
        if (!allEmpty || !user?.skinUrl)
            return slots;
        const virtualCurrentSkin = {
            id: '__current__',
            name: 'Текущий скин',
            url: user.skinUrl,
            model: user.skinModel === 'slim' ? 'slim' : 'classic',
            savedAt: '',
            slot: 0,
        };
        const next = [...slots];
        if (!next[0])
            next[0] = virtualCurrentSkin;
        return next;
    }, [allEmpty, slots, user?.skinModel, user?.skinUrl]);
    const carouselCards = useMemo(() => {
        const cards = [];
        for (let i = 0; i < MAX_SLOTS; i += 1) {
            const delta = wrappedDelta(selectedSlot, i, MAX_SLOTS);
            const abs = Math.abs(delta);
            cards.push({ index: i, delta, abs, visible: abs <= 3, skin: carouselSlots[i] });
        }
        return cards;
    }, [carouselSlots, selectedSlot]);
    async function refreshSelfProfile() {
        if (!self)
            return;
        const { data } = await http.get(endpoints.profileMe, { withCredentials: true });
        const normalized = normalizeUser(data);
        setUser(normalized);
    }
    async function persistSavedSkins(nextSavedSkins) {
        if (!self || !user)
            return;
        setBusy('save');
        setErr(null);
        try {
            await http.put(endpoints.profileMe, {
                displayName: user.displayName ?? '',
                bio: user.bio ?? '',
                location: user.location ?? '',
                website: user.website ?? '',
                birthDate: user.birthDate ?? null,
                profileTheme: user.profileTheme,
                customThemeColor1: user.customThemeColor1,
                customThemeColor2: user.customThemeColor2,
                userStatus: user.userStatus,
                customStatus: user.customStatus,
                socialLinks: user.socialLinks ?? [],
                savedSkins: nextSavedSkins,
                activeSavedSkinId: nextSavedSkins.find((skin) => skin.active)?.id ?? null,
            }, { withCredentials: true, headers: { 'Content-Type': 'application/json' } });
            await refreshSelfProfile();
            setNotice('Галерея скинов обновлена');
        }
        catch (e) {
            setErr(toErrorText(e, 'Не удалось сохранить галерею'));
        }
        finally {
            setBusy(null);
        }
    }
    async function uploadSkinFile(file, model, target = 'active') {
        const fd = new FormData();
        fd.append('file', file);
        const query = new URLSearchParams({ model });
        if (target === 'gallery') {
            query.set('gallery', '1');
            query.set('target', 'gallery');
        }
        const url = `${endpoints.profileSkin}?${query.toString()}`;
        const { data } = await http.post(url, fd, { withCredentials: true });
        if (target === 'gallery' && !isSavedSkinUrl(data.skinUrl)) {
            throw new Error('Сервер сохранил скин как активный, а не как слот. Обновите/перезапустите LauncherBackend с поддержкой gallery.');
        }
        return { url: data.skinUrl, model: data.skinModel === 'slim' ? 'slim' : model };
    }
    async function applySavedSkinAsActive(skin) {
        const skinUrl = toAbsoluteUrl(skin.url);
        const response = await fetch(skinUrl, { credentials: 'include' });
        if (!response.ok)
            throw new Error(`Не удалось получить файл скина (${response.status})`);
        const blob = await response.blob();
        const file = new File([blob], `${skin.id}.png`, { type: blob.type || 'image/png' });
        await uploadSkinFile(file, skin.model, 'active');
    }
    async function onUploadToSlot(file, slot) {
        if (!self)
            return;
        setDragOverSlot(null);
        const validationError = validateSkinFile(file);
        if (validationError) {
            setErr(validationError);
            setNotice(null);
            return;
        }
        setBusy('upload');
        setErr(null);
        setNotice(null);
        try {
            const uploaded = await uploadSkinFile(file, uploadModel, 'gallery');
            const skin = {
                id: makeSkinId(),
                name: `Скин ${slot + 1}`,
                url: uploaded.url,
                model: uploaded.model,
                savedAt: new Date().toISOString(),
                slot,
                active: false,
            };
            const next = upsertSkinAtSlot(savedSkins, skin, slot);
            await persistSavedSkins(next);
            setNotice(`Скин загружен в слот #${slot + 1}`);
            setSelectedSlot(slot);
        }
        catch (e) {
            setErr(toErrorText(e, 'Не удалось загрузить скин'));
            setBusy(null);
        }
    }
    function openFileChooser(slot) {
        if (!self || busy !== null)
            return;
        setSelectedSlot(slot);
        fileInputRef.current?.click();
    }
    async function onApplySelectedSkin() {
        if (!self || !selectedSkin)
            return;
        if (isLegacyActiveSkinUrl(selectedSkin.url)) {
            setErr('Этот слот сохранён в старом формате и ссылается на активный скин. Перезагрузите скин в слот.');
            setNotice(null);
            return;
        }
        setBusy('apply');
        setErr(null);
        setNotice(null);
        try {
            await applySavedSkinAsActive(selectedSkin);
            const nextSavedSkins = markActiveSavedSkin(savedSkins, selectedSkin.id);
            await persistSavedSkins(nextSavedSkins);
            setActiveSlotOverride(selectedSlot);
            setNotice('Скин применён');
        }
        catch (e) {
            setErr(toErrorText(e, 'Не удалось применить скин'));
        }
        finally {
            setBusy(null);
        }
    }
    async function onDeleteSelectedSkin() {
        if (!self || !selectedSkin)
            return;
        setBusy('delete');
        setErr(null);
        setNotice(null);
        try {
            const wasActive = Boolean(selectedSkin.active ||
                (activeSlotOverride !== null && activeSlotOverride === selectedSlot) ||
                (activeSlotFromStored >= 0 && activeSlotFromStored === selectedSlot) ||
                (activeSlotFromPath >= 0 && activeSlotFromPath === selectedSlot));
            const next = removeSkinFromSlot(savedSkins, selectedSlot);
            if (wasActive) {
                const nextSlots = buildSlots(next);
                const fallbackSlot = findNearestFilledSlot(nextSlots, selectedSlot);
                if (fallbackSlot >= 0) {
                    const fallbackSkin = nextSlots[fallbackSlot];
                    await applySavedSkinAsActive(fallbackSkin);
                    const nextMarked = markActiveSavedSkin(next, fallbackSkin.id);
                    await persistSavedSkins(nextMarked);
                    setSelectedSlot(fallbackSlot);
                    setActiveSlotOverride(fallbackSlot);
                    setNotice('Скин удалён. Активным назначен ближайший слот.');
                }
                else {
                    const nextCleared = clearActiveSavedSkin(next);
                    await persistSavedSkins(nextCleared);
                    setActiveSlotOverride(null);
                    setNotice('Скин удалён из галереи');
                }
            }
            else {
                await persistSavedSkins(next);
                if (activeSlotOverride === selectedSlot)
                    setActiveSlotOverride(null);
                setNotice('Скин удалён из галереи');
            }
        }
        catch {
            setBusy(null);
        }
    }
    async function onAddCurrentSkinToSlot() {
        if (!self || !user?.skinUrl)
            return;
        setBusy('upload');
        setErr(null);
        setNotice(null);
        try {
            const model = user.skinModel === 'slim' ? 'slim' : 'classic';
            const sourceUrl = toAbsoluteUrl(user.skinUrl);
            const response = await fetch(sourceUrl, { credentials: 'include' });
            if (!response.ok)
                throw new Error(`Не удалось получить текущий скин (${response.status})`);
            const blob = await response.blob();
            const file = new File([blob], `current_${Date.now()}.png`, { type: blob.type || 'image/png' });
            const uploaded = await uploadSkinFile(file, model, 'gallery');
            const skin = {
                id: makeSkinId(),
                name: `Скин ${selectedSlot + 1}`,
                url: uploaded.url,
                model: uploaded.model,
                savedAt: new Date().toISOString(),
                slot: selectedSlot,
                active: false,
            };
            const next = upsertSkinAtSlot(savedSkins, skin, selectedSlot);
            await persistSavedSkins(next);
        }
        catch (e) {
            setErr(toErrorText(e, 'Не удалось сохранить текущий скин в слот'));
            setBusy(null);
        }
    }
    const moveCarouselLeft = () => setSelectedSlot((v) => wrapIndex(v - 1, MAX_SLOTS));
    const moveCarouselRight = () => setSelectedSlot((v) => wrapIndex(v + 1, MAX_SLOTS));
    return (_jsxs(_Fragment, { children: [_jsx(Seo, { title: `Галерея скинов ${displayName} — ArchiTech MC`, robots: "noindex,follow" }), _jsx(ProfileThemeProvider, { themeId: user?.profileTheme, customColor1: user?.customThemeColor1, customColor2: user?.customThemeColor2, children: _jsx("div", { className: "min-h-dvh", children: _jsxs("main", { className: "mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 py-6", children: [_jsxs("section", { className: "relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70 p-5 shadow-[0_24px_60px_-30px_rgba(0,0,0,.8)]", children: [_jsxs("div", { className: "pointer-events-none absolute inset-0", children: [_jsx("div", { className: "absolute -left-20 top-0 h-56 w-56 rounded-full bg-sky-500/12 blur-3xl" }), _jsx("div", { className: "absolute right-0 top-0 h-56 w-56 rounded-full bg-indigo-500/12 blur-3xl" })] }), _jsxs("div", { className: "relative z-10 mb-6 flex items-start justify-center", children: [_jsxs("div", { className: "inline-flex items-center justify-center gap-4", children: [_jsx("div", { className: "h-14 w-14 overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900 shadow-[0_8px_24px_-12px_rgba(14,165,233,.45)]", children: user?.avatarUrl ? (_jsx("img", { src: user.avatarUrl, alt: "\u0410\u0432\u0430\u0442\u0430\u0440", loading: "lazy", decoding: "async", className: "h-full w-full object-cover" })) : (_jsx("div", { className: "grid h-full w-full place-items-center text-lg font-semibold text-slate-300", children: (displayName?.charAt(0) || '?').toUpperCase() })) }), _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "text-xs uppercase tracking-[0.16em] text-slate-400", children: "\u0413\u0430\u043B\u0435\u0440\u0435\u044F \u0441\u043A\u0438\u043D\u043E\u0432" }), _jsx("h1", { className: "mt-1 text-2xl font-semibold text-slate-100 md:text-3xl", children: displayName })] })] }), _jsxs(Link, { to: profileHref, className: "absolute right-0 top-0 inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-sm text-slate-200 hover:border-slate-500", children: [_jsx("span", { "aria-hidden": "true", children: "\u2190" }), " \u041A \u043F\u0440\u043E\u0444\u0438\u043B\u044E"] })] }), loading ? (_jsx("div", { className: "h-[520px] animate-pulse rounded-2xl border border-slate-800 bg-slate-900/50" })) : (_jsxs("div", { className: "relative z-10", children: [_jsxs("div", { className: "relative h-[460px] overflow-hidden rounded-2xl border border-slate-800 bg-[radial-gradient(circle_at_50%_-20%,rgba(56,189,248,.15),rgba(2,6,23,.95)_45%)] sm:h-[520px]", children: [carouselCards.map(({ index, delta, visible, skin: renderedSkin }) => {
                                                        const dropEnabled = self && busy === null && visible;
                                                        const isDropTarget = dragOverSlot === index;
                                                        const isActiveSkin = Boolean(renderedSkin &&
                                                            ((activeSlotOverride !== null && activeSlotOverride === index) ||
                                                                (activeSlotFromStored >= 0 && activeSlotFromStored === index) ||
                                                                (activeSlotFromPath >= 0 && activeSlotFromPath === index) ||
                                                                (activeSkinPath && canonicalSkinPath(renderedSkin.url) === activeSkinPath)));
                                                        return (_jsxs("button", { type: "button", onClick: () => {
                                                                if (self && index === selectedSlot) {
                                                                    openFileChooser(index);
                                                                    return;
                                                                }
                                                                setSelectedSlot(index);
                                                            }, onDragOver: (e) => {
                                                                if (!dropEnabled)
                                                                    return;
                                                                e.preventDefault();
                                                                if (dragOverSlot !== index)
                                                                    setDragOverSlot(index);
                                                            }, onDragEnter: (e) => {
                                                                if (!dropEnabled)
                                                                    return;
                                                                e.preventDefault();
                                                                setDragOverSlot(index);
                                                            }, onDragLeave: () => {
                                                                if (dragOverSlot === index)
                                                                    setDragOverSlot(null);
                                                            }, onDrop: (e) => {
                                                                if (!dropEnabled)
                                                                    return;
                                                                e.preventDefault();
                                                                setDragOverSlot(null);
                                                                const file = e.dataTransfer.files?.[0];
                                                                if (!file)
                                                                    return;
                                                                void onUploadToSlot(file, index);
                                                            }, className: `absolute left-1/2 top-1/2 h-[290px] w-[198px] overflow-hidden rounded-2xl border text-left transition-[transform,opacity,border-color,box-shadow] duration-700 ease-[cubic-bezier(.22,1,.36,1)] will-change-transform sm:h-[350px] sm:w-[238px] ${!visible ? 'pointer-events-none' : ''} ${isDropTarget ? 'border-sky-300 shadow-[0_0_0_1px_rgba(56,189,248,.65),0_20px_52px_-20px_rgba(56,189,248,.75)]' : ''} ${self ? 'cursor-pointer' : ''} ${isActiveSkin ? 'ring-2 ring-emerald-300/90 shadow-[0_0_0_1px_rgba(16,185,129,.55),0_18px_48px_-18px_rgba(16,185,129,.5)]' : ''} ${!isActiveSkin && delta === 0 && visible
                                                                ? 'border-sky-400/80 shadow-[0_18px_48px_-20px_rgba(56,189,248,.55)]'
                                                                : !isActiveSkin
                                                                    ? 'border-slate-700/80 hover:border-slate-500'
                                                                    : ''}`, style: cardStyle(delta, visible), "aria-label": `Слот ${index + 1}`, "aria-hidden": !visible, children: [renderedSkin ? (_jsxs("div", { className: "relative h-full w-full", children: [_jsx(Skin3DViewer, { className: "h-full w-full bg-slate-950", skinUrl: renderedSkin.url, autoRotate: delta === 0, animated: delta === 0 }), _jsxs("div", { className: "pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent px-3 pb-3 pt-6", children: [_jsx("div", { className: "truncate text-xs font-medium text-slate-100", children: renderedSkin.name }), _jsxs("div", { className: "text-[11px] text-slate-400", children: ["\u0421\u043B\u043E\u0442 #", index + 1, " \u00B7 ", renderedSkin.model === 'slim' ? 'Slim' : 'Classic'] })] })] })) : (_jsxs("div", { className: "flex h-full flex-col items-center justify-center gap-2 bg-slate-950/85 text-center", children: [_jsx("div", { className: "text-3xl text-slate-500", children: "+" }), _jsxs("div", { className: "text-xs text-slate-400", children: ["\u041F\u0443\u0441\u0442\u043E\u0439 \u0441\u043B\u043E\u0442 #", index + 1] })] })), isDropTarget && (_jsx("div", { className: "pointer-events-none absolute inset-0 z-10 grid place-items-center bg-sky-500/10 backdrop-blur-[1px]", children: _jsx("div", { className: "rounded-lg border border-sky-300/70 bg-slate-950/85 px-3 py-1.5 text-xs text-sky-200", children: "\u041E\u0442\u043F\u0443\u0441\u0442\u0438\u0442\u0435 \u0444\u0430\u0439\u043B \u0434\u043B\u044F \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438" }) }))] }, index));
                                                    }), _jsx("button", { type: "button", onClick: moveCarouselLeft, className: "absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-slate-700 bg-slate-900/75 p-2.5 text-slate-100 hover:border-slate-500 sm:left-5", "aria-label": "\u041F\u0440\u0435\u0434\u044B\u0434\u0443\u0449\u0438\u0439 \u0441\u043B\u043E\u0442", children: "\u2039" }), _jsx("button", { type: "button", onClick: moveCarouselRight, className: "absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-slate-700 bg-slate-900/75 p-2.5 text-slate-100 hover:border-slate-500 sm:right-5", "aria-label": "\u0421\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0439 \u0441\u043B\u043E\u0442", children: "\u203A" }), _jsx("div", { className: "absolute bottom-10 left-1/2 z-20 flex -translate-x-1/2 items-center justify-center gap-2", children: Array.from({ length: MAX_SLOTS }).map((_, index) => (_jsx("button", { type: "button", onClick: () => setSelectedSlot(index), className: `h-2.5 rounded-full transition-all ${index === selectedSlot ? 'w-8 bg-sky-400' : slots[index] ? 'w-2.5 bg-slate-500' : 'w-2.5 bg-slate-700'}`, "aria-label": `Выбрать слот ${index + 1}` }, index))) })] }), self ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "mt-5 flex items-center justify-center gap-2", children: [_jsx("button", { type: "button", onClick: () => setUploadModel('classic'), className: `rounded-lg border px-3 py-1.5 text-xs ${uploadModel === 'classic'
                                                                    ? 'border-sky-700 bg-sky-900/40 text-sky-200'
                                                                    : 'border-slate-700 text-slate-300 hover:border-slate-500'}`, children: "Classic" }), _jsx("button", { type: "button", onClick: () => setUploadModel('slim'), className: `rounded-lg border px-3 py-1.5 text-xs ${uploadModel === 'slim'
                                                                    ? 'border-sky-700 bg-sky-900/40 text-sky-200'
                                                                    : 'border-slate-700 text-slate-300 hover:border-slate-500'}`, children: "Slim" })] }), _jsxs("div", { className: "mt-3 flex flex-wrap items-center justify-center gap-2 text-sm text-slate-300", children: [_jsx("button", { type: "button", onClick: () => openFileChooser(selectedSlot), disabled: busy !== null, className: "rounded-lg border border-emerald-700/70 bg-emerald-900/25 px-3 py-1.5 text-emerald-200 hover:border-emerald-500 disabled:opacity-60", children: "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0432 \u0441\u043B\u043E\u0442" }), selectedSkin ? (_jsxs(_Fragment, { children: [_jsx("button", { type: "button", onClick: onApplySelectedSkin, disabled: busy !== null || selectedSkinLegacy, className: "rounded-lg border border-sky-700 bg-sky-900/30 px-3 py-1.5 text-sky-100 hover:border-sky-500 disabled:cursor-not-allowed disabled:opacity-60", children: "\u0421\u0434\u0435\u043B\u0430\u0442\u044C \u0430\u043A\u0442\u0438\u0432\u043D\u044B\u043C" }), _jsx("button", { type: "button", onClick: onDeleteSelectedSkin, disabled: busy !== null, className: "rounded-lg border border-red-700/60 bg-red-900/25 px-3 py-1.5 text-red-200 hover:border-red-500 disabled:opacity-60", children: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0438\u0437 \u0441\u043B\u043E\u0442\u0430" })] })) : (hasCurrentSkin && (_jsx("button", { type: "button", onClick: onAddCurrentSkinToSlot, disabled: busy !== null, className: "rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-slate-200 hover:border-slate-500 disabled:opacity-60", children: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C" })))] }), _jsx("div", { className: "mt-3 text-center text-xs text-slate-300", children: "\u041F\u0435\u0440\u0435\u0442\u0430\u0449\u0438\u0442\u0435 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435 \u0432 \u043D\u0443\u0436\u043D\u044B\u0439 \u0441\u043B\u043E\u0442 \u0438\u043B\u0438 \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \u043D\u0430 \u0446\u0435\u043D\u0442\u0440\u0430\u043B\u044C\u043D\u0443\u044E \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0443 \u0434\u043B\u044F \u0432\u044B\u0431\u043E\u0440\u0430 \u0444\u0430\u0439\u043B\u0430." }), _jsx("div", { className: "text-center text-[11px] text-slate-500", children: "PNG/JPG \u0434\u043E 2 \u041C\u0411, 64\u00D764 \u0438\u043B\u0438 64\u00D732" }), legacySlotsCount > 0 && (_jsxs("div", { className: "mt-3 rounded-xl border border-amber-700/60 bg-amber-950/30 p-3 text-center text-xs text-amber-200", children: ["\u041D\u0430\u0439\u0434\u0435\u043D\u043E \u0441\u043B\u043E\u0442\u043E\u0432 \u0441\u0442\u0430\u0440\u043E\u0433\u043E \u0444\u043E\u0440\u043C\u0430\u0442\u0430: ", legacySlotsCount, ". \u0418\u0445 \u043D\u0443\u0436\u043D\u043E \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0437\u0430\u043D\u043E\u0432\u043E, \u0438\u043D\u0430\u0447\u0435 \u043E\u043D\u0438 \u0431\u0443\u0434\u0443\u0442 \u0441\u0441\u044B\u043B\u0430\u0442\u044C\u0441\u044F \u043D\u0430 \u0442\u0435\u043A\u0443\u0449\u0438\u0439 \u0430\u043A\u0442\u0438\u0432\u043D\u044B\u0439 \u0441\u043A\u0438\u043D."] })), _jsx("input", { ref: fileInputRef, type: "file", accept: "image/png,image/jpeg,image/jpg", className: "hidden", onChange: (e) => {
                                                            const file = e.currentTarget.files?.[0];
                                                            e.currentTarget.value = '';
                                                            if (file)
                                                                void onUploadToSlot(file, selectedSlot);
                                                        } })] })) : (_jsx("div", { className: "mt-4 text-center text-sm text-slate-500", children: "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443 \u043F\u0440\u043E\u0444\u0438\u043B\u044F." })), err && _jsx("div", { className: "mt-4 rounded-xl border border-red-800 bg-red-950/30 p-3 text-sm text-red-300", children: err })] }))] }), _jsx(ToastStack, { toasts: toasts, onClose: closeToast })] }) }) })] }));
}
function cardStyle(delta, visible) {
    const abs = Math.abs(delta);
    const scale = abs === 0 ? 1 : abs === 1 ? 0.88 : abs === 2 ? 0.8 : 0.72;
    const translateX = abs === 0 ? 0 : abs === 1 ? delta * 140 : abs === 2 ? delta * 150 : delta * 151;
    const translateY = abs === 0 ? 0 : abs === 1 ? 6 : abs === 2 ? 12 : 18;
    const rotateY = abs === 0 ? 0 : delta * -10;
    const opacity = !visible ? 0 : abs === 0 ? 1 : abs === 1 ? 0.94 : abs === 2 ? 0.84 : 0.7;
    const zIndex = abs === 0 ? 30 : abs === 1 ? 20 : abs === 2 ? 12 : 6;
    return {
        transform: `translate(-50%, -50%) translateX(${translateX}px) translateY(${translateY}px) scale(${scale}) rotateY(${rotateY}deg)`,
        opacity,
        zIndex,
    };
}
function wrapIndex(value, total) {
    if (total <= 0)
        return 0;
    return ((value % total) + total) % total;
}
function wrappedDelta(from, to, total) {
    let delta = to - from;
    const half = total / 2;
    if (delta > half)
        delta -= total;
    if (delta < -half)
        delta += total;
    return delta;
}
function firstFilledSlot(slots) {
    const idx = slots.findIndex(Boolean);
    return idx >= 0 ? idx : 0;
}
function resolveInitialSelectedSlot(user, skins) {
    const slots = buildSlots(skins);
    const activeByFlag = slots.findIndex((slot) => Boolean(slot?.active));
    if (activeByFlag >= 0)
        return activeByFlag;
    const activePath = canonicalSkinPath(user.skinUrl);
    if (activePath) {
        const activeByPath = slots.findIndex((slot) => Boolean(slot && canonicalSkinPath(slot.url) === activePath));
        if (activeByPath >= 0)
            return activeByPath;
    }
    return firstFilledSlot(slots);
}
function buildSlots(skins) {
    const slots = Array.from({ length: MAX_SLOTS }, () => null);
    for (const skin of skins) {
        const slot = typeof skin.slot === 'number' ? skin.slot : -1;
        if (slot < 0 || slot >= MAX_SLOTS)
            continue;
        slots[slot] = skin;
    }
    return slots;
}
function upsertSkinAtSlot(skins, nextSkin, slot) {
    const cleaned = skins.filter((skin) => skin.slot !== slot && skin.id !== nextSkin.id);
    cleaned.push({ ...nextSkin, slot });
    return normalizeSavedSkins(cleaned);
}
function removeSkinFromSlot(skins, slot) {
    return normalizeSavedSkins(skins.filter((skin) => skin.slot !== slot));
}
function markActiveSavedSkin(skins, activeId) {
    return normalizeSavedSkins(skins.map((skin) => ({
        ...skin,
        active: skin.id === activeId,
    })));
}
function clearActiveSavedSkin(skins) {
    return normalizeSavedSkins(skins.map((skin) => ({
        ...skin,
        active: false,
    })));
}
function applyActiveSavedSkinId(skins, activeId) {
    const normalizedActiveId = typeof activeId === 'string' ? activeId.trim() : '';
    if (!normalizedActiveId)
        return skins;
    if (!skins.some((skin) => skin.id === normalizedActiveId))
        return skins;
    return markActiveSavedSkin(skins, normalizedActiveId);
}
function findNearestFilledSlot(slots, from) {
    if (!slots.some(Boolean))
        return -1;
    const total = slots.length;
    for (let d = 0; d < total; d += 1) {
        const right = wrapIndex(from + d, total);
        if (slots[right])
            return right;
        const left = wrapIndex(from - d, total);
        if (slots[left])
            return left;
    }
    return -1;
}
function normalizeUser(user) {
    return {
        ...user,
        savedSkins: normalizeSavedSkins(user.savedSkins),
    };
}
function normalizeSavedSkins(raw) {
    if (!Array.isArray(raw))
        return [];
    const out = [];
    const usedSlots = new Set();
    let fallbackSlot = 0;
    let hasActive = false;
    for (const item of raw) {
        if (!item || typeof item !== 'object')
            continue;
        const entry = item;
        const url = typeof entry.url === 'string' ? entry.url.trim() : '';
        if (!url)
            continue;
        const id = typeof entry.id === 'string' && entry.id.trim() ? entry.id : makeSkinId();
        const name = typeof entry.name === 'string' && entry.name.trim() ? entry.name.trim() : 'Скин';
        const model = entry.model === 'slim' ? 'slim' : 'classic';
        const savedAt = typeof entry.savedAt === 'string' ? entry.savedAt : new Date().toISOString();
        const activeRaw = entry.active === true;
        let slot = Number.isInteger(entry.slot) ? Number(entry.slot) : -1;
        if (slot < 0 || slot >= MAX_SLOTS || usedSlots.has(slot)) {
            while (fallbackSlot < MAX_SLOTS && usedSlots.has(fallbackSlot))
                fallbackSlot += 1;
            slot = fallbackSlot < MAX_SLOTS ? fallbackSlot : -1;
        }
        if (slot < 0 || slot >= MAX_SLOTS)
            continue;
        usedSlots.add(slot);
        const active = !hasActive && activeRaw;
        if (active)
            hasActive = true;
        out.push({ id, name, url, model, savedAt, slot, active });
    }
    out.sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0));
    return out;
}
function toAbsoluteUrl(url) {
    if (/^https?:\/\//i.test(url))
        return url;
    return new URL(url, window.location.origin).toString();
}
function canonicalSkinPath(url) {
    if (!url)
        return null;
    try {
        const parsed = new URL(url, window.location.origin);
        return `${parsed.origin}${parsed.pathname}`;
    }
    catch {
        return null;
    }
}
function isSavedSkinUrl(url) {
    if (!url)
        return false;
    try {
        const parsed = new URL(url, window.location.origin);
        return parsed.pathname.includes('/media/saved-skins/');
    }
    catch {
        return false;
    }
}
function isLegacyActiveSkinUrl(url) {
    if (!url)
        return false;
    try {
        const parsed = new URL(url, window.location.origin);
        return parsed.pathname.includes('/media/skins/') || parsed.pathname.includes('/api/v1/profile/skin');
    }
    catch {
        return false;
    }
}
function validateSkinFile(file) {
    if (!file.type.startsWith('image/')) {
        return 'Можно загружать только изображения PNG/JPG';
    }
    if (file.size > MAX_UPLOAD_SIZE) {
        return 'Файл слишком большой (макс. 2 МБ)';
    }
    return null;
}
function toErrorText(error, fallback) {
    const fromResponse = extractErrorText(error?.response?.data);
    if (fromResponse)
        return fromResponse;
    const fromRoot = extractErrorText(error);
    if (fromRoot)
        return fromRoot;
    return fallback;
}
function extractErrorText(value) {
    if (!value)
        return null;
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed || null;
    }
    if (value instanceof Error) {
        const message = value.message?.trim();
        return message || null;
    }
    if (Array.isArray(value)) {
        const normalized = value
            .map((item) => extractErrorText(item))
            .filter((item) => Boolean(item))
            .join('; ');
        return normalized || null;
    }
    if (typeof value === 'object') {
        const record = value;
        for (const key of ['message', 'error', 'detail', 'title']) {
            const candidate = record[key];
            if (typeof candidate === 'string' && candidate.trim())
                return candidate.trim();
        }
        try {
            return JSON.stringify(value);
        }
        catch {
            return null;
        }
    }
    return null;
}
function makeSkinId() {
    return `skin_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
