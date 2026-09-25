import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { ArrowRight, Hand, Smartphone } from 'lucide-react'
import { ArcButton } from '@/components/ui-kit'
import AppShell from '@/components/appdemo/AppShell'
import ConciergeOnboarding from '@/components/appdemo/ConciergeOnboarding'
import DataSaverFeed from '@/components/appdemo/DataSaverFeed'
import EnterHero from '@/components/appdemo/EnterHero'
import MobileShell from '@/components/appdemo/MobileShell'
import ModeLanguageLab from '@/components/appdemo/ModeLanguageLab'
import SeriesRail from '@/components/appdemo/SeriesRail'
import VaultResurfacing from '@/components/appdemo/VaultResurfacing'
import WellbeingPanel from '@/components/appdemo/WellbeingPanel'
import { AppThemeProvider } from '@/components/appdemo/theme'

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

const MOBILE_BULLETS = [
  'Thumb-first design — every action within reach',
  'Create is always one tap away, center-docked',
  'Same modules, same algorithms, same assistant (48px edge tab)',
  'PWA-installable — no app store required',
]

/**
 * /app — the live product demo. Self-contained app shell with its own top bar
 * (renders without the marketing Layout chrome; occupies the full viewport).
 */
export default function AppDemo() {
  return (
    <AppThemeProvider>
      <div className="bg-ink text-text-hi">
        <EnterHero />

        {/* Section 2 — the app shell frame */}
        <section id="app-frame" className="noise-overlay relative scroll-mt-20 bg-ink px-4 py-20 md:px-6 md:py-24">
          <div className="mx-auto max-w-container">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-10%' }}
              transition={{ duration: 0.6, ease: EASE }}
              className="mb-10 flex flex-wrap items-end justify-between gap-4"
            >
              <div>
                <p className="eyebrow text-gold">The app shell</p>
                <h2 className="h2 mt-3">
                  Universal navigation, <span className="text-gold-grad">one frame.</span>
                </h2>
              </div>
              <p className="caption flex items-center gap-1.5">
                <Hand size={13} aria-hidden="true" /> Pin chips · switch feed modes · open Family Tree &amp; Graveyard
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 40 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true, margin: '-8%' }}
              transition={{ duration: 0.9, ease: EASE }}
            >
              <AppShell />
            </motion.div>
          </div>
        </section>

        {/* Section 3 — AI onboarding concierge (first-run interview + live build) */}
        <ConciergeOnboarding />

        {/* Section 4 — AI memory resurfacing (Knowledge Vault card in the feed) */}
        <VaultResurfacing />

        {/* Section 5 — serialized content & habit loops (series rail) */}
        <SeriesRail />

        {/* Section 5b — offline-first & low-bandwidth mode (Data Saver toggle) */}
        <DataSaverFeed />

        {/* Section 5c — wellbeing & session intelligence (opt-in panel) */}
        <WellbeingPanel />

        {/* Section 6 — mobile shell */}
        <section className="noise-overlay relative bg-ink-2/20 px-6 py-24 md:py-28">
          <div className="mx-auto grid max-w-container items-center gap-14 lg:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-15%' }}
              transition={{ duration: 0.65, ease: EASE }}
              className="order-2 lg:order-1"
            >
              <p className="eyebrow text-gold">Mobile shell</p>
              <h3 className="h3 mt-3 font-display text-3xl font-medium">
                The whole society, <span className="text-gold-grad">in one hand.</span>
              </h3>
              <ul className="mt-7 space-y-3.5">
                {MOBILE_BULLETS.map((b, i) => (
                  <motion.li
                    key={b}
                    initial={{ opacity: 0, x: -16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: '-10%' }}
                    transition={{ delay: 0.12 + i * 0.08, duration: 0.45, ease: EASE }}
                    className="flex items-start gap-3 text-text-mid"
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold">
                      <Smartphone size={11} aria-hidden="true" />
                    </span>
                    {b}
                  </motion.li>
                ))}
              </ul>
              <p className="caption mt-7">
                Bottom bar, mandated by the blueprint: Home · Explore · + Create · Messages · Profile.
              </p>
            </motion.div>
            <div className="order-1 lg:order-2">
              <MobileShell />
            </div>
          </div>
        </section>

        {/* Section 7 — display modes & language lab */}
        <ModeLanguageLab />

        {/* Section 8 — CTA */}
        <section className="noise-overlay relative overflow-hidden px-6 py-24 md:py-28">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{ background: 'radial-gradient(ellipse at 50% 120%, rgba(74,82,224,0.3), transparent 60%)' }}
          />
          <div className="relative mx-auto max-w-3xl text-center">
            <motion.h2
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: EASE }}
              className="h2"
            >
              Your society is <span className="text-gold-grad">ready when you are.</span>
            </motion.h2>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15, duration: 0.6, ease: EASE }}
              className="mt-8 flex flex-wrap items-center justify-center gap-4"
            >
              <Link to="/pricing">
                <ArcButton variant="gold" size="lg">Create your account</ArcButton>
              </Link>
              <Link to="/">
                <ArcButton variant="ghost" size="lg">
                  Back to the story <ArrowRight size={17} aria-hidden="true" />
                </ArcButton>
              </Link>
            </motion.div>
          </div>
        </section>
      </div>
    </AppThemeProvider>
  )
}
