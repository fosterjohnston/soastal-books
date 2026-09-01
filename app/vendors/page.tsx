'use client'

import { useBooks } from '@/store/BooksContext'

export default function VendorsPage() {
  const { books } = useBooks()
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-serif text-3xl">Vendors</h1>
        <p className="text-sm text-ink-2">Office vendor list from the company workbook copy. Not Keith’s live xlsx.</p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="ledger-table w-full">
          <thead>
            <tr>
              <th>Vendor</th>
              <th>Type</th>
              <th>Default account</th>
              <th>Terms</th>
            </tr>
          </thead>
          <tbody>
            {books.vendors.map((v) => (
              <tr key={v.id}>
                <td>{v.name}</td>
                <td>{v.type}</td>
                <td>{v.defaultAccount || '—'}</td>
                <td>{v.terms}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
