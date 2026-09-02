import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { assertCopyDestination, assertWritablePath } from '../engine'

function localCopyFile(relativePath: string): string {
  const safe = relativePath.replace(/\.\./g, '')
  return path.join(process.cwd(), '.data', 'copies', safe)
}

export async function persistCopyBytes(relativePath: string, bytes: Uint8Array, contentType: string): Promise<string> {
  assertWritablePath(relativePath)
  assertCopyDestination(relativePath)
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (token) {
    const { put } = await import('@vercel/blob')
    const result = await put(relativePath, Buffer.from(bytes), {
      access: 'private',
      token,
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType,
    })
    return result.pathname || relativePath
  }
  const dest = localCopyFile(relativePath)
  await mkdir(path.dirname(dest), { recursive: true })
  await writeFile(dest, Buffer.from(bytes))
  return relativePath
}
