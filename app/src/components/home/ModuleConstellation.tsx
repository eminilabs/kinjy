import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ArrowRight } from 'lucide-react'
import CloudCard from '@/components/ui-kit/CloudCard'

gsap.registerPlugin(ScrollTrigger)

const MODULES: { icon: string; name: string; desc: string }[] = [
  { icon: 'mod-home', name: 'Social Hub', desc: 'Your home feed, your people, your rules.' },
  { icon: 'mod-globe-grid', name: 'Public Content', desc: 'A global square translated live into your language.' },
  { icon: 'mod-forums', name: 'Forums', desc: 'Deep threaded discussions that never get lost.' },
  { icon: 'mod-circles', name: 'Circles', desc: 'Intimate groups with per-circle sharing.' },
  { icon: 'mod-community', name: 'Communities', desc: 'Interest spaces with their own economies.' },
  { icon: 'mod-message', name: 'Messenger', desc: 'E2E encrypted chat, auto-translated.' },
  { icon: 'mod-creator', name: 'Creator Studio', desc: 'One-to-Many publishing with an AI copilot.' },
  { icon: 'mod-family', name: 'Family Tree', desc: 'Verified genealogy across infinite generations.' },
  { icon: 'mod-candle', name: 'Digital Graveyard', desc: 'Memorials kept with dignity, forever.' },
  { icon: 'mod-calendar', name: 'Events', desc: 'Gather your circles, online and off.' },
  { icon: 'mod-storefront', name: 'Marketplace', desc: 'Trusted commerce on a fair 20% margin.' },
  { icon: 'mod-megaphone', name: 'Advertising', desc: 'AI-built campaigns with transparent floors.' },
  { icon: 'mod-coins', name: 'Earnings', desc: 'A ledger you can audit, down to the cent.' },
  { icon: 'mod-ai', name: 'AI Layer', desc: 'Agents that know the platform — and you.' },
  { icon: 'mod-code', name: 'Developer Platform', desc: 'APIs, webhooks and an algorithm marketplace.' },
]

/** Section 3 — "Everything you love. Unified." module constellation (GSAP batch). */
export default function ModuleConstellation() {
  const rootRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('.module-card').forEach((card, i) => {
        gsap.from(card, {
          y: 48,
          opacity: 0,
          duration: 0.7,
          delay: (i % 5) * 0.07,
          ease: 'power3.out',
          scrollTrigger: { trigger: card, start: 'top 75%' },
        })
      })
      gsap.to('.modules-header', {
        y: -40,
        ease: 'none',
        scrollTrigger: { trigger: root, start: 'top bottom', end: 'bottom top', scrub: 0.8 },
      })
    }, root)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={rootRef} id="modules" className="noise-overlay relative bg-ink px-6 py-24 md:py-32">
      <div className="mx-auto grid max-w-container gap-12 lg:grid-cols-[minmax(280px,380px)_1fr]">
        <div className="modules-header lg:sticky lg:top-28 lg:self-start">
          <p className="eyebrow text-gold">One Ecosystem</p>
          <h2 className="h2 mt-4">Fifteen modules. One society.</h2>
          <p className="body-lg mt-5 text-text-mid">
            The strongest ideas of every platform you know — connected, translated and made yours.
          </p>
          <Link
            to="/platform"
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-gold-soft hover:gap-3 transition-all"
          >
            Explore the platform <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {MODULES.map((m) => (
            <Link key={m.name} to="/platform" className="module-card block" aria-label={`${m.name} — ${m.desc}`}>
              <CloudCard hoverable className="group h-full p-5">
                <svg width={26} height={26} aria-hidden="true" className="mb-3">
                  <use href={`/icon-modules.svg#${m.icon}`} />
                </svg>
                <h3 className="text-[0.95rem] font-semibold">{m.name}</h3>
                <p className="caption mt-1.5">{m.desc}</p>
                <span className="mt-3 inline-flex translate-x-0 items-center gap-1 text-xs font-semibold text-gold opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100">
                  Open <ArrowRight size={12} aria-hidden="true" />
                </span>
              </CloudCard>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
