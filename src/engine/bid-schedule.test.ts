import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { LIVE_WORKBOOK_FILENAME } from './types'
import {
  mergeJobLineItems,
  parseBidScheduleSource,
  parseBidScheduleTable,
  parseDelimitedText,
} from './bid-schedule'
import { addLineItemToMap, emptyEquipment, emptyLineItemMapRow, lineItemAlreadyMapped } from './masters'
import { createMasterDataOnly } from '../seed'

const HEADERS = ['Job', 'Item #', 'Line item', 'Unit', 'Qty', 'Unit price', 'Est. cost']

describe('bid schedule import', () => {
  it('parses a CSV schedule and fill-downs a blank job name', () => {
    const csv = [
      'Job,Line item,Unit,Qty,Unit price',
      'Craig Farm Rd,Mobilization,LS,1,12000',
      ',Silt Fence,LF,400,4.25',
      'Craig Farm Rd,Riprap,TN,80,65',
    ].join('\n')
    const parsed = parseBidScheduleSource('craig-farm-bid.csv', csv)
    expect(parsed.rows).toHaveLength(3)
    expect(parsed.rows[0].jobName).toBe('Craig Farm Rd')
    expect(parsed.rows[1].jobName).toBe('Craig Farm Rd')
    expect(parsed.rows[1].description).toBe('Silt Fence')
    expect(parsed.rows[1].bidQuantity).toBe(400)
    expect(parsed.rows[1].unitPrice).toBe(4.25)
  })

  it('maps Craig Farm Rd onto the Setup job Craig Farm', () => {
    const csv = [
      'Job,Line item,Unit,Qty,Unit price',
      'Craig Farm Rd,Mobilization,LS,1,18500',
      ',Silt Fence,LF,1200,3.75',
    ].join('\n')
    const parsed = parseBidScheduleSource('craig-farm-bid.csv', csv, {
      knownJobNames: ['Fern Hill', 'Sandy Run', 'Craig Farm', "Captian's Quarters"],
    })
    expect(parsed.rows.map((r) => r.jobName)).toEqual(['Craig Farm', 'Craig Farm'])
    expect(parsed.warnings.some((w) => /Craig Farm/.test(w))).toBe(true)
  })

  it('uses the job filter when the Excel has no Job column', () => {
    const grid = [
      ['Line item', 'Unit', 'Quantity', 'Unit price'],
      ['Mass Excavation', 'CY', 2500, 18.5],
      ['Total', 'LS', 1, 0],
    ]
    const parsed = parseBidScheduleTable(grid, { defaultJobName: 'Fern Hill' })
    expect(parsed.rows).toHaveLength(1)
    expect(parsed.rows[0].jobName).toBe('Fern Hill')
    expect(parsed.rows[0].description).toBe('Mass Excavation')
    expect(parsed.rows[0].unitPrice).toBe(18.5)
  })

  it('merges new rows and skips line items already on that job', () => {
    const existing = [
      {
        id: 'sov_1',
        jobName: 'Fern Hill',
        itemNumber: '1',
        description: 'Mobilization',
        unit: 'LS',
        bidQuantity: 1,
        unitPrice: 1,
        estimatedCost: 0,
        activity: 'Mobilization',
      },
    ]
    const merged = mergeJobLineItems(existing, [
      { jobName: 'Fern Hill', itemNumber: '1', description: 'Mobilization', unit: 'LS', bidQuantity: 1, unitPrice: 999, estimatedCost: 0, activity: 'Mobilization' },
      { jobName: 'Fern Hill', itemNumber: '2', description: 'Pump Station', unit: 'LS', bidQuantity: 1, unitPrice: 44000, estimatedCost: 0, activity: 'Pump Station' },
    ])
    expect(merged.added).toBe(1)
    expect(merged.skippedDuplicates).toBe(1)
    expect(merged.next).toHaveLength(2)
    expect(merged.next[0].unitPrice).toBe(1)
    expect(merged.next[1].description).toBe('Pump Station')
  })

  it('reads an .xlsx buffer from the Job Line Items sheet', () => {
    const ws = XLSX.utils.aoa_to_sheet([
      HEADERS,
      ['Captian Farm', '1', 'Clearing', 'AC', 3, 8500, 0],
      ['', '2', 'Grubbing', 'AC', 3, 4200, 0],
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['ignore']]), 'Cover')
    XLSX.utils.book_append_sheet(wb, ws, 'Job Line Items')
    const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
    const parsed = parseBidScheduleSource('captian-farm-sov.xlsx', buffer)
    expect(parsed.sheetName).toBe('Job Line Items')
    expect(parsed.rows).toHaveLength(2)
    expect(parsed.rows[1].jobName).toBe('Captian Farm')
    expect(parsed.rows[1].description).toBe('Grubbing')
  })

  it('refuses Keith’s live workbook filename', () => {
    expect(() => parseBidScheduleSource(LIVE_WORKBOOK_FILENAME, 'Job,Line item\nFern Hill,Test')).toThrow(/Import refused/)
  })

  it('parses quoted CSV cells', () => {
    const grid = parseDelimitedText('Job,Line item\nFern Hill,"Pipe, 8 inch DIP"')
    expect(grid[1][1]).toBe('Pipe, 8 inch DIP')
  })
})

describe('line item map and equipment helpers', () => {
  it('adds a missing cost-code / crosscode row and will not duplicate it', () => {
    const books = createMasterDataOnly()
    expect(lineItemAlreadyMapped(books, 'Pump Station')).toBe(false)
    const next = addLineItemToMap(books, 'Pump Station')
    expect(lineItemAlreadyMapped(next, 'Pump Station')).toBe(true)
    const again = addLineItemToMap(next, 'pump station')
    expect(again.lineItemMap.length).toBe(next.lineItemMap.length)
    const row = next.lineItemMap.find((m) => m.activity === 'Pump Station')
    expect(row?.laborAccount).toMatch(/^5090/)
    expect(row?.equipmentAccount).toMatch(/^5190/)
    expect(row?.materialsAccount).toMatch(/^5290/)
  })

  it('builds a blank equipment unit on the Other equipment account', () => {
    const eq = emptyEquipment({ name: 'Mini 35' })
    expect(eq.name).toBe('Mini 35')
    expect(eq.defaultAccount).toMatch(/^5190/)
    expect(eq.ownership).toBe('Owned')
    expect(emptyLineItemMapRow('Curb').activity).toBe('Curb')
  })
})
