import { motion } from 'framer-motion'
import { User, ShieldCheck, KeyRound, Check } from 'lucide-react'

const NODES = [
  { icon: User, label: 'Member', sub: 'starts verification' },
  { icon: ShieldCheck, label: 'KinjyKYC API', sub: '$10 · annual' },
  { icon: KeyRound, label: 'Result token', sub: 'only this is stored' },
  { icon: null, label: 'Commission eligibility', sub: 'unlocked' },
]

/**
 * KycSection — refinement #20. Verification flow diagram: Member → KinjyKYC API →
 * Result token -> commission eligibility unlocked. Arcs draw on scroll; the lock
 * shackle swings open as the final arc completes.
 */
export default function KycSection() {
  return (
    <section aria-labelledby="kyc-heading" className="border-t border-white/8 px-5 py-10 md:px-8">
      <div className="grid items-center gap-8 lg:grid-cols-2">
        <div>
          <p className="eyebrow text-gold">Refinement #20 · KinjyKYC gate</p>
          <h2 id="kyc-heading" className="h3 mt-2 text-xl">
            Verified earners, private by design.
          </h2>
          <ul className="mt-4 space-y-3 text-sm text-text-mid">
            {[
              '$10 annual verification via the KinjyKYC API.',
              'Required before earning commission — earnings are for real, verified people.',
              'Only verification results are stored on-platform. Identity documents never touch our servers.',
            ].map((line) => (
              <li key={line} className="flex gap-2.5">
                <Check size={15} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Flow diagram */}
        <div className="rounded-card-md border border-white/8 bg-ink-3/50 p-5">
          <div className="flex flex-col gap-0">
            {NODES.map((node, i) => {
              const isLast = i === NODES.length - 1
              return (
                <div key={node.label}>
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.65 }}
                    transition={{ duration: 0.42, delay: i * 0.18, ease: [0.22, 1, 0.36, 1] }}
                    className={
                      isLast
                        ? 'flex items-center gap-3 rounded-card-md border border-gold/40 bg-gold/10 px-4 py-3'
                        : 'flex items-center gap-3 rounded-card-md border border-white/10 bg-ink-2 px-4 py-3'
                    }
                  >
                    <span
                      className={
                        isLast
                          ? 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold-soft to-gold text-ink'
                          : 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-sky'
                      }
                    >
                      {isLast ? (
                        /* Lock with swinging shackle */
                        <svg viewBox="0 0 24 24" width={17} height={17} fill="none" aria-hidden="true">
                          <rect x="5" y="10" width="14" height="10" rx="2.5" fill="currentColor" />
                          <motion.path
                            d="M8 10 V7 a4 4 0 0 1 8 0 v3"
                            stroke="currentColor"
                            strokeWidth={2.2}
                            strokeLinecap="round"
                            style={{ transformOrigin: '16px 10px' }}
                            initial={{ rotate: 0 }}
                            whileInView={{ rotate: -38, opacity: 0.55 }}
                            viewport={{ once: true, amount: 0.65 }}
                            transition={{ duration: 0.5, delay: 0.75, ease: [0.34, 1.56, 0.64, 1] }}
                          />
                        </svg>
                      ) : (
                        node.icon && <node.icon size={17} strokeWidth={1.9} />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text-hi">{node.label}</p>
                      <p className="caption">{node.sub}</p>
                    </div>
                    {isLast && (
                      <span className="mono-data ms-auto rounded-full border border-gold/40 px-2 py-0.5 text-[0.68rem] text-gold-soft">
                        UNLOCKED
                      </span>
                    )}
                  </motion.div>

                  {i < NODES.length - 1 && (
                    <svg viewBox="0 0 24 34" width={24} height={34} className="ms-8" aria-hidden="true">
                      <motion.path
                        d="M12 1 C 12 12, 12 22, 12 33"
                        stroke="url(#kyc-arc)"
                        strokeWidth={2}
                        fill="none"
                        strokeLinecap="round"
                        initial={{ pathLength: 0 }}
                        whileInView={{ pathLength: 1 }}
                        viewport={{ once: true, amount: 0.65 }}
                        transition={{ duration: 0.9, delay: 0.15 + i * 0.18, ease: [0.65, 0, 0.35, 1] }}
                      />
                      <defs>
                        <linearGradient id="kyc-arc" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#F0C878" />
                          <stop offset="55%" stopColor="#D9A648" />
                          <stop offset="100%" stopColor="#8FB8E8" />
                        </linearGradient>
                      </defs>
                    </svg>
                  )}
                </div>
              )
            })}
          </div>
          <p className="mono-data mt-4 border-t border-white/8 pt-3 text-[0.72rem] text-text-low">
            stored: result_token only · documents: never received ·
          </p>
        </div>
      </div>
    </section>
  )
}
