import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { AlertCircle, Fingerprint, Loader2, ShieldCheck } from 'lucide-react'
import PublicShell from '@/components/landing/PublicShell'
import { Eyebrow, KlButton, Stage } from '@/components/landing/PageKit'
import { useAuth } from '@/hooks/useAuth'
import { ApiError } from '@/lib/api'
import { OPEN_MODULES, spelled } from '@/lib/features'
import { cn } from '@/lib/utils'

type Mode = 'signin' | 'signup'

/** Mirrors auth-service's HANDLE_RE so the member is told before the round-trip. */
const HANDLE_RE = /^[a-z0-9](?:[a-z0-9_.]{1,38}[a-z0-9])$/

function suggestHandle(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 40)
}

/** auth-service requires ≥10 chars and refuses all-letters or all-digits. */
function passwordProblem(value: string): string | null {
  if (value.length < 10) return 'At least 10 characters.'
  if (/^\d+$/.test(value) || /^[a-zA-Z]+$/.test(value))
    return 'Mix letters with digits or symbols.'
  return null
}

export default function SignIn() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { user, signIn, signUp } = useAuth()

  const [mode, setMode] = useState<Mode>(params.get('mode') === 'signup' ? 'signup' : 'signin')
  const [email, setEmail] = useState(params.get('email') ?? '')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [handle, setHandle] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [handleEdited, setHandleEdited] = useState(false)
  const [referral, setReferral] = useState(params.get('ref') ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Already signed in? The sign-in page has nothing to offer.
  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true })
  }, [user, navigate])

  // Keep the handle in step with the name until the member takes it over.
  useEffect(() => {
    if (mode === 'signup' && !handleEdited) setHandle(suggestHandle(displayName))
  }, [displayName, handleEdited, mode])

  const handleError = useMemo(() => {
    if (mode !== 'signup' || !handle) return null
    return HANDLE_RE.test(handle)
      ? null
      : '3–40 characters: lowercase letters, digits, dots or underscores.'
  }, [handle, mode])

  const passwordError = useMemo(
    () => (mode === 'signup' && password ? passwordProblem(password) : null),
    [password, mode],
  )

  const canSubmit =
    email.trim() !== '' &&
    password !== '' &&
    !submitting &&
    (mode === 'signin' ||
      (displayName.trim().length >= 2 && !handleError && !passwordError && birthDate !== ''))

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password)
      } else {
        await signUp({
          email: email.trim(),
          password,
          display_name: displayName.trim(),
          handle,
          date_of_birth: birthDate,
          referral_code: referral.trim() || undefined,
        })
      }
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not reach the Kinjy API. Check that the stack is running.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const field =
    'w-full rounded-[12px] border border-[var(--kl-paper-2)] bg-[var(--kl-bg)] px-4 py-3 text-[16px] text-[var(--kl-ink)] placeholder:text-[var(--kl-low)] focus:border-[var(--kl-gold)] focus:outline-none focus:ring-2 focus:ring-[var(--kl-gold)]/25'
  const label = 'mb-1.5 block text-[13px] font-semibold text-[var(--kl-mid)]'
  const hint = 'mt-1.5 block text-[13px] leading-snug text-[var(--kl-low)]'
  const fieldError = 'mt-1.5 block text-[13px] text-[#B23B3B]'

  return (
    <PublicShell>
      <section className="kl-pad-x py-[clamp(40px,6vw,80px)]">
        <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-[clamp(40px,6vw,96px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,480px)]">
          {/* Left: promise */}
          <div className="hidden min-w-0 lg:block">
            <Eyebrow>Your society awaits</Eyebrow>
            <h1 className="kl-serif mt-6 max-w-[620px] text-balance text-[clamp(44px,5.4vw,80px)] font-semibold leading-[0.98] tracking-[-0.02em]">
              One account.{' '}
              <span className="text-[var(--kl-gold-deep)]">{spelled(OPEN_MODULES)} modules.</span>
            </h1>
            <ul className="mt-10 max-w-[520px] border-t border-[var(--kl-paper-2)]">
              <li className="flex items-start gap-4 border-b border-[var(--kl-paper-2)] py-5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-[#F6EBD3] text-[#8A6414]">
                  <Fingerprint size={18} aria-hidden="true" />
                </span>
                <span className="text-[16px] leading-relaxed text-[var(--kl-mid)]">
                  <strong className="text-[var(--kl-ink)]">Passkeys, not a biometric database.</strong> Your
                  fingerprint or face unlocks your device locally — Kinjy never stores it.
                </span>
              </li>
              <li className="flex items-start gap-4 border-b border-[var(--kl-paper-2)] py-5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-[#E3ECF7] text-[#2F6BA8]">
                  <ShieldCheck size={18} aria-hidden="true" />
                </span>
                <span className="text-[16px] leading-relaxed text-[var(--kl-mid)]">
                  <strong className="text-[var(--kl-ink)]">Leave whenever you want.</strong> Deactivate or
                  delete from your settings, with no justification asked and a cooling period you choose.
                </span>
              </li>
            </ul>
          </div>

          {/* Right: the form, on a stage */}
          <Stage className="min-w-0 p-[clamp(14px,3vw,32px)]" glows={['var(--kl-sky)', '#D9A648']}>
            <div className="rounded-[20px] bg-[var(--kl-surface)] p-6 shadow-[0_30px_60px_-34px_var(--kl-shadow)] md:p-8">
              <div className="flex gap-1 rounded-full bg-[var(--kl-paper)] p-1">
                {(['signin', 'signup'] as Mode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setMode(m)
                      setError(null)
                    }}
                    className={cn(
                      'flex-1 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors',
                      mode === m ? 'kl-sheen' : 'text-[var(--kl-mid)] hover:text-[var(--kl-ink)]',
                    )}
                  >
                    {m === 'signin' ? 'Sign in' : 'Create account'}
                  </button>
                ))}
              </div>

              <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
                {mode === 'signup' && (
                  <>
                    <label className="block">
                      <span className={label}>Your name</span>
                      <input
                        className={field}
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Your full name"
                        autoComplete="name"
                      />
                    </label>
                    <label className="block">
                      <span className={label}>Date of birth</span>
                      <input
                        type="date"
                        className={field}
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        autoComplete="bday"
                        max={new Date().toISOString().slice(0, 10)}
                        aria-describedby="dob-why"
                      />
                      {/* Says what it is for, and nothing about what would qualify.
                          Telling someone the minimum age is telling them which date
                          to type instead. */}
                      <span id="dob-why" className={hint}>
                        We use this to give you the right experience for your age. It is not shown on
                        your profile.
                      </span>
                    </label>
                    <label className="block">
                      <span className={label}>Handle</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[var(--kl-low)]">@</span>
                        <input
                          className={field}
                          value={handle}
                          onChange={(e) => {
                            setHandleEdited(true)
                            setHandle(e.target.value.toLowerCase())
                          }}
                          placeholder="your.handle"
                          autoComplete="username"
                          aria-invalid={Boolean(handleError)}
                        />
                      </div>
                      {handleError && <span className={fieldError}>{handleError}</span>}
                    </label>
                  </>
                )}

                <label className="block">
                  <span className={label}>Email</span>
                  <input
                    className={field}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                  />
                </label>

                <label className="block">
                  <span className={label}>Password</span>
                  <input
                    className={field}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'signup' ? 'At least 10 characters' : '••••••••••'}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    aria-invalid={Boolean(passwordError)}
                    required
                  />
                  {passwordError && <span className={fieldError}>{passwordError}</span>}
                </label>

                {mode === 'signup' && (
                  <label className="block">
                    <span className={label}>Referral code — optional</span>
                    <input
                      className={field}
                      value={referral}
                      onChange={(e) => setReferral(e.target.value.toUpperCase())}
                      placeholder="ABCD1234"
                    />
                    <span className={hint}>
                      Credits whoever invited you — one level, 20% of our revenue on what you do.
                    </span>
                  </label>
                )}

                {error && (
                  <div
                    role="alert"
                    className="flex items-start gap-2.5 rounded-[12px] border border-[#B23B3B]/40 bg-[#B23B3B]/10 px-4 py-3 text-sm text-[#B23B3B]"
                  >
                    <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <span>{error}</span>
                  </div>
                )}

                <KlButton size="lg" className="w-full" disabled={!canSubmit} type="submit">
                  {submitting && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
                  {mode === 'signin' ? 'Sign in' : 'Create your account'}
                </KlButton>
              </form>

              <p className="mt-5 text-center text-[13px] text-[var(--kl-low)]">
                {mode === 'signin' ? (
                  <>
                    No account yet?{' '}
                    <button type="button" onClick={() => setMode('signup')} className="font-semibold text-[var(--kl-gold-deep)] hover:underline">
                      Create one
                    </button>
                  </>
                ) : (
                  <>
                    By creating an account you accept the{' '}
                    <Link to="/safety" className="font-semibold text-[var(--kl-gold-deep)] hover:underline">
                      community standards
                    </Link>
                    .
                  </>
                )}
              </p>
            </div>
          </Stage>
        </div>
      </section>
    </PublicShell>
  )
}
