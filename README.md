# Rebeaux's BBQ Sauce — RBX dashboard

A **read-only** view of the RBX planning Sheet. One page that answers four things:

1. How much capital is needed, and when.
2. What the stage-gate milestones are and whether each passes.
3. Whether the plan is on track (plan vs actual, fed by the Log tab).
4. Where the business is lacking.

Charts and KPI tiles first, tables second. Every number is marked **Real** or **Guess**.

- The Sheet is the single source of truth. **No Sheet data is stored in this repo.**
- The page only reads. Nothing here can change the Sheet.
- Next.js (App Router, TypeScript) · Tailwind · Recharts · deploys to Vercel.
- Server-side read every 5 minutes (`revalidate = 300`). Credentials never reach the browser.

---

## 1 · Create the Google service account

1. Go to <https://console.cloud.google.com/> and pick (or create) a project.
2. **APIs & Services → Library →** search for **Google Sheets API → Enable**.
3. **APIs & Services → Credentials → Create credentials → Service account.**
   - Name it something like `rbx-dashboard`. No roles are needed — access comes from
     sharing the Sheet, not from IAM.
4. Open the new service account → **Keys → Add key → Create new key → JSON**. A
   `.json` file downloads. Keep it out of this repo.
5. From that JSON you need two values:
   - `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key` → `GOOGLE_PRIVATE_KEY`
6. **Share the Sheet with the service-account email as Viewer** (Share button, paste
   the `client_email`, set Viewer, uncheck "Notify people"). Without this step every
   read returns 403.

The Sheet ID is the long string in its URL:
`https://docs.google.com/spreadsheets/d/<SHEET_ID>/edit`.

## 2 · Environment variables

Copy `.env.example` to `.env.local` for local work.

| Variable | What it is |
| --- | --- |
| `SHEET_ID` | `1ZWSCLyoDXbT8eXqLzgngf-mhnD4bVczerdWhRYkMuf8` |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `client_email` from the key JSON |
| `GOOGLE_PRIVATE_KEY` | `private_key` from the key JSON, newlines written as `\n`, wrapped in double quotes |
| `DASHBOARD_USER` | Username for the site password prompt (default `rbx`) |
| `DASHBOARD_PASSWORD` | Password for the site. **Required in production.** |
| `DEMO_MODE` | Local layout work only — see below. Leave unset everywhere else. |

`GOOGLE_PRIVATE_KEY` must look like this, on one line:

```
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEv...long...\n-----END PRIVATE KEY-----\n"
```

The app turns the `\n` sequences back into real newlines. None of these are
`NEXT_PUBLIC_`, so none of them are sent to the browser.

## 3 · Run it locally

```bash
npm install
cp .env.example .env.local   # then fill in the three Google values
npm run dev                  # http://localhost:3000
```

Without a `DASHBOARD_PASSWORD`, local development runs without the password prompt.
A production deployment without it refuses to serve (503) rather than sit open.

## 4 · Deploy to Vercel

```bash
npm i -g vercel        # if you don't have it
vercel link            # pick/create the project
```

Then add the environment variables — either in the dashboard
(**Project → Settings → Environment Variables**, add each for *Production*,
*Preview* and *Development*), or from the CLI:

```bash
vercel env add SHEET_ID production
vercel env add GOOGLE_SERVICE_ACCOUNT_EMAIL production
vercel env add GOOGLE_PRIVATE_KEY production      # paste the one-line \n version
vercel env add DASHBOARD_USER production
vercel env add DASHBOARD_PASSWORD production
vercel --prod
```

Repeat for the `preview` environment if preview deployments should work too.
After changing any variable, **redeploy** — env vars are baked into a deployment.

### Keeping it private

Two independent locks; use either or both:

- **This app's password.** `src/proxy.ts` puts HTTP basic auth in front of every
  route using `DASHBOARD_USER` / `DASHBOARD_PASSWORD`.
- **Vercel Password Protection.** Project → Settings → Deployment Protection →
  Password Protection (available on paid plans). Protects preview URLs too.

There are **no API routes**: nothing serves Sheet rows as JSON. The Log tab (store
names, dollar amounts) is aggregated on the server and only totals are rendered.

## 5 · What it reads

One `spreadsheets.values.batchGet`, `valueRenderOption=UNFORMATTED_VALUE`,
`dateTimeRenderOption=SERIAL_NUMBER` (date serials are converted in the app).

| Tab | Range read | Notes |
| --- | --- | --- |
| `Inputs` | `A1:H400` | Assumptions, tier price table and events table are **found by label and header text**, not row number. Tables are read until the first blank row, so they can grow. |
| `Forecast` | `A1:AK40` | Header row found by text; 24 month rows plus the totals row. |
| `Milestones` | `A1:L80` | Gates, key numbers, unit economics, "Where we're lacking", staged capital ask, and the "Actuals to date" block — each located by its own header text. |
| `Plan vs Actual` | `A1:Q40` | Columns A–Q. `D, G, J, M, P, Q` are Log-fed formulas; blank means *no data yet*, never zero. |
| `Log` | `A1:I5000` | Read until the first blank Date, then **reduced to totals on the server**. Raw rows are never returned to the browser. |
| `Stores` | `A1:G60` | Blank store names are skipped. |

### If you rename or move things

- **Moving rows inside a tab is safe.** Blocks are found by their header/label text.
- **Renaming a tab** is the one thing that breaks a read. The app notices, keeps
  showing the last good data, and prints a visible notice naming the range that
  failed — the rest of the page still updates.
- Growing the events table, the stores list or the Log needs no code change.

An Inputs row is treated as an assumption when it has a number in column B *or* a
Real/Guess status in column C. Text-only rows with no status are read as headings
and skipped.

## 6 · Real vs Guess

- Inputs and tier rows show the Sheet's own **Real** / **Guess** status.
- Anything calculated from them (forecast, gates, capital) is only as good as its
  weakest input, so it reads **Guess** while any input is still a guess. Hover the
  pill for the count.
- Actuals (Log, Stores, Plan vs Actual actual columns) read **Real** — they are
  measured, not assumed.
- The Assumptions section has a *"% of inputs that are still guesses"* tile.

## 7 · Staleness and failures

- The page re-reads the Sheet at most once every 5 minutes.
- On a failed read it serves the **last good data** with a visible "stale" banner —
  never a blank page. Last-good is held in memory and in a short-lived JSON file in
  the serverless instance's temp directory (`os.tmpdir()`), which is ephemeral and
  not part of the repo or any backup.
- If one range fails but others succeed, the page shows fresh data for the rest and
  names the failed range in a banner.
- If the credentials are missing entirely, the page shows a setup checklist instead
  of an error.

## 8 · Local layout work without credentials

```bash
DEMO_MODE=1 npm run dev        # invented numbers, with actuals
DEMO_MODE=empty npm run dev    # invented numbers, Log empty (shows the empty states)
```

Demo numbers are generated in `src/lib/demo.ts`, run through the real parser, and
rendered behind a loud red "Demo data — not from the Sheet" banner. **Never set
`DEMO_MODE` on a deployment.**

## 9 · Design notes

- Theme follows the viewer's system light/dark setting. No toggles, no scenario
  controls — it is a read-only view.
- Colors come from a validated palette: sauce always the first categorical slot
  (blue), rub the second (orange), operating profit the third (aqua); a single-hue
  blue ramp for magnitude; green/amber/red/grey reserved for status and always
  paired with a label or an icon.
- "Where we're lacking" plots each row against *its own* target (percent of what's
  needed) because the rows mix bottles, stores and dollars — a shared dollar axis
  would be meaningless. The raw numbers are in the table beside it and in the tooltip.
- Every chart has a hover tooltip. Money is `$` with no decimals, except per-bottle
  costs and prices, which show cents.

## 10 · Project layout

```
src/
  app/            page.tsx (the whole dashboard), layout.tsx, globals.css (palette)
  proxy.ts        site password (HTTP basic auth)
  lib/
    sheets.ts     auth + batchGet, per-range fallback
    parse.ts      Sheet -> typed data, all block discovery by header/label
    data.ts       caching, last-good snapshot, demo wiring
    format.ts     money / count / percent / date-serial formatting
    provenance.ts the Real-vs-Guess rules
    demo.ts       synthetic grids for local layout work
  components/
    ui.tsx        cards, tiles, pills, tables, notices
    charts/       Recharts client components
    sections/     one file per numbered section of the page
```

## 11 · Day-to-day

Edits are made **in the Sheet only**. The dashboard picks them up within 5 minutes;
a hard refresh after that window shows the new numbers. If something looks wrong,
check the banner at the top of the page first — it says whether the data is live,
stale, or demo.
