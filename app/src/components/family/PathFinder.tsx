import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { RotateCcw, Sparkles } from 'lucide-react'
import { ArcButton } from '@/components/ui-kit'
import Avatar from './Avatar'
import { PERSON_MAP, commonAncestors, findPath } from './tree-data'
import { cn } from '@/lib/utils'

const cloudEase = [0.22, 1, 0.36, 1] as [number, number, number, number]

/** Fixed presentation layout for the demo tree canvas. */
const POS: Record<string, { x: number; y: number }> = {
  baraka: { x: 245, y: 62 },
  neema: { x: 365, y: 62 },
  juma: { x: 205, y: 172 },
  rehema: { x: 95, y: 172 },
  pendo: { x: 405, y: 172 },
  david: { x: 515, y: 172 },
  kito: { x: 165, y: 282 },
  lela: { x: 55, y: 282 },
  demo: { x: 445, y: 282 },
  zawadi: { x: 165, y: 392 },
  nia: { x: 445, y: 392 },
}

const LINKS: [string, string][] = [
  ['baraka', 'neema'],
  ['juma', 'rehema'],
  ['pendo', 'david'],
  ['baraka', 'juma'],
  ['neema', 'juma'],
  ['baraka', 'pendo'],
  ['neema', 'pendo'],
  ['juma', 'kito'],
  ['rehema', 'kito'],
  ['juma', 'lela'],
  ['pendo', 'demo'],
  ['david', 'demo'],
  ['kito', 'zawadi'],
  ['demo', 'nia'],
]

const SENTENCE = 'Nia is your second cousin — you share great-grandparents Baraka & Neema.'
const HOP_MS = 220

function linkPath(a: string, b: string): string {
  const p = POS[a]
  const q = POS[b]
  if (p.y === q.y) return `M ${p.x},${p.y} L ${q.x},${q.y}`
  const my = (p.y + q.y) / 2
  return `M ${p.x},${p.y} C ${p.x},${my} ${q.x},${my} ${q.x},${q.y}`
}

/**
 * “How are we related?” (family.md §4) — shortest relationship path lit
 * node-by-node (220ms per hop, line-ease), sentence assembles in Fraunces
 * italic, common-ancestor view re-centers on the shared couple.
 */
export default function PathFinder() {
  const reduced = useReducedMotion()
  const path = useMemo(() => findPath('zawadi', 'nia'), [])
  const ancestors = useMemo(() => commonAncestors('zawadi', 'nia'), [])
  const [litHops, setLitHops] = useState(0) // 0 = idle; path.length = done
  const [typed, setTyped] = useState(0)
  const [ancestorView, setAncestorView] = useState(false)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const tracing = litHops > 0 && litHops < path.length
  const done = litHops >= path.length

  const start = () => {
    if (timer.current) clearInterval(timer.current)
    setTyped(0)
    setLitHops(1)
    setAncestorView(false)
    if (reduced) {
      setLitHops(path.length)
      return
    }
    timer.current = setInterval(() => {
      setLitHops((n) => {
        if (n >= path.length) {
          if (timer.current) clearInterval(timer.current)
          return n
        }
        return n + 1
      })
    }, HOP_MS)
  }

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current)
  }, [])

  // Type the sentence in once traversal completes
  useEffect(() => {
    if (!done || reduced) return
    let i = 0
    const t = setInterval(() => {
      i += 2
      setTyped(Math.min(i, SENTENCE.length))
      if (i >= SENTENCE.length) clearInterval(t)
    }, 24)
    return () => clearInterval(t)
  }, [done, reduced])

  const shownChars = reduced && done ? SENTENCE.length : typed

  const litNodes = new Set(path.slice(0, litHops))
  const litLinks = new Set<string>()
  for (let i = 0; i < litHops - 1; i++) {
    const a = path[i]
    const b = path[i + 1]
    litLinks.add(`${a}|${b}`)
    litLinks.add(`${b}|${a}`)
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="overflow-hidden rounded-card-xl border border-[#241F16]/10 bg-[#FFFDF8] shadow-[0_24px_60px_-20px_rgba(36,31,22,0.3)]">
        {/* person chips */}
        <div className="flex items-center justify-center gap-6 border-b border-[#241F16]/8 px-6 py-4">
          <span className="flex items-center gap-2 rounded-full border border-[#D9A648]/50 bg-[#D9A648]/10 py-1.5 pl-1.5 pr-4">
            <Avatar cell={PERSON_MAP.zawadi.cell} size={30} name="You" />
            <span className="text-sm font-bold text-paper-ink">You</span>
          </span>
          <span className="mono-data text-[0.7rem] text-[#9A6B1F]">⇄</span>
          <span className="flex items-center gap-2 rounded-full border border-[#241F16]/15 bg-[#EDE4D3]/60 py-1.5 pl-1.5 pr-4">
            <Avatar cell={PERSON_MAP.nia.cell} size={30} name="Nia K." />
            <span className="text-sm font-bold text-paper-ink">Nia K.</span>
          </span>
        </div>

        {/* tree canvas */}
        <div className="overflow-hidden">
          <motion.svg
            viewBox="0 0 640 460"
            className="h-auto w-full"
            role="img"
            aria-label="Family tree path finder canvas"
            initial={false}
            animate={{ scale: ancestorView ? 1.15 : 1 }}
            transition={{ duration: 0.6, ease: cloudEase }}
            style={{ transformOrigin: '305px 120px' }}
          >
            {/* edges */}
            {LINKS.map(([a, b]) => {
              const lit = litLinks.has(`${a}|${b}`)
              return (
                <path
                  key={`${a}-${b}`}
                  d={linkPath(a, b)}
                  fill="none"
                  stroke={lit ? '#D9A648' : 'rgba(36,31,22,0.14)'}
                  strokeWidth={lit ? 2.4 : 1.4}
                  style={{
                    transition: `stroke 300ms var(--line-ease), stroke-width 300ms var(--line-ease)`,
                    filter: lit ? 'drop-shadow(0 0 6px rgba(217,166,72,0.5))' : undefined,
                  }}
                />
              )
            })}
            {/* nodes */}
            {Object.entries(POS).map(([id, pos]) => {
              const p = PERSON_MAP[id]
              const lit = litNodes.has(id)
              const isEndpoint = id === 'zawadi' || id === 'nia'
              const isAncestor = ancestorView && ancestors.includes(id)
              return (
                <g key={id} transform={`translate(${pos.x},${pos.y})`}>
                  {(lit || isAncestor) && (
                    <circle r={26} fill="none" stroke={isAncestor ? '#3FB27F' : '#D9A648'} strokeWidth={1.6} strokeDasharray={isAncestor ? '3 3' : undefined} />
                  )}
                  <foreignObject x={-19} y={-19} width={38} height={38}>
                    <Avatar
                      cell={p.cell}
                      size={38}
                      name={p.name}
                      className={cn(
                        'transition-all duration-300',
                        lit || isEndpoint || isAncestor ? 'ring-2 ring-[#D9A648] grayscale-0' : 'opacity-70 grayscale-[35%]',
                      )}
                    />
                  </foreignObject>
                  <text
                    textAnchor="middle"
                    y={34}
                    fontSize={10}
                    fontWeight={isEndpoint || lit ? 700 : 500}
                    className={lit || isEndpoint ? 'fill-[#241F16]' : 'fill-[#8A7F6C]'}
                  >
                    {id === 'zawadi' ? 'You' : p.name}
                  </text>
                </g>
              )
            })}
          </motion.svg>
        </div>

        {/* controls + result */}
        <div className="flex flex-col items-center gap-4 border-t border-[#241F16]/8 px-6 py-5">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <ArcButton onClick={start} disabled={tracing}>
              <Sparkles size={16} />
              {done ? 'Trace it again' : 'Find our path'}
            </ArcButton>
            {done && (
              <motion.button
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => setAncestorView((v) => !v)}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#9A6B1F] underline decoration-[#D9A648]/50 underline-offset-4 hover:text-paper-ink"
              >
                <RotateCcw size={14} className={cn(ancestorView && 'rotate-180 transition-transform')} />
                {ancestorView ? 'Back to full tree' : 'Common ancestor view'}
              </motion.button>
            )}
          </div>
          <p className="min-h-[3.2rem] text-center font-display text-lg italic leading-snug text-paper-ink" aria-live="polite">
            {done ? (
              <>
                “{SENTENCE.slice(0, shownChars)}”
                {shownChars < SENTENCE.length && <span className="animate-caret-blink text-[#D9A648]">|</span>}
              </>
            ) : (
              <span className="text-[#8A7F6C] not-italic font-sans text-sm">
                {tracing ? 'Tracing the shortest path across verified edges…' : 'Press the button and watch the graph answer.'}
              </span>
            )}
          </p>
          {ancestorView && (
            <p className="mono-data text-[0.7rem] text-[#2F8F66]">
              Common ancestors: Baraka ⇄ Neema (great-grandparents) — {path.length - 1} verified hops apart
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
