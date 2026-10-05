import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { ArrowRight, Hand, Smartphone } from 'lucide-react'
import PublicShell from '@/components/landing/PublicShell'
import { ClosingStage, Eyebrow, Stage } from '@/components/landing/PageKit'
import { KL_BTN_GHOST, KL_BTN_GOLD } from '@/components/landing/kl-classes'
import { MODULE_TONES } from '@/components/platform/tones'
import AppShell from '@/components/appdemo/AppShell'
import ConciergeOnboarding from '@/components/appdemo/ConciergeOnboarding'
import DataSaverFeed from '@/components/appdemo/DataSaverFeed'
import EnterHero from '@/components/appdemo/EnterHero'
import MobileShell from '@/components/appdemo/MobileShell'
import ModeLanguageLab from '@/components/appdemo/ModeLanguageLab'
import SeriesRail from '@/components/appdemo/SeriesRail'
import VaultResurfacing from '@/components/appdemo/VaultResurfacing'
import WellbeingPanel from '@/components/appdemo/WellbeingPanel'
import { AppThemeProvider, useAppTheme } from '@/components/appdemo/theme'
import { FEATURES } from '@/lib/features'

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

const MOBILE_BULLETS = [
  'Thumb-first design — every action within reach',
  'Create is always one tap away, center-docked',
  'Same modules, same algorithms, same assistant (48px edge tab)',
  'PWA-installable — no app store required',
]

/**
 * The demo windows keep their own display mode (Cloud / Light / Dark). Their
 * contents are written against the design tokens, so they need the matching
 * token scope — otherwise they would follow the page's theme instead.
 */
function DemoScope({ children }: { children: ReactNode }) {
  const { resolved } = useAppTheme()
  return <div className={resolved === 'light' ? 'force-light' : 'force-dark'}>{children}</div>
}

/**
 * /app — the live product demo. The page around it is the public design; the
 * windows inside are the product itself, in whichever display mode is chosen.
 */
export default function AppDemo() {
  return (
    <PublicShell>
      <AppThemeProvider initialMode="light">
        <EnterHero />

        {/* Section 2 — the app shell frame */}
        <section id="app-frame" className="kl-pad-x scroll-mt-20 border-t border-[var(--kl-paper-2)] py-[clamp(72px,9vw,120px)]">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-10%' }}
            transition={{ duration: 0.6, ease: EASE }}
            className="mb-10 flex flex-wrap items-end justify-between gap-6"
          >
            <div>
              <Eyebrow>The app shell</Eyebrow>
              <h2 className="kl-h2 mt-5 max-w-[900px]">
                Universal navigation, <span className="text-[var(--kl-gold-deep)]">one frame.</span>
              </h2>
            </div>
            <p className="flex items-center gap-1.5 text-sm text-[var(--kl-mid)]">
              <Hand size={14} aria-hidden="true" /> Pin chips · switch feed modes · open{' '}
              {FEATURES.familyTree ? 'Family Tree & Graveyard' : 'the Graveyard'}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 40 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, margin: '-8%' }}
            transition={{ duration: 0.9, ease: EASE }}
          >
            <DemoScope>
              <AppShell />
            </DemoScope>
          </motion.div>
        </section>

        {/* Section 3 — AI onboarding concierge (first-run interview + live build).
            The concierge is the assistant, so it is hidden with it (lib/features.ts). */}
        {FEATURES.assistant && <ConciergeOnboarding />}

        {/* Section 4 — AI memory resurfacing (Knowledge Vault card in the feed) */}
        <VaultResurfacing />

        {/* Section 5 — serialized content & habit loops (series rail) */}
        <SeriesRail />

        {/* Section 5b — offline-first & low-bandwidth mode (Data Saver toggle) */}
        <DataSaverFeed />

        {/* Section 5c — wellbeing & session intelligence (opt-in panel) */}
        <WellbeingPanel />

        {/* Section 6 — mobile shell */}
        <section className="kl-pad-x border-t border-[var(--kl-paper-2)] py-[clamp(72px,9vw,120px)]">
          <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-[clamp(40px,6vw,96px)] lg:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-15%' }}
              transition={{ duration: 0.65, ease: EASE }}
              className="order-2 min-w-0 lg:order-1"
            >
              <Eyebrow>Mobile shell</Eyebrow>
              <h2 className="kl-h2 mt-5 max-w-[900px]">
                The whole society, <span className="text-[var(--kl-gold-deep)]">in one hand.</span>
              </h2>
              <ul className="mt-8 border-t border-[var(--kl-paper-2)]">
                {MOBILE_BULLETS.map((b, i) => (
                  <motion.li
                    key={b}
                    initial={{ opacity: 0, x: -16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: '-10%' }}
                    transition={{ delay: 0.12 + i * 0.08, duration: 0.45, ease: EASE }}
                    className="flex items-start gap-3.5 border-b border-[var(--kl-paper-2)] py-4 text-[16px] text-[var(--kl-mid)]"
                  >
                    <span
                      className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-[8px]"
                      style={{ background: MODULE_TONES[i % 4][1], color: MODULE_TONES[i % 4][0] }}
                    >
                      <Smartphone size={13} aria-hidden="true" />
                    </span>
                    {b}
                  </motion.li>
                ))}
              </ul>
              <p className="mt-6 text-sm text-[var(--kl-low)]">
                Bottom bar, mandated by the blueprint: Home · Explore · + Create · Messages · Profile.
              </p>
            </motion.div>
            <Stage className="order-1 min-w-0 p-[clamp(16px,3vw,40px)] lg:order-2" glows={['var(--kl-coral)', 'var(--kl-sky)']}>
              <DemoScope>
                <MobileShell />
              </DemoScope>
            </Stage>
          </div>
        </section>

        {/* Section 7 — display modes & language lab */}
        <ModeLanguageLab />
      </AppThemeProvider>

      {/* Section 8 — CTA */}
      <ClosingStage
        eyebrow="Ready when you are"
        title={
          <>
            Your society is <span className="text-[var(--kl-gold-deep)]">ready when you are.</span>
          </>
        }
      >
        <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link to="/pricing" className={KL_BTN_GOLD}>
            Create your account
          </Link>
          <Link to="/" className={KL_BTN_GHOST}>
            Back to the story <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
      </ClosingStage>
    </PublicShell>
  )
}
