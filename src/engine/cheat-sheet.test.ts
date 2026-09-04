import { describe, expect, it } from 'vitest'
import {
  amountHasExpectedSign,
  CHEAT_SHEET_RULES,
  CLIENT_BILL_THEN_PAY,
  matchingRecipeIds,
  TWO_STEP_RECIPES,
  invoiceTotalHint,
  moneyDirection,
  signMismatchMessage,
} from './cheat-sheet'

describe('transaction cheat sheet signs', () => {
  it('states money out positive and money in negative', () => {
    expect(CHEAT_SHEET_RULES[0]).toMatch(/Money out is positive/)
    expect(CHEAT_SHEET_RULES[0]).toMatch(/Money in is negative/)
    expect(CHEAT_SHEET_RULES[0]).toMatch(/-500/)
  })

  it('puts money-out bills and checks as positive Invoice Total', () => {
    expect(moneyDirection({ sourceType: 'Bill / Invoice', paymentMethod: 'Unpaid / AP', costType: 'Materials' })).toBe('out')
    expect(moneyDirection({ sourceType: 'Check', paymentMethod: 'Check', costType: 'Materials' })).toBe('out')
    expect(amountHasExpectedSign(200000, 'out')).toBe(true)
    expect(amountHasExpectedSign(-200000, 'out')).toBe(false)
    expect(invoiceTotalHint('out')).toMatch(/positive/)
    expect(invoiceTotalHint('out')).toMatch(/goes here/)
  })

  it('puts client billings and deposits as negative Invoice Total', () => {
    expect(moneyDirection({ sourceType: 'Deposit / Revenue', paymentMethod: 'Billed / AR', costType: 'Revenue' })).toBe('in')
    expect(moneyDirection({ sourceType: 'Deposit / Revenue', paymentMethod: 'Deposit', costType: 'Asset' })).toBe('in')
    expect(amountHasExpectedSign(-500, 'in')).toBe(true)
    expect(signMismatchMessage(500, 'in', 'Invoice total')).toMatch(/-500/)
  })

  it('tells billing vs collecting a client invoice apart', () => {
    expect(CLIENT_BILL_THEN_PAY.bill).toMatch(/Revenue/)
    expect(CLIENT_BILL_THEN_PAY.bill).toMatch(/4000/)
    expect(CLIENT_BILL_THEN_PAY.collect).toMatch(/Asset/)
    expect(CLIENT_BILL_THEN_PAY.collect).toMatch(/1100/)
    expect(CLIENT_BILL_THEN_PAY.collect).toMatch(/-PMT/)
    expect(CLIENT_BILL_THEN_PAY.collect).toMatch(/not post Revenue a second time/)
  })

  it('covers every two-step trap with a Never line', () => {
    const ids = TWO_STEP_RECIPES.map((r) => r.id)
    expect(ids).toEqual([
      'client-bill',
      'client-collect',
      'client-cash-no-bill',
      'vendor-bill',
      'card-then-pay',
      'loan-payment',
      'payroll-skip',
      'out-of-pocket',
      'owner-draw',
      'buy-machine',
      'rent-vs-alloc',
      'retainage',
      'vendor-credit',
    ])
    for (const r of TWO_STEP_RECIPES) {
      expect(r.never.length).toBeGreaterThan(20)
      expect(r.step1.length).toBeGreaterThan(20)
    }
    expect(TWO_STEP_RECIPES.find((r) => r.id === 'payroll-skip')?.never).toMatch(/Labor/)
    expect(TWO_STEP_RECIPES.find((r) => r.id === 'out-of-pocket')?.never).toMatch(/Draw/)
    expect(matchingRecipeIds({ paymentMethod: 'Deposit', costType: 'Asset' })).toContain('client-collect')
    expect(matchingRecipeIds({ sourceType: 'Payroll' })).toContain('payroll-skip')
  })
})
