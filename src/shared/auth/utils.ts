/**
 * Общие утилиты для работы с аутентификацией
 */

/**
 * Уведомление лаунчера о токенах
 * Используется в LoginPage, RegisterPage, CodeVerifyPage
 */
export async function notifyLauncher(
  redirectUri: string | null,
  tokens: { accessToken: string; refreshToken: string; user: unknown }
): Promise<void> {
  if (!redirectUri) return;
  
  try {
    await fetch(redirectUri, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tokens),
      mode: 'cors',
      keepalive: true,
    });
  } catch (error) {
    // Ошибка не критична, логируем если нужно
    console.error('Failed to notify launcher:', error);
  }
}

/**
 * Парсинг и валидация redirect_uri
 * Разрешены только localhost callback URL
 */
export function parseRedirectUri(rawRedirect: string | null): string | null {
  if (!rawRedirect) return null;
  
  let s = rawRedirect;
  try {
    // Декодируем до 2 раз на случай двойного кодирования
    for (let i = 0; i < 2 && /^https?%3A/i.test(s); i++) {
      s = decodeURIComponent(s);
    }
    
    const u = new URL(s);
    
    // Проверяем протокол
    if (!/^https?:$/.test(u.protocol)) return null;
    
    // Проверяем что это localhost
    if (!/^(localhost|127\.0\.0\.1|::1)$/i.test(u.hostname)) return null;
    
    // Проверяем pathname
    if (!(u.pathname === '/cb' || u.pathname === '/cb/')) return null;
    
    return `${u.origin}/cb`;
  } catch {
    return null;
  }
}

/**
 * Нормализация сообщений об ошибках
 */
export function normalizeErrorMessage(error: unknown): string {
  if (!error) return 'Неизвестная ошибка';
  
  if (typeof error === 'string') return error;
  
  const err = error as {
    response?: {
      data?: unknown;
    };
    message?: string;
  };
  
  // Проверяем response.data
  if (err.response?.data) {
    const data = err.response.data;
    if (typeof data === 'string') return data;
    if (typeof data === 'object' && data !== null) {
      const msg = (data as { message?: string }).message;
      if (typeof msg === 'string') return msg;
    }
  }
  
  // Проверяем message
  if (typeof err.message === 'string') return err.message;
  
  return 'Неизвестная ошибка';
}
