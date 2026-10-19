# College Path Explorer 🎓

A modern web app that helps high school students see how **where they go to college** and **what they study** affect their finances for decades.

Compare four paths side by side:

| Path | What it models |
| --- | --- |
| **2+2 Transfer** | 2 years at a public community college → 2 years at an in-state public university |
| **Public 4-year** | 4 years at an in-state public university |
| **Private 4-year** | 4 years at a private nonprofit college |
| **Work now** | Baseline: start working right after high school |

For each of 24 majors you get total cost of attendance, how much you'd borrow, monthly loan payment, early- and mid-career salary (25th / median / 75th percentile scenarios), a cumulative earnings chart from age 18 to 33–58, and the age at which each college path passes the "work now" path (break-even).

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build to dist/
npm run lint       # oxlint
npm run typecheck
```

Requires Node 20+.

## Tech

Vite · React 19 · TypeScript · Tailwind CSS v4 · Recharts · lucide-react. No backend — all data ships in `src/data/seed.json`.

## How the model works (`src/lib/model.ts`)

- **Cost**: College Board 2025-26 average student budget per year (tuition & fees + housing & food + books/transport/other). "After avg. grants" swaps in average *net* tuition where College Board publishes one. "Live at home" drops housing & food.
- **Debt**: the share not paid up front (slider) is borrowed at the 2025-26 federal undergraduate rate (6.39%), repaid over 10 years.
- **Salary**: NY Fed early-career median (ages 22–27) rising linearly to the mid-career median (ages 35–45) over 13 years, then flat. 25th/75th scenarios scale by the all-majors recent-grad wage distribution.
- **Work now baseline**: BLS median (and quartile) weekly earnings for high-school graduates × 52.
- Everything is pre-tax, in today's dollars; no raises, inflation, taxes or investment returns.

This is an educational estimate, not financial advice.

## Data sources

Every figure lives in `src/data/seed.json` with a `sourceId` pointing to the `sources` list, which is also shown in the app.

- **Federal Reserve Bank of New York — The Labor Market for Recent College Graduates**, outcomes by major (2024 data, released Feb 4 2026): early/mid-career median wages, unemployment, underemployment, share with grad degree. https://www.newyorkfed.org/research/college-labor-market
- **NY Fed — Distribution of annual wages for recent college graduates by percentile** (2025, constant 2025 $).
- **College Board — Trends in College Pricing and Student Aid 2025** (Table CP-1 / Figure CP-1; net prices from the Highlights page).
- **BLS — CPS Table 37b** and **Usual Weekly Earnings Table 9** (2025 annual averages).
- **U.S. Dept. of Education — Federal Register notice of Direct Loan interest rates** (2025-26).

### Known data gaps

- Per-major 25th/75th percentile salaries aren't in the NY Fed by-major table; the app applies the all-majors spread (labeled as an estimate).
- Salaries are the same for a major regardless of school type — national school-type-by-major earnings will come from College Scorecard (below).
- No sourced single net-price figure for public two-year colleges (College Board says grants cover average tuition & fees but gives no number), so the net option keeps sticker tuition there.
- No sourced per-path average debt figure is used; debt is computed from the user's "paid up front" assumption.
- Graduate school, taxes, inflation and regional cost differences are not modeled.

## College Scorecard (planned)

`scripts/fetch-scorecard.mjs` pulls program-level earnings and debt by CIP code from the [College Scorecard API](https://collegescorecard.ed.gov/data/api-documentation/).

```bash
cp .env.example .env               # never committed
export SCORECARD_API_KEY=your_key  # free at https://api.data.gov/signup/
npm run scorecard -- 1107 > data/scorecard-1107.json
```

Plan: aggregate medians by CIP and institution control, add them to the seed with a source entry, and let salary vary by school type.

## Architecture

```
src/
  data/        seed.json (all numbers + citations), types.ts, index.ts
  lib/paths.ts PATHS: each path = training phases + an earnings model
  lib/model.ts simulation: cost, loans, salary curve, break-even
  components/  Controls, Charts (Recharts), Sources, theme hook
  App.tsx      layout
scripts/       data-pulling scripts
```

A path is just data: a list of `phases` (each with years, an optional `schoolType` cost and optional `annualIncome`) plus an `earnings` model. Adding **Trades** means adding sourced apprenticeship wages and journeyworker salaries (e.g. BLS Occupational Outlook Handbook, DOL Apprenticeship data) to the seed and a new `PATHS` entry with a paid apprenticeship phase.

## Roadmap

- [ ] **Trades & apprenticeships** (electrician, plumber, HVAC, welder, etc.) — earn-while-you-learn path
- [ ] College Scorecard integration: salary & debt by school type and by specific school
- [ ] State-level tuition (College Board Table CP-5)
- [ ] Taxes, inflation and savings/investing for true net worth
- [ ] Graduate school paths, shareable scenario links, side-by-side major comparison

## License

MIT
