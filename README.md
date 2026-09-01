# Soastal Books

Office **accrual** accounting for **Soastal LLC**. Keith’s company workbook as a standalone web app — not QuickBooks, not the field site (`soastal-fernhill`).

Foster (COO) and Keith (CFO) open it in Safari or Chrome at the production URL. There is **no shared database** with the field app and **no live sync** of jobs, timesheets, or budgets.

## Open the books

Use the Vercel production URL for project **soastal-books** on the Soastal team. Office PIN login (Foster · office lane, Keith · CFO lane). Ask Foster for the PIN if you do not have it.

The app never writes Keith’s live spreadsheet.

## Accrual posting

- Money **out** is positive. Money **in** (revenue, deposits, retainage withheld as negative rows) is negative.
- **Payment Method** sets the offset. Do not type offset accounts except a rare Offset Override.
- Vendor bill when incurred: `Unpaid / AP` → 2000. Hits job cost and AP. Cash does not move.
- Pay later: invoice `-PMT`, Job blank, Cost Type Liability, Override `2000`, Check/ACH.
- Customer billing: `Billed / AR` → 1100, Revenue, allocation **negative**. Deposit later clears AR.
- Invoice Total is a **control total** on the first split row. Difference must be 0.
- Foster is the only human for invoice coding confirms. Mark Paid only with payment date and check/ACH number.

Formula columns are computed (never typed): Suggested Account, Final Account, Total Allocated, Difference, Invoice Key, Offset Suggested, Offset Account, Line Item on This Job?, Account Category, Offset Category.

## Where books persist

App-owned cloud store only (Soastal Books JSON via `/api/books`), plus an Excel **copy** you can download from the Files page. Optional Graph/OneDrive copy-save under `Documents/Finance/Soastal Books/` is fine from the browser.

**Hard denylist:** never write Keith’s live original

`Documents/Finance/Acounting spreadshseet.xlsx`

(filename is misspelled — that exact name is blocked). Import is allowed only from a **copy**.

## Local development

```bash
npm install
npm test
npm run dev
```

Opens `http://127.0.0.1:43173`. Same PIN gate. Vite serves the UI; `/api/session` and `/api/books` run in the same process.

Optional env (see `.env.example`): `FOSTER_PIN`, `KEITH_PIN`, `SESSION_SECRET`, `BLOB_READ_WRITE_TOKEN`. Production uses Vercel Blob for the shared books JSON.

## Standalone

Adding a job is a Setup row + SOV, not a new COA. Equipment Allocation is memo only. Materials never belong on a field Daily Entry.
