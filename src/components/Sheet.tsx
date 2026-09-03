import type { ReactNode } from 'react'
import { cn } from '../lib/utils'

export function SheetTitle({
  title,
  blurb,
  action,
}: {
  title: string
  blurb?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-serif text-3xl">{title}</h1>
        {blurb ? <p className="mt-1 max-w-3xl text-sm text-ink-2">{blurb}</p> : null}
      </div>
      {action}
    </div>
  )
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="text-sm text-ink-2">{children}</p>
}

export function AutoCell({ children }: { children: ReactNode }) {
  return <span className="formula-cell inline-block min-w-[4rem] rounded px-1">{children}</span>
}

export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-end gap-3 rounded-xl border border-line bg-white p-3">{children}</div>
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <h2 className="font-serif text-xl text-ink">{children}</h2>
}

export function tableWrap(className = '') {
  return cn('overflow-x-auto rounded-xl border border-line', className)
}
