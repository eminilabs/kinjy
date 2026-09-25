import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Archive, ArrowDown, BookMarked, MessagesSquare, Sparkles, TrendingUp, Undo2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]
const SNAP: [number, number, number, number] = [0.34, 1.56, 0.64, 1]

/** A10 — Knowledge Vault resurfacing: old saves reconnected to what's trending now. */
export default function VaultResurfacing() {
  const [dismissed, setDismissed] = useState(false)
  const [opened, setOpened] = useState<'saved' | 'thread' | null>(null)
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (undoTimer.current) clearTimeout(undoTimer.current) }, [])

  const dismiss = () => {
    setDismissed(true)
    undoTimer.current = setTimeout(() => setDismissed(false), 8000)
  }

  return (
    <section className="noise-overlay relative bg-ink px-6 py-24 md:py-28">
      <div className="mx-auto max-w-container">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-15%' }}
          transition={{ duration: 0.6, ease: EASE }}
          className="mb-12 max-w-2xl"
        >
          <p className="eyebrow text-gold">AI memory resurfacing</p>
          <h3 className="h3 mt-3 font-display text-3xl font-medium">
            Your saves <span className="text-gold-grad">remember with you.</span>
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-text-mid">
            The Knowledge Vault doesn’t let good things sink. When a saved idea becomes relevant again,
            Kinjy resurfaces it in your feed — connected to the live conversation.
          </p>
        </motion.div>

        <div className="mx-auto max-w-2xl">
          <AnimatePresence mode="wait" initial={false}>
            {!dismissed ? (
              <motion.article
                key="card"
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-10%' }}
                exit={{ opacity: 0, scale: 0.95, y: -16 }}
                transition={{ duration: 0.6, ease: EASE }}
                className="cloud-card relative overflow-hidden p-5"
              >
                {/* gold rim accent */}
                <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[3px]" style={{ background: 'var(--grad-arc)' }} />

                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold-soft">
                    <BookMarked size={16} aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-text-hi">Knowledge Vault</p>
                    <p className="text-xs text-text-low">Resurfaced for you · AI memory</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full border border-sky/30 bg-sky/10 px-2.5 py-1 text-[0.62rem] font-semibold text-sky">
                    <Sparkles size={10} aria-hidden="true" /> Why this? You saved it
                  </span>
                </div>

                {/* saved item */}
                <div className="mt-4 rounded-card-md border border-gold/25 bg-gold/[0.06] p-4">
                  <p className="flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-gold-soft">
                    <Archive size={11} aria-hidden="true" /> Saved 6 months ago
                  </p>
                  <p className="mt-1.5 text-sm font-bold text-text-hi">Cassava farming proposal — drought-resistant cuttings</p>
                  <p className="mt-1 text-xs leading-relaxed text-text-mid">
                    Your draft with cost estimates and two supplier contacts, saved from f/agribusiness.
                  </p>
                </div>

                {/* connector arc */}
                <div className="flex justify-center py-1" aria-hidden="true">
                  <motion.span
                    initial={{ opacity: 0, y: -6 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4, duration: 0.5, ease: EASE }}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-sky/30 bg-sky/10 text-sky"
                  >
                    <ArrowDown size={13} />
                  </motion.span>
                </div>

                {/* trending thread */}
                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2, duration: 0.5, ease: EASE }}
                  className="rounded-card-md border border-indigo/30 bg-indigo/10 p-4"
                >
                  <p className="flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-sky">
                    <TrendingUp size={11} aria-hidden="true" /> Trending now · Kigoma Forum
                  </p>
                  <p className="mt-1.5 flex items-start gap-2 text-sm font-bold text-text-hi">
                    <MessagesSquare size={14} className="mt-0.5 shrink-0 text-sky" aria-hidden="true" />
                    “Drought-resistant cassava cuttings — 90-day results thread”
                  </p>
                  <p className="mt-1 ps-6 text-xs leading-relaxed text-text-mid">
                    96 replies · farmers posting yield photos from the same variety in your proposal.
                  </p>
                </motion.div>

                {/* actions */}
                <div className="mt-4 flex flex-wrap items-center gap-2.5">
                  <motion.button
                    type="button"
                    onClick={() => setOpened('saved')}
                    whileTap={{ scale: 0.96 }}
                    className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-4 py-2 text-xs font-bold text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] transition hover:brightness-110"
                  >
                    Open saved item
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={() => setOpened('thread')}
                    whileTap={{ scale: 0.96 }}
                    className="cloud-glass rounded-full px-4 py-2 text-xs font-bold text-text-hi transition-colors hover:border-sky/40 hover:text-sky"
                  >
                    View thread
                  </motion.button>
                  <button
                    type="button"
                    onClick={dismiss}
                    aria-label="Dismiss resurfacing"
                    className="ms-auto inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-text-low transition-colors hover:text-text-hi"
                  >
                    <X size={12} aria-hidden="true" /> Dismiss
                  </button>
                </div>

                <AnimatePresence>
                  {opened && (
                    <motion.p
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.35, ease: EASE }}
                      role="status"
                      className={cn(
                        'mt-3 rounded-full px-3.5 py-2 text-xs font-semibold',
                        opened === 'saved' ? 'bg-gold/10 text-gold-soft' : 'bg-sky/10 text-sky',
                      )}
                    >
                      {opened === 'saved'
                        ? 'Opening your cassava proposal in the Knowledge Vault… (demo)'
                        : 'Jumping to the Kigoma Forum thread… (demo)'}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.article>
            ) : (
              <motion.div
                key="dismissed"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: SNAP }}
                className="cloud-card flex items-center gap-3 p-4"
                role="status"
              >
                <p className="flex-1 text-xs font-semibold text-text-mid">
                  Resurfacing dismissed — the Vault will only bring it back if it becomes relevant again.
                </p>
                <button
                  type="button"
                  onClick={() => { if (undoTimer.current) clearTimeout(undoTimer.current); setDismissed(false) }}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gold/15 px-3.5 py-1.5 text-xs font-bold text-gold-soft transition-colors hover:bg-gold/25"
                >
                  <Undo2 size={12} aria-hidden="true" /> Undo
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="caption mx-auto mt-5 max-w-xl text-center">
            Resurfacing runs on your own saves and follows — never on ad profiles. Dismissals teach the
            Vault to wait longer next time.
          </p>
        </div>
      </div>
    </section>
  )
}
