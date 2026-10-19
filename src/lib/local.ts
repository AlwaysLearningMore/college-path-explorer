/** Local school search: lazy-loaded College Scorecard + Census ZCTA data from /public/data. */
export type LocalType = 'twoYear' | 'public4' | 'private4'

export interface School {
  id: number
  n: string // name
  c: string // city
  s: string // state
  la: number
  lo: number
  t: LocalType
  ctl: 1 | 2 // 1 public, 2 private nonprofit
  coa?: number // average annual cost of attendance (COSTT4_A)
  np?: number // average annual net price (NPT4)
  tin?: number
  tout?: number
  e10?: number // median earnings 10 yrs after entry (all programs)
  debt?: number // median debt of completers
  grad?: number // completion rate (150% time)
  ug?: number
  url?: string
}

export interface SchoolHit extends School {
  miles: number
  minutes: number
}

/** [earnings 1 yr after completion, earnings 4 yrs after completion] by our major id */
export type Programs = Record<string, Record<string, [number | null, number | null]>>

/** Ballou, Rahardja & Sakai (2002): U.S. road circuity factor ≈ 1.20. */
export const CIRCUITY = 1.2
/** Assumed average door-to-door driving speed (mph). Assumption, not a sourced figure. */
export const AVG_MPH = 45

const base = import.meta.env.BASE_URL
let schoolsP: Promise<School[]> | null = null
let programsP: Promise<Programs> | null = null
const zipCache = new Map<string, Promise<Record<string, [number, number]>>>()

export const loadSchools = (): Promise<School[]> => (schoolsP ??= fetch(`${base}data/schools.json`).then((r) => r.json() as Promise<School[]>))
export const loadPrograms = () => (programsP ??= fetch(`${base}data/programs.json`).then((r) => r.json()))

export async function lookupZip(zip: string): Promise<[number, number] | null> {
  if (!/^\d{5}$/.test(zip)) return null
  const p = zip.slice(0, 3)
  if (!zipCache.has(p)) zipCache.set(p, fetch(`${base}data/zips/${p}.json`).then((r) => (r.ok ? r.json() : {})))
  const table = await zipCache.get(p)!
  return table[zip] ?? null
}

export function haversineMiles(a: [number, number], b: [number, number]) {
  const R = 3958.8
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b[0] - a[0])
  const dLon = toRad(b[1] - a[1])
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export const estDriveMinutes = (straightMiles: number) => ((straightMiles * CIRCUITY) / AVG_MPH) * 60

export async function searchNearby(origin: [number, number], maxMinutes: number): Promise<SchoolHit[]> {
  const schools = await loadSchools()
  return schools
    .map((s): SchoolHit => {
      const miles = haversineMiles(origin, [s.la, s.lo])
      return { ...s, miles, minutes: estDriveMinutes(miles) }
    })
    .filter((s) => s.minutes <= maxMinutes)
    .sort((a, b) => a.minutes - b.minutes)
}

export const TYPE_LABEL: Record<LocalType, string> = {
  twoYear: 'Community / 2-year',
  public4: 'Public 4-year',
  private4: 'Private nonprofit 4-year',
}
