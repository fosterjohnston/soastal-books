'use client'

import { useState } from 'react'
import {
  accountSummary,
  accountantHandoff,
  apAging,
  arAging,
  balanceSheetMonthly,
  cashFlowStatement,
  coaReport,
  computeEquipmentAllocations,
  jobCostByAccount,
  jobCostByLineItem,
  jobCosting,
  monthColumns,
  pnlGrid,
  summarizeAging,
  wip,
} from '@/engine'
import { MONTH_END_STATUS_LIST } from '@/engine/lists'
import { WALKTHROUGH } from '@/seed'
import { useBooks } from '@/store/BooksContext'
import { Card, Field, Input, Select } from '@/components/ui'
import { Money } from '@/components/Money'
import { EmptyNote } from '@/components/Sheet'
import { Aging } from '@/screens/Aging'
import { EquipmentAllocationSheet } from '@/screens/reports/EquipmentAllocation'
import type { ReportId } from '@/engine/lists'
import { formatNative } from '@/lib/utils'

function YearJobFilters({
  year,
  setYear,
  jobName,
  setJobName,
  showJob,
}: {
  year: string
  setYear: (v: string) => void
  jobName?: string
  setJobName?: (v: string) => void
  showJob?: boolean
}) {
  const { books } = useBooks()
  return (
    <div className="flex flex-wrap gap-3">
      <Field label="Year starting">
        <Input type="date" value={year} onChange={(e) => setYear(e.target.value)} />
      </Field>
      {showJob && setJobName ? (
        <Field label="Job">
          <Select value={jobName} onChange={(e) => setJobName(e.target.value)}>
            {books.jobs.map((j) => (
              <option key={j.id}>{j.jobName}</option>
            ))}
          </Select>
        </Field>
      ) : null}
    </div>
  )
}

function MonthHead({ year }: { year: string }) {
  const cols = monthColumns(year)
  return (
    <>
      {cols.map((c) => (
        <th key={c.key}>{c.key}</th>
      ))}
      <th>Total</th>
    </>
  )
}

export function ReportBody({ report }: { report: ReportId }) {
  const { books, setBooks } = useBooks()
  const [year, setYear] = useState('2026-01-01')
  const [jobName, setJobName] = useState(books.jobs.find((j) => j.slot === 1)?.jobName || 'Fern Hill')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  if (report === 'equipment-allocation') {
    return <EquipmentAllocationSheet />
  }

  if (report === 'job-costing') {
    const costing = jobCosting(books, to || undefined).find((j) => j.jobName === jobName)
    const lines = jobCostByLineItem(books, jobName, from || undefined, to || undefined)
    const field = computeEquipmentAllocations(books)
      .filter((r) => r.jobName === jobName)
      .reduce((s, r) => s + r.totalMemo, 0)
    const revenueDisplay = costing ? Math.max(0, -costing.billed) : 0
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-3">
          <Field label="Job">
            <Select value={jobName} onChange={(e) => setJobName(e.target.value)}>
              {books.jobs.map((j) => (
                <option key={j.id}>{j.jobName}</option>
              ))}
            </Select>
          </Field>
          <Field label="Start date">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="End date">
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Card title="Revenue entered">
            <Money n={revenueDisplay} />
            <p className="mt-1 text-xs text-ink-2">Entered as negative, shown positive.</p>
          </Card>
          <Card title="Accounting job costs">
            <Money n={costing?.totalCost ?? 0} />
          </Card>
          <Card title="Accounting gross profit">
            <Money n={revenueDisplay - (costing?.totalCost ?? 0)} />
          </Card>
          <Card title="Field equipment (memo)">
            <Money n={field} />
            <p className="mt-1 text-xs text-ink-2">Not a second expense.</p>
          </Card>
        </div>
        <Card title="By line item">
          {lines.length === 0 ? (
            <EmptyNote>No posted costs for this job in the date range.</EmptyNote>
          ) : (
            <div className="overflow-x-auto">
              <table className="ledger-table w-full">
                <thead>
                  <tr>
                    <th>Line item</th>
                    <th>Labor</th>
                    <th>Equipment</th>
                    <th>Materials</th>
                    <th>Other</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((r) => (
                    <tr key={r.lineItem}>
                      <td>{r.lineItem}</td>
                      <td><Money n={r.labor} /></td>
                      <td><Money n={r.equipment} /></td>
                      <td><Money n={r.materials} /></td>
                      <td><Money n={r.other} /></td>
                      <td><Money n={r.total} /></td>
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

  if (report === 'job-cost-by-account') {
    const rows = jobCostByAccount(books, jobName)
    const costing = jobCosting(books).find((j) => j.jobName === jobName)
    const revenueDisplay = costing ? Math.max(0, -costing.billed) : 0
    return (
      <div className="flex flex-col gap-4">
        <Field label="Job">
          <Select value={jobName} onChange={(e) => setJobName(e.target.value)}>
            {books.jobs.map((j) => (
              <option key={j.id}>{j.jobName}</option>
            ))}
          </Select>
        </Field>
        <p className="text-sm text-ink-2">
          Revenue {formatNative(revenueDisplay)} · costs {formatNative(costing?.totalCost ?? 0)} · gross {formatNative(revenueDisplay - (costing?.totalCost ?? 0))}
        </p>
        <Card>
          {rows.length === 0 ? (
            <EmptyNote>No job-cost postings for {jobName}.</EmptyNote>
          ) : (
            <table className="ledger-table w-full">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Name</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={`${r.jobName}-${r.account}`}>
                    <td>{r.account}</td>
                    <td>{r.accountName}</td>
                    <td><Money n={r.amount} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    )
  }

  if (report === 'pnl-monthly' || report === 'pnl-by-job') {
    const grid = pnlGrid(books, year, report === 'pnl-by-job' ? jobName : undefined)
    return (
      <div className="flex flex-col gap-4">
        <YearJobFilters year={year} setYear={setYear} jobName={jobName} setJobName={setJobName} showJob={report === 'pnl-by-job'} />
        <p className="text-sm text-ink-2">Revenue lines are shown as positive (the opposite of native money-in). Costs stay money-out positive. Net income = revenue − costs.</p>
        <Card>
          <div className="overflow-x-auto">
            <table className="ledger-table w-full">
              <thead>
                <tr>
                  <th>Account</th>
                  <MonthHead year={year} />
                </tr>
              </thead>
              <tbody>
                {grid.map((r, i) => (
                  <tr key={`${r.label}-${i}`}>
                    <td className={r.kind === 'header' ? 'font-semibold' : r.kind === 'total' ? 'font-semibold' : ''}>
                      {r.number ? `${r.number} ` : ''}
                      {r.label}
                    </td>
                    {r.months.map((n, idx) => (
                      <td key={idx} className={r.kind === 'header' ? '' : 'formula-cell'}>
                        {r.kind === 'header' ? '' : <Money n={n} />}
                      </td>
                    ))}
                    <td className="formula-cell">{r.kind === 'header' ? '' : <Money n={r.total} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    )
  }

  if (report === 'balance-sheet') {
    const grid = balanceSheetMonthly(books, year)
    const cols = monthColumns(year)
    return (
      <div className="flex flex-col gap-4">
        <YearJobFilters year={year} setYear={setYear} />
        <p className="text-sm text-ink-2">Opening balances plus every posted allocation (+) and offset (−) through month-end. Native sign.</p>
        <Card>
          <div className="overflow-x-auto">
            <table className="ledger-table w-full">
              <thead>
                <tr>
                  <th>Account</th>
                  {cols.map((c) => (
                    <th key={c.key}>{c.to}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grid.map((r, i) => (
                  <tr key={`${r.label}-${i}`}>
                    <td className={r.kind !== 'account' ? 'font-semibold' : ''}>
                      {r.number ? `${r.number} ` : ''}
                      {r.label}
                    </td>
                    {r.months.map((n, idx) => (
                      <td key={idx} className={r.kind === 'header' ? '' : 'formula-cell'}>
                        {r.kind === 'header' ? '' : <Money n={n} />}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    )
  }

  if (report === 'cash-flow') {
    const rows = cashFlowStatement(books, year)
    return (
      <div className="flex flex-col gap-4">
        <YearJobFilters year={year} setYear={setYear} />
        <p className="text-sm text-ink-2">Cash movement from accounts 1000 / 1010 / 1050 (final and offset). Paid lines are native cash hits (money out is negative cash).</p>
        <Card>
          <div className="overflow-x-auto">
            <table className="ledger-table w-full">
              <thead>
                <tr>
                  <th>Cash movement</th>
                  {rows.map((r) => (
                    <th key={r.month}>{r.month}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    ['Cash at start of month', 'start'],
                    ['Cash received from revenue', 'receivedRevenue'],
                    ['Cash paid — labor', 'paidLabor'],
                    ['Cash paid — materials', 'paidMaterials'],
                    ['Cash paid — subcontractors', 'paidSub'],
                    ['Cash paid — equipment', 'paidEquipment'],
                    ['Cash paid — overhead', 'paidOverhead'],
                    ['Other cash', 'other'],
                    ['Net cash movement', 'net'],
                    ['Cash at end of month', 'end'],
                  ] as const
                ).map(([label, key]) => (
                  <tr key={key}>
                    <td>{label}</td>
                    {rows.map((r) => (
                      <td key={r.month} className="formula-cell">
                        <Money n={r[key]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    )
  }

  if (report === 'wip-schedule') {
    const rows = wip(books, to || new Date().toISOString().slice(0, 10))
    return (
      <div className="flex flex-col gap-4">
        <Field label="As of">
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
        <Card>
          {rows.length === 0 ? (
            <EmptyNote>No jobs to schedule.</EmptyNote>
          ) : (
            <div className="overflow-x-auto">
              <table className="ledger-table w-full">
                <thead>
                  <tr>
                    <th>Job</th>
                    <th>Contract</th>
                    <th>Est. cost</th>
                    <th>Cost to date</th>
                    <th>Billed to date</th>
                    <th>Over billed</th>
                    <th>Under billed</th>
                    <th>Est. GP</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const earnedish = r.costToDate
                    const over = Math.max(0, r.billedToDate - earnedish)
                    const under = Math.max(0, earnedish - r.billedToDate)
                    return (
                      <tr key={r.jobNumber}>
                        <td>{r.jobName}</td>
                        <td><Money n={r.contract} /></td>
                        <td><Money n={r.estimatedCost} /></td>
                        <td><Money n={r.costToDate} /></td>
                        <td><Money n={r.billedToDate} /></td>
                        <td><Money n={over} /></td>
                        <td><Money n={under} /></td>
                        <td><Money n={r.estimatedGross} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    )
  }

  if (report === 'ap-aging') {
    const asOf = to || new Date().toISOString().slice(0, 10)
    const detail = apAging(books, asOf)
    const summary = summarizeAging(detail, 'vendor')
    return (
      <div className="flex flex-col gap-4">
        <Aging mode="ap" />
        <Card title="By vendor (workbook layout)">
          {summary.length === 0 ? (
            <EmptyNote>No open AP.</EmptyNote>
          ) : (
            <div className="overflow-x-auto">
              <table className="ledger-table w-full">
                <thead>
                  <tr>
                    <th>Vendor</th>
                    <th>Not yet due</th>
                    <th>1–30</th>
                    <th>31–60</th>
                    <th>61–90</th>
                    <th>Over 90</th>
                    <th>No due date</th>
                    <th>Total open</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.map((r) => (
                    <tr key={r.party}>
                      <td>{r.party}</td>
                      <td><Money n={r.notDue} /></td>
                      <td><Money n={r.d1} /></td>
                      <td><Money n={r.d31} /></td>
                      <td><Money n={r.d61} /></td>
                      <td><Money n={r.d91} /></td>
                      <td><Money n={r.noDue} /></td>
                      <td><Money n={r.total} /></td>
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

  if (report === 'ar-aging') {
    const asOf = to || new Date().toISOString().slice(0, 10)
    const detail = arAging(books, asOf)
    const summary = summarizeAging(detail, 'job')
    return (
      <div className="flex flex-col gap-4">
        <Aging mode="ar" />
        <Card title="By job (workbook layout)">
          {summary.length === 0 ? (
            <EmptyNote>No open AR.</EmptyNote>
          ) : (
            <div className="overflow-x-auto">
              <table className="ledger-table w-full">
                <thead>
                  <tr>
                    <th>Job</th>
                    <th>Not yet due</th>
                    <th>1–30</th>
                    <th>31–60</th>
                    <th>61–90</th>
                    <th>Over 90</th>
                    <th>No due date</th>
                    <th>Total open</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.map((r) => (
                    <tr key={r.party}>
                      <td>{r.party}</td>
                      <td><Money n={r.notDue} /></td>
                      <td><Money n={r.d1} /></td>
                      <td><Money n={r.d31} /></td>
                      <td><Money n={r.d61} /></td>
                      <td><Money n={r.d91} /></td>
                      <td><Money n={r.noDue} /></td>
                      <td><Money n={r.total} /></td>
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

  if (report === 'account-summary') {
    const rows = accountSummary(books, from || undefined, to || undefined)
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-3">
          <Field label="Start date"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="End date"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        </div>
        <Card>
          <div className="overflow-x-auto" style={{ maxHeight: 640 }}>
            <table className="ledger-table w-full">
              <thead>
                <tr>
                  <th>Account #</th>
                  <th>Account name</th>
                  <th>Category</th>
                  <th>Money out</th>
                  <th>Money in</th>
                  <th>Net activity</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {rows.filter((r) => r.count || r.net).map((r) => (
                  <tr key={r.number}>
                    <td>{r.number}</td>
                    <td>{r.name}</td>
                    <td>{r.category}</td>
                    <td><Money n={r.moneyOut} /></td>
                    <td><Money n={r.moneyIn} /></td>
                    <td><Money n={r.net} /></td>
                    <td>{r.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    )
  }

  if (report === 'coa-report') {
    const rows = coaReport(books, from || undefined, to || undefined)
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-3">
          <Field label="Start date"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="End date"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        </div>
        <Card>
          <div className="overflow-x-auto" style={{ maxHeight: 640 }}>
            <table className="ledger-table w-full">
              <thead>
                <tr>
                  <th>Account #</th>
                  <th>Account name</th>
                  <th>Net amount</th>
                  <th>% of category</th>
                  <th>Transactions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={`${r.name}-${i}`}>
                    <td>{r.number}</td>
                    <td className={r.kind !== 'account' ? 'font-semibold' : ''}>{r.name}</td>
                    <td className="formula-cell">{r.kind === 'header' ? '' : <Money n={r.net} />}</td>
                    <td className="formula-cell">{r.kind === 'account' ? `${(r.pct * 100).toFixed(0)}%` : ''}</td>
                    <td>{r.kind === 'account' ? r.count : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    )
  }

  if (report === 'accountant-handoff') {
    const h = accountantHandoff(books)
    return (
      <div className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Card title="Transaction allocations"><Money n={h.totalAllocations} /></Card>
          <Card title="Unallocated difference"><Money n={h.unallocatedDifference} /></Card>
          <Card title="Field equipment memo"><Money n={h.fieldEquipment} /></Card>
          <Card title="Missing approval">{h.missingApproval}</Card>
          <Card title="On hold">{h.onHold}</Card>
        </div>
        <p className="text-sm text-ink-2">Field equipment allocation is a memo. Do not add it to transactions without a reclassification entry.</p>
        <Card title="By job">
          <div className="overflow-x-auto">
            <table className="ledger-table w-full">
              <thead>
                <tr>
                  <th>Job</th>
                  <th>Allocations</th>
                  <th>Labor</th>
                  <th>Equipment txns</th>
                  <th>Materials</th>
                  <th>Sub</th>
                  <th>Overhead / other</th>
                  <th>Field memo</th>
                </tr>
              </thead>
              <tbody>
                {h.byJob.map((r) => (
                  <tr key={r.jobName}>
                    <td>{r.jobName}</td>
                    <td><Money n={r.allocations} /></td>
                    <td><Money n={r.labor} /></td>
                    <td><Money n={r.equipment} /></td>
                    <td><Money n={r.materials} /></td>
                    <td><Money n={r.subcontractor} /></td>
                    <td><Money n={r.overhead} /></td>
                    <td><Money n={r.fieldMemo} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    )
  }

  if (report === 'month-end') {
    return (
      <Card title="Month-end accountant handoff checklist">
        <div className="overflow-x-auto">
          <table className="ledger-table w-full">
            <thead>
              <tr>
                <th>#</th>
                <th>Required item</th>
                <th>Status</th>
                <th>Completed by</th>
                <th>Date</th>
                <th>File / location</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {books.monthEndChecklist.map((item) => (
                <tr key={item.id}>
                  <td>{item.number}</td>
                  <td className="!whitespace-normal max-w-sm">{item.title}</td>
                  <td>
                    <select
                      className="border-0 bg-transparent"
                      value={item.status}
                      onChange={(e) =>
                        setBooks({
                          ...books,
                          monthEndChecklist: books.monthEndChecklist.map((x) => (x.id === item.id ? { ...x, status: e.target.value } : x)),
                        })
                      }
                    >
                      {MONTH_END_STATUS_LIST.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      className="w-28 border-0 bg-transparent"
                      value={item.completedBy}
                      onChange={(e) =>
                        setBooks({
                          ...books,
                          monthEndChecklist: books.monthEndChecklist.map((x) => (x.id === item.id ? { ...x, completedBy: e.target.value } : x)),
                        })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="date"
                      className="border-0 bg-transparent"
                      value={item.dateCompleted}
                      onChange={(e) =>
                        setBooks({
                          ...books,
                          monthEndChecklist: books.monthEndChecklist.map((x) => (x.id === item.id ? { ...x, dateCompleted: e.target.value } : x)),
                        })
                      }
                    />
                  </td>
                  <td>
                    <input
                      className="w-36 border-0 bg-transparent"
                      value={item.fileLocation}
                      onChange={(e) =>
                        setBooks({
                          ...books,
                          monthEndChecklist: books.monthEndChecklist.map((x) => (x.id === item.id ? { ...x, fileLocation: e.target.value } : x)),
                        })
                      }
                    />
                  </td>
                  <td>
                    <input
                      className="min-w-[160px] border-0 bg-transparent"
                      value={item.notes}
                      onChange={(e) =>
                        setBooks({
                          ...books,
                          monthEndChecklist: books.monthEndChecklist.map((x) => (x.id === item.id ? { ...x, notes: e.target.value } : x)),
                        })
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    )
  }

  if (report === 'walkthrough') {
    return (
      <div className="flex flex-col gap-4">
        {WALKTHROUGH.map((block, i) => {
          const isHead = /^\d+\./.test(block.heading) || block.heading === block.heading.toUpperCase()
          if (isHead && block.heading && !block.body) {
            return (
              <h2 key={i} className="font-serif text-xl">
                {block.heading}
              </h2>
            )
          }
          return (
            <Card key={i} title={block.heading || undefined}>
              <p className="text-sm leading-relaxed text-ink-2">{block.body || block.heading}</p>
            </Card>
          )
        })}
      </div>
    )
  }

  if (report === 'chart-of-accounts') {
    return (
      <Card title="Chart of accounts reference">
        <p className="mb-3 text-sm text-ink-2">Job-cost accounts 5000–5290 are organized by activity (earthwork, sewer, water), not by job name. Fern Hill is a job, not an account.</p>
        <div className="overflow-x-auto" style={{ maxHeight: 640 }}>
          <table className="ledger-table w-full">
            <thead>
              <tr>
                <th>Account #</th>
                <th>Account name</th>
                <th>Category</th>
                <th>Used for</th>
                <th>Active?</th>
              </tr>
            </thead>
            <tbody>
              {books.chartOfAccounts.map((a) => (
                <tr key={a.number}>
                  <td>{a.number}</td>
                  <td>{a.name}</td>
                  <td>{a.category}</td>
                  <td>{a.description}</td>
                  <td>{a.active ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    )
  }

  return <EmptyNote>Unknown report.</EmptyNote>
}
