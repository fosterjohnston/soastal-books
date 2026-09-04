import * as XLSX from 'xlsx'
import { assertImportSourceAllowed } from './denylist'
import { normLabel } from './formulas'
import { newId } from './posting'
import type { JobLineItem } from './types'

export type BidScheduleIncoming = Omit<JobLineItem, 'id'>

export type BidScheduleParseResult = {
  rows: BidScheduleIncoming[]
  sheetName: string
  warnings: string[]
}

export type BidScheduleMergeResult = {
  next: JobLineItem[]
  added: number
  skippedDuplicates: number
}

export type BidScheduleOptions = {
  defaultJobName?: string
  knownJobNames?: string[]
}

type ColKind = 'job' | 'itemNumber' | 'description' | 'unit' | 'qty' | 'price' | 'cost'

const PREFERRED_SHEETS = [
  'job line items',
  'job line item',
  'schedule of values',
  'sov',
  'bid schedule',
  'bid',
  'line items',
  'cost codes',
]

function cellText(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return String(value).replace(/\u00a0/g, ' ').trim()
}

function parseMoney(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const raw = cellText(value)
  if (!raw) return 0
  const paren = raw.match(/^\((.*)\)$/)
  const s = (paren ? `-${paren[1]}` : raw).replace(/[$,\s]/g, '')
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}

function normHeader(value: unknown): string {
  return cellText(value)
    .toLowerCase()
    .replace(/[#]/g, ' number ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function classifyHeader(value: unknown): ColKind | null {
  const n = normHeader(value)
  if (!n) return null
  if (
    n === 'line item' ||
    n === 'lineitem' ||
    n === 'description' ||
    n === 'activity' ||
    n === 'item name' ||
    n === 'item description' ||
    n === 'work' ||
    n === 'work item' ||
    n === 'pay item' ||
    n === 'cost code' ||
    n === 'costcode' ||
    n === 'crosscode' ||
    n === 'cross code'
  ) {
    return 'description'
  }
  if (n === 'job' || n === 'job name' || n === 'jobname' || n === 'project' || n === 'project name') return 'job'
  if (
    n === 'item number' ||
    n === 'item no' ||
    n === 'item' ||
    n === 'line number' ||
    n === 'line no' ||
    n === 'seq' ||
    n === 'number'
  ) {
    return 'itemNumber'
  }
  if (n === 'unit' || n === 'uom' || n === 'um' || n === 'units') return 'unit'
  if (
    n === 'quantity' ||
    n === 'qty' ||
    n === 'bid quantity' ||
    n === 'bid qty' ||
    n === 'qnty' ||
    n === 'qty bid'
  ) {
    return 'qty'
  }
  if (n === 'unit price' || n === 'unitprice' || n === 'price' || n === 'bid price' || n === 'rate' || n === 'unit rate') {
    return 'price'
  }
  if (
    n === 'estimated cost' ||
    n === 'est cost' ||
    n === 'est' ||
    n === 'budget' ||
    n === 'estimated' ||
    n === 'cost'
  ) {
    return 'cost'
  }
  if (n.includes('line item') || n.includes('description') || n.includes('cost code') || n.includes('crosscode')) {
    return 'description'
  }
  if (n.includes('job name') || (n.includes('job') && !n.includes('cost') && !n.includes('labor'))) return 'job'
  if (n.includes('item number') || n.endsWith(' item no')) return 'itemNumber'
  if (n.includes('unit price') || n.includes('bid price')) return 'price'
  if (n.includes('bid qty') || n.includes('quantity') || n === 'qty') return 'qty'
  if (n.includes('estimat') || n.includes('budget')) return 'cost'
  if (n === 'uom' || n.includes('unit') && !n.includes('price')) return 'unit'
  return null
}

function rowIsEmpty(row: unknown[]): boolean {
  return row.every((c) => cellText(c) === '')
}

function looksLikeTotal(description: string): boolean {
  const n = normLabel(description)
  return n === 'total' || n === 'subtotal' || n === 'grand total' || n.startsWith('total ') || n.endsWith(' total')
}

function scoreHeaderRow(row: unknown[]): { score: number; map: Partial<Record<ColKind, number>> } {
  const map: Partial<Record<ColKind, number>> = {}
  for (let i = 0; i < row.length; i++) {
    const kind = classifyHeader(row[i])
    if (kind && map[kind] == null) map[kind] = i
  }
  let score = Object.keys(map).length
  if (map.description != null) score += 3
  if (map.job != null) score += 1
  if (map.qty != null || map.price != null) score += 1
  return { score, map }
}

function findHeader(grid: unknown[][]): { index: number; map: Partial<Record<ColKind, number>> } | null {
  const limit = Math.min(grid.length, 25)
  let best: { index: number; map: Partial<Record<ColKind, number>>; score: number } | null = null
  for (let i = 0; i < limit; i++) {
    if (rowIsEmpty(grid[i] || [])) continue
    const { score, map } = scoreHeaderRow(grid[i] || [])
    if (map.description == null) continue
    if (score < 4) continue
    if (!best || score > best.score) best = { index: i, map, score }
  }
  return best ? { index: best.index, map: best.map } : null
}

function jobTokens(value: string): string[] {
  return normLabel(value).split(' ').filter(Boolean)
}

function isTokenPrefix(shorter: string[], longer: string[]): boolean {
  if (!shorter.length || shorter.length > longer.length) return false
  return shorter.every((token, i) => token === longer[i])
}

/** Exact name, else token prefix: "Craig Farm Rd" → "Craig Farm". */
export function matchKnownJob(value: string, known: string[] | undefined): string {
  const want = normLabel(value)
  if (!want || !known?.length) return value
  const exact = known.find((j) => normLabel(j) === want)
  if (exact) return exact
  const incoming = jobTokens(value)
  const ranked = known
    .map((j) => ({ j, tokens: jobTokens(j) }))
    .filter(({ tokens }) => isTokenPrefix(tokens, incoming) || isTokenPrefix(incoming, tokens))
    .sort((a, b) => b.tokens.length - a.tokens.length || b.j.length - a.j.length)
  return ranked[0]?.j || value
}

export function parseBidScheduleTable(grid: unknown[][], options: BidScheduleOptions = {}): BidScheduleParseResult {
  const warnings: string[] = []
  const header = findHeader(grid)
  if (!header) {
    throw new Error(
      'Could not find a bid-schedule header row. Need a Line item / Description / Cost code column, plus job, quantity, or unit price.',
    )
  }
  const { map } = header
  const rows: BidScheduleIncoming[] = []
  let lastJob = options.defaultJobName?.trim() || ''
  for (let r = header.index + 1; r < grid.length; r++) {
    const row = grid[r] || []
    if (rowIsEmpty(row)) continue
    const rawDesc = map.description != null ? cellText(row[map.description]) : ''
    if (!rawDesc || looksLikeTotal(rawDesc)) continue
    if (classifyHeader(rawDesc) === 'description') continue
    let job = map.job != null ? cellText(row[map.job]) : ''
    if (job) {
      const matched = matchKnownJob(job, options.knownJobNames)
      if (matched !== job && normLabel(matched) !== normLabel(job)) {
        const note = `Used job “${matched}” for “${job}”.`
        if (!warnings.includes(note)) warnings.push(note)
      } else if (options.knownJobNames?.length && !options.knownJobNames.some((j) => normLabel(j) === normLabel(matched))) {
        const note = `Job “${job}” is not on Setup — add it there, or pick the job on each row.`
        if (!warnings.includes(note)) warnings.push(note)
      }
      job = matched
      lastJob = job
    } else {
      job = lastJob
    }
    if (!job) {
      warnings.push(`Row ${r + 1} (${rawDesc}) has no job name — skipped. Pick a job filter or add a Job column.`)
      continue
    }
    const itemNumber = map.itemNumber != null ? cellText(row[map.itemNumber]) : ''
    const unit = map.unit != null ? cellText(row[map.unit]) : 'LS'
    rows.push({
      jobName: job,
      itemNumber,
      description: rawDesc,
      unit: unit || 'LS',
      bidQuantity: map.qty != null ? parseMoney(row[map.qty]) : 1,
      unitPrice: map.price != null ? parseMoney(row[map.price]) : 0,
      estimatedCost: map.cost != null ? parseMoney(row[map.cost]) : 0,
      activity: rawDesc,
    })
  }
  if (rows.length === 0) {
    throw new Error('That file had headers but no line-item rows to add.')
  }
  return { rows, sheetName: '', warnings }
}

export function parseDelimitedText(text: string): unknown[][] {
  const raw = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const first = raw.split('\n')[0] || ''
  const tabs = (first.match(/\t/g) || []).length
  const commas = (first.match(/,/g) || []).length
  const delim = tabs > commas ? '\t' : ','
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]
    if (quoted) {
      if (ch === '"') {
        if (raw[i + 1] === '"') {
          cell += '"'
          i++
        } else {
          quoted = false
        }
      } else {
        cell += ch
      }
      continue
    }
    if (ch === '"') {
      quoted = true
      continue
    }
    if (ch === delim) {
      row.push(cell)
      cell = ''
      continue
    }
    if (ch === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
      continue
    }
    cell += ch
  }
  if (cell.length || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows
}

function pickSheetName(names: string[]): string {
  const ranked = names.map((name, index) => {
    const n = normLabel(name)
    const pref = PREFERRED_SHEETS.findIndex((p) => n === p || n.includes(p))
    return { name, index, rank: pref === -1 ? 100 + index : pref }
  })
  ranked.sort((a, b) => a.rank - b.rank)
  return ranked[0]?.name || names[0]
}

export function parseBidScheduleWorkbook(buffer: ArrayBuffer, options: BidScheduleOptions = {}): BidScheduleParseResult {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: false })
  if (!wb.SheetNames.length) throw new Error('That workbook has no sheets.')
  const candidates = [...wb.SheetNames]
  const preferred = pickSheetName(candidates)
  const tryOrder = [preferred, ...candidates.filter((n) => n !== preferred)]
  let lastError: Error | null = null
  for (const sheetName of tryOrder) {
    const ws = wb.Sheets[sheetName]
    if (!ws) continue
    const grid = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' }) as unknown[][]
    try {
      const parsed = parseBidScheduleTable(grid, options)
      return { ...parsed, sheetName }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
    }
  }
  throw lastError || new Error('Could not read a bid schedule from that workbook.')
}

export function parseBidScheduleSource(
  sourceName: string,
  payload: ArrayBuffer | string,
  options: BidScheduleOptions = {},
): BidScheduleParseResult {
  assertImportSourceAllowed(sourceName)
  const lower = sourceName.toLowerCase()
  if (typeof payload === 'string' || lower.endsWith('.csv') || lower.endsWith('.tsv') || lower.endsWith('.txt')) {
    const text = typeof payload === 'string' ? payload : new TextDecoder().decode(payload)
    const parsed = parseBidScheduleTable(parseDelimitedText(text), options)
    return { ...parsed, sheetName: 'csv' }
  }
  if (typeof payload === 'string') {
    const parsed = parseBidScheduleTable(parseDelimitedText(payload), options)
    return { ...parsed, sheetName: 'csv' }
  }
  return parseBidScheduleWorkbook(payload, options)
}

export async function parseBidScheduleFile(file: File, options: BidScheduleOptions = {}): Promise<BidScheduleParseResult> {
  assertImportSourceAllowed(file.name)
  const lower = file.name.toLowerCase()
  if (lower.endsWith('.csv') || lower.endsWith('.tsv') || lower.endsWith('.txt')) {
    return parseBidScheduleSource(file.name, await file.text(), options)
  }
  return parseBidScheduleSource(file.name, await file.arrayBuffer(), options)
}

export function jobLineItemKey(jobName: string, description: string): string {
  return `${normLabel(jobName)}|${normLabel(description)}`
}

export function mergeJobLineItems(existing: JobLineItem[], incoming: BidScheduleIncoming[]): BidScheduleMergeResult {
  const seen = new Set(existing.map((r) => jobLineItemKey(r.jobName, r.description)))
  const next = [...existing]
  let added = 0
  let skippedDuplicates = 0
  for (const row of incoming) {
    const key = jobLineItemKey(row.jobName, row.description)
    if (seen.has(key)) {
      skippedDuplicates++
      continue
    }
    seen.add(key)
    next.push({ ...row, id: newId('sov') })
    added++
  }
  return { next, added, skippedDuplicates }
}
