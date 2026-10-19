import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { GraduationCap, Moon, Sun, TrendingUp, Wallet, Clock, Info, Hammer, Globe, MapPin } from 'lucide-react'
import { dataset, getSource } from './data'
import { HS_PATH, NATIONAL_PATHS, tradePath } from './lib/paths'
import { buildSchoolPaths } from './lib/schoolPaths'
import type { Programs, SchoolHit } from './lib/local'
import { breakEven, defaultAssumptions, simulate, usd, percentileFactor, nominalGrowth } from './lib/model'
import { Controls } from './components/Controls'
import { NetChart, CostChart } from './components/Charts'
import { Sources } from './components/Sources'
const LocalSearch = lazy(() => import('./components/LocalSearch').then((m) => ({ default: m.LocalSearch })))
import { useTheme } from './components/useTheme'

export default function App() {
  const { dark, toggle } = useTheme()
  const [majorId, setMajorId] = useState('cs')
  const [a, setA] = useState(defaultAssumptions)
  const major = dataset.majors.find((m) => m.id === majorId)!

  const params = new URLSearchParams(window.location.search)
  const [mode, setMode] = useState<'national' | 'local'>(params.get('zip') ? 'local' : 'national')
  const [selected, setSelected] = useState<SchoolHit[]>([])
  const [programs, setPrograms] = useState<Programs | null>(null)
  const [originState, setOriginState] = useState<string | null>(null)
  const trade = dataset.trades.find((t) => t.id === a.tradeId)
  useEffect(() => {
    if (mode === 'local' && !programs) void import('./lib/local').then((m) => m.loadPrograms()).then(setPrograms)
  }, [mode, programs])

  const usingSchools = mode === 'local' && selected.length > 0 && !!programs
  const paths = useMemo(() => {
    const college = usingSchools ? buildSchoolPaths(selected, major, programs!, a, originState) : NATIONAL_PATHS
    return [...college, ...(trade ? [tradePath(trade)] : []), HS_PATH]
  }, [usingSchools, selected, programs, major, a, originState, trade])
  const results = useMemo(() => paths.map((p) => simulate(p, major, a)), [paths, major, a])
  const base = results.find((r) => r.path.earnings === 'highSchool')!
  const college = results.filter((r) => r !== base)
  const best = [...college].sort((x, y) => y.lifetimeNet - x.lifetimeNet)[0]
  const f = percentileFactor(a.percentile)

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-40 -z-10 h-[36rem] bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.35),transparent_60%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.25),transparent_60%)]" />
      <div aria-hidden className="pointer-events-none absolute -right-40 top-40 -z-10 h-96 w-96 rounded-full bg-cyan-400/20 blur-3xl" />

      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-400 text-white shadow-lg shadow-violet-500/30">
            <GraduationCap className="h-5 w-5" aria-hidden />
          </div>
          <span className="text-lg font-extrabold tracking-tight">College Path Explorer</span>
        </div>
        <nav className="flex items-center gap-2">
          <a href="#sources" className="chip chip-off hidden sm:inline-block">Sources</a>
          <button onClick={toggle} aria-label={`Switch to ${dark ? 'light' : 'dark'} mode`} className="chip chip-off grid h-9 w-9 place-items-center p-0">
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-5 pb-16">
        <section className="pt-6 pb-2 text-center">
          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl">
            Where you go & what you study{' '}
            <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-400 bg-clip-text text-transparent">shapes your money for decades.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-slate-600 dark:text-slate-400">
            Compare community college, public and private universities across {dataset.majors.length} majors — cost, debt, salaries and lifetime earnings — using real public data.
          </p>
        </section>

        <div role="tablist" aria-label="Comparison mode" className="mx-auto flex w-fit gap-1 rounded-full bg-slate-200/70 p-1 dark:bg-white/5">
          {([['national', 'National averages', Globe], ['local', 'Schools near me', MapPin]] as const).map(([m, l, Icon]) => (
            <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={`chip inline-flex items-center gap-1.5 px-4 py-2 ${mode === m ? 'chip-on' : 'text-slate-600 dark:text-slate-300'}`}>
              <Icon className="h-4 w-4" aria-hidden /> {l}
            </button>
          ))}
        </div>

        <Controls majorId={majorId} setMajorId={setMajorId} a={a} setA={setA} />

        {mode === 'local' && (
          <Suspense fallback={<div className="card animate-pulse text-sm text-slate-500">Loading school data…</div>}>
            <LocalSearch major={major} programs={programs} selected={selected} setSelected={setSelected} initialZip={params.get('zip') ?? ''} onOrigin={setOriginState} />
          </Suspense>
        )}

        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          {usingSchools ? `Comparing ${selected.length} selected school${selected.length > 1 ? 's' : ''}` : 'Comparing national averages'} · starting fall {a.startYear} · all dollars are <strong>future (nominal) dollars</strong> of the year they're spent or earned.
          {mode === 'local' && !usingSchools && ' Select schools in the list to compare them.'}
        </p>

        <section className={`grid gap-4 sm:grid-cols-2 ${results.length > 4 ? 'xl:grid-cols-4' : 'lg:grid-cols-4'}`} aria-label="Path summaries">
          {results.map((r) => {
            const be = r === base ? null : breakEven(r, base)
            return (
              <article key={r.path.id} className={`card relative overflow-hidden hover:-translate-y-0.5 hover:shadow-lg ${r === best ? 'ring-2 ring-violet-500/60' : ''}`}>
                <div className="absolute inset-x-0 top-0 h-1" style={{ background: r.path.color }} />
                {r === best && <span className="absolute right-3 top-3 rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">Top earner</span>}
                <h3 className={`font-bold ${r === best ? "pr-20" : ""}`}>{r.path.name}</h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{r.path.description}</p>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <Stat icon={<Wallet className="h-3.5 w-3.5" />} k="Total cost" v={usd(r.totalCost)} />
                  <Stat icon={<Wallet className="h-3.5 w-3.5" />} k={`Year 1 (${a.startYear})`} v={r.firstYearCost ? usd(r.firstYearCost) : '—'} />
                  {r.trainingIncome > 0
                    ? <Stat icon={<TrendingUp className="h-3.5 w-3.5" />} k="Paid while training" v={usd(r.trainingIncome)} />
                    : <Stat icon={<Wallet className="h-3.5 w-3.5" />} k="Borrowed" v={usd(r.borrowed)} />}
                  <Stat icon={<TrendingUp className="h-3.5 w-3.5" />} k="Starting pay" v={usd(r.startingSalary)} />
                  <Stat icon={<TrendingUp className="h-3.5 w-3.5" />} k="Mid-career" v={usd(r.midSalary)} />
                  <Stat icon={<Clock className="h-3.5 w-3.5" />} k="Loan / month" v={r.monthlyPayment ? usd(r.monthlyPayment) : '—'} />
                  <Stat icon={<Clock className="h-3.5 w-3.5" />} k="Passes 'work now'" v={r === base ? 'baseline' : be ? `${be.year} (age ${be.age})` : 'not within horizon'} />
                </dl>
                {r.path.trade && (
                  <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-semibold">
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-700 dark:text-amber-300" title="BLS OEWS May 2025 national wages; local metro wages not yet included">Pay: BLS OEWS national</span>
                    <span className="rounded-full bg-slate-500/15 px-2 py-0.5 text-slate-600 dark:text-slate-300">{r.path.trade.training === 'apprenticeship' ? 'Earn while you learn' : r.path.trade.training === 'school' ? 'Trade school' : 'On-the-job training'}</span>
                  </div>
                )}
                {r.path.earnings === 'major' && (
                  <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-semibold">
                    <span className={`rounded-full px-2 py-0.5 ${r.path.earningsOverride ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-slate-500/15 text-slate-600 dark:text-slate-300'}`}
                      title={r.path.earningsOverride?.note ?? 'No school-specific earnings for this major: NY Fed national medians used'}>
                      Pay: {r.path.earningsOverride ? 'school data' : 'national avg.'}
                    </span>
                    <span className="rounded-full bg-slate-500/15 px-2 py-0.5 text-slate-600 dark:text-slate-300" title={r.path.costNote ?? 'College Board national average'}>
                      Cost: {r.path.costNote ? (r.path.costNote.startsWith('No') ? 'national avg.' : 'school data') : 'national avg.'}
                    </span>
                  </div>
                )}
                <div className="mt-3 rounded-xl bg-slate-100/80 p-3 dark:bg-white/5">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Net by {a.startYear + a.horizonYears - 1} (age {17 + a.horizonYears})</div>
                  <div className="text-2xl font-extrabold tracking-tight" style={{ color: r.path.color }}>{usd(r.lifetimeNet, true)}</div>
                </div>
              </article>
            )
          })}
        </section>

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="card lg:col-span-2">
            <h2 className="text-lg font-bold">Cumulative earnings after college costs</h2>
            <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">Pre-tax pay minus what you pay for school and loan payments, in future dollars. Where lines cross is the break-even point.</p>
            <NetChart results={results} startYear={a.startYear} />
          </section>
          <section className="card">
            <h2 className="text-lg font-bold">What the degree costs</h2>
            <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">Paid vs borrowed at {(a.loanRate * 100).toFixed(2)}% (federal undergrad rate) over {a.loanTermYears} years.</p>
            <CostChart results={results} />
          </section>
        </div>

        <section className="card text-sm">
          <h2 className="text-lg font-bold">How costs are projected to {a.startYear}</h2>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Each year's cost grows by College Board's {a.growthTrend === '30yr' ? '30-year' : '10-year'} inflation-adjusted tuition trend plus {(dataset.projection.cpiInflation * 100).toFixed(2)}%/yr CPI inflation (BLS CPI-U, 2015–2024). Salaries grow with CPI only.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {(['public2yr', 'public4yrInState', 'private4yr'] as const).map((t) => (
              <Big key={t} k={dataset.schoolCosts[t].label} v={`${(nominalGrowth(t, a) * 100).toFixed(2)}% / yr`} />
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{dataset.projection.growthNote} Housing, books & other costs are assumed to grow at the same rate.</p>
        </section>

        <section className="card">
          <h2 className="text-lg font-bold">{major.name}: salary snapshot (national, 2024 dollars)</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Big k="Early career median (age 22–27)" v={usd(major.earlyCareerMedian)} />
            <Big k="Mid-career median (age 35–45)" v={usd(major.midCareerMedian)} />
            <Big k="Est. early-career range (25th–75th)" v={`${usd(major.earlyCareerMedian * percentileFactor('p25'), true)} – ${usd(major.earlyCareerMedian * percentileFactor('p75'), true)}`} />
            <Big k="Unemployment · underemployment" v={`${major.unemploymentRate.toFixed(1)}% · ${major.underemploymentRate.toFixed(0)}%`} />
          </div>
          <p className="mt-4 flex gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            Medians: {getSource(major.sourceId)?.publisher}, {getSource(major.sourceId)?.dataYear}. Per-major 25th/75th percentiles aren't published there, so the range applies the all-majors recent-grad spread (NY Fed, 2025) — an estimate.
            {f !== 1 && ` Currently showing the ${a.percentile === 'p25' ? '25th' : '75th'} percentile scenario.`}
            {' '}{major.shareWithGradDegree.toFixed(0)}% of {major.name} grads go on to a graduate degree (not modeled). Same-major salaries are assumed equal across school types — national data by school type isn't in v1.
          </p>
        </section>

        {trade && (
          <section className="card">
            <div className="flex items-start gap-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-400/20 text-amber-600 dark:text-amber-300"><Hammer className="h-5 w-5" /></div>
              <div>
                <h2 className="text-lg font-bold">{trade.name}: pay & training (national, May 2025)</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{trade.trainingNote} <a className="text-amber-600 underline dark:text-amber-300" href={trade.oohUrl} target="_blank" rel="noreferrer">BLS Occupational Outlook Handbook</a></p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-5">
              {(['p10', 'p25', 'p50', 'p75', 'p90'] as const).map((k) => (
                <Big key={k} k={`${k.slice(1)}th percentile`.replace('50th percentile', 'Median')} v={usd(trade.wages[k])} />
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              Model: {trade.training === 'apprenticeship' ? `apprentice pay rises from ${dataset.apprenticeWage.startPct * 100}% to ${dataset.apprenticeWage.endPct * 100}% of the median over ${trade.years} years (Urban Institute guidance for registered apprenticeships: entry ≈40–50%, intermediate 50–80%). ` : trade.training === 'school' ? `${trade.years} year of trade school at public two-year tuition + books/other (College Board 2025-26), living at home. ` : 'starts work right after high school. '}
              After training, pay starts at the 25th percentile and rises to the median over 13 years (25th/75th scenarios shift this to 10th→25th or median→75th). This experience curve is a model assumption. Wages are national; local metro wages are not yet included.
            </p>
          </section>
        )}

        <Sources />

        <p className="text-center text-xs text-slate-500 dark:text-slate-400">
          Educational estimates using national averages — not financial advice. Real costs vary a lot by school, state and financial aid. Taxes, inflation, raises and investment returns are not modeled.
        </p>
      </main>
    </div>
  )
}

function Stat({ k, v, icon }: { k: string; v: string; icon: React.ReactNode }) {
  return (
    <div>
      <dt className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">{icon}{k}</dt>
      <dd className="font-semibold tabular-nums">{v}</dd>
    </div>
  )
}

function Big({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl bg-gradient-to-br from-violet-500/10 to-cyan-400/10 p-4">
      <div className="text-xs text-slate-500 dark:text-slate-400">{k}</div>
      <div className="mt-1 text-xl font-extrabold tabular-nums">{v}</div>
    </div>
  )
}
