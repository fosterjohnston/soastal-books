'use client'

import { type ReactNode, useEffect, useState } from 'react'
import { Ledger } from '@/screens/Ledger'
import { UnpaidBillWizard } from '@/office/UnpaidBillWizard'

export function TransactionsView({ seedTable }: { seedTable: ReactNode }) {
  const [live, setLive] = useState(false)
  useEffect(() => setLive(true), [])
  return (
    <div className="flex flex-col gap-5">
      <UnpaidBillWizard />
      {live ? <Ledger /> : seedTable}
    </div>
  )
}
