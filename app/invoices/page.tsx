import { redirect } from 'next/navigation'

export default function InvoicesRedirect() {
  redirect('/reports?report=ar-aging')
}
