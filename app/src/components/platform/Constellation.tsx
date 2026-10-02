import { useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CONSTELLATION_EDGES, MODULES, MODULE_BY_LETTER, connectionNames } from './data'
import { Avatar, CLOUD_EASE, ModuleGlyph } from './shared'
import { MODULE_TONES } from './tones'

const CX = 400
const CY = 400
const R = 292

function nodePos(index: number) {
  // Start at top (-90°) and distribute evenly
  const a = (index / MODULES.length) * Math.PI * 2 - Math.PI / 2
  return { x: CX + Math.cos(a) * R, y: CY + Math.sin(a) * R }
}

const scrollTo = (letter: string) =>
  document.getElementById(`module-${letter}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

/**
 * Section 2 — Module constellation, on the landing's "Quinze usages" pattern:
 * the heading and a focus card on the left, the map on a paper disc on the
 * right. Hover or focus a module to trace its integrations; click to jump.
 */
export default function Constellation() {
  const reduced = useReducedMotion()
  const [active, setActive] = useState<string | null>(null)
  const [openMobile, setOpenMobile] = useState<string | null>(null)

  const positions = useMemo(() => MODULES.map((_, i) => nodePos(i)), [])
  const indexOf = useMemo(() => new Map(MODULES.map((m, i) => [m.letter, i])), [])
  const activeModule = active ? MODULE_BY_LETTER.get(active) : null
  const activeIndex = active ? indexOf.get(active) ?? 0 : 0

  return (
    <section id="map" className="kl-split kl-pad-x scroll-mt-24 gap-[72px] border-t border-[var(--kl-paper-2)] py-[120px]" aria-label="Module constellation">
      <style>{`
        @keyframes edgePulse { 0%,100% { opacity: .22 } 50% { opacity: .45 } }
        .edge-pulse { animation: edgePulse 7s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .edge-pulse { animation: none; opacity: .3; } }
      `}</style>

      <div>
        <p className="kl-mono text-xs tracking-[.14em] text-[var(--kl-gold-deep)]">THE MAP</p>
        <h2 className="kl-h2 mt-4">Everything connects to everything.</h2>
        <p className="kl-lead mt-5">Hover any module to trace its real integrations. Click to jump into the detail.</p>

        {/* Focus card: the hovered module and what it connects to */}
        <div
          className="mt-10 hidden min-h-[184px] max-w-[440px] rounded-2xl border border-[var(--kl-invert-border)] bg-[var(--kl-invert)] px-6 py-[22px] text-[var(--kl-invert-ink)] shadow-[0_30px_60px_-34px_rgba(11,14,29,.7)] lg:block"
          aria-live="polite"
        >
          <AnimatePresence mode="wait">
            {activeModule ? (
              <motion.div
                key={activeModule.letter}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: CLOUD_EASE }}
              >
                <span className="kl-mono text-xs tracking-[.08em] text-[#F0C878]">
                  MODULE {activeModule.letter} · {String(activeIndex + 1).padStart(2, '0')} / {MODULES.length}
                </span>
                <div className="kl-serif mt-2 text-[30px] font-medium italic leading-tight text-[#F0C878]">{activeModule.name}</div>
                <p className="mt-3 text-sm text-[var(--kl-night-mid)]">Connects to:</p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {connectionNames(activeModule.letter).map((n) => (
                    <li key={n} className="rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1 text-xs font-medium">
                      {n}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ) : (
              <motion.div key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <span className="kl-mono text-xs tracking-[.08em] text-[#F0C878]">{MODULES.length} MODULES</span>
                <p className="kl-serif mt-2 text-[26px] font-medium italic leading-snug text-[#F0C878]">One map, every integration.</p>
                <p className="mt-3 text-sm text-[var(--kl-night-mid)]">Hover a module to trace its integrations across the platform.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Desktop constellation */}
      <div className="relative hidden aspect-square w-full max-w-[680px] justify-self-center lg:block">
        <div aria-hidden="true" className="absolute inset-[4%] rounded-full" style={{ background: 'radial-gradient(circle, var(--kl-paper) 0%, var(--kl-bg) 74%)' }} />
        <div aria-hidden="true" className="absolute inset-[11%] rounded-full border-[1.5px] border-[var(--kl-paper-2)]" />
        <svg viewBox="0 0 800 800" className="relative w-full" role="img" aria-label="Constellation map of the Kinjy modules and their integrations">
          <defs>
            <linearGradient id="const-arc" x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#F0C878" />
              <stop offset="0.55" stopColor="#D9A648" />
              <stop offset="1" stopColor="#8FB8E8" />
            </linearGradient>
          </defs>

          {/* Faint spokes from "You" to every module */}
          {positions.map((p, i) => (
            <line key={`spoke-${i}`} x1={CX} y1={CY} x2={p.x} y2={p.y} strokeWidth="1" style={{ stroke: 'var(--kl-paper-2)' }} />
          ))}

          {/* Golden arc edges */}
          {CONSTELLATION_EDGES.map(([a, b], i) => {
            const pa = positions[indexOf.get(a)!]
            const pb = positions[indexOf.get(b)!]
            const mx = (pa.x + pb.x) / 2
            const my = (pa.y + pb.y) / 2
            const cxp = mx * 0.62 + CX * 0.38
            const cyp = my * 0.62 + CY * 0.38
            const d = `M ${pa.x} ${pa.y} Q ${cxp} ${cyp} ${pb.x} ${pb.y}`
            const hot = active === a || active === b
            return (
              <motion.path
                key={`${a}-${b}`}
                d={d}
                fill="none"
                stroke={hot ? '#D9A648' : 'url(#const-arc)'}
                strokeWidth={hot ? 2.4 : 1.2}
                strokeLinecap="round"
                className={hot ? undefined : 'edge-pulse'}
                style={hot ? { opacity: 1 } : { animationDelay: `${(i % 8) * 0.9}s` }}
                initial={reduced ? false : { pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.9, ease: [0.65, 0, 0.35, 1], delay: 0.3 + i * 0.08 }}
              />
            )
          })}

          {/* Nodes */}
          {MODULES.map((m, i) => {
            const p = positions[i]
            const hot = active === m.letter
            const [ink, tile] = MODULE_TONES[i % MODULE_TONES.length]
            return (
              <motion.g
                key={m.letter}
                initial={reduced ? false : { opacity: 0, scale: 0 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1], delay: i * 0.05 }}
                style={{ transformOrigin: `${p.x}px ${p.y}px` }}
              >
                <g
                  role="button"
                  tabIndex={0}
                  aria-label={`${m.name} — view connections and details`}
                  onMouseEnter={() => setActive(m.letter)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(m.letter)}
                  onBlur={() => setActive(null)}
                  onClick={() => scrollTo(m.letter)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      scrollTo(m.letter)
                    }
                  }}
                  className="cursor-pointer outline-none"
                >
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={hot ? 40 : 34}
                    style={{
                      fill: hot ? '#0B0E1D' : 'var(--kl-surface)',
                      stroke: hot ? '#D9A648' : 'var(--kl-paper-2)',
                      strokeWidth: hot ? 2 : 1.5,
                      transition: 'all 240ms cubic-bezier(0.22,1,0.36,1)',
                      filter: 'drop-shadow(0 10px 14px rgba(36,31,22,0.12))',
                    }}
                  />
                  <circle cx={p.x} cy={p.y} r={20} style={{ fill: hot ? 'rgba(240,200,120,0.18)' : tile, transition: 'fill 240ms ease' }} />
                  <g className="pointer-events-none" style={{ color: hot ? '#F0C878' : ink }}>
                    <foreignObject x={p.x - 12} y={p.y - 12} width={24} height={24}>
                      <ModuleGlyph id={m.glyph} size={24} className="!text-current" />
                    </foreignObject>
                  </g>
                  <text
                    x={p.x}
                    y={p.y + 58}
                    textAnchor="middle"
                    className="pointer-events-none select-none"
                    fontSize="13"
                    fontWeight="700"
                    fontFamily="Hanken Grotesk, sans-serif"
                    style={{ fill: hot ? 'var(--kl-gold-deep)' : 'var(--kl-mid)' }}
                  >
                    {m.name}
                  </text>
                </g>
              </motion.g>
            )
          })}

          {/* Central "You" node */}
          <motion.g
            initial={reduced ? false : { opacity: 0, scale: 0.6 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
            style={{ transformOrigin: '400px 400px' }}
          >
            <circle cx={CX} cy={CY} r={56} fill="#0B0E1D" />
            <circle cx={CX} cy={CY} r={64} fill="none" stroke="rgba(217,166,72,0.6)" strokeWidth="1.2" strokeDasharray="3 6" />
            <foreignObject x={CX - 32} y={CY - 32} width={64} height={64} className="pointer-events-none">
              <Avatar index={4} size={64} name="You" />
            </foreignObject>
            <text x={CX} y={CY + 88} textAnchor="middle" fontSize="15" fontWeight="700" fontFamily="Hanken Grotesk, sans-serif" style={{ fill: 'var(--kl-ink)' }}>
              You
            </text>
          </motion.g>
        </svg>
      </div>

      {/* Phones: the same map as a list */}
      <div className="space-y-2 lg:hidden">
        {MODULES.map((m, i) => {
          const open = openMobile === m.letter
          const [ink, tile] = MODULE_TONES[i % MODULE_TONES.length]
          return (
            <div key={m.letter} className="overflow-hidden rounded-2xl border border-[var(--kl-paper-2)] bg-[var(--kl-surface)]">
              <button
                type="button"
                onClick={() => setOpenMobile(open ? null : m.letter)}
                aria-expanded={open}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px]" style={{ background: tile, color: ink }}>
                  <ModuleGlyph id={m.glyph} size={18} className="!text-current" />
                </span>
                <span className="flex-1 font-semibold">{m.name}</span>
                <span className="kl-mono text-xs text-[var(--kl-low)]">{m.letter}</span>
                <ChevronDown size={16} className={cn('text-[var(--kl-low)] transition-transform duration-300', open && 'rotate-180')} />
              </button>
              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.35, ease: CLOUD_EASE }}
                  >
                    <div className="px-4 pb-4">
                      <p className="text-sm text-[var(--kl-mid)]">{m.tagline}</p>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {connectionNames(m.letter).map((n) => (
                          <span key={n} className="rounded-full bg-[var(--kl-paper)] px-2.5 py-1 text-xs">
                            {n}
                          </span>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => scrollTo(m.letter)}
                        className="mt-3 text-sm font-semibold text-[var(--kl-gold-deep)] hover:underline"
                      >
                        View module detail →
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </section>
  )
}
