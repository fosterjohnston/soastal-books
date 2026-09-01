import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

export type OfficeSession = {
  role: 'foster' | 'keith'
  name: string
  title: string
}

type Ctx = {
  session: OfficeSession
  loading: boolean
  error: string
  login: (pin: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<Ctx | null>(null)

const OFFICE: OfficeSession = { role: 'foster', name: 'Foster Johnston', title: 'COO · Office' }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session] = useState<OfficeSession>(OFFICE)
  const value = useMemo(
    () => ({
      session,
      loading: false,
      error: '',
      login: async () => undefined,
      logout: async () => undefined,
    }),
    [session],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
