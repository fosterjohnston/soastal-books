import { computeLedger, findLineItemMap, money, parseAccountNumber } from './formulas'
import { computeEquipmentAllocations } from './equipment'
import type { Account, CompanyBooks, LedgerRow } from './types'

function inRange(date: string, from?: string, to?: string): boolean {
  if (from && date < from) return false
  if (to && date > to) return false
  return true
}

export function lastDayOfMonth(year: number, monthIndex: number): string {
  const d = new Date(Date.UTC(year, monthIndex + 1, 0))
  return d.toISOString().slice(0, 10)
}

export function monthColumns(yearStart: string): { key: string; from: string; to: string }[] {
  const start = yearStart.slice(0, 10) || `${new Date().getFullYear()}-01-01`
  const y = Number(start.slice(0, 4))
  const m0 = Number(start.slice(5, 7)) - 1
  const out: { key: string; from: string; to: string }[] = []
  for (let i = 0; i < 12; i++) {
    const dt = new Date(Date.UTC(y, m0 + i, 1))
    const yy = dt.getUTCFullYear()
    const mm = dt.getUTCMonth()
    const from = `${yy}-${String(mm + 1).padStart(2, '0')}-01`
    out.push({ key: from.slice(0, 7), from, to: lastDayOfMonth(yy, mm) })
  }
  return out
}

function postedRows(books: CompanyBooks, from?: string, to?: string, jobName?: string): LedgerRow[] {
  return computeLedger(books).filter((r) => {
    if (!r.posted) return false
    if (!inRange(r.postingDate, from, to)) return false
    if (jobName && r.jobName !== jobName) return false
    return true
  })
}

export function accountLabelOf(books: CompanyBooks, number: string): string {
  const a = books.chartOfAccounts.find((x) => x.number === number)
  return a ? `${a.number} - ${a.name}` : number
}

/** Native activity on an account from final (+) and offset (−). */
export function nativeHits(row: LedgerRow, accountNumber: string): number {
  let n = 0
  if (parseAccountNumber(row.finalAccount) === accountNumber) n = money(n + row.allocationAmount)
  if (parseAccountNumber(row.offsetAccount) === accountNumber) n = money(n - row.allocationAmount)
  return n
}

export type PlGridRow = {
  kind: 'header' | 'account' | 'total'
  label: string
  number?: string
  months: number[]
  total: number
}

function displayPlAmount(acct: Account | undefined, native: number): number {
  if (!acct) return native
  if (acct.type === 'Revenue') return money(-native)
  return native
}

export function pnlGrid(books: CompanyBooks, yearStart: string, jobName?: string): PlGridRow[] {
  const months = monthColumns(yearStart)
  const rows = postedRows(books, months[0]?.from, months[months.length - 1]?.to, jobName)
  const groups: { header: string; pred: (a: Account) => boolean }[] = [
    { header: 'REVENUE', pred: (a) => a.type === 'Revenue' },
    { header: 'JOB COST', pred: (a) => a.type === 'Cost of Goods' },
    { header: 'OVERHEAD', pred: (a) => a.type === 'Expense' && a.category === 'Overhead' },
    { header: 'OTHER EXPENSE', pred: (a) => a.type === 'Expense' && a.category !== 'Overhead' },
  ]
  const out: PlGridRow[] = []
  const totals: number[][] = []
  for (const g of groups) {
    out.push({ kind: 'header', label: g.header, months: months.map(() => 0), total: 0 })
    const accts = books.chartOfAccounts.filter((a) => a.active && g.pred(a))
    const sub = months.map(() => 0)
    for (const a of accts) {
      const vals = months.map((m) => {
        const native = money(
          rows.filter((r) => inRange(r.postingDate, m.from, m.to)).reduce((s, r) => s + nativeHits(r, a.number), 0),
        )
        return displayPlAmount(a, native)
      })
      if (vals.every((v) => Math.abs(v) < 0.005)) continue
      const total = money(vals.reduce((s, v) => s + v, 0))
      vals.forEach((v, i) => {
        sub[i] = money(sub[i] + v)
      })
      out.push({ kind: 'account', label: a.name, number: a.number, months: vals, total })
    }
    const subTotal = money(sub.reduce((s, v) => s + v, 0))
    out.push({ kind: 'total', label: `Total ${g.header.toLowerCase()}`, months: sub, total: subTotal })
    totals.push(sub)
  }
  const ni = months.map((_, i) => {
    const rev = totals[0]?.[i] ?? 0
    const costs = (totals[1]?.[i] ?? 0) + (totals[2]?.[i] ?? 0) + (totals[3]?.[i] ?? 0)
    return money(rev - costs)
  })
  out.push({
    kind: 'total',
    label: 'Net income',
    months: ni,
    total: money(ni.reduce((s, v) => s + v, 0)),
  })
  return out
}

export type BsGridRow = {
  kind: 'header' | 'account' | 'total'
  label: string
  number?: string
  months: number[]
}

export function balanceSheetMonthly(books: CompanyBooks, yearStart: string): BsGridRow[] {
  const months = monthColumns(yearStart)
  const openingAsOf = books.openingBalances[0]?.asOfDate || ''
  const rows = computeLedger(books).filter((r) => r.posted)
  const opening = (num: string, to: string) => {
    let n = 0
    for (const ob of books.openingBalances) {
      if (ob.accountNumber !== num) continue
      if (openingAsOf && to < ob.asOfDate) continue
      n = money(n + ob.amount)
    }
    return n
  }
  const groups: { header: string; pred: (a: Account) => boolean }[] = [
    { header: 'ASSETS', pred: (a) => a.type === 'Asset' },
    { header: 'LIABILITIES', pred: (a) => a.type === 'Liability' },
    { header: 'EQUITY', pred: (a) => a.type === 'Equity' },
  ]
  const out: BsGridRow[] = []
  const sectionTotals: number[][] = []
  for (const g of groups) {
    out.push({ kind: 'header', label: g.header, months: months.map(() => 0) })
    const accts = books.chartOfAccounts.filter((a) => a.active && g.pred(a))
    const sub = months.map(() => 0)
    for (const a of accts) {
      const vals = months.map((m) => {
        const activity = money(
          rows.filter((r) => r.postingDate <= m.to).reduce((s, r) => s + nativeHits(r, a.number), 0),
        )
        return money(opening(a.number, m.to) + activity)
      })
      if (vals.every((v) => Math.abs(v) < 0.005) && !books.openingBalances.some((o) => o.accountNumber === a.number && o.amount)) {
        continue
      }
      vals.forEach((v, i) => {
        sub[i] = money(sub[i] + v)
      })
      out.push({ kind: 'account', label: a.name, number: a.number, months: vals })
    }
    out.push({ kind: 'total', label: `Total ${g.header.toLowerCase()}`, months: sub })
    sectionTotals.push(sub)
  }
  const pl = books.chartOfAccounts.filter((a) => a.type === 'Revenue' || a.type === 'Cost of Goods' || a.type === 'Expense')
  const retained = months.map((m) =>
    money(
      pl.reduce((s, a) => {
        const activity = rows.filter((r) => r.postingDate <= m.to).reduce((x, r) => x + nativeHits(r, a.number), 0)
        return s + opening(a.number, m.to) + activity
      }, 0),
    ),
  )
  out.push({ kind: 'account', label: 'Current year P&L (retained)', months: retained })
  const equityPlus = (sectionTotals[2] ?? months.map(() => 0)).map((v, i) => money(v + retained[i]))
  const assets = sectionTotals[0] ?? months.map(() => 0)
  const liab = sectionTotals[1] ?? months.map(() => 0)
  out.push({
    kind: 'total',
    label: 'Liabilities + equity + P&L',
    months: liab.map((v, i) => money(v + equityPlus[i])),
  })
  out.push({
    kind: 'total',
    label: 'Difference (should be ~0)',
    months: assets.map((v, i) => money(v + liab[i] + equityPlus[i])),
  })
  return out
}

export type CashFlowStatement = {
  month: string
  start: number
  receivedRevenue: number
  paidLabor: number
  paidMaterials: number
  paidSub: number
  paidEquipment: number
  paidOverhead: number
  other: number
  net: number
  end: number
}

const CASH = new Set(['1000', '1010', '1050'])

export function cashFlowStatement(books: CompanyBooks, yearStart: string): CashFlowStatement[] {
  const months = monthColumns(yearStart)
  const openingCash = money(
    books.openingBalances.filter((o) => CASH.has(o.accountNumber)).reduce((s, o) => s + o.amount, 0),
  )
  const rows = computeLedger(books).filter((r) => r.posted)
  let running = openingCash
  return months.map((m) => {
    const mine = rows.filter((r) => inRange(r.postingDate, m.from, m.to))
    const cashHit = (r: LedgerRow) => {
      let n = 0
      if (CASH.has(parseAccountNumber(r.finalAccount))) n = money(n + r.allocationAmount)
      if (CASH.has(parseAccountNumber(r.offsetAccount))) n = money(n - r.allocationAmount)
      return n
    }
    const byType = (t: string) => money(mine.filter((r) => r.costType === t).reduce((s, r) => s + cashHit(r), 0))
    const receivedRevenue = money(-byType('Revenue'))
    const paidLabor = byType('Labor')
    const paidMaterials = byType('Materials')
    const paidSub = byType('Subcontractor')
    const paidEquipment = byType('Equipment')
    const paidOverhead = money(byType('Overhead') + byType('Other Expense'))
    const typed = new Set(['Revenue', 'Labor', 'Materials', 'Subcontractor', 'Equipment', 'Overhead', 'Other Expense'])
    const other = money(mine.filter((r) => !typed.has(r.costType)).reduce((s, r) => s + cashHit(r), 0))
    const net = money(
      mine.reduce((s, r) => s + cashHit(r), 0),
    )
    const start = running
    const end = money(start + net)
    running = end
    return {
      month: m.key,
      start,
      receivedRevenue,
      paidLabor,
      paidMaterials,
      paidSub,
      paidEquipment,
      paidOverhead,
      other,
      net,
      end,
    }
  })
}

export type LineItemCost = {
  lineItem: string
  labor: number
  equipment: number
  materials: number
  other: number
  total: number
}

export function jobCostByLineItem(books: CompanyBooks, jobName: string, from?: string, to?: string): LineItemCost[] {
  const rows = postedRows(books, from, to, jobName).filter((r) => r.costType !== 'Revenue')
  const map = new Map<string, LineItemCost>()
  for (const r of rows) {
    const key = r.lineItem || '(no line item)'
    const cur = map.get(key) ?? { lineItem: key, labor: 0, equipment: 0, materials: 0, other: 0, total: 0 }
    if (r.costType === 'Labor') cur.labor = money(cur.labor + r.allocationAmount)
    else if (r.costType === 'Equipment') cur.equipment = money(cur.equipment + r.allocationAmount)
    else if (r.costType === 'Materials') cur.materials = money(cur.materials + r.allocationAmount)
    else cur.other = money(cur.other + r.allocationAmount)
    cur.total = money(cur.labor + cur.equipment + cur.materials + cur.other)
    map.set(key, cur)
  }
  return [...map.values()].sort((a, b) => a.lineItem.localeCompare(b.lineItem))
}

export type CostCodeRow = {
  lineItem: string
  unit: string
  quantity: number
  laborAccount: string
  equipmentAccount: string
  materialsAccount: string
  mapped: string
}

export function costCodesForJob(books: CompanyBooks, jobName: string): CostCodeRow[] {
  return books.jobLineItems
    .filter((s) => s.jobName === jobName)
    .map((s) => {
      const map = findLineItemMap(books, s.description) || findLineItemMap(books, s.activity)
      return {
        lineItem: s.description,
        unit: s.unit,
        quantity: s.bidQuantity,
        laborAccount: map?.laborAccount || 'NOT IN MAP',
        equipmentAccount: map?.equipmentAccount || 'NOT IN MAP',
        materialsAccount: map?.materialsAccount || 'NOT IN MAP',
        mapped: map ? 'Yes' : 'ADD TO MAP',
      }
    })
}

export type AccountActivityRow = {
  number: string
  name: string
  category: string
  moneyOut: number
  moneyIn: number
  net: number
  count: number
}

export function accountSummary(books: CompanyBooks, from?: string, to?: string): AccountActivityRow[] {
  const rows = postedRows(books, from, to)
  return books.chartOfAccounts
    .filter((a) => a.active)
    .map((a) => {
      let moneyOut = 0
      let moneyIn = 0
      let count = 0
      for (const r of rows) {
        const hit = nativeHits(r, a.number)
        if (Math.abs(hit) < 0.005) continue
        count += 1
        if (hit > 0) moneyOut = money(moneyOut + hit)
        else moneyIn = money(moneyIn + -hit)
      }
      return {
        number: a.number,
        name: a.name,
        category: a.category,
        moneyOut,
        moneyIn,
        net: money(moneyOut - moneyIn),
        count,
      }
    })
}

export type CoaReportRow = {
  kind: 'header' | 'account' | 'total'
  number: string
  name: string
  net: number
  pct: number
  count: number
}

export function coaReport(books: CompanyBooks, from?: string, to?: string): CoaReportRow[] {
  const summary = accountSummary(books, from, to)
  const groups = ['Asset', 'Liability', 'Equity', 'Revenue', 'Job Cost', 'Overhead', 'Other Expense']
  const out: CoaReportRow[] = []
  for (const g of groups) {
    const rows = summary.filter((r) => r.category === g)
    const catNet = money(rows.reduce((s, r) => s + r.net, 0))
    out.push({ kind: 'header', number: '', name: g.toUpperCase(), net: catNet, pct: 1, count: 0 })
    for (const r of rows) {
      if (Math.abs(r.net) < 0.005 && r.count === 0) continue
      out.push({
        kind: 'account',
        number: r.number,
        name: r.name,
        net: r.net,
        pct: catNet === 0 ? 0 : r.net / catNet,
        count: r.count,
      })
    }
    out.push({ kind: 'total', number: '', name: `Total ${g}`, net: catNet, pct: 1, count: rows.reduce((s, r) => s + r.count, 0) })
  }
  return out
}

export type HandoffByJob = {
  jobName: string
  allocations: number
  labor: number
  equipment: number
  materials: number
  subcontractor: number
  overhead: number
  fieldMemo: number
}

export function accountantHandoff(books: CompanyBooks) {
  const ledger = computeLedger(books)
  const field = computeEquipmentAllocations(books)
  const byJob = new Map<string, HandoffByJob>()
  for (const r of ledger) {
    const job = r.jobName || '(no job)'
    const cur = byJob.get(job) ?? {
      jobName: job,
      allocations: 0,
      labor: 0,
      equipment: 0,
      materials: 0,
      subcontractor: 0,
      overhead: 0,
      fieldMemo: 0,
    }
    cur.allocations = money(cur.allocations + r.allocationAmount)
    if (r.costType === 'Labor') cur.labor = money(cur.labor + r.allocationAmount)
    if (r.costType === 'Equipment') cur.equipment = money(cur.equipment + r.allocationAmount)
    if (r.costType === 'Materials') cur.materials = money(cur.materials + r.allocationAmount)
    if (r.costType === 'Subcontractor') cur.subcontractor = money(cur.subcontractor + r.allocationAmount)
    if (r.costType === 'Overhead' || r.costType === 'Other Expense') cur.overhead = money(cur.overhead + r.allocationAmount)
    byJob.set(job, cur)
  }
  for (const f of field) {
    const cur = byJob.get(f.jobName) ?? {
      jobName: f.jobName || '(no job)',
      allocations: 0,
      labor: 0,
      equipment: 0,
      materials: 0,
      subcontractor: 0,
      overhead: 0,
      fieldMemo: 0,
    }
    cur.fieldMemo = money(cur.fieldMemo + f.totalMemo)
    byJob.set(f.jobName || '(no job)', cur)
  }
  return {
    totalAllocations: money(ledger.reduce((s, r) => s + r.allocationAmount, 0)),
    unallocatedDifference: money(
      [...new Set(ledger.map((r) => r.invoiceKey))].reduce((s, k) => {
        const row = ledger.find((r) => r.invoiceKey === k)
        return s + (row?.difference ?? 0)
      }, 0),
    ),
    fieldEquipment: money(field.reduce((s, r) => s + r.totalMemo, 0)),
    missingApproval: ledger.filter((r) => r.poStatus === 'Missing - Get Approval').length,
    onHold: ledger.filter((r) => r.approvalStatus === 'Hold / Dispute').length,
    byJob: [...byJob.values()].sort((a, b) => a.jobName.localeCompare(b.jobName)),
  }
}

export type AgingVendorRow = {
  party: string
  notDue: number
  d1: number
  d31: number
  d61: number
  d91: number
  noDue: number
  total: number
}

function bucketVendor(days: number, hasDue: boolean): keyof Omit<AgingVendorRow, 'party' | 'total'> {
  if (!hasDue) return 'noDue'
  if (days < 0) return 'notDue'
  if (days <= 30) return 'd1'
  if (days <= 60) return 'd31'
  if (days <= 90) return 'd61'
  return 'd91'
}

export function summarizeAging(
  rows: { vendorOrCustomer: string; jobName: string; amount: number; daysPastDue: number; dueDate: string }[],
  party: 'vendor' | 'job',
): AgingVendorRow[] {
  const map = new Map<string, AgingVendorRow>()
  for (const r of rows) {
    const name = party === 'job' ? r.jobName || '(no job)' : r.vendorOrCustomer || '(no vendor)'
    const cur = map.get(name) ?? {
      party: name,
      notDue: 0,
      d1: 0,
      d31: 0,
      d61: 0,
      d91: 0,
      noDue: 0,
      total: 0,
    }
    const b = bucketVendor(r.daysPastDue, Boolean(r.dueDate))
    cur[b] = money(cur[b] + r.amount)
    cur.total = money(cur.total + r.amount)
    map.set(name, cur)
  }
  return [...map.values()].sort((a, b) => a.party.localeCompare(b.party))
}

export function sovContractValue(qty: number, unitPrice: number): number {
  return money(qty * unitPrice)
}

export function fillDownJobName(rows: { jobName: string }[]): string[] {
  let prev = ''
  return rows.map((r) => {
    if (r.jobName) prev = r.jobName
    return r.jobName || prev
  })
}
