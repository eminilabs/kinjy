import { motion } from 'framer-motion'
import { Award, Crown, Medal, TrendingUp, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LevelRing, VerifiedBadge } from '@/components/ui-kit'
import { avatarStyle, useAppTheme } from './theme'
import type { ChromeKey } from './theme'
import { MODULE_ICONS } from './Chrome'
import { FEED_MODES } from './posts'
import type { FeedMode } from './posts'

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

/* --------------------------------- Left rail --------------------------------- */

export function LeftRail({ pinned, onSelect }: { pinned: ChromeKey[]; onSelect: (m: ChromeKey) => void }) {
  const { t, tok } = useAppTheme()
  const circles = ['Family', 'Close Friends', 'Business', 'Smart · “University”']
  return (
    <motion.aside
      initial={{ opacity: 0, x: -40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1, duration: 0.55, ease: EASE }}
      className="hidden w-[220px] shrink-0 space-y-3.5 overflow-y-auto p-3.5 lg:block"
      aria-label="Profile and shortcuts"
    >
      {/* profile mini-card */}
      <div className={cn('rounded-card-lg p-4 text-center', tok.card)}>
        <span className="mx-auto block h-16 w-16 rounded-full bg-cover ring-2 ring-gold/50" style={avatarStyle(0)} aria-hidden="true" />
        <p className={cn('mt-2.5 flex items-center justify-center gap-1.5 text-sm font-bold', tok.text)}>
          Baraka Otieno <VerifiedBadge size={15} />
        </p>
        <p className={cn('text-xs', tok.low)}>@baraka.o · Nairobi</p>
        <div className="mt-3 flex justify-center">
          <LevelRing level={2} max={5} size={52} label="Level 2 closeness" />
        </div>
      </div>

      {/* pinned modules */}
      <div className={cn('rounded-card-lg p-3.5', tok.card)}>
        <p className={cn('mb-2 text-[0.65rem] font-bold uppercase tracking-wider', tok.low)}>{t('pinned')}</p>
        <ul className="space-y-1">
          {pinned.map((m) => {
            const Icon = MODULE_ICONS[m] ?? Users
            return (
              <li key={m}>
                <button
                  type="button"
                  onClick={() => onSelect(m)}
                  className={cn('flex w-full items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors', tok.mid, tok.hoverBg)}
                >
                  <Icon size={12} className="text-gold" aria-hidden="true" /> {t(m)}
                  <span className="ms-auto h-1.5 w-1.5 rounded-full bg-gold" aria-hidden="true" />
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      {/* circles quick-switch */}
      <div className={cn('rounded-card-lg p-3.5', tok.card)}>
        <p className={cn('mb-2 text-[0.65rem] font-bold uppercase tracking-wider', tok.low)}>{t('circles')}</p>
        <div className="flex flex-wrap gap-1.5">
          {circles.map((c, i) => (
            <button
              key={c}
              type="button"
              className={cn(
                'rounded-full px-2.5 py-1 text-[0.68rem] font-semibold transition-colors',
                i === 0 ? 'bg-gold/15 text-gold-soft ring-1 ring-gold/40' : cn(tok.subtleBg, tok.mid, tok.hoverBg),
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* badges */}
      <div className={cn('flex items-center justify-around rounded-card-lg p-3', tok.card)}>
        {[
          { icon: Medal, label: 'Early member' },
          { icon: Award, label: 'Verified L2' },
          { icon: Crown, label: 'Pool contributor' },
        ].map((b) => (
          <span key={b.label} title={b.label} className="flex h-9 w-9 items-center justify-center rounded-full bg-gold/10 text-gold ring-1 ring-gold/30">
            <b.icon size={15} aria-hidden="true" />
          </span>
        ))}
      </div>
    </motion.aside>
  )
}

/* --------------------------------- Right rail -------------------------------- */

const MODE_REASONS: Record<FeedMode, string[]> = {
  forYou: ['Ranked by For You · your picks', 'Fresh + people you love'],
  latest: ['Pure chronological', 'No ranking applied'],
  following: ['Only people you follow', 'Chronological'],
  familyFirst: ['Community-built algorithm', 'Boosts kinship L1–L2'],
  local: ['Within 20 km of Nairobi', 'City-trending signals'],
  professional: ['Business circle priority', 'Industry keywords'],
  calm: ['No outrage signals', 'Slow-media friendly'],
  deepReads: ['Long-form only', 'AI summaries included'],
  watch: ['Video-first ranking', 'Auto-captions on'],
  marketPicks: ['Sellers near you', '80/20 transparent split'],
}

export function RightRail({ feedMode }: { feedMode: FeedMode }) {
  const { t, tok } = useAppTheme()
  const trending = ['#ExpresswayRuns', '#SukumaRecipes', '#SunsetPoetry']
  const suggested = ['Kisii Makers Collective', 'Diaspora Homecoming']
  const modeLabel = FEED_MODES.find((m) => m.id === feedMode)?.label

  return (
    <motion.aside
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2, duration: 0.55, ease: EASE }}
      className="hidden w-[280px] shrink-0 space-y-3.5 overflow-y-auto p-3.5 xl:block"
      aria-label="Explainer and discovery"
    >
      {/* docked Why-am-I-seeing-this explainer — updates with the feed mode */}
      <div className={cn('rounded-card-lg border-gold/25 p-4', tok.card)}>
        <p className="eyebrow text-gold">{t('whyTitle')}</p>
        <p className={cn('mt-2 text-xs leading-relaxed', tok.mid)}>
          Your feed is currently ranked by{' '}
          <span className={cn('font-bold', tok.text)}>{modeLabel}</span>.
        </p>
        <ul className="mt-2.5 flex flex-wrap gap-1.5">
          {MODE_REASONS[feedMode].map((r) => (
            <motion.li
              key={r}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="rounded-full border border-sky/30 bg-sky/10 px-2.5 py-1 text-[0.65rem] font-semibold text-sky"
            >
              {r}
            </motion.li>
          ))}
        </ul>
        <p className={cn('mt-2.5 text-[0.65rem]', tok.low)}>Every recommended post carries its own Why? button.</p>
      </div>

      {/* trending */}
      <div className={cn('rounded-card-lg p-4', tok.card)}>
        <p className={cn('mb-2.5 flex items-center gap-1.5 text-sm font-bold', tok.text)}>
          <TrendingUp size={14} className="text-coral" aria-hidden="true" /> {t('trending')}
        </p>
        <ul className="space-y-2">
          {trending.map((h, i) => (
            <li key={h} className="flex items-baseline gap-2">
              <span className="mono-data text-xs text-gold">{i + 1}</span>
              <span className={cn('text-xs font-semibold', tok.mid)}>{h}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* suggested communities */}
      <div className={cn('rounded-card-lg p-4', tok.card)}>
        <p className={cn('mb-2.5 flex items-center gap-1.5 text-sm font-bold', tok.text)}>
          <Users size={14} className="text-sky" aria-hidden="true" /> {t('suggested')}
        </p>
        <ul className="space-y-2.5">
          {suggested.map((c, i) => (
            <li key={c} className="flex items-center gap-2.5">
              <span className="h-8 w-8 rounded-card-sm bg-cover ring-1 ring-gold/30" style={avatarStyle(i === 0 ? 10 : 7)} aria-hidden="true" />
              <span className={cn('min-w-0 flex-1 truncate text-xs font-semibold', tok.mid)}>{c}</span>
              <button type="button" className="rounded-full bg-gold/15 px-2.5 py-1 text-[0.62rem] font-bold text-gold-soft transition-colors hover:bg-gold/25">
                Join
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Kinjy Leaders mini-rank */}
      <div className={cn('rounded-card-lg border-gold/25 p-4 text-center', tok.card)}>
        <p className="eyebrow text-gold">{t('pool')}</p>
        <p className="mono-data mt-2 text-2xl font-semibold text-gold-grad">#8,412</p>
        <p className={cn('mt-1 text-[0.68rem]', tok.mid)}>You’re here with $1,240 earned this month</p>
        <div className="mx-auto mt-2.5 h-1.5 w-4/5 overflow-hidden rounded-full bg-white/10">
          <motion.span
            initial={{ width: 0 }}
            animate={{ width: '34%' }}
            transition={{ delay: 0.6, duration: 0.9, ease: [0.65, 0, 0.35, 1] }}
            className="block h-full rounded-full bg-gradient-to-r from-gold-soft to-gold"
          />
        </div>
        <p className={cn('mt-1.5 text-[0.62rem]', tok.low)}>34% to next payout tier</p>
      </div>
    </motion.aside>
  )
}
