'use client'

import { type ReactNode, useEffect, useState } from 'react'
import { Ledger } from '@/screens/Ledger'
import { EnterTransaction } from '@/office/EnterTransaction'

export function TransactionsView({ seedTable }: { seedTable: ReactNode }) {
  const [live, setLive] = useState(false)
  useEffect(() => setLive(true), [])
  return (
    <div className="flex flex-col gap-5">
      <EnterTransaction />
      {live ? <Ledger /> : seedTable}
    </div>
  )
}
