import { newId } from './posting'
import { findLineItemMap, normLabel } from './formulas'
import type { CompanyBooks, EquipmentUnit, LineItemMapRow } from './types'

export const DEFAULT_LABOR_ACCOUNT = '5090 - Job Labor - Other'
export const DEFAULT_EQUIPMENT_ACCOUNT = '5190 - Job Equipment - Other'
export const DEFAULT_MATERIALS_ACCOUNT = '5290 - Job Materials - Other'

export function nextEquipmentName(existing: { name: string }[]): string {
  const have = new Set(existing.map((e) => e.name.trim().toLowerCase()))
  if (!have.has('new equipment')) return 'New equipment'
  let n = 2
  while (have.has(`new equipment ${n}`)) n++
  return `New equipment ${n}`
}

export function emptyEquipment(partial: Partial<EquipmentUnit> = {}): EquipmentUnit {
  return {
    id: newId('eq'),
    name: 'New equipment',
    unitNumber: '',
    type: 'Other',
    ownership: 'Owned',
    rentalVendor: '',
    monthlyRate: 0,
    internalRatePerHour: 0,
    burnGalPerHour: 0,
    defaultAccount: DEFAULT_EQUIPMENT_ACCOUNT,
    notes: '',
    active: true,
    ...partial,
  }
}

/** Newest machine first so Add equipment is visible without scrolling the master list. */
export function addEquipment(books: CompanyBooks, partial: Partial<EquipmentUnit> = {}): CompanyBooks {
  const typed = (partial.name || '').replace(/\s+/g, ' ').trim()
  const name = typed || nextEquipmentName(books.equipment)
  return {
    ...books,
    equipment: [emptyEquipment({ ...partial, name }), ...books.equipment],
  }
}

export function emptyLineItemMapRow(activity = 'New line item', category = 'Other'): LineItemMapRow {
  return {
    id: newId('map'),
    activity,
    category,
    laborAccount: DEFAULT_LABOR_ACCOUNT,
    equipmentAccount: DEFAULT_EQUIPMENT_ACCOUNT,
    materialsAccount: DEFAULT_MATERIALS_ACCOUNT,
  }
}

export function lineItemAlreadyMapped(books: Pick<CompanyBooks, 'lineItemMap'>, activity: string): boolean {
  return !!findLineItemMap(books as CompanyBooks, activity)
}

/** Add one cost-code / crosscode row. No-op if that line item name is already on the map. */
export function addLineItemToMap(books: CompanyBooks, activity: string, category = 'Other'): CompanyBooks {
  const name = activity.replace(/\s+/g, ' ').trim()
  if (!name || findLineItemMap(books, name)) return books
  return {
    ...books,
    lineItemMap: [...books.lineItemMap, emptyLineItemMapRow(name, category)],
  }
}

export function patchLineItemMap(
  books: CompanyBooks,
  id: string,
  next: Partial<LineItemMapRow>,
): CompanyBooks {
  return {
    ...books,
    lineItemMap: books.lineItemMap.map((m) => (m.id === id ? { ...m, ...next } : m)),
  }
}

export function patchEquipment(books: CompanyBooks, id: string, next: Partial<EquipmentUnit>): CompanyBooks {
  return {
    ...books,
    equipment: books.equipment.map((e) => (e.id === id ? { ...e, ...next } : e)),
  }
}

export function uniqueMapCategories(books: Pick<CompanyBooks, 'lineItemMap'>, extras: readonly string[] = []): string[] {
  const set = new Set<string>(extras)
  for (const row of books.lineItemMap) {
    const c = row.category.trim()
    if (c) set.add(c)
  }
  return [...set].sort((a, b) => a.localeCompare(b))
}

export function mapKey(activity: string): string {
  return normLabel(activity)
}
