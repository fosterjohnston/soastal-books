import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { assertCopyDestination, assertWritablePath, hydrateBooks, isLiveWorkbookPath } from '../engine'
import { hasWorkbookCopyJournal } from '../engine/hydrate'
import type { CompanyBooks } from '../engine/types'
import { createEmptyBooks } from '../seed'
import { booksCopyPath } from '../engine/propose'

const LOCAL_STORE = path.join(process.cwd(), '.data', 'soastal-books.json')
const BLOB_PATH = 'Documents/Finance/Soastal Books/soastal-books.json'

function denied(target: string): boolean {
  return isLiveWorkbookPath(target)
}

async function persistCopyIfNeeded(raw: unknown, books: CompanyBooks): Promise<CompanyBooks> {
  const parsed = raw && typeof raw === 'object' ? (raw as { transactions?: { id?: string }[] }) : null
  const already = hasWorkbookCopyJournal(parsed?.transactions)
  if (already || !hasWorkbookCopyJournal(books.transactions)) return books
  try {
    await saveBooksJson(books)
  } catch {
    /* display the copy even if persist fails */
  }
  return books
}

export async function loadBooksJson(): Promise<CompanyBooks> {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (token) {
    try {
      const { get } = await import('@vercel/blob')
      const result = await get('soastal-books.json', { token, access: 'private', useCache: false })
      if (result?.stream) {
        const text = await new Response(result.stream as ReadableStream).text()
        if (text) {
          const raw = JSON.parse(text)
          return persistCopyIfNeeded(raw, hydrateBooks(raw))
        }
      }
    } catch {
      /* empty store */
    }
  }
  try {
    const rawText = await readFile(LOCAL_STORE, 'utf8')
    const raw = JSON.parse(rawText)
    return persistCopyIfNeeded(raw, hydrateBooks(raw))
  } catch {
    try {
      const rawText = await readFile('/tmp/soastal-books.json', 'utf8')
      const raw = JSON.parse(rawText)
      return persistCopyIfNeeded(raw, hydrateBooks(raw))
    } catch {
      const seed = createEmptyBooks()
      try {
        await saveBooksJson(seed)
      } catch {
        /* keep seed in memory */
      }
      return seed
    }
  }
}

export async function saveBooksJson(books: CompanyBooks, hintedPath = ''): Promise<string> {
  const dest = hintedPath || BLOB_PATH
  assertWritablePath(dest)
  if (denied(dest)) throw new Error('Refused: Keith’s live workbook is denylisted.')
  if (hintedPath) assertCopyDestination(hintedPath)
  const payload = JSON.stringify({ ...books, savedAt: new Date().toISOString() })
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (token) {
    const { put } = await import('@vercel/blob')
    const result = await put('soastal-books.json', payload, {
      access: 'private',
      token,
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
    })
    return result.pathname || BLOB_PATH
  }
  try {
    await mkdir(path.dirname(LOCAL_STORE), { recursive: true })
    await writeFile(LOCAL_STORE, payload, 'utf8')
    const snapshot = path.join(process.cwd(), '.data', booksCopyPath().replace(/\//g, '_'))
    await writeFile(snapshot, payload, 'utf8')
    return BLOB_PATH
  } catch {
    await writeFile('/tmp/soastal-books.json', payload, 'utf8')
    return BLOB_PATH
  }
}

export { BLOB_PATH }
