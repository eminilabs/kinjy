import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Navbar from './Navbar'
import Footer from './Footer'
import LiveAssistant from './assistant/LiveAssistant'

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
  '/communities',
  '/forums',
  '/messages',
  '/tree',
  '/graveyard',
  '/market',
  '/explore',
  '/live',
  '/shorts',
  '/u',
]

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

  // Lenis smooth scroll on the marketing pages only (lerp 0.09, wheel 0.9),
  // synced to ScrollTrigger.
  //
  // Not in the app: eased scrolling is a brochure flourish that costs latency on
  // every gesture through a feed, and it takes over window.scrollTo, so anything
  // that wants to jump the viewport — a deep link, a "back to top" — stops working.
  useEffect(() => {
    if (inApp) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.9 })
    lenis.on('scroll', ScrollTrigger.update)
    const tick = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)
    return () => {
      gsap.ticker.remove(tick)
      lenis.destroy()
    }
  }, [inApp])

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
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
  const showAssistant = !location.pathname.startsWith('/app')

  return (
    <div className="min-h-[100dvh] bg-ink text-text-hi">
      {!inApp && <Navbar />}
      <main className={inApp ? undefined : 'pt-[72px]'}>{children}</main>
      {!inApp && <Footer />}
      {showAssistant && <LiveAssistant />}
      <div className="global-grain" aria-hidden="true" />
    </div>
  )
}
