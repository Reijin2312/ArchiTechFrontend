import type { Language } from './translations';

const ru = {
  loading: 'Загрузка…', loadError: 'Ошибка загрузки', avatar: 'Аватар', backToProfile: 'К профилю',
  public: {
    seo: 'Профиль игрока — ArchiTech MC', skin: 'Скин', skinGallery: 'Галерея скинов', openSkins: 'Открыть галерею скинов',
    share: 'Поделиться профилем', shareText: 'Профиль игрока {name}', sharePrompt: 'Ссылка на профиль:', edit: 'Редактировать профиль',
    since: 'с {date}', self: 'это вы', emptyBio: 'О себе пока ничего не указано', message: 'Написать', report: 'Пожаловаться',
    achievements: 'Достижения', openAchievements: 'Открыть все достижения', allAchievements: 'Все достижения',
    noAchievements: 'У игрока пока нет достижений', sessionsError: 'Не удалось загрузить сессии', online: 'Онлайн', offline: 'Оффлайн',
  },
  achievements: {
    seo: 'Достижения {name} — ArchiTech MC', heading: 'Достижения игрока', archiveRating: 'Рейтинг архива',
    pinned: 'Закрепленные награды', noPinned: 'Пока нет закрепленных наград', catalog: 'Каталог достижений',
    search: 'Поиск по названию или описанию', shown: 'Показано {shown} • Открыто {unlocked} • Закрыто {locked}',
    empty: 'По текущему фильтру ничего не найдено', fixed: 'закреплено', received: 'Получено:',
    filters: { all: 'Все', unlocked: 'Открытые', locked: 'Скрытые' },
    metrics: { mobKills: 'Убито мобов', blocksPlaced: 'Поставлено блоков', blocksBroken: 'Добыто блоков', deaths: 'Смертей', playHours: 'Часов в мире', walkedKm: 'Пройдено км' },
    loadError: 'Ошибка загрузки достижений',
  },
  skins: {
    seo: 'Галерея скинов {name} — ArchiTech MC', heading: 'Галерея скинов', current: 'Текущий скин', skin: 'Скин',
    refreshed: 'Галерея скинов обновлена', saveError: 'Не удалось сохранить галерею', loadError: 'Не удалось загрузить галерею скинов',
    slotBackendError: 'Сервер сохранил скин как активный, а не как слот. Обновите LauncherBackend с поддержкой gallery.',
    fetchSkinError: 'Не удалось получить файл скина ({status})', uploaded: 'Скин загружен в слот #{slot}', uploadError: 'Не удалось загрузить скин',
    legacySelected: 'Этот слот сохранён в старом формате и ссылается на активный скин. Перезагрузите скин в слот.',
    applied: 'Скин применён', applyError: 'Не удалось применить скин', deletedNearest: 'Скин удалён. Активным назначен ближайший слот.',
    deleted: 'Скин удалён из галереи', currentFetchError: 'Не удалось получить текущий скин ({status})', currentSaveError: 'Не удалось сохранить текущий скин в слот',
    slot: 'Слот #{slot}', emptySlot: 'Пустой слот #{slot}', drop: 'Отпустите файл для загрузки', previous: 'Предыдущий слот', next: 'Следующий слот', select: 'Выбрать слот {slot}',
    upload: 'Загрузить в слот', apply: 'Сделать активным', delete: 'Удалить из слота', save: 'Сохранить',
    hint: 'Перетащите изображение в нужный слот или нажмите на центральную карточку для выбора файла.', fileHint: 'PNG/JPG до 2 МБ, 64×64 или 64×32',
    legacyCount: 'Найдено слотов старого формата: {count}. Их нужно загрузить заново, иначе они будут ссылаться на текущий активный скин.', ownerOnly: 'Редактирование доступно только владельцу профиля.',
    imageOnly: 'Можно загружать только изображения PNG/JPG', tooLarge: 'Файл слишком большой (макс. 2 МБ)',
  },
  settings: {
    seo: 'Настройки — ArchiTech MC', completion: 'Заполненность профиля', completionHint: 'Заполните все поля для максимального прогресса',
    export: 'Экспорт аккаунта', downloadJson: 'Скачать JSON', status: 'Статус', socials: 'Социальные сети', wallpaper: 'Обои профиля',
    wallpaperHint: 'Большое изображение, которое заменит фон сайта на вашей странице профиля', wallpaperUpdated: 'Обои обновлены', wallpaperError: 'Ошибка загрузки обоев',
    banner: 'Баннер профиля', bannerHint: 'Широкое изображение в шапке вашего профиля', bannerUpdated: 'Баннер обновлён', bannerError: 'Ошибка загрузки баннера',
    withUsSince: 'Вы с нами с {date}', profileSaved: 'Профиль сохранён', saveError: 'Ошибка сохранения', avatarUpdated: 'Аватар обновлён', avatarError: 'Ошибка загрузки аватара', exportError: 'Ошибка экспорта',
    usernameSame: 'Логин уже установлен', usernameUpdated: 'Логин обновлён', usernameTaken: 'Логин уже занят', usernameInvalid: 'Некорректное имя пользователя', loginRequired: 'Нужен вход в аккаунт', usernameError: 'Ошибка смены логина ({status})',
    profile: 'Профиль', displayName: 'Отображаемое имя', bio: 'О себе', location: 'Город/местоположение', website: 'Сайт', birthDate: 'Дата рождения', age: 'Возраст: {age}', memberFor: 'С нами {years}', lessThanYear: 'менее года', saveProfile: 'Сохранить профиль',
    account: 'Учётная запись', password: 'Пароль', username: 'Логин', changeEmail: 'Изменить email', changePassword: 'Изменить пароль', changeUsername: 'Сменить логин', usernameUnavailable: 'Логин занят или некорректен', available: 'Доступен', emailRequired: 'Введите email для сброса пароля', resetError: 'Не удалось начать сброс пароля',
    twoFa: 'Двухфакторная аутентификация', enabled: 'Включено', disabled: 'Выключено', twoFaLoading: 'Загрузка состояния 2FA...', twoFaLoadError: 'Не удалось загрузить состояние 2FA', twoFaDisable: 'Открыть мастер отключения 2FA', twoFaSetup: 'Открыть мастер настройки 2FA', twoFaPending: 'Настройка уже начата, но не завершена. Откройте мастер и подтвердите код.',
    sessions: 'Сессии', all: 'все', activeOnly: 'только активные', newestFirst: 'Новые сверху', newestLast: 'Новые снизу', expiresDesc: 'По истечению ↓', expiresAsc: 'По истечению ↑', resetFilters: 'Сбросить фильтры', noSessions: 'Нет сессий по выбранному фильтру', unknownDevice: 'Неизвестное устройство', created: 'Создана:', expires: 'Истекает:', revoked: 'Отозвана:', replaced: 'Заменена новой сессией', ending: 'Завершение...', end: 'Завершить', refresh: 'Обновить',
    danger: 'Опасная зона', logout: 'Выйти из аккаунта', deleteAccount: 'Удалить аккаунт', irreversible: 'Действие необратимо! Восстановить аккаунт после удаления невозможно.', deleteEllipsis: 'Удалить…', deleteConfirm: 'Это действие необратимо. Введите DELETE и пароль для подтверждения.', confirmation: 'Подтверждение', cancel: 'Отмена', deleting: 'Удаляю…', delete: 'Удалить', deleteError: 'Не удалось удалить аккаунт',
  },
} as const;

type TranslationShape<T> = { [K in keyof T]: T[K] extends string ? string : TranslationShape<T[K]> };

const en: TranslationShape<typeof ru> = {
  loading: 'Loading…', loadError: 'Failed to load', avatar: 'Avatar', backToProfile: 'Back to profile',
  public: {
    seo: 'Player profile — ArchiTech MC', skin: 'Skin', skinGallery: 'Skin gallery', openSkins: 'Open skin gallery',
    share: 'Share profile', shareText: '{name} on ArchiTech MC', sharePrompt: 'Profile link:', edit: 'Edit profile',
    since: 'since {date}', self: 'that’s you', emptyBio: 'No bio yet', message: 'Message', report: 'Report',
    achievements: 'Achievements', openAchievements: 'Open all achievements', allAchievements: 'All achievements',
    noAchievements: 'This player has no achievements yet', sessionsError: 'Failed to load sessions', online: 'Online', offline: 'Offline',
  },
  achievements: {
    seo: '{name}’s achievements — ArchiTech MC', heading: 'Player achievements', archiveRating: 'Archive rating',
    pinned: 'Pinned awards', noPinned: 'No pinned awards yet', catalog: 'Achievement catalog',
    search: 'Search by title or description', shown: 'Showing {shown} • Unlocked {unlocked} • Locked {locked}',
    empty: 'Nothing matches the current filter', fixed: 'pinned', received: 'Unlocked:',
    filters: { all: 'All', unlocked: 'Unlocked', locked: 'Locked' },
    metrics: { mobKills: 'Mobs killed', blocksPlaced: 'Blocks placed', blocksBroken: 'Blocks mined', deaths: 'Deaths', playHours: 'Hours played', walkedKm: 'Distance walked, km' },
    loadError: 'Failed to load achievements',
  },
  skins: {
    seo: '{name}’s skin gallery — ArchiTech MC', heading: 'Skin gallery', current: 'Current skin', skin: 'Skin',
    refreshed: 'Skin gallery updated', saveError: 'Failed to save the gallery', loadError: 'Failed to load the skin gallery',
    slotBackendError: 'The server saved the skin as active instead of placing it in a slot. Update LauncherBackend to a version that supports gallery slots.',
    fetchSkinError: 'Failed to fetch the skin file ({status})', uploaded: 'Skin uploaded to slot #{slot}', uploadError: 'Failed to upload the skin',
    legacySelected: 'This slot uses the old format and points to the active skin. Upload the skin to this slot again.',
    applied: 'Skin applied', applyError: 'Failed to apply the skin', deletedNearest: 'Skin deleted. The nearest slot is now active.',
    deleted: 'Skin removed from the gallery', currentFetchError: 'Failed to fetch the current skin ({status})', currentSaveError: 'Failed to save the current skin to this slot',
    slot: 'Slot #{slot}', emptySlot: 'Empty slot #{slot}', drop: 'Drop the file to upload it', previous: 'Previous slot', next: 'Next slot', select: 'Select slot {slot}',
    upload: 'Upload to slot', apply: 'Make active', delete: 'Remove from slot', save: 'Save',
    hint: 'Drag an image onto a slot, or click the center card to choose a file.', fileHint: 'PNG/JPG up to 2 MB, 64×64 or 64×32',
    legacyCount: '{count} legacy slots found. Upload them again or they will keep pointing to the current active skin.', ownerOnly: 'Only the profile owner can edit this gallery.',
    imageOnly: 'Only PNG/JPG images can be uploaded', tooLarge: 'The file is too large (2 MB max)',
  },
  settings: {
    seo: 'Settings — ArchiTech MC', completion: 'Profile completion', completionHint: 'Fill in every field to reach 100%',
    export: 'Account export', downloadJson: 'Download JSON', status: 'Status', socials: 'Social links', wallpaper: 'Profile wallpaper',
    wallpaperHint: 'A large image that replaces the site background on your profile page', wallpaperUpdated: 'Wallpaper updated', wallpaperError: 'Failed to upload the wallpaper',
    banner: 'Profile banner', bannerHint: 'A wide image displayed at the top of your profile', bannerUpdated: 'Banner updated', bannerError: 'Failed to upload the banner',
    withUsSince: 'Member since {date}', profileSaved: 'Profile saved', saveError: 'Failed to save the profile', avatarUpdated: 'Avatar updated', avatarError: 'Failed to upload the avatar', exportError: 'Failed to export the account',
    usernameSame: 'This username is already set', usernameUpdated: 'Username updated', usernameTaken: 'This username is already taken', usernameInvalid: 'Invalid username', loginRequired: 'Please sign in first', usernameError: 'Failed to change the username ({status})',
    profile: 'Profile', displayName: 'Display name', bio: 'About me', location: 'City/location', website: 'Website', birthDate: 'Date of birth', age: 'Age: {age}', memberFor: 'Member for {years}', lessThanYear: 'less than a year', saveProfile: 'Save profile',
    account: 'Account', password: 'Password', username: 'Username', changeEmail: 'Change email', changePassword: 'Change password', changeUsername: 'Change username', usernameUnavailable: 'Username is taken or invalid', available: 'Available', emailRequired: 'Enter your email to reset the password', resetError: 'Failed to start the password reset',
    twoFa: 'Two-factor authentication', enabled: 'Enabled', disabled: 'Disabled', twoFaLoading: 'Loading 2FA status...', twoFaLoadError: 'Failed to load 2FA status', twoFaDisable: 'Open 2FA removal wizard', twoFaSetup: 'Open 2FA setup wizard', twoFaPending: 'Setup has started but is not complete. Open the wizard and confirm the code.',
    sessions: 'Sessions', all: 'all', activeOnly: 'active only', newestFirst: 'Newest first', newestLast: 'Oldest first', expiresDesc: 'Expiration ↓', expiresAsc: 'Expiration ↑', resetFilters: 'Reset filters', noSessions: 'No sessions match these filters', unknownDevice: 'Unknown device', created: 'Created:', expires: 'Expires:', revoked: 'Revoked:', replaced: 'Replaced by a new session', ending: 'Ending...', end: 'End session', refresh: 'Refresh',
    danger: 'Danger zone', logout: 'Sign out', deleteAccount: 'Delete account', irreversible: 'This cannot be undone. The account cannot be restored after deletion.', deleteEllipsis: 'Delete…', deleteConfirm: 'This cannot be undone. Enter DELETE and your password to confirm.', confirmation: 'Confirmation', cancel: 'Cancel', deleting: 'Deleting…', delete: 'Delete', deleteError: 'Failed to delete the account',
  },
};

export const profileTranslations: Record<Language, TranslationShape<typeof ru>> = { ru, en };

export function fill(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce((text, [key, value]) => text.split(`{${key}}`).join(String(value)), template);
}
