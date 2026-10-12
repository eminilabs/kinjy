import { useCallback, useEffect, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router'
import { Clapperboard, Loader2, Plus } from 'lucide-react'
import AppShell from '@/components/app/AppShell'
import ShortPlayer from '@/components/social/ShortPlayer'
import ShortComposer from '@/components/social/ShortComposer'
import { useAuth } from '@/hooks/useAuth'
import { ApiError, kaluta, type Post } from '@/lib/api'

const PAGE = 8

/**
 * Shorts — the vertical reel.
 *
 * A short is a declared format (`format: 'short'`), not any video the feed
 * happened to receive: a landscape clip written for the feed should not be
 * promoted into a full-screen reel it was never framed for. The composer here
 * is the only way to publish one, which is what was missing — the reel existed
 * with no door into it.
 */
export default function Shorts() {
  const { user, loading: authLoading } = useAuth()
  const [params] = useSearchParams()
  const [items, setItems] = useState<Post[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [autoplay, setAutoplay] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [composing, setComposing] = useState(false)

  const load = useCallback(async (offset = 0) => {
    if (offset === 0) setLoading(true)
    setError(null)
    try {
      const page = await kaluta.shorts.page({ limit: PAGE, offset })
      setItems((current) => {
        if (offset === 0) return page.items
        // Guard against a duplicate page: `offset` paging over a list that
        // gains rows can return something already on screen, and a repeated
        // key would remount the clip that is currently playing.
        const seen = new Set(current.map((p) => p.id))
        return [...current, ...page.items.filter((p) => !seen.has(p.id))]
      })
      setHasMore(page.has_more)
      setAutoplay(page.applied_settings?.autoplay_media !== false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load shorts')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) void load(0)
  }, [user, load])

  // A shared link (/shorts?post=…) should open on that clip rather than at the
  // top of the reel.
  useEffect(() => {
    const wanted = params.get('post')
    if (!wanted || !items.length) return
    const el = document.querySelector<HTMLElement>(`[data-post-id="${wanted}"]`)
    el?.scrollIntoView({ block: 'start' })
  }, [params, items])

  // Watching a short counts as a view, through the same endpoint the feed uses
  // — deduplicated per member server-side, so a rewatch adds nothing.
  const [reported, setReported] = useState<Set<string>>(new Set())
  useEffect(() => {
    const fresh = items.map((p) => p.id).filter((id) => !reported.has(id))
    if (!fresh.length) return
    setReported((seen) => new Set([...seen, ...fresh]))
    void kaluta.posts.views(fresh).catch(() => undefined)
  }, [items, reported])

  if (authLoading) {
    return (
      <div className="flex min-h-[60svh] items-center justify-center" role="status" aria-label="Loading">
        <div className="h-12 w-12 rounded-full animate-orb-breathe" style={{ background: 'var(--grad-orb)' }} />
      </div>
    )
  }
  if (!user) return <Navigate to="/join?mode=signin" replace />

  return (
    <AppShell>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <p className="mono-data text-[0.72rem] font-bold uppercase tracking-[0.15em] text-gold-soft">Shorts</p>
          <h1 className="mt-2 text-[clamp(38px,5vw,56px)] font-bold leading-[1.02] tracking-[-0.045em] text-text-hi">
            Quick, vertical, yours
          </h1>
          <p className="mt-3 max-w-xl text-[0.95rem] leading-relaxed text-text-low">
            Swipe, or use the arrow keys. Only the clip on screen plays.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setComposing(true)}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-gold-soft to-gold px-6 py-3 text-sm font-bold text-ink shadow-[0_8px_20px_-10px_rgba(166,120,57,0.6)] hover:brightness-110"
        >
          <Plus size={16} aria-hidden="true" />
          New short
        </button>
      </header>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-16 text-text-low" role="status">
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          <span className="text-sm">Loading the reel…</span>
        </div>
      )}

      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {error}
        </p>
      )}

      {!loading && items.length === 0 && (
        <div className="cloud-card mx-auto max-w-lg px-8 py-14 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gold/15 text-gold-soft">
            <Clapperboard size={26} aria-hidden="true" />
          </span>
          <p className="mt-5 text-lg font-bold tracking-[-0.02em] text-text-hi">No shorts yet</p>
          <p className="mt-1.5 text-sm leading-relaxed text-text-low">Yours would be the first.</p>
          <button
            type="button"
            onClick={() => setComposing(true)}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-gold-soft to-gold px-6 py-3 text-sm font-bold text-ink hover:brightness-110"
          >
            <Plus size={15} aria-hidden="true" />
            Post a short
          </button>
        </div>
      )}

      {!loading && items.length > 0 && (
        <>
          <ShortPlayer
            posts={items}
            currentUserId={user.id}
            autoplay={autoplay}
            onReachEnd={() => {
              if (hasMore && !loading) void load(items.length)
            }}
          />
          {!autoplay && (
            <p className="mt-4 text-center text-sm text-text-low">
              Autoplay is off in your settings — tap a clip to start it.
            </p>
          )}
        </>
      )}

      <ShortComposer
        open={composing}
        onOpenChange={setComposing}
        onPublished={() => void load(0)}
      />
    </AppShell>
  )
}
