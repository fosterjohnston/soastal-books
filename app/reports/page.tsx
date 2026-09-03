import { Suspense } from 'react'
import { RunReport } from '@/screens/RunReport'

export default function ReportsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-ink-2">Loading reports…</p>}>
      <RunReport />
    </Suspense>
  )
}
