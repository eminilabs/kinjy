/* KB validation script — structural assertions for knowledgeBase.ts */
const fs = require('fs')
const path = require('path')

const FILE = path.join(__dirname, 'src/components/assistant/knowledgeBase.ts')
const src = fs.readFileSync(FILE, 'utf8')
let failures = 0
const assert = (cond, msg) => {
  if (!cond) { failures++; console.error('FAIL:', msg) }
  else console.log('ok:', msg)
}

// 1. entry count
const idMatches = [...src.matchAll(/^    id: '([^']+)',$/gm)].map((m) => m[1])
assert(idMatches.length === 49, `49 total entries (got ${idMatches.length})`)

// 2. no duplicate ids
const dupes = idMatches.filter((id, i) => idMatches.indexOf(id) !== i)
assert(dupes.length === 0, `no duplicate ids ${dupes.length ? '(dupes: ' + dupes.join(',') + ')' : ''}`)

// 3. real import via esbuild -> semantic checks
const esbuild = require('esbuild')
const out = path.join(__dirname, '.kb-check.cjs')
esbuild.buildSync({ entryPoints: [FILE], bundle: true, platform: 'node', format: 'cjs', outfile: out, logLevel: 'silent' })
const kb = require(out)

const LANGS = ['en', 'sw', 'fr', 'ar', 'zh']
const NEW_IDS = ['wellbeing','data-saver','series','vault-resurfacing','crisis-alerts','c2pa-signing','voice-first','early-warning','family-year-review','remembrance-gatherings','live-intelligence','a2a-registry','verifiable-credentials','training-licensing','ai-quality-ops','commerce-copilot','ad-creative-intel']
const ROUTES = ['/', '/platform', '/feeds', '/family', '/memorials', '/creators', '/commerce', '/pricing', '/payments', '/assistant', '/admin', '/safety', '/developers', '/app']

assert(kb.KB_VERSION === 'v2.16.0', `KB_VERSION is v2.16.0 (got ${kb.KB_VERSION})`)
assert(kb.KB_ENTRIES.length === 49, `imported KB_ENTRIES length 49 (got ${kb.KB_ENTRIES.length})`)

let badLang = []
let badKw = []
let badVer = []
for (const e of kb.KB_ENTRIES) {
  for (const l of LANGS) {
    if (!e.title[l] || !e.title[l].trim()) badLang.push(`${e.id}:title.${l}`)
    if (!e.answer[l] || !e.answer[l].trim()) badLang.push(`${e.id}:answer.${l}`)
  }
  if (e.version !== 'v2.16.0' && NEW_IDS.includes(e.id)) badVer.push(e.id)
  if (NEW_IDS.includes(e.id) && (!Array.isArray(e.keywords) || e.keywords.length < 8 || e.keywords.length > 14)) badKw.push(`${e.id}:${e.keywords?.length}`)
}
assert(badLang.length === 0, `every entry has all 5 langs in title AND answer (non-empty) ${badLang.length ? '(bad: ' + badLang.join(',') + ')' : ''}`)
assert(badVer.length === 0, `all 17 new entries at version v2.16.0 ${badVer.length ? '(bad: ' + badVer.join(',') + ')' : ''}`)
assert(badKw.length === 0, `every entry has 8-14 keywords ${badKw.length ? '(bad: ' + badKw.join(',') + ')' : ''}`)

// 4. suggestion ids + default suggestions exist
const allIds = new Set(kb.KB_ENTRIES.map((e) => e.id))
let missing = []
for (const ctx of kb.MODULE_CONTEXTS) {
  assert(ctx.suggestionIds.length <= 6, `${ctx.moduleName} suggestionIds capped at 6 (got ${ctx.suggestionIds.length})`)
  for (const id of ctx.suggestionIds) if (!allIds.has(id)) missing.push(`${ctx.moduleName}:${id}`)
}
for (const id of kb.DEFAULT_SUGGESTIONS) if (!allIds.has(id)) missing.push(`DEFAULT:${id}`)
assert(missing.length === 0, `every suggestion id exists ${missing.length ? '(missing: ' + missing.join(',') + ')' : ''}`)
assert(kb.DEFAULT_SUGGESTIONS.length === 3 && kb.DEFAULT_SUGGESTIONS.join(',') === 'feed-modes,family-tree,crypto-payments', `DEFAULT_SUGGESTIONS = [feed-modes, family-tree, crypto-payments] (got ${kb.DEFAULT_SUGGESTIONS})`)

// 5. deepLinks valid
let badLinks = []
for (const e of kb.KB_ENTRIES) {
  if (e.deepLink && !ROUTES.includes(e.deepLink.to)) badLinks.push(`${e.id}:${e.deepLink.to}`)
  if (NEW_IDS.includes(e.id) && !e.deepLink) badLinks.push(`${e.id}:missing`)
}
assert(badLinks.length === 0, `every deepLink.to in the 14 routes (new entries must have one) ${badLinks.length ? '(bad: ' + badLinks.join(',') + ')' : ''}`)

// 6. ingest log head
assert(kb.INGEST_LOG[0].includes('v2.16.0') && kb.INGEST_LOG[0].includes('17 answers added'), `INGEST_LOG head: ${kb.INGEST_LOG[0]}`)

fs.unlinkSync(out)
console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`)
process.exit(failures === 0 ? 0 : 1)
