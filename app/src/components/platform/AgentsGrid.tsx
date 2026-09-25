import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { motion, useReducedMotion } from 'framer-motion'
import { UserRound, Compass, Bot, ShieldCheck, MessagesSquare, LibraryBig, Vault, Route } from 'lucide-react'
import { CLOUD_EASE, OrbDot, useActiveInView } from './shared'

const AGENTS = [
  {
    icon: UserRound,
    name: 'Personal AI Assistant',
    body: 'One per user — knows your language, your circles, your algorithm choices. Yours alone.',
    chip: '1 : 1 with you',
  },
  {
    icon: Compass,
    name: 'Kinjy Assistant',
    body: 'The platform expert. Answers with written guides or video walkthroughs, in your language.',
    chip: 'Platform expert',
    link: { label: 'Meet the Assistant →', to: '/assistant' },
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
                stroke={hot ? '#F0C878' : 'rgba(255,255,255,0.14)'}
                strokeWidth={hot ? 1.8 : 1.1}
                style={{ transition: 'stroke 420ms ease', filter: hot ? 'drop-shadow(0 0 6px rgba(240,200,120,0.55))' : undefined }}
              />
              {hot && !reduced && (
                <motion.circle
                  key={`pulse-${route}`}
                  r={4}
                  fill="#F0C878"
                  initial={{ cx: 210, cy: 40, opacity: 1 }}
                  animate={{ cx: t.x, cy: t.y - 18, opacity: [1, 1, 0] }}
                  transition={{ duration: 1.1, ease: [0.65, 0, 0.35, 1] }}
                />
              )}
              <circle
                cx={t.x}
                cy={t.y}
                r={20}
                fill={hot ? 'rgba(217,166,72,0.18)' : 'rgba(255,255,255,0.06)'}
                stroke={hot ? 'rgba(240,200,120,0.8)' : 'rgba(255,255,255,0.18)'}
                style={{ transition: 'all 420ms ease' }}
              />
              <text x={t.x} y={t.y + 38} textAnchor="middle" fill={hot ? '#F0C878' : '#A7ACBF'} fontSize="12" fontWeight="700" fontFamily="'JetBrains Mono', monospace" style={{ transition: 'fill 420ms ease' }}>
                {MODELS[i]}
              </text>
            </g>
          )
        })}
        <circle cx={210} cy={40} r={22} fill="rgba(74,82,224,0.25)" stroke="rgba(143,184,232,0.6)" strokeWidth="1.4" />
        <text x={210} y={44} textAnchor="middle" fill="#F4F2EE" fontSize="10.5" fontWeight="700" fontFamily="'JetBrains Mono', monospace">
          TASK
        </text>
      </svg>
      <p className="caption mt-1 text-center">
        Routing now: <span className="mono-data text-gold-soft">{MODELS[route]}</span> — picked by task, language, accuracy, cost & speed
      </p>
    </div>
  )
}

/** Section 6 — AI agents across the platform. */
export default function AgentsGrid() {
  const reduced = useReducedMotion()
  return (
    <section className="px-6 py-24 md:py-32" aria-label="AI agents across the platform">
      <div className="mx-auto max-w-container">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow text-sky">The Intelligence Layer</p>
          <h2 className="h2 mt-4">An intelligent layer, not a feature.</h2>
          <p className="body-lg mt-4 text-text-mid">
            Six kinds of agents run through every module — visible, accountable, and always on your side.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {AGENTS.map((a, i) => (
            <motion.div
              key={a.name}
              className="cloud-card cloud-card-hover p-6"
              initial={reduced ? false : { opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.5, ease: CLOUD_EASE, delay: (i % 3) * 0.08 }}
            >
              <div className="flex items-center justify-between">
                <span className="cloud-glass flex h-11 w-11 items-center justify-center rounded-full text-sky">
                  <a.icon size={20} />
                </span>
                <OrbDot size={18} delay={i * 0.7} />
              </div>
              <h3 className="mt-4 font-semibold text-text-hi">{a.name}</h3>
              <p className="caption mt-2 leading-relaxed">{a.body}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="rounded-full border border-sky/30 bg-sky/10 px-2.5 py-1 text-[0.66rem] font-bold uppercase tracking-widest text-sky">
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
          className="cloud-card mt-8 grid gap-8 p-8 md:grid-cols-2"
          initial={reduced ? false : { opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.55, ease: CLOUD_EASE }}
        >
          <div>
            <div className="flex items-center gap-2.5">
              <Vault size={20} className="text-gold" />
              <h3 className="font-semibold text-text-hi">Personal Knowledge Vault</h3>
            </div>
            <p className="caption mt-2 leading-relaxed">
              Your documents, memories and answers — encrypted, yours, and available to your agents
              only with your explicit say-so.
            </p>
            <div className="mt-5 flex items-center gap-2.5">
              <Route size={20} className="text-gold" />
              <h3 className="font-semibold text-text-hi">The AI Gateway</h3>
            </div>
            <p className="caption mt-2 max-w-md leading-relaxed">
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
