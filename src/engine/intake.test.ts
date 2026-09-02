import { describe, expect, it } from 'vitest'
import { applyScanIntake } from './intake'
import { proposeCoding } from './propose'
import { assertCopyDestination, isLiveWorkbookPath } from './denylist'
import { createMasterDataOnly } from '../seed'

describe('scan coding proposal', () => {
  it('proposes Vulcan / Fern Hill / ABC stone / AP 2000 from a bill filename', () => {
    const books = createMasterDataOnly()
    const proposal = proposeCoding(books, {
      filename: 'Vulcan-Fern-Hill-ABC-stone-bill-VM-4412-$2500.pdf',
      kind: 'bill',
    })
    expect(proposal.vendor).toBe('Vulcan Materials')
    expect(proposal.jobName).toBe('Fern Hill')
    expect(proposal.costType).toBe('Materials')
    expect(proposal.lineItem).toMatch(/ABC stone/i)
    expect(proposal.paymentMethod).toBe('Unpaid / AP')
    expect(proposal.offsetAccount).toBe('2000')
    expect(proposal.amount).toBe(2500)
    expect(proposal.invoiceNumber.toUpperCase()).toContain('VM-4412')
    expect(proposal.summary.toLowerCase()).toContain('this is where i think it goes')
  })

  it('flags missing PO so Foster must confirm before post', () => {
    const books = createMasterDataOnly()
    const proposal = proposeCoding(books, { filename: 'T&T storm pipe invoice.pdf' })
    expect(proposal.poStatus).toBe('Missing - Get Approval')
    expect(proposal.vendor).toBe('T&T')
  })

  it('matches a PO number from the filename', () => {
    const books = createMasterDataOnly()
    const proposal = proposeCoding(books, { filename: 'po-1887-vulcan.pdf', kind: 'po' })
    expect(proposal.poStatus).toBe('Matched to PO')
    expect(proposal.poNumber).toMatch(/1887/)
  })
})

describe('scan intake', () => {
  it('writes a copy under Soastal Books, never the live xlsx, and queues Foster', () => {
    const books = createMasterDataOnly()
    const result = applyScanIntake(books, {
      filename: 'Vulcan Fern Hill ABC stone VM-88 $1000.pdf',
      originalName: 'Vulcan Fern Hill ABC stone VM-88 $1000.pdf',
      size: 1200,
      source: 'office-scan',
    })
    expect(result.document.storedPath).toMatch(/^Documents\/Finance\/Soastal Books\/inbox\//)
    expect(isLiveWorkbookPath(result.document.storedPath)).toBe(false)
    expect(result.books.fosterQueue[0]?.decision).toBe('pending')
    expect(result.books.transactions.some((t) => t.vendor === 'Vulcan Materials' && !t.posted)).toBe(true)
    expect(result.books.documents[0]?.status).toBe('proposed')
  })

  it('refuses Keith’s live workbook as an ingest source', () => {
    const books = createMasterDataOnly()
    expect(() =>
      applyScanIntake(books, {
        filename: 'Acounting spreadshseet.xlsx',
        originalName: 'Acounting spreadshseet.xlsx',
      }),
    ).toThrow(/live original/i)
  })

  it('refuses copy writes to the live workbook path', () => {
    expect(() => assertCopyDestination('Documents/Finance/Acounting spreadshseet.xlsx')).toThrow(/denylist/i)
    expect(() => assertCopyDestination('Documents/Finance/Soastal Books/inbox/scan.pdf')).not.toThrow()
  })
})
