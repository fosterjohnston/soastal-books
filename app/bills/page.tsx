import { redirect } from 'next/navigation'

export default function BillsRedirect() {
  redirect('/reports?report=ap-aging')
}
