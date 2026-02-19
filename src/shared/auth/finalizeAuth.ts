import { authStore, type User } from '@/shared/store/auth';
import { http } from '@/shared/api/http';
import { endpoints } from '../api/endpoints';

export async function finalizeAuth(accessToken: string): Promise<User> {
  authStore.getState().setAuth(null, accessToken);
  const me = await http.get<User>(endpoints.profileMe);
  authStore.getState().setAuth(me.data, accessToken);
  
  
  return me.data;
}
