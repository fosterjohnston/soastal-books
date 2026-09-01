# Soastal Books

Office **accrual** accounting for **Soastal LLC**. Standalone web app — not QuickBooks, not the field site (`soastal-fernhill`), not a zip or `.dmg`.

Production: **https://soastal-cfo-books.vercel.app** (canonical office URL after this deploy; also see the deploy message).

Foster and Keith open it in Safari or Chrome. Nav: Books, Enter (unpaid-bill wizard), Ledger, Foster confirm inbox, AP/AR aging, Reports (P&L), Setup (jobs / vendors / COA). Demo journal is seeded. Keith’s live `Documents/Finance/Acounting spreadshseet.xlsx` is denylisted.

There is **no shared database** with the field app.

## Accrual posting

- Money **out** is positive. Money **in** is negative.
- **Payment Method** sets the offset.
- Vendor bill: `Unpaid / AP` → 2000. Pay later: invoice `-PMT`, Job blank, Override `2000`.
- Customer billing: `Billed / AR` → 1100, allocation **negative**.
- Invoice Total is a control total. Difference must be 0.
- Foster is the only human for invoice coding confirms.

## Local development

```bash
npm install
npm test
npm run dev
```

Opens `http://127.0.0.1:43173`.
