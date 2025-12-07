// stores/sessionKeyStore.ts
// 🔐 SECURITY FIX: Device fingerprinting and session key management IN MEMORY ONLY
// Keys are never stored in localStorage/sessionStorage to prevent XSS attacks

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
  // 🔐 Phase 4: Device key password (stored in memory only)
  devicePassword?: string
}

interface SessionKeyStore {
  // State - IN MEMORY ONLY
  sessionData: SessionData | null
  isSessionValid: boolean
  sessionError: string | null

  // Methods
  initializeSession: (userId: string, sessionKey: string, keyVersion?: number, devicePassword?: string) => void
  updateSessionKey: (newKey: string, newKeyVersion: number) => void
  extendSession: () => void
  clearSession: () => void
  revokeDevice: () => void

  // Getters
  getCurrentSessionKey: () => string | null
  getDeviceId: () => string
  getSessionId: () => string
  getUserId: () => string
  getKeyVersion: () => number
  getDevicePassword: () => string | null
  isDeviceRevoked: () => boolean
}

const SESSION_TTL_MS = (import.meta.env.VITE_SESSION_KEY_TTL_MS as number) || 24 * 60 * 60 * 1000

// 🔐 SECURITY: Device ID stored separately (not sensitive like session keys)
const DEVICE_STORAGE_KEY = 'architech_device'

export const useSessionKeyStore = create<SessionKeyStore>((set, get) => ({
  sessionData: null,
  isSessionValid: false,
  sessionError: null,

  initializeSession: (userId, sessionKey, keyVersion = 1, devicePassword) => {
    try {
      const now = Date.now()
      
      // 🔐 CRITICAL: Get sessionId and deviceId from authStore ONLY
      // They are now in HttpOnly cookies on backend (secure from XSS)
      // After page reload, they come from refresh endpoint response
      const state = authStore.getState();
      const sessionId = state.sessionId;
      const deviceId = state.deviceId;
      
      if (!sessionId || !deviceId) {
        console.warn('[SessionStore] Missing server sessionId/deviceId, using local fallback')
      }
      
      // Fallback: generate local IDs if server IDs not available yet
      const finalSessionId = sessionId || `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
      const finalDeviceId = deviceId || (() => {
        let id = localStorage.getItem(DEVICE_STORAGE_KEY)
        if (!id) {
          id = `device_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
          localStorage.setItem(DEVICE_STORAGE_KEY, id)
        }
        return id
      })()

      const userAgent = navigator.userAgent
      const fingerprint = CryptoJS.SHA256(
        userAgent + '|' + window.innerWidth + 'x' + window.innerHeight
      ).toString()

      const data: SessionData = {
        deviceId: finalDeviceId,
        sessionId: finalSessionId,
        userId,
        sessionKey, // 🔐 DECRYPTED HMAC key - stays in memory only
        keyVersion,
        userAgent,
        fingerprint,
        createdAt: now,
        expiresAt: now + SESSION_TTL_MS,
        devicePassword, // 🔐 Phase 4: Device key password (memory only)
      }

      // 🔐 SECURITY FIX: DO NOT save to sessionStorage
      // Keys remain in memory only

      set({
        sessionData: data,
        isSessionValid: true,
        sessionError: null
      })

      console.log('[SessionStore] 🔐 Session initialized IN MEMORY:', {
        sessionId,
        deviceId,
        userId,
        expiresAt: new Date(data.expiresAt).toISOString()
      })
      
      // Set up automatic cleanup on timeout
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

  // 🔐 SECURITY FIX: Removed restoreSession - sessions are memory-only, not persisted

  updateSessionKey: (newKey, newKeyVersion) => {
    set((state) => {
      if (!state.sessionData) throw new Error('No active session')

      const updated = {
        ...state.sessionData,
        sessionKey: newKey, // 🔐 Updated in memory only
        keyVersion: newKeyVersion,
        expiresAt: Date.now() + SESSION_TTL_MS
      }

      console.log('[SessionStore] 🔐 Session key updated in memory to version:', newKeyVersion)
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
    if (state.sessionData) return state.sessionData.deviceId

    let deviceId = localStorage.getItem(DEVICE_STORAGE_KEY)
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
      localStorage.setItem(DEVICE_STORAGE_KEY, deviceId)
    }
    return deviceId
  },

  getSessionId: () => get().sessionData?.sessionId || '',
  getUserId: () => get().sessionData?.userId || '',
  getKeyVersion: () => get().sessionData?.keyVersion || 1,
  getDevicePassword: () => get().sessionData?.devicePassword || null,

  isDeviceRevoked: () => false, // TODO: Check with backend

  clearSession: () => {
    // 🔐 SECURITY FIX: Clear from memory only (nothing to remove from storage)
    set({
      sessionData: null,
      isSessionValid: false,
      sessionError: null
    })
    console.log('[SessionStore] 🔐 Session cleared from memory')
  },

  revokeDevice: () => {
    try {
      localStorage.removeItem(DEVICE_STORAGE_KEY)
      get().clearSession()
      console.log('[SessionStore] Device revoked')
    } catch (e) {
      console.error('[SessionStore] Revocation failed:', e)
    }
  }
}))
