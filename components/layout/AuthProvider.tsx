'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { logClientError } from '@/lib/client-errors'

export type GlobalRole = 'PENDING' | 'MEMBER' | 'SUPER_ADMIN'

export interface AuthProfile {
  userId: string
  email: string | null
  displayName: string | null
  avatarUrl: string | null
  globalRole: GlobalRole
  activeClientId: string | null
}

export interface ClientOpt {
  id: string
  name: string
  slug: string
  themeKey: string
}

interface AuthContextValue {
  profile: AuthProfile | null
  clients: ClientOpt[]
  loading: boolean
  sessionError: boolean
  refetch: () => Promise<void>
  setProfileFields: (next: Partial<Pick<AuthProfile, 'displayName' | 'avatarUrl'>>) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * Single source of truth for the active session + profile + accessible clients.
 *
 * Previously a no-op wrapper. Sidebar and ClientSwitcher each did their own
 * `/api/me` + `/api/me/clients` fetch on mount, duplicating network round-trips
 * on every page navigation and making session-error state hard to surface
 * consistently. This provider does a single Promise.all on mount, exposes
 * the result via context, and re-fetches on demand (e.g. after profile edit
 * or active-client switch).
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<AuthProfile | null>(null)
  const [clients, setClients] = useState<ClientOpt[]>([])
  const [loading, setLoading] = useState(true)
  const [sessionError, setSessionError] = useState(false)

  const load = useCallback(async () => {
    try {
      const [meRes, clientsRes] = await Promise.all([
        fetch('/api/me'),
        fetch('/api/me/clients'),
      ])
      if (!meRes.ok) {
        setSessionError(true)
        setProfile(null)
        setClients([])
        return
      }
      const meData = (await meRes.json()) as AuthProfile
      const clientsData = clientsRes.ok
        ? ((await clientsRes.json()) as { clients?: ClientOpt[] })
        : { clients: [] }
      setProfile(meData)
      setClients(clientsData.clients ?? [])
      setSessionError(false)
    } catch (err) {
      logClientError(err, 'AuthProvider:load', { silent: true })
      setSessionError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const setProfileFields = useCallback(
    (next: Partial<Pick<AuthProfile, 'displayName' | 'avatarUrl'>>) => {
      setProfile((prev) => (prev ? { ...prev, ...next } : prev))
    },
    [],
  )

  const value: AuthContextValue = {
    profile,
    clients,
    loading,
    sessionError,
    refetch: load,
    setProfileFields,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * Read the current session. Must be called inside an `<AuthProvider>` (root
 * layout already wraps everything). Returns `loading=true` until the first
 * fetch resolves.
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>')
  }
  return ctx
}
