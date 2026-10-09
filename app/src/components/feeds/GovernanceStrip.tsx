import { motion, useReducedMotion } from 'framer-motion'
import { DoorOpen, FileSearch, Gavel } from 'lucide-react'
import { CLOUD_EASE } from '@/components/platform/shared'
import { Eyebrow } from '@/components/landing/PageKit'

const CARDS = [
  {
    icon: DoorOpen,
    title: 'You can leave the algorithm',
    body: 'Chronological is always one tap away — no dark patterns, no guilt trips.',
  },
  {
    icon: FileSearch,
    title: 'No shadow rules',
    body: 'Ranking signals are documented per algorithm, in plain language, forever.',
  },
  {
    icon: Gavel,
    title: 'Your feedback is law',
    body: '“Show less” applies instantly and persists across every device and session.',
  },
]

/** Section 6 — three guarantees, set as an editorial row under a drawn gold rule. */
export default function GovernanceStrip() {
  const reduced = useReducedMotion()
  return (
    <section className="kl-pad-x pb-[clamp(40px,6vw,80px)] pt-[clamp(24px,4vw,48px)]" aria-label="Feed governance guarantees">
      <Eyebrow>Three guarantees</Eyebrow>
      <div className="mt-8 grid gap-10 md:grid-cols-3 md:gap-8">
        {CARDS.map((c, i) => (
          <motion.div
            key={c.title}
            className="relative pt-8"
            initial={reduced ? false : { opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.5, ease: CLOUD_EASE, delay: i * 0.1 }}
          >
            <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-[var(--kl-paper-2)]" />
            <motion.span
              aria-hidden="true"
              className="kl-sheen absolute inset-x-0 top-0 h-[2px] origin-left"
              initial={reduced ? false : { scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.6, ease: [0.65, 0, 0.35, 1], delay: 0.2 + i * 0.12 }}
            />
            <div className="flex items-center justify-between">
              <span className="kl-serif text-[56px] font-semibold leading-none text-[var(--kl-gold)]">{String(i + 1).padStart(2, '0')}</span>
              <span className="grid h-11 w-11 place-items-center rounded-full bg-[var(--kl-paper)] text-[var(--kl-gold-deep)]">
                <c.icon size={19} />
              </span>
            </div>
            <h3 className="kl-serif mt-6 text-[26px] font-semibold leading-tight">{c.title}</h3>
            <p className="mt-3 max-w-[340px] text-[15px] leading-relaxed text-[var(--kl-mid)]">{c.body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
