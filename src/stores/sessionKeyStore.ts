import { create } from 'zustand'
import CryptoJS from 'crypto-js'
import { authStore } from '@/shared/store/auth'

interface SessionData {
  deviceId: string
  sessionId: string
  userId: string
  sessionKey: string
  keyVersion: number
  userAgent: string
  fingerprint: string
  createdAt: number
  expiresAt: number
  // Phase 4: Device key password (stored in memory only)
  devicePassword?: string
}

interface SessionKeyStore {
  sessionData: SessionData | null
  isSessionValid: boolean
  sessionError: string | null

  initializeSession: (
    userId: string,
    sessionKey: string,
    keyVersion?: number,
    devicePassword?: string
  ) => void
  updateSessionKey: (newKey: string, newKeyVersion: number) => void
  extendSession: () => void
  clearSession: () => void
  revokeDevice: () => void

  getCurrentSessionKey: () => string | null
  getDeviceId: () => string
  getSessionId: () => string
  getUserId: () => string
  getKeyVersion: () => number
  getDevicePassword: () => string | null
  isDeviceRevoked: () => boolean
}

const SESSION_TTL_MS =
  Number(import.meta.env.VITE_SESSION_KEY_TTL_MS) || 24 * 60 * 60 * 1000

export const useSessionKeyStore = create<SessionKeyStore>((set, get) => ({
  sessionData: null,
  isSessionValid: false,
  sessionError: null,

  initializeSession: (userId, sessionKey, keyVersion = 1, devicePassword) => {
    try {
      const now = Date.now()

      const { sessionId, deviceId } = authStore.getState()
      if (!sessionId || !deviceId) {
        const message = 'Missing server sessionId/deviceId for session initialization'
        console.warn('[SessionStore] ' + message)
        set({ sessionError: message, isSessionValid: false })
        return
      }

      const userAgent = navigator.userAgent
      const fingerprint = CryptoJS.SHA256(
        `${userAgent}|${window.innerWidth}x${window.innerHeight}`
      ).toString()

      const data: SessionData = {
        deviceId,
        sessionId,
        userId,
        sessionKey,
        keyVersion,
        userAgent,
        fingerprint,
        createdAt: now,
        expiresAt: now + SESSION_TTL_MS,
        devicePassword
      }

      set({
        sessionData: data,
        isSessionValid: true,
        sessionError: null
      })

      console.log('[SessionStore] Session initialized in memory', {
        sessionId,
        deviceId,
        userId,
        expiresAt: new Date(data.expiresAt).toISOString()
      })

      const timeoutMs = data.expiresAt - now
      if (timeoutMs > 0) {
        setTimeout(() => {
          console.log('[SessionStore] Session expired, clearing')
          get().clearSession()
        }, timeoutMs)
      }
    } catch (error) {
      set({
        sessionError: error instanceof Error ? error.message : 'Session init failed',
        isSessionValid: false
      })
    }
  },

  updateSessionKey: (newKey, newKeyVersion) => {
    set((state) => {
      if (!state.sessionData) throw new Error('No active session')

      const updated = {
        ...state.sessionData,
        sessionKey: newKey,
        keyVersion: newKeyVersion,
        expiresAt: Date.now() + SESSION_TTL_MS
      }

      console.log('[SessionStore] Session key updated in memory to version:', newKeyVersion)
      return { sessionData: updated }
    })
  },

  extendSession: () => {
    set((state) => {
      if (!state.sessionData) return state

      const updated = {
        ...state.sessionData,
        expiresAt: Date.now() + SESSION_TTL_MS
      }

      return { sessionData: updated }
    })
  },

  getCurrentSessionKey: () => {
    const state = get()
    if (!state.sessionData || !state.isSessionValid) return null

    if (state.sessionData.expiresAt < Date.now()) {
      console.warn('[SessionStore] Session expired')
      get().clearSession()
      return null
    }

    return state.sessionData.sessionKey
  },

  getDeviceId: () => {
    const state = get()
    const authState = authStore.getState()
    return state.sessionData?.deviceId || authState.deviceId || ''
  },

  getSessionId: () => get().sessionData?.sessionId || authStore.getState().sessionId || '',
  getUserId: () => get().sessionData?.userId || '',
  getKeyVersion: () => get().sessionData?.keyVersion || 1,
  getDevicePassword: () => get().sessionData?.devicePassword || null,

  isDeviceRevoked: () => false, // TODO: Check with backend

  clearSession: () => {
    set({
      sessionData: null,
      isSessionValid: false,
      sessionError: null
    })
    console.log('[SessionStore] Session cleared from memory')
  },

  revokeDevice: () => {
    try {
      get().clearSession()
      console.log('[SessionStore] Device revoked (client state only)')
    } catch (e) {
      console.error('[SessionStore] Revocation failed:', e)
    }
  }
}))
