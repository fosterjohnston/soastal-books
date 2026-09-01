# Soastal Books

Office **accrual** accounting for **Soastal LLC**. Keith’s company workbook as a standalone app — not QuickBooks, not the field site (`soastal-fernhill`).

Foster (COO) and Keith (CFO) can use the web app or a **Mac .dmg**. There is **no shared database** with the field app and **no live sync** of jobs, timesheets, or budgets. This software never writes Keith’s live spreadsheet.

## Web app

**https://soastal-accrual-books.vercel.app**

Standalone Soastal Books on the Soastal Vercel team — not `soastal-fernhill`.

## Mac installable (.dmg)

The installable for Foster and Keith is a **Mac disk image**, not a Windows `.exe`.

This Linux build agent **cannot produce a signed, usable `.dmg`**. There is no `hdiutil`, no Apple signing identity, and Gatekeeper will not treat a Linux-built unsigned image as a normal Mac app. Do not use the Windows `Soastal-Books-Setup.exe` as the office deliverable.

On **Foster’s or Keith’s Mac** (macOS, Node 20+):

```bash
npm install
npm run dist:mac
```

The disk image is written to `release/Soastal-Books-1.0.0-mac.dmg`. Open it and drag **Soastal Books** to Applications.

The Mac app stores copies only under `Documents/Finance/Soastal Books/` (`soastal-books.json` and `Soastal Books Export.xlsx`). It **refuses** to write Keith’s live original:

`Documents/Finance/Acounting spreadshseet.xlsx`

(filename is misspelled — that exact name is blocked).

To smoke-test the desktop shell before packaging:

```bash
npm run electron:dev
```

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

- **Mac app:** `Documents/Finance/Soastal Books/` (app-owned JSON + Excel copy).
- **Web:** app-owned store via `/api/books`, plus an Excel copy from the Files page. Optional Graph/OneDrive copy-save under `Documents/Finance/Soastal Books/` is fine from the browser.

**Hard denylist:** never write Keith’s live original. Import is allowed only from a **copy**.

## Local development

```bash
npm install
npm test
npm run dev
```

Opens `http://127.0.0.1:43173`. Same PIN gate. Vite serves the UI; `/api/session` and `/api/books` run in the same process.

## Standalone

Adding a job is a Setup row + SOV, not a new COA. Equipment Allocation is memo only. Materials never belong on a field Daily Entry.
