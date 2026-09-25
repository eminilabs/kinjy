import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, animate, motion } from 'framer-motion'
import { Check, Lock, LockOpen, Play, RotateCcw, Send, ShieldCheck, Users } from 'lucide-react'
import { ArcButton, LedgerRow } from '@/components/ui-kit'
import { cn } from '@/lib/utils'
import { EASE, useReducedMotion } from '@/components/creators/motion-utils'

/* ------------------------------------------------------------------ */
/* The direct split: a $120 agency purchase                            */
/* ------------------------------------------------------------------ */
/* This used to be a ten-rung ladder. It is three rows now, and that is the
   point of the programme rather than a simplification of the diagram: the
   seller's money is not Kinjy's to give away, and only one person is paid a
   commission on the buyer's activity. */

const SELLER = { label: 'Seller', amount: 100, note: 'their own asking price, untouched' }

const SPLIT = [
  {
    key: 'sponsor',
    label: 'The buyer’s sponsor',
    pct: 20,
    amount: 4,
    note: '20% of Kinjy’s revenue — the one and only commission level',
    tone: 'gold' as const,
  },
  {
    key: 'leaders',
    label: 'Kinjy Leaders',
    pct: 5,
    amount: 1,
    note: 'set aside as it is earned, shared monthly by the top 10,000',
    tone: 'sky' as const,
  },
  {
    key: 'platform',
    label: 'Kinjy platform',
    pct: 75,
    amount: 15,
    note: 'custody, moderation, infrastructure — and it funds the pool',
    tone: 'muted' as const,
  },
]

/** Left: where a $120 purchase actually goes. */
function LevelSplit() {
  const reduced = useReducedMotion()
  // 0 idle · 1 seller paid · 2..4 the markup splits
  const [stage, setStage] = useState(0)
  const [running, setRunning] = useState(false)
  const timers = useRef<number[]>([])

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
  }
  useEffect(() => clearTimers, [])

  const run = useCallback(() => {
    clearTimers()
    setStage(0)
    setRunning(true)
    for (let s = 1; s <= 4; s += 1) {
      timers.current.push(
        window.setTimeout(
          () => {
            setStage(s)
            if (s === 4) setRunning(false)
          },
          reduced ? 40 * s : 150 + s * 520,
        ),
      )
    }
  }, [reduced])

  return (
    <div className="cloud-card p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow text-text-low">The $120 split</p>
          <h3 className="h3 mt-2">One purchase. One commission.</h3>
        </div>
        <ArcButton size="sm" variant={stage >= 4 ? 'ghost' : 'gold'} onClick={run} disabled={running}>
          {stage >= 4 ? (
            <>
              <RotateCcw size={14} aria-hidden="true" /> Replay split
            </>
          ) : (
            <>
              <Play size={14} aria-hidden="true" /> Run the split
            </>
          )}
        </ArcButton>
      </div>

      {/* purchase origin */}
      <div className="mt-6 flex items-center gap-4 rounded-card-md border border-gold/30 bg-gold/[0.06] px-4 py-3">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: 'var(--grad-gold-sheen)' }}
        >
          <Send size={16} className="text-ink" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-text-hi">Service purchase · photography session</p>
          <p className="caption">seller asks $100 · Kinjy adds a 20% markup · held in escrow until confirmed</p>
        </div>
        <span className="mono-data text-lg font-semibold text-gold-soft">$120.00</span>
      </div>

      {/* the seller is paid first, out of their own price */}
      <motion.div
        className={cn(
          'mt-4 flex items-center gap-4 rounded-card-md border px-4 py-3 transition-colors duration-300',
          stage >= 1 ? 'border-white/20 bg-white/[0.04]' : 'border-white/10 bg-white/[0.02] opacity-60',
        )}
        initial={false}
        animate={stage >= 1 && !reduced ? { scale: [0.97, 1.01, 1] } : { scale: 1 }}
        transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
      >
        <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border border-white/20 bg-ink-2">
          <Users size={15} className="text-text-mid" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-text-hi">{SELLER.label}</p>
          <p className="caption">{SELLER.note}</p>
        </div>
        <span className="mono-data font-semibold text-text-hi">
          {stage >= 1 ? `+$${SELLER.amount.toFixed(2)}` : `$${SELLER.amount.toFixed(2)}`}
        </span>
      </motion.div>

      <p className="mono-data mt-5 text-center text-[0.68rem] uppercase tracking-wider text-text-low">
        the $20 markup — Kinjy’s revenue — splits three ways
      </p>

      <ul className="mt-3 space-y-2.5">
        {SPLIT.map((row, i) => {
          const on = stage > i + 1
          return (
            <motion.li
              key={row.key}
              className={cn(
                'flex items-center gap-4 rounded-card-md border px-4 py-3 transition-colors duration-300',
                on
                  ? row.tone === 'gold'
                    ? 'border-gold/40 bg-gold/[0.06]'
                    : row.tone === 'sky'
                      ? 'border-sky/35 bg-sky/[0.05]'
                      : 'border-white/15 bg-white/[0.03]'
                  : 'border-white/10 bg-white/[0.02] opacity-60',
              )}
              initial={false}
              animate={on && !reduced ? { scale: [0.97, 1.02, 1] } : { scale: 1 }}
              transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
            >
              <span
                className={cn(
                  'mono-data flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border text-[0.7rem] font-bold',
                  on
                    ? row.tone === 'gold'
                      ? 'border-gold bg-gradient-to-br from-gold-soft to-gold text-ink'
                      : row.tone === 'sky'
                        ? 'border-sky bg-sky/25 text-text-hi'
                        : 'border-white/20 bg-ink-2 text-text-mid'
                    : 'border-white/15 bg-ink-2 text-text-low',
                )}
              >
                {row.pct}%
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn('text-sm font-medium', on ? 'text-text-hi' : 'text-text-low')}>{row.label}</p>
                <p className="caption">{row.note}</p>
              </div>
              <AnimatePresence>
                {on && (
                  <motion.span
                    key="amt"
                    className={cn(
                      'mono-data font-semibold',
                      row.tone === 'gold' ? 'text-gold-soft' : row.tone === 'sky' ? 'text-sky' : 'text-text-mid',
                    )}
                    initial={reduced ? false : { opacity: 0, x: 14 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35, ease: EASE }}
                  >
                    +${row.amount.toFixed(2)}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.li>
          )
        })}
      </ul>

      <p className="mono-data mt-4 text-xs text-text-low">
        100 + 4 + 1 + 15 = 120 — every cent allocated in the same immutable ledger entry.
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* $1 escrow accumulator + Mass Payouts batch                          */
/* ------------------------------------------------------------------ */
const COMMISSION_EVENTS = [
  { from: 0.62, to: 0.88, chip: '+$0.26 · marketplace sale' },
  { from: 0.88, to: 1.04, chip: '+$0.16 · subscription renewal' },
]

const PAYOUT_STEPS = [
  { mono: 'POST /v1/payout', label: 'batch created — withdrawals queued (1000+ per call)' },
  { mono: 'POST /v1/payout/verify', label: '2FA code verified — batch authorized' },
  { mono: 'GET /v1/payout/:id', label: 'tracked to settled · avg ≈ 5 min · 0% service fee' },
]

function EscrowAccumulator() {
  const reduced = useReducedMotion()
  const [balance, setBalance] = useState(0.62)
  const [eventIdx, setEventIdx] = useState(-1) // which commission chip is visible
  const [released, setReleased] = useState(false)
  const [payoutStage, setPayoutStage] = useState(0) // 0 none · 1..3 steps
  const [running, setRunning] = useState(false)
  const timers = useRef<number[]>([])
  const controls = useRef<{ stop: () => void } | null>(null)

  const clearAll = () => {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
    controls.current?.stop()
    controls.current = null
  }
  useEffect(() => clearAll, [])

  const tweenTo = useCallback(
    (from: number, to: number, done: () => void) => {
      if (reduced) {
        setBalance(to)
        done()
        return
      }
      controls.current = animate(from, to, {
        duration: 0.9,
        ease: [0.22, 1, 0.36, 1],
        onUpdate: (v) => setBalance(v),
        onComplete: done,
      })
    },
    [reduced],
  )

  const run = useCallback(() => {
    clearAll()
    setRunning(true)
    setBalance(0.62)
    setEventIdx(-1)
    setReleased(false)
    setPayoutStage(0)
    const step = reduced ? 120 : 1400

    timers.current.push(window.setTimeout(() => setEventIdx(0), step * 0.5))
    timers.current.push(
      window.setTimeout(() => {
        tweenTo(COMMISSION_EVENTS[0].from, COMMISSION_EVENTS[0].to, () => {
          timers.current.push(window.setTimeout(() => setEventIdx(1), step * 0.5))
          timers.current.push(
            window.setTimeout(() => {
              tweenTo(COMMISSION_EVENTS[1].from, COMMISSION_EVENTS[1].to, () => {
                setReleased(true)
                for (let s = 1; s <= 3; s += 1) {
                  timers.current.push(
                    window.setTimeout(() => {
                      setPayoutStage(s)
                      if (s === 3) setRunning(false)
                    }, (reduced ? 100 : 1100) * s),
                  )
                }
              })
            }, step),
          )
        })
      }, step),
    )
  }, [reduced, tweenTo])

  const pct = Math.min(balance / 1, 1) * 100

  return (
    <div className="flex flex-col gap-6">
      {/* member escrow card */}
      <div className="cloud-card gold p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-full font-display text-lg" style={{ background: 'var(--grad-orb)' }}>
              <span className="text-ink">A</span>
            </span>
            <div>
              <p className="font-semibold text-text-hi">Demo K. — commission escrow</p>
              <p className="caption">verified · BSC wallet whitelisted</p>
            </div>
          </div>
          <ArcButton size="sm" variant={released ? 'ghost' : 'gold'} onClick={run} disabled={running}>
            {released ? (
              <>
                <RotateCcw size={14} aria-hidden="true" /> Replay
              </>
            ) : (
              'Simulate commissions'
            )}
          </ArcButton>
        </div>

        {/* balance + progress to $1 */}
        <div className="mt-6">
          <div className="flex items-end justify-between">
            <span className="mono-data text-4xl font-semibold text-gold-soft">${balance.toFixed(2)}</span>
            <span className="mono-data text-xs text-text-low">threshold $1.00</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full"
              style={{ width: `${pct}%`, background: released ? 'var(--success)' : 'var(--grad-arc)' }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* incoming commission chips */}
          <div className="mt-4 min-h-[30px] space-y-2">
            <AnimatePresence>
              {eventIdx >= 0 &&
                COMMISSION_EVENTS.slice(0, eventIdx + 1).map((e) => (
                  <motion.p
                    key={e.chip}
                    className="mono-data inline-block rounded-full border border-success/40 bg-success/10 px-3 py-1 text-xs text-success"
                    initial={reduced ? false : { opacity: 0, y: -8, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
                  >
                    {e.chip}
                  </motion.p>
                ))}
            </AnimatePresence>
          </div>

          {/* escrow lock */}
          <div
            className={cn(
              'mt-5 flex items-center gap-4 rounded-card-md border p-4 transition-colors duration-500',
              released ? 'border-success/40 bg-success/[0.07]' : 'border-white/10 bg-white/[0.02]',
            )}
          >
            <motion.span
              key={released ? 'open' : 'closed'}
              initial={reduced ? false : { scale: 0.5, rotate: released ? -14 : 0 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full',
                released ? 'bg-success/20 text-success' : 'bg-white/[0.06] text-text-mid',
              )}
            >
              {released ? <LockOpen size={17} aria-hidden="true" /> : <Lock size={17} aria-hidden="true" />}
            </motion.span>
            <div className="min-w-0 flex-1">
              <p className={cn('text-sm font-semibold', released ? 'text-success' : 'text-text-hi')}>
                {released ? 'Escrow released — $1 threshold reached' : 'Held in custody escrow'}
              </p>
              <p className="caption">
                {released
                  ? 'Demo joins the next Mass Payouts batch to her whitelisted BSC wallet.'
                  : 'Your commissions are held securely in the NowPayments custody balance until you reach $1.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mass Payouts batch */}
      <div className="cloud-card p-6 sm:p-8">
        <p className="eyebrow inline-flex items-center gap-2 text-text-low">
          <Users size={14} aria-hidden="true" /> Mass Payouts batch · money out
        </p>
        <ul className="mt-5 space-y-3">
          {PAYOUT_STEPS.map((s, i) => {
            const on = payoutStage > i
            return (
              <li
                key={s.mono}
                className={cn(
                  'flex items-start gap-3 rounded-card-md border p-3.5 transition-colors duration-300',
                  on ? 'border-gold/30 bg-gold/[0.04]' : 'border-white/8 bg-white/[0.02] opacity-55',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[0.65rem]',
                    on ? 'border-success bg-success/15 text-success' : 'border-white/15 text-text-low',
                  )}
                >
                  {on ? <Check size={11} aria-hidden="true" /> : i + 1}
                </span>
                <div className="min-w-0">
                  <p className="mono-data text-xs text-sky">{s.mono}</p>
                  <p className="caption mt-0.5">{s.label}</p>
                </div>
              </li>
            )
          })}
        </ul>
        <AnimatePresence>
          {payoutStage >= 3 && (
            <motion.div
              key="paid"
              initial={reduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: EASE }}
              className="mt-4"
            >
              <LedgerRow
                id="po-55231"
                label="Mass Payout — Demo K. · 0xSAF3…4d6A (whitelisted)"
                amount="-$1.04 USDT·BSC"
                reconciled
                timestamp="settled"
              />
            </motion.div>
          )}
        </AnimatePresence>
        <p className="mono-data mt-5 flex items-start gap-2 text-[0.7rem] leading-relaxed text-text-low">
          <ShieldCheck size={13} className="mt-0.5 shrink-0 text-gold" aria-hidden="true" />
          The $1 rule works because payouts are batched off-chain from custody. Treasury custody
          withdrawals carry a $50 floor; per-coin on-chain network minimums apply.
        </p>
      </div>
    </div>
  )
}

/** Section 4 — Commission cashout engine: 10-level split + $1 escrow + Mass Payouts. */
export default function CashoutEngine() {
  const reduced = useReducedMotion()
  return (
    <section className="noise-overlay px-6 py-24 md:py-32" style={{ background: 'var(--ink)' }}>
      <div className="mx-auto max-w-container">
        <p className="eyebrow text-gold">Money out — Commission cashout engine</p>
        <h2 className="h2 mt-4 max-w-3xl">
          One sponsor, paid from our own margin.{' '}
          <span className="text-gold-grad font-display italic">One dollar out the door.</span>
        </h2>
        <p className="body-lg mt-4 max-w-2xl text-text-mid">
          Every purchase allocates commissions across ten inviter levels in the immutable ledger.
          Balances under $1 rest in NowPayments custody escrow; the moment they cross a dollar, the
          member is swept into the next Mass Payouts batch — automatically.
        </p>
        <motion.div
          className="mt-12 grid items-start gap-8 lg:grid-cols-2"
          initial={reduced ? false : { opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-10%' }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          <LevelSplit />
          <EscrowAccumulator />
        </motion.div>
      </div>
    </section>
  )
}
