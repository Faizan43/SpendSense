# SpendSense

Photograph a receipt and every line item is read out, priced and
categorised. Correct anything that's wrong, and the app remembers for next time.
Then see where the money actually went: category breakdowns, monthly trends,
store comparisons, which products quietly got more expensive, and a budget that
warns you at 80% rather than after you've blown it.

## Stack

| Layer | Choice |
|---|---|
| App | Next.js 16 (App Router), TypeScript, Tailwind v4, shadcn/ui |
| Data + auth + files | Supabase (Postgres, Auth, Storage) |
| Receipt reading | Claude vision (`claude-sonnet-4-6`) with structured JSON output |
| Charts | Recharts |
| Tests | Vitest |

Two decisions worth knowing before you read the code:

- **Money is stored as integer minor units (pence)**, never floats. Every amount
  column is `bigint`, and parsing goes through `parseMoneyToMinor` in
  [`lib/money.ts`](lib/money.ts), which works on the decimal string so
  `19.99` can never become `1998.9999…`. Formatting happens only at the display
  edge.
- **Row level security is the security boundary**, not application code. Every
  table is scoped to `auth.uid()`, and there is no service-role key anywhere in
  the app — even receipt extraction runs as the signed-in user.

## Setup

### 1. Install

```bash
npm install
```

### 2. Create a Supabase project

Then run the migrations in order, in the SQL editor (or via `supabase db push`):

```
supabase/migrations/0001_schema.sql
supabase/migrations/0002_rls.sql
supabase/migrations/0003_seed_new_user.sql
supabase/migrations/0004_analytics.sql
supabase/migrations/0005_storage.sql
supabase/migrations/0006_suggestions.sql
supabase/migrations/0007_normalize_apostrophes.sql
supabase/migrations/0009_harden_functions.sql
```

(`0008` is the demo-data function in [`supabase/seed.sql`](supabase/seed.sql),
which is optional — apply it before `0009` if you want it.)

`0003` installs a trigger on `auth.users`, so every new account gets a profile,
the twelve categories and the seeded keyword rules automatically.

### 3. Configure

```bash
cp .env.example .env.local
```

Fill in the Supabase URL and anon key from **Project Settings → API**, and an
`ANTHROPIC_API_KEY` if you want receipts read. Without the Anthropic key the app
still runs — uploads are stored and you type the items in yourself, and the UI
says so rather than failing silently.

### 4. Run

```bash
npm run dev
```

### 5. Optional: demo data

Sign up first, then run [`supabase/seed.sql`](supabase/seed.sql) and call it
from the SQL editor with your own user id:

```sql
select public.seed_demo_data('<your-user-uuid>');
```

That creates six months of weekly shops so the dashboard has something to draw.
Remove it any time with `delete from transactions where notes = 'demo-data';`.

## How the receipt pipeline works

1. The browser uploads straight to Supabase Storage with a signed URL — a 9 MB
   receipt photo would exceed the server action body limit.
2. `POST /api/receipts/[id]/process` normalises the image with `sharp`
   (auto-rotate from EXIF, strip metadata, cap the long edge at 2576px — Claude's
   high-resolution ceiling) and sends it to `claude-sonnet-4-6` with a JSON
   schema, so the response is guaranteed to parse. PDFs go across as a native
   document block; there's no separate OCR step.
3. The extraction is stored on the receipt row and turned into a **draft**. The
   review screen shows the image beside an editable grid, flags low-confidence
   lines in amber, and reconciles the item total against the printed total.
4. Nothing counts towards your spending until you press save.

Cost is roughly a cent or two per receipt on `claude-sonnet-4-6`. Set
`ANTHROPIC_MODEL=claude-opus-5` if you want the most accurate reading on
creased, faded or thermal-printed receipts instead — the schema and prompt
are identical.

## How categorisation works

Resolved cheapest and most certain first ([`lib/categorize/resolve.ts`](lib/categorize/resolve.ts)):

1. a rule you wrote
2. what this exact product was filed under last time
3. the seeded keyword rules, and rules learned from your past corrections
4. what the receipt reader suggested
5. Other

Within a band the **longest pattern wins**, so `hot chocolate` beats `chocolate`
and `frozen peas` beats `peas` without hand-tuned priorities. Every correction
you make writes a learned rule and updates the product's memory, so the second
Tesco shop is noticeably more accurate than the first.

## Charts

The categorical palette in [`app/globals.css`](app/globals.css) is eight hues,
validated for colour-vision separation and contrast in both light and dark mode.
**Don't reorder or extend it without re-validating** — the order is the safety
mechanism, not a style choice. Because eight hues can't carry twelve categories,
the donut shows the leading ones and folds the tail into a neutral "Other", the
bar chart carries the full list, and every chart has a table view behind the
table icon so no value is reachable only by hovering.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Unit tests |
| `npm run lint` | ESLint |

## Tests

`npm test` covers the parts where a silent bug would be worst: money parsing and
rounding, the categoriser's precedence order, store and product name
normalisation, and filter parsing. They are pure functions with no database, so
they run in a couple of seconds.

Things worth checking by hand, since they need a real project and real receipts:
sign up → onboarding → upload a JPG, a PNG and a PDF → correct a category and
confirm the next matching item follows it → set a £400 budget, add £320 of
spending and check the 80% alert fires once and only once → export the CSV and
confirm the totals match the screen.

## Notes and limits

- **Budget alerts appear in the app, not by email.** Every alert is stored as a
  notification with a dedupe key, so adding an email sender later is a
  transport, not a schema change.
- **The PDF export caps at 600 items.** It is for reading; the CSV carries
  everything.
- **CSV import treats a file as one shopping trip.** Store and date come from
  the first row and stay editable on the review screen.
- **Deleting your account** removes all of your data, but the Supabase auth
  record needs the dashboard — this app deliberately holds no admin key.
