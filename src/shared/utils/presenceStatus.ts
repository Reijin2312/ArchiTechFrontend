type PresenceLike = { online?: boolean; lastSeenAt?: string | null };
type PresenceLanguage = 'ru' | 'en';

const HOUR_MS = 60 * 60 * 1000;

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isSameLocalDay(left: Date, right: Date): boolean {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}

function russianMinutesAgo(minutes: number): string {
  const safe = Math.max(1, minutes);
  const mod10 = safe % 10;
  const mod100 = safe % 100;
  if (mod10 === 1 && mod100 !== 11) return `был(а) ${safe} минуту назад`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `был(а) ${safe} минуты назад`;
  return `был(а) ${safe} минут назад`;
}

function russianHoursAgo(hours: number): string {
  if (hours <= 1) return 'был(а) 1 час назад';
  if (hours <= 4) return `был(а) ${hours} часа назад`;
  return `был(а) ${hours} часов назад`;
}

export function formatPresenceStatus(
  presence?: PresenceLike,
  nowInput: number | Date = Date.now(),
  language: PresenceLanguage = 'ru',
): string {
  if (presence?.online) return language === 'ru' ? 'в сети' : 'online';
  const lastSeen = parseDate(presence?.lastSeenAt);
  if (!lastSeen) return language === 'ru' ? 'был(а) недавно' : 'last seen recently';

  const now = nowInput instanceof Date ? nowInput : new Date(nowInput);
  const diffMs = Math.max(0, now.getTime() - lastSeen.getTime());
  const fullMinutes = Math.floor(diffMs / 60_000);
  const fullHours = Math.floor(diffMs / HOUR_MS);
  if (fullMinutes < 1) return language === 'ru' ? 'был(а) только что' : 'last seen just now';
  if (fullHours < 1) return language === 'ru' ? russianMinutesAgo(fullMinutes) : `last seen ${fullMinutes}m ago`;
  if (fullHours <= 6) return language === 'ru' ? russianHoursAgo(fullHours) : `last seen ${fullHours}h ago`;

  const locale = language === 'ru' ? 'ru-RU' : 'en-US';
  const timePart = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(lastSeen);
  if (isSameLocalDay(lastSeen, now)) {
    return language === 'ru' ? `был(а) сегодня в ${timePart}` : `last seen today at ${timePart}`;
  }
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameLocalDay(lastSeen, yesterday)) {
    return language === 'ru' ? `был(а) вчера в ${timePart}` : `last seen yesterday at ${timePart}`;
  }

  const datePart = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    ...(lastSeen.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' as const }),
  }).format(lastSeen);
  return language === 'ru' ? `был(а) ${datePart} в ${timePart}` : `last seen ${datePart} at ${timePart}`;
}
