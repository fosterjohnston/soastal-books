import ExcelJS from 'exceljs'
import { assertImportSourceAllowed, isLiveWorkbookFilename } from './denylist'
import { computeLedger } from './formulas'
import type { CompanyBooks, TransactionDraft } from './types'
import { BOOKS_FOLDER, COMPANY_NAME, FORMULA_COLUMNS } from './types'

const TXN_HEADERS = [
  'Posting Date',
  'Vendor',
  'Invoice/Receipt #',
  'Source Type',
  'Invoice Date',
  'Due Date',
  'Payment Method',
  'Check/Ref #',
  'Invoice Total',
  'Allocation Amount',
  'Job',
  'Cost Type',
  'Line Item/Activity',
  'Equipment',
  'Suggested Account',
  'Override Account',
  'Final Account',
  'PO Status',
  'PO #',
  'Approval Status',
  'Total Allocated',
  'Difference',
  'Notes',
  'Invoice Key',
  'Offset Suggested',
  'Offset Override',
  'Offset Account',
  'Line Item on This Job?',
  'Account Category',
  'Offset Category',
  'Posted',
  'Paid Date',
] as const

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0C1F2E' } }
}

export async function exportWorkbook(books: CompanyBooks): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Soastal Books'
  wb.company = COMPANY_NAME
  wb.created = new Date()

  const cover = wb.addWorksheet('README')
  cover.addRows([
    ['Soastal Books — app-owned COPY'],
    ['Company', books.companyName],
    ['Saved', books.savedAt ?? ''],
    [],
    ['This file is a copy for Keith to open in Excel. It mirrors Transactions / Setup layout.'],
    ['NEVER overwrite Documents/Finance/Acounting spreadshseet.xlsx (Keith’s live original).'],
    ['Books folder:', 'Documents/Finance/Soastal Books/'],
    ['Sign convention:', 'Money OUT positive. Money IN negative.'],
    ['Basis:', 'ACCRUAL. Unpaid/AP then a separate -PMT payment. Do not collapse bill+cash.'],
    ['Formula columns (do not type):', FORMULA_COLUMNS.join(', ')],
    ['Standalone office books. Not the field app. No live sync with daily logs or budgets.'],
  ])

  const txn = wb.addWorksheet('Transactions')
  txn.addRow([...TXN_HEADERS])
  styleHeader(txn.getRow(1))
  for (const r of computeLedger(books)) {
    txn.addRow([
      r.postingDate,
      r.vendor,
      r.invoiceNumber,
      r.sourceType,
      r.invoiceDate,
      r.dueDate,
      r.paymentMethod,
      r.checkRef,
      r.invoiceTotal || '',
      r.allocationAmount,
      r.jobName,
      r.costType,
      r.lineItem,
      r.equipmentUnit,
      r.suggestedAccount,
      r.overrideAccount,
      r.finalAccount,
      r.poStatus,
      r.poNumber,
      r.approvalStatus,
      r.totalAllocated,
      r.difference,
      r.notes,
      r.invoiceKey,
      r.offsetSuggested,
      r.offsetOverride,
      r.offsetAccount,
      r.lineItemOnThisJob,
      r.accountCategory,
      r.offsetCategory,
      r.posted ? 'Y' : '',
      r.paidDate,
    ])
  }
  txn.views = [{ state: 'frozen', ySplit: 1 }]

  const jobs = wb.addWorksheet('Active Jobs')
  jobs.addRow(['Job Name', 'Job Number', 'Status', 'Owner/Customer', 'Start', 'Contract Amount', 'Estimated Total Cost', 'Slot', 'Notes'])
  styleHeader(jobs.getRow(1))
  for (const j of books.jobs) {
    jobs.addRow([j.jobName, j.jobNumber, j.status, j.ownerCustomer, j.startDate, j.contractAmount, j.estimatedTotalCost, j.slot, j.notes])
  }

  const vendors = wb.addWorksheet('Vendor Setup')
  vendors.addRow(['VendorList', 'Type', 'Default Account', 'Terms', 'Active', 'Notes'])
  styleHeader(vendors.getRow(1))
  for (const v of books.vendors) {
    vendors.addRow([v.name, v.type, v.defaultAccount, v.terms, v.active ? 'Y' : 'N', v.notes])
  }

  const eq = wb.addWorksheet('Equipment Master')
  eq.addRow(['Name', 'Unit #', 'Type', 'Ownership', 'Monthly Rate', 'Internal Rate/hr', 'Burn gal/hr', 'Default Account', 'Active'])
  styleHeader(eq.getRow(1))
  for (const e of books.equipment) {
    eq.addRow([e.name, e.unitNumber, e.type, e.ownership, e.monthlyRate, e.internalRatePerHour, e.burnGalPerHour, e.defaultAccount, e.active ? 'Y' : 'N'])
  }

  const map = wb.addWorksheet('Line Item Map')
  map.addRow(['Activity', 'Labor Account', 'Equip Account', 'Materials Account'])
  styleHeader(map.getRow(1))
  for (const m of books.lineItemMap) map.addRow([m.activity, m.laborAccount, m.equipmentAccount, m.materialsAccount])

  const sov = wb.addWorksheet('Job Line Items')
  sov.addRow(['Job Name', 'Item #', 'Description', 'Unit', 'Bid Qty', 'Activity'])
  styleHeader(sov.getRow(1))
  for (const s of books.jobLineItems) {
    sov.addRow([s.jobName, s.itemNumber, s.description, s.unit, s.bidQuantity, s.activity])
  }

  const pm = wb.addWorksheet('Payment Methods')
  pm.addRow(['Payment Method', 'Offset Account', 'Offset Name'])
  styleHeader(pm.getRow(1))
  for (const p of books.paymentMethodMap) pm.addRow([p.paymentMethod, p.offsetAccount, p.offsetName])

  const coa = wb.addWorksheet('Chart of Accounts')
  coa.addRow(['Number', 'Name', 'Type', 'Category', 'Description', 'Active'])
  styleHeader(coa.getRow(1))
  for (const a of books.chartOfAccounts) {
    coa.addRow([a.number, a.name, a.type, a.category, a.description, a.active ? 'Y' : 'N'])
  }

  const eaq = wb.addWorksheet('Equipment Allocation')
  eaq.addRow(['Date', 'Job', 'Equipment Id', 'Hours', 'Notes', 'MEMO ONLY — not a second expense'])
  styleHeader(eaq.getRow(1))
  for (const a of books.equipmentAllocations) {
    eaq.addRow([a.date, a.jobName, a.equipmentId, a.hours, a.notes])
  }

  const ob = wb.addWorksheet('Opening Balances')
  ob.addRow(['As Of', 'Account', 'Amount (native sign)', 'Memo'])
  styleHeader(ob.getRow(1))
  for (const o of books.openingBalances) ob.addRow([o.asOfDate, o.accountNumber, o.amount, o.memo])

  const buf = await wb.xlsx.writeBuffer()
  return buf as ArrayBuffer
}

export async function importWorkbookCopy(buffer: ArrayBuffer, filename: string, books: CompanyBooks): Promise<CompanyBooks> {
  assertImportSourceAllowed(filename)
  if (isLiveWorkbookFilename(filename)) assertImportSourceAllowed(filename)
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buffer)
  const sheet = wb.getWorksheet('Transactions')
  if (!sheet) throw new Error('That workbook has no Transactions sheet. Import a COPY that mirrors Keith’s layout.')
  const imported: TransactionDraft[] = []
  sheet.eachRow((row, i) => {
    if (i === 1) return
    const vendor = String(row.getCell(2).value ?? '').trim()
    const invoiceNumber = String(row.getCell(3).value ?? '').trim()
    if (!vendor && !invoiceNumber) return
    imported.push({
      id: `imp_${i}_${Date.now()}`,
      postingDate: cellDate(row.getCell(1)),
      vendor,
      invoiceNumber,
      sourceType: (String(row.getCell(4).value ?? 'Bill / Invoice') as TransactionDraft['sourceType']),
      invoiceDate: cellDate(row.getCell(5)),
      dueDate: cellDate(row.getCell(6)),
      paymentMethod: (String(row.getCell(7).value ?? 'Unpaid / AP') as TransactionDraft['paymentMethod']),
      checkRef: String(row.getCell(8).value ?? ''),
      invoiceTotal: num(row.getCell(9)),
      allocationAmount: num(row.getCell(10)),
      jobName: String(row.getCell(11).value ?? ''),
      costType: (String(row.getCell(12).value ?? 'Materials') as TransactionDraft['costType']),
      lineItem: String(row.getCell(13).value ?? ''),
      equipmentUnit: String(row.getCell(14).value ?? ''),
      overrideAccount: String(row.getCell(16).value ?? ''),
      poStatus: (String(row.getCell(18).value ?? 'No PO Required') as TransactionDraft['poStatus']),
      poNumber: String(row.getCell(19).value ?? ''),
      approvalStatus: (String(row.getCell(20).value ?? 'Entered Only') as TransactionDraft['approvalStatus']),
      notes: String(row.getCell(23).value ?? ''),
      offsetOverride: String(row.getCell(26).value ?? ''),
      posted: String(row.getCell(31).value ?? '') === 'Y',
      paidDate: cellDate(row.getCell(32)),
    })
  })
  return {
    ...books,
    savedAt: new Date().toISOString(),
    transactions: [...books.transactions, ...imported],
  }
}

function num(cell: ExcelJS.Cell): number {
  const v = cell.value
  if (typeof v === 'number') return v
  if (v && typeof v === 'object' && 'result' in v && typeof (v as { result: unknown }).result === 'number') {
    return (v as { result: number }).result
  }
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function cellDate(cell: ExcelJS.Cell): string {
  const v = cell.value
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  if (typeof v === 'string') return v.slice(0, 10)
  if (typeof v === 'number') {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30))
    const d = new Date(excelEpoch.getTime() + v * 86400000)
    return d.toISOString().slice(0, 10)
  }
  return ''
}

export const EXPORT_FILENAME = `${BOOKS_FOLDER} Export.xlsx`
export const DB_FILENAME = 'soastal-books.json'
