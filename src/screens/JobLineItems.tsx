'use client'

import { addLineItemToMap, findLineItemMap, mergeJobLineItems, newId, parseBidScheduleFile, sovContractValue } from '../engine'
import { useBooks } from '../store/BooksContext'
import { Button, Card, Field, Select } from '../components/ui'
import { Money } from '../components/Money'
import { SheetTitle } from '../components/Sheet'
import { useMemo, useRef, useState } from 'react'

export function JobLineItems() {
  const { books, setBooks } = useBooks()
  const activeJobs = books.jobs.filter((j) => j.slot !== 30 && j.jobName)
  const [jobFilter, setJobFilter] = useState(activeJobs[0]?.jobName || '')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const targetJob = jobFilter || activeJobs[0]?.jobName || ''

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
    setBooks((prev) => ({
      ...prev,
      jobLineItems: prev.jobLineItems.map((s) => (s.id === id ? { ...s, ...next } : s)),
    }))
  }

  function addRow() {
    const jobName = targetJob || 'Fern Hill'
    setBooks((prev) => ({
      ...prev,
      jobLineItems: [
        ...prev.jobLineItems,
        {
          id: newId('sov'),
          jobName,
          itemNumber: String(prev.jobLineItems.filter((s) => s.jobName === jobName).length + 1),
          description: 'New item',
          unit: 'LS',
          bidQuantity: 1,
          unitPrice: 0,
          estimatedCost: 0,
          activity: 'New item',
        },
      ],
    }))
    setStatus(`Added one blank line item on ${jobName}. To add a whole bid at once, upload the Excel below.`)
    setError('')
  }

  async function onUpload(file: File) {
    if (!targetJob) {
      setError('Pick the job first, then upload the bid Excel.')
      return
    }
    setBusy(true)
    setError('')
    setStatus('')
    try {
      const parsed = await parseBidScheduleFile(file, {
        defaultJobName: targetJob,
        forceJobName: targetJob,
        knownJobNames: books.jobs.map((j) => j.jobName),
      })
      let added = 0
      let skipped = 0
      setBooks((prev) => {
        const merged = mergeJobLineItems(prev.jobLineItems, parsed.rows)
        added = merged.added
        skipped = merged.skippedDuplicates
        return { ...prev, jobLineItems: merged.next }
      })
      const bits = [`Added ${added} line item${added === 1 ? '' : 's'} to ${targetJob} from ${file.name}`]
      if (parsed.sheetName && parsed.sheetName !== 'csv') bits.push(`(sheet “${parsed.sheetName}”)`)
      if (skipped) bits.push(`skipped ${skipped} already on that job`)
      setStatus(`${bits.join(' — ')}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  function takeFile(file: File | undefined) {
    if (!file) return
    void onUpload(file)
  }

  return (
    <div className="flex flex-col gap-4">
      <SheetTitle
        title="Job Line Items"
        blurb="Schedule of values — one row per line item on a job. Pick the job, then upload the whole bid Excel. Every row in the file is added to that job. You do not type them one by one. Line items are not chart of accounts. The Line Item Map on Setup is the cost-code / crosscode map."
        action={<Button variant="ghost" onClick={addRow}>Add one line item</Button>}
      />

      <Card title="Upload a bid Excel for this job">
        <p className="mb-3 text-sm text-ink-2">
          Use a sheet with columns like Line item (or Description / Cost code), Unit, Qty, and Unit price. A Job column
          is optional — everything goes on the job you pick here. CSV works too. Keith’s live workbook is refused.
        </p>
        <div className="mb-3 max-w-md">
          <Field label="Job">
            <Select value={jobFilter} onChange={(e) => setJobFilter(e.target.value)}>
              <option value="">All jobs — pick one to upload</option>
              {activeJobs.map((j) => (
                <option key={j.id} value={j.jobName}>
                  {j.jobName}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv,.tsv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            takeFile(f)
          }}
        />
        <div
          onDragEnter={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            takeFile(e.dataTransfer.files?.[0])
          }}
          className={`flex min-h-36 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center ${
            dragOver ? 'border-teal bg-teal/5' : 'border-line bg-paper'
          } ${busy || !targetJob ? 'opacity-60' : ''}`}
        >
          <p className="font-serif text-xl text-ink">
            {busy ? 'Reading the bid…' : targetJob ? `Drop the ${targetJob} bid here` : 'Pick a job first'}
          </p>
          <p className="text-sm text-ink-2">
            {targetJob
              ? 'Excel or CSV — all line items are added to this job at once.'
              : 'Choose the job above, then upload.'}
          </p>
          <Button disabled={busy || !targetJob} onClick={() => fileRef.current?.click()}>
            {busy ? 'Reading Excel…' : 'Choose Excel or CSV'}
          </Button>
        </div>
        {status ? <p className="mt-3 text-sm text-teal">{status}</p> : null}
        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      </Card>

      <Card title={jobFilter ? `Line items on ${jobFilter}` : 'All job line items'}>
        {rows.length === 0 ? (
          <p className="text-sm text-ink-2">
            No schedule of values yet{jobFilter ? ` for ${jobFilter}` : ''}. Upload the bid Excel above.
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
                            setBooks((prev) => addLineItemToMap(prev, s.description || s.activity))
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
