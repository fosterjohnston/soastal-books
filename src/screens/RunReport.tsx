'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { REPORTS, type ReportId } from '@/engine/lists'
import { SheetTitle } from '@/components/Sheet'
import { ReportBody } from '@/screens/reports/ReportBody'

function isReportId(v: string | null): v is ReportId {
  return !!v && REPORTS.some((r) => r.id === v)
}

export function RunReport() {
  const params = useSearchParams()
  const selected = params.get('report')
  const report = isReportId(selected) ? selected : null
  const meta = REPORTS.find((r) => r.id === report)

  if (!report) {
    return (
      <div className="flex flex-col gap-4">
        <SheetTitle
          title="Run Report"
          blurb="Everything from Equipment Allocation onward in Keith’s workbook lives here. Working sheets stay in the left nav: Setup, Job Line Items, Cost Codes, Opening Balances, Transactions."
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {REPORTS.map((r) => (
            <Link
              key={r.id}
              href={`/reports?report=${r.id}`}
              className="rounded-xl border border-line bg-white p-4 shadow-sm hover:border-teal"
            >
              <div className="font-serif text-lg">{r.label}</div>
              <p className="mt-1 text-sm text-ink-2">{r.blurb}</p>
            </Link>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <SheetTitle
        title={meta?.label || 'Report'}
        blurb={meta?.blurb}
        action={
          <Link href="/reports" className="text-sm font-semibold text-teal underline-offset-2 hover:underline">
            All reports
          </Link>
        }
      />
      <ReportBody report={report} />
    </div>
  )
}
