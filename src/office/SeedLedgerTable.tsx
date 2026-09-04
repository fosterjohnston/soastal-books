import { computeLedger } from '@/engine'
import { formatDate, formatNative } from '@/lib/utils'
import { createEmptyBooks } from '@/seed'

/** Server-rendered seed journal so the HTML itself contains the workbook, not an empty #root. */
export function SeedLedgerTable() {
  const rows = computeLedger(createEmptyBooks())
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-serif text-3xl">Transactions</h1>
        <p className="max-w-2xl text-sm text-ink-2">
          Keith’s company ledger. Invoice total on the first split only. Formula columns (Final acct, Offset, Diff)
          are computed. Cheat sheet: money out +, money in − — that signed amount goes in Invoice Total. Unpaid / AP
          offsets 2000. Pay later as invoice-PMT, Job blank,
          Liability, override 2000.
        </p>
      </div>
      <div className="overflow-auto rounded-xl border border-line" style={{ maxHeight: 480 }}>
        <table className="ledger-table w-full">
          <thead>
            <tr>
              <th>Posting date</th>
              <th>Vendor</th>
              <th>Invoice #</th>
              <th>Source type</th>
              <th>Payment method</th>
              <th>Invoice total</th>
              <th>Allocation amount</th>
              <th>Job name</th>
              <th>Cost type</th>
              <th>Line item</th>
              <th>Override</th>
              <th>PO #</th>
              <th>Approval</th>
              <th>Final acct</th>
              <th>Offset</th>
              <th>Diff</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{formatDate(r.postingDate)}</td>
                <td>{r.vendor}</td>
                <td>{r.invoiceNumber}</td>
                <td>{r.sourceType}</td>
                <td>{r.paymentMethod}</td>
                <td>{r.invoiceTotal ? formatNative(r.invoiceTotal) : ''}</td>
                <td>{formatNative(r.allocationAmount)}</td>
                <td>{r.jobName || '—'}</td>
                <td>{r.costType}</td>
                <td>{r.lineItem || '—'}</td>
                <td className="formula-cell">{r.overrideAccount || '—'}</td>
                <td>{r.poNumber || '—'}</td>
                <td>{r.approvalStatus}</td>
                <td className="formula-cell">{r.finalAccount || '—'}</td>
                <td className="formula-cell">{r.offsetAccount || '—'}</td>
                <td className={Math.abs(r.difference) > 0.005 ? 'diff-bad' : 'formula-cell'}>
                  {formatNative(r.difference)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
