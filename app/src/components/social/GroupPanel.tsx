import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Check, LogOut, Pencil, Search, ShieldCheck, UserPlus, X } from 'lucide-react'
import MemberAvatar from '@/components/social/MemberAvatar'
import { useAppTheme } from '@/components/appdemo/theme'
import { ApiError, kaluta, type Conversation, type GroupMember, type PersonBrief } from '@/lib/api'
import { cn } from '@/lib/utils'

/**
 * Everything about a group that is not a message.
 *
 * Who is in it, who runs it, what it is for, and the way out. The rules it
 * shows are the server's - a member sees the same list as an admin and simply
 * has no buttons on it, rather than seeing a tidier screen that hides what the
 * room is.
 */
export default function GroupPanel({
  conversation,
  meId,
  onClose,
  onChanged,
}: {
  conversation: Conversation
  /** Who is looking. Leaving needs an identity, not a role: two people can
   *  share a role and the first match is not necessarily you. */
  meId: string
  onClose: () => void
  /** The list and header are stale the moment anything here succeeds. */
  onChanged: () => void
}) {
  const { tok } = useAppTheme()
  const [members, setMembers] = useState<GroupMember[] | null>(null)
  /** How many are really in it, and whether there are more to fetch. */
  const [total, setTotal] = useState(0)
  const [more, setMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(conversation.title ?? '')
  const [description, setDescription] = useState(conversation.description ?? '')

  const [adding, setAdding] = useState(false)
  const [query, setQuery] = useState('')
  const [found, setFound] = useState<Array<PersonBrief & { user_id: string }>>([])

  const runs = conversation.my_role === 'owner' || conversation.my_role === 'admin'

  const load = useCallback(() => {
    kaluta.messages
      .participants(conversation.id)
      .then((page) => {
        setMembers(page.items)
        setTotal(page.total)
        setMore(page.has_more)
      })
      .catch(() => setMembers([]))
  }, [conversation.id])

  /** The next page. Admins are on the first one, so this is rarely needed. */
  const loadMore = () => {
    setLoadingMore(true)
    kaluta.messages
      .participants(conversation.id, members?.length ?? 0)
      .then((page) => {
        setMembers((current) => [...(current ?? []), ...page.items])
        setTotal(page.total)
        setMore(page.has_more)
      })
      .catch(() => setNote('Could not load more members'))
      .finally(() => setLoadingMore(false))
  }

  useEffect(load, [load])

  useEffect(() => {
    const text = query.trim()
    if (text.length < 2) {
      setFound([])
      return
    }
    // Debounced, and the people already in the room are filtered out: offering
    // to add somebody who is standing there is an offer that does nothing.
    const timer = window.setTimeout(() => {
      void kaluta.people
        .search(text, 8)
        .then((page) => {
          const present = new Set((members ?? []).map((m) => m.user_id))
          setFound(page.items.filter((p) => !present.has(p.user_id)))
        })
        .catch(() => setFound([]))
    }, 200)
    return () => window.clearTimeout(timer)
  }, [query, members])

  const run = async (key: string, action: () => Promise<unknown>, failure: string) => {
    setBusy(key)
    setNote(null)
    try {
      await action()
      load()
      onChanged()
    } catch (err) {
      setNote(err instanceof ApiError ? err.message : failure)
    } finally {
      setBusy(null)
    }
  }

  return (
    <aside
      aria-label="Group information"
      className={cn('flex min-h-0 w-full flex-col overflow-hidden', tok.card)}
    >
      <header className="flex items-center gap-2 border-b border-[var(--cloud-border)] px-4 py-3">
        <h2 className={cn('min-w-0 flex-1 truncate text-sm font-semibold', tok.text)}>
          Group information
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close group information"
          className={cn('rounded-full p-1.5 hover:bg-text-hi/[0.07]', tok.mid)}
        >
          <X size={16} aria-hidden="true" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {editing ? (
          <form
            onSubmit={(event) => {
              event.preventDefault()
              void run(
                'edit',
                async () => {
                  await kaluta.messages.editGroup(conversation.id, {
                    title: title.trim(),
                    description: description.trim(),
                  })
                  setEditing(false)
                },
                'Could not save the changes',
              )
            }}
            className="space-y-2"
          >
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={140}
              aria-label="Group name"
              placeholder="Group name"
              className={cn(
                'w-full rounded-xl border border-[var(--cloud-border)] bg-transparent px-3 py-2 text-sm',
                tok.text,
              )}
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              rows={3}
              aria-label="What this group is for"
              placeholder="What is this group for?"
              className={cn(
                'w-full resize-none rounded-xl border border-[var(--cloud-border)] bg-transparent px-3 py-2 text-sm',
                tok.text,
              )}
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={busy === 'edit' || !title.trim()}
                className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-4 py-1.5 text-xs font-bold text-ink disabled:opacity-50"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false)
                  setTitle(conversation.title ?? '')
                  setDescription(conversation.description ?? '')
                }}
                className={cn('rounded-full px-4 py-1.5 text-xs font-semibold', tok.mid)}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div>
            <div className="flex items-start gap-2">
              <h3 className={cn('min-w-0 flex-1 text-[1.05rem] font-bold', tok.text)}>
                {conversation.title ?? 'Group'}
              </h3>
              {runs && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  aria-label="Edit the group"
                  className={cn('shrink-0 rounded-full p-1.5 hover:bg-text-hi/[0.07]', tok.mid)}
                >
                  <Pencil size={14} aria-hidden="true" />
                </button>
              )}
            </div>
            <p className={cn('mt-1 whitespace-pre-wrap text-[0.85rem]', tok.low)}>
              {conversation.description || 'No description yet.'}
            </p>
          </div>
        )}

        <div className="mt-5 flex items-center justify-between gap-2">
          <h3 className={cn('text-[0.8rem] font-semibold', tok.low)}>
            {members ? `${total} ${total === 1 ? 'member' : 'members'}` : 'Members'}
          </h3>
          {runs && (
            <button
              type="button"
              onClick={() => setAdding((v) => !v)}
              aria-expanded={adding}
              className="inline-flex items-center gap-1.5 rounded-full border border-sky/50 px-3 py-1 text-xs font-semibold text-sky hover:bg-sky/10"
            >
              <UserPlus size={12} aria-hidden="true" />
              Add
            </button>
          )}
        </div>

        {adding && (
          <div className="mt-2">
            <label className="relative flex items-center">
              <Search size={14} className="pointer-events-none absolute start-3 text-text-low" aria-hidden="true" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name…"
                aria-label="Search for someone to add"
                autoFocus
                className={cn(
                  'w-full rounded-full border border-[var(--cloud-border)] bg-transparent py-2 pe-3 ps-9 text-sm',
                  tok.text,
                )}
              />
            </label>
            <ul className="mt-2 space-y-1">
              {found.map((person) => (
                <li key={person.user_id}>
                  <button
                    type="button"
                    disabled={busy === person.user_id}
                    onClick={() =>
                      void run(
                        person.user_id,
                        async () => {
                          await kaluta.messages.addMembers(conversation.id, [person.user_id])
                          setQuery('')
                        },
                        'Could not add them',
                      )
                    }
                    className="flex w-full items-center gap-2.5 rounded-xl p-2 text-start hover:bg-text-hi/[0.05]"
                  >
                    <MemberAvatar
                      handle={person.handle}
                      displayName={person.display_name}
                      avatarUrl={person.avatar_url}
                      size={32}
                    />
                    <span className={cn('min-w-0 flex-1 truncate text-sm', tok.text)}>
                      {person.display_name}
                    </span>
                    <UserPlus size={14} className="shrink-0 text-sky" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <ul className="mt-2 space-y-0.5">
          {(members ?? []).map((member) => (
            <li key={member.user_id} className="flex items-center gap-2.5 rounded-xl p-2">
              <MemberAvatar
                handle={member.handle ?? undefined}
                displayName={member.display_name}
                avatarUrl={member.avatar_url}
                size={38}
              />
              <span className="min-w-0 flex-1">
                <Link
                  to={member.handle ? `/u/${member.handle}` : '#'}
                  className={cn('block truncate text-sm font-semibold hover:underline', tok.text)}
                >
                  {member.display_name}
                </Link>
                {member.role !== 'member' && (
                  <span className="caption inline-flex items-center gap-1 text-gold-soft">
                    <ShieldCheck size={11} aria-hidden="true" />
                    {member.role === 'owner' ? 'Owner' : 'Admin'}
                  </span>
                )}
              </span>

              {/* An admin's controls, and only on somebody they may act on:
                  the owner is nobody's to demote or remove. */}
              {runs && member.role !== 'owner' && (
                <span className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    disabled={busy === member.user_id}
                    title={member.role === 'admin' ? 'Remove as admin' : 'Make admin'}
                    aria-label={
                      member.role === 'admin'
                        ? `Remove ${member.display_name} as admin`
                        : `Make ${member.display_name} an admin`
                    }
                    onClick={() =>
                      void run(
                        member.user_id,
                        () =>
                          kaluta.messages.setRole(
                            conversation.id,
                            member.user_id,
                            member.role === 'admin' ? 'member' : 'admin',
                          ),
                        'Could not change their role',
                      )
                    }
                    className={cn(
                      'rounded-full p-1.5 hover:bg-text-hi/[0.07]',
                      member.role === 'admin' ? 'text-gold-soft' : tok.low,
                    )}
                  >
                    <ShieldCheck size={14} aria-hidden="true" />
                  </button>
                  {/* Nobody is put out of the welcome group by somebody else;
                      the server refuses it, and offering the button anyway
                      would be an offer that always fails. */}
                  {!conversation.is_welcome && (
                    <button
                      type="button"
                      disabled={busy === member.user_id}
                      title="Remove from the group"
                      aria-label={`Remove ${member.display_name}`}
                      onClick={() =>
                        void run(
                          member.user_id,
                          () => kaluta.messages.removeMember(conversation.id, member.user_id),
                          'Could not remove them',
                        )
                      }
                      className={cn('rounded-full p-1.5 hover:bg-text-hi/[0.07]', tok.low)}
                    >
                      <X size={14} aria-hidden="true" />
                    </button>
                  )}
                </span>
              )}
            </li>
          ))}
        </ul>

        {more && (
          <button
            type="button"
            disabled={loadingMore}
            onClick={loadMore}
            className={cn(
              'mt-2 w-full rounded-xl border border-[var(--cloud-border)] px-4 py-2 text-sm font-semibold',
              tok.text,
              tok.hoverBg,
            )}
          >
            {loadingMore ? 'Loading…' : `Show more (${total - (members?.length ?? 0)} left)`}
          </button>
        )}

        {note && <p className="mt-3 text-xs text-amber-200">{note}</p>}
      </div>

      <footer className="border-t border-[var(--cloud-border)] p-3">
        <button
          type="button"
          disabled={busy === 'leave'}
          onClick={() =>
            void run(
              'leave',
              async () => {
                await kaluta.messages.removeMember(conversation.id, meId)
                onClose()
              },
              'Could not leave the group',
            )
          }
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--cloud-border)] px-4 py-2 text-sm font-semibold text-text-mid hover:border-red-400/40 hover:text-red-300"
        >
          <LogOut size={14} aria-hidden="true" />
          Leave this group
        </button>
      </footer>
    </aside>
  )
}

/** The dialog that makes one: a name, what it is for, and who is in it. */
export function NewGroupDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (conversationId: string) => void
}) {
  const { tok } = useAppTheme()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [query, setQuery] = useState('')
  const [found, setFound] = useState<Array<PersonBrief & { user_id: string }>>([])
  const [chosen, setChosen] = useState<Array<PersonBrief & { user_id: string }>>([])
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => {
    const text = query.trim()
    if (text.length < 2) {
      setFound([])
      return
    }
    const timer = window.setTimeout(() => {
      void kaluta.people
        .search(text, 8)
        .then((page) => {
          const picked = new Set(chosen.map((p) => p.user_id))
          setFound(page.items.filter((p) => !picked.has(p.user_id)))
        })
        .catch(() => setFound([]))
    }, 200)
    return () => window.clearTimeout(timer)
  }, [query, chosen])

  const create = async () => {
    setBusy(true)
    setNote(null)
    try {
      const group = await kaluta.messages.createGroup({
        title: title.trim(),
        description: description.trim() || undefined,
        participantIds: chosen.map((p) => p.user_id),
      })
      onCreated(group.id)
    } catch (err) {
      setNote(err instanceof ApiError ? err.message : 'Could not create the group')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="New group"
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className={cn('max-h-[80svh] w-full max-w-md overflow-hidden rounded-2xl', tok.card)}
      >
        <header className="flex items-center justify-between gap-2 border-b border-[var(--cloud-border)] px-4 py-3">
          <h2 className={cn('text-sm font-semibold', tok.text)}>New group</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={cn('rounded-full p-1.5 hover:bg-text-hi/[0.07]', tok.mid)}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </header>

        <div className="max-h-[calc(80svh-128px)] space-y-3 overflow-y-auto p-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={140}
            autoFocus
            aria-label="Group name"
            placeholder="Group name"
            className={cn(
              'w-full rounded-xl border border-[var(--cloud-border)] bg-transparent px-3 py-2 text-sm',
              tok.text,
            )}
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
            rows={2}
            aria-label="What this group is for"
            placeholder="What is this group for? (optional)"
            className={cn(
              'w-full resize-none rounded-xl border border-[var(--cloud-border)] bg-transparent px-3 py-2 text-sm',
              tok.text,
            )}
          />

          {chosen.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {chosen.map((person) => (
                <li key={person.user_id}>
                  <button
                    type="button"
                    onClick={() => setChosen((c) => c.filter((p) => p.user_id !== person.user_id))}
                    className="inline-flex items-center gap-1.5 rounded-full bg-text-hi/[0.07] px-2.5 py-1 text-xs"
                  >
                    <span className={tok.text}>{person.display_name}</span>
                    <X size={11} aria-hidden="true" className={tok.low} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <label className="relative flex items-center">
            <Search size={14} className="pointer-events-none absolute start-3 text-text-low" aria-hidden="true" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Add people by name…"
              aria-label="Search for people to add"
              className={cn(
                'w-full rounded-full border border-[var(--cloud-border)] bg-transparent py-2 pe-3 ps-9 text-sm',
                tok.text,
              )}
            />
          </label>

          <ul className="space-y-1">
            {found.map((person) => (
              <li key={person.user_id}>
                <button
                  type="button"
                  onClick={() => {
                    setChosen((c) => [...c, person])
                    setQuery('')
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl p-2 text-start hover:bg-text-hi/[0.05]"
                >
                  <MemberAvatar
                    handle={person.handle}
                    displayName={person.display_name}
                    avatarUrl={person.avatar_url}
                    size={32}
                  />
                  <span className={cn('min-w-0 flex-1 truncate text-sm', tok.text)}>
                    {person.display_name}
                  </span>
                  <Check size={14} className="shrink-0 text-sky" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>

          {note && <p className="text-xs text-amber-200">{note}</p>}
          {/* Said before they find out by being refused: the server only lets
              you add people who accept messages from you. */}
          <p className={cn('text-[0.7rem]', tok.low)}>
            You can add people who accept messages from you. A group is stored
            encrypted but is not end-to-end — three people cannot share one key.
          </p>
        </div>

        <footer className="flex justify-end gap-2 border-t border-[var(--cloud-border)] px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className={cn('rounded-full px-4 py-2 text-sm font-semibold', tok.mid)}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || !title.trim() || chosen.length === 0}
            onClick={() => void create()}
            className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-5 py-2 text-sm font-bold text-ink disabled:opacity-50"
          >
            Create
          </button>
        </footer>
      </div>
    </div>
  )
}
