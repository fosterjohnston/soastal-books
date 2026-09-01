import { formatNative } from '../lib/utils'

export function Money({ n, className = '' }: { n: number; className?: string }) {
  return (
    <span className={`${n < 0 ? 'money-neg' : 'money-pos'} tabular-nums ${className}`}>{formatNative(n)}</span>
  )
}
