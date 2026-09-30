import { useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'
import ArcButton from './ui-kit/ArcButton'
import { LANGUAGES } from '@/i18n'
import { isRouteAvailable } from '@/lib/features'

const COLUMNS: { title: string; links: { label: string; to: string }[] }[] = [
  {
    title: 'Platform',
    links: [
      { label: 'All modules', to: '/platform' },
      { label: 'Feeds & algorithms', to: '/feeds' },
      { label: 'Family Tree', to: '/family' },
      { label: 'Digital Graveyard', to: '/memorials' },
      { label: 'The App', to: '/app' },
    ],
  },
  {
    title: 'Trust',
    links: [
      { label: 'Safety & moderation', to: '/safety' },
      { label: 'Privacy', to: '/safety' },
      { label: 'Transparency', to: '/safety' },
      { label: 'Account deletion', to: '/safety' },
    ],
  },
  {
    title: 'Economy',
    links: [
      { label: 'Creator Studio', to: '/creators' },
      { label: 'Marketplace', to: '/commerce' },
      { label: 'Advertising', to: '/commerce' },
      { label: 'Payments & Crypto', to: '/payments' },
      { label: 'Kinjy Leaders', to: '/creators' },
    ],
  },
  {
    title: 'Builders',
    links: [
      { label: 'Developers', to: '/developers' },
      { label: 'AI Gateway', to: '/developers' },
      { label: 'Algorithm Marketplace', to: '/feeds' },
      { label: 'Status', to: '/developers' },
    ],
  },
]

/** Footer (§7.3) — twilight field, CTA, link columns. */
export default function Footer() {
  const { t, i18n } = useTranslation()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  return (
    <footer className="relative overflow-hidden twilight-field noise-overlay">
      <div className="relative z-10 mx-auto max-w-container px-6 pt-24 pb-10">
        {/* CTA block */}
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="display-lg">One world. <em className="text-gold-grad not-italic font-display italic">Every connection.</em></h2>
          <p className="body-lg mt-4 text-text-mid">
            Join the society where every language, format and generation converges.
          </p>
          <form
            className="mx-auto mt-8 flex max-w-md items-center gap-2 rounded-full cloud-glass p-1.5"
            onSubmit={(e) => {
              e.preventDefault()
              if (email.trim()) setSent(true)
            }}
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              aria-label="Email address"
              className="min-w-0 flex-1 bg-transparent px-4 py-2 text-sm text-text-hi placeholder:text-text-low focus:outline-none"
            />
            <ArcButton type="submit" size="sm">
              {sent ? 'See you soon ✓' : 'Create your account'}
            </ArcButton>
          </form>
        </div>

        {/* Link columns */}
        <div className="mt-20 grid grid-cols-2 gap-10 border-t border-white/8 pt-14 md:grid-cols-4">
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="eyebrow text-gold">{col.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link to={l.to} className="text-sm text-text-mid hover:text-gold-soft">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom row */}
        <div className="mt-16 flex flex-col items-center justify-between gap-6 border-t border-white/8 pt-8 md:flex-row">
          <div className="flex items-center gap-2.5">
            <img src="/logo.svg" alt="" className="h-6 w-6" />
            <span className="caption">© 2025 Kinjy</span>
          </div>
          <div className="flex items-center gap-2">
            <Globe size={14} className="text-text-low" aria-hidden="true" />
            <div className="flex gap-1">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => {
                    i18n.changeLanguage(l.code)
                    document.documentElement.dir = l.dir
                    document.documentElement.lang = l.code
                  }}
                  className={
                    i18n.language === l.code
                      ? 'rounded px-1.5 py-0.5 text-xs font-semibold text-gold-soft'
                      : 'rounded px-1.5 py-0.5 text-xs text-text-low hover:text-text-mid'
                  }
                >
                  {l.code.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <img src="/app-store-badges.svg" alt="Open App / Install PWA" className="h-10 w-auto opacity-80" />
          <p className="caption">{t('footer.gateway', { defaultValue: 'Built with the Kinjy AI Gateway' })}</p>
        </div>
      </div>
    </footer>
  )
}
