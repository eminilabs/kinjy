import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Globe, Menu, Moon, Sun, X } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { LANGUAGES, setLanguage } from '@/i18n'
import { NAV_MORE, NAV_PRIMARY, STORE_LINKS } from './data'
import { useLandingTheme } from './useLandingTheme'

export function Brand({ size = 52, text = 24 }: { size?: number; text?: number }) {
  return (
    <span className="kl-serif kl-brand flex items-center gap-2.5 font-semibold" style={{ fontSize: text, letterSpacing: '-.02em' }}>
      <img src="/logo.svg" alt="" width={size} height={size} className="block" />
      Kinjy
    </span>
  )
}

function AppleMark() {
  return (
    <span className="grid h-[26px] w-[26px] place-items-center rounded-lg border-[2.5px] border-white">
      <span className="h-2 w-2 rounded-full bg-white" />
    </span>
  )
}

function PlayMark() {
  return (
    <span
      aria-hidden="true"
      style={{ width: 0, height: 0, borderLeft: '22px solid #D9A648', borderTop: '13px solid transparent', borderBottom: '13px solid transparent' }}
    />
  )
}

/**
 * The store badges — only for stores that actually have the app. Until then
 * the line says plainly that the apps are coming, instead of offering two
 * buttons that lead nowhere.
 */
export function StoreBadges({ framed = false }: { framed?: boolean }) {
  const { t } = useTranslation()
  const badges = [
    { href: STORE_LINKS.appStore, mark: <AppleMark />, small: t('landing.stores.appleSmall'), big: 'App Store' },
    { href: STORE_LINKS.googlePlay, mark: <PlayMark />, small: t('landing.stores.playSmall'), big: 'Google Play' },
  ].filter((b) => b.href)

  if (!badges.length) {
    return (
      <p className={framed ? 'text-[15px] text-[var(--kl-night-mid)]' : 'text-[15px] text-[var(--kl-low)]'}>
        {t('landing.stores.soon')}
      </p>
    )
  }
  return (
    <div className="flex flex-wrap gap-3">
      {badges.map((b) => (
        <a
          key={b.big}
          href={b.href}
          target="_blank"
          rel="noopener noreferrer"
          className={
            'flex items-center gap-3 rounded-[10px] border border-[var(--kl-section-edge)] bg-[var(--kl-night)] py-[11px] pe-5 ps-4 !text-white transition-colors hover:bg-[var(--kl-night-2)]' +
            (framed ? ' !border-white/15 shadow-[0_20px_40px_-18px_rgba(0,0,0,.6)]' : '')
          }
        >
          {b.mark}
          <span className="flex flex-col text-left leading-[1.1]">
            <span className="text-[11px] opacity-80">{b.small}</span>
            <span className="text-[19px] font-bold tracking-[-.01em]">{b.big}</span>
          </span>
        </a>
      ))}
    </div>
  )
}

const linkHover = 'transition-colors hover:text-[var(--kl-gold-deep)]'

/** Closes a popover on Escape or a click outside it. */
function useDismiss(open: boolean, close: () => void, ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [open, close, ref])
}

function MoreMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  const { t } = useTranslation()
  useDismiss(open, close, ref)
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="kl-more"
        className={`flex items-center gap-1 ${linkHover}`}
      >
        {t('nav.more')}
        <ChevronDown size={15} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} aria-hidden="true" />
      </button>
      {open && (
        <ul
          id="kl-more"
          className="absolute right-0 top-[calc(100%+12px)] z-20 min-w-[220px] rounded-2xl border border-[var(--kl-paper-2)] bg-[var(--kl-surface)] p-2 shadow-[0_24px_48px_-24px_var(--kl-shadow)]"
        >
          {NAV_MORE.map((l) => (
            <li key={l.to}>
              <Link to={l.to} onClick={close} className="block rounded-[10px] px-3.5 py-2.5 hover:bg-[var(--kl-paper)]">
                {t(l.label)}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function AccountLinks({ stacked = false }: { stacked?: boolean }) {
  const { user } = useAuth()
  const { t } = useTranslation()
  const pill =
    'kl-sheen rounded-[20px] px-[26px] py-[13px] text-center text-[15px] font-semibold shadow-[0_8px_20px_-8px_rgba(169,118,28,.5)]'
  return (
    <div className={stacked ? 'flex flex-col gap-3' : 'flex items-center gap-[22px]'}>
      {user ? (
        <>
          <Link to="/dashboard" className={`text-[15px] font-medium ${linkHover}`}>
            {t('nav.dashboard')}
          </Link>
          <Link to="/hub" className={pill}>
            {t('nav.openApp')}
          </Link>
        </>
      ) : (
        <>
          <Link to="/join?mode=signin" className={`text-[15px] font-medium ${linkHover}`}>
            {t('nav.signIn')}
          </Link>
          <Link to="/join?mode=signup" className={pill}>
            {t('nav.signUp')}
          </Link>
        </>
      )}
    </div>
  )
}

function ThemeToggle() {
  const { theme, toggle } = useLandingTheme()
  const { t } = useTranslation()
  const toDark = theme === 'light'
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={toDark ? t('nav.toDark') : t('nav.toLight')}
      title={toDark ? t('nav.dark') : t('nav.light')}
      className="grid h-11 w-11 place-items-center rounded-full border border-[var(--kl-paper-2)] transition-colors hover:border-[var(--kl-gold)] hover:text-[var(--kl-gold-deep)]"
    >
      {toDark ? <Moon size={17} aria-hidden="true" /> : <Sun size={17} aria-hidden="true" />}
    </button>
  )
}

/**
 * The language switcher.
 *
 * The landing page had none: it rendered one language, hard-coded, under
 * `<html lang="en">`, and a visitor who read any of the other four had no way
 * to say so. Translating the copy without this would have changed nothing
 * anybody could see.
 */
function LanguageMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  const { t, i18n } = useTranslation()
  useDismiss(open, close, ref)

  const current = LANGUAGES.find((l) => l.code === i18n.language) ?? LANGUAGES[0]

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="kl-lang"
        aria-label={t('nav.chooseLanguage')}
        title={t('nav.language')}
        className="grid h-11 w-11 place-items-center rounded-full border border-[var(--kl-paper-2)] transition-colors hover:border-[var(--kl-gold)] hover:text-[var(--kl-gold-deep)]"
      >
        <Globe size={17} aria-hidden="true" />
      </button>
      {open && (
        <ul
          id="kl-lang"
          className="absolute end-0 top-[calc(100%+12px)] z-30 min-w-[180px] rounded-2xl border border-[var(--kl-paper-2)] bg-[var(--kl-surface)] p-2 shadow-[0_24px_48px_-24px_var(--kl-shadow)]"
        >
          {LANGUAGES.map((l) => (
            <li key={l.code}>
              <button
                type="button"
                lang={l.code}
                aria-current={l.code === current.code}
                onClick={() => {
                  setLanguage(l.code)
                  close()
                }}
                className={`block w-full rounded-[10px] px-3.5 py-2.5 text-start hover:bg-[var(--kl-paper)] ${
                  l.code === current.code ? 'font-semibold text-[var(--kl-gold-deep)]' : ''
                }`}
              >
                {l.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function LandingNav() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { t } = useTranslation()
  const ref = useRef<HTMLElement>(null)
  const close = useCallback(() => setMenuOpen(false), [])
  useDismiss(menuOpen, close, ref)

  return (
    <nav ref={ref} className="kl-pad-x relative z-10 flex items-center justify-between gap-6 py-[26px]" aria-label={t('nav.menu', 'Navigation')}>
      <Link to="/" aria-label={t('nav.home')}>
        <Brand />
      </Link>

      {/* Wide screens: the site's pages, the rest under "Plus". */}
      <div className="hidden items-center gap-8 text-[15px] font-medium lg:flex">
        {NAV_PRIMARY.map((l) => (
          <Link key={l.to} to={l.to} className={linkHover}>
            {t(l.label)}
          </Link>
        ))}
        <MoreMenu />
      </div>
      <div className="flex items-center gap-3">
        <LanguageMenu />
        <ThemeToggle />
        <div className="hidden lg:block">
          <AccountLinks />
        </div>

        {/* Phones and tablets: one menu holding every page. */}
        <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        aria-expanded={menuOpen}
        aria-controls="kl-menu"
        aria-label={menuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
        className="grid h-11 w-11 place-items-center rounded-full border border-[var(--kl-paper-2)] lg:hidden"
      >
        {menuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
        </button>
      </div>
      {menuOpen && (
        <div
          id="kl-menu"
          className="absolute inset-x-4 top-[calc(100%-8px)] z-20 rounded-2xl border border-[var(--kl-paper-2)] bg-[var(--kl-surface)] p-4 shadow-[0_30px_60px_-30px_var(--kl-shadow)] lg:hidden"
        >
          <ul className="grid grid-cols-2 gap-1 text-[15px] font-medium">
            {[...NAV_PRIMARY, ...NAV_MORE].map((l) => (
              <li key={l.to}>
                <Link to={l.to} onClick={close} className="block rounded-[10px] px-3 py-2.5 hover:bg-[var(--kl-paper)]">
                  {t(l.label)}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4 border-t border-[var(--kl-paper-2)] pt-4">
            <AccountLinks stacked />
          </div>
        </div>
      )}
    </nav>
  )
}
