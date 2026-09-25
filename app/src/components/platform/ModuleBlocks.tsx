import type { ComponentType } from 'react'
import { Link } from 'react-router'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { MODULES } from './data'
import type { ModuleInfo } from './data'
import { ArcDivider, CLOUD_EASE, ModuleGlyph } from './shared'
import {
  SocialHubVisual,
  PublicContentVisual,
  ForumsVisual,
  CirclesVisual,
  CommunitiesVisual,
  MessengerVisual,
  CreatorStudioVisual,
  FamilyTreeVisual,
} from './visuals-a'
import {
  GraveyardVisual,
  EventsVisual,
  MarketplaceVisual,
  AdsVisual,
  AffiliateVisual,
  AILayerVisual,
  DevVisual,
} from './visuals-b'

const VISUALS: Record<string, ComponentType> = {
  A: SocialHubVisual,
  B: PublicContentVisual,
  C: ForumsVisual,
  D: CirclesVisual,
  E: CommunitiesVisual,
  F: MessengerVisual,
  G: CreatorStudioVisual,
  H: FamilyTreeVisual,
  I: GraveyardVisual,
  J: EventsVisual,
  K: MarketplaceVisual,
  L: AdsVisual,
  M: AffiliateVisual,
  N: AILayerVisual,
  O: DevVisual,
}

function ModuleBlock({ mod, flip }: { mod: ModuleInfo; flip: boolean }) {
  const Visual = VISUALS[mod.letter]
  const reduced = useReducedMotion()
  const textFrom = flip ? 48 : -48
  const visualFrom = flip ? -48 : 48

  return (
    <article
      id={`module-${mod.letter}`}
      className="scroll-mt-24"
      aria-label={`Module ${mod.letter}: ${mod.name}`}
    >
      <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
        {/* Text column (7) */}
        <motion.div
          className={cn('lg:col-span-7', flip && 'lg:order-2')}
          initial={reduced ? false : { opacity: 0, x: textFrom }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.5, ease: CLOUD_EASE }}
        >
          <div className="flex items-center gap-3">
            <span className="cloud-glass flex h-12 w-12 items-center justify-center rounded-full">
              <ModuleGlyph id={mod.glyph} size={24} />
            </span>
            <span className="mono-data text-xs uppercase tracking-[0.2em] text-gold">Module {mod.letter}</span>
          </div>
          <h3 className="h3 mt-4 font-display text-2xl font-medium tracking-tight">{mod.name}</h3>
          <p className="mt-1 font-display text-base italic text-gold-soft/90">{mod.tagline}</p>
          <p className="mt-3 max-w-xl leading-relaxed text-text-mid">{mod.description}</p>
          <ul className="mt-5 flex flex-wrap gap-2">
            {mod.bullets.map((b) => (
              <li key={b} className="caption rounded-full border border-white/12 bg-white/5 px-3 py-1.5 text-text-mid">
                {b}
              </li>
            ))}
          </ul>
          {mod.cta && (
            <Link to={mod.cta.to} className="mt-5 inline-block text-sm font-bold text-sky hover:text-gold-soft">
              {mod.cta.label}
            </Link>
          )}
        </motion.div>

        {/* Visual column (5) */}
        <motion.div
          className={cn('lg:col-span-5', flip && 'lg:order-1')}
          initial={reduced ? false : { opacity: 0, x: visualFrom }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, ease: CLOUD_EASE, delay: 0.1 }}
        >
          <Visual />
        </motion.div>
      </div>
    </article>
  )
}

/** Section 3 — the 15 module detail blocks (A–O), alternating 7/5 splits. */
export default function ModuleBlocks() {
  return (
    <section className="px-6 py-12 md:py-16" aria-label="Module details">
      <div className="mx-auto max-w-container space-y-24">
        {MODULES.map((mod, i) => (
          <div key={mod.letter}>
            {i > 0 && <ArcDivider className="mb-24" />}
            <ModuleBlock mod={mod} flip={i % 2 === 1} />
          </div>
        ))}
      </div>
    </section>
  )
}
