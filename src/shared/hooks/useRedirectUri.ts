import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { parseRedirectUri } from '@/shared/auth/utils';

/**
 * Хук для работы с redirect_uri в auth страницах
 * Управляет получением, валидацией и сохранением redirect_uri
 */
export function useRedirectUri() {
  const [searchParams] = useSearchParams();
  const [redirectUri, setRedirectUri] = useState<string | null>(null);

  useEffect(() => {
    // Получаем из URL или sessionStorage
    const fromUrl = searchParams.get('redirect_uri');
    const fromStorage = sessionStorage.getItem('redirect_uri');
    const raw = fromUrl || fromStorage;

    // Сохраняем в sessionStorage если получили из URL
    if (fromUrl) {
      sessionStorage.setItem('redirect_uri', fromUrl);
    }

    // Парсим и валидируем
    const validated = parseRedirectUri(raw);
    setRedirectUri(validated);
  }, [searchParams]);

  const clearRedirectUri = () => {
    sessionStorage.removeItem('redirect_uri');
    setRedirectUri(null);
  };

  return { redirectUri, clearRedirectUri };
}
