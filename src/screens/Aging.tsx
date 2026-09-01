'use client'

import { apAging, arAging, sumAging } from '../engine'
import { formatDate } from '../lib/utils'
import { useBooks } from '../store/BooksContext'
import { Card, Stat } from '../components/ui'
import { Money } from '../components/Money'
import { useState } from 'react'

export function Aging({ mode = 'both' }: { mode?: 'ap' | 'ar' | 'both' }) {
  const { books } = useBooks()
  const [asOf, setAsOf] = useState(new Date().toISOString().slice(0, 10))
  const ap = apAging(books, asOf)
  const ar = arAging(books, asOf)
  const apB = sumAging(ap)
  const arB = sumAging(ar)
  const showAp = mode !== 'ar'
  const showAr = mode !== 'ap'
  const title = mode === 'ap' ? 'Bills (AP)' : mode === 'ar' ? 'Invoices (AR)' : 'AP / AR aging'
  const blurb =
    mode === 'ap'
      ? 'Open vendor bills on 2000. Accrual: the unpaid-bill wizard posts here immediately. Pay later with invoice-PMT, Job blank, Liability, override 2000.'
      : mode === 'ar'
        ? 'Open customer invoices on 1100. Billed / AR is money in (negative). A later Deposit clears AR.'
        : 'AP from open 2000. AR by job from open 1100. Bills accrue; payments and deposits are different documents.'

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl">{title}</h1>
          <p className="max-w-2xl text-sm text-ink-2">{blurb}</p>
        </div>
        <label className="text-sm font-semibold">
          As of
          <input
            type="date"
            className="ml-2 rounded-md border border-line px-2 py-1"
            value={asOf}
            onChange={(e) => setAsOf(e.target.value)}
          />
        </label>
      </div>

      {showAp ? (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="AP total" value={<Money n={apB.total} />} />
        <Stat label="AP current" value={<Money n={apB.current} />} />
        <Stat label="AP 31–60" value={<Money n={apB.d31} />} />
        <Stat label="AP 61–90" value={<Money n={apB.d61} />} />
        <Stat label="AP 91+" value={<Money n={apB.d91} />} />
      </div>
      ) : null}

      {showAp ? (
      <Card title="Accounts payable">
        {ap.length === 0 ? (
          <p className="text-sm text-ink-2">No open AP at {asOf}. Unpaid / AP bills appear here until a -PMT clears 2000.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="ledger-table w-full">
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>Invoice</th>
                  <th>Job</th>
                  <th>Due</th>
                  <th>Days</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {ap.map((r) => (
                  <tr key={`${r.vendorOrCustomer}|${r.invoiceNumber}`}>
                    <td>{r.vendorOrCustomer}</td>
                    <td>{r.invoiceNumber}</td>
                    <td>{r.jobName || '—'}</td>
                    <td>{formatDate(r.dueDate)}</td>
                    <td>{r.daysPastDue}</td>
                    <td>
                      <Money n={r.amount} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      ) : null}

      {showAr ? (
        <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="AR total" value={<Money n={arB.total} />} />
        <Stat label="AR current" value={<Money n={arB.current} />} />
        <Stat label="AR 31–60" value={<Money n={arB.d31} />} />
        <Stat label="AR 61–90" value={<Money n={arB.d61} />} />
        <Stat label="AR 91+" value={<Money n={arB.d91} />} />
      </div>

      <Card title="Accounts receivable by job">
        {ar.length === 0 ? (
          <p className="text-sm text-ink-2">No open AR. Bill with Billed / AR (negative), then a Deposit to 1100 to collect.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="ledger-table w-full">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Job</th>
                  <th>Invoice</th>
                  <th>Due</th>
                  <th>Days</th>
                  <th>Open</th>
                </tr>
              </thead>
              <tbody>
                {ar.map((r) => (
                  <tr key={`${r.vendorOrCustomer}|${r.invoiceNumber}`}>
                    <td>{r.vendorOrCustomer}</td>
                    <td>{r.jobName || '—'}</td>
                    <td>{r.invoiceNumber}</td>
                    <td>{formatDate(r.dueDate)}</td>
                    <td>{r.daysPastDue}</td>
                    <td>
                      <Money n={r.amount} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
        </>
      ) : null}
    </div>
  )
}
