import { authStore } from '../../shared/store/auth.js';
export function isSelf(username) {
    const me = authStore.getState().user;
    return !!username && !!me && me.username === username;
}
