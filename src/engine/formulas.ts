import {
  AP_ACCOUNT,
  AR_ACCOUNT,
  COST_TYPES_REQUIRING_OVERRIDE,
  COST_TYPES_USING_LINE_MAP,
  type Account,
  type CompanyBooks,
  type ComputedFields,
  type LedgerRow,
  type PaymentMethod,
  type TransactionDraft,
} from './types'

export function money(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export function accountLabel(number: string, name?: string): string {
  if (!number) return ''
  return name ? `${number} - ${name}` : number
}

export function parseAccountNumber(value: string): string {
  const m = value.trim().match(/^(\d{4})/)
  return m ? m[1] : value.trim()
}

export function invoiceKey(vendor: string, invoiceNumber: string): string {
  return `${vendor.trim()}|${invoiceNumber.trim()}`
}

export function isPaymentDocument(invoiceNumber: string): boolean {
  return invoiceNumber.trim().toUpperCase().endsWith('-PMT')
}

export function baseInvoiceNumber(invoiceNumber: string): string {
  return invoiceNumber.trim().replace(/-PMT$/i, '')
}

export function offsetForPaymentMethod(
  books: CompanyBooks,
  method: PaymentMethod,
): { number: string; label: string } {
  const row = books.paymentMethodMap.find((r) => r.paymentMethod === method)
  if (!row) return { number: '', label: '' }
  return { number: parseAccountNumber(row.offsetAccount), label: `${row.offsetAccount} - ${row.offsetName}` }
}

export function findAccount(books: CompanyBooks, numberOrLabel: string): Account | undefined {
  const num = parseAccountNumber(numberOrLabel)
  return books.chartOfAccounts.find((a) => a.number === num)
}

export function suggestedAccountForRow(books: CompanyBooks, row: TransactionDraft): string {
  if (COST_TYPES_USING_LINE_MAP.includes(row.costType) && row.jobName && row.lineItem) {
    const sov = books.jobLineItems.find(
      (s) => s.jobName === row.jobName && (s.description === row.lineItem || s.itemNumber === row.lineItem),
    )
    const activity = sov?.activity ?? row.lineItem
    const map = books.lineItemMap.find((m) => m.activity === activity || m.activity === row.lineItem)
    if (map) {
      if (row.costType === 'Labor') return map.laborAccount
      if (row.costType === 'Equipment') return map.equipmentAccount
      if (row.costType === 'Materials') return map.materialsAccount
    }
  }
  const vendor = books.vendors.find((v) => v.name === row.vendor)
  if (vendor?.defaultAccount) return vendor.defaultAccount
  return ''
}

export function finalAccountForRow(_books: CompanyBooks, row: TransactionDraft, suggested: string): string {
  const override = row.overrideAccount.trim()
  if (override) return parseAccountNumber(override)
  return parseAccountNumber(suggested)
}

export function groupRows(rows: TransactionDraft[]): Map<string, TransactionDraft[]> {
  const map = new Map<string, TransactionDraft[]>()
  for (const row of rows) {
    const key = invoiceKey(row.vendor, row.invoiceNumber)
    const list = map.get(key) ?? []
    list.push(row)
    map.set(key, list)
  }
  return map
}

export function controlTotalForGroup(group: TransactionDraft[]): number {
  if (group.length === 0) return 0
  const withTotal = group.filter((r) => money(r.invoiceTotal) !== 0)
  if (withTotal.length === 0) return 0
  // First row in posting-date / id order carries the control total.
  const sorted = [...group].sort((a, b) => a.id.localeCompare(b.id))
  const first = sorted.find((r) => money(r.invoiceTotal) !== 0) ?? sorted[0]
  return money(first.invoiceTotal)
}

export function computeRow(books: CompanyBooks, row: TransactionDraft, all: TransactionDraft[]): LedgerRow {
  const suggested = suggestedAccountForRow(books, row)
  const finalAcct = finalAccountForRow(books, row, suggested)
  const offsetSug = offsetForPaymentMethod(books, row.paymentMethod)
  const offsetAcct = row.offsetOverride.trim()
    ? parseAccountNumber(row.offsetOverride)
    : offsetSug.number
  const key = invoiceKey(row.vendor, row.invoiceNumber)
  const group = all.filter((r) => invoiceKey(r.vendor, r.invoiceNumber) === key)
  const totalAllocated = money(group.reduce((s, r) => s + r.allocationAmount, 0))
  const control = controlTotalForGroup(group)
  const difference = money(control - totalAllocated)
  const onJob =
    row.jobName && row.lineItem
      ? books.jobLineItems.some(
          (s) =>
            s.jobName === row.jobName &&
            (s.description === row.lineItem || s.itemNumber === row.lineItem),
        )
        ? 'Yes'
        : row.jobName === 'N/A - Overhead'
          ? 'Overhead'
          : 'No'
      : ''
  const fa = findAccount(books, finalAcct)
  const oa = findAccount(books, offsetAcct)
  const computed: ComputedFields = {
    suggestedAccount: suggested,
    finalAccount: finalAcct,
    totalAllocated,
    difference,
    invoiceKey: key,
    offsetSuggested: offsetSug.number,
    offsetAccount: offsetAcct,
    lineItemOnThisJob: onJob,
    accountCategory: fa?.category ?? fa?.type ?? '',
    offsetCategory: oa?.category ?? oa?.type ?? '',
  }
  return { ...row, ...computed }
}

export function computeLedger(books: CompanyBooks): LedgerRow[] {
  return books.transactions.map((row) => computeRow(books, row, books.transactions))
}

export function overrideShouldBeBlank(row: TransactionDraft): boolean {
  return Boolean(
    row.jobName &&
      row.lineItem &&
      COST_TYPES_USING_LINE_MAP.includes(row.costType) &&
      row.jobName !== 'N/A - Overhead',
  )
}

export function overrideIsRequired(row: TransactionDraft): boolean {
  if (COST_TYPES_REQUIRING_OVERRIDE.includes(row.costType)) return true
  if (row.jobName === 'N/A - Overhead' && row.costType === 'Overhead') return true
  if (isPaymentDocument(row.invoiceNumber)) return true
  return false
}

/** Double-entry in native sign: +allocation to final, −allocation to offset. */
export function postingEntries(row: LedgerRow): { final: number; offset: number } {
  return { final: money(row.allocationAmount), offset: money(-row.allocationAmount) }
}

export function isApBill(row: TransactionDraft): boolean {
  return row.paymentMethod === 'Unpaid / AP' && !isPaymentDocument(row.invoiceNumber)
}

export function isApPayment(row: TransactionDraft): boolean {
  return isPaymentDocument(row.invoiceNumber) && parseAccountNumber(row.overrideAccount) === AP_ACCOUNT
}

export function isArInvoice(row: TransactionDraft): boolean {
  return row.paymentMethod === 'Billed / AR' && row.costType === 'Revenue'
}

export function isArDeposit(row: TransactionDraft): boolean {
  return (
    (row.paymentMethod === 'Deposit' || row.sourceType === 'Deposit / Revenue') &&
    parseAccountNumber(row.overrideAccount) === AR_ACCOUNT
  )
}

export function needsFosterCoding(row: TransactionDraft): boolean {
  return row.poStatus === 'Missing - Get Approval'
}

export function expectedApOffset(method: PaymentMethod): string {
  if (method === 'Unpaid / AP') return AP_ACCOUNT
  if (method === 'Billed / AR') return AR_ACCOUNT
  return ''
}

export type ActivityCostType = 'Labor' | 'Equipment' | 'Materials'
export function mapAccountFor(costType: ActivityCostType, labor: string, equip: string, mat: string): string {
  if (costType === 'Labor') return labor
  if (costType === 'Equipment') return equip
  return mat
}
