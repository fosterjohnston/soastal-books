import {
  AP_ACCOUNT,
  AR_ACCOUNT,
  COST_TYPES_REQUIRING_OVERRIDE,
  COST_TYPES_USING_LINE_MAP,
  type CompanyBooks,
  type CostType,
  type PaymentMethod,
  type SourceType,
  type TransactionDraft,
} from './types'
import {
  findAccount,
  findLineItemMap,
  isPaymentDocument,
  money,
  offsetForPaymentMethod,
  parseAccountNumber,
  suggestedAccountForRow,
} from './formulas'

export type AccountVia = 'line-item-map' | 'vendor-default' | 'rule' | 'none'

export type AccountDerivation = {
  /** Full "NNNN - Name" when we have a pick; empty when the user must choose. */
  account: string
  /** Suggested from the Line Item Map (Labor / Equipment / Materials). */
  suggested: string
  via: AccountVia
  required: boolean
  shouldBeBlank: boolean
  reason: string
}

export type DocumentHeader = {
  sourceType: SourceType
  paymentMethod: PaymentMethod
  postingDate: string
  vendor: string
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  checkRef: string
  invoiceTotal: number
}

export type SplitInput = {
  jobName: string
  costType: CostType
  lineItem: string
  allocationAmount: number
  overrideAccount?: string
  overrideTouched?: boolean
}

function labelFor(books: CompanyBooks, numberOrLabel: string): string {
  const raw = numberOrLabel.trim()
  if (!raw) return ''
  const acct = findAccount(books, raw)
  if (!acct) return raw
  return `${acct.number} - ${acct.name}`
}

export function paymentForSource(source: SourceType): PaymentMethod {
  if (source === 'Credit Card Charge') return 'Credit Card'
  if (source === 'Debit Card Charge') return 'Debit Card'
  if (source === 'Check') return 'Check'
  if (source === 'Cash Purchase') return 'Cash'
  if (source === 'ACH / Wire' || source === 'Payroll') return 'ACH / Wire'
  if (source === 'Deposit / Revenue') return 'Deposit'
  if (source === 'Bill / Invoice') return 'Unpaid / AP'
  if (source === 'Refund') return 'ACH / Wire'
  return 'Unpaid / AP'
}

export function documentDifference(invoiceTotal: number, allocations: number[]): number {
  return money(invoiceTotal - allocations.reduce((s, n) => s + n, 0))
}

function vendorDefault(books: CompanyBooks, vendorName: string, prefix?: string): string {
  const vendor = books.vendors.find((v) => v.name === vendorName)
  if (!vendor?.defaultAccount) return ''
  const labeled = labelFor(books, vendor.defaultAccount)
  if (!prefix) return labeled
  return parseAccountNumber(labeled).startsWith(prefix) ? labeled : ''
}

function looksLikePayrollTax(lineItem: string, costType: CostType, sourceType: SourceType): boolean {
  if (sourceType === 'Payroll' && costType === 'Liability') return true
  return /payroll tax|federal tax|state tax|employer payroll/i.test(lineItem)
}

/** One place for offset + Override Account. Offset still comes from Payment Method. */
export function deriveAccount(
  books: CompanyBooks,
  row: Pick<
    TransactionDraft,
    'sourceType' | 'paymentMethod' | 'costType' | 'vendor' | 'jobName' | 'lineItem' | 'invoiceNumber'
  >,
): AccountDerivation {
  const suggested = suggestedAccountForRow(
    books,
    {
      ...row,
      overrideAccount: '',
      allocationAmount: 0,
      invoiceTotal: 0,
      offsetOverride: '',
    } as TransactionDraft,
  )
  const suggestedLabel = labelFor(books, suggested)
  const mapHit =
    COST_TYPES_USING_LINE_MAP.includes(row.costType) &&
    !!row.lineItem &&
    !!findLineItemMap(books, row.lineItem)
  const onMap =
    Boolean(row.jobName && row.lineItem && COST_TYPES_USING_LINE_MAP.includes(row.costType) && row.jobName !== 'N/A - Overhead') &&
    mapHit

  if (isPaymentDocument(row.invoiceNumber) || (row.costType === 'Liability' && !row.jobName.trim())) {
    return {
      account: labelFor(books, AP_ACCOUNT),
      suggested: suggestedLabel,
      via: 'rule',
      required: true,
      shouldBeBlank: false,
      reason: 'Paying a bill hits 2000 — not a second job cost.',
    }
  }

  if (onMap) {
    return {
      account: '',
      suggested: suggestedLabel,
      via: 'line-item-map',
      required: false,
      shouldBeBlank: true,
      reason: 'Labor / Equipment / Materials use the Line Item Map. Override stays blank unless you correct it.',
    }
  }

  if (row.costType === 'Revenue' || row.paymentMethod === 'Billed / AR') {
    const acct = labelFor(books, '4000')
    return {
      account: acct,
      suggested: suggestedLabel || acct,
      via: 'rule',
      required: true,
      shouldBeBlank: false,
      reason: 'Revenue posts to 4000 — Contract Revenue.',
    }
  }

  if (row.sourceType === 'Deposit / Revenue' && row.costType === 'Liability') {
    return {
      account: labelFor(books, AR_ACCOUNT),
      suggested: suggestedLabel,
      via: 'rule',
      required: true,
      shouldBeBlank: false,
      reason: 'A deposit against AR hits 1100.',
    }
  }

  if (looksLikePayrollTax(row.lineItem, row.costType, row.sourceType)) {
    const mapped = suggestedLabel
    const acct = mapped || labelFor(books, '2200')
    return {
      account: acct,
      suggested: acct,
      via: mapped ? 'line-item-map' : 'rule',
      required: true,
      shouldBeBlank: false,
      reason: 'Payroll tax uses the payroll liability / tax account.',
    }
  }

  if (row.costType === 'Subcontractor') {
    const fromVendor = vendorDefault(books, row.vendor, '53')
    const acct = fromVendor || labelFor(books, '5350')
    return {
      account: acct,
      suggested: suggestedLabel || acct,
      via: fromVendor ? 'vendor-default' : 'rule',
      required: true,
      shouldBeBlank: false,
      reason: 'Subcontractor uses the vendor default or 5350.',
    }
  }

  if (row.costType === 'Overhead' || row.jobName === 'N/A - Overhead') {
    const fromVendor = vendorDefault(books, row.vendor, '6')
    const acct = fromVendor || labelFor(books, '6120')
    return {
      account: acct,
      suggested: suggestedLabel || acct,
      via: fromVendor ? 'vendor-default' : 'rule',
      required: true,
      shouldBeBlank: false,
      reason: 'Overhead uses the vendor default or 6120.',
    }
  }

  if (row.costType === 'Other Expense') {
    const fromVendor = vendorDefault(books, row.vendor, '6')
    const acct = fromVendor || labelFor(books, '6820')
    return {
      account: acct,
      suggested: suggestedLabel || acct,
      via: fromVendor ? 'vendor-default' : 'rule',
      required: true,
      shouldBeBlank: false,
      reason: 'Other expense uses the vendor default or 6820.',
    }
  }

  if (row.costType === 'Liability') {
    const acct = labelFor(books, AP_ACCOUNT)
    return {
      account: acct,
      suggested: suggestedLabel || acct,
      via: 'rule',
      required: true,
      shouldBeBlank: false,
      reason: 'Liability without a job is AP (2000).',
    }
  }

  if (row.costType === 'Equity') {
    return {
      account: '',
      suggested: suggestedLabel,
      via: 'none',
      required: true,
      shouldBeBlank: false,
      reason: 'Pick the equity account. Payment method does not choose Equity.',
    }
  }

  if (row.costType === 'Asset') {
    const acct = vendorDefault(books, row.vendor)
    const num = parseAccountNumber(acct)
    const assetDefault = num.startsWith('1') ? acct : ''
    return {
      account: assetDefault,
      suggested: suggestedLabel,
      via: assetDefault ? 'vendor-default' : 'none',
      required: true,
      shouldBeBlank: false,
      reason: assetDefault
        ? 'Asset row uses the vendor default. Change it if that is wrong.'
        : 'Pick the asset account. The app cannot derive it from payment method alone.',
    }
  }

  const fallback = vendorDefault(books, row.vendor)
  if (COST_TYPES_REQUIRING_OVERRIDE.includes(row.costType)) {
    return {
      account: fallback,
      suggested: suggestedLabel,
      via: fallback ? 'vendor-default' : 'none',
      required: true,
      shouldBeBlank: false,
      reason: fallback ? 'Vendor default account.' : 'Pick Override Account. This cost type is not on the Line Item Map.',
    }
  }

  return {
    account: '',
    suggested: mapHit ? suggestedLabel : '',
    via: mapHit ? 'line-item-map' : 'none',
    required: !mapHit,
    shouldBeBlank: false,
    reason: mapHit
      ? 'Account comes from the Line Item Map.'
      : 'Pick the job line item so the map can fill Labor / Equipment / Materials, or choose an account.',
  }
}

/** Account shown on the form: user pick, else derived override, else map suggestion. */
export function displayAccount(books: CompanyBooks, row: Pick<TransactionDraft, 'sourceType' | 'paymentMethod' | 'costType' | 'vendor' | 'jobName' | 'lineItem' | 'invoiceNumber' | 'overrideAccount'>): string {
  if (row.overrideAccount.trim()) return labelFor(books, row.overrideAccount)
  const d = deriveAccount(books, row)
  if (d.shouldBeBlank) return d.suggested
  return d.account
}

export function offsetLabel(books: CompanyBooks, method: PaymentMethod): string {
  const off = offsetForPaymentMethod(books, method)
  return off.label || off.number
}

export function applyDerivedOverride(
  books: CompanyBooks,
  row: TransactionDraft,
  touched: boolean,
): TransactionDraft {
  if (touched && row.overrideAccount.trim()) return row
  const d = deriveAccount(books, row)
  if (d.shouldBeBlank) return { ...row, overrideAccount: '' }
  return { ...row, overrideAccount: d.account }
}

export function buildSplitDocument(
  books: CompanyBooks,
  header: DocumentHeader,
  splits: SplitInput[],
): Partial<TransactionDraft>[] {
  return splits.map((split, index) => {
    const sketch = {
      sourceType: header.sourceType,
      paymentMethod: header.paymentMethod,
      vendor: header.vendor,
      invoiceNumber: header.invoiceNumber,
      costType: split.costType,
      jobName: split.jobName,
      lineItem: split.lineItem,
      overrideAccount: split.overrideAccount || '',
      invoiceTotal: 0,
      allocationAmount: 0,
      offsetOverride: '',
    } as TransactionDraft
    const applied = applyDerivedOverride(books, sketch, !!split.overrideTouched && !!split.overrideAccount)
    return {
      postingDate: header.postingDate,
      vendor: header.vendor,
      invoiceNumber: header.invoiceNumber,
      sourceType: header.sourceType,
      invoiceDate: header.invoiceDate || header.postingDate,
      dueDate: header.dueDate || header.postingDate,
      paymentMethod: header.paymentMethod,
      checkRef: header.checkRef,
      invoiceTotal: index === 0 ? header.invoiceTotal : 0,
      allocationAmount: split.allocationAmount,
      jobName: split.jobName,
      costType: split.costType,
      lineItem: split.lineItem,
      overrideAccount: applied.overrideAccount,
      poStatus:
        header.sourceType === 'Journal Entry' || header.paymentMethod === 'Billed / AR'
          ? 'Not Applicable'
          : 'No PO Required',
    }
  })
}

export { offsetForPaymentMethod, parseAccountNumber }
