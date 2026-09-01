'use client'

import { useState } from 'react'
import { jobCosting, pnlMonthly } from '../engine'
import { formatNative } from '../lib/utils'
import { useBooks } from '../store/BooksContext'
import { Card } from '../components/ui'
import { Money } from '../components/Money'
import { Aging } from './Aging'

const TABS = ['AP aging', 'P&L', 'Job cost'] as const

export function Reports() {
  const { books } = useBooks()
  const [tab, setTab] = useState<(typeof TABS)[number]>('AP aging')

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-serif text-3xl">Reports</h1>
        <p className="max-w-2xl text-sm text-ink-2">
          AP aging from open 2000, P&amp;L, and job cost from the allocation ledger. Money out +, money in −.
        </p>
      </div>
      <div className="flex flex-wrap gap-1">
        {TABS.map((t) => (
          <button
            key={t}
            className={`rounded-full px-3 py-1 text-sm ${tab === t ? 'bg-ink text-paper' : 'border border-line bg-white'}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'AP aging' ? (
        <Aging mode="ap" />
      ) : tab === 'Job cost' ? (
        <Card title="Job costing">
          <div className="overflow-x-auto">
            <table className="ledger-table w-full">
              <thead>
                <tr>
                  <th>Job name</th>
                  <th>Labor</th>
                  <th>Equipment</th>
                  <th>Materials</th>
                  <th>Sub</th>
                  <th>Overhead</th>
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
      ) : (
        <Card title="P&amp;L monthly">
          <table className="ledger-table w-full">
            <thead>
              <tr>
                <th>Month</th>
                <th>Revenue (native)</th>
                <th>Job cost</th>
                <th>Overhead</th>
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
                  <td>{formatNative(p.netIncomeDisplay)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
