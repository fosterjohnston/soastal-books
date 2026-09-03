import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '../lib/utils'

export function Button({
  variant = 'primary',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' | 'sand' }) {
  const styles = {
    primary: 'bg-teal text-white hover:bg-teal-2',
    ghost: 'bg-transparent text-ink border border-line hover:bg-paper-2',
    danger: 'bg-danger text-white hover:opacity-90',
    sand: 'bg-sand text-ink hover:opacity-90',
  } as const
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-semibold shadow-sm disabled:opacity-50',
        styles[variant],
        className,
      )}
      {...props}
    />
  )
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-semibold text-ink-2">{label}</span>
      {children}
      {hint ? <span className="text-xs text-ink-2/70">{hint}</span> : null}
    </label>
  )
}

const control =
  'w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-teal'

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(control, props.className)} {...props} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(control, props.className)} {...props} />
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(control, 'min-h-[80px]', props.className)} {...props} />
}

export function Badge({
  tone = 'ink',
  children,
}: {
  tone?: 'ink' | 'teal' | 'sand' | 'danger' | 'muted'
  children: ReactNode
}) {
  const map = {
    ink: 'bg-ink text-paper',
    teal: 'bg-teal/15 text-teal',
    sand: 'bg-sand/40 text-ink',
    danger: 'bg-red-100 text-danger',
    muted: 'bg-paper-2 text-ink-2',
  } as const
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold', map[tone])}>
      {children}
    </span>
  )
}

export function Card({ title, action, children, className }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-xl border border-line bg-white p-5 shadow-sm', className)}>
      {title ? (
        <header className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-serif text-lg text-ink">{title}</h2>
          {action}
        </header>
      ) : null}
      {children}
    </section>
  )
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-2/70">{label}</div>
      <div className="mt-1 font-serif text-2xl text-ink">{value}</div>
      {hint ? <div className="mt-1 text-xs text-ink-2/70">{hint}</div> : null}
    </div>
  )
}
