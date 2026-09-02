import { NextResponse } from 'next/server'
import { persistCopyBytes } from '@/lib/copy-store'
import { sessionFromRequest } from '@/lib/office-auth'
import { assertCopyDestination, assertImportSourceAllowed } from '@/engine'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const session = sessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Sign in with an office PIN.' }, { status: 401 })
  try {
    const form = await req.formData()
    const file = form.get('file')
    const relativePath = String(form.get('path') || '')
    if (!(file instanceof File) || !relativePath) {
      return NextResponse.json({ error: 'file and path are required.' }, { status: 400 })
    }
    assertImportSourceAllowed(file.name)
    assertCopyDestination(relativePath)
    const stored = await persistCopyBytes(relativePath, new Uint8Array(await file.arrayBuffer()), file.type || 'application/octet-stream')
    return NextResponse.json({ ok: true, path: stored })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 })
  }
}
