type PresenceLike = { online?: boolean; lastSeenAt?: string | null };
type PresenceLanguage = 'ru' | 'en';

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

export function formatPresenceStatus(
  presence?: PresenceLike,
  nowInput: number | Date = Date.now(),
  language: PresenceLanguage = 'ru',
): string {
  if (presence?.online) return language === 'ru' ? 'в сети' : 'online';
  const lastSeen = parseDate(presence?.lastSeenAt);
  if (!lastSeen) return language === 'ru' ? 'не в сети' : 'offline';

  const now = nowInput instanceof Date ? nowInput : new Date(nowInput);
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
