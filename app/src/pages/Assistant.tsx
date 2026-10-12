import { useEffect, useRef, useState, type ReactNode } from 'react'
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
import PublicShell from '@/components/landing/PublicShell'
import { ClosingStage, Eyebrow, Stage } from '@/components/landing/PageKit'
import { KL_BTN_GHOST, KL_BTN_GOLD, KL_CARD, KL_CARD_GOLD, KL_LABEL } from '@/components/landing/kl-classes'
import { MODULE_TONES } from '@/components/platform/tones'
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

/** Eyebrow, big heading and optional lead shared by every section. */
function SectionHead({ eyebrow, title, lead, center = false }: { eyebrow: ReactNode; title: string; lead?: string; center?: boolean }) {
  return (
    <div className={cn('mb-12 max-w-[760px]', center && 'mx-auto text-center')}>
      <Eyebrow className={cn(center && 'flex items-center justify-center gap-2')}>{eyebrow}</Eyebrow>
      <h2 className="kl-serif mt-4 text-balance text-[clamp(34px,4.6vw,60px)] font-semibold leading-[1.02] tracking-[-0.02em]">{title}</h2>
      {lead && <p className="mt-5 text-[18px] leading-[1.6] text-[var(--kl-mid)]">{lead}</p>}
    </div>
  )
}

/** A tinted icon tile from the landing's pastel pairs. */
function IconTile({ icon: Icon, tone, size = 44 }: { icon: typeof Eye; tone: number; size?: number }) {
  const [ink, tile] = MODULE_TONES[tone % MODULE_TONES.length]
  return (
    <span className="grid shrink-0 place-items-center rounded-[12px]" style={{ background: tile, color: ink, width: size, height: size }} aria-hidden="true">
      <Icon size={size * 0.45} />
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Section 1 — Hero                                                    */
/* ------------------------------------------------------------------ */

const H1_WORDS = 'The agent that knows Kinjy — because it reads the code.'.split(' ')
const LANG_GLYPHS = ['EN', 'SW', 'FR', 'ع', '中']

function Hero() {
  const reduced = useReducedMotion()
  return (
    <header className="kl-split kl-pad-x gap-[clamp(40px,6vw,96px)] pb-24 pt-14">
      <div className="min-w-0">
        <Eyebrow>Kinjy Assistant</Eyebrow>
        <h1 className="kl-serif mt-6 text-[clamp(44px,6.2vw,92px)] font-semibold leading-[0.96] tracking-[-0.02em]">
          {H1_WORDS.map((w, i) => (
            <motion.span
              key={`${w}-${i}`}
              className="inline-block"
              initial={reduced ? { opacity: 0 } : { y: 26, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={reduced ? { duration: 0.2 } : { duration: 0.7, ease: EASE, delay: 0.15 + i * 0.08 }}
            >
              {w}
              {i < H1_WORDS.length - 1 ? '\u00a0' : ''}
            </motion.span>
          ))}
        </h1>
        <motion.p
          className="mt-8 max-w-[520px] text-[19px] leading-[1.55] text-[var(--kl-mid)]"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.9 }}
        >
          Ask anything about any feature, by voice or text, in any language. Get an illustrated answer or a demo
          video-clip. It updates itself with every release — and it keeps an eye on the AI frontier for us.
        </motion.p>
        <motion.div
          className="mt-10 flex flex-wrap items-center gap-4"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 1.05 }}
        >
          <button type="button" className={KL_BTN_GOLD} onClick={openAssistant}>
            <Sparkles size={17} aria-hidden="true" /> Try the Assistant
          </button>
          <button
            type="button"
            className={KL_BTN_GHOST}
            onClick={() => document.getElementById('stays-current')?.scrollIntoView({ behavior: 'smooth' })}
          >
            See how it stays current ↓
          </button>
        </motion.div>
      </div>

      <Stage className="min-w-0" glows={['var(--kl-sky)', 'var(--kl-coral)']}>
        <div className="flex min-h-[420px] items-center justify-center">
          {/* Orb with orbiting language glyphs */}
          <div className="relative flex h-[240px] w-[240px] items-center justify-center">
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
                const [ink, tile] = MODULE_TONES[i % MODULE_TONES.length]
                return (
                  <span
                    key={g}
                    className="absolute flex h-9 w-9 items-center justify-center rounded-full text-[0.7rem] font-bold shadow-[0_10px_20px_-12px_var(--kl-shadow)]"
                    style={{
                      left: `calc(50% + ${Math.cos(angle) * r}px - 18px)`,
                      top: `calc(50% + ${Math.sin(angle) * r}px - 18px)`,
                      background: tile,
                      color: ink,
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
        </div>
      </Stage>
    </header>
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
    <section className="overflow-x-clip kl-pad-x py-[clamp(48px,7vw,96px)]">
      <div className="mx-auto grid max-w-[1320px] gap-12 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-7">
          <SectionHead eyebrow="Live component showcase" title="Watch it work." />
          <ScriptedDemo />
        </div>
        <div className="lg:col-span-5">
          <div className="space-y-5 lg:sticky lg:top-24 lg:pt-[120px]">
            {DEMO_COPY.map((b, i) => (
              <motion.div
                key={b.title}
                className={cn(KL_CARD, 'flex gap-4 p-6')}
                initial={{ opacity: 0, x: 32 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-15%' }}
                transition={{ duration: 0.6, ease: EASE, delay: i * 0.1 }}
              >
                <IconTile icon={b.icon} tone={i} />
                <div className="min-w-0">
                  <h3 className="text-lg font-bold">{b.title}</h3>
                  <p className="mt-2 text-[0.95rem] leading-relaxed text-[var(--kl-mid)]">{b.body}</p>
                </div>
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
    <section className="kl-pad-x py-[clamp(48px,7vw,96px)]">
      <div className="mx-auto max-w-[1320px]">
        <SectionHead
          eyebrow="Dynamic positioning"
          title="Always nearby, never in the way."
          lead="The orb re-anchors with every route change and never covers primary actions. On mobile it collapses to a 48px edge tab, expanding on tap."
        />

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
                'rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                active === m.id
                  ? 'kl-sheen'
                  : 'border border-[var(--kl-paper-2)] bg-[var(--kl-surface)] text-[var(--kl-mid)] hover:border-[var(--kl-gold)] hover:text-[var(--kl-ink)]',
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Stylized app window */}
        <div ref={frameRef} className={cn(KL_CARD, 'relative h-[380px] overflow-hidden md:h-[430px]')}>
          {/* window chrome */}
          <div className="flex h-10 items-center gap-1.5 border-b border-[var(--kl-paper-2)] px-4">
            <span className="h-2.5 w-2.5 rounded-full bg-[#E58A6B]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#E8B84F]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#7DB58A]" />
            <span className="kl-mono ms-3 rounded-full bg-[var(--kl-paper)] px-3 py-1 text-[0.62rem] text-[var(--kl-low)]">
              kaluta.app/{mod.id}
            </span>
          </div>
          {/* skeleton UI */}
          <div className="absolute inset-x-6 top-16 flex gap-2" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={cn('h-6 rounded-full', i === 0 ? 'kl-sheen w-16 opacity-80' : 'w-14 border border-[var(--kl-paper-2)] bg-[var(--kl-paper)]')} />
            ))}
          </div>
          <div className="absolute inset-x-6 bottom-5 top-24 grid grid-cols-3 gap-3" aria-hidden="true">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="rounded-[12px] border border-[var(--kl-paper-2)] bg-[var(--kl-paper)] p-3">
                <div className="mb-2 h-2 w-2/3 rounded bg-[var(--kl-paper-2)]" />
                <div className="h-2 w-full rounded bg-[var(--kl-paper-2)] opacity-70" />
                <div className="mt-2 h-2 w-1/2 rounded bg-[var(--kl-paper-2)] opacity-70" />
              </div>
            ))}
          </div>

          {/* anchor flash — gold dashed outline on arrival */}
          <AnimatePresence>
            <motion.div
              key={active}
              className="pointer-events-none absolute rounded-[12px] border-2 border-dashed border-[var(--kl-gold)]"
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

        <p className="mt-4 flex items-center gap-2 text-sm text-[var(--kl-mid)]">
          <MousePointerClick size={14} className="text-[var(--kl-gold-deep)]" aria-hidden="true" />
          <span>
            <span className="font-bold text-[var(--kl-ink)]">{mod.label}:</span> {mod.anchor} — glides there in 420ms
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
    <div className={cn('relative h-full flex-1 p-6 transition-all duration-500', active ? KL_CARD_GOLD : KL_CARD)}>
      <span
        className={cn(
          'rounded-full px-2.5 py-1 text-[0.65rem] font-bold tracking-widest',
          admin ? 'kl-sheen' : 'bg-[#E3ECF7] text-[#2F6BA8]',
        )}
      >
        {admin ? 'ADMIN' : 'MEMBER'}
      </span>
      <p className="mt-4 text-base font-bold">“How do payouts work?”</p>
      <ul className="mt-3 space-y-2 text-[0.88rem] leading-relaxed text-[var(--kl-mid)]">
        <li>· Your earnings split: 40% creator share, tracked in Earnings.</li>
        <li>· Withdrawal: complete KYC ($10/yr), then request a payout.</li>
        <li>· Commission is one level: the sponsor takes 20% of Kinjy’s revenue.</li>
        {admin && (
          <>
            <li className="font-semibold text-[var(--kl-gold-deep)]">· Ledger reconciliation: 100% matched, last run 02:00 UTC.</li>
            <li className="font-semibold text-[var(--kl-gold-deep)]">· Fraud-review queue depth: 7 cases pending.</li>
            <li className="font-semibold text-[var(--kl-gold-deep)]">· Payment batch tool: next release Friday — open in console.</li>
          </>
        )}
      </ul>
      <p className={cn(KL_LABEL, 'mt-4 normal-case tracking-normal')}>From: Earnings guide · updated v2.14.0 · AI Generated</p>
    </div>
  )
}

function RoleCompare() {
  const [view, setView] = useState<'member' | 'admin'>('member')
  return (
    <section className="overflow-x-clip kl-pad-x py-[clamp(48px,7vw,96px)]">
      <div className="mx-auto max-w-[1320px]">
        <SectionHead
          eyebrow="Role-aware intelligence"
          title="Answers at your access level."
          lead="Answers are permission-scoped to what you're allowed to see. The assistant never reveals admin capabilities to members — and labels all AI-generated content."
        />

        <div className="mb-6 inline-flex rounded-full border border-[var(--kl-paper-2)] bg-[var(--kl-surface)] p-1" role="group" aria-label="Compare roles">
          {(['member', 'admin'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setView(r)}
              aria-pressed={view === r}
              className={cn(
                'rounded-full px-5 py-2 text-sm font-bold transition-colors',
                view === r ? 'kl-sheen' : 'text-[var(--kl-mid)] hover:text-[var(--kl-ink)]',
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
    <div className={cn(KL_CARD, 'p-5')}>
      <p className={cn(KL_LABEL, 'mb-3')}>ingest.log — live</p>
      {INGEST_LOG.map((line, i) => (
        <p key={line} className="kl-mono min-h-[1.5em] text-[0.78rem] leading-relaxed text-[var(--kl-mid)]">
          {counts[i] > 0 && <span className="text-[#3E8A55]">✓ </span>}
          {line.slice(0, counts[i])}
          {counts[i] > 0 && counts[i] < line.length && <span className="animate-caret-blink text-[var(--kl-gold-deep)]">▍</span>}
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
    <section id="stays-current" className="kl-pad-x py-[clamp(48px,7vw,96px)]">
      <div ref={rootRef} className="mx-auto max-w-[1320px]">
        <SectionHead
          eyebrow="Self-updating knowledge"
          title="Every release teaches it something new."
          lead="When the codebase changes, the changelog pipeline regenerates what the assistant knows — answers, illustrations and demo clips — so it never answers from a stale version of Kinjy."
        />

        {/* Pipeline diagram */}
        <div className="relative">
          {/* connecting arc line */}
          <div className="absolute left-0 right-0 top-[26px] hidden h-px bg-[var(--kl-paper-2)] lg:block" aria-hidden="true" />
          {inView && !reduced && (
            <motion.span
              className="absolute top-[23px] hidden h-[7px] w-[7px] rounded-full bg-[var(--kl-gold)] shadow-[0_0_12px_rgba(217,166,72,0.9)] lg:block"
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
                <span className="kl-sheen kl-mono z-10 flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full text-base font-bold shadow-[0_14px_30px_-14px_rgba(169,118,28,.55)]">
                  {i + 1}
                </span>
                <span className="pt-3 text-[0.92rem] font-semibold leading-snug lg:pt-2">{stage}</span>
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
    <section className="kl-pad-x py-[clamp(48px,7vw,96px)]">
      <div className="mx-auto max-w-[1320px]">
        <Stage className="px-[clamp(20px,5vw,64px)] py-[clamp(48px,6vw,88px)]" glows={['#D9A648', 'var(--kl-sky)']}>
          <SectionHead
            center
            eyebrow={
              <>
                <Zap size={14} aria-hidden="true" /> AI Industry Watch · admin capability
              </>
            }
            title="It watches the frontier, so you don't have to."
            lead="The assistant observes developments in AI and related industry practices, then notifies admins only when adoption would add real value to Kinjy — with the reason to adopt, the reason a codebase change is needed, and a proposed implementation you can instruct it to execute."
          />

          <motion.div
            className="mx-auto max-w-2xl"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-20%' }}
            transition={{ duration: 0.7, ease: EASE }}
          >
            <AIWatchCard advisory={WATCH_ADVISORIES[0]} demo />
          </motion.div>

          <p className="mx-auto mt-8 max-w-xl text-center text-sm text-[var(--kl-mid)]">
            It advises; humans decide. Execution always produces reviewable code, never silent changes.
          </p>
        </Stage>
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
    <section className="kl-pad-x py-[clamp(48px,7vw,96px)]">
      <div className="mx-auto max-w-[1320px]">
        <SectionHead eyebrow="Engineering & trust" title="Built like infrastructure, not a gimmick." />
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {TRUST_CARDS.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-15%' }}
              transition={{ duration: 0.55, ease: EASE, delay: i * 0.08 }}
            >
              <div className={cn(KL_CARD, 'h-full p-7 transition-colors hover:border-[var(--kl-gold)]')}>
                <IconTile icon={c.icon} tone={i} />
                <h3 className="mt-5 text-lg font-bold">{c.title}</h3>
                <p className="mt-2 text-[0.92rem] leading-relaxed text-[var(--kl-mid)]">{c.body}</p>
                {c.pulse && (
                  <div className="mt-4 flex items-center gap-2" aria-hidden="true">
                    {['Kimi', 'DeepSeek', 'others'].map((p, pi) => (
                      <span key={p} className="flex items-center gap-2">
                        <motion.span
                          className="h-1.5 w-1.5 rounded-full bg-[var(--kl-gold)]"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 2, repeat: Infinity, delay: pi * 0.6 }}
                        />
                        <span className="kl-mono text-[0.65rem] text-[var(--kl-low)]">{p}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
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
    <ClosingStage
      eyebrow="Ask away"
      title={
        <>
          Ask it anything. <span className="italic text-[var(--kl-gold-deep)]">Right now.</span>
        </>
      }
    >
      <p className="mx-auto mt-8 max-w-xl text-[18px] text-[var(--kl-mid)]">
        Available on every page, in every module, in your language.
      </p>
      <div className="mt-10 flex justify-center">
        <button type="button" className={KL_BTN_GOLD} onClick={openAssistant}>
          <Sparkles size={17} aria-hidden="true" /> Open the Assistant
        </button>
      </div>
      <p className="mt-6 text-sm text-[var(--kl-low)]">
        On this page the orb anchors bottom-center — it’s the protagonist here. Look down.
      </p>
    </ClosingStage>
  )
}

/* ------------------------------------------------------------------ */

export default function Assistant() {
  return (
    <PublicShell>
      <Hero />
      <ChatDemo />
      <PositionMap />
      <RoleCompare />
      <Pipeline />
      <WatchSection />
      <TrustStrip />
      <FinalCta />
    </PublicShell>
  )
}
