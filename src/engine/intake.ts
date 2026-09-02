import { assertImportSourceAllowed, assertCopyDestination, assertWritablePath } from './denylist'
import { copyRelativePath, detectKind, draftFromProposal, proposeCoding, type IntakeHints } from './propose'
import { enqueueFosterCoding, newId, upsertTransactions } from './posting'
import type { CompanyBooks, CopyRecord, DocumentKind, IntakeSource, ScannedDocument } from './types'

export type ScanIntakeInput = IntakeHints & {
  originalName: string
  mimeType?: string
  size?: number
  source?: IntakeSource
}

export type ScanIntakeResult = {
  books: CompanyBooks
  document: ScannedDocument
  copy: CopyRecord
}

export function applyScanIntake(books: CompanyBooks, input: ScanIntakeInput): ScanIntakeResult {
  assertImportSourceAllowed(input.originalName)
  assertImportSourceAllowed(input.filename)
  const id = newId('scan')
  const storedPath = copyRelativePath(id, input.originalName)
  assertWritablePath(storedPath)
  assertCopyDestination(storedPath)

  const proposal = proposeCoding(books, {
    filename: input.filename || input.originalName,
    text: input.text,
    vendor: input.vendor,
    invoiceNumber: input.invoiceNumber,
    jobName: input.jobName,
    amount: input.amount,
    kind: input.kind,
    poNumber: input.poNumber,
  })
  const draft = draftFromProposal(proposal)
  let next = upsertTransactions(books, [draft])
  const reason = `${proposal.summary} Foster yes, then post.`
  next = enqueueFosterCoding(next, [draft.id], reason)
  const foster = next.fosterQueue[0]
  const kind: DocumentKind = detectKind(input.originalName, input.kind)
  const document: ScannedDocument = {
    id,
    createdAt: new Date().toISOString(),
    originalName: input.originalName,
    storedPath,
    mimeType: input.mimeType || 'application/octet-stream',
    size: input.size ?? 0,
    kind,
    source: input.source ?? 'office-scan',
    proposal,
    transactionIds: [draft.id],
    fosterItemId: foster?.id ?? '',
    status: 'proposed',
  }
  const copy: CopyRecord = {
    id: newId('copy'),
    createdAt: document.createdAt,
    relativePath: storedPath,
    kind: 'scan',
    originalName: input.originalName,
    bytes: input.size ?? 0,
  }
  next = {
    ...next,
    documents: [document, ...(next.documents ?? [])],
    copies: [copy, ...(next.copies ?? [])],
  }
  return { books: next, document, copy }
}
