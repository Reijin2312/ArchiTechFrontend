import axios from 'axios';
import { authStore } from '@/shared/store/auth';
import { endpoints } from './endpoints';


export const http = axios.create({ baseURL: '/' });


http.interceptors.request.use(cfg => {
const at = authStore.getState().accessToken;
if (at) cfg.headers.Authorization = `Bearer ${at}`;
return cfg;
});


let refreshing: Promise<void> | null = null;


http.interceptors.response.use(r => r, async err => {
const { response, config } = err;
if (response?.status !== 401 || (config as any).__isRetry) throw err;


if (!refreshing) {
refreshing = (async () => {
const { refreshToken, setTokens, logout } = authStore.getState();
if (!refreshToken) { logout(); return; }
try {
const { data } = await axios.post(endpoints.refresh, { refreshToken });
setTokens(data.accessToken, data.refreshToken);
} catch {
authStore.getState().logout();
} finally {
refreshing = null;
}
})();
}
await refreshing;
(config as any).__isRetry = true;
return http(config);
});