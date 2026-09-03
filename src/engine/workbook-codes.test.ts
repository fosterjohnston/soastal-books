import { describe, expect, it } from 'vitest'
import { computeRow, offsetForPaymentMethod, suggestedAccountForRow } from './formulas'
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

  it('replaces a thin leftover job list with the workbook copy jobs', () => {
    const seed = createEmptyBooks()
    const stored = {
      ...seed,
      jobs: seed.jobs.filter((j) => j.jobName === 'Fern Hill' || j.jobName === 'N/A - Overhead'),
      openingBalances: seed.openingBalances.slice(0, 2),
      vendors: seed.vendors.slice(0, 3),
    }
    const next = hydrateBooks(stored)
    expect(next.jobs.some((j) => /craig farm/i.test(j.jobName))).toBe(true)
    expect(next.jobs.some((j) => /captian/i.test(j.jobName))).toBe(true)
    expect(next.openingBalances.length).toBeGreaterThan(20)
    expect(next.vendors.length).toBeGreaterThan(15)
  })

  it('fills missing copy journal rows instead of keeping a partial ledger', () => {
    const seed = createEmptyBooks()
    const payroll = seed.transactions.find((t) => t.invoiceNumber === 'Payroll 8.28.26')
    expect(payroll).toBeTruthy()
    const stored = {
      ...seed,
      transactions: [
        { ...seed.transactions[0], id: 'txn_wb_10', vendor: 'Seacoast' },
        { ...seed.transactions[0], id: 'txn_keith_new', vendor: 'Keith added' },
      ],
    }
    const next = hydrateBooks(stored)
    expect(next.transactions.some((t) => t.invoiceNumber === 'Payroll 8.28.26')).toBe(true)
    expect(next.transactions.some((t) => t.id === 'txn_wb_10')).toBe(true)
    expect(next.transactions.some((t) => t.id === 'txn_keith_new')).toBe(true)
    expect(next.transactions.filter((t) => t.id.startsWith('txn_wb_')).length).toBe(
      seed.transactions.length,
    )
  })

  it('fills ACH / Wire on an old payment-method map so cash posts have an offset', () => {
    const seed = createEmptyBooks()
    const stored = {
      ...seed,
      paymentMethodMap: seed.paymentMethodMap.filter((r) => r.paymentMethod !== 'ACH / Wire'),
    }
    const next = hydrateBooks(stored)
    expect(offsetForPaymentMethod(next, 'ACH / Wire').number).toBe('1000')
  })
})
