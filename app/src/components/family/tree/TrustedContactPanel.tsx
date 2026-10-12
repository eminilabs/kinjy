import { useState } from 'react'
import { KeyRound } from 'lucide-react'
import { useAppTheme } from '@/components/appdemo/theme'
import { useApi } from '@/hooks/useApi'
import { ApiError, kaluta } from '@/lib/api'
import { cn } from '@/lib/utils'

const when = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

/**
 * Owners: name someone who could take over this tree if you cannot. Naming gives them nothing.
 * They must accept, and to take over they must ask: owners are told and have 30 days to cancel.
 */
export function TrustedContactOwner({ personId }: { personId: string }) {
  const { tok } = useAppTheme()
  const list = useApi(() => kaluta.family.trustedContacts(personId), [personId])
  const members = useApi(() => kaluta.family.members(personId), [personId])
  const [choice, setChoice] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true)
    setError(null)
    try {
      await action()
      setChoice('')
      list.reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That did not work. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const named = new Set(list.data?.items.map((i) => i.name) ?? [])
  const candidates = (members.data?.items ?? []).filter((m) => !m.is_me && m.role !== 'owner' && m.name && !m.branch && !named.has(m.name))
  const delay = list.data?.delay_days ?? 30

  return (
    <section className="mt-5 border-t border-white/10 pt-4" aria-labelledby="trusted-title">
      <h3 id="trusted-title" className={cn('mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide', tok.mid)}>
        <KeyRound size={13} aria-hidden="true" /> Trusted contacts
      </h3>
      <p className={cn('mb-2 text-xs', tok.low)}>
        Name up to three members who could keep this tree going if you can no longer. Naming gives them no access. They must accept, and to take over they must ask: every owner is told, any owner can cancel, and nothing happens for {delay} days. You stay an owner.
      </p>
      {error && <p className="mb-2 text-xs text-red-300" role="alert">{error}</p>}
      <ul className="mb-2 space-y-2">
        {list.data?.items.map((i) => (
          <li key={i.id} className={cn('text-xs', tok.text)}>
            <span className="font-semibold">{i.name ?? 'A member'}</span> · {i.status === 'invited' ? 'has not answered yet' : 'accepted'}
            {i.request && (
              <span className="block text-gold-soft">
                Asked to take over; it happens on {when(i.request.effective_at)} unless an owner cancels.{' '}
                <button type="button" disabled={busy} onClick={() => run(() => kaluta.family.cancelSuccession(i.id))} className="underline underline-offset-2">
                  Cancel the request
                </button>
              </span>
            )}
            <button type="button" disabled={busy} onClick={() => run(() => kaluta.family.endDesignation(i.id))} className="ml-2 underline underline-offset-2">
              Remove
            </button>
          </li>
        ))}
        {list.data && list.data.items.length === 0 && <li className={cn('text-xs', tok.low)}>Nobody is named yet.</li>}
      </ul>
      {candidates.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="Member to name" value={choice} onChange={(e) => setChoice(e.target.value)} className={cn('rounded-card-sm px-2 py-1.5 text-xs', tok.input, tok.text)}>
            <option value="">Choose a member…</option>
            {candidates.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <button type="button" disabled={busy || !choice} onClick={() => run(() => kaluta.family.nameTrustedContact(personId, choice))} className={cn('min-h-9 rounded-full border border-white/15 px-3.5 py-1.5 text-xs font-semibold disabled:opacity-60', tok.text, tok.hoverBg)}>
            Name as trusted contact
          </button>
        </div>
      )}
    </section>
  )
}

/** Members named as someone's trusted contact: to accept or decline, and to ask to take over. */
export function TrustedContactMine() {
  const { tok } = useAppTheme()
  const list = useApi(() => kaluta.family.myDesignations(), [])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true)
    setError(null)
    try {
      await action()
      list.reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That did not work. Try again.')
    } finally {
      setBusy(false)
    }
  }

  if (!list.data || list.data.items.length === 0) return null
  const delay = list.data.delay_days
  return (
    <section className="mt-5 border-t border-white/10 pt-4" aria-labelledby="designation-title">
      <h3 id="designation-title" className={cn('mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide', tok.mid)}>
        <KeyRound size={13} aria-hidden="true" /> You are a trusted contact
      </h3>
      {error && <p className="mb-2 text-xs text-red-300" role="alert">{error}</p>}
      <ul className="space-y-3">
        {list.data.items.map((i) => (
          <li key={i.id} className={cn('text-xs', tok.mid)}>
            <p>
              <strong className={tok.text}>{i.owner_name ?? 'An owner'}</strong> named you to be able to take over their family tree if they can no longer. This gives you no extra access now.
            </p>
            {i.status === 'invited' ? (
              <p className="mt-1 flex gap-3">
                <button type="button" disabled={busy} onClick={() => run(() => kaluta.family.acceptDesignation(i.id))} className="font-semibold underline underline-offset-2">Accept</button>
                <button type="button" disabled={busy} onClick={() => run(() => kaluta.family.declineDesignation(i.id))} className="underline underline-offset-2">Decline</button>
              </p>
            ) : i.request ? (
              <p className="mt-1">
                You asked to take over. The owners were told; it happens on {when(i.request.effective_at)} unless one of them cancels.{' '}
                <button type="button" disabled={busy} onClick={() => run(() => kaluta.family.cancelSuccession(i.id))} className="underline underline-offset-2">Withdraw</button>
              </p>
            ) : (
              <p className="mt-1">
                Only if the owners can no longer act, ask to take over: every owner is told and has {delay} days to cancel before you become an owner.{' '}
                <button type="button" disabled={busy || i.valid === false} onClick={() => run(() => kaluta.family.requestSuccession(i.id))} className="font-semibold underline underline-offset-2">Ask to take over</button>{' '}
                <button type="button" disabled={busy} onClick={() => run(() => kaluta.family.endDesignation(i.id))} className="underline underline-offset-2">Step down</button>
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
