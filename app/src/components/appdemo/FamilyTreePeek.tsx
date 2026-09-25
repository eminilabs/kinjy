import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { GitFork, ShieldCheck, ShieldQuestion } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppTheme } from './theme'
import type { ReactNode } from 'react'

interface Person { id: string; name: string; gen: number; x: number; y: number }
interface Edge { a: string; b: string; verified: boolean; spouse?: boolean }

const PEOPLE: Person[] = [
  { id: 'juma', name: 'Juma', gen: 0, x: 130, y: 42 },
  { id: 'rehema', name: 'Rehema', gen: 0, x: 250, y: 42 },
  { id: 'musa', name: 'Musa', gen: 1, x: 90, y: 130 },
  { id: 'zawadi', name: 'Zawadi', gen: 1, x: 200, y: 130 },
  { id: 'pendo', name: 'Pendo', gen: 1, x: 340, y: 130 },
  { id: 'you', name: 'You', gen: 2, x: 70, y: 222 },
  { id: 'kito', name: 'Kito', gen: 2, x: 180, y: 222 },
  { id: 'nia', name: 'Nia', gen: 2, x: 340, y: 222 },
  { id: 'demo', name: 'Demo', gen: 3, x: 70, y: 306 },
]

const EDGES: Edge[] = [
  { a: 'juma', b: 'rehema', verified: true, spouse: true },
  { a: 'juma', b: 'musa', verified: true },
  { a: 'rehema', b: 'musa', verified: true },
  { a: 'juma', b: 'pendo', verified: true },
  { a: 'rehema', b: 'pendo', verified: true },
  { a: 'musa', b: 'zawadi', verified: true, spouse: true },
  { a: 'musa', b: 'you', verified: true },
  { a: 'zawadi', b: 'you', verified: true },
  { a: 'musa', b: 'kito', verified: true },
  { a: 'zawadi', b: 'kito', verified: true },
  { a: 'pendo', b: 'nia', verified: false },
  { a: 'you', b: 'demo', verified: true },
]

const RELATION_LABELS: Record<string, string> = {
  juma: 'grandfather', rehema: 'grandmother', musa: 'father', zawadi: 'mother',
  pendo: 'aunt', you: 'you', kito: 'brother', nia: 'cousin', demo: 'daughter',
}

/** BFS shortest path between two people over family edges. */
function findPath(from: string, to: string): string[] | null {
  if (from === to) return [from]
  const adj = new Map<string, string[]>()
  for (const e of EDGES) {
    adj.set(e.a, [...(adj.get(e.a) ?? []), e.b])
    adj.set(e.b, [...(adj.get(e.b) ?? []), e.a])
  }
  const prev = new Map<string, string | null>([[from, null]])
  const q = [from]
  while (q.length) {
    const cur = q.shift()!
    if (cur === to) break
    for (const n of adj.get(cur) ?? []) {
      if (!prev.has(n)) {
        prev.set(n, cur)
        q.push(n)
      }
    }
  }
  if (!prev.has(to)) return null
  const path: string[] = []
  let cur: string | null = to
  while (cur) {
    path.unshift(cur)
    cur = prev.get(cur) ?? null
  }
  return path
}

interface Props {
  orb?: ReactNode
}

/** Family Tree peek — re-rootable 9-node tree with relation path finder. */
export default function FamilyTreePeek({ orb }: Props) {
  const { tok } = useAppTheme()
  const [root, setRoot] = useState('you')
  const [from, setFrom] = useState('you')
  const [to, setTo] = useState('nia')
  const [path, setPath] = useState<string[] | null>(null)

  const rootPerson = PEOPLE.find((p) => p.id === root)!
  // re-root: translate canvas so the root person sits at center-top
  const dx = 230 - rootPerson.x
  const dy = 150 - rootPerson.y

  const personById = useMemo(() => Object.fromEntries(PEOPLE.map((p) => [p.id, p])), [])
  const pathEdges = useMemo(() => {
    if (!path) return new Set<string>()
    const s = new Set<string>()
    for (let i = 0; i < path.length - 1; i++) s.add(`${path[i]}|${path[i + 1]}`)
    return s
  }, [path])

  const reveal = () => setPath(findPath(from, to))

  return (
    <div className="flex h-full flex-col gap-3.5 lg:flex-row">
      {/* Tree canvas */}
      <div className={cn('relative min-h-[320px] flex-1 overflow-hidden rounded-card-lg', tok.card)}>
        {/* orb anchor: top-left of canvas */}
        <div className="absolute start-3 top-3 z-20">{orb}</div>
        <p className={cn('absolute end-3 top-3.5 z-10 flex items-center gap-1.5 text-[0.68rem] font-semibold', tok.low)}>
          <GitFork size={12} className="text-gold" aria-hidden="true" />
          Root: {rootPerson.name} · tap anyone to re-root
        </p>
        <svg viewBox="0 0 460 350" className="h-full min-h-[320px] w-full" role="img" aria-label="Interactive family tree, 9 members">
          <motion.g animate={{ x: dx, y: dy }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}>
            {EDGES.map((e) => {
              const a = personById[e.a]
              const b = personById[e.b]
              const onPath = pathEdges.has(`${e.a}|${e.b}`) || pathEdges.has(`${e.b}|${e.a}`)
              return (
                <g key={`${e.a}-${e.b}`}>
                  <motion.line
                    x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                    stroke={onPath ? '#F0C878' : e.spouse ? 'rgba(217,166,72,0.5)' : 'rgba(143,184,232,0.35)'}
                    strokeWidth={onPath ? 2.4 : 1.2}
                    strokeDasharray={e.spouse ? '4 4' : undefined}
                    animate={{ stroke: onPath ? '#F0C878' : e.spouse ? 'rgba(217,166,72,0.5)' : 'rgba(143,184,232,0.35)' }}
                    transition={{ duration: 0.4 }}
                  />
                  {!e.spouse && (
                    <g transform={`translate(${(a.x + b.x) / 2}, ${(a.y + b.y) / 2})`}>
                      <rect x={-26} y={-8} width={52} height={14} rx={7}
                        fill={e.verified ? 'rgba(63,178,127,0.15)' : 'rgba(224,163,62,0.15)'}
                        stroke={e.verified ? 'rgba(63,178,127,0.5)' : 'rgba(224,163,62,0.5)'}
                        strokeWidth={0.8}
                      />
                      <text textAnchor="middle" dy={3.5} fontSize={7.5} fontFamily="JetBrains Mono, monospace"
                        fill={e.verified ? '#3FB27F' : '#E0A33E'} fontWeight={600}>
                        {e.verified ? 'VERIFIED' : 'PENDING'}
                      </text>
                    </g>
                  )}
                </g>
              )
            })}
            {PEOPLE.map((p, i) => {
              const isRoot = p.id === root
              const onPath = path?.includes(p.id)
              return (
                <motion.g
                  key={p.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.05 * i, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
                  transform={`translate(${p.x}, ${p.y})`}
                  onClick={() => setRoot(p.id)}
                  className="cursor-pointer"
                  role="button"
                  aria-label={`Re-root tree at ${p.name}`}
                >
                  <circle
                    r={isRoot ? 22 : 17}
                    fill={onPath ? 'rgba(217,166,72,0.3)' : 'rgba(74,82,224,0.25)'}
                    stroke={isRoot ? '#F0C878' : onPath ? '#D9A648' : 'rgba(143,184,232,0.5)'}
                    strokeWidth={isRoot ? 2 : 1.2}
                  />
                  <text textAnchor="middle" dy={3.5} fontSize={9} fontWeight={700} fill="#F4F2EE" fontFamily="Manrope, sans-serif">
                    {p.name}
                  </text>
                </motion.g>
              )
            })}
          </motion.g>
        </svg>
      </div>

      {/* How are we related? */}
      <div className={cn('w-full shrink-0 rounded-card-lg p-4 lg:w-[240px]', tok.card)}>
        <p className={cn('mb-3 text-sm font-bold', tok.text)}>How are we related?</p>
        {[
          { label: 'Person A', value: from, set: setFrom },
          { label: 'Person B', value: to, set: setTo },
        ].map(({ label, value, set }) => (
          <label key={label} className="mb-2.5 block">
            <span className={cn('mb-1 block text-[0.68rem] font-bold uppercase tracking-wider', tok.low)}>{label}</span>
            <select
              value={value}
              onChange={(e) => { set(e.target.value); setPath(null) }}
              className={cn('w-full rounded-full px-3 py-2 text-xs font-semibold outline-none', tok.input, tok.text)}
            >
              {PEOPLE.map((p) => (
                <option key={p.id} value={p.id} className="bg-ink-2 text-text-hi">{p.name}</option>
              ))}
            </select>
          </label>
        ))}
        <motion.button
          type="button"
          onClick={reveal}
          whileTap={{ scale: 1.04 }}
          className="mt-1 w-full rounded-full bg-gradient-to-br from-gold-soft to-gold px-4 py-2 text-xs font-bold text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]"
        >
          Reveal path
        </motion.button>

        {path && (
          <motion.ol
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className={cn('mt-3 space-y-1.5 border-t pt-3', tok.divider.replace('divide-', 'border-'))}
          >
            {path.map((id, i) => (
              <motion.li
                key={`${id}-${i}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.12 * i, duration: 0.3 }}
                className={cn('flex items-center gap-2 text-xs', tok.mid)}
              >
                {i > 0 && <span className="text-gold">↓</span>}
                <span className={cn('font-bold', tok.text)}>{personById[id].name}</span>
                <span className={tok.low}>({RELATION_LABELS[id]})</span>
              </motion.li>
            ))}
            <li className={cn('pt-1 text-[0.68rem]', tok.low)}>
              Path crosses {path.length - 1} verified link{path.length > 2 ? 's' : ''}
            </li>
          </motion.ol>
        )}

        <div className={cn('mt-3 flex items-center gap-3 border-t pt-3 text-[0.65rem]', tok.divider.replace('divide-', 'border-'), tok.low)}>
          <span className="flex items-center gap-1"><ShieldCheck size={11} className="text-success" /> Verified</span>
          <span className="flex items-center gap-1"><ShieldQuestion size={11} className="text-warning" /> Pending corroboration</span>
        </div>
      </div>
    </div>
  )
}
