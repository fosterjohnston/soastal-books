'use client'

import type { ReactNode } from 'react'
import { OfficeNav } from '@/office/Nav'

export function OfficeShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      <OfficeNav />
      <div className="flex-1 p-4 md:p-8">{children}</div>
    </div>
  )
}
