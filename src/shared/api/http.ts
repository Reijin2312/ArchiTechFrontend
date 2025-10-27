import axios from 'axios';
import { authStore } from '@/shared/store/auth';
import { endpoints } from './endpoints';

export const http = axios.create({ baseURL: '/', withCredentials: true });

http.interceptors.request.use((cfg) => {
  const at = authStore.getState().accessToken;
  if (at) cfg.headers.Authorization = `Bearer ${at}`;
  return cfg;
});

let refreshing: Promise<void> | null = null;

http.interceptors.response.use(undefined, async (err) => {
  const cfg = err.config;
  if (err.response?.status !== 401 || (cfg as any).__retry) throw err;

  if (!refreshing) {
    refreshing = (async () => {
      try {
        const r = await fetch(endpoints.refresh, { method: 'POST', credentials: 'include' });
        if (!r.ok) throw 0;
        const { accessToken } = await r.json();
        authStore.getState().setAuth(authStore.getState().user, accessToken);
      } catch {
        authStore.getState().clear();
      } finally { refreshing = null; }
    })();
  }
  await refreshing;
  (cfg as any).__retry = true;
  return http(cfg);
});
