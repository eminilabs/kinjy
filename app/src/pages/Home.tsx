import '@/components/landing/landing.css'
import { LandingAssistant, LandingFinalCta, LandingPricing, LandingTrust } from '@/components/landing/LandingClosing'
import LandingFeatures from '@/components/landing/LandingFeatures'
import LandingHero from '@/components/landing/LandingHero'
import LandingModules from '@/components/landing/LandingModules'
import LandingStory from '@/components/landing/LandingStory'
import { LandingNav } from '@/components/landing/shared'
import { useLandingTheme } from '@/components/landing/useLandingTheme'
import { useTranslation } from 'react-i18next'
import { FEATURES } from '@/lib/features'

/**
 * Home — the public landing page, after the "Kinjy Landing" design.
 */
export default function Home() {
  const { theme } = useLandingTheme()
  const { i18n } = useTranslation()
  return (
    <div className="kl kl-plain" data-kl-theme={theme} lang={i18n.language} dir={i18n.dir()}>
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
