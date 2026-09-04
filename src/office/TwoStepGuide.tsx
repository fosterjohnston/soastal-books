'use client'

import {
  matchingRecipeIds,
  RECIPE_GROUPS,
  TWO_STEP_RECIPES,
  type CostType,
  type PaymentMethod,
  type SourceType,
} from '../engine'

export function TwoStepGuide({
  sourceType,
  paymentMethod,
  costType,
  invoiceNumber,
}: {
  sourceType: SourceType | ''
  paymentMethod: PaymentMethod | ''
  costType: CostType | ''
  invoiceNumber: string
}) {
  const hits = new Set(
    matchingRecipeIds({ sourceType, paymentMethod, costType, invoiceNumber }),
  )

  return (
    <div className="mt-3 rounded-lg border border-line bg-paper p-3">
      <p className="text-sm font-semibold">Dummy-proof recipes — both sides of the books</p>
      <p className="mt-1 text-sm text-ink-2">
        Every posted row balances (cost or income one way, Payment method the other). The trap is the{' '}
        <strong>second</strong> step: paying, collecting, or reimbursing is never a second sale or a second
        cost. Same invoice number + <span className="font-mono">-PMT</span> on the cash step. Money out is
        positive. Money in is negative.
      </p>
      <div className="mt-3 space-y-3">
        {RECIPE_GROUPS.map((group) => {
          const recipes = TWO_STEP_RECIPES.filter((r) => r.group === group.id)
          const groupHit = recipes.some((r) => hits.has(r.id))
          return (
            <details key={group.id} open={groupHit || hits.size === 0} className="rounded-md border border-line bg-white p-3">
              <summary className="cursor-pointer text-sm font-semibold">
                {group.label}
                <span className="ml-2 font-normal text-ink-2">— {group.blurb}</span>
              </summary>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {recipes.map((r) => (
                  <article
                    key={r.id}
                    className={`rounded-md border p-3 text-sm ${
                      hits.has(r.id) ? 'border-teal bg-teal/5' : 'border-line bg-paper'
                    }`}
                  >
                    <h3 className="font-semibold text-ink">{r.title}</h3>
                    <p className="mt-1 text-ink-2">
                      <span className="font-semibold text-ink">When: </span>
                      {r.when}
                    </p>
                    <p className="mt-2 text-ink-2">
                      <span className="font-semibold text-ink">Do: </span>
                      {r.step1}
                    </p>
                    {r.step2 ? (
                      <p className="mt-1 text-ink-2">
                        <span className="font-semibold text-ink">Then: </span>
                        {r.step2}
                      </p>
                    ) : null}
                    <p className="mt-2 text-danger">
                      <span className="font-semibold">Never: </span>
                      {r.never}
                    </p>
                  </article>
                ))}
              </div>
            </details>
          )
        })}
      </div>
    </div>
  )
}
