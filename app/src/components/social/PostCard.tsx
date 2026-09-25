import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Columns2,
  Eye,
  EyeOff,
  HelpCircle,
  Languages,
  MapPin,
  MessageCircle,
  Repeat2,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react'
import { ApiError, kaluta, type Post, type WhyFactor } from '@/lib/api'
import { useTopic } from '@/hooks/useRealtime'
import { htmlToText, looksLikeHtml, sanitizeHtml } from '@/lib/richtext'
import { cn } from '@/lib/utils'
import Comments from './Comments'
import MemberAvatar from './MemberAvatar'
import MediaLightbox from './MediaLightbox'
import Reactions from './Reactions'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Link } from 'react-router'

const PROVENANCE_LABEL: Record<string, string> = {
  original: 'Original',
  edited: 'Edited',
  ai_assisted: 'AI assisted',
  ai_generated: 'AI generated',
  verified_source: 'Verified source',
}

/**
 * Turn #tags into links to that topic's feed.
 *
 * Splits into text nodes and elements — never markup — so a body cannot inject
 * anything through a tag. The same pattern the server uses to extract them, so
 * what is highlighted is exactly what became a topic.
 */
function withHashtags(text: string) {
  return text
    .split(/(#[\wÀ-ÿ؀-ۿ一-鿿][\wÀ-ÿ؀-ۿ一-鿿-]{1,49})/g)
    .map((part, index) =>
      part.startsWith('#') ? (
        <Link
          key={index}
          to={`/hub?mode=topics&topic=${encodeURIComponent(part.slice(1).toLowerCase())}`}
          className="font-medium text-gold-soft hover:underline"
        >
          {part}
        </Link>
      ) : (
        part
      ),
    )
}

function ago(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  return `${Math.floor(seconds / 86400)}d`
}

interface WhyData {
  mode?: string
  ranked?: boolean
  reasons?: Array<{ kind: string; label: string }>
  explanation?: string
  algorithm_name?: string
  score?: number
  factors: WhyFactor[]
}

/**
 * "Why am I seeing this?" (blueprint §1).
 *
 * Two answers, kept apart: what *selected* this post for the feed, and — only
 * when the mode actually ranks — what *ordered* it. Showing a score on a
 * chronological feed described a ranking that never ran.
 */
function WhyPanel({ why, onChangeAlgorithm }: { why: WhyData; onChangeAlgorithm: () => void }) {
  const max = Math.max(1, ...why.factors.map((f) => Math.abs(f.contribution)))
  return (
    <div className="text-start">
      {(why.reasons ?? []).length > 0 && (
        <ul className="space-y-1">
          {(why.reasons ?? []).map((reason) => (
            <li key={reason.kind + reason.label} className="flex items-start gap-2 text-xs text-text-mid">
              <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold" />
              {reason.label}
            </li>
          ))}
        </ul>
      )}

      {why.explanation && (
        <p className="caption mt-2.5">
          {why.explanation}
          {why.score !== undefined && <span className="mono-data"> · score {why.score.toFixed(3)}</span>}
        </p>
      )}

      {why.ranked && why.factors.length > 0 && (
        <ul className="mt-2.5 space-y-1.5 border-t border-white/8 pt-2.5">
          {why.factors.map((f) => (
            <li key={f.factor} className="flex items-center gap-2.5">
              <span className="w-40 shrink-0 text-xs text-text-mid">{f.label}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/6">
                <span
                  className={cn('block h-full rounded-full', f.contribution < 0 ? 'bg-red-400/70' : 'bg-gold/70')}
                  style={{ width: `${(Math.abs(f.contribution) / max) * 100}%` }}
                />
              </span>
              <span className="mono-data w-14 shrink-0 text-right text-xs text-text-low">
                {f.contribution > 0 ? '+' : ''}
                {f.contribution.toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* A real destination: the picker that actually changes it, in the feed
          rail. It used to call a handler that did nothing on most pages, so the
          one action the blueprint attaches to this panel was a dead end. And it
          points at the app's own control, not the marketing page about it. */}
      <Link
        to="/hub?focus=algorithm"
        onClick={onChangeAlgorithm}
        className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-gold-soft hover:underline"
      >
        <SlidersHorizontal size={12} aria-hidden="true" />
        Change my algorithm
      </Link>
    </div>
  )
}

export default function PostCard({
  post,
  algorithmId,
  mode = 'new',
  isOwn,
  currentUserId,
  onHidden,
  onChangeAlgorithm,
}: {
  post: Post
  algorithmId: string
  /** The feed mode this card came from — an unranked mode must not claim a score. */
  mode?: string
  isOwn: boolean
  currentUserId: string
  onHidden: (postId: string) => void
  onChangeAlgorithm: () => void
}) {
  const { i18n } = useTranslation()
  const target = post.repost_of ?? post
  const [reactions, setReactions] = useState(target.reactions ?? { counts: {}, total: 0, mine: null })
  const [comments, setComments] = useState(target.comments_count)
  const [showComments, setShowComments] = useState(false)
  const [preview, setPreview] = useState<number | null>(null)
  // Starts as whatever the server judged safe to send. Data saver strips heavy
  // URLs, so this list is what actually exists client-side until asked otherwise.
  const [media, setMedia] = useState(target.media)
  const [loadingMedia, setLoadingMedia] = useState(false)
  const [reposts, setReposts] = useState(target.reposts_count)
  const [views, setViews] = useState(target.views_count ?? 0)
  const [reposted, setReposted] = useState(Boolean(target.reposted_by_me ?? post.reposted_by_me))
  const [why, setWhy] = useState<WhyData | null>(post.why ? { factors: post.why } : null)
  const [showWhy, setShowWhy] = useState(false)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  // Translation (§14): one click, then an optional side-by-side view.
  const uiLang = i18n.language.slice(0, 2)
  const [translation, setTranslation] = useState<{ text: string; provider?: string; mock?: boolean } | null>(null)
  const [translating, setTranslating] = useState(false)
  const [sideBySide, setSideBySide] = useState(false)
  const canTranslate = post.lang !== uiLang

  // Live counts. Only counts — never `mine`, which is per-viewer: applying
  // somebody else's reaction as your own is worse than being slightly stale.
  // The actor's own events are skipped because their optimistic update already
  // ran, and replaying it would make the number flicker.
  useTopic(`post:${target.id}`, (event) => {
    if (event.actor && event.actor === currentUserId) return
    if (typeof event.comments_count === 'number') setComments(event.comments_count)
    if (typeof event.reposts_count === 'number') setReposts(event.reposts_count)
    if (typeof event.views_count === 'number') setViews(event.views_count)
    if (event.counts && typeof event.total === 'number') {
      setReactions((current) => ({ ...current, counts: event.counts!, total: event.total! }))
    }
  })

  /** Share to your own followers, or take it back. */
  const toggleRepost = async () => {
    setBusy(true)
    setNote(null)
    try {
      if (reposted) {
        await kaluta.posts.undoRepost(target.id)
        setReposted(false)
        setReposts((n) => Math.max(0, n - 1))
      } else {
        await kaluta.posts.repost(target.id)
        setReposted(true)
        setReposts((n) => n + 1)
      }
    } catch (err) {
      setNote(err instanceof ApiError ? err.message : 'Could not repost')
    } finally {
      setBusy(false)
    }
  }

  /** "Load it anyway" — one post, without turning data saver off. */
  const loadMedia = async () => {
    setLoadingMedia(true)
    try {
      setMedia((await kaluta.posts.media(target.id)).media)
    } catch (err) {
      setNote(err instanceof ApiError ? err.message : 'Could not load this media')
    } finally {
      setLoadingMedia(false)
    }
  }

  const openWhy = async () => {
    const opening = !showWhy
    setShowWhy(opening)
    // Fetch once, and only when opening: the inline `why` from a ranked feed
    // has factors but never the selection reasons.
    if (!opening || why?.reasons) return
    try {
      setWhy(await kaluta.feeds.why(post.id, algorithmId, mode))
    } catch (err) {
      setNote(err instanceof ApiError ? err.message : 'Could not explain this one')
    }
  }

  const translate = async () => {
    if (translation) {
      setSideBySide((v) => !v)
      return
    }
    setTranslating(true)
    try {
      // Pass the author's declared language: the server's detector only
      // separates scripts, so it would call Swahili "English".
      const result = await kaluta.ai.translate(plainBody, uiLang, post.lang)
      setTranslation({ text: result.translated, provider: result.provider, mock: result.mock })
    } catch (err) {
      setNote(err instanceof ApiError ? err.message : 'Translation unavailable')
    } finally {
      setTranslating(false)
    }
  }

  const showLess = async () => {
    setBusy(true)
    try {
      await kaluta.feeds.signal({ kind: 'less_like_this', target_type: 'post', target_id: post.id })
      setNote('Noted — you will see less like this from the next refresh.')
      setTimeout(() => onHidden(post.id), 1200)
    } catch (err) {
      setNote(err instanceof ApiError ? err.message : 'Could not record that')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    try {
      await kaluta.posts.remove(post.id)
      onHidden(post.id)
    } catch (err) {
      setNote(err instanceof ApiError ? err.message : 'Could not delete the post')
      setBusy(false)
    }
  }

  // A repost shows the original's author and content — the sharer is named in
  // the banner above it. Engagement targets the original too, so a share does
  // not fragment a conversation across two posts.
  const shared = post.repost_of ?? null
  const source = target

  // Articles are stored as markup; everything else is plain text.
  const isRichArticle = source.format === 'article' && looksLikeHtml(source.body) && !translation
  const body = translation && !sideBySide ? translation.text : source.body
  /** Text without the tags — for translation, and for the side-by-side column. */
  const plainBody = looksLikeHtml(source.body) ? htmlToText(source.body) : source.body

  return (
    <article className="cloud-card p-5" data-post-id={post.id}>
      {shared && (
        <p className="caption mb-2.5 flex items-center gap-1.5 border-b border-white/8 pb-2.5">
          <Repeat2 size={13} aria-hidden="true" className="text-success" />
          {isOwn ? 'You' : post.author?.display_name ?? 'Someone'} shared this
        </p>
      )}

      {shared && post.body.trim() !== '' && (
        <p className="mb-3 whitespace-pre-wrap text-[0.95rem] leading-relaxed text-text-hi">
          {withHashtags(post.body)}
        </p>
      )}

      <header className="flex items-center gap-3">
        <MemberAvatar
          handle={source.author?.handle}
          displayName={source.author?.display_name}
          avatarUrl={source.author?.avatar_url}
          size={36}
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-text-hi">
            {source.author?.handle ? (
              <Link to={`/u/${source.author.handle}`} className="hover:underline">
                {isOwn && !shared ? 'You' : source.author.display_name}
              </Link>
            ) : (
              `@${source.author_id.slice(0, 12)}`
            )}
          </p>
          <p className="caption flex flex-wrap items-center gap-x-2">
            <span>{ago(source.created_at)}</span>
            {source.city && (
              <span className="inline-flex items-center gap-1">
                <MapPin size={10} aria-hidden="true" />
                {source.city}
              </span>
            )}
            <span className="uppercase">{source.lang}</span>
            {source.visibility !== 'public' && <span>· {source.visibility}</span>}
          </p>
        </div>
        <div className="ms-auto flex shrink-0 items-center gap-2">
          {source.provenance !== 'original' && (
            <span className="rounded-full bg-sky/15 px-2.5 py-1 text-[0.65rem] font-semibold text-sky">
              {PROVENANCE_LABEL[source.provenance] ?? source.provenance}
            </span>
          )}
          {/* At the top, where the question is asked: the reader wonders why a
              post is here *before* reading it, not after the reactions. */}
          <button
            type="button"
            onClick={openWhy}
            aria-expanded={showWhy}
            aria-label="Why am I seeing this?"
            title="Why am I seeing this?"
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-full transition-colors',
              showWhy ? 'bg-gold/15 text-gold-soft' : 'text-text-low hover:bg-white/5 hover:text-gold-soft',
            )}
          >
            <HelpCircle size={15} />
          </button>
        </div>
      </header>

      {/* A dialog rather than an inline panel: the explanation is a detour from
          reading the feed, and expanding it in place shoved every post below it
          down the page. */}
      <Dialog open={showWhy} onOpenChange={setShowWhy}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <HelpCircle size={16} className="text-gold" aria-hidden="true" />
              Why am I seeing this?
            </DialogTitle>
          </DialogHeader>
          {why ? (
            <WhyPanel why={why} onChangeAlgorithm={onChangeAlgorithm} />
          ) : (
            <p className="py-4 text-sm text-text-low">Working out why…</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Body — single column, or the original beside its translation */}
      {sideBySide && translation ? (
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="caption mb-1 uppercase">{post.lang} · original</p>
            <p className="whitespace-pre-wrap text-[0.95rem] leading-relaxed text-text-hi">{plainBody}</p>
          </div>
          <div className="sm:border-s sm:border-white/8 sm:ps-4">
            <p className="caption mb-1 uppercase">{uiLang} · translated</p>
            <p className="whitespace-pre-wrap text-[0.95rem] leading-relaxed text-text-hi">{translation.text}</p>
          </div>
        </div>
      ) : isRichArticle ? (
        /* Sanitised again at render time: the database can hold anything, and
           trusting what was cleaned on the way in would only move the risk. */
        <div
          className="prose-article mt-3 text-[0.95rem] text-text-hi"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(body) }}
        />
      ) : (
        <p className="mt-3 whitespace-pre-wrap text-[0.95rem] leading-relaxed text-text-hi">
          {withHashtags(body)}
        </p>
      )}

      {/* Attached media — one full-width, several in a grid, videos playable. */}
      {media.length > 0 && (
        <ul
          className={cn(
            '-mx-5 mt-3 grid gap-0.5 border-y border-white/8',
            media.length === 1 ? 'grid-cols-1' : 'grid-cols-2',
          )}
        >
          {media.map((item, index) => (
            <li key={item.url ?? `deferred-${index}`} className="relative bg-ink">
              {/* The whole tile opens the viewer; the video keeps its own
                  controls, so only images get the button treatment. */}
              {item.url === null ? (
                /* Data saver: the server never sent this URL, so nothing has
                   downloaded. The tap is what asks for it. */
                <button
                  type="button"
                  onClick={loadMedia}
                  disabled={loadingMedia}
                  className="flex w-full flex-col items-center justify-center gap-1 bg-white/4 py-10 transition-colors hover:bg-white/8 disabled:opacity-60"
                >
                  <span className="text-sm text-text-hi">
                    {loadingMedia ? 'Loading…' : `Tap to load ${item.kind}`}
                  </span>
                  <span className="caption text-text-low">
                    Data saver is on — nothing downloaded yet
                  </span>
                </button>
              ) : item.kind === 'video' ? (
                <video
                  src={item.url}
                  controls
                  // Muted because a browser blocks unmuted autoplay anyway, and
                  // sound starting by itself in a feed is nobody's setting.
                  autoPlay={post.autoplay !== false}
                  muted={post.autoplay !== false}
                  preload={post.autoplay === false ? 'none' : 'metadata'}
                  playsInline
                  className="max-h-[420px] w-full bg-black object-contain"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setPreview(index)}
                  aria-label={item.alt_text || 'Open image'}
                  className="block w-full"
                >
                  <img
                    src={item.url}
                    alt={item.alt_text ?? ''}
                    loading="lazy"
                    className={cn(
                      'w-full cursor-zoom-in object-cover transition-opacity hover:opacity-95',
                      media.length === 1 ? 'max-h-[460px]' : 'h-44',
                    )}
                  />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {translation && (
        <p className="caption mt-1.5 text-sky">
          Translated by {translation.provider ?? 'the language gateway'}
          {translation.mock && ' · mock provider — no model key configured'}
        </p>
      )}

      {source.topics.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {source.topics.map((topic) => (
            <li key={topic} className="rounded-full bg-white/6 px-2.5 py-1 text-[0.7rem] text-text-mid">
              #{topic}
            </li>
          ))}
        </ul>
      )}

      <footer className="mt-4 flex flex-wrap items-center gap-1">
        <Reactions postId={target.id} summary={reactions} onChange={setReactions} />

        <button
          type="button"
          onClick={() => setShowComments(true)}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-text-mid transition-colors hover:text-text-hi"
        >
          <MessageCircle size={13} aria-hidden="true" />
          {comments}
        </button>

        <button
          type="button"
          onClick={toggleRepost}
          disabled={busy}
          aria-pressed={reposted}
          title={reposted ? 'Undo repost' : 'Share this to your followers'}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40',
            reposted ? 'text-success' : 'text-text-mid hover:text-text-hi',
          )}
        >
          <Repeat2 size={14} aria-hidden="true" />
          {reposts}
        </button>

        {views > 0 && (
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-text-low"
            title="Members who have seen this — counted once each"
          >
            <Eye size={13} aria-hidden="true" />
            {views}
          </span>
        )}

        {canTranslate && (
          <button
            type="button"
            onClick={translate}
            disabled={translating}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-text-mid transition-colors hover:text-sky disabled:opacity-40"
          >
            {translation ? <Columns2 size={13} aria-hidden="true" /> : <Languages size={13} aria-hidden="true" />}
            {translating ? 'Translating…' : translation ? (sideBySide ? 'Single column' : 'Side by side') : 'Translate'}
          </button>
        )}

        {isOwn ? (
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="ms-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-text-low transition-colors hover:text-red-200 disabled:opacity-40"
          >
            <Trash2 size={13} aria-hidden="true" />
            Delete
          </button>
        ) : (
          <button
            type="button"
            onClick={showLess}
            disabled={busy}
            className="ms-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-text-low transition-colors hover:text-text-hi disabled:opacity-40"
          >
            <EyeOff size={13} aria-hidden="true" />
            Show less like this
          </button>
        )}
      </footer>


      {/* Inline, the way LinkedIn does it: the thread belongs to the post, and
          a modal cuts you off from the very content the replies are about.
          Long threads stay bounded by their own scroll area instead. */}
      {showComments && (
        <Comments
          postId={target.id}
          currentUserId={currentUserId}
          onCountChange={(delta) => setComments((n) => n + delta)}
        />
      )}

      {preview !== null && (
        <MediaLightbox media={media} index={preview} onClose={() => setPreview(null)} />
      )}

      {note && <p className="caption mt-2 text-gold-soft">{note}</p>}
    </article>
  )
}
