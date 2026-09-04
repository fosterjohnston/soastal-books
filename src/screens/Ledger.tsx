'use client'

import { useMemo, useState } from 'react'
import {
  allocationHint,
  applyDerivedOverride,
  askFosterReview,
  canPost,
  computeLedger,
  emptyDraft,
  FORMULA_COLUMNS,
  invoiceNumberHint,
  invoiceTotalHint,
  moneyDirection,
  overrideHint,
  paymentMethodHint,
  postDocument,
  removeTransactions,
  type TransactionDraft,
  upsertTransactions,
  validateDocument,
} from '../engine'
import { formatDate } from '../lib/utils'
import { useBooks } from '../store/BooksContext'
import {
  APPROVAL_STATUS_LIST,
  COST_TYPE_LIST,
  PAYMENT_METHOD_LIST,
  PO_STATUS_LIST,
  SOURCE_TYPE_LIST,
} from '../engine/lists'
import { Badge, Button, Card, Field, Input, Select, Textarea } from '../components/ui'
import { Money } from '../components/Money'

const LOCKED = new Set(FORMULA_COLUMNS)

export function Ledger() {
  const { books, setBooks } = useBooks()
  const ledger = computeLedger(books)
  const [selectedId, setSelectedId] = useState<string | null>(ledger[0]?.id ?? null)
  const [jobFilter, setJobFilter] = useState('')
  const [q, setQ] = useState('')
  const [onlyOpen, setOnlyOpen] = useState(false)
  const [reviewQuestion, setReviewQuestion] = useState('')

  const rows = useMemo(() => {
    return ledger.filter((r) => {
      if (jobFilter && r.jobName !== jobFilter) return false
      if (onlyOpen && r.posted) return false
      if (q) {
        const hay = `${r.vendor} ${r.invoiceNumber} ${r.jobName} ${r.notes}`.toLowerCase()
        if (!hay.includes(q.toLowerCase())) return false
      }
      return true
    })
  }, [ledger, jobFilter, q, onlyOpen])

  const selected = books.transactions.find((t) => t.id === selectedId) ?? null
  const computed = ledger.find((r) => r.id === selectedId)

  function patch(p: Partial<TransactionDraft>) {
    if (!selected) return
    const next = { ...selected, ...p, posted: false }
    const userSetOverride = 'overrideAccount' in p
    const codingChanged = (
      ['sourceType', 'paymentMethod', 'costType', 'vendor', 'jobName', 'lineItem', 'invoiceNumber'] as const
    ).some((k) => k in p)
    if (userSetOverride || !codingChanged) {
      setBooks(upsertTransactions(books, [next]))
      return
    }
    setBooks(upsertTransactions(books, [applyDerivedOverride(books, next, false)]))
  }

  function addRow(split: boolean) {
    const base = selected
    const row = emptyDraft({
      vendor: split && base ? base.vendor : '',
      invoiceNumber: split && base ? base.invoiceNumber : '',
      sourceType: split && base ? base.sourceType : 'Bill / Invoice',
      postingDate: split && base ? base.postingDate : emptyDraft().postingDate,
      invoiceDate: split && base ? base.invoiceDate : emptyDraft().invoiceDate,
      dueDate: split && base ? base.dueDate : emptyDraft().dueDate,
      paymentMethod: split && base ? base.paymentMethod : 'Unpaid / AP',
      checkRef: split && base ? base.checkRef : '',
      jobName: split && base ? base.jobName : '',
      costType: split && base ? base.costType : 'Materials',
      invoiceTotal: 0,
      poStatus: split && base ? base.poStatus : 'No PO Required',
    })
    setBooks(upsertTransactions(books, [row]))
    setSelectedId(row.id)
  }

  function onPost() {
    if (!selected) return
    const group = books.transactions.filter(
      (t) => t.vendor === selected.vendor && t.invoiceNumber === selected.invoiceNumber,
    )
    const ids = group.map((g) => g.id)
    const gate = canPost(books, ids)
    if (!gate.ok) {
      window.alert(gate.issues.filter((i) => i.level === 'error').map((i) => i.message).join('\n'))
      return
    }
    setBooks(postDocument(books, ids))
  }

  const issues = selected ? validateDocument(books, selected.vendor, selected.invoiceNumber) : []
  const sovItems = books.jobLineItems.filter((s) => !selected?.jobName || s.jobName === selected.jobName)
  const sovNames = new Set(sovItems.map((s) => s.description))
  const mappedExtras = books.lineItemMap.filter((m) => !sovNames.has(m.activity))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl">Transactions</h1>
          <p className="max-w-2xl text-sm text-ink-2">
            Keith’s ledger. Same cheat sheet: money out is positive, money in is negative — that signed amount goes in
            Invoice Total (first split only). Payment Method sets the offset. Formula columns autofill. Foster does
            not have to approve.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => addRow(false)}>Add row</Button>
          <Button variant="ghost" onClick={() => addRow(true)} disabled={!selected}>
            Add split
          </Button>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-4">
        <Input placeholder="Search vendor, invoice, notes" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={jobFilter} onChange={(e) => setJobFilter(e.target.value)}>
          <option value="">All jobs</option>
          {books.jobs.map((j) => (
            <option key={j.id} value={j.jobName}>
              {j.jobName}
            </option>
          ))}
        </Select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} />
          Unposted only
        </label>
      </div>

      <div className="overflow-auto rounded-xl border border-line" style={{ maxHeight: 360 }}>
        <table className="ledger-table w-full">
          <thead>
            <tr>
              <th>Posting date</th>
              <th>Vendor</th>
              <th>Invoice #</th>
              <th>Source type</th>
              <th>Payment method</th>
              <th>Invoice total</th>
              <th>Allocation amount</th>
              <th>Job name</th>
              <th>Cost type</th>
              <th>Line item</th>
              <th>Override</th>
              <th>PO #</th>
              <th>Approval</th>
              <th>Final acct</th>
              <th>Offset</th>
              <th>Diff</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={16} className="!whitespace-normal text-ink-2">
                  No rows match. Enter a vendor bill from the recipes, or add a row.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.id}
                  className={r.id === selectedId ? 'selected' : ''}
                  onClick={() => setSelectedId(r.id)}
                >
                  <td>{formatDate(r.postingDate)}</td>
                  <td>{r.vendor}</td>
                  <td>{r.invoiceNumber}</td>
                  <td>{r.sourceType}</td>
                  <td>{r.paymentMethod}</td>
                  <td>{r.invoiceTotal ? <Money n={r.invoiceTotal} /> : ''}</td>
                  <td>
                    <Money n={r.allocationAmount} />
                  </td>
                  <td>{r.jobName || '—'}</td>
                  <td>{r.costType}</td>
                  <td>{r.lineItem || '—'}</td>
                  <td className="formula-cell">{r.overrideAccount || '—'}</td>
                  <td>{r.poNumber || '—'}</td>
                  <td>
                    <Badge
                      tone={
                        r.approvalStatus === 'Ready for Accountant'
                          ? 'teal'
                          : r.approvalStatus === 'Paid'
                            ? 'ink'
                            : r.approvalStatus === 'Hold / Dispute' || r.approvalStatus === 'Needs Approval'
                              ? 'sand'
                              : 'muted'
                      }
                    >
                      {r.approvalStatus}
                    </Badge>
                  </td>
                  <td className="formula-cell">{r.finalAccount || '—'}</td>
                  <td className="formula-cell">{r.offsetAccount || '—'}</td>
                  <td className={Math.abs(r.difference) > 0.005 ? 'diff-bad' : 'formula-cell'}>
                    <Money n={r.difference} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && computed ? (
        <Card
          title={`Edit ${selected.vendor || 'new row'} ${selected.invoiceNumber}`}
          action={
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setBooks(removeTransactions(books, [selected.id]))}>
                Delete
              </Button>
              <Button onClick={onPost} disabled={selected.posted || Math.abs(computed.difference) > 0.005}>
                {selected.posted ? 'Posted' : 'Post document'}
              </Button>
            </div>
          }
        >
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
            <Field label="Posting Date">
              <Input type="date" value={selected.postingDate} onChange={(e) => patch({ postingDate: e.target.value })} />
            </Field>
            <Field label="Vendor">
              <Select value={selected.vendor} onChange={(e) => patch({ vendor: e.target.value })}>
                <option value="">Select vendor</option>
                {books.vendors.filter((v) => v.active).map((v) => (
                  <option key={v.id} value={v.name}>
                    {v.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Invoice / Receipt #" hint={invoiceNumberHint()}>
              <Input value={selected.invoiceNumber} onChange={(e) => patch({ invoiceNumber: e.target.value })} />
            </Field>
            <Field label="Source Type">
              <Select
                value={selected.sourceType}
                onChange={(e) => patch({ sourceType: e.target.value as TransactionDraft['sourceType'] })}
              >
                {SOURCE_TYPE_LIST.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
              </Select>
            </Field>
            <Field label="Invoice Date">
              <Input type="date" value={selected.invoiceDate} onChange={(e) => patch({ invoiceDate: e.target.value })} />
            </Field>
            <Field label="Due Date">
              <Input type="date" value={selected.dueDate} onChange={(e) => patch({ dueDate: e.target.value })} />
            </Field>
            <Field label="Payment Method" hint={paymentMethodHint(computed.offsetAccount)}>
              <Select
                value={selected.paymentMethod}
                onChange={(e) => patch({ paymentMethod: e.target.value as TransactionDraft['paymentMethod'] })}
              >
                {PAYMENT_METHOD_LIST.map((p) => (
                  <option key={p}>{p}</option>
                ))}
                {selected.paymentMethod && !PAYMENT_METHOD_LIST.includes(selected.paymentMethod as (typeof PAYMENT_METHOD_LIST)[number]) ? (
                  <option value={selected.paymentMethod}>{selected.paymentMethod}</option>
                ) : null}
              </Select>
            </Field>
            <Field label="Check / Ref #">
              <Input value={selected.checkRef} onChange={(e) => patch({ checkRef: e.target.value })} />
            </Field>
            <Field label="Invoice Total" hint={invoiceTotalHint(moneyDirection(selected))}>
              <Input
                type="number"
                step="0.01"
                value={selected.invoiceTotal || ''}
                onChange={(e) => patch({ invoiceTotal: e.target.value === '' ? 0 : Number(e.target.value) })}
              />
            </Field>
            <Field label="Allocation Amount" hint={allocationHint(moneyDirection(selected))}>
              <Input
                type="number"
                step="0.01"
                value={selected.allocationAmount || ''}
                onChange={(e) => patch({ allocationAmount: e.target.value === '' ? 0 : Number(e.target.value) })}
              />
            </Field>
            <Field label="Job (name)">
              <Select value={selected.jobName} onChange={(e) => patch({ jobName: e.target.value, lineItem: '' })}>
                <option value="">(blank — required on AP payments)</option>
                {books.jobs.map((j) => (
                  <option key={j.id} value={j.jobName}>
                    {j.jobName}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Cost Type">
              <Select
                value={selected.costType}
                onChange={(e) => patch({ costType: e.target.value as TransactionDraft['costType'] })}
              >
                {COST_TYPE_LIST.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
              </Select>
            </Field>
            <Field label="Line Item / Activity" hint="Dropdown is the Line Item Map. On-this-job items listed first. Autofill Suggested Account for Labor / Equipment / Materials.">
              <Select value={selected.lineItem} onChange={(e) => patch({ lineItem: e.target.value })}>
                <option value="">(none)</option>
                <optgroup label="On this job">
                  {sovItems.map((s) => (
                    <option key={s.id} value={s.description}>
                      {s.description}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="All cost codes">
                  {mappedExtras.map((m) => (
                    <option key={m.id} value={m.activity}>
                      {m.activity}
                    </option>
                  ))}
                </optgroup>
              </Select>
            </Field>
            <Field label="Equipment" hint="Optional. Named list from Setup.">
              <Select value={selected.equipmentUnit} onChange={(e) => patch({ equipmentUnit: e.target.value })}>
                <option value="">(none)</option>
                {books.equipment.map((e) => (
                  <option key={e.id} value={e.name}>
                    {e.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Override Account" hint={overrideHint()}>
              <Select value={selected.overrideAccount} onChange={(e) => patch({ overrideAccount: e.target.value })}>
                <option value=""></option>
                {books.chartOfAccounts.map((a) => (
                  <option key={a.number} value={`${a.number} - ${a.name}`}>
                    {a.number} - {a.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Suggested Account" hint="Autofill from Line Item Map (Labor / Equipment / Materials) or vendor default.">
              <Input readOnly value={computed.suggestedAccount} className="bg-paper-2" />
            </Field>
            <Field label="Final Account">
              <Input readOnly value={computed.finalAccount} className="bg-paper-2" />
            </Field>
            <Field label="PO Status" hint="Coding field on the bill — not a PO system.">
              <Select
                value={selected.poStatus}
                onChange={(e) => patch({ poStatus: e.target.value as TransactionDraft['poStatus'] })}
              >
                {PO_STATUS_LIST.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
              </Select>
            </Field>
            <Field label="PO #">
              <Input value={selected.poNumber} onChange={(e) => patch({ poNumber: e.target.value })} />
            </Field>
            <Field label="Approval">
              <Select
                value={selected.approvalStatus}
                onChange={(e) => patch({ approvalStatus: e.target.value as TransactionDraft['approvalStatus'] })}
              >
                {APPROVAL_STATUS_LIST.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </Select>
            </Field>
            <Field label="Paid date" hint="Date cash moved. Blank on unpaid AP.">
              <Input type="date" value={selected.paidDate} onChange={(e) => patch({ paidDate: e.target.value })} />
            </Field>
            <Field label="Total Allocated">
              <Input readOnly value={computed.totalAllocated} className="bg-paper-2" />
            </Field>
            <Field label="Difference">
              <Input readOnly value={computed.difference} className={Math.abs(computed.difference) > 0.005 ? 'bg-red-50' : 'bg-paper-2'} />
            </Field>
            <Field label="Invoice Key">
              <Input readOnly value={computed.invoiceKey} className="bg-paper-2" />
            </Field>
            <Field label="Offset Suggested">
              <Input readOnly value={computed.offsetSuggested} className="bg-paper-2" />
            </Field>
            <Field label="Offset Override" hint="Rare. Payment Method usually sets offset.">
              <Select value={selected.offsetOverride} onChange={(e) => patch({ offsetOverride: e.target.value })}>
                <option value=""></option>
                {books.chartOfAccounts.map((a) => (
                  <option key={a.number} value={`${a.number} - ${a.name}`}>
                    {a.number} - {a.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Offset Account">
              <Input readOnly value={computed.offsetAccount} className="bg-paper-2" />
            </Field>
            <Field label="Notes" >
              <Textarea value={selected.notes} onChange={(e) => patch({ notes: e.target.value })} />
            </Field>
          </div>
            <Field label="Line Item on This Job?">
              <Input readOnly value={computed.lineItemOnThisJob} className="bg-paper-2" />
            </Field>
          {issues.length ? (
            <ul className="mt-3 space-y-1 text-sm">
              {issues.map((i, idx) => (
                <li key={idx} className={i.level === 'error' ? 'text-danger' : 'text-ink-2'}>
                  {i.level === 'error' ? 'Error' : 'Check'}: {i.message}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-teal">Document checks clean. Difference {computed.difference.toFixed(2)}.</p>
          )}
          <div className="mt-4 rounded-lg border border-line bg-paper p-3">
            <p className="text-sm font-semibold">Ask Foster if this row is unclear</p>
            <p className="mt-1 text-xs text-ink-2">
              Optional. Keith still posts. Foster answers on the Review tab.
            </p>
            <Textarea
              className="mt-2"
              placeholder="What’s unclear — job, account, PO, amount…"
              value={reviewQuestion}
              onChange={(e) => setReviewQuestion(e.target.value)}
            />
            <Button
              className="mt-2"
              variant="sand"
              onClick={() => {
                const group = books.transactions.filter(
                  (t) => t.vendor === selected.vendor && t.invoiceNumber === selected.invoiceNumber,
                )
                setBooks(askFosterReview(books, group.map((g) => g.id), reviewQuestion))
                setReviewQuestion('')
              }}
            >
              Send to Review
            </Button>
          </div>
          <p className="mt-2 text-xs text-ink-2">Editing a posted row re-opens it as unposted so you can fix and post again.</p>
        </Card>
      ) : null}
    </div>
  )
}
