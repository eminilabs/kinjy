import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { CandleFlowerWidget } from '@/components/ui-kit'

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

const TREE_EDGES: [number, number][] = [
  [0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6], [3, 7], [5, 8],
]

/** BFS levels from a chosen root → layered x/y layout for the 9-node tree. */
function layoutFrom(root: number) {
  const adj: number[][] = Array.from({ length: 9 }, () => [])
  for (const [a, b] of TREE_EDGES) {
    adj[a].push(b)
    adj[b].push(a)
  }
  const level = new Array(9).fill(-1)
  level[root] = 0
  const queue = [root]
  while (queue.length) {
    const n = queue.shift()!
    for (const m of adj[n]) {
      if (level[m] === -1) {
        level[m] = level[n] + 1
        queue.push(m)
      }
    }
  }
  const byLevel: number[][] = [[], [], [], []]
  level.forEach((l, n) => byLevel[Math.min(l, 3)].push(n))
  const pos: { x: number; y: number; l: number }[] = new Array(9)
  byLevel.forEach((nodes, l) => {
    nodes.forEach((n, i) => {
      pos[n] = { x: ((i + 1) / (nodes.length + 1)) * 220, y: 16 + l * 40, l }
    })
  })
  return pos
}

/** Mini interactive: hover a node to re-root the tree ("View from this person"). */
function RerootTree() {
  const [root, setRoot] = useState(0)
  const pos = useMemo(() => layoutFrom(root), [root])

  return (
    <div className="rounded-card-md border border-paper-ink/15 bg-white/50 p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-paper-ink/50">
        Hover a person — view from them
      </p>
      <svg width="100%" viewBox="0 0 220 150" role="img" aria-label="Interactive family tree preview">
        {TREE_EDGES.map(([a, b]) => (
          <motion.line
            key={`${a}-${b}`}
            x1={pos[a].x}
            y1={pos[a].y}
            x2={pos[b].x}
            y2={pos[b].y}
            stroke="#D9A648"
            strokeWidth={1.4}
            initial={false}
            animate={{ x1: pos[a].x, y1: pos[a].y, x2: pos[b].x, y2: pos[b].y }}
            transition={{ duration: 0.5, ease: EASE }}
          />
        ))}
        {pos.map((p, n) => (
          <motion.circle
            key={n}
            r={n === root ? 9 : 6}
            fill={n === root ? '#D9A648' : '#F6F1E7'}
            stroke="#D9A648"
            strokeWidth={1.6}
            initial={false}
            animate={{ cx: p.x, cy: p.y }}
            transition={{ duration: 0.5, ease: EASE }}
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setRoot(n)}
          />
        ))}
      </svg>
    </div>
  )
}

/** Section 6 — Heritage band: "Roots that remember." (paper register shift). */
export default function HeritageBand() {
  return (
    <motion.section
      // force-light: `bg-paper` is a fixed cream in both themes, so the gold
      // accent on it must be the darker paper gold — the dark theme's #D9A648
      // only reached 1.96:1 against this background.
      className="force-light relative bg-paper px-6 py-24 text-paper-ink md:py-32"
      initial={{ clipPath: 'inset(0 0 100% 0)' }}
      whileInView={{ clipPath: 'inset(0 0 0% 0)' }}
      viewport={{ once: true, margin: '-15%' }}
      transition={{ duration: 0.8, ease: EASE }}
      aria-label="Family Tree and Digital Graveyard"
    >
      <div className="mx-auto max-w-container">
        <p className="eyebrow text-gold">Roots that remember</p>
        <div className="mt-10 grid gap-16 lg:grid-cols-2">
          {/* Family Tree half */}
          <div>
            <div className="overflow-hidden rounded-card-xl shadow-[0_24px_60px_-12px_rgba(36,31,22,0.25)]">
              <motion.img
                src="/family-archive-1.jpg"
                alt="Three generations of a family on a veranda at golden hour"
                className="aspect-[3/2] w-full object-cover"
                initial={{ scale: 1 }}
                whileInView={{ scale: 1.08 }}
                viewport={{ once: true }}
                transition={{ duration: 20, ease: 'linear' }}
              />
            </div>
            <h3 className="h3 mt-8 font-display text-2xl font-medium">A verified graph of your bloodline.</h3>
            <p className="mt-3 leading-relaxed text-paper-ink/70">
              Persons and relationships — verified by family, computed across infinite generations.
              Ask &ldquo;How are we related?&rdquo; and see the path.
            </p>
            <div className="mt-6">
              <RerootTree />
            </div>
            <Link to="/family" className="mt-6 inline-flex items-center gap-2 font-semibold text-[#9A7426] transition-all hover:gap-3">
              Grow your family tree <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>

          {/* Digital Graveyard half */}
          <div>
            {/* force-dark: a hardcoded dark brown card sitting inside a paper
                section — its text must not follow the page theme. */}
            <div className="force-dark flex min-h-full flex-col rounded-card-xl bg-gradient-to-br from-[#2A2113] via-[#3A2E14] to-[#1A1409] p-8 text-text-hi shadow-[0_24px_60px_-12px_rgba(36,31,22,0.35)] md:p-10">
              <p className="eyebrow text-gold-soft">Digital Graveyard</p>
              <h3 className="mt-4 font-display text-2xl font-medium">Memory, kept with dignity.</h3>
              <p className="mt-3 leading-relaxed text-text-hi/70">
                Memorials with biographies, guest books, QR codes at the resting place, and
                anniversary reminders — verified, moderated, and lovingly administered.
              </p>
              <div className="mt-8 flex flex-1 items-center justify-around gap-4 rounded-card-md border border-gold/20 bg-black/20 p-6">
                <CandleFlowerWidget kind="candle" name="Baba Yusuf" />
                <CandleFlowerWidget kind="flower" tier="premium" name="Mama Zawadi" />
              </div>
              <Link to="/memorials" className="mt-8 inline-flex items-center gap-2 font-semibold text-gold-soft transition-all hover:gap-3">
                Visit the Graveyard <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  )
}
