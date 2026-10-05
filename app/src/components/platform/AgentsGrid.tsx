import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { motion, useReducedMotion } from 'framer-motion'
import { UserRound, Compass, Bot, ShieldCheck, MessagesSquare, LibraryBig, Vault, Route } from 'lucide-react'
import { FEATURES } from '@/lib/features'
import { CLOUD_EASE, OrbDot, useActiveInView } from './shared'
import { MODULE_TONES } from './tones'

const ALL_AGENTS = [
  {
    icon: UserRound,
    name: 'Personal AI Assistant',
    body: 'One per user — knows your language, your circles, your algorithm choices. Yours alone.',
    chip: '1 : 1 with you',
    assistant: true,
  },
  {
    icon: Compass,
    name: 'Kinjy Assistant',
    body: 'The platform expert. Answers with written guides or video walkthroughs, in your language.',
    chip: 'Platform expert',
    link: { label: 'Meet the Assistant →', to: '/assistant' },
    assistant: true,
  },
  {
    icon: Bot,
    name: 'Autonomous Creator Agents',
    body: 'Recurring publishing tasks with approval workflows — they draft, you decide.',
    chip: 'Approval-gated',
  },
  {
    icon: ShieldCheck,
    name: 'AI Community Managers',
    body: 'Keep communities healthy: welcoming members, surfacing rules, defusing pile-ons.',
    chip: 'Community health',
  },
  {
    icon: MessagesSquare,
    name: 'AI Forum Assistants',
    body: 'Thread summaries, Q&A from forum knowledge, duplicate detection before you post.',
    chip: 'Forum-native',
  },
  {
    icon: LibraryBig,
    name: 'Forum-to-Knowledge',
    body: 'Discussions crystallize into a structured knowledge base — with citations back to source.',
    chip: 'Cited knowledge',
  },
]

/** The assistant cards stay off the page while the assistant is switched off (lib/features.ts). */
const AGENTS = ALL_AGENTS.filter((a) => FEATURES.assistant || !a.assistant)

/** Routing animation: a pulse travels between 3 model nodes; chosen path highlights gold every 4s. */
function GatewayRouter() {
  const { ref, active } = useActiveInView<HTMLDivElement>(0.5)
  const reduced = useReducedMotion()
  const [route, setRoute] = useState(0)
  const MODELS = ['Kimi', 'DeepSeek', 'Others']

  useEffect(() => {
    if (!active || reduced) return
    const t = setInterval(() => setRoute((r) => (r + 1) % 3), 4000)
    return () => clearInterval(t)
  }, [active, reduced])

  const targets = [
    { x: 70, y: 150 },
    { x: 210, y: 150 },
    { x: 350, y: 150 },
  ]

  return (
    <div ref={ref} className="mt-4">
      <svg viewBox="0 0 420 190" className="w-full" role="img" aria-label="AI Gateway routing between model providers">
        {targets.map((t, i) => {
          const hot = route === i
          return (
            <g key={MODELS[i]}>
              <path
                d={`M 210 40 Q ${(210 + t.x) / 2} 96 ${t.x} ${t.y - 18}`}
                fill="none"
                strokeWidth={hot ? 2.2 : 1.4}
                style={{ stroke: hot ? '#D9A648' : 'var(--kl-dash)', transition: 'stroke 420ms ease' }}
              />
              {hot && !reduced && (
                <motion.circle
                  key={`pulse-${route}`}
                  r={4}
                  fill="#D9A648"
                  initial={{ cx: 210, cy: 40, opacity: 1 }}
                  animate={{ cx: t.x, cy: t.y - 18, opacity: [1, 1, 0] }}
                  transition={{ duration: 1.1, ease: [0.65, 0, 0.35, 1] }}
                />
              )}
              <circle
                cx={t.x}
                cy={t.y}
                r={20}
                style={{ fill: hot ? '#0B0E1D' : 'var(--kl-surface)', stroke: hot ? '#D9A648' : 'var(--kl-dash)', strokeWidth: 1.5, transition: 'all 420ms ease' }}
              />
              <text x={t.x} y={t.y + 38} textAnchor="middle" fontSize="12" fontWeight="700" fontFamily="'JetBrains Mono', monospace" style={{ fill: hot ? 'var(--kl-gold-deep)' : 'var(--kl-low)', transition: 'fill 420ms ease' }}>
                {MODELS[i]}
              </text>
            </g>
          )
        })}
        <circle cx={210} cy={40} r={24} fill="#4A52E0" />
        <text x={210} y={44} textAnchor="middle" fill="#F4F2EE" fontSize="10.5" fontWeight="700" fontFamily="'JetBrains Mono', monospace">
          TASK
        </text>
      </svg>
      <p className="mt-1 text-center text-sm text-[var(--kl-mid)]">
        Routing now: <span className="kl-mono text-[var(--kl-gold-deep)]">{MODELS[route]}</span> — picked by task, language, accuracy, cost & speed
      </p>
    </div>
  )
}

/** Section 6 — AI agents across the platform. */
export default function AgentsGrid() {
  const reduced = useReducedMotion()
  return (
    <section className="kl-pad-x py-[120px]" aria-label="AI agents across the platform">
      <div>
        <div className="mx-auto max-w-2xl text-center">
          <p className="kl-mono text-xs tracking-[.14em] text-[var(--kl-gold-deep)]">THE INTELLIGENCE LAYER</p>
          <h2 className="kl-h2 mt-4">An intelligent layer, not a feature.</h2>
          <p className="kl-lead mx-auto mt-5">
            Six kinds of agents run through every module — visible, accountable, and always on your side.
          </p>
        </div>

        {/* Three across, unless that would leave one card alone on the last row. */}
        <div className={`mt-14 grid gap-4 sm:grid-cols-2 ${AGENTS.length % 3 === 1 ? '' : 'lg:grid-cols-3'}`}>
          {AGENTS.map((a, i) => (
            <motion.div
              key={a.name}
              className="rounded-2xl border border-[var(--kl-paper-2)] bg-[var(--kl-surface)] p-7 transition-[transform,border-color] hover:-translate-y-0.5 hover:border-[var(--kl-gold)]"
              initial={reduced ? false : { opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.5, ease: CLOUD_EASE, delay: (i % 3) * 0.08 }}
            >
              <div className="flex items-center justify-between">
                <span className="grid h-12 w-12 place-items-center rounded-[10px]" style={{ background: MODULE_TONES[i % MODULE_TONES.length][1], color: MODULE_TONES[i % MODULE_TONES.length][0] }}>
                  <a.icon size={22} />
                </span>
                <OrbDot size={18} delay={i * 0.7} />
              </div>
              <h3 className="kl-serif mt-6 text-[22px] font-semibold leading-tight">{a.name}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-[var(--kl-mid)]">{a.body}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="kl-mono rounded-full bg-[var(--kl-paper)] px-2.5 py-1 text-[0.66rem] uppercase tracking-widest text-[var(--kl-gold-deep)]">
                  {a.chip}
                </span>
                {a.link && (
                  <Link to={a.link.to} className="text-xs font-bold text-gold-soft hover:text-gold">
                    {a.link.label}
                  </Link>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Knowledge Vault + AI Gateway note card */}
        <motion.div
          className="mt-4 grid gap-8 rounded-[20px] p-[clamp(24px,4vw,48px)] md:grid-cols-2"
          style={{ background: 'linear-gradient(160deg, var(--kl-stage-a), var(--kl-stage-b))' }}
          initial={reduced ? false : { opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.55, ease: CLOUD_EASE }}
        >
          <div>
            <div className="flex items-center gap-2.5">
              <Vault size={20} className="text-[var(--kl-gold-deep)]" />
              <h3 className="kl-serif text-[22px] font-semibold">Personal Knowledge Vault</h3>
            </div>
            <p className="mt-2 text-[15px] leading-relaxed text-[var(--kl-mid)]">
              Your documents, memories and answers — encrypted, yours, and available to your agents
              only with your explicit say-so.
            </p>
            <div className="mt-7 flex items-center gap-2.5">
              <Route size={20} className="text-[var(--kl-gold-deep)]" />
              <h3 className="kl-serif text-[22px] font-semibold">The AI Gateway</h3>
            </div>
            <p className="mt-2 max-w-md text-[15px] leading-relaxed text-[var(--kl-mid)]">
              Never hard-coded to one provider — the router picks the model by task, language,
              accuracy, cost, speed and data sensitivity: Kimi, DeepSeek and others.
            </p>
          </div>
          <GatewayRouter />
        </motion.div>
      </div>
    </section>
  )
}
