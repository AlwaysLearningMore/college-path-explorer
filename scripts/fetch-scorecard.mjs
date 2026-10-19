#!/usr/bin/env node
/**
 * Pull field-of-study earnings from the U.S. Dept. of Education College Scorecard API.
 * Get a free key at https://api.data.gov/signup/ and run:
 *   SCORECARD_API_KEY=xxxx node scripts/fetch-scorecard.mjs 1107 > data/scorecard-1107.json
 * (1107 = CIP 4-digit "Computer Science"). The key is read from the environment only — never commit it.
 * Docs: https://collegescorecard.ed.gov/data/api-documentation/
 *
 * Planned use (v2): aggregate median earnings 1/4/5 years after completion by CIP code
 * and institution control (public / private nonprofit) so salaries can differ by school type,
 * then merge into src/data/seed.json with a source entry.
 */
const key = process.env.SCORECARD_API_KEY
if (!key) {
  console.error('Set SCORECARD_API_KEY (see .env.example).')
  process.exit(1)
}
const cip = process.argv[2] ?? '1107'
const fields = [
  'id',
  'school.name',
  'school.ownership',
  'latest.programs.cip_4_digit.code',
  'latest.programs.cip_4_digit.title',
  'latest.programs.cip_4_digit.credential.level',
  'latest.programs.cip_4_digit.earnings.4_yr.overall_median_earnings',
  'latest.programs.cip_4_digit.debt.staff_grad_plus.all.eval_inst.median',
].join(',')
const results = []
for (let page = 0; page < 5; page++) {
  const url = new URL('https://api.data.gov/ed/collegescorecard/v1/schools')
  url.search = new URLSearchParams({
    api_key: key,
    'latest.programs.cip_4_digit.code': cip,
    fields,
    per_page: '100',
    page: String(page),
  }).toString()
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Scorecard API ${res.status}: ${await res.text()}`)
  const json = await res.json()
  results.push(...json.results)
  if (json.results.length < 100) break
}
console.log(JSON.stringify({ cip, fetchedAt: new Date().toISOString(), count: results.length, results }, null, 2))
