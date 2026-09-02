'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { CompanyBooks } from '../engine/types'
import { createEmptyBooks } from '../seed'
import { assertImportSourceAllowed, hydrateBooks } from '../engine'
import { booksCopyPath } from '../engine/propose'
import { useAuth } from './AuthContext'

const STORAGE_KEY = 'soastal-books-v1'
const COPY_DIR = 'Documents/Finance/Soastal Books'

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
    return hydrateBooks(JSON.parse(raw))
  } catch {
    return seed
  }
}

export function BooksProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const [books, setBooksState] = useState<CompanyBooks>(createEmptyBooks)
  const [hydrated, setHydrated] = useState(false)
  const [savePath, setSavePath] = useState(`${COPY_DIR}/soastal-books.json`)
  const [lastError, setLastError] = useState('')
  const skipNextPut = useRef(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const local = readStoredBooks()
      if (!cancelled) setBooksState(local)
      if (session) {
        try {
          const res = await fetch('/api/books', { credentials: 'include' })
          if (res.ok) {
            const data = (await res.json()) as { books?: CompanyBooks; store?: string }
            if (!cancelled && data.books) {
              const server = hydrateBooks(data.books)
              const localStamp = local.savedAt ? Date.parse(local.savedAt) : 0
              const serverStamp = server.savedAt ? Date.parse(server.savedAt) : 0
              const localWork = localStamp > 0 || (local.documents?.length ?? 0) > 0 || local.transactions.length > server.transactions.length
              const serverWork = serverStamp > 0 || (server.documents?.length ?? 0) > 0
              if (serverWork && serverStamp >= localStamp) {
                skipNextPut.current = true
                setBooksState(server)
                if (data.store) setSavePath(data.store)
              } else if (localWork) {
                setBooksState(local)
              } else {
                skipNextPut.current = true
                setBooksState(server)
              }
            }
          }
        } catch {
          /* keep local copy */
        }
      }
      if (!cancelled) setHydrated(true)
    })()
    return () => {
      cancelled = true
    }
  }, [session])

  const setBooks = useCallback((next: CompanyBooks | ((prev: CompanyBooks) => CompanyBooks)) => {
    setBooksState((prev) => (typeof next === 'function' ? next(prev) : next))
  }, [])

  useEffect(() => {
    if (!hydrated) return
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(books))
        setSavePath(`${COPY_DIR}/soastal-books.json`)
      } catch (err) {
        setLastError(err instanceof Error ? err.message : String(err))
      }
      if (!session) return
      if (skipNextPut.current) {
        skipNextPut.current = false
        return
      }
      void fetch('/api/books', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ books, path: `${COPY_DIR}/soastal-books.json` }),
      }).then(async (res) => {
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string }
          setLastError(data.error || `Save failed (${res.status})`)
          return
        }
        const data = (await res.json()) as { path?: string }
        if (data.path) setSavePath(data.path)
      })
    }, 400)
    return () => window.clearTimeout(t)
  }, [books, hydrated, session])

  const saveNow = useCallback(async () => {
    const stamped = { ...books, savedAt: new Date().toISOString() }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stamped))
    setBooksState(stamped)
    setSavePath(`${COPY_DIR}/soastal-books.json`)
    if (!session) return
    const res = await fetch('/api/books', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ books: stamped, path: `${COPY_DIR}/soastal-books.json` }),
    })
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      throw new Error(data.error || 'Save refused.')
    }
  }, [books, session])

  const exportCopy = useCallback(async () => {
    const path = booksCopyPath()
    const blob = new Blob([JSON.stringify(books, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = path.split('/').pop() || 'soastal-books.json'
    a.click()
    URL.revokeObjectURL(url)
  }, [books])

  const importCopy = useCallback(async (file: File) => {
    assertImportSourceAllowed(file.name)
    const text = await file.text()
    const next = hydrateBooks(JSON.parse(text))
    setBooksState(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
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
      loading: !hydrated,
      savePath,
      lastError,
      isElectron: false,
      saveNow,
      exportCopy,
      importCopy,
      resetDemo,
    }),
    [books, setBooks, hydrated, savePath, lastError, saveNow, exportCopy, importCopy, resetDemo],
  )

  return <BooksContext.Provider value={value}>{children}</BooksContext.Provider>
}

export function useBooks() {
  const ctx = useContext(BooksContext)
  if (!ctx) throw new Error('useBooks must be used inside BooksProvider')
  return ctx
}
