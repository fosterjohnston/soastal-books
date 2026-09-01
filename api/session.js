import { clearCookie, lookupPin, readBody, readSession, sendJson, sessionCookie } from './_lib.js'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const session = readSession(req)
    if (!session) return sendJson(res, 401, { ok: false })
    return sendJson(res, 200, { ok: true, session })
  }
  if (req.method === 'DELETE') {
    return sendJson(res, 200, { ok: true }, { 'Set-Cookie': clearCookie() })
  }
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' })
  try {
    const { pin } = await readBody(req)
    const user = lookupPin(pin)
    if (!user) return sendJson(res, 401, { error: 'PIN not recognized.' })
    return sendJson(res, 200, { ok: true, session: user }, { 'Set-Cookie': sessionCookie(user.role) })
  } catch {
    return sendJson(res, 400, { error: 'Could not read PIN.' })
  }
}
