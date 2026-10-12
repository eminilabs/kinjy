import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { KeyRound, MailCheck, ShieldCheck } from 'lucide-react'
import { ApiError, kaluta } from '@/lib/api'
import PublicShell from '@/components/landing/PublicShell'
import { Stage } from '@/components/landing/PageKit'

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
    'w-full rounded-[12px] border border-[var(--kl-paper-2)] bg-[var(--kl-bg)] px-4 py-3 text-[16px] text-[var(--kl-ink)] placeholder:text-[var(--kl-low)] focus:border-[var(--kl-gold)] focus:outline-none focus:ring-2 focus:ring-[var(--kl-gold)]/25'
  const button =
    'kl-sheen inline-flex w-full items-center justify-center gap-2 rounded-[16px] px-5 py-3.5 text-[15px] font-bold shadow-[0_14px_30px_-14px_rgba(169,118,28,.55)] transition-transform enabled:hover:-translate-y-0.5 disabled:cursor-default disabled:opacity-50'
  const label = 'mb-1.5 block text-[13px] font-semibold text-[var(--kl-mid)]'
  const title = 'mt-4 text-[clamp(26px,3.4vw,34px)] font-bold leading-[1.05] tracking-[-0.04em]'
  const text = 'mt-3 text-[0.95rem] leading-relaxed text-[var(--kl-mid)]'
  const tile = 'grid h-12 w-12 place-items-center rounded-[14px] bg-[#F6EBD3] text-[#8A6414]'
  const link = 'font-semibold text-[var(--kl-gold-deep)] hover:underline'

  return (
    <PublicShell>
    <section className="kl-pad-x py-[clamp(40px,7vw,96px)]">
      <Stage className="mx-auto w-full max-w-[520px] p-[clamp(14px,3vw,32px)]" glows={['var(--kl-sky)', '#D9A648']}>
        <div className="rounded-[20px] bg-[var(--kl-surface)] p-7 shadow-[0_30px_60px_-34px_var(--kl-shadow)] md:p-8">
          {done ? (
            <>
              <span className={tile}><ShieldCheck size={22} aria-hidden="true" /></span>
              <h1 className={title}>{t('reset.doneTitle')}</h1>
              <p className={text}>{t('reset.doneText')}</p>
              <Link to="/join" className={`${button} mt-6`}>
                {t('reset.goSignIn')}
              </Link>
            </>
          ) : token ? (
            <>
              <span className={tile}><KeyRound size={22} aria-hidden="true" /></span>
              <h1 className={title}>{t('reset.chooseTitle')}</h1>
              <p className={text}>{t('reset.chooseText')}</p>

              <form onSubmit={setNewPassword} className="mt-6 space-y-4" noValidate>
                <label className="block">
                  <span className={label}>{t('reset.newPassword')}</span>
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
                    className={`mt-1.5 block text-[13px] ${weak ? 'text-[#9A6B12]' : 'text-[var(--kl-low)]'}`}
                  >
                    {weak ?? t('reset.rule', { count: PASSWORD_MIN })}
                  </span>
                </label>

                <label className="block">
                  <span className={label}>{t('reset.again')}</span>
                  <input
                    className={field}
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                  {mismatch && (
                    <span className="mt-1.5 block text-[13px] text-[#9A6B12]">
                      {t('reset.noMatch')}
                    </span>
                  )}
                </label>

                {error && (
                  <p role="alert" className="rounded-[12px] bg-[#B23B3B]/10 px-4 py-3 text-sm text-[#B23B3B]">
                    {error}
                  </p>
                )}

                <button type="submit" disabled={!ready || busy} className={button}>
                  {busy ? t('reset.setting') : t('reset.setPassword')}
                </button>
                <p className="text-[13px] leading-relaxed text-[var(--kl-low)]">{t('reset.signsOutAll')}</p>
              </form>
            </>
          ) : sent ? (
            <>
              <span className={tile}><MailCheck size={22} aria-hidden="true" /></span>
              <h1 className={title}>{t('reset.sentTitle')}</h1>
              {/* Deliberately not "we sent you an email": we do not say whether
                  the address has an account, so we cannot claim to have sent. */}
              <p className={text}>{t('reset.sentText')}</p>
              <Link to="/join" className={`${link} mt-6 inline-block text-sm`}>
                {t('reset.backToSignIn')}
              </Link>
            </>
          ) : available === false ? (
            <>
              <h1 className={title}>{t('reset.unavailableTitle')}</h1>
              <p className={text}>
                {t('reset.unavailableText')}
              </p>
              <Link to="/join" className={`${link} mt-6 inline-block text-sm`}>
                {t('reset.backToSignIn')}
              </Link>
            </>
          ) : (
            <>
              <span className={tile}><KeyRound size={22} aria-hidden="true" /></span>
              <h1 className={title}>{t('reset.askTitle')}</h1>
              <p className={text}>{t('reset.askText')}</p>

              <form onSubmit={askForLink} className="mt-6 space-y-4" noValidate>
                <label className="block">
                  <span className={label}>{t('reset.email')}</span>
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
                  <p role="alert" className="rounded-[12px] bg-[#B23B3B]/10 px-4 py-3 text-sm text-[#B23B3B]">
                    {error}
                  </p>
                )}

                <button type="submit" disabled={!email || busy || available === null} className={button}>
                  {busy ? t('reset.sending') : t('reset.sendLink')}
                </button>
              </form>

              <Link to="/join" className={`${link} mt-5 inline-block text-sm`}>
                {t('reset.backToSignIn')}
              </Link>
            </>
          )}
        </div>
      </Stage>
    </section>
    </PublicShell>
  )
}
