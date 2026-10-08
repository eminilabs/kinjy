import { useState, type ReactNode } from 'react'
import { CalendarDays, Loader2 } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { ApiError, kaluta } from '@/lib/api'

/**
 * A date of birth for an account that has none.
 *
 * Kinjy treats an account with no age record as a younger member's, everywhere,
 * until it has one: the feed is thinner and search is filtered. That used to
 * look like missing posts with no way out. This is the way out. For an account
 * that already has a date it renders `otherwise` (nothing by default), so it can
 * sit on any page.
 */
export default function AgeDeclaration({ onDone, otherwise }: { onDone?: () => void; otherwise?: ReactNode }) {
  const status = useApi(() => kaluta.account.ageStatus(), [])
  const [born, setBorn] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<'created' | 'under_review' | null>(null)

  // Nothing to say while it is still being asked; and when this is not the
  // account's problem, whatever the caller would have shown instead.
  if (!result && status.loading) return null
  if (!result && !status.data?.can_declare) return <>{otherwise}</>

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!born || busy) return
    setBusy(true)
    setError(null)
    try {
      const response = await kaluta.account.declareDateOfBirth(born)
      setResult(response.status)
      if (response.status === 'created') onDone?.()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save your date of birth')
    } finally {
      setBusy(false)
    }
  }

  if (result === 'created') {
    return (
      <div role="status" className="cloud-card flex items-center gap-3 px-5 py-4 text-sm text-text-hi">
        <CalendarDays size={18} className="shrink-0 text-gold-soft" aria-hidden="true" />
        Thanks — your date of birth is saved. Everything you are allowed to see will show up now.
      </div>
    )
  }
  if (result === 'under_review') {
    return (
      <div role="status" className="cloud-card px-5 py-4 text-sm text-text-hi">
        Thanks. We are reviewing your account before anything changes.
      </div>
    )
  }

  return (
    <form onSubmit={save} className="cloud-card p-5 md:p-6">
      <div className="flex items-start gap-4">
        <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gold/20 text-gold-soft">
          <CalendarDays size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[1.1rem] font-bold tracking-[-0.02em] text-text-hi">Add your date of birth to see everything</h2>
          <p className="mt-1 text-sm leading-relaxed text-text-low">
            Your account has no date of birth on record, so Kinjy treats it as a younger member’s and hides some posts.
            It is never shown on your profile.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={born}
              onChange={(event) => setBorn(event.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              aria-label="Date of birth"
              autoComplete="bday"
              className="rounded-full border border-transparent bg-text-hi/[0.07] px-4 py-2.5 text-[0.95rem] text-text-hi focus:border-gold/50 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!born || busy}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-gold-soft to-gold px-6 py-2.5 text-sm font-bold text-ink disabled:opacity-40"
            >
              {busy && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
              Save
            </button>
          </div>
          {error && (
            <p role="alert" className="mt-3 text-sm text-danger">
              {error}
            </p>
          )}
        </div>
      </div>
    </form>
  )
}
