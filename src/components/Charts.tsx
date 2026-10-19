import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { usd, type PathResult } from '../lib/model'

const axis = { fontSize: 12, fill: 'currentColor' }

export function NetChart({ results, startYear }: { results: PathResult[]; startYear: number }) {
  const rows = results[0].series.map((_, i) => {
    const row: Record<string, number> = { year: results[0].series[i].year, age: results[0].series[i].age }
    results.forEach((r) => (row[r.path.id] = r.series[i].cumulative))
    return row
  })
  return (
    <div className="h-80 text-slate-500 dark:text-slate-400" role="img" aria-label="Cumulative net earnings by calendar year for each path">
      <ResponsiveContainer>
        <AreaChart data={rows} margin={{ left: 10, right: 10, top: 10 }}>
          <defs>
            {results.map((r) => (
              <linearGradient key={r.path.id} id={`g-${r.path.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={r.path.color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={r.path.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
          <XAxis dataKey="year" tick={axis} />
          <YAxis tick={axis} tickFormatter={(v) => usd(v, true)} width={70} />
          <ReferenceLine y={0} stroke="currentColor" strokeOpacity={0.4} />
          <Tooltip formatter={(v) => usd(Number(v))} labelFormatter={(l) => `${l} · age ${Number(l) - startYear + 18}`}
            contentStyle={{ borderRadius: 12, border: 'none', background: 'rgba(15,23,42,.92)', color: '#fff' }} />
          <Legend />
          {results.map((r) => (
            <Area key={r.path.id} type="monotone" dataKey={r.path.id} name={r.path.short} stroke={r.path.color} strokeWidth={2.5} fill={`url(#g-${r.path.id})`} animationDuration={600} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function CostChart({ results }: { results: PathResult[] }) {
  const rows = results.filter((r) => r.totalCost > 0).map((r) => ({
    name: r.path.short,
    'Paid up front': Math.round(r.totalCost - r.borrowed),
    Borrowed: Math.round(r.borrowed),
    Interest: Math.round(r.totalInterest),
  }))
  return (
    <div className="h-72 text-slate-500 dark:text-slate-400" role="img" aria-label="Total cost of degree split by paid, borrowed and interest">
      <ResponsiveContainer>
        <BarChart data={rows} margin={{ left: 10, right: 10, top: 10 }}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} vertical={false} />
          <XAxis dataKey="name" tick={axis} />
          <YAxis tick={axis} tickFormatter={(v) => usd(v, true)} width={70} />
          <Tooltip formatter={(v) => usd(Number(v))} contentStyle={{ borderRadius: 12, border: 'none', background: 'rgba(15,23,42,.92)', color: '#fff' }} cursor={{ fillOpacity: 0.06 }} />
          <Legend />
          <Bar dataKey="Paid up front" stackId="a" fill="#34d399" radius={[0, 0, 6, 6]} />
          <Bar dataKey="Borrowed" stackId="a" fill="#a78bfa" />
          <Bar dataKey="Interest" stackId="a" fill="#f472b6" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
