import { computeLedger, money, parseAccountNumber } from './formulas'
import {
  AP_ACCOUNT,
  AR_ACCOUNT,
  CASH_OFFSET_ACCOUNTS,
  type Account,
  type CompanyBooks,
  type LedgerRow,
  type OpeningBalance,
} from './types'

export type AccountBalance = {
  number: string
  name: string
  type: Account['type']
  category: string
  amount: number
}

function inPeriod(date: string, from?: string, to?: string): boolean {
  if (from && date < from) return false
  if (to && date > to) return false
  return true
}

/** Native-sign balance: +allocation on final, −allocation on offset, plus opening. */
export function trialBalances(books: CompanyBooks, from?: string, to?: string): AccountBalance[] {
  const map = new Map<string, number>()
  const bump = (acct: string, amt: number) => {
    const n = parseAccountNumber(acct)
    if (!n) return
    map.set(n, money((map.get(n) ?? 0) + amt))
  }
  for (const ob of books.openingBalances) {
    if (!to || ob.asOfDate <= to) bump(ob.accountNumber, ob.amount)
  }
  for (const row of computeLedger(books)) {
    if (!row.posted) continue
    if (!inPeriod(row.postingDate, from, to)) continue
    bump(row.finalAccount, row.allocationAmount)
    bump(row.offsetAccount, -row.allocationAmount)
  }
  return books.chartOfAccounts
    .filter((a) => a.active)
    .map((a) => ({
      number: a.number,
      name: a.name,
      type: a.type,
      category: a.category,
      amount: money(map.get(a.number) ?? 0),
    }))
}

export function openingByAccount(obs: OpeningBalance[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const ob of obs) {
    const n = parseAccountNumber(ob.accountNumber)
    m.set(n, money((m.get(n) ?? 0) + ob.amount))
  }
  return m
}

export type JobCostRow = {
  jobName: string
  jobNumber: string
  labor: number
  equipment: number
  materials: number
  subcontractor: number
  otherDirect: number
  overhead: number
  totalCost: number
  billed: number
  contract: number
  costVsBilled: number
  remainingToBill: number
}

const JOB_COST_TYPES = new Set(['Labor', 'Equipment', 'Materials', 'Subcontractor', 'Other Expense', 'Overhead'])

export function jobCosting(books: CompanyBooks, to?: string): JobCostRow[] {
  const rows = computeLedger(books).filter((r) => r.posted && (!to || r.postingDate <= to))
  return books.jobs
    .filter((j) => j.jobName !== 'N/A - Overhead' || true)
    .map((job) => {
      const mine = rows.filter((r) => r.jobName === job.jobName)
      const sumType = (t: string) => money(mine.filter((r) => r.costType === t).reduce((s, r) => s + r.allocationAmount, 0))
      const labor = sumType('Labor')
      const equipment = sumType('Equipment')
      const materials = sumType('Materials')
      const subcontractor = sumType('Subcontractor')
      const overhead = sumType('Overhead')
      const otherDirect = sumType('Other Expense')
      const totalCost = money(labor + equipment + materials + subcontractor + overhead + otherDirect)
      const billed = money(mine.filter((r) => r.costType === 'Revenue').reduce((s, r) => s + r.allocationAmount, 0))
      return {
        jobName: job.jobName,
        jobNumber: job.jobNumber,
        labor,
        equipment,
        materials,
        subcontractor,
        otherDirect,
        overhead,
        totalCost,
        billed,
        contract: job.contractAmount,
        costVsBilled: money(totalCost + billed),
        remainingToBill: money(job.contractAmount + billed),
      }
    })
}

export type JobCostByAccountRow = {
  jobName: string
  account: string
  accountName: string
  amount: number
}

export function jobCostByAccount(books: CompanyBooks, jobName?: string): JobCostByAccountRow[] {
  const rows = computeLedger(books).filter(
    (r) => r.posted && r.jobName && (!jobName || r.jobName === jobName) && JOB_COST_TYPES.has(r.costType),
  )
  const map = new Map<string, number>()
  for (const r of rows) {
    const k = `${r.jobName}|${r.finalAccount}`
    map.set(k, money((map.get(k) ?? 0) + r.allocationAmount))
  }
  const out: JobCostByAccountRow[] = []
  for (const [k, amount] of map) {
    const [job, account] = k.split('|')
    const acct = books.chartOfAccounts.find((a) => a.number === account)
    out.push({ jobName: job, account, accountName: acct?.name ?? '', amount })
  }
  return out.sort((a, b) => a.jobName.localeCompare(b.jobName) || a.account.localeCompare(b.account))
}

export type MonthlyPL = {
  month: string
  revenue: number
  jobCost: number
  overhead: number
  otherExpense: number
  netIncomeDisplay: number
  nativeTotal: number
}

function monthKey(date: string): string {
  return date.slice(0, 7)
}

export function pnlMonthly(books: CompanyBooks, year?: string): MonthlyPL[] {
  const rows = computeLedger(books).filter((r) => r.posted)
  const months = new Set<string>()
  for (const r of rows) {
    const m = monthKey(r.postingDate)
    if (!year || m.startsWith(year)) months.add(m)
  }
  if (months.size === 0) {
    const now = new Date().toISOString().slice(0, 7)
    if (!year || now.startsWith(year)) months.add(now)
  }
  return [...months].sort().map((month) => {
    const mine = rows.filter((r) => monthKey(r.postingDate) === month)
    return summarizePL(books, mine, month)
  })
}

function classifyPL(books: CompanyBooks, row: LedgerRow): 'revenue' | 'jobCost' | 'overhead' | 'other' | 'skip' {
  const acct = books.chartOfAccounts.find((a) => a.number === row.finalAccount)
  if (!acct) return 'skip'
  if (acct.type === 'Revenue' || row.costType === 'Revenue' || row.finalAccount.startsWith('4')) return 'revenue'
  if (acct.type === 'Cost of Goods' || row.finalAccount.startsWith('5')) return 'jobCost'
  if (acct.type === 'Expense' || row.finalAccount.startsWith('6')) {
    return row.costType === 'Overhead' || row.jobName === 'N/A - Overhead' ? 'overhead' : 'other'
  }
  return 'skip'
}

function summarizePL(books: CompanyBooks, rows: LedgerRow[], month: string): MonthlyPL {
  let revenue = 0
  let jobCost = 0
  let overhead = 0
  let otherExpense = 0
  for (const r of rows) {
    const c = classifyPL(books, r)
    if (c === 'revenue') revenue = money(revenue + r.allocationAmount)
    if (c === 'jobCost') jobCost = money(jobCost + r.allocationAmount)
    if (c === 'overhead') overhead = money(overhead + r.allocationAmount)
    if (c === 'other') otherExpense = money(otherExpense + r.allocationAmount)
  }
  const nativeTotal = money(revenue + jobCost + overhead + otherExpense)
  // Native: revenue negative, costs positive. Display net income is −native.
  return {
    month,
    revenue,
    jobCost,
    overhead,
    otherExpense,
    nativeTotal,
    netIncomeDisplay: money(-nativeTotal),
  }
}

export type PLByJob = MonthlyPL & { jobName: string }

export function pnlByJob(books: CompanyBooks): PLByJob[] {
  const rows = computeLedger(books).filter((r) => r.posted)
  const jobs = [...new Set(rows.map((r) => r.jobName || 'Unassigned'))]
  return jobs.map((jobName) => {
    const mine = rows.filter((r) => (r.jobName || 'Unassigned') === jobName)
    return { ...summarizePL(books, mine, 'all'), jobName }
  })
}

export type BalanceSheet = {
  asOf: string
  assets: AccountBalance[]
  liabilities: AccountBalance[]
  equity: AccountBalance[]
  totalAssets: number
  totalLiabilities: number
  totalEquity: number
  retainedFromPL: number
  difference: number
  balanced: boolean
}

export function balanceSheet(books: CompanyBooks, asOf: string): BalanceSheet {
  const bals = trialBalances(books, undefined, asOf)
  const assets = bals.filter((a) => a.type === 'Asset')
  const liabilities = bals.filter((a) => a.type === 'Liability')
  const equity = bals.filter((a) => a.type === 'Equity')
  const pl = bals.filter((a) => a.type === 'Revenue' || a.type === 'Cost of Goods' || a.type === 'Expense')
  const retainedFromPL = money(pl.reduce((s, a) => s + a.amount, 0))
  const totalAssets = money(assets.reduce((s, a) => s + a.amount, 0))
  const totalLiabilities = money(liabilities.reduce((s, a) => s + a.amount, 0))
  const totalEquity = money(equity.reduce((s, a) => s + a.amount, 0) + retainedFromPL)
  // Native sign: A + L + E + P/L should net to 0 if every row is allocation + opposite offset.
  const difference = money(totalAssets + totalLiabilities + totalEquity)
  return {
    asOf,
    assets,
    liabilities,
    equity,
    totalAssets,
    totalLiabilities,
    totalEquity,
    retainedFromPL,
    difference,
    balanced: Math.abs(difference) < 0.005,
  }
}

export type CashFlowRow = {
  month: string
  operatingChecking: number
  payrollChecking: number
  pettyCash: number
  netCash: number
}

export function cashFlow(books: CompanyBooks): CashFlowRow[] {
  const balsByMonth = new Map<string, { a: number; b: number; c: number }>()
  const bump = (month: string, acct: string, amt: number) => {
    const cur = balsByMonth.get(month) ?? { a: 0, b: 0, c: 0 }
    if (acct === '1000') cur.a = money(cur.a + amt)
    if (acct === '1010') cur.b = money(cur.b + amt)
    if (acct === '1050') cur.c = money(cur.c + amt)
    balsByMonth.set(month, cur)
  }
  for (const row of computeLedger(books).filter((r) => r.posted)) {
    const m = monthKey(row.postingDate)
    if (CASH_OFFSET_ACCOUNTS.includes(row.offsetAccount as (typeof CASH_OFFSET_ACCOUNTS)[number])) {
      bump(m, row.offsetAccount, -row.allocationAmount)
    }
    if (CASH_OFFSET_ACCOUNTS.includes(row.finalAccount as (typeof CASH_OFFSET_ACCOUNTS)[number])) {
      bump(m, row.finalAccount, row.allocationAmount)
    }
  }
  return [...balsByMonth.keys()].sort().map((month) => {
    const x = balsByMonth.get(month)!
    return {
      month,
      operatingChecking: x.a,
      payrollChecking: x.b,
      pettyCash: x.c,
      netCash: money(x.a + x.b + x.c),
    }
  })
}

export type AgingBucket = { current: number; d31: number; d61: number; d91: number; total: number }

export type AgingRow = {
  vendorOrCustomer: string
  jobName: string
  invoiceNumber: string
  dueDate: string
  amount: number
  daysPastDue: number
  bucket: keyof AgingBucket | 'current'
}

function bucketFor(days: number): AgingRow['bucket'] {
  if (days <= 0) return 'current'
  if (days <= 30) return 'current'
  if (days <= 60) return 'd31'
  if (days <= 90) return 'd61'
  return 'd91'
}

function netByDoc(
  books: CompanyBooks,
  account: string,
  asOf: string,
): Map<string, { amount: number; dueDate: string; party: string; job: string; invoice: string }> {
  const map = new Map<string, { amount: number; dueDate: string; party: string; job: string; invoice: string }>()
  const bump = (row: LedgerRow, amt: number) => {
    const baseInv = row.invoiceNumber.replace(/-PMT$/i, '')
    const key = `${row.vendor}|${baseInv}`
    const cur = map.get(key) ?? {
      amount: 0,
      dueDate: row.dueDate,
      party: row.vendor,
      job: row.jobName,
      invoice: baseInv,
    }
    cur.amount = money(cur.amount + amt)
    if (row.dueDate && !row.invoiceNumber.toUpperCase().endsWith('-PMT')) cur.dueDate = row.dueDate
    if (row.jobName) cur.job = row.jobName
    map.set(key, cur)
  }
  for (const row of computeLedger(books)) {
    if (!row.posted || row.postingDate > asOf) continue
    if (row.finalAccount === account) bump(row, row.allocationAmount)
    if (row.offsetAccount === account) bump(row, -row.allocationAmount)
  }
  return map
}

export function apAging(books: CompanyBooks, asOf: string): AgingRow[] {
  const map = netByDoc(books, AP_ACCOUNT, asOf)
  const out: AgingRow[] = []
  for (const v of map.values()) {
    // Bills credit AP (offset of positive cost) → AP native balance negative. Amount owed = −balance.
    const owed = money(-v.amount)
    if (Math.abs(owed) < 0.005) continue
    const days = daysBetween(v.dueDate, asOf)
    out.push({
      vendorOrCustomer: v.party,
      jobName: v.job,
      invoiceNumber: v.invoice,
      dueDate: v.dueDate,
      amount: owed,
      daysPastDue: Math.max(0, days),
      bucket: bucketFor(days),
    })
  }
  return out.sort((a, b) => a.dueDate.localeCompare(b.dueDate))
}

export function arAging(books: CompanyBooks, asOf: string): AgingRow[] {
  const map = netByDoc(books, AR_ACCOUNT, asOf)
  const out: AgingRow[] = []
  for (const v of map.values()) {
    // AR billed: negative revenue, offset 1100 gets −(negative) = positive native AR.
    const open = money(v.amount)
    if (Math.abs(open) < 0.005) continue
    const days = daysBetween(v.dueDate, asOf)
    out.push({
      vendorOrCustomer: v.party,
      jobName: v.job,
      invoiceNumber: v.invoice,
      dueDate: v.dueDate,
      amount: open,
      daysPastDue: Math.max(0, days),
      bucket: bucketFor(days),
    })
  }
  return out.sort((a, b) => a.jobName.localeCompare(b.jobName) || a.dueDate.localeCompare(b.dueDate))
}

export function sumAging(rows: AgingRow[]): AgingBucket {
  const b: AgingBucket = { current: 0, d31: 0, d61: 0, d91: 0, total: 0 }
  for (const r of rows) {
    b[r.bucket] = money(b[r.bucket] + r.amount)
    b.total = money(b.total + r.amount)
  }
  return b
}

function daysBetween(from: string, to: string): number {
  if (!from || !to) return 0
  const a = Date.parse(from)
  const b = Date.parse(to)
  if (Number.isNaN(a) || Number.isNaN(b)) return 0
  return Math.floor((b - a) / 86400000)
}

export type WipRow = {
  jobName: string
  jobNumber: string
  contract: number
  costToDate: number
  billedToDate: number
  overUnderBill: number
  remainingContract: number
  estimatedCost: number
  estimatedGross: number
}

export function wip(books: CompanyBooks, asOf: string): WipRow[] {
  return jobCosting(books, asOf)
    .filter((j) => j.jobName !== 'N/A - Overhead')
    .map((j) => {
      const billedDisplay = money(-j.billed)
      return {
        jobName: j.jobName,
        jobNumber: j.jobNumber,
        contract: j.contract,
        costToDate: j.totalCost,
        billedToDate: billedDisplay,
        overUnderBill: money(billedDisplay - j.totalCost),
        remainingContract: money(j.contract - billedDisplay),
        estimatedCost: books.jobs.find((x) => x.jobName === j.jobName)?.estimatedTotalCost ?? 0,
        estimatedGross: money(
          (books.jobs.find((x) => x.jobName === j.jobName)?.contractAmount ?? 0) -
            (books.jobs.find((x) => x.jobName === j.jobName)?.estimatedTotalCost ?? 0),
        ),
      }
    })
}

import { computeEquipmentAllocations, type EquipmentComputed } from './equipment'

export type EquipmentMemo = EquipmentComputed

export function equipmentMemos(books: CompanyBooks): EquipmentMemo[] {
  return computeEquipmentAllocations(books)
}

export const MONTH_END_CHECKLIST: { id: string; title: string; detail: string; owner: string }[] = [
  {
    id: 'bank-rec',
    title: 'Reconcile operating, payroll, and petty cash',
    detail:
      'This app is allocation + auto-offset, not a typed double-entry GL. The accountant still reconciles 1000 / 1010 / 1050 to bank statements.',
    owner: 'Accountant',
  },
  {
    id: 'cc-rec',
    title: 'Reconcile company credit card (2100)',
    detail: 'Match Credit Card payment-method rows to the card statement. Unpaid card charges stay on 2100 until paid.',
    owner: 'Accountant',
  },
  {
    id: 'ap-aging',
    title: 'Review AP aging vs vendor statements',
    detail: 'Open 2000 should equal unpaid bills. Payments are separate -PMT documents — confirm nothing was cash-basis collapsed.',
    owner: 'Foster / Accountant',
  },
  {
    id: 'ar-aging',
    title: 'Review AR aging by job vs pay apps',
    detail: 'Open 1100 should equal billed-not-collected. Deposits clear AR; they are not revenue.',
    owner: 'Keith / Foster',
  },
  {
    id: 'retainage',
    title: 'Retainage receivable / payable',
    detail: 'Confirm 1150 and 2050. Sub retainage is a negative row Override 2050, Cost Type Liability — not a second job cost.',
    owner: 'Accountant',
  },
  {
    id: 'accruals',
    title: 'Accruals Keith still books',
    detail: 'Payroll in transit, insurance, property tax, and other month-end accruals are accountant journal entries.',
    owner: 'Accountant',
  },
  {
    id: 'depr',
    title: 'Depreciation',
    detail: 'Owned equipment memo on Equipment Allocation is NOT depreciation. Accountant posts 6800 / contra-asset.',
    owner: 'Accountant',
  },
  {
    id: 'loan',
    title: 'Loan principal vs interest',
    detail: 'Do not dump the whole payment to expense. Split interest (6910) and principal (note payable).',
    owner: 'Accountant',
  },
  {
    id: 'wip',
    title: 'WIP / over-under billing',
    detail: 'Cost vs billed vs contract. Official under/over-billing entries on the statements are the accountant’s.',
    owner: 'Keith',
  },
  {
    id: 'handoff',
    title: 'Export Excel copy for Keith',
    detail: 'Save the Soastal Books copy (never the live Acounting spreadshseet.xlsx). Keith keeps the live GL.',
    owner: 'Foster',
  },
]
