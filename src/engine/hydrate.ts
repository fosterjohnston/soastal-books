import type { CompanyBooks } from './types'
import { createEmptyBooks } from '../seed'

export function hydrateBooks(raw: unknown): CompanyBooks {
  const seed = createEmptyBooks()
  if (!raw || typeof raw !== 'object') return seed
  const b = raw as Partial<CompanyBooks>
  if (!Array.isArray(b.transactions) || !Array.isArray(b.chartOfAccounts)) return seed
  return {
    version: 1,
    companyName: b.companyName || seed.companyName,
    savedAt: b.savedAt ?? null,
    chartOfAccounts: b.chartOfAccounts.length ? b.chartOfAccounts : seed.chartOfAccounts,
    jobs: Array.isArray(b.jobs) && b.jobs.length ? b.jobs : seed.jobs,
    vendors: Array.isArray(b.vendors) && b.vendors.length ? b.vendors : seed.vendors,
    equipment: Array.isArray(b.equipment) && b.equipment.length ? b.equipment : seed.equipment,
    lineItemMap: Array.isArray(b.lineItemMap) && b.lineItemMap.length ? b.lineItemMap : seed.lineItemMap,
    jobLineItems: Array.isArray(b.jobLineItems) && b.jobLineItems.length ? b.jobLineItems : seed.jobLineItems,
    paymentMethodMap:
      Array.isArray(b.paymentMethodMap) && b.paymentMethodMap.length ? b.paymentMethodMap : seed.paymentMethodMap,
    transactions: b.transactions,
    equipmentAllocations: b.equipmentAllocations ?? [],
    openingBalances: b.openingBalances ?? seed.openingBalances,
    fosterQueue: b.fosterQueue ?? [],
    periodCloses: b.periodCloses ?? [],
    documents: b.documents ?? [],
    copies: b.copies ?? [],
  }
}
