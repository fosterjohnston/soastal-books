import { describe, expect, it } from 'vitest'
import { computeRow, suggestedAccountForRow } from './formulas'
import { costCodesForJob, networkDays } from './index'
import { emptyDraft } from './posting'
import { createEmptyBooks, createMasterDataOnly } from '../seed'
import { hydrateBooks } from './hydrate'

describe('workbook codes and autofill', () => {
  it('suggests materials account from the Line Item Map by line item name', () => {
    const books = createMasterDataOnly()
    const row = emptyDraft({
      costType: 'Materials',
      lineItem: 'Place Asphalt Base (Stone)',
      jobName: 'Fern Hill',
      vendor: 'Vulcan Materials',
    })
    expect(suggestedAccountForRow(books, row)).toMatch(/^5270/)
    const labor = emptyDraft({ costType: 'Labor', lineItem: 'Site Cut to Fill', jobName: 'Fern Hill' })
    expect(suggestedAccountForRow(books, labor)).toMatch(/^5010/)
  })

  it('flags line items that are not on the selected job SOV', () => {
    const books = createMasterDataOnly()
    const row = emptyDraft({
      vendor: 'Seacoast',
      invoiceNumber: 'X-1',
      jobName: 'No Such Job',
      costType: 'Materials',
      lineItem: 'Place Asphalt Base (Stone)',
    })
    const computed = computeRow(books, row, [row])
    expect(computed.lineItemOnThisJob).toBe('NOT ON THIS JOB')
  })

  it('builds cost codes for Fern Hill from SOV + map', () => {
    const rows = costCodesForJob(createMasterDataOnly(), 'Fern Hill')
    expect(rows.length).toBeGreaterThan(10)
    const stone = rows.find((r) => r.lineItem === 'Place Asphalt Base (Stone)')
    expect(stone?.materialsAccount).toMatch(/5270/)
  })

  it('counts NETWORKDAYS Mon–Fri like Excel', () => {
    expect(networkDays('2026-08-17', '2026-08-21')).toBe(5)
    expect(networkDays('2026-08-22', '2026-08-23')).toBe(0)
  })

  it('replaces leftover demo journal with the workbook copy', () => {
    const seed = createEmptyBooks()
    const stored = {
      ...seed,
      transactions: [
        {
          ...seed.transactions[0],
          id: 'txn_demo_vulcan_1',
          vendor: 'Vulcan Materials',
          invoiceNumber: 'VM-88421',
        },
        {
          ...seed.transactions[0],
          id: 'txn_scan_keep',
          vendor: 'Ferguson',
          invoiceNumber: 'SCAN-KEEP',
        },
      ],
    }
    const next = hydrateBooks(stored)
    expect(next.transactions.some((t) => t.invoiceNumber === 'Payroll 8.28.26')).toBe(true)
    expect(next.transactions.some((t) => t.id.startsWith('txn_demo_'))).toBe(false)
    expect(next.transactions.some((t) => t.id === 'txn_scan_keep')).toBe(true)
  })
})
