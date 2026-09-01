# Soastal Books

Office accounting for **Soastal LLC**. Accrual books that mirror Keith’s company workbook so office work can move off the sheet without taking over his GL.

This is a **standalone** desktop app. It is **not** the field app (daily logs, field budgets, PO product). It does not share a database with field software and does not live-sync jobs or timesheets.

## What it does

- **Accrual**, not cash basis. Vendor bills hit job cost and AP when incurred (`Unpaid / AP` → 2000). Paying later is a **different document** (`invoice-PMT`), Job blank, Cost Type Liability, Override `2000`, Check/ACH.
- **Sign convention:** money OUT positive; money IN (revenue, deposits, retainage withheld as negative rows) negative.
- **Payment Method** sets the offset. Users do not type offset accounts except a rare Offset Override.
- Formula columns are computed: Suggested Account, Final Account, Total Allocated, Difference, Invoice Key, Offset Suggested, Offset Account, Line Item on This Job?, Account Category, Offset Category.
- Invoice Total is a **control total** on the first split row. Difference must be 0. Reusing an invoice number for a payment (instead of `-PMT`) makes Difference go red.
- Foster (COO) is the only human for invoice coding confirms. Mark Paid only with payment date and check/ACH number.
- Reports: Job Costing, Job Cost by Account, P&L Monthly, P&L by Job, Balance Sheet, Cash Flow (1000/1010/1050), WIP, AP Aging, AR Aging by job, Account Summary, Month-End Checklist, Accountant Handoff.

## Where files save

App-owned **copies** only:

```
Documents/Finance/Soastal Books/
  soastal-books.json          ← database
  Soastal Books Export.xlsx   ← Excel-compatible copy for Keith
  README.txt
```

If OneDrive is running, that folder syncs like any other Documents folder.

**Hard denylist:** this app **never** writes Keith’s live original

`Documents/Finance/Acounting spreadshseet.xlsx`

(filename is misspelled — that exact name is blocked). Import is allowed only from a **copy**.

## Install (Mac and Windows)

Requirements: Node.js 22+.

```bash
npm install
npm test
```

### Browser / office preview

```bash
npm run dev
```

Opens on `http://127.0.0.1:43173`. Books persist in the browser (localStorage). Use **Files → Export Excel copy** to download an `.xlsx` Keith can open.

### Desktop app (Electron)

```bash
npm run electron:dev
```

The desktop shell writes to `Documents/Finance/Soastal Books/` on the signed-in user profile.

Installers:

```bash
npm run dist:mac    # .dmg / .zip
npm run dist:win    # NSIS
```

Artifacts land in `release/`.

## Guided recipes

1. Vendor bill unpaid (materials on account)
2. Paying that bill (`-PMT`)
3. Materials paid on the spot (never AP)
4. Subcontractor invoice + optional retainage (negative 2050 row)
5. Payroll (one job or splits; office wages → N/A - Overhead / 6000; burden 6010/6020/6030)
6. Revenue / AR (negative allocation, Billed / AR)
7. Real equipment **vendor** invoices on Transactions. Owned-equipment hours stay on Equipment Allocation as **memo** (hours × rate + fuel @ $4.45/gal, 21.7 working days/month). Not a second expense.

## Seeded company data

- Jobs: **Fern Hill F001** (STYO), **Sandy Run S000** (Johnston Services / Berkeley County), slot 30 **N/A - Overhead**
- Fern Hill schedule of values (~52 bid items) for coding. Sandy Run SOV empty until entered.
- Workbook chart of accounts (1000–6930), VendorList, Line Item Map, Equipment Master
- A short demo journal so aging and P&L are not empty (reload from Files)

Adding a job is a Setup row + SOV — **not** a new COA.

## Microsoft Graph

No secrets in this repo. Desktop persistence is the OneDrive-backed Documents folder. Optional `MICROSOFT_CLIENT_ID` / `MICROSOFT_TENANT_ID` can be placed in a local `.env` later; they are not required to run.

## Tests

```bash
npm test
```

Covers: sign convention; unpaid bill then `-PMT` clears AP without double-counting job cost; AR then deposit; split Difference = 0; live file path cannot be written.
