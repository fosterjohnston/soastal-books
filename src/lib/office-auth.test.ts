import { describe, expect, it } from 'vitest'
import { ingestKeyMatches, lookupPin, parseSessionCookie, sessionCookieValue } from './office-auth'

describe('office PIN (server only)', () => {
  it('maps Foster and Keith from the office PIN table', () => {
    expect(lookupPin('2468')?.role).toBe('foster')
    expect(lookupPin('8642')?.role).toBe('keith')
    expect(lookupPin('0000')).toBeNull()
  })

  it('signs and reads a session cookie', () => {
    const cookie = `soastal_session=${sessionCookieValue('foster')}`
    const session = parseSessionCookie(cookie)
    expect(session?.role).toBe('foster')
    expect(session?.name).toBe('Foster Johnston')
    expect(parseSessionCookie('soastal_session=foster.deadbeef')).toBeNull()
  })

  it('accepts the field ingest key without treating it as a person', () => {
    expect(ingestKeyMatches('soastal-field-ingest-v1')).toBe(true)
    expect(ingestKeyMatches('nope')).toBe(false)
  })

  it('does not fall back to local office defaults on Vercel', () => {
    const prev = {
      VERCEL: process.env.VERCEL,
      FOSTER_PIN: process.env.FOSTER_PIN,
      KEITH_PIN: process.env.KEITH_PIN,
      INGEST_KEY: process.env.INGEST_KEY,
    }
    process.env.VERCEL = '1'
    delete process.env.FOSTER_PIN
    delete process.env.KEITH_PIN
    delete process.env.INGEST_KEY
    try {
      expect(lookupPin('2468')).toBeNull()
      expect(lookupPin('8642')).toBeNull()
      expect(ingestKeyMatches('soastal-field-ingest-v1')).toBe(false)
    } finally {
      if (prev.VERCEL === undefined) delete process.env.VERCEL
      else process.env.VERCEL = prev.VERCEL
      if (prev.FOSTER_PIN === undefined) delete process.env.FOSTER_PIN
      else process.env.FOSTER_PIN = prev.FOSTER_PIN
      if (prev.KEITH_PIN === undefined) delete process.env.KEITH_PIN
      else process.env.KEITH_PIN = prev.KEITH_PIN
      if (prev.INGEST_KEY === undefined) delete process.env.INGEST_KEY
      else process.env.INGEST_KEY = prev.INGEST_KEY
    }
  })
})
