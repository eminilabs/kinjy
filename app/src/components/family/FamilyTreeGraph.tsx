import { useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { EDGES, PERSONS, PERSON_MAP, layoutFromRoot } from './tree-data'
import type { XY } from './tree-data'
import { cn } from '@/lib/utils'

const W = 640
const H = 560
const LEVEL_H = 108
const TOP_Y = 64

const cloudEase = [0.22, 1, 0.36, 1] as [number, number, number, number]

function parentPath(a: XY, b: XY): string {
  const my = (a.y + b.y) / 2
  return `M ${a.x},${a.y} C ${a.x},${my} ${b.x},${my} ${b.x},${b.y}`
}
function spousePath(a: XY, b: XY): string {
  return `M ${a.x},${a.y} L ${b.x},${b.y}`
}

const LEVEL_NAMES: Record<string, string> = {
  '-3': 'Great-grandparents',
  '-2': 'Grandparents',
  '-1': 'Parents',
  '0': 'You are here',
  '1': 'Children',
}

/**
 * Interactive relationship-graph engine demo (family.md §2).
 * 11 gold person-nodes + labeled relationship edges. Hovering any node
 * re-roots the whole view: the graph FLIP-morphs into a hierarchical
 * tree centered on that person (700ms cloud-ease).
 */
export default function FamilyTreeGraph() {
  const [root, setRoot] = useState('zawadi')
  const [hovered, setHovered] = useState<string | null>(null)
  const reduced = useReducedMotion()

  const { positions, levels } = useMemo(() => layoutFromRoot(root, W, LEVEL_H, TOP_Y), [root])
  const minLevel = Math.min(...Object.values(levels))
  const maxLevel = Math.max(...Object.values(levels))
  const rows = Array.from({ length: maxLevel - minLevel + 1 }, (_, i) => minLevel + i)

  const transition = reduced
    ? { duration: 0.15 }
    : { duration: 0.7, ease: cloudEase }

  return (
    <div className="relative">
      {/* The global Kinjy Assistant orb docks top-left of this canvas (mounted in Layout) */}

      <div className="cloud-glass rounded-card-xl p-4 pt-10 shadow-cloud">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="group" aria-label="Interactive family relationship graph">
          <defs>
            <radialGradient id="nodeGold" cx="35%" cy="30%" r="80%">
              <stop offset="0%" stopColor="#F0C878" />
              <stop offset="100%" stopColor="#D9A648" />
            </radialGradient>
            <linearGradient id="edgeArc" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F0C878" />
              <stop offset="55%" stopColor="#D9A648" />
              <stop offset="100%" stopColor="#8FB8E8" />
            </linearGradient>
          </defs>

          {/* Level row guides (Kinjy Level model — UI presentation layer) */}
          {rows.map((lvl) => {
            const y = TOP_Y + (lvl - minLevel) * LEVEL_H
            return (
              <g key={lvl}>
                <line x1={8} x2={W - 8} y1={y} y2={y} stroke="rgba(255,255,255,0.05)" strokeDasharray="2 6" />
                <text x={12} y={y - 30} className="fill-[#A7ACBF]" fontSize={9} fontFamily="'JetBrains Mono', monospace" letterSpacing={1.5}>
                  {`LEVEL ${lvl === 0 ? '0' : Math.abs(lvl)}${lvl < 0 ? ' ↑' : lvl > 0 ? ' ↓' : ''}`}
                </text>
                <text x={12} y={y - 18} className="fill-[#6B7186]" fontSize={8.5}>
                  {LEVEL_NAMES[String(lvl)] ?? (lvl < 0 ? 'Ancestors' : 'Descendants')}
                </text>
              </g>
            )
          })}

          {/* Relationship edges — the backend truth */}
          {EDGES.map((e) => {
            const a = positions[e.from]
            const b = positions[e.to]
            if (!a || !b) return null
            const isSpouse = e.kind === 'spouse_of'
            const d = isSpouse ? spousePath(a, b) : parentPath(a, b)
            const pending = e.status === 'PENDING'
            return (
              <g key={`${e.from}-${e.to}-${e.kind}`}>
                <motion.path
                  d={d}
                  fill="none"
                  stroke={pending ? '#E0A33E' : isSpouse ? 'rgba(143,184,232,0.6)' : 'url(#edgeArc)'}
                  strokeWidth={pending ? 1.4 : 1.8}
                  strokeDasharray={pending ? '4 4' : undefined}
                  initial={{ pathLength: 0, opacity: 0 }}
                  whileInView={{ pathLength: 1, opacity: 1 }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{
                    pathLength: { duration: reduced ? 0 : 0.9, ease: [0.65, 0, 0.35, 1], delay: reduced ? 0 : EDGES.indexOf(e) * 0.1 },
                    d: transition,
                    opacity: { duration: 0.3 },
                  }}
                  animate={{ d }}
                />
                <motion.text
                  className={pending ? 'fill-[#E0A33E]' : 'fill-[#8FB8E8]'}
                  fontSize={7.5}
                  fontFamily="'JetBrains Mono', monospace"
                  textAnchor="middle"
                  initial={false}
                  animate={{
                    x: (a.x + b.x) / 2,
                    y: (a.y + b.y) / 2 - 4,
                  }}
                  transition={transition}
                >
                  {e.kind}
                </motion.text>
              </g>
            )
          })}

          {/* Person nodes */}
          {PERSONS.map((p, i) => {
            const pos = positions[p.id]
            if (!pos) return null
            const isRoot = p.id === root
            const isHover = p.id === hovered
            return (
              <motion.g
                key={p.id}
                initial={{ opacity: 0, scale: 0 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ delay: reduced ? 0 : i * 0.05, duration: 0.4, ease: cloudEase }}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => {
                  setHovered(p.id)
                  setRoot(p.id)
                }}
                onFocus={() => setRoot(p.id)}
                onMouseLeave={() => setHovered(null)}
                tabIndex={0}
                role="button"
                aria-label={`View tree from ${p.name}`}
              >
                <motion.g initial={false} animate={{ x: pos.x, y: pos.y }} transition={transition}>
                  {(isRoot || isHover) && (
                    <circle r={30} fill="none" stroke="rgba(240,200,120,0.5)" strokeWidth={1} />
                  )}
                  <motion.circle
                    r={22}
                    fill={isRoot ? 'url(#nodeGold)' : '#1A1F3B'}
                    stroke={isRoot ? '#F0C878' : 'rgba(217,166,72,0.55)'}
                    strokeWidth={isRoot ? 2 : 1.4}
                    initial={false}
                    animate={{ scale: isHover || isRoot ? 1.12 : 1 }}
                    transition={{ duration: 0.24, ease: cloudEase }}
                    style={{
                      filter: isRoot || isHover ? 'drop-shadow(0 0 10px rgba(217,166,72,0.55))' : undefined,
                    }}
                  />
                  <text
                    textAnchor="middle"
                    dy={3.5}
                    fontSize={11}
                    fontWeight={700}
                    className={isRoot ? 'fill-[#0B0E1D]' : 'fill-[#F0C878]'}
                    style={{ pointerEvents: 'none' }}
                  >
                    {p.name
                      .split(' ')
                      .map((w) => w[0])
                      .join('')}
                  </text>
                  <text
                    textAnchor="middle"
                    y={38}
                    fontSize={10}
                    fontWeight={600}
                    className={cn(isRoot ? 'fill-[#F0C878]' : 'fill-[#A7ACBF]')}
                    style={{ pointerEvents: 'none' }}
                  >
                    {p.name}
                  </text>
                  {isRoot && (
                    <text
                      textAnchor="middle"
                      y={-32}
                      fontSize={8}
                      fontFamily="'JetBrains Mono', monospace"
                      letterSpacing={1}
                      className="fill-[#F0C878]"
                      style={{ pointerEvents: 'none' }}
                    >
                      LEVEL 0
                    </text>
                  )}
                </motion.g>
              </motion.g>
            )
          })}
        </svg>

        {/* Re-root caption */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
          <p className="caption" aria-live="polite">
            Now viewing from:{' '}
            <strong className="font-display text-base text-gold-soft">{PERSON_MAP[root].name}</strong>
            {' '}— Level 0
          </p>
          <p className="mono-data text-[0.7rem] text-text-low">
            Hover any person → “View tree from this person”
          </p>
        </div>
      </div>
    </div>
  )
}
