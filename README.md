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

## Schools near me (local mode)

Switch to **Schools near me**, enter a 5-digit ZIP and a max drive time (30/60/90/120 min). The app lists **every** currently operating, degree-granting (associate or higher) public and private nonprofit institution in range from the College Scorecard — 2,974 schools nationally (876 community/2-year, 798 public 4-year, 1,300 private nonprofit 4-year) — with type, city, estimated drive time, cost of attendance, average net price, median earnings 10 years after entry, and the school's median earnings for your selected major where Scorecard reports it. Tick up to 6 schools to compare them in the cards and charts instead of national averages. You can deep-link with `?zip=60601`.

- A 2-year school is modeled as 2+2: two years there, then the first selected public 4-year school (or the national public average).
- Earnings: the school's Scorecard bachelor's field-of-study median (4 yrs after graduation, else 1 yr), with mid-career scaled by the national early→mid growth for that major. When missing, NY Fed national medians are used and the card says **"Pay: national avg."**
- **Drive times are estimated**: great-circle distance × 1.20 U.S. road circuity factor (Ballou, Rahardja & Sakai 2002) ÷ an assumed 45 mph average. No routing API is called.
- School data is lazy-loaded from `public/data/` (`schools.json` ~0.6 MB, `programs.json` ~0.3 MB, ZIP centroids split by 3-digit prefix into `zips/*.json` of a few KB each), so the main bundle doesn't grow.

Rebuild the data:

```bash
mkdir rawdata && cd rawdata
curl -LO https://ed-public-download.scorecard.network/downloads/Most-Recent-Cohorts-Institution_10152026.zip
curl -LO https://ed-public-download.scorecard.network/downloads/Most-Recent-Cohorts-Field-of-Study_10152026.zip
curl -LO https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2024_Gazetteer/2024_Gaz_zcta_national.zip
for z in *.zip; do unzip -o $z; done; cd ..
python3 scripts/build_school_data.py rawdata
```

(Check https://collegescorecard.ed.gov/data/ for the latest file names.)

## Out-of-state tuition

The **Public-school residency** control has three settings: *Auto (by ZIP)*, *In-state* and *Out-of-state*.
- National mode: out-of-state swaps in College Board 2025-26 public four-year out-of-state tuition ($31,880; budget $50,920). Auto counts as in-state there.
- Local mode: Auto compares the state of your ZIP (Census 2020 ZCTA-to-county file) with each public school's state. Out-of-state schools use Scorecard `COSTT4_A − TUITIONFEE_IN + TUITIONFEE_OUT`. For net price, the same tuition difference is added to NPT4, which is an approximation. Private schools are unaffected.

## Trades & apprenticeships

Pick a trade to add it as a path next to the college paths: electrician, plumber/pipefitter, carpenter, lineworker, HVAC/R, auto tech, welder, construction equipment operator or diesel tech.
- **Wages**: BLS OEWS May 2025 national 10th/25th/median/75th/90th percentile annual wages (BLS API).
- **Training** (BLS EP Table 5.4 + OOH + BLS Career Outlook 2013):
  - Apprenticeship: electrician 4 yrs, plumber 4, carpenter 4, lineworker 3.
  - Trade program: HVAC 1 yr, auto 1 yr.
  - On-the-job training, starting work right away: welder, equipment operator, diesel.
- **Earn while you learn**: apprentice pay rises from 45% to 80% of the OEWS median over the apprenticeship. This follows Urban Institute guidance for registered apprenticeships: entry ≈40–50%, intermediate 50–80%, exit = journeyworker.
- **Trade-school cost**: College Board public two-year tuition & fees + books/transport/other, living at home.
- **Assumption**: after training, pay starts at the 25th percentile and rises to the median over 13 years. The 25th/75th scenarios use 10th→25th and median→75th instead.
- Wages are national. Metro-level OEWS wages are not included yet (roadmap).

## Start year & cost projection

Pick the year you start college (2026–2032). Costs for each year in school are projected from their base year at
`(1 + College Board real tuition growth) × (1 + CPI inflation) − 1`:

- Real growth: College Board *Trends in College Pricing 2025* — 30-year trend (1995-96→2025-26: two-year 1.31%/yr, public 4-yr 2.36%/yr, private 1.87%/yr) or 10-year trend (2015-16→2025-26: −1.05%, −0.72%, +0.20%/yr).
- Inflation: BLS CPI-U annual averages 2015→2024 = 3.16%/yr.
- Salaries are inflated from their data year with CPI only. All app figures are **nominal dollars of the year spent/earned**, and the chart's x-axis is calendar years (age 18 = start year).

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
- **U.S. Dept. of Education — College Scorecard** Most Recent Institution-Level and Field-of-Study data (updated Oct 15, 2026). https://collegescorecard.ed.gov/data/
- **U.S. Census Bureau — 2024 Gazetteer ZCTA file** (ZIP centroids).
- **BLS — OEWS May 2025** national wage percentiles; **EP Table 5.4** education & training; **OOH** training lengths; **Career Outlook 2013** apprenticeship lengths.
- **Urban Institute — Setting Wages in Your Registered Apprenticeship Program** (apprentice wage progression).
- **Census — 2020 ZCTA-to-county relationship file** (ZIP → state).
- **BLS — CPI-U (CUUR0000SA0)** annual averages 2015–2024.
- **Ballou, Rahardja & Sakai (2002)**, *Selected country circuity factors for road travel distance estimation*, Transportation Research Part A 36(9) — U.S. factor 1.20.

### Known data gaps

- Drive time is an estimate (straight line × 1.2 at 45 mph — the speed is an assumption, not sourced); real times vary with traffic and terrain.
- Scorecard cost/earnings base year is treated as 2024 for projection; public-school costs assume in-state tuition; "live at home" only affects national averages (Scorecard COA isn't split by housing).
- Field-of-study earnings are often suppressed for small programs → national fallback (labeled). Scorecard 4-yr-after-graduation earnings are later than the NY Fed's age 22–27 "early career" window, so school figures can look higher.
- ZIP lookup uses Census ZCTAs; some PO-box-only ZIPs have no ZCTA and won't be found.

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
  lib/local.ts lazy loaders, ZIP lookup, distance & drive-time estimate
  lib/schoolPaths.ts turns selected schools into PathDefs
  lib/paths.ts PATHS: each path = training phases + an earnings model
  lib/model.ts simulation: cost, loans, salary curve, break-even
  components/  Controls, Charts (Recharts), Sources, theme hook
  App.tsx      layout
scripts/       build_school_data.py (Scorecard + Census → public/data), fetch-scorecard.mjs
public/data/   generated school, program and ZIP JSON (lazy-loaded)
```

A path is just data: a list of `phases` (each with years, an optional `schoolType` cost and optional `annualIncome`) plus an `earnings` model. Adding **Trades** means adding sourced apprenticeship wages and journeyworker salaries (e.g. BLS Occupational Outlook Handbook, DOL Apprenticeship data) to the seed and a new `PATHS` entry with a paid apprenticeship phase.

## Roadmap

- [x] **Trades & apprenticeships**: earn-while-you-learn path (national wages)
- [ ] Metro-level OEWS trade wages in local mode
- [x] College Scorecard integration: specific schools near a ZIP
- [x] Out-of-state tuition
- [ ] Real routing for drive times
- [ ] State-level tuition (College Board Table CP-5)
- [ ] Taxes, inflation and savings/investing for true net worth
- [ ] Graduate school paths, shareable scenario links, side-by-side major comparison

## License

MIT

## Deploy (GitHub Pages)

`.github/workflows/pages.yml` builds with `PAGES_BASE=/college-path-explorer/` and deploys `dist/` to GitHub Pages on every push to `main`. Lazy-loaded data uses `import.meta.env.BASE_URL`, so it works under the sub-path.
