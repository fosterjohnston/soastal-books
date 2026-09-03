import { emptyDraft, newId } from '../engine/posting'
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
  Vendor,
  VendorType,
} from '../engine/types'
import { OVERHEAD_JOB_NAME, OVERHEAD_JOB_NUMBER } from '../engine/types'
import master from './workbook-master.json'

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

export const WALKTHROUGH = master.walkthrough
export const WORKBOOK_LISTS = master.lists
export const DEFAULT_SETTINGS = {
  workingDaysPerMonth: master.workingDaysPerMonth,
  fuelPricePerGallon: master.fuelPricePerGallon,
}

function demoBooks(): Pick<CompanyBooks, 'transactions' | 'fosterQueue' | 'equipmentAllocations'> {
  const billId = 'txn_demo_vulcan_1'
  const billSplit = 'txn_demo_vulcan_2'
  const payId = 'txn_demo_vulcan_pmt'
  const arId = 'txn_demo_ar_1'
  const cashId = 'txn_demo_cash_1'
  const fosterBill = 'txn_demo_foster_1'

  return {
    transactions: [
      emptyDraft({
        id: billId,
        postingDate: '2026-08-12',
        vendor: 'Vulcan Materials',
        invoiceNumber: 'VM-88421',
        sourceType: 'Bill / Invoice',
        invoiceDate: '2026-08-10',
        dueDate: '2026-09-09',
        paymentMethod: 'Unpaid / AP',
        invoiceTotal: 18420.5,
        allocationAmount: 12100,
        jobName: 'Fern Hill',
        costType: 'Materials',
        lineItem: 'Place Asphalt Base (Stone)',
        poStatus: 'No PO Required',
        approvalStatus: 'Ready for Accountant',
        posted: true,
        notes: 'Accrual bill — hits job cost AND AP. Cash does not move.',
      }),
      emptyDraft({
        id: billSplit,
        postingDate: '2026-08-12',
        vendor: 'Vulcan Materials',
        invoiceNumber: 'VM-88421',
        sourceType: 'Bill / Invoice',
        invoiceDate: '2026-08-10',
        dueDate: '2026-09-09',
        paymentMethod: 'Unpaid / AP',
        invoiceTotal: 0,
        allocationAmount: 6320.5,
        jobName: 'Fern Hill',
        costType: 'Materials',
        lineItem: 'Rip Rap',
        poStatus: 'No PO Required',
        approvalStatus: 'Ready for Accountant',
        posted: true,
        notes: 'Split row — same vendor + invoice. Invoice Total on first row only.',
      }),
      emptyDraft({
        id: payId,
        postingDate: '2026-08-28',
        vendor: 'Vulcan Materials',
        invoiceNumber: 'VM-88100-PMT',
        sourceType: 'Check',
        invoiceDate: '2026-08-01',
        dueDate: '2026-08-31',
        paymentMethod: 'Check',
        checkRef: '1042',
        invoiceTotal: 6400,
        allocationAmount: 6400,
        jobName: '',
        costType: 'Liability',
        lineItem: '',
        overrideAccount: '2000 - Accounts Payable',
        poStatus: 'Not Applicable',
        approvalStatus: 'Paid',
        paidDate: '2026-08-28',
        posted: true,
        notes: 'Payment of a prior bill (VM-88100). Job blank. Not a second job cost.',
      }),
      emptyDraft({
        id: 'txn_demo_prior_bill',
        postingDate: '2026-08-01',
        vendor: 'Vulcan Materials',
        invoiceNumber: 'VM-88100',
        sourceType: 'Bill / Invoice',
        invoiceDate: '2026-08-01',
        dueDate: '2026-08-31',
        paymentMethod: 'Unpaid / AP',
        invoiceTotal: 6400,
        allocationAmount: 6400,
        jobName: 'Fern Hill',
        costType: 'Materials',
        lineItem: 'Place Asphalt Base (Stone)',
        poStatus: 'No PO Required',
        approvalStatus: 'Ready for Accountant',
        posted: true,
        notes: 'Original bill that VM-88100-PMT cleared.',
      }),
      emptyDraft({
        id: arId,
        postingDate: '2026-08-31',
        vendor: 'STYO',
        invoiceNumber: 'FH-PAYAPP-01',
        sourceType: 'Bill / Invoice',
        invoiceDate: '2026-08-31',
        dueDate: '2026-09-30',
        paymentMethod: 'Billed / AR',
        invoiceTotal: -125000,
        allocationAmount: -125000,
        jobName: 'Fern Hill',
        costType: 'Revenue',
        lineItem: '',
        overrideAccount: '4000 - Contract Revenue',
        poStatus: 'Not Applicable',
        approvalStatus: 'Ready for Accountant',
        posted: true,
        notes: 'Customer billing. Negative allocation. Offset 1100. Deposit later clears AR.',
      }),
      emptyDraft({
        id: cashId,
        postingDate: '2026-08-15',
        vendor: 'Office Supplier',
        invoiceNumber: 'OS-2291',
        sourceType: 'Cash Purchase',
        invoiceDate: '2026-08-15',
        dueDate: '2026-08-15',
        paymentMethod: 'Debit Card',
        checkRef: 'DC-0815',
        invoiceTotal: 214.88,
        allocationAmount: 214.88,
        jobName: OVERHEAD_JOB_NAME,
        costType: 'Overhead',
        overrideAccount: '6120 - Office Supplies',
        poStatus: 'No PO Required',
        approvalStatus: 'Paid',
        paidDate: '2026-08-15',
        posted: true,
        notes: 'Paid on the spot — never AP.',
      }),
      emptyDraft({
        id: fosterBill,
        postingDate: '2026-09-01',
        vendor: 'T&T Precast',
        invoiceNumber: 'TT-1044',
        sourceType: 'Bill / Invoice',
        invoiceDate: '2026-08-29',
        dueDate: '2026-09-28',
        paymentMethod: 'Unpaid / AP',
        invoiceTotal: 8750,
        allocationAmount: 8750,
        jobName: 'Fern Hill',
        costType: 'Materials',
        lineItem: 'RCP 18"',
        poStatus: 'Missing - Get Approval',
        approvalStatus: 'Needs Approval',
        posted: false,
        notes: 'No PO on this bill — waiting on Foster yes/no before post.',
      }),
    ],
    fosterQueue: [
      {
        id: 'foster_demo_1',
        createdAt: '2026-09-01T12:00:00.000Z',
        kind: 'coding-confirm',
        transactionIds: [fosterBill],
        vendor: 'T&T Precast',
        invoiceNumber: 'TT-1044',
        jobName: 'Fern Hill',
        proposedAccounts: ['5250 / offset 2000'],
        amount: 8750,
        reason: 'Vendor bill has no PO. Foster is the only human for invoice coding confirms.',
        decision: 'pending',
        decidedAt: '',
        fosterNote: '',
        paymentDate: '',
        paymentRef: '',
      },
    ],
    equipmentAllocations: [
      {
        id: newId('eal'),
        startDate: '2026-08-20',
        endDate: '',
        jobName: 'Fern Hill',
        equipmentId: EQUIPMENT[0]?.id ?? 'eq_1',
        avgEngineHrsPerDay: 8.5,
        shareOfDay: 1,
        notes: 'Memo only — field hours. Do not also post these dollars on Transactions unless a real vendor invoice exists.',
        status: '',
      },
    ],
  }
}

export function createEmptyBooks(): CompanyBooks {
  const demo = demoBooks()
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
    transactions: demo.transactions,
    equipmentAllocations: demo.equipmentAllocations,
    openingBalances: OPENING_BALANCES,
    fosterQueue: demo.fosterQueue,
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
