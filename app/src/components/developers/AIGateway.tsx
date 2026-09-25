import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, RefreshCw, Route } from 'lucide-react'

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

const REQUESTS = [
  { id: 'translate', label: 'translate', detail: 'SW → EN · 40 tok', color: '#8FB8E8', y: 60 },
  { id: 'summarize', label: 'summarize', detail: 'longread · 6k tok', color: '#F0C878', y: 150 },
  { id: 'generate', label: 'generate', detail: 'image prompt', color: '#E07856', y: 240 },
]

const MODELS = [
  { id: 'kimi', label: 'Kimi', meta: 'fast · $0.08/1k', y: 60 },
  { id: 'deepseek', label: 'DeepSeek', meta: 'accurate · $0.14/1k', y: 150 },
  { id: 'aurora', label: 'Aurora', meta: 'multimodal · $0.22/1k', y: 240 },
]

/** Rotation schedules: which model index each request routes to, per replay round. */
const SCHEDULES: number[][] = [
  [0, 1, 2],
  [1, 0, 2],
  [2, 1, 0],
  [0, 2, 1],
]

const LATENCIES = ['118ms', '204ms', '341ms', '96ms', '262ms', '187ms']

const GATEWAY = { x: 280, y: 150 }
const RX = 64 // request node right edge x
const MX = 460 // model node x

function PulseDot({ fromY, toY, color, delay, round }: { fromY: number; toY: number; color: string; delay: number; round: number }) {
  return (
    <motion.span
      key={round}
      aria-hidden="true"
      className="absolute h-2.5 w-2.5 rounded-full"
      style={{ background: color, boxShadow: `0 0 10px 2px ${color}66`, left: 0, top: 0 }}
      initial={{ x: RX, y: fromY - 5, opacity: 0 }}
      animate={{
        x: [RX, GATEWAY.x - 5, MX - 5],
        y: [fromY - 5, GATEWAY.y - 5, toY - 5],
        opacity: [0, 1, 1, 0],
      }}
      transition={{ duration: 0.8, delay, ease: 'easeInOut', times: [0, 0.45, 1] }}
    />
  )
}

/** Section 5 — AI Gateway routing diagram with replayable decisions. */
export default function AIGateway() {
  const [round, setRound] = useState(0)
  const [latency, setLatency] = useState(0)
  const assignment = SCHEDULES[round % SCHEDULES.length]

  const replay = useCallback(() => {
    setRound((r) => r + 1)
    setLatency((l) => l + 1)
  }, [])

  // auto-run once when scrolled into view
  useEffect(() => {
    const t = setTimeout(() => setRound(1), 1200)
    return () => clearTimeout(t)
  }, [])

  return (
    <section className="noise-overlay relative bg-ink px-6 py-24 md:py-28">
      <div className="mx-auto grid max-w-container items-center gap-14 lg:grid-cols-[5fr_6fr]">
        {/* Left copy */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-15%' }}
          transition={{ duration: 0.65, ease: EASE }}
        >
          <p className="eyebrow text-sky">Kinjy AI Gateway</p>
          <h3 className="h3 mt-4 font-display text-3xl font-medium">
            One gateway. <span className="text-gold-grad">Every worthy model.</span>
          </h3>
          <ul className="mt-7 space-y-3.5">
            {[
              'Never hard-coded to a single provider — the router chooses per request',
              'Routes by task, accuracy, language, cost, speed and data sensitivity',
              'Current roster: Kimi, DeepSeek and others — swapped without app changes',
              'Premium plans include an API allowance for your own agents',
            ].map((b, i) => (
              <motion.li
                key={b}
                initial={{ opacity: 0, x: -18 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-10%' }}
                transition={{ delay: 0.15 + i * 0.09, duration: 0.45, ease: EASE }}
                className="flex items-start gap-3 text-text-mid"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky/15 text-sky">
                  <Check size={12} aria-hidden="true" />
                </span>
                {b}
              </motion.li>
            ))}
          </ul>
        </motion.div>

        {/* Right: routing diagram */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-15%' }}
          transition={{ duration: 0.7, ease: EASE }}
          className="cloud-card overflow-hidden"
        >
          <div className="flex items-center justify-between border-b border-white/10 bg-ink-3/70 px-5 py-3">
            <span className="mono-data flex items-center gap-2 text-xs text-text-low">
              <Route size={13} className="text-gold" aria-hidden="true" />
              gateway.kaluta.ai/route
            </span>
            <button
              type="button"
              onClick={replay}
              className="mono-data inline-flex items-center gap-1.5 rounded-full border border-gold/35 bg-gold/10 px-3 py-1 text-xs text-gold-soft transition-colors hover:bg-gold/20"
            >
              <RefreshCw size={12} aria-hidden="true" />
              route replay
            </button>
          </div>

          <div className="overflow-x-auto bg-ink-3/40 p-4">
            <div className="relative h-[300px] w-[560px]">
              {/* wires */}
              <svg viewBox="0 0 560 300" className="absolute inset-0 h-full w-full" aria-hidden="true">
                {REQUESTS.map((r) => (
                  <path
                    key={r.id}
                    d={`M ${RX} ${r.y} C 150 ${r.y}, 200 ${GATEWAY.y}, ${GATEWAY.x - 26} ${GATEWAY.y}`}
                    fill="none"
                    stroke="rgba(255,255,255,0.14)"
                    strokeWidth="1.3"
                  />
                ))}
                {MODELS.map((m, mi) => {
                  const active = REQUESTS.some((_, ri) => assignment[ri] === mi)
                  return (
                    <motion.path
                      key={m.id}
                      d={`M ${GATEWAY.x + 26} ${GATEWAY.y} C 360 ${GATEWAY.y}, 400 ${m.y}, ${MX} ${m.y}`}
                      fill="none"
                      stroke={active ? 'rgba(217,166,72,0.55)' : 'rgba(255,255,255,0.1)'}
                      strokeWidth={active ? 1.6 : 1.2}
                      animate={{ stroke: active ? 'rgba(217,166,72,0.55)' : 'rgba(255,255,255,0.1)' }}
                      transition={{ duration: 0.5 }}
                    />
                  )
                })}
              </svg>

              {/* pulses */}
              {REQUESTS.map((r, ri) => (
                <PulseDot
                  key={r.id}
                  round={round}
                  fromY={r.y}
                  toY={MODELS[assignment[ri]].y}
                  color={r.color}
                  delay={ri * 0.18}
                />
              ))}

              {/* request nodes */}
              {REQUESTS.map((r) => (
                <div
                  key={r.id}
                  className="force-dark absolute flex w-[104px] flex-col rounded-card-sm border px-2.5 py-1.5"
                  style={{
                    left: RX - 104,
                    top: r.y,
                    transform: 'translateY(-50%)',
                    borderColor: `${r.color}55`,
                    background: 'rgba(11,14,29,0.85)',
                  }}
                >
                  <span className="font-mono text-[0.72rem] font-semibold" style={{ color: r.color }}>
                    {r.label}
                  </span>
                  <span className="font-mono text-[0.58rem] text-text-low">{r.detail}</span>
                </div>
              ))}

              {/* gateway node */}
              <div
                className="force-dark absolute flex h-[68px] w-[68px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-gold/45"
                style={{ left: GATEWAY.x, top: GATEWAY.y, background: 'radial-gradient(circle, #1A1F3B 30%, #0B0E1D 80%)' }}
              >
                <motion.span
                  key={round}
                  initial={{ rotate: 0 }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.9, ease: [0.65, 0, 0.35, 1] }}
                  className="font-mono text-[0.6rem] font-semibold text-gold-soft"
                >
                  router
                </motion.span>
              </div>

              {/* model nodes */}
              {MODELS.map((m, mi) => {
                const servedBy = REQUESTS.filter((_, ri) => assignment[ri] === mi)
                return (
                  <motion.div
                    key={m.id}
                    layout
                    className="absolute w-[120px] rounded-card-sm border px-2.5 py-1.5"
                    style={{
                      left: MX + 12,
                      top: m.y,
                      transform: 'translateY(-50%)',
                      borderColor: servedBy.length ? 'rgba(217,166,72,0.5)' : 'rgba(255,255,255,0.14)',
                      background: 'rgba(11,14,29,0.85)',
                    }}
                    animate={{ opacity: servedBy.length ? 1 : 0.55 }}
                    transition={{ duration: 0.4 }}
                  >
                    <p className="font-mono text-[0.72rem] font-semibold text-text-hi">{m.label}</p>
                    <p className="font-mono text-[0.58rem] text-text-low">{m.meta}</p>
                    {servedBy.length > 0 && (
                      <motion.p
                        key={`${round}-${mi}`}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.75, duration: 0.35 }}
                        className="mt-0.5 font-mono text-[0.58rem] text-gold-soft"
                      >
                        ← {servedBy.map((r) => r.label).join(', ')} ·{' '}
                        {LATENCIES[(latency + mi) % LATENCIES.length]}
                      </motion.p>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </div>

          <p className="border-t border-white/10 px-5 py-3 font-mono text-[0.68rem] text-text-low">
            decision #{round + 1} · weights: accuracy 0.35 · cost 0.2 · speed 0.2 · language 0.15 · sensitivity 0.1
          </p>
        </motion.div>
      </div>
    </section>
  )
}
