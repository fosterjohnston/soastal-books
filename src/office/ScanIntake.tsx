'use client'

import { useState, type FormEvent } from 'react'
import { useBooks } from '@/store/BooksContext'
import { Badge, Button, Card, Field, Input, Select, Textarea } from '@/components/ui'
import { isLiveWorkbookFilename, type CompanyBooks } from '@/engine'
import type { DocumentKind } from '@/engine/types'

export function ScanIntake() {
  const { books, setBooks } = useBooks()
  const [file, setFile] = useState<File | null>(null)
  const [kind, setKind] = useState<DocumentKind>('bill')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [proposal, setProposal] = useState('')

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setProposal('')
    if (!file) {
      setError('Choose a bill, PO, or AP scan to upload.')
      return
    }
    if (isLiveWorkbookFilename(file.name) || /acounting spreadshseet/i.test(file.name)) {
      setError("Import refused: that is Keith's live original. Save a COPY first.")
      return
    }
    setBusy(true)
    try {
      const form = new FormData()
      form.set('file', file)
      form.set('filename', file.name)
      form.set('kind', kind)
      if (notes.trim()) form.set('text', notes.trim())
      const res = await fetch('/api/ingest', { method: 'POST', credentials: 'include', body: form })
      const data = (await res.json()) as {
        error?: string
        proposal?: { summary: string }
        books?: CompanyBooks
        message?: string
      }
      if (!res.ok) {
        setError(data.error || 'Scan failed.')
        return
      }
      if (data.books) setBooks(data.books)
      setProposal(data.proposal?.summary || data.message || 'Draft is on Transactions. Keith posts it.')
      setFile(null)
      setNotes('')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card title="Scan / upload">
      <p className="mb-3 text-sm text-ink-2">
        Keith uploads a bill, PO, or AP scan. Books proposes coding — “this is where I think it goes.” A draft lands on
        Transactions. Keith posts it. If the coding is unclear, ask Foster from that row — Review is not a gate to post.
        Copies land in Documents/Finance/Soastal Books/inbox/. The live workbook is denylisted.
      </p>
      <form onSubmit={(e) => void onSubmit(e)} className="grid gap-3 md:grid-cols-3">
        <Field label="Document">
          <Input
            type="file"
            accept="image/*,.pdf,.png,.jpg,.jpeg,.webp,.json,.csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </Field>
        <Field label="Kind">
          <Select value={kind} onChange={(e) => setKind(e.target.value as DocumentKind)}>
            <option value="bill">Bill / invoice</option>
            <option value="po">Purchase order</option>
            <option value="ap">AP backup</option>
            <option value="other">Other</option>
          </Select>
        </Field>
        <Field label="Notes for coding (optional)">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Vendor, job, amount if the filename is blank" />
        </Field>
        <div className="md:col-span-3 flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={busy || !file}>
            {busy ? 'Reading…' : 'Propose coding'}
          </Button>
          {file ? <Badge tone="muted">{file.name}</Badge> : null}
        </div>
      </form>
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      {proposal ? <p className="mt-3 text-sm text-teal">{proposal}</p> : null}
      {(books.documents ?? []).length > 0 ? (
        <ul className="mt-4 space-y-2 border-t border-line pt-3 text-sm">
          {(books.documents ?? []).slice(0, 8).map((d) => (
            <li key={d.id}>
              <span className="font-semibold">{d.originalName}</span>
              <span className="text-ink-2">
                {' '}
                · {d.proposal.vendor} {d.proposal.invoiceNumber} — draft on Transactions
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-ink-2">No scans yet.</p>
      )}
    </Card>
  )
}
