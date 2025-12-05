import { authStore, type User } from '@/shared/store/auth';
import { endpoints } from '@/shared/api/endpoints';
import { http } from '@/shared/api/http';

export async function bootstrapAuth() {
  try {
    console.log('[Bootstrap] 🔄 Attempting to refresh session...');
    const r = await fetch(endpoints.refresh, { method: 'POST', credentials: 'include' });
    
    if (!r.ok) {
      console.log('[Bootstrap] ❌ Refresh failed:', r.status, r.statusText);
      return;
    }
    
    const { accessToken } = await r.json();
    console.log('[Bootstrap] ✅ Access token refreshed');

    authStore.getState().setAuth(null, accessToken);
    
    // 🔐 Restore session credentials from storage (refresh endpoint doesn't return them)
    const storedSessionId = sessionStorage.getItem('__session_id__') || localStorage.getItem('__session_id__');
    const storedDeviceId = sessionStorage.getItem('__server_device_id__') || localStorage.getItem('__server_device_id__');
    if (storedSessionId && storedDeviceId) {
      authStore.getState().setSessionCredentials(storedSessionId, storedDeviceId);
      console.log('[Bootstrap] ✅ Session credentials restored from storage');
    } else {
      console.warn('[Bootstrap] ⚠️ Session credentials not found in storage - WebSocket may fail');
    }
    
    const me = await http.get<User>('/api/v1/profile');
    authStore.getState().setAuth(me.data, accessToken);
    
    console.log('[Bootstrap] ✅ User authenticated:', me.data.username);
  } catch (e) {
    console.log('[Bootstrap] ❌ Bootstrap failed:', e);
    authStore.getState().clear();
  }
}