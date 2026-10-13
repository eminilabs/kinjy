// Life dates on a person's page: only what is recorded, never completed.
//   docker compose exec web node scripts/test-family-life.mjs      (prints ALL CHECKS PASSED)
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { pathToFileURL } from 'node:url'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const dir = mkdtempSync(join(tmpdir(), 'life-'))
const out = join(dir, 'life.mjs')
await build({ entryPoints: ['src/components/family/tree/lifeDates.ts'], bundle: true, format: 'esm', outfile: out, logLevel: 'error' })
const { lifeRows, formatDate } = await import(pathToFileURL(out).href)
rmSync(dir, { recursive: true, force: true })

let n = 0
const ok = (c, m) => { n++; assert.ok(c, m) }
const eq = (a, b, m) => { n++; assert.deepEqual(a, b, m) }

// a living person
eq(lifeRows({ birth_date: '1992-04-03', birth_place: 'Accra', deceased: false }), [{ key: 'born', date: '1992-04-03', place: 'Accra', dateNotRecorded: false }], 'living: born only')
eq(lifeRows({ birth_date: '1992-04-03', deceased: false }).map((r) => r.key), ['born'], 'living with no place: just the date, no "died" row')
eq(lifeRows({ birth_place: 'Accra' }), [{ key: 'born', date: null, place: 'Accra', dateNotRecorded: false }], 'a place without a date is shown without one')
eq(lifeRows({}), [], 'nothing recorded: no row')
eq(lifeRows({ birth_date: '', birth_place: '  ', deceased: false }), [], 'blank strings are nothing')

// a deceased person
eq(lifeRows({ birth_date: '1930-03-04', birth_place: 'Kumasi', death_date: '2001-01-02', death_place: 'Accra', deceased: true }).map((r) => [r.key, r.date, r.place, r.dateNotRecorded]),
  [['born', '1930-03-04', 'Kumasi', false], ['died', '2001-01-02', 'Accra', false]], 'deceased: both with places')
eq(lifeRows({ birth_date: '1930-03-04', death_date: '2001-01-02', deceased: true }).map((r) => r.place), [null, null], 'no place is not invented')
eq(lifeRows({ birth_date: '1930-03-04', deceased: true })[1], { key: 'died', date: null, place: null, dateNotRecorded: true }, 'deceased with no death date: says so, no date made up')
eq(lifeRows({ deceased: true })[0], { key: 'died', date: null, place: null, dateNotRecorded: true }, 'deceased and nothing else')
eq(lifeRows({ death_date: '1999-05-05', deceased: false }).map((r) => r.key), ['died'], 'a death date counts even if the flag is off')
eq(lifeRows({ death_place: 'Lomé', deceased: false })[0], { key: 'died', date: null, place: 'Lomé', dateNotRecorded: true }, 'a death place alone shows a death, with no date')
ok(!JSON.stringify(lifeRows({ birth_date: '1700-01-01', deceased: false })).includes('died'), 'a very old birth date does not make someone dead')

// dates keep only the parts that were recorded
eq(formatDate('1992-04-03', 'en'), 'April 3, 1992', 'full date, English')
eq(formatDate('1992-04-03', 'fr'), '3 avril 1992', 'full date, French')
ok(/1992/.test(formatDate('1992-04-03', 'ar')) || /١٩٩٢/.test(formatDate('1992-04-03', 'ar')), 'full date, Arabic')
ok(formatDate('1992-04-03', 'zh').includes('1992') && formatDate('1992-04-03', 'zh').includes('4'), 'full date, Chinese')
ok(/April/.test(formatDate('1992-04-03', 'sw')) || /Aprili/.test(formatDate('1992-04-03', 'sw')), 'full date, Swahili')
eq(formatDate('1992-04', 'en'), 'April 1992', 'a month and a year stay a month and a year (no day)')
eq(formatDate('1992', 'en'), '1992', 'a year stays a year (no month, no day)')
eq(formatDate('1992-04', 'fr'), 'avril 1992', 'month and year in French')
eq(formatDate('2000-01-01', 'en'), 'January 1, 2000', 'no timezone shift on the first of the year')
eq(formatDate('1999-12-31', 'en'), 'December 31, 1999', 'no timezone shift on the last day')
eq(formatDate('0950-06-15', 'en').includes('950'), true, 'a year before 1000 is not read as 19xx')
eq(formatDate('1992-02-30', 'en'), '1992-02-30', 'an impossible day is shown as written, not corrected')
eq(formatDate('1992-13-01', 'en'), '1992-13-01', 'an impossible month is shown as written')
eq(formatDate('about 1900', 'en'), 'about 1900', 'text is left alone')
eq(formatDate('1992-04-03', 'xx-invalid-locale-zzzz'), '1992-04-03', 'a locale the browser rejects falls back to the stored date')

console.log(`${n} checks`)
console.log('ALL CHECKS PASSED')
