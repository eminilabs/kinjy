import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { KineticWords } from '@/components/platform/shared'
import { Eyebrow, Stage } from '@/components/landing/PageKit'
import { EASE, useReducedMotion } from '@/components/creators/motion-utils'

const COIN_CHIPS = [
  { sym: 'BTC', amt: '0.00104', usd: '$100.00', x: '6%', y: '14%', delay: 0 },
  { sym: 'ETH', amt: '0.0286', usd: '$100.00', x: '58%', y: '9%', delay: 0.6 },
  { sym: 'USDT·BSC', amt: '100.00', usd: '$100.00', x: '30%', y: '36%', delay: 1.2 },
]

const STATS = [
  { k: '350+', v: 'supported coins via NowPayments' },
  { k: '$1', v: 'minimum commission cashout' },
  { k: '10', v: 'levels of affiliate allocation' },
  { k: '0%', v: 'service fee on member payouts' },
]

/** Section 1 — the landing's split: the promise, and three coins settling into one USDT balance. */
export default function PaymentsHero() {
  const reduced = useReducedMotion()
  const rise = (delay: number) =>
    reduced ? {} : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6, delay, ease: EASE } }
  const toCheckout = () =>
    document.getElementById('crypto-checkout')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' })

  return (
    <header className="kl-split kl-pad-x gap-[clamp(40px,6vw,96px)] pb-24 pt-14">
      <div className="min-w-0">
        <motion.div {...rise(0.1)}>
          <Eyebrow>Payments · NowPayments crypto rail</Eyebrow>
        </motion.div>
        <KineticWords
          as="h1"
          text="Pay and get paid in crypto."
          className="kl-serif mt-6 block text-balance text-[clamp(44px,6.6vw,96px)] font-semibold leading-[0.96] tracking-[-0.02em]"
        />
        <motion.p className="mt-8 max-w-[520px] text-[18px] leading-[1.6] text-[var(--kl-mid)]" {...rise(0.45)}>
          The payments rail of the social economy. Members pay for subscriptions, ad credit and
          marketplace goods in any of 350+ cryptocurrencies — auto-converted into BSC USDT and swept
          to Kinjy's safe wallet. Money for a marketplace order goes to a licensed custodian instead,
          and reaches the seller only once the buyer confirms receipt. Commission flows back to the
          buyer's sponsor automatically, the moment a balance reaches one dollar.
        </motion.p>
        <motion.div className="mt-10 flex flex-wrap items-center gap-4" {...rise(0.6)}>
          <button
            type="button"
            onClick={toCheckout}
            className="kl-sheen inline-flex items-center gap-[18px] rounded-[20px] py-[7px] pe-[7px] ps-[30px] text-[17px] font-semibold shadow-[0_14px_30px_-12px_rgba(169,118,28,.55)] transition-transform hover:-translate-y-0.5"
          >
            Try the crypto checkout
            <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-[var(--kl-night)]" aria-hidden="true">
              <ArrowDown size={18} />
            </span>
          </button>
          <Link
            to="/pricing"
            className="rounded-[20px] border border-[var(--kl-paper-2)] px-6 py-4 font-semibold transition-colors hover:border-[var(--kl-gold)] hover:text-[var(--kl-gold-deep)]"
          >
            See membership tiers
          </Link>
        </motion.div>
        <motion.dl className="mt-14 grid max-w-[560px] grid-cols-2 gap-x-6 gap-y-6 border-t border-[var(--kl-paper-2)] pt-6 sm:grid-cols-4" {...rise(0.75)}>
          {STATS.map((s) => (
            <div key={s.v}>
              <dt className="kl-serif text-[36px] font-semibold leading-none">{s.k}</dt>
              <dd className="mt-2 text-[13px] leading-snug text-[var(--kl-low)]">{s.v}</dd>
            </div>
          ))}
        </motion.dl>
      </div>

      {/* Three coins in, one balance out */}
      <Stage className="min-w-0" glows={['var(--kl-sky)', '#D9A648']}>
        <div className="relative h-[460px]" aria-hidden="true">
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 520 460" preserveAspectRatio="none" fill="none">
            {['M110 110 C 160 220, 230 250, 260 330', 'M400 90 C 380 200, 300 250, 260 330', 'M250 210 C 255 260, 258 290, 260 330'].map((d) => (
              <path key={d} d={d} stroke="var(--kl-dash)" strokeWidth="1.6" strokeDasharray="4 6" />
            ))}
          </svg>
          {COIN_CHIPS.map((c, i) => (
            <div
              key={c.sym}
              className={cn('absolute rounded-2xl bg-[var(--kl-surface)] px-4 py-3 shadow-[0_20px_40px_-26px_var(--kl-shadow)]', !reduced && 'kl-float')}
              style={{ left: c.x, top: c.y, ['--kl-dur' as string]: `${6 + i}s` }}
            >
              <p className="kl-mono text-[11px] text-[var(--kl-low)]">{c.sym}</p>
              <p className="kl-mono mt-0.5 text-sm font-semibold">
                {c.amt} <span className="font-normal text-[var(--kl-mid)]">≈ {c.usd}</span>
              </p>
            </div>
          ))}
          <div className="absolute inset-x-0 bottom-10 flex justify-center">
            <div className="w-[260px] rounded-2xl bg-[var(--kl-surface)] p-5 text-center shadow-[0_30px_60px_-32px_var(--kl-shadow)]">
              <span className="kl-sheen inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold">settled</span>
              <p className="kl-serif mt-3 text-[34px] font-semibold leading-none">300.00</p>
              <p className="kl-mono mt-1.5 text-[11px] text-[var(--kl-low)]">USDT · BSC — one treasury asset</p>
            </div>
          </div>
        </div>
      </Stage>
    </header>
  )
}
