import { ExternalLink } from 'lucide-react'
import { dataset } from '../data'

export function Sources() {
  return (
    <section id="sources" className="card">
      <h2 className="text-lg font-bold">Data sources</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Every number in this app comes from one of these public sources. Nothing is made up; values we couldn't source are left out.</p>
      <ul className="mt-4 grid gap-3 md:grid-cols-2">
        {dataset.sources.map((s) => (
          <li key={s.id} className="rounded-xl bg-slate-100/70 p-4 text-sm dark:bg-white/5">
            <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-violet-700 hover:underline dark:text-violet-300">
              {s.title} <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
            <div className="text-slate-600 dark:text-slate-300">{s.publisher} · {s.dataYear}</div>
            {s.notes && <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{s.notes}</div>}
          </li>
        ))}
      </ul>
    </section>
  )
}
