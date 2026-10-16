import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { MailCheck, Newspaper } from 'lucide-react'
import { ApiError, kaluta } from '@/lib/api'

/**
 * Where a reader asks for a creator's newsletter - public, with no account.
 *
 * It says what will happen and nothing more than the server told it: the same reply comes back whether or
 * not the address was already on the list, so this page cannot be used to find out who is. Asking sends one
 * confirmation mail; nothing else is ever sent to an address that did not follow its link.
 */
export default function NewsletterSubscribe() {
  const { handle = '' } = useParams()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const ask = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await kaluta.creators.newsletter.subscribe(handle, email.trim())
      setSent(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach Kinjy. Try again in a moment.')
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
          {sent ? (
            <>
              <MailCheck size={22} className="text-gold" aria-hidden="true" />
              <h1 className="h3 mt-3">Check your inbox</h1>
              <p className="mt-2 text-sm leading-relaxed text-text-mid">
                If that address can be added, a confirmation is on its way. Nothing is sent until you open the link in it.
              </p>
            </>
          ) : (
            <>
              <Newspaper size={22} className="text-gold" aria-hidden="true" />
              <h1 className="h3 mt-3">@{handle}&apos;s newsletter</h1>
              <p className="mt-2 text-sm leading-relaxed text-text-mid">
                Get it by e-mail. You will be asked to confirm your address, and every message has a link to leave in one click.
              </p>
              <form onSubmit={ask} className="mt-6 space-y-4" noValidate>
                <label className="block">
                  <span className="caption mb-1.5 block">Your e-mail address</span>
                  <input
                    className={field}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </label>
                {error && (
                  <p role="alert" className="text-sm text-red-300">
                    {error}
                  </p>
                )}
                <button type="submit" disabled={busy || !email.includes('@')} className={button}>
                  {busy ? 'Sending…' : 'Subscribe'}
                </button>
              </form>
            </>
          )}
          <Link to="/" className="mt-6 inline-block text-sm text-gold hover:underline">
            Kinjy
          </Link>
        </div>
      </div>
    </section>
  )
}
