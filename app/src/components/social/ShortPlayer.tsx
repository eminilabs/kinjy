import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import {
  Eye,
  Heart,
  MessageCircle,
  Pause,
  Play,
  Repeat2,
  Share2,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { ApiError, kaluta, type Post } from '@/lib/api'
import { useTopic } from '@/hooks/useRealtime'
import { cn } from '@/lib/utils'
import MemberAvatar from './MemberAvatar'
import { useAuth } from '@/hooks/useAuth'
import { postUrl, shareLink } from '@/lib/share'
import { CommentsDialog, RepostDialog, ShareDialog } from './PostModals'

function compact(n: number): string {
  if (n < 1000) return String(n)
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}K`
  return `${(n / 1_000_000).toFixed(1)}M`
}

/** Caption hashtags link to that topic's feed — same pattern the server extracts. */
function withHashtags(text: string) {
  return text
    .split(/(#[\wÀ-ÿ؀-ۿ一-鿿][\wÀ-ÿ؀-ۿ一-鿿-]{1,49})/g)
    .map((part, index) =>
      part.startsWith('#') ? (
        <Link
          key={index}
          to={`/hub?mode=topics&topic=${encodeURIComponent(part.slice(1).toLowerCase())}`}
          onClick={(event) => event.stopPropagation()}
          className="font-semibold text-gold-soft hover:underline"
        >
          {part}
        </Link>
      ) : (
        part
      ),
    )
}

interface ShortProps {
  post: Post
  active: boolean
  muted: boolean
  onToggleMute: () => void
  currentUserId: string
  /** False when the member turned autoplay off — the clip waits for a tap. */
  autoplay: boolean
}

/**
 * One clip in the reel.
 *
 * Only the active clip is allowed to play, and only the active clip keeps a
 * decoded source: a column of ten `<video>` elements all buffering is how a
 * reel becomes unusable on a phone. `preload` is likewise limited to the
 * neighbours, so scrolling feels instant without fetching the whole page.
 */
function Short({ post, active, muted, onToggleMute, currentUserId, autoplay }: ShortProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [likes, setLikes] = useState(post.likes_count)
  const [liked, setLiked] = useState(post.reactions?.mine === 'like')
  const [reposts, setReposts] = useState(post.reposts_count)
  const [reposted, setReposted] = useState(Boolean(post.reposted_by_me))
  const [comments, setComments] = useState(post.comments_count)
  const [showComments, setShowComments] = useState(false)
  const [repostOpen, setRepostOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const { user: me } = useAuth()
  const lastTap = useRef(0)

  const clip = post.media.find((m) => m.kind === 'video' && m.url)
  const [views, setViews] = useState(post.views_count ?? 0)

  // Counts move while you watch. The actor's own events are ignored: their
  // optimistic update already ran and replaying it makes the number jump.
  useTopic(`post:${post.id}`, (event) => {
    if (event.actor && event.actor === currentUserId) return
    if (typeof event.likes_count === 'number') setLikes(event.likes_count)
    if (typeof event.comments_count === 'number') setComments(event.comments_count)
    if (typeof event.reposts_count === 'number') setReposts(event.reposts_count)
    if (typeof event.views_count === 'number') setViews(event.views_count)
  })

  // Play only while active. Pausing on the way out matters as much as playing
  // on the way in — a paused-but-loaded clip off screen still holds a decoder.
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (active && autoplay) {
      void video.play().then(
        () => setPlaying(true),
        // Autoplay with sound is refused by every browser; muted playback is
        // the fallback rather than a silent failure with a frozen frame.
        () => setPlaying(false),
      )
    } else {
      video.pause()
      setPlaying(false)
      if (!active) {
        video.currentTime = 0
        setProgress(0)
      }
    }
  }, [active, autoplay])

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      void video.play().then(() => setPlaying(true), () => undefined)
    } else {
      video.pause()
      setPlaying(false)
    }
  }, [])

  const like = useCallback(
    async (force?: boolean) => {
      const next = force ?? !liked
      if (force && liked) return // double-tap only ever likes, never unlikes
      setLiked(next)
      setLikes((n) => n + (next ? 1 : -1))
      try {
        const result = await kaluta.posts.like(post.id)
        setLiked(result.liked)
        setLikes(result.likes_count)
      } catch {
        setLiked(!next)
        setLikes((n) => n + (next ? -1 : 1))
      }
    },
    [liked, post.id],
  )

  /** Tap pauses; a second tap within 300ms likes instead. */
  const onSurfaceTap = () => {
    const now = Date.now()
    if (now - lastTap.current < 300) {
      lastTap.current = 0
      // Undo the pause the first tap caused, then like.
      togglePlay()
      void like(true)
      return
    }
    lastTap.current = now
    togglePlay()
  }

  const doRepost = async (thoughts: string) => {
    try {
      await kaluta.posts.repost(post.id, thoughts)
    } catch (err) {
      throw new Error(err instanceof ApiError ? err.message : 'Could not repost')
    }
    setReposted(true)
    setReposts((n) => n + 1)
  }

  const undoRepost = async () => {
    try {
      await kaluta.posts.undoRepost(post.id)
    } catch (err) {
      throw new Error(err instanceof ApiError ? err.message : 'Could not undo the repost')
    }
    setReposted(false)
    setReposts((n) => Math.max(0, n - 1))
  }

  // Only a public post has a link worth giving away; the rest answer 404.
  const shareable = post.visibility === 'public'

  const seek = (event: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current
    if (!video || !video.duration) return
    const rect = event.currentTarget.getBoundingClientRect()
    video.currentTime = ((event.clientX - rect.left) / rect.width) * video.duration
  }

  const RailButton = ({
    icon: Icon,
    label,
    count,
    onClick,
    on,
    fill,
  }: {
    icon: typeof Heart
    label: string
    count?: number
    onClick: () => void
    on?: boolean
    fill?: boolean
  }) => (
    <button
      type="button"
      aria-label={label}
      aria-pressed={on}
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
      className={cn(
        'flex flex-col items-center gap-1',
        on ? 'text-gold-soft' : 'text-white',
      )}
    >
      <span className="grid h-11 w-11 place-items-center rounded-full bg-black/35 backdrop-blur-sm">
        <Icon size={21} fill={fill && on ? 'currentColor' : 'none'} aria-hidden="true" />
      </span>
      {count !== undefined && <span className="text-[0.7rem] font-semibold">{compact(count)}</span>}
    </button>
  )

  return (
    <li
      className="relative h-full w-full shrink-0 snap-start snap-always overflow-hidden bg-black"
      data-post-id={post.id}
    >
      {clip ? (
        <>
          {/* Blurred fill so a portrait clip on a wide screen — or a landscape
              one in a portrait frame — sits on its own colour rather than on
              black bars. */}
          <video
            aria-hidden="true"
            src={clip.url ?? undefined}
            muted
            playsInline
            className="absolute inset-0 h-full w-full scale-110 object-cover opacity-30 blur-2xl"
          />
          <video
            ref={videoRef}
            src={clip.url ?? undefined}
            loop
            muted={muted}
            playsInline
            preload={active ? 'auto' : 'none'}
            onTimeUpdate={(event) => {
              const video = event.currentTarget
              if (video.duration) setProgress(video.currentTime / video.duration)
            }}
            onClick={onSurfaceTap}
            className="relative h-full w-full cursor-pointer object-contain"
          />
        </>
      ) : (
        <div className="flex h-full items-center justify-center p-6 text-center text-sm text-white/70">
          This short has no playable clip.
        </div>
      )}

      {/* Paused indicator — TikTok shows the state, it does not hide it. */}
      {clip && !playing && (
        <span className="pointer-events-none absolute inset-0 grid place-items-center">
          <Play size={56} className="text-white/70 drop-shadow-lg" aria-hidden="true" />
        </span>
      )}


      {/* Caption */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent p-4 pb-14 pe-20">
        <div className="pointer-events-auto flex items-center gap-2.5">
          <MemberAvatar
            handle={post.author?.handle}
            displayName={post.author?.display_name}
            avatarUrl={post.author?.avatar_url}
            size={34}
          />
          <div className="min-w-0">
            {post.author?.handle ? (
              <Link
                to={`/u/${post.author.handle}`}
                className="text-sm font-bold text-white hover:underline"
              >
                @{post.author.handle}
              </Link>
            ) : (
              <span className="text-sm font-bold text-white">
                @{post.author_id.slice(0, 12)}
              </span>
            )}
            {post.mature && (
              <span className="ms-2 rounded-full bg-white/15 px-2 py-0.5 text-[0.62rem] font-bold text-white">
                18+
              </span>
            )}
          </div>
        </div>

        {post.body && (
          <p className="pointer-events-auto mt-2 line-clamp-4 text-sm leading-relaxed text-white/90">
            {withHashtags(post.body)}
          </p>
        )}

        <p className="mt-2 flex items-center gap-3 text-[0.7rem] text-white/60">
          {post.provenance !== 'original' && (
            <span className="rounded-full bg-white/15 px-2 py-0.5 font-semibold">
              {post.provenance.replace('_', ' ')}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Eye size={11} aria-hidden="true" />
            {compact(views)}
          </span>
          {clip?.duration_seconds ? (
            <span>{Math.round(clip.duration_seconds)}s</span>
          ) : null}
        </p>
      </div>

      {/* Action rail */}
      <div className="absolute bottom-16 end-3 flex flex-col items-center gap-3.5">
        <RailButton icon={Heart} label="Like" count={likes} onClick={() => void like()} on={liked} fill />
        <RailButton
          icon={MessageCircle}
          label="Comments"
          count={comments}
          onClick={() => setShowComments(true)}
        />
        <RailButton
          icon={Repeat2}
          label={reposted ? 'Undo repost' : 'Repost'}
          count={reposts}
          onClick={() => setRepostOpen(true)}
          on={reposted}
        />
        {shareable && <RailButton icon={Share2} label="Share" onClick={() => setShareOpen(true)} />}
        <RailButton
          icon={muted ? VolumeX : Volume2}
          label={muted ? 'Unmute' : 'Mute'}
          onClick={onToggleMute}
        />
        <RailButton
          icon={playing ? Pause : Play}
          label={playing ? 'Pause' : 'Play'}
          onClick={togglePlay}
        />
      </div>

      {/* Scrubber */}
      {clip && (
        <div
          role="presentation"
          onClick={(event) => {
            event.stopPropagation()
            seek(event)
          }}
          // Lifted off the edge: at the very bottom it sits under a phone's home
          // bar and is hard to hit. The grab area is taller than the line.
          className="absolute inset-x-3 bottom-[max(0.9rem,env(safe-area-inset-bottom))] flex h-6 cursor-pointer items-center"
        >
          <div className="w-full overflow-hidden rounded-full bg-white/25 h-1">
            <div
              className="h-full bg-white"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* The same windows as everywhere else: comments with their input pinned,
          repost with an optional quote, share with the link. They sit above the
          reel, and the clip keeps playing underneath. The post is already on
          screen, so the comments window does not repeat its video. */}
      <CommentsDialog
        open={showComments}
        onOpenChange={setShowComments}
        post={post}
        currentUserId={currentUserId}
        count={comments}
        media={[]}
        autoplay={false}
        onCountChange={(delta) => setComments((n) => n + delta)}
      />
      <RepostDialog
        open={repostOpen}
        onOpenChange={setRepostOpen}
        post={post}
        reposted={reposted}
        onRepost={doRepost}
        onUndo={undoRepost}
      />
      {shareable && (
        <ShareDialog
          open={shareOpen}
          onOpenChange={setShareOpen}
          post={post}
          baseUrl={postUrl(post.id, null)}
          buildUrl={(withRef) => postUrl(post.id, withRef ? me?.referral_code ?? null : null)}
          referralCode={me?.referral_code ?? null}
          nativeShare={(url) => shareLink(url, post.author?.display_name ? `${post.author.display_name} on Kinjy` : 'A post on Kinjy')}
        />
      )}
    </li>
  )
}

/**
 * The reel — a full-height snap column, one clip per screen.
 *
 * Which clip is "active" is decided here rather than by each clip watching
 * itself: during a fast scroll two clips can both be over any per-element
 * threshold at once, and both would start playing. One observer picking the
 * most-visible entry keeps that to exactly one.
 */
export default function ShortPlayer({
  posts,
  currentUserId,
  autoplay = true,
  onReachEnd,
  startId,
  className,
}: {
  posts: Post[]
  currentUserId: string
  autoplay?: boolean
  onReachEnd?: () => void
  /** Open on this clip rather than the first. */
  startId?: string
  className?: string
}) {
  const containerRef = useRef<HTMLUListElement>(null)
  const [activeId, setActiveId] = useState<string | null>(startId ?? posts[0]?.id ?? null)

  // Land on the clip that was asked for, before the first paint of the list.
  useLayoutEffect(() => {
    const root = containerRef.current
    const target = startId ? root?.querySelector<HTMLElement>(`[data-post-id="${startId}"]`) : null
    if (root && target) root.scrollTop = target.offsetTop
    // Once, on mount: the reel then belongs to the reader's scrolling.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [muted, setMuted] = useState(true)

  useEffect(() => {
    const root = containerRef.current
    if (!root) return
    const observer = new IntersectionObserver(
      (entries) => {
        let best: { id: string; ratio: number } | null = null
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.postId
          if (!id) continue
          if (!best || entry.intersectionRatio > best.ratio) {
            best = { id, ratio: entry.intersectionRatio }
          }
        }
        if (best && best.ratio > 0.55) {
          setActiveId(best.id)
          if (best.id === posts[posts.length - 1]?.id) onReachEnd?.()
        }
      },
      { root, threshold: [0.3, 0.55, 0.8, 1] },
    )
    root.querySelectorAll<HTMLElement>('[data-post-id]').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [posts, onReachEnd])

  // Arrow keys and space, because a reel on a laptop is driven by the keyboard.
  useEffect(() => {
    const root = containerRef.current
    if (!root) return
    const onKey = (event: KeyboardEvent) => {
      if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp'].includes(event.key)) {
        event.preventDefault()
        const step = event.key === 'ArrowDown' || event.key === 'PageDown' ? 1 : -1
        root.scrollBy({ top: step * root.clientHeight, behavior: 'auto' })
      }
      if (event.key === 'm') setMuted((m) => !m)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <ul
      ref={containerRef}
      tabIndex={0}
      aria-label="Shorts reel"
      className={cn(
        'mx-auto h-[calc(100svh-21rem)] min-h-[460px] w-full max-w-[420px] snap-y snap-mandatory overflow-y-auto overscroll-contain',
        'rounded-[28px] bg-black shadow-[0_30px_60px_-30px_rgba(36,31,22,0.55)] ring-1 ring-black/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60',
        // Scrollbars are hidden platform-wide; scrolling still works.
        '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
    >
      {posts.map((post) => (
        <Short
          key={post.id}
          post={post}
          active={post.id === activeId}
          muted={muted}
          onToggleMute={() => setMuted((m) => !m)}
          currentUserId={currentUserId}
          autoplay={autoplay}
        />
      ))}
    </ul>
  )
}
