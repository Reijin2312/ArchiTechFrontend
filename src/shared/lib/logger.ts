/**
 * Logger с поддержкой уровней логирования
 * В production mode отключается
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const IS_PRODUCTION = import.meta.env?.PROD ?? false;
const LOG_LEVEL: LogLevel = IS_PRODUCTION ? 'error' : 'debug';

const levels: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(level: LogLevel): boolean {
  if (IS_PRODUCTION && level !== 'error') return false;
  return levels[level] >= levels[LOG_LEVEL];
}

export const logger = {
  debug(message: string, ...args: unknown[]) {
    if (shouldLog('debug')) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  },

  info(message: string, ...args: unknown[]) {
    if (shouldLog('info')) {
      console.log(`[INFO] ${message}`, ...args);
    }
  },

  warn(message: string, ...args: unknown[]) {
    if (shouldLog('warn')) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },

  error(message: string, ...args: unknown[]) {
    if (shouldLog('error')) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  },

  // Для чата с эмоджи
  chat(emoji: string, message: string, ...args: unknown[]) {
    if (shouldLog('debug')) {
      console.log(`${emoji} ${message}`, ...args);
    }
  },

  // Для шифрования
  crypto(emoji: string, message: string, ...args: unknown[]) {
    if (shouldLog('debug')) {
      console.log(`${emoji} ${message}`, ...args);
    }
  },
};
