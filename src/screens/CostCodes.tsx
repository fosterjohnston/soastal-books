'use client'

import { useState } from 'react'
import { costCodesForJob } from '../engine'
import { useBooks } from '../store/BooksContext'
import { Card, Field, Select } from '../components/ui'
import { SheetTitle } from '../components/Sheet'

export function CostCodes() {
  const { books } = useBooks()
  const jobs = books.jobs.filter((j) => j.slot !== 30 && j.jobName)
  const [jobName, setJobName] = useState(jobs[0]?.jobName || 'Fern Hill')
  const rows = costCodesForJob(books, jobName)
  const map = books.lineItemMap

  return (
    <div className="flex flex-col gap-4">
      <SheetTitle
        title="Cost Codes"
        blurb="Reference only — no dollars. The top list is the cost codes on one job. Below it is the master Line Item Map. Accounts autofill from Setup."
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
          <p className="text-sm text-ink-2">No Job Line Items for {jobName} yet. Add the schedule of values first.</p>
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
                    <td className="formula-cell">{r.laborAccount}</td>
                    <td className="formula-cell">{r.equipmentAccount}</td>
                    <td className="formula-cell">{r.materialsAccount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Card title="Master line item map">
        <div className="overflow-x-auto" style={{ maxHeight: 360 }}>
          <table className="ledger-table w-full">
            <thead>
              <tr>
                <th>Line item</th>
                <th>Category</th>
                <th>Labor</th>
                <th>Equipment</th>
                <th>Materials</th>
              </tr>
            </thead>
            <tbody>
              {map.map((m) => (
                <tr key={m.id}>
                  <td>{m.activity}</td>
                  <td>{m.category}</td>
                  <td className="formula-cell">{m.laborAccount}</td>
                  <td className="formula-cell">{m.equipmentAccount}</td>
                  <td className="formula-cell">{m.materialsAccount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
