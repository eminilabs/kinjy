/**
 * Fail if the locale files have drifted apart.
 *
 * A missing key does not crash anything: i18next falls back to English, so the
 * page still renders and the gap is invisible until somebody reading Swahili
 * notices a sentence in English. This turns that into a build error.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'locales')
const files = readdirSync(dir).filter((f) => f.endsWith('.json'))
const load = (f) => JSON.parse(readFileSync(join(dir, f), 'utf8'))

const base = 'en.json'
const baseKeys = new Set(Object.keys(load(base)))
let bad = false

for (const file of files) {
  if (file === base) continue
  const keys = new Set(Object.keys(load(file)))
  const missing = [...baseKeys].filter((k) => !keys.has(k))
  const extra = [...keys].filter((k) => !baseKeys.has(k))
  const empty = Object.entries(load(file)).filter(([, v]) => !String(v).trim()).map(([k]) => k)
  if (missing.length || extra.length || empty.length) {
    bad = true
    console.error(`${file}:`)
    if (missing.length) console.error(`  missing ${missing.length}: ${missing.slice(0, 8).join(', ')}`)
    if (extra.length) console.error(`  not in ${base} (${extra.length}): ${extra.slice(0, 8).join(', ')}`)
    if (empty.length) console.error(`  empty ${empty.length}: ${empty.slice(0, 8).join(', ')}`)
  }
}

if (bad) process.exit(1)
console.log(`${files.length} locales, ${baseKeys.size} keys, all present`)
