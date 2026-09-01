import { SeedLedgerTable } from '@/office/SeedLedgerTable'
import { TransactionsView } from '@/office/TransactionsView'

export default function HomePage() {
  return <TransactionsView seedTable={<SeedLedgerTable />} />
}
