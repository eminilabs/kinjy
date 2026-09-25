import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowUp, Search, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ModeChip } from '@/components/ui-kit'
import { AlgoGlyph, CLOUD_EASE } from '@/components/platform/shared'
import { ALGORITHMS } from './data'
import type { AlgoCategory, Algorithm } from './data'
import { useToasts } from './Toast'
import { useApi } from '@/hooks/useApi'
import { kaluta, type Algorithm as ApiAlgorithm } from '@/lib/api'

/** The catalogue is keyed by id on both sides, but the frontend spells them
 *  with hyphens and the backend with underscores. Normalise before matching. */
const norm = (id: string) => id.toLowerCase().replace(/[-_]/g, '')

const LOCAL_BY_ID = new Map(ALGORITHMS.map((a) => [norm(a.id), a]))

/**
 * Merge the live catalogue with local presentation metadata.
 *
 * social-service decides *which* algorithms exist, who published them and how
 * many installs they have — that is the marketplace's whole point, and a
 * developer-published algorithm has no local entry by definition. The local
 * table only supplies the glyph, category and preview order. When the API is
 * unreachable we fall back to the local catalogue so the page still reads.
 */
function mergeCatalogue(live: ApiAlgorithm[] | undefined): Algorithm[] {
  if (!live?.length) return ALGORITHMS

  return live.map((remote) => {
    const local = LOCAL_BY_ID.get(norm(remote.id))
    return {
      id: local?.id ?? remote.id,
      glyph: local?.glyph ?? 'sparkles',
      name: remote.name || local?.name || remote.id,
      promise: remote.description || local?.promise || '',
      publisher: remote.builtin ? 'Kinjy' : (local?.publisher ?? 'Community developer'),
      installs: remote.installs || local?.installs || 0,
      category: local?.category ?? 'Discovery',
      community: !remote.builtin,
      note: local?.note,
      order: local?.order ?? [],
    }
  })
}

const FILTERS: Array<'All' | AlgoCategory> = ['All', 'People', 'Places', 'Interests', 'Format', 'Discovery']

function AlgorithmCard({
  algo,
  active,
  highlighted,
  onUse,
}: {
  algo: Algorithm
  active: boolean
  highlighted: boolean
  onUse: () => void
}) {
  const [ripple, setRipple] = useState(0)
  const reduced = useReducedMotion()

  return (
    <motion.article
      layout
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ duration: 0.35, ease: CLOUD_EASE }}
      className={cn(
        'cloud-card relative flex flex-col overflow-hidden p-5 transition-shadow duration-300',
        active && 'shadow-[0_0_0_2px_rgba(217,166,72,0.85),0_16px_40px_-16px_rgba(0,0,0,0.5)]',
        highlighted && !active && 'shadow-[0_0_0_2px_rgba(240,200,120,0.55)]',
      )}
      aria-label={`Algorithm: ${algo.name}`}
    >
      {/* Confirmation ripple */}
      <AnimatePresence>
        {ripple > 0 && !reduced && (
          <motion.span
            key={ripple}
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/25"
            initial={{ scale: 0, opacity: 0.9 }}
            animate={{ scale: 2.2, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>

      {/* Suggested pulse (from "Change my algorithm") */}
      {highlighted && !active && (
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-card-lg border-2 border-gold/60"
          animate={reduced ? undefined : { opacity: [0.9, 0.25, 0.9] }}
          transition={{ duration: 1.4, repeat: 2, ease: 'easeInOut' }}
        />
      )}

      <div className="flex items-start justify-between gap-2">
        <span className={cn('cloud-glass flex h-11 w-11 items-center justify-center rounded-full', active && 'border-gold/50')}>
          <AlgoGlyph id={algo.glyph} size={22} />
        </span>
        {algo.community && (
          <span className="inline-flex items-center gap-1 rounded-full border border-success/35 bg-success/10 px-2 py-0.5 text-[0.62rem] font-bold text-success">
            <ShieldCheck size={11} /> Reviewed · v1.3
          </span>
        )}
      </div>

      <h3 className="mt-3.5 font-semibold text-text-hi">{algo.name}</h3>
      <p className="caption mt-1.5 flex-1 leading-relaxed">{algo.promise}</p>
      {algo.note && (
        <p className="mt-2 rounded-card-sm border border-gold/25 bg-gold/5 px-2.5 py-1.5 text-[0.68rem] font-semibold text-gold-soft">
          {algo.note}
        </p>
      )}
      {highlighted && !active && (
        <p className="mt-2 text-[0.68rem] font-bold text-gold-soft">Suggested — based on your choice</p>
      )}

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/10 pt-3.5">
        <div>
          <p className="text-[0.66rem] font-semibold text-text-low">{algo.publisher}</p>
          <p className="mono-data mt-0.5 text-[0.68rem] text-text-mid">{algo.installs.toLocaleString()} installs</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setRipple((r) => r + 1)
            onUse()
          }}
          className={cn(
            'rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors',
            active
              ? 'bg-gradient-to-br from-gold-soft to-gold text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]'
              : 'cloud-glass text-text-hi hover:border-gold/40 hover:text-gold-soft',
          )}
          aria-pressed={active}
        >
          {active ? 'In use ✓' : 'Use algorithm'}
        </button>
      </div>
    </motion.article>
  )
}

/** Section 4 — The Algorithm Marketplace: 15 installable feed algorithms. */
export default function AlgorithmMarketplace({
  activeId,
  highlightId,
  onUse,
  onUndoPreview,
}: {
  activeId: string | null
  highlightId: string | null
  onUse: (algo: Algorithm) => void
  onUndoPreview: () => void
}) {
  const { push } = useToasts()
  const [filter, setFilter] = useState<'All' | AlgoCategory>('All')
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const reduced = useReducedMotion()

  // 200ms debounced live search
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim().toLowerCase()), 200)
    return () => window.clearTimeout(t)
  }, [query])

  const { data: live, error: liveError } = useApi(() => kaluta.feeds.algorithms(), [])
  const catalogue = useMemo(() => mergeCatalogue(live?.items), [live])

  const visible = useMemo(
    () =>
      catalogue.filter(
        (a) =>
          (filter === 'All' || a.category === filter) &&
          (debounced === '' || a.name.toLowerCase().includes(debounced) || a.promise.toLowerCase().includes(debounced)),
      ),
    [catalogue, filter, debounced],
  )

  const handleUse = (algo: Algorithm) => {
    if (activeId === algo.id) {
      onUndoPreview()
      return
    }
    onUse(algo)
    push(`Previewing ${algo.name} — scroll up or undo`, {
      actions: [
        {
          label: 'Scroll up',
          gold: true,
          onClick: () => document.getElementById('feed-modes-demo')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
        },
        { label: 'Undo', onClick: onUndoPreview },
      ],
      duration: 6000,
    })
  }

  return (
    <section id="algorithm-marketplace" className="scroll-mt-24 px-6 py-24 md:py-32" aria-label="The Algorithm Marketplace">
      <div className="mx-auto max-w-container">
        {/* Header row */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <p className="eyebrow text-gold">Refinement 02 · Mandatory Blueprint Change</p>
            <h2 className="h2 mt-4">The Algorithm Marketplace</h2>
            <p className="body-lg mt-4 text-text-mid">
              {catalogue.length} ranking algorithms — {catalogue.filter((a) => !a.community).length} by
              Kinjy, {catalogue.filter((a) => a.community).length} community-built — installed by
              your choice, removable in one tap.
            </p>
            <p className="caption mt-2">
              {live ? (
                <span className="text-gold-soft">Live catalogue · /api/algorithms</span>
              ) : liveError ? (
                <span className="text-text-low">
                  Published catalogue — social-service is unreachable
                </span>
              ) : (
                <span className="text-text-low">Loading the live catalogue…</span>
              )}
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <label className="cloud-glass flex items-center gap-2.5 rounded-full px-4 py-2.5">
              <Search size={15} className="shrink-0 text-text-low" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search algorithms…"
                aria-label="Search algorithms"
                className="w-48 bg-transparent text-sm text-text-hi placeholder:text-text-low focus:outline-none"
              />
            </label>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by category">
              {FILTERS.map((f) => (
                <ModeChip key={f} label={f} active={filter === f} onClick={() => setFilter(f)} className="px-3 py-1.5 text-xs" />
              ))}
            </div>
          </div>
        </div>

        {/* Grid */}
        <motion.div layout className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {visible.map((algo, i) => (
              <motion.div
                key={algo.id}
                layout
                initial={reduced ? false : { opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.45, ease: CLOUD_EASE, delay: (i % 6) * 0.06 }}
              >
                <AlgorithmCard
                  algo={algo}
                  active={activeId === algo.id}
                  highlighted={highlightId === algo.id}
                  onUse={() => handleUse(algo)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {visible.length === 0 && (
          <p className="caption mx-auto mt-10 w-fit rounded-full border border-white/12 bg-white/5 px-4 py-2">
            No algorithms match “{query}” — try “family”, “video” or “local”.
          </p>
        )}

        <p className="caption mx-auto mt-8 flex w-fit items-center gap-2">
          <ArrowUp size={13} className="text-gold" />
          Installing an algorithm re-orders the live demo feed above.
        </p>
      </div>
    </section>
  )
}
