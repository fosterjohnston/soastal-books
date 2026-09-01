'use client'

import { useBooks } from '@/store/BooksContext'

export default function JobsPage() {
  const { books } = useBooks()
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-serif text-3xl">Jobs</h1>
        <p className="text-sm text-ink-2">Fern Hill, Sandy Run, and N/A - Overhead (slot 30). Adding a job is Setup + SOV, not a new COA.</p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="ledger-table w-full">
          <thead>
            <tr>
              <th>Job name</th>
              <th>Job no.</th>
              <th>Status</th>
              <th>Owner / customer</th>
              <th>Slot</th>
            </tr>
          </thead>
          <tbody>
            {books.jobs.map((j) => (
              <tr key={j.id}>
                <td>{j.jobName}</td>
                <td>{j.jobNumber}</td>
                <td>{j.status}</td>
                <td>{j.ownerCustomer}</td>
                <td>{j.slot}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
