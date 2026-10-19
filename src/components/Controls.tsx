import type { Assumptions } from '../lib/model'
import { dataset } from '../data'

interface Props {
  majorId: string
  setMajorId: (id: string) => void
  a: Assumptions
  setA: (a: Assumptions) => void
}

function Toggle<T extends string>({ value, options, onChange, label }: { value: T; options: { v: T; l: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o.v} role="radio" aria-checked={value === o.v} onClick={() => onChange(o.v)} className={`chip ${value === o.v ? 'chip-on' : 'chip-off'}`}>
          {o.l}
        </button>
      ))}
    </div>
  )
}

export function Controls({ majorId, setMajorId, a, setA }: Props) {
  const cats = [...new Set(dataset.majors.map((m) => m.category))]
  return (
    <div className="card grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <div>
        <label htmlFor="major" className="label">Major</label>
        <select id="major" value={majorId} onChange={(e) => setMajorId(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium shadow-sm focus:outline-2 focus:outline-violet-500 dark:border-white/10 dark:bg-slate-900">
          {cats.map((c) => (
            <optgroup key={c} label={c}>
              {dataset.majors.filter((m) => m.category === c).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </optgroup>
          ))}
        </select>
      </div>
      <div>
        <span className="label">Price basis</span>
        <Toggle label="Price basis" value={a.pricing} onChange={(pricing) => setA({ ...a, pricing })}
          options={[{ v: 'sticker', l: 'Sticker price' }, { v: 'net', l: 'After avg. grants' }]} />
      </div>
      <div>
        <span className="label">Salary outcome</span>
        <Toggle label="Salary outcome" value={a.percentile} onChange={(percentile) => setA({ ...a, percentile })}
          options={[{ v: 'p25', l: '25th pct' }, { v: 'p50', l: 'Median' }, { v: 'p75', l: '75th pct' }]} />
      </div>
      <div>
        <label htmlFor="paid" className="label">Paid without loans: {Math.round(a.paidUpFront * 100)}%</label>
        <input id="paid" type="range" min={0} max={100} step={5} value={a.paidUpFront * 100}
          onChange={(e) => setA({ ...a, paidUpFront: +e.target.value / 100 })} className="w-full accent-violet-600" />
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Family help, savings, scholarships & work. The rest is borrowed.</p>
      </div>
      <div>
        <label htmlFor="horizon" className="label">Time horizon: {a.horizonYears} years (to age {18 + a.horizonYears})</label>
        <input id="horizon" type="range" min={15} max={40} value={a.horizonYears}
          onChange={(e) => setA({ ...a, horizonYears: +e.target.value })} className="w-full accent-violet-600" />
      </div>
      <div>
        <span className="label">Housing</span>
        <Toggle label="Housing" value={a.liveAtHome ? 'home' : 'campus'} onChange={(v) => setA({ ...a, liveAtHome: v === 'home' })}
          options={[{ v: 'campus', l: 'On campus' }, { v: 'home', l: 'Live at home' }]} />
      </div>
    </div>
  )
}
