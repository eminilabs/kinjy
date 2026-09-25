import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bitcoin, Check, Coins, CreditCard, QrCode, Receipt, RotateCcw, ShieldCheck } from 'lucide-react'
import { ArcButton, LedgerRow, ModeChip } from '@/components/ui-kit'
import { cn } from '@/lib/utils'
import { EASE, useReducedMotion } from '@/components/creators/motion-utils'

const PRODUCTS = [
  { id: 'premium', label: 'Premium membership', price: 9.99, unit: 'USD / month' },
  { id: 'adcredit', label: 'Ad credit top-up', price: 50, unit: 'USD wallet credit' },
  { id: 'basket', label: 'Marketplace · Woven basket', price: 24, unit: 'USD one-off' },
] as const

const COINS = [
  { id: 'btc', sym: 'BTC', name: 'Bitcoin', rate: 0.00104 },
  { id: 'eth', sym: 'ETH', name: 'Ethereum', rate: 0.0286 },
  { id: 'usdtbsc', sym: 'USDT', name: 'Tether · BSC', rate: 1 },
  { id: 'sol', sym: 'SOL', name: 'Solana', rate: 0.54 },
  { id: 'more', sym: '+350', name: '350+ more coins', rate: null },
] as const

const IPN_STAGES = ['waiting', 'confirming', 'finished'] as const

type ProductId = (typeof PRODUCTS)[number]['id']

/** Deterministic pseudo-QR grid from an address string (decorative, QR-style panel). */
function QrPanel({ seed }: { seed: string }) {
  const cells: boolean[] = []
  let h = 2166136261
  for (let i = 0; i < 21 * 21; i += 1) {
    h ^= seed.charCodeAt(i % seed.length) + i
    h = Math.imul(h, 16777619)
    cells.push((h >>> 28) % 2 === 0)
  }
  const finder = (r: number, c: number) =>
    (r < 7 && c < 7) || (r < 7 && c > 13) || (r > 13 && c < 7)
  return (
    <div className="grid aspect-square w-full max-w-[168px] grid-cols-[repeat(21,1fr)] gap-px rounded-card-sm bg-white/10 p-2">
      {cells.map((on, i) => {
        const r = Math.floor(i / 21)
        const c = i % 21
        const isFinder = finder(r, c)
        const fr = r % 21 > 13 ? r - 14 : r
        const fc = c > 13 ? c - 14 : c
        const finderOn =
          fr === 0 || fr === 6 || fc === 0 || fc === 6 || (fr >= 2 && fr <= 4 && fc >= 2 && fc <= 4)
        return (
          <span
            key={i}
            className={cn(
              'aspect-square rounded-[1px]',
              isFinder ? (finderOn ? 'bg-gold-soft' : 'bg-transparent') : on ? 'bg-text-hi/85' : 'bg-transparent',
            )}
          />
        )
      })}
    </div>
  )
}

/** Section 2 — Crypto checkout (money IN) via NowPayments POST /v1/payment + IPN ticker. */
export default function CryptoCheckout() {
  const reduced = useReducedMotion()
  const [product, setProduct] = useState<ProductId>('premium')
  const [coin, setCoin] = useState('usdtbsc')
  const [stage, setStage] = useState(0) // 0 idle · 1 payment created · 2..4 ipn stages · 5 receipt
  const timers = useRef<number[]>([])

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
  }
  useEffect(() => clearTimers, [])

  const selected = PRODUCTS.find((p) => p.id === product)!
  const selectedCoin = COINS.find((c) => c.id === coin)!
  const payAmount = selectedCoin.rate ? (selected.price * selectedCoin.rate).toFixed(selectedCoin.id === 'usdtbsc' ? 2 : 5) : null
  const address =
    coin === 'btc'
      ? 'bc1qkaluta7x4v2m8s0d3f6g9h1j2k5l8n0p4r7t1w'
      : coin === 'eth'
        ? '0x7F3a91C4e2B8d0F5A6c1E9b4D8f2A5c7E0b3D6f9'
        : coin === 'sol'
          ? 'KaLutaSo1anaDep0sitAddr3ss9x2vB7mQ4wE8rT5yU'
          : '0xSAF3w11etBSC9d2F4a6C8e0B1d3F5a7C9e2B4d6A'

  const run = useCallback(() => {
    clearTimers()
    setStage(1)
    const gaps = reduced ? [40, 80, 120, 160] : [1400, 3200, 5200, 6800]
    gaps.forEach((g, i) => {
      timers.current.push(window.setTimeout(() => setStage(i + 2), g))
    })
  }, [reduced])

  const ipnIndex = stage >= 2 ? Math.min(stage - 2, IPN_STAGES.length - 1) : -1

  return (
    <section id="crypto-checkout" className="noise-overlay px-6 py-24 md:py-32" style={{ background: 'var(--ink)' }}>
      <div className="mx-auto max-w-container">
        <p className="eyebrow text-gold">Money in — Crypto checkout</p>
        <h2 className="h2 mt-4 max-w-2xl">
          Pay in any coin. <span className="text-gold-grad font-display italic">We settle in USDT.</span>
        </h2>
        <p className="body-lg mt-4 max-w-2xl text-text-mid">
          One <span className="mono-data text-sm text-sky">POST /v1/payment</span> call mints a
          deposit address for any of 350+ coins. NowPayments watches the chain and POSTs signed
          status callbacks to our IPN endpoint — the receipt reconciles into the immutable Kinjy
          ledger the moment the payment finishes.
        </p>

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          {/* Left: interactive checkout */}
          <div className="cloud-card p-6 sm:p-8">
            <p className="eyebrow text-text-low">1 · Choose what you're paying for</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {PRODUCTS.map((p) => (
                <ModeChip
                  key={p.id}
                  label={`${p.label} · $${p.price}`}
                  active={product === p.id}
                  onClick={() => {
                    setProduct(p.id)
                    setStage(0)
                    clearTimers()
                  }}
                />
              ))}
            </div>

            <p className="eyebrow mt-8 text-text-low">2 · Choose your coin</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {COINS.map((c) => (
                <ModeChip
                  key={c.id}
                  label={c.sym === '+350' ? '+350 coins' : `${c.sym}`}
                  active={coin === c.id}
                  onClick={() => {
                    setCoin(c.id)
                    setStage(0)
                    clearTimers()
                  }}
                  icon={c.id === 'btc' ? <Bitcoin size={14} aria-hidden="true" /> : undefined}
                />
              ))}
            </div>
            <p className="caption mt-2">
              {selectedCoin.name}
              {payAmount ? ` — you'll send ≈ ${payAmount} ${selectedCoin.sym} ($${selected.price})` : ' — pick any of the 350+ supported currencies at checkout'}
            </p>

            <div className="mt-8 flex items-center gap-3">
              <ArcButton onClick={run} disabled={stage > 0 && stage < 5}>
                {stage === 0 ? (
                  <>
                    <CreditCard size={16} aria-hidden="true" /> Create payment
                  </>
                ) : stage >= 5 ? (
                  <>
                    <RotateCcw size={16} aria-hidden="true" /> Run it again
                  </>
                ) : (
                  <>
                    <Coins size={16} aria-hidden="true" /> Awaiting on-chain payment…
                  </>
                )}
              </ArcButton>
              {stage >= 5 && (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-success">
                  <Check size={15} aria-hidden="true" /> Settled to ledger
                </span>
              )}
            </div>

            {/* Payment created: deposit address + QR panel */}
            <AnimatePresence>
              {stage >= 1 && (
                <motion.div
                  key="deposit"
                  initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: EASE }}
                  className="mt-8 rounded-card-md border border-white/10 bg-ink-3/60 p-5"
                >
                  <div className="flex flex-wrap items-start gap-6">
                    <div className="min-w-0 flex-1">
                      <p className="mono-data text-xs text-text-low">POST https://api.nowpayments.io/v1/payment</p>
                      <pre className="mono-data mt-3 overflow-x-auto rounded-card-sm bg-ink/70 p-3 text-xs leading-relaxed text-sky">
{`{
  "price_amount": ${selected.price},
  "price_currency": "usd",
  "pay_currency": "${coin === 'more' ? 'usdtbsc' : coin}",
  "order_id": "KLT-${product.toUpperCase()}-4471",
  "ipn_callback_url":
    "https://api.kaluta.io/ipn/nowpayments"
}`}
                      </pre>
                      <p className="mono-data mt-4 text-xs text-text-low">→ deposit address</p>
                      <p className="mono-data mt-1 break-all text-sm text-gold-soft">{address}</p>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <QrPanel seed={address + product} />
                      <p className="mono-data inline-flex items-center gap-1.5 text-[0.7rem] text-text-low">
                        <QrCode size={12} aria-hidden="true" /> scan to pay
                      </p>
                    </div>
                  </div>

                  {/* IPN status ticker */}
                  <div className="mt-6 border-t border-white/10 pt-5">
                    <p className="mono-data text-xs text-text-low">IPN callback · x-nowpayments-sig verified</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {IPN_STAGES.map((s, i) => {
                        const active = i === ipnIndex
                        const done = ipnIndex > i || stage >= 5
                        return (
                          <div key={s} className="flex items-center gap-2">
                            {i > 0 && <span className={cn('h-px w-6', done || active ? 'bg-gold/60' : 'bg-white/15')} aria-hidden="true" />}
                            <span
                              className={cn(
                                'mono-data inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors duration-300',
                                done
                                  ? 'border-success/40 bg-success/10 text-success'
                                  : active
                                    ? 'border-gold/50 bg-gold/10 text-gold-soft'
                                    : 'border-white/10 bg-white/[0.03] text-text-low',
                              )}
                            >
                              {active && !done && stage < 5 && (
                                <motion.span
                                  className="h-1.5 w-1.5 rounded-full bg-gold-soft"
                                  animate={reduced ? undefined : { opacity: [1, 0.25, 1] }}
                                  transition={{ duration: 1.1, repeat: Infinity }}
                                />
                              )}
                              {done && <Check size={12} aria-hidden="true" />}
                              {s}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                    <AnimatePresence>
                      {stage >= 5 && (
                        <motion.div
                          key="receipt"
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.45, ease: EASE }}
                          className="mt-5"
                        >
                          <p className="mono-data mb-2 inline-flex items-center gap-1.5 text-xs text-text-low">
                            <Receipt size={12} aria-hidden="true" /> receipt → Kinjy ledger
                          </p>
                          <LedgerRow
                            id="8841207"
                            label={`${selected.label} — paid in ${selectedCoin.sym === '+350' ? 'USDT·BSC' : selectedCoin.sym}, settled USDT·BSC`}
                            amount={`+$${selected.price.toFixed(2)}`}
                            reconciled
                            timestamp="just now"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right: HMAC IPN verification code card */}
          <div className="flex flex-col gap-6">
            <div className="cloud-card gold p-6 sm:p-8">
              <p className="eyebrow inline-flex items-center gap-2 text-gold">
                <ShieldCheck size={14} aria-hidden="true" /> Trust, but verify — HMAC-signed IPN
              </p>
              <p className="mt-4 text-sm leading-relaxed text-text-mid">
                Every callback carries an{' '}
                <span className="mono-data text-xs text-gold-soft">x-nowpayments-sig</span> header:
                an HMAC-SHA512 of the request body with its keys sorted alphabetically, signed with
                our IPN secret. The ledger only trusts callbacks whose signature recomputes exactly.
              </p>
              <pre className="mono-data mt-5 overflow-x-auto rounded-card-md border border-white/10 bg-ink/80 p-4 text-xs leading-relaxed text-text-mid">
{`// Kinjy IPN endpoint
const sorted = sortKeysRecursive(req.body)
const payload = JSON.stringify(sorted)
const expected = createHmac('sha512', IPN_SECRET)
  .update(payload)
  .digest('hex')

if (expected !== req.headers['x-nowpayments-sig'])
  return res.status(403).end() // reject unsigned

switch (sorted.payment_status) {
  case 'finished':
    ledger.append({
      order_id: sorted.order_id,      // KLT-PREMIUM-4471
      actually_paid: sorted.pay_amount,
      outcome_amount: sorted.outcome_amount,
      settled: 'usdtbsc',             // auto-converted
    })
}`}
              </pre>
            </div>

            <div className="cloud-card p-6">
              <p className="eyebrow text-text-low">Full status vocabulary</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {['waiting', 'confirming', 'confirmed', 'sending', 'partially_paid', 'finished', 'failed', 'refunded', 'expired'].map((s) => (
                  <span
                    key={s}
                    className={cn(
                      'mono-data rounded-full border px-3 py-1 text-xs',
                      s === 'finished'
                        ? 'border-success/40 bg-success/10 text-success'
                        : s === 'failed' || s === 'expired'
                          ? 'border-danger/40 bg-danger/10 text-danger'
                          : 'border-white/10 bg-white/[0.03] text-text-mid',
                    )}
                  >
                    {s}
                  </span>
                ))}
              </div>
              <p className="caption mt-4">
                Partial payments top up to the same address; refunds and expiries post reversal
                entries — the ledger never edits history, it appends the truth.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
