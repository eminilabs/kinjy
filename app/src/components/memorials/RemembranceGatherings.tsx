import { Link } from 'react-router'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, CalendarHeart, Flame, Users } from 'lucide-react'

const cloudEase = [0.22, 1, 0.36, 1] as [number, number, number, number]

/**
 * RemembranceGatherings — compact cross-link from Memorials to the Family page's
 * Reunion Agent: remembrance dates become gentle gatherings of the living.
 */
export default function RemembranceGatherings() {
  const reduced = useReducedMotion()
  return (
    <section className="kl-pad-x pb-[120px]" aria-label="Remembrance gatherings">
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.7, ease: cloudEase }}
        className="grid items-center gap-10 rounded-[20px] bg-[var(--kl-paper)] p-8 lg:grid-cols-12 lg:p-14"
      >
        <div className="lg:col-span-7">
          <p className="kl-mono text-xs tracking-[.14em] text-[var(--kl-gold-deep)]">REMEMBRANCE GATHERINGS</p>
          <h2 className="kl-h3 mt-4">
            A memorial day can bring the living together, too.
          </h2>
          <p className="kl-lead mt-5 max-w-xl">
            When an anniversary approaches, the Reunion Agent can gather the family
            around it — polling dates across generations, choosing a place near
            everyone, and keeping the remembrance itself at the center.
          </p>
          <Link
            to="/family#reunion-planner"
            className="mt-8 inline-flex items-center gap-2 rounded-[20px] border border-[var(--kl-paper-2)] bg-[var(--kl-surface)] px-7 py-3.5 font-semibold transition-colors duration-300 ease-cloud-ease hover:border-[var(--kl-gold)] hover:text-[var(--kl-gold-deep)]"
          >
            <CalendarHeart size={16} />
            Plan with the Reunion Agent <ArrowRight size={15} />
          </Link>
        </div>

        {/* quiet mock: a gathering forming around a memorial date */}
        <div className="lg:col-span-5">
          <div className="kl-card-shadow rounded-2xl bg-[var(--kl-surface)] p-5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Flame size={15} className="text-gold-soft" />
                Baba Elias · 12 Aug
              </span>
              <span className="mono-data text-[0.62rem] tracking-widest text-gold-soft">
                GATHERING PLANNED
              </span>
            </div>
            <p className="caption mt-2 !text-text-mid">
              Remembrance at 10:00 · family lunch after, Uhuru Gardens
            </p>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex -space-x-1.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <motion.span
                    key={i}
                    initial={reduced ? false : { scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true, amount: 0.8 }}
                    transition={{ delay: 0.2 + i * 0.08, duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
                    className="h-7 w-7 rounded-full border-2 border-[var(--kl-cutout)] bg-gradient-to-br from-[#2E2A6E] to-[#4A52E0]"
                  />
                ))}
              </div>
              <span className="inline-flex items-center gap-1.5 text-[0.78rem] text-text-mid">
                <Users size={13} className="text-gold-soft" />
                26 family attending
              </span>
            </div>
            <p className="caption mt-4 border-t border-[var(--kl-paper-2)] pt-3 !text-text-low">
              Candles first, celebration after — the agent knows the difference.
            </p>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
