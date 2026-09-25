import { useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import { ArrowDown } from 'lucide-react'
import { ArcButton } from '@/components/ui-kit'
import { KineticWords } from '@/components/creators/Kinetic'
import { EASE, useReducedMotion } from '@/components/creators/motion-utils'

const COIN_CHIPS = [
  { sym: 'BTC', amt: '0.00104', usd: '$100.00', x: '6%', y: '16%', delay: 0 },
  { sym: 'ETH', amt: '0.0286', usd: '$100.00', x: '66%', y: '10%', delay: 0.6 },
  { sym: 'USDT·BSC', amt: '100.00', usd: '$100.00', x: '40%', y: '62%', delay: 1.2 },
]

const STATS = [
  { k: '350+', v: 'supported coins via NowPayments' },
  { k: '$1', v: 'minimum commission cashout' },
  { k: '10', v: 'levels of affiliate allocation' },
  { k: '0%', v: 'service fee on member payouts' },
]

/** Section 1 — Payments hero: the crypto rail of the social economy. */
export default function PaymentsHero() {
  const reduced = useReducedMotion()
  const navigate = useNavigate()

  return (
    <section className="noise-overlay twilight-field relative -mt-[72px] flex min-h-[85dvh] items-center overflow-hidden px-6 pb-20 pt-[72px]">
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 78% 78%, rgba(217,166,72,0.12), transparent 55%), radial-gradient(ellipse at 30% 20%, rgba(46,42,110,0.9) 0%, rgba(11,14,29,0.94) 62%)',
        }}
      />

      {/* floating coin chips — mono-data accents, bobbing */}
      {!reduced &&
        COIN_CHIPS.map((c) => (
          <motion.div
            key={c.sym}
            aria-hidden="true"
            className="cloud-card absolute hidden px-4 py-2.5 md:block"
            style={{ left: c.x, top: c.y }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: [0, -8, 0, 8, 0] }}
            transition={{
              opacity: { delay: 1 + c.delay * 0.3, duration: 0.6 },
              y: { delay: 1 + c.delay * 0.3, duration: 6, repeat: Infinity, ease: 'easeInOut', times: [0, 0.25, 0.5, 0.75, 1] },
            }}
          >
            <p className="mono-data text-[0.7rem] text-text-low">{c.sym}</p>
            <p className="mono-data text-sm font-semibold text-gold-soft">
              {c.amt} <span className="text-text-mid">≈ {c.usd}</span>
            </p>
          </motion.div>
        ))}

      <div className="relative mx-auto w-full max-w-container">
        <motion.p
          className="eyebrow text-gold"
          initial={reduced ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          Payments — NowPayments crypto rail
        </motion.p>
        <KineticWords
          className="display-lg mt-5 max-w-3xl"
          ariaLabel="Pay and get paid in crypto."
          words={[
            { text: 'Pay' },
            { text: 'and' },
            { text: 'get' },
            { text: 'paid', gold: true },
            { text: 'in' },
            { text: 'crypto.', gold: true },
          ]}
        />
        <motion.p
          className="body-lg mt-6 max-w-xl text-text-mid"
          initial={reduced ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75, duration: 0.7, ease: EASE }}
        >
          The payments rail of the social economy. Members pay for subscriptions, ad credit and
          marketplace goods in any of 350+ cryptocurrencies — auto-converted into BSC USDT and swept
          to Kinjy's safe wallet. Money for a marketplace order goes to a licensed custodian instead,
          and reaches the seller only once the buyer confirms receipt. Commission flows back to the
          buyer's sponsor automatically, the moment a balance reaches one dollar.
        </motion.p>
        <motion.div
          className="mt-9 flex flex-wrap gap-3"
          initial={reduced ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.7, ease: EASE }}
        >
          <ArcButton
            size="lg"
            onClick={() =>
              document.getElementById('crypto-checkout')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' })
            }
          >
            Try the crypto checkout
          </ArcButton>
          <ArcButton size="lg" variant="ghost" onClick={() => navigate('/pricing')}>
            See membership tiers
          </ArcButton>
        </motion.div>

        <motion.dl
          className="mt-14 grid grid-cols-2 gap-6 md:grid-cols-4"
          initial={reduced ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.05, duration: 0.7, ease: EASE }}
        >
          {STATS.map((s) => (
            <div key={s.v}>
              <dt className="mono-data text-2xl font-semibold text-gold-soft">{s.k}</dt>
              <dd className="caption mt-1">{s.v}</dd>
            </div>
          ))}
        </motion.dl>
      </div>

      <motion.div
        aria-hidden="true"
        className="absolute bottom-6 left-1/2 -translate-x-1/2 text-text-low"
        animate={reduced ? undefined : { y: [0, 6, 0] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <ArrowDown size={18} />
      </motion.div>
    </section>
  )
}
