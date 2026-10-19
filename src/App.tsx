import { useMemo, useState } from 'react'
import { GraduationCap, Moon, Sun, TrendingUp, Wallet, Clock, Info, Hammer } from 'lucide-react'
import { dataset, getSource } from './data'
import { PATHS } from './lib/paths'
import { breakEvenYear, defaultAssumptions, simulate, usd, percentileFactor } from './lib/model'
import { Controls } from './components/Controls'
import { NetChart, CostChart } from './components/Charts'
import { Sources } from './components/Sources'
import { useTheme } from './components/useTheme'

export default function App() {
  const { dark, toggle } = useTheme()
  const [majorId, setMajorId] = useState('cs')
  const [a, setA] = useState(defaultAssumptions)
  const major = dataset.majors.find((m) => m.id === majorId)!

  const results = useMemo(() => PATHS.map((p) => simulate(p, major, a)), [major, a])
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

        <Controls majorId={majorId} setMajorId={setMajorId} a={a} setA={setA} />

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Path summaries">
          {results.map((r) => {
            const be = r === base ? null : breakEvenYear(r, base)
            return (
              <article key={r.path.id} className={`card relative overflow-hidden hover:-translate-y-0.5 hover:shadow-lg ${r === best ? 'ring-2 ring-violet-500/60' : ''}`}>
                <div className="absolute inset-x-0 top-0 h-1" style={{ background: r.path.color }} />
                {r === best && <span className="absolute right-3 top-3 rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">Top earner</span>}
                <h3 className={`font-bold ${r === best ? "pr-20" : ""}`}>{r.path.name}</h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{r.path.description}</p>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <Stat icon={<Wallet className="h-3.5 w-3.5" />} k="Total cost" v={usd(r.totalCost)} />
                  <Stat icon={<Wallet className="h-3.5 w-3.5" />} k="Borrowed" v={usd(r.borrowed)} />
                  <Stat icon={<TrendingUp className="h-3.5 w-3.5" />} k="Starting pay" v={usd(r.startingSalary)} />
                  <Stat icon={<TrendingUp className="h-3.5 w-3.5" />} k="Mid-career" v={usd(r.midSalary)} />
                  <Stat icon={<Clock className="h-3.5 w-3.5" />} k="Loan / month" v={r.monthlyPayment ? usd(r.monthlyPayment) : '—'} />
                  <Stat icon={<Clock className="h-3.5 w-3.5" />} k="Passes 'work now'" v={r === base ? 'baseline' : be ? `age ${18 + be}` : 'not within horizon'} />
                </dl>
                <div className="mt-4 rounded-xl bg-slate-100/80 p-3 dark:bg-white/5">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Net by age {18 + a.horizonYears}</div>
                  <div className="text-2xl font-extrabold tracking-tight" style={{ color: r.path.color }}>{usd(r.lifetimeNet, true)}</div>
                </div>
              </article>
            )
          })}
        </section>

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="card lg:col-span-2">
            <h2 className="text-lg font-bold">Cumulative earnings after college costs</h2>
            <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">Pre-tax pay minus what you pay for school and loan payments, in today's dollars. Where lines cross is the break-even point.</p>
            <NetChart results={results} />
          </section>
          <section className="card">
            <h2 className="text-lg font-bold">What the degree costs</h2>
            <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">Paid vs borrowed at {(a.loanRate * 100).toFixed(2)}% (federal undergrad rate) over {a.loanTermYears} years.</p>
            <CostChart results={results} />
          </section>
        </div>

        <section className="card">
          <h2 className="text-lg font-bold">{major.name}: salary snapshot</h2>
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

        <section className="card flex items-start gap-4 border-dashed">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-400/20 text-amber-600 dark:text-amber-300"><Hammer className="h-5 w-5" /></div>
          <div>
            <h2 className="font-bold">Coming soon: Trades & apprenticeships</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Electricians, plumbers, HVAC, welders — paid apprenticeships where you earn while you learn. The path engine already supports paid training phases.</p>
          </div>
        </section>

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
