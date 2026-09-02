/** Soastal LLC workbook posting bible — accrual, money-out-positive. */

export const COMPANY_NAME = 'Soastal LLC'
export const BOOKS_FOLDER = 'Soastal Books'
export const BOOKS_RELATIVE_DIR = 'Documents/Finance/Soastal Books'
export const LIVE_WORKBOOK_FILENAME = 'Acounting spreadshseet.xlsx'
export const LIVE_WORKBOOK_RELATIVE = 'Documents/Finance/Acounting spreadshseet.xlsx'
export const WORKING_DAYS_PER_MONTH = 21.7
export const FUEL_USD_PER_GALLON = 4.45
export const HOURS_PER_WORKING_DAY = 8

export const FORMULA_COLUMNS = [
  'Suggested Account',
  'Final Account',
  'Total Allocated',
  'Difference',
  'Invoice Key',
  'Offset Suggested',
  'Offset Account',
  'Line Item on This Job?',
  'Account Category',
  'Offset Category',
] as const

export const SOURCE_TYPES = [
  'Bill / Invoice',
  'Credit Card Charge',
  'Debit Card Charge',
  'Check',
  'Cash Purchase',
  'ACH / Wire',
  'Payroll',
  'Deposit / Revenue',
  'Refund',
  'Journal Entry',
] as const
export type SourceType = (typeof SOURCE_TYPES)[number]

export const COST_TYPES = [
  'Labor',
  'Equipment',
  'Materials',
  'Subcontractor',
  'Overhead',
  'Revenue',
  'Asset',
  'Liability',
  'Equity',
  'Other Expense',
] as const
export type CostType = (typeof COST_TYPES)[number]

export const PO_STATUSES = [
  'Matched to PO',
  'No PO Required',
  'Missing - Get Approval',
  'Pending Match',
  'Not Applicable',
] as const
export type PoStatus = (typeof PO_STATUSES)[number]

export const APPROVAL_STATUSES = [
  'Ready for Accountant',
  'Needs Approval',
  'Hold / Dispute',
  'Paid',
  'Entered Only',
] as const
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number]

export const PAYMENT_METHODS = [
  'Unpaid / AP',
  'Billed / AR',
  'Check',
  'Debit Card',
  'ACH',
  'Wire',
  'Deposit',
  'Auto-Pay',
  'Cash',
  'Credit Card',
] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const JOB_STATUSES = ['Active', 'Complete', 'On Hold', 'Overhead'] as const
export type JobStatus = (typeof JOB_STATUSES)[number]

export const ACCOUNT_TYPES = [
  'Asset',
  'Liability',
  'Equity',
  'Revenue',
  'Cost of Goods',
  'Expense',
] as const
export type AccountType = (typeof ACCOUNT_TYPES)[number]

export const VENDOR_TYPES = [
  'Materials Supplier',
  'Subcontractor',
  'Equipment Dealer',
  'Payroll',
  'Professional',
  'Overhead',
  'Customer',
  'Utility',
  'Other',
] as const
export type VendorType = (typeof VENDOR_TYPES)[number]

export const OVERHEAD_JOB_NAME = 'N/A - Overhead'
export const OVERHEAD_JOB_NUMBER = 'N/A'

export type Account = {
  number: string
  name: string
  type: AccountType
  category: string
  description: string
  active: boolean
}

export type Job = {
  id: string
  jobName: string
  jobNumber: string
  status: JobStatus
  ownerCustomer: string
  startDate: string
  contractAmount: number
  estimatedTotalCost: number
  notes: string
  /** Slot 30 in Keith's Active Jobs list is reserved overhead. */
  slot: number
}

export type Vendor = {
  id: string
  name: string
  type: VendorType
  defaultAccount: string
  terms: string
  active: boolean
  notes: string
}

export type EquipmentUnit = {
  id: string
  name: string
  unitNumber: string
  type: string
  ownership: 'Owned' | 'Leased' | 'Rented'
  monthlyRate: number
  internalRatePerHour: number
  burnGalPerHour: number
  defaultAccount: string
  active: boolean
}

export type LineItemMapRow = {
  id: string
  activity: string
  laborAccount: string
  equipmentAccount: string
  materialsAccount: string
}

export type JobLineItem = {
  id: string
  jobName: string
  itemNumber: string
  description: string
  unit: string
  bidQuantity: number
  activity: string
}

export type PaymentMethodMapRow = {
  paymentMethod: PaymentMethod
  offsetAccount: string
  offsetName: string
}

export type TransactionDraft = {
  id: string
  postingDate: string
  vendor: string
  invoiceNumber: string
  sourceType: SourceType
  invoiceDate: string
  dueDate: string
  paymentMethod: PaymentMethod
  checkRef: string
  /** CONTROL total. First split row only; later splits must be 0. */
  invoiceTotal: number
  allocationAmount: number
  /** Job NAME, not number. Blank on AP payments. */
  jobName: string
  costType: CostType
  lineItem: string
  equipmentUnit: string
  overrideAccount: string
  poStatus: PoStatus
  poNumber: string
  approvalStatus: ApprovalStatus
  notes: string
  offsetOverride: string
  posted: boolean
  paidDate: string
}

export type ComputedFields = {
  suggestedAccount: string
  finalAccount: string
  totalAllocated: number
  difference: number
  invoiceKey: string
  offsetSuggested: string
  offsetAccount: string
  lineItemOnThisJob: string
  accountCategory: string
  offsetCategory: string
}

export type LedgerRow = TransactionDraft & ComputedFields

export type EquipmentAllocation = {
  id: string
  date: string
  jobName: string
  equipmentId: string
  hours: number
  notes: string
}

export type OpeningBalance = {
  id: string
  asOfDate: string
  accountNumber: string
  /** Native sign: money-out-positive. Cash in the bank is typically negative here if funded by equity (money in). */
  amount: number
  memo: string
}

export type FosterDecision = 'pending' | 'yes' | 'no'

export type FosterItem = {
  id: string
  createdAt: string
  kind: 'coding-confirm' | 'payment-info'
  transactionIds: string[]
  vendor: string
  invoiceNumber: string
  jobName: string
  proposedAccounts: string[]
  amount: number
  reason: string
  decision: FosterDecision
  decidedAt: string
  fosterNote: string
  paymentDate: string
  paymentRef: string
}

export type DocumentKind = 'bill' | 'po' | 'ap' | 'other'
export type IntakeSource = 'office-scan' | 'ingest-api'
export type ProposalConfidence = 'high' | 'medium' | 'low'

export type CodingProposal = {
  summary: string
  vendor: string
  invoiceNumber: string
  jobName: string
  costType: CostType
  lineItem: string
  paymentMethod: PaymentMethod
  sourceType: SourceType
  amount: number
  poStatus: PoStatus
  poNumber: string
  overrideAccount: string
  suggestedAccount: string
  offsetAccount: string
  confidence: ProposalConfidence
  reasons: string[]
}

export type ScannedDocument = {
  id: string
  createdAt: string
  originalName: string
  storedPath: string
  mimeType: string
  size: number
  kind: DocumentKind
  source: IntakeSource
  proposal: CodingProposal
  transactionIds: string[]
  fosterItemId: string
  status: 'proposed' | 'confirmed' | 'held' | 'denied'
}

export type CopyRecord = {
  id: string
  createdAt: string
  relativePath: string
  kind: 'books-json' | 'scan' | 'export'
  originalName: string
  bytes: number
}

export type PeriodClose = {
  id: string
  period: string
  closedAt: string
  closedBy: string
  notes: string
}

export type CompanyBooks = {
  version: 1
  companyName: string
  savedAt: string | null
  chartOfAccounts: Account[]
  jobs: Job[]
  vendors: Vendor[]
  equipment: EquipmentUnit[]
  lineItemMap: LineItemMapRow[]
  jobLineItems: JobLineItem[]
  paymentMethodMap: PaymentMethodMapRow[]
  transactions: TransactionDraft[]
  equipmentAllocations: EquipmentAllocation[]
  openingBalances: OpeningBalance[]
  fosterQueue: FosterItem[]
  periodCloses: PeriodClose[]
  documents: ScannedDocument[]
  copies: CopyRecord[]
}

export type PostingEntry = {
  transactionId: string
  account: string
  amount: number
  side: 'final' | 'offset'
  invoiceKey: string
  jobName: string
  postingDate: string
  vendor: string
  invoiceNumber: string
  dueDate: string
  paymentMethod: PaymentMethod
}

export type ValidationIssue = {
  level: 'error' | 'warning'
  field?: string
  message: string
}

export const CASH_OFFSET_ACCOUNTS = ['1000', '1010', '1050'] as const
export const AP_ACCOUNT = '2000'
export const AR_ACCOUNT = '1100'
export const RETAINAGE_PAYABLE = '2050'
export const RETAINAGE_RECEIVABLE = '1150'

export const COST_TYPES_USING_LINE_MAP: CostType[] = ['Labor', 'Equipment', 'Materials']
export const COST_TYPES_REQUIRING_OVERRIDE: CostType[] = [
  'Subcontractor',
  'Overhead',
  'Revenue',
  'Liability',
  'Asset',
  'Equity',
  'Other Expense',
]
