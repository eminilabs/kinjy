import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Columns2,
  Eye,
  EyeOff,
  Flag,
  HelpCircle,
  Languages,
  Lock,
  MapPin,
  MessageCircle,
  Repeat2,
  SlidersHorizontal,
  Trash2,
  Link2,
  Check,
  Share2,
} from 'lucide-react'
import { ApiError, kaluta, type Post, type WhyFactor } from '@/lib/api'
import { useTopic } from '@/hooks/useRealtime'
import { htmlToText, looksLikeHtml, readableText, sanitizeHtml } from '@/lib/richtext'
import { useAuth } from '@/hooks/useAuth'
import { postUrl, shareLink } from '@/lib/share'
import { cn } from '@/lib/utils'
import Comments from './Comments'
import MemberAvatar from './MemberAvatar'
import KnownActors from './KnownActors'
import Expandable from './Expandable'
import LinkPreview, { firstLink } from './LinkPreview'
import MediaGrid from './MediaGrid'
import MediaLightbox from './MediaLightbox'
import Reactions from './Reactions'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Link } from 'react-router'

/**
 * How much of a post's text the card shows before it offers to open.
 *
 * About five lines at the body size, which is roughly where LinkedIn cuts and
 * a little more than Facebook. The point is that every card is about the size
 * of every other card: one long post owning the screen is the thing that makes
 * a feed tiring to scroll.
 *
 * Only a cut that is real is shown - Expandable measures first, so a post that
 * fits gets no fade and no button rather than a "See more" that does nothing.
 *
 * Running text is cut by line and an article body by height, because
 * -webkit-line-clamp needs a -webkit-box, which an article's paragraphs and
 * lists cannot live inside.
 */
const BODY_LINES = 5
const BODY_COLLAPSED = 140

/** Who can read a restricted post, said on the card so nobody has to guess. */
const AUDIENCE: Record<string, { label: string; hint: string }> = {
  followers: { label: 'Followers', hint: 'Only the author’s followers can see this.' },
  circle: { label: 'Circle', hint: 'Shared with a circle — only its members and the author can see this.' },
  community: { label: 'Community', hint: 'Shared with a community — only its members can see this.' },
}

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
    // One split over both, so a hashtag inside a URL's fragment is not turned
    // into a topic link in the middle of an address.
    .split(/(https?:\/\/[^\s<>"']+|#[\wÀ-ÿ؀-ۿ一-鿿][\wÀ-ÿ؀-ۿ一-鿿-]{1,49})/g)
    .map((part, index) => {
      if (/^https?:\/\//i.test(part)) {
        // Trailing punctuation belongs to the sentence, not the address.
        const trailing = part.match(/[.,;:!?)\]]+$/)?.[0] ?? ''
        const href = trailing ? part.slice(0, -trailing.length) : part
        return (
          <span key={index}>
            <a
              href={href}
              target="_blank"
              // noreferrer as well as noopener: otherwise the destination
              // learns which Kinjy page the reader came from, which for a
              // private post is its address.
              rel="noopener noreferrer nofollow"
              className="font-medium text-sky hover:underline"
            >
              {href}
            </a>
            {trailing}
          </span>
        )
      }
      if (part.startsWith('#')) {
        return (
          <Link
            key={index}
            to={`/hub?mode=topics&topic=${encodeURIComponent(part.slice(1).toLowerCase())}`}
            className="font-medium text-gold-soft hover:underline"
          >
            {part}
          </Link>
        )
      }
      return part
    })
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

// The reasons a member can pick. Deliberately short and in plain words: a
// long taxonomy makes people give up or pick at random, and the reason is only
// a routing hint - the classification is decided by a reviewer, not by whoever
// reported it.
const REPORT_REASONS = [
  { id: 'sexual', label: 'Sexual content' },
  { id: 'violence', label: 'Violence' },
  { id: 'hate', label: 'Hate or abuse' },
  { id: 'self_harm', label: 'Self-harm' },
  { id: 'child_safety', label: 'A child is at risk' },
  { id: 'spam', label: 'Spam or a scam' },
  { id: 'other', label: 'Something else' },
] as const

export default function PostCard({
  post,
  algorithmId,
  mode = 'new',
  isOwn,
  currentUserId,
  onHidden,
  onChangeAlgorithm,
  commentsAlwaysOpen = false,
  onOpen,
}: {
  post: Post
  algorithmId: string
  /** The feed mode this card came from — an unranked mode must not claim a score. */
  mode?: string
  isOwn: boolean
  currentUserId: string
  onHidden: (postId: string) => void
  onChangeAlgorithm: () => void
  /** In the post dialog the comments are the point: open, and no toggle. */
  commentsAlwaysOpen?: boolean
  /**
   * Open this post in a dialog. Given by the feed; absent inside the dialog
   * itself, where the card must not be able to open another copy of itself.
   */
  onOpen?: () => void
}) {
  const { i18n } = useTranslation()
  const target = post.repost_of ?? post
  const [reactions, setReactions] = useState(target.reactions ?? { counts: {}, total: 0, mine: null })
  const [comments, setComments] = useState(target.comments_count)
  const [showComments, setShowComments] = useState(commentsAlwaysOpen)
  const [preview, setPreview] = useState<number | null>(null)
  // Reporting. Held open as a small inline panel rather than a modal: a report
  // is a judgement about the thing you are looking at, and a dialog that
  // covers the post asks you to make it from memory.
  // Sharing outside Kinjy. `withRef` is the member's choice about whether the
  // link carries their invitation code; it is on by default because the whole
  // point of sharing a post is that somebody might join from it, but it is
  // shown rather than hidden, and it can be turned off - a code is a claim on
  // whoever signs up, and a member is entitled to pass something on without
  // making that claim.
  const { user: me } = useAuth()
  const [shareOpen, setShareOpen] = useState(false)
  const [withRef, setWithRef] = useState(true)
  const [shareNote, setShareNote] = useState<string | null>(null)
  const [reporting, setReporting] = useState(false)
  const [reported, setReported] = useState(false)
  const [reportFailed, setReportFailed] = useState(false)
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
  // Only a public post has a link worth giving away: everything else answers
  // 404 to the person who receives it, which is a worse experience than not
  // offering the button.
  const shareable = target.visibility === 'public'
  const myRef = withRef ? me?.referral_code ?? null : null
  const shareUrl = postUrl(target.id, myRef)

  const doShare = async () => {
    // The author can be null when the profile lookup did not resolve. That is
    // a reason for a plainer share title, not for the share to fail.
    const who = source.author?.display_name
    const result = await shareLink(shareUrl, who ? `${who} on Kinjy` : 'A post on Kinjy')
    setShareNote(
      result === 'shared'
        ? null
        : result === 'copied'
          ? 'Link copied.'
          : result === 'cancelled'
            ? null
            : 'Could not copy — select the link and copy it by hand.',
    )
  }

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
  // The first link in the body is the one worth unfurling; a post full of
  // links is a list, and five cards under it is not a post any more. Declared
  // after plainBody, which it reads - a const used above its declaration is a
  // crash, not a hoist.
  const bodyLink = firstLink(plainBody)

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
            {AUDIENCE[source.visibility] && (
              <span
                className="inline-flex items-center gap-1 text-text-mid"
                title={AUDIENCE[source.visibility].hint}
              >
                <Lock size={10} aria-hidden="true" />
                {AUDIENCE[source.visibility].label}
              </span>
            )}
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
              'flex h-7 w-7 items-center justify-center rounded-full',
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
            {/* withHashtags here too: a link does not stop being a link
                because the reader asked to see the translation beside it. */}
            <p className="whitespace-pre-wrap text-[0.95rem] leading-relaxed text-text-hi">
              {withHashtags(readableText(plainBody))}
            </p>
          </div>
          <div className="sm:border-s sm:border-white/8 sm:ps-4">
            <p className="caption mb-1 uppercase">{uiLang} · translated</p>
            <p className="whitespace-pre-wrap text-[0.95rem] leading-relaxed text-text-hi">
              {withHashtags(translation.text)}
            </p>
          </div>
        </div>
      ) : isRichArticle ? (
        /* Sanitised again at render time: the database can hold anything, and
           trusting what was cleaned on the way in would only move the risk. */
        <Expandable collapsedHeight={BODY_COLLAPSED} className="mt-3" deps={[body]}>
          <div
            className="prose-article text-[0.95rem] text-text-hi"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(body) }}
          />
        </Expandable>
      ) : (
        /* The body opens the post. Not a <button>: the text contains links and
           hashtags that must stay clickable in their own right, and nesting
           interactive elements inside a button is invalid and unreadable to a
           screen reader. A plain click handler leaves them alone, and the
           header already offers a keyboard route to the same place. */
        <Expandable collapsedHeight={BODY_COLLAPSED} lines={BODY_LINES} className="mt-3" deps={[body]}>
          <p
            onClick={(event) => {
              if (!onOpen) return
              // A click that landed on a link, a hashtag or a text selection is
              // not a request to open the post.
              if ((event.target as HTMLElement).closest('a,button')) return
              if (window.getSelection()?.toString()) return
              onOpen()
            }}
            className={cn(
              'whitespace-pre-wrap text-[0.95rem] leading-relaxed text-text-hi',
              onOpen && 'cursor-pointer',
            )}
          >
            {withHashtags(readableText(body))}
          </p>
        </Expandable>
      )}

      {/* Only when the post has no media of its own: a post with a photo and a
          link does not need two pictures competing for the same glance. */}
      {media.length === 0 && bodyLink && <LinkPreview url={bodyLink} />}

      <KnownActors actors={target.known_actors} />

      {/* Attached media. The layout follows the count - see MediaGrid: a
          single picture is never cropped, a grid is. */}
      {media.length > 0 && (
        <MediaGrid
          media={media}
          onOpen={setPreview}
          onLoadDeferred={loadMedia}
          loadingDeferred={loadingMedia}
          autoplay={post.autoplay !== false}
        />
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
          onClick={() => (onOpen ? onOpen() : setShowComments(true))}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-text-mid hover:text-text-hi"
        >
          <MessageCircle size={13} aria-hidden="true" />
          {comments}
        </button>

        <button
          type="button"
          onClick={toggleRepost}
          // A repost carries the original inside it, so only public posts can
          // travel further; the server refuses the rest, and the button says so.
          disabled={busy || (target.visibility !== 'public' && !reposted)}
          aria-pressed={reposted}
          title={
            reposted
              ? 'Undo repost'
              : target.visibility !== 'public'
                ? 'Only public posts can be shared'
                : 'Share this to your followers'
          }
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-40',
            reposted ? 'text-success' : 'text-text-mid hover:text-text-hi',
          )}
        >
          <Repeat2 size={14} aria-hidden="true" />
          {reposts}
        </button>

        <button
          type="button"
          onClick={() => {
            setShareNote(null)
            setShareOpen((open) => !open)
          }}
          disabled={!shareable}
          aria-expanded={shareOpen}
          title={
            shareable
              ? 'Share this outside Kinjy'
              : 'Only a public post can be shared outside Kinjy'
          }
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-text-mid hover:text-text-hi disabled:opacity-40"
        >
          <Share2 size={13} aria-hidden="true" />
          Share
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
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-text-mid hover:text-sky disabled:opacity-40"
          >
            {translation ? <Columns2 size={13} aria-hidden="true" /> : <Languages size={13} aria-hidden="true" />}
            {translating ? 'Translating…' : translation ? (sideBySide ? 'Single column' : 'Side by side') : 'Translate'}
          </button>
        )}

        {!isOwn && (
          <button
            type="button"
            onClick={() => setReporting((open) => !open)}
            aria-expanded={reporting}
            disabled={reported}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-text-low hover:text-text-hi disabled:opacity-40"
          >
            <Flag size={13} aria-hidden="true" />
            {reported ? 'Reported' : 'Report'}
          </button>
        )}

        {isOwn ? (
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="ms-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-text-low hover:text-red-200 disabled:opacity-40"
          >
            <Trash2 size={13} aria-hidden="true" />
            Delete
          </button>
        ) : (
          <button
            type="button"
            onClick={showLess}
            disabled={busy}
            className="ms-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-text-low hover:text-text-hi disabled:opacity-40"
          >
            <EyeOff size={13} aria-hidden="true" />
            Show less like this
          </button>
        )}
      </footer>

      {shareOpen && shareable && (
        <div className="mt-2 rounded-xl border border-text-low/25 p-3">
          <p className="text-xs font-semibold text-text-hi">Share this outside Kinjy</p>

          {/* The link is shown rather than only copied. A member about to put
              their name on something in a group chat should be able to read
              what they are about to send, including the code on the end. */}
          <p className="mt-2 break-all rounded-lg bg-ink-2/50 px-2.5 py-2 text-[0.7rem] text-text-mid">
            {shareUrl}
          </p>

          {me?.referral_code && (
            <label className="mt-2.5 flex items-start gap-2 text-xs text-text-mid">
              <input
                type="checkbox"
                checked={withRef}
                onChange={(e) => setWithRef(e.target.checked)}
                className="mt-0.5 accent-gold"
              />
              <span>
                Include my invitation code
                <span className="ms-1 font-mono text-text-low">{me.referral_code}</span>
                <span className="mt-0.5 block text-text-low">
                  Anyone who joins from this link is credited to you.
                </span>
              </span>
            </label>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={doShare}
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-gold-soft to-gold px-3.5 py-1.5 text-xs font-bold text-ink"
            >
              <Link2 size={12} aria-hidden="true" />
              Copy link
            </button>
            {shareNote && (
              <span role="status" className="inline-flex items-center gap-1 text-xs text-text-mid">
                <Check size={12} aria-hidden="true" />
                {shareNote}
              </span>
            )}
          </div>
        </div>
      )}

      {reporting && !reported && (
        <div className="mt-2 rounded-xl border border-text-low/25 p-3">
          <p className="text-xs font-semibold text-text-hi">What is wrong with this?</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {REPORT_REASONS.map((reason) => (
              <button
                key={reason.id}
                type="button"
                onClick={async () => {
                  // Not optimistic. An earlier version of this showed "thanks,
                  // a reviewer will look at this" the moment you clicked and
                  // swallowed any failure — which, the first time the gateway
                  // was down, told somebody their report was filed when nothing
                  // had been recorded anywhere. Somebody reporting a child at
                  // risk has to be able to believe that message.
                  //
                  // What is still withheld is the *outcome*: whether the report
                  // moved a rating. That is what would turn reporting into a
                  // way to probe the threshold. Whether we received it is a
                  // different question, and the member is owed the truth.
                  setReportFailed(false)
                  setReporting(false)
                  try {
                    await kaluta.moderation.reportPost(target.id, reason.id)
                    setReported(true)
                  } catch {
                    setReportFailed(true)
                  }
                }}
                className="rounded-full border border-text-low/30 px-3 py-1.5 text-xs text-text-mid hover:text-text-hi"
              >
                {reason.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[0.7rem] text-text-low">
            Reports go to a reviewer. They are not shared with whoever posted this.
          </p>
        </div>
      )}

      {reported && (
        <p className="mt-2 text-xs text-text-mid">
          Thanks — a reviewer will look at this. You will not hear back about it.
        </p>
      )}

      {reportFailed && (
        <p role="alert" className="mt-2 text-xs text-danger">
          That did not send, so nothing has been reported.{' '}
          <button
            type="button"
            onClick={() => {
              setReportFailed(false)
              setReporting(true)
            }}
            className="underline"
          >
            Try again
          </button>
        </p>
      )}


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
