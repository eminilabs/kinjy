import { useState } from 'react'
import { useApi } from '@/hooks/useApi'
import { ApiError, kaluta } from '@/lib/api'

/**
 * Invitations to secret communities. Hidden entirely when there are none:
 * an empty "Invitations" card on every visit is noise for most people.
 */
export default function MyInvitations({ onChanged }: { onChanged: () => void }) {
  const invitations = useApi(() => kaluta.communities.myInvitations(), [])
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const items = invitations.data?.items ?? []
  if (items.length === 0 && !error) return null

  const answer = async (id: string, accept: boolean) => {
    setBusy(id)
    setError(null)
    try {
      if (accept) await kaluta.communities.acceptInvitation(id)
      else await kaluta.communities.declineInvitation(id)
      invitations.reload()
      onChanged()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That did not go through')
      // An expired or already-answered invitation should leave the list.
      invitations.reload()
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="cloud-card mt-4 p-5" aria-label="Invitations">
      <h2 className="text-sm font-semibold text-text-hi">Invitations ({items.length})</h2>
      <ul className="mt-2 divide-y divide-white/10">
        {items.map((inv) => (
          <li key={inv.id} className="flex flex-wrap items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-text-hi">{inv.community_name ?? 'A secret community'}</p>
              <p className="caption text-text-mid">
                {inv.inviter ? `Invited by ${inv.inviter.display_name} (@${inv.inviter.handle})` : 'Invited'}
                {' · expires '}
                {new Date(inv.expires_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void answer(inv.id, true)}
                disabled={busy === inv.id}
                className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-4 py-2 text-xs font-bold text-ink disabled:opacity-40"
              >
                Accept
              </button>
              <button
                type="button"
                onClick={() => void answer(inv.id, false)}
                disabled={busy === inv.id}
                className="rounded-full border border-white/12 px-4 py-2 text-xs font-semibold text-text-mid hover:text-text-hi disabled:opacity-40"
              >
                Decline
              </button>
            </div>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-200">
          {error}
        </p>
      )}
    </section>
  )
}
