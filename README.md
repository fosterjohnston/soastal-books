# Soastal Books

Office accrual books for **Soastal LLC**. This is Keith’s company workbook as a website — not QuickBooks, not the field site, not a zip or `.dmg`.

Open it in a browser. Left nav: Inbox, Transactions, Bills (AP), Invoices (AR), Jobs, Vendors, Reports, Setup.

Local (this is the working site):

```bash
npm install
npm test
npm run dev
```

App: `http://127.0.0.1:43173` — HTML includes the ledger (Vulcan, Fern Hill, Foster inbox), not a title stub.

`https://soastal-accrual-books.vercel.app` is a dead Vite shell (~463 bytes, empty `#root`). This workspace token cannot overwrite that project. After you create/connect the repo in the soastal Vercel team, assign production to a `soastal-*-books.vercel.app` hostname and this Next export (`output: 'export'`, `out/`) is what should go live.

There is **no shared database** with the field app.

## Accrual posting

- Money **out** is positive. Money **in** is negative.
- **Payment Method** sets the offset. Unpaid / AP → 2000. Billed / AR → 1100. Check/Debit/ACH/Wire/Deposit → 1000.
- Vendor bill: Unpaid / AP hits job cost and AP immediately. Pay later: invoice `-PMT`, Job blank, Liability, override 2000.
- Invoice Total is a control total on the first split only. Difference must be 0.
- Formula columns are computed, never typed.
- Foster is the only human for invoice coding confirms.

## Local development

```bash
npm install
npm test
npm run dev
```

App: `http://127.0.0.1:43173`
