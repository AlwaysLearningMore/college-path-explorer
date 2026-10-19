import { dataset, type Major } from '../data'
import type { PathDef } from './paths'
import type { Programs, SchoolHit } from './local'
import type { Assumptions } from './model'

/** Assumed base year for Scorecard "most recent" cost & earnings figures. */
export const SCORECARD_BASE_YEAR = 2024
const PALETTE = ['#22d3ee', '#a78bfa', '#f472b6', '#34d399', '#fbbf24', '#fb7185', '#60a5fa', '#c084fc']

export function schoolCost(s: SchoolHit, a: Assumptions): { cost: number; note: string } | null {
  if (a.pricing === 'net' && s.np) return { cost: s.np, note: 'Scorecard avg. net price' }
  if (s.coa) return { cost: s.coa, note: a.pricing === 'net' ? 'Scorecard cost of attendance (no net price)' : 'Scorecard cost of attendance' }
  if (s.np) return { cost: s.np, note: 'Scorecard avg. net price (no COA)' }
  return null
}

function programEarnings(s: SchoolHit | undefined, major: Major, programs: Programs) {
  if (!s) return null
  const p = programs[String(s.id)]?.[major.id]
  if (!p) return null
  const [e1, e4] = p
  const early = e4 ?? e1
  if (!early) return null
  const ratio = major.midCareerMedian / major.earlyCareerMedian
  return {
    early,
    mid: Math.round(early * ratio),
    baseYear: SCORECARD_BASE_YEAR,
    note: `${s.n}: Scorecard ${major.name} median ${e4 ? '4 yrs' : '1 yr'} after graduation; mid-career scaled by national growth for the major`,
  }
}

export function buildSchoolPaths(selected: SchoolHit[], major: Major, programs: Programs, a: Assumptions): PathDef[] {
  const transferTarget = selected.find((s) => s.t === 'public4')
  return selected.map((s, i) => {
    const c = schoolCost(s, a)
    const color = PALETTE[i % PALETTE.length]
    const short = s.n.length > 22 ? s.n.slice(0, 20) + '…' : s.n
    if (s.t === 'twoYear') {
      const tc = transferTarget ? schoolCost(transferTarget, a) : null
      return {
        id: `school-${s.id}`,
        name: `${s.n} → ${transferTarget ? transferTarget.n : 'public 4-yr (nat. avg.)'}`,
        short,
        description: `${s.c}, ${s.s} · 2 yrs here, then transfer (2+2).`,
        color,
        phases: [
          c ? { label: s.n, years: 2, annualCost: c.cost, costBaseYear: SCORECARD_BASE_YEAR, schoolType: 'public2yr' as const } : { label: s.n, years: 2, schoolType: 'public2yr' as const },
          tc ? { label: transferTarget!.n, years: 2, annualCost: tc.cost, costBaseYear: SCORECARD_BASE_YEAR, schoolType: 'public4yrInState' as const } : { label: 'Public university', years: 2, schoolType: 'public4yrInState' as const },
        ],
        earnings: 'major',
        earningsOverride: programEarnings(transferTarget, major, programs) ?? undefined,
        costNote: c ? c.note : 'No Scorecard cost: national average used',
      }
    }
    const type = s.t === 'public4' ? 'public4yrInState' : 'private4yr'
    return {
      id: `school-${s.id}`,
      name: s.n,
      short,
      description: `${s.c}, ${s.s} · ${s.t === 'public4' ? 'Public' : 'Private nonprofit'} 4-year · ~${Math.round(s.minutes)} min away (est.)`,
      color,
      phases: [c ? { label: s.n, years: 4, annualCost: c.cost, costBaseYear: SCORECARD_BASE_YEAR, schoolType: type } : { label: s.n, years: 4, schoolType: type }],
      earnings: 'major',
      earningsOverride: programEarnings(s, major, programs) ?? undefined,
      costNote: c ? c.note : 'No Scorecard cost: national average used',
    } satisfies PathDef
  })
}

export const nationalFallbackNote = (m: Major) =>
  `National ${m.name} medians (${dataset.sources.find((s) => s.id === m.sourceId)?.publisher})`
