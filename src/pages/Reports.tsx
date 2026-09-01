import { useState } from 'react'
import {
  balanceSheet,
  cashFlow,
  equipmentMemos,
  jobCostByAccount,
  jobCosting,
  pnlByJob,
  pnlMonthly,
  trialBalances,
  wip,
} from '../engine'
import { formatNative } from '../lib/utils'
import { useBooks } from '../store/BooksContext'
import { Card } from '../components/ui'
import { Money } from '../components/Money'

const TABS = [
  'Job Costing',
  'Job Cost by Account',
  'P&L Monthly',
  'P&L by Job',
  'Balance Sheet',
  'Cash Flow',
  'WIP',
  'Account Summary',
  'Equipment Memo',
] as const

export function Reports() {
  const { books } = useBooks()
  const [tab, setTab] = useState<(typeof TABS)[number]>('Job Costing')
  const asOf = new Date().toISOString().slice(0, 10)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-serif text-3xl">Reports</h1>
        <p className="max-w-2xl text-sm text-ink-2">
          CFO views from the allocation ledger. Native sign: money out +, money in −. This is not a typed
          double-entry GL — each row is allocation + auto offset. Official statements still belong to the accountant.
        </p>
      </div>
      <div className="flex flex-wrap gap-1">
        {TABS.map((t) => (
          <button
            key={t}
            className={`rounded-full px-3 py-1 text-sm ${tab === t ? 'bg-ink text-paper' : 'bg-white border border-line'}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Job Costing' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="ledger-table w-full">
              <thead>
                <tr>
                  <th>Job</th>
                  <th>Labor</th>
                  <th>Equip</th>
                  <th>Matl</th>
                  <th>Sub</th>
                  <th>OH</th>
                  <th>Total cost</th>
                  <th>Billed (native)</th>
                </tr>
              </thead>
              <tbody>
                {jobCosting(books).map((j) => (
                  <tr key={j.jobNumber}>
                    <td>
                      {j.jobName} <span className="text-ink-2">{j.jobNumber}</span>
                    </td>
                    <td>
                      <Money n={j.labor} />
                    </td>
                    <td>
                      <Money n={j.equipment} />
                    </td>
                    <td>
                      <Money n={j.materials} />
                    </td>
                    <td>
                      <Money n={j.subcontractor} />
                    </td>
                    <td>
                      <Money n={j.overhead} />
                    </td>
                    <td>
                      <Money n={j.totalCost} />
                    </td>
                    <td>
                      <Money n={j.billed} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'Job Cost by Account' && (
        <Card>
          <table className="ledger-table w-full">
            <thead>
              <tr>
                <th>Job</th>
                <th>Account</th>
                <th>Name</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {jobCostByAccount(books).map((r, i) => (
                <tr key={i}>
                  <td>{r.jobName}</td>
                  <td>{r.account}</td>
                  <td>{r.accountName}</td>
                  <td>
                    <Money n={r.amount} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {jobCostByAccount(books).length === 0 ? <p className="text-sm text-ink-2">No posted job costs.</p> : null}
        </Card>
      )}

      {tab === 'P&L Monthly' && (
        <Card>
          <table className="ledger-table w-full">
            <thead>
              <tr>
                <th>Month</th>
                <th>Revenue (native)</th>
                <th>Job cost</th>
                <th>Overhead</th>
                <th>Other</th>
                <th>Net income (display)</th>
              </tr>
            </thead>
            <tbody>
              {pnlMonthly(books).map((p) => (
                <tr key={p.month}>
                  <td>{p.month}</td>
                  <td>
                    <Money n={p.revenue} />
                  </td>
                  <td>
                    <Money n={p.jobCost} />
                  </td>
                  <td>
                    <Money n={p.overhead} />
                  </td>
                  <td>
                    <Money n={p.otherExpense} />
                  </td>
                  <td>{formatNative(p.netIncomeDisplay)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === 'P&L by Job' && (
        <Card>
          <table className="ledger-table w-full">
            <thead>
              <tr>
                <th>Job</th>
                <th>Revenue</th>
                <th>Job cost</th>
                <th>Overhead</th>
                <th>Net (display)</th>
              </tr>
            </thead>
            <tbody>
              {pnlByJob(books).map((p) => (
                <tr key={p.jobName}>
                  <td>{p.jobName}</td>
                  <td>
                    <Money n={p.revenue} />
                  </td>
                  <td>
                    <Money n={p.jobCost} />
                  </td>
                  <td>
                    <Money n={p.overhead} />
                  </td>
                  <td>{formatNative(p.netIncomeDisplay)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === 'Balance Sheet' && (
        <Balance asOf={asOf} />
      )}

      {tab === 'Cash Flow' && (
        <Card>
          <p className="mb-2 text-sm text-ink-2">Cash from offsets 1000 / 1010 / 1050. Native sign on those accounts.</p>
          <table className="ledger-table w-full">
            <thead>
              <tr>
                <th>Month</th>
                <th>1000 Operating</th>
                <th>1010 Payroll</th>
                <th>1050 Petty</th>
                <th>Net</th>
              </tr>
            </thead>
            <tbody>
              {cashFlow(books).length === 0 ? (
                <tr>
                  <td colSpan={5}>No cash-offset rows yet.</td>
                </tr>
              ) : (
                cashFlow(books).map((c) => (
                  <tr key={c.month}>
                    <td>{c.month}</td>
                    <td>
                      <Money n={c.operatingChecking} />
                    </td>
                    <td>
                      <Money n={c.payrollChecking} />
                    </td>
                    <td>
                      <Money n={c.pettyCash} />
                    </td>
                    <td>
                      <Money n={c.netCash} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      )}

      {tab === 'WIP' && (
        <Card>
          <p className="mb-2 text-sm text-ink-2">Cost vs billed vs contract. Enter contract amounts on Setup → Jobs. Not a field budget tracker.</p>
          <table className="ledger-table w-full">
            <thead>
              <tr>
                <th>Job</th>
                <th>Contract</th>
                <th>Cost to date</th>
                <th>Billed to date</th>
                <th>Over / under bill</th>
                <th>Remaining</th>
              </tr>
            </thead>
            <tbody>
              {wip(books, asOf).map((w) => (
                <tr key={w.jobNumber}>
                  <td>
                    {w.jobName} {w.jobNumber}
                  </td>
                  <td>
                    <Money n={w.contract} />
                  </td>
                  <td>
                    <Money n={w.costToDate} />
                  </td>
                  <td>
                    <Money n={w.billedToDate} />
                  </td>
                  <td>
                    <Money n={w.overUnderBill} />
                  </td>
                  <td>
                    <Money n={w.remainingContract} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === 'Account Summary' && (
        <Card>
          <table className="ledger-table w-full">
            <thead>
              <tr>
                <th>No.</th>
                <th>Name</th>
                <th>Type</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              {trialBalances(books)
                .filter((a) => Math.abs(a.amount) > 0.005)
                .map((a) => (
                  <tr key={a.number}>
                    <td>{a.number}</td>
                    <td>{a.name}</td>
                    <td>{a.type}</td>
                    <td>
                      <Money n={a.amount} />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === 'Equipment Memo' && (
        <Card>
          <p className="mb-2 text-sm text-ink-2">
            Internal hours × rate + fuel @ $4.45/gal. MEMO only — not a second expense. 21.7 working days/month is the
            rate basis. Do not also post these dollars on Transactions unless a real vendor invoice exists.
          </p>
          <table className="ledger-table w-full">
            <thead>
              <tr>
                <th>Date</th>
                <th>Job</th>
                <th>Unit</th>
                <th>Hours</th>
                <th>Internal</th>
                <th>Fuel</th>
                <th>Memo total</th>
              </tr>
            </thead>
            <tbody>
              {equipmentMemos(books).map((e) => (
                <tr key={e.id}>
                  <td>{e.date}</td>
                  <td>{e.jobName}</td>
                  <td>
                    {e.unitNumber} {e.equipmentName}
                  </td>
                  <td>{e.hours}</td>
                  <td>
                    <Money n={e.internalCharge} />
                  </td>
                  <td>
                    <Money n={e.fuelCost} />
                  </td>
                  <td>
                    <Money n={e.totalMemo} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}

function Balance({ asOf }: { asOf: string }) {
  const { books } = useBooks()
  const bs = balanceSheet(books, asOf)
  return (
    <Card>
      <p className="mb-2 text-sm text-ink-2">
        Needs opening balances (Setup). Native trial should net to ~0 because every row is allocation + opposite offset.
        {bs.balanced ? ' In balance.' : ` Off by ${formatNative(bs.difference)} — check openings.`}
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <h3 className="font-semibold">Assets</h3>
          {bs.assets.filter((a) => Math.abs(a.amount) > 0.005).map((a) => (
            <div key={a.number} className="flex justify-between text-sm">
              <span>
                {a.number} {a.name}
              </span>
              <Money n={a.amount} />
            </div>
          ))}
          <div className="mt-2 flex justify-between font-semibold">
            <span>Total</span>
            <Money n={bs.totalAssets} />
          </div>
        </div>
        <div>
          <h3 className="font-semibold">Liabilities</h3>
          {bs.liabilities.filter((a) => Math.abs(a.amount) > 0.005).map((a) => (
            <div key={a.number} className="flex justify-between text-sm">
              <span>
                {a.number} {a.name}
              </span>
              <Money n={a.amount} />
            </div>
          ))}
          <div className="mt-2 flex justify-between font-semibold">
            <span>Total</span>
            <Money n={bs.totalLiabilities} />
          </div>
        </div>
        <div>
          <h3 className="font-semibold">Equity</h3>
          {bs.equity.filter((a) => Math.abs(a.amount) > 0.005).map((a) => (
            <div key={a.number} className="flex justify-between text-sm">
              <span>
                {a.number} {a.name}
              </span>
              <Money n={a.amount} />
            </div>
          ))}
          <div className="flex justify-between text-sm">
            <span>Current P&amp;L (native)</span>
            <Money n={bs.retainedFromPL} />
          </div>
          <div className="mt-2 flex justify-between font-semibold">
            <span>Total</span>
            <Money n={bs.totalEquity} />
          </div>
        </div>
      </div>
    </Card>
  )
}
