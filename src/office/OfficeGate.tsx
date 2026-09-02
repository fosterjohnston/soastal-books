'use client'

import type { ReactNode } from 'react'
import { useAuth } from '@/store/AuthContext'
import { OfficeLogin } from '@/office/OfficeLogin'

export function OfficeGate({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-ink text-paper">
        <p className="font-serif text-2xl">Opening books…</p>
      </div>
    )
  }
  if (!session) return <OfficeLogin />
  return <>{children}</>
}
