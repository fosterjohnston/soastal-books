'use client'

import { computeEquipmentAllocations, newId, type EquipmentAllocation } from '@/engine'
import { useBooks } from '@/store/BooksContext'
import { Button, Card } from '@/components/ui'
import { Money } from '@/components/Money'
import { EmptyNote } from '@/components/Sheet'

export function EquipmentAllocationSheet() {
  const { books, setBooks } = useBooks()
  const rows = computeEquipmentAllocations(books)

  function add() {
    const row: EquipmentAllocation = {
      id: newId('eal'),
      startDate: new Date().toISOString().slice(0, 10),
      endDate: '',
      jobName: books.jobs.find((j) => j.slot === 1)?.jobName || 'Fern Hill',
      equipmentId: books.equipment[0]?.id || '',
      avgEngineHrsPerDay: 8,
      shareOfDay: 1,
      notes: '',
      status: '',
    }
    setBooks({ ...books, equipmentAllocations: [...books.equipmentAllocations, row] })
  }

  function patch(id: string, next: Partial<EquipmentAllocation>) {
    setBooks({
      ...books,
      equipmentAllocations: books.equipmentAllocations.map((r) => (r.id === id ? { ...r, ...next } : r)),
    })
  }

  return (
    <Card
      title="Field equipment allocation"
      action={<Button onClick={add}>Add row</Button>}
    >
      <p className="mb-3 text-sm text-ink-2">
        One row per machine per stay on a job. Days on job = working days (Mon–Fri). Daily cost = monthly rate ÷ working days. Fuel = avg engine hrs/day × days × burn × fuel price. Total is a memo — do not also post it on Transactions unless a vendor invoice exists.
      </p>
      {rows.length === 0 ? (
        <EmptyNote>No field hours entered yet.</EmptyNote>
      ) : (
        <div className="overflow-x-auto">
          <table className="ledger-table w-full">
            <thead>
              <tr>
                <th>Start</th>
                <th>End</th>
                <th>Job</th>
                <th>Avg eng hrs/day</th>
                <th>Equipment</th>
                <th>Ownership</th>
                <th>Days</th>
                <th>Share of day</th>
                <th>Monthly rate</th>
                <th>Daily cost</th>
                <th>Equip cost</th>
                <th>Burn</th>
                <th>Fuel $</th>
                <th>Fuel cost</th>
                <th>Total memo</th>
                <th>Equip acct</th>
                <th>Fuel acct</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <input type="date" className="border-0 bg-transparent" value={r.startDate} onChange={(e) => patch(r.id, { startDate: e.target.value })} />
                  </td>
                  <td>
                    <input type="date" className="border-0 bg-transparent" value={r.endDate} onChange={(e) => patch(r.id, { endDate: e.target.value })} />
                  </td>
                  <td>
                    <select className="border-0 bg-transparent" value={r.jobName} onChange={(e) => patch(r.id, { jobName: e.target.value })}>
                      {books.jobs.map((j) => (
                        <option key={j.id}>{j.jobName}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      className="w-16 border-0 bg-transparent"
                      value={r.avgEngineHrsPerDay}
                      onChange={(e) => patch(r.id, { avgEngineHrsPerDay: Number(e.target.value) })}
                    />
                  </td>
                  <td>
                    <select className="border-0 bg-transparent" value={r.equipmentId} onChange={(e) => patch(r.id, { equipmentId: e.target.value })}>
                      {books.equipment.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="formula-cell">{r.ownership || '—'}</td>
                  <td className="formula-cell">{r.daysOnJob || '—'}</td>
                  <td>
                    <input
                      type="number"
                      step="0.1"
                      className="w-16 border-0 bg-transparent"
                      value={r.shareOfDay}
                      onChange={(e) => patch(r.id, { shareOfDay: Number(e.target.value) })}
                    />
                  </td>
                  <td className="formula-cell">
                    <Money n={r.monthlyRate} />
                  </td>
                  <td className="formula-cell">
                    <Money n={r.dailyCost} />
                  </td>
                  <td className="formula-cell">
                    <Money n={r.equipmentCost} />
                  </td>
                  <td className="formula-cell">{r.burnRate || '—'}</td>
                  <td className="formula-cell">
                    <Money n={r.fuelPrice} />
                  </td>
                  <td className="formula-cell">
                    <Money n={r.fuelCost} />
                  </td>
                  <td className="formula-cell">
                    <Money n={r.totalMemo} />
                  </td>
                  <td className="formula-cell">{r.equipmentAccount}</td>
                  <td className="formula-cell">{r.fuelAccount}</td>
                  <td>
                    <input className="w-28 border-0 bg-transparent" value={r.status} onChange={(e) => patch(r.id, { status: e.target.value })} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
