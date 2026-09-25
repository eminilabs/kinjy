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
    <AppShell
      title="Shorts"
      subtitle="Swipe, or use the arrow keys. Only the clip on screen plays."
      action={
        <button
          type="button"
          onClick={() => setComposing(true)}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-gold-soft to-gold px-4 py-2 text-sm font-bold text-ink transition hover:brightness-110"
        >
          <Plus size={15} aria-hidden="true" />
          New short
        </button>
      }
    >
      {loading && (
        <div className="flex items-center justify-center gap-2 py-16 text-text-low" role="status">
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          <span className="text-sm">Loading the reel…</span>
        </div>
      )}

      {error && <p className="py-4 text-sm text-amber-200">{error}</p>}

      {!loading && items.length === 0 && (
        <div className="mx-auto max-w-md rounded-card-md border border-white/8 bg-ink-2/60 p-10 text-center">
          <Clapperboard size={24} className="mx-auto text-text-low" aria-hidden="true" />
          <p className="mt-3 text-sm text-text-mid">
            No shorts yet. Yours would be the first.
          </p>
          <button
            type="button"
            onClick={() => setComposing(true)}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-gold-soft to-gold px-5 py-2.5 text-sm font-bold text-ink transition hover:brightness-110"
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
            <p className="caption mt-3 text-center">
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
