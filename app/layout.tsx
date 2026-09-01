import type { ReactNode } from 'react'
import { OfficeNav } from '@/office/Nav'
import { BooksProvider } from '@/store/BooksContext'
import './globals.css'

export const metadata = {
  title: 'Soastal Books — Soastal LLC office accrual',
  description: 'Company workbook: transactions, AP bills, AR invoices, Foster inbox, job cost, P&L. Copies only.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-svh flex-col md:flex-row">
          <OfficeNav />
          <div className="flex-1 p-4 md:p-8">
            <BooksProvider>{children}</BooksProvider>
          </div>
        </div>
      </body>
    </html>
  )
}
