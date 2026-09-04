# Soastal Books

Office accrual books for **Soastal LLC**. Keith’s company workbook as a website — standalone accounting, not the field site, not QuickBooks.

Foster and Keith sign in with an **office PIN** (not Vercel, OneDrive, or GitHub). **Keith** enters transactions, uploads bills, and posts. Books proposes coding on a scan (“this is where I think it goes”). Foster does not have to approve. If Keith is unsure, he sends that row to **Review** for Foster.

## Sheets

Working tabs (left nav):

- **Inbox** — Keith scans / uploads. Books proposes a draft on Transactions.
- **Review** — only rows Keith flags. Foster answers. Not a gate to post.
- **Transactions** — Enter a transaction, then pick what it is from the workbook list (bill, check, ACH, payroll, deposit, …). Payment Method sets the offset. Keith posts.
- **Equipment Allocation** — working tab for field hours by machine and job. Memo only — not a report, not a second Transactions expense. The copy had no hour rows yet.
- **Job Line Items** — pick a job, then upload the whole bid Excel/CSV. Every row is added to that job. Contract value = qty × unit price. Unmapped names have **ADD TO MAP**.
- **Cost Codes** — pick a job; Labor / Equipment / Materials accounts autofill from the Line Item Map (the cost-code / crosscode map). Add missing names here.
- **Opening Balances** — as-of date + balance-sheet accounts (native sign)
- **Setup** — add jobs, equipment, vendors, and Line Item Map rows. Equipment Master has an Add equipment form at the top of the list (new machines land first). Hours still go on Equipment Allocation, which can also add a machine.
- **Run Report** — Job Costing through Walkthrough / Chart of Accounts
- **Files** — JSON copies only. Never Keith’s live `Acounting spreadshseet.xlsx`

Run Report includes Job Costing, Job Cost by Account, P&L Monthly, P&L by Job, Balance Sheet, Cash Flow, WIP, AP/AR aging, Account Summary, COA Report, Accountant Handoff, Month-End Checklist, Walkthrough, Chart of Accounts.

AI coding is later. This base is the workbook: codes, dropdowns, autofills.

## Accrual

- Money **out** is positive. Money **in** is negative.
- **Payment Method** sets the offset. Unpaid / AP → 2000. Billed / AR → 1100. Check/Debit/ACH/Wire/Deposit → 1000.
- Vendor bill: Unpaid / AP hits job cost and AP immediately. Pay later: invoice `-PMT`, Job blank, Liability, override 2000.
- Invoice Total is a control total on the first split only. Difference must be 0.
- Formula columns are computed, never typed.
- Keith posts. Foster reviews only when Keith asks.

## Copies and denylist

- Writes persist under `Documents/Finance/Soastal Books/` (JSON books + inbox scans).
- Keith’s live workbook `Documents/Finance/Acounting spreadshseet.xlsx` is **denylisted**. The app refuses to read it as a source of truth and will not write it.

There is **no shared database** with the field app. Later, the iOS field app can `POST /api/ingest` (office session cookie or `x-soastal-ingest-key`). That is a one-way document drop, not a merge.

## Local

```bash
npm install
npm test
npm run dev
```

App: `http://127.0.0.1:43173`

Set `FOSTER_PIN`, `KEITH_PIN`, `SESSION_SECRET`, and optionally `INGEST_KEY` in `.env.local`. Leave them blank locally to use the office v1 defaults in the **server** API only. Hosted/Vercel has no PIN fallback — set the env vars there. The login screen never displays a PIN.

## Vercel — connect GitHub (Foster)

This agent cannot attach the existing **soastal-books** Vercel project (name is taken; the token cannot open it). You connect it in the dashboard. Do not create another empty project.

The **Git** item in Settings only appears after a repo is already connected. This project was created without Git, so that item is hidden.

**A — from the project home (not Settings)**

1. Top-left team switcher: **soastal** (not a personal Hobby account).
2. Open the **soastal-books** project (the project card, not Team Settings).
3. Stay on the **Overview** / project home. Look for **Connect Git Repository** (GitHub / GitLab / Bitbucket). It is not under Settings until after this.
4. Choose **GitHub** → `fosterjohnston/soastal-books`.
5. Then set env vars and turn off Vercel Authentication (steps below).

**B — Import (if Overview has no Connect button)**

1. [vercel.com/new](https://vercel.com/new) with team **soastal**.
2. Import GitHub **`fosterjohnston/soastal-books`**. If the repo is missing, [configure the Vercel GitHub App](https://github.com/apps/vercel) and allow that repo, then refresh.
3. If the name `soastal-books` is taken, keep the Import — do not make a second empty project by hand. You can point the `soastal-books` domain over after the first good deploy.

Then on that project:

4. Production branch: `main`. Framework: **Next.js**.
5. **Settings → Environment Variables** — add `FOSTER_PIN`, `KEITH_PIN`, and `SESSION_SECRET`. Hosted has no PIN fallback.
6. **Settings → Deployment Protection** — turn **Vercel Authentication** off so Keith uses the office PIN on the Books login screen, not a Vercel login.

Live Import hostname: https://soastal-books-2.vercel.app  
After deploy, that URL should show the navy sidebar + cream ledger (Inbox, Transactions, Files). The old `soastal-books.vercel.app` `/login` build is leftover — ignore it.

Ignore leftover empty names such as `soastal-books-main`. Do not deploy the field-report repo as this product.
