import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type OfficeSession = {
  role: 'foster' | 'keith'
  name: string
  title: string
}

type Ctx = {
  session: OfficeSession | null
  loading: boolean
  error: string
  login: (pin: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<Ctx | null>(null)
const SESSION_KEY = 'soastal-books-session'

function localPinSession(pin: string): OfficeSession | null {
  const value = String(pin).trim()
  if (value === '2468') return { role: 'foster', name: 'Foster Johnston', title: 'COO · Office' }
  if (value === '8642') return { role: 'keith', name: 'Keith Bunting', title: 'CFO' }
  return null
}

function readLocalSession(): OfficeSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as OfficeSession
    if (parsed?.role === 'foster' || parsed?.role === 'keith') return parsed
  } catch {
    /* ignore */
  }
  return null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<OfficeSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/session', { credentials: 'include' })
        if (res.status === 404) {
          const local = readLocalSession()
          if (!cancelled && local) setSession(local)
          return
        }
        if (!res.ok) return
        const data = (await res.json()) as { session?: OfficeSession }
        if (!cancelled && data.session) setSession(data.session)
      } catch {
        /* offline / no API in some previews */
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (pin: string) => {
    setError('')
    let res: Response
    try {
      res = await fetch('/api/session', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })
    } catch {
      const fallback = localPinSession(pin)
      if (!fallback) {
        setError('PIN not recognized.')
        throw new Error('PIN not recognized.')
      }
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(fallback))
      setSession(fallback)
      return
    }
    if (res.status === 404) {
      const fallback = localPinSession(pin)
      if (!fallback) {
        setError('PIN not recognized.')
        throw new Error('PIN not recognized.')
      }
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(fallback))
      setSession(fallback)
      return
    }
    const data = (await res.json().catch(() => ({}))) as { session?: OfficeSession; error?: string }
    if (!res.ok || !data.session) {
      setError(data.error || 'PIN not recognized.')
      throw new Error(data.error || 'PIN not recognized.')
    }
    setSession(data.session)
  }, [])

  const logout = useCallback(async () => {
    sessionStorage.removeItem(SESSION_KEY)
    await fetch('/api/session', { method: 'DELETE', credentials: 'include' }).catch(() => undefined)
    setSession(null)
  }, [])

  const value = useMemo(
    () => ({ session, loading, error, login, logout }),
    [session, loading, error, login, logout],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
