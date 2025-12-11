import axios from 'axios'
import { authStore } from '@/shared/store/auth'
import { endpoints } from './endpoints'
import { repairObjectStrings } from '@/shared/utils/text'

export const http = axios.create({ baseURL: '/', withCredentials: true })

// Globally repair mojibake in response data (UTF-8 mis-decoded as Latin-1/CP1251)
http.interceptors.response.use((res) => {
  try {
    res.data = repairObjectStrings(res.data)
  } catch {}
  return res
})

http.interceptors.request.use((cfg) => {
  cfg.headers = cfg.headers || {}
  const state = authStore.getState()
  const at = state.accessToken
  if (at) cfg.headers.Authorization = `Bearer ${at}`

  const sessionId = state.sessionId
  const deviceId = state.deviceId

  if (sessionId) {
    cfg.headers['X-Session-ID'] = sessionId
  }
  if (deviceId) {
    cfg.headers['X-Device-ID'] = deviceId
  }

  return cfg
})

let refreshing: Promise<void> | null = null

http.interceptors.response.use(undefined, async (err) => {
  const cfg = err.config
  if (err.response?.status !== 401 || (cfg as any).__retry) throw err

  if (!refreshing) {
    refreshing = (async () => {
      try {
        const store = authStore.getState()

        const headers: Record<string, string> = {}
        if (store.sessionId) headers['X-Session-ID'] = store.sessionId
        if (store.deviceId) headers['X-Device-ID'] = store.deviceId

        const r = await fetch(endpoints.refresh, {
          method: 'POST',
          credentials: 'include',
          headers
        })
        if (!r.ok) throw 0
        const { accessToken, sessionId, deviceId } = await r.json()
        authStore.getState().setAuth(store.user, accessToken)

        if (sessionId && deviceId) {
          authStore.getState().setSessionCredentials(sessionId, deviceId)
        }
      } catch {
        authStore.getState().clear()
      } finally {
        refreshing = null
      }
    })()
  }
  await refreshing
  ;(cfg as any).__retry = true
  return http(cfg)
})
