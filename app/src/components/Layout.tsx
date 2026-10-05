import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Navbar from './Navbar'
import Footer from './Footer'
import LiveAssistant from './assistant/LiveAssistant'
import { FEATURES } from '@/lib/features'

gsap.registerPlugin(ScrollTrigger)

/**
 * Routes that render `AppShell`, which brings its own top bar, chip nav and
 * footerless full-height layout. The marketing navbar and footer are suppressed
 * there: stacking them produced two headers, one above the other.
 */
const APP_ROUTES = [
  '/hub',
  '/dashboard',
  '/circles',
  '/connections',
  '/communities',
  '/forums',
  '/messages',
  '/tree',
  '/graveyard',
  '/market',
  '/explore',
  '/earn',
  '/live',
  '/shorts',
  '/supervision',
  '/trust-safety',
  '/moderation',
  // Covers /settings/supervision, which the notifications link to.
  '/settings',
  '/u',
]

/** Public pages already on the new design: they bring their own navigation and
 *  footer (components/landing/PublicShell), so the old marketing ones step aside. */
const OWN_CHROME_PAGES = ['/', '/memorials', '/platform', '/feeds', '/creators', '/pricing', '/payments', '/safety', '/developers', '/app', '/join']

export function isAppRoute(pathname: string): boolean {
  return APP_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
}

/**
 * Shared layout (children pattern — App wraps <Routes> inside <Layout>).
 *
 * Marketing pages get the fixed 72px overlay nav (design §7.1) and the footer;
 * the signed-in app gets neither, because AppShell is the chrome there.
 */
export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation()
  const inApp = isAppRoute(location.pathname)
  // The landing page brings its own navigation, footer and paper palette (the
  // "Kinjy Landing" design); the dark marketing chrome around it would frame
  // a light page in a second, different header.
  const ownChrome = inApp || OWN_CHROME_PAGES.includes(location.pathname)

  // Scroll behavior on route change: honor hash deep links (e.g.
  // /family#reunion-planner) after the lazy page mounts; otherwise scroll to top.
  useEffect(() => {
    if (!location.hash) {
      window.scrollTo(0, 0)
      return
    }
    const id = location.hash.slice(1)
    let attempts = 0
    const tryScroll = () => {
      const el = document.getElementById(id)
      if (el) {
        el.scrollIntoView({ behavior: 'auto', block: 'start' })
      } else if (attempts++ < 40) {
        // Lazy page chunks mount asynchronously — retry briefly.
        setTimeout(tryScroll, 100)
      } else {
        window.scrollTo(0, 0)
      }
    }
    tryScroll()
  }, [location.pathname, location.hash])

  // The App demo (/app) embeds its own Assistant orb inside the product shell,
  // so the global orb is suppressed there to avoid duplication.
  const showAssistant = FEATURES.assistant && !location.pathname.startsWith('/app')

  return (
    <div className="min-h-[100dvh] bg-ink text-text-hi">
      {!ownChrome && <Navbar />}
      <main className={ownChrome ? undefined : 'pt-[72px]'}>{children}</main>
      {!ownChrome && <Footer />}
      {showAssistant && <LiveAssistant />}
      {/* Film grain belongs to the dark surfaces; on white paper it reads as dirt. */}
      {!OWN_CHROME_PAGES.includes(location.pathname) && <div className="global-grain" aria-hidden="true" />}
    </div>
  )
}
