import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { X } from 'lucide-react'
import MemberAvatar from '@/components/social/MemberAvatar'
import { useAppTheme } from '@/components/appdemo/theme'
import { ApiError, kaluta, type Reactor } from '@/lib/api'
import { cn } from '@/lib/utils'

/**
 * Who reacted, for the person who wrote the thing.
 *
 * The counter said "11" and there was no way to find out who the eleven
 * were - which is the one question a number like that puts in your head.
 *
 * Only the author sees it, and the server enforces that rather than this
 * dialog: who liked something is information about eleven other people, not
 * about the post.
 */
export default function ReactorList({
  postId,
  commentId,
  onClose,
}: {
  /** One of the two. A post's reactions, or a comment's likes. */
  postId?: string
  commentId?: string
  onClose: () => void
}) {
  const { tok } = useAppTheme()
  const [items, setItems] = useState<Reactor[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    const load = commentId
      ? kaluta.posts.commentLikePeople(commentId)
      : kaluta.posts.reactionPeople(postId ?? '')
    load
      .then((page) => alive && setItems(page.items))
      .catch((err) => {
        if (!alive) return
        setError(err instanceof ApiError ? err.message : 'Could not load the list')
        setItems([])
      })
    return () => {
      alive = false
    }
  }, [postId, commentId])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="People who reacted"
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className={cn('max-h-[70svh] w-full max-w-sm overflow-hidden rounded-2xl', tok.card)}
      >
        <header className="flex items-center justify-between gap-2 border-b border-[var(--cloud-border)] px-4 py-3">
          <h2 className={cn('text-sm font-semibold', tok.text)}>
            {items ? `${items.length} ${items.length === 1 ? 'reaction' : 'reactions'}` : 'Reactions'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={cn('rounded-full p-1.5 hover:bg-text-hi/[0.07]', tok.mid)}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </header>

        <div className="max-h-[calc(70svh-56px)] overflow-y-auto p-2">
          {items === null && <p className={cn('px-2 py-3 text-sm', tok.low)}>Loading…</p>}
          {error && <p className="px-2 py-3 text-sm text-amber-200">{error}</p>}
          {items?.length === 0 && !error && (
            <p className={cn('px-2 py-3 text-sm', tok.low)}>Nobody yet.</p>
          )}
          <ul className="space-y-0.5">
            {(items ?? []).map((person) => (
              <li key={person.user_id}>
                <Link
                  to={person.handle ? `/u/${person.handle}` : '#'}
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-xl p-2 hover:bg-text-hi/[0.05]"
                >
                  <MemberAvatar
                    handle={person.handle ?? undefined}
                    displayName={person.display_name}
                    avatarUrl={person.avatar_url}
                    size={38}
                  />
                  <span className={cn('min-w-0 flex-1 truncate text-sm font-semibold', tok.text)}>
                    {person.display_name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
