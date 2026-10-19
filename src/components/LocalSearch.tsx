import { useEffect, useMemo, useState } from 'react'
import { MapPin, Search, Check, Loader2 } from 'lucide-react'
import { lookupZip, searchNearby, TYPE_LABEL, AVG_MPH, CIRCUITY, type LocalType, type Programs, type SchoolHit } from '../lib/local'
import { usd } from '../lib/model'
import type { Major } from '../data'

const RADII = [30, 60, 90, 120]
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
}

export function LocalSearch({ major, programs, selected, setSelected, initialZip = '' }: Props) {
  const [zip, setZip] = useState(initialZip)
  const [radius, setRadius] = useState(60)
  const [hits, setHits] = useState<SchoolHit[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [types, setTypes] = useState<Set<LocalType>>(new Set(['twoYear', 'public4', 'private4']))
  const [q, setQ] = useState('')

  async function run(z = zip, r = radius) {
    setError('')
    setLoading(true)
    try {
      const origin = await lookupZip(z.trim())
      if (!origin) {
        setError('ZIP code not found. Enter a 5-digit U.S. ZIP code.')
        setHits(null)
        return
      }
      setHits(await searchNearby(origin, r))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (initialZip) void run(initialZip, radius)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const shown = useMemo(
    () => (hits ?? []).filter((h) => types.has(h.t) && (!q || h.n.toLowerCase().includes(q.toLowerCase()) || h.c.toLowerCase().includes(q.toLowerCase()))),
    [hits, types, q],
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
            <div role="radiogroup" aria-label="Maximum drive time" className="flex gap-1.5">
              {RADII.map((r) => (
                <button type="button" key={r} role="radio" aria-checked={radius === r} onClick={() => { setRadius(r); if (hits) void run(zip, r) }}
                  className={`chip ${radius === r ? 'chip-on' : 'chip-off'}`}>{r}m</button>
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
                  <th className="p-3">School</th>
                  <th className="p-3">Type</th>
                  <th className="p-3 text-right">Est. drive</th>
                  <th className="p-3 text-right">Cost / yr</th>
                  <th className="p-3 text-right">Net price</th>
                  <th className="p-3 text-right">Earnings (10 yr)</th>
                  <th className="p-3 text-right">{major.name} grads</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((h) => {
                  const p = programs?.[String(h.id)]?.[major.id]
                  const pe = p ? (p[1] ?? p[0]) : null
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
                      <td className="p-3 text-right tabular-nums">{pe ? usd(pe) : <span className="text-xs text-slate-400">national</span>}</td>
                    </tr>
                  )
                })}
                {shown.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-slate-500">No schools match.</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Drive times are <strong>estimated</strong>: straight-line distance × {CIRCUITY} U.S. road circuity factor (Ballou et al., 2002) at an assumed {AVG_MPH} mph average. Costs are Scorecard averages (public schools use in-state tuition). "{major.name} grads" = Scorecard median earnings for that school's bachelor's program (4 yrs after graduation, else 1 yr); "national" means no school data, so national major figures are used.
          </p>
        </>
      )}
    </section>
  )
}
