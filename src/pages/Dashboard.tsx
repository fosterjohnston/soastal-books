import { apAging, arAging, cashFlow, computeLedger, pnlMonthly, sumAging } from '../engine'
import { formatDate, formatNative } from '../lib/utils'
import { useBooks } from '../store/BooksContext'
import { Badge, Card, Stat } from '../components/ui'
import { Money } from '../components/Money'

export function Dashboard() {
  const { books } = useBooks()
  const ledger = computeLedger(books)
  const asOf = new Date().toISOString().slice(0, 10)
  const ap = apAging(books, asOf)
  const ar = arAging(books, asOf)
  const apSum = sumAging(ap)
  const arSum = sumAging(ar)
  const cash = cashFlow(books)
  const cashNet = cash.reduce((s, r) => s + r.netCash, 0)
  const month = new Date().toISOString().slice(0, 7)
  const pl = pnlMonthly(books).find((p) => p.month === month)
  const redDiff = ledger.filter((r) => Math.abs(r.difference) > 0.005)
  const fosterOpen = books.fosterQueue.filter((f) => f.decision === 'pending')
  const unposted = ledger.filter((r) => !r.posted)

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal">Soastal LLC · Office books</p>
        <h1 className="font-serif text-3xl text-ink md:text-4xl">Soastal Books</h1>
        <p className="mt-2 max-w-3xl text-sm text-ink-2">
          Accrual accounting that mirrors Keith&apos;s company workbook — not a cash log, not QuickBooks, not the
          field app. Money out is positive. Money in is negative. Payment Method sets the offset. Invoice Total is a
          control total. Difference must be 0.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Open AP (2000)" value={<Money n={apSum.total} />} hint={`${ap.length} unpaid bills`} />
        <Stat label="Open AR (1100)" value={<Money n={arSum.total} />} hint="Billed, not deposited" />
        <Stat
          label="Cash movement (posted)"
          value={<Money n={cashNet} />}
          hint="Offsets 1000 / 1010 / 1050. Native sign."
        />
        <Stat
          label={`${month} net income`}
          value={formatNative(pl?.netIncomeDisplay ?? 0)}
          hint="Display: −(revenue native + costs). Revenue is stored negative."
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Card title="Foster inbox">
          {fosterOpen.length === 0 ? (
            <p className="text-sm text-ink-2">No coding confirms waiting. Foster is the only human for invoice coding yes/no.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {fosterOpen.map((f) => (
                <li key={f.id} className="flex justify-between gap-3 border-b border-line pb-2">
                  <span>
                    <strong>{f.vendor}</strong> {f.invoiceNumber}
                    <div className="text-xs text-ink-2">{f.reason}</div>
                  </span>
                  <Money n={f.amount} />
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Needs attention">
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between">
              Unposted rows <Badge tone={unposted.length ? 'sand' : 'teal'}>{unposted.length}</Badge>
            </li>
            <li className="flex justify-between">
              Documents with Difference ≠ 0{' '}
              <Badge tone={redDiff.length ? 'danger' : 'teal'}>{new Set(redDiff.map((r) => r.invoiceKey)).size}</Badge>
            </li>
            <li className="flex justify-between">
              Opening balances <Badge tone={books.openingBalances.length ? 'teal' : 'sand'}>{books.openingBalances.length}</Badge>
            </li>
          </ul>
          <p className="mt-3 text-xs text-ink-2">
            A payment against a bill is a different document: append <code>-PMT</code>. Reusing the number makes
            Difference go red.
          </p>
        </Card>
        <Card title="Accrual reminder">
          <ol className="list-decimal space-y-1 pl-4 text-sm text-ink-2">
            <li>Vendor bill when incurred: Unpaid / AP → 2000. Hits job cost and AP aging. Cash does not move.</li>
            <li>Pay later: invoice-PMT, Job blank, Liability, Override 2000, Check/ACH, Paid.</li>
            <li>Customer billing: Billed / AR → 1100, Revenue, allocation negative.</li>
            <li>Deposit later clears AR. Do not collapse bill + cash into one cash-basis row.</li>
          </ol>
        </Card>
      </div>

      <Card title="Recent ledger">
        {ledger.length === 0 ? (
          <p className="text-sm text-ink-2">No transactions yet. Use Enter a document, or the ledger grid.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="ledger-table w-full">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Vendor</th>
                  <th>Invoice</th>
                  <th>Job</th>
                  <th>Amount</th>
                  <th>Final</th>
                  <th>Offset</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {[...ledger].reverse().slice(0, 8).map((r) => (
                  <tr key={r.id}>
                    <td>{formatDate(r.postingDate)}</td>
                    <td>{r.vendor}</td>
                    <td>{r.invoiceNumber}</td>
                    <td>{r.jobName || '—'}</td>
                    <td>
                      <Money n={r.allocationAmount} />
                    </td>
                    <td>{r.finalAccount || '—'}</td>
                    <td>{r.offsetAccount || '—'}</td>
                    <td>
                      <Badge tone={r.posted ? 'teal' : 'sand'}>{r.posted ? r.approvalStatus : 'Unposted'}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
