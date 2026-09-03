'use client'

import { useState } from 'react'
import { decideFoster } from '../engine'
import { formatNative } from '../lib/utils'
import { useBooks } from '../store/BooksContext'
import { useAuth } from '../store/AuthContext'
import { Badge, Button, Card, Textarea } from '../components/ui'
import Link from 'next/link'

export function Review() {
  const { books, setBooks } = useBooks()
  const { session } = useAuth()
  const canReply = session?.role === 'foster'
  const [note, setNote] = useState('')
  const pending = books.fosterQueue.filter((f) => f.decision === 'pending')
  const done = books.fosterQueue.filter((f) => f.decision !== 'pending')

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-serif text-3xl">Review</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-2">
          Keith enters and posts the books. If a row is unclear, he asks here. Foster answers the question — that is
          not a gate to post. Open the transaction on Transactions if you need the full line.
        </p>
      </div>

      <Card title={`Waiting on Foster (${pending.length})`}>
        {pending.length === 0 ? (
          <p className="text-sm text-ink-2">Nothing to review. Keith can ask from a transaction when he needs a second look.</p>
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
                    <p className="mt-2 text-sm">{f.reason}</p>
                    <div className="mt-1 text-xs text-ink-2">Coding: {f.proposedAccounts.join('; ') || '—'}</div>
                    {f.transactionIds[0] ? (
                      <Link href="/transactions" className="mt-2 inline-block text-sm font-semibold text-teal underline-offset-2 hover:underline">
                        Open Transactions
                      </Link>
                    ) : null}
                  </div>
                  <Badge tone="sand">needs review</Badge>
                </div>
                {canReply ? (
                  <>
                    <Textarea
                      className="mt-2"
                      placeholder="Foster’s answer"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Button
                        onClick={() => {
                          setBooks(decideFoster(books, f.id, 'yes', note))
                          setNote('')
                        }}
                      >
                        Looks good
                      </Button>
                      <Button variant="ghost" onClick={() => setBooks(decideFoster(books, f.id, 'no', note))}>
                        Hold — see my note
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-ink-2">Foster will answer this. You can still post the row on Transactions.</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Answered">
        {done.length === 0 ? (
          <p className="text-sm text-ink-2">No answers yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {done.map((f) => (
              <li key={f.id} className="flex justify-between gap-3 border-b border-line py-2">
                <span>
                  {f.vendor} {f.invoiceNumber} — {f.reason}
                  {f.fosterNote ? ` Foster: ${f.fosterNote}` : ''}
                </span>
                <Badge tone={f.decision === 'yes' ? 'teal' : 'danger'}>
                  {f.decision === 'yes' ? 'looks good' : 'hold'}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
