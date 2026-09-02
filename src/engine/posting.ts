import { LIVE_WRITE_REFUSED } from './denylist'
import { computeLedger, computeRow, isPaymentDocument, money, overrideIsRequired, overrideShouldBeBlank } from './formulas'
import type { CompanyBooks, FosterItem, LedgerRow, TransactionDraft, ValidationIssue } from './types'
import { AP_ACCOUNT } from './types'

export function validateRow(books: CompanyBooks, row: TransactionDraft): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const ledger = computeRow(books, row, books.transactions)
  if (!row.vendor.trim()) issues.push({ level: 'error', field: 'vendor', message: 'Vendor is required.' })
  if (!row.invoiceNumber.trim()) {
    issues.push({ level: 'error', field: 'invoiceNumber', message: 'Invoice / receipt # is required. One document = one number.' })
  }
  if (!row.postingDate) issues.push({ level: 'error', field: 'postingDate', message: 'Posting date is required.' })
  if (!row.paymentMethod) issues.push({ level: 'error', field: 'paymentMethod', message: 'Payment Method sets the offset. Required.' })
  if (!ledger.finalAccount) {
    issues.push({
      level: 'error',
      field: 'finalAccount',
      message: 'Final Account is empty. Line Item Map fills Labor/Equip/Materials when Job + Line Item exist; otherwise Override Account is required.',
    })
  }
  if (!ledger.offsetAccount) {
    issues.push({ level: 'error', field: 'offsetAccount', message: 'Offset Account is empty. Set Payment Method or a rare Offset Override.' })
  }
  if (overrideShouldBeBlank(row) && row.overrideAccount.trim()) {
    issues.push({
      level: 'warning',
      field: 'overrideAccount',
      message: 'Override Account should be blank when Job + Line Item exist — the Line Item Map fills Labor / Equipment / Materials.',
    })
  }
  if (overrideIsRequired(row) && !row.overrideAccount.trim()) {
    issues.push({
      level: 'error',
      field: 'overrideAccount',
      message: 'Override Account is required for Subcontractor, Overhead, Revenue, Liability, payroll tax, balance-sheet, and AP payments.',
    })
  }
  if (isPaymentDocument(row.invoiceNumber)) {
    if (row.jobName.trim()) {
      issues.push({
        level: 'error',
        field: 'jobName',
        message: 'AP payment documents leave Job blank. Cost was already recorded on the bill.',
      })
    }
    if (row.costType !== 'Liability') {
      issues.push({ level: 'error', field: 'costType', message: 'Paying a bill: Cost Type must be Liability (not a second job cost).' })
    }
    if (ledger.finalAccount !== AP_ACCOUNT) {
      issues.push({
        level: 'error',
        field: 'overrideAccount',
        message: 'Paying a bill: Override Account must be 2000 - Accounts Payable.',
      })
    }
    if (row.paymentMethod === 'Unpaid / AP' || row.paymentMethod === 'Billed / AR') {
      issues.push({
        level: 'error',
        field: 'paymentMethod',
        message: 'A payment uses Check / ACH / Wire / Debit Card / Credit Card / Cash — not Unpaid/AP. Cash moves on the payment, not the bill.',
      })
    }
    if (row.allocationAmount < 0) {
      issues.push({
        level: 'warning',
        field: 'allocationAmount',
        message: 'AP payments are money OUT: Allocation Amount should be positive.',
      })
    }
  }
  if (row.paymentMethod === 'Billed / AR' && row.allocationAmount > 0) {
    issues.push({
      level: 'warning',
      field: 'allocationAmount',
      message: 'Customer billing is money IN: Allocation Amount should be negative.',
    })
  }
  if (row.costType === 'Revenue' && row.allocationAmount > 0) {
    issues.push({
      level: 'warning',
      field: 'allocationAmount',
      message: 'Revenue is money IN (negative allocation).',
    })
  }
  if (row.approvalStatus === 'Paid' && !row.paidDate) {
    issues.push({
      level: 'error',
      field: 'paidDate',
      message: 'Mark Paid only when Foster sends the payment date and check/ACH number.',
    })
  }
  if (row.approvalStatus === 'Paid' && !row.checkRef.trim() && row.paymentMethod !== 'Cash' && row.paymentMethod !== 'Credit Card') {
    issues.push({
      level: 'error',
      field: 'checkRef',
      message: 'Paid rows need the check / ACH number Foster sent.',
    })
  }
  return issues
}

export function validateDocument(books: CompanyBooks, vendor: string, invoiceNumber: string): ValidationIssue[] {
  const group = books.transactions.filter(
    (r) => r.vendor === vendor && r.invoiceNumber === invoiceNumber,
  )
  const issues: ValidationIssue[] = []
  if (group.length === 0) return issues
  const rowsWithTotal = group.filter((r) => money(r.invoiceTotal) !== 0)
  if (rowsWithTotal.length > 1) {
    issues.push({
      level: 'error',
      field: 'invoiceTotal',
      message: 'Invoice Total is a CONTROL total. Put it on the FIRST split row only. Extra totals on later splits will break Difference.',
    })
  }
  if (rowsWithTotal.length === 0) {
    issues.push({
      level: 'error',
      field: 'invoiceTotal',
      message: 'This document has no Invoice Total. Put the control total on the first row.',
    })
  }
  const computed = computeRow(books, group[0], books.transactions)
  if (money(computed.difference) !== 0) {
    issues.push({
      level: 'error',
      field: 'difference',
      message: `Difference must be 0 (now ${computed.difference.toFixed(2)}). If you reused an invoice number for a payment, append -PMT — reusing the number makes Difference go red.`,
    })
  }
  for (const row of group) issues.push(...validateRow(books, row))
  return issues
}

export function canPost(books: CompanyBooks, transactionIds: string[]): { ok: boolean; issues: ValidationIssue[] } {
  const rows = books.transactions.filter((t) => transactionIds.includes(t.id))
  const issues: ValidationIssue[] = []
  const docs = new Set(rows.map((r) => `${r.vendor}|${r.invoiceNumber}`))
  for (const key of docs) {
    const [vendor, invoiceNumber] = key.split('|')
    issues.push(...validateDocument(books, vendor, invoiceNumber))
  }
  const errors = issues.filter((i) => i.level === 'error')
  return { ok: errors.length === 0, issues }
}

export function postDocument(books: CompanyBooks, transactionIds: string[]): CompanyBooks {
  const { ok, issues } = canPost(books, transactionIds)
  if (!ok) {
    throw new Error(issues.filter((i) => i.level === 'error').map((i) => i.message).join(' '))
  }
  return {
    ...books,
    savedAt: new Date().toISOString(),
    transactions: books.transactions.map((t) =>
      transactionIds.includes(t.id)
        ? {
            ...t,
            posted: true,
            approvalStatus: t.approvalStatus === 'Entered Only' ? 'Ready for Accountant' : t.approvalStatus,
          }
        : t,
    ),
  }
}

export function markPaid(
  books: CompanyBooks,
  transactionIds: string[],
  paidDate: string,
  paymentRef: string,
): CompanyBooks {
  if (!paidDate) throw new Error('Mark Paid only when Foster sends the payment date.')
  if (!paymentRef.trim()) throw new Error('Mark Paid only when Foster sends the check / ACH number.')
  return {
    ...books,
    savedAt: new Date().toISOString(),
    transactions: books.transactions.map((t) =>
      transactionIds.includes(t.id)
        ? { ...t, approvalStatus: 'Paid', paidDate, checkRef: paymentRef, posted: true }
        : t,
    ),
  }
}

export function enqueueFosterCoding(books: CompanyBooks, transactionIds: string[], reason: string): CompanyBooks {
  const rows = books.transactions.filter((t) => transactionIds.includes(t.id))
  if (rows.length === 0) return books
  const first = rows[0]
  const item: FosterItem = {
    id: newId('foster'),
    createdAt: new Date().toISOString(),
    kind: 'coding-confirm',
    transactionIds,
    vendor: first.vendor,
    invoiceNumber: first.invoiceNumber,
    jobName: first.jobName,
    proposedAccounts: computeLedger({ ...books, transactions: rows }).map(
      (r) => `${r.finalAccount} / offset ${r.offsetAccount}`,
    ),
    amount: money(rows.reduce((s, r) => s + r.allocationAmount, 0)),
    reason,
    decision: 'pending',
    decidedAt: '',
    fosterNote: '',
    paymentDate: '',
    paymentRef: '',
  }
  return {
    ...books,
    fosterQueue: [item, ...books.fosterQueue],
    transactions: books.transactions.map((t) =>
      transactionIds.includes(t.id) ? { ...t, approvalStatus: 'Needs Approval', posted: false } : t,
    ),
  }
}

export function decideFoster(
  books: CompanyBooks,
  fosterId: string,
  decision: 'yes' | 'no',
  note: string,
): CompanyBooks {
  const item = books.fosterQueue.find((f) => f.id === fosterId)
  if (!item) return books
  const decided: FosterItem = {
    ...item,
    decision,
    decidedAt: new Date().toISOString(),
    fosterNote: note,
  }
  let next: CompanyBooks = {
    ...books,
    savedAt: new Date().toISOString(),
    fosterQueue: books.fosterQueue.map((f) => (f.id === fosterId ? decided : f)),
  }
  if (decision === 'yes') {
    next = {
      ...next,
      transactions: next.transactions.map((t) =>
        item.transactionIds.includes(t.id)
          ? { ...t, approvalStatus: 'Ready for Accountant', poStatus: t.poStatus === 'Missing - Get Approval' ? 'No PO Required' : t.poStatus }
          : t,
      ),
      documents: (next.documents ?? []).map((d) =>
        d.fosterItemId === fosterId || d.transactionIds.some((id) => item.transactionIds.includes(id))
          ? { ...d, status: 'confirmed' }
          : d,
      ),
    }
    const gate = canPost(next, item.transactionIds)
    if (!gate.ok) return next
    return postDocument(next, item.transactionIds)
  }
  return {
    ...next,
    transactions: next.transactions.map((t) =>
      item.transactionIds.includes(t.id) ? { ...t, approvalStatus: 'Hold / Dispute', posted: false } : t,
    ),
    documents: (next.documents ?? []).map((d) =>
      d.fosterItemId === fosterId || d.transactionIds.some((id) => item.transactionIds.includes(id))
        ? { ...d, status: 'held' }
        : d,
    ),
  }
}

export function tryWriteDenied(path: string): never {
  void path
  throw new Error(LIVE_WRITE_REFUSED)
}

export function newId(prefix: string): string {
  const bytes = new Uint8Array(8)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(bytes)
  else {
    for (let i = 0; i < 8; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
  return `${prefix}_${hex}`
}

export function upsertTransactions(books: CompanyBooks, rows: TransactionDraft[]): CompanyBooks {
  const byId = new Map(books.transactions.map((t) => [t.id, t]))
  for (const row of rows) byId.set(row.id, row)
  return { ...books, savedAt: new Date().toISOString(), transactions: [...byId.values()] }
}

export function removeTransactions(books: CompanyBooks, ids: string[]): CompanyBooks {
  return {
    ...books,
    savedAt: new Date().toISOString(),
    transactions: books.transactions.filter((t) => !ids.includes(t.id)),
    fosterQueue: books.fosterQueue.filter((f) => !f.transactionIds.some((id) => ids.includes(id))),
  }
}

export function emptyDraft(partial: Partial<TransactionDraft> = {}): TransactionDraft {
  return {
    id: newId('txn'),
    postingDate: todayISO(),
    vendor: '',
    invoiceNumber: '',
    sourceType: 'Bill / Invoice',
    invoiceDate: todayISO(),
    dueDate: todayISO(),
    paymentMethod: 'Unpaid / AP',
    checkRef: '',
    invoiceTotal: 0,
    allocationAmount: 0,
    jobName: '',
    costType: 'Materials',
    lineItem: '',
    equipmentUnit: '',
    overrideAccount: '',
    poStatus: 'No PO Required',
    poNumber: '',
    approvalStatus: 'Entered Only',
    notes: '',
    offsetOverride: '',
    posted: false,
    paidDate: '',
    ...partial,
  }
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function ledgerById(books: CompanyBooks): Map<string, LedgerRow> {
  return new Map(computeLedger(books).map((r) => [r.id, r]))
}
