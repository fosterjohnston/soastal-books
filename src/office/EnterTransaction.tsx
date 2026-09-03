'use client'

import { useMemo, useState } from 'react'
import {
  canPost,
  emptyDraft,
  isPaidPaymentMethod,
  postDocument,
  upsertTransactions,
  type CostType,
  type PaymentMethod,
} from '../engine'
import { useBooks } from '../store/BooksContext'
import { Button, Field, Input, Select } from '../components/ui'

const PAID_METHODS: PaymentMethod[] = ['Check', 'ACH / Wire', 'Debit Card', 'Auto-Pay', 'Cash', 'Credit Card']

type Mode = 'paid' | 'ap'

export function EnterTransaction() {
  const { books, setBooks } = useBooks()
  const [mode, setMode] = useState<Mode>('paid')
  const [vendor, setVendor] = useState(books.vendors.find((v) => v.active)?.name || '')
  const [invoice, setInvoice] = useState('')
  const [postingDate, setPostingDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [dueDate, setDueDate] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('ACH / Wire')
  const [checkRef, setCheckRef] = useState('')
  const [amount, setAmount] = useState('')
  const [jobName, setJobName] = useState(books.jobs.find((j) => j.slot === 1)?.jobName || 'Fern Hill')
  const [costType, setCostType] = useState<CostType>('Materials')
  const [lineItem, setLineItem] = useState('')
  const [message, setMessage] = useState('')

  const lineItems = useMemo(
    () => books.jobLineItems.filter((s) => s.jobName === jobName).map((s) => s.description),
    [books.jobLineItems, jobName],
  )

  function postRow() {
    setMessage('')
    const n = Number(amount)
    if (!vendor || !invoice || !Number.isFinite(n) || n === 0) {
      setMessage('Vendor, invoice / receipt #, and amount are required.')
      return
    }
    const paid = mode === 'paid'
    const method: PaymentMethod = paid ? paymentMethod : 'Unpaid / AP'
    const vendorRow = books.vendors.find((v) => v.name === vendor)
    const needsOverride = costType === 'Overhead' || costType === 'Subcontractor' || costType === 'Other Expense'
    const row = emptyDraft({
      postingDate,
      vendor,
      invoiceNumber: invoice,
      sourceType: paid ? (method === 'Check' ? 'Check' : method === 'Cash' ? 'Cash Purchase' : 'Bill / Invoice') : 'Bill / Invoice',
      invoiceDate: invoiceDate || postingDate,
      dueDate: dueDate || postingDate,
      paymentMethod: method,
      checkRef,
      invoiceTotal: n,
      allocationAmount: n,
      jobName,
      costType,
      lineItem,
      overrideAccount: needsOverride ? vendorRow?.defaultAccount || '6120 - Office Supplies' : '',
      poStatus: 'No PO Required',
      approvalStatus: paid ? 'Paid' : 'Ready for Accountant',
      paidDate: paid ? postingDate : '',
      posted: false,
      notes: paid
        ? `Already paid — ${method} hits cash (or card), not AP.`
        : 'Unpaid bill. Accrual: job cost + AP 2000. Cash does not move yet.',
    })
    let next = upsertTransactions(books, [row])
    const gate = canPost(next, [row.id])
    if (!gate.ok) {
      setMessage(gate.issues.filter((i) => i.level === 'error').map((i) => i.message).join(' '))
      setBooks(next)
      return
    }
    next = postDocument(next, [row.id])
    setBooks(next)
    setInvoice('')
    setAmount('')
    setCheckRef('')
    if (paid) {
      const offset = next.paymentMethodMap.find((m) => m.paymentMethod === method)?.offsetAccount || '1000'
      setMessage(`Posted ${invoice} as already paid. Offset ${offset}. Not sitting on AP.`)
    } else {
      setMessage(`Posted ${invoice} to AP (2000). Cash does not move until you pay it later.`)
    }
  }

  return (
    <section className="rounded-xl border border-line bg-white p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl">Enter a transaction</h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-2">
            Keith posts these. Already paid uses Check / ACH / debit / card and hits cash now. Unpaid / AP puts the bill
            on 2000 until someone pays it. Foster does not have to approve.
          </p>
        </div>
        <div className="flex gap-1 rounded-full border border-line p-1">
          <button
            type="button"
            className={`rounded-full px-3 py-1 text-sm ${mode === 'paid' ? 'bg-ink text-paper' : 'text-ink-2'}`}
            onClick={() => setMode('paid')}
          >
            Already paid
          </button>
          <button
            type="button"
            className={`rounded-full px-3 py-1 text-sm ${mode === 'ap' ? 'bg-ink text-paper' : 'text-ink-2'}`}
            onClick={() => setMode('ap')}
          >
            Unpaid / AP
          </button>
        </div>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-3 lg:grid-cols-4">
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
        {mode === 'ap' ? (
          <Field label="Due date">
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
        ) : (
          <Field label="How it was paid">
            <Select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
            >
              {PAID_METHODS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </Select>
          </Field>
        )}
        {mode === 'paid' ? (
          <Field label="Check / ACH / ref #" hint={paymentMethod === 'Check' ? 'Required for a check' : 'Optional'}>
            <Input value={checkRef} onChange={(e) => setCheckRef(e.target.value)} />
          </Field>
        ) : null}
        <Field label="Amount" hint="Money out +">
          <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Job name">
          <Select value={jobName} onChange={(e) => { setJobName(e.target.value); setLineItem('') }}>
            {books.jobs.map((j) => (
              <option key={j.id}>{j.jobName}</option>
            ))}
          </Select>
        </Field>
        <Field label="Cost type">
          <Select value={costType} onChange={(e) => setCostType(e.target.value as CostType)}>
            {['Labor', 'Equipment', 'Materials', 'Subcontractor', 'Overhead'].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
        </Field>
        <Field label="Line item">
          <Select value={lineItem} onChange={(e) => setLineItem(e.target.value)}>
            <option value="">(none)</option>
            {lineItems.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button onClick={postRow}>
          {mode === 'paid' ? 'Post paid transaction' : 'Post unpaid bill to AP'}
        </Button>
        {message ? <p className="text-sm text-ink-2">{message}</p> : null}
        {mode === 'paid' && isPaidPaymentMethod(paymentMethod) ? (
          <p className="text-xs text-ink-2">Offset follows Payment Method — not Accounts Payable.</p>
        ) : null}
      </div>
    </section>
  )
}
