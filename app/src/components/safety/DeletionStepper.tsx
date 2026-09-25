import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronRight,
  Pause,
  Trash2,
  Fingerprint,
  MailCheck,
  Timer,
  Download,
  Scale,
  Check,
  ArrowLeft,
  Settings,
  UserRound,
} from 'lucide-react'
import { ArcButton } from '@/components/ui-kit'
import { cn } from '@/lib/utils'

type Choice = 'deactivate' | 'delete'
type Identity = 'passkey' | 'otp'
type Cooling = 0 | 7 | 30

const STEPS = ['Choose', 'Confirm identity', 'Cooling period', 'Done']

/**
 * DeletionStepper — refinement #4. Interactive self-service account deletion demo:
 * Settings → Account → Deactivate or Delete, identity confirmation, optional cooling
 * period, GDPR/PDPA completion. Deactivate and Delete are identically prominent —
 * itself a design statement. No justification required — ever.
 */
export default function DeletionStepper() {
  const [step, setStep] = useState(0)
  const [choice, setChoice] = useState<Choice | null>(null)
  const [identity, setIdentity] = useState<Identity | null>(null)
  const [cooling, setCooling] = useState<Cooling | null>(null)

  const canNext =
    (step === 0 && choice !== null) ||
    (step === 1 && identity !== null) ||
    (step === 2 && cooling !== null)

  const reset = () => {
    setStep(0)
    setChoice(null)
    setIdentity(null)
    setCooling(null)
  }

  return (
    <section aria-labelledby="deletion-heading" className="py-24">
      <div className="mx-auto max-w-container px-6">
        <div className="text-center">
          <p className="eyebrow text-gold">Refinement #4 · Account control</p>
          <h2 id="deletion-heading" className="h2 mt-3">
            Your account, yours to end.
          </h2>
          <p className="body-lg mx-auto mt-4 max-w-xl text-text-mid">
            Self-service, honest, and reachable in four steps. Try the actual flow:
          </p>
        </div>

        {/* Settings panel mock */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="cloud-card mx-auto mt-12 max-w-2xl overflow-hidden"
        >
          {/* breadcrumb bar */}
          <div className="flex flex-wrap items-center gap-2 border-b border-white/8 bg-ink-3/60 px-5 py-3">
            <Settings size={14} className="text-text-low" aria-hidden="true" />
            <span className="text-sm text-text-mid">Settings</span>
            <ChevronRight size={13} className="text-text-low" aria-hidden="true" />
            <UserRound size={14} className="text-text-low" aria-hidden="true" />
            <span className="text-sm text-text-mid">Account</span>
            <ChevronRight size={13} className="text-text-low" aria-hidden="true" />
            <span className="text-sm font-semibold text-gold-soft">Deactivate or Delete</span>
          </div>

          {/* step progress */}
          <div className="flex items-center gap-2 px-5 pt-5">
            {STEPS.map((s, i) => (
              <div key={s} className="flex flex-1 flex-col gap-1.5">
                <span
                  className={cn(
                    'h-1 rounded-full transition-colors duration-300',
                    i <= step ? 'bg-gradient-to-r from-gold-soft to-gold' : 'bg-white/10',
                  )}
                />
                <span
                  className={cn(
                    'mono-data text-[0.62rem] uppercase tracking-[0.12em]',
                    i <= step ? 'text-gold-soft' : 'text-text-low',
                  )}
                >
                  {i + 1} · {s}
                </span>
              </div>
            ))}
          </div>

          <div className="min-h-[300px] p-5 md:p-7">
            <AnimatePresence mode="wait">
              {/* STEP 1 — Choose */}
              {step === 0 && (
                <motion.div
                  key="step-choose"
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                >
                  <h3 className="h3 text-lg">Choose — no guilt-trips, clear language.</h3>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setChoice('deactivate')}
                      aria-pressed={choice === 'deactivate'}
                      className={cn(
                        'rounded-card-md border p-4 text-start transition-colors duration-200',
                        choice === 'deactivate'
                          ? 'border-sky/60 bg-sky/10'
                          : 'border-white/12 bg-white/[0.04] hover:border-white/25',
                      )}
                    >
                      <Pause size={18} className="text-sky" aria-hidden="true" />
                      <p className="mt-2 text-sm font-bold text-text-hi">Deactivate</p>
                      <p className="caption mt-1">
                        Reversible. Your profile sleeps; come back any time and everything is as
                        you left it.
                      </p>
                    </button>
                    {/* Delete — identically prominent, called out with a gold annotation ring */}
                    <motion.div
                      initial={{ boxShadow: '0 0 0 0 rgba(217,166,72,0)' }}
                      whileInView={{ boxShadow: '0 0 0 2px rgba(217,166,72,0.55)' }}
                      viewport={{ once: true, amount: 0.8 }}
                      transition={{ duration: 0.9, delay: 0.6, ease: [0.65, 0, 0.35, 1] }}
                      className="rounded-card-md"
                    >
                      <button
                        type="button"
                        onClick={() => setChoice('delete')}
                        aria-pressed={choice === 'delete'}
                        className={cn(
                          'h-full w-full rounded-card-md border p-4 text-start transition-colors duration-200',
                          choice === 'delete'
                            ? 'border-danger/60 bg-danger/10'
                            : 'border-white/12 bg-white/[0.04] hover:border-white/25',
                        )}
                      >
                        <Trash2 size={18} className="text-danger" aria-hidden="true" />
                        <p className="mt-2 text-sm font-bold text-text-hi">Delete</p>
                        <p className="caption mt-1">
                          Permanent. Your data is erased. Equally easy to find — that is the
                          point.
                        </p>
                      </button>
                    </motion.div>
                  </div>
                  <p className="mono-data mt-4 text-[0.7rem] text-text-low">
                    both options, same prominence · zero dark patterns
                  </p>
                </motion.div>
              )}

              {/* STEP 2 — Confirm identity */}
              {step === 1 && (
                <motion.div
                  key="step-identity"
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                >
                  <h3 className="h3 text-lg">Confirm it's you — protecting you, not us.</h3>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setIdentity('passkey')}
                      aria-pressed={identity === 'passkey'}
                      className={cn(
                        'rounded-card-md border p-4 text-start transition-colors duration-200',
                        identity === 'passkey'
                          ? 'border-gold/60 bg-gold/10'
                          : 'border-white/12 bg-white/[0.04] hover:border-white/25',
                      )}
                    >
                      <Fingerprint size={18} className="text-gold-soft" aria-hidden="true" />
                      <p className="mt-2 text-sm font-bold text-text-hi">Passkey</p>
                      <p className="caption mt-1">Unlock with your device — biometrics stay local.</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIdentity('otp')}
                      aria-pressed={identity === 'otp'}
                      className={cn(
                        'rounded-card-md border p-4 text-start transition-colors duration-200',
                        identity === 'otp'
                          ? 'border-gold/60 bg-gold/10'
                          : 'border-white/12 bg-white/[0.04] hover:border-white/25',
                      )}
                    >
                      <MailCheck size={18} className="text-sky" aria-hidden="true" />
                      <p className="mt-2 text-sm font-bold text-text-hi">Email OTP</p>
                      <p className="caption mt-1">A one-time code to your verified email.</p>
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 3 — Cooling period */}
              {step === 2 && (
                <motion.div
                  key="step-cooling"
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                >
                  <h3 className="h3 text-lg">Optional cooling period — your choice.</h3>
                  <p className="caption mt-1">
                    A change-your-mind window before deletion completes. Skip it entirely if you
                    want.
                  </p>
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    {([
                      { v: 0 as Cooling, label: 'None', sub: 'erase immediately' },
                      { v: 7 as Cooling, label: '7 days', sub: 'restore with one sign-in' },
                      { v: 30 as Cooling, label: '30 days', sub: 'maximum window' },
                    ]).map((opt) => (
                      <button
                        key={opt.v}
                        type="button"
                        onClick={() => setCooling(opt.v)}
                        aria-pressed={cooling === opt.v}
                        className={cn(
                          'rounded-card-md border p-4 text-center transition-colors duration-200',
                          cooling === opt.v
                            ? 'border-gold/60 bg-gold/10'
                            : 'border-white/12 bg-white/[0.04] hover:border-white/25',
                        )}
                      >
                        <Timer size={16} className="mx-auto text-gold-soft" aria-hidden="true" />
                        <p className="mono-data mt-2 text-sm font-bold text-text-hi">{opt.label}</p>
                        <p className="caption mt-1">{opt.sub}</p>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* STEP 4 — Done */}
              {step === 3 && (
                <motion.div
                  key="step-done"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  className="text-center"
                >
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-success/40 bg-success/10 text-success">
                    <Check size={26} aria-hidden="true" />
                  </span>
                  <h3 className="h3 mt-4 text-lg">
                    {choice === 'delete' ? 'Deletion scheduled.' : 'Account deactivated.'}
                  </h3>
                  <p className="mx-auto mt-2 max-w-md text-sm text-text-mid">
                    {choice === 'delete'
                      ? cooling && cooling > 0
                        ? `Your data will be erased in ${cooling} days — sign in any time before then to cancel.`
                        : 'Your data is being erased now.'
                      : 'Your profile is asleep. Sign back in whenever you like.'}{' '}
                    Erasure follows <strong className="text-text-hi">GDPR / PDPA</strong> standards.
                  </p>
                  <div className="mono-data mt-5 inline-flex flex-wrap items-center justify-center gap-3 rounded-full border border-white/12 bg-white/[0.04] px-5 py-2.5 text-[0.7rem] text-text-mid">
                    <span className="inline-flex items-center gap-1.5">
                      <Scale size={12} className="text-gold-soft" aria-hidden="true" /> GDPR / PDPA
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Download size={12} className="text-sky" aria-hidden="true" /> data export offered first
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-gold-soft">
                      no justification required — ever
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* footer controls */}
          <div className="flex items-center justify-between border-t border-white/8 px-5 py-4">
            <button
              type="button"
              onClick={() => (step === 3 ? reset() : setStep((s) => Math.max(0, s - 1)))}
              disabled={step === 0}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-text-mid transition-colors hover:text-text-hi disabled:opacity-30"
            >
              <ArrowLeft size={14} aria-hidden="true" /> {step === 3 ? 'Start over' : 'Back'}
            </button>
            {step < 3 && (
              <ArcButton
                variant="gold"
                size="sm"
                type="button"
                disabled={!canNext}
                onClick={() => setStep((s) => Math.min(3, s + 1))}
                className={cn(!canNext && 'cursor-not-allowed opacity-40')}
              >
                {step === 2 ? (choice === 'delete' ? 'Confirm deletion' : 'Confirm') : 'Continue'}
                <ChevronRight size={14} aria-hidden="true" />
              </ArcButton>
            )}
          </div>
        </motion.div>

        {/* design-statement caption */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.8 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mx-auto mt-10 max-w-lg text-center font-display text-xl italic leading-relaxed text-gold-soft"
        >
          "A platform confident in its value doesn't trap people."
        </motion.p>
      </div>
    </section>
  )
}
