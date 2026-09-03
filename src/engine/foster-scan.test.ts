import { describe, expect, it } from 'vitest'
import { applyScanIntake } from './intake'
import { postDocument } from './posting'
import { createMasterDataOnly } from '../seed'

describe('scan then Keith posts', () => {
  it('creates an unposted draft; Keith posts without Foster', () => {
    let b = createMasterDataOnly()
    const result = applyScanIntake(b, {
      filename: 'Vulcan-Fern-Hill-ABC-stone-bill-VM-4412-$2500.pdf',
      originalName: 'Vulcan-Fern-Hill-ABC-stone-bill-VM-4412-$2500.pdf',
      source: 'office-scan',
    })
    b = result.books
    expect(b.fosterQueue.filter((f) => f.decision === 'pending')).toHaveLength(0)
    const row = b.transactions.find((t) => t.invoiceNumber.toUpperCase().includes('VM-4412'))
    expect(row?.posted).toBe(false)
    b = postDocument(b, [row!.id])
    expect(b.transactions.find((t) => t.id === row!.id)?.posted).toBe(true)
    expect(b.transactions.find((t) => t.id === row!.id)?.paymentMethod).toBe('Unpaid / AP')
  })
})
