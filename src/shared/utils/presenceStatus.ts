type PresenceLike = {
  online?: boolean;
  lastSeenAt?: string | null;
};

const HOUR_MS = 60 * 60 * 1000;
const TIME_FORMATTER = new Intl.DateTimeFormat('ru-RU', {
  hour: '2-digit',
  minute: '2-digit',
});
const DAY_MONTH_FORMATTER = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
});
const DAY_MONTH_YEAR_FORMATTER = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isSameLocalDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function formatHourAgo(hours: number): string {
  if (hours <= 1) return 'был(а) 1 час назад';
  if (hours >= 2 && hours <= 4) return `был(а) ${hours} часа назад`;
  return `был(а) ${hours} часов назад`;
}

function formatMinutesAgo(minutes: number): string {
  const safe = Math.max(1, minutes);
  const mod10 = safe % 10;
  const mod100 = safe % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return `был(а) ${safe} минуту назад`;
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `был(а) ${safe} минуты назад`;
  }
  return `был(а) ${safe} минут назад`;
}

export function formatPresenceStatus(
  presence?: PresenceLike,
  nowInput: number | Date = Date.now()
): string {
  if (presence?.online) {
    return 'online';
  }

  const lastSeen = parseDate(presence?.lastSeenAt);
  if (!lastSeen) {
    return 'был(а) недавно';
  }

  const now = nowInput instanceof Date ? nowInput : new Date(nowInput);
  const diffMs = Math.max(0, now.getTime() - lastSeen.getTime());
  const fullMinutes = Math.floor(diffMs / (60 * 1000));
  const fullHours = Math.floor(diffMs / HOUR_MS);

  if (fullMinutes < 1) {
    return 'был(а) только что';
  }

  if (fullHours < 1) {
    return formatMinutesAgo(fullMinutes);
  }

  if (fullHours >= 1 && fullHours <= 6) {
    return formatHourAgo(fullHours);
  }

  const timePart = TIME_FORMATTER.format(lastSeen);
  if (isSameLocalDay(lastSeen, now)) {
    return `был(а) сегодня в ${timePart}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameLocalDay(lastSeen, yesterday)) {
    return `был(а) вчера в ${timePart}`;
  }

  if (lastSeen.getFullYear() === now.getFullYear()) {
    return `был(а) ${DAY_MONTH_FORMATTER.format(lastSeen)} в ${timePart}`;
  }

  return `был(а) ${DAY_MONTH_YEAR_FORMATTER.format(lastSeen)} в ${timePart}`;
}
