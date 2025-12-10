import axios from 'axios';
import { authStore } from '@/shared/store/auth';
import { endpoints } from './endpoints';
import { repairObjectStrings } from '@/shared/utils/text';

export const http = axios.create({ baseURL: '/', withCredentials: true });

// Globally repair mojibake in response data (UTF-8 mis-decoded as Latin-1/CP1251)
http.interceptors.response.use((res) => {
  try {
    res.data = repairObjectStrings(res.data);
  } catch {}
  return res;
});

http.interceptors.request.use((cfg) => {
  const state = authStore.getState();
  const at = state.accessToken;
  if (at) cfg.headers.Authorization = `Bearer ${at}`;
  
  // CRITICAL: sessionId/deviceId now in HttpOnly cookies (sent automatically)
  // Try memory first, then fall back to sessionStorage (after tab refresh)
  let sessionId = state.sessionId || sessionStorage.getItem('__session_id__');
  let deviceId = state.deviceId || sessionStorage.getItem('__server_device_id__');
  
  if (sessionId) {
    cfg.headers['X-Session-ID'] = sessionId;
    if (!state.sessionId) authStore.getState().setSessionCredentials(sessionId, deviceId || undefined);
  }
  if (deviceId) {
    cfg.headers['X-Device-ID'] = deviceId;
  }
  
  return cfg;
});

let refreshing: Promise<void> | null = null;

http.interceptors.response.use(undefined, async (err) => {
  const cfg = err.config;
  if (err.response?.status !== 401 || (cfg as any).__retry) throw err;

  if (!refreshing) {
    refreshing = (async () => {
      try {
        const store = authStore.getState();
        const storedSessionId = store.sessionId || sessionStorage.getItem('__session_id__');
        const storedDeviceId = store.deviceId || sessionStorage.getItem('__server_device_id__');
        
        const headers: Record<string, string> = {};
        if (storedSessionId) headers['X-Session-ID'] = storedSessionId;
        if (storedDeviceId) headers['X-Device-ID'] = storedDeviceId;

        const r = await fetch(endpoints.refresh, { method: 'POST', credentials: 'include', headers });
        if (!r.ok) throw 0;
        const { accessToken, sessionId, deviceId } = await r.json();
        authStore.getState().setAuth(store.user, accessToken);
        
        // 🔐 Restore session credentials from refresh response (now stored in HttpOnly cookies)
        if (sessionId && deviceId) {
          authStore.getState().setSessionCredentials(sessionId, deviceId);
        } else if (storedSessionId && storedDeviceId) {
          authStore.getState().setSessionCredentials(storedSessionId, storedDeviceId);
        }
      } catch {
        authStore.getState().clear();
      } finally { refreshing = null; }
    })();
  }
  await refreshing;
  (cfg as any).__retry = true;
  return http(cfg);
});
