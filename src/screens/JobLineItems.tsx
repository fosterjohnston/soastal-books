'use client'

import { findLineItemMap, newId, sovContractValue } from '../engine'
import { useBooks } from '../store/BooksContext'
import { Button, Card, Select } from '../components/ui'
import { Money } from '../components/Money'
import { SheetTitle } from '../components/Sheet'
import { useMemo, useState } from 'react'

export function JobLineItems() {
  const { books, setBooks } = useBooks()
  const [jobFilter, setJobFilter] = useState('')

  const rows = useMemo(() => {
    const list = jobFilter ? books.jobLineItems.filter((s) => s.jobName === jobFilter) : books.jobLineItems
    const seq = new Map<string, number>()
    return list.map((s) => {
      const n = (seq.get(s.jobName) ?? 0) + 1
      seq.set(s.jobName, n)
      const map = findLineItemMap(books, s.description) || findLineItemMap(books, s.activity)
      return {
        ...s,
        seq: n,
        contractValue: sovContractValue(s.bidQuantity, s.unitPrice),
        mapped: map ? 'Yes' : 'ADD TO MAP',
      }
    })
  }, [books, jobFilter])

  function patch(id: string, next: Partial<(typeof books.jobLineItems)[number]>) {
    setBooks({ ...books, jobLineItems: books.jobLineItems.map((s) => (s.id === id ? { ...s, ...next } : s)) })
  }

  function addRow() {
    const jobName = jobFilter || books.jobs.find((j) => j.slot === 1)?.jobName || 'Fern Hill'
    setBooks({
      ...books,
      jobLineItems: [
        ...books.jobLineItems,
        {
          id: newId('sov'),
          jobName,
          itemNumber: String(books.jobLineItems.filter((s) => s.jobName === jobName).length + 1),
          description: 'New item',
          unit: 'LS',
          bidQuantity: 1,
          unitPrice: 0,
          estimatedCost: 0,
          activity: 'New item',
        },
      ],
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <SheetTitle
        title="Job Line Items"
        blurb="One row per line item per job — this is the schedule of values. Paste a bid schedule here. Line items are not chart of accounts. The Line Item Map on Setup points each name to Labor / Equipment / Materials. Job name fill-down: leave it blank on later rows of the same job in Excel; here pick the job on each row."
        action={<Button onClick={addRow}>Add line item</Button>}
      />
      <div className="flex flex-wrap gap-2">
        <Select value={jobFilter} onChange={(e) => setJobFilter(e.target.value)}>
          <option value="">All jobs</option>
          {books.jobs.filter((j) => j.slot !== 30).map((j) => (
            <option key={j.id} value={j.jobName}>
              {j.jobName}
            </option>
          ))}
        </Select>
      </div>
      <Card>
        {rows.length === 0 ? (
          <p className="text-sm text-ink-2">No schedule of values yet for this job.</p>
        ) : (
          <div className="overflow-x-auto" style={{ maxHeight: 640 }}>
            <table className="ledger-table w-full">
              <thead>
                <tr>
                  <th>Job</th>
                  <th>Line item</th>
                  <th>Unit</th>
                  <th>Quantity</th>
                  <th>Unit price</th>
                  <th>Contract value</th>
                  <th>Est. cost</th>
                  <th>Seq</th>
                  <th>Mapped?</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <select className="border-0 bg-transparent" value={s.jobName} onChange={(e) => patch(s.id, { jobName: e.target.value })}>
                        {books.jobs.map((j) => (
                          <option key={j.id}>{j.jobName}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        className="min-w-[180px] border-0 bg-transparent"
                        value={s.description}
                        onChange={(e) => patch(s.id, { description: e.target.value, activity: e.target.value })}
                      />
                    </td>
                    <td>
                      <input className="w-16 border-0 bg-transparent" value={s.unit} onChange={(e) => patch(s.id, { unit: e.target.value })} />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="w-20 border-0 bg-transparent"
                        value={s.bidQuantity}
                        onChange={(e) => patch(s.id, { bidQuantity: Number(e.target.value) })}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="w-24 border-0 bg-transparent"
                        value={s.unitPrice}
                        onChange={(e) => patch(s.id, { unitPrice: Number(e.target.value) })}
                      />
                    </td>
                    <td className="formula-cell">
                      <Money n={s.contractValue} />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="w-24 border-0 bg-transparent"
                        value={s.estimatedCost}
                        onChange={(e) => patch(s.id, { estimatedCost: Number(e.target.value) })}
                      />
                    </td>
                    <td className="formula-cell">{s.seq}</td>
                    <td className={s.mapped === 'Yes' ? 'formula-cell' : 'diff-bad'}>{s.mapped}</td>
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
