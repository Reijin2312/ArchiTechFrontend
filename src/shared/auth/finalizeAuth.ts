import { authStore, type User } from '@/shared/store/auth';
import { http } from '@/shared/api/http';
import { endpoints } from '../api/endpoints';
import { initEncryption } from '@/shared/lib/encryption';

export async function finalizeAuth(accessToken: string): Promise<User> {
  authStore.getState().setAuth(null, accessToken);
  const me = await http.get<User>(endpoints.profileMe);
  authStore.getState().setAuth(me.data, accessToken);
  
  // ✅ ОБЯЗАТЕЛЬНАЯ инициализация ключей шифрования
  try {
    console.log('🔐 Initializing encryption keys...');
    await initEncryption();
    console.log('✅ Encryption keys ready');
  } catch (e) {
    console.error('❌ Failed to init encryption:', e);
    // Не блокируем вход, но логируем ошибку
  }
  
  return me.data;
}
