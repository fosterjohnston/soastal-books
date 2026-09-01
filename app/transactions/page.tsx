import { SeedLedgerTable } from '@/office/SeedLedgerTable'
import { TransactionsView } from '@/office/TransactionsView'

export default function TransactionsPage() {
  return <TransactionsView seedTable={<SeedLedgerTable />} />
}
