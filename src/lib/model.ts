import { dataset, type Major, type SchoolTypeId } from '../data'
import type { PathDef } from './paths'

export interface Assumptions {
  /** 'sticker' = full price; 'net' = average net price after grants (where sourced). */
  pricing: 'sticker' | 'net'
  /** Share of college costs paid by family/savings/scholarships (0–1). Rest is borrowed. */
  paidUpFront: number
  /** Living at home drops the housing & food line (national averages only). */
  liveAtHome: boolean
  horizonYears: number
  loanRate: number
  loanTermYears: number
  percentile: 'p25' | 'p50' | 'p75'
  /** Calendar year the student starts college (age 18). */
  startYear: number
  /** Which College Board real tuition trend to project with. */
  growthTrend: '30yr' | '10yr'
}

const proj = dataset.projection
export const defaultAssumptions: Assumptions = {
  pricing: 'sticker',
  paidUpFront: 0.5,
  liveAtHome: false,
  horizonYears: 30,
  loanRate: dataset.federalLoanRate.undergradFixedRate,
  loanTermYears: 10,
  percentile: 'p50',
  startYear: 2027,
  growthTrend: '30yr',
}

const dist = dataset.wageDistributionRecentGrads
const WEEKS = 52
/** Data years of the underlying sources (dollars of that year). */
const NYFED_YEAR = 2024
const BLS_YEAR = 2025

export function percentileFactor(p: Assumptions['percentile']): number {
  if (p === 'p50') return 1
  return dist[p] / dist.p50
}

/** Nominal annual cost growth for a school type = (1 + College Board real growth)(1 + CPI) − 1. */
export function nominalGrowth(t: SchoolTypeId, a: Assumptions) {
  const real = (a.growthTrend === '30yr' ? proj.realGrowth30yr : proj.realGrowth10yr)[t]
  return (1 + real) * (1 + proj.cpiInflation) - 1
}
/** Inflate a figure from `fromYear` dollars to `toYear` dollars using CPI. */
export const inflate = (v: number, fromYear: number, toYear: number) => v * Math.pow(1 + proj.cpiInflation, toYear - fromYear)

export function nationalAnnualCost(t: SchoolTypeId, a: Assumptions) {
  const c = dataset.schoolCosts[t]
  const tuition = a.pricing === 'net' && c.netTuitionFees !== null ? c.netTuitionFees : c.tuitionFees
  const housing = a.liveAtHome ? 0 : c.housingFood
  return tuition + housing + c.booksTransportOther
}

/** Cost in a given calendar year for a phase (projected forward with tuition growth). */
export function phaseCostInYear(ph: PathDef['phases'][number], year: number, a: Assumptions) {
  const t = ph.schoolType ?? 'public4yrInState'
  const base = ph.annualCost ?? (ph.schoolType ? nationalAnnualCost(ph.schoolType, a) : 0)
  const baseYear = ph.annualCost ? (ph.costBaseYear ?? proj.baseYear) : proj.baseYear
  if (!base) return 0
  return base * Math.pow(1 + nominalGrowth(t, a), year - baseYear)
}

/** Salary (nominal, in `year` dollars) for career year n (0 = first year after school). */
export function salaryAt(path: PathDef, major: Major, careerYear: number, year: number, a: Assumptions) {
  const f = percentileFactor(a.percentile)
  if (path.earnings === 'highSchool') {
    const b = dataset.baselines.highSchool
    const weekly = a.percentile === 'p50' ? b.medianWeekly : a.percentile === 'p25' ? b.p25Weekly! : b.p75Weekly!
    return inflate(weekly * WEEKS, BLS_YEAR, year)
  }
  const o = path.earningsOverride
  const early = o?.early ?? major.earlyCareerMedian
  const mid = o?.mid ?? major.midCareerMedian
  const t = Math.min(careerYear / 13, 1)
  return inflate((early + (mid - early) * t) * f, o?.baseYear ?? NYFED_YEAR, year)
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
  firstYearCost: number
  series: YearPoint[]
  lifetimeNet: number
}

function payment(principal: number, rate: number, years: number) {
  if (principal <= 0) return 0
  const r = rate / 12
  const n = years * 12
  return r === 0 ? principal / n : (principal * r) / (1 - Math.pow(1 + r, -n))
}

/** Cumulative pre-tax earnings minus out-of-pocket costs and loan payments, in nominal (future) dollars. */
export function simulate(path: PathDef, major: Major, a: Assumptions): PathResult {
  const schoolYears = path.phases.reduce((s, p) => s + p.years, 0)
  let totalCost = 0
  const yearCosts: number[] = []
  const yearIncome: number[] = []
  let y0 = a.startYear
  for (const ph of path.phases) {
    for (let i = 0; i < ph.years; i++, y0++) {
      const c = phaseCostInYear(ph, y0, a)
      totalCost += c
      yearCosts.push(c)
      yearIncome.push(ph.annualIncome ?? 0)
    }
  }
  const borrowed = totalCost * (1 - a.paidUpFront)
  const monthly = payment(borrowed, a.loanRate, a.loanTermYears)
  const totalInterest = borrowed > 0 ? monthly * a.loanTermYears * 12 - borrowed : 0
  const careerStart = a.startYear + schoolYears

  const series: YearPoint[] = [{ year: a.startYear - 1, age: 17, cumulative: 0, salary: 0, debt: 0 }]
  let cum = 0
  let debt = 0
  for (let i = 1; i <= a.horizonYears; i++) {
    const year = a.startYear + i - 1
    let salary = 0
    if (i <= schoolYears) {
      const c = yearCosts[i - 1]
      cum += yearIncome[i - 1] - c * a.paidUpFront
      debt += c * (1 - a.paidUpFront)
    } else {
      const careerYear = i - schoolYears - 1
      salary = salaryAt(path, major, careerYear, year, a)
      cum += salary
      if (careerYear < a.loanTermYears && borrowed > 0) {
        cum -= monthly * 12
        debt = Math.max(0, borrowed * (1 - (careerYear + 1) / a.loanTermYears))
      } else debt = 0
    }
    series.push({ year, age: 17 + i, cumulative: Math.round(cum), salary: Math.round(salary), debt: Math.round(debt) })
  }
  return {
    path,
    totalCost,
    borrowed,
    totalInterest,
    monthlyPayment: monthly,
    startingSalary: salaryAt(path, major, 0, careerStart, a),
    midSalary: salaryAt(path, major, 13, careerStart + 13, a),
    firstYearCost: yearCosts[0] ?? 0,
    series,
    lifetimeNet: cum,
  }
}

/** First calendar year a path's cumulative total passes the baseline path's (after school). */
export function breakEven(r: PathResult, base: PathResult): YearPoint | null {
  for (let i = 5; i < r.series.length; i++) {
    if (r.series[i].cumulative >= base.series[i].cumulative) return r.series[i]
  }
  return null
}

export const usd = (n: number, compact = false) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: compact ? 2 : 0, notation: compact ? 'compact' : 'standard' }).format(n)
