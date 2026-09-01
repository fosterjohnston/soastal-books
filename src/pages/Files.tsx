import { BOOKS_RELATIVE_DIR, LIVE_WORKBOOK_RELATIVE } from '../engine/types'
import { useBooks } from '../store/BooksContext'
import { Button, Card } from '../components/ui'
import { useRef } from 'react'

export function Files() {
  const { books, savePath, lastError, isElectron, saveNow, exportCopy, importCopy, resetDemo } = useBooks()
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-serif text-3xl">Files & copies</h1>
        <p className="max-w-2xl text-sm text-ink-2">
          App-owned copies only. Persist under <strong>{BOOKS_RELATIVE_DIR}/</strong>. Keith&apos;s live original{' '}
          <code>{LIVE_WORKBOOK_RELATIVE}</code> is denylisted — this app will refuse to write it.
        </p>
      </div>

      <Card title="Where books save">
        <dl className="grid gap-2 text-sm md:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-ink-2">Mode</dt>
            <dd>{isElectron ? 'Desktop (Electron)' : 'Browser preview — localStorage, plus downloads'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-ink-2">Current path</dt>
            <dd className="break-all font-mono text-xs">{savePath}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-ink-2">Last saved</dt>
            <dd>{books.savedAt ?? 'Not yet saved this session'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-ink-2">Company OneDrive folder</dt>
            <dd>{BOOKS_RELATIVE_DIR}/soastal-books.json and Soastal Books Export.xlsx</dd>
          </div>
        </dl>
        {lastError ? <p className="mt-3 text-sm text-danger">{lastError}</p> : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => void saveNow()}>Save copy now</Button>
          <Button variant="sand" onClick={() => void exportCopy()}>
            Export Excel copy
          </Button>
          <Button variant="ghost" onClick={() => fileRef.current?.click()}>
            Import from a COPY
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx"
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
          timesheets, and does not include daily logs, field budgets, or a PO product. Field may later drop reports in
          via files; that integration is not built here.
        </p>
        <Button className="mt-3" variant="ghost" onClick={resetDemo}>
          Reload seeded demo books
        </Button>
      </Card>
    </div>
  )
}
