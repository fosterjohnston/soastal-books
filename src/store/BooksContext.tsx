import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { CompanyBooks } from '../engine/types'
import { createEmptyBooks } from '../seed'
import { assertImportSourceAllowed } from '../engine/denylist'
import { EXPORT_FILENAME, exportWorkbook, importWorkbookCopy } from '../engine/excel'

const STORAGE_KEY = 'soastal-books-v1'

type BooksAPI = {
  isElectron: boolean
  booksDir?: () => Promise<string>
  load?: () => Promise<CompanyBooks | null>
  save?: (books: CompanyBooks) => Promise<{ path: string }>
  exportExcel?: (bytes: number[]) => Promise<{ path: string }>
}

function api(): BooksAPI | undefined {
  return (window as unknown as { booksAPI?: BooksAPI }).booksAPI
}

async function saveToCloud(books: CompanyBooks): Promise<string | null> {
  try {
    const res = await fetch('/api/books', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ books }),
    })
    const data = (await res.json().catch(() => ({}))) as { path?: string; error?: string }
    if (!res.ok) throw new Error(data.error || 'Could not save books.')
    return data.path || 'soastal-books-store'
  } catch (err) {
    throw err
  }
}

async function writeLocal(books: CompanyBooks): Promise<string> {
  const payload = JSON.stringify(books)
  localStorage.setItem(STORAGE_KEY, payload)
  const electron = api()
  if (electron?.save) {
    const { path } = await electron.save(books)
    return path
  }
  const cloud = await saveToCloud(books).catch(() => null)
  return cloud || `browser:${STORAGE_KEY}`
}

type Ctx = {
  books: CompanyBooks
  setBooks: (next: CompanyBooks | ((prev: CompanyBooks) => CompanyBooks)) => void
  loading: boolean
  savePath: string
  lastError: string
  isElectron: boolean
  saveNow: () => Promise<void>
  exportCopy: () => Promise<void>
  importCopy: (file: File) => Promise<void>
  resetDemo: () => void
}

const BooksContext = createContext<Ctx | null>(null)

function readStoredBooks(): CompanyBooks {
  if (typeof localStorage === 'undefined') return createEmptyBooks()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createEmptyBooks()
    const parsed = JSON.parse(raw) as CompanyBooks
    if (Array.isArray(parsed?.transactions) && parsed.transactions.length > 0) return parsed
  } catch {
    /* corrupt store — fall back to demo journal */
  }
  return createEmptyBooks()
}

export function BooksProvider({ children }: { children: ReactNode }) {
  const [books, setBooksState] = useState<CompanyBooks>(readStoredBooks)
  const [loading] = useState(false)
  const [savePath, setSavePath] = useState('soastal-books-store')
  const [lastError, setLastError] = useState('')
  const isElectron = Boolean(api()?.isElectron)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const electron = api()
      if (!electron?.load) return
      try {
        const disk = await electron.load()
        if (disk?.transactions?.length && !cancelled) {
          setBooksState(disk)
          if (electron.booksDir) setSavePath(await electron.booksDir())
        }
      } catch (err) {
        if (!cancelled) setLastError(err instanceof Error ? err.message : String(err))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const setBooks = useCallback((next: CompanyBooks | ((prev: CompanyBooks) => CompanyBooks)) => {
    setBooksState((prev) => (typeof next === 'function' ? next(prev) : next))
  }, [])

  const saveNow = useCallback(async () => {
    try {
      const path = await writeLocal({ ...books, savedAt: new Date().toISOString() })
      setSavePath(path)
      setLastError('')
    } catch (err) {
      setLastError(err instanceof Error ? err.message : String(err))
      throw err
    }
  }, [books])

  useEffect(() => {
    if (loading) return
    const t = window.setTimeout(() => {
      void writeLocal(books)
        .then(setSavePath)
        .catch((err: unknown) => {
          setLastError(err instanceof Error ? err.message : String(err))
        })
    }, 400)
    return () => window.clearTimeout(t)
  }, [books, loading])

  const exportCopy = useCallback(async () => {
    const buf = await exportWorkbook(books)
    const electron = api()
    if (electron?.exportExcel) {
      const { path } = await electron.exportExcel([...new Uint8Array(buf)])
      setSavePath(path)
      return
    }
    const blob = new Blob([buf], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = EXPORT_FILENAME
    a.click()
    URL.revokeObjectURL(a.href)
  }, [books])

  const importCopy = useCallback(async (file: File) => {
    assertImportSourceAllowed(file.name)
    const buf = await file.arrayBuffer()
    const next = await importWorkbookCopy(buf, file.name, books)
    setBooksState(next)
  }, [books])

  const resetDemo = useCallback(() => {
    setBooksState(createEmptyBooks())
  }, [])

  const value = useMemo(
    () => ({
      books,
      setBooks,
      loading,
      savePath,
      lastError,
      isElectron,
      saveNow,
      exportCopy,
      importCopy,
      resetDemo,
    }),
    [books, setBooks, loading, savePath, lastError, isElectron, saveNow, exportCopy, importCopy, resetDemo],
  )

  return <BooksContext.Provider value={value}>{children}</BooksContext.Provider>
}

export function useBooks() {
  const ctx = useContext(BooksContext)
  if (!ctx) throw new Error('useBooks must be used inside BooksProvider')
  return ctx
}
