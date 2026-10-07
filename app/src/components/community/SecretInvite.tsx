import { useState } from 'react'
import { useApi } from '@/hooks/useApi'
import { useAuth } from '@/hooks/useAuth'
import { ApiError, kaluta, type PersonBrief } from '@/lib/api'

/**
 * How a member brings someone into a secret community: by handle, from the
 * viewer's accepted connections, or by a pasted user id as the fallback. Adding straight away is only offered for a
 * connection — the API refuses it for strangers, so the button says so up front.
 */
export default function SecretInvite({ communityId }: { communityId: string }) {
  const connections = useApi(() => kaluta.connections.list(), [])
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [found, setFound] = useState<(PersonBrief & { user_id: string }) | null>(null)
  const [finding, setFinding] = useState(false)
  const [picked, setPicked] = useState('')
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const accepted = connections.data?.accepted ?? []
  const target = (found?.user_id || typed.trim() || picked).trim()
  const isConnection = accepted.some((c) => c.user_id === target)

  const find = async () => {
    const handle = query.trim().replace(/^@+/, '').toLowerCase()
    if (handle.length < 2) return
    setFound(null)
    setNote(null)
    setError(null)
    if (handle === user?.handle.toLowerCase()) {
      setError('That is you. You are already in this community.')
      return
    }
    setFinding(true)
    try {
      const { items } = await kaluta.people.search(handle)
      // Search is by prefix; only the exact handle is the person asked for.
      const match = items.find((p) => p.handle.toLowerCase() === handle)
      if (match) {
        setFound(match)
        setPicked('')
        setTyped('')
      } else setError('No one found with that handle. They may also have chosen not to be discoverable.')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'The search did not go through')
    } finally {
      setFinding(false)
    }
  }

  const run = async (mode: 'invite' | 'add') => {
    if (!target) return
    setBusy(true)
    setError(null)
    setNote(null)
    try {
      if (mode === 'invite') {
        await kaluta.communities.invite(communityId, target)
        setNote('Invitation sent. They can accept or decline it from their Communities page.')
      } else {
        const result = await kaluta.communities.add(communityId, target)
        setNote(result.already ? 'They are already in this community.' : 'Added to the community.')
      }
      setPicked('')
      setTyped('')
      setFound(null)
      setQuery('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That did not go through')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-card-sm border border-white/10 p-4">
      <h3 className="text-sm font-semibold text-text-hi">Invite someone</h3>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          void find()
        }}
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find by handle, e.g. @ada"
          aria-label="Find by handle"
          className="w-full rounded-full border border-white/10 bg-ink-2/60 px-4 py-2.5 text-sm text-text-hi placeholder:text-text-low focus:border-gold/40 focus:outline-none"
        />
        <button
          type="submit"
          disabled={query.trim().replace(/^@+/, '').length < 2 || finding}
          className="rounded-full border border-white/12 px-4 py-2 text-xs font-semibold text-text-mid hover:border-gold/40 hover:text-gold-soft disabled:opacity-40"
        >
          {finding ? 'Finding…' : 'Find'}
        </button>
      </form>
      {found && (
        <div className="mt-3 flex items-center gap-3 rounded-card-sm border border-gold/30 px-3 py-2">
          {found.avatar_url ? (
            <img src={found.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-2 text-xs font-bold text-text-mid">
              {found.display_name.slice(0, 1).toUpperCase()}
            </span>
          )}
          <p className="text-sm text-text-hi">
            {found.display_name} <span className="text-text-low">@{found.handle}</span>
          </p>
        </div>
      )}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        {accepted.length > 0 && (
          <select
            value={picked}
            onChange={(e) => {
              setPicked(e.target.value)
              setTyped('')
              setFound(null)
            }}
            aria-label="Pick a connection"
            className="w-full rounded-full border border-white/10 bg-ink-2/60 px-4 py-2.5 text-sm text-text-hi focus:border-gold/40 focus:outline-none"
          >
            <option value="">Pick a connection…</option>
            {accepted.map((c) => (
              <option key={c.user_id} value={c.user_id}>
                {c.profile?.display_name ?? c.user_id}
                {c.profile ? ` (@${c.profile.handle})` : ''}
              </option>
            ))}
          </select>
        )}
        <input
          value={typed}
          onChange={(e) => {
            setTyped(e.target.value)
            setFound(null)
          }}
          placeholder="…or a user id"
          aria-label="User id"
          className="w-full rounded-full border border-white/10 bg-ink-2/60 px-4 py-2.5 text-sm text-text-hi placeholder:text-text-low focus:border-gold/40 focus:outline-none"
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void run('invite')}
          disabled={!target || busy}
          className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-4 py-2 text-xs font-bold text-ink disabled:opacity-40"
        >
          Send invitation
        </button>
        <button
          type="button"
          onClick={() => void run('add')}
          disabled={!isConnection || busy}
          title={isConnection ? undefined : 'Only your accepted connections can be added directly'}
          className="rounded-full border border-white/12 px-4 py-2 text-xs font-semibold text-text-mid hover:border-gold/40 hover:text-gold-soft disabled:opacity-40"
        >
          Add directly
        </button>
      </div>
      {note && <p className="mt-3 text-sm text-gold-soft">{note}</p>}
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-200">
          {error}
        </p>
      )}
    </div>
  )
}
