import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { KeyRound, MailCheck, ShieldCheck } from 'lucide-react'
import { ApiError, kaluta } from '@/lib/api'

const PASSWORD_MIN = 10

/** Mirrors the server, so the form can say no before the round trip. */
function weakBecause(value: string, t: (k: string, o?: Record<string, unknown>) => string) {
  if (value.length < PASSWORD_MIN) return t('reset.ruleLength', { count: PASSWORD_MIN })
  if (/^\d+$/.test(value) || /^[A-Za-z]+$/.test(value)) return t('reset.ruleMix')
  return null
}

/**
 * Forgotten password, both halves of it.
 *
 * One route, because the member arrives at it two ways: from the sign-in page
 * with nothing, and from their mail with a token in the URL. Splitting them
 * would mean the link in the mail points somewhere the sign-in page cannot
 * reach, and a member who loses the tab has no way back to the same place.
 *
 * The request half never says whether an address has an account. That is not
 * coyness: for somebody whose safety depends on not being found here, a form
 * that answers "no such member" is a search engine.
 */
export default function ResetPassword() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') ?? ''

  const [available, setAvailable] = useState<boolean | null>(null)
  const [email, setEmail] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    // Only the request half depends on mail. Somebody holding a link already
    // has their mail, so asking would just delay them.
    if (token) {
      setAvailable(true)
      return
    }
    let alive = true
    kaluta.auth
      .resetAvailable()
      .then((r) => alive && setAvailable(r.available))
      .catch(() => alive && setAvailable(false))
    return () => {
      alive = false
    }
  }, [token])

  const weak = next ? weakBecause(next, t) : null
  const mismatch = Boolean(confirm) && next !== confirm
  const ready = Boolean(next && confirm) && !weak && !mismatch

  const askForLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await kaluta.auth.requestPasswordReset(email)
      setSent(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('reset.couldNotAsk'))
    } finally {
      setBusy(false)
    }
  }

  const setNewPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await kaluta.auth.resetPassword(token, next)
      setDone(true)
      setTimeout(() => navigate('/join'), 2500)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('reset.couldNotReset'))
    } finally {
      setBusy(false)
    }
  }

  const field =
    'w-full rounded-card-sm bg-ink-2/70 border border-white/10 px-4 py-3 text-text-hi placeholder:text-text-low focus:border-gold/50 focus:outline-none'
  const button =
    'inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-br from-gold-soft to-gold px-5 py-3 text-sm font-bold text-ink disabled:opacity-40'

  return (
    <section className="twilight-field noise-overlay flex min-h-[calc(100svh-72px)] items-center px-6 py-16">
      <div className="mx-auto w-full max-w-md">
        <div className="cloud-card p-7 md:p-8">
          {done ? (
            <>
              <ShieldCheck size={22} className="text-gold" aria-hidden="true" />
              <h1 className="h3 mt-3">{t('reset.doneTitle')}</h1>
              <p className="mt-2 text-sm leading-relaxed text-text-mid">{t('reset.doneText')}</p>
              <Link to="/join" className={`${button} mt-6`}>
                {t('reset.goSignIn')}
              </Link>
            </>
          ) : token ? (
            <>
              <KeyRound size={22} className="text-gold" aria-hidden="true" />
              <h1 className="h3 mt-3">{t('reset.chooseTitle')}</h1>
              <p className="mt-2 text-sm leading-relaxed text-text-mid">{t('reset.chooseText')}</p>

              <form onSubmit={setNewPassword} className="mt-6 space-y-4" noValidate>
                <label className="block">
                  <span className="caption mb-1.5 block">{t('reset.newPassword')}</span>
                  <input
                    className={field}
                    type="password"
                    value={next}
                    onChange={(e) => setNext(e.target.value)}
                    autoComplete="new-password"
                    aria-describedby="reset-rule"
                    required
                  />
                  <span
                    id="reset-rule"
                    className={`mt-1.5 block text-xs ${weak ? 'text-amber-300' : 'text-text-low'}`}
                  >
                    {weak ?? t('reset.rule', { count: PASSWORD_MIN })}
                  </span>
                </label>

                <label className="block">
                  <span className="caption mb-1.5 block">{t('reset.again')}</span>
                  <input
                    className={field}
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                  {mismatch && (
                    <span className="mt-1.5 block text-xs text-amber-300">
                      {t('reset.noMatch')}
                    </span>
                  )}
                </label>

                {error && (
                  <p role="alert" className="text-sm text-red-300">
                    {error}
                  </p>
                )}

                <button type="submit" disabled={!ready || busy} className={button}>
                  {busy ? t('reset.setting') : t('reset.setPassword')}
                </button>
                <p className="text-xs leading-relaxed text-text-low">{t('reset.signsOutAll')}</p>
              </form>
            </>
          ) : sent ? (
            <>
              <MailCheck size={22} className="text-gold" aria-hidden="true" />
              <h1 className="h3 mt-3">{t('reset.sentTitle')}</h1>
              {/* Deliberately not "we sent you an email": we do not say whether
                  the address has an account, so we cannot claim to have sent. */}
              <p className="mt-2 text-sm leading-relaxed text-text-mid">{t('reset.sentText')}</p>
              <Link to="/join" className="mt-6 inline-block text-sm text-gold hover:underline">
                {t('reset.backToSignIn')}
              </Link>
            </>
          ) : available === false ? (
            <>
              <h1 className="h3">{t('reset.unavailableTitle')}</h1>
              <p className="mt-2 text-sm leading-relaxed text-text-mid">
                {t('reset.unavailableText')}
              </p>
              <Link to="/join" className="mt-6 inline-block text-sm text-gold hover:underline">
                {t('reset.backToSignIn')}
              </Link>
            </>
          ) : (
            <>
              <KeyRound size={22} className="text-gold" aria-hidden="true" />
              <h1 className="h3 mt-3">{t('reset.askTitle')}</h1>
              <p className="mt-2 text-sm leading-relaxed text-text-mid">{t('reset.askText')}</p>

              <form onSubmit={askForLink} className="mt-6 space-y-4" noValidate>
                <label className="block">
                  <span className="caption mb-1.5 block">{t('reset.email')}</span>
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

                {error && (
                  <p role="alert" className="text-sm text-red-300">
                    {error}
                  </p>
                )}

                <button type="submit" disabled={!email || busy || available === null} className={button}>
                  {busy ? t('reset.sending') : t('reset.sendLink')}
                </button>
              </form>

              <Link to="/join" className="mt-5 inline-block text-sm text-gold hover:underline">
                {t('reset.backToSignIn')}
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
