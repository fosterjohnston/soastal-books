import { deriveAccount } from './accounts'
import { computeRow } from './formulas'
import { emptyDraft, newId } from './posting'
import type {
  CodingProposal,
  CompanyBooks,
  CostType,
  DocumentKind,
  PaymentMethod,
  PoStatus,
  SourceType,
  TransactionDraft,
} from './types'

export type IntakeHints = {
  filename: string
  text?: string
  vendor?: string
  invoiceNumber?: string
  jobName?: string
  amount?: number
  kind?: DocumentKind
  poNumber?: string
}

const PO_NAME = /\bpo[-_ ]?(\d+[a-z0-9-]*)/i
const INVOICE_NAME = /\b(?:inv|invoice|bill)[-_ ]?([a-z0-9][a-z0-9._-]*)/i
const AMOUNT_NAME = /(?:\$|usd[-_ ]?)(\d{1,3}(?:,\d{3})+(?:\.\d{2})?|\d+\.\d{2}|\d+)/i
const PO_KIND = /\b(purchase[-_ ]?order|\bpo\b)/i
const AP_KIND = /\b(a\/?p|accounts[-_ ]?payable)\b/i

export function safeCopyFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'document'
}

export function copyRelativePath(id: string, originalName: string): string {
  const safe = safeCopyFilename(originalName)
  return `Documents/Finance/Soastal Books/inbox/${id}-${safe}`
}

export function booksCopyPath(when = new Date()): string {
  const stamp = when.toISOString().replace(/[:.]/g, '-').slice(0, 19)
  return `Documents/Finance/Soastal Books/soastal-books-${stamp}.json`
}

export function detectKind(filename: string, hinted?: DocumentKind): DocumentKind {
  if (hinted) return hinted
  const n = filename.toLowerCase()
  if (PO_KIND.test(n)) return 'po'
  if (AP_KIND.test(n) || /\bbill\b/.test(n)) return 'ap'
  return 'bill'
}

function haystack(hints: IntakeHints): string {
  return `${hints.filename} ${hints.text ?? ''} ${hints.vendor ?? ''} ${hints.jobName ?? ''} ${hints.invoiceNumber ?? ''} ${hints.poNumber ?? ''}`
}

function normalizeHay(s: string): string {
  return s.toLowerCase().replace(/[&._/-]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function matchVendor(books: CompanyBooks, hay: string, hinted?: string): { name: string; reason?: string } {
  if (hinted) {
    const exact = books.vendors.find((v) => v.name.toLowerCase() === hinted.trim().toLowerCase())
    if (exact) return { name: exact.name, reason: `Vendor from intake: ${exact.name}` }
  }
  const lower = normalizeHay(hay)
  const ranked = books.vendors
    .filter((v) => v.active)
    .map((v) => {
      const name = normalizeHay(v.name)
      const token = name.split(/\s+/)[0]
      if (name.length >= 2 && lower.includes(name)) return { v, score: 3 }
      if (token.length >= 3 && lower.includes(token)) return { v, score: 2 }
      return { v, score: 0 }
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
  if (ranked[0]) return { name: ranked[0].v.name, reason: `Filename/text matched vendor ${ranked[0].v.name}` }
  return { name: 'Vulcan Materials' }
}

function matchJob(books: CompanyBooks, hay: string, hinted?: string): { name: string; reason?: string } {
  if (hinted) {
    const exact = books.jobs.find((j) => j.jobName.toLowerCase() === hinted.trim().toLowerCase())
    if (exact) return { name: exact.jobName, reason: `Job from intake: ${exact.jobName}` }
  }
  const lower = normalizeHay(hay)
  const hit = books.jobs.find((j) => j.slot !== 30 && lower.includes(normalizeHay(j.jobName)))
  if (hit) return { name: hit.jobName, reason: `Filename/text matched job ${hit.jobName}` }
  const byNumber = books.jobs.find((j) => j.jobNumber && lower.includes(j.jobNumber.toLowerCase()))
  if (byNumber) return { name: byNumber.jobName, reason: `Matched job number ${byNumber.jobNumber}` }
  const first = books.jobs.find((j) => j.slot === 1) ?? books.jobs[0]
  return { name: first?.jobName ?? 'Fern Hill' }
}

function matchLineItem(books: CompanyBooks, jobName: string, hay: string, costType: CostType): string {
  if (costType !== 'Materials' && costType !== 'Labor' && costType !== 'Equipment') return ''
  const hayN = normalizeHay(hay)
  const rows = books.jobLineItems.filter((s) => s.jobName === jobName)
  const scored = rows
    .map((s) => {
      const desc = normalizeHay(s.description)
      const act = normalizeHay(s.activity || '')
      let score = 0
      if (desc.length >= 3 && hayN.includes(desc)) score += 6
      if (act.length >= 3 && hayN.includes(act)) score += 2
      const tokens = desc.split(' ').filter((t) => t.length >= 3)
      score += tokens.filter((t) => hayN.includes(t)).length
      return { s, score }
    })
    .sort((a, b) => b.score - a.score)
  if (scored[0] && scored[0].score > 0) return scored[0].s.description
  return ''
}

function guessCostType(hay: string, vendorType?: string): CostType {
  const n = hay.toLowerCase()
  if (/subcontractor|paving sub|concrete sub|landscape/.test(n) || vendorType === 'Subcontractor') return 'Subcontractor'
  if (/labor|payroll|adp/.test(n) || vendorType === 'Payroll') return 'Labor'
  if (/equip|rental|excavator|dozer/.test(n) || vendorType === 'Equipment Dealer' || vendorType === 'Equipment Rental') return 'Equipment'
  if (/overhead|office|insurance|rent|accountant/.test(n) || vendorType === 'Overhead' || vendorType === 'Professional') {
    return 'Overhead'
  }
  if (/styo|johnston|pay.?app|revenue/.test(n) || vendorType === 'Customer') return 'Revenue'
  return 'Materials'
}

function parseAmount(hints: IntakeHints, hay: string): number {
  if (typeof hints.amount === 'number' && Number.isFinite(hints.amount) && hints.amount !== 0) {
    return Math.round(hints.amount * 100) / 100
  }
  const m = hay.match(AMOUNT_NAME)
  if (!m) return 0
  return Math.round(Number(m[1].replace(/,/g, '')) * 100) / 100
}

function parseInvoice(hints: IntakeHints, hay: string, kind: DocumentKind): string {
  if (hints.invoiceNumber?.trim()) return hints.invoiceNumber.trim()
  const inv = hay.match(INVOICE_NAME)
  if (inv) return inv[1].toUpperCase()
  const po = hay.match(PO_NAME)
  if (po) return `PO-${po[1].toUpperCase()}`
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  return kind === 'po' ? `PO-${stamp}` : `SCAN-${stamp}-${newId('doc').slice(-4)}`
}

export function proposeCoding(books: CompanyBooks, hints: IntakeHints): CodingProposal {
  const hay = haystack(hints)
  const kind = detectKind(hints.filename, hints.kind)
  const vendorHit = matchVendor(books, hay, hints.vendor)
  const vendor = books.vendors.find((v) => v.name === vendorHit.name)
  const costType = guessCostType(hay, vendor?.type)
  const isRevenue = costType === 'Revenue'
  const jobHit = isRevenue || costType === 'Overhead' ? { name: costType === 'Overhead' ? 'N/A - Overhead' : matchJob(books, hay, hints.jobName).name, reason: undefined } : matchJob(books, hay, hints.jobName)
  const jobName = costType === 'Overhead' ? 'N/A - Overhead' : jobHit.name
  const poMatch = hints.poNumber?.trim() || hay.match(PO_NAME)?.[1]
  const poNumber = poMatch ? String(poMatch) : ''
  const poStatus: PoStatus = kind === 'po' || poNumber ? 'Matched to PO' : 'Missing - Get Approval'
  const amountRaw = parseAmount(hints, hay)
  const amount = isRevenue ? -Math.abs(amountRaw || 0) : Math.abs(amountRaw || 0)
  const lineItem = matchLineItem(books, jobName, hay, costType)
  const paymentMethod: PaymentMethod = isRevenue ? 'Billed / AR' : 'Unpaid / AP'
  const sourceType: SourceType = kind === 'po' ? 'Bill / Invoice' : isRevenue ? 'Bill / Invoice' : 'Bill / Invoice'
  const derived = deriveAccount(books, {
    sourceType,
    paymentMethod,
    costType,
    vendor: vendorHit.name,
    jobName,
    lineItem,
    invoiceNumber: parseInvoice(hints, hay, kind),
  })
  const overrideAccount = derived.shouldBeBlank ? '' : derived.account

  const draft: TransactionDraft = emptyDraft({
    vendor: vendorHit.name,
    invoiceNumber: parseInvoice(hints, hay, kind),
    sourceType,
    paymentMethod,
    invoiceTotal: amount,
    allocationAmount: amount,
    jobName,
    costType,
    lineItem,
    overrideAccount,
    poStatus,
    poNumber,
  })
  const computed = computeRow(books, draft, [...books.transactions, draft])

  const reasons: string[] = []
  if (vendorHit.reason) reasons.push(vendorHit.reason)
  if (jobHit.reason) reasons.push(jobHit.reason)
  if (lineItem) reasons.push(`Line item ${lineItem} on ${jobName}`)
  if (computed.finalAccount) reasons.push(`Suggested ${computed.finalAccount} / offset ${computed.offsetAccount}`)
  if (poStatus === 'Missing - Get Approval') reasons.push('No PO on the scan — Keith can still post, or ask Foster if the coding is unclear')
  else reasons.push(`PO ${poNumber} matched`)
  reasons.push('Money out is positive. Money in is negative. Unpaid / AP offsets 2000.')

  const confidence: CodingProposal['confidence'] =
    vendorHit.reason && jobHit.reason && amount !== 0 ? 'high' : vendorHit.reason || amount !== 0 ? 'medium' : 'low'

  const summary = `This is where I think it goes: ${vendorHit.name} ${draft.invoiceNumber} → ${jobName || 'no job'} ${costType}${
    lineItem ? ` / ${lineItem}` : ''
  } ${computed.finalAccount || 'account TBD'} / offset ${computed.offsetAccount || 'TBD'} (${amount || 'amount TBD'}).`

  return {
    summary,
    vendor: vendorHit.name,
    invoiceNumber: draft.invoiceNumber,
    jobName,
    costType,
    lineItem,
    paymentMethod,
    sourceType,
    amount,
    poStatus,
    poNumber,
    overrideAccount,
    suggestedAccount: computed.suggestedAccount || computed.finalAccount,
    offsetAccount: computed.offsetAccount,
    confidence,
    reasons,
  }
}

export function draftFromProposal(proposal: CodingProposal): TransactionDraft {
  return emptyDraft({
    vendor: proposal.vendor,
    invoiceNumber: proposal.invoiceNumber,
    sourceType: proposal.sourceType,
    paymentMethod: proposal.paymentMethod,
    invoiceTotal: proposal.amount,
    allocationAmount: proposal.amount,
    jobName: proposal.costType === 'Revenue' || proposal.paymentMethod === 'Billed / AR' ? proposal.jobName : proposal.jobName,
    costType: proposal.costType,
    lineItem: proposal.lineItem,
    overrideAccount: proposal.overrideAccount,
    poStatus: proposal.poStatus,
    poNumber: proposal.poNumber,
    approvalStatus: 'Needs Approval',
    posted: false,
    notes: proposal.summary,
  })
}
