import { create } from 'zustand'
import { secureChatWebSocket } from '@/shared/api/secureChatWebSocket'

export type User = { id: string; username: string; email?: string }

type State = {
  user: User | null
  accessToken: string | null
  // Device/Session binding credentials (memory only)
  sessionId: string | null
  deviceId: string | null
  sessionKey: string | null // Encrypted session key (never decrypted on client)
  sessionKeyIv: string | null // IV for session key
}

type Actions = {
  setAuth: (u: User | null, a: string | null) => void
  // Set session credentials from login response (server-issued)
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
      secureChatWebSocket.setSessionCredentials(sessionId, deviceId)
      console.log('[Auth] Server credentials passed to WebSocket: sessionId and deviceId')
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

    // Clean up leftovers from older versions that used web storage
    sessionStorage.removeItem('__device_token__')
    sessionStorage.removeItem('__device_token_expires__')
    sessionStorage.removeItem('__session_key__')
    sessionStorage.removeItem('__session_key_iv__')
    sessionStorage.removeItem('__session_id__')
    sessionStorage.removeItem('__server_device_id__')

    console.log('[Auth] Credentials cleared from memory; storage cleaned')
  }
}))
