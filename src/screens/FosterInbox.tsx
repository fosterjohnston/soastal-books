'use client'

import { useState } from 'react'
import { decideFoster, markPaid } from '../engine'
import { formatDate, formatNative } from '../lib/utils'
import { useBooks } from '../store/BooksContext'
import { useAuth } from '../store/AuthContext'
import { Badge, Button, Card, Field, Input, Textarea } from '../components/ui'

export function FosterInbox() {
  const { books, setBooks } = useBooks()
  const { session } = useAuth()
  const canConfirm = session?.role === 'foster'
  const [note, setNote] = useState('')
  const [payDate, setPayDate] = useState('')
  const [payRef, setPayRef] = useState('')
  const pending = books.fosterQueue.filter((f) => f.decision === 'pending')
  const done = books.fosterQueue.filter((f) => f.decision !== 'pending')

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-serif text-3xl">Inbox</h1>
        <p className="max-w-2xl text-sm text-ink-2">
          Foster (COO) is the only human for invoice coding confirms. Propose coding (job + pay item). If the bill is
          Missing - Get Approval, wait yes/no. Only then post. Mark Paid only when Foster sends payment date and
          check/ACH number.
        </p>
      </div>

      <Card title={`Waiting on Foster (${pending.length})`}>
        {pending.length === 0 ? (
          <p className="text-sm text-ink-2">Nothing in the coding queue.</p>
        ) : (
          <ul className="space-y-4">
            {pending.map((f) => (
              <li key={f.id} className="rounded-lg border border-line p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">
                      {f.vendor} · {f.invoiceNumber}
                    </div>
                    <div className="text-sm text-ink-2">
                      {f.jobName || 'No job'} · {formatNative(f.amount)}
                    </div>
                    <div className="mt-1 text-sm">{f.reason}</div>
                    <div className="mt-1 text-xs text-ink-2">Proposed: {f.proposedAccounts.join('; ')}</div>
                  </div>
                  <Badge tone="sand">pending</Badge>
                </div>
                <Textarea className="mt-2" placeholder="Foster note" value={note} onChange={(e) => setNote(e.target.value)} />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {canConfirm ? (
                    <>
                      <Button
                        onClick={() => {
                          try {
                            setBooks(decideFoster(books, f.id, 'yes', note))
                            setNote('')
                          } catch (err) {
                            window.alert(err instanceof Error ? err.message : String(err))
                          }
                        }}
                      >
                        Yes — post
                      </Button>
                      <Button variant="ghost" onClick={() => setBooks(decideFoster(books, f.id, 'no', note))}>
                        No — hold
                      </Button>
                    </>
                  ) : (
                    <p className="text-sm text-ink-2">Foster is the only person who can confirm coding.</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Mark Paid from Foster’s payment info">
        <p className="mb-3 text-sm text-ink-2">
          Posted bills stay Unpaid / AP until cash actually moves on a separate -PMT document. Use this when Foster
          sends the date and check number for a payment row that is already coded.
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Payment date">
            <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
          </Field>
          <Field label="Check / ACH #">
            <Input value={payRef} onChange={(e) => setPayRef(e.target.value)} />
          </Field>
        </div>
        <ul className="mt-3 space-y-2 text-sm">
          {books.transactions
            .filter((t) => t.posted && t.approvalStatus !== 'Paid' && t.invoiceNumber.toUpperCase().endsWith('-PMT'))
            .map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2">
                <span>
                  {t.vendor} {t.invoiceNumber} · {formatDate(t.postingDate)}
                </span>
                <Button
                  variant="sand"
                  onClick={() => {
                    try {
                      setBooks(markPaid(books, [t.id], payDate, payRef))
                    } catch (err) {
                      window.alert(err instanceof Error ? err.message : String(err))
                    }
                  }}
                >
                  Mark Paid
                </Button>
              </li>
            ))}
        </ul>
        {books.transactions.filter((t) => t.posted && t.approvalStatus !== 'Paid' && t.invoiceNumber.toUpperCase().endsWith('-PMT')).length === 0 ? (
          <p className="text-sm text-ink-2">No unpaid -PMT rows. Enter the payment as a new document first.</p>
        ) : null}
      </Card>

      <Card title="History">
        {done.length === 0 ? (
          <p className="text-sm text-ink-2">No prior decisions.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {done.map((f) => (
              <li key={f.id} className="flex justify-between gap-3">
                <span>
                  {f.vendor} {f.invoiceNumber} — {f.decision}
                  {f.fosterNote ? ` (${f.fosterNote})` : ''}
                </span>
                <Badge tone={f.decision === 'yes' ? 'teal' : 'danger'}>{f.decision}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
