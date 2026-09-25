import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, Link, useSearchParams } from 'react-router'
import { Loader2, PenLine, Sparkles, TrendingUp } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import AppShell, { RailCard } from '@/components/app/AppShell'
import { useApi } from '@/hooks/useApi'
import { useViewTracking } from '@/hooks/useViewTracking'
import Composer from '@/components/social/Composer'
import FeedModeMenu from '@/components/social/FeedModeMenu'
import Suggestions from '@/components/social/Suggestions'
import PostCard from '@/components/social/PostCard'
import { ApiError, kaluta, type Algorithm, type FeedMode, type FeedPage, type Post } from '@/lib/api'
import { slotAboveOrb } from '@/lib/floating'
import { useTopic } from '@/hooks/useRealtime'
import { cn } from '@/lib/utils'

const EMPTY_REASON: Record<string, string> = {
  not_following_anyone: 'You are not following anyone yet. Switch to New or For You to find people.',
}

/**
 * The member's Social Hub — the real feed, not the marketing demo at /feeds.
 *
 * Blueprint §1: the feed modes are explicit and separate. "Following" is
 * strictly reverse-chronological and the UI says so, because the promise only
 * means something if it is visible: a ranked feed labelled chronological would
 * be the exact conflict the blueprint set out to resolve.
 */
export default function SocialHub() {
  const { user, loading: authLoading } = useAuth()
  // The Universal Navigation links to /hub?mode=… , so the query string is the
  // source of truth for which feed mode is showing.
  const [params, setParams] = useSearchParams()
  const mode = params.get('mode') ?? 'new'

  // The place and topic filters live in the URL alongside the mode. They used to
  // be local state, so a hashtag link like ?mode=topics&topic=tag switched the
  // mode and then silently ignored the topic — the feed came back unfiltered and
  // clicking a tag looked like it did nothing.
  const topic = params.get('topic') ?? ''
  const city = params.get('city') ?? ''
  const country = params.get('country') ?? ''

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }
  const setMode = (next: string) => {
    // Switching mode drops a filter that belonged to the previous one.
    const params = next === 'new' ? new URLSearchParams() : new URLSearchParams({ mode: next })
    setParams(params, { replace: true })
  }
  const [algorithmId, setAlgorithmId] = useState<string>('friends_first')
  // The member's saved defaults, applied once. Without this the two settings
  // in Feed & experience were stored, returned by the API, and then overruled
  // by a hardcoded 'new' / 'friends_first' every time the page opened.
  //
  // The feed waits for this to resolve. Applying the defaults *after* a first
  // load meant three feeds were built per page open — the hardcoded pair, then
  // the saved algorithm, then the saved mode — three rankings of 500 candidates
  // for one screen.
  const appliedDefaults = useRef(false)
  const [defaultsReady, setDefaultsReady] = useState(false)
  const [orbVisible, setOrbVisible] = useState(true)
  useEffect(() => {
    if (appliedDefaults.current) return
    appliedDefaults.current = true
    void kaluta.account
      .preferences()
      .then((prefs) => {
        const algorithm = prefs.algorithm_id
        if (typeof algorithm === 'string' && algorithm) setAlgorithmId(algorithm)
        // The floating composer button stacks above the orb, so it needs to
        // know whether the orb is there at all.
        setOrbVisible(prefs.assistant_visible !== false)
        // Only when the URL says nothing: a shared link or a hashtag click is
        // an explicit request and must win over the default.
        const savedMode = prefs.default_feed_mode
        if (!params.get('mode') && typeof savedMode === 'string' && savedMode && savedMode !== 'new') {
          setParams(new URLSearchParams({ mode: savedMode }), { replace: true })
        }
      })
      // A preferences outage must not leave the feed empty — it falls back to
      // the built-in defaults and loads anyway.
      .catch(() => undefined)
      .finally(() => setDefaultsReady(true))
    // Runs once; params/setParams are read at call time, not tracked.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [feed, setFeed] = useState<FeedPage | null>(null)
  // Cards report themselves as seen from here rather than each card firing its
  // own request — one observer, one batched call.
  const feedRef = useRef<HTMLDivElement>(null)
  useViewTracking(feedRef, Boolean(feed))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // New posts are announced, not injected. Splicing a stranger's post into the
  // list while somebody is reading moves the text under their eyes; a banner
  // lets them choose the moment.
  const [pending, setPending] = useState(0)
  useTopic('feed', (event) => {
    if (event.type !== 'post') return
    if (event.author_id === user?.id) return
    setPending((n) => n + 1)
  })

  // Past the first screenful the composer card has served its purpose, so it
  // gives the width back to the posts and becomes a floating button instead.
  const [scrolled, setScrolled] = useState(false)
  const [openComposer, setOpenComposer] = useState(0)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 220)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Arriving from "Change my algorithm": bring the picker into view and focus
  // it, so the link lands on the control rather than merely on the page.
  useEffect(() => {
    if (params.get('focus') !== 'algorithm') return
    const picker = document.getElementById('algorithm-picker') as HTMLSelectElement | null
    if (!picker) return
    picker.scrollIntoView({ block: 'center', behavior: 'smooth' })
    picker.focus()
    const next = new URLSearchParams(params)
    next.delete('focus')
    setParams(next, { replace: true })
  }, [params, setParams])

  const modes = useApi<{ modes: FeedMode[] }>(() => kaluta.feeds.modes(), [])
  const algorithms = useApi<{ items: Algorithm[] }>(() => kaluta.feeds.algorithms(), [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setFeed(
        await kaluta.feeds.page({
          mode,
          algorithm_id: algorithmId,
          city: mode === 'local' ? city || undefined : undefined,
          country: mode === 'country' ? country || undefined : undefined,
          topic: mode === 'topics' ? topic || undefined : undefined,
        }),
      )
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load the feed')
    } finally {
      setLoading(false)
    }
  }, [mode, algorithmId, city, country, topic])

  useEffect(() => {
    if (user && defaultsReady) void load()
  }, [user, defaultsReady, load])

  if (authLoading) {
    return (
      <div className="flex min-h-[60svh] items-center justify-center" role="status" aria-label="Loading">
        <div className="h-12 w-12 rounded-full animate-orb-breathe" style={{ background: 'var(--grad-orb)' }} />
      </div>
    )
  }
  if (!user) return <Navigate to="/join?mode=signin" replace />

  const prepend = (post: Post) => setFeed((f) => (f ? { ...f, items: [post, ...f.items] } : f))
  const drop = (postId: string) =>
    setFeed((f) => (f ? { ...f, items: f.items.filter((p) => p.id !== postId) } : f))

  // The feed's context, in the shell's own rail rather than a second grid the
  // page invents for itself.
  // Trending, derived from the posts actually on screen rather than invented.
  // The demo shows three fixed hashtags; a real one has to count something, and
  // the honest thing to count here is what this feed is carrying.
  const trending = Object.entries(
    (feed?.items ?? []).flatMap((post) => post.topics).reduce<Record<string, number>>((acc, topic) => {
      acc[topic] = (acc[topic] ?? 0) + 1
      return acc
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const rail = (
    <>
      {/* Docked "why am I seeing this", as /app presents it: the explanation of
          the *feed* lives here, and each card keeps its own Why? button for the
          explanation of that post. */}
      <div className="rounded-card-lg cloud-glass p-4">
        <p className="eyebrow text-gold">Why am I seeing this?</p>
        <p className="mt-2 text-xs leading-relaxed text-text-mid">
          Your feed is currently ranked by{' '}
          <span className="font-bold text-text-hi">
            {feed?.algorithm_name ?? feed?.algorithm ?? 'chronological order'}
          </span>
          .
        </p>
        <ul className="mt-2.5 flex flex-wrap gap-1.5">
          {(feed?.ranked
            ? [`Ranked · ${feed?.total_candidates ?? 0} posts scored`, 'Your algorithm applies']
            : ['Pure chronological', 'No ranking applied']
          ).map((reason) => (
            <li
              key={reason}
              className="rounded-full border border-sky/30 bg-sky/10 px-2.5 py-1 text-[0.65rem] font-semibold text-sky"
            >
              {reason}
            </li>
          ))}
        </ul>
        <p className="mt-2.5 text-[0.65rem] text-text-low">
          Every post carries its own Why? button.
        </p>
      </div>

      {trending.length > 0 && (
        <div className="rounded-card-lg cloud-glass p-4">
          <p className="mb-2.5 flex items-center gap-1.5 text-sm font-bold text-text-hi">
            <TrendingUp size={14} className="text-coral" aria-hidden="true" />
            Trending in this feed
          </p>
          <ul className="space-y-2">
            {trending.map(([topic, count], index) => (
              <li key={topic} className="flex items-baseline gap-2">
                <span className="mono-data text-xs text-gold">{index + 1}</span>
                <Link
                  to={`/hub?mode=topics&topic=${encodeURIComponent(topic)}`}
                  className="min-w-0 flex-1 truncate text-xs font-semibold text-text-mid hover:text-gold-soft"
                >
                  #{topic}
                </Link>
                <span className="mono-data text-[0.65rem] text-text-low">{count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Suggestions />
      <RailCard title="Your algorithm">
        <p className="caption mb-3">Applies to every ranked mode.</p>
        <select
          id="algorithm-picker"
          value={algorithmId}
          onChange={(e) => setAlgorithmId(e.target.value)}
          className="w-full rounded-card-sm border border-white/10 bg-ink-2/70 px-3 py-2 text-sm text-text-hi focus:border-gold/40 focus:outline-none"
          aria-label="Ranking algorithm"
        >
          {(algorithms.data?.items ?? []).map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
              {a.builtin ? '' : ' · community'}
            </option>
          ))}
        </select>
        {feed?.ranked === false && (
          <p className="caption mt-2 text-text-low">The current mode ignores it by design.</p>
        )}
        <Link to="/feeds" className="caption mt-3 block text-gold-soft hover:underline">
          Browse the Algorithm Marketplace →
        </Link>
      </RailCard>

      <RailCard title="This feed">
        <dl className="space-y-2 text-xs">
          {[
            ['Mode', feed?.mode ?? '—'],
            ['Algorithm', feed?.algorithm_name ?? feed?.algorithm ?? '—'],
            ['Ranked', feed?.ranked ? 'yes' : 'no'],
            ['Candidates scored', feed?.total_candidates ?? '—'],
            ['Shown', feed?.items.length ?? 0],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3">
              <dt className="text-text-low">{k}</dt>
              <dd className="mono-data text-text-mid">{String(v)}</dd>
            </div>
          ))}
        </dl>
      </RailCard>
    </>
  )

  return (
    <AppShell aside={rail}>
      <div className="min-w-0">
          <FeedModeMenu
            modes={modes.data?.modes ?? []}
            active={mode}
            onSelect={setMode}
            onRefresh={() => void load()}
            loading={loading}
          />

          {/* The place or topic the geographic/topic modes filter on */}
          {(mode === 'local' || mode === 'country' || mode === 'topics') && (
            <div className="mt-3">
              <input
                value={mode === 'local' ? city : mode === 'country' ? country : topic}
                onChange={(e) => {
                  const value = e.target.value
                  if (mode === 'local') setParam('city', value)
                  else if (mode === 'country') setParam('country', value.toUpperCase().slice(0, 2))
                  else setParam('topic', value.replace(/^#/, '').toLowerCase())
                }}
                placeholder={
                  mode === 'local'
                    ? 'Which city? — Kigoma'
                    : mode === 'country'
                      ? 'Country code — TZ'
                      : 'Which topic? — agriculture'
                }
                /* Distinct from the composer's own city field: two controls
                   sharing one accessible name is ambiguous for screen readers
                   and made an automated check fill the wrong box. */
                aria-label={
                  mode === 'local'
                    ? 'Filter the feed by city'
                    : mode === 'country'
                      ? 'Filter the feed by country code'
                      : 'Filter the feed by topic'
                }
                className="w-full max-w-xs rounded-full border border-white/10 bg-ink-2/60 px-4 py-2 text-xs text-text-hi placeholder:text-text-low focus:border-gold/40 focus:outline-none"
              />
            </div>
          )}

          <Composer onPosted={prepend} collapsed={scrolled} openSignal={openComposer} />

          {pending > 0 && (
            <button
              type="button"
              onClick={() => {
                setPending(0)
                void load()
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className="mx-auto mt-4 flex items-center gap-2 rounded-full bg-gradient-to-br from-gold-soft to-gold px-4 py-2 text-sm font-bold text-ink shadow-cloud transition hover:brightness-110"
            >
              <Sparkles size={14} aria-hidden="true" />
              {pending === 1 ? '1 new post' : `${pending} new posts`}
            </button>
          )}

          {/* Feed */}
          <div className="mt-4 space-y-4" ref={feedRef}>
            {loading && (
              <div className="flex items-center gap-2 py-10 text-text-low" role="status">
                <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                <span className="text-sm">Building your feed…</span>
              </div>
            )}

            {!loading && error && (
              <div
                role="alert"
                className="rounded-card-sm border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200"
              >
                {error}
              </div>
            )}

            {!loading && !error && feed?.items.length === 0 && (
              <div className="cloud-card p-8 text-center">
                <Sparkles size={20} className="mx-auto text-gold" aria-hidden="true" />
                <p className="mt-3 text-sm text-text-mid">
                  {EMPTY_REASON[feed.empty_reason ?? ''] ?? 'Nothing here yet — publish the first post.'}
                </p>
              </div>
            )}

            {!loading &&
              feed?.items.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  algorithmId={feed.algorithm}
                mode={feed.mode}
                  isOwn={post.author_id === user.id}
                  currentUserId={user.id}
                  onHidden={drop}
                  onChangeAlgorithm={() =>
                    document.getElementById('algorithm-picker')?.focus({ preventScroll: false })
                  }
                />
              ))}
          </div>
      </div>

      {/* Compose stays one tap away once the card has scrolled off. */}
      {scrolled && (
        <button
          type="button"
          onClick={() => setOpenComposer((n) => n + 1)}
          aria-label="Create a post"
          className={cn(
            'fixed z-40 inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-gold-soft to-gold px-5 py-3 text-sm font-bold text-ink shadow-cloud-hover transition-transform hover:scale-105',
            // Stacked above the assistant orb rather than beside it: both used
            // to anchor to the same corner with slightly different offsets,
            // which read as deliberate and overlapped by 48×44 pixels.
            slotAboveOrb(orbVisible),
          )}
        >
          <PenLine size={16} aria-hidden="true" />
          <span className="hidden sm:inline">Post</span>
        </button>
      )}
    </AppShell>
  )
}
