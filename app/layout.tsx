import type { ReactNode } from 'react'
import { AuthProvider } from '@/store/AuthContext'
import { BooksProvider } from '@/store/BooksContext'
import { OfficeGate } from '@/office/OfficeGate'
import { OfficeShell } from '@/office/OfficeShell'
import './globals.css'

export const metadata = {
  title: 'Soastal Books — Soastal LLC office accrual',
  description: 'Company workbook: scan bills, propose coding, Foster confirms, post. Copies only. Not the field site.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <OfficeGate>
            <BooksProvider>
              <OfficeShell>{children}</OfficeShell>
            </BooksProvider>
          </OfficeGate>
        </AuthProvider>
      </body>
    </html>
  )
}
