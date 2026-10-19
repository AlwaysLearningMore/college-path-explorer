import { dataset, type SchoolTypeId, type Trade } from '../data'

/**
 * A Path is a sequence of training phases followed by a career.
 * New path kinds (e.g. Trades / apprenticeships) only need a new entry:
 * phases can carry a cost (school) or an income (paid apprenticeship).
 */
export interface Phase {
  label: string
  years: number
  /** National-average cost bucket; also selects the tuition growth rate. */
  schoolType?: SchoolTypeId
  /** Specific-school annual cost (overrides national average) in `costBaseYear` dollars. */
  annualCost?: number
  costBaseYear?: number
  /** Annual income earned during the phase (e.g. apprentice wages), in `incomeBaseYear` dollars. */
  annualIncome?: number
  /** Apprentice pay as a share of journeyworker median: [first year, last year], interpolated. */
  incomePctRange?: [number, number]
  incomeBaseYear?: number
}

export interface EarningsOverride {
  early: number
  mid: number
  baseYear: number
  note: string
}

export interface PathDef {
  id: string
  name: string
  short: string
  description: string
  color: string
  phases: Phase[]
  /** 'major' = earnings from selected major; 'highSchool' = BLS baseline; 'trade' = OEWS wages for `trade`. */
  earnings: 'major' | 'highSchool' | 'trade'
  trade?: Trade
  earningsOverride?: EarningsOverride
  costNote?: string
}

export const NATIONAL_PATHS: PathDef[] = [
  {
    id: 'cc-transfer',
    name: 'Community college → 4-year (2+2)',
    short: '2+2 Transfer',
    description: 'Two years at a public two-year college, then transfer to an in-state public university.',
    color: '#22d3ee',
    phases: [
      { label: 'Community college', years: 2, schoolType: 'public2yr' },
      { label: 'Public university', years: 2, schoolType: 'public4yrInState' },
    ],
    earnings: 'major',
  },
  {
    id: 'public4',
    name: 'In-state public university',
    short: 'Public 4-yr',
    description: 'Four years at an in-state public university (national average).',
    color: '#a78bfa',
    phases: [{ label: 'Public university', years: 4, schoolType: 'public4yrInState' }],
    earnings: 'major',
  },
  {
    id: 'private4',
    name: 'Private nonprofit university',
    short: 'Private 4-yr',
    description: 'Four years at a private nonprofit college (national average).',
    color: '#f472b6',
    phases: [{ label: 'Private college', years: 4, schoolType: 'private4yr' }],
    earnings: 'major',
  },
]

export const HS_PATH: PathDef = {
  id: 'hs',
  name: 'Start working after high school',
  short: 'Work now',
  description: 'Baseline: enter the workforce straight out of high school.',
  color: '#94a3b8',
  phases: [],
  earnings: 'highSchool',
}

export const PATHS = [...NATIONAL_PATHS, HS_PATH]
export const schoolCosts = dataset.schoolCosts

/** Trade-school cost per year: public two-year tuition & fees + books/transport/other, living at home (College Board 2025-26). */
export const TRADE_SCHOOL_COST = dataset.schoolCosts.public2yr.tuitionFees + dataset.schoolCosts.public2yr.booksTransportOther

const TRADE_SHORT: Record<string, string> = {
  electrician: 'Electrician', plumber: 'Plumber', carpenter: 'Carpenter', lineworker: 'Lineworker', hvac: 'HVAC tech',
  auto: 'Auto tech', welder: 'Welder', equipment: 'Equip. operator', diesel: 'Diesel tech',
}

export function tradePath(t: Trade): PathDef {
  const aw = dataset.apprenticeWage
  const phases: Phase[] =
    t.training === 'apprenticeship'
      ? [{ label: 'Paid apprenticeship', years: t.years, annualIncome: t.wages.p50, incomePctRange: [aw.startPct, aw.endPct], incomeBaseYear: 2025 }]
      : t.training === 'school'
        ? [{ label: 'Trade program', years: t.years, annualCost: TRADE_SCHOOL_COST, costBaseYear: 2025, schoolType: 'public2yr' }]
        : []
  const how = t.training === 'apprenticeship' ? `${t.years}-yr paid apprenticeship` : t.training === 'school' ? `${t.years}-yr trade program` : 'on-the-job training'
  return {
    id: `trade-${t.id}`,
    name: `Trade: ${t.name}`,
    short: TRADE_SHORT[t.id] ?? t.name,
    description: `${how}, then work. ${t.trainingNote}`,
    color: '#f59e0b',
    phases,
    earnings: 'trade',
    trade: t,
  }
}
