'use client'

import { BOOKS_RELATIVE_DIR, LIVE_WORKBOOK_RELATIVE } from '@/engine/types'
import { useBooks } from '@/store/BooksContext'
import { Button, Card } from '@/components/ui'
import { useRef } from 'react'

export function Files() {
  const { books, savePath, lastError, saveNow, exportCopy, importCopy, resetDemo } = useBooks()
  const fileRef = useRef<HTMLInputElement>(null)
  const scans = books.documents ?? []
  const copies = books.copies ?? []

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-serif text-3xl">Files & copies</h1>
        <p className="max-w-2xl text-sm text-ink-2">
          App-owned copies only. Persist under <strong>{BOOKS_RELATIVE_DIR}/</strong>. Keith&apos;s live original{' '}
          <code>{LIVE_WORKBOOK_RELATIVE}</code> is denylisted — this app will refuse to write it.
        </p>
      </div>

      <Card title="Where books live">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-lg bg-paper px-3 py-2">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-2/70">Mode</dt>
            <dd className="mt-0.5">Cloud store — app-owned copies only</dd>
          </div>
          <div className="rounded-lg bg-paper px-3 py-2">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-2/70">Last saved</dt>
            <dd className="mt-0.5">{books.savedAt ?? 'Not yet saved this session'}</dd>
          </div>
          <div className="rounded-lg bg-paper px-3 py-2">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-2/70">Current path</dt>
            <dd className="mt-0.5 break-all font-mono text-xs">{savePath}</dd>
          </div>
          <div className="rounded-lg bg-paper px-3 py-2">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-2/70">Company folder</dt>
            <dd className="mt-0.5">{BOOKS_RELATIVE_DIR}/</dd>
          </div>
        </dl>
        {lastError ? <p className="mt-3 text-sm text-danger">{lastError}</p> : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => void saveNow()}>Save copy now</Button>
          <Button variant="sand" onClick={() => void exportCopy()}>
            Download JSON copy
          </Button>
          <Button variant="ghost" onClick={() => fileRef.current?.click()}>
            Import from a COPY
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (!f) return
              void importCopy(f).catch((err: unknown) => window.alert(err instanceof Error ? err.message : String(err)))
              e.target.value = ''
            }}
          />
        </div>
      </Card>

      <Card title="Inbox copies">
        {scans.length === 0 ? (
          <p className="text-sm text-ink-2">No scans yet. Upload a bill on Inbox.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {scans.map((d) => (
              <li key={d.id} className="border-b border-line py-2">
                <div className="font-semibold">{d.originalName}</div>
                <div className="font-mono text-xs text-ink-2">{d.storedPath}</div>
                <div className="text-ink-2">
                  {d.kind} · {d.status} · {d.proposal.vendor} {d.proposal.invoiceNumber}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Copy log">
        {copies.length === 0 ? (
          <p className="text-sm text-ink-2">Copies appear here when a scan is stored under {BOOKS_RELATIVE_DIR}/.</p>
        ) : (
          <ul className="space-y-1 font-mono text-xs">
            {copies.map((c) => (
              <li key={c.id}>
                {c.relativePath} ({c.bytes} bytes)
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Hard denylist">
        <p className="text-sm text-ink-2">
          Filename (misspelled on purpose): <code>Acounting spreadshseet.xlsx</code>. Any write whose path contains that
          name is rejected. Import of that live file is also refused — save a copy first, then import the copy. This
          software does not take over Keith&apos;s GL.
        </p>
      </Card>

      <Card title="Standalone">
        <p className="text-sm text-ink-2">
          This is office accounting only. It does not share a database with the field app, does not live-sync jobs or
          timesheets, and does not include daily logs, field budgets, or a PO product. The iOS field app may later POST
          documents to <code>/api/ingest</code>; that is a one-way drop, not a merge.
        </p>
        <Button className="mt-3" variant="ghost" onClick={resetDemo}>
          Reload workbook copy
        </Button>
      </Card>
    </div>
  )
}
