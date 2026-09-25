import { motion, useReducedMotion } from 'framer-motion'
import { VerifiedBadge } from '@/components/ui-kit'
import { cn } from '@/lib/utils'

const lineEase = [0.65, 0, 0.35, 1] as [number, number, number, number]

const STEPS = [
  { id: 'unconfirmed', label: 'UNCONFIRMED', body: 'A memorial page may be created ahead of confirmation.', dot: 'border-text-low bg-transparent', text: 'text-text-mid' },
  { id: 'reported', label: 'REPORTED', body: 'A family member reports the passing, with documentation.', dot: 'border-warning bg-warning/20', text: 'text-warning' },
  { id: 'review', label: 'UNDER REVIEW', body: 'Documents are checked and family corroboration gathered.', dot: 'border-sky bg-sky/20', text: 'text-sky' },
  { id: 'verified', label: 'VERIFIED', body: 'Confirmed through documentation and family corroboration.', dot: 'border-success bg-success/25', text: 'text-success' },
]

/**
 * Death-verification pipeline (memorials.md §3):
 * UNCONFIRMED → REPORTED → UNDER REVIEW → VERIFIED. A single gold pulse
 * travels the hairline track (2.4s line-ease) each time the section enters
 * view; nodes brighten as it passes; the VERIFIED seal draws its checkmark.
 */
export default function VerificationPipeline() {
  const reduced = useReducedMotion()

  return (
    <div>
      {/* track */}
      <div className="relative hidden md:block">
        <div className="absolute left-[12.5%] right-[12.5%] top-5 h-px bg-white/12" aria-hidden="true" />
        {!reduced && (
          <motion.span
            aria-hidden="true"
            className="absolute top-5 h-2 w-2 -translate-y-[3.5px] rounded-full bg-gold-soft shadow-[0_0_14px_rgba(240,200,120,0.9)]"
            initial={{ left: '12.5%', opacity: 0 }}
            whileInView={{ left: '87.5%', opacity: 1 }}
            viewport={{ once: false, amount: 0.6 }}
            transition={{ duration: 2.4, ease: lineEase }}
          />
        )}
        <ol className="relative grid grid-cols-4 gap-6">
          {STEPS.map((s, i) => (
            <li key={s.id} className="flex flex-col items-center text-center">
              <motion.span
                className={cn('flex h-10 w-10 items-center justify-center rounded-full border-2 bg-[#0E1226]', s.dot)}
                initial={{ boxShadow: '0 0 0px rgba(240,200,120,0)' }}
                whileInView={
                  reduced
                    ? undefined
                    : { boxShadow: ['0 0 0px rgba(240,200,120,0)', '0 0 22px rgba(240,200,120,0.75)', '0 0 6px rgba(240,200,120,0.25)'] }
                }
                viewport={{ once: false, amount: 0.6 }}
                transition={{ duration: 0.7, delay: (2.4 / 3) * i, ease: lineEase }}
              >
                {s.id === 'verified' ? (
                  <VerifiedBadge size={20} />
                ) : (
                  <span className={cn('h-2 w-2 rounded-full', s.id === 'unconfirmed' ? 'bg-text-low' : s.id === 'reported' ? 'bg-warning' : 'bg-sky')} />
                )}
              </motion.span>
              <p className={cn('mono-data mt-3 text-[0.7rem] font-semibold tracking-[0.18em]', s.text)}>{s.label}</p>
              <p className="caption mt-1 max-w-[15rem] !text-text-mid">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>

      {/* stacked fallback on small screens */}
      <ol className="space-y-4 md:hidden">
        {STEPS.map((s) => (
          <li key={s.id} className="flex items-start gap-3 rounded-card-md border border-white/10 bg-white/[0.04] p-4">
            <span className={cn('mt-1 h-3 w-3 shrink-0 rounded-full border-2', s.dot)} />
            <div>
              <p className={cn('mono-data text-[0.7rem] font-semibold tracking-[0.18em]', s.text)}>{s.label}</p>
              <p className="caption mt-1 !text-text-mid">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <p className="mx-auto mt-10 max-w-2xl text-center font-display text-lg italic leading-relaxed text-[#D8D3C8]">
        “Passing is confirmed through documentation and family corroboration before a
        memorial is marked verified. Nothing is automated that grief cannot undo.”
      </p>
    </div>
  )
}
