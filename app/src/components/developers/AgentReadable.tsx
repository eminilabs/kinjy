import { motion } from 'framer-motion'
import { BookOpenText, HandCoins, Vault } from 'lucide-react'

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

/** Orb glyph used in the agent-readable visuals. */
function Orb({ size = 34 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block rounded-full"
      style={{
        width: size,
        height: size,
        background: 'var(--grad-orb)',
        filter: 'blur(0.6px) drop-shadow(0 0 10px rgba(74,82,224,0.5))',
      }}
    />
  )
}

/** Visual 1: orb reading a schema document, arcs to endpoint glyphs. */
function SemanticVisual() {
  return (
    <div className="relative flex h-40 items-center justify-center">
      <Orb size={38} />
      <div className="ms-4 rounded-card-sm border border-white/15 bg-ink/60 p-2.5 font-mono text-[0.62rem] leading-relaxed text-text-mid">
        <p><span className="text-gold">"capabilities"</span>: [</p>
        <p>&nbsp;&nbsp;<span className="text-success">"posts.create"</span>,</p>
        <p>&nbsp;&nbsp;<span className="text-success">"family.path.find"</span>,</p>
        <p>&nbsp;&nbsp;<span className="text-success">"tributes.light"</span></p>
        <p>]</p>
      </div>
      {/* arcs to endpoint glyphs */}
      <svg viewBox="0 0 200 60" className="absolute -bottom-1 left-1/2 h-12 w-52 -translate-x-1/2" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <motion.path
            key={i}
            d={`M ${60 + i * 40} 0 Q ${60 + i * 40} 28 ${40 + i * 60} 46`}
            fill="none"
            stroke="url(#agent-arc)"
            strokeWidth="1.4"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 + i * 0.2, duration: 0.9, ease: [0.65, 0, 0.35, 1] }}
          />
        ))}
        <defs>
          <linearGradient id="agent-arc" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#F0C878" />
            <stop offset="55%" stopColor="#D9A648" />
            <stop offset="100%" stopColor="#8FB8E8" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute -bottom-3 left-1/2 flex -translate-x-1/2 gap-7">
        {['{}', '</>', '⇄'].map((g) => (
          <span key={g} className="rounded-sm border border-gold/30 bg-ink/70 px-1.5 py-0.5 font-mono text-[0.6rem] text-gold-soft">{g}</span>
        ))}
      </div>
    </div>
  )
}

/** Visual 2: license token exchanging hands between two orbs (6s arc loop). */
function LicenseVisual() {
  return (
    <div className="relative flex h-40 items-center justify-between px-8">
      <Orb size={34} />
      <svg viewBox="0 0 160 60" className="absolute inset-x-6 top-1/2 h-14 -translate-y-1/2" aria-hidden="true">
        <path id="license-arc" d="M 8 44 Q 80 -18 152 44" fill="none" stroke="rgba(217,166,72,0.25)" strokeWidth="1.2" strokeDasharray="3 4" />
      </svg>
      <motion.span
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 flex h-7 w-7 items-center justify-center rounded-full border border-gold/50 bg-ink font-mono text-[0.55rem] text-gold-soft shadow-[0_0_14px_rgba(217,166,72,0.4)]"
        animate={{ x: [-56, 56, -56], y: [-16, -16, -16] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      >
        lic
      </motion.span>
      <Orb size={34} />
      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 font-mono text-[0.6rem] text-text-low">
        rate-limited · paid · creator opt-in
      </span>
    </div>
  )
}

/** Visual 3: vault door with a scope-token key that turns on view. */
function VaultVisual() {
  return (
    <div className="relative flex h-40 items-center justify-center gap-6">
      <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-2 border-white/15 bg-gradient-to-br from-ink-3 to-ink">
        <span className="absolute inset-2 rounded-full border border-gold/25" aria-hidden="true" />
        <motion.span
          aria-hidden="true"
          className="h-1.5 w-10 rounded-full bg-gradient-to-r from-gold-soft to-gold"
          initial={{ rotate: 0 }}
          whileInView={{ rotate: 90 }}
          viewport={{ once: true, margin: '-30%' }}
          transition={{ delay: 0.5, duration: 0.8, ease: [0.65, 0, 0.35, 1] }}
          style={{ transformOrigin: 'center' }}
        />
        <span className="absolute h-3 w-3 rounded-full bg-gold" aria-hidden="true" />
      </div>
      <div className="space-y-1.5 font-mono text-[0.62rem] text-text-mid">
        <p><span className="text-gold-soft">scope:</span> vault.read.recipes</p>
        <p><span className="text-gold-soft">granted:</span> 2025-11-02 → +30d</p>
        <p><span className="text-success">✓ explicit member consent</span></p>
      </div>
    </div>
  )
}

const COLUMNS = [
  {
    icon: BookOpenText,
    title: 'Semantic APIs',
    body: 'Self-describing endpoints with machine-readable capability manifests. An agent can discover what Kinjy can do — no human glue code required.',
    visual: <SemanticVisual />,
  },
  {
    icon: HandCoins,
    title: 'Licensing & paid AI access',
    body: 'Content access for external agents is licensed, rate-limited and paid. Creators opt in — and earn every time an agent learns from their work.',
    visual: <LicenseVisual />,
  },
  {
    icon: Vault,
    title: 'Your Personal Knowledge Vault',
    body: 'Every member’s private, permissioned knowledge store. Agents query it only with explicit scope grants — visible, expiring, revocable.',
    visual: <VaultVisual />,
  },
]

/** Section 4 — The agent-readable platform (refinement #18). */
export default function AgentReadable() {
  return (
    <section className="twilight-field noise-overlay relative px-6 py-24 md:py-32">
      <div className="mx-auto max-w-container">
        <motion.h2
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-15%' }}
          transition={{ duration: 0.65, ease: EASE }}
          className="h2 mx-auto max-w-3xl text-center"
        >
          APIs for people who use agents —{' '}
          <span className="text-arc-grad">and agents that use APIs.</span>
        </motion.h2>

        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {COLUMNS.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 44 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-12%' }}
              transition={{ delay: i * 0.1, duration: 0.6, ease: EASE }}
              className="cloud-card cloud-card-hover flex flex-col p-7"
            >
              <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-card-sm border border-sky/25 bg-sky/10 text-sky">
                <c.icon size={20} aria-hidden="true" />
              </span>
              <h3 className="h3 mb-3">{c.title}</h3>
              <p className="mb-6 flex-1 text-sm leading-relaxed text-text-mid">{c.body}</p>
              <div className="rounded-card-md border border-white/10 bg-ink-2/40">{c.visual}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
