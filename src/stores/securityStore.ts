// stores/securityStore.ts
// Security event logging and tracking with Zustand

import { create } from 'zustand'

interface SecurityEvent {
  type: string
  timestamp: number
  details: any
  severity: 'low' | 'medium' | 'high' | 'critical'
}

interface SecurityStore {
  // State
  events: SecurityEvent[]
  invalidMessageAttempts: Map<string, number>
  maxEvents: number

  // Methods
  logSecurityEvent: (
    type: string,
    details?: any,
    severity?: 'low' | 'medium' | 'high' | 'critical'
  ) => void
  recordInvalidMessageAttempt: (msgId: string) => void
  cleanupInvalidAttempts: () => void
  getEvents: (type?: string, minSeverity?: string) => SecurityEvent[]
  getHighSeverityEvents: () => SecurityEvent[]
  clearEvents: () => void
  exportLog: () => string
}

export const useSecurityStore = create<SecurityStore>((set, get) => ({
  events: [],
  invalidMessageAttempts: new Map(),
  maxEvents: 100,

  logSecurityEvent: (type, details = {}, severity = 'medium') => {
    const event: SecurityEvent = {
      type,
      timestamp: Date.now(),
      details,
      severity
    }

    set((state) => {
      const newEvents = [...state.events, event]
      if (newEvents.length > state.maxEvents) {
        newEvents.splice(0, newEvents.length - state.maxEvents)
      }
      return { events: newEvents }
    })

    if (!import.meta.env.PROD) {
      console.warn(`[Security Event] ${severity.toUpperCase()}: ${type}`, details)
    } else {
      console.warn(`[Security Event] ${type} (details hidden in production)`)
    }

    if (severity === 'critical') {
      console.error(`[CRITICAL SECURITY EVENT] ${type}`)
    }
  },

  recordInvalidMessageAttempt: (msgId) => {
    set((state) => {
      const attempts = (state.invalidMessageAttempts.get(msgId) || 0) + 1
      const newMap = new Map(state.invalidMessageAttempts)
      newMap.set(msgId, attempts)

      if (attempts > 3) {
        get().logSecurityEvent(
          'REPEATED_INVALID_MESSAGES',
          { msgId, attempts },
          'high'
        )
      }

      return { invalidMessageAttempts: newMap }
    })
  },

  cleanupInvalidAttempts: () => {
    set((state) => {
      if (state.invalidMessageAttempts.size > 1000) {
        const newMap = new Map(state.invalidMessageAttempts)
        const keysToDelete = Array.from(newMap.keys()).slice(0, newMap.size - 1000)
        keysToDelete.forEach((k) => newMap.delete(k))
        return { invalidMessageAttempts: newMap }
      }
      return state
    })
  },

  getEvents: (type?: string, minSeverity?: string) => {
    const state = get()
    let filtered = [...state.events]

    if (type) {
      filtered = filtered.filter((e) => e.type === type)
    }

    if (minSeverity) {
      const severities = ['low', 'medium', 'high', 'critical']
      const minIndex = severities.indexOf(minSeverity)
      filtered = filtered.filter(
        (e) => severities.indexOf(e.severity) >= minIndex
      )
    }

    return filtered
  },

  getHighSeverityEvents: () => {
    return get().getEvents(undefined, 'high')
  },

  clearEvents: () => {
    set({ events: [], invalidMessageAttempts: new Map() })
  },

  exportLog: () => {
    const state = get()
    const log = {
      exportedAt: new Date().toISOString(),
      totalEvents: state.events.length,
      events: state.events.map((e) => ({
        type: e.type,
        timestamp: new Date(e.timestamp).toISOString(),
        severity: e.severity,
        details: e.details
      }))
    }
    return JSON.stringify(log, null, 2)
  }
}))
