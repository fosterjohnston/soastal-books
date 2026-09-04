'use client'

import { addLineItemToMap, findLineItemMap, mergeJobLineItems, newId, parseBidScheduleFile, sovContractValue } from '../engine'
import { useBooks } from '../store/BooksContext'
import { Button, Card, Select } from '../components/ui'
import { Money } from '../components/Money'
import { SheetTitle } from '../components/Sheet'
import { useMemo, useRef, useState } from 'react'

export function JobLineItems() {
  const { books, setBooks } = useBooks()
  const [jobFilter, setJobFilter] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

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
        mapped: !!map,
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
    setStatus('Added one blank line item. Upload a bid Excel to add a whole schedule at once.')
    setError('')
  }

  async function onUpload(file: File) {
    setBusy(true)
    setError('')
    setStatus('')
    try {
      const parsed = await parseBidScheduleFile(file, {
        defaultJobName: jobFilter,
        knownJobNames: books.jobs.map((j) => j.jobName),
      })
      const merged = mergeJobLineItems(books.jobLineItems, parsed.rows)
      setBooks({ ...books, jobLineItems: merged.next })
      const bits = [`Added ${merged.added} line item${merged.added === 1 ? '' : 's'} from ${file.name}`]
      if (parsed.sheetName && parsed.sheetName !== 'csv') bits.push(`(sheet “${parsed.sheetName}”)`)
      if (merged.skippedDuplicates) bits.push(`skipped ${merged.skippedDuplicates} already on the books`)
      if (parsed.warnings.length) bits.push(parsed.warnings[0])
      setStatus(`${bits.join(' — ')}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <SheetTitle
        title="Job Line Items"
        blurb="One row per line item per job — this is the schedule of values. Upload a whole bid Excel (or CSV) to add every row at once. Job name fill-down: leave Job blank on later rows of the same job. Line items are not chart of accounts. The Line Item Map on Setup is the cost-code / crosscode map — it points each name to Labor / Equipment / Materials."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => fileRef.current?.click()} disabled={busy}>
              {busy ? 'Reading Excel…' : 'Upload bid Excel'}
            </Button>
            <Button onClick={addRow}>Add line item</Button>
          </div>
        }
      />
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.csv,.tsv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) void onUpload(f)
        }}
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
      {status ? <p className="text-sm text-teal">{status}</p> : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <Card>
        {rows.length === 0 ? (
          <p className="text-sm text-ink-2">
            No schedule of values yet{jobFilter ? ` for ${jobFilter}` : ''}. Upload a bid Excel to add every line item
            at once, or add one by hand.
          </p>
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
                        {s.jobName && !books.jobs.some((j) => j.jobName === s.jobName) ? (
                          <option value={s.jobName}>{s.jobName}</option>
                        ) : null}
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
                    <td className={s.mapped ? 'formula-cell' : 'diff-bad'}>
                      {s.mapped ? (
                        'Yes'
                      ) : (
                        <button
                          type="button"
                          className="font-semibold text-danger underline-offset-2 hover:underline"
                          onClick={() => {
                            setBooks(addLineItemToMap(books, s.description || s.activity))
                            setStatus(`Added “${s.description || s.activity}” to the Line Item Map (cost-code / crosscode map). Set the three accounts on Setup if they are not Other.`)
                            setError('')
                          }}
                        >
                          ADD TO MAP
                        </button>
                      )}
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
