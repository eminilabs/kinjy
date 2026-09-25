import { motion } from 'framer-motion'
import { ArrowLeftRight, Banknote, Bitcoin, Database, Vault } from 'lucide-react'
import { EASE, useReducedMotion } from '@/components/creators/motion-utils'
import { cn } from '@/lib/utils'

const NODES = [
  {
    icon: Bitcoin,
    title: 'Any coin in',
    sub: 'BTC · ETH · SOL · TRX · 350+ more',
    mono: '0.0286 ETH received',
  },
  {
    icon: Database,
    title: 'NowPayments custody',
    sub: 'receipts land in the merchant custody balance by default',
    mono: 'custody: open balance',
  },
  {
    icon: ArrowLeftRight,
    title: 'Off-chain autoconversion',
    sub: 'internal swap inside custody — no on-chain hops, fast and cheap',
    mono: 'ETH → USDT @ market',
  },
  {
    icon: Banknote,
    title: 'USDT · BSC balance',
    sub: 'every receipt settles into one stable treasury asset',
    mono: 'balance: 100.00 usdtbsc',
  },
  {
    icon: Vault,
    title: 'Company safe wallet',
    sub: 'batched treasury sweeps to the configured BSC payout wallet',
    mono: '0xSAF3…4d6A · whitelisted',
  },
]

/** Section 3 — Autoconversion pipeline: any coin → custody → USDT BSC → safe wallet. */
export default function AutoconversionPipeline() {
  const reduced = useReducedMotion()

  return (
    <section className="noise-overlay twilight-field px-6 py-24 md:py-32">
      <div className="mx-auto max-w-container">
        <p className="eyebrow text-gold">Treasury — Autoconversion pipeline</p>
        <h2 className="h2 mt-4 max-w-2xl">
          350 coins in. <span className="text-gold-grad font-display italic">One asset out.</span>
        </h2>
        <p className="body-lg mt-4 max-w-2xl text-text-mid">
          Kinjy never holds a zoo of volatile tokens. Everything members pay is converted inside
          NowPayments custody — off-chain, balance-to-balance — into a single BSC USDT treasury
          balance, then swept to the company safe wallet.
        </p>

        {/* pipeline */}
        <div className="relative mt-14">
          <div className="grid gap-4 md:grid-cols-5">
            {NODES.map((n, i) => (
              <div key={n.title} className="relative">
                {/* connector arc */}
                {i < NODES.length - 1 && (
                  <svg
                    aria-hidden="true"
                    className="absolute -right-5 top-9 z-10 hidden h-8 w-10 md:block"
                    viewBox="0 0 40 32"
                    fill="none"
                  >
                    <motion.path
                      d="M2 26 C 14 26, 20 6, 38 6"
                      stroke="url(#pipeGrad)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      initial={{ pathLength: reduced ? 1 : 0, opacity: 0 }}
                      whileInView={{ pathLength: 1, opacity: 1 }}
                      viewport={{ once: true, margin: '-15%' }}
                      transition={{ delay: 0.25 + i * 0.3, duration: 0.9, ease: [0.65, 0, 0.35, 1] }}
                    />
                    <defs>
                      <linearGradient id="pipeGrad" x1="0" y1="0" x2="40" y2="0" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#F0C878" />
                        <stop offset="0.55" stopColor="#D9A648" />
                        <stop offset="1" stopColor="#8FB8E8" />
                      </linearGradient>
                    </defs>
                  </svg>
                )}
                <motion.div
                  className={cn('cloud-card cloud-card-hover h-full p-5', i === 4 && 'shadow-gold-ring')}
                  initial={reduced ? false : { opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-15%' }}
                  transition={{ delay: i * 0.3, duration: 0.6, ease: EASE }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-9 w-9 items-center justify-center rounded-full"
                      style={{ background: i === 4 ? 'var(--grad-gold-sheen)' : 'var(--grad-orb)' }}
                    >
                      <n.icon size={16} className="text-ink" aria-hidden="true" />
                    </span>
                    <span className="mono-data text-xs text-text-low">0{i + 1}</span>
                  </div>
                  <h3 className="mt-4 font-sans text-base font-semibold text-text-hi">{n.title}</h3>
                  <p className="caption mt-1.5">{n.sub}</p>
                  <p className="mono-data mt-3 rounded-card-sm border border-white/10 bg-ink/60 px-2.5 py-1.5 text-[0.7rem] text-gold-soft">
                    {n.mono}
                  </p>
                </motion.div>
              </div>
            ))}
          </div>

          {/* travelling packet along the pipeline (ambient, desktop, motion-safe) */}
          {!reduced && (
            <motion.div
              aria-hidden="true"
              className="absolute -top-3 left-0 hidden h-2.5 w-2.5 rounded-full bg-gold-soft shadow-[0_0_12px_rgba(240,200,120,0.8)] md:block"
              animate={{ left: ['1%', '98%'], opacity: [0, 1, 1, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', times: [0, 0.08, 0.92, 1] }}
            />
          )}
        </div>

        {/* honest footnote: the $50 custody floor */}
        <motion.div
          className="mono-data mt-10 flex flex-wrap items-start gap-3 rounded-card-md border border-white/10 bg-white/[0.03] p-4 text-xs leading-relaxed text-text-mid"
          initial={reduced ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <span className="rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-warning">note</span>
          <p className="min-w-0 flex-1">
            NowPayments custody withdrawals carry a <span className="text-gold-soft">$50 minimum</span> — so
            treasury sweeps to the safe wallet are <span className="text-text-hi">batched</span>, not per-payment.
            The internal autoconversion is off-chain and unaffected; per-coin on-chain network minimums still apply
            to the member's initial deposit.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
