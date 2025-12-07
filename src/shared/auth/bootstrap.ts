import { authStore, type User } from '@/shared/store/auth';
import { endpoints } from '@/shared/api/endpoints';
import { http } from '@/shared/api/http';

export async function bootstrapAuth() {
  try {
    console.log('[Bootstrap] 🔄 Attempting to refresh session...');
    
    // Restore session/device IDs from sessionStorage to send headers on refresh
    const storedSessionId = sessionStorage.getItem('__session_id__');
    const storedDeviceId = sessionStorage.getItem('__server_device_id__');
    if (storedSessionId && storedDeviceId) {
      authStore.getState().setSessionCredentials(storedSessionId, storedDeviceId);
      console.log('[Bootstrap] ✅ Session credentials will be restored for refresh call');
    } else {
      console.warn('[Bootstrap] ⚠️ Session credentials not found before refresh - backend may reject');
    }

    const headers: Record<string, string> = {};
    if (storedSessionId) headers['X-Session-ID'] = storedSessionId;
    if (storedDeviceId) headers['X-Device-ID'] = storedDeviceId;

    const r = await fetch(endpoints.refresh, { 
      method: 'POST', 
      credentials: 'include',
      headers,
    });
    
    if (!r.ok) {
      console.log('[Bootstrap] ❌ Refresh failed:', r.status, r.statusText);
      return;
    }
    
    const { accessToken, sessionId, deviceId } = await r.json();
    console.log('[Bootstrap] ✅ Access token refreshed');

    authStore.getState().setAuth(null, accessToken);
    
    // 🔐 Restore session credentials from refresh response (preferred)
    if (sessionId && deviceId) {
      authStore.getState().setSessionCredentials(sessionId, deviceId);
      console.log('[Bootstrap] ✅ Session credentials restored from refresh response');
    } else if (storedSessionId && storedDeviceId) {
      // Keep previously restored values so headers are still sent
      console.warn('[Bootstrap] ⚠️ Session credentials not returned - using stored values');
      authStore.getState().setSessionCredentials(storedSessionId, storedDeviceId);
    } else {
      console.warn('[Bootstrap] ⚠️ Session credentials not returned and no stored fallback - WebSocket may fail');
    }
    
    const me = await http.get<User>('/api/v1/profile');
    authStore.getState().setAuth(me.data, accessToken);
    
    console.log('[Bootstrap] ✅ User authenticated:', me.data.username);
  } catch (e) {
    console.log('[Bootstrap] ❌ Bootstrap failed:', e);
    authStore.getState().clear();
  }
}
