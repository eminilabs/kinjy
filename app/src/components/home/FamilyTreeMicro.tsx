import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const SNAP: [number, number, number, number] = [0.34, 1.56, 0.64, 1]
const LINE: [number, number, number, number] = [0.65, 0, 0.35, 1]

// 7-node tree: gen0 (1), gen1 (2), gen2 (4)
const NODES = [
  { id: 0, x: 70, y: 14, gen: 0 },
  { id: 1, x: 38, y: 62, gen: 1 },
  { id: 2, x: 102, y: 62, gen: 1 },
  { id: 3, x: 14, y: 112, gen: 2 },
  { id: 4, x: 62, y: 112, gen: 2 },
  { id: 5, x: 82, y: 112, gen: 2 },
  { id: 6, x: 130, y: 112, gen: 2 },
]
const EDGES: [number, number][] = [
  [0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6],
]

/**
 * FamilyTreeMicro — bottom-left hero micro-graph: a 7-node gold tree that
 * level-blooms one generation per loop (9s), then softly resets.
 */
export default function FamilyTreeMicro({ className }: { className?: string }) {
  const [cycle, setCycle] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setCycle((c) => c + 1), 9000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className={className} aria-hidden="true">
      <AnimatePresence mode="wait">
        <motion.svg
          key={cycle}
          width="144"
          height="128"
          viewBox="0 0 144 128"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.8 } }}
        >
          <defs>
            <linearGradient id="ftm-arc" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#F0C878" />
              <stop offset="0.6" stopColor="#D9A648" />
              <stop offset="1" stopColor="#8FB8E8" />
            </linearGradient>
          </defs>
          {EDGES.map(([a, b], i) => {
            const A = NODES[a]
            const B = NODES[b]
            const my = (A.y + B.y) / 2
            const gen = B.gen
            return (
              <motion.path
                key={`${a}-${b}`}
                d={`M ${A.x} ${A.y} Q ${A.x} ${my} ${(A.x + B.x) / 2} ${my} T ${B.x} ${B.y}`}
                fill="none"
                stroke="url(#ftm-arc)"
                strokeWidth="1.6"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.9 }}
                transition={{ delay: 0.35 + gen * 0.85 + i * 0.05, duration: 0.7, ease: LINE }}
              />
            )
          })}
          {NODES.map((n) => (
            <motion.circle
              key={n.id}
              cx={n.x}
              cy={n.y}
              r={n.gen === 0 ? 8 : n.gen === 1 ? 6 : 4.5}
              fill={n.gen === 0 ? '#F0C878' : '#D9A648'}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 + n.gen * 0.85, duration: 0.5, ease: SNAP }}
              style={{ transformOrigin: `${n.x}px ${n.y}px` }}
            />
          ))}
        </motion.svg>
      </AnimatePresence>
      <p className="caption mt-1">Verified across generations</p>
    </div>
  )
}
