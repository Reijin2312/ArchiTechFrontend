import { authStore, type User } from '@/shared/store/auth';
import { endpoints } from '@/shared/api/endpoints';
import { http } from '@/shared/api/http';
import { initEncryption } from '@/shared/lib/encryption';

export async function bootstrapAuth() {
  try {
    const r = await fetch(endpoints.refresh, { method: 'POST', credentials: 'include' });
    if (!r.ok) return;
    const { accessToken } = await r.json();

    authStore.getState().setAuth(null, accessToken);
    const me = await http.get<User>('/api/v1/profile');
    authStore.getState().setAuth(me.data, accessToken);
    
    initEncryption().catch(e => console.error('Failed to init encryption:', e));
  } catch {
    authStore.getState().clear();
  }
}