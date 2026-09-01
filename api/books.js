import { isDenied, loadBooksJson, readBody, readSession, saveBooksJson, sendJson } from './_lib.js'

export default async function handler(req, res) {
  const session = readSession(req)
  if (!session) return sendJson(res, 401, { error: 'Sign in with an office PIN.' })

  if (req.method === 'GET') {
    const books = await loadBooksJson()
    return sendJson(res, 200, { books, store: process.env.BLOB_READ_WRITE_TOKEN ? 'soastal-books-store' : 'app-file' })
  }

  if (req.method !== 'PUT' && req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' })
  }

  try {
    const body = await readBody(req)
    const books = body.books
    if (!books || typeof books !== 'object') return sendJson(res, 400, { error: 'Missing books payload.' })
    const hinted = String(body.path || books.savePath || '')
    if (hinted && isDenied(hinted)) {
      return sendJson(res, 403, {
        error:
          "Refused: Keith's live workbook Documents/Finance/Acounting spreadshseet.xlsx is denylisted. Soastal Books writes only an app-owned copy.",
      })
    }
    const path = await saveBooksJson(books)
    return sendJson(res, 200, { ok: true, path })
  } catch (err) {
    return sendJson(res, 400, { error: err instanceof Error ? err.message : String(err) })
  }
}
