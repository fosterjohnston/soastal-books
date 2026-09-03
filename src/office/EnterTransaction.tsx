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
  type SourceType,
} from '../engine'
import { COST_TYPE_LIST, PAYMENT_METHOD_LIST, SOURCE_TYPE_LIST } from '../engine/lists'
import { useBooks } from '../store/BooksContext'
import { Button, Field, Input, Select } from '../components/ui'

function paymentForSource(source: SourceType): PaymentMethod {
  if (source === 'Credit Card Charge') return 'Credit Card'
  if (source === 'Debit Card Charge') return 'Debit Card'
  if (source === 'Check') return 'Check'
  if (source === 'Cash Purchase') return 'Cash'
  if (source === 'ACH / Wire' || source === 'Payroll') return 'ACH / Wire'
  if (source === 'Deposit / Revenue') return 'Deposit'
  if (source === 'Bill / Invoice') return 'Unpaid / AP'
  if (source === 'Refund') return 'ACH / Wire'
  return 'Unpaid / AP'
}

export function EnterTransaction() {
  const { books, setBooks } = useBooks()
  const [sourceType, setSourceType] = useState<SourceType | ''>('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('')
  const [vendor, setVendor] = useState(books.vendors.find((v) => v.active)?.name || '')
  const [invoice, setInvoice] = useState('')
  const [postingDate, setPostingDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [dueDate, setDueDate] = useState('')
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

  const method = paymentMethod
  const showDue = method === 'Unpaid / AP' || method === 'Billed / AR'
  const showRef = method === 'Check' || method === 'ACH / Wire' || method === 'Deposit' || method === 'Auto-Pay'

  function onSource(next: SourceType | '') {
    setSourceType(next)
    if (next) setPaymentMethod(paymentForSource(next))
  }

  function postRow() {
    setMessage('')
    const n = Number(amount)
    if (!sourceType) {
      setMessage('Select what this transaction is.')
      return
    }
    if (!method) {
      setMessage('Select a payment method. That sets the offset (AP, cash, AR, card).')
      return
    }
    if (!vendor || !invoice || !Number.isFinite(n) || n === 0) {
      setMessage('Vendor, invoice / receipt #, and amount are required.')
      return
    }
    const paid = isPaidPaymentMethod(method)
    const vendorRow = books.vendors.find((v) => v.name === vendor)
    const needsOverride =
      costType === 'Overhead' ||
      costType === 'Subcontractor' ||
      costType === 'Other Expense' ||
      costType === 'Revenue' ||
      costType === 'Liability'
    const row = emptyDraft({
      postingDate,
      vendor,
      invoiceNumber: invoice,
      sourceType,
      invoiceDate: invoiceDate || postingDate,
      dueDate: dueDate || postingDate,
      paymentMethod: method,
      checkRef,
      invoiceTotal: n,
      allocationAmount: n,
      jobName,
      costType,
      lineItem,
      overrideAccount: needsOverride ? vendorRow?.defaultAccount || (costType === 'Revenue' ? '4000 - Contract Revenue' : '6120 - Office Supplies') : '',
      poStatus: sourceType === 'Journal Entry' || method === 'Billed / AR' ? 'Not Applicable' : 'No PO Required',
      approvalStatus: paid ? 'Paid' : 'Ready for Accountant',
      paidDate: paid ? postingDate : '',
      posted: false,
      notes: '',
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
    const offset = next.paymentMethodMap.find((m) => m.paymentMethod === method)?.offsetAccount || ''
    setMessage(`Posted ${invoice}. ${sourceType}. Offset ${offset || 'set by payment method'}.`)
  }

  return (
    <section className="rounded-xl border border-line bg-white p-4">
      <div>
        <h2 className="font-serif text-xl">Enter a transaction</h2>
        <p className="mt-1 max-w-2xl text-sm text-ink-2">
          Pick what it is from the list. Payment Method sets the offset — Unpaid / AP is 2000, Billed / AR is 1100,
          check / ACH / debit / deposit is cash. Keith posts. Foster does not have to approve.
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
        <Field label="Payment method" hint="Sets the offset">
          <Select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod | '')}
          >
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
            <Input value={checkRef} onChange={(e) => setCheckRef(e.target.value)} />
          </Field>
        ) : null}
        <Field label="Amount" hint="Money out + · money in −">
          <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Job name">
          <Select
            value={jobName}
            onChange={(e) => {
              setJobName(e.target.value)
              setLineItem('')
            }}
          >
            {books.jobs.map((j) => (
              <option key={j.id}>{j.jobName}</option>
            ))}
          </Select>
        </Field>
        <Field label="Cost type">
          <Select value={costType} onChange={(e) => setCostType(e.target.value as CostType)}>
            {COST_TYPE_LIST.map((t) => (
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
        <Button onClick={postRow}>Post transaction</Button>
        {message ? <p className="text-sm text-ink-2">{message}</p> : null}
      </div>
    </section>
  )
}
