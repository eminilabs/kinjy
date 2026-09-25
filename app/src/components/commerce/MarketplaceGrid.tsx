import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CalendarCheck, Coffee, GraduationCap, MapPin, Paintbrush, ShoppingBasket, Store, UtensilsCrossed } from 'lucide-react'
import { ModeChip } from '@/components/ui-kit'
import { cn } from '@/lib/utils'
import { EASE, useReducedMotion } from '@/components/creators/motion-utils'

type Item = {
  id: string
  name: string
  price: number
  vendor: string
  location: string
  icon: typeof Coffee
  gradient: string
  service?: boolean
}

const PRODUCTS: Item[] = [
  { id: 'basket', name: 'Woven basket', price: 24, vendor: 'Neema Crafts', location: 'Arusha, TZ', icon: ShoppingBasket, gradient: 'from-gold/50 via-coral/30 to-ink-3' },
  { id: 'coffee', name: 'Kilimanjaro coffee beans', price: 18, vendor: 'Moshi Roasters', location: 'Moshi, TZ', icon: Coffee, gradient: 'from-[#5b3a24]/80 via-indigo-deep/60 to-ink-3' },
  { id: 'tailoring', name: 'Bespoke tailoring', price: 60, vendor: 'Baraka Atelier', location: 'Dar es Salaam, TZ', icon: Paintbrush, gradient: 'from-indigo/60 via-indigo-deep/50 to-ink-3', service: true },
  { id: 'ceramics', name: 'Hand-thrown ceramics', price: 35, vendor: 'Clay & Kiln', location: 'Zanzibar, TZ', icon: Paintbrush, gradient: 'from-sky/40 via-indigo/40 to-ink-3' },
  { id: 'spice', name: 'Zanzibar spice box', price: 12, vendor: 'Spice Island Co.', location: 'Stone Town, TZ', icon: UtensilsCrossed, gradient: 'from-coral/50 via-gold/30 to-ink-3' },
  { id: 'tour', name: 'Guided old-town tour', price: 90, vendor: 'Juma Walks', location: 'Bagamoyo, TZ', icon: GraduationCap, gradient: 'from-indigo-deep/70 via-sky/30 to-ink-3', service: true },
]

/** Section 3 — Marketplace browsing demo with margin tooltips and a Services toggle. */
export default function MarketplaceGrid() {
  const reduced = useReducedMotion()
  const [servicesOnly, setServicesOnly] = useState(false)
  const visible = PRODUCTS.filter((p) => (servicesOnly ? p.service : true))

  return (
    <section className="noise-overlay twilight-field px-6 py-24 md:py-32">
      <div className="mx-auto max-w-container">
        <p className="eyebrow text-center text-sky">Marketplace</p>
        <h2 className="h2 mt-4 text-center">A market that fits in your pocket.</h2>
        <p className="body-lg mx-auto mt-4 max-w-xl text-center text-text-mid">
          Goods and services, side by side — every price transparent about its margin.
        </p>

        <div className="mt-8 flex justify-center gap-2">
          <ModeChip label="All listings" icon={<Store size={13} aria-hidden="true" />} active={!servicesOnly} onClick={() => setServicesOnly(false)} />
          <ModeChip label="Services" icon={<CalendarCheck size={13} aria-hidden="true" />} active={servicesOnly} onClick={() => setServicesOnly(true)} />
        </div>

        <motion.div layout className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {visible.map((p, i) => (
              <motion.article
                key={p.id}
                layout
                initial={reduced ? false : { opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92 }}
                viewport={{ once: true, margin: '-10%' }}
                transition={{ delay: i * 0.07, duration: 0.4, ease: EASE }}
                whileHover={reduced ? undefined : { y: -6 }}
                className="cloud-card group relative overflow-hidden"
              >
                {/* product visual */}
                <div className={cn('relative flex h-40 items-center justify-center bg-gradient-to-br', p.gradient)}>
                  <p.icon size={40} className="text-gold-soft/90" aria-hidden="true" />
                  {/* margin tooltip */}
                  <div className="pointer-events-none absolute inset-x-3 top-3 translate-y-2 rounded-card-sm border border-gold/30 bg-ink/85 px-3 py-2 opacity-0 backdrop-blur-md transition-all duration-300 ease-cloud-ease group-hover:translate-y-0 group-hover:opacity-100">
                    <p className="mono-data text-[0.68rem] text-gold-soft">
                      Kinjy markup ${(p.price * 0.2).toFixed(0)} — the commission comes from this
                    </p>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-semibold text-text-hi">{p.name}</h3>
                    {p.service ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-sky/15 px-2.5 py-1 text-[0.68rem] font-semibold text-sky">
                        <CalendarCheck size={11} aria-hidden="true" /> book · ${p.price}
                      </span>
                    ) : (
                      <span className="mono-data shrink-0 text-gold-soft">${p.price}</span>
                    )}
                  </div>
                  <div className="mt-2.5 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs text-text-mid">
                      <span className="h-5 w-5 rounded-full border border-white/15 bg-gradient-to-br from-indigo/70 to-gold/60" aria-hidden="true" />
                      {p.vendor}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[0.7rem] text-text-low">
                      <MapPin size={11} aria-hidden="true" /> {p.location}
                    </span>
                  </div>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </motion.div>
        <p className="caption mt-6 text-center">Hover any card to see the markup the commission comes out of.</p>
      </div>
    </section>
  )
}
