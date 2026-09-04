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

export type RecipeGroupId = 'clients' | 'payables' | 'people' | 'jobs'

export type TwoStepRecipe = {
  id: string
  group: RecipeGroupId
  title: string
  when: string
  step1: string
  step2?: string
  never: string
}

export const RECIPE_GROUPS: { id: RecipeGroupId; label: string; blurb: string }[] = [
  { id: 'clients', label: 'Clients — money in', blurb: 'Negative Invoice total. The payment is not a second sale.' },
  { id: 'payables', label: 'Vendors, card, loan — money out', blurb: 'Positive Invoice total. Paying later is not a second cost.' },
  { id: 'people', label: 'Payroll, out of pocket, draw', blurb: 'Owe a person: accrue, then clear. Don’t expense the reimbursement.' },
  { id: 'jobs', label: 'Jobs, equipment, credits', blurb: 'One real cost on Transactions. Allocation tab is memo only.' },
]

export const TWO_STEP_RECIPES: TwoStepRecipe[] = [
  {
    id: 'client-bill',
    group: 'clients',
    title: 'You sent the client a bill',
    when: 'Pay app / invoice to STYO (or any owner). Cash is not here yet.',
    step1:
      'Cost type Revenue. Payment method Billed / AR. Invoice total negative (−100000). Override 4000. Job on the row. That is the sale: revenue up, AR (1100) up.',
    never: 'Do not use Deposit or 1000 yet. Cash has not moved.',
  },
  {
    id: 'client-collect',
    group: 'clients',
    title: 'Client paid a bill you already sent',
    when: 'They send $100,000 on a pay app you already posted.',
    step1:
      'Same invoice number + -PMT (PA-001-PMT). Cost type Asset. Payment method Deposit. Invoice total negative again. Override 1100. Cash up, AR down.',
    never: 'Do not post Revenue / 4000 again. The sale already happened.',
  },
  {
    id: 'client-cash-no-bill',
    group: 'clients',
    title: 'Client paid and you never billed first',
    when: 'Check in the door, no prior Billed / AR row.',
    step1: 'One row only. Deposit. Cost type Revenue. Override 4000. Invoice total negative. Cash and revenue move together.',
    never: 'Do not also create an AR invoice for the same money. AR is never involved.',
  },
  {
    id: 'vendor-bill',
    group: 'payables',
    title: 'Vendor bill you will pay later',
    when: 'Seacoast, Vulcan, a sub — invoice in hand, check not written.',
    step1:
      'Unpaid / AP. Job + line item (or Override if sub/overhead). Invoice total positive. Cost hits the job. You owe them on 2000.',
    step2:
      'When you pay: same number + -PMT. Job blank. Cost type Liability. Check / ACH. Override 2000. Invoice total positive (amount paid). Cash down, AP down.',
    never: 'Do not enter the check as materials or a sub again. That doubles the job cost and AP never clears.',
  },
  {
    id: 'card-then-pay',
    group: 'payables',
    title: 'Company card charge, then pay the statement',
    when: 'Fuel, parts, Amazon — charged to 2100, paid later.',
    step1: 'Payment method Credit Card. The real cost (job + line item, or Overhead + 6xxx). Invoice total positive. Offset is 2100.',
    step2: 'Paying the card: Job blank. Cost type Liability. Override 2100. Check or ACH. Invoice total positive.',
    never: 'Do not code the statement payment as another expense. The cost already landed on the charge.',
  },
  {
    id: 'loan-payment',
    group: 'payables',
    title: 'Loan payment — principal and interest',
    when: 'Equipment or truck loan. One bank draft, two rows, same ref.',
    step1: 'Row 1 — Invoice total = the whole payment. Cost type Liability. Job blank. Override 2500 (equipment) or 2510 (vehicle). Amount = principal.',
    step2: 'Row 2 — Invoice total blank. Cost type Overhead. Override 7000 Interest. Amount = interest. Difference must be 0.',
    never: 'Do not put the whole payment on interest or the whole payment on the loan. The balance sheet loan and the P&L both have to be right.',
  },
  {
    id: 'payroll-skip',
    group: 'people',
    title: 'Payroll got skipped — you still owe them',
    when: 'Work happened. You did not run payroll. Wages are a liability until cash leaves.',
    step1:
      'Accrue it. Number like PR-0831. Unpaid / AP (or Payroll). Cost type Labor + the job line item, or Overhead / 6000 for office. Invoice total positive. Job cost (or office wages) up, payable up.',
    step2:
      'When you catch up: PR-0831-PMT. Job blank. Cost type Liability. Override 2000 or 2200. Check / ACH. Invoice total positive. Cash down, payable down.',
    never: 'Do not wait and only enter labor when the catch-up check clears. That misses the liability and you will hit Labor twice if you also accrue.',
  },
  {
    id: 'out-of-pocket',
    group: 'people',
    title: 'Someone paid out of pocket — pay them back',
    when: 'Keith, a superintendent, or anyone floated a company bill. This is not a draw.',
    step1:
      'Vendor = the person (or the store). Job + line item for what they bought. Unpaid / AP. Invoice total positive. Cost hits the job. You owe them on 2000.',
    step2:
      'Reimburse: same number + -PMT. Job blank. Cost type Liability. Override 2000. Check. Cash to them, AP clears.',
    never: 'Do not write the reimbursement as another materials or overhead line. Do not use 3100 Owner’s Draw — they did not take profit, they floated the company.',
  },
  {
    id: 'owner-draw',
    group: 'people',
    title: 'Owner draw (rare)',
    when: 'Taking company cash with no bill and no job cost behind it. Not a regular Soastal path.',
    step1: 'Job blank. Cost type Equity. Override 3100. Check. Invoice total positive. Cash down, equity down. Not on the P&L.',
    never: 'Do not code a reimbursement, payroll, or a job cost as a draw.',
  },
  {
    id: 'buy-machine',
    group: 'jobs',
    title: 'Buying a machine (capitalize)',
    when: 'New excavator, truck, trailer — you own it.',
    step1: 'Job blank. Cost type Asset. Override 1500 / 1510 / 1520. Invoice total positive. That is a balance-sheet asset, not Fern Hill materials.',
    never: 'Do not put a purchased machine on a job line item. Rentals are different — see the next card.',
  },
  {
    id: 'rent-vs-alloc',
    group: 'jobs',
    title: 'Rented equipment vs Equipment Allocation',
    when: 'United Rentals invoice, or our own machine hours on a job.',
    step1:
      'Rental invoice: Transactions. Cost type Equipment. Job + line item. Payment method how you pay. That is the real money.',
    step2:
      'Our machines: Equipment Allocation is memo only (days / hours). It does not post cash, AP, or a second expense.',
    never: 'Do not enter the rental on Transactions and add it again from the allocation tab. One cost.',
  },
  {
    id: 'retainage',
    group: 'jobs',
    title: 'Subcontractor retainage',
    when: 'Sub bill is $10,000, you hold 10%.',
    step1: 'Row 1 — full $10,000. Unpaid / AP. Cost type Subcontractor. Invoice total 10000. Allocation 10000.',
    step2:
      'Row 2 — same invoice #. Invoice total blank. Allocation −1000. Cost type Liability. Override 2050 Retainage Payable. Difference 0.',
    never: 'Do not enter only the $9,000 net. AP and job cost would both be short.',
  },
  {
    id: 'vendor-credit',
    group: 'jobs',
    title: 'Vendor credit or refund',
    when: 'They take something back or cut you a credit memo.',
    step1:
      'Same vendor, same job, same cost type, same line item as the original. Invoice total negative. It backs the cost out where it went in.',
    never: 'Do not enter a vendor credit as Revenue / 4000. That is not a client sale.',
  },
]

export function matchingRecipeIds(ctx: {
  sourceType?: string
  paymentMethod?: string
  costType?: string
  invoiceNumber?: string
}): string[] {
  const src = ctx.sourceType || ''
  const pay = ctx.paymentMethod || ''
  const cost = ctx.costType || ''
  const pmt = /-pmt$/i.test(ctx.invoiceNumber || '')
  const ids: string[] = []
  if (pay === 'Billed / AR' || cost === 'Revenue') ids.push('client-bill', 'client-cash-no-bill')
  if (pay === 'Deposit' || src === 'Deposit / Revenue' || cost === 'Asset') ids.push('client-collect', 'client-cash-no-bill')
  if (pay === 'Unpaid / AP' || src === 'Bill / Invoice') ids.push('vendor-bill', 'out-of-pocket', 'retainage')
  if (pmt && (pay === 'Check' || pay === 'ACH / Wire')) ids.push('vendor-bill', 'out-of-pocket', 'payroll-skip')
  if (pay === 'Credit Card' || (pmt && cost === 'Liability')) ids.push('card-then-pay')
  if (pay === 'Auto-Pay' || cost === 'Equity') ids.push(cost === 'Equity' ? 'owner-draw' : 'loan-payment')
  if (src === 'Payroll' || cost === 'Labor') ids.push('payroll-skip')
  if (cost === 'Equipment' || cost === 'Asset') ids.push('buy-machine', 'rent-vs-alloc')
  if (cost === 'Subcontractor') ids.push('retainage', 'vendor-bill')
  return [...new Set(ids)]
}

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
