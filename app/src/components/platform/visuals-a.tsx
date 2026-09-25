import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Globe, Lock, LockOpen, EyeOff, Coins, Sparkles, MapPin, ZoomIn } from 'lucide-react'
import { cn } from '@/lib/utils'
import { VerifiedBadge, ProvenanceTag } from '@/components/ui-kit'
import { Avatar, CLOUD_EASE, LINE_EASE, ModuleGlyph, SNAP_EASE, useActiveInView } from './shared'

/* ---------- A · Social Hub — profile card with verified badge draw-in ---------- */
export function SocialHubVisual() {
  const { ref, active } = useActiveInView<HTMLDivElement>()
  return (
    <div ref={ref} className="cloud-card mx-auto w-full max-w-sm p-6">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar index={1} size={64} name="Demo K." />
          <span className="absolute -bottom-1 -right-1">{active && <VerifiedBadge size={22} />}</span>
        </div>
        <div>
          <p className="text-lg font-bold text-text-hi">Demo K.</p>
          <p className="caption">Dar es Salaam · she/her</p>
          <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[0.68rem] font-semibold text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" /> Online now
          </span>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2 text-center">
        {[
          ['1,248', 'Friends'],
          ['18.4k', 'Followers'],
          ['42', 'Life events'],
        ].map(([v, l]) => (
          <div key={l} className="rounded-card-sm bg-white/5 px-2 py-2.5">
            <p className="mono-data text-gold-soft">{v}</p>
            <p className="mt-0.5 text-[0.68rem] text-text-low">{l}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-card-sm border border-gold/25 bg-gold/5 px-3.5 py-2.5">
        <p className="text-[0.7rem] font-bold uppercase tracking-widest text-gold">Life event</p>
        <p className="mt-1 text-sm text-text-hi">Started a new chapter — opened Kariakoo studio ✦</p>
      </div>
    </div>
  )
}

/* ---------- B · Public Content — geographic drill-down zoom demo ---------- */
const DRILL_LEVELS = [
  { label: 'Global', scale: 1, x: 50, y: 50 },
  { label: 'Africa', scale: 1.9, x: 57, y: 55 },
  { label: 'East Africa', scale: 3.4, x: 63, y: 58 },
  { label: 'Tanzania', scale: 5.2, x: 66, y: 62 },
  { label: 'Dar es Salaam', scale: 7.5, x: 69, y: 64 },
]
const FULL_HIERARCHY = ['Global', 'Continent', 'Region', 'Country', 'State', 'District', 'City', 'Neighborhood']

export function PublicContentVisual() {
  const [level, setLevel] = useState(0)
  const reduced = useReducedMotion()
  const cur = DRILL_LEVELS[level]

  return (
    <div className="cloud-card mx-auto w-full max-w-sm overflow-hidden">
      {/* Map card */}
      <div className="relative h-52 overflow-hidden bg-ink-3">
        <motion.div
          className="absolute inset-0"
          style={{
            backgroundImage: 'url(/globe-dots.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
          animate={
            reduced
              ? { scale: cur.scale, x: `${50 - cur.x}%`, y: `${50 - cur.y}%` }
              : { scale: cur.scale, x: `${50 - cur.x}%`, y: `${50 - cur.y}%` }
          }
          transition={{ duration: reduced ? 0 : 0.9, ease: CLOUD_EASE }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />
        <motion.div
          className="absolute"
          style={{ left: '50%', top: '52%' }}
          animate={reduced ? undefined : { scale: [1, 1.25, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          <MapPin size={26} className="-translate-x-1/2 -translate-y-full text-gold drop-shadow-[0_0_8px_rgba(217,166,72,0.8)]" fill="currentColor" />
        </motion.div>
        {level < DRILL_LEVELS.length - 1 && (
          <button
            type="button"
            onClick={() => setLevel((l) => Math.min(l + 1, DRILL_LEVELS.length - 1))}
            className="cloud-glass absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-gold-soft hover:border-gold/50"
          >
            <ZoomIn size={13} /> Zoom in
          </button>
        )}
      </div>
      {/* Breadcrumb */}
      <div className="p-4">
        <div className="flex flex-wrap items-center gap-1">
          {DRILL_LEVELS.map((l, i) => (
            <span key={l.label} className="flex items-center gap-1">
              {i > 0 && <span className="text-text-low">→</span>}
              <button
                type="button"
                onClick={() => setLevel(i)}
                className={cn(
                  'rounded-full px-2.5 py-1 text-xs font-semibold transition-colors',
                  i === level ? 'bg-gradient-to-br from-gold-soft to-gold text-ink' : 'bg-white/5 text-text-mid hover:text-text-hi',
                )}
              >
                {l.label}
              </button>
            </span>
          ))}
        </div>
        <p className="mt-3 text-[0.7rem] leading-relaxed text-text-low">
          Full drill-down: {FULL_HIERARCHY.join(' → ')}
        </p>
      </div>
    </div>
  )
}

/* ---------- C · Forums — thread tree with AI Summary ---------- */
export function ForumsVisual() {
  const [open, setOpen] = useState(false)
  return (
    <div className="cloud-card mx-auto w-full max-w-sm p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-widest text-text-low">Forum · Kariakoo Traders</p>
        <span className="mono-data text-[0.68rem] text-text-low">214 replies</span>
      </div>
      <div className="mt-4 space-y-3">
        <div className="flex gap-2.5">
          <Avatar index={6} size={30} name="Zuberi M." />
          <div className="rounded-card-sm bg-white/5 px-3 py-2 text-sm text-text-hi">
            New import duties on textiles — how is everyone handling pricing?
          </div>
        </div>
        <div className="ml-6 border-l border-white/10 pl-4">
          <div className="flex gap-2.5">
            <Avatar index={2} size={26} name="Neema R." />
            <div className="rounded-card-sm bg-white/5 px-3 py-2 text-[0.85rem] text-text-mid">
              We split the +20% across the whole bundle instead of per item…
            </div>
          </div>
          <div className="mt-3 ml-6 border-l border-white/10 pl-4">
            <div className="flex gap-2.5">
              <Avatar index={9} size={24} name="Khalfan S." />
              <div className="rounded-card-sm bg-white/5 px-3 py-2 text-[0.82rem] text-text-mid">
                Same — buyers accept it when the math is visible.
              </div>
            </div>
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-gold-soft to-gold px-3.5 py-1.5 text-xs font-bold text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]"
      >
        <Sparkles size={13} /> AI Summary
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: CLOUD_EASE }}
            className="overflow-hidden"
          >
            <p className="mt-3 rounded-card-sm border border-gold/25 bg-gold/5 px-3.5 py-2.5 text-[0.82rem] leading-relaxed text-text-hi">
              Consensus: spread the duty across bundles, not single items. Transparency about the
              20% margin keeps buyer trust intact.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ---------- D · Circles — drag a person into a ring ---------- */
const RINGS = [
  { name: 'Family', r: 52 },
  { name: 'Close Friends', r: 92 },
  { name: 'Business', r: 132 },
  { name: 'Customers', r: 172 },
]

export function CirclesVisual() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [assigned, setAssigned] = useState<number | null>(null)
  const reduced = useReducedMotion()

  const onDragEnd = (_: unknown, info: { point: { x: number; y: number } }) => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const dx = info.point.x - (rect.left + rect.width / 2)
    const dy = info.point.y - (rect.top + rect.height / 2)
    const dist = Math.hypot(dx, dy)
    let ring = RINGS.length - 1
    for (let i = 0; i < RINGS.length; i++) {
      if (dist <= (RINGS[i].r + (RINGS[i + 1]?.r ?? RINGS[i].r + 40)) / 2) {
        ring = i
        break
      }
    }
    setAssigned(ring)
  }

  return (
    <div className="cloud-card mx-auto w-full max-w-sm p-5">
      <div ref={containerRef} className="relative mx-auto aspect-square max-w-[360px]">
        {RINGS.map((ring, i) => (
          <motion.div
            key={ring.name}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border"
            style={{ width: ring.r * 2, height: ring.r * 2 }}
            animate={{
              borderColor: assigned === i ? 'rgba(240,200,120,0.9)' : 'rgba(255,255,255,0.14)',
              boxShadow: assigned === i ? '0 0 18px rgba(217,166,72,0.35)' : '0 0 0 rgba(0,0,0,0)',
            }}
            transition={{ duration: 0.35, ease: CLOUD_EASE }}
          >
            <span className="absolute left-1/2 top-2 -translate-x-1/2 whitespace-nowrap text-[0.62rem] font-semibold uppercase tracking-widest text-text-low">
              {ring.name}
            </span>
          </motion.div>
        ))}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <Avatar index={4} size={34} name="You" />
        </div>

        {/* Draggable person chip */}
        <motion.div
          drag
          dragConstraints={containerRef}
          dragElastic={0.15}
          onDragEnd={onDragEnd}
          whileDrag={{ scale: 1.12, zIndex: 20 }}
          className="absolute cursor-grab touch-none active:cursor-grabbing"
          style={{ left: '78%', top: '6%' }}
          animate={assigned !== null && !reduced ? { scale: [1, 1.15, 1] } : undefined}
          transition={{ duration: 0.5, ease: SNAP_EASE }}
        >
          <div className="cloud-glass flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 shadow-cloud">
            <Avatar index={7} size={26} name="Zawadi J." />
            <span className="text-xs font-semibold text-text-hi">Zawadi J.</span>
          </div>
        </motion.div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="caption">
          {assigned === null ? 'Drag Zawadi into a circle →' : `Added to ${RINGS[assigned].name}`}
        </p>
        <span className="inline-flex items-center gap-1 rounded-full border border-sky/30 bg-sky/10 px-2 py-0.5 text-[0.65rem] font-bold text-sky">
          <Sparkles size={11} /> Smart Circle · AI-maintained
        </span>
      </div>
    </div>
  )
}

/* ---------- E · Communities — privacy tiers toggle lock state ---------- */
const PRIVACY = [
  { key: 'Public', icon: Globe, state: 'Open to everyone', action: 'Join community', locked: false },
  { key: 'Private', icon: Lock, state: 'Members approved by admins', action: 'Request to join', locked: true },
  { key: 'Secret', icon: EyeOff, state: 'Hidden from search · invite only', action: 'Invite required', locked: true },
  { key: 'Paid', icon: Coins, state: '$2/mo membership', action: 'Subscribe to enter', locked: true },
] as const

export function CommunitiesVisual() {
  const [tier, setTier] = useState(0)
  const cur = PRIVACY[tier]
  return (
    <div className="cloud-card mx-auto w-full max-w-sm p-5">
      <div className="flex flex-wrap gap-1.5">
        {PRIVACY.map((p, i) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setTier(i)}
            aria-pressed={tier === i}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
              tier === i ? 'bg-gradient-to-br from-gold-soft to-gold text-ink' : 'bg-white/5 text-text-mid hover:text-text-hi',
            )}
          >
            {p.key}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={cur.key}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: CLOUD_EASE }}
          className="mt-4 rounded-card-md border border-white/10 bg-ink-3/60 p-4"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo/25 text-sky">
              <ModuleGlyph id="mod-community" size={22} />
            </span>
            <div className="flex-1">
              <p className="font-semibold text-text-hi">Swahili Poetry Circle</p>
              <p className="caption">12,480 members</p>
            </div>
            <motion.span
              key={cur.key + '-icon'}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, ease: SNAP_EASE }}
              className={cn('flex h-9 w-9 items-center justify-center rounded-full', cur.locked ? 'bg-gold/15 text-gold-soft' : 'bg-success/15 text-success')}
            >
              {cur.locked ? <Lock size={16} /> : <LockOpen size={16} />}
            </motion.span>
          </div>
          <p className="mt-3 text-sm text-text-mid">{cur.state}</p>
          <button
            type="button"
            className={cn(
              'mt-3 w-full rounded-full py-2 text-sm font-bold transition-colors',
              cur.locked ? 'cloud-glass text-text-hi hover:border-gold/40' : 'bg-gradient-to-br from-gold-soft to-gold text-ink',
            )}
          >
            {cur.action}
          </button>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

/* ---------- F · Private Messenger — sealing lock draw animation ---------- */
export function MessengerVisual() {
  const { ref, active } = useActiveInView<HTMLDivElement>()
  const reduced = useReducedMotion()
  const [cycle, setCycle] = useState(0)

  useEffect(() => {
    if (!active || reduced) return
    const t = setInterval(() => setCycle((c) => c + 1), 3600)
    return () => clearInterval(t)
  }, [active, reduced])

  return (
    <div ref={ref} className="cloud-card mx-auto w-full max-w-sm p-5">
      <div className="space-y-2.5">
        <div className="max-w-[75%] rounded-2xl rounded-bl-sm bg-white/8 px-3.5 py-2.5 text-sm text-text-hi">
          Did the shipment clear customs?
        </div>
        <div className="ml-auto max-w-[75%] rounded-2xl rounded-br-sm bg-indigo/45 px-3.5 py-2.5 text-sm text-text-hi">
          Cleared this morning. Sending the ledger now — this chat deletes in 24h.
        </div>
      </div>
      {/* Lock seal */}
      <div className="mt-4 flex items-center gap-3 rounded-card-sm border border-success/25 bg-success/5 px-3.5 py-2.5">
        <svg viewBox="0 0 24 24" width={22} height={22} fill="none" aria-hidden="true">
          <motion.rect
            key={`body-${cycle}`}
            x="5"
            y="10"
            width="14"
            height="10"
            rx="2.5"
            stroke="#3FB27F"
            strokeWidth="1.8"
            initial={reduced ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.7, ease: LINE_EASE }}
          />
          <motion.path
            key={`shackle-${cycle}`}
            d="M8 10 V7.5 a4 4 0 0 1 8 0 V10"
            stroke="#F0C878"
            strokeWidth="1.8"
            strokeLinecap="round"
            initial={reduced ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.7, ease: LINE_EASE, delay: 0.5 }}
          />
        </svg>
        <div>
          <p className="text-xs font-bold text-success">End-to-end encrypted</p>
          <p className="text-[0.68rem] text-text-low">Voice & video · disappearing messages</p>
        </div>
      </div>
    </div>
  )
}

/* ---------- G · Creator Studio — One-to-Many format morph ---------- */
const FORMATS = [
  { key: 'Article', glyph: 'mod-creator', preview: 'Long-form story with pull quotes & SEO polish.' },
  { key: 'Short video', glyph: 'mod-megaphone', preview: '45s vertical cut, auto-captioned in 5 languages.' },
  { key: 'Long video', glyph: 'mod-calendar', preview: '12-minute chaptered edit with intro sting.' },
  { key: 'Audio', glyph: 'mod-message', preview: 'Podcast episode with cleaned levels & show notes.' },
  { key: 'Carousel', glyph: 'mod-globe-grid', preview: '8-slide visual summary for the feed.' },
  { key: 'Newsletter', glyph: 'mod-coins', preview: 'Email edition to 4,200 subscribers, translated.' },
]

export function CreatorStudioVisual() {
  const { ref, active } = useActiveInView<HTMLDivElement>()
  const reduced = useReducedMotion()
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (!active || reduced) return
    const t = setInterval(() => setIdx((i) => (i + 1) % FORMATS.length), 2200)
    return () => clearInterval(t)
  }, [active, reduced])

  return (
    <div ref={ref} className="cloud-card mx-auto w-full max-w-sm p-5">
      <p className="text-xs font-bold uppercase tracking-widest text-text-low">One idea → every format</p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {FORMATS.map((f, i) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setIdx(i)}
            className={cn(
              'relative flex flex-col items-center gap-1.5 rounded-card-sm px-2 py-3 text-center transition-colors',
              idx === i ? 'text-ink' : 'text-text-mid hover:text-text-hi',
            )}
          >
            {idx === i && (
              <motion.span
                layoutId="format-morph-pill"
                className="absolute inset-0 rounded-card-sm bg-gradient-to-br from-gold-soft to-gold shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]"
                transition={{ duration: 0.56, ease: CLOUD_EASE }}
              />
            )}
            <span className="relative"><ModuleGlyph id={f.glyph} size={20} className={idx === i ? 'text-ink' : undefined} /></span>
            <span className="relative text-[0.66rem] font-bold leading-tight">{f.key}</span>
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.p
          key={idx}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.32, ease: CLOUD_EASE }}
          className="mt-4 rounded-card-sm border border-white/10 bg-ink-3/60 px-3.5 py-2.5 text-[0.82rem] text-text-mid"
        >
          {FORMATS[idx].preview}
        </motion.p>
      </AnimatePresence>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {['EN', 'SW', 'FR', 'AR', '中文'].map((l) => (
          <span key={l} className="rounded-full border border-sky/30 bg-sky/10 px-2 py-0.5 text-[0.65rem] font-bold text-sky">
            {l}
          </span>
        ))}
        <ProvenanceTag kind="ai-assisted" />
      </div>
    </div>
  )
}

/* ---------- H · Family Tree — 9-node level bloom ---------- */
const TREE_NODES: Array<{ id: number; gen: number; x: number; y: number }> = [
  { id: 0, gen: 0, x: 120, y: 30 }, { id: 1, gen: 0, x: 240, y: 30 },
  { id: 2, gen: 1, x: 70, y: 110 }, { id: 3, gen: 1, x: 160, y: 110 }, { id: 4, gen: 1, x: 250, y: 110 }, { id: 5, gen: 1, x: 320, y: 110 },
  { id: 6, gen: 2, x: 90, y: 190 }, { id: 7, gen: 2, x: 180, y: 190 }, { id: 8, gen: 2, x: 270, y: 190 },
]
const TREE_EDGES: Array<[number, number]> = [[0, 2], [0, 3], [1, 3], [1, 4], [1, 5], [2, 6], [3, 7], [4, 8]]

export function FamilyTreeVisual() {
  const reduced = useReducedMotion()
  return (
    <div className="cloud-card mx-auto w-full max-w-sm p-5">
      <svg viewBox="0 0 360 230" className="w-full" role="img" aria-label="Nine-node verified family tree across three generations">
        {TREE_EDGES.map(([a, b], i) => {
          const pa = TREE_NODES[a]
          const pb = TREE_NODES[b]
          return (
            <motion.path
              key={`${a}-${b}`}
              d={`M ${pa.x} ${pa.y + 16} Q ${(pa.x + pb.x) / 2} ${(pa.y + pb.y) / 2} ${pb.x} ${pb.y - 16}`}
              fill="none"
              stroke="url(#tree-arc)"
              strokeWidth="1.4"
              initial={reduced ? false : { pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.7, ease: LINE_EASE, delay: 0.3 + i * 0.08 }}
            />
          )
        })}
        <defs>
          <linearGradient id="tree-arc" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#F0C878" />
            <stop offset="1" stopColor="#D9A648" />
          </linearGradient>
        </defs>
        {TREE_NODES.map((n) => (
          <motion.g
            key={n.id}
            initial={reduced ? false : { scale: 0, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1], delay: n.gen * 0.28 + (n.id % 3) * 0.07 }}
            style={{ transformOrigin: `${n.x}px ${n.y}px` }}
          >
            <circle cx={n.x} cy={n.y} r={15} fill="rgba(255,255,255,0.07)" stroke={n.gen === 2 ? 'rgba(240,200,120,0.7)' : 'rgba(255,255,255,0.2)'} strokeWidth="1.2" />
            <text x={n.x} y={n.y + 4} textAnchor="middle" fill={n.gen === 2 ? '#F0C878' : '#A7ACBF'} fontSize="9" fontWeight="700" fontFamily="'JetBrains Mono', monospace">
              L{n.gen + 1}
            </text>
          </motion.g>
        ))}
      </svg>
      <div className="mt-2 flex items-center justify-between">
        <p className="caption">3 generations · verified by 7 members</p>
        <Link to="/family" className="text-sm font-semibold text-gold-soft hover:text-gold">
          Explore Family Tree →
        </Link>
      </div>
    </div>
  )
}
