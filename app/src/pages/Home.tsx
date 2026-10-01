import '@/components/landing/landing.css'
import { LandingAssistant, LandingFinalCta, LandingPricing, LandingTrust } from '@/components/landing/LandingClosing'
import LandingFeatures from '@/components/landing/LandingFeatures'
import LandingHero from '@/components/landing/LandingHero'
import LandingModules from '@/components/landing/LandingModules'
import LandingStory from '@/components/landing/LandingStory'
import { LandingNav } from '@/components/landing/shared'
import { useLandingTheme } from '@/components/landing/useLandingTheme'
import { FEATURES } from '@/lib/features'

/**
 * Home — the public landing page, after the "Kinjy Landing" design.
 *
 * It carries its own navigation and footer (Layout suppresses the marketing
 * ones on this route) and its own fixed paper-and-night palette; see
 * components/landing/landing.css. Copy lives in components/landing/data.ts.
 */
export default function Home() {
  const { theme } = useLandingTheme()
  return (
    <div className="kl" data-kl-theme={theme}>
      <div className="mx-auto max-w-[1320px] px-4 pt-4">
        <div className="relative overflow-hidden rounded-2xl bg-[var(--kl-bg)]">
          <LandingNav />
          <div>
            <LandingHero />
            <LandingModules />
            <LandingFeatures />
            <LandingStory />
            {FEATURES.assistant && <LandingAssistant />}
            <LandingPricing />
          </div>
        </div>
      </div>
      <LandingTrust />
      <LandingFinalCta />
    </div>
  )
}
