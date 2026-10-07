import { useEffect, useState } from 'react'
import { ArrowLeft, BookOpen, ChevronDown, FolderPlus, Globe2, Landmark, Lock, MessageSquarePlus, X } from 'lucide-react'
import RoleBadge from '@/components/community/RoleBadge'
import ForumTree from '@/components/forums/ForumTree'
import { ApiError, kaluta, type Forum } from '@/lib/api'
import { cn } from '@/lib/utils'

export type ForumAction = 'sub' | 'thread' | 'knowledge'

interface Props {
  forum: Forum
  /** The action whose form is open under the header, if any. */
  action: ForumAction | null
  onToggle: (action: ForumAction) => void
  canAddSub: boolean
  /** Shown when the community keeps sub-forums to its stewards. */
  blockedNote?: React.ReactNode
  /** Bumped after a sub-forum is added to this forum: refetch and reveal the list. */
  subsRefresh: number
  onSelectSub: (forum: Forum) => void
  /** The forum this one was reached from through its sub-forum list. */
  back?: { name: string; onBack: () => void }
  /** The Forums page names the community here, since nothing around the panel does. */
  showCommunity?: boolean
  onError: (message: string) => void
  /** The open form, rendered just under the header. */
  children?: React.ReactNode
}

const actionButton = (on: boolean) =>
  cn(
    'inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
    on ? 'border-gold/50 bg-gold/10 text-gold-soft' : 'border-white/12 text-text-mid hover:border-gold/40 hover:text-text-hi',
  )

/** One forum's header, its actions, and the list of its direct sub-forums. Keyed by forum. */
export default function ForumPanel({
  forum,
  action,
  onToggle,
  canAddSub,
  blockedNote,
  subsRefresh,
  onSelectSub,
  back,
  showCommunity,
  onError,
  children,
}: Props) {
  const [subs, setSubs] = useState<Forum[] | null>(null)
  const [showSubs, setShowSubs] = useState(false)

  // Fetched on selection rather than on first open, so the button can show the count.
  useEffect(() => {
    let cancelled = false
    kaluta.forums
      .list({ parent_id: forum.id })
      .then((result) => {
        if (cancelled) return
        setSubs(result.items)
        if (subsRefresh > 0) setShowSubs(true)
      })
      .catch((err) => {
        if (cancelled) return
        setSubs([])
        onError(err instanceof ApiError ? err.message : 'Could not load sub-forums')
      })
    return () => {
      cancelled = true
    }
  }, [forum.id, subsRefresh, onError])

  const community = forum.community
  const openToAll = Boolean(forum.parent_id) && !forum.inherit_access

  return (
    <>
      <section className="cloud-card p-5" aria-label={`Forum ${forum.name}`}>
        {back && (
          <button
            type="button"
            onClick={back.onBack}
            className="caption mb-3 inline-flex max-w-full items-center gap-1.5 hover:text-text-hi"
          >
            <ArrowLeft size={12} className="shrink-0" aria-hidden="true" />
            <span className="truncate">Back to {back.name}</span>
          </button>
        )}

        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo/25 text-sky"
          >
            <Landmark size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold text-text-hi">{forum.name}</h2>
            <p className="caption">
              {forum.threads_count} thread{forum.threads_count === 1 ? '' : 's'}
              {forum.scope && ` · ${forum.scope}`}
            </p>
            {(forum.community_id || openToAll) && (
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {forum.community_id && (
                  <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-text-mid">
                    <Lock size={10} className="shrink-0" aria-hidden="true" />
                    <span className="truncate">{showCommunity && community ? community.name : 'Community'}</span>
                  </span>
                )}
                {showCommunity &&
                  community &&
                  (community.my_status === 'active' || community.my_status === 'pending' ? (
                    <RoleBadge role={community.my_role} status={community.my_status} />
                  ) : (
                    <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-text-low">
                      Not a member
                    </span>
                  ))}
                {openToAll && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-gold/40 px-2 py-0.5 text-[11px] text-gold-soft">
                    <Globe2 size={10} aria-hidden="true" />
                    Open to everyone
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-expanded={showSubs}
            onClick={() => setShowSubs((v) => !v)}
            className={actionButton(showSubs)}
          >
            <ChevronDown size={14} className={cn('transition-transform', showSubs && 'rotate-180')} aria-hidden="true" />
            Sub-forums{subs ? ` (${subs.length})` : ''}
          </button>
          {canAddSub && (
            <button
              type="button"
              aria-expanded={action === 'sub'}
              onClick={() => onToggle('sub')}
              className={actionButton(action === 'sub')}
            >
              {action === 'sub' ? <X size={14} aria-hidden="true" /> : <FolderPlus size={14} aria-hidden="true" />}
              Add a sub-forum
            </button>
          )}
          <button
            type="button"
            aria-expanded={action === 'thread'}
            onClick={() => onToggle('thread')}
            className={actionButton(action === 'thread')}
          >
            {action === 'thread' ? (
              <X size={14} aria-hidden="true" />
            ) : (
              <MessageSquarePlus size={14} aria-hidden="true" />
            )}
            Start a thread
          </button>
          <button
            type="button"
            aria-expanded={action === 'knowledge'}
            onClick={() => onToggle('knowledge')}
            className={actionButton(action === 'knowledge')}
          >
            {action === 'knowledge' ? <X size={14} aria-hidden="true" /> : <BookOpen size={14} aria-hidden="true" />}
            Knowledge base
          </button>
          {blockedNote}
        </div>

        <div hidden={!showSubs}>
          <div className="mt-3 rounded-card-sm border border-white/8 bg-ink-2/40 p-3">
            {subs === null ? (
              <p className="caption">Loading…</p>
            ) : subs.length === 0 ? (
              <p className="caption">No sub-forums.</p>
            ) : (
              <ForumTree
                roots={subs}
                selectedId={null}
                onSelect={(next) => {
                  setShowSubs(false)
                  onSelectSub(next)
                }}
                refresh={null}
                onError={onError}
              />
            )}
          </div>
        </div>
      </section>

      {children}
    </>
  )
}
