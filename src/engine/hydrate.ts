import type { CompanyBooks, EquipmentAllocation, JobLineItem, Vendor } from './types'
import { createEmptyBooks, isPlaceholderJournal } from '../seed'

function looksLikeWorkbookCoa(books: Pick<CompanyBooks, 'chartOfAccounts'>): boolean {
  return books.chartOfAccounts.some((a) => a.number === '5030' && /water main/i.test(a.name))
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

export function hydrateBooks(raw: unknown): CompanyBooks {
  const seed = createEmptyBooks()
  if (!raw || typeof raw !== 'object') return seed
  const b = raw as Partial<CompanyBooks>
  if (!Array.isArray(b.transactions) || !Array.isArray(b.chartOfAccounts)) return seed
  const storedCoaOk = looksLikeWorkbookCoa({ chartOfAccounts: b.chartOfAccounts })
  const useMasterLists = !storedCoaOk
  const storedTx = Array.isArray(b.transactions) ? b.transactions : []
  const hasWorkbookJournal = storedTx.some((t) => t.id.startsWith('txn_wb_'))
  const transactions = hasWorkbookJournal
    ? storedTx
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
    chartOfAccounts: useMasterLists ? seed.chartOfAccounts : b.chartOfAccounts,
    jobs: Array.isArray(b.jobs) && b.jobs.length && !useMasterLists ? b.jobs : seed.jobs,
    vendors: Array.isArray(b.vendors) && b.vendors.length && !useMasterLists ? b.vendors.map(hydrateVendor) : seed.vendors,
    equipment: Array.isArray(b.equipment) && b.equipment.length && !useMasterLists ? b.equipment : seed.equipment,
    lineItemMap:
      Array.isArray(b.lineItemMap) && b.lineItemMap.length && !useMasterLists ? b.lineItemMap : seed.lineItemMap,
    jobLineItems:
      Array.isArray(b.jobLineItems) && b.jobLineItems.length && !useMasterLists
        ? b.jobLineItems.map(hydrateSov)
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
      Array.isArray(b.openingBalances) && b.openingBalances.length && storedCoaOk
        ? b.openingBalances
        : seed.openingBalances,
    fosterQueue,
    periodCloses: b.periodCloses ?? [],
    documents: b.documents ?? [],
    copies: b.copies ?? [],
    monthEndChecklist: Array.isArray(b.monthEndChecklist) && b.monthEndChecklist.length ? b.monthEndChecklist : seed.monthEndChecklist,
  }
}
