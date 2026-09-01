import { LIVE_WORKBOOK_FILENAME } from './types'

const LIVE_NAME = LIVE_WORKBOOK_FILENAME.toLowerCase()

export function normalizeFsPath(filePath: string): string {
  return filePath.replace(/\\/g, '/').replace(/\/+/g, '/').toLowerCase()
}

/** True when a write would touch Keith's live original workbook. */
export function isLiveWorkbookPath(filePath: string): boolean {
  const n = normalizeFsPath(filePath)
  if (n.endsWith(`/${LIVE_NAME}`) || n === LIVE_NAME) return true
  if (n.includes(`/${LIVE_NAME}`)) return true
  // Misspelling is the denylist key — also catch URL-encoded and trailing query.
  if (n.includes('acounting%20spreadshseet.xlsx')) return true
  if (n.includes('acounting spreadshseet.xlsx')) return true
  return false
}

export function isLiveWorkbookFilename(name: string): boolean {
  return name.trim().toLowerCase() === LIVE_NAME
}

export const LIVE_WRITE_REFUSED =
  "Refused: Keith's live workbook Documents/Finance/Acounting spreadshseet.xlsx is denylisted. Soastal Books writes only an app-owned copy under Documents/Finance/Soastal Books/."

export function assertWritablePath(filePath: string): void {
  if (isLiveWorkbookPath(filePath)) {
    throw new Error(LIVE_WRITE_REFUSED)
  }
}

export function assertImportSourceAllowed(filePathOrName: string): void {
  if (isLiveWorkbookPath(filePathOrName) || isLiveWorkbookFilename(filePathOrName)) {
    throw new Error(
      'Import refused: that is Keith\'s live original. Save a COPY first, then import the copy. This app never opens the live file for write, and will not ingest it as a source of truth.',
    )
  }
}

export function isSoastalBooksDir(filePath: string): boolean {
  const n = normalizeFsPath(filePath)
  return n.includes('/documents/finance/soastal books') || n.endsWith('/soastal books') || n.includes('/soastal books/')
}
