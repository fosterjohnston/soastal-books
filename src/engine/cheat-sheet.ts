import type { CostType, PaymentMethod, SourceType } from './types'

/** Transaction Cheat Sheet — the two rules everything hangs on. */
export const CHEAT_SHEET_RULES = [
  'Sign. Money out is positive. Money in is negative. Always. A $500 bill is 500. A $500 check from a client is -500.',
  'Payment Method sets the other side of the entry. You never type the offset account.',
] as const

export const CLIENT_BILL_THEN_PAY = {
  title: 'Client billed you, then paid — Revenue vs Asset',
  bill: 'When you send the bill: Cost type Revenue, Payment method Billed / AR, Invoice total negative (a $100,000 pay app is -100000). Override 4000 — Contract Revenue. That is the sale. Cash has not moved.',
  collect:
    'When the client pays that bill: same invoice number + -PMT, Cost type Asset, Payment method Deposit, Invoice total negative again. Override 1100 — Accounts Receivable. Cash up, AR down. Do not post Revenue a second time.',
  noPriorBill:
    'They paid and you never billed first: one row only, Deposit, Cost type Revenue, Override 4000. Cash and revenue move together. AR is never involved.',
} as const

export const CHEAT_SHEET_QUESTIONS = [
  'Which direction is the money going? Out is positive, in is negative.',
  'How did it move? Payment Method — that sets the other side.',
  'Is it a job cost? If yes, put the Job and Line Item and let the account fill. If no, pick Override Account.',
  'Does Difference read zero? If not, fix it before you post.',
] as const

export type MoneyDirection = 'out' | 'in'

export function moneyDirection(row: {
  sourceType?: SourceType | ''
  paymentMethod?: PaymentMethod | ''
  costType?: CostType | ''
}): MoneyDirection {
  if (row.costType === 'Revenue') return 'in'
  if (row.paymentMethod === 'Billed / AR' || row.paymentMethod === 'Deposit') return 'in'
  if (row.sourceType === 'Deposit / Revenue' || row.sourceType === 'Refund') return 'in'
  return 'out'
}

export function amountHasExpectedSign(amount: number, direction: MoneyDirection): boolean {
  if (!Number.isFinite(amount) || amount === 0) return true
  return direction === 'out' ? amount > 0 : amount < 0
}

export function invoiceTotalHint(direction: MoneyDirection): string {
  if (direction === 'in') {
    return 'Control total — goes here, not on later splits. Money in is negative: a $500 client check or pay app is -500.'
  }
  return 'Control total — goes here, not on later splits. Money out is positive: a $500 bill or check we write is 500.'
}

export function allocationHint(direction: MoneyDirection): string {
  if (direction === 'in') {
    return 'This split only. Same sign as Invoice total — money in is negative.'
  }
  return 'This split only. Same sign as Invoice total — money out is positive.'
}

export function paymentMethodHint(offsetLabel: string): string {
  const offset = offsetLabel ? ` Offset ${offsetLabel}.` : ''
  return `Sets the other side. Never type Offset Account.${offset}`
}

export function invoiceNumberHint(kind: 'vendor' | 'client' | 'any' = 'any'): string {
  if (kind === 'client') {
    return 'Same number as the bill you sent, plus -PMT (PA-001-PMT). Its own Invoice total — do not reuse the bill’s total on this row.'
  }
  if (kind === 'vendor') {
    return 'One document = one number. Paying a vendor bill later: same number + -PMT, with its own Invoice total.'
  }
  return 'One document = one number. Vendor payment or client collection: same number + -PMT, with its own Invoice total.'
}

export function overrideHint(reason?: string): string {
  return reason || 'Blank when Job + Line Item fill Labor / Equipment / Materials. Fill for overhead, revenue, receipts, loans, and balance-sheet rows.'
}

export function signMismatchMessage(amount: number, direction: MoneyDirection, field: 'Invoice total' | 'Split'): string | null {
  if (!Number.isFinite(amount) || amount === 0) return null
  if (amountHasExpectedSign(amount, direction)) return null
  if (direction === 'in') {
    return `${field} should be negative (money in). A $${Math.abs(amount).toLocaleString('en-US')} client check is -${Math.abs(amount)}.`
  }
  return `${field} should be positive (money out). A $${Math.abs(amount).toLocaleString('en-US')} bill is ${Math.abs(amount)}, not -${Math.abs(amount)}.`
}
