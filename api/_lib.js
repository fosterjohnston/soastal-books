import { createHmac, timingSafeEqual } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const COOKIE = 'soastal_session'
const LOCAL_STORE = path.join(process.cwd(), '.data', 'soastal-books.json')
const BLOB_PATH = 'soastal-books.json'
const LIVE = 'acounting spreadshseet.xlsx'

export function isDenied(filePath) {
  const n = String(filePath || '')
    .replace(/\\/g, '/')
    .toLowerCase()
  return n.includes(LIVE) || n.includes('acounting%20spreadshseet.xlsx')
}

function pins() {
  return {
    [process.env.FOSTER_PIN || '2468']: { role: 'foster', name: 'Foster Johnston', title: 'COO · Office' },
    [process.env.KEITH_PIN || '8642']: { role: 'keith', name: 'Keith Bunting', title: 'CFO' },
  }
}

function secret() {
  return process.env.SESSION_SECRET || 'soastal-books-office-v1'
}

export function sessionCookie(role) {
  const sig = createHmac('sha256', secret()).update(role).digest('hex').slice(0, 24)
  const value = `${role}.${sig}`
  const secure = process.env.VERCEL ? '; Secure' : ''
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${secure}`
}

export function clearCookie() {
  const secure = process.env.VERCEL ? '; Secure' : ''
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`
}

export function readSession(req) {
  const raw = req.headers.cookie || req.headers.Cookie || ''
  const match = String(raw)
    .split(';')
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${COOKIE}=`))
  if (!match) return null
  const value = match.slice(COOKIE.length + 1)
  const [role, sig] = value.split('.')
  if (!role || !sig) return null
  const expected = createHmac('sha256', secret()).update(role).digest('hex').slice(0, 24)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  if (role !== 'foster' && role !== 'keith') return null
  const meta =
    role === 'foster'
      ? { name: 'Foster Johnston', title: 'COO · Office' }
      : { name: 'Keith Bunting', title: 'CFO' }
  return { role, ...meta }
}

export function lookupPin(pin) {
  const table = pins()
  return table[String(pin).trim()] || null
}

async function streamToString(stream) {
  if (!stream) return ''
  if (typeof stream.text === 'function') return stream.text()
  const res = new Response(stream)
  return res.text()
}

export async function loadBooksJson() {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (token) {
    try {
      const { get } = await import('@vercel/blob')
      const result = await get(BLOB_PATH, { token, access: 'private', useCache: false })
      if (result?.statusCode === 200 && result.stream) {
        const text = await streamToString(result.stream)
        if (text) return JSON.parse(text)
      }
    } catch {
      /* empty store or first run */
    }
  }
  try {
    const raw = await readFile(LOCAL_STORE, 'utf8')
    return JSON.parse(raw)
  } catch {
    try {
      const raw = await readFile('/tmp/soastal-books.json', 'utf8')
      return JSON.parse(raw)
    } catch {
      return null
    }
  }
}

export async function saveBooksJson(books) {
  const payload = JSON.stringify(books)
  if (isDenied(payload) || (books?.savePath && isDenied(String(books.savePath)))) {
    throw new Error('Refused: Keith’s live workbook is denylisted.')
  }
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (token) {
    const { put } = await import('@vercel/blob')
    const result = await put(BLOB_PATH, payload, {
      access: 'private',
      token,
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
    })
    return result.pathname || `blob:${BLOB_PATH}`
  }
  try {
    await mkdir(path.dirname(LOCAL_STORE), { recursive: true })
    await writeFile(LOCAL_STORE, payload, 'utf8')
    return 'soastal-books-store'
  } catch {
    await writeFile('/tmp/soastal-books.json', payload, 'utf8')
    return 'soastal-books-store'
  }
}

export function sendJson(res, status, body, extraHeaders = {}) {
  const json = JSON.stringify(body)
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store')
  for (const [k, v] of Object.entries(extraHeaders)) res.setHeader(k, v)
  res.end(json)
}

export async function readBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body
  if (typeof req.body === 'string' && req.body) {
    try {
      return JSON.parse(req.body)
    } catch {
      return {}
    }
  }
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw) return {}
  return JSON.parse(raw)
}
