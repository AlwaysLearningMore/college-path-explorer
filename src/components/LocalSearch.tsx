import { useEffect, useMemo, useState } from 'react'
import { MapPin, Search, Check, Loader2, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { lookupZip, searchNearby, TYPE_LABEL, AVG_MPH, CIRCUITY, type LocalType, type Programs, type SchoolHit } from '../lib/local'
import { usd } from '../lib/model'
import type { Major } from '../data'

const RADII = [30, 60, 120, 180, 240, 300, 360, 420]
const fmtRadius = (m: number) => (m < 60 ? `${m}m` : `${m / 60}h`)
const PAGE = 50

/** Typical years to finish: 2 for community/2-year, 4 for bachelor's institutions. */
const degreeYears = (h: SchoolHit) => (h.t === 'twoYear' ? 2 : 4)
/** Efficiency = median earnings 10 yrs after entry ÷ (avg annual net price × typical years). Both from College Scorecard. */
function efficiency(h: SchoolHit): number | null {
  if (!h.e10 || !h.np || h.np <= 0) return null
  return h.e10 / (h.np * degreeYears(h))
}
type SortKey = 'minutes' | 'n' | 'coa' | 'np' | 'e10' | 'eff' | 'major'
const MAX_SELECTED = 6
const TYPE_STYLE: Record<LocalType, string> = {
  twoYear: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300',
  public4: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  private4: 'bg-pink-500/15 text-pink-700 dark:text-pink-300',
}

interface Props {
  major: Major
  programs: Programs | null
  selected: SchoolHit[]
  setSelected: (s: SchoolHit[]) => void
  initialZip?: string
  onOrigin?: (state: string | null) => void
}

export function LocalSearch({ major, programs, selected, setSelected, initialZip = '', onOrigin }: Props) {
  const [zip, setZip] = useState(initialZip)
  const [radius, setRadius] = useState(60)
  const [hits, setHits] = useState<SchoolHit[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [types, setTypes] = useState<Set<LocalType>>(new Set(['twoYear', 'public4', 'private4']))
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 }>({ k: 'minutes', dir: 1 })
  const [page, setPage] = useState(0)

  async function run(z = zip, r = radius) {
    setError('')
    setLoading(true)
    try {
      const origin = await lookupZip(z.trim())
      if (!origin) {
        setError('ZIP code not found. Enter a 5-digit U.S. ZIP code.')
        setHits(null)
        onOrigin?.(null)
        return
      }
      onOrigin?.(origin[2] || null)
      setHits(await searchNearby(origin, r))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (initialZip) void run(initialZip, radius)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const majorPay = (h: SchoolHit) => {
    const p = programs?.[String(h.id)]?.[major.id]
    return p ? (p[1] ?? p[0]) : null
  }
  const filtered = useMemo(() => {
    const val = (h: SchoolHit): number | string | null =>
      sort.k === 'eff' ? efficiency(h) : sort.k === 'major' ? majorPay(h) : sort.k === 'n' ? h.n : (h[sort.k] ?? null)
    return (hits ?? [])
      .filter((h) => types.has(h.t) && (!q || h.n.toLowerCase().includes(q.toLowerCase()) || h.c.toLowerCase().includes(q.toLowerCase())))
      .sort((a, b) => {
        const va = val(a), vb = val(b)
        if (va === null && vb === null) return 0
        if (va === null) return 1 // missing values always last
        if (vb === null) return -1
        return (typeof va === 'string' ? va.localeCompare(vb as string) : va - (vb as number)) * sort.dir
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hits, types, q, sort, programs, major.id])
  useEffect(() => setPage(0), [hits, types, q, sort])
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE))
  const shown = filtered.slice(page * PAGE, page * PAGE + PAGE)
  const maxEff = useMemo(() => Math.max(1, ...filtered.map((h) => efficiency(h) ?? 0)), [filtered])
  const th = (k: SortKey, label: string, right = true, title?: string) => (
    <th className={`p-3 ${right ? 'text-right' : ''}`} aria-sort={sort.k === k ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'} title={title}>
      <button className={`inline-flex items-center gap-1 uppercase tracking-wider hover:text-violet-600 dark:hover:text-violet-300 ${sort.k === k ? 'text-violet-600 dark:text-violet-300' : ''}`}
        onClick={() => setSort((s) => ({ k, dir: s.k === k ? ((-s.dir) as 1 | -1) : k === 'minutes' || k === 'n' || k === 'coa' || k === 'np' ? 1 : -1 }))}>
        {label}{sort.k === k && (sort.dir === 1 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
      </button>
    </th>
  )
  const counts = useMemo(() => {
    const c: Record<LocalType, number> = { twoYear: 0, public4: 0, private4: 0 }
    hits?.forEach((h) => c[h.t]++)
    return c
  }, [hits])

  const isSel = (h: SchoolHit) => selected.some((s) => s.id === h.id)
  const toggle = (h: SchoolHit) =>
    setSelected(isSel(h) ? selected.filter((s) => s.id !== h.id) : selected.length >= MAX_SELECTED ? selected : [...selected, h])

  return (
    <section className="card" aria-labelledby="local-h">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="local-h" className="flex items-center gap-2 text-lg font-bold"><MapPin className="h-5 w-5 text-violet-500" aria-hidden /> Schools near you</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Every degree-granting public and private nonprofit college within your drive time (College Scorecard). Pick up to {MAX_SELECTED} to compare.</p>
        </div>
        <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); void run() }}>
          <div>
            <label htmlFor="zip" className="label">ZIP code</label>
            <input id="zip" inputMode="numeric" maxLength={5} value={zip} onChange={(e) => setZip(e.target.value.replace(/\D/g, ''))} placeholder="e.g. 60601"
              className="w-32 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold tracking-widest shadow-sm focus:outline-2 focus:outline-violet-500 dark:border-white/10 dark:bg-slate-900" />
          </div>
          <div>
            <span className="label">Max drive</span>
            <div role="radiogroup" aria-label="Maximum drive time" className="flex flex-wrap gap-1.5">
              {RADII.map((r) => (
                <button type="button" key={r} role="radio" aria-checked={radius === r} onClick={() => { setRadius(r); if (hits) void run(zip, r) }}
                  className={`chip ${radius === r ? 'chip-on' : 'chip-off'}`}>{fmtRadius(r)}</button>
              ))}
            </div>
          </div>
          <button type="submit" className="chip chip-on inline-flex items-center gap-1.5 px-4 py-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Search
          </button>
        </form>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-rose-500">{error}</p>}

      {hits && (
        <>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {(Object.keys(TYPE_LABEL) as LocalType[]).map((t) => (
              <button key={t} aria-pressed={types.has(t)} onClick={() => { const n = new Set(types); if (n.has(t)) n.delete(t); else n.add(t); setTypes(n) }}
                className={`chip ${types.has(t) ? TYPE_STYLE[t] + ' ring-1 ring-current' : 'chip-off opacity-60'}`}>
                {TYPE_LABEL[t]} · {counts[t]}
              </button>
            ))}
            <input aria-label="Filter schools by name or city" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by name or city"
              className="ml-auto w-full rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm sm:w-56 dark:border-white/10 dark:bg-slate-900" />
          </div>
          <div className="mt-3 max-h-[28rem] overflow-auto rounded-xl border border-slate-200/70 dark:border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-slate-100/95 text-xs uppercase tracking-wider text-slate-500 backdrop-blur dark:bg-slate-900/95 dark:text-slate-400">
                <tr>
                  <th className="p-3"><span className="sr-only">Compare</span></th>
                  {th('n', 'School', false)}
                  <th className="p-3">Type</th>
                  {th('minutes', 'Est. drive')}
                  {th('coa', 'Cost / yr')}
                  {th('np', 'Net price')}
                  {th('e10', 'Earnings (10 yr)')}
                  {th('eff', 'Efficiency', true, 'Median earnings 10 yrs after entry ÷ (average annual net price × 2 yrs for 2-year schools or 4 yrs for 4-year). Higher = more earnings per dollar of degree cost. Both from College Scorecard; — when either is missing.')}
                  {th('major', `${major.name} grads`)}
                </tr>
              </thead>
              <tbody>
                {shown.map((h) => {
                  const pe = majorPay(h)
                  const eff = efficiency(h)
                  const sel = isSel(h)
                  return (
                    <tr key={h.id} onClick={() => toggle(h)} className={`cursor-pointer border-t border-slate-200/60 transition-colors dark:border-white/5 ${sel ? 'bg-violet-500/10' : 'hover:bg-slate-100/70 dark:hover:bg-white/5'}`}>
                      <td className="p-3">
                        <button role="checkbox" aria-checked={sel} aria-label={`Compare ${h.n}`} onClick={(e) => { e.stopPropagation(); toggle(h) }}
                          className={`grid h-5 w-5 place-items-center rounded-md border transition-all ${sel ? 'border-violet-600 bg-violet-600 text-white' : 'border-slate-300 dark:border-white/20'}`}>
                          {sel && <Check className="h-3.5 w-3.5" />}
                        </button>
                      </td>
                      <td className="p-3">
                        <div className="font-semibold">{h.n}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{h.c}, {h.s}{h.ug ? ` · ${h.ug.toLocaleString()} undergrads` : ''}</div>
                      </td>
                      <td className="p-3"><span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${TYPE_STYLE[h.t]}`}>{TYPE_LABEL[h.t]}</span></td>
                      <td className="p-3 text-right tabular-nums">~{Math.round(h.minutes)} min<div className="text-xs text-slate-500">{Math.round(h.miles)} mi straight</div></td>
                      <td className="p-3 text-right tabular-nums">{h.coa ? usd(h.coa) : '—'}</td>
                      <td className="p-3 text-right tabular-nums">{h.np ? usd(h.np) : '—'}</td>
                      <td className="p-3 text-right tabular-nums">{h.e10 ? usd(h.e10) : '—'}</td>
                      <td className="p-3 text-right tabular-nums" title={eff ? `${usd(h.e10!)} ÷ (${usd(h.np!)} × ${degreeYears(h)} yrs) = ${eff.toFixed(2)}× · payback ≈ ${(1 / eff).toFixed(1)} yrs of earnings` : 'Missing net price or earnings'}>
                        {eff ? (
                          <div className="ml-auto flex w-24 flex-col items-end gap-1">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${eff >= 1 ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : eff >= 0.5 ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300' : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'}`}>{eff.toFixed(2)}×</span>
                            <div className="h-1 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10" aria-hidden>
                              <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-400" style={{ width: `${Math.min(100, (eff / maxEff) * 100)}%` }} />
                            </div>
                          </div>
                        ) : '—'}
                      </td>
                      <td className="p-3 text-right tabular-nums">{pe ? usd(pe) : <span className="text-xs text-slate-400">national</span>}</td>
                    </tr>
                  )
                })}
                {shown.length === 0 && <tr><td colSpan={9} className="p-6 text-center text-slate-500">No schools match.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 text-sm">
            <span className="text-slate-500 dark:text-slate-400">{filtered.length.toLocaleString()} schools · showing {filtered.length ? page * PAGE + 1 : 0}–{Math.min(filtered.length, (page + 1) * PAGE)}</span>
            <div className="flex items-center gap-1.5">
              <button aria-label="Previous page" disabled={page === 0} onClick={() => setPage(page - 1)} className="chip chip-off disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
              <span className="tabular-nums">{page + 1} / {pages}</span>
              <button aria-label="Next page" disabled={page >= pages - 1} onClick={() => setPage(page + 1)} className="chip chip-off disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            <strong>Efficiency</strong> = median earnings 10 years after entry ÷ (average annual net price × 2 years for 2-year schools or 4 years for 4-year schools), both from College Scorecard. 1.0× means one year of typical earnings equals the whole degree's net cost; payback ≈ 1 ÷ efficiency years of gross earnings. It uses in-state net price for the average aided student and all-program earnings (including non-completers). Sort by any column; missing values always sort last.
            {' '}Drive times are <strong>estimated</strong>: straight-line distance × {CIRCUITY} U.S. road circuity factor (Ballou et al., 2002) at an assumed {AVG_MPH} mph average. Costs in this list are Scorecard averages at in-state tuition; in the comparison cards, public schools outside your ZIP's state (or all publics if you choose Out-of-state) swap in Scorecard out-of-state tuition. "{major.name} grads" = Scorecard median earnings for that school's bachelor's program (4 yrs after graduation, else 1 yr); "national" means no school data, so national major figures are used.
          </p>
        </>
      )}
    </section>
  )
}
