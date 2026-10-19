import { dataset, type SchoolTypeId } from '../data'

/**
 * A Path is a sequence of training phases followed by a career.
 * New path kinds (e.g. Trades / apprenticeships) only need to add an entry here:
 * phases can carry a cost (school) or an income (paid apprenticeship).
 */
export interface Phase {
  label: string
  years: number
  schoolType?: SchoolTypeId
  /** Annual income earned during the phase (e.g. apprentice wages). */
  annualIncome?: number
}

export interface PathDef {
  id: string
  name: string
  short: string
  description: string
  color: string
  phases: Phase[]
  /** 'major' = earnings come from the selected major; 'baseline' = fixed earnings curve. */
  earnings: 'major' | 'highSchool'
}

export const PATHS: PathDef[] = [
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
    description: 'Four years at an in-state public university.',
    color: '#a78bfa',
    phases: [{ label: 'Public university', years: 4, schoolType: 'public4yrInState' }],
    earnings: 'major',
  },
  {
    id: 'private4',
    name: 'Private nonprofit university',
    short: 'Private 4-yr',
    description: 'Four years at a private nonprofit college.',
    color: '#f472b6',
    phases: [{ label: 'Private college', years: 4, schoolType: 'private4yr' }],
    earnings: 'major',
  },
  {
    id: 'hs',
    name: 'Start working after high school',
    short: 'Work now',
    description: 'Baseline: enter the workforce straight out of high school.',
    color: '#94a3b8',
    phases: [],
    earnings: 'highSchool',
  },
  // Roadmap: { id: 'trades-electrician', phases: [{ label: 'Apprenticeship', years: 4, annualIncome: … }], earnings: 'trade' }
]

export const schoolCosts = dataset.schoolCosts
