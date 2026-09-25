import { useEffect, useMemo, useRef, useState } from 'react'
import { CornerDownRight, Loader2, Send } from 'lucide-react'
import { useAppTheme } from '@/components/appdemo/theme'
import { ApiError, kaluta, type CommentNode } from '@/lib/api'
import { cn } from '@/lib/utils'
import MemberAvatar from './MemberAvatar'
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
  return body.split(/(@[a-z0-9_.]+)/gi).map((part, index) =>
    part.startsWith('@') ? (
      <span key={index} className="font-semibold text-gold-soft">
        {part}
      </span>
    ) : (
      part
    ),
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

  const Row = ({ node }: { node: Tree }) => (
    <li>
      <div className="flex gap-2.5">
        <span className="mt-0.5">
          <MemberAvatar
            handle={node.author?.handle}
            displayName={node.author?.display_name}
            size={28}
          />
        </span>

        <div className="min-w-0 flex-1">
          <div className={cn('rounded-card-md px-3 py-2', tok.subtleBg)}>
            <p className="text-xs font-semibold">
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
            <p className={cn('mt-0.5 whitespace-pre-wrap text-sm leading-relaxed', tok.mid)}>
              {withMentions(node.body)}
            </p>
          </div>

          <div className="mt-1 flex items-center gap-3 ps-1">
            <span className={cn('text-[0.68rem]', tok.low)}>{when(node.created_at)}</span>
            <button
              type="button"
              onClick={() => startReply(node)}
              className={cn('text-[0.68rem] font-semibold transition-colors hover:text-gold-soft', tok.low)}
            >
              Reply
            </button>
          </div>

          {node.children.length > 0 && (
            <ul className={cn('mt-2.5 space-y-2.5 border-s ps-3', tok.divider, 'border-s-current/10')}>
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

        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={replyTo ? 'Write a reply…' : 'Write a comment…'}
            aria-label={replyTo ? 'Write a reply' : 'Write a comment'}
            className={cn('w-full rounded-full px-4 py-2 text-sm focus:outline-none', tok.input, tok.text)}
          />
          <button
            type="submit"
            disabled={!body.trim() || sending}
            aria-label="Send"
            className={cn('shrink-0 rounded-full px-3.5 py-2 transition-colors disabled:opacity-40', tok.subtleBg, tok.mid)}
          >
            {sending ? (
              <Loader2 size={14} className="animate-spin" aria-hidden="true" />
            ) : (
              <Send size={14} aria-hidden="true" />
            )}
          </button>
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
