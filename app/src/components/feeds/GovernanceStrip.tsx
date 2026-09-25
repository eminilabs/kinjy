import { motion, useReducedMotion } from 'framer-motion'
import { DoorOpen, FileSearch, Gavel } from 'lucide-react'
import { CLOUD_EASE } from '@/components/platform/shared'

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

/** Section 6 — Governance strip: three guarantees with gold top-border draw. */
export default function GovernanceStrip() {
  const reduced = useReducedMotion()
  return (
    <section className="px-6 py-12 md:py-16" aria-label="Feed governance guarantees">
      <div className="mx-auto grid max-w-container gap-5 md:grid-cols-3">
        {CARDS.map((c, i) => (
          <motion.div
            key={c.title}
            className="cloud-card relative overflow-hidden p-6"
            initial={reduced ? false : { opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.5, ease: CLOUD_EASE, delay: i * 0.1 }}
          >
            {/* Gold top border draw */}
            <motion.span
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-0.5 origin-left"
              style={{ background: 'var(--grad-arc)' }}
              initial={reduced ? false : { scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.4, ease: [0.65, 0, 0.35, 1], delay: 0.2 + i * 0.1 }}
            />
            <span className="cloud-glass flex h-11 w-11 items-center justify-center rounded-full text-gold">
              <c.icon size={19} />
            </span>
            <h3 className="mt-4 font-semibold text-text-hi">{c.title}</h3>
            <p className="caption mt-2 leading-relaxed">{c.body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
