'use client'

import { newId, type OpeningBalance } from '../engine'
import { useBooks } from '../store/BooksContext'
import { Button, Card, Field, Input } from '../components/ui'
import { Money } from '../components/Money'
import { SheetTitle } from '../components/Sheet'

export function OpeningBalances() {
  const { books, setBooks } = useBooks()
  const asOf = books.openingBalances[0]?.asOfDate || '2026-09-01'

  function setAsOf(date: string) {
    setBooks({
      ...books,
      openingBalances: books.openingBalances.map((o) => ({ ...o, asOfDate: date })),
    })
  }

  function upsert(accountNumber: string, amount: number) {
    const existing = books.openingBalances.find((o) => o.accountNumber === accountNumber)
    if (existing) {
      setBooks({
        ...books,
        openingBalances: books.openingBalances.map((o) => (o.accountNumber === accountNumber ? { ...o, amount } : o)),
      })
      return
    }
    const acct = books.chartOfAccounts.find((a) => a.number === accountNumber)
    const ob: OpeningBalance = {
      id: newId('ob'),
      asOfDate: asOf,
      accountNumber,
      amount,
      memo: acct?.name ?? '',
    }
    setBooks({ ...books, openingBalances: [...books.openingBalances, ob] })
  }

  const sheetAccounts = books.chartOfAccounts.filter((a) => a.type === 'Asset' || a.type === 'Liability' || a.type === 'Equity')
  const byNum = new Map(books.openingBalances.map((o) => [o.accountNumber, o]))

  return (
    <div className="flex flex-col gap-4">
      <SheetTitle
        title="Opening Balances"
        blurb="Enter what each balance sheet account was worth the day you started using this workbook. Native sign: money out +, money in −. Cash in the bank funded by equity is typically a positive asset and a negative equity plug so the Balance Sheet nets."
      />
      <Field label="As of date">
        <Input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
      </Field>
      <Card
        title="Balance sheet accounts"
        action={
          <Button
            variant="ghost"
            onClick={() => {
              const missing = sheetAccounts.filter((a) => !byNum.has(a.number))
              setBooks({
                ...books,
                openingBalances: [
                  ...books.openingBalances,
                  ...missing.map((a) => ({
                    id: newId('ob'),
                    asOfDate: asOf,
                    accountNumber: a.number,
                    amount: 0,
                    memo: a.name,
                  })),
                ],
              })
            }}
          >
            Fill missing accounts
          </Button>
        }
      >
        <div className="overflow-x-auto">
          <table className="ledger-table w-full">
            <thead>
              <tr>
                <th>Account #</th>
                <th>Account name</th>
                <th>Category</th>
                <th>Opening balance</th>
              </tr>
            </thead>
            <tbody>
              {sheetAccounts.map((a) => {
                const ob = byNum.get(a.number)
                return (
                  <tr key={a.number}>
                    <td>{a.number}</td>
                    <td>{a.name}</td>
                    <td>{a.category}</td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        className="w-32 border-0 bg-transparent"
                        value={ob?.amount ?? 0}
                        onChange={(e) => upsert(a.number, Number(e.target.value))}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-ink-2">
          Operating checking currently{' '}
          <Money n={byNum.get('1000')?.amount ?? 0} /> as of {asOf}.
        </p>
      </Card>
    </div>
  )
}
