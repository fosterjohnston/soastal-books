import { useState, type FormEvent } from 'react'
import { useAuth } from '../store/AuthContext'
import { Button, Field, Input } from '../components/ui'

export function Login() {
  const { login, error } = useAuth()
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await login(pin)
    } catch {
      /* error shown from context */
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-ink px-4">
      <form onSubmit={(e) => void onSubmit(e)} className="w-full max-w-md rounded-2xl bg-paper p-8 shadow-xl">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-teal">Soastal LLC</p>
        <h1 className="mt-1 font-serif text-3xl text-ink">Soastal Books</h1>
        <p className="mt-2 text-sm text-ink-2">
          Office accrual books. Not the field app. Keith&apos;s live spreadsheet is never written. Enter your office PIN.
        </p>
        <div className="mt-6">
          <Field label="Office PIN" hint="Foster · office lane · Keith · CFO lane">
            <Input
              inputMode="numeric"
              autoComplete="current-password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              autoFocus
            />
          </Field>
        </div>
        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
        <Button className="mt-5 w-full" disabled={busy || pin.trim().length < 4}>
          {busy ? 'Signing in…' : 'Open books'}
        </Button>
      </form>
    </div>
  )
}
