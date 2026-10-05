import { useEffect, useState } from 'react'
import { animate, motion } from 'framer-motion'
import { Check, Crown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Link } from 'react-router'
import { KineticWords } from '@/components/platform/shared'
import { Eyebrow } from '@/components/landing/PageKit'
import { useJoinTarget } from '@/components/landing/useJoinTarget'
import { EASE, useReducedMotion } from '@/components/creators/motion-utils'
import { FEATURES, OPEN_MODULES } from '@/lib/features'

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
      {
        label: `All ${OPEN_MODULES} modules, full social graph`,
        tip: FEATURES.familyTree && FEATURES.marketplace
          ? 'Every module — feeds, forums, circles, family, marketplace and more.'
          : 'Every module — feeds, forums, circles, memorials and more.',
      },
      { label: '10 feed modes + Chronological & community algorithms', tip: 'Switch how your feed ranks, or opt out of ranking entirely.' },
      { label: 'Standard video quality, standard translation', tip: 'Solid defaults for everyday watching and reading across languages.' },
      FEATURES.familyTree
        ? { label: 'Family Tree + Digital Graveyard access', tip: 'Build your heritage graph and keep memorials, free forever.' }
        : { label: 'Digital Graveyard access', tip: 'Keep memorials with dignity, free forever.' },
      FEATURES.marketplace
        ? { label: 'Messenger (E2E), Events, Marketplace buying', tip: 'Encrypted messages, event planning and buyer-side commerce.' }
        : { label: 'Messenger (E2E) and Events', tip: 'Encrypted messages and event planning.' },
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
      {
        label: 'HD video uploads & playback',
        strong: true,
        tip: FEATURES.live ? 'Crisp 1080p for your films, vlogs and livestreams.' : 'Crisp 1080p for your films, vlogs and shorts.',
      },
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
    <span className="flex items-baseline gap-1.5">
      <span className="kl-serif text-[56px] font-semibold leading-none tracking-[-.02em]">
        ${value === 0 ? '0' : display.toFixed(value % 1 === 0 ? 0 : 2)}
      </span>
      <span className="text-[15px] text-[var(--kl-low)]">{value === 0 ? 'forever' : yearly ? '/ year' : '/ month'}</span>
    </span>
  )
}

/** Sections 1+2 — the landing's split hero with the billing switch, then the three tiers. */
export default function PricingTiers() {
  const reduced = useReducedMotion()
  const [yearly, setYearly] = useState(false)
  const join = useJoinTarget()
  const rise = (delay: number) =>
    reduced ? {} : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6, delay, ease: EASE } }

  return (
    <section className="kl-pad-x pb-[clamp(72px,9vw,120px)] pt-14">
      {/* Hero */}
      <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-[820px]">
          <motion.div {...rise(0.1)}>
            <Eyebrow>Pricing</Eyebrow>
          </motion.div>
          <KineticWords
            as="h1"
            text="Free is genuinely useful. Paid is genuinely worth it."
            className="kl-serif mt-6 block text-balance text-[clamp(42px,6vw,88px)] font-semibold leading-[0.98] tracking-[-0.02em]"
          />
          <motion.p className="mt-8 max-w-[520px] text-[19px] leading-[1.55] text-[var(--kl-mid)]" {...rise(0.45)}>
            One society, three ways in. Cancel anytime, export everything, delete everything — your
            account is yours.
          </motion.p>
        </div>

        {/* Billing switch */}
        <motion.div {...rise(0.6)} className="shrink-0">
          <div
            className="inline-flex items-center rounded-full border border-[var(--kl-paper-2)] bg-[var(--kl-surface)] p-1.5"
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
                    'relative rounded-full px-6 py-2.5 text-[15px] font-semibold transition-colors duration-200',
                    active ? 'text-[#0B0E1D]' : 'text-[var(--kl-mid)] hover:text-[var(--kl-ink)]',
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="billing-knob"
                      className="kl-sheen absolute inset-0 rounded-full"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative">
                    {label}
                    {label === 'Yearly' && (
                      <span className={cn('kl-mono ml-2 text-[11px]', active ? 'text-[#0B0E1D]/70' : 'text-[var(--kl-gold-deep)]')}>−18%</span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>
        </motion.div>
      </div>

      {/* Tier cards */}
      <div className="mt-16 grid items-stretch gap-4 lg:grid-cols-3">
        {TIERS.map((tier, ti) => (
          <motion.div
            key={tier.name}
            initial={reduced ? false : { opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-10%' }}
            transition={{ delay: ti * 0.1, duration: 0.6, ease: EASE }}
            className={cn(
              'relative flex flex-col overflow-hidden rounded-[20px] border p-8',
              tier.featured
                ? 'border-[var(--kl-gold)] shadow-[0_0_0_1px_var(--kl-gold),0_40px_80px_-40px_rgba(169,118,28,.55)]'
                : ti === 1
                  ? 'border-[var(--kl-paper-2)] bg-[var(--kl-paper)]'
                  : 'border-[var(--kl-paper-2)] bg-[var(--kl-surface)]',
            )}
            style={tier.featured ? { background: 'linear-gradient(170deg, var(--kl-stage-a), var(--kl-stage-b))' } : undefined}
          >
            {tier.featured && (
              <>
                <div aria-hidden="true" className="kl-sheen absolute -right-20 -top-24 h-[260px] w-[260px] rounded-full opacity-40 blur-[80px]" />
                <div aria-hidden="true" className="absolute -bottom-24 -left-16 h-[220px] w-[220px] rounded-full bg-[var(--kl-sky)] opacity-25 blur-[80px]" />
              </>
            )}
            <div className="relative flex items-center justify-between gap-3">
              <h3 className="kl-serif text-[28px] font-semibold">{tier.name}</h3>
              {tier.featured && (
                <span className="kl-sheen inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold">
                  <Crown size={12} aria-hidden="true" /> Most loved
                </span>
              )}
            </div>
            <p className="relative mt-1 text-[15px] text-[var(--kl-mid)]">{tier.tagline}</p>
            <div className="relative mt-7">
              <PriceFigure value={yearly ? tier.yearly : tier.monthly} yearly={yearly} />
              <p className="kl-mono mt-2 h-4 text-[11px] text-[var(--kl-low)]">
                {tier.yearly > 0 && (yearly ? `≈ $${(tier.yearly / 12).toFixed(2)} / month` : `$${tier.yearly} / year — save ~18%`)}
              </p>
            </div>
            <ul className="relative mt-7 flex flex-1 flex-col gap-3 border-t border-[var(--kl-paper-2)] pt-7">
              {tier.features.map((f) => (
                <li key={f.label} className="group relative flex items-start gap-2.5" tabIndex={0}>
                  <Check size={16} className="mt-0.5 shrink-0 text-[var(--kl-gold-deep)]" aria-hidden="true" />
                  <span className={cn('text-[15px] leading-snug', f.strong ? 'font-semibold' : 'text-[var(--kl-mid)]')}>{f.label}</span>
                  {/* one-line explainer tooltip */}
                  <span className="kl-card-shadow pointer-events-none absolute -top-2 left-6 z-10 w-60 -translate-y-full rounded-[12px] border border-[var(--kl-paper-2)] bg-[var(--kl-surface)] px-3 py-2 text-xs leading-snug text-[var(--kl-mid)] opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus:opacity-100">
                    {f.tip}
                  </span>
                </li>
              ))}
            </ul>
            <Link
              to={join.to}
              className={cn(
                'relative mt-9 rounded-[12px] p-3.5 text-center text-[15px] font-bold transition',
                tier.featured
                  ? 'kl-sheen shadow-[0_14px_30px_-12px_rgba(169,118,28,.55)] hover:-translate-y-0.5'
                  : 'border border-[var(--kl-ink)] bg-[var(--kl-surface)] hover:bg-[var(--kl-ink)] hover:!text-[var(--kl-bg)]',
              )}
            >
              {tier.cta}
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
