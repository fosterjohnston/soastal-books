import { NextResponse } from 'next/server'
import { applyScanIntake, assertImportSourceAllowed, isLiveWorkbookPath } from '@/engine'
import { loadBooksJson, saveBooksJson } from '@/lib/books-store'
import { persistCopyBytes } from '@/lib/copy-store'
import { ingestAuthorized } from '@/lib/office-auth'
import type { DocumentKind } from '@/engine/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function jsonError(status: number, error: string) {
  return NextResponse.json({ error }, { status })
}

async function readIntake(req: Request) {
  const contentType = req.headers.get('content-type') || ''
  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData()
    const file = form.get('file')
    const filename =
      (typeof form.get('filename') === 'string' ? String(form.get('filename')) : '') ||
      (file instanceof File ? file.name : 'upload.bin')
    const bytes = file instanceof File ? new Uint8Array(await file.arrayBuffer()) : new Uint8Array()
    return {
      filename,
      originalName: filename,
      mimeType: file instanceof File ? file.type : 'application/octet-stream',
      size: bytes.byteLength,
      bytes,
      text: String(form.get('text') || ''),
      vendor: String(form.get('vendor') || '') || undefined,
      invoiceNumber: String(form.get('invoiceNumber') || '') || undefined,
      jobName: String(form.get('jobName') || '') || undefined,
      amount: form.get('amount') ? Number(form.get('amount')) : undefined,
      kind: (String(form.get('kind') || '') || undefined) as DocumentKind | undefined,
      poNumber: String(form.get('poNumber') || '') || undefined,
    }
  }
  const body = (await req.json()) as {
    filename?: string
    originalName?: string
    mimeType?: string
    text?: string
    vendor?: string
    invoiceNumber?: string
    jobName?: string
    amount?: number
    kind?: DocumentKind
    poNumber?: string
    fileBase64?: string
  }
  const filename = body.originalName || body.filename || 'upload.bin'
  const bytes = body.fileBase64 ? Uint8Array.from(Buffer.from(body.fileBase64, 'base64')) : new Uint8Array()
  return {
    filename,
    originalName: filename,
    mimeType: body.mimeType || 'application/octet-stream',
    size: bytes.byteLength,
    bytes,
    text: body.text || '',
    vendor: body.vendor,
    invoiceNumber: body.invoiceNumber,
    jobName: body.jobName,
    amount: body.amount,
    kind: body.kind,
    poNumber: body.poNumber,
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: '/api/ingest',
    auth: 'Office session cookie, or x-soastal-ingest-key for the iOS field app later. Standalone books — not the field site.',
    accepts: 'multipart file, or JSON { filename, text, vendor, amount, jobName, invoiceNumber, kind, poNumber, fileBase64 }',
    denylist: 'Documents/Finance/Acounting spreadshseet.xlsx',
    copies: 'Documents/Finance/Soastal Books/inbox/',
  })
}

export async function POST(req: Request) {
  const auth = ingestAuthorized(req)
  if (!auth.ok) return jsonError(401, 'Sign in with an office PIN, or send the field ingest key.')
  try {
    const intake = await readIntake(req)
    assertImportSourceAllowed(intake.originalName)
    if (isLiveWorkbookPath(intake.originalName)) {
      return jsonError(403, 'Import refused: that is Keith’s live original workbook.')
    }
    const books = await loadBooksJson()
    const result = applyScanIntake(books, {
      filename: intake.filename,
      originalName: intake.originalName,
      mimeType: intake.mimeType,
      size: intake.size,
      text: intake.text,
      vendor: intake.vendor,
      invoiceNumber: intake.invoiceNumber,
      jobName: intake.jobName,
      amount: intake.amount,
      kind: intake.kind,
      poNumber: intake.poNumber,
      source: auth.via === 'ingest-key' ? 'ingest-api' : 'office-scan',
    })
    if (intake.bytes.byteLength > 0) {
      await persistCopyBytes(result.document.storedPath, intake.bytes, intake.mimeType)
    }
    const path = await saveBooksJson(result.books, 'Documents/Finance/Soastal Books/soastal-books.json')
    return NextResponse.json({
      ok: true,
      proposal: result.document.proposal,
      document: result.document,
      copy: result.copy,
      books: result.books,
      store: path,
      message: result.document.proposal.summary,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const status = /refused|denylist|live original/i.test(message) ? 403 : 400
    return jsonError(status, message)
  }
}
