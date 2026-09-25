/**
 * Push the assistant knowledge base into ai-service.
 *
 * The 49 entries in src/components/assistant/knowledgeBase.ts were written for
 * this exact purpose, in five languages, with illustrations and steps. Rather
 * than restate thinner copy server-side, this script bundles that module (the
 * same esbuild trick validate-kb.cjs already uses) and upserts one row per
 * (entry, language) through the admin API.
 *
 * Usage:  node seed-kb.cjs <admin-email> <password> [api-base]
 */
const path = require('path')
const esbuild = require('esbuild')

const [, , EMAIL, PASSWORD, API = 'http://localhost:8200/api'] = process.argv

if (!EMAIL || !PASSWORD) {
  console.error('usage: node seed-kb.cjs <admin-email> <password> [api-base]')
  process.exit(2)
}

async function main() {
  // 1. Bundle the TS knowledge base into something require() can read.
  const out = path.join(__dirname, '.kb-seed.cjs')
  esbuild.buildSync({
    entryPoints: [path.join(__dirname, 'src/components/assistant/knowledgeBase.ts')],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outfile: out,
    logLevel: 'silent',
  })
  const kb = require(out)
  const entries = kb.KB_ENTRIES ?? []
  const version = kb.KB_VERSION ?? 'v1'
  const langs = Object.keys(kb.LANG_META ?? { en: 1 })

  if (!entries.length) {
    console.error('No KB_ENTRIES found — nothing to seed.')
    process.exit(1)
  }

  // 2. Sign in as an admin; the upsert endpoint is admin-only by design.
  const login = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })
  if (!login.ok) {
    console.error('Login failed:', login.status, await login.text())
    process.exit(1)
  }
  const token = (await login.json()).tokens.access_token

  // 3. Upsert every entry in every language it has.
  let ok = 0
  let failed = 0
  for (const entry of entries) {
    for (const lang of langs) {
      const answer = entry.answer?.[lang]
      const title = entry.title?.[lang] ?? entry.title?.en
      if (!answer || !title) continue

      const body = {
        id: entry.id,
        lang,
        module: entry.module ?? 'Kaluta',
        title,
        answer,
        keywords: entry.keywords ?? [],
        roles: entry.roles ?? ['visitor', 'member', 'admin'],
        admin_only: Boolean(entry.adminOnly),
        steps: entry.steps ?? [],
        image_url: entry.image ?? null,
        image_alt: entry.imageAlt ?? null,
        source: entry.module ?? null,
        deep_link: entry.deepLink?.to ?? null,
        deep_link_label: entry.deepLink?.label ?? null,
        version: entry.version ?? version,
      }

      const response = await fetch(`${API}/admin/assistant/kb`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      if (response.ok) ok++
      else {
        failed++
        if (failed <= 3) console.error(`  ${entry.id}/${lang}:`, response.status, await response.text())
      }
    }
  }

  console.log(`seeded ${ok} rows across ${entries.length} topics and ${langs.length} languages (${failed} failed)`)
  process.exit(failed ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
