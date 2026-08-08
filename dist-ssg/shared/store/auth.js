import { create } from 'zustand';
export const authStore = create((set) => ({
    user: null,
    accessToken: null,
    sessionId: null,
    deviceId: null,
    sessionKey: null,
    sessionKeyIv: null,
    setAuth: (u, a) => set({ user: u, accessToken: a }),
    setSessionCredentials: (sessionId, deviceId, sessionKey, sessionKeyIv) => {
        set({
            sessionId: sessionId || null,
            deviceId: deviceId || null,
            sessionKey: sessionKey || null,
            sessionKeyIv: sessionKeyIv || null
        });
        if (sessionId && deviceId) {
            console.log('[Auth] Server credentials updated: sessionId and deviceId');
        }
    },
    clear: () => {
        set({
            user: null,
            accessToken: null,
            sessionId: null,
            deviceId: null,
            sessionKey: null,
            sessionKeyIv: null
        });
        sessionStorage.removeItem('__device_token__');
        sessionStorage.removeItem('__device_token_expires__');
        sessionStorage.removeItem('__session_key__');
        sessionStorage.removeItem('__session_key_iv__');
        sessionStorage.removeItem('__session_id__');
        sessionStorage.removeItem('__server_device_id__');
        console.log('[Auth] Credentials cleared from memory; storage cleaned');
    }
}));
