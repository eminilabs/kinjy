import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { kaluta, type ModerationOverview } from '@/lib/api'

/**
 * Moderation, on the admin page, with the real numbers.
 *
 * This section used to carry five hard-coded figures — "4.2M items screened /
 * day", "3,180 in queue", "96 open to humans" — and a row of green dots
 * asserting that every system was healthy. None of it was measured. That is
 * worse than showing nothing on an operations page: an invented queue depth is
 * indistinguishable from a real one, right up until somebody makes a staffing
 * decision on it.
 *
 * Every number below is a count of rows, and when the API cannot be reached
 * the section says so rather than falling back to a plausible-looking figure.
 */

function Row({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-card-md border border-white/10 bg-white/[0.05] px-5 py-3 backdrop-blur-sm">
      <span className="text-sm font-semibold text-text-hi">{label}</span>
      <span className="mono-data text-[0.75rem] text-text-mid">
        <span className="text-gold-soft">{value}</span> · {hint}
      </span>
    </div>
  )
}

export default function ModerationSection() {
  const overview = useApi<ModerationOverview>(() => kaluta.trustSafety.overview(), [])
  const d = overview.data

  return (
    <section aria-labelledby="mod-overview-heading" className="border-t border-white/8 px-5 py-10 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow text-gold">Moderation &amp; safety</p>
          <h2 id="mod-overview-heading" className="h3 mt-2 text-xl">
            What is actually in the queues.
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/trust-safety"
            className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1.5 text-[0.78rem] font-semibold text-gold-soft transition-colors hover:bg-gold/20"
          >
            <ShieldCheck size={13} aria-hidden="true" /> Open the console
          </Link>
          <Link
            to="/safety"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/12 px-3 py-1.5 text-[0.78rem] text-text-mid transition-colors hover:bg-white/10"
          >
            Safety design <ArrowRight size={13} aria-hidden="true" />
          </Link>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="mt-6 flex flex-col gap-2"
      >
        {overview.loading ? (
          <p className="mono-data text-[0.75rem] text-text-mid">Reading the queues…</p>
        ) : null}

        {!overview.loading && !d ? (
          <p className="mono-data rounded-card-md border border-white/10 px-5 py-3 text-[0.75rem] text-text-mid">
            These numbers are not available right now — this section shows measured counts
            only, so it shows nothing rather than an estimate.
          </p>
        ) : null}

        {d ? (
          <>
            <Row
              label="Classified automatically"
              value={d.classified_total.toLocaleString()}
              hint="items rated"
            />
            <Row
              label="Waiting for a person"
              value={d.pending_review.toLocaleString()}
              hint="restricted until reviewed"
            />
            <Row
              label="Child-safety escalations"
              value={d.child_safety_escalations.toLocaleString()}
              hint="outside ordinary moderation"
            />
            <Row
              label="Appeals open"
              value={d.appeals.open.toLocaleString()}
              hint={d.appeals.overdue > 0 ? `${d.appeals.overdue} overdue` : 'none overdue'}
            />
            <Row
              label="Decisions overturned"
              value={
                d.appeals.overturn_rate === null
                  ? '—'
                  : `${Math.round(d.appeals.overturn_rate * 100)}%`
              }
              hint={`of ${d.appeals.answered} answered`}
            />
          </>
        ) : null}
      </motion.div>

      {d ? (
        <p className="mono-data mt-6 border-t border-white/8 pt-4 text-[0.72rem] text-text-mid">
          {d.reports_24h.toLocaleString()} reports in the last 24 hours ·{' '}
          {d.reports_total.toLocaleString()} in total
        </p>
      ) : null}
    </section>
  )
}
