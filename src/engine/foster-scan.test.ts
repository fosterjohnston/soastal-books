import { describe, expect, it } from 'vitest'
import { applyScanIntake } from './intake'
import { decideFoster } from './posting'
import { createMasterDataOnly } from '../seed'

describe('scan then Foster yes posts', () => {
  it('posts an unpaid Vulcan bill after Foster confirms', () => {
    let b = createMasterDataOnly()
    const result = applyScanIntake(b, {
      filename: 'Vulcan-Fern-Hill-ABC-stone-bill-VM-4412-$2500.pdf',
      originalName: 'Vulcan-Fern-Hill-ABC-stone-bill-VM-4412-$2500.pdf',
      source: 'office-scan',
    })
    b = result.books
    const fosterId = b.fosterQueue[0]!.id
    b = decideFoster(b, fosterId, 'yes', 'ok')
    const row = b.transactions.find((t) => t.invoiceNumber.toUpperCase().includes('VM-4412'))
    expect(row?.posted).toBe(true)
    expect(row?.paymentMethod).toBe('Unpaid / AP')
    expect(b.documents[0]?.status).toBe('confirmed')
  })
})
