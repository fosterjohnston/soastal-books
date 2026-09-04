'use client'

import { useState } from 'react'
import { addEquipment, type EquipmentUnit } from '../engine'
import { EQUIPMENT_TYPE_LIST, OWNERSHIP_LIST } from '../engine/lists'
import { useBooks } from '../store/BooksContext'
import { Button, Field, Input, Select } from './ui'

export function EquipmentAddForm({
  onAdded,
}: {
  onAdded?: (name: string) => void
}) {
  const { setBooks } = useBooks()
  const [name, setName] = useState('')
  const [type, setType] = useState<(typeof EQUIPMENT_TYPE_LIST)[number]>('Other')
  const [ownership, setOwnership] = useState<EquipmentUnit['ownership']>('Owned')
  const [monthlyRate, setMonthlyRate] = useState('')

  function submit() {
    const trimmed = name.replace(/\s+/g, ' ').trim()
    setBooks((prev) =>
      addEquipment(prev, {
        name: trimmed || undefined,
        type,
        ownership,
        monthlyRate: Number(monthlyRate) || 0,
      }),
    )
    onAdded?.(trimmed || 'New equipment')
    setName('')
    setMonthlyRate('')
    setType('Other')
    setOwnership('Owned')
  }

  return (
    <div className="mb-3 rounded-lg border border-line bg-paper p-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
        <Field label="Equipment name">
          <Input
            value={name}
            placeholder="e.g. Mini 35"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                submit()
              }
            }}
          />
        </Field>
        <Field label="Type">
          <Select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
            {EQUIPMENT_TYPE_LIST.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
        </Field>
        <Field label="Ownership">
          <Select
            value={ownership}
            onChange={(e) => setOwnership(e.target.value as EquipmentUnit['ownership'])}
          >
            {OWNERSHIP_LIST.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </Select>
        </Field>
        <Field label="Monthly cost">
          <Input
            type="number"
            min="0"
            step="0.01"
            value={monthlyRate}
            placeholder="0"
            onChange={(e) => setMonthlyRate(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                submit()
              }
            }}
          />
        </Field>
        <Button type="button" onClick={submit}>
          Add equipment
        </Button>
      </div>
    </div>
  )
}
