# Soastal Books

Office accrual books for **Soastal LLC**. This is Keith’s company workbook as a website — not QuickBooks, not the field site, not a zip or `.dmg`.

Open it in a browser. Left nav: Inbox, Transactions, Bills (AP), Invoices (AR), Jobs, Vendors, Reports, Setup.

Demo journal is seeded (Fern Hill, Sandy Run, N/A - Overhead, Vulcan AP, a `-PMT`, STYO AR, T&T waiting on Foster). Keith’s live file `Documents/Finance/Acounting spreadshseet.xlsx` is denylisted. Copies only.

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
