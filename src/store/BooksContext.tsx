'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { CompanyBooks } from '../engine/types'
import { createEmptyBooks } from '../seed'
import { assertImportSourceAllowed } from '../engine/denylist'

const STORAGE_KEY = 'soastal-books-v1'

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
  const seed = createEmptyBooks()
  if (typeof localStorage === 'undefined') return seed
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return seed
    const parsed = JSON.parse(raw) as CompanyBooks
    if (Array.isArray(parsed?.transactions) && parsed.transactions.length > 0) return parsed
  } catch {
    /* ignore */
  }
  return seed
}

export function BooksProvider({ children }: { children: ReactNode }) {
  const [books, setBooksState] = useState<CompanyBooks>(createEmptyBooks)
  const [hydrated, setHydrated] = useState(false)
  const [savePath, setSavePath] = useState('soastal-books-store')
  const [lastError, setLastError] = useState('')

  useEffect(() => {
    setBooksState(readStoredBooks())
    setHydrated(true)
  }, [])

  const setBooks = useCallback((next: CompanyBooks | ((prev: CompanyBooks) => CompanyBooks)) => {
    setBooksState((prev) => (typeof next === 'function' ? next(prev) : next))
  }, [])

  useEffect(() => {
    if (!hydrated) return
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(books))
        setSavePath(`browser:${STORAGE_KEY}`)
      } catch (err) {
        setLastError(err instanceof Error ? err.message : String(err))
      }
    }, 250)
    return () => window.clearTimeout(t)
  }, [books, hydrated])

  const saveNow = useCallback(async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...books, savedAt: new Date().toISOString() }))
    setSavePath(`browser:${STORAGE_KEY}`)
  }, [books])

  const exportCopy = useCallback(async () => undefined, [])
  const importCopy = useCallback(async (file: File) => {
    assertImportSourceAllowed(file.name)
  }, [])
  const resetDemo = useCallback(() => {
    const seed = createEmptyBooks()
    setBooksState(seed)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed))
  }, [])

  const value = useMemo(
    () => ({
      books,
      setBooks,
      loading: false,
      savePath,
      lastError,
      isElectron: false,
      saveNow,
      exportCopy,
      importCopy,
      resetDemo,
    }),
    [books, setBooks, savePath, lastError, saveNow, exportCopy, importCopy, resetDemo],
  )

  return <BooksContext.Provider value={value}>{children}</BooksContext.Provider>
}

export function useBooks() {
  const ctx = useContext(BooksContext)
  if (!ctx) throw new Error('useBooks must be used inside BooksProvider')
  return ctx
}
