/**
 * Общие утилиты для работы с аутентификацией
 */

import { endpoints } from '@/shared/api/endpoints'

export async function notifyLauncher(
  redirectUri: string | null,
  tokens: {
    accessToken: string
    refreshToken: string
    user: unknown
    accessExpiresAt?: string
    refreshExpiresAt?: string
  }
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

export type DesktopTokenResponse = {
  accessToken: string
  refreshToken: string
  accessExpiresAt?: string
  refreshExpiresAt?: string
}

export async function requestDesktopToken(accessToken: string): Promise<DesktopTokenResponse | null> {
  if (!accessToken) return null

  try {
    const r = await fetch(endpoints.desktopToken, {
      method: 'POST',
      credentials: 'include',
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!r.ok) return null
    const data = await r.json()
    if (!data?.accessToken || !data?.refreshToken) return null
    return data
  } catch (error) {
    console.error('Failed to request desktop token:', error)
    return null
  }
}

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
    
    if (!/^(localhost|127\.0\.0\.1|::1)$/i.test(u.hostname)) return null;
    
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
  
  if (err.response?.data) {
    const data = err.response.data;
    if (typeof data === 'string') return data;
    if (typeof data === 'object' && data !== null) {
      const msg = (data as { message?: string }).message;
      if (typeof msg === 'string') return msg;
    }
  }
  
  if (typeof err.message === 'string') return err.message;
  
  return 'Неизвестная ошибка';
}
