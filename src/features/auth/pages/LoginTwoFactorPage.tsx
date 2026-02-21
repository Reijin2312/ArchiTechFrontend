import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { http } from '@/shared/api/http';
import { endpoints } from '@/shared/api/endpoints';
import type { LoginSuccessRes } from '@/shared/api/types';
import { authStore } from '@/shared/store/auth';
import { finalizeAuth } from '@/shared/auth/finalizeAuth';
import { notifyLauncher, requestDesktopToken } from '@/shared/auth/utils';
import { useWallpaper } from '@/shared/ui/wallpaper/useWallpaper';
import { Seo } from '@/shared/seo/seo';
import { Card } from '@/shared/ui/card/Card';
import { Button } from '@/shared/ui/button/Button';
import { Input } from '@/shared/ui/form/Input';
import { useSessionKeyStore } from '@/stores/sessionKeyStore';
import { clearPendingLoginPassword, getPendingLoginPassword } from '@/shared/auth/pendingLoginPassword';

export default function LoginTwoFactorPage() {
  useWallpaper();

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const challengeToken = searchParams.get('challenge') || '';
  const deviceCode = searchParams.get('device') || null;
  const redirectUri = searchParams.get('redirect_uri') || null;

  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [serverErr, setServerErr] = useState<string | null>(null);

  const canSubmit = useMemo(() => /^\d{6}$/.test(code) && !!challengeToken && !busy, [code, challengeToken, busy]);

  async function submitCode() {
    if (!challengeToken) {
      setServerErr('Сессия подтверждения не найдена. Войдите заново.');
      return;
    }

    setBusy(true);
    setServerErr(null);

    try {
      const { data } = await http.post<LoginSuccessRes>(endpoints.authLogin2fa, {
        challengeToken,
        code,
      });

      const me = deviceCode ? null : await finalizeAuth(data.accessToken);

      if (data.sessionId && data.deviceId) {
        authStore.getState().setSessionCredentials(data.sessionId, data.deviceId, data.sessionKey, data.sessionKeyIv);

        const pendingPassword = getPendingLoginPassword();
        if (data.sessionKey && me?.id && pendingPassword) {
          useSessionKeyStore.getState().initializeSession(me.id, data.sessionKey, 1, pendingPassword);
        }
      }

      const launcherUser = me ?? data.user;
      clearPendingLoginPassword();

      if (deviceCode) {
        const tokens = await requestDesktopToken(data.accessToken);
        if (!tokens) {
          setServerErr('Не удалось выдать токены для лаунчера. Повторите вход.');
          return;
        }

        await http.post(endpoints.deviceComplete, {
          deviceCode,
          payload: { ...tokens, user: launcherUser },
        });

        const tg = (window as any)?.Telegram?.WebApp;
        if (tg) {
          setServerErr('Готово! Можно закрыть окно.');
          try {
            tg.close();
          } catch {}
        } else {
          navigate('/auth/device/done?seconds=4', { replace: true });
        }
        return;
      }

      if (redirectUri) {
        const tokens = await requestDesktopToken(data.accessToken);
        if (tokens) {
          await notifyLauncher(redirectUri, { ...tokens, user: launcherUser });
        }
      }

      if (me?.username) {
        navigate(`/u/${me.username}`, { replace: true });
      } else {
        navigate('/profile', { replace: true });
      }
    } catch (error) {
      setServerErr(mapTwoFactorError(error));
    } finally {
      setBusy(false);
    }
  }

  function backToLogin() {
    clearPendingLoginPassword();
    navigate('/auth/login', { replace: true });
  }

  return (
    <>
      <Seo title="2FA подтверждение — ArchiTech MC" robots="noindex,follow" />
      <div className="wrap">
        <Card>
          <h1 className="text-2xl mb-4 text-center">Подтверждение входа</h1>
          <p className="label mb-2">Введите 6-значный код из Google Authenticator.</p>

          {serverErr && (
            <div className="error" role="alert" style={{ display: 'block' }}>
              {serverErr}
            </div>
          )}

          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            placeholder="6 цифр"
          />

          <div className="flex gap-2 mt-4">
            <Button type="button" disabled={!canSubmit} onClick={submitCode}>
              Подтвердить
            </Button>
            <Button type="button" variant="ghost" onClick={backToLogin}>
              Назад
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}

function mapTwoFactorError(error: unknown): string {
  const status = getHttpStatus(error);
  const code = getBackendErrorCode(error);

  if (code === 'invalid_2fa_code') return 'Неверный код из Google Authenticator';
  if (code === 'invalid_2fa_challenge') return 'Сессия подтверждения истекла. Войдите заново.';
  if (status === 401) return 'Неверный код из Google Authenticator';
  if (status === 429) return 'Слишком много попыток. Попробуйте чуть позже';

  const message = normalizeErrorMessage(error);
  if (message === 'Неизвестная ошибка' || /^Request failed with status code \d+$/i.test(message)) {
    return 'Ошибка подтверждения 2FA';
  }

  return message;
}

function getHttpStatus(error: unknown): number | null {
  const status = (error as { response?: { status?: unknown } })?.response?.status;
  return typeof status === 'number' ? status : null;
}

function getBackendErrorCode(error: unknown): string | null {
  const data = (error as { response?: { data?: unknown } })?.response?.data;
  if (!data || typeof data !== 'object') return null;
  const code = (data as { error?: unknown }).error;
  return typeof code === 'string' && code.trim() ? code.trim() : null;
}

function normalizeErrorMessage(error: unknown): string {
  const err = error as {
    response?: { data?: unknown };
    message?: string;
  };

  if (typeof err?.response?.data === 'string') return err.response.data;
  if (typeof err?.message === 'string') return err.message;
  return 'Неизвестная ошибка';
}
