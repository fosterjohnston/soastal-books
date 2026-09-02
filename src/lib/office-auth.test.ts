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
})
