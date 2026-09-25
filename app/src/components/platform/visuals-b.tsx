import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { QrCode } from 'lucide-react'
import { CandleFlowerWidget } from '@/components/ui-kit'
import { CLOUD_EASE, ModuleGlyph, OrbDot, useActiveInView } from './shared'

/* ---------- I · Digital Graveyard — paper card with candle ---------- */
export function GraveyardVisual() {
  return (
    <div className="mx-auto w-full max-w-sm overflow-hidden rounded-card-lg bg-paper text-paper-ink shadow-cloud">
      <div className="flex items-center gap-4 p-5">
        <CandleFlowerWidget kind="candle" tier="premium" className="[&_.caption]:text-paper-ink/60" />
        <div>
          <p className="font-display text-xl font-medium">Mwalimu J. Mwangi</p>
          <p className="mono-data mt-1 text-xs text-paper-ink/60">1942 — 2021</p>
          <p className="mt-2 font-display text-sm italic text-paper-ink/75">
            “He planted trees whose shade he never sat in.”
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-paper-ink/10 bg-paper-2 px-5 py-3">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-paper-ink/70">
          <QrCode size={14} /> QR-linked memorial stone
        </span>
        <Link to="/memorials" className="text-sm font-bold text-[#8a6420] hover:underline">
          Visit Memorials →
        </Link>
      </div>
    </div>
  )
}

/* ---------- J · Events — calendar tile flip ---------- */
export function EventsVisual() {
  const { ref, active } = useActiveInView<HTMLDivElement>()
  const reduced = useReducedMotion()
  const [flipped, setFlipped] = useState(false)

  useEffect(() => {
    if (!active || reduced) return
    const t = setInterval(() => setFlipped((f) => !f), 3500)
    return () => clearInterval(t)
  }, [active, reduced])

  return (
    <div ref={ref} className="cloud-card mx-auto flex w-full max-w-sm flex-col items-center p-6">
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        aria-label="Flip event tile"
        className="relative h-44 w-40 [perspective:900px]"
      >
        <motion.div
          className="absolute inset-0 [transform-style:preserve-3d]"
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.7, ease: CLOUD_EASE }}
        >
          {/* Front — calendar tile */}
          <div className="absolute inset-0 flex flex-col overflow-hidden rounded-card-md border border-white/15 bg-ink-3 [backface-visibility:hidden]">
            <div className="bg-coral/85 py-1.5 text-center text-xs font-bold uppercase tracking-widest text-ink">June</div>
            <div className="flex flex-1 flex-col items-center justify-center">
              <span className="font-display text-6xl font-medium text-text-hi">14</span>
              <span className="caption mt-1">Saturday</span>
            </div>
          </div>
          {/* Back — event card */}
          <div className="absolute inset-0 flex flex-col justify-between rounded-card-md border border-gold/35 bg-gradient-to-br from-indigo-deep to-ink-3 p-4 [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-widest text-gold">Public event</p>
              <p className="mt-1.5 font-semibold leading-snug text-text-hi">Makumbusho Night Market</p>
              <p className="caption mt-1">Ubungo · 18:00 EAT</p>
            </div>
            <div>
              <p className="mono-data text-xs text-gold-soft">214 going · 892 interested</p>
              <span className="mt-2 block rounded-full bg-gradient-to-br from-gold-soft to-gold py-1.5 text-center text-xs font-bold text-ink">
                RSVP · Free entry
              </span>
            </div>
          </div>
        </motion.div>
      </button>
      <p className="caption mt-4">Ticketing · RSVPs · smart reminders</p>
    </div>
  )
}

/* ---------- K · Marketplace — $100 + $20 margin = $120 count-up ---------- */
function useCountUp(target: number, run: boolean, duration = 1100) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!run) return
    let raf = 0
    const start = performance.now()
    const tick = (t: number) => {
      const p = Math.min((t - start) / duration, 1)
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, run, duration])
  return value
}

export function MarketplaceVisual() {
  const { ref, active } = useActiveInView<HTMLDivElement>()
  const reduced = useReducedMotion()
  const [cycle, setCycle] = useState(0)

  useEffect(() => {
    if (!active || reduced) return
    const t = setInterval(() => setCycle((c) => c + 1), 4200)
    return () => clearInterval(t)
  }, [active, reduced])

  const run = active && !reduced
  const base = useCountUp(100, run, 1100)
  const margin = useCountUp(20, run, 1400)
  const total = useCountUp(120, run, 1700)
  void cycle

  return (
    <div ref={ref} className="cloud-card mx-auto w-full max-w-sm p-6">
      <p className="text-xs font-bold uppercase tracking-widest text-text-low">The transparent margin</p>
      <div className="mt-5 flex items-end justify-center gap-3">
        <div className="text-center">
          <p className="mono-data text-3xl text-text-hi">${base}</p>
          <p className="mt-1 text-[0.65rem] uppercase tracking-widest text-text-low">Seller price</p>
        </div>
        <span className="pb-5 text-xl text-text-low">+</span>
        <div className="text-center">
          <p className="mono-data text-3xl text-gold-soft">${margin}</p>
          <p className="mt-1 text-[0.65rem] uppercase tracking-widest text-gold/80">20% margin</p>
        </div>
        <span className="pb-5 text-xl text-text-low">=</span>
        <div className="text-center">
          <p className="mono-data text-3xl font-semibold text-success">${total}</p>
          <p className="mt-1 text-[0.65rem] uppercase tracking-widest text-text-low">Buyer pays</p>
        </div>
      </div>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/5">
        <div className="flex h-full">
          <motion.div
            className="h-full bg-sky/70"
            initial={{ width: 0 }}
            whileInView={{ width: '83.3%' }}
            viewport={{ once: true }}
            transition={{ duration: 1.1, ease: CLOUD_EASE }}
          />
          <motion.div
            className="h-full bg-gradient-to-r from-gold-soft to-gold"
            initial={{ width: 0 }}
            whileInView={{ width: '16.7%' }}
            viewport={{ once: true }}
            transition={{ duration: 1.1, ease: CLOUD_EASE, delay: 0.3 }}
          />
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <Link to="/commerce" className="text-sm font-semibold text-gold-soft hover:text-gold">
          Explore Commerce →
        </Link>
      </div>
    </div>
  )
}

/* ---------- L · Advertising — budget slider → reach estimate ---------- */
export function AdsVisual() {
  const [budget, setBudget] = useState(50)
  const reach = budget * 2000 // $0.50 CPM → 2,000 impressions per $1
  return (
    <div className="cloud-card mx-auto w-full max-w-sm p-6">
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-bold uppercase tracking-widest text-text-low">Campaign budget</p>
        <span className="rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[0.65rem] font-bold text-gold-soft">
          floor $0.50 CPM
        </span>
      </div>
      <p className="mono-data mt-4 text-4xl text-text-hi">
        ${budget}
        <span className="ml-2 text-sm text-text-low">/ day</span>
      </p>
      <input
        type="range"
        min={10}
        max={500}
        step={10}
        value={budget}
        onChange={(e) => setBudget(Number(e.target.value))}
        aria-label="Daily campaign budget"
        className="mt-4 w-full accent-gold"
      />
      <div className="mt-4 rounded-card-sm border border-sky/25 bg-sky/5 px-4 py-3">
        <p className="text-[0.68rem] uppercase tracking-widest text-sky">Estimated reach</p>
        <AnimatePresence mode="popLayout">
          <motion.p
            key={reach}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: CLOUD_EASE }}
            className="mono-data mt-1 text-2xl text-text-hi"
          >
            ≈ {reach.toLocaleString()} people
          </motion.p>
        </AnimatePresence>
        <p className="mt-1 text-[0.7rem] text-text-low">within 20 km of Dar es Salaam · AI-built creative</p>
      </div>
      <div className="mt-4 flex justify-end">
        <Link to="/commerce" className="text-sm font-semibold text-gold-soft hover:text-gold">
          Advertising Engine →
        </Link>
      </div>
    </div>
  )
}

/* ---------- M · Commission & Earnings waterfall ---------- */
/* The creator is paid out of the gross; the commission and the Leaders pool are
   percentages of what Kinjy retains, which is why they read as 12 and 3 here. */
const WATERFALL = [
  { label: 'Creator', pct: 40, color: 'bg-sky/80' },
  { label: 'Their sponsor', pct: 12, color: 'bg-gold-soft' },
  { label: 'Kinjy Leaders', pct: 3, color: 'bg-gold/80' },
  { label: 'Kinjy', pct: 45, color: 'bg-indigo/90' },
]

export function AffiliateVisual() {
  return (
    <div className="cloud-card mx-auto w-full max-w-sm p-6">
      <p className="text-xs font-bold uppercase tracking-widest text-text-low">Every $100 of creator revenue</p>
      <div className="mt-5 flex h-9 overflow-hidden rounded-full bg-white/5">
        {WATERFALL.map((w, i) => (
          <motion.div
            key={w.label}
            className={`flex h-full items-center justify-center ${w.color}`}
            initial={{ width: 0 }}
            whileInView={{ width: `${w.pct}%` }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.8, ease: CLOUD_EASE, delay: i * 0.15 }}
          >
            <span className="mono-data text-[0.62rem] font-semibold text-ink">{w.pct}%</span>
          </motion.div>
        ))}
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-2">
        {WATERFALL.map((w) => (
          <li key={w.label} className="flex items-center gap-2 text-xs text-text-mid">
            <span className={`h-2.5 w-2.5 rounded-full ${w.color}`} />
            {w.label} <span className="mono-data text-text-low">{w.pct}%</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap gap-1.5">
        <span className="rounded-full border border-gold/30 bg-gold/10 px-2.5 py-1 text-[0.68rem] font-bold text-gold-soft">
          Kinjy Leaders · monthly snapshots
        </span>
        <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[0.68rem] font-semibold text-text-mid">
          KYC-gated payouts
        </span>
      </div>
    </div>
  )
}

/* ---------- N · AI Intelligence Layer — orb cluster ---------- */
const ORB_LINKS = [
  { glyph: 'mod-home', label: 'Personal', x: 40, y: 30 },
  { glyph: 'mod-creator', label: 'Creator agents', x: 320, y: 30 },
  { glyph: 'mod-community', label: 'Community mgrs', x: 20, y: 170 },
  { glyph: 'mod-forums', label: 'Forum assistants', x: 340, y: 170 },
  { glyph: 'mod-coins', label: 'Knowledge vaults', x: 190, y: 215 },
]

export function AILayerVisual() {
  const reduced = useReducedMotion()
  return (
    <div className="cloud-card mx-auto w-full max-w-sm p-4">
      <svg viewBox="0 0 380 250" className="w-full" role="img" aria-label="Five AI orbs linked by arcs to platform modules">
        {ORB_LINKS.map((l, i) => (
          <motion.path
            key={l.label}
            d={`M 190 118 Q ${(190 + l.x) / 2} ${(118 + l.y) / 2 - 24} ${l.x} ${l.y}`}
            fill="none"
            stroke="url(#ai-arc)"
            strokeWidth="1.1"
            initial={reduced ? false : { pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.9, ease: [0.65, 0, 0.35, 1], delay: i * 0.14 }}
            opacity="0.65"
          />
        ))}
        <defs>
          <linearGradient id="ai-arc" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#8FB8E8" />
            <stop offset="1" stopColor="#F0C878" />
          </linearGradient>
        </defs>
        {ORB_LINKS.map((l) => (
          <g key={`chip-${l.label}`}>
            <circle cx={l.x} cy={l.y} r={19} fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.18)" />
            <foreignObject x={l.x - 10} y={l.y - 10} width={20} height={20} className="pointer-events-none">
              <ModuleGlyph id={l.glyph} size={20} />
            </foreignObject>
            <text x={l.x} y={l.y + 34} textAnchor="middle" fill="#A7ACBF" fontSize="10" fontWeight="600" fontFamily="Manrope, sans-serif">
              {l.label}
            </text>
          </g>
        ))}
        <foreignObject x={168} y={96} width={44} height={44} className="pointer-events-none">
          <OrbDot size={44} />
        </foreignObject>
      </svg>
      <p className="caption px-2 pb-1 text-center">Five agent types, one intelligence layer — never a bolt-on.</p>
    </div>
  )
}

/* ---------- O · Developer Platform — mono code fragment ---------- */
export function DevVisual() {
  return (
    <div className="cloud-card mx-auto w-full max-w-sm overflow-hidden">
      <div className="flex items-center gap-1.5 border-b border-white/10 bg-ink-3/70 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
        <span className="mono-data ml-2 text-[0.68rem] text-text-low">agent.ts</span>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[0.78rem] leading-relaxed">
        <code>
          <span className="text-gold-soft">const</span> <span className="text-text-hi">agent</span>{' '}
          <span className="text-text-low">=</span> <span className="text-sky">kaluta</span>
          <span className="text-text-low">.</span>
          <span className="text-gold-soft">agents</span>
          <span className="text-text-low">.</span>
          <span className="text-sky">create</span>
          <span className="text-gold">{'({'}</span>
          {'\n  '}<span className="text-text-hi">scope</span>
          <span className="text-text-low">:</span> <span className="text-success">"community.moderation"</span>
          <span className="text-text-low">,</span>
          {'\n  '}<span className="text-text-hi">via</span>
          <span className="text-text-low">:</span> <span className="text-gold">[</span>
          <span className="text-success">"REST"</span>
          <span className="text-text-low">,</span> <span className="text-success">"GraphQL"</span>
          <span className="text-text-low">,</span> <span className="text-success">"webhooks"</span>
          <span className="text-gold">]</span>
          <span className="text-text-low">,</span>
          {'\n  '}<span className="text-text-hi">approvals</span>
          <span className="text-text-low">:</span> <span className="text-success">"human-in-the-loop"</span>
          {'\n'}<span className="text-gold">{'})'}</span>
        </code>
      </pre>
      <div className="flex items-center justify-between border-t border-white/10 bg-ink-3/50 px-4 py-3">
        <span className="caption">Agent-readable APIs · OAuth</span>
        <Link to="/developers" className="text-sm font-semibold text-gold-soft hover:text-gold">
          Developer Platform →
        </Link>
      </div>
    </div>
  )
}
