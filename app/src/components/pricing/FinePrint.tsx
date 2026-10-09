import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { ArrowRight, Download, ShieldCheck, Trash2, XCircle } from 'lucide-react'
import { Eyebrow } from '@/components/landing/PageKit'
import { EASE, useReducedMotion } from '@/components/creators/motion-utils'
import { FEATURES } from '@/lib/features'

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
    body: FEATURES.familyTree
      ? 'Full export of posts, messages, family tree and media — on any plan, including Free.'
      : 'Full export of posts, messages and media — on any plan, including Free.',
  },
  {
    icon: Trash2,
    title: 'Delete forever',
    body: FEATURES.familyTree
      ? 'Self-service deletion in Settings → Account, GDPR/PDPA compliant. Your graveyard and family records follow your succession settings.'
      : 'Self-service deletion in Settings → Account, GDPR/PDPA compliant. Your graveyard records follow your succession settings.',
    link: { to: '/safety', label: 'Read the safety charter' },
  },
]

/** Section 4 — the honest fine print, as the landing's numbered trust rows. */
export default function FinePrint() {
  const reduced = useReducedMotion()
  return (
    <section className="kl-pad-x pb-10 pt-[clamp(40px,6vw,80px)]">
      <div className="mb-12 flex flex-wrap items-end justify-between gap-8">
        <div>
          <Eyebrow>Honest fine print</Eyebrow>
          <h2 className="kl-h2 mt-5">No small print, just print.</h2>
        </div>
        <p className="max-w-[400px] text-lg leading-[1.5] text-[var(--kl-mid)]">
          What you agree to, said plainly — before you pay anything.
        </p>
      </div>
      <div className="border-t-2 border-[var(--kl-ink)]">
        {CARDS.map((c, i) => (
          <motion.div
            key={c.title}
            initial={reduced ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-10%' }}
            transition={{ delay: i * 0.06, duration: 0.5, ease: EASE }}
            className="flex flex-wrap items-baseline gap-x-12 gap-y-4 border-b border-[var(--kl-paper-2)] py-9"
          >
            <div className="flex flex-[1_1_360px] items-baseline gap-7">
              <span className="kl-mono w-7 flex-none text-[13px] tracking-[.08em] text-[var(--kl-gold-deep)]">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="kl-serif m-0 flex items-center gap-3 font-semibold leading-[1.1] tracking-[-.02em]" style={{ fontSize: 'clamp(26px, 2.6vw, 34px)' }}>
                <c.icon size={22} className="shrink-0 text-[var(--kl-gold-deep)]" aria-hidden="true" />
                {c.title}
              </h3>
            </div>
            <div className="max-w-[520px] flex-[1_1_360px]">
              <p className="m-0 text-[17px] leading-[1.6] text-[var(--kl-mid)]">{c.body}</p>
              {c.link && (
                <Link to={c.link.to} className="mt-3 inline-flex items-center gap-1.5 font-semibold text-[var(--kl-gold-deep)] transition-all hover:gap-2.5">
                  {c.link.label} <ArrowRight size={15} aria-hidden="true" />
                </Link>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
