import { authStore } from '../../shared/store/auth.js';
import { endpoints } from '../../shared/api/endpoints.js';
import { http } from '../../shared/api/http.js';
export async function bootstrapAuth() {
    try {
        console.log('[Bootstrap] Attempting to refresh session...');
        const r = await fetch(endpoints.refresh, {
            method: 'POST',
            credentials: 'include'
        });
        if (!r.ok) {
            console.log('[Bootstrap] Refresh failed:', r.status, r.statusText);
            return;
        }
        const { accessToken, sessionId, deviceId } = await r.json();
        console.log('[Bootstrap] Access token refreshed');
        authStore.getState().setAuth(null, accessToken);
        if (sessionId && deviceId) {
            authStore.getState().setSessionCredentials(sessionId, deviceId);
            console.log('[Bootstrap] Session credentials restored from refresh response');
        }
        else {
            console.warn('[Bootstrap] Session credentials missing in refresh response - re-login may be required');
        }
        const me = await http.get('/api/v1/profile');
        authStore.getState().setAuth(me.data, accessToken);
        console.log('[Bootstrap] User authenticated:', me.data.username);
    }
    catch (e) {
        console.log('[Bootstrap] Bootstrap failed:', e);
        authStore.getState().clear();
    }
}
