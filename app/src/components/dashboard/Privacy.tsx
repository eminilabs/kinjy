import { useEffect, useState } from 'react'
import { Check, Eye, MessageSquare, Sparkles, TreeDeciduous, UserPlus, UsersRound, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { ApiError, kaluta, type ConnectionEntry } from '@/lib/api'
import { announce, onChange } from '@/lib/live'
import { Badge, Panel, PanelState } from './primitives'
import { cn } from '@/lib/utils'
import MemberAvatar from '@/components/social/MemberAvatar'

const CHOICES = [
  { id: 'everyone', label: 'Anyone' },
  { id: 'connections', label: 'Connections only' },
  { id: 'nobody', label: 'No one' },
] as const

interface Control {
  key: string
  icon: LucideIcon
  title: string
  hint: string
  /** Defaults to CHOICES. The family tree asks a different question. */
  choices?: ReadonlyArray<{ id: string; label: string }>
  fallback?: string
}

/** Who may read your family tree. "No one" is not offered here — closing the
 *  tree entirely is the separate switch below, so the two are not confused. */
const FAMILY_CHOICES = [
  { id: 'family', label: 'Your family' },
  { id: 'connections', label: 'Connections' },
  { id: 'everyone', label: 'Anyone' },
] as const

const CONTROLS: Control[] = [
  {
    key: 'who_can_invite',
    icon: UserPlus,
    title: 'Send you a connection invitation',
    hint: 'Following you is always open — following is one-way and public.',
  },
  {
    key: 'who_can_message',
    icon: MessageSquare,
    title: 'Message you',
    hint: 'Enforced by messaging-service, not just hidden in the UI.',
  },
  {
    key: 'who_can_add_family',
    icon: TreeDeciduous,
    title: 'Add you to a family tree',
    hint: 'A relationship claim still needs your confirmation on top of this.',
  },
  {
    key: 'who_can_add_community',
    icon: UsersRound,
    title: 'Add you to a community',
    hint: 'Stops someone dropping you into a group you never asked for.',
  },
  {
    key: 'who_can_see_family',
    icon: TreeDeciduous,
    title: 'See your family tree',
    hint: 'Applied by family-service on every read — names, dates and relationships, including the dead. "Your family" means people who share the graph with you.',
    choices: FAMILY_CHOICES,
    fallback: 'family',
  },
]

/**
 * Privacy — who may reach you, and the invitations waiting on you.
 *
 * The two belong on one screen: a pending invitation is only meaningful next to
 * the rule that decides what accepting it would unlock.
 */
export default function Privacy() {
  const prefs = useApi<Record<string, unknown>>(() => kaluta.account.preferences(), [])
  const connections = useApi(() => kaluta.connections.list(), [])
  const [saving, setSaving] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => onChange('connections', connections.reload), [connections.reload])

  const set = async (key: string, value: string | boolean) => {
    setSaving(key)
    setNote(null)
    try {
      await kaluta.account.setPreferences({ [key]: value })
      prefs.reload()
      // The assistant orb lives outside this tree; tell it to re-read.
      if (key === 'assistant_visible') announce('profile')
    } catch (err) {
      setNote(err instanceof ApiError ? err.message : 'Could not save that setting')
    } finally {
      setSaving(null)
    }
  }

  const respond = async (entry: ConnectionEntry, accept: boolean) => {
    setBusy(entry.user_id)
    setNote(null)
    try {
      await kaluta.connections.respond(entry.user_id, accept)
      connections.reload()
      announce('profile')
      setNote(
        accept
          ? `Connected with ${entry.profile?.display_name ?? 'them'}. You can now message each other.`
          : 'Invitation declined.',
      )
    } catch (err) {
      setNote(err instanceof ApiError ? err.message : 'Could not answer the invitation')
    } finally {
      setBusy(null)
    }
  }

  const incoming = connections.data?.incoming ?? []
  const outgoing = connections.data?.outgoing ?? []
  const accepted = connections.data?.accepted ?? []

  const Person = ({ entry, children }: { entry: ConnectionEntry; children?: React.ReactNode }) => (
    <li className="flex items-center gap-2.5 rounded-card-sm border border-white/8 bg-ink-2/40 p-3">
      <MemberAvatar
        handle={entry.profile?.handle}
        displayName={entry.profile?.display_name}
        avatarUrl={entry.profile?.avatar_url}
        size={32}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text-hi">
          {entry.profile?.display_name ?? entry.user_id.slice(0, 12)}
        </p>
        {entry.message && <p className="caption truncate">“{entry.message}”</p>}
      </div>
      {children}
    </li>
  )

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel
        title="Who can reach you"
        subtitle="Following is always open. Everything below is your call."
      >
        <PanelState loading={prefs.loading} error={prefs.error}>
          <ul className="space-y-4">
            {CONTROLS.map((control) => {
              const value = String(prefs.data?.[control.key] ?? control.fallback ?? 'connections')
              const choices = control.choices ?? CHOICES
              return (
                <li key={control.key}>
                  <p className="flex items-center gap-2 text-sm font-medium text-text-hi">
                    <control.icon size={14} className="shrink-0 text-gold" aria-hidden="true" />
                    {control.title}
                    {saving === control.key && <span className="caption">saving…</span>}
                  </p>
                  <p className="caption mt-0.5 ps-6">{control.hint}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5 ps-6">
                    {choices.map((choice) => (
                      <button
                        key={choice.id}
                        type="button"
                        onClick={() => set(control.key, choice.id)}
                        aria-pressed={value === choice.id}
                        className={cn(
                          'rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                          value === choice.id
                            ? 'border-gold/50 bg-gold/10 text-gold-soft'
                            : 'border-white/12 text-text-mid hover:text-text-hi',
                        )}
                      >
                        {choice.label}
                      </button>
                    ))}
                  </div>
                </li>
              )
            })}

            <li className="border-t border-white/8 pt-4">
              <label className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={Boolean(prefs.data?.assistant_visible ?? true)}
                  onChange={(e) => set('assistant_visible', e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  <span className="flex items-center gap-2 text-sm font-medium text-text-hi">
                    <Sparkles size={14} className="text-gold" aria-hidden="true" />
                    Show the Kinjy Assistant
                  </span>
                  <span className="caption mt-0.5 block">
                    The floating orb. Turning it off hides it everywhere — it is always-on-top UI,
                    so dismissing it should be a real setting, not a close button that comes back.
                  </span>
                </span>
              </label>
            </li>

            <li className="border-t border-white/8 pt-4">
              <label className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={Boolean(prefs.data?.discoverable ?? true)}
                  onChange={(e) => set('discoverable', e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  <span className="flex items-center gap-2 text-sm font-medium text-text-hi">
                    <Eye size={14} className="text-gold" aria-hidden="true" />
                    Suggest me to other members
                  </span>
                  <span className="caption mt-0.5 block">
                    Turning this off keeps you out of the “People to follow” rail. It does not hide
                    your posts — visibility per post is set when you publish.
                  </span>
                </span>
              </label>
            </li>

            <li className="border-t border-white/8 pt-4">
              <label className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={Boolean(prefs.data?.family_tree_shared ?? true)}
                  onChange={(e) => set('family_tree_shared', e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  <span className="flex items-center gap-2 text-sm font-medium text-text-hi">
                    <TreeDeciduous size={14} className="text-gold" aria-hidden="true" />
                    Share your family tree at all
                  </span>
                  <span className="caption mt-0.5 block">
                    Turning this off closes the tree to everyone regardless of the audience above,
                    without losing the choice you made there. You always keep full access to the
                    people you added yourself.
                  </span>
                </span>
              </label>
            </li>
          </ul>
        </PanelState>
      </Panel>

      <div className="space-y-5">
        <Panel
          title="Invitations"
          subtitle="Accepting is what opens messaging, family links and community invites."
          action={incoming.length > 0 ? <Badge tone="warn">{incoming.length} waiting</Badge> : undefined}
        >
          <PanelState
            loading={connections.loading}
            error={connections.error}
            empty={incoming.length === 0 && outgoing.length === 0}
            emptyLabel="No invitations right now."
          >
            {incoming.length > 0 && (
              <>
                <p className="caption mb-2">Waiting for you</p>
                <ul className="space-y-2">
                  {incoming.map((entry) => (
                    <Person key={entry.id} entry={entry}>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => respond(entry, true)}
                          disabled={busy === entry.user_id}
                          aria-label="Accept"
                          className="rounded-full border border-emerald-400/40 p-1.5 text-emerald-300 transition-colors hover:bg-emerald-400/10 disabled:opacity-40"
                        >
                          <Check size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => respond(entry, false)}
                          disabled={busy === entry.user_id}
                          aria-label="Decline"
                          className="rounded-full border border-white/12 p-1.5 text-text-mid transition-colors hover:border-red-400/40 hover:text-red-200 disabled:opacity-40"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </Person>
                  ))}
                </ul>
              </>
            )}

            {outgoing.length > 0 && (
              <>
                <p className="caption mb-2 mt-4">Sent by you</p>
                <ul className="space-y-2">
                  {outgoing.map((entry) => (
                    <Person key={entry.id} entry={entry}>
                      <Badge tone="neutral">Pending</Badge>
                    </Person>
                  ))}
                </ul>
              </>
            )}
          </PanelState>
        </Panel>

        <Panel title="Your connections" subtitle={`${accepted.length} accepted`}>
          <PanelState
            loading={connections.loading}
            error={connections.error}
            empty={accepted.length === 0}
            emptyLabel="No connections yet. Invite someone from the feed's suggestions."
          >
            <ul className="space-y-2">
              {accepted.map((entry) => (
                <Person key={entry.id} entry={entry}>
                  <Badge tone="good">Connected</Badge>
                </Person>
              ))}
            </ul>
          </PanelState>
        </Panel>
      </div>

      {note && <p className="text-sm text-gold-soft lg:col-span-2">{note}</p>}
    </div>
  )
}
