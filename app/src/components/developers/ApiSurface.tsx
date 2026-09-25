import { motion } from 'framer-motion'
import { Braces, Radio, KeyRound, Store } from 'lucide-react'
import { cn } from '@/lib/utils'

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

/** Mini-diagram 1: endpoint tree. */
function EndpointTree() {
  const rows = [
    ['GET', '/v1/users/:id', 'text-sky'],
    ['POST', '/v1/posts', 'text-success'],
    ['GET', '/v1/family-tree/:id/path', 'text-sky'],
    ['POST', '/v1/memorials/:id/tributes', 'text-success'],
    ['GET', '/v1/marketplace/orders', 'text-sky'],
  ]
  return (
    <div className="space-y-1.5 font-mono text-[0.7rem]">
      {rows.map(([m, p, c], i) => (
        <motion.div
          key={p}
          className="flex items-center gap-2"
          initial={{ opacity: 0.55 }}
          whileHover={{ opacity: 1, x: 4 }}
          transition={{ delay: i * 0.04, duration: 0.25 }}
        >
          <span className={cn('w-10 font-semibold', c)}>{m}</span>
          <span className="text-text-mid">{p}</span>
        </motion.div>
      ))}
    </div>
  )
}

/** Mini-diagram 2: webhook pulse lines. */
function WebhookPulses() {
  const events = ['follower.created', 'tribute.lit', 'order.paid', 'verification.changed']
  return (
    <div className="space-y-2">
      {events.map((e, i) => (
        <div key={e} className="flex items-center gap-2.5">
          <span className="relative h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
            <motion.span
              className="absolute inset-y-0 w-4 rounded-full bg-gradient-to-r from-gold-soft to-sky"
              animate={{ x: ['-16px', '64px'] }}
              transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.4, ease: 'easeInOut' }}
            />
          </span>
          <span className="font-mono text-[0.68rem] text-text-mid">{e}</span>
        </div>
      ))}
    </div>
  )
}

/** Mini-diagram 3: OAuth consent screen mock. */
function ConsentMock() {
  const scopes = [
    ['Read your profile', true],
    ['Read family tree (L1–L2)', true],
    ['Post on your behalf', false],
  ] as const
  return (
    <div className="rounded-card-sm border border-white/10 bg-ink/60 p-3">
      <p className="mb-2 text-[0.68rem] font-semibold text-text-hi">
        <span className="text-gold">Nia App</span> requests access
      </p>
      <div className="space-y-1.5">
        {scopes.map(([s, on]) => (
          <div key={s} className="flex items-center justify-between gap-3 text-[0.68rem] text-text-mid">
            <span>{s}</span>
            <span
              className={cn(
                'relative h-3.5 w-7 rounded-full transition-colors',
                on ? 'bg-gold/80' : 'bg-white/15',
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 h-2.5 w-2.5 rounded-full bg-ink transition-all',
                  on ? 'end-0.5' : 'start-0.5 bg-white/60',
                )}
              />
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2.5 flex gap-2">
        <span className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-2.5 py-1 text-[0.62rem] font-bold text-ink">Allow</span>
        <span className="rounded-full border border-white/15 px-2.5 py-1 text-[0.62rem] font-semibold text-text-mid">Deny</span>
      </div>
    </div>
  )
}

/** Mini-diagram 4: storefront tile + revenue share. */
function StorefrontTile() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 rounded-card-sm border border-white/10 bg-ink/60 p-3">
        <div className="mb-2 h-9 rounded-sm bg-gradient-to-br from-indigo/60 to-sky/30" />
        <p className="text-[0.68rem] font-semibold text-text-hi">TransitBoard</p>
        <p className="font-mono text-[0.62rem] text-text-low">★ 4.9 · 12.4k installs</p>
      </div>
      <div className="w-24 rounded-card-sm border border-gold/30 bg-gold/10 p-2.5 text-center">
        <p className="font-mono text-[0.6rem] uppercase tracking-wider text-gold-soft">You keep</p>
        <p className="font-mono text-lg font-semibold text-gold-grad">80%</p>
      </div>
    </div>
  )
}

const CARDS = [
  {
    icon: Braces,
    title: 'REST & GraphQL',
    body: 'Every module reachable — typed schemas, cursor pagination, and one GraphQL endpoint that mirrors the whole society graph.',
    diagram: <EndpointTree />,
  },
  {
    icon: Radio,
    title: 'Webhooks',
    body: 'Subscribe to platform events: new follower, memorial tribute, order paid, verification state changes — signed and replayable.',
    diagram: <WebhookPulses />,
  },
  {
    icon: KeyRound,
    title: 'OAuth 2.0 / OIDC',
    body: 'Scoped, user-consented access. Granular permission screens your users can actually read — and revoke.',
    diagram: <ConsentMock />,
  },
  {
    icon: Store,
    title: 'App Marketplace',
    body: 'Distribute your app to every Kinjy member. Transparent 80/20 revenue share, settled monthly on the immutable ledger.',
    diagram: <StorefrontTile />,
  },
]

/** Section 2 — API surface: 4 capability cards with animated mini-diagrams. */
export default function ApiSurface() {
  return (
    <section id="api-surface" className="noise-overlay relative bg-ink px-6 py-24 md:py-28">
      <div className="mx-auto max-w-container">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-15%' }}
          transition={{ duration: 0.5, ease: EASE }}
          className="eyebrow text-sky"
        >
          API surface
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-15%' }}
          transition={{ duration: 0.6, ease: EASE }}
          className="h2 mt-4 max-w-2xl"
        >
          One society, <span className="text-gold-grad">four doors in.</span>
        </motion.h2>

        <div className="mt-14 grid gap-6 sm:grid-cols-2">
          {CARDS.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 36 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-12%' }}
              transition={{ delay: i * 0.08, duration: 0.55, ease: EASE }}
              whileHover="hover"
              className="cloud-card cloud-card-hover group p-6"
            >
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-card-sm border border-gold/25 bg-gold/10 text-gold-soft">
                  <c.icon size={20} aria-hidden="true" />
                </span>
                <h3 className="h3">{c.title}</h3>
              </div>
              <p className="mb-5 text-sm leading-relaxed text-text-mid">{c.body}</p>
              <motion.div
                variants={{ hover: { scale: 1.02 } }}
                transition={{ duration: 0.3, ease: EASE }}
                className="rounded-card-md border border-white/10 bg-ink-2/50 p-3.5"
              >
                {c.diagram}
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
