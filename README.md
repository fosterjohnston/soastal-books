# Soastal Books

Office accrual books for **Soastal LLC**. Keith’s company workbook as a website — standalone accounting, not the field site, not QuickBooks.

Foster and Keith sign in with an **office PIN** (not Vercel, OneDrive, or GitHub). Scan or upload a bill, PO, or AP file. Books proposes coding (“this is where I think it goes”). Foster confirms, then it posts.

## Accrual

- Money **out** is positive. Money **in** is negative.
- **Payment Method** sets the offset. Unpaid / AP → 2000. Billed / AR → 1100. Check/Debit/ACH/Wire/Deposit → 1000.
- Vendor bill: Unpaid / AP hits job cost and AP immediately. Pay later: invoice `-PMT`, Job blank, Liability, override 2000.
- Invoice Total is a control total on the first split only. Difference must be 0.
- Formula columns are computed, never typed.
- Foster is the only human for invoice coding confirms.

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

Set `FOSTER_PIN`, `KEITH_PIN`, `SESSION_SECRET`, and optionally `INGEST_KEY` in `.env.local`. Leave them blank to use the office v1 defaults in the **server** API only. The login screen never displays a PIN.

## Vercel (Foster)

This is a Next.js App Router app (`app/`, Route Handlers for session, books, ingest). Vercel Connect will detect Next.js.

**GitHub:** this agent could not create `foster-johnston/Soastal_books`. There is no GitHub token or SSH key in this environment, and that repo does not exist yet. Origin remains the books source.

In GitHub (Foster’s account), create **Soastal_books** (private is fine), then:

```bash
git clone <origin-books-url>
cd Soastal_books
git remote add github https://github.com/foster-johnston/Soastal_books.git
git push -u github main
```

In the **soastal** Vercel team: **Add New… → Project → Import** that GitHub repo. Use the existing project name **soastal-books** if it is already in the team (do not create extra empty project names). Framework: Next.js. Production hostname should be one `*.vercel.app` URL.

Turn **off Deployment Protection / Vercel Authentication** so Keith opens the hostname and uses the office PIN on the Books login screen — not a Vercel login.

Do not deploy the field-report repo as this product.
