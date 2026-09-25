import { useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CONSTELLATION_EDGES, MODULES, MODULE_BY_LETTER, connectionNames } from './data'
import { Avatar, CLOUD_EASE, ModuleGlyph } from './shared'

const CX = 400
const CY = 400
const R = 292

function nodePos(index: number) {
  // Start at top (-90°) and distribute evenly
  const a = (index / MODULES.length) * Math.PI * 2 - Math.PI / 2
  return { x: CX + Math.cos(a) * R, y: CY + Math.sin(a) * R }
}

/** Section 2 — Module constellation: 15 nodes around a central "You", golden arc edges. */
export default function Constellation() {
  const reduced = useReducedMotion()
  const [active, setActive] = useState<string | null>(null)
  const [openMobile, setOpenMobile] = useState<string | null>(null)

  const positions = useMemo(() => MODULES.map((_, i) => nodePos(i)), [])
  const indexOf = useMemo(() => new Map(MODULES.map((m, i) => [m.letter, i])), [])

  const scrollTo = (letter: string) => {
    document.getElementById(`module-${letter}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const activeModule = active ? MODULE_BY_LETTER.get(active) : null

  return (
    <section className="relative px-6 py-24 md:py-32" aria-label="Module constellation">
      <style>{`
        @keyframes edgePulse { 0%,100% { opacity: .08 } 50% { opacity: .18 } }
        .edge-pulse { animation: edgePulse 7s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .edge-pulse { animation: none; opacity: .12; } }
      `}</style>
      <div className="mx-auto max-w-container">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow text-gold">The Map</p>
          <h2 className="h2 mt-4">Everything connects to everything.</h2>
          <p className="body-lg mt-4 text-text-mid">
            Hover any module to trace its real integrations. Click to jump into the detail.
          </p>
        </div>

        {/* Desktop constellation */}
        <div className="relative mt-12 hidden lg:block">
          <div className="relative mx-auto max-w-[880px]">
            <svg viewBox="0 0 800 800" className="w-full" role="img" aria-label="Constellation map of the 15 Kinjy modules and their integrations">
              <defs>
                <linearGradient id="const-arc" x1="0" y1="0" x2="1" y2="1">
                  <stop stopColor="#F0C878" />
                  <stop offset="0.55" stopColor="#D9A648" />
                  <stop offset="1" stopColor="#8FB8E8" />
                </linearGradient>
              </defs>

              {/* Faint spokes from "You" to every module */}
              {positions.map((p, i) => (
                <line
                  key={`spoke-${i}`}
                  x1={CX}
                  y1={CY}
                  x2={p.x}
                  y2={p.y}
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="1"
                />
              ))}

              {/* Golden arc edges */}
              {CONSTELLATION_EDGES.map(([a, b], i) => {
                const pa = positions[indexOf.get(a)!]
                const pb = positions[indexOf.get(b)!]
                const mx = (pa.x + pb.x) / 2
                const my = (pa.y + pb.y) / 2
                // control point pulled toward center for the arc motif
                const cxp = mx * 0.62 + CX * 0.38
                const cyp = my * 0.62 + CY * 0.38
                const d = `M ${pa.x} ${pa.y} Q ${cxp} ${cyp} ${pb.x} ${pb.y}`
                const hot = active === a || active === b
                return (
                  <motion.path
                    key={`${a}-${b}`}
                    d={d}
                    fill="none"
                    stroke={hot ? '#F0C878' : 'url(#const-arc)'}
                    strokeWidth={hot ? 2 : 1.2}
                    strokeLinecap="round"
                    className={hot ? undefined : 'edge-pulse'}
                    style={hot ? { opacity: 0.95, filter: 'drop-shadow(0 0 6px rgba(240,200,120,0.5))' } : { animationDelay: `${(i % 8) * 0.9}s` }}
                    initial={reduced ? false : { pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ duration: 0.9, ease: [0.65, 0, 0.35, 1], delay: 0.3 + i * 0.12 }}
                  />
                )
              })}

              {/* Nodes */}
              {MODULES.map((m, i) => {
                const p = positions[i]
                const hot = active === m.letter
                return (
                  <motion.g
                    key={m.letter}
                    initial={reduced ? false : { opacity: 0, scale: 0 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1], delay: i * 0.06 }}
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
                        r={hot ? 42 : 36}
                        fill={hot ? 'rgba(217,166,72,0.16)' : 'rgba(255,255,255,0.07)'}
                        stroke={hot ? 'rgba(240,200,120,0.9)' : 'rgba(255,255,255,0.16)'}
                        strokeWidth={hot ? 1.6 : 1}
                        style={{ transition: 'all 240ms cubic-bezier(0.22,1,0.36,1)', filter: hot ? 'drop-shadow(0 0 14px rgba(217,166,72,0.45))' : undefined }}
                      />
                      <foreignObject x={p.x - 14} y={p.y - 14} width={28} height={28} className="pointer-events-none">
                        <ModuleGlyph id={m.glyph} size={28} />
                      </foreignObject>
                      <text
                        x={p.x}
                        y={p.y + 58}
                        textAnchor="middle"
                        className="pointer-events-none select-none"
                        fill={hot ? '#F0C878' : '#A7ACBF'}
                        fontSize="12.5"
                        fontWeight="600"
                        fontFamily="Manrope, sans-serif"
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
                <circle cx={CX} cy={CY} r={52} fill="rgba(74,82,224,0.18)" stroke="rgba(143,184,232,0.5)" strokeWidth="1.4" />
                <circle cx={CX} cy={CY} r={60} fill="none" stroke="rgba(217,166,72,0.28)" strokeWidth="1" strokeDasharray="3 6" />
                <foreignObject x={CX - 32} y={CY - 32} width={64} height={64} className="pointer-events-none">
                  <Avatar index={4} size={64} name="You" />
                </foreignObject>
                <text x={CX} y={CY + 82} textAnchor="middle" fill="#F4F2EE" fontSize="14" fontWeight="700" fontFamily="Manrope, sans-serif">
                  You
                </text>
              </motion.g>
            </svg>

            {/* Side panel — connections of hovered module */}
            <div className="pointer-events-none absolute right-0 top-1/2 w-64 -translate-y-1/2">
              <AnimatePresence mode="wait">
                {activeModule ? (
                  <motion.div
                    key={activeModule.letter}
                    initial={{ opacity: 0, y: 10, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.24, ease: CLOUD_EASE }}
                    className="cloud-glass rounded-card-md bg-ink-2/85 p-5 shadow-cloud"
                  >
                    <div className="flex items-center gap-2.5">
                      <ModuleGlyph id={activeModule.glyph} size={22} />
                      <p className="font-semibold text-text-hi">{activeModule.name}</p>
                    </div>
                    <p className="caption mt-3">Connects to:</p>
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {connectionNames(activeModule.letter).map((n) => (
                        <li key={n} className="rounded-full border border-gold/30 bg-gold/10 px-2.5 py-1 text-xs font-medium text-gold-soft">
                          {n}
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                ) : (
                  <motion.div
                    key="hint"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="cloud-glass rounded-card-md bg-ink-2/60 p-5"
                  >
                    <p className="caption">Hover a module to trace its integrations across the platform.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Mobile accordion list */}
        <div className="mt-12 space-y-2 lg:hidden">
          {MODULES.map((m) => {
            const open = openMobile === m.letter
            return (
              <div key={m.letter} className="cloud-glass overflow-hidden rounded-card-md">
                <button
                  type="button"
                  onClick={() => setOpenMobile(open ? null : m.letter)}
                  aria-expanded={open}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
                >
                  <ModuleGlyph id={m.glyph} size={22} />
                  <span className="flex-1 font-semibold text-text-hi">{m.name}</span>
                  <span className="mono-data text-xs text-text-low">{m.letter}</span>
                  <ChevronDown size={16} className={cn('text-text-mid transition-transform duration-300', open && 'rotate-180')} />
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
                        <p className="caption">{m.tagline}</p>
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {connectionNames(m.letter).map((n) => (
                            <span key={n} className="rounded-full border border-gold/30 bg-gold/10 px-2.5 py-1 text-xs text-gold-soft">
                              {n}
                            </span>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => scrollTo(m.letter)}
                          className="mt-3 text-sm font-semibold text-sky hover:text-gold-soft"
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
      </div>
    </section>
  )
}
