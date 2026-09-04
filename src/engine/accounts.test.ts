import { describe, expect, it } from 'vitest'
import {
  buildSplitDocument,
  deriveAccount,
  displayAccount,
  documentDifference,
  paymentForSource,
} from './accounts'
import { canPost, emptyDraft, upsertTransactions } from './posting'
import { createMasterDataOnly } from '../seed'

describe('account mapping (offset + override)', () => {
  it('a one-line document uses Invoice Total as the only amount — no split required', () => {
    const books = createMasterDataOnly()
    const parts = buildSplitDocument(
      books,
      {
        sourceType: 'Check',
        paymentMethod: 'Check',
        postingDate: '2026-09-04',
        vendor: 'Seacoast',
        invoiceNumber: 'CHK-1',
        invoiceDate: '2026-09-04',
        dueDate: '',
        checkRef: '1001',
        invoiceTotal: 10000,
      },
      [{ jobName: 'Fern Hill', costType: 'Materials', lineItem: 'Water 8" DIP', allocationAmount: 10000 }],
    )
    expect(parts).toHaveLength(1)
    expect(parts[0].invoiceTotal).toBe(10000)
    expect(parts[0].allocationAmount).toBe(10000)
    expect(documentDifference(10000, [10000])).toBe(0)
  })

  it('sets payment method from what it is, same as the offset story', () => {
    expect(paymentForSource('Bill / Invoice')).toBe('Unpaid / AP')
    expect(paymentForSource('Check')).toBe('Check')
    expect(paymentForSource('Deposit / Revenue')).toBe('Deposit')
    expect(paymentForSource('Payroll')).toBe('ACH / Wire')
  })

  it('leaves Override blank for Labor/Equip/Materials when the Line Item Map hits', () => {
    const books = createMasterDataOnly()
    const d = deriveAccount(books, {
      sourceType: 'Bill / Invoice',
      paymentMethod: 'Unpaid / AP',
      costType: 'Materials',
      vendor: 'Vulcan Materials',
      jobName: 'Fern Hill',
      lineItem: 'Place Asphalt Base (Stone)',
      invoiceNumber: 'VM-1',
    })
    expect(d.shouldBeBlank).toBe(true)
    expect(d.required).toBe(false)
    expect(d.account).toBe('')
    expect(d.suggested).toMatch(/^5270/)
    expect(d.via).toBe('line-item-map')
  })

  it('derives Subcontractor, Revenue, Overhead, and AP payments without a manual pick', () => {
    const books = createMasterDataOnly()
    const sub = deriveAccount(books, {
      sourceType: 'Bill / Invoice',
      paymentMethod: 'Unpaid / AP',
      costType: 'Subcontractor',
      vendor: 'Cliff Ball',
      jobName: 'Fern Hill',
      lineItem: '',
      invoiceNumber: 'CB-1',
    })
    expect(sub.required).toBe(true)
    expect(sub.account).toMatch(/^5350|^53/)
    const rev = deriveAccount(books, {
      sourceType: 'Deposit / Revenue',
      paymentMethod: 'Billed / AR',
      costType: 'Revenue',
      vendor: 'STYO',
      jobName: 'Fern Hill',
      lineItem: '',
      invoiceNumber: 'INV-1',
    })
    expect(rev.account).toMatch(/^4000/)
    const oh = deriveAccount(books, {
      sourceType: 'Bill / Invoice',
      paymentMethod: 'Unpaid / AP',
      costType: 'Overhead',
      vendor: 'Staple\'s',
      jobName: 'N/A - Overhead',
      lineItem: '',
      invoiceNumber: 'ST-1',
    })
    expect(oh.account).toBeTruthy()
    const pmt = deriveAccount(books, {
      sourceType: 'Check',
      paymentMethod: 'Check',
      costType: 'Liability',
      vendor: 'Vulcan Materials',
      jobName: '',
      lineItem: '',
      invoiceNumber: 'VM-1-PMT',
    })
    expect(pmt.account).toMatch(/^2000/)
    const collect = deriveAccount(books, {
      sourceType: 'Deposit / Revenue',
      paymentMethod: 'Deposit',
      costType: 'Asset',
      vendor: 'STYO',
      jobName: 'Fern Hill',
      lineItem: '',
      invoiceNumber: 'PA-001-PMT',
    })
    expect(collect.account).toMatch(/^1100/)
    expect(collect.reason).toMatch(/not Revenue/i)
  })

  it('asks for an account when Asset / Equity cannot be derived', () => {
    const books = createMasterDataOnly()
    const d = deriveAccount(books, {
      sourceType: 'Journal Entry',
      paymentMethod: 'Unpaid / AP',
      costType: 'Equity',
      vendor: 'STYO',
      jobName: '',
      lineItem: '',
      invoiceNumber: 'JE-1',
    })
    expect(d.required).toBe(true)
    expect(d.via).toBe('none')
    expect(d.account).toBe('')
  })

  it('builds a split check: control total on the first row, each split keeps its line item', () => {
    const books = createMasterDataOnly()
    const parts = buildSplitDocument(
      books,
      {
        sourceType: 'Check',
        paymentMethod: 'Check',
        postingDate: '2026-09-04',
        vendor: 'Seacoast',
        invoiceNumber: 'CHK-200',
        invoiceDate: '2026-09-04',
        dueDate: '',
        checkRef: '4401',
        invoiceTotal: 200000,
      },
      [
        { jobName: 'Fern Hill', costType: 'Materials', lineItem: 'Sewer - 8" SDR 26 - (6-8)', allocationAmount: 100000 },
        { jobName: 'Fern Hill', costType: 'Materials', lineItem: 'Water 8" DIP', allocationAmount: 100000 },
      ],
    )
    expect(parts).toHaveLength(2)
    expect(parts[0].invoiceTotal).toBe(200000)
    expect(parts[1].invoiceTotal).toBe(0)
    expect(parts[0].allocationAmount).toBe(100000)
    expect(parts[1].lineItem).toMatch(/Water/)
    expect(documentDifference(200000, [100000, 100000])).toBe(0)
    const rows = parts.map((p, i) => emptyDraft({ ...p, id: `s${i}` }))
    expect(rows[0].overrideAccount).toBe('')
    expect(displayAccount(books, rows[0])).toMatch(/^5240/)
    expect(displayAccount(books, rows[1])).toMatch(/^5230/)
  })

  it('builds a 4-way invoice: $200k billed, $50k to each line, control total on the first row', () => {
    const books = createMasterDataOnly()
    const parts = buildSplitDocument(
      books,
      {
        sourceType: 'Bill / Invoice',
        paymentMethod: 'Unpaid / AP',
        postingDate: '2026-09-04',
        vendor: 'Seacoast',
        invoiceNumber: 'INV-200',
        invoiceDate: '2026-09-04',
        dueDate: '2026-10-04',
        checkRef: '',
        invoiceTotal: 200000,
      },
      [
        { jobName: 'Fern Hill', costType: 'Materials', lineItem: 'Sewer - 8" SDR 26 - (6-8)', allocationAmount: 50000 },
        { jobName: 'Fern Hill', costType: 'Materials', lineItem: 'Water 8" DIP', allocationAmount: 50000 },
        { jobName: 'Fern Hill', costType: 'Materials', lineItem: 'Place Asphalt Base (Stone)', allocationAmount: 50000 },
        { jobName: 'Fern Hill', costType: 'Subcontractor', lineItem: '', allocationAmount: 50000, overrideAccount: undefined },
      ],
    )
    expect(parts).toHaveLength(4)
    expect(parts[0].invoiceTotal).toBe(200000)
    expect(parts.slice(1).every((p) => p.invoiceTotal === 0)).toBe(true)
    expect(parts.map((p) => p.allocationAmount)).toEqual([50000, 50000, 50000, 50000])
    expect(documentDifference(200000, [50000, 50000, 50000, 50000])).toBe(0)
    expect(parts[3].overrideAccount).toMatch(/^5350|^53/)
    const rows = parts.map((p, i) => emptyDraft({ ...p, id: `inv${i}` }))
    expect(displayAccount(books, rows[0])).toMatch(/^5240/)
    expect(displayAccount(books, rows[1])).toMatch(/^5230/)
    expect(displayAccount(books, rows[2])).toMatch(/^5270/)
  })

  it('requires a line item or account when Labor / Equipment / Materials are not on the map', () => {
    const books = createMasterDataOnly()
    const d = deriveAccount(books, {
      sourceType: 'Bill / Invoice',
      paymentMethod: 'Unpaid / AP',
      costType: 'Materials',
      vendor: 'Vulcan Materials',
      jobName: 'Fern Hill',
      lineItem: '',
      invoiceNumber: 'VM-2',
    })
    expect(d.required).toBe(true)
    expect(d.account).toBe('')
    expect(d.via).toBe('none')
  })

  it('posts a derived subcontractor bill and a split check without a manual account pick', () => {
    const books = createMasterDataOnly()
    const bill = buildSplitDocument(
      books,
      {
        sourceType: 'Bill / Invoice',
        paymentMethod: 'Unpaid / AP',
        postingDate: '2026-09-04',
        vendor: 'Cliff Ball',
        invoiceNumber: 'CB-SPLIT',
        invoiceDate: '2026-09-04',
        dueDate: '2026-09-18',
        checkRef: '',
        invoiceTotal: 8000,
      },
      [{ jobName: 'Fern Hill', costType: 'Subcontractor', lineItem: '', allocationAmount: 8000 }],
    )
    const billRows = bill.map((p, i) => emptyDraft({ ...p, id: `cb${i}` }))
    const withBill = upsertTransactions(books, billRows)
    expect(billRows[0].overrideAccount).toMatch(/^5350/)
    expect(canPost(withBill, billRows.map((r) => r.id)).ok).toBe(true)

    const check = buildSplitDocument(
      books,
      {
        sourceType: 'Check',
        paymentMethod: 'Check',
        postingDate: '2026-09-04',
        vendor: 'Seacoast',
        invoiceNumber: 'CHK-200B',
        invoiceDate: '2026-09-04',
        dueDate: '',
        checkRef: '4402',
        invoiceTotal: 200000,
      },
      [
        { jobName: 'Fern Hill', costType: 'Materials', lineItem: 'Sewer - 8" SDR 26 - (6-8)', allocationAmount: 100000 },
        { jobName: 'Fern Hill', costType: 'Materials', lineItem: 'Water 8" DIP', allocationAmount: 100000 },
      ],
    )
    const checkRows = check.map((p, i) =>
      emptyDraft({ ...p, id: `chk${i}`, approvalStatus: 'Paid', paidDate: '2026-09-04' }),
    )
    const withCheck = upsertTransactions(books, checkRows)
    expect(canPost(withCheck, checkRows.map((r) => r.id)).ok).toBe(true)
  })
})
