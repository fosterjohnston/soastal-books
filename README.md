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

**GitHub:** https://github.com/fosterjohnston/soastal-books exists (public). This agent still cannot push to it (no GitHub login) and Vercel cannot Import it until the [Vercel GitHub App](https://github.com/apps/vercel) is installed on `fosterjohnston`. Origin remains the books source.

From a machine logged into GitHub as **fosterjohnston**:

```bash
git clone <origin-books-url> soastal-books-src
cd soastal-books-src
git remote add github https://github.com/fosterjohnston/soastal-books.git
git push github main --force
```

(`--force` replaces the empty GitHub “Initial commit” README with this Next.js app.)

In the **soastal** Vercel team: Import `fosterjohnston/soastal-books` into the existing **soastal-books** project (do not create another empty name). Framework: Next.js.

Turn **off Deployment Protection / Vercel Authentication** so Keith opens the hostname and uses the office PIN on the Books login screen — not a Vercel login.

Do not deploy the field-report repo as this product.
