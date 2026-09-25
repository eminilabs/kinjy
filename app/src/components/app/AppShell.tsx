import type { ReactNode } from 'react'
import { NavLink, Navigate, useLocation } from 'react-router'
import { Compass, Home, MessageSquare, Plus, User } from 'lucide-react'
import { useAppTheme } from '@/components/appdemo/theme'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { AppChipBar, AppTopBar } from './AppChrome'
import ProfileCard from './ProfileCard'
import WellbeingBar from './WellbeingBar'

/** Mobile bottom bar — the blueprint's five, Create in the middle. */
const MOBILE_NAV = [
  { to: '/hub', label: 'Home', icon: Home },
  { to: '/explore', label: 'Explore', icon: Compass },
  { to: '/hub?compose=1', label: 'Create', icon: Plus, primary: true },
  { to: '/messages', label: 'Messages', icon: MessageSquare },
  { to: '/dashboard', label: 'Profile', icon: User },
] as const

/**
 * The signed-in shell, built from the product design in /app rather than a
 * generic dashboard layout: top bar with search and the Cloud/Light/Dark/System
 * switcher, the universal chip bar, then a three-column body.
 *
 * Everything is painted through the theme tokens (`tok`), so switching display
 * mode restyles the whole app rather than one demo frame.
 */
export default function AppShell({
  title,
  subtitle,
  action,
  aside,
  children,
}: {
  /**
   * Omit on pages whose own content already says where you are — the feed's
   * mode selector is its heading, and a "Your feed, your rules." banner above it
   * only pushes the posts down.
   */
  title?: string
  subtitle?: string
  action?: ReactNode
  /** Right-hand context rail. Omitted on pages that don't need one. */
  aside?: ReactNode
  children: ReactNode
}) {
  const { user, loading } = useAuth()
  const { tok, frameStyle, rtl } = useAppTheme()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-[60svh] items-center justify-center" role="status" aria-label="Loading">
        <div className="h-12 w-12 rounded-full animate-orb-breathe" style={{ background: 'var(--grad-orb)' }} />
      </div>
    )
  }
  if (!user) return <Navigate to="/join?mode=signin" replace />

  // `noise-overlay` is the project's dithering: a very dark gradient across a
  // whole viewport has too few 8-bit steps to be smooth, and the grain breaks
  // the steps up. The marketing sections have always used it; the app frame —
  // the largest gradient in the product — never did.
  return (
    <div className="relative min-h-[100dvh] noise-overlay" style={frameStyle} dir={rtl ? 'rtl' : 'ltr'}>
      {/* Chrome: the app owns the top of the page here — the marketing navbar
          is suppressed on these routes, so this sticks to 0 rather than 72. */}
      <div className="sticky top-0 z-30">
        <WellbeingBar />
        <AppTopBar />
        <AppChipBar pathname={location.pathname} search={location.search} />
      </div>

      <div
        className={cn(
          'mx-auto grid max-w-container gap-4 px-3 pb-24 pt-4 md:px-4 lg:pb-8',
          aside
            ? 'lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_290px]'
            : 'lg:grid-cols-[220px_minmax(0,1fr)]',
        )}
      >
        {/* Left rail — identity and shortcuts */}
        <div className="hidden lg:block">
          <div className="sticky top-[140px]">
            <ProfileCard />
          </div>
        </div>

        {/* Centre column */}
        <main className="min-w-0">
          {(title || action) && (
            <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
              {title ? (
                <div>
                  <h1 className={cn('text-xl font-semibold md:text-2xl', tok.text)}>{title}</h1>
                  {subtitle && <p className={cn('mt-1 max-w-xl text-xs', tok.low)}>{subtitle}</p>}
                </div>
              ) : (
                <span />
              )}
              {action}
            </header>
          )}
          {children}
        </main>

        {/* Right rail */}
        {aside && (
          <aside className="hidden xl:block">
            <div className="sticky top-[140px] space-y-3">{aside}</div>
          </aside>
        )}
      </div>

      {/* Mobile bottom bar */}
      <nav
        className={cn('fixed inset-x-0 bottom-0 z-40 lg:hidden', tok.cardSolid)}
        aria-label="Kinjy modules"
      >
        <ul className="mx-auto flex max-w-md items-center justify-around px-2 py-2">
          {MOBILE_NAV.map((item) => {
            const active =
              location.pathname === item.to.split('?')[0] &&
              (!item.to.includes('?') || location.search.includes(item.to.split('?')[1]))
            return (
              <li key={item.label}>
                <NavLink
                  to={item.to}
                  aria-label={item.label}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-full px-3 py-1.5 text-[0.65rem] font-medium transition-colors',
                    'primary' in item && item.primary ? 'text-ink' : active ? 'text-gold-soft' : tok.mid,
                  )}
                >
                  <span
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-full',
                      'primary' in item && item.primary && 'bg-gradient-to-br from-gold-soft to-gold',
                    )}
                  >
                    <item.icon size={18} aria-hidden="true" />
                  </span>
                  <span className={cn('primary' in item && item.primary && tok.mid)}>{item.label}</span>
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}

/** A right-rail card, themed like the rest of the shell. */
export function RailCard({ title, children }: { title: string; children: ReactNode }) {
  const { tok } = useAppTheme()
  return (
    <section className={cn('rounded-card-lg p-4', tok.card)}>
      <h2 className={cn('mb-3 text-sm font-semibold', tok.text)}>{title}</h2>
      {children}
    </section>
  )
}
