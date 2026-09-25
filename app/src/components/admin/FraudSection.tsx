import { useState } from 'react'
import { motion } from 'framer-motion'
import { Network, MousePointerClick, Fingerprint, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'

/* Deterministic 40-point sparkline series */
function series(seed: number, base: number, drift: number): number[] {
  const pts: number[] = []
  let v = base
  for (let i = 0; i < 40; i++) {
    const wobble = Math.sin(i * 1.7 + seed) * 3 + Math.cos(i * 0.6 + seed * 2) * 2
    v = Math.max(2, v + drift + wobble * 0.4)
    pts.push(v)
  }
  return pts
}

function pointsAttr(pts: number[], w = 120, h = 36): string {
  const min = Math.min(...pts)
  const max = Math.max(...pts)
  const span = max - min || 1
  return pts
    .map((p, i) => `${((i / (pts.length - 1)) * w).toFixed(1)},${(h - 3 - ((p - min) / span) * (h - 6)).toFixed(1)}`)
    .join(' ')
}

const DETECTORS = [
  {
    icon: Network,
    name: 'Self-referral rings',
    stat: '12',
    unit: 'flagged today',
    pts: series(3, 18, -0.12),
    color: '#DE5C5C',
  },
  {
    icon: MousePointerClick,
    name: 'Click fraud',
    stat: '0.8%',
    unit: 'of ad clicks quarantined',
    pts: series(7, 26, -0.3),
    color: '#E0A33E',
  },
  {
    icon: Fingerprint,
    name: 'Fake KYC attempts',
    stat: '5',
    unit: 'blocked',
    pts: series(11, 12, -0.05),
    color: '#D9A648',
  },
  {
    icon: Bot,
    name: 'Bot farms',
    stat: '214',
    unit: 'accounts frozen',
    pts: series(5, 30, -0.55),
    color: '#3FB27F',
  },
]

const CLUSTERS = [
  { id: 'CL-118', label: 'Referral web · Dar es Salaam', members: 14, nodes: 7, radius: 20 },
  { id: 'CL-121', label: 'Click ring · device farm', members: 23, nodes: 9, radius: 24 },
  { id: 'CL-124', label: 'KYC reuse cluster', members: 6, nodes: 5, radius: 16 },
]

/** Small suspicious-cluster node graph (red-gold), slowly rotating. */
function ClusterGraph({ nodes, radius }: { nodes: number; radius: number }) {
  const size = 72
  const c = size / 2
  const pts = Array.from({ length: nodes }, (_, i) => {
    const a = (i / nodes) * Math.PI * 2 - Math.PI / 2
    return { x: c + Math.cos(a) * radius, y: c + Math.sin(a) * radius }
  })
  return (
    <motion.svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      aria-hidden="true"
      animate={{ rotate: 360 }}
      transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
    >
      {pts.map((p, i) =>
        pts.map((q, j) =>
          j > i && (i + j) % 2 === 0 ? (
            <line key={`${i}-${j}`} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="rgba(222,92,92,0.35)" strokeWidth={0.8} />
          ) : null,
        ),
      )}
      {pts.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={i === 0 ? 4 : 2.4}
          fill={i === 0 ? '#DE5C5C' : '#D9A648'}
          opacity={i === 0 ? 1 : 0.85}
        />
      ))}
      <circle cx={c} cy={c} r={radius + 8} fill="none" stroke="rgba(222,92,92,0.25)" strokeDasharray="3 4" />
    </motion.svg>
  )
}

/**
 * FraudSection — refinement #21 anti-fraud center: 4 detector cards with drawing
 * sparklines + a review queue of flagged node-graph clusters.
 */
export default function FraudSection() {
  const [hoverCluster, setHoverCluster] = useState<string | null>(null)

  return (
    <section aria-labelledby="fraud-heading" className="border-t border-white/8 px-5 py-10 md:px-8">
      <p className="eyebrow text-gold">Refinement #21 · Anti-fraud center</p>
      <h2 id="fraud-heading" className="h3 mt-2 text-xl">
        The economy only works if it's real.
      </h2>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {DETECTORS.map((d, i) => (
          <motion.div
            key={d.name}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.45, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-card-md border border-white/8 bg-ink-3/50 p-4"
          >
            <div className="flex items-center gap-2">
              <d.icon size={16} className="text-gold" aria-hidden="true" />
              <p className="text-sm font-semibold text-text-hi">{d.name}</p>
            </div>
            <p className="mono-data mt-2 text-2xl font-semibold" style={{ color: d.color }}>
              {d.stat}
            </p>
            <p className="caption">{d.unit}</p>
            <svg viewBox="0 0 120 36" className="mt-3 h-9 w-full" aria-hidden="true">
              <motion.polyline
                points={pointsAttr(d.pts)}
                fill="none"
                stroke={d.color}
                strokeWidth={1.6}
                strokeLinejoin="round"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 1, delay: 0.2 + i * 0.12, ease: [0.65, 0, 0.35, 1] }}
              />
            </svg>
          </motion.div>
        ))}
      </div>

      {/* Review queue */}
      <div className="mt-6">
        <p className="caption uppercase tracking-[0.14em]">Review queue · 3 flagged clusters</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {CLUSTERS.map((cl, i) => (
            <motion.button
              key={cl.id}
              type="button"
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.45, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              onMouseEnter={() => setHoverCluster(cl.id)}
              onMouseLeave={() => setHoverCluster(null)}
              onFocus={() => setHoverCluster(cl.id)}
              onBlur={() => setHoverCluster(null)}
              className="group relative flex items-center gap-4 rounded-card-md border border-danger/25 bg-danger/[0.06] p-4 text-start transition-colors duration-200 hover:border-danger/50"
            >
              <motion.span
                animate={{ scale: hoverCluster === cl.id ? 1.15 : 1 }}
                transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
                className="shrink-0"
              >
                <ClusterGraph nodes={cl.nodes} radius={cl.radius} />
              </motion.span>
              <span className="min-w-0">
                <span className="mono-data block text-[0.72rem] text-danger">{cl.id}</span>
                <span className="block truncate text-sm font-semibold text-text-hi">{cl.label}</span>
                <span className="caption block">{cl.members} linked accounts</span>
              </span>
              {/* tooltip */}
              <span
                className={cn(
                  'mono-data pointer-events-none absolute -top-8 start-4 rounded-full border border-danger/40 bg-ink px-2.5 py-1 text-[0.68rem] text-text-hi transition-opacity duration-200',
                  hoverCluster === cl.id ? 'opacity-100' : 'opacity-0',
                )}
              >
                {cl.members} members · freeze recommended
              </span>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  )
}
