'use client'

import { useMemo, useState } from 'react'
import {
  canPost,
  emptyDraft,
  postDocument,
  upsertTransactions,
  type CostType,
} from '../engine'
import { useBooks } from '../store/BooksContext'
import { Button, Field, Input, Select } from '../components/ui'

export function UnpaidBillWizard() {
  const { books, setBooks } = useBooks()
  const [vendor, setVendor] = useState('Vulcan Materials')
  const [invoice, setInvoice] = useState('')
  const [postingDate, setPostingDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [dueDate, setDueDate] = useState('')
  const [amount, setAmount] = useState('2500')
  const [jobName, setJobName] = useState('Fern Hill')
  const [costType, setCostType] = useState<CostType>('Materials')
  const [lineItem, setLineItem] = useState('ABC stone')
  const [message, setMessage] = useState('')

  const lineItems = useMemo(
    () => books.jobLineItems.filter((s) => s.jobName === jobName).map((s) => s.description),
    [books.jobLineItems, jobName],
  )

  function postBill() {
    setMessage('')
    const n = Number(amount)
    if (!vendor || !invoice || !Number.isFinite(n) || n === 0) {
      setMessage('Vendor, invoice #, and allocation amount are required.')
      return
    }
    const row = emptyDraft({
      postingDate,
      vendor,
      invoiceNumber: invoice,
      sourceType: 'Bill / Invoice',
      invoiceDate: invoiceDate || postingDate,
      dueDate: dueDate || postingDate,
      paymentMethod: 'Unpaid / AP',
      invoiceTotal: n,
      allocationAmount: n,
      jobName,
      costType,
      lineItem,
      overrideAccount: '',
      poStatus: 'No PO Required',
      approvalStatus: 'Ready for Accountant',
      posted: false,
      notes: 'Unpaid bill wizard. Accrual: job cost + AP 2000. Cash does not move.',
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
    setMessage(`Posted ${invoice} to AP (2000). Open Bills (AP) to see aging.`)
  }

  return (
    <section className="rounded-xl border border-line bg-white p-4">
      <h2 className="font-serif text-xl">Unpaid bill (accrual)</h2>
      <p className="mt-1 text-sm text-ink-2">
        Payment Method Unpaid / AP → offset 2000. Money out is positive. Invoice Total is the control total on this
        first (only) split. Difference must be 0. Cash does not move until a later invoice-PMT (Job blank, Liability,
        override 2000).
      </p>
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
        <Field label="Invoice #">
          <Input value={invoice} onChange={(e) => setInvoice(e.target.value)} placeholder="VM-new" />
        </Field>
        <Field label="Invoice date">
          <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
        </Field>
        <Field label="Due date">
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </Field>
        <Field label="Allocation amount" hint="Money out +">
          <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Job name">
          <Select value={jobName} onChange={(e) => setJobName(e.target.value)}>
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
        <Button onClick={postBill}>Post unpaid bill to AP</Button>
        {message ? <p className="text-sm text-ink-2">{message}</p> : null}
      </div>
    </section>
  )
}
