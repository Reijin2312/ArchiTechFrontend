import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { http } from '@/shared/api/http';
import { endpoints } from '@/shared/api/endpoints';
import { isSelf } from '@/shared/auth/isSelf';
import { useWallpaper } from '@/shared/ui/wallpaper/useWallpaper';
import { Seo } from '@/shared/seo/seo';
import { ProfileThemeProvider } from '@/shared/ui/utils/ProfileThemeContext';
import { Skin3DViewer } from '@/shared/ui/skin/Skin3DViewer';

type SkinModel = 'classic' | 'slim';

type SavedSkin = {
  id: string;
  name: string;
  url: string;
  model: SkinModel;
  savedAt: string;
  slot?: number;
};

type PublicUser = {
  id: string;
  userId?: string;
  username: string;
  displayName?: string;
  bio?: string;
  location?: string;
  website?: string;
  birthDate?: string | null;
  avatarUrl?: string;
  skinUrl?: string;
  skinModel?: SkinModel;
  profileTheme?: string;
  customThemeColor1?: string;
  customThemeColor2?: string;
  profileWallpaper?: string;
  userStatus?: string;
  customStatus?: string;
  socialLinks?: Array<{ type: string; value: string }>;
  savedSkins?: SavedSkin[];
};

type Me = PublicUser & { email?: string };

const MAX_SLOTS = 10;
const MAX_UPLOAD_SIZE = 2 * 1024 * 1024;

export default function UserSkinsPage() {
  const username = useParams().username ?? '';
  const self = isSelf(username);

  const [user, setUser] = useState<PublicUser | Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<'upload' | 'apply' | 'save' | 'delete' | null>(null);
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);
  const [uploadModel, setUploadModel] = useState<SkinModel>('classic');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useWallpaper(user?.profileWallpaper || '/images/bg.avif');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);
    setNotice(null);

    const req = self
      ? http.get<Me>(endpoints.profileMe, { withCredentials: true })
      : http.get<PublicUser>(endpoints.userByName(username));

    req
      .then(({ data }) => {
        if (!alive) return;
        const next = normalizeUser(data);
        setUser(next);
        const slots = buildSlots(next.savedSkins ?? []);
        setSelectedSlot(firstFilledSlot(slots));
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setErr(toErrorText(e, 'Не удалось загрузить галерею скинов'));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [username, self]);

  const savedSkins = useMemo(() => normalizeSavedSkins(user?.savedSkins), [user?.savedSkins]);
  const slots = useMemo(() => buildSlots(savedSkins), [savedSkins]);
  const selectedSkin = slots[selectedSlot];
  const allEmpty = slots.every((slot) => !slot);
  const hasCurrentSkin = Boolean(user?.skinUrl);
  const displayName = user?.displayName || user?.username || username;
  const profileHref = `/u/${encodeURIComponent(username)}`;

  const carouselSlots = useMemo(() => {
    if (!allEmpty || !user?.skinUrl) return slots;
    const virtualCurrentSkin: SavedSkin = {
      id: '__current__',
      name: 'Текущий скин',
      url: user.skinUrl,
      model: user.skinModel === 'slim' ? 'slim' : 'classic',
      savedAt: '',
      slot: 0,
    };
    const next: Array<SavedSkin | null> = [...slots];
    if (!next[0]) next[0] = virtualCurrentSkin;
    return next;
  }, [allEmpty, slots, user?.skinModel, user?.skinUrl]);

  const carouselCards = useMemo(() => {
    const cards: Array<{ index: number; delta: number; abs: number; visible: boolean; skin: SavedSkin | null }> = [];
    for (let i = 0; i < MAX_SLOTS; i += 1) {
      const delta = wrappedDelta(selectedSlot, i, MAX_SLOTS);
      const abs = Math.abs(delta);
      cards.push({ index: i, delta, abs, visible: abs <= 3, skin: carouselSlots[i] });
    }
    return cards;
  }, [carouselSlots, selectedSlot]);

  async function refreshSelfProfile() {
    if (!self) return;
    const { data } = await http.get<Me>(endpoints.profileMe, { withCredentials: true });
    const normalized = normalizeUser(data);
    setUser(normalized);
  }

  async function persistSavedSkins(nextSavedSkins: SavedSkin[]) {
    if (!self || !user) return;
    setBusy('save');
    setErr(null);
    try {
      await http.put(
        endpoints.profileMe,
        {
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
        },
        { withCredentials: true, headers: { 'Content-Type': 'application/json' } },
      );
      await refreshSelfProfile();
      setNotice('Галерея скинов обновлена');
    } catch (e: unknown) {
      setErr(toErrorText(e, 'Не удалось сохранить галерею'));
    } finally {
      setBusy(null);
    }
  }

  async function uploadSkinFile(file: File, model: SkinModel) {
    const fd = new FormData();
    fd.append('file', file);
    const url = `${endpoints.profileSkin}?model=${encodeURIComponent(model)}`;
    const { data } = await http.post<{ skinUrl: string; skinModel?: SkinModel }>(url, fd, { withCredentials: true });
    return { url: data.skinUrl, model: data.skinModel === 'slim' ? 'slim' : model };
  }

  async function onUploadToSlot(file: File, slot: number) {
    if (!self) return;
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
      const uploaded = await uploadSkinFile(file, uploadModel);
      const skin: SavedSkin = {
        id: makeSkinId(),
        name: `Скин ${slot + 1}`,
        url: uploaded.url,
        model: uploaded.model,
        savedAt: new Date().toISOString(),
        slot,
      };
      const next = upsertSkinAtSlot(savedSkins, skin, slot);
      await persistSavedSkins(next);
      setNotice(`Скин загружен в слот #${slot + 1}`);
      setSelectedSlot(slot);
    } catch (e: unknown) {
      setErr(toErrorText(e, 'Не удалось загрузить скин'));
      setBusy(null);
    }
  }

  function openFileChooser(slot: number) {
    if (!self || busy !== null) return;
    setSelectedSlot(slot);
    fileInputRef.current?.click();
  }

  async function onApplySelectedSkin() {
    if (!self || !selectedSkin) return;
    setBusy('apply');
    setErr(null);
    setNotice(null);
    try {
      const skinUrl = toAbsoluteUrl(selectedSkin.url);
      const response = await fetch(skinUrl, { credentials: 'include' });
      if (!response.ok) throw new Error(`Не удалось получить файл скина (${response.status})`);
      const blob = await response.blob();
      const file = new File([blob], `${selectedSkin.id}.png`, { type: blob.type || 'image/png' });
      await uploadSkinFile(file, selectedSkin.model);
      await refreshSelfProfile();
      setNotice('Скин применён');
    } catch (e: unknown) {
      setErr(toErrorText(e, 'Не удалось применить скин'));
    } finally {
      setBusy(null);
    }
  }

  async function onDeleteSelectedSkin() {
    if (!self || !selectedSkin) return;
    setBusy('delete');
    setErr(null);
    setNotice(null);
    try {
      const next = removeSkinFromSlot(savedSkins, selectedSlot);
      await persistSavedSkins(next);
      setNotice('Скин удалён из галереи');
    } catch {
      setBusy(null);
    }
  }

  async function onAddCurrentSkinToSlot() {
    if (!self || !user?.skinUrl) return;
    const model: SkinModel = user.skinModel === 'slim' ? 'slim' : 'classic';
    const skin: SavedSkin = {
      id: makeSkinId(),
      name: `Скин ${selectedSlot + 1}`,
      url: user.skinUrl,
      model,
      savedAt: new Date().toISOString(),
      slot: selectedSlot,
    };
    const next = upsertSkinAtSlot(savedSkins, skin, selectedSlot);
    await persistSavedSkins(next);
  }

  const moveCarouselLeft = () => setSelectedSlot((v) => wrapIndex(v + 1, MAX_SLOTS));
  const moveCarouselRight = () => setSelectedSlot((v) => wrapIndex(v - 1, MAX_SLOTS));

  return (
    <>
      <Seo title={`Галерея скинов ${displayName} — ArchiTech MC`} robots="noindex,follow" />
      <ProfileThemeProvider
        themeId={user?.profileTheme}
        customColor1={user?.customThemeColor1}
        customColor2={user?.customThemeColor2}
      >
        <div className="min-h-dvh">
          <main className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 py-6">
            <section className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70 p-5 shadow-[0_24px_60px_-30px_rgba(0,0,0,.8)]">
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute -left-20 top-0 h-56 w-56 rounded-full bg-sky-500/12 blur-3xl" />
                <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-indigo-500/12 blur-3xl" />
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
                    <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Галерея скинов</div>
                    <h1 className="mt-1 text-2xl font-semibold text-slate-100 md:text-3xl">{displayName}</h1>
                  </div>
                </div>
                <Link
                  to={profileHref}
                  className="absolute right-0 top-0 inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-sm text-slate-200 hover:border-slate-500"
                >
                  <span aria-hidden="true">↩</span> К профилю
                </Link>
              </div>

              {loading ? (
                <div className="h-[520px] animate-pulse rounded-2xl border border-slate-800 bg-slate-900/50" />
              ) : (
                <div className="relative z-10">
                  <div className="relative h-[460px] overflow-hidden rounded-2xl border border-slate-800 bg-[radial-gradient(circle_at_50%_-20%,rgba(56,189,248,.15),rgba(2,6,23,.95)_45%)] sm:h-[520px]">
                    {carouselCards.map(({ index, delta, visible, skin: renderedSkin }) => {
                      const dropEnabled = self && busy === null && visible;
                      const isDropTarget = dragOverSlot === index;
                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => {
                            if (self && index === selectedSlot) {
                              openFileChooser(index);
                              return;
                            }
                            setSelectedSlot(index);
                          }}
                          onDragOver={(e) => {
                            if (!dropEnabled) return;
                            e.preventDefault();
                            if (dragOverSlot !== index) setDragOverSlot(index);
                          }}
                          onDragEnter={(e) => {
                            if (!dropEnabled) return;
                            e.preventDefault();
                            setDragOverSlot(index);
                          }}
                          onDragLeave={() => {
                            if (dragOverSlot === index) setDragOverSlot(null);
                          }}
                          onDrop={(e) => {
                            if (!dropEnabled) return;
                            e.preventDefault();
                            setDragOverSlot(null);
                            const file = e.dataTransfer.files?.[0];
                            if (!file) return;
                            void onUploadToSlot(file, index);
                          }}
                          className={`absolute left-1/2 top-1/2 h-[290px] w-[198px] overflow-hidden rounded-2xl border text-left transition-[transform,opacity,border-color,box-shadow] duration-700 ease-[cubic-bezier(.22,1,.36,1)] will-change-transform sm:h-[350px] sm:w-[238px] ${
                            !visible ? 'pointer-events-none' : ''
                          } ${isDropTarget ? 'border-sky-300 shadow-[0_0_0_1px_rgba(56,189,248,.65),0_20px_52px_-20px_rgba(56,189,248,.75)]' : ''} ${
                            self ? 'cursor-pointer' : ''
                          } ${
                            delta === 0 && visible
                              ? 'border-sky-400/80 shadow-[0_18px_48px_-20px_rgba(56,189,248,.55)]'
                              : 'border-slate-700/80 hover:border-slate-500'
                          }`}
                          style={cardStyle(delta, visible)}
                          aria-label={`Слот ${index + 1}`}
                          aria-hidden={!visible}
                        >
                          {renderedSkin ? (
                            <div className="relative h-full w-full">
                              <Skin3DViewer
                                className="h-full w-full bg-slate-950"
                                skinUrl={renderedSkin.url}
                                autoRotate={delta === 0}
                                animated={delta === 0}
                              />
                              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent px-3 pb-3 pt-6">
                                <div className="truncate text-xs font-medium text-slate-100">{renderedSkin.name}</div>
                                <div className="text-[11px] text-slate-400">
                                  Слот #{index + 1} · {renderedSkin.model === 'slim' ? 'Slim' : 'Classic'}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex h-full flex-col items-center justify-center gap-2 bg-slate-950/85 text-center">
                              <div className="text-3xl text-slate-500">+</div>
                              <div className="text-xs text-slate-400">Пустой слот #{index + 1}</div>
                            </div>
                          )}
                          {isDropTarget && (
                            <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center bg-sky-500/10 backdrop-blur-[1px]">
                              <div className="rounded-lg border border-sky-300/70 bg-slate-950/85 px-3 py-1.5 text-xs text-sky-200">
                                Отпустите файл для загрузки
                              </div>
                            </div>
                          )}
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      onClick={moveCarouselLeft}
                      className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-slate-700 bg-slate-900/75 p-2.5 text-slate-100 hover:border-slate-500 sm:left-5"
                      aria-label="Предыдущий слот"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      onClick={moveCarouselRight}
                      className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-slate-700 bg-slate-900/75 p-2.5 text-slate-100 hover:border-slate-500 sm:right-5"
                      aria-label="Следующий слот"
                    >
                      ›
                    </button>
                    <div className="absolute bottom-10 left-1/2 z-20 flex -translate-x-1/2 items-center justify-center gap-2">
                      {Array.from({ length: MAX_SLOTS }).map((_, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setSelectedSlot(index)}
                          className={`h-2.5 rounded-full transition-all ${
                            index === selectedSlot ? 'w-8 bg-sky-400' : slots[index] ? 'w-2.5 bg-slate-500' : 'w-2.5 bg-slate-700'
                          }`}
                          aria-label={`Выбрать слот ${index + 1}`}
                        />
                      ))}
                    </div>
                  </div>

                  {self ? (
                    <>
                      <div className="mt-5 flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setUploadModel('classic')}
                          className={`rounded-lg border px-3 py-1.5 text-xs ${
                            uploadModel === 'classic'
                              ? 'border-sky-700 bg-sky-900/40 text-sky-200'
                              : 'border-slate-700 text-slate-300 hover:border-slate-500'
                          }`}
                        >
                          Classic
                        </button>
                        <button
                          type="button"
                          onClick={() => setUploadModel('slim')}
                          className={`rounded-lg border px-3 py-1.5 text-xs ${
                            uploadModel === 'slim'
                              ? 'border-sky-700 bg-sky-900/40 text-sky-200'
                              : 'border-slate-700 text-slate-300 hover:border-slate-500'
                          }`}
                        >
                          Slim
                        </button>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-sm text-slate-300">
                        <button
                          type="button"
                          onClick={() => openFileChooser(selectedSlot)}
                          disabled={busy !== null}
                          className="rounded-lg border border-emerald-700/70 bg-emerald-900/25 px-3 py-1.5 text-emerald-200 hover:border-emerald-500 disabled:opacity-60"
                        >
                          Загрузить в слот
                        </button>
                        {selectedSkin ? (
                          <>
                            <button
                              type="button"
                              onClick={onApplySelectedSkin}
                              disabled={busy !== null}
                              className="rounded-lg border border-sky-700 bg-sky-900/30 px-3 py-1.5 text-sky-100 hover:border-sky-500 disabled:opacity-60"
                            >
                              Сделать активным
                            </button>
                            <button
                              type="button"
                              onClick={onDeleteSelectedSkin}
                              disabled={busy !== null}
                              className="rounded-lg border border-red-700/60 bg-red-900/25 px-3 py-1.5 text-red-200 hover:border-red-500 disabled:opacity-60"
                            >
                              Удалить из слота
                            </button>
                          </>
                        ) : (
                          hasCurrentSkin && (
                            <button
                              type="button"
                              onClick={onAddCurrentSkinToSlot}
                              disabled={busy !== null}
                              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-slate-200 hover:border-slate-500 disabled:opacity-60"
                            >
                              Сохранить
                            </button>
                          )
                        )}
                      </div>

                      <div className="mt-3 text-center text-xs text-slate-300">
                        Перетащите изображение в нужный слот или нажмите на центральную карточку для выбора файла.
                      </div>
                      <div className="text-center text-[11px] text-slate-500">PNG/JPG до 2 МБ, 64×64 или 64×32</div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.currentTarget.files?.[0];
                          e.currentTarget.value = '';
                          if (file) void onUploadToSlot(file, selectedSlot);
                        }}
                      />
                    </>
                  ) : (
                    <div className="mt-4 text-center text-sm text-slate-500">
                      Редактирование доступно только владельцу профиля.
                    </div>
                  )}

                  {notice && (
                    <div className="mt-4 rounded-xl border border-emerald-800 bg-emerald-950/30 p-3 text-sm text-emerald-300">
                      {notice}
                    </div>
                  )}
                  {err && <div className="mt-4 rounded-xl border border-red-800 bg-red-950/30 p-3 text-sm text-red-300">{err}</div>}
                </div>
              )}
            </section>

          </main>
        </div>
      </ProfileThemeProvider>
    </>
  );
}

function cardStyle(delta: number, visible: boolean): React.CSSProperties {
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

function wrapIndex(value: number, total: number): number {
  if (total <= 0) return 0;
  return ((value % total) + total) % total;
}

function wrappedDelta(from: number, to: number, total: number): number {
  let delta = to - from;
  const half = total / 2;
  if (delta > half) delta -= total;
  if (delta < -half) delta += total;
  return delta;
}

function firstFilledSlot(slots: Array<SavedSkin | null>): number {
  const idx = slots.findIndex(Boolean);
  return idx >= 0 ? idx : 0;
}

function buildSlots(skins: SavedSkin[]): Array<SavedSkin | null> {
  const slots: Array<SavedSkin | null> = Array.from({ length: MAX_SLOTS }, () => null);
  for (const skin of skins) {
    const slot = typeof skin.slot === 'number' ? skin.slot : -1;
    if (slot < 0 || slot >= MAX_SLOTS) continue;
    slots[slot] = skin;
  }
  return slots;
}

function upsertSkinAtSlot(skins: SavedSkin[], nextSkin: SavedSkin, slot: number): SavedSkin[] {
  const cleaned = skins.filter((skin) => skin.slot !== slot && skin.id !== nextSkin.id);
  cleaned.push({ ...nextSkin, slot });
  return normalizeSavedSkins(cleaned);
}

function removeSkinFromSlot(skins: SavedSkin[], slot: number): SavedSkin[] {
  return normalizeSavedSkins(skins.filter((skin) => skin.slot !== slot));
}

function normalizeUser<T extends PublicUser | Me>(user: T): T {
  return {
    ...user,
    savedSkins: normalizeSavedSkins(user.savedSkins),
  };
}

function normalizeSavedSkins(raw: unknown): SavedSkin[] {
  if (!Array.isArray(raw)) return [];
  const out: SavedSkin[] = [];
  const usedSlots = new Set<number>();
  let fallbackSlot = 0;

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const entry = item as Partial<SavedSkin>;
    const url = typeof entry.url === 'string' ? entry.url.trim() : '';
    if (!url) continue;

    const id = typeof entry.id === 'string' && entry.id.trim() ? entry.id : makeSkinId();
    const name = typeof entry.name === 'string' && entry.name.trim() ? entry.name.trim() : 'Скин';
    const model: SkinModel = entry.model === 'slim' ? 'slim' : 'classic';
    const savedAt = typeof entry.savedAt === 'string' ? entry.savedAt : new Date().toISOString();

    let slot = Number.isInteger(entry.slot) ? Number(entry.slot) : -1;
    if (slot < 0 || slot >= MAX_SLOTS || usedSlots.has(slot)) {
      while (fallbackSlot < MAX_SLOTS && usedSlots.has(fallbackSlot)) fallbackSlot += 1;
      slot = fallbackSlot < MAX_SLOTS ? fallbackSlot : -1;
    }
    if (slot < 0 || slot >= MAX_SLOTS) continue;

    usedSlots.add(slot);
    out.push({ id, name, url, model, savedAt, slot });
  }

  out.sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0));
  return out;
}

function toAbsoluteUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return new URL(url, window.location.origin).toString();
}

function validateSkinFile(file: File): string | null {
  if (!file.type.startsWith('image/')) {
    return 'Можно загружать только изображения PNG/JPG';
  }
  if (file.size > MAX_UPLOAD_SIZE) {
    return 'Файл слишком большой (макс. 2 МБ)';
  }
  return null;
}

function toErrorText(error: unknown, fallback: string): string {
  const fromResponse = extractErrorText((error as { response?: { data?: unknown } })?.response?.data);
  if (fromResponse) return fromResponse;
  const fromRoot = extractErrorText(error);
  if (fromRoot) return fromRoot;
  return fallback;
}

function extractErrorText(value: unknown): string | null {
  if (!value) return null;
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
      .filter((item): item is string => Boolean(item))
      .join('; ');
    return normalized || null;
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of ['message', 'error', 'detail', 'title']) {
      const candidate = record[key];
      if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
    }
    try {
      return JSON.stringify(value);
    } catch {
      return null;
    }
  }
  return null;
}

function makeSkinId(): string {
  return `skin_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
