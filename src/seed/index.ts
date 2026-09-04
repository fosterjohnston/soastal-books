import { emptyDraft } from '../engine/posting'
import type {
  Account,
  AccountType,
  CompanyBooks,
  EquipmentUnit,
  Job,
  JobLineItem,
  LineItemMapRow,
  MonthEndItem,
  OpeningBalance,
  PaymentMethodMapRow,
  TransactionDraft,
  Vendor,
  VendorType,
} from '../engine/types'
import {
  APPROVAL_STATUSES,
  COST_TYPES,
  OVERHEAD_JOB_NAME,
  OVERHEAD_JOB_NUMBER,
  PAYMENT_METHODS,
  PO_STATUSES,
  SOURCE_TYPES,
} from '../engine/types'
import master from './workbook-master.json'
import workbookEntries from './workbook-entries.json'

function mapAccountType(category: string): AccountType {
  if (category === 'Asset') return 'Asset'
  if (category === 'Liability') return 'Liability'
  if (category === 'Equity') return 'Equity'
  if (category === 'Revenue') return 'Revenue'
  if (category === 'Job Cost') return 'Cost of Goods'
  return 'Expense'
}

export const CHART_OF_ACCOUNTS: Account[] = master.chartOfAccounts.map((a) => ({
  number: a.number,
  name: a.name,
  type: mapAccountType(a.category),
  category: a.category,
  description: a.description,
  active: a.active,
}))

export const PAYMENT_METHOD_MAP: PaymentMethodMapRow[] = [
  { paymentMethod: 'Unpaid / AP', offsetAccount: '2000', offsetName: 'Accounts Payable' },
  { paymentMethod: 'Billed / AR', offsetAccount: '1100', offsetName: 'Accounts Receivable' },
  { paymentMethod: 'Check', offsetAccount: '1000', offsetName: 'Operating Checking Account' },
  { paymentMethod: 'Debit Card', offsetAccount: '1000', offsetName: 'Operating Checking Account' },
  { paymentMethod: 'ACH / Wire', offsetAccount: '1000', offsetName: 'Operating Checking Account' },
  { paymentMethod: 'ACH', offsetAccount: '1000', offsetName: 'Operating Checking Account' },
  { paymentMethod: 'Wire', offsetAccount: '1000', offsetName: 'Operating Checking Account' },
  { paymentMethod: 'Deposit', offsetAccount: '1000', offsetName: 'Operating Checking Account' },
  { paymentMethod: 'Auto-Pay', offsetAccount: '1010', offsetName: 'Payroll Checking Account' },
  { paymentMethod: 'Cash', offsetAccount: '1050', offsetName: 'Petty Cash' },
  { paymentMethod: 'Credit Card', offsetAccount: '2100', offsetName: 'Credit Card - Company' },
]

export const JOBS: Job[] = master.jobs.map((j, i) => ({
  id: `job_${j.jobNumber || i + 1}`.replace(/\s+/g, '_'),
  jobName: j.jobName,
  jobNumber: j.jobName === OVERHEAD_JOB_NAME ? OVERHEAD_JOB_NUMBER : j.jobNumber,
  status: j.jobName === OVERHEAD_JOB_NAME ? 'Overhead' : (j.status as Job['status']) || 'Active',
  ownerCustomer: j.ownerCustomer,
  startDate: j.startDate,
  contractAmount: j.contractAmount,
  estimatedTotalCost: j.estimatedTotalCost,
  notes: j.notes,
  slot: j.jobName === OVERHEAD_JOB_NAME ? 30 : j.slot,
}))

const EXTRA_VENDORS: Vendor[] = [
  {
    id: 'v_vulcan',
    name: 'Vulcan Materials',
    type: 'Material Supplier',
    defaultAccount: '5270 - Job Materials - Aggregate & Stone',
    terms: 'Net 30',
    accountNumber: '',
    phoneEmail: '',
    active: true,
    notes: 'Stone / ABC — demo and scan matching',
  },
  {
    id: 'v_tt_short',
    name: 'T&T',
    type: 'Material Supplier',
    defaultAccount: '5250 - Job Materials - Storm Drainage',
    terms: 'Due on Receipt',
    accountNumber: '',
    phoneEmail: '',
    active: true,
    notes: 'Short name for T&T Precast scans',
  },
  {
    id: 'v_office',
    name: 'Office Supplier',
    type: 'Office / Overhead',
    defaultAccount: '6120 - Office Supplies',
    terms: 'Credit Card',
    accountNumber: '',
    phoneEmail: '',
    active: true,
    notes: '',
  },
]

export const VENDORS: Vendor[] = [
  ...master.vendors.map((v, i) => ({
    id: `ven_${i + 1}`,
    name: v.name,
    type: (v.type as VendorType) || 'Other',
    defaultAccount: v.defaultAccount,
    terms: v.terms,
    accountNumber: v.accountNumber,
    phoneEmail: v.phoneEmail,
    active: v.active,
    notes: v.notes,
  })),
  ...EXTRA_VENDORS.filter((extra) => !master.vendors.some((v) => v.name === extra.name)),
]

export const EQUIPMENT: EquipmentUnit[] = master.equipment.map((e, i) => ({
  id: `eq_${i + 1}`,
  name: e.name,
  unitNumber: e.unitNumber,
  type: e.type,
  ownership: e.ownership as EquipmentUnit['ownership'],
  rentalVendor: e.rentalVendor,
  monthlyRate: e.monthlyRate,
  internalRatePerHour: 0,
  burnGalPerHour: e.burnGalPerHour,
  defaultAccount: e.defaultAccount || '5190 - Job Equipment - Other',
  notes: e.notes,
  active: true,
}))

const EXTRA_MAP: LineItemMapRow[] = [
  {
    id: 'lim_abc',
    activity: 'ABC stone',
    category: 'Aggregate & Stone',
    laborAccount: '5070 - Job Labor - Aggregate & Stone',
    equipmentAccount: '5170 - Job Equipment - Aggregate & Stone',
    materialsAccount: '5270 - Job Materials - Aggregate & Stone',
  },
  {
    id: 'lim_riprap',
    activity: 'Riprap',
    category: 'Storm Drainage',
    laborAccount: '5050 - Job Labor - Storm Drainage',
    equipmentAccount: '5150 - Job Equipment - Storm Drainage',
    materialsAccount: '5250 - Job Materials - Storm Drainage',
  },
]

export const LINE_ITEM_MAP: LineItemMapRow[] = [
  ...master.lineItemMap.map((m, i) => ({
    id: `lim_${i + 1}`,
    activity: m.activity,
    category: m.category,
    laborAccount: m.laborAccount,
    equipmentAccount: m.equipmentAccount,
    materialsAccount: m.materialsAccount,
  })),
  ...EXTRA_MAP.filter((extra) => !master.lineItemMap.some((m) => m.activity.trim() === extra.activity)),
]

export const JOB_LINE_ITEMS: JobLineItem[] = [
  ...master.jobLineItems.map((s, i) => ({
    id: `sov_${i + 1}`,
    jobName: s.jobName,
    itemNumber: String(i + 1),
    description: s.description,
    unit: s.unit,
    bidQuantity: s.bidQuantity,
    unitPrice: s.unitPrice,
    estimatedCost: s.estimatedCost,
    activity: s.activity || s.description,
  })),
  {
    id: 'sov_abc',
    jobName: 'Fern Hill',
    itemNumber: 'ABC',
    description: 'ABC stone',
    unit: 'TN',
    bidQuantity: 1,
    unitPrice: 0,
    estimatedCost: 0,
    activity: 'ABC stone',
  },
  {
    id: 'sov_riprap',
    jobName: 'Fern Hill',
    itemNumber: 'RR',
    description: 'Riprap',
    unit: 'TN',
    bidQuantity: 1,
    unitPrice: 0,
    estimatedCost: 0,
    activity: 'Riprap',
  },
]

export const OPENING_BALANCES: OpeningBalance[] = master.openingBalances.map((o, i) => ({
  id: `ob_${o.accountNumber}_${i}`,
  asOfDate: o.asOfDate,
  accountNumber: o.accountNumber,
  amount: o.amount,
  memo: o.accountName,
}))

export const MONTH_END_ITEMS: MonthEndItem[] = master.monthEnd.map((m, i) => ({
  id: `mec_${i + 1}`,
  number: typeof m.n === 'number' ? m.n : i + 1,
  title: m.title,
  status: m.status || 'Not Started',
  completedBy: '',
  dateCompleted: '',
  fileLocation: '',
  notes: '',
  accountantFollowUp: '',
}))

export const WALKTHROUGH = [
  {
    heading: 'The two rules everything hangs on',
    body: '1. Sign. Money out is positive. Money in is negative. Always. A $500 bill is 500. A $500 check from a client is -500. That number goes in Invoice Total (control total on the first split only). 2. Payment Method sets the other side. You never type the offset account.',
  },
  {
    heading: 'The four questions, in order',
    body: '1. Which direction is the money going? Out is positive, in is negative. 2. How did it move? Payment Method sets the offset. 3. Is it a job cost? If yes, Job + Line Item; Override stays blank. If no, pick Override Account. 4. Does Difference read zero?',
  },
  {
    heading: 'Two-step entries (both sides of the books)',
    body: 'Client bill = Revenue / 4000. Client pays = Asset / 1100 + -PMT. Vendor bill = job cost / 2000; pay = Liability / 2000 + -PMT. Card charge then pay 2100. Loan = principal 2500/2510 + interest 7000. Skipped payroll = accrue then -PMT, do not hit Labor twice. Out of pocket = cost + AP to the person, reimburse clears 2000 — not a draw. Owner draw (rare) = 3100. Buy a machine = Asset. Rental = Transactions; Equipment Allocation is memo. Sub retainage = full invoice then −2050. Vendor credit = same coding, negative.',
  },
  ...master.walkthrough,
]
export const WORKBOOK_LISTS = master.lists
export const DEFAULT_SETTINGS = {
  workingDaysPerMonth: master.workingDaysPerMonth,
  fuelPricePerGallon: master.fuelPricePerGallon,
}

function pick<T extends string>(value: string, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly string[]).includes(value) ? (value as T) : fallback
}

function workbookTransaction(raw: (typeof workbookEntries.transactions)[number]): TransactionDraft {
  const paymentMethod = pick(raw.paymentMethod, PAYMENT_METHODS, 'Unpaid / AP')
  const approvalStatus = pick(raw.approvalStatus, APPROVAL_STATUSES, 'Entered Only')
  const methodEntered = Boolean(raw.paymentMethod)
  const posted =
    methodEntered && (approvalStatus === 'Paid' || approvalStatus === 'Ready for Accountant')
  return emptyDraft({
    id: `txn_wb_${raw.row}`,
    postingDate: raw.postingDate,
    vendor: raw.vendor,
    invoiceNumber: raw.invoiceNumber,
    sourceType: pick(raw.sourceType, SOURCE_TYPES, 'Bill / Invoice'),
    invoiceDate: raw.invoiceDate || raw.postingDate,
    dueDate: raw.dueDate,
    paymentMethod,
    checkRef: raw.checkRef,
    invoiceTotal: raw.invoiceTotal,
    allocationAmount: raw.allocationAmount,
    jobName: raw.jobName,
    costType: pick(raw.costType, COST_TYPES, 'Materials'),
    lineItem: raw.lineItem,
    equipmentUnit: raw.equipmentUnit,
    overrideAccount: raw.overrideAccount,
    poStatus: pick(raw.poStatus, PO_STATUSES, 'No PO Required'),
    poNumber: raw.poNumber,
    approvalStatus,
    notes: raw.notes,
    offsetOverride: raw.offsetOverride,
    posted,
    paidDate: approvalStatus === 'Paid' && methodEntered ? raw.postingDate : '',
  })
}

/** Keith’s Soastal Books copy — Transactions sheet rows with entered values. */
export function workbookJournal(): TransactionDraft[] {
  return workbookEntries.transactions.map(workbookTransaction)
}

export function isPlaceholderJournal(rows: { id: string }[]): boolean {
  if (!rows.length) return true
  return rows.every((r) => r.id.startsWith('txn_demo_'))
}

export function createEmptyBooks(): CompanyBooks {
  return {
    version: 1,
    companyName: 'Soastal LLC',
    savedAt: null,
    settings: { ...DEFAULT_SETTINGS },
    chartOfAccounts: CHART_OF_ACCOUNTS,
    jobs: JOBS,
    vendors: VENDORS,
    equipment: EQUIPMENT,
    lineItemMap: LINE_ITEM_MAP,
    jobLineItems: JOB_LINE_ITEMS,
    paymentMethodMap: PAYMENT_METHOD_MAP,
    transactions: workbookJournal(),
    equipmentAllocations: [],
    openingBalances: OPENING_BALANCES,
    fosterQueue: [],
    periodCloses: [],
    documents: [],
    copies: [],
    monthEndChecklist: MONTH_END_ITEMS,
  }
}

/** Fresh books with master data only — no demo journal. */
export function createMasterDataOnly(): CompanyBooks {
  return {
    ...createEmptyBooks(),
    transactions: [],
    fosterQueue: [],
    equipmentAllocations: [],
    openingBalances: [],
    documents: [],
    copies: [],
  }
}
