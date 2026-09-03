'use client'

import type { ReactNode } from 'react'
import { OfficeNav } from '@/office/Nav'

export function OfficeShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-paper md:flex-row">
      <OfficeNav />
      <main className="min-w-0 flex-1 p-4 md:p-8">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-5">{children}</div>
      </main>
    </div>
  )
}
