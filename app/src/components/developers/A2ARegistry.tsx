import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Bot, Building2, Play, RefreshCw, ShieldCheck } from 'lucide-react'
import { VerifiedBadge } from '@/components/ui-kit'
import { cn } from '@/lib/utils'

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

interface RegistryAgent {
  name: string
  did: string
  category: string
  scopes: string[]
  rateLimit: string
  uptime: string
  placement: 'paid' | 'organic'
}

const AGENTS: RegistryAgent[] = [
  {
    name: 'Kinjy Travel Services agent',
    did: 'did:kaluta:agent:travel',
    category: 'Travel & booking',
    scopes: ['quotes.read', 'bookings.hold', 'calendar.check'],
    rateLimit: '120 req/min',
    uptime: '99.98%',
    placement: 'paid',
  },
  {
    name: 'Savanna Crafts Marketplace agent',
    did: 'did:kaluta:agent:crafts',
    category: 'Commerce',
    scopes: ['catalog.read', 'stock.check', 'orders.create'],
    rateLimit: '60 req/min',
    uptime: '99.91%',
    placement: 'organic',
  },
  {
    name: 'Kilimanjaro Guides Co-op agent',
    did: 'did:kaluta:agent:kili-guides',
    category: 'Local services',
    scopes: ['quotes.read', 'permits.check', 'availability.read'],
    rateLimit: '90 req/min',
    uptime: '99.84%',
    placement: 'organic',
  },
]

/** Scripted exchange phases between a personal assistant and the business agent. */
const EXCHANGE = [
  {
    from: 'assistant' as const,
    title: 'your personal assistant',
    mono: 'GET registry.kaluta.ai/agents?capability=quotes.travel',
    note: 'discovers a verified business agent · checks the gold seal + scope manifest',
  },
  {
    from: 'business' as const,
    title: 'Kinjy Travel Services agent',
    mono: '200 OK · did:kaluta:agent:travel · handshake accepted',
    note: 'grants scope quotes.read · rate limit 120 req/min · signed capability token',
  },
  {
    from: 'assistant' as const,
    title: 'your personal assistant',
    mono: 'intent: "Kilimanjaro trek, 2 people, October"',
    note: 'natural language compiled to a structured quote request',
  },
]

const OFFER_ROWS = [
  ['route', 'Machame · 7 days'],
  ['party', '2 trekkers'],
  ['window', 'Oct 4 – Oct 10, 2026'],
  ['includes', 'permits · guide · porters · huts'],
  ['total', '$2,840.00'],
  ['expires', '72h · signed offer'],
]

function AgentCard({ agent, index }: { agent: RegistryAgent; index: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10%' }}
      transition={{ delay: index * 0.09, duration: 0.55, ease: EASE }}
      className={cn(
        'cloud-card cloud-card-hover relative p-5',
        agent.placement === 'paid' && 'shadow-gold-ring',
      )}
    >
      {agent.placement === 'paid' && (
        <span className="absolute -top-2.5 right-4 rounded-full border border-gold/40 bg-ink px-2.5 py-0.5 font-mono text-[0.58rem] font-semibold uppercase tracking-widest text-gold-soft">
          paid placement
        </span>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-card-sm border border-sky/25 bg-sky/10 text-sky">
            <Building2 size={18} aria-hidden="true" />
          </span>
          <div>
            <h3 className="flex items-center gap-2 text-base font-semibold text-text-hi">
              {agent.name}
              <VerifiedBadge size={16} />
            </h3>
            <p className="mono-data mt-0.5 text-[0.65rem] text-text-low">{agent.did}</p>
          </div>
        </div>
        <span className="rounded-full border border-white/12 bg-white/[0.04] px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-wider text-text-mid">
          {agent.category}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {agent.scopes.map((s) => (
          <span key={s} className="rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 font-mono text-[0.62rem] text-success">
            {s}
          </span>
        ))}
      </div>
      <div className="mono-data mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-[0.68rem] text-text-low">
        <span>rate {agent.rateLimit}</span>
        <span>uptime {agent.uptime}</span>
        <span className="flex items-center gap-1 text-success">
          <ShieldCheck size={12} aria-hidden="true" /> verified
        </span>
      </div>
    </motion.article>
  )
}

/** A8 — Agent-to-Agent (A2A) Registry: verified directory + scripted quote exchange. */
export default function A2ARegistry() {
  const reduced = useReducedMotion()
  const [phase, setPhase] = useState(-1) // -1 idle, 0..2 messages, 3 offer
  const running = phase >= 0 && phase < 3

  useEffect(() => {
    if (!running) return
    const t = setTimeout(() => setPhase((p) => p + 1), reduced ? 40 : 1050)
    return () => clearTimeout(t)
  }, [phase, running, reduced])

  const run = useCallback(() => setPhase(0), [])
  const reset = useCallback(() => setPhase(-1), [])

  return (
    <section className="noise-overlay relative bg-ink-2/40 px-6 py-24 md:py-32">
      <div className="mx-auto max-w-container">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-15%' }}
          transition={{ duration: 0.65, ease: EASE }}
          className="mx-auto max-w-3xl text-center"
        >
          <p className="eyebrow text-gold">Agent-to-Agent Registry</p>
          <h2 className="h2 mt-4">
            Your agent talks to <span className="text-arc-grad">verified business agents.</span>
          </h2>
          <p className="body-lg mt-5 text-text-mid">
            Every business on Kinjy can publish a machine-readable agent — sealed, scoped and
            rate-limited. Your personal assistant negotiates with it directly, in the open, with a
            signed trail.
          </p>
        </motion.div>

        <div className="mt-16 grid gap-10 lg:grid-cols-[5fr_6fr]">
          {/* Directory */}
          <div>
            <div className="space-y-5">
              {AGENTS.map((a, i) => (
                <AgentCard key={a.did} agent={a} index={i} />
              ))}
            </div>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="mt-5 border-l-2 border-gold/40 pl-4 text-sm leading-relaxed text-text-low"
            >
              Featured rows are <span className="text-gold-soft">paid agent placements</span> — a
              B2B revenue stream on the agent-readable architecture. Placement is always labeled;
              organic agents are ranked by verified relevance, never by payment.
            </motion.p>
          </div>

          {/* Scripted exchange */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-15%' }}
            transition={{ duration: 0.7, ease: EASE }}
            className="cloud-card flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-white/10 bg-ink-3/70 px-5 py-3">
              <span className="mono-data flex items-center gap-2 text-xs text-text-low">
                <Bot size={13} className="text-gold" aria-hidden="true" />
                a2a.exchange / scripted session
              </span>
              {phase < 0 ? (
                <button
                  type="button"
                  onClick={run}
                  className="mono-data inline-flex items-center gap-1.5 rounded-full border border-gold/35 bg-gold/10 px-3 py-1 text-xs text-gold-soft transition-colors hover:bg-gold/20"
                >
                  <Play size={12} aria-hidden="true" /> run exchange
                </button>
              ) : (
                <button
                  type="button"
                  onClick={reset}
                  className="mono-data inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-xs text-text-mid transition-colors hover:text-text-hi"
                >
                  <RefreshCw size={12} aria-hidden="true" /> reset
                </button>
              )}
            </div>

            <div className="flex-1 space-y-4 overflow-x-auto bg-ink-3/40 p-5">
              {phase < 0 && (
                <div className="flex h-full min-h-[260px] flex-col items-center justify-center gap-3 text-center">
                  <span
                    aria-hidden="true"
                    className="h-9 w-9 rounded-full"
                    style={{ background: 'var(--grad-orb)', filter: 'blur(0.6px) drop-shadow(0 0 12px rgba(74,82,224,0.5))' }}
                  />
                  <p className="max-w-xs text-sm text-text-low">
                    Watch a personal assistant discover a verified business agent, handshake on
                    scopes, and receive a signed offer.
                  </p>
                </div>
              )}
              <AnimatePresence initial={false}>
                {EXCHANGE.slice(0, Math.max(0, phase + 1)).map((m) => (
                  <motion.div
                    key={m.mono}
                    initial={{ opacity: 0, y: 16, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.45, ease: EASE }}
                    className={cn('flex', m.from === 'assistant' ? 'justify-start' : 'justify-end')}
                  >
                    <div
                      className={cn(
                        'max-w-[85%] rounded-card-md border px-4 py-3',
                        m.from === 'assistant'
                          ? 'border-sky/30 bg-sky/[0.07]'
                          : 'border-gold/30 bg-gold/[0.06]',
                      )}
                    >
                      <p className={cn('text-[0.62rem] font-bold uppercase tracking-widest', m.from === 'assistant' ? 'text-sky' : 'text-gold-soft')}>
                        {m.title}
                      </p>
                      <p className="mono-data mt-1.5 text-[0.72rem] text-text-hi">{m.mono}</p>
                      <p className="mt-1 text-[0.72rem] text-text-low">{m.note}</p>
                    </div>
                  </motion.div>
                ))}

                {phase >= 3 && (
                  <motion.div
                    key="offer"
                    initial={{ opacity: 0, y: 24, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.55, ease: EASE }}
                    className="rounded-card-md border border-gold/45 bg-ink/80 p-5 shadow-gold-ring"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="flex items-center gap-2 text-sm font-semibold text-text-hi">
                        <VerifiedBadge size={18} /> Structured offer · Kilimanjaro trek
                      </p>
                      <span className="mono-data rounded-full border border-success/35 bg-success/10 px-2.5 py-0.5 text-[0.6rem] text-success">
                        signed · verifiable
                      </span>
                    </div>
                    <div className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                      {OFFER_ROWS.map(([k, v]) => (
                        <div key={k} className="flex items-baseline justify-between gap-3 border-b border-white/8 pb-1.5">
                          <span className="font-mono text-[0.65rem] uppercase tracking-wider text-text-low">{k}</span>
                          <span className={cn('mono-data text-[0.75rem]', k === 'total' ? 'text-gold-grad text-base font-semibold' : 'text-text-hi')}>
                            {v}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="mono-data mt-4 flex items-center gap-2 text-[0.65rem] text-text-low">
                      proof: Ed25519Signature2020 · did:kaluta:agent:travel#key-2
                      <ArrowRight size={11} className="text-gold" aria-hidden="true" />
                      accept to escrow funds
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {running && (
                <motion.p
                  aria-hidden="true"
                  className="mono-data text-[0.65rem] text-text-low"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.1, repeat: Infinity }}
                >
                  ··· negotiating
                </motion.p>
              )}
            </div>

            <p className="border-t border-white/10 px-5 py-3 font-mono text-[0.68rem] text-text-low">
              every message signed · scopes enforced server-side · full audit trail in your vault
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
