const IS_PRODUCTION = import.meta.env?.PROD ?? false;
const LOG_LEVEL = IS_PRODUCTION ? 'error' : 'debug';
const levels = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};
function shouldLog(level) {
    if (IS_PRODUCTION && level !== 'error')
        return false;
    return levels[level] >= levels[LOG_LEVEL];
}
export const logger = {
    debug(message, ...args) {
        if (shouldLog('debug')) {
            console.log(`[DEBUG] ${message}`, ...args);
        }
    },
    info(message, ...args) {
        if (shouldLog('info')) {
            console.log(`[INFO] ${message}`, ...args);
        }
    },
    warn(message, ...args) {
        if (shouldLog('warn')) {
            console.warn(`[WARN] ${message}`, ...args);
        }
    },
    error(message, ...args) {
        if (shouldLog('error')) {
            console.error(`[ERROR] ${message}`, ...args);
        }
    },
    chat(emoji, message, ...args) {
        if (shouldLog('debug')) {
            console.log(`${emoji} ${message}`, ...args);
        }
    },
    crypto(emoji, message, ...args) {
        if (shouldLog('debug')) {
            console.log(`${emoji} ${message}`, ...args);
        }
    },
};
