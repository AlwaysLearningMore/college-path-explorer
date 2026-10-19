export type SourceId = string

export interface Source {
  id: SourceId
  publisher: string
  title: string
  url: string
  dataYear: string
  notes?: string
}

export type SchoolTypeId = 'public2yr' | 'public4yrInState' | 'private4yr'

export interface SchoolCost {
  label: string
  tuitionFees: number
  housingFood: number
  booksTransportOther: number
  /** Full annual student budget (sticker) */
  totalBudget: number
  sourceId: SourceId
  /** Average net tuition & fees after grants; null when no sourced figure exists */
  netTuitionFees: number | null
  netSourceId?: SourceId
  netNote?: string
}

export interface Major {
  id: string
  name: string
  category: string
  earlyCareerMedian: number
  midCareerMedian: number
  unemploymentRate: number
  underemploymentRate: number
  shareWithGradDegree: number
  sourceId: SourceId
}

export interface Baseline {
  label: string
  medianWeekly: number
  p25Weekly?: number
  p75Weekly?: number
  sourceId: SourceId
  quartileSourceId?: SourceId
}

export interface Dataset {
  sources: Source[]
  schoolCosts: Record<SchoolTypeId, SchoolCost>
  wageDistributionRecentGrads: { p10: number; p25: number; p50: number; p75: number; p90: number; sourceId: SourceId }
  baselines: Record<'highSchool' | 'associate' | 'bachelorsOnly', Baseline>
  federalLoanRate: { undergradFixedRate: number; sourceId: SourceId }
  majors: Major[]
  projection: Projection
}

export interface Projection {
  baseYear: number
  realGrowth30yr: Record<SchoolTypeId, number>
  realGrowth10yr: Record<SchoolTypeId, number>
  growthSourceId: SourceId
  growthNote: string
  cpiInflation: number
  cpiNote: string
  cpiSourceId: SourceId
}
