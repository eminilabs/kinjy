import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { ArrowRight, FileText } from 'lucide-react'

const LAYERS = [
  { name: 'Automated', count: '4.2M', unit: 'items screened / day', width: '100%' },
  { name: 'Community reviewers', count: '3,180', unit: 'in queue', width: '86%' },
  { name: 'Platform trust & safety', count: '412', unit: 'escalations', width: '72%' },
  { name: 'Appeals', count: '96', unit: 'open to humans', width: '58%' },
  { name: 'Transparency', count: 'Q3', unit: 'report published', width: '44%' },
]

const HEALTH = [
  'AI Gateway: 3 providers healthy',
  'Translation gateway: 99.98%',
  'Ledger: reconciled',
  'Status: All systems normal',
]

/**
 * ModerationSection — bridge to /safety: compact 5-layer moderation strata with queue
 * counts, plus the system-health footer strip.
 */
export default function ModerationSection() {
  return (
    <section aria-labelledby="mod-overview-heading" className="border-t border-white/8 px-5 py-10 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow text-gold">Moderation & safety</p>
          <h2 id="mod-overview-heading" className="h3 mt-2 text-xl">
            Five layers between harm and members.
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="mono-data inline-flex items-center gap-1.5 rounded-full border border-white/12 px-3 py-1.5 text-[0.7rem] text-text-mid">
            <FileText size={12} aria-hidden="true" /> Transparency report
          </span>
          <Link
            to="/safety"
            className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1.5 text-[0.78rem] font-semibold text-gold-soft transition-colors hover:bg-gold/20"
          >
            Full safety design <ArrowRight size={13} aria-hidden="true" />
          </Link>
        </div>
      </div>

      <div className="mt-6 flex flex-col items-center gap-2">
        {LAYERS.map((layer, i) => (
          <motion.div
            key={layer.name}
            initial={{ opacity: 0, x: i % 2 === 0 ? -40 : 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center justify-between gap-4 rounded-card-md border border-white/10 bg-white/[0.05] px-5 py-3 backdrop-blur-sm"
            style={{ width: layer.width }}
          >
            <span className="text-sm font-semibold text-text-hi">
              <span className="mono-data me-2 text-[0.68rem] text-text-low">L{i + 1}</span>
              {layer.name}
            </span>
            <span className="mono-data text-[0.75rem] text-text-mid">
              <span className="text-gold-soft">{layer.count}</span> · {layer.unit}
            </span>
          </motion.div>
        ))}
      </div>

      {/* System health strip */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="mono-data mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/8 pt-4 text-[0.72rem] text-text-mid"
      >
        {HEALTH.map((h) => (
          <span key={h} className="inline-flex items-center gap-2">
            <motion.span
              className="h-1.5 w-1.5 rounded-full bg-success"
              animate={{ opacity: [1, 0.35, 1] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              aria-hidden="true"
            />
            {h}
          </span>
        ))}
      </motion.div>
    </section>
  )
}
