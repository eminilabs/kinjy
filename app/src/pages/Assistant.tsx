import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion'
import {
  BadgeCheck,
  Ear,
  Eye,
  GitBranch,
  Globe2,
  Languages,
  Mic,
  MousePointerClick,
  ShieldCheck,
  Sparkles,
  Type,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ArcButton, CloudCard } from '@/components/ui-kit'
import {
  AIWatchCard,
  Orb,
  ScriptedDemo,
  WATCH_ADVISORIES,
  openAssistant,
} from '@/components/assistant'
import { INGEST_LOG } from '@/components/assistant/knowledgeBase'

/**
 * /assistant — the Kinjy Assistant explainer page (assistant.md PART A).
 * Demonstrates the embedded agent: dynamic positioning, voice, dual response
 * formats, language mirroring, role-aware answers, self-updating knowledge
 * and the admin AI Industry Watch with executable advisories.
 */

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

/* ------------------------------------------------------------------ */
/* Section 1 — Hero                                                    */
/* ------------------------------------------------------------------ */

const H1_WORDS = 'The agent that knows Kinjy — because it reads the code.'.split(' ')
const LANG_GLYPHS = ['EN', 'SW', 'FR', 'ع', '中']

function Hero() {
  const reduced = useReducedMotion()
  return (
    <section className="twilight-field noise-overlay relative -mt-[72px] overflow-hidden px-6 pb-24 pt-[160px] md:pb-32 md:pt-[190px]">
      <div className="mx-auto flex max-w-container flex-col items-center text-center">
        {/* Orb with orbiting language glyphs */}
        <div className="relative mb-10 flex h-[240px] w-[240px] items-center justify-center">
          {/* glyph ring — orbits once on load */}
          <motion.div
            className="absolute inset-0"
            initial={{ rotate: -140, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            transition={reduced ? { duration: 0 } : { duration: 2.4, ease: EASE }}
            aria-hidden="true"
          >
            {LANG_GLYPHS.map((g, i) => {
              const angle = (i / LANG_GLYPHS.length) * Math.PI * 2 - Math.PI / 2
              const r = 108
              return (
                <span
                  key={g}
                  className="absolute flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-ink-2/80 text-[0.68rem] font-bold text-sky backdrop-blur"
                  style={{
                    left: `calc(50% + ${Math.cos(angle) * r}px - 18px)`,
                    top: `calc(50% + ${Math.sin(angle) * r}px - 18px)`,
                  }}
                >
                  {g}
                </span>
              )
            })}
          </motion.div>
          {/* 120px orb — descends 40px, settles, then breathes (idle state loops internally) */}
          <motion.div
            initial={reduced ? { opacity: 0 } : { y: -40, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={reduced ? { duration: 0.2 } : { duration: 2, ease: EASE }}
          >
            <motion.div
              animate={reduced ? {} : { y: [0, -8, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Orb size={120} state="idle" />
            </motion.div>
          </motion.div>
        </div>

        <p className="eyebrow text-gold">Kinjy Assistant</p>
        <h1 className="display-lg mt-4 max-w-4xl">
          {H1_WORDS.map((w, i) => (
            <motion.span
              key={`${w}-${i}`}
              className="inline-block"
              initial={reduced ? { opacity: 0 } : { y: 26, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={reduced ? { duration: 0.2 } : { duration: 0.7, ease: EASE, delay: 0.15 + i * 0.08 }}
            >
              {w}
              {i < H1_WORDS.length - 1 ? ' ' : ''}
            </motion.span>
          ))}
        </h1>
        <motion.p
          className="body-lg mt-6 max-w-2xl text-text-mid"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.9 }}
        >
          Ask anything about any feature, by voice or text, in any language. Get an illustrated answer or a demo
          video-clip. It updates itself with every release — and it keeps an eye on the AI frontier for us.
        </motion.p>
        <motion.div
          className="mt-9 flex flex-wrap items-center justify-center gap-3"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 1.05 }}
        >
          <ArcButton size="lg" onClick={openAssistant}>
            <Sparkles size={16} aria-hidden="true" /> Try the Assistant
          </ArcButton>
          <ArcButton size="lg" variant="ghost" onClick={() => document.getElementById('stays-current')?.scrollIntoView({ behavior: 'smooth' })}>
            See how it stays current ↓
          </ArcButton>
        </motion.div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Section 2 — Live chat demo                                          */
/* ------------------------------------------------------------------ */

const DEMO_COPY = [
  {
    icon: Eye,
    title: 'Two ways to be shown.',
    body: 'Every substantive answer comes twice: illustrated writing for scanners — concise steps with numbered gold callouts — and a demo video-clip for watchers, captioned in your language.',
  },
  {
    icon: Languages,
    title: 'Your language, automatically.',
    body: 'Detection runs on every message — ask in Kiswahili, Français, العربية or 中文 and the reply, captions and image callouts follow. No settings to find, ever.',
  },
  {
    icon: Mic,
    title: 'Typed or spoken.',
    body: 'Hold the mic and talk: streaming speech-to-text lands in an editable composer before sending. Spoken replies are optional — text is always available.',
  },
]

function ChatDemo() {
  return (
    <section className="noise-overlay bg-ink-2/30 px-6 py-24 md:py-32">
      <div className="mx-auto grid max-w-container gap-12 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <p className="eyebrow mb-3 text-sky">Live component showcase</p>
          <h2 className="h2 mb-8">Watch it work.</h2>
          <ScriptedDemo />
        </div>
        <div className="lg:col-span-5">
          <div className="space-y-8 lg:sticky lg:top-24">
            {DEMO_COPY.map((b, i) => (
              <motion.div
                key={b.title}
                initial={{ opacity: 0, x: 32 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-15%' }}
                transition={{ duration: 0.6, ease: EASE, delay: i * 0.1 }}
              >
                <b.icon size={20} className="mb-3 text-gold-soft" aria-hidden="true" />
                <h3 className="h3">{b.title}</h3>
                <p className="mt-2 text-[0.95rem] leading-relaxed text-text-mid">{b.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Section 3 — Dynamic positioning map                                 */
/* ------------------------------------------------------------------ */

const MODULES = [
  { id: 'home', label: 'Home', pos: { x: 88, y: 80 }, anchor: 'Bottom-right, 24px margins' },
  { id: 'create', label: 'Create', pos: { x: 64, y: 70 }, anchor: 'Docked right of the composer toolbar' },
  { id: 'family', label: 'Family Tree', pos: { x: 8, y: 16 }, anchor: 'Top-left of the tree canvas' },
  { id: 'graveyard', label: 'Graveyard', pos: { x: 12, y: 78 }, anchor: 'Beside the memorial action bar' },
  { id: 'market', label: 'Marketplace', pos: { x: 88, y: 64 }, anchor: 'Bottom-right, offset above cart bar' },
  { id: 'admin', label: 'Admin', pos: { x: 15, y: 82 }, anchor: 'Bottom-left, beside the admin rail' },
] as const

function PositionMap() {
  const [active, setActive] = useState<(typeof MODULES)[number]['id']>('home')
  const frameRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const reduced = useReducedMotion()
  const mod = MODULES.find((m) => m.id === active) ?? MODULES[0]

  useEffect(() => {
    const el = frameRef.current
    if (!el) return
    const measure = () => setSize({ w: el.offsetWidth, h: el.offsetHeight })
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  return (
    <section className="px-6 py-24 md:py-32">
      <div className="mx-auto max-w-container">
        <p className="eyebrow mb-3 text-sky">Dynamic positioning</p>
        <h2 className="h2 mb-4">Always nearby, never in the way.</h2>
        <p className="body-lg mb-10 max-w-2xl text-text-mid">
          The orb re-anchors with every route change and never covers primary actions. On mobile it collapses to a
          48px edge tab, expanding on tap.
        </p>

        {/* Module switcher */}
        <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Module">
          {MODULES.map((m) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={active === m.id}
              onClick={() => setActive(m.id)}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ease-cloud-ease',
                active === m.id ? 'bg-gold/90 text-ink' : 'cloud-glass text-text-mid hover:text-text-hi',
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Stylized app window */}
        <div ref={frameRef} className="cloud-card relative h-[380px] overflow-hidden md:h-[430px]">
          {/* window chrome */}
          <div className="flex h-10 items-center gap-1.5 border-b border-white/10 px-4">
            <span className="h-2.5 w-2.5 rounded-full bg-danger/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
            <span className="ms-3 rounded-full bg-white/5 px-3 py-1 font-mono text-[0.62rem] text-text-low">
              kaluta.app/{mod.id}
            </span>
          </div>
          {/* skeleton UI */}
          <div className="absolute inset-x-6 top-16 flex gap-2" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={cn('h-6 rounded-full', i === 0 ? 'w-16 bg-gold/70' : 'w-14 bg-white/10 border border-white/10')} />
            ))}
          </div>
          <div className="absolute inset-x-6 bottom-5 top-24 grid grid-cols-3 gap-3" aria-hidden="true">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="rounded-card-sm border border-white/10 bg-white/[0.04] p-3">
                <div className="mb-2 h-2 w-2/3 rounded bg-white/15" />
                <div className="h-2 w-full rounded bg-white/10" />
                <div className="mt-2 h-2 w-1/2 rounded bg-white/10" />
              </div>
            ))}
          </div>

          {/* anchor flash — gold dashed outline on arrival */}
          <AnimatePresence>
            <motion.div
              key={active}
              className="pointer-events-none absolute rounded-card-sm border-2 border-dashed border-gold/70"
              style={{
                left: `${mod.pos.x}%`,
                top: `${mod.pos.y}%`,
                width: 72,
                height: 72,
                translateX: '-50%',
                translateY: '-50%',
              }}
              initial={{ opacity: 0.9, scale: 1.15 }}
              animate={{ opacity: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: EASE }}
              aria-hidden="true"
            />
          </AnimatePresence>

          {/* the gliding orb */}
          <motion.div
            className="absolute left-0 top-0"
            animate={{ x: (mod.pos.x / 100) * size.w - 18, y: (mod.pos.y / 100) * size.h + 10 }}
            transition={reduced ? { duration: 0 } : { duration: 0.42, ease: EASE }}
          >
            <Orb size={36} />
          </motion.div>
        </div>

        <p className="caption mt-4 flex items-center gap-2">
          <MousePointerClick size={13} className="text-gold-soft" aria-hidden="true" />
          <span>
            <span className="font-bold text-text-hi">{mod.label}:</span> {mod.anchor} — glides there in 420ms
            cloud-ease.
          </span>
        </p>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Section 4 — Role-aware intelligence                                 */
/* ------------------------------------------------------------------ */

function PayoutPanel({ role, active }: { role: 'member' | 'admin'; active: boolean }) {
  const admin = role === 'admin'
  return (
    <CloudCard className={cn('relative flex-1 p-6 transition-all duration-500', active && 'border-gold/40 shadow-gold-ring')}>
      <span
        className={cn(
          'rounded-full border px-2.5 py-1 text-[0.62rem] font-bold tracking-widest',
          admin ? 'border-gold/40 bg-gold/15 text-gold-soft' : 'border-sky/30 bg-sky/10 text-sky',
        )}
      >
        {admin ? 'ADMIN' : 'MEMBER'}
      </span>
      <p className="mt-3 text-sm font-bold">“How do payouts work?”</p>
      <ul className="mt-3 space-y-2 text-[0.82rem] leading-relaxed text-text-mid">
        <li>· Your earnings split: 40% creator share, tracked in Earnings.</li>
        <li>· Withdrawal: complete KYC ($10/yr), then request a payout.</li>
        <li>· Commission is one level: the sponsor takes 20% of Kinjy’s revenue.</li>
        {admin && (
          <>
            <li className="text-gold-soft">· Ledger reconciliation: 100% matched, last run 02:00 UTC.</li>
            <li className="text-gold-soft">· Fraud-review queue depth: 7 cases pending.</li>
            <li className="text-gold-soft">· Payment batch tool: next release Friday — open in console.</li>
          </>
        )}
      </ul>
      <p className="mt-3 font-mono text-[0.6rem] text-text-low">From: Earnings guide · updated v2.14.0 · AI Generated</p>
    </CloudCard>
  )
}

function RoleCompare() {
  const [view, setView] = useState<'member' | 'admin'>('member')
  return (
    <section className="noise-overlay bg-ink-2/30 px-6 py-24 md:py-32">
      <div className="mx-auto max-w-container">
        <p className="eyebrow mb-3 text-sky">Role-aware intelligence</p>
        <h2 className="h2 mb-4">Answers at your access level.</h2>
        <p className="body-lg mb-8 max-w-2xl text-text-mid">
          Answers are permission-scoped to what you're allowed to see. The assistant never reveals admin capabilities
          to members — and labels all AI-generated content.
        </p>

        <div className="mb-6 inline-flex rounded-full border border-white/10 bg-ink/60 p-1" role="group" aria-label="Compare roles">
          {(['member', 'admin'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setView(r)}
              aria-pressed={view === r}
              className={cn(
                'rounded-full px-5 py-2 text-sm font-bold transition-colors',
                view === r ? 'bg-gold/90 text-ink' : 'text-text-mid hover:text-text-hi',
              )}
            >
              {r === 'member' ? 'Member view' : 'Admin view'}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-6 md:flex-row">
          <motion.div
            className="flex-1"
            initial={{ opacity: 0, x: -48 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-20%' }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <PayoutPanel role="member" active={view === 'member'} />
          </motion.div>
          <motion.div
            className="flex-1"
            initial={{ opacity: 0, x: 48 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-20%' }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <PayoutPanel role="admin" active={view === 'admin'} />
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Section 5 — Self-updating knowledge pipeline                        */
/* ------------------------------------------------------------------ */

const PIPELINE_STAGES = [
  'Code change merged',
  'Changelog & feature docs generated',
  'Assistant knowledge re-ingested',
  'Answers & demo clips refreshed',
  'Admins notified of user-facing changes',
]

function TypedLog({ active }: { active: boolean }) {
  const [counts, setCounts] = useState<number[]>(INGEST_LOG.map(() => 0))
  useEffect(() => {
    if (!active) return
    const timers: ReturnType<typeof setInterval>[] = []
    INGEST_LOG.forEach((line, li) => {
      let i = 0
      const start = setTimeout(() => {
        const id = setInterval(() => {
          i += 3
          setCounts((c) => c.map((v, idx) => (idx === li ? Math.min(i, line.length) : v)))
          if (i >= line.length) clearInterval(id)
        }, 1000 / 26)
        timers.push(id)
      }, li * 900)
      timers.push(start as unknown as ReturnType<typeof setInterval>)
    })
    return () => timers.forEach((t) => {
      clearInterval(t)
      clearTimeout(t)
    })
  }, [active])

  return (
    <div className="rounded-card-md border border-white/10 bg-ink/80 p-5">
      <p className="mb-3 font-mono text-[0.62rem] uppercase tracking-widest text-text-low">ingest.log — live</p>
      {INGEST_LOG.map((line, i) => (
        <p key={line} className="mono-data min-h-[1.5em] text-[0.72rem] leading-relaxed text-text-mid">
          {counts[i] > 0 && <span className="text-success">✓ </span>}
          {line.slice(0, counts[i])}
          {counts[i] > 0 && counts[i] < line.length && <span className="animate-caret-blink text-gold-soft">▍</span>}
        </p>
      ))}
    </div>
  )
}

function Pipeline() {
  const rootRef = useRef<HTMLDivElement>(null)
  const inView = useInView(rootRef, { once: true, margin: '-40%' })
  const logRef = useRef<HTMLDivElement>(null)
  const logInView = useInView(logRef, { once: true, margin: '-40%' })
  const reduced = useReducedMotion()

  return (
    <section id="stays-current" className="px-6 py-24 md:py-32">
      <div ref={rootRef} className="mx-auto max-w-container">
        <p className="eyebrow mb-3 text-sky">Self-updating knowledge</p>
        <h2 className="h2 mb-4">Every release teaches it something new.</h2>
        <p className="body-lg mb-12 max-w-2xl text-text-mid">
          When the codebase changes, the changelog pipeline regenerates what the assistant knows — answers,
          illustrations and demo clips — so it never answers from a stale version of Kinjy.
        </p>

        {/* Pipeline diagram */}
        <div className="relative">
          {/* connecting arc line */}
          <div className="absolute left-0 right-0 top-[26px] hidden h-px bg-white/10 lg:block" aria-hidden="true" />
          {inView && !reduced && (
            <motion.span
              className="absolute top-[23px] hidden h-[7px] w-[7px] rounded-full bg-gold-soft shadow-[0_0_12px_rgba(240,200,120,0.9)] lg:block"
              animate={{ left: ['0%', '100%'] }}
              transition={{ duration: 4, repeat: Infinity, ease: [0.65, 0, 0.35, 1] }}
              aria-hidden="true"
            />
          )}
          <ol className="grid gap-6 lg:grid-cols-5 lg:gap-4">
            {PIPELINE_STAGES.map((stage, i) => (
              <motion.li
                key={stage}
                className="relative flex items-start gap-3 lg:flex-col lg:items-center lg:text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-20%' }}
                transition={{ duration: 0.5, ease: EASE, delay: i * 0.1 }}
              >
                <span className="z-10 flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full border border-gold/40 bg-ink-2 font-mono text-sm font-bold text-gold-soft shadow-gold-ring">
                  {i + 1}
                </span>
                <span className="pt-3 text-[0.82rem] font-semibold leading-snug text-text-mid lg:pt-2">{stage}</span>
              </motion.li>
            ))}
          </ol>
        </div>

        {/* Ingest log */}
        <div ref={logRef} className="mx-auto mt-12 max-w-3xl">
          <TypedLog active={logInView} />
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Section 6 — AI Industry Watch                                       */
/* ------------------------------------------------------------------ */

function WatchSection() {
  return (
    <section className="twilight-field noise-overlay px-6 py-24 md:py-32">
      <div className="mx-auto max-w-container">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="eyebrow mb-3 flex items-center justify-center gap-2 text-gold">
            <Zap size={14} aria-hidden="true" /> AI Industry Watch · admin capability
          </p>
          <h2 className="h2">It watches the frontier, so you don't have to.</h2>
          <p className="body-lg mt-4 text-text-mid">
            The assistant observes developments in AI and related industry practices, then notifies admins only when
            adoption would add real value to Kinjy — with the reason to adopt, the reason a codebase change is
            needed, and a proposed implementation you can instruct it to execute.
          </p>
        </div>

        <motion.div
          className="mx-auto max-w-2xl"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-20%' }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          <AIWatchCard advisory={WATCH_ADVISORIES[0]} demo />
        </motion.div>

        <p className="mx-auto mt-8 max-w-xl text-center text-sm text-text-mid">
          It advises; humans decide. Execution always produces reviewable code, never silent changes.
        </p>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Section 7 — Engineering & trust strip                               */
/* ------------------------------------------------------------------ */

const TRUST_CARDS = [
  {
    icon: Globe2,
    title: 'Provider-independent AI Gateway',
    body: 'Model routing by task, language, accuracy, cost, speed and data sensitivity — Kimi, DeepSeek, others; never hard-coded to one provider.',
    pulse: true,
  },
  {
    icon: GitBranch,
    title: 'Grounded, cited answers',
    body: 'Retrieval over the platform’s living knowledge base; no fabrication — sources and KB versions linked in every answer.',
  },
  {
    icon: ShieldCheck,
    title: 'Permission-scoped',
    body: 'Role-filtered retrieval; admin knowledge — ledger, fraud center, AI Watch — never leaks to members.',
  },
  {
    icon: BadgeCheck,
    title: 'Labeled AI content',
    body: 'Every assistant message carries the AI Generated provenance tag, alongside every dubbed or synthesized media item.',
  },
  {
    icon: Ear,
    title: 'Voice done right',
    body: 'Streaming speech-to-text, optional spoken replies, text always available; no biometric voiceprints stored.',
  },
  {
    icon: Type,
    title: 'Evaluated continuously',
    body: 'Answer-quality evals run on every knowledge refresh; regressions block deployment — and a plain "I don’t have verified information" beats a guess.',
  },
]

function TrustStrip() {
  return (
    <section className="px-6 py-24 md:py-32">
      <div className="mx-auto max-w-container">
        <p className="eyebrow mb-3 text-sky">Engineering & trust</p>
        <h2 className="h2 mb-12">Built like infrastructure, not a gimmick.</h2>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {TRUST_CARDS.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-15%' }}
              transition={{ duration: 0.55, ease: EASE, delay: i * 0.08 }}
            >
              <CloudCard hoverable className="h-full p-6">
                <c.icon size={20} className="mb-3 text-gold-soft" aria-hidden="true" />
                <h3 className="text-base font-bold">{c.title}</h3>
                <p className="mt-2 text-[0.85rem] leading-relaxed text-text-mid">{c.body}</p>
                {c.pulse && (
                  <div className="mt-4 flex items-center gap-2" aria-hidden="true">
                    {['Kimi', 'DeepSeek', 'others'].map((p, pi) => (
                      <span key={p} className="flex items-center gap-2">
                        <motion.span
                          className="h-1.5 w-1.5 rounded-full bg-sky"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 2, repeat: Infinity, delay: pi * 0.6 }}
                        />
                        <span className="font-mono text-[0.6rem] text-text-low">{p}</span>
                      </span>
                    ))}
                  </div>
                )}
              </CloudCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Section 8 — CTA                                                     */
/* ------------------------------------------------------------------ */

function FinalCta() {
  return (
    <section className="noise-overlay border-t border-white/5 bg-ink-2/30 px-6 py-24 md:py-32">
      <div className="mx-auto max-w-container text-center">
        <h2 className="h2">Ask it anything. Right now.</h2>
        <p className="body-lg mx-auto mt-4 max-w-xl text-text-mid">
          Available on every page, in every module, in your language.
        </p>
        <div className="mt-9">
          <ArcButton size="lg" onClick={openAssistant}>
            <Sparkles size={16} aria-hidden="true" /> Open the Assistant
          </ArcButton>
        </div>
        <p className="caption mt-6">
          On this page the orb anchors bottom-center — it’s the protagonist here. Look down.
        </p>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */

export default function Assistant() {
  return (
    <>
      <Hero />
      <ChatDemo />
      <PositionMap />
      <RoleCompare />
      <Pipeline />
      <WatchSection />
      <TrustStrip />
      <FinalCta />
    </>
  )
}
