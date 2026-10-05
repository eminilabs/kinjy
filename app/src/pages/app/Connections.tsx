import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Check, MessageCircle, UserMinus, X } from 'lucide-react'
import AppShell from '@/components/app/AppShell'
import MemberAvatar from '@/components/social/MemberAvatar'
import { useApi } from '@/hooks/useApi'
import { ApiError, kaluta, type ConnectionEntry } from '@/lib/api'
import { announce, onChange } from '@/lib/live'
import { cn } from '@/lib/utils'

type Tab = 'incoming' | 'outgoing' | 'accepted'

const TABS: Array<{ id: Tab; label: string; empty: string }> = [
  { id: 'incoming', label: 'Received', empty: 'No invitations waiting for you.' },
  { id: 'outgoing', label: 'Sent', empty: 'You have no invitations waiting for an answer.' },
  { id: 'accepted', label: 'Connections', empty: 'No connections yet. Invite someone from their profile.' },
]

const isTab = (value: string | null): value is Tab => TABS.some((t) => t.id === value)

/**
 * Everything about the people you are connected to, in one place.
 *
 * A connection is mutual — an accepted invitation — and it is what opens
 * messaging. That made it worth a page of its own rather than a panel buried in
 * the dashboard's privacy tab, which only showed the lists without letting you
 * cancel an invitation or end a connection. Who may invite you stays a privacy
 * setting, so this page links there instead of repeating it.
 */
export default function Connections() {
  const connections = useApi(() => kaluta.connections.list(), [])
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  // A row stays disabled until the refreshed lists arrive — not merely until
  // the request returns — so a second click cannot answer an invitation twice.
  const [pending, setPending] = useState<{ userId: string; data: unknown } | null>(null)
  const busy = pending && pending.data === connections.data ? pending.userId : null
  const [error, setError] = useState<string | null>(null)

  const requested = params.get('tab')
  const incoming = connections.data?.incoming ?? []
  // Land on what needs an answer; otherwise on the connections themselves.
  const tab: Tab = isTab(requested) ? requested : incoming.length > 0 ? 'incoming' : 'accepted'

  useEffect(() => onChange('connections', connections.reload), [connections.reload])

  const run = async (entry: ConnectionEntry, action: () => Promise<unknown>, failure: string) => {
    setPending({ userId: entry.user_id, data: connections.data })
    setError(null)
    try {
      await action()
      announce('connections')
      // Counts elsewhere (the top bar, the profile card) read the profile topic.
      announce('profile')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : failure)
      setPending(null)
    }
  }

  const message = async (entry: ConnectionEntry) => {
    setPending({ userId: entry.user_id, data: connections.data })
    setError(null)
    try {
      const conversation = await kaluta.messages.start([entry.user_id])
      navigate(`/messages?c=${conversation.id}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not open a conversation')
      setPending(null)
    }
  }

  const remove = (entry: ConnectionEntry) => {
    const name = entry.profile?.display_name ?? 'this person'
    if (!window.confirm(`Remove ${name} from your connections? You will no longer be able to message each other.`)) return
    void run(entry, () => kaluta.connections.remove(entry.user_id), 'Could not remove the connection')
  }

  const actionsFor = (entry: ConnectionEntry) => {
    const disabled = busy === entry.user_id
    const name = entry.profile?.display_name ?? 'this person'
    if (tab === 'incoming') {
      return (
        <>
          <IconButton
            label={`Accept ${name}`}
            disabled={disabled}
            tone="good"
            onClick={() => run(entry, () => kaluta.connections.respond(entry.user_id, true), 'Could not accept')}
          >
            <Check size={14} />
          </IconButton>
          <IconButton
            label={`Decline ${name}`}
            disabled={disabled}
            tone="bad"
            onClick={() => run(entry, () => kaluta.connections.respond(entry.user_id, false), 'Could not decline')}
          >
            <X size={14} />
          </IconButton>
        </>
      )
    }
    if (tab === 'outgoing') {
      return (
        <button
          type="button"
          disabled={disabled}
          onClick={() => run(entry, () => kaluta.connections.remove(entry.user_id), 'Could not cancel the invitation')}
          className="rounded-full border border-white/12 px-3 py-1.5 text-xs font-semibold text-text-mid hover:border-red-400/40 hover:text-red-200 disabled:opacity-40"
        >
          Cancel
        </button>
      )
    }
    return (
      <>
        <IconButton label={`Message ${name}`} disabled={disabled} tone="neutral" onClick={() => message(entry)}>
          <MessageCircle size={14} />
        </IconButton>
        <IconButton label={`Remove ${name}`} disabled={disabled} tone="bad" onClick={() => remove(entry)}>
          <UserMinus size={14} />
        </IconButton>
      </>
    )
  }

  const current = TABS.find((t) => t.id === tab)!
  const rows = connections.data?.[tab] ?? []

  return (
    <AppShell
      title="Connections"
      subtitle="People you are connected to. A connection is mutual, and it is what opens messaging between you."
    >
      {connections.data && (
        <div role="group" aria-label="Show" className="flex flex-wrap gap-2">
          {TABS.map((t) => {
            const count = connections.data[t.id].length
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={tab === t.id}
                onClick={() => setParams({ tab: t.id }, { replace: true })}
                className={cn(
                  'rounded-full border px-3.5 py-1.5 text-xs font-semibold',
                  tab === t.id
                    ? 'border-gold/50 bg-gold/10 text-gold-soft'
                    : 'border-white/12 text-text-mid hover:text-text-hi',
                )}
              >
                {t.label} <span className="mono-data">{count}</span>
              </button>
            )
          })}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-200">
          {error}
        </p>
      )}

      <div className="mt-5">
        {connections.loading && <p className="text-sm text-text-low">Loading your connections…</p>}
        {connections.error && <p className="text-sm text-amber-200">{connections.error}</p>}
        {connections.data && rows.length === 0 && <p className="text-sm text-text-low">{current.empty}</p>}
        <ul className="grid gap-3 sm:grid-cols-2">
          {rows.map((entry) => (
            <li key={entry.id} className="cloud-card flex items-center gap-3 p-4">
              <MemberAvatar
                handle={entry.profile?.handle}
                displayName={entry.profile?.display_name}
                avatarUrl={entry.profile?.avatar_url}
                size={40}
              />
              <div className="min-w-0">
                {entry.profile ? (
                  <Link
                    to={`/u/${entry.profile.handle}`}
                    className="block truncate text-sm font-semibold text-text-hi hover:text-gold-soft"
                  >
                    {entry.profile.display_name}
                  </Link>
                ) : (
                  <p className="truncate text-sm font-semibold text-text-hi">Unknown member</p>
                )}
                {entry.profile && <p className="caption truncate">@{entry.profile.handle}</p>}
                {tab === 'incoming' && entry.message && (
                  <p className="mt-1 line-clamp-2 text-xs text-text-mid">“{entry.message}”</p>
                )}
              </div>
              <div className="ms-auto flex shrink-0 gap-1">{actionsFor(entry)}</div>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-8 text-xs text-text-low">
        Choose who can send you an invitation in{' '}
        <Link to="/dashboard?tab=privacy" className="text-gold-soft hover:underline">
          your privacy settings
        </Link>
        .
      </p>
    </AppShell>
  )
}

const TONES = {
  good: 'border-emerald-400/40 text-emerald-300 hover:bg-emerald-400/10',
  bad: 'border-white/12 text-text-mid hover:border-red-400/40 hover:text-red-200',
  neutral: 'border-white/12 text-text-mid hover:border-gold/40 hover:text-gold-soft',
} as const

function IconButton({
  label,
  tone,
  disabled,
  onClick,
  children,
}: {
  label: string
  tone: keyof typeof TONES
  disabled: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn('rounded-full border p-2 disabled:opacity-40', TONES[tone])}
    >
      {children}
    </button>
  )
}
