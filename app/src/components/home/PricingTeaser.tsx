import { useState } from 'react'
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { ArrowRight, Check } from 'lucide-react'
import { ArcButton, CloudCard } from '@/components/ui-kit'
import { cn } from '@/lib/utils'

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

const TIERS = [
  { name: 'Free', price: '$0', line: 'Every module, one feed algorithm, ad-supported.' },
  { name: 'Basic', price: '$3.99', line: 'Three algorithms, priority translation, no ads.' },
  { name: 'Premium', price: '$9.99', line: 'All 15 algorithms, Heritage AI, Creator Studio Pro.', loved: true },
]

/** Section 9 — Pricing teaser + global CTA. */
export default function PricingTeaser() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  return (
    <section className="noise-overlay relative bg-ink px-6 pt-24 md:pt-32">
      <div className="mx-auto max-w-container">
        <h2 className="h2 text-center">One society. Three ways in.</h2>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {TIERS.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-15%' }}
              transition={{ delay: i * 0.1, duration: 0.6, ease: EASE }}
            >
              <CloudCard
                hoverable
                gold={t.loved}
                className={cn('relative h-full p-7', t.loved && 'border-gold/50')}
              >
                {t.loved && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-br from-gold-soft to-gold px-3 py-1 text-[0.65rem] font-bold uppercase tracking-widest text-ink">
                    Most loved
                  </span>
                )}
                <p className="eyebrow text-text-mid">{t.name}</p>
                <p className="mt-3 font-display text-4xl font-medium">
                  {t.price}
                  <span className="caption ms-1">/ month</span>
                </p>
                <p className="mt-3 text-sm text-text-mid">{t.line}</p>
              </CloudCard>
            </motion.div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link to="/pricing" className="inline-flex items-center gap-2 font-semibold text-gold-soft transition-all hover:gap-3">
            Compare plans <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* Global CTA block */}
      <div className="relative mt-24 overflow-hidden twilight-field py-24">
        <div className="relative z-10 mx-auto max-w-2xl px-6 text-center">
          <motion.h2
            className="display-lg"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-20%' }}
            transition={{ duration: 0.8, ease: EASE }}
          >
            <span className="text-arc-grad">Your society awaits.</span>
          </motion.h2>
          <p className="body-lg mt-4 text-text-mid">
            Create your account in minutes — passkey-secured from the first second.
          </p>
          <form
            className="mx-auto mt-8 flex max-w-md items-center gap-2 rounded-full cloud-glass p-1.5"
            onSubmit={(e) => {
              e.preventDefault()
              if (email.trim()) setSent(true)
            }}
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              aria-label="Email address"
              className="min-w-0 flex-1 bg-transparent px-4 py-2 text-sm text-text-hi placeholder:text-text-low focus:outline-none"
            />
            <ArcButton type="submit" size="sm">
              {sent ? (
                <>
                  Welcome <Check size={14} aria-hidden="true" />
                </>
              ) : (
                'Create your account'
              )}
            </ArcButton>
          </form>
        </div>
      </div>
    </section>
  )
}
