import { useEffect, useState } from 'react'
import { CalendarClock } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { ApiError, kaluta, type Post } from '@/lib/api'
import ErrorLine from './ErrorLine'
import { soonest, when } from './format'

const button = 'rounded-full border border-text-low/40 px-3 py-1.5 text-xs font-semibold text-text-hi hover:border-gold/50 disabled:opacity-40'

function ScheduledPost({ post, onChanged }: { post: Post; onChanged: () => void }) {
  const [editing, setEditing] = useState(false)
  const [date, setDate] = useState('')
  const [confirm, setConfirm] = useState<'publish' | 'cancel' | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const act = async (action: 'move' | 'publish' | 'cancel') => {
    setBusy(true)
    setError(null)
    try {
      if (action === 'move') await kaluta.posts.reschedule(post.id, new Date(date).toISOString())
      else if (action === 'publish') await kaluta.posts.publishNow(post.id)
      else await kaluta.posts.remove(post.id)
      setEditing(false)
      setConfirm(null)
      onChanged()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update this post. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="space-y-2 rounded-card-sm border border-text-low/25 p-3">
      <p className="line-clamp-2 break-words text-sm text-text-hi">{post.body.replace(/<[^>]*>/g, ' ')}</p>
      <p className="text-xs text-text-mid">{post.scheduled_for ? when(post.scheduled_for) : 'Waiting'} · {post.visibility === 'public' ? 'Everyone' : 'My followers'}</p>
      {editing ? (
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-text-mid">
            New publication time
            <input type="datetime-local" value={date} min={soonest()} onChange={(e) => setDate(e.target.value)} className="ml-2 max-w-full rounded-card-sm border border-text-low/40 bg-ink-2 px-2 py-1 text-text-hi" />
          </label>
          <button type="button" disabled={busy || !date} onClick={() => void act('move')} className={button}>Save time</button>
          <button type="button" disabled={busy} onClick={() => setEditing(false)} className={button}>Keep time</button>
        </div>
      ) : confirm ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs text-text-mid">{confirm === 'publish' ? 'Publish this post now?' : 'Cancel this scheduled post?'}</p>
          <button type="button" disabled={busy} onClick={() => void act(confirm)} className={button}>{confirm === 'publish' ? 'Yes, publish now' : 'Yes, cancel post'}</button>
          <button type="button" disabled={busy} onClick={() => setConfirm(null)} className={button}>Keep it</button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => {
            const local = new Date(post.scheduled_for ?? Date.now())
            local.setMinutes(local.getMinutes() - local.getTimezoneOffset())
            setDate(local.toISOString().slice(0, 16))
            setEditing(true)
          }} className={button}>Change time</button>
          <button type="button" onClick={() => setConfirm('publish')} className={button}>Publish now</button>
          <button type="button" onClick={() => setConfirm('cancel')} className={button}>Cancel post</button>
        </div>
      )}
      {error && <ErrorLine text={error} />}
    </li>
  )
}

export default function ScheduledPosts({ refresh }: { refresh: number }) {
  const posts = useApi(() => kaluta.posts.scheduled(), [refresh])
  const items = posts.data?.items ?? []
  useEffect(() => {
    if (items.length === 0) return
    const timer = window.setTimeout(posts.reload, 20_000)
    return () => window.clearTimeout(timer)
  }, [items.length, posts.data, posts.reload])

  return (
    <section className="cloud-card space-y-3 p-5" aria-label="Scheduled posts">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-text-hi"><CalendarClock size={16} aria-hidden="true" /> Scheduled posts{items.length > 0 ? ` (${items.length})` : ''}</h2>
        <button type="button" disabled={posts.loading} onClick={posts.reload} className={button}>Refresh</button>
      </div>
      <p className="text-xs text-text-mid">Times use your device's time zone. Posts go out within about 20 seconds of their scheduled time.</p>
      {posts.loading && !posts.data && <p className="text-sm text-text-mid" role="status">Loading…</p>}
      {posts.data && items.length === 0 && <p className="text-sm text-text-mid">No posts waiting. Choose “Publish later” when posting a Studio result.</p>}
      <ul className="space-y-2">{items.map((post) => <ScheduledPost key={post.id} post={post} onChanged={posts.reload} />)}</ul>
      {posts.error && <ErrorLine text={posts.error} />}
    </section>
  )
}
