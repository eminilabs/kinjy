import type { ReactNode } from 'react'
import './landing.css'
import { LandingFooter } from './LandingClosing'
import { LandingNav } from './shared'
import { useLandingTheme } from './useLandingTheme'

/**
 * The frame of a redesigned public page: the landing page's navigation and
 * footer, and its light/dark choice.
 *
 * `force-light` / `force-dark` re-point the app's own design tokens
 * (text-text-hi, text-gold-soft, success…) at the page's theme. Without them,
 * a page shown light would still resolve those tokens from the app's display
 * mode — Cloud by default — and draw near-white text on white paper. With
 * them, existing components (badges, buttons, the candle) work unchanged.
 */
export default function PublicShell({ children }: { children: ReactNode }) {
  const { theme } = useLandingTheme()
  return (
    <div className={`kl kl-plain ${theme === 'dark' ? 'force-dark' : 'force-light'}`} data-kl-theme={theme}>
      <div className="mx-auto max-w-[1320px] px-4 pt-4">
        <LandingNav />
      </div>
      {children}
      <div className="mx-auto max-w-[1320px] px-4">
        <LandingFooter />
      </div>
    </div>
  )
}
