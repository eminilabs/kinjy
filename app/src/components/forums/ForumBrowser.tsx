import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, Copy, Lock, MessageSquarePlus, Pin, Plus } from 'lucide-react'
import RoleBadge from '@/components/community/RoleBadge'
import ForumPanel, { type ForumAction } from '@/components/forums/ForumPanel'
import ForumTree from '@/components/forums/ForumTree'
import KnowledgePanel from '@/components/forums/KnowledgePanel'
import MembershipFilter, { type Membership } from '@/components/forums/MembershipFilter'
import SubForumForm from '@/components/forums/SubForumForm'
import ThreadView from '@/components/forums/ThreadView'
import { ApiError, kaluta, type Forum, type Thread, type ThreadDetail } from '@/lib/api'
import { cn } from '@/lib/utils'

const field =
  'w-full rounded-card-sm border border-white/10 bg-ink-2/60 px-3 py-2 text-sm text-text-hi placeholder:text-text-low focus:border-gold/40 focus:outline-none'

const isSteward = (role: string | null | undefined) => role === 'owner' || role === 'moderator'

interface Props {
  /** Scope the list and the new forums to one community; omit for every top-level forum. */
  communityId?: string
  /** Allow the "create a forum" form. Defaults to on only when not scoped. */
  canCreateForum?: boolean
  /** Scoped view only: the viewer is the community's owner or a moderator. */
  isSteward?: boolean
  /**
   * The create-a-forum form is shown here, but the button that opens it belongs
   * to the page around the browser (the community header, or the Forums page).
   */
  createOpen?: boolean
  onCreateOpenChange?: (open: boolean) => void
}

const toggleButton = (on: boolean) =>
  cn(
    'inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
    on ? 'border-gold/50 bg-gold/10 text-gold-soft' : 'border-white/12 text-text-mid hover:border-gold/40 hover:text-text-hi',
  )

/**
 * Forum list, forum panel, thread list and thread view in one place, shared by
 * the Forums page (unscoped, grouped by membership) and a community page (scoped).
 */
export default function ForumBrowser({
  communityId,
  canCreateForum,
  isSteward: stewardProp,
  createOpen = false,
  onCreateOpenChange,
}: Props) {
  const scoped = Boolean(communityId)
  const allowCreate = canCreateForum ?? !scoped
  // At most one of the forum's forms is open at a time, and never together with the create form.
  const [panel, setPanel] = useState<ForumAction | null>(null)
  const [showList, setShowList] = useState(false)
  const [filter, setFilter] = useState<Membership>('all')
  // Forums walked through via the sub-forum list, so the panel can offer a way back up.
  const [trail, setTrail] = useState<Forum[]>([])
  // Unscoped view: each community's forum_creation rule, fetched when one of its forums is selected.
  const [rules, setRules] = useState<Record<string, 'members' | 'stewards'>>({})

  const [forums, setForums] = useState<Forum[]>([])
  const [forum, setForum] = useState<Forum | null>(null)
  const [threads, setThreads] = useState<Thread[]>([])
  const [open, setOpen] = useState<ThreadDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refresh, setRefresh] = useState<{ id: string; n: number } | null>(null)

  const [forumName, setForumName] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  const forumId = forum?.id ?? null

  const closeCreate = useCallback(() => onCreateOpenChange?.(false), [onCreateOpenChange])

  useEffect(() => {
    if (createOpen) setPanel(null)
  }, [createOpen])

  const togglePanel = (next: ForumAction) => {
    setOpen(null)
    closeCreate()
    setPanel((prev) => (prev === next ? null : next))
  }

  const loadForums = useCallback(async () => {
    try {
      const result = await kaluta.forums.list(communityId ? { community_id: communityId } : {})
      setForums(result.items)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load forums')
    }
  }, [communityId])

  const loadThreads = useCallback(async (id: string) => {
    try {
      const result = await kaluta.forums.threads(id)
      setThreads(result.items)
    } catch (err) {
      // 403/404 mean the forum's door is closed to this reader: say so rather
      // than leaving the previous forum's threads on screen.
      setThreads([])
      setError(err instanceof ApiError ? err.message : 'Could not load threads')
    }
  }, [])

  const selectForum = useCallback(
    (next: Forum, nextTrail: Forum[] = []) => {
      setForum(next)
      setTrail(nextTrail)
      setPanel(null)
      setOpen(null)
      setError(null)
      setThreads([])
      setShowList(false)
      closeCreate()
      void loadThreads(next.id)
    },
    [loadThreads, closeCreate],
  )

  useEffect(() => {
    void loadForums()
  }, [loadForums])

  const createForum = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!forumName.trim()) return
    setError(null)
    try {
      await kaluta.forums.create({ name: forumName.trim(), ...(communityId ? { community_id: communityId } : {}) })
      setForumName('')
      closeCreate()
      await loadForums()
      setShowList(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the forum')
    }
  }

  const createThread = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!forumId || !title.trim() || !body.trim()) return
    setError(null)
    try {
      await kaluta.forums.createThread(forumId, { title: title.trim(), body: body.trim() })
      setTitle('')
      setBody('')
      setPanel(null)
      void loadThreads(forumId)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not post the thread')
    }
  }

  const openThread = useCallback(async (threadId: string) => {
    setError(null)
    try {
      setOpen(await kaluta.forums.thread(threadId))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not open the thread')
    }
  }, [])

  // After a moderation or reply action: the thread and the list behind it both
  // change (pin order, reply counts, duplicate badge).
  const reloadOpen = async () => {
    if (!open) return
    setError(null)
    setOpen(await kaluta.forums.thread(open.id))
    if (forumId) await loadThreads(forumId)
  }

  const onSubForumCreated = (parentId: string) => {
    setRefresh((prev) => ({ id: parentId, n: (prev?.n ?? 0) + 1 }))
  }

  // Unscoped view: forums of communities I belong to, grouped by community,
  // then everything else. Scoped view needs no grouping.
  const groups = useMemo(() => {
    if (scoped) return null
    const mine = new Map<string, { community: NonNullable<Forum['community']>; forums: Forum[] }>()
    const other: Forum[] = []
    let mineCount = 0
    for (const item of forums) {
      if (item.community?.my_status === 'active') {
        const group = mine.get(item.community.id) ?? { community: item.community, forums: [] }
        group.forums.push(item)
        mine.set(item.community.id, group)
        mineCount += 1
      } else {
        other.push(item)
      }
    }
    return { mine: [...mine.values()], other, counts: { all: forums.length, mine: mineCount, others: other.length } }
  }, [forums, scoped])

  const otherMeta = (item: Forum) => {
    if (!item.community) return null
    const closed = item.community.kind !== 'public'
    return (
      <span className="mt-1 flex flex-wrap items-center gap-1">
        <span className="max-w-full truncate text-[11px] text-text-mid">{item.community.name}</span>
        {closed && <Lock size={10} className="text-text-low" aria-label="Members only" />}
        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-text-low">
          Not a member
        </span>
      </span>
    )
  }

  const tree = (roots: Forum[], renderMeta?: (item: Forum) => React.ReactNode) => (
    <ForumTree
      roots={roots}
      selectedId={forumId}
      onSelect={(next) => selectForum(next)}
      refresh={refresh}
      onError={setError}
      renderMeta={renderMeta}
    />
  )

  const forumCommunity = forum?.community ?? null
  const forumCommunityId = !scoped && forumCommunity?.my_status === 'active' ? forumCommunity.id : null
  const hasRule = forumCommunityId ? forumCommunityId in rules : true

  useEffect(() => {
    if (!forumCommunityId || hasRule) return
    let cancelled = false
    kaluta.communities
      .get(forumCommunityId)
      .then((c) => {
        if (!cancelled) setRules((prev) => ({ ...prev, [forumCommunityId]: c.forum_creation }))
      })
      .catch(() => {
        // Unknown rule: fall back to stewards only, the safe side.
        if (!cancelled) setRules((prev) => ({ ...prev, [forumCommunityId]: 'stewards' }))
      })
    return () => {
      cancelled = true
    }
  }, [forumCommunityId, hasRule])

  const steward = scoped ? Boolean(stewardProp) : isSteward(forumCommunity?.my_role)
  const canAddSub = !forum
    ? false
    : scoped
      ? allowCreate
      : !forumCommunity || steward || (forumCommunityId !== null && rules[forumCommunityId] === 'members')
  // Show the "stewards only" note once the rule is known (never while still loading).
  const subBlocked =
    Boolean(forum) && !canAddSub && (scoped ? true : forumCommunityId !== null && hasRule)

  const parent = trail.length > 0 ? trail[trail.length - 1] : null

  return (
    <>
      <div className="space-y-4">
        {allowCreate && createOpen && (
          <form onSubmit={createForum} className="cloud-card p-4">
            <label className="caption mb-1.5 block" htmlFor={`forum-name-${communityId ?? 'all'}`}>
              {scoped ? 'Create a forum' : 'Open a forum'}
            </label>
            <div className="flex gap-2">
              <input
                id={`forum-name-${communityId ?? 'all'}`}
                value={forumName}
                onChange={(e) => setForumName(e.target.value)}
                placeholder="Cassava growers"
                className={field}
              />
              <button
                type="submit"
                disabled={!forumName.trim()}
                aria-label="Create forum"
                className="shrink-0 rounded-full bg-white/8 px-3 text-text-mid disabled:opacity-40"
              >
                <Plus size={14} />
              </button>
              <button
                type="button"
                onClick={closeCreate}
                className="shrink-0 rounded-full border border-white/12 px-3 text-sm font-semibold text-text-mid hover:text-text-hi"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div>
          <button
            type="button"
            aria-expanded={showList}
            onClick={() => setShowList((v) => !v)}
            className={toggleButton(showList)}
          >
            <ChevronDown size={14} className={cn('transition-transform', showList && 'rotate-180')} aria-hidden="true" />
            Forums ({forums.length})
          </button>
        </div>

        {/* Hidden rather than unmounted, so expanded branches survive closing the list. */}
        <div hidden={!showList}>
          <section aria-label="Forums" className="cloud-card space-y-4 p-4">
            {groups ? (
              <>
                <MembershipFilter value={filter} onChange={setFilter} counts={groups.counts} />
                {filter !== 'others' && (
                  <section aria-label="My communities" className="space-y-3">
                    <h2 className="caption font-semibold uppercase tracking-wide">My communities</h2>
                    {groups.mine.length === 0 && (
                      <p className="text-sm text-text-low">Forums of the communities you join appear here.</p>
                    )}
                    {groups.mine.map((group) => (
                      <div key={group.community.id} className="space-y-1.5">
                        <p className="flex items-center gap-2 text-sm font-semibold text-text-hi">
                          <span className="min-w-0 truncate">{group.community.name}</span>
                          <RoleBadge role={group.community.my_role} status={group.community.my_status} />
                        </p>
                        {tree(group.forums)}
                      </div>
                    ))}
                  </section>
                )}
                {filter !== 'mine' && (
                  <section aria-label="Other forums" className="space-y-1.5">
                    <h2 className="caption font-semibold uppercase tracking-wide">Other forums</h2>
                    {tree(groups.other, otherMeta)}
                  </section>
                )}
              </>
            ) : (
              tree(forums)
            )}
          </section>
        </div>

        {!forum && !showList && (
          <p className="text-sm text-text-low">
            Open the forum list and pick a forum{allowCreate ? (scoped ? ', or create one' : ', or open one') : ''}.
          </p>
        )}

        {forum && (
          <ForumPanel
            key={forum.id}
            forum={forum}
            action={panel}
            onToggle={togglePanel}
            canAddSub={canAddSub}
            blockedNote={
              subBlocked ? (
                <p className="text-sm text-text-low">Only the owner and moderators can add sub-forums here</p>
              ) : undefined
            }
            subsRefresh={refresh?.id === forum.id ? refresh.n : 0}
            onSelectSub={(sub) => selectForum(sub, [...trail, forum])}
            back={parent ? { name: parent.name, onBack: () => selectForum(parent, trail.slice(0, -1)) } : undefined}
            showCommunity={!scoped}
            onError={setError}
          >
            {canAddSub && panel === 'sub' && (
              <SubForumForm
                key={forum.id}
                parent={forum}
                onCreated={onSubForumCreated}
                onClose={() => setPanel(null)}
                canOpenToAll={steward}
              />
            )}

            {panel === 'knowledge' && (
              <KnowledgePanel
                key={forum.id}
                forumId={forum.id}
                onOpenThread={(id) => {
                  setPanel(null)
                  void openThread(id)
                }}
                onError={setError}
              />
            )}

            {panel === 'thread' && (
              <form onSubmit={createThread} className="cloud-card p-5">
                <h2 className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-text-hi">
                  <MessageSquarePlus size={15} className="text-gold" aria-hidden="true" />
                  Start a thread
                </h2>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Title"
                  className={field}
                />
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={3}
                  placeholder="What do you want to discuss?"
                  className={cn(field, 'mt-2 resize-none')}
                />
                <button
                  type="submit"
                  disabled={!title.trim() || !body.trim()}
                  className="mt-3 rounded-full bg-gradient-to-br from-gold-soft to-gold px-5 py-2 text-sm font-bold text-ink disabled:opacity-40"
                >
                  Post
                </button>
                <button
                  type="button"
                  onClick={() => setPanel(null)}
                  className="ms-2 mt-3 rounded-full border border-white/12 px-5 py-2 text-sm font-semibold text-text-mid hover:text-text-hi"
                >
                  Cancel
                </button>
              </form>
            )}
          </ForumPanel>
        )}

        {forum && !open && (
          // Order comes from the API (pinned first); do not re-sort here.
          <ul className="space-y-2">
            {threads.length === 0 && <li className="text-sm text-text-low">No threads yet.</li>}
            {threads.map((thread) => (
              <li key={thread.id}>
                <button
                  type="button"
                  onClick={() => void openThread(thread.id)}
                  className={cn(
                    'w-full rounded-card-sm border bg-ink-2/40 p-4 text-start hover:border-gold/30',
                    thread.pinned ? 'border-gold/30' : 'border-white/8',
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-text-hi">{thread.title}</p>
                    {thread.pinned && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-gold/40 px-2 py-0.5 text-[11px] font-semibold text-gold-soft">
                        <Pin size={10} aria-hidden="true" /> Pinned
                      </span>
                    )}
                    {thread.duplicate_of && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-sky/40 px-2 py-0.5 text-[11px] font-semibold text-sky">
                        <Copy size={10} aria-hidden="true" /> Duplicate
                      </span>
                    )}
                  </div>
                  {thread.preview && (
                    <p className="mt-1 line-clamp-2 text-sm text-text-mid">{thread.preview}</p>
                  )}
                  <p className="caption mt-1.5">
                    {thread.replies_count} repl{thread.replies_count === 1 ? 'y' : 'ies'} ·{' '}
                    {thread.views_count} views
                  </p>
                  {thread.ai_summary && (
                    <p className="caption mt-1.5 line-clamp-2 text-text-mid">
                      <span className="me-1.5 rounded border border-sky/40 px-1 text-[10px] font-semibold text-sky">
                        AI
                      </span>
                      {thread.ai_summary}
                    </p>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}

        {forum && open && (
          <ThreadView
            thread={open}
            siblings={threads}
            onBack={() => setOpen(null)}
            onOpenThread={(id) => void openThread(id)}
            onReload={reloadOpen}
            onChange={setOpen}
            onError={setError}
            onDeleted={async () => {
              setOpen(null)
              if (forumId) await loadThreads(forumId)
            }}
          />
        )}
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-200">
          {error}
        </p>
      )}
    </>
  )
}
