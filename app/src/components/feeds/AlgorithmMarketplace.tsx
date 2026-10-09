import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowUp, Search, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AlgoGlyph, CLOUD_EASE } from '@/components/platform/shared'
import { ALGORITHMS } from './data'
import type { AlgoCategory, Algorithm } from './data'
import { useToasts } from './Toast'
import { Eyebrow } from '@/components/landing/PageKit'
import { MODULE_TONES } from '@/components/platform/tones'
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
  index,
  active,
  highlighted,
  onUse,
}: {
  algo: Algorithm
  index: number
  active: boolean
  highlighted: boolean
  onUse: () => void
}) {
  const [ripple, setRipple] = useState(0)
  const reduced = useReducedMotion()
  const [ink, tile] = MODULE_TONES[index % MODULE_TONES.length]

  return (
    <motion.article
      layout
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ duration: 0.35, ease: CLOUD_EASE }}
      className={cn(
        'relative flex h-full flex-col overflow-hidden rounded-[20px] border bg-[var(--kl-surface)] p-6 transition-[box-shadow,border-color,transform] duration-300 hover:-translate-y-0.5',
        active
          ? 'border-[var(--kl-gold)] shadow-[0_0_0_1px_var(--kl-gold),0_24px_48px_-30px_var(--kl-shadow)]'
          : highlighted
            ? 'border-[var(--kl-gold-soft)] shadow-[0_24px_48px_-30px_var(--kl-shadow)]'
            : 'border-[var(--kl-paper-2)] shadow-[0_18px_36px_-30px_var(--kl-shadow)]',
      )}
      aria-label={`Algorithm: ${algo.name}`}
    >
      {/* Confirmation ripple */}
      <AnimatePresence>
        {ripple > 0 && !reduced && (
          <motion.span
            key={ripple}
            aria-hidden="true"
            className="pointer-events-none absolute bottom-6 right-6 h-40 w-40 translate-x-1/2 translate-y-1/2 rounded-full bg-[var(--kl-gold)] opacity-30"
            initial={{ scale: 0, opacity: 0.5 }}
            animate={{ scale: 2.4, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>

      {/* Suggested pulse (from "Change my algorithm") */}
      {highlighted && !active && (
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[20px] border-2 border-[var(--kl-gold)]"
          animate={reduced ? undefined : { opacity: [0.9, 0.2, 0.9] }}
          transition={{ duration: 1.4, repeat: 2, ease: 'easeInOut' }}
        />
      )}

      <div className="flex items-start justify-between gap-2">
        <span className="grid h-12 w-12 place-items-center rounded-[12px]" style={{ background: tile, color: ink }}>
          <AlgoGlyph id={algo.glyph} size={22} className="!text-current" />
        </span>
        {algo.community ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#DDF0E5] px-2.5 py-1 text-[10.5px] font-bold text-[#2E7D57]">
            <ShieldCheck size={11} /> Reviewed · v1.3
          </span>
        ) : (
          <span className="kl-mono text-[10px] uppercase tracking-[.12em] text-[var(--kl-low)]">{algo.category}</span>
        )}
      </div>

      <h3 className="kl-serif mt-5 text-[24px] font-semibold leading-tight">{algo.name}</h3>
      <p className="mt-2 flex-1 text-[14px] leading-relaxed text-[var(--kl-mid)]">{algo.promise}</p>
      {algo.note && (
        <p className="mt-3 rounded-[10px] bg-[var(--kl-paper)] px-3 py-2 text-xs font-semibold text-[var(--kl-gold-deep)]">{algo.note}</p>
      )}
      {highlighted && !active && (
        <p className="mt-3 text-xs font-bold text-[var(--kl-gold-deep)]">Suggested — based on your choice</p>
      )}

      <div className="mt-5 flex items-center justify-between gap-2 border-t border-[var(--kl-paper-2)] pt-4">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold">{algo.publisher}</p>
          <p className="kl-mono mt-0.5 text-[11px] text-[var(--kl-low)]">{algo.installs.toLocaleString()} installs</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setRipple((r) => r + 1)
            onUse()
          }}
          className={cn(
            'shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-colors',
            active
              ? 'kl-sheen'
              : 'bg-[var(--kl-paper)] hover:bg-[var(--kl-paper-2)]',
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
    <section
      id="algorithm-marketplace"
      className="kl-pad-x scroll-mt-24 border-t border-[var(--kl-paper-2)] py-[clamp(72px,9vw,120px)]"
      aria-label="The Algorithm Marketplace"
    >
      {/* Header row */}
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-[640px]">
          <Eyebrow>Algorithm marketplace</Eyebrow>
          <h2 className="kl-h2 mt-5">Pick how your feed thinks.</h2>
          <p className="kl-lead mt-5 !max-w-[560px]">
            {catalogue.length} ranking algorithms — {catalogue.filter((a) => !a.community).length} by
            Kinjy, {catalogue.filter((a) => a.community).length} community-built — installed by
            your choice, removable in one tap.
          </p>
          <p className="kl-mono mt-3 flex items-center gap-2 text-[11px] uppercase tracking-[.1em]">
            <span
              aria-hidden="true"
              className={cn('h-1.5 w-1.5 rounded-full', live ? 'kl-pulse bg-[#2E7D57]' : liveError ? 'bg-[var(--kl-coral)]' : 'bg-[var(--kl-low)]')}
            />
            {live ? (
              <span className="text-[var(--kl-gold-deep)]">Live catalogue · /api/algorithms</span>
            ) : liveError ? (
              <span className="text-[var(--kl-low)]">Published catalogue — social-service is unreachable</span>
            ) : (
              <span className="text-[var(--kl-low)]">Loading the live catalogue…</span>
            )}
          </p>
        </div>
        <label className="flex w-full items-center gap-2.5 rounded-full border border-[var(--kl-paper-2)] bg-[var(--kl-surface)] px-5 py-3 transition-colors focus-within:border-[var(--kl-gold)] lg:w-[320px]">
          <Search size={16} className="shrink-0 text-[var(--kl-low)]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search algorithms…"
            aria-label="Search algorithms"
            className="min-w-0 flex-1 bg-transparent text-[15px] placeholder:text-[var(--kl-low)] focus:outline-none"
          />
        </label>
      </div>

      {/* Category tabs */}
      <div
        className="mt-10 flex gap-1 overflow-x-auto border-b border-[var(--kl-paper-2)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="group"
        aria-label="Filter by category"
      >
        {FILTERS.map((f) => {
          const on = filter === f
          const count = f === 'All' ? catalogue.length : catalogue.filter((a) => a.category === f).length
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={on}
              className={cn(
                'relative shrink-0 px-4 pb-3.5 pt-1 text-[15px] font-semibold transition-colors',
                on ? 'text-[var(--kl-ink)]' : 'text-[var(--kl-low)] hover:text-[var(--kl-ink)]',
              )}
            >
              {f} <span className="kl-mono text-[11px] text-[var(--kl-low)]">{count}</span>
              {on && <motion.span layoutId="algo-tab" className="kl-sheen absolute inset-x-3 -bottom-px h-[3px] rounded-full" />}
            </button>
          )
        })}
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
                index={catalogue.indexOf(algo)}
                active={activeId === algo.id}
                highlighted={highlightId === algo.id}
                onUse={() => handleUse(algo)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {visible.length === 0 && (
        <p className="mx-auto mt-10 w-fit rounded-full bg-[var(--kl-paper)] px-5 py-2.5 text-sm text-[var(--kl-mid)]">
          No algorithms match “{query}” — try “family”, “video” or “local”.
        </p>
      )}

      <p className="mx-auto mt-10 flex w-fit items-center gap-2 text-sm text-[var(--kl-mid)]">
        <ArrowUp size={14} className="text-[var(--kl-gold-deep)]" />
        Installing an algorithm re-orders the live demo feed above.
      </p>
    </section>
  )
}
