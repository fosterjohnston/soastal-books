import { describe, expect, it } from 'vitest'
import { computeLedger, computeRow, money } from './formulas'
import { askFosterReview, canPost, decideFoster, emptyDraft, markPaid, postDocument, upsertTransactions } from './posting'
import { apAging, arAging, jobCosting, trialBalances } from './reports'
import { AP_ACCOUNT, AR_ACCOUNT } from './types'
import { createEmptyBooks, createMasterDataOnly } from '../seed'

function books() {
  return createMasterDataOnly()
}

describe('sign convention', () => {
  it('treats money OUT as positive and money IN as negative', () => {
    let b = books()
    const out = emptyDraft({
      id: 't1',
      vendor: 'Vulcan Materials',
      invoiceNumber: 'OUT-1',
      paymentMethod: 'Unpaid / AP',
      invoiceTotal: 100,
      allocationAmount: 100,
      jobName: 'Fern Hill',
      costType: 'Materials',
      lineItem: 'ABC stone',
      posted: true,
      approvalStatus: 'Ready for Accountant',
    })
    const inn = emptyDraft({
      id: 't2',
      vendor: 'STYO',
      invoiceNumber: 'IN-1',
      paymentMethod: 'Billed / AR',
      sourceType: 'Bill / Invoice',
      invoiceTotal: -500,
      allocationAmount: -500,
      jobName: 'Fern Hill',
      costType: 'Revenue',
      overrideAccount: '4000',
      poStatus: 'Not Applicable',
      posted: true,
      approvalStatus: 'Ready for Accountant',
    })
    b = upsertTransactions(b, [out, inn])
    const ledger = computeLedger(b)
    expect(ledger.find((r) => r.id === 't1')!.allocationAmount).toBeGreaterThan(0)
    expect(ledger.find((r) => r.id === 't2')!.allocationAmount).toBeLessThan(0)
    const bals = trialBalances(b)
    const mat = bals.find((a) => a.number === '5270')
    const rev = bals.find((a) => a.number === '4000')
    expect(mat?.amount).toBe(100)
    expect(rev?.amount).toBe(-500)
  })
})

describe('accrual unpaid bill then payment', () => {
  it('hits job cost and AP on the bill, then payment clears AP without a second job cost', () => {
    let b = books()
    const bill = emptyDraft({
      id: 'bill',
      postingDate: '2026-08-01',
      vendor: 'Vulcan Materials',
      invoiceNumber: 'VM-1',
      dueDate: '2026-08-31',
      paymentMethod: 'Unpaid / AP',
      invoiceTotal: 1000,
      allocationAmount: 1000,
      jobName: 'Fern Hill',
      costType: 'Materials',
      lineItem: 'ABC stone',
      posted: true,
      approvalStatus: 'Ready for Accountant',
    })
    b = upsertTransactions(b, [bill])
    const afterBill = trialBalances(b)
    expect(afterBill.find((a) => a.number === '5270')?.amount).toBe(1000)
    expect(afterBill.find((a) => a.number === AP_ACCOUNT)?.amount).toBe(-1000)
    expect(afterBill.find((a) => a.number === '1000')?.amount ?? 0).toBe(0)
    const aging = apAging(b, '2026-08-15')
    expect(aging.some((r) => r.invoiceNumber === 'VM-1' && r.amount === 1000)).toBe(true)
    const costAfterBill = jobCosting(b).find((j) => j.jobName === 'Fern Hill')!.materials

    const pmt = emptyDraft({
      id: 'pmt',
      postingDate: '2026-08-20',
      vendor: 'Vulcan Materials',
      invoiceNumber: 'VM-1-PMT',
      dueDate: '2026-08-31',
      paymentMethod: 'Check',
      checkRef: '1001',
      invoiceTotal: 1000,
      allocationAmount: 1000,
      jobName: '',
      costType: 'Liability',
      overrideAccount: '2000 - Accounts Payable',
      poStatus: 'Not Applicable',
      approvalStatus: 'Paid',
      paidDate: '2026-08-20',
      posted: true,
    })
    b = upsertTransactions(b, [pmt])
    const afterPay = trialBalances(b)
    expect(afterPay.find((a) => a.number === AP_ACCOUNT)?.amount ?? 0).toBe(0)
    expect(afterPay.find((a) => a.number === '1000')?.amount).toBe(-1000)
    expect(afterPay.find((a) => a.number === '5270')?.amount).toBe(1000)
    const costAfterPay = jobCosting(b).find((j) => j.jobName === 'Fern Hill')!.materials
    expect(costAfterPay).toBe(costAfterBill)
    expect(apAging(b, '2026-08-21').filter((r) => r.invoiceNumber === 'VM-1')).toHaveLength(0)
  })

  it('reusing the invoice number instead of -PMT makes Difference go red', () => {
    let b = books()
    const bill = emptyDraft({
      id: 'bill',
      vendor: 'Vulcan Materials',
      invoiceNumber: 'VM-9',
      paymentMethod: 'Unpaid / AP',
      invoiceTotal: 1000,
      allocationAmount: 1000,
      jobName: 'Fern Hill',
      costType: 'Materials',
      lineItem: 'ABC stone',
    })
    const reuse = emptyDraft({
      id: 'reuse',
      vendor: 'Vulcan Materials',
      invoiceNumber: 'VM-9',
      paymentMethod: 'Check',
      invoiceTotal: 1000,
      allocationAmount: 1000,
      costType: 'Liability',
      overrideAccount: '2000',
    })
    b = upsertTransactions(b, [bill, reuse])
    const row = computeRow(b, bill, b.transactions)
    expect(money(row.difference)).not.toBe(0)
    expect(canPost(b, ['bill', 'reuse']).ok).toBe(false)
  })
})

describe('AR then deposit', () => {
  it('bills AR with negative allocation, then deposit clears AR without extra revenue', () => {
    let b = books()
    const invoice = emptyDraft({
      id: 'ar',
      postingDate: '2026-08-31',
      vendor: 'STYO',
      invoiceNumber: 'FH-01',
      dueDate: '2026-09-30',
      paymentMethod: 'Billed / AR',
      invoiceTotal: -50000,
      allocationAmount: -50000,
      jobName: 'Fern Hill',
      costType: 'Revenue',
      overrideAccount: '4000',
      poStatus: 'Not Applicable',
      posted: true,
      approvalStatus: 'Ready for Accountant',
    })
    b = upsertTransactions(b, [invoice])
    const afterBill = trialBalances(b)
    expect(afterBill.find((a) => a.number === '4000')?.amount).toBe(-50000)
    expect(afterBill.find((a) => a.number === AR_ACCOUNT)?.amount).toBe(50000)
    expect(arAging(b, '2026-09-01').some((r) => r.invoiceNumber === 'FH-01' && r.amount === 50000)).toBe(true)

    const deposit = emptyDraft({
      id: 'dep',
      postingDate: '2026-09-15',
      vendor: 'STYO',
      invoiceNumber: 'FH-01-PMT',
      dueDate: '2026-09-30',
      paymentMethod: 'Deposit',
      sourceType: 'Deposit / Revenue',
      invoiceTotal: -50000,
      allocationAmount: -50000,
      jobName: '',
      costType: 'Asset',
      overrideAccount: '1100 - Accounts Receivable',
      poStatus: 'Not Applicable',
      posted: true,
      approvalStatus: 'Paid',
      paidDate: '2026-09-15',
      checkRef: 'ACH-STYO',
    })
    b = upsertTransactions(b, [deposit])
    const afterDep = trialBalances(b)
    expect(afterDep.find((a) => a.number === AR_ACCOUNT)?.amount ?? 0).toBe(0)
    expect(afterDep.find((a) => a.number === '4000')?.amount).toBe(-50000)
    expect(afterDep.find((a) => a.number === '1000')?.amount).toBe(50000)
    expect(arAging(b, '2026-09-16').filter((r) => r.invoiceNumber === 'FH-01')).toHaveLength(0)
  })
})

describe('split Difference = 0', () => {
  it('shares vendor + invoice # and puts Invoice Total on the first row only', () => {
    let b = books()
    const a = emptyDraft({
      id: 's1',
      vendor: 'Vulcan Materials',
      invoiceNumber: 'VM-SPLIT',
      paymentMethod: 'Unpaid / AP',
      invoiceTotal: 300,
      allocationAmount: 100,
      jobName: 'Fern Hill',
      costType: 'Materials',
      lineItem: 'ABC stone',
    })
    const c = emptyDraft({
      id: 's2',
      vendor: 'Vulcan Materials',
      invoiceNumber: 'VM-SPLIT',
      paymentMethod: 'Unpaid / AP',
      invoiceTotal: 0,
      allocationAmount: 200,
      jobName: 'Fern Hill',
      costType: 'Materials',
      lineItem: 'Riprap',
    })
    b = upsertTransactions(b, [a, c])
    const row = computeRow(b, a, b.transactions)
    expect(row.totalAllocated).toBe(300)
    expect(row.difference).toBe(0)
    expect(canPost(b, ['s1', 's2']).ok).toBe(true)
  })
})

describe('posting gates', () => {
  it('refuses a paid check without a check number', () => {
    let b = books()
    const row = emptyDraft({
      id: 'p',
      vendor: 'Office Supplier',
      invoiceNumber: 'X-1',
      paymentMethod: 'Check',
      invoiceTotal: 10,
      allocationAmount: 10,
      jobName: 'N/A - Overhead',
      costType: 'Overhead',
      overrideAccount: '6120',
      approvalStatus: 'Paid',
      paidDate: '',
      checkRef: '',
    })
    b = upsertTransactions(b, [row])
    expect(canPost(b, ['p']).ok).toBe(false)
  })

  it('markPaid requires date and ref', () => {
    let b = books()
    const row = emptyDraft({
      id: 'p',
      vendor: 'Office Supplier',
      invoiceNumber: 'X-2',
      paymentMethod: 'Check',
      invoiceTotal: 10,
      allocationAmount: 10,
      jobName: 'N/A - Overhead',
      costType: 'Overhead',
      overrideAccount: '6120',
      posted: true,
      approvalStatus: 'Ready for Accountant',
    })
    b = upsertTransactions(b, [row])
    b = postDocument(b, ['p'])
    expect(() => markPaid(b, ['p'], '', '')).toThrow(/Payment date/)
    b = markPaid(b, ['p'], '2026-09-01', 'ACH-9')
    expect(b.transactions[0].approvalStatus).toBe('Paid')
  })
})

describe('already-paid posts and optional Foster review', () => {
  it('posts an ACH that already cleared cash, not AP', () => {
    let b = books()
    const row = emptyDraft({
      id: 'paid1',
      vendor: 'Office Supplier',
      invoiceNumber: 'OS-PAID',
      sourceType: 'Cash Purchase',
      paymentMethod: 'ACH / Wire',
      invoiceTotal: 214.88,
      allocationAmount: 214.88,
      jobName: 'N/A - Overhead',
      costType: 'Overhead',
      overrideAccount: '6120',
    })
    b = upsertTransactions(b, [row])
    expect(canPost(b, ['paid1']).ok).toBe(true)
    b = postDocument(b, ['paid1'])
    const posted = b.transactions.find((t) => t.id === 'paid1')!
    const ledger = computeLedger(b).find((t) => t.id === 'paid1')
    expect(posted.posted).toBe(true)
    expect(posted.approvalStatus).toBe('Paid')
    expect(posted.paidDate).toBe(posted.postingDate)
    expect(ledger?.offsetAccount).toBe('1000')
  })

  it('lets Keith ask Foster without blocking post', () => {
    let b = books()
    const row = emptyDraft({
      id: 'ask1',
      vendor: 'Ferguson',
      invoiceNumber: 'F-9',
      paymentMethod: 'Unpaid / AP',
      invoiceTotal: 100,
      allocationAmount: 100,
      jobName: 'Fern Hill',
      costType: 'Materials',
      lineItem: 'ABC stone',
    })
    b = upsertTransactions(b, [row])
    b = askFosterReview(b, ['ask1'], 'Is this Fern Hill or Sandy Run?')
    expect(b.fosterQueue[0]?.kind).toBe('keith-review')
    expect(b.fosterQueue[0]?.reason).toMatch(/Fern Hill/)
    expect(canPost(b, ['ask1']).ok).toBe(true)
    b = postDocument(b, ['ask1'])
    expect(b.transactions[0].posted).toBe(true)
    b = decideFoster(b, b.fosterQueue[0]!.id, 'yes', 'Yes, Fern Hill.')
    expect(b.transactions[0].posted).toBe(true)
    expect(b.fosterQueue[0]?.decision).toBe('yes')
    expect(b.fosterQueue[0]?.fosterNote).toMatch(/Fern Hill/)
  })
})

describe('workbook copy seed', () => {
  it('ships Keith’s copy journal, not the old demo Vulcan rows', () => {
    const b = createEmptyBooks()
    expect(b.transactions.length).toBeGreaterThan(70)
    expect(b.transactions.some((t) => t.id.startsWith('txn_demo_'))).toBe(false)
    expect(b.transactions.some((t) => t.invoiceNumber === 'Payroll 8.28.26')).toBe(true)
    expect(b.jobs.some((j) => j.jobName === 'Fern Hill')).toBe(true)
    expect(b.vendors.length).toBeGreaterThan(0)
    expect(b.chartOfAccounts.some((a) => a.number === '2000')).toBe(true)
    expect(b.transactions.some((t) => t.paymentMethod === 'Unpaid / AP')).toBe(true)
    expect(b.transactions.some((t) => t.paymentMethod === 'Billed / AR')).toBe(true)
    expect(b.equipmentAllocations).toEqual([])
  })
})
