import { dataset, type Major } from '../data'
import type { PathDef } from './paths'

export interface Assumptions {
  /** 'sticker' = full College Board budget; 'net' = net tuition (where sourced) + housing + other. */
  pricing: 'sticker' | 'net'
  /** Share of college costs paid by family/savings/scholarships (0–1). Rest is borrowed. */
  paidUpFront: number
  /** Living at home cuts the housing & food line (user assumption). */
  liveAtHome: boolean
  horizonYears: number
  loanRate: number
  loanTermYears: number
  percentile: 'p25' | 'p50' | 'p75'
}

export const defaultAssumptions: Assumptions = {
  pricing: 'sticker',
  paidUpFront: 0.5,
  liveAtHome: false,
  horizonYears: 30,
  loanRate: dataset.federalLoanRate.undergradFixedRate,
  loanTermYears: 10,
  percentile: 'p50',
}

const dist = dataset.wageDistributionRecentGrads
const WEEKS = 52

/** Percentile multiplier relative to the median, from NY Fed all-major distribution (estimate). */
export function percentileFactor(p: Assumptions['percentile']): number {
  if (p === 'p50') return 1
  return dist[p] / dist.p50
}

export function annualCost(schoolType: NonNullable<PathDef['phases'][number]['schoolType']>, a: Assumptions) {
  const c = dataset.schoolCosts[schoolType]
  const tuition = a.pricing === 'net' && c.netTuitionFees !== null ? c.netTuitionFees : c.tuitionFees
  const housing = a.liveAtHome ? 0 : c.housingFood
  return tuition + housing + c.booksTransportOther
}

/** Salary in a given career year (0 = first year after finishing). Early→mid career interpolated over 13 yrs (age ~22→35). */
export function salaryAt(path: PathDef, major: Major, careerYear: number, a: Assumptions) {
  const f = percentileFactor(a.percentile)
  if (path.earnings === 'highSchool') {
    const b = dataset.baselines.highSchool
    const weekly = a.percentile === 'p50' ? b.medianWeekly : a.percentile === 'p25' ? b.p25Weekly! : b.p75Weekly!
    return weekly * WEEKS
  }
  const t = Math.min(careerYear / 13, 1)
  return (major.earlyCareerMedian + (major.midCareerMedian - major.earlyCareerMedian) * t) * f
}

export interface YearPoint {
  year: number
  age: number
  cumulative: number
  salary: number
  debt: number
}

export interface PathResult {
  path: PathDef
  totalCost: number
  borrowed: number
  totalInterest: number
  monthlyPayment: number
  startingSalary: number
  midSalary: number
  series: YearPoint[]
  lifetimeNet: number
}

function payment(principal: number, rate: number, years: number) {
  if (principal <= 0) return 0
  const r = rate / 12
  const n = years * 12
  return r === 0 ? principal / n : (principal * r) / (1 - Math.pow(1 + r, -n))
}

/** Cumulative pre-tax earnings minus out-of-pocket costs and loan payments, in today's dollars (no inflation/raises beyond the early→mid curve). */
export function simulate(path: PathDef, major: Major, a: Assumptions): PathResult {
  const schoolYears = path.phases.reduce((s, p) => s + p.years, 0)
  let totalCost = 0
  const yearCosts: number[] = []
  const yearIncome: number[] = []
  for (const ph of path.phases) {
    for (let i = 0; i < ph.years; i++) {
      const c = ph.schoolType ? annualCost(ph.schoolType, a) : 0
      totalCost += c
      yearCosts.push(c)
      yearIncome.push(ph.annualIncome ?? 0)
    }
  }
  const borrowed = totalCost * (1 - a.paidUpFront)
  const monthly = payment(borrowed, a.loanRate, a.loanTermYears)
  const totalInterest = borrowed > 0 ? monthly * a.loanTermYears * 12 - borrowed : 0

  const series: YearPoint[] = [{ year: 0, age: 18, cumulative: 0, salary: 0, debt: 0 }]
  let cum = 0
  let debt = 0
  for (let y = 1; y <= a.horizonYears; y++) {
    let salary = 0
    if (y <= schoolYears) {
      const c = yearCosts[y - 1]
      cum += yearIncome[y - 1] - c * a.paidUpFront
      debt += c * (1 - a.paidUpFront)
    } else {
      const careerYear = y - schoolYears - 1
      salary = salaryAt(path, major, careerYear, a)
      cum += salary
      if (careerYear < a.loanTermYears && borrowed > 0) {
        cum -= monthly * 12
        debt = Math.max(0, borrowed * (1 - (careerYear + 1) / a.loanTermYears))
      } else debt = 0
    }
    series.push({ year: y, age: 18 + y, cumulative: Math.round(cum), salary: Math.round(salary), debt: Math.round(debt) })
  }
  return {
    path,
    totalCost,
    borrowed,
    totalInterest,
    monthlyPayment: monthly,
    startingSalary: salaryAt(path, major, 0, a),
    midSalary: salaryAt(path, major, 13, a),
    series,
    lifetimeNet: cum,
  }
}

/** First year a path's cumulative total passes the baseline path's. */
export function breakEvenYear(r: PathResult, base: PathResult): number | null {
  for (let i = 1; i < r.series.length; i++) {
    if (r.series[i].cumulative >= base.series[i].cumulative && r.series[i].year > 4) return r.series[i].year
  }
  return null
}

export const usd = (n: number, compact = false) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: compact ? 2 : 0, notation: compact ? 'compact' : 'standard' }).format(n)
