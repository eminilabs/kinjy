import { memo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

const snapEase = [0.34, 1.56, 0.64, 1] as [number, number, number, number]

// 7-node mini graph: owner + parents + grandparents + child, level layout
const NODES = [
  { id: 0, x: 60, y: 16, lvl: 2 }, // grandparent
  { id: 1, x: 108, y: 16, lvl: 2 }, // grandparent
  { id: 2, x: 36, y: 62, lvl: 1 }, // parent
  { id: 3, x: 84, y: 62, lvl: 1 }, // parent
  { id: 4, x: 60, y: 108, lvl: 0 }, // owner (Level 0)
  { id: 5, x: 108, y: 108, lvl: 0 }, // spouse
  { id: 6, x: 84, y: 150, lvl: -1 }, // child
] as const

const LINKS: [number, number][] = [
  [0, 1],
  [0, 2],
  [1, 2],
  [2, 3],
  [2, 4],
  [3, 4],
  [4, 5],
  [4, 6],
  [5, 6],
]

function curve(a: { x: number; y: number }, b: { x: number; y: number }): string {
  if (a.y === b.y) return `M ${a.x},${a.y} L ${b.x},${b.y}`
  const my = (a.y + b.y) / 2
  return `M ${a.x},${a.y} C ${a.x},${my} ${b.x},${my} ${b.x},${b.y}`
}

/**
 * HeroMiniTree — 7-node family mini-graph overlapping the hero frame.
 * Nodes level-bloom outward from the owner (0.14s stagger, snap-ease).
 */
const HeroMiniTree = memo(function HeroMiniTree() {
  const reduced = useReducedMotion()
  const owner = NODES[4]
  return (
    <svg
      viewBox="0 0 144 166"
      className="h-auto w-full drop-shadow-[0_12px_24px_rgba(36,31,22,0.35)]"
      role="img"
      aria-label="A small family tree: one person, their parents, grandparents, partner and child"
    >
      <defs>
        <radialGradient id="miniGold" cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#F0C878" />
          <stop offset="100%" stopColor="#D9A648" />
        </radialGradient>
      </defs>
      {LINKS.map(([ai, bi]) => (
        <motion.path
          key={`${ai}-${bi}`}
          d={curve(NODES[ai], NODES[bi])}
          fill="none"
          stroke="#D9A648"
          strokeWidth={1.6}
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.9 }}
          transition={{ delay: reduced ? 0 : 0.5, duration: 0.9, ease: [0.65, 0, 0.35, 1] }}
        />
      ))}
      {NODES.map((n) => {
        const isOwner = n.id === 4
        const order = Math.abs(n.lvl)
        return (
          <motion.circle
            key={n.id}
            cx={n.x}
            cy={n.y}
            r={isOwner ? 11 : 8}
            fill={isOwner ? 'url(#miniGold)' : '#FFFDF8'}
            stroke="#D9A648"
            strokeWidth={isOwner ? 2 : 1.4}
            initial={reduced ? false : { scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              delay: reduced ? 0 : 0.35 + order * 0.14,
              duration: 0.45,
              ease: snapEase,
            }}
            style={{ transformOrigin: `${owner.x}px ${owner.y}px` }}
          />
        )
      })}
    </svg>
  )
})

export default HeroMiniTree
