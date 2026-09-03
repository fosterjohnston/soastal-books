'use client'

import { useState } from 'react'
import { addLineItemToMap, costCodesForJob } from '../engine'
import { useBooks } from '../store/BooksContext'
import { Card, Field, Select } from '../components/ui'
import { LineItemMapEditor } from '../components/LineItemMapEditor'
import { SheetTitle } from '../components/Sheet'

export function CostCodes() {
  const { books, setBooks } = useBooks()
  const jobs = books.jobs.filter((j) => j.slot !== 30 && j.jobName)
  const [jobName, setJobName] = useState(jobs[0]?.jobName || 'Fern Hill')
  const rows = costCodesForJob(books, jobName)

  return (
    <div className="flex flex-col gap-4">
      <SheetTitle
        title="Cost Codes"
        blurb="The top list is the cost codes on one job (from Job Line Items). Below it is the master Line Item Map — that is the cost-code / crosscode map. Add a missing name here or on Setup, then set Labor / Equipment / Materials."
      />
      <Field label="Job">
        <Select value={jobName} onChange={(e) => setJobName(e.target.value)}>
          {jobs.map((j) => (
            <option key={j.id}>{j.jobName}</option>
          ))}
        </Select>
      </Field>
      <Card title={`Cost codes on ${jobName}`}>
        {rows.length === 0 ? (
          <p className="text-sm text-ink-2">No Job Line Items for {jobName} yet. Upload a bid Excel or add the schedule of values first.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="ledger-table w-full">
              <thead>
                <tr>
                  <th>Cost code / line item</th>
                  <th>Unit</th>
                  <th>Quantity</th>
                  <th>Labor account</th>
                  <th>Equipment account</th>
                  <th>Materials account</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.lineItem}>
                    <td>{r.lineItem}</td>
                    <td>{r.unit}</td>
                    <td>{r.quantity || '—'}</td>
                    <td className={r.mapped === 'Yes' ? 'formula-cell' : 'diff-bad'}>{r.laborAccount}</td>
                    <td className={r.mapped === 'Yes' ? 'formula-cell' : 'diff-bad'}>{r.equipmentAccount}</td>
                    <td className={r.mapped === 'Yes' ? 'formula-cell' : 'diff-bad'}>
                      {r.mapped === 'Yes' ? (
                        r.materialsAccount
                      ) : (
                        <button
                          type="button"
                          className="font-semibold text-danger underline-offset-2 hover:underline"
                          onClick={() => setBooks(addLineItemToMap(books, r.lineItem))}
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
      <LineItemMapEditor title="Master line item map (crosscode map)" />
    </div>
  )
}
