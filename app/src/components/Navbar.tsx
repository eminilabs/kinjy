import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Globe, Menu, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { LANGUAGES } from '@/i18n'
import { useAuth } from '@/hooks/useAuth'

/**
 * Ten top-level links read as a site map rather than a way in. Five carry the
 * bar; the rest live under "More" — still one click away, no longer competing
 * for the same glance. The mobile drawer keeps showing everything flat, where
 * vertical space is not the constraint.
 */
export const PRIMARY_LINKS = [
  { to: '/platform', key: 'nav.platform', fallback: 'Platform' },
  { to: '/feeds', key: 'nav.feeds', fallback: 'Feeds' },
  { to: '/family', key: 'nav.family', fallback: 'Family' },
  { to: '/creators', key: 'nav.creators', fallback: 'Creators' },
  { to: '/pricing', key: 'nav.pricing', fallback: 'Pricing' },
] as const

export const SECONDARY_LINKS = [
  { to: '/memorials', key: 'nav.memorials', fallback: 'Memorials' },
  { to: '/commerce', key: 'nav.commerce', fallback: 'Commerce' },
  { to: '/payments', key: 'nav.payments', fallback: 'Payments' },
  { to: '/safety', key: 'nav.safety', fallback: 'Safety' },
  { to: '/developers', key: 'nav.developers', fallback: 'Developers' },
] as const

/** Every marketing route, in order — used by the mobile drawer and the footer. */
export const NAV_LINKS = [...PRIMARY_LINKS, ...SECONDARY_LINKS] as const

/** Marketing Navbar (§7.1) — fixed 72px overlay nav; transparent at top, glass after 24px scroll. */
export default function Navbar() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const [scrolled, setScrolled] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const location = useLocation()
  const secondaryActive = SECONDARY_LINKS.some((l) => location.pathname.startsWith(l.to))

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setDrawerOpen(false)
    setLangOpen(false)
    setMoreOpen(false)
  }, [location.pathname])

  const switchLanguage = (code: string, dir: 'ltr' | 'rtl') => {
    i18n.changeLanguage(code)
    document.documentElement.dir = dir
    document.documentElement.lang = code
    setLangOpen(false)
  }

  return (
    <>
      <header
        className={cn(
          'fixed top-0 inset-x-0 z-50 h-[72px] transition-all duration-300 ease-cloud-ease',
          scrolled ? 'cloud-glass bg-ink/60 shadow-cloud' : 'bg-transparent',
        )}
      >
        <div className="mx-auto flex h-full max-w-container items-center justify-between gap-4 px-6">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0" aria-label="Kinjy home">
            <img src="/logo.svg" alt="" className="h-8 w-8" />
            <span className="font-display text-xl font-medium tracking-tight">Kinjy</span>
          </Link>

          {/* Center links */}
          <nav className="hidden lg:flex items-center gap-1" aria-label="Primary">
            {PRIMARY_LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  cn(
                    'relative rounded-full px-3 py-2 text-sm font-medium transition-colors duration-200',
                    isActive ? 'text-gold-soft' : 'text-text-mid hover:text-text-hi',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {t(l.key, { defaultValue: l.fallback })}
                    {isActive && (
                      <motion.span
                        layoutId="nav-active-arc"
                        className="absolute -bottom-0.5 left-3 right-3 h-0.5 rounded-full"
                        style={{ background: 'var(--grad-arc)' }}
                        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            ))}

            {/* More — the remaining sections, one click away */}
            <div
              className="relative"
              onMouseEnter={() => setMoreOpen(true)}
              onMouseLeave={() => setMoreOpen(false)}
            >
              <button
                type="button"
                onClick={() => setMoreOpen((v) => !v)}
                aria-expanded={moreOpen}
                className={cn(
                  'flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium transition-colors duration-200',
                  secondaryActive ? 'text-gold-soft' : 'text-text-mid hover:text-text-hi',
                )}
              >
                {t('nav.more', { defaultValue: 'More' })}
                <ChevronDown size={14} className={cn('transition-transform', moreOpen && 'rotate-180')} />
              </button>
              <AnimatePresence>
                {moreOpen && (
                  <motion.ul
                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.97 }}
                    transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute start-0 top-11 w-48 rounded-card-md cloud-glass bg-ink-2/95 p-2 shadow-cloud"
                  >
                    {SECONDARY_LINKS.map((l) => (
                      <li key={l.to}>
                        <NavLink
                          to={l.to}
                          className={({ isActive }) =>
                            cn(
                              'block rounded-card-sm px-3 py-2 text-sm transition-colors',
                              isActive
                                ? 'text-gold-soft bg-gold/10'
                                : 'text-text-mid hover:text-text-hi hover:bg-white/5',
                            )
                          }
                        >
                          {t(l.key, { defaultValue: l.fallback })}
                        </NavLink>
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
          </nav>

          {/* Right cluster */}
          <div className="flex items-center gap-2">
            {/* Language switcher */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setLangOpen((v) => !v)}
                aria-expanded={langOpen}
                aria-label="Change language"
                className="flex h-10 w-10 items-center justify-center rounded-full cloud-glass text-text-mid hover:text-gold-soft transition-colors"
              >
                <Globe size={17} />
              </button>
              <AnimatePresence>
                {langOpen && (
                  <motion.ul
                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.97 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute end-0 top-12 w-44 rounded-card-md cloud-glass bg-ink-2/95 p-2 shadow-cloud"
                  >
                    {LANGUAGES.map((l) => (
                      <li key={l.code}>
                        <button
                          type="button"
                          onClick={() => switchLanguage(l.code, l.dir)}
                          className={cn(
                            'w-full rounded-card-sm px-3 py-2 text-start text-sm transition-colors',
                            i18n.language === l.code ? 'text-gold-soft bg-gold/10' : 'text-text-mid hover:text-text-hi hover:bg-white/5',
                          )}
                        >
                          {l.label}
                        </button>
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>

            {/* The display-mode button that used to sit here had no handler —
                it looked interactive and did nothing. The real switcher lives
                in the App demo; bring it back here when it actually switches. */}

            {user ? (
              <>
              <Link
                to="/hub"
                className="hidden md:inline-flex items-center rounded-full px-4 py-2.5 text-sm font-semibold cloud-glass text-text-hi hover:border-gold/40 hover:text-gold-soft transition-colors"
              >
                {t('nav.hub', { defaultValue: 'Feed' })}
              </Link>
              <Link
                to="/dashboard"
                className="hidden md:inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold cloud-glass text-text-hi hover:border-gold/40 hover:text-gold-soft transition-colors"
              >
                <span
                  aria-hidden="true"
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-gold-soft to-gold text-[0.65rem] font-bold text-ink"
                >
                  {user.display_name.slice(0, 1).toUpperCase()}
                </span>
                {t('nav.dashboard', { defaultValue: 'Dashboard' })}
              </Link>
              </>
            ) : (
              <>
                <Link
                  to="/join?mode=signin"
                  className="hidden md:inline-flex items-center rounded-full px-5 py-2.5 text-sm font-semibold cloud-glass text-text-hi hover:border-gold/40 hover:text-gold-soft transition-colors"
                >
                  {t('nav.signIn', { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/join?mode=signup"
                  className="hidden md:inline-flex items-center rounded-full bg-gradient-to-br from-gold-soft to-gold px-5 py-2.5 text-sm font-bold text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] hover:brightness-110 transition"
                >
                  {t('nav.join', { defaultValue: 'Join Kinjy' })}
                </Link>
              </>
            )}

            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              className="flex lg:hidden h-10 w-10 items-center justify-center rounded-full cloud-glass text-text-hi"
            >
              <Menu size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile full-screen glass drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[60] cloud-glass bg-ink/85 backdrop-blur-2xl lg:hidden"
            role="dialog"
            aria-label="Menu"
          >
            <div className="flex h-[72px] items-center justify-between px-6">
              <span className="flex items-center gap-2.5">
                <img src="/logo.svg" alt="" className="h-8 w-8" />
                <span className="font-display text-xl font-medium">Kinjy</span>
              </span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="flex h-10 w-10 items-center justify-center rounded-full cloud-glass text-text-hi"
              >
                <X size={18} />
              </button>
            </div>
            <nav className="flex flex-col gap-1 px-8 pt-8" aria-label="Mobile">
              {[{ to: '/', label: 'Home' }, ...NAV_LINKS.map((l) => ({ to: l.to, label: t(l.key, { defaultValue: l.fallback }) })), { to: '/assistant', label: 'Kinjy Assistant' }, { to: '/admin', label: 'Admin Console' }, { to: '/app', label: 'The App' },
              user
                ? { to: '/dashboard', label: t('nav.dashboard', { defaultValue: 'Dashboard' }) }
                : { to: '/join?mode=signup', label: t('nav.join', { defaultValue: 'Join Kinjy' }) }].map((l, i) => (
                <motion.div
                  key={l.to}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.06 * i, duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                >
                  <NavLink
                    to={l.to}
                    className={({ isActive }) =>
                      cn(
                        'block rounded-card-md px-4 py-3 font-display text-2xl transition-colors',
                        isActive ? 'text-gold-soft' : 'text-text-hi hover:text-gold-soft',
                      )
                    }
                  >
                    {l.label}
                  </NavLink>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06 * NAV_LINKS.length + 0.2, duration: 0.42 }}
                className="mt-6 flex flex-wrap gap-2 px-4"
              >
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => switchLanguage(l.code, l.dir)}
                    className={cn(
                      'rounded-full px-3 py-1.5 text-sm cloud-glass',
                      i18n.language === l.code ? 'text-gold-soft border-gold/40' : 'text-text-mid',
                    )}
                  >
                    {l.label}
                  </button>
                ))}
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
