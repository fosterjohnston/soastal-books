'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/inbox', label: 'Inbox' },
  { href: '/transactions', label: 'Transactions' },
  { href: '/bills', label: 'Bills (AP)' },
  { href: '/invoices', label: 'Invoices (AR)' },
  { href: '/jobs', label: 'Jobs' },
  { href: '/vendors', label: 'Vendors' },
  { href: '/reports', label: 'Reports' },
  { href: '/setup', label: 'Setup' },
] as const

export function OfficeNav() {
  const path = usePathname()
  return (
    <aside className="flex flex-col bg-ink text-paper md:w-56 md:shrink-0">
      <div className="border-b border-white/10 px-4 py-4">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sand">Soastal LLC</div>
        <div className="font-serif text-xl">Books</div>
        <div className="text-xs text-paper/60">Accrual · copies only</div>
      </div>
      <nav className="flex gap-1 overflow-x-auto p-2 md:flex-col md:overflow-visible">
        {NAV.map((item) => {
          const active = path === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-3 py-2 text-sm whitespace-nowrap ${
                active ? 'bg-white/10 text-white' : 'text-paper/75 hover:bg-white/5'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
      <p className="mt-auto px-4 py-4 text-[11px] text-paper/50">
        Keith owns the live sheet. This app never writes Documents/Finance/Acounting spreadshseet.xlsx.
      </p>
    </aside>
  )
}
