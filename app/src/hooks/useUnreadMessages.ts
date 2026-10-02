import { useEffect, useSyncExternalStore } from 'react'
import { kaluta } from '@/lib/api'
import { useTopic } from '@/hooks/useRealtime'
import { useAuth } from '@/hooks/useAuth'

/**
 * The unread-messages count behind the Messages badge.
 *
 * One shared value, not one per badge: the chip bar, the profile card's rail
 * and the mobile bottom bar all show it, and three components each fetching
 * on every socket event would be three requests for one number.
 *
 * Like the bell, it is fetched when a page mounts (what arrived while you were
 * away) and refreshed when the socket says something changed (what happens
 * while you are here). It is refetched rather than tallied locally, so it
 * always agrees with the conversation list — including when you read a thread
 * in another tab.
 */
const store = {
  /** Who is signed in right now. A response for anyone else is dropped. */
  current: null as string | null,
  /** Whose number `count` is, so a previous member's never shows to the next. */
  owner: null as string | null,
  count: 0,
  inflight: false,
  again: false,
}
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((listener) => listener())

function refresh(): void {
  const userId = store.current
  if (!userId) return
  // A change that lands while a request is in flight may not be in its answer,
  // so ask once more afterwards rather than dropping it.
  if (store.inflight) {
    store.again = true
    return
  }
  store.inflight = true
  kaluta.messages
    .unreadCount()
    .then((r) => {
      // The account changed while this was on its way: not this member's number.
      if (store.current !== userId) return
      store.owner = userId
      store.count = r.messages
      notify()
    })
    .catch(() => undefined)
    .finally(() => {
      store.inflight = false
      if (store.again) {
        store.again = false
        refresh()
      }
    })
}

// Every mounted badge hears every socket event, and several mount at once on
// each page. Coalescing them turns a burst into one request rather than one
// per component.
let queued: ReturnType<typeof setTimeout> | null = null
function requestRefresh(): void {
  if (queued) return
  queued = setTimeout(() => {
    queued = null
    refresh()
  }, 60)
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useUnreadMessages(): number {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const value = useSyncExternalStore(subscribe, () => (userId && store.owner === userId ? store.count : 0))

  useEffect(() => {
    store.current = userId
    if (!userId) {
      // Signed out: forget the number, so the same member signing back in does
      // not see a stale one while the new one loads.
      store.owner = null
      store.count = 0
      notify()
      return
    }
    requestRefresh()
  }, [userId])

  useTopic(userId ? `user:${userId}` : null, (event) => {
    // Any message may change it — someone else's raises it, and one you send
    // from another tab marks that thread read. A thread read by you, here or in
    // another tab, lowers it. Someone else reading does not touch your count.
    if (event.type === 'message' || (event.type === 'read' && event.user_id === userId)) requestRefresh()
  })
  return value
}
