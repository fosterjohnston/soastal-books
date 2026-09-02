import { FosterInbox } from '@/screens/FosterInbox'
import { ScanIntake } from '@/office/ScanIntake'

export default function InboxPage() {
  return (
    <div className="flex flex-col gap-5">
      <ScanIntake />
      <FosterInbox />
    </div>
  )
}
