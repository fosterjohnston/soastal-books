import { createHmac, timingSafeEqual } from 'node:crypto'

export type OfficeRole = 'foster' | 'keith'

export type OfficeSession = {
  role: OfficeRole
  name: string
  title: string
}

export const SESSION_COOKIE = 'soastal_session'

const ROLE_META: Record<OfficeRole, Omit<OfficeSession, 'role'>> = {
  foster: { name: 'Foster Johnston', title: 'COO · Office' },
  keith: { name: 'Keith Bunting', title: 'CFO' },
}

function sessionSecret(): string {
  return process.env.SESSION_SECRET || 'soastal-books-office-v1'
}

export function pinTable(): Record<string, OfficeSession> {
  return {
    [process.env.FOSTER_PIN || '2468']: { role: 'foster', ...ROLE_META.foster },
    [process.env.KEITH_PIN || '8642']: { role: 'keith', ...ROLE_META.keith },
  }
}

export function lookupPin(pin: string): OfficeSession | null {
  const table = pinTable()
  return table[String(pin).trim()] || null
}

export function ingestKey(): string {
  return process.env.INGEST_KEY || 'soastal-field-ingest-v1'
}

export function ingestKeyMatches(provided: string | null | undefined): boolean {
  const expected = ingestKey()
  const got = String(provided || '').trim()
  if (!got || !expected) return false
  const a = Buffer.from(got)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export function signRole(role: OfficeRole): string {
  return createHmac('sha256', sessionSecret()).update(role).digest('hex').slice(0, 24)
}

export function sessionCookieValue(role: OfficeRole): string {
  return `${role}.${signRole(role)}`
}

export function sessionCookieHeader(role: OfficeRole): string {
  const secure = process.env.VERCEL ? '; Secure' : ''
  return `${SESSION_COOKIE}=${sessionCookieValue(role)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${secure}`
}

export function clearSessionCookieHeader(): string {
  const secure = process.env.VERCEL ? '; Secure' : ''
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`
}

export function parseSessionCookie(cookieHeader: string | null | undefined): OfficeSession | null {
  const raw = cookieHeader || ''
  const match = raw
    .split(';')
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${SESSION_COOKIE}=`))
  if (!match) return null
  const value = match.slice(SESSION_COOKIE.length + 1)
  const [role, sig] = value.split('.')
  if ((role !== 'foster' && role !== 'keith') || !sig) return null
  const expected = signRole(role)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  return { role, ...ROLE_META[role] }
}

export function sessionFromRequest(req: Request): OfficeSession | null {
  return parseSessionCookie(req.headers.get('cookie'))
}

export function ingestAuthorized(req: Request): { ok: true; via: 'session' | 'ingest-key'; session?: OfficeSession } | { ok: false } {
  const session = sessionFromRequest(req)
  if (session) return { ok: true, via: 'session', session }
  const key = req.headers.get('x-soastal-ingest-key') || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (ingestKeyMatches(key)) return { ok: true, via: 'ingest-key' }
  return { ok: false }
}
