import { authStore } from '../../shared/store/auth.js';
import { http } from '../../shared/api/http.js';
import { endpoints } from '../api/endpoints.js';
export async function finalizeAuth(accessToken) {
    authStore.getState().setAuth(null, accessToken);
    const me = await http.get(endpoints.profileMe);
    authStore.getState().setAuth(me.data, accessToken);
    return me.data;
}
