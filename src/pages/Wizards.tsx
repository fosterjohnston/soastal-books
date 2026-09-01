import { useMemo, useState } from 'react'
import {
  canPost,
  emptyDraft,
  enqueueFosterCoding,
  postDocument,
  type CostType,
  type PaymentMethod,
  type PoStatus,
  type SourceType,
  type TransactionDraft,
  upsertTransactions,
} from '../engine'
import { useBooks } from '../store/BooksContext'
import { Button, Card, Field, Input, Select, Textarea } from '../components/ui'
import { computeRow } from '../engine/formulas'

type RecipeId =
  | 'ap-bill'
  | 'ap-pay'
  | 'spot'
  | 'sub'
  | 'payroll'
  | 'ar'
  | 'equip-vendor'

const RECIPES: { id: RecipeId; title: string; blurb: string }[] = [
  { id: 'ap-bill', title: 'Vendor bill unpaid', blurb: 'Materials on account. Unpaid/AP, job + Materials + line item, override blank.' },
  { id: 'ap-pay', title: 'Pay that bill', blurb: 'invoice-PMT, Job blank, Liability, Override 2000, Check/ACH, Paid.' },
  { id: 'spot', title: 'Paid on the spot', blurb: 'Cash purchase / debit. Never AP. Mark Paid with the ref you have.' },
  { id: 'sub', title: 'Subcontractor invoice', blurb: 'Like a bill, Cost Type Subcontractor, override 53xx. Optional retainage row.' },
  { id: 'payroll', title: 'Payroll', blurb: 'Same PR- number; Invoice Total on first row. Office wages → N/A - Overhead / 6000.' },
  { id: 'ar', title: 'Revenue / AR', blurb: 'Negative allocation, Billed/AR, Revenue, override 4000-series.' },
  { id: 'equip-vendor', title: 'Equipment vendor invoice', blurb: 'Real rental or repair bill on the ledger. Owned-equipment hours stay on Equipment Allocation (memo).' },
]

type Split = { amount: number; jobName: string; costType: CostType; lineItem: string; overrideAccount: string }

function defaults(id: RecipeId): {
  sourceType: SourceType
  paymentMethod: PaymentMethod
  costType: CostType
  poStatus: PoStatus
  jobName: string
  overrideAccount: string
  amountSign: 1 | -1
} {
  switch (id) {
    case 'ap-bill':
      return { sourceType: 'Bill / Invoice', paymentMethod: 'Unpaid / AP', costType: 'Materials', poStatus: 'No PO Required', jobName: 'Fern Hill', overrideAccount: '', amountSign: 1 }
    case 'ap-pay':
      return { sourceType: 'Check', paymentMethod: 'Check', costType: 'Liability', poStatus: 'Not Applicable', jobName: '', overrideAccount: '2000 - Accounts Payable', amountSign: 1 }
    case 'spot':
      return { sourceType: 'Cash Purchase', paymentMethod: 'Debit Card', costType: 'Materials', poStatus: 'No PO Required', jobName: 'Fern Hill', overrideAccount: '', amountSign: 1 }
    case 'sub':
      return { sourceType: 'Bill / Invoice', paymentMethod: 'Unpaid / AP', costType: 'Subcontractor', poStatus: 'No PO Required', jobName: 'Fern Hill', overrideAccount: '5310 - Subcontractor - Paving', amountSign: 1 }
    case 'payroll':
      return { sourceType: 'Payroll', paymentMethod: 'Auto-Pay', costType: 'Labor', poStatus: 'Not Applicable', jobName: 'Fern Hill', overrideAccount: '', amountSign: 1 }
    case 'ar':
      return { sourceType: 'Bill / Invoice', paymentMethod: 'Billed / AR', costType: 'Revenue', poStatus: 'Not Applicable', jobName: 'Fern Hill', overrideAccount: '4000 - Construction Revenue', amountSign: -1 }
    case 'equip-vendor':
      return { sourceType: 'Bill / Invoice', paymentMethod: 'Unpaid / AP', costType: 'Equipment', poStatus: 'No PO Required', jobName: 'Fern Hill', overrideAccount: '5400 - Third-Party Equipment Rental', amountSign: 1 }
  }
}

export function Wizards() {
  const { books, setBooks } = useBooks()
  const [recipe, setRecipe] = useState<RecipeId>('ap-bill')
  const d = defaults(recipe)
  const [vendor, setVendor] = useState('Vulcan Materials')
  const [invoice, setInvoice] = useState('')
  const [postingDate, setPostingDate] = useState(emptyDraft().postingDate)
  const [invoiceDate, setInvoiceDate] = useState(emptyDraft().invoiceDate)
  const [dueDate, setDueDate] = useState(emptyDraft().dueDate)
  const [method, setMethod] = useState<PaymentMethod>(d.paymentMethod)
  const [checkRef, setCheckRef] = useState('')
  const [poStatus, setPoStatus] = useState<PoStatus>(d.poStatus)
  const [poNumber, setPoNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [retainage, setRetainage] = useState(0)
  const [officeWage, setOfficeWage] = useState(false)
  const [paid, setPaid] = useState(recipe === 'ap-pay' || recipe === 'spot')
  const [splits, setSplits] = useState<Split[]>([
    { amount: 0, jobName: d.jobName, costType: d.costType, lineItem: '', overrideAccount: d.overrideAccount },
  ])

  function applyRecipe(id: RecipeId) {
    const next = defaults(id)
    setRecipe(id)
    setMethod(next.paymentMethod)
    setPoStatus(next.poStatus)
    setPaid(id === 'ap-pay' || id === 'spot')
    setOfficeWage(false)
    setRetainage(0)
    setSplits([
      {
        amount: 0,
        jobName: next.jobName,
        costType: next.costType,
        lineItem: '',
        overrideAccount: next.overrideAccount,
      },
    ])
    if (id === 'ap-pay' && invoice && !invoice.toUpperCase().endsWith('-PMT')) {
      setInvoice(`${invoice}-PMT`)
    }
  }

  const control = useMemo(
    () => splits.reduce((s, x) => s + x.amount * (recipe === 'ar' ? (x.amount > 0 ? -1 : 1) : 1), 0),
    [splits, recipe],
  )

  function buildRows(): TransactionDraft[] {
    const sign = recipe === 'ar' ? -1 : 1
    const rows: TransactionDraft[] = splits.map((s, i) => {
      const amt = recipe === 'ar' ? -Math.abs(s.amount) : s.amount
      const job = recipe === 'ap-pay' ? '' : officeWage ? 'N/A - Overhead' : s.jobName
      const costType = recipe === 'ap-pay' ? 'Liability' : officeWage ? 'Overhead' : s.costType
      const override =
        recipe === 'ap-pay'
          ? '2000 - Accounts Payable'
          : officeWage
            ? '6000 - Office Salaries'
            : s.overrideAccount
      return emptyDraft({
        postingDate,
        vendor,
        invoiceNumber: invoice,
        sourceType: defaults(recipe).sourceType,
        invoiceDate,
        dueDate,
        paymentMethod: method,
        checkRef,
        invoiceTotal: i === 0 ? splits.reduce((sum, x) => sum + (recipe === 'ar' ? -Math.abs(x.amount) : x.amount), 0) : 0,
        allocationAmount: amt,
        jobName: job,
        costType,
        lineItem: recipe === 'ap-pay' ? '' : s.lineItem,
        overrideAccount: override,
        poStatus,
        poNumber,
        approvalStatus: paid ? 'Paid' : 'Entered Only',
        paidDate: paid ? postingDate : '',
        notes,
        posted: false,
      })
    })
    if (recipe === 'sub' && retainage > 0) {
      rows.push(
        emptyDraft({
          postingDate,
          vendor,
          invoiceNumber: invoice,
          sourceType: 'Bill / Invoice',
          invoiceDate,
          dueDate,
          paymentMethod: method,
          invoiceTotal: 0,
          allocationAmount: -Math.abs(retainage),
          jobName: '',
          costType: 'Liability',
          overrideAccount: '2050 - Retainage Payable',
          poStatus: 'Not Applicable',
          approvalStatus: paid ? 'Paid' : 'Entered Only',
          notes: 'Retainage withheld. Full invoice plus this negative row. Not a second job cost.',
        }),
      )
      if (rows[0]) {
        rows[0] = {
          ...rows[0],
          invoiceTotal: rows.reduce((s, r) => s + r.allocationAmount, 0),
        }
      }
    }
    void sign
    return rows
  }

  const preview = buildRows()
  const previewBooks = { ...books, transactions: [...books.transactions, ...preview] }
  const previews = preview.map((r) => computeRow(previewBooks, r, previewBooks.transactions))

  function submit() {
    if (!vendor || !invoice) {
      window.alert('Vendor and invoice number are required.')
      return
    }
    const rows = buildRows()
    let next = upsertTransactions(books, rows)
    const ids = rows.map((r) => r.id)
    if (poStatus === 'Missing - Get Approval') {
      next = enqueueFosterCoding(next, ids, 'Recipe flagged Missing - Get Approval. Foster yes/no before post.')
      setBooks(next)
      window.alert('Sent to Foster inbox. Nothing is posted until he confirms coding.')
      return
    }
    const gate = canPost(next, ids)
    if (!gate.ok) {
      window.alert(gate.issues.filter((i) => i.level === 'error').map((i) => i.message).join('\n'))
      setBooks(next)
      return
    }
    setBooks(postDocument(next, ids))
    window.alert('Posted. Cash did not move unless Payment Method was a cash account.')
    setInvoice('')
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-serif text-3xl">Enter a document</h1>
        <p className="max-w-2xl text-sm text-ink-2">
          Guided recipes for office accrual. Power users can still work the Transactions grid. Materials never belong
          on a field Daily Entry — after Foster yes, post AP and office actuals here.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {RECIPES.map((r) => (
          <button
            key={r.id}
            onClick={() => applyRecipe(r.id)}
            className={`rounded-xl border p-3 text-left ${recipe === r.id ? 'border-teal bg-teal/10' : 'border-line bg-white'}`}
          >
            <div className="font-semibold">{r.title}</div>
            <div className="mt-1 text-xs text-ink-2">{r.blurb}</div>
          </button>
        ))}
      </div>

      <Card title="Document">
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Vendor">
            <Select value={vendor} onChange={(e) => setVendor(e.target.value)}>
              {books.vendors.map((v) => (
                <option key={v.id}>{v.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Invoice #" hint={recipe === 'ap-pay' ? 'Must end in -PMT' : 'One document, one number'}>
            <Input value={invoice} onChange={(e) => setInvoice(e.target.value)} placeholder={recipe === 'ap-pay' ? 'VM-88421-PMT' : 'VM-88421'} />
          </Field>
          <Field label="Payment Method">
            <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
              {books.paymentMethodMap.map((p) => (
                <option key={p.paymentMethod}>{p.paymentMethod}</option>
              ))}
            </Select>
          </Field>
          <Field label="Posting date">
            <Input type="date" value={postingDate} onChange={(e) => setPostingDate(e.target.value)} />
          </Field>
          <Field label="Invoice date">
            <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
          </Field>
          <Field label="Due date" hint="Keep the same due date on -PMT so aging nets.">
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
          <Field label="Check / ACH #">
            <Input value={checkRef} onChange={(e) => setCheckRef(e.target.value)} />
          </Field>
          <Field label="PO Status (coding only)">
            <Select value={poStatus} onChange={(e) => setPoStatus(e.target.value as PoStatus)}>
              {['Matched to PO', 'No PO Required', 'Missing - Get Approval', 'Pending Match', 'Not Applicable'].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </Select>
          </Field>
          <Field label="PO #">
            <Input value={poNumber} onChange={(e) => setPoNumber(e.target.value)} />
          </Field>
        </div>
        {recipe === 'sub' ? (
          <div className="mt-3 max-w-xs">
            <Field label="Retainage withheld (optional)" hint="Adds a negative 2050 row.">
              <Input type="number" step="0.01" value={retainage} onChange={(e) => setRetainage(Number(e.target.value))} />
            </Field>
          </div>
        ) : null}
        {recipe === 'payroll' ? (
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={officeWage} onChange={(e) => setOfficeWage(e.target.checked)} />
            Office wages (N/A - Overhead, Override 6000). Burden: add extra split rows to 6010 / 6020 / 6030.
          </label>
        ) : null}
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} />
          Mark Paid (only if Foster already sent payment date and check/ACH — or this was paid on the spot).
        </label>
        <Field label="Notes">
          <Textarea className="mt-2" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </Card>

      <Card
        title="Allocations"
        action={
          <Button
            variant="ghost"
            onClick={() =>
              setSplits([...splits, { ...splits[0], amount: 0, lineItem: '', overrideAccount: defaults(recipe).overrideAccount }])
            }
          >
            Add split
          </Button>
        }
      >
        <div className="flex flex-col gap-3">
          {splits.map((s, i) => (
            <div key={i} className="grid gap-2 rounded-lg border border-line p-3 md:grid-cols-5">
              <Field label={i === 0 ? 'Amount (control on first row)' : 'Amount'}>
                <Input
                  type="number"
                  step="0.01"
                  value={s.amount}
                  onChange={(e) => {
                    const next = [...splits]
                    next[i] = { ...s, amount: Number(e.target.value) }
                    setSplits(next)
                  }}
                />
              </Field>
              <Field label="Job">
                <Select
                  value={s.jobName}
                  disabled={recipe === 'ap-pay'}
                  onChange={(e) => {
                    const next = [...splits]
                    next[i] = { ...s, jobName: e.target.value, lineItem: '' }
                    setSplits(next)
                  }}
                >
                  <option value=""></option>
                  {books.jobs.map((j) => (
                    <option key={j.id}>{j.jobName}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Cost type">
                <Select
                  value={s.costType}
                  disabled={recipe === 'ap-pay'}
                  onChange={(e) => {
                    const next = [...splits]
                    next[i] = { ...s, costType: e.target.value as CostType }
                    setSplits(next)
                  }}
                >
                  {['Labor', 'Equipment', 'Materials', 'Subcontractor', 'Overhead', 'Revenue', 'Asset', 'Liability', 'Equity', 'Other Expense'].map(
                    (x) => (
                      <option key={x}>{x}</option>
                    ),
                  )}
                </Select>
              </Field>
              <Field label="Line item">
                <Select
                  value={s.lineItem}
                  onChange={(e) => {
                    const next = [...splits]
                    next[i] = { ...s, lineItem: e.target.value }
                    setSplits(next)
                  }}
                >
                  <option value=""></option>
                  {books.jobLineItems
                    .filter((li) => !s.jobName || li.jobName === s.jobName)
                    .map((li) => (
                      <option key={li.id} value={li.description}>
                        {li.description}
                      </option>
                    ))}
                </Select>
              </Field>
              <Field label="Override">
                <Select
                  value={s.overrideAccount}
                  onChange={(e) => {
                    const next = [...splits]
                    next[i] = { ...s, overrideAccount: e.target.value }
                    setSplits(next)
                  }}
                >
                  <option value=""></option>
                  {books.chartOfAccounts.map((a) => (
                    <option key={a.number} value={`${a.number} - ${a.name}`}>
                      {a.number} - {a.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Posting preview">
        <p className="mb-2 text-sm text-ink-2">
          Each row posts allocation to Final Account and the opposite sign to Offset. Control {control.toFixed(2)}. Difference on
          this document must be 0.
        </p>
        <div className="overflow-x-auto">
          <table className="ledger-table w-full">
            <thead>
              <tr>
                <th>Alloc</th>
                <th>Final</th>
                <th>Offset</th>
                <th>Diff</th>
              </tr>
            </thead>
            <tbody>
              {previews.map((r) => (
                <tr key={r.id}>
                  <td>{r.allocationAmount.toFixed(2)}</td>
                  <td>{r.finalAccount || '—'}</td>
                  <td>{r.offsetAccount || '—'}</td>
                  <td className={Math.abs(r.difference) > 0.005 ? 'diff-bad' : ''}>{r.difference.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4">
          <Button onClick={submit}>
            {poStatus === 'Missing - Get Approval' ? 'Send to Foster' : 'Post'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
