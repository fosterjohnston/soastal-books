import { useState } from 'react'
import { newId, type Job, type OpeningBalance, type Vendor } from '../engine'
import { WORKING_DAYS_PER_MONTH, FUEL_USD_PER_GALLON } from '../engine/types'
import { useBooks } from '../store/BooksContext'
import { Button, Card, Field, Select } from '../components/ui'

const TABS = ['Jobs', 'Vendors', 'Equipment', 'Line Item Map', 'Job Line Items', 'Chart of Accounts', 'Opening balances', 'Payment Methods'] as const

export function Setup() {
  const { books, setBooks } = useBooks()
  const [tab, setTab] = useState<(typeof TABS)[number]>('Jobs')

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-serif text-3xl">Setup</h1>
        <p className="max-w-2xl text-sm text-ink-2">
          Master data from Keith&apos;s workbook. Adding a job is a Setup row plus SOV — not a new COA. Line Item Map
          fills Labor / Equipment / Materials only.
        </p>
      </div>
      <div className="flex flex-wrap gap-1">
        {TABS.map((t) => (
          <button
            key={t}
            className={`rounded-full px-3 py-1 text-sm ${tab === t ? 'bg-ink text-paper' : 'border border-line bg-white'}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Jobs' && (
        <Card
          title="Active Jobs"
          action={
            <Button
              variant="ghost"
              onClick={() => {
                const job: Job = {
                  id: newId('job'),
                  jobName: 'New job',
                  jobNumber: '',
                  status: 'Active',
                  ownerCustomer: '',
                  startDate: '',
                  contractAmount: 0,
                  estimatedTotalCost: 0,
                  notes: 'SOV goes on Job Line Items. Do not add a COA for this job.',
                  slot: books.jobs.length + 1,
                }
                setBooks({ ...books, jobs: [...books.jobs.filter((j) => j.slot !== 30), job, ...books.jobs.filter((j) => j.slot === 30)] })
              }}
            >
              Add job
            </Button>
          }
        >
          <div className="overflow-x-auto">
            <table className="ledger-table w-full">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>No.</th>
                  <th>Status</th>
                  <th>Owner / customer</th>
                  <th>Start</th>
                  <th>Contract</th>
                  <th>Est. cost</th>
                </tr>
              </thead>
              <tbody>
                {books.jobs.map((j) => (
                  <tr key={j.id}>
                    <td>
                      <input
                        className="w-40 border-0 bg-transparent"
                        value={j.jobName}
                        onChange={(e) =>
                          setBooks({
                            ...books,
                            jobs: books.jobs.map((x) => (x.id === j.id ? { ...x, jobName: e.target.value } : x)),
                          })
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="w-20 border-0 bg-transparent"
                        value={j.jobNumber}
                        onChange={(e) =>
                          setBooks({
                            ...books,
                            jobs: books.jobs.map((x) => (x.id === j.id ? { ...x, jobNumber: e.target.value } : x)),
                          })
                        }
                      />
                    </td>
                    <td>{j.status}</td>
                    <td>
                      <input
                        className="w-48 border-0 bg-transparent"
                        value={j.ownerCustomer}
                        onChange={(e) =>
                          setBooks({
                            ...books,
                            jobs: books.jobs.map((x) => (x.id === j.id ? { ...x, ownerCustomer: e.target.value } : x)),
                          })
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="date"
                        className="border-0 bg-transparent"
                        value={j.startDate}
                        onChange={(e) =>
                          setBooks({
                            ...books,
                            jobs: books.jobs.map((x) => (x.id === j.id ? { ...x, startDate: e.target.value } : x)),
                          })
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="w-28 border-0 bg-transparent"
                        value={j.contractAmount}
                        onChange={(e) =>
                          setBooks({
                            ...books,
                            jobs: books.jobs.map((x) => (x.id === j.id ? { ...x, contractAmount: Number(e.target.value) } : x)),
                          })
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="w-28 border-0 bg-transparent"
                        value={j.estimatedTotalCost}
                        onChange={(e) =>
                          setBooks({
                            ...books,
                            jobs: books.jobs.map((x) =>
                              x.id === j.id ? { ...x, estimatedTotalCost: Number(e.target.value) } : x,
                            ),
                          })
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'Vendors' && (
        <Card
          title="Vendor Setup (VendorList)"
          action={
            <Button
              variant="ghost"
              onClick={() => {
                const v: Vendor = {
                  id: newId('ven'),
                  name: 'New vendor',
                  type: 'Other',
                  defaultAccount: '',
                  terms: 'Net 30',
                  active: true,
                  notes: '',
                }
                setBooks({ ...books, vendors: [...books.vendors, v] })
              }}
            >
              Add vendor
            </Button>
          }
        >
          <table className="ledger-table w-full">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Default acct</th>
                <th>Terms</th>
                <th>Active</th>
              </tr>
            </thead>
            <tbody>
              {books.vendors.map((v) => (
                <tr key={v.id}>
                  <td>
                    <input
                      className="border-0 bg-transparent"
                      value={v.name}
                      onChange={(e) =>
                        setBooks({ ...books, vendors: books.vendors.map((x) => (x.id === v.id ? { ...x, name: e.target.value } : x)) })
                      }
                    />
                  </td>
                  <td>{v.type}</td>
                  <td>{v.defaultAccount}</td>
                  <td>{v.terms}</td>
                  <td>{v.active ? 'Y' : 'N'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === 'Equipment' && (
        <Card title="Equipment Master">
          <p className="mb-2 text-sm text-ink-2">
            {WORKING_DAYS_PER_MONTH} working days/month. Fuel ~${FUEL_USD_PER_GALLON.toFixed(2)}/gal. Internal hours belong
            on Equipment Allocation (memo), not as a second Transactions expense.
          </p>
          <table className="ledger-table w-full">
            <thead>
              <tr>
                <th>Name</th>
                <th>Unit</th>
                <th>Own</th>
                <th>$/mo</th>
                <th>$/hr</th>
                <th>gal/hr</th>
                <th>Acct</th>
              </tr>
            </thead>
            <tbody>
              {books.equipment.map((e) => (
                <tr key={e.id}>
                  <td>{e.name}</td>
                  <td>{e.unitNumber}</td>
                  <td>{e.ownership}</td>
                  <td>{e.monthlyRate}</td>
                  <td>{e.internalRatePerHour}</td>
                  <td>{e.burnGalPerHour}</td>
                  <td>{e.defaultAccount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === 'Line Item Map' && (
        <Card title="Line Item Map">
          <p className="mb-2 text-sm text-ink-2">Suggested Account on Transactions uses this for Labor / Equipment / Materials only.</p>
          <table className="ledger-table w-full">
            <thead>
              <tr>
                <th>Activity</th>
                <th>Labor</th>
                <th>Equip</th>
                <th>Materials</th>
              </tr>
            </thead>
            <tbody>
              {books.lineItemMap.map((m) => (
                <tr key={m.id}>
                  <td>{m.activity}</td>
                  <td>{m.laborAccount}</td>
                  <td>{m.equipmentAccount}</td>
                  <td>{m.materialsAccount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === 'Job Line Items' && (
        <SovEditor />
      )}

      {tab === 'Chart of Accounts' && (
        <Card title="Workbook COA (not the older QBO sibling)">
          <table className="ledger-table w-full">
            <thead>
              <tr>
                <th>No.</th>
                <th>Name</th>
                <th>Type</th>
                <th>Category</th>
              </tr>
            </thead>
            <tbody>
              {books.chartOfAccounts.map((a) => (
                <tr key={a.number}>
                  <td>{a.number}</td>
                  <td>{a.name}</td>
                  <td>{a.type}</td>
                  <td>{a.category}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === 'Opening balances' && <Openings />}

      {tab === 'Payment Methods' && (
        <Card title="Payment Method → Offset">
          <table className="ledger-table w-full">
            <thead>
              <tr>
                <th>Method</th>
                <th>Offset</th>
                <th>Name</th>
              </tr>
            </thead>
            <tbody>
              {books.paymentMethodMap.map((p) => (
                <tr key={p.paymentMethod}>
                  <td>{p.paymentMethod}</td>
                  <td>{p.offsetAccount}</td>
                  <td>{p.offsetName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}

function SovEditor() {
  const { books, setBooks } = useBooks()
  const [jobName, setJobName] = useState('Fern Hill')
  const rows = books.jobLineItems.filter((s) => s.jobName === jobName)
  return (
    <Card
      title="Schedule of values (coding, not a field budget)"
      action={
        <Button
          variant="ghost"
          onClick={() =>
            setBooks({
              ...books,
              jobLineItems: [
                ...books.jobLineItems,
                {
                  id: newId('sov'),
                  jobName,
                  itemNumber: String(rows.length + 1),
                  description: 'New item',
                  unit: 'LS',
                  bidQuantity: 1,
                  activity: 'General / Mobilization',
                },
              ],
            })
          }
        >
          Add line item
        </Button>
      }
    >
      <Field label="Job">
        <Select value={jobName} onChange={(e) => setJobName(e.target.value)}>
          {books.jobs.map((j) => (
            <option key={j.id}>{j.jobName}</option>
          ))}
        </Select>
      </Field>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-ink-2">No SOV yet for {jobName}. Sandy Run starts empty until the bid items are entered.</p>
      ) : (
        <table className="ledger-table mt-3 w-full">
          <thead>
            <tr>
              <th>#</th>
              <th>Description</th>
              <th>Unit</th>
              <th>Qty</th>
              <th>Activity</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id}>
                <td>{s.itemNumber}</td>
                <td>{s.description}</td>
                <td>{s.unit}</td>
                <td>{s.bidQuantity}</td>
                <td>{s.activity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  )
}

function Openings() {
  const { books, setBooks } = useBooks()
  function add() {
    const ob: OpeningBalance = {
      id: newId('ob'),
      asOfDate: '2026-07-01',
      accountNumber: '1000',
      amount: 0,
      memo: '',
    }
    setBooks({ ...books, openingBalances: [...books.openingBalances, ob] })
  }
  return (
    <Card title="Opening balances" action={<Button variant="ghost" onClick={add}>Add</Button>}>
      <p className="mb-2 text-sm text-ink-2">Required for a useful Balance Sheet. Native sign. Plug equity so assets + liabilities + equity net.</p>
      <table className="ledger-table w-full">
        <thead>
          <tr>
            <th>As of</th>
            <th>Account</th>
            <th>Amount</th>
            <th>Memo</th>
          </tr>
        </thead>
        <tbody>
          {books.openingBalances.map((o) => (
            <tr key={o.id}>
              <td>{o.asOfDate}</td>
              <td>{o.accountNumber}</td>
              <td>
                <input
                  type="number"
                  className="w-28 border-0 bg-transparent"
                  value={o.amount}
                  onChange={(e) =>
                    setBooks({
                      ...books,
                      openingBalances: books.openingBalances.map((x) =>
                        x.id === o.id ? { ...x, amount: Number(e.target.value) } : x,
                      ),
                    })
                  }
                />
              </td>
              <td>{o.memo}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}
