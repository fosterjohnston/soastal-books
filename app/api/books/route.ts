import { NextResponse } from 'next/server'
import { isLiveWorkbookPath } from '@/engine'
import { loadBooksJson, saveBooksJson } from '@/lib/books-store'
import { sessionFromRequest } from '@/lib/office-auth'
import { hydrateBooks } from '@/engine/hydrate'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const session = sessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Sign in with an office PIN.' }, { status: 401 })
  const books = await loadBooksJson()
  return NextResponse.json({
    books,
    store: 'Documents/Finance/Soastal Books/soastal-books.json',
  })
}

export async function PUT(req: Request) {
  const session = sessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Sign in with an office PIN.' }, { status: 401 })
  try {
    const body = (await req.json()) as { books?: unknown; path?: string }
    if (!body.books || typeof body.books !== 'object') {
      return NextResponse.json({ error: 'Missing books payload.' }, { status: 400 })
    }
    const hinted = String(body.path || '')
    if (hinted && isLiveWorkbookPath(hinted)) {
      return NextResponse.json(
        {
          error:
            "Refused: Keith's live workbook Documents/Finance/Acounting spreadshseet.xlsx is denylisted. Soastal Books writes only an app-owned copy.",
        },
        { status: 403 },
      )
    }
    const books = hydrateBooks(body.books)
    const path = await saveBooksJson(books, hinted || 'Documents/Finance/Soastal Books/soastal-books.json')
    return NextResponse.json({ ok: true, path })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 })
  }
}

export async function POST(req: Request) {
  return PUT(req)
}
