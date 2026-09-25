import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { ArrowRight, Download, ShieldCheck, Trash2, XCircle } from 'lucide-react'
import { CloudCard } from '@/components/ui-kit'
import { EASE, useReducedMotion } from '@/components/creators/motion-utils'

const CARDS = [
  {
    icon: ShieldCheck,
    title: 'KYC for earners',
    body: 'Earning commission requires KinjyKYC verification ($10/year). Only verification results are stored on-platform — never your documents.',
  },
  {
    icon: XCircle,
    title: 'Cancel anytime',
    body: 'No dark patterns, no retention mazes. Cancel in two clicks from Settings → Billing, effective at period end.',
  },
  {
    icon: Download,
    title: 'Your data, exportable',
    body: 'Full export of posts, messages, family tree and media — on any plan, including Free.',
  },
  {
    icon: Trash2,
    title: 'Delete forever',
    body: 'Self-service deletion in Settings → Account, GDPR/PDPA compliant. Your graveyard and family records follow your succession settings.',
    link: { to: '/safety', label: 'Read the safety charter' },
  },
]

/** Section 4 — Honest fine print (trust band). */
export default function FinePrint() {
  const reduced = useReducedMotion()
  return (
    <section className="noise-overlay twilight-field px-6 py-24 md:py-32">
      <div className="mx-auto max-w-container">
        <p className="eyebrow text-center text-sky">Honest fine print</p>
        <h2 className="h2 mt-4 text-center">The trust band.</h2>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CARDS.map((c, i) => (
            <motion.div
              key={c.title}
              initial={reduced ? false : { opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-15%' }}
              transition={{ delay: i * 0.1, duration: 0.55, ease: EASE }}
            >
              <CloudCard hoverable className="h-full p-6">
                <motion.span
                  className="cloud-glass flex h-11 w-11 items-center justify-center rounded-card-sm"
                  initial={reduced ? false : { scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + i * 0.1, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                >
                  <c.icon size={19} className="text-gold" aria-hidden="true" />
                </motion.span>
                <h3 className="mt-4 font-semibold text-text-hi">{c.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-mid">{c.body}</p>
                {c.link && (
                  <Link to={c.link.to} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-gold-soft transition-all hover:gap-2.5">
                    {c.link.label} <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                )}
              </CloudCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
