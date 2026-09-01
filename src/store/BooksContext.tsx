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

async function readLocal(): Promise<CompanyBooks> {
  const electron = api()
  if (electron?.load) {
    const disk = await electron.load()
    if (disk) return disk
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as CompanyBooks
  } catch {
    /* ignore */
  }
  return createEmptyBooks()
}

async function writeLocal(books: CompanyBooks): Promise<string> {
  const payload = JSON.stringify(books)
  localStorage.setItem(STORAGE_KEY, payload)
  const electron = api()
  if (electron?.save) {
    const { path } = await electron.save(books)
    return path
  }
  return `browser:${STORAGE_KEY}`
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

export function BooksProvider({ children }: { children: ReactNode }) {
  const [books, setBooksState] = useState<CompanyBooks>(createEmptyBooks)
  const [loading, setLoading] = useState(true)
  const [savePath, setSavePath] = useState(STORAGE_KEY)
  const [lastError, setLastError] = useState('')
  const isElectron = Boolean(api()?.isElectron)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const loaded = await readLocal()
        if (!cancelled) {
          setBooksState(loaded)
          if (api()?.booksDir) setSavePath(await api()!.booksDir!())
        }
      } catch (err) {
        if (!cancelled) setLastError(err instanceof Error ? err.message : String(err))
      } finally {
        if (!cancelled) setLoading(false)
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
      void writeLocal(books).then(setSavePath).catch((err: unknown) => {
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
