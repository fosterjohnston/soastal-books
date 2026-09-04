'use client'

import { useMemo, useState } from 'react'
import {
  buildSplitDocument,
  canPost,
  deriveAccount,
  displayAccount,
  documentDifference,
  emptyDraft,
  isPaidPaymentMethod,
  money,
  offsetLabel,
  paymentForSource,
  postDocument,
  upsertTransactions,
  type CostType,
  type PaymentMethod,
  type SourceType,
} from '../engine'
import { COST_TYPE_LIST, PAYMENT_METHOD_LIST, SOURCE_TYPE_LIST } from '../engine/lists'
import { useBooks } from '../store/BooksContext'
import { Button, Field, Input, Select } from '../components/ui'

type SplitLine = {
  key: string
  jobName: string
  costType: CostType
  lineItem: string
  amount: string
  overrideAccount: string
  overrideTouched: boolean
}

function newKey(): string {
  return `split_${Math.random().toString(36).slice(2, 10)}`
}

export function EnterTransaction() {
  const { books, setBooks } = useBooks()
  const defaultJob = books.jobs.find((j) => j.slot === 1)?.jobName || 'Fern Hill'
  const [sourceType, setSourceType] = useState<SourceType | ''>('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('')
  const [vendor, setVendor] = useState(books.vendors.find((v) => v.active)?.name || '')
  const [invoice, setInvoice] = useState('')
  const [postingDate, setPostingDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [dueDate, setDueDate] = useState('')
  const [checkRef, setCheckRef] = useState('')
  const [invoiceTotal, setInvoiceTotal] = useState('')
  const [splits, setSplits] = useState<SplitLine[]>([
    { key: newKey(), jobName: defaultJob, costType: 'Materials', lineItem: '', amount: '', overrideAccount: '', overrideTouched: false },
  ])
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState<string[]>([])

  const method = paymentMethod
  const showDue = method === 'Unpaid / AP' || method === 'Billed / AR'
  const showRef = method === 'Check' || method === 'ACH / Wire' || method === 'Deposit' || method === 'Auto-Pay'
  const control = Number(invoiceTotal)
  const allocations = splits.map((s) => Number(s.amount) || 0)
  const difference = documentDifference(Number.isFinite(control) ? control : 0, allocations)
  const offset = method ? offsetLabel(books, method) : ''

  function lineItemsFor(jobName: string): { onJob: string[]; extras: string[] } {
    const onJob = books.jobLineItems.filter((s) => s.jobName === jobName).map((s) => s.description)
    const names = new Set(onJob)
    const extras = books.lineItemMap.filter((m) => !names.has(m.activity)).map((m) => m.activity)
    return { onJob, extras }
  }

  function onSource(next: SourceType | '') {
    setSourceType(next)
    if (next) setPaymentMethod(paymentForSource(next))
  }

  function patchSplit(key: string, next: Partial<SplitLine>) {
    setSplits((prev) => prev.map((s) => (s.key === key ? { ...s, ...next } : s)))
  }

  function addSplit() {
    const last = splits[splits.length - 1]
    setSplits((prev) => [
      ...prev,
      {
        key: newKey(),
        jobName: last?.jobName || defaultJob,
        costType: last?.costType || 'Materials',
        lineItem: '',
        amount: '',
        overrideAccount: '',
        overrideTouched: false,
      },
    ])
  }

  function removeSplit(key: string) {
    setSplits((prev) => (prev.length <= 1 ? prev : prev.filter((s) => s.key !== key)))
  }

  const liveErrors = useMemo(() => {
    const list: string[] = []
    if (!sourceType) list.push('Select what this transaction is.')
    if (!method) list.push('Select a payment method. That sets the offset.')
    if (!vendor.trim()) list.push('Vendor is required.')
    if (!invoice.trim()) list.push('Invoice / receipt # is required.')
    if (!invoiceTotal.trim() || !Number.isFinite(control) || control === 0) {
      list.push('Invoice total is the control total for the whole document.')
    }
    if (method === 'Check' && !checkRef.trim()) list.push('A check needs the check number.')
    if (Number.isFinite(control) && control !== 0 && Math.abs(difference) > 0.005) {
      list.push(`Difference must be 0 (now ${difference.toFixed(2)}). Split amounts have to add up to the invoice total.`)
    }
    if (!sourceType || !method) return list
    for (const [i, split] of splits.entries()) {
      const amt = Number(split.amount)
      if (!split.amount.trim() || !Number.isFinite(amt) || amt === 0) {
        list.push(`Split ${i + 1} needs an allocation amount.`)
      }
      const d = deriveAccount(books, {
        sourceType,
        paymentMethod: method,
        costType: split.costType,
        vendor,
        jobName: split.jobName,
        lineItem: split.lineItem,
        invoiceNumber: invoice,
      })
      const shown = split.overrideTouched ? split.overrideAccount : d.shouldBeBlank ? d.suggested : d.account
      if (d.required && !d.shouldBeBlank && !shown.trim()) {
        list.push(`Split ${i + 1}: pick Override Account — ${d.reason}`)
      }
    }
    return list
  }, [books, checkRef, control, difference, invoice, invoiceTotal, method, sourceType, splits, vendor])

  function postRow() {
    setMessage('')
    setErrors([])
    if (liveErrors.length) {
      setErrors(liveErrors)
      return
    }
    if (!sourceType || !method) return
    const parts = buildSplitDocument(
      books,
      {
        sourceType,
        paymentMethod: method,
        postingDate,
        vendor,
        invoiceNumber: invoice.trim(),
        invoiceDate: invoiceDate || postingDate,
        dueDate: dueDate || postingDate,
        checkRef: checkRef.trim(),
        invoiceTotal: money(control),
      },
      splits.map((s) => ({
        jobName: s.jobName,
        costType: s.costType,
        lineItem: s.lineItem,
        allocationAmount: money(Number(s.amount) || 0),
        overrideAccount: s.overrideTouched ? s.overrideAccount : undefined,
        overrideTouched: s.overrideTouched,
      })),
    )
    const paid = isPaidPaymentMethod(method)
    const rows = parts.map((p) =>
      emptyDraft({
        ...p,
        approvalStatus: paid ? 'Paid' : 'Ready for Accountant',
        paidDate: paid ? postingDate : '',
        posted: false,
        notes: '',
      }),
    )
    let next = upsertTransactions(books, rows)
    const gate = canPost(next, rows.map((r) => r.id))
    if (!gate.ok) {
      setErrors(gate.issues.filter((i) => i.level === 'error').map((i) => i.message))
      setBooks(next)
      return
    }
    next = postDocument(next, rows.map((r) => r.id))
    setBooks(next)
    setInvoice('')
    setInvoiceTotal('')
    setCheckRef('')
    setSplits([
      { key: newKey(), jobName: splits[0]?.jobName || defaultJob, costType: 'Materials', lineItem: '', amount: '', overrideAccount: '', overrideTouched: false },
    ])
    const splitNote = rows.length > 1 ? ` ${rows.length} splits.` : ''
    setMessage(`Posted ${invoice}. ${sourceType}.${splitNote} Offset ${offset || 'set by payment method'}.`)
  }

  const canSubmit = liveErrors.length === 0

  return (
    <section className="rounded-xl border border-line bg-white p-4">
      <div>
        <h2 className="font-serif text-xl">Enter a transaction</h2>
        <p className="mt-1 max-w-3xl text-sm text-ink-2">
          One document, one invoice / check number. Invoice total is the control total. Add a split for each place the
          money goes (sewer vs water, or four $50k lines on a $200k bill). Payment method sets the offset — Unpaid / AP
          is 2000, Billed / AR is 1100, check / ACH / debit / deposit is cash. Account is derived before you post;
          change it if it is wrong. Keith posts.
        </p>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-3 lg:grid-cols-4">
        <Field label="What it is">
          <Select value={sourceType} onChange={(e) => onSource(e.target.value as SourceType | '')}>
            <option value="">Select…</option>
            {SOURCE_TYPE_LIST.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </Select>
        </Field>
        <Field label="Payment method" hint={offset ? `Offset ${offset}` : 'Sets the offset'}>
          <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod | '')}>
            <option value="">Select…</option>
            {PAYMENT_METHOD_LIST.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </Select>
        </Field>
        <Field label="Posting date">
          <Input type="date" value={postingDate} onChange={(e) => setPostingDate(e.target.value)} />
        </Field>
        <Field label="Vendor">
          <Select value={vendor} onChange={(e) => setVendor(e.target.value)}>
            {books.vendors.filter((v) => v.active).map((v) => (
              <option key={v.id}>{v.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Invoice / receipt #">
          <Input value={invoice} onChange={(e) => setInvoice(e.target.value)} placeholder="INV-1042" />
        </Field>
        <Field label="Invoice date">
          <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
        </Field>
        {showDue ? (
          <Field label="Due date">
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
        ) : null}
        {showRef ? (
          <Field label="Check / ACH / ref #" hint={method === 'Check' ? 'Required for a check' : 'Optional'}>
            <Input value={checkRef} onChange={(e) => setCheckRef(e.target.value)} placeholder="" />
          </Field>
        ) : null}
        <Field label="Invoice total" hint="Control total for the whole bill or check">
          <Input
            type="number"
            step="0.01"
            value={invoiceTotal}
            placeholder=""
            onChange={(e) => setInvoiceTotal(e.target.value)}
          />
        </Field>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
          <h3 className="font-serif text-lg">Splits</h3>
          <Button variant="ghost" onClick={addSplit}>
            Add split
          </Button>
        </div>
        <p className="mb-2 text-sm text-ink-2">
          Standing rules: same invoice / check number on every split. Invoice total on the document once. Difference
          must be 0. A $200,000 check that is $100,000 sewer and $100,000 water is two rows. A $200,000 invoice split
          four ways is four rows.
        </p>
        <div className="space-y-3">
          {splits.map((split, index) => {
            const d = sourceType && method
              ? deriveAccount(books, {
                  sourceType,
                  paymentMethod: method,
                  costType: split.costType,
                  vendor,
                  jobName: split.jobName,
                  lineItem: split.lineItem,
                  invoiceNumber: invoice,
                })
              : null
            const shown = split.overrideTouched
              ? split.overrideAccount
              : d
                ? displayAccount(books, {
                    sourceType: sourceType || 'Bill / Invoice',
                    paymentMethod: method || 'Unpaid / AP',
                    costType: split.costType,
                    vendor,
                    jobName: split.jobName,
                    lineItem: split.lineItem,
                    invoiceNumber: invoice,
                    overrideAccount: split.overrideAccount,
                  })
                : ''
            const items = lineItemsFor(split.jobName)
            return (
              <div key={split.key} className="rounded-lg border border-line bg-paper p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-ink-2">Split {index + 1}</span>
                  {splits.length > 1 ? (
                    <button type="button" className="text-xs text-danger underline-offset-2 hover:underline" onClick={() => removeSplit(split.key)}>
                      Remove
                    </button>
                  ) : null}
                </div>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
                  <Field label="Job name">
                    <Select
                      value={split.jobName}
                      onChange={(e) => patchSplit(split.key, { jobName: e.target.value, lineItem: '' })}
                    >
                      {books.jobs.map((j) => (
                        <option key={j.id}>{j.jobName}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Cost type">
                    <Select
                      value={split.costType}
                      onChange={(e) => patchSplit(split.key, { costType: e.target.value as CostType, overrideTouched: false })}
                    >
                      {COST_TYPE_LIST.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Line item">
                    <Select value={split.lineItem} onChange={(e) => patchSplit(split.key, { lineItem: e.target.value, overrideTouched: false })}>
                      <option value="">(none)</option>
                      <optgroup label="On this job">
                        {items.onJob.map((name) => (
                          <option key={name}>{name}</option>
                        ))}
                      </optgroup>
                      <optgroup label="All cost codes">
                        {items.extras.map((name) => (
                          <option key={name}>{name}</option>
                        ))}
                      </optgroup>
                    </Select>
                  </Field>
                  <Field label="Amount" hint="This split only">
                    <Input
                      type="number"
                      step="0.01"
                      value={split.amount}
                      placeholder=""
                      onChange={(e) => patchSplit(split.key, { amount: e.target.value })}
                    />
                  </Field>
                  <Field
                    label="Override Account"
                    hint={d?.reason || 'Derived before you post. Change it if it is wrong.'}
                  >
                    <Select
                      value={shown}
                      onChange={(e) =>
                        patchSplit(split.key, { overrideAccount: e.target.value, overrideTouched: true })
                      }
                    >
                      <option value="">{d?.required && !d.shouldBeBlank ? 'Select account…' : '(from Line Item Map)'}</option>
                      {shown && !books.chartOfAccounts.some((a) => `${a.number} - ${a.name}` === shown || a.number === shown) ? (
                        <option value={shown}>{shown}</option>
                      ) : null}
                      {books.chartOfAccounts.map((a) => (
                        <option key={a.number} value={`${a.number} - ${a.name}`}>
                          {a.number} - {a.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <p className={`text-sm font-semibold ${Math.abs(difference) > 0.005 ? 'text-danger' : 'text-teal'}`}>
          Difference {difference.toFixed(2)}
        </p>
        <Button onClick={postRow} disabled={!canSubmit}>
          Post transaction
        </Button>
        {message ? <p className="text-sm text-teal">{message}</p> : null}
      </div>
      {errors.length || (invoiceTotal.trim() && liveErrors.length) ? (
        <ul className="mt-2 space-y-1 text-sm text-danger" aria-live="polite">
          {(errors.length ? errors : liveErrors).map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
