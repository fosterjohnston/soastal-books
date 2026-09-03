'use client'

import { newId, type Job, type Vendor } from '../engine'
import { FUEL_USD_PER_GALLON, WORKING_DAYS_PER_MONTH } from '../engine/types'
import {
  EQUIPMENT_TYPE_LIST,
  JOB_STATUS_LIST,
  OWNERSHIP_LIST,
  TERMS_LIST,
  VENDOR_TYPE_LIST,
} from '../engine/lists'
import { useBooks } from '../store/BooksContext'
import { Button, Card, Field, Input } from '../components/ui'
import { SheetTitle } from '../components/Sheet'

export function Setup() {
  const { books, setBooks } = useBooks()

  return (
    <div className="flex flex-col gap-6">
      <SheetTitle
        title="Setup"
        blurb="Maintain jobs, vendors, equipment, and the line-item-to-account map. Equipment here is permanent facts only — hours go on Equipment Allocation under Run Report. Amounts in U.S. dollars."
      />

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
                notes: 'Schedule of values goes on Job Line Items. Do not add a COA for this job.',
                slot: books.jobs.filter((j) => j.slot !== 30).length + 1,
              }
              setBooks({
                ...books,
                jobs: [...books.jobs.filter((j) => j.slot !== 30), job, ...books.jobs.filter((j) => j.slot === 30)],
              })
            }}
          >
            Add job
          </Button>
        }
      >
        <p className="mb-2 text-sm text-ink-2">Slot 30 is reserved for N/A - Overhead. Adding a job is a Setup row plus SOV — not a new account.</p>
        <div className="overflow-x-auto">
          <table className="ledger-table w-full">
            <thead>
              <tr>
                <th>#</th>
                <th>Job name</th>
                <th>Job number</th>
                <th>Status</th>
                <th>Owner / customer</th>
                <th>Start date</th>
                <th>Contract amount</th>
                <th>Est. total cost</th>
              </tr>
            </thead>
            <tbody>
              {books.jobs.map((j) => (
                <tr key={j.id}>
                  <td>{j.slot}</td>
                  <td>
                    <input
                      className="w-44 border-0 bg-transparent"
                      value={j.jobName}
                      onChange={(e) =>
                        setBooks({ ...books, jobs: books.jobs.map((x) => (x.id === j.id ? { ...x, jobName: e.target.value } : x)) })
                      }
                    />
                  </td>
                  <td>
                    <input
                      className="w-20 border-0 bg-transparent"
                      value={j.jobNumber}
                      onChange={(e) =>
                        setBooks({ ...books, jobs: books.jobs.map((x) => (x.id === j.id ? { ...x, jobNumber: e.target.value } : x)) })
                      }
                    />
                  </td>
                  <td>
                    <select
                      className="border-0 bg-transparent"
                      value={j.status}
                      onChange={(e) =>
                        setBooks({
                          ...books,
                          jobs: books.jobs.map((x) => (x.id === j.id ? { ...x, status: e.target.value as Job['status'] } : x)),
                        })
                      }
                    >
                      {JOB_STATUS_LIST.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </td>
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
                        setBooks({ ...books, jobs: books.jobs.map((x) => (x.id === j.id ? { ...x, startDate: e.target.value } : x)) })
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
                          jobs: books.jobs.map((x) => (x.id === j.id ? { ...x, estimatedTotalCost: Number(e.target.value) } : x)),
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

      <Card title="Equipment Master">
        <p className="mb-2 text-sm text-ink-2">
          Monthly cost / internal rate is the owned-machine cost. Allocation divides it by {books.settings.workingDaysPerMonth || WORKING_DAYS_PER_MONTH} working days. Fuel ~$
          {(books.settings.fuelPricePerGallon || FUEL_USD_PER_GALLON).toFixed(2)}/gal. Hours belong on Equipment Allocation (memo).
        </p>
        <div className="mb-3 grid gap-3 md:grid-cols-2">
          <Field label="Working days / month">
            <Input
              type="number"
              step="0.1"
              value={books.settings.workingDaysPerMonth}
              onChange={(e) => setBooks({ ...books, settings: { ...books.settings, workingDaysPerMonth: Number(e.target.value) } })}
            />
          </Field>
          <Field label="Fuel price / gal">
            <Input
              type="number"
              step="0.01"
              value={books.settings.fuelPricePerGallon}
              onChange={(e) => setBooks({ ...books, settings: { ...books.settings, fuelPricePerGallon: Number(e.target.value) } })}
            />
          </Field>
        </div>
        <div className="overflow-x-auto">
          <table className="ledger-table w-full">
            <thead>
              <tr>
                <th>Equipment name</th>
                <th>Unit #</th>
                <th>Type</th>
                <th>Ownership</th>
                <th>Monthly cost</th>
                <th>Burn gal/hr</th>
                <th>Default account</th>
              </tr>
            </thead>
            <tbody>
              {books.equipment.map((e) => (
                <tr key={e.id}>
                  <td>{e.name}</td>
                  <td>{e.unitNumber || '—'}</td>
                  <td>{e.type}</td>
                  <td>{e.ownership}</td>
                  <td>{e.monthlyRate}</td>
                  <td>{e.burnGalPerHour || '—'}</td>
                  <td className="formula-cell">{e.defaultAccount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-ink-2">Types: {EQUIPMENT_TYPE_LIST.join(', ')}. Ownership: {OWNERSHIP_LIST.join(', ')}.</p>
      </Card>

      <Card
        title="Vendor Setup"
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
                accountNumber: '',
                phoneEmail: '',
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
        <div className="overflow-x-auto">
          <table className="ledger-table w-full">
            <thead>
              <tr>
                <th>Vendor name</th>
                <th>Type</th>
                <th>Default account</th>
                <th>Terms</th>
                <th>Account #</th>
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
                  <td>
                    <select
                      className="border-0 bg-transparent"
                      value={v.type}
                      onChange={(e) =>
                        setBooks({
                          ...books,
                          vendors: books.vendors.map((x) => (x.id === v.id ? { ...x, type: e.target.value as Vendor['type'] } : x)),
                        })
                      }
                    >
                      {VENDOR_TYPE_LIST.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      className="max-w-[220px] border-0 bg-transparent"
                      value={v.defaultAccount}
                      onChange={(e) =>
                        setBooks({
                          ...books,
                          vendors: books.vendors.map((x) => (x.id === v.id ? { ...x, defaultAccount: e.target.value } : x)),
                        })
                      }
                    >
                      <option value=""></option>
                      {books.chartOfAccounts.map((a) => (
                        <option key={a.number} value={`${a.number} - ${a.name}`}>
                          {a.number} - {a.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      className="border-0 bg-transparent"
                      value={v.terms}
                      onChange={(e) =>
                        setBooks({ ...books, vendors: books.vendors.map((x) => (x.id === v.id ? { ...x, terms: e.target.value } : x)) })
                      }
                    >
                      {TERMS_LIST.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </td>
                  <td>{v.accountNumber || '—'}</td>
                  <td>{v.active ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Line Item Map">
        <p className="mb-2 text-sm text-ink-2">
          Suggested Account on Transactions uses this list. Labor / Equipment / Materials look up the line item name. Subcontractor, Overhead, and Revenue still need Override Account.
        </p>
        <div className="overflow-x-auto" style={{ maxHeight: 420 }}>
          <table className="ledger-table w-full">
            <thead>
              <tr>
                <th>Line item</th>
                <th>COA category</th>
                <th>Labor acct</th>
                <th>Equipment acct</th>
                <th>Materials acct</th>
              </tr>
            </thead>
            <tbody>
              {books.lineItemMap.map((m) => (
                <tr key={m.id}>
                  <td>{m.activity}</td>
                  <td>{m.category || '—'}</td>
                  <td className="formula-cell">{m.laborAccount}</td>
                  <td className="formula-cell">{m.equipmentAccount}</td>
                  <td className="formula-cell">{m.materialsAccount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Payment Method → Offset Account">
        <p className="mb-2 text-sm text-ink-2">Offset Account autofills from Payment Method. Unpaid / AP → 2000. Billed / AR → 1100. Check / Debit / ACH / Wire / Deposit → 1000.</p>
        <table className="ledger-table w-full">
          <thead>
            <tr>
              <th>Payment method</th>
              <th>Offset account</th>
              <th>Name</th>
            </tr>
          </thead>
          <tbody>
            {books.paymentMethodMap.map((p) => (
              <tr key={p.paymentMethod}>
                <td>{p.paymentMethod}</td>
                <td className="formula-cell">{p.offsetAccount}</td>
                <td className="formula-cell">{p.offsetName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
