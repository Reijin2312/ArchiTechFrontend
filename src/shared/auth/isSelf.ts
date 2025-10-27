import { authStore } from '@/shared/store/auth';

export function isSelf(username: string | null | undefined) {
  const me = authStore.getState().user;
  return !!username && !!me && me.username === username;
}
