import { MONTH_END_CHECKLIST, newId } from '../engine'
import { useBooks } from '../store/BooksContext'
import { Button, Card, Field, Input, Textarea } from '../components/ui'
import { useState } from 'react'

export function Close() {
  const { books, setBooks, exportCopy } = useBooks()
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7))
  const [notes, setNotes] = useState('')
  const [done, setDone] = useState<Record<string, boolean>>({})

  function closePeriod() {
    setBooks({
      ...books,
      periodCloses: [
        {
          id: newId('close'),
          period,
          closedAt: new Date().toISOString(),
          closedBy: 'Foster',
          notes,
        },
        ...books.periodCloses,
      ],
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-serif text-3xl">Month-end & accountant handoff</h1>
        <p className="max-w-2xl text-sm text-ink-2">
          Soastal Books posts allocation + auto offset. The accountant still reconciles banks, accruals, depreciation,
          loan principal vs interest, retainage, and official statements. Keith keeps the live workbook; we hand him a
          copy.
        </p>
      </div>

      <Card title="Month-end checklist">
        <ul className="space-y-3">
          {MONTH_END_CHECKLIST.map((item) => (
            <li key={item.id} className="flex gap-3 rounded-lg border border-line p-3">
              <input
                type="checkbox"
                className="mt-1"
                checked={Boolean(done[item.id])}
                onChange={(e) => setDone({ ...done, [item.id]: e.target.checked })}
              />
              <div>
                <div className="font-semibold">{item.title}</div>
                <div className="text-sm text-ink-2">{item.detail}</div>
                <div className="mt-1 text-xs uppercase tracking-wide text-teal">{item.owner}</div>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Close period (office flag, not a GL lock)">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Period">
            <Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
          </Field>
          <Field label="Handoff notes for Keith / accountant">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={closePeriod}>Record close</Button>
          <Button variant="sand" onClick={() => void exportCopy()}>
            Export Excel copy for Keith
          </Button>
        </div>
        <ul className="mt-3 text-sm text-ink-2">
          {books.periodCloses.map((c) => (
            <li key={c.id}>
              {c.period} closed {c.closedAt.slice(0, 10)} — {c.notes || 'no note'}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
