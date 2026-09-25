import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDown, Play } from 'lucide-react'
import { ArcButton } from '@/components/ui-kit'

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

const QUERY = `query FamilyPath($user: ID!) {
  user(id: $user) {
    familyTree {
      path(to: "demo-243") { level relation }
    }
  }
}`

const RESPONSE_LINES = [
  '{',
  '  "data": {',
  '    "user": {',
  '      "familyTree": {',
  '        "path": [',
  '          { "level": 1, "relation": "mother" },',
  '          { "level": 2, "relation": "grandmother" },',
  '          { "level": 3, "relation": "great-aunt · VERIFIED" }',
  '        ]',
  '      }',
  '    }',
  '  }',
  '}',
]

/** Syntax-highlight one line of the GraphQL query. */
function QueryLine({ line }: { line: string }) {
  // keywords gold, punctuation sky-ish, strings gold-soft, identifiers text-hi
  const parts = line.split(/(\bquery\b|\buser\b|\bfamilyTree\b|\bpath\b|\blevel\b|\brelation\b|\$user|\bID!?\b|"[^"]*")/g)
  return (
    <>
      {parts.map((p, i) => {
        if (!p) return null
        if (/^(query)$/.test(p)) return <span key={i} className="text-gold font-semibold">{p}</span>
        if (/^(user|familyTree|path|level|relation)$/.test(p)) return <span key={i} className="text-gold-soft">{p}</span>
        if (/^\$user$/.test(p)) return <span key={i} className="text-coral">{p}</span>
        if (/^ID/.test(p)) return <span key={i} className="text-sky">{p}</span>
        if (/^"/.test(p)) return <span key={i} className="text-success">{p}</span>
        return <span key={i} className="text-text-mid">{p}</span>
      })}
    </>
  )
}

function ResponseLine({ line }: { line: string }) {
  const parts = line.split(/("(?:[^"]*)"(?:\s*:)?|\d+|VERIFIED)/g)
  return (
    <>
      {parts.map((p, i) => {
        if (!p) return null
        if (/^".*":$/.test(p)) return <span key={i} className="text-gold-soft">{p}</span>
        if (/^"/.test(p)) return <span key={i} className="text-success">{p}</span>
        if (/^\d+$/.test(p)) return <span key={i} className="text-sky">{p}</span>
        if (p === 'VERIFIED') return <span key={i} className="text-gold font-semibold">{p}</span>
        return <span key={i} className="text-text-mid">{p}</span>
      })}
    </>
  )
}

/** Section 1 — Developers hero with live typing GraphQL card + Run response. */
export default function DevHero() {
  const [typed, setTyped] = useState(0)
  const [ran, setRan] = useState(false)
  const [running, setRunning] = useState(false)
  const started = useRef(false)

  // Type in at 40 chars/s once mounted
  useEffect(() => {
    if (started.current) return
    started.current = true
    const id = setInterval(() => {
      setTyped((n) => {
        if (n >= QUERY.length) {
          clearInterval(id)
          return n
        }
        return n + 1
      })
    }, 25)
    return () => clearInterval(id)
  }, [])

  const doneTyping = typed >= QUERY.length
  const visible = QUERY.slice(0, typed)
  const visibleLines = visible.split('\n')

  const run = () => {
    if (running) return
    setRan(false)
    setRunning(true)
    setTimeout(() => {
      setRunning(false)
      setRan(true)
    }, 550)
  }

  return (
    <section className="twilight-field noise-overlay relative -mt-[72px] flex min-h-[80dvh] items-center overflow-hidden px-6 pb-20 pt-[128px]">
      {/* backdrop plate */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.38]"
        style={{
          backgroundImage: 'url(/dev-hero.jpg)',
          maskImage: 'linear-gradient(to bottom, black 40%, transparent 96%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 96%)',
        }}
      />
      <div className="relative mx-auto grid w-full max-w-container items-center gap-14 lg:grid-cols-2">
        {/* Left copy */}
        <div>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="eyebrow text-gold"
          >
            Module O — Developer Platform
          </motion.p>
          <h1 className="display-lg mt-5">
            {'Build on the society.'.split(' ').map((w, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 34, rotate: 2 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                transition={{ delay: 0.12 + i * 0.09, duration: 0.7, ease: EASE }}
                className="inline-block pe-[0.28em] last:pe-0"
              >
                {w === 'society.' ? <span className="text-gold-grad">{w}</span> : w}
              </motion.span>
            ))}
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6, ease: EASE }}
            className="body-lg mt-6 max-w-xl text-text-mid"
          >
            REST &amp; GraphQL APIs, webhooks, OAuth, an App Marketplace — and a platform designed
            to be read by agents as fluently as by people.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.6, ease: EASE }}
            className="mt-9 flex flex-wrap gap-4"
          >
            <ArcButton variant="gold" size="lg">Get API keys</ArcButton>
            <ArcButton
              variant="ghost"
              size="lg"
              onClick={() => document.getElementById('api-surface')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Read the docs <ArrowDown size={17} aria-hidden="true" />
            </ArcButton>
          </motion.div>
        </div>

        {/* Right: live code card */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.8, ease: EASE }}
          className="cloud-card overflow-hidden !rounded-card-xl"
        >
          {/* title bar */}
          <div className="flex items-center gap-2 border-b border-white/10 bg-ink-3/70 px-5 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-danger/70" aria-hidden="true" />
            <span className="h-2.5 w-2.5 rounded-full bg-warning/70" aria-hidden="true" />
            <span className="h-2.5 w-2.5 rounded-full bg-success/70" aria-hidden="true" />
            <span className="mono-data ms-3 text-xs text-text-low">family-path.graphql</span>
            <span className="mono-data ms-auto text-xs text-gold">POST /graphql</span>
          </div>
          <div className="bg-ink-3/50 p-5 font-mono text-[0.82rem] leading-relaxed">
            <pre aria-label="GraphQL query example" className="min-h-[9.5rem] whitespace-pre-wrap">
              {visibleLines.map((l, i) => (
                <div key={i} className="flex">
                  <span className="w-7 select-none text-end text-text-low/60 pe-3">{i + 1}</span>
                  <code>
                    <QueryLine line={l} />
                    {i === visibleLines.length - 1 && !doneTyping && (
                      <span className="ms-0.5 inline-block h-4 w-2 animate-caret-blink bg-gold align-middle" aria-hidden="true" />
                    )}
                  </code>
                </div>
              ))}
            </pre>

            <div className="mt-3 flex items-center gap-3">
              <motion.button
                type="button"
                onClick={run}
                disabled={!doneTyping}
                whileTap={{ scale: 1.04 }}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-gold-soft to-gold px-5 py-2 text-sm font-bold text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] transition enabled:hover:brightness-110 disabled:opacity-40"
              >
                <Play size={14} aria-hidden="true" />
                {running ? 'Running…' : 'Run'}
              </motion.button>
              {running && (
                <motion.span
                  className="mono-data text-xs text-sky"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  resolving… 42ms
                </motion.span>
              )}
              {ran && !running && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ ease: [0.34, 1.56, 0.64, 1], duration: 0.4 }}
                  className="mono-data rounded-full border border-success/40 bg-success/10 px-3 py-1 text-xs text-success"
                >
                  200 OK · 42ms
                </motion.span>
              )}
            </div>

            {/* Response unfold */}
            <AnimatePresence>
              {ran && !running && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -12 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: EASE }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 rounded-card-md border border-white/10 bg-ink/70 p-4">
                    {RESPONSE_LINES.map((l, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15 + i * 0.2, duration: 0.3, ease: EASE }}
                        className="whitespace-pre"
                      >
                        <code>
                          <ResponseLine line={l} />
                        </code>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
