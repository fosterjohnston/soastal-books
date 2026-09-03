import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { RunReport } from '@/screens/RunReport'

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ report?: string }>
}) {
  const { report } = await searchParams
  if (report === 'equipment-allocation') redirect('/equipment-allocation')
  return (
    <Suspense fallback={<p className="text-sm text-ink-2">Loading reports…</p>}>
      <RunReport />
    </Suspense>
  )
}
