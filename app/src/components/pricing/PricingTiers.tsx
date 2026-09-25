import { useEffect, useState } from 'react'
import { animate, motion } from 'framer-motion'
import { Check, Crown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { KineticWords } from '@/components/creators/Kinetic'
import { EASE, useReducedMotion } from '@/components/creators/motion-utils'

type Feature = { label: string; tip: string; strong?: boolean }

type Tier = {
  name: string
  tagline: string
  monthly: number
  yearly: number
  cta: string
  featured?: boolean
  features: Feature[]
}

const TIERS: Tier[] = [
  {
    name: 'Free',
    tagline: 'Genuinely useful, forever.',
    monthly: 0,
    yearly: 0,
    cta: 'Create free account',
    features: [
      { label: 'All 15 modules, full social graph', tip: 'Every module — feeds, forums, circles, family, marketplace and more.' },
      { label: '10 feed modes + Chronological & community algorithms', tip: 'Switch how your feed ranks, or opt out of ranking entirely.' },
      { label: 'Standard video quality, standard translation', tip: 'Solid defaults for everyday watching and reading across languages.' },
      { label: 'Family Tree + Digital Graveyard access', tip: 'Build your heritage graph and keep memorials, free forever.' },
      { label: 'Messenger (E2E), Events, Marketplace buying', tip: 'Encrypted messages, event planning and buyer-side commerce.' },
      { label: 'Monthly AI credit allowance', tip: 'A free monthly bundle for translation, drafting and studio tasks.' },
    ],
  },
  {
    name: 'Basic',
    tagline: 'For everyday power users.',
    monthly: 3.99,
    yearly: 39,
    cta: 'Go Basic',
    features: [
      { label: 'HD video uploads & playback', strong: true, tip: 'Crisp 1080p for your films, vlogs and livestreams.' },
      { label: 'Advanced translation', strong: true, tip: 'Side-by-side view and higher-quality translation models.' },
      { label: 'Scheduled posts', strong: true, tip: 'Write now, publish at the perfect hour in any timezone.' },
      { label: 'More AI credits (×5 Free)', strong: true, tip: 'Five times the monthly AI allowance of the Free plan.' },
      { label: 'Newsletters publishing', strong: true, tip: 'Run your own paid or free newsletter from your profile.' },
      { label: 'Everything in Free', tip: 'Every Free feature carries over, always.' },
    ],
  },
  {
    name: 'Premium',
    tagline: 'The full operating system.',
    monthly: 9.99,
    yearly: 99,
    cta: 'Go Premium',
    featured: true,
    features: [
      { label: '4K video', strong: true, tip: 'Cinema-grade uploads and playback for serious creators.' },
      { label: 'AI Creator Studio (copilot, autonomous agents)', strong: true, tip: 'The One-to-Many engine plus agents that work on schedule — with your approval.' },
      { label: 'Voice-preserving dubbing + lip sync', strong: true, tip: 'Your voice, every language — tone preserved, lips in sync.' },
      { label: 'AI clips generation', strong: true, tip: 'Auto-cut shorts and highlights from your long-form video.' },
      { label: 'Brand kit', strong: true, tip: 'Fonts, colors and tone applied to every format automatically.' },
      { label: 'Custom algorithm feeds', strong: true, tip: 'Compose and save your own feed algorithms from the marketplace.' },
      { label: 'API allowance (Developer Platform)', strong: true, tip: 'Monthly API credits for building on Kinjy.' },
      { label: 'Premium themes (incl. all Cloud ambient skies)', strong: true, tip: 'Twilight, Dawn, Savanna and Ocean — every ambient sky.' },
      { label: 'Everything in Basic', tip: 'Every Basic feature carries over, always.' },
    ],
  },
]

/** Price figure with 240ms counting tween. */
function PriceFigure({ value, yearly }: { value: number; yearly: boolean }) {
  const reduced = useReducedMotion()
  const [display, setDisplay] = useState(value)

  useEffect(() => {
    if (reduced) {
      setDisplay(value)
      return
    }
    const controls = animate(display, value, {
      duration: 0.24,
      ease: 'easeOut',
      onUpdate: (v) => setDisplay(v),
    })
    return () => controls.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduced])

  return (
    <span className="font-mono text-4xl font-semibold text-text-hi">
      ${value === 0 ? '0' : display.toFixed(value % 1 === 0 ? 0 : 2)}
      <span className="ml-1 text-sm font-normal text-text-low">{value === 0 ? '' : yearly ? '/yr' : '/mo'}</span>
    </span>
  )
}

/** Sections 1+2 — Pricing hero with billing toggle and the three tiers. */
export default function PricingTiers() {
  const reduced = useReducedMotion()
  const [yearly, setYearly] = useState(false)

  return (
    <section className="noise-overlay twilight-field px-6 pb-24 pt-20 md:pb-32 md:pt-28">
      <div className="mx-auto max-w-container">
        {/* Hero */}
        <div className="mx-auto max-w-2xl text-center">
          <motion.p
            className="eyebrow text-gold"
            initial={reduced ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            Pricing
          </motion.p>
          <KineticWords
            className="display-lg mt-5"
            ariaLabel="Free is genuinely useful. Paid is genuinely worth it."
            words={[
              { text: 'Free' },
              { text: 'is' },
              { text: 'genuinely' },
              { text: 'useful.' },
              { text: 'Paid' },
              { text: 'is' },
              { text: 'genuinely' },
              { text: 'worth', gold: true },
              { text: 'it.', gold: true },
            ]}
          />
          <motion.p
            className="body-lg mt-6 text-text-mid"
            initial={reduced ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.7, ease: EASE }}
          >
            One society, three ways in. Cancel anytime, export everything, delete everything — your
            account is yours.
          </motion.p>

          {/* Billing toggle */}
          <motion.div
            className="mt-8 inline-flex items-center rounded-full cloud-glass p-1"
            initial={reduced ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.5, ease: EASE }}
            role="group"
            aria-label="Billing period"
          >
            {(['Monthly', 'Yearly'] as const).map((label) => {
              const active = (label === 'Yearly') === yearly
              return (
                <button
                  key={label}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setYearly(label === 'Yearly')}
                  className={cn(
                    'relative rounded-full px-5 py-2 text-sm font-semibold transition-colors duration-200',
                    active ? 'text-ink' : 'text-text-mid hover:text-text-hi',
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="billing-knob"
                      className="absolute inset-0 rounded-full bg-gradient-to-br from-gold-soft to-gold shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative">
                    {label}
                    {label === 'Yearly' && <span className={cn('ml-1.5 text-[0.7rem]', active ? 'text-ink/80' : 'text-gold-soft')}>save ~18%</span>}
                  </span>
                </button>
              )
            })}
          </motion.div>
        </div>

        {/* Tier cards */}
        <div className="mt-16 grid items-start gap-6 lg:grid-cols-3">
          {TIERS.map((tier, ti) => (
            <motion.div
              key={tier.name}
              initial={reduced ? false : { opacity: 0, y: 56 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-15%' }}
              transition={{ delay: ti * 0.12, duration: 0.6, ease: EASE }}
              whileHover={reduced ? undefined : { y: -6 }}
              className={cn(
                'cloud-card relative p-7 transition-shadow duration-300',
                tier.featured && 'lg:-mt-4 bg-gradient-to-b from-gold/[0.10] to-transparent',
              )}
              style={tier.featured ? { boxShadow: '0 0 0 1.5px rgba(217,166,72,0.55), 0 28px 64px -16px rgba(0,0,0,0.6)' } : undefined}
            >
              {tier.featured && (
                <span className="absolute -top-3.5 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-gradient-to-br from-gold-soft to-gold px-4 py-1.5 text-xs font-bold text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
                  <Crown size={12} aria-hidden="true" /> Most loved
                </span>
              )}
              <h3 className={cn('font-display text-2xl', tier.featured ? 'text-gold-grad' : 'text-text-hi')}>{tier.name}</h3>
              <p className="caption mt-1">{tier.tagline}</p>
              <div className="mt-5">
                <PriceFigure value={yearly ? tier.yearly : tier.monthly} yearly={yearly} />
                {tier.yearly > 0 && (
                  <p className="mono-data mt-1 text-[0.68rem] text-text-low">
                    {yearly ? `≈ $${(tier.yearly / 12).toFixed(2)}/mo` : `$${tier.yearly}/yr — save ~18%`}
                  </p>
                )}
              </div>
              <ul className="mt-6 space-y-3">
                {tier.features.map((f, fi) => (
                  <motion.li
                    key={f.label}
                    initial={reduced ? false : { opacity: 0, x: -12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: '-10%' }}
                    transition={{ delay: 0.3 + ti * 0.12 + fi * 0.03, duration: 0.35, ease: EASE }}
                    className="group relative flex items-start gap-2.5"
                  >
                    <Check size={15} className={cn('mt-1 shrink-0', tier.featured ? 'text-gold' : 'text-success')} aria-hidden="true" />
                    <span className={cn('text-sm leading-snug', f.strong ? 'font-semibold text-text-hi' : 'text-text-mid')}>
                      {f.label}
                    </span>
                    {/* one-line explainer tooltip */}
                    <span className="pointer-events-none absolute -top-2 left-6 z-10 w-56 -translate-y-full rounded-card-sm border border-white/10 bg-ink-2/95 px-3 py-2 text-[0.7rem] leading-snug text-text-mid opacity-0 shadow-cloud backdrop-blur-md transition-opacity duration-200 group-hover:opacity-100">
                      {f.tip}
                    </span>
                  </motion.li>
                ))}
              </ul>
              <button
                type="button"
                className={cn(
                  'mt-8 w-full rounded-full py-3 text-sm font-bold transition',
                  tier.featured
                    ? 'bg-gradient-to-br from-gold-soft to-gold text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] hover:brightness-110'
                    : 'cloud-glass text-text-hi hover:border-gold/40 hover:text-gold-soft',
                )}
              >
                {tier.cta}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
