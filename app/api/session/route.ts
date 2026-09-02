import { NextResponse } from 'next/server'
import {
  lookupPin,
  parseSessionCookie,
  sessionCookieValue,
  SESSION_COOKIE,
  type OfficeRole,
} from '@/lib/office-auth'

export const dynamic = 'force-dynamic'

function cookieOpts() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: Boolean(process.env.VERCEL),
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  }
}

export async function GET(req: Request) {
  const session = parseSessionCookie(req.headers.get('cookie'))
  if (!session) return NextResponse.json({ ok: false }, { status: 401 })
  return NextResponse.json({ ok: true, session })
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { pin?: string }
    const user = lookupPin(String(body.pin || ''))
    if (!user) return NextResponse.json({ error: 'PIN not recognized.' }, { status: 401 })
    const res = NextResponse.json({ ok: true, session: user })
    res.cookies.set(SESSION_COOKIE, sessionCookieValue(user.role as OfficeRole), cookieOpts())
    res.headers.set('Cache-Control', 'no-store')
    return res
  } catch {
    return NextResponse.json({ error: 'Could not read PIN.' }, { status: 400 })
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, '', { ...cookieOpts(), maxAge: 0 })
  return res
}
