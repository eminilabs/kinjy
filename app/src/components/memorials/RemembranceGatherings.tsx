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
    <section className="px-6 py-24" aria-label="Remembrance gatherings">
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.7, ease: cloudEase }}
        className="mx-auto grid max-w-container items-center gap-10 rounded-card-xl border border-white/10 bg-white/[0.03] p-8 lg:grid-cols-12 lg:p-12"
      >
        <div className="lg:col-span-7">
          <p className="eyebrow text-gold">Remembrance gatherings</p>
          <h2 className="mt-3 font-display text-2xl text-white md:text-3xl">
            A memorial day can bring the living together, too.
          </h2>
          <p className="body-lg mt-4 max-w-xl text-[#D8D3C8]">
            When an anniversary approaches, the Reunion Agent can gather the family
            around it — polling dates across generations, choosing a place near
            everyone, and keeping the remembrance itself at the center.
          </p>
          <Link
            to="/family#reunion-planner"
            className="mt-7 inline-flex items-center gap-2 rounded-full border border-white/20 px-7 py-3.5 font-semibold text-[#D8D3C8] transition-colors duration-300 ease-cloud-ease hover:border-gold/50 hover:text-gold-soft"
          >
            <CalendarHeart size={16} />
            Plan with the Reunion Agent <ArrowRight size={15} />
          </Link>
        </div>

        {/* quiet mock: a gathering forming around a memorial date */}
        <div className="lg:col-span-5">
          <div className="rounded-card-lg border border-white/10 bg-[#0B0F22]/70 p-5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-semibold text-white">
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
                    className="h-7 w-7 rounded-full border border-[#0E1226] bg-gradient-to-br from-[#2E2A6E] to-[#4A52E0]"
                  />
                ))}
              </div>
              <span className="inline-flex items-center gap-1.5 text-[0.78rem] text-text-mid">
                <Users size={13} className="text-gold-soft" />
                26 family attending
              </span>
            </div>
            <p className="caption mt-4 border-t border-white/8 pt-3 !text-text-low">
              Candles first, celebration after — the agent knows the difference.
            </p>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
