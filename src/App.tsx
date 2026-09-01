import { useState } from 'react'
import {
  BookOpen,
  ClipboardCheck,
  FolderLock,
  LayoutDashboard,
  ListChecks,
  PenLine,
  Scale,
  Settings2,
  Table2,
} from 'lucide-react'
import { BooksProvider, useBooks } from './store/BooksContext'
import { AuthProvider, useAuth } from './store/AuthContext'
import { Dashboard } from './pages/Dashboard'
import { Ledger } from './pages/Ledger'
import { Wizards } from './pages/Wizards'
import { FosterInbox } from './pages/FosterInbox'
import { Aging } from './pages/Aging'
import { Reports } from './pages/Reports'
import { Close } from './pages/Close'
import { Setup } from './pages/Setup'
import { Files } from './pages/Files'
import { Login } from './pages/Login'
import { cn } from './lib/utils'

const NAV = [
  { id: 'books', label: 'Books', icon: LayoutDashboard },
  { id: 'enter', label: 'Enter', icon: PenLine },
  { id: 'ledger', label: 'Ledger', icon: Table2 },
  { id: 'foster', label: 'Foster', icon: ClipboardCheck },
  { id: 'aging', label: 'AP / AR', icon: Scale },
  { id: 'reports', label: 'Reports', icon: BookOpen },
  { id: 'close', label: 'Close', icon: ListChecks },
  { id: 'setup', label: 'Setup', icon: Settings2 },
  { id: 'files', label: 'Files', icon: FolderLock },
] as const

type NavId = (typeof NAV)[number]['id']

function Shell() {
  const [view, setView] = useState<NavId>('books')
  const { books, loading } = useBooks()
  const { session, logout } = useAuth()
  const fosterN = books.fosterQueue.filter((f) => f.decision === 'pending').length

  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      <aside className="flex flex-col bg-ink text-paper md:w-56 md:shrink-0">
        <div className="border-b border-white/10 px-4 py-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sand">Soastal LLC</div>
          <div className="font-serif text-xl">Books</div>
          <div className="text-xs text-paper/60">Accrual · copies only</div>
        </div>
        <nav className="flex gap-1 overflow-x-auto p-2 md:flex-col md:overflow-visible">
          {NAV.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm whitespace-nowrap',
                  view === item.id ? 'bg-white/10 text-white' : 'text-paper/75 hover:bg-white/5',
                )}
              >
                <Icon size={16} />
                {item.label}
                {item.id === 'foster' && fosterN > 0 ? (
                  <span className="ml-auto rounded-full bg-sand px-1.5 text-[10px] font-bold text-ink">{fosterN}</span>
                ) : null}
              </button>
            )
          })}
        </nav>
        <div className="mt-auto px-4 py-4 text-[11px] text-paper/50">
          <div>
            {session?.name} · {session?.title}
          </div>
          <div className="mt-1">Keith owns the live sheet. This app never writes it.</div>
          <button className="mt-2 text-sand underline" onClick={() => void logout()}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-8">
        {loading ? (
          <p className="text-ink-2">Loading books…</p>
        ) : (
          <>
            {view === 'books' && <Dashboard />}
            {view === 'enter' && <Wizards />}
            {view === 'ledger' && <Ledger />}
            {view === 'foster' && <FosterInbox />}
            {view === 'aging' && <Aging />}
            {view === 'reports' && <Reports />}
            {view === 'close' && <Close />}
            {view === 'setup' && <Setup />}
            {view === 'files' && <Files />}
          </>
        )}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}

function Gate() {
  const { session, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-ink text-paper">
        Opening Soastal Books…
      </div>
    )
  }
  if (!session) return <Login />
  return (
    <BooksProvider>
      <Shell />
    </BooksProvider>
  )
}
