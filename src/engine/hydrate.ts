import type { CompanyBooks, EquipmentAllocation, JobLineItem, Vendor } from './types'
import { createEmptyBooks, isPlaceholderJournal } from '../seed'

function looksLikeWorkbookCoa(books: Pick<CompanyBooks, 'chartOfAccounts'>): boolean {
  return books.chartOfAccounts.some((a) => a.number === '5030' && /water main/i.test(a.name))
}

export function hasWorkbookCopyJournal(txs: { id?: string }[] | undefined): boolean {
  return !!txs?.some((t) => String(t.id || '').startsWith('txn_wb_'))
}

export function listsLookLikeWorkbookCopy(
  books: Pick<CompanyBooks, 'jobs' | 'vendors' | 'openingBalances'>,
): boolean {
  const jobs = books.jobs || []
  const hasJobs =
    jobs.some((j) => /captian/i.test(j.jobName)) && jobs.some((j) => /craig farm/i.test(j.jobName))
  const openings = (books.openingBalances?.length ?? 0) >= 20
  const vendors = (books.vendors?.length ?? 0) >= 15
  return hasJobs && openings && vendors
}

function hydrateEquipmentAlloc(raw: EquipmentAllocation): EquipmentAllocation {
  const startDate = raw.startDate || raw.date || ''
  const avg = raw.avgEngineHrsPerDay || raw.hours || 0
  return {
    id: raw.id,
    startDate,
    endDate: raw.endDate || '',
    jobName: raw.jobName || '',
    equipmentId: raw.equipmentId || '',
    avgEngineHrsPerDay: avg,
    shareOfDay: raw.shareOfDay || 1,
    notes: raw.notes || '',
    status: raw.status || '',
  }
}

function hydrateVendor(v: Vendor): Vendor {
  return {
    ...v,
    accountNumber: v.accountNumber || '',
    phoneEmail: v.phoneEmail || '',
    type: v.type || 'Other',
  }
}

function hydrateSov(s: JobLineItem): JobLineItem {
  return {
    ...s,
    unitPrice: s.unitPrice || 0,
    estimatedCost: s.estimatedCost || 0,
    activity: s.activity || s.description,
  }
}

function mergeMissingBy<T>(stored: T[], seedRows: T[], key: (row: T) => string): T[] {
  const have = new Set(stored.map(key))
  if (!have.size) return seedRows
  const extra = seedRows.filter((row) => !have.has(key(row)))
  return extra.length ? [...stored, ...extra] : stored
}

export function hydrateBooks(raw: unknown): CompanyBooks {
  const seed = createEmptyBooks()
  if (!raw || typeof raw !== 'object') return seed
  const b = raw as Partial<CompanyBooks>
  if (!Array.isArray(b.transactions) || !Array.isArray(b.chartOfAccounts)) return seed
  const storedCoaOk = looksLikeWorkbookCoa({ chartOfAccounts: b.chartOfAccounts })
  const storedListsOk = listsLookLikeWorkbookCopy({
    jobs: Array.isArray(b.jobs) ? b.jobs : [],
    vendors: Array.isArray(b.vendors) ? b.vendors : [],
    openingBalances: Array.isArray(b.openingBalances) ? b.openingBalances : [],
  })
  const useMasterLists = !storedCoaOk || !storedListsOk
  const storedTx = Array.isArray(b.transactions) ? b.transactions : []
  const hasWorkbookJournal = storedTx.some((t) => t.id.startsWith('txn_wb_'))
  const transactions = hasWorkbookJournal
    ? mergeMissingBy(storedTx, seed.transactions, (t) => t.id)
    : [
        ...seed.transactions,
        ...storedTx.filter((t) => !t.id.startsWith('txn_demo_') && !t.id.startsWith('txn_wb_')),
      ]
  const storedAlloc = (b.equipmentAllocations ?? []).map(hydrateEquipmentAlloc)
  const equipmentAllocations = isPlaceholderJournal(storedTx)
    ? seed.equipmentAllocations
    : storedAlloc.filter((a) => !/do not also post these dollars|MEMO only/i.test(a.notes || ''))
  const fosterQueue = isPlaceholderJournal(storedTx)
    ? seed.fosterQueue
    : (b.fosterQueue ?? []).filter((f) => !f.transactionIds.every((id) => id.startsWith('txn_demo_')))
  return {
    version: 1,
    companyName: b.companyName || seed.companyName,
    savedAt: b.savedAt ?? null,
    settings: {
      workingDaysPerMonth: b.settings?.workingDaysPerMonth ?? seed.settings.workingDaysPerMonth,
      fuelPricePerGallon: b.settings?.fuelPricePerGallon ?? seed.settings.fuelPricePerGallon,
    },
    chartOfAccounts: useMasterLists
      ? seed.chartOfAccounts
      : mergeMissingBy(b.chartOfAccounts, seed.chartOfAccounts, (a) => a.number),
    jobs:
      Array.isArray(b.jobs) && b.jobs.length && !useMasterLists
        ? mergeMissingBy(b.jobs, seed.jobs, (j) => j.jobName)
        : [
            ...seed.jobs,
            ...(Array.isArray(b.jobs) ? b.jobs.filter((j) => !seed.jobs.some((s) => s.jobName === j.jobName)) : []),
          ],
    vendors:
      Array.isArray(b.vendors) && b.vendors.length && !useMasterLists
        ? mergeMissingBy(b.vendors.map(hydrateVendor), seed.vendors, (v) => v.name)
        : [
            ...seed.vendors,
            ...(Array.isArray(b.vendors)
              ? b.vendors.filter((v) => !seed.vendors.some((s) => s.name === v.name)).map(hydrateVendor)
              : []),
          ],
    equipment:
      Array.isArray(b.equipment) && b.equipment.length && !useMasterLists
        ? mergeMissingBy(b.equipment, seed.equipment, (e) => e.name)
        : [
            ...seed.equipment,
            ...(Array.isArray(b.equipment) ? b.equipment.filter((e) => !seed.equipment.some((s) => s.name === e.name)) : []),
          ],
    lineItemMap:
      Array.isArray(b.lineItemMap) && b.lineItemMap.length && !useMasterLists
        ? mergeMissingBy(b.lineItemMap, seed.lineItemMap, (m) => m.activity)
        : seed.lineItemMap,
    jobLineItems:
      Array.isArray(b.jobLineItems) && b.jobLineItems.length && !useMasterLists
        ? mergeMissingBy(b.jobLineItems.map(hydrateSov), seed.jobLineItems, (s) => `${s.jobName}::${s.description}`)
        : seed.jobLineItems,
    paymentMethodMap: (() => {
      const stored = Array.isArray(b.paymentMethodMap) ? b.paymentMethodMap : []
      if (!stored.length) return seed.paymentMethodMap
      const have = new Set(stored.map((r) => r.paymentMethod))
      return [...stored, ...seed.paymentMethodMap.filter((r) => !have.has(r.paymentMethod))]
    })(),
    transactions,
    equipmentAllocations,
    openingBalances:
      Array.isArray(b.openingBalances) && b.openingBalances.length && storedCoaOk && storedListsOk
        ? mergeMissingBy(b.openingBalances, seed.openingBalances, (o) => o.accountNumber)
        : seed.openingBalances,
    fosterQueue,
    periodCloses: b.periodCloses ?? [],
    documents: b.documents ?? [],
    copies: b.copies ?? [],
    monthEndChecklist: Array.isArray(b.monthEndChecklist) && b.monthEndChecklist.length ? b.monthEndChecklist : seed.monthEndChecklist,
  }
}
