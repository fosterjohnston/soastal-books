'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/store/AuthContext'
import { useBooks } from '@/store/BooksContext'

const NAV = [
  { href: '/inbox', label: 'Inbox' },
  { href: '/transactions', label: 'Transactions' },
  { href: '/equipment-allocation', label: 'Equipment Allocation' },
  { href: '/job-line-items', label: 'Job Line Items' },
  { href: '/cost-codes', label: 'Cost Codes' },
  { href: '/opening-balances', label: 'Opening Balances' },
  { href: '/setup', label: 'Setup' },
  { href: '/reports', label: 'Run Report' },
  { href: '/files', label: 'Files' },
] as const

export function OfficeNav() {
  const path = usePathname()
  const { session, logout } = useAuth()
  const { books } = useBooks()
  const pending = books.fosterQueue.filter((f) => f.decision === 'pending').length

  return (
    <aside className="flex flex-col bg-ink text-paper md:w-60 md:shrink-0">
      <div className="border-b border-white/10 px-5 py-5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-sand">Soastal LLC</div>
        <div className="font-serif text-2xl leading-tight">Books</div>
        <div className="mt-1 text-xs text-paper/55">Accrual · copies only</div>
      </div>
      <nav className="flex gap-1 overflow-x-auto p-2 md:flex-col md:overflow-visible md:px-3 md:py-4">
        {NAV.map((item) => {
          const active =
            path === item.href ||
            (item.href === '/transactions' && (path === '/' || path === '')) ||
            (item.href === '/reports' && path.startsWith('/reports'))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between rounded-md px-3 py-2 text-sm whitespace-nowrap ${
                active
                  ? 'bg-white/10 text-white shadow-[inset_3px_0_0_0_#1a6b5c]'
                  : 'text-paper/75 hover:bg-white/5'
              }`}
            >
              <span>{item.label}</span>
              {item.href === '/inbox' && pending > 0 ? (
                <span className="ml-2 rounded-full bg-sand px-1.5 text-[10px] font-bold text-ink">{pending}</span>
              ) : null}
            </Link>
          )
        })}
      </nav>
      <div className="mt-auto px-4 py-4 text-[11px] text-paper/50">
        <div>
          {session?.name} · {session?.title}
        </div>
        <button type="button" className="mt-2 text-sand underline-offset-2 hover:underline" onClick={() => void logout()}>
          Sign out
        </button>
        <p className="mt-3">Keith owns the live sheet. This app never writes Documents/Finance/Acounting spreadshseet.xlsx.</p>
      </div>
    </aside>
  )
}
