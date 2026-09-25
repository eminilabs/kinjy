import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'
import ArcButton from './ui-kit/ArcButton'
import { LANGUAGES } from '@/i18n'

/** Slow-drifting arc constellation canvas (24 nodes, 12s loop). */
function ArcConstellation() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let w = 0
    let h = 0
    let onScreen = false
    let last = 0
    // One gradient for the whole canvas instead of one per arc per frame.
    // At 0.35 alpha on a 1px hairline the difference is invisible, and the old
    // version allocated ~16,000 gradient objects a second — enough to make
    // frame times irregular, which on a cleared-and-redrawn canvas reads as a
    // shimmer rather than as a slow drift.
    let sheen: CanvasGradient | null = null
    // A drifting constellation does not need 60fps, and asking for it is what
    // made the frames uneven in the first place.
    const FRAME_MS = 1000 / 30
    const N = 24
    const nodes = Array.from({ length: N }, (_, i) => ({
      bx: (i * 0.6180339887 + 0.13) % 1,
      by: (i * 0.7548776662 + 0.31) % 1,
      ph: Math.random() * Math.PI * 2,
      sp: 0.4 + Math.random() * 0.6,
    }))

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = canvas.clientWidth
      h = canvas.clientHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      sheen = ctx.createLinearGradient(0, 0, w, 0)
      sheen.addColorStop(0, 'rgba(240,200,120,1)')
      sheen.addColorStop(0.55, 'rgba(217,166,72,1)')
      sheen.addColorStop(1, 'rgba(143,184,232,1)')
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const draw = (t: number) => {
      raf = requestAnimationFrame(draw)
      if (t - last < FRAME_MS) return
      last = t
      const s = t / 1000
      ctx.clearRect(0, 0, w, h)
      ctx.strokeStyle = sheen ?? 'rgba(217,166,72,1)'
      ctx.lineWidth = 1
      const pts = nodes.map((n) => ({
        x: n.bx * w + Math.sin(s * 0.11 * n.sp + n.ph) * 22,
        y: n.by * h + Math.cos(s * 0.09 * n.sp + n.ph * 1.3) * 16,
      }))
      // arcs between neighbours
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x
          const dy = pts[i].y - pts[j].y
          const dist = Math.hypot(dx, dy)
          if (dist < 240) {
            const mx = (pts[i].x + pts[j].x) / 2
            const my = (pts[i].y + pts[j].y) / 2 - dist * 0.18
            // Distance fade via globalAlpha rather than a bespoke gradient.
            ctx.globalAlpha = (1 - dist / 240) * 0.35
            ctx.beginPath()
            ctx.moveTo(pts[i].x, pts[i].y)
            ctx.quadraticCurveTo(mx, my, pts[j].x, pts[j].y)
            ctx.stroke()
          }
        }
      }
      // nodes
      ctx.globalAlpha = 0.7
      ctx.fillStyle = 'rgba(240,200,120,1)'
      for (const p of pts) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }

    // The footer sits at the bottom of every page, so an unconditional loop
    // animated a canvas nobody was looking at for the whole visit. It runs only
    // while it is actually on screen.
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting === onScreen) return
        onScreen = entry.isIntersecting
        if (onScreen) {
          last = 0
          raf = requestAnimationFrame(draw)
        } else {
          cancelAnimationFrame(raf)
        }
      },
      { threshold: 0 },
    )
    io.observe(canvas)

    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      ro.disconnect()
    }
  }, [])

  return <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden="true" />
}

const COLUMNS: { title: string; links: { label: string; to: string }[] }[] = [
  {
    title: 'Platform',
    links: [
      { label: 'All 15 modules', to: '/platform' },
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

/** Footer (§7.3) — twilight field, arc constellation, CTA, link columns. */
export default function Footer() {
  const { t, i18n } = useTranslation()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  return (
    <footer className="relative overflow-hidden twilight-field noise-overlay">
      <ArcConstellation />
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
                    <Link to={l.to} className="text-sm text-text-mid transition-colors hover:text-gold-soft">
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
