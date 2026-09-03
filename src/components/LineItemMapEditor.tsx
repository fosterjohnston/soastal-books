'use client'

import { LINE_ITEM_CATEGORY_LIST } from '../engine/lists'
import { emptyLineItemMapRow, patchLineItemMap, uniqueMapCategories } from '../engine/masters'
import { useBooks } from '../store/BooksContext'
import { Button, Card } from './ui'

function accountLabel(number: string, name: string): string {
  return `${number} - ${name}`
}

export function AccountPick({
  value,
  onChange,
}: {
  value: string
  onChange: (next: string) => void
}) {
  const { books } = useBooks()
  const matched = books.chartOfAccounts.find(
    (a) => value === accountLabel(a.number, a.name) || value === a.number || value.startsWith(`${a.number} `),
  )
  const selected = matched ? accountLabel(matched.number, matched.name) : value
  return (
    <select className="max-w-[240px] border-0 bg-transparent" value={selected} onChange={(e) => onChange(e.target.value)}>
      <option value=""></option>
      {books.chartOfAccounts.map((a) => (
        <option key={a.number} value={accountLabel(a.number, a.name)}>
          {accountLabel(a.number, a.name)}
        </option>
      ))}
      {value && !matched ? <option value={value}>{value}</option> : null}
    </select>
  )
}

export function LineItemMapEditor({
  title = 'Line Item Map',
  blurb = 'This is the cost-code / crosscode map. Each line-item name points to Labor / Equipment / Materials accounts. Suggested Account on Transactions looks this up.',
}: {
  title?: string
  blurb?: string
}) {
  const { books, setBooks } = useBooks()
  const categories = uniqueMapCategories(books, LINE_ITEM_CATEGORY_LIST)

  function addRow(activity = 'New line item') {
    setBooks({ ...books, lineItemMap: [...books.lineItemMap, emptyLineItemMapRow(activity)] })
  }

  return (
    <Card
      title={title}
      action={
        <Button variant="ghost" onClick={() => addRow()}>
          Add to map
        </Button>
      }
    >
      <p className="mb-2 text-sm text-ink-2">{blurb}</p>
      {books.lineItemMap.length === 0 ? (
        <p className="text-sm text-ink-2">No cost codes on the map yet. Add a line item name and the three accounts.</p>
      ) : (
        <div className="overflow-x-auto" style={{ maxHeight: 420 }}>
          <table className="ledger-table w-full">
            <thead>
              <tr>
                <th>Line item</th>
                <th>COA category</th>
                <th>Labor acct</th>
                <th>Equipment acct</th>
                <th>Materials acct</th>
              </tr>
            </thead>
            <tbody>
              {books.lineItemMap.map((m) => (
                <tr key={m.id}>
                  <td>
                    <input
                      className="min-w-[160px] border-0 bg-transparent"
                      value={m.activity}
                      onChange={(e) => setBooks(patchLineItemMap(books, m.id, { activity: e.target.value }))}
                    />
                  </td>
                  <td>
                    <select
                      className="border-0 bg-transparent"
                      value={m.category}
                      onChange={(e) => setBooks(patchLineItemMap(books, m.id, { category: e.target.value }))}
                    >
                      {categories.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                      {m.category && !categories.includes(m.category) ? <option>{m.category}</option> : null}
                    </select>
                  </td>
                  <td>
                    <AccountPick
                      value={m.laborAccount}
                      onChange={(laborAccount) => setBooks(patchLineItemMap(books, m.id, { laborAccount }))}
                    />
                  </td>
                  <td>
                    <AccountPick
                      value={m.equipmentAccount}
                      onChange={(equipmentAccount) => setBooks(patchLineItemMap(books, m.id, { equipmentAccount }))}
                    />
                  </td>
                  <td>
                    <AccountPick
                      value={m.materialsAccount}
                      onChange={(materialsAccount) => setBooks(patchLineItemMap(books, m.id, { materialsAccount }))}
                    />
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
