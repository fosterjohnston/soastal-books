import { assertImportSourceAllowed, isLiveWorkbookPath } from './denylist'
import type { CompanyBooks } from './types'

export const EXPORT_FILENAME = 'Soastal-Books-copy.xlsx'
export const DB_FILENAME = 'soastal-books.json'

/** Browser app does not write .xlsx. Copies live in the ledger, never Keith’s live file. */
export async function exportWorkbook(_books: CompanyBooks): Promise<ArrayBuffer> {
  throw new Error('Excel export is disabled in the office web app. Use the on-screen ledger. Never write Documents/Finance/Acounting spreadshseet.xlsx.')
}

export async function importWorkbookCopy(buffer: ArrayBuffer, sourceName: string): Promise<CompanyBooks> {
  assertImportSourceAllowed(sourceName)
  if (isLiveWorkbookPath(sourceName)) {
    throw new Error('Import refused.')
  }
  void buffer
  throw new Error('Excel import is disabled in the office web app. Work in the on-screen ledger.')
}
