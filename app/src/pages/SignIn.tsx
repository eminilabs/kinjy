import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { AlertCircle, Fingerprint, Loader2, ShieldCheck } from 'lucide-react'
import ArcButton from '@/components/ui-kit/ArcButton'
import { useAuth } from '@/hooks/useAuth'
import { ApiError } from '@/lib/api'
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
    (mode === 'signin' || (displayName.trim().length >= 2 && !handleError && !passwordError))

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

  const field = 'w-full rounded-card-sm bg-ink-2/70 border border-white/10 px-4 py-3 text-text-hi placeholder:text-text-low focus:border-gold/50 focus:outline-none transition-colors'

  return (
    <section className="twilight-field noise-overlay flex min-h-[calc(100svh-72px)] items-center px-6 py-16">
      <div className="mx-auto grid w-full max-w-container items-center gap-14 lg:grid-cols-[1fr_460px]">
        {/* Left: promise */}
        <div className="hidden lg:block">
          <p className="eyebrow text-gold">Your society awaits</p>
          <h1 className="h1 mt-4 max-w-lg">
            One account. <span className="font-display italic text-gold-grad">Fifteen modules.</span>
          </h1>
          <ul className="mt-8 space-y-4 text-text-mid">
            <li className="flex items-start gap-3">
              <Fingerprint size={18} className="mt-0.5 shrink-0 text-gold" aria-hidden="true" />
              <span>
                <strong className="text-text-hi">Passkeys, not a biometric database.</strong> Your
                fingerprint or face unlocks your device locally — Kinjy never stores it.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <ShieldCheck size={18} className="mt-0.5 shrink-0 text-gold" aria-hidden="true" />
              <span>
                <strong className="text-text-hi">Leave whenever you want.</strong> Deactivate or
                delete from your settings, with no justification asked and a cooling period you choose.
              </span>
            </li>
          </ul>
        </div>

        {/* Right: the form */}
        <div className="cloud-card p-7 md:p-8">
          <div className="flex gap-1 rounded-full bg-ink-2/60 p-1">
            {(['signin', 'signup'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m)
                  setError(null)
                }}
                className={cn(
                  'flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                  mode === m ? 'bg-gold text-ink' : 'text-text-mid hover:text-text-hi',
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
                  <span className="caption mb-1.5 block">Your name</span>
                  <input
                    className={field}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your full name"
                    autoComplete="name"
                  />
                </label>
                <label className="block">
                  <span className="caption mb-1.5 block">Handle</span>
                  <div className="flex items-center gap-2">
                    <span className="text-text-low">@</span>
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
                  {handleError && <span className="mt-1.5 block text-xs text-red-300">{handleError}</span>}
                </label>
              </>
            )}

            <label className="block">
              <span className="caption mb-1.5 block">Email</span>
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
              <span className="caption mb-1.5 block">Password</span>
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
              {passwordError && <span className="mt-1.5 block text-xs text-red-300">{passwordError}</span>}
            </label>

            {mode === 'signup' && (
              <label className="block">
                <span className="caption mb-1.5 block">Referral code — optional</span>
                <input
                  className={field}
                  value={referral}
                  onChange={(e) => setReferral(e.target.value.toUpperCase())}
                  placeholder="ABCD1234"
                />
                <span className="mt-1.5 block text-xs text-text-low">
                  Credits whoever invited you — one level, 20% of our revenue on what you do.
                </span>
              </label>
            )}

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-card-sm border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
              >
                <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <ArcButton size="lg" className="w-full justify-center" disabled={!canSubmit}>
              {submitting && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
              {mode === 'signin' ? 'Sign in' : 'Create your account'}
            </ArcButton>
          </form>

          <p className="caption mt-5 text-center">
            {mode === 'signin' ? (
              <>
                No account yet?{' '}
                <button type="button" onClick={() => setMode('signup')} className="text-gold-soft hover:underline">
                  Create one
                </button>
              </>
            ) : (
              <>
                By creating an account you accept the{' '}
                <Link to="/safety" className="text-gold-soft hover:underline">
                  community standards
                </Link>
                .
              </>
            )}
          </p>
        </div>
      </div>
    </section>
  )
}
