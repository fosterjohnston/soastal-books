import { FUEL_USD_PER_GALLON, WORKING_DAYS_PER_MONTH, type CompanyBooks, type EquipmentAllocation } from './types'
import { money } from './formulas'

/** Monday–Friday inclusive, matching Excel NETWORKDAYS. */
export function networkDays(startISO: string, endISO: string): number {
  if (!startISO) return 0
  const start = Date.parse(startISO)
  const end = Date.parse(endISO || startISO)
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return 0
  let n = 0
  const d = new Date(start)
  const last = new Date(end)
  d.setHours(12, 0, 0, 0)
  last.setHours(12, 0, 0, 0)
  while (d.getTime() <= last.getTime()) {
    const day = d.getDay()
    if (day !== 0 && day !== 6) n += 1
    d.setDate(d.getDate() + 1)
  }
  return n
}

export type EquipmentComputed = EquipmentAllocation & {
  equipmentName: string
  ownership: string
  daysOnJob: number
  monthlyRate: number
  dailyCost: number
  equipmentCost: number
  burnRate: number
  fuelPrice: number
  fuelCost: number
  totalMemo: number
  equipmentAccount: string
  fuelAccount: string
}

export function computeEquipmentRow(books: CompanyBooks, row: EquipmentAllocation): EquipmentComputed {
  const eq = books.equipment.find((e) => e.id === row.equipmentId || e.name === row.equipmentId)
  const days = row.startDate ? networkDays(row.startDate, row.endDate || row.startDate) : 0
  const share = row.shareOfDay || 1
  const working = books.settings?.workingDaysPerMonth || WORKING_DAYS_PER_MONTH
  const fuelPrice = books.settings?.fuelPricePerGallon || FUEL_USD_PER_GALLON
  const monthly = eq?.monthlyRate ?? 0
  const daily = working ? money(monthly / working) : 0
  const equipmentCost = money(daily * days * share)
  const burn = eq?.burnGalPerHour ?? 0
  const hrs = row.avgEngineHrsPerDay || 0
  const fuelCost = money(hrs * days * burn * fuelPrice)
  return {
    ...row,
    equipmentName: eq?.name ?? row.equipmentId,
    ownership: eq?.ownership ?? '',
    daysOnJob: days,
    monthlyRate: monthly,
    dailyCost: daily,
    equipmentCost,
    burnRate: burn,
    fuelPrice,
    fuelCost,
    totalMemo: money(equipmentCost + fuelCost),
    equipmentAccount: eq?.defaultAccount || '5190 - Job Equipment - Other',
    fuelAccount: '5440 - Fuel & Oil - Field Equipment',
  }
}

export function computeEquipmentAllocations(books: CompanyBooks): EquipmentComputed[] {
  return books.equipmentAllocations.map((r) => computeEquipmentRow(books, r))
}
