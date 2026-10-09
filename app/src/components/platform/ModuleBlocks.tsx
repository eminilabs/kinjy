import type { ComponentType } from 'react'
import { Link } from 'react-router'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { MODULES } from './data'
import type { ModuleInfo } from './data'
import { CLOUD_EASE, ModuleGlyph } from './shared'
import { MODULE_TONES } from './tones'
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

/** Each row's stage gets one soft glow, cycled like the landing's feature rows. */
const GLOWS = ['var(--kl-sky)', 'var(--kl-coral)', '#D9A648']

/**
 * One module, on the landing's feature row: the text beside a soft stage, and
 * the module's illustration resting on that stage as a card in the page's
 * own theme.
 */
function ModuleBlock({ mod, index }: { mod: ModuleInfo; index: number }) {
  const Visual = VISUALS[mod.visual ?? mod.letter]
  const reduced = useReducedMotion()
  const flip = index % 2 === 1
  const [ink, tile] = MODULE_TONES[index % MODULE_TONES.length]

  return (
    <article
      id={`module-${mod.letter}`}
      className="kl-split scroll-mt-24 gap-14 py-[60px]"
      aria-label={`Module ${mod.letter}: ${mod.name}`}
    >
      <motion.div
        className={cn(flip && 'lg:order-2')}
        initial={reduced ? false : { opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.5, ease: CLOUD_EASE }}
      >
        <div className="flex items-center gap-4">
          <span className="grid h-[60px] w-[60px] place-items-center rounded-[10px] shadow-[0_14px_30px_-16px_var(--kl-shadow)]" style={{ background: tile, color: ink }}>
            <ModuleGlyph id={mod.glyph} size={28} className="!text-current" />
          </span>
          <span className="kl-mono text-xs tracking-[.14em] text-[var(--kl-gold-deep)]">MODULE {mod.letter}</span>
        </div>
        <h3 className="kl-h3 mt-7">{mod.name}</h3>
        <p className="kl-serif mt-3 text-xl italic text-[var(--kl-gold-deep)]">{mod.tagline}</p>
        <p className="kl-lead mt-4">{mod.description}</p>
        <ul className="mt-6 flex flex-wrap gap-2">
          {mod.bullets.map((b) => (
            <li key={b} className="rounded-[20px] border border-[var(--kl-paper-2)] bg-[var(--kl-surface)] px-3.5 py-2 text-[13px] font-semibold">
              {b}
            </li>
          ))}
        </ul>
        {mod.cta && (
          <Link to={mod.cta.to} className="mt-6 inline-block font-semibold text-[var(--kl-gold-deep)] hover:underline">
            {mod.cta.label}
          </Link>
        )}
      </motion.div>

      <motion.div
        className={cn('relative overflow-hidden rounded-[20px] p-[clamp(20px,4vw,40px)]', flip && 'lg:order-1')}
        style={{ background: `linear-gradient(${flip ? 200 : 160}deg, var(--kl-stage-a), var(--kl-stage-b))` }}
        initial={reduced ? false : { opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.5, ease: CLOUD_EASE, delay: 0.1 }}
      >
        <div
          aria-hidden="true"
          className={cn('absolute h-[240px] w-[240px] rounded-full opacity-40 blur-[80px]', flip ? '-bottom-16 -left-12' : '-right-16 -top-16')}
          style={{ background: GLOWS[index % GLOWS.length] }}
        />
        <div className="relative mx-auto max-w-[460px]">
          <Visual />
        </div>
      </motion.div>
    </article>
  )
}

/** Section 3 — the module detail blocks, alternating rows. */
export default function ModuleBlocks() {
  return (
    <section className="kl-pad-x border-t border-[var(--kl-paper-2)] py-[60px]" aria-label="Module details">
      {MODULES.map((mod, i) => (
        <ModuleBlock key={mod.letter} mod={mod} index={i} />
      ))}
    </section>
  )
}
