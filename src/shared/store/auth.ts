import { create } from 'zustand'

export type User = { id: string; username: string; email?: string }

type State = {
  user: User | null
  accessToken: string | null
  sessionId: string | null
  deviceId: string | null
  sessionKey: string | null
  sessionKeyIv: string | null
}

type Actions = {
  setAuth: (u: User | null, a: string | null) => void
  setSessionCredentials: (
    sessionId: string | undefined,
    deviceId: string | undefined,
    sessionKey?: string,
    sessionKeyIv?: string
  ) => void
  clear: () => void
}

export const authStore = create<State & Actions>((set) => ({
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
    })

    if (sessionId && deviceId) {
      console.log('[Auth] Server credentials updated: sessionId and deviceId')
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
    })

    sessionStorage.removeItem('__device_token__')
    sessionStorage.removeItem('__device_token_expires__')
    sessionStorage.removeItem('__session_key__')
    sessionStorage.removeItem('__session_key_iv__')
    sessionStorage.removeItem('__session_id__')
    sessionStorage.removeItem('__server_device_id__')

    console.log('[Auth] Credentials cleared from memory; storage cleaned')
  }
}))
