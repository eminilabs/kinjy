import { useEffect, useMemo, useRef, useState } from 'react'
import { CornerDownRight, Loader2, Send, ThumbsUp } from 'lucide-react'
import { useAppTheme } from '@/components/appdemo/theme'
import { ApiError, kaluta, type CommentNode } from '@/lib/api'
import { cn } from '@/lib/utils'
import MemberAvatar from './MemberAvatar'
import { useMyProfile } from '@/hooks/useMyProfile'
import { Link } from 'react-router'

const when = (iso: string) => {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return 'now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  return `${Math.floor(seconds / 86400)}d`
}

/**
 * Render @handle mentions as their own emphasis.
 *
 * Text nodes only — never markup — so a comment cannot inject anything by
 * writing HTML into a mention.
 */
function withMentions(body: string) {
  return (
    body
      // One split over both, so an @ inside an address - https://x.com/@someone,
      // or any path with a handle in it - is not pulled out of the link and
      // rendered as a mention of somebody who may not exist.
      .split(/(https?:\/\/[^\s<>"']+|@[a-z0-9_.]+)/gi)
      .map((part, index) => {
        if (/^https?:\/\//i.test(part)) {
          // Trailing punctuation belongs to the sentence, not the address:
          // "see https://example.com." ends in a full stop that is not part of
          // the link.
          const trailing = part.match(/[.,;:!?)\]]+$/)?.[0] ?? ''
          const href = trailing ? part.slice(0, -trailing.length) : part
          return (
            <span key={index}>
              <a
                href={href}
                target="_blank"
                // noreferrer as well as noopener: the destination has no
                // business learning which thread the reader came from.
                rel="noopener noreferrer nofollow"
                className="font-medium text-sky hover:underline"
                onClick={(event) => event.stopPropagation()}
              >
                {href}
              </a>
              {trailing}
            </span>
          )
        }
        if (part.startsWith('@')) {
          return (
            <span key={index} className="font-semibold text-gold-soft">
              {part}
            </span>
          )
        }
        return part
      })
  )
}

interface Tree extends CommentNode {
  children: Tree[]
}

/** Group the flat list into the two levels the server allows. */
function toTree(items: CommentNode[]): Tree[] {
  const byId = new Map<string, Tree>()
  for (const item of items) byId.set(item.id, { ...item, children: [] })
  const roots: Tree[] = []
  for (const node of byId.values()) {
    const parent = node.parent_id ? byId.get(node.parent_id) : undefined
    if (parent) parent.children.push(node)
    else roots.push(node)
  }
  return roots
}

export default function Comments({
  postId,
  currentUserId,
  onCountChange,
}: {
  postId: string
  currentUserId: string
  onCountChange: (delta: number) => void
}) {
  const { tok } = useAppTheme()
  const [items, setItems] = useState<CommentNode[] | null>(null)
  const [maxDepth, setMaxDepth] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [body, setBody] = useState('')
  const [replyTo, setReplyTo] = useState<CommentNode | null>(null)
  const [sending, setSending] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    try {
      const page = await kaluta.posts.comments(postId)
      setItems(page.items)
      setMaxDepth(page.max_depth)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load comments')
    }
  }

  useEffect(() => {
    let cancelled = false
    kaluta.posts
      .comments(postId)
      .then((page) => {
        if (cancelled) return
        setItems(page.items)
        setMaxDepth(page.max_depth)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Could not load comments')
      })
    return () => {
      cancelled = true
    }
  }, [postId])

  const tree = useMemo(() => toTree(items ?? []), [items])

  /**
   * Start a reply. Past the nesting cap the thread can no longer show *who* is
   * being answered by indentation, so the mention carries that instead — which
   * is why it is prefilled rather than left to the member to remember.
   */
  const startReply = (comment: CommentNode) => {
    setReplyTo(comment)
    const handle = comment.author?.handle
    // Includes replying to yourself: once the thread is flat, other readers
    // still need to see which message this answers.
    const needsMention = comment.depth >= maxDepth && Boolean(handle)
    setBody(needsMention ? `@${handle} ` : '')
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const text = body.trim()
    if (!text || sending) return
    setSending(true)
    setError(null)
    try {
      await kaluta.posts.comment(postId, text, replyTo?.id)
      setBody('')
      setReplyTo(null)
      onCountChange(1)
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not post the comment')
    } finally {
      setSending(false)
    }
  }

  // Likes the viewer has changed since the list was fetched. Held apart from
  // `items` so a like does not mean re-fetching the thread, and so the button
  // answers immediately - the request is in flight while the state already
  // shows what the member just did.
  const me = useMyProfile()
  const [likeEdits, setLikeEdits] = useState<Record<string, { liked: boolean; likes: number }>>({})

  const likeState = (node: Tree) =>
    likeEdits[node.id] ?? { liked: node.liked ?? false, likes: node.likes ?? 0 }

  const toggleLike = async (node: Tree) => {
    const before = likeState(node)
    // Optimistic, then corrected by the server's own count - which is the one
    // that knows about the other people liking it at the same moment.
    const guess = { liked: !before.liked, likes: before.likes + (before.liked ? -1 : 1) }
    setLikeEdits((current) => ({ ...current, [node.id]: guess }))
    try {
      const result = await kaluta.posts.likeComment(node.id)
      setLikeEdits((current) => ({ ...current, [node.id]: result }))
    } catch {
      // Put it back. A like that silently did not happen is worse than one
      // that visibly did not.
      setLikeEdits((current) => ({ ...current, [node.id]: before }))
    }
  }

  const Row = ({ node }: { node: Tree }) => (
    <li>
      <div className="flex gap-2">
        <span className="mt-0.5">
          <MemberAvatar
            handle={node.author?.handle}
            displayName={node.author?.display_name}
            avatarUrl={node.author?.avatar_url}
            size={28}
          />
        </span>

        <div className="min-w-0 flex-1">
          {/* The bubble. Facebook's is a tight, strongly rounded block that
              wraps to the text rather than filling the row - so it is
              inline-block with a max width, not a full-width card. 18px of
              radius is what gives it its shape; the card radius read as a
              panel. */}
          <div className={cn('inline-block max-w-full rounded-[18px] px-3 py-2', tok.subtleBg)}>
            <p className="text-[0.8125rem] font-semibold leading-tight">
              {node.author?.handle ? (
                <Link to={`/u/${node.author.handle}`} className={cn(tok.text, 'hover:underline')}>
                  {node.author_id === currentUserId ? 'You' : node.author.display_name}
                </Link>
              ) : (
                <span className={tok.text}>{node.author_id.slice(0, 12)}</span>
              )}
              {/* Beyond the cap the reply is no longer indented under its
                  target, so name it explicitly. */}
              {node.reply_to_user && node.depth >= maxDepth && (
                <span className={cn('ms-1.5 inline-flex items-center gap-0.5 font-normal', tok.low)}>
                  <CornerDownRight size={10} aria-hidden="true" />
                  replying to
                  <span className="font-semibold text-gold-soft">@{node.reply_to_user.handle}</span>
                </span>
              )}
            </p>
            {/* tok.text, not tok.mid: in a bubble the comment is the content,
                and dimming it made every reply read as secondary to the name
                above it. The name carries the weight instead. */}
            <p className={cn('mt-0.5 whitespace-pre-wrap text-[0.9375rem] leading-[1.35]', tok.text)}>
              {withMentions(node.body)}
            </p>
          </div>

          {/* Like, Reply, then the time - the order Facebook uses, and the
              order that matters: the two things you can do, then the one thing
              you can only read. Liked is gold and stays bold, so the state is
              legible without a second control. */}
          <div className="mt-0.5 flex items-center gap-3 ps-3">
            <button
              type="button"
              onClick={() => toggleLike(node)}
              aria-pressed={likeState(node).liked}
              className={cn(
                'text-[0.75rem] font-semibold hover:underline',
                likeState(node).liked ? 'text-gold-soft' : tok.low,
              )}
            >
              Like
            </button>
            <button
              type="button"
              onClick={() => startReply(node)}
              className={cn('text-[0.75rem] font-semibold hover:underline', tok.low)}
            >
              Reply
            </button>
            <span className={cn('text-[0.75rem]', tok.low)}>{when(node.created_at)}</span>
            {likeState(node).likes > 0 && (
              /* The count sits on the row, not inside the bubble: a bubble that
                 changes size when somebody likes it makes the thread jump. */
              <span className={cn('inline-flex items-center gap-1 text-[0.75rem]', tok.low)}>
                <ThumbsUp size={11} className="text-gold-soft" aria-hidden="true" />
                {likeState(node).likes}
              </span>
            )}
          </div>

          {/* Replies indent by margin alone. The rule down the left read as a
              quote block rather than as a thread. */}
          {node.children.length > 0 && (
            <ul className="mt-2 space-y-2 ps-5">
              {node.children.map((child) => (
                <Row key={child.id} node={child} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </li>
  )

  return (
    <div className={cn('mt-3 border-t pt-3', tok.divider, 'border-t-current/10')}>
      {items === null && !error && (
        <p className={cn('flex items-center gap-2 py-2 text-xs', tok.low)}>
          <Loader2 size={12} className="animate-spin" aria-hidden="true" />
          Loading comments…
        </p>
      )}

      {items && items.length === 0 && (
        <p className={cn('py-1 text-xs', tok.low)}>No replies yet. Start the conversation.</p>
      )}

      {tree.length > 0 && <ul className="max-h-[420px] space-y-3 overflow-y-auto pe-1">{tree.map((node) => <Row key={node.id} node={node} />)}</ul>}

      <form onSubmit={submit} className="mt-3">
        {replyTo && (
          <p className={cn('mb-1.5 flex items-center gap-1.5 ps-1 text-[0.68rem]', tok.low)}>
            <CornerDownRight size={11} aria-hidden="true" />
            Replying to{' '}
            <span className="font-semibold text-gold-soft">
              {replyTo.author?.display_name ?? replyTo.author_id.slice(0, 12)}
            </span>
            <button
              type="button"
              onClick={() => {
                setReplyTo(null)
                setBody('')
              }}
              className="ms-1 underline hover:text-text-hi"
            >
              cancel
            </button>
          </p>
        )}

        {/* The viewer's own face beside the box, as every comment composer
            has. It says whose comment this will be, which matters on a shared
            device and on a page where you may be reading as somebody else. */}
        <div className="flex items-center gap-2">
          <span className="shrink-0">
            <MemberAvatar
              handle={me?.handle}
              displayName={me?.display_name}
              avatarUrl={me?.avatar_url}
              size={32}
            />
          </span>
          <div className={cn('flex min-w-0 flex-1 items-center rounded-full', tok.input)}>
            <input
              ref={inputRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={replyTo ? 'Write a reply…' : 'Write a comment…'}
              aria-label={replyTo ? 'Write a reply' : 'Write a comment'}
              className={cn(
                'min-w-0 flex-1 bg-transparent px-4 py-2 text-[0.9375rem] focus:outline-none',
                tok.text,
              )}
            />
            {/* Enter sends, so the button is only there while there is
                something to send - which is how it reads as confirmation
                rather than as the only way out. */}
            {(body.trim() || sending) && (
              <button
                type="submit"
                disabled={!body.trim() || sending}
                aria-label="Send"
                className="shrink-0 rounded-full px-3 py-2 text-gold-soft disabled:opacity-40"
              >
                {sending ? (
                  <Loader2 size={15} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Send size={15} aria-hidden="true" />
                )}
              </button>
            )}
          </div>
        </div>
      </form>

      {error && (
        <p role="alert" className="mt-2 text-xs text-red-300">
          {error}
        </p>
      )}
    </div>
  )
}
