import { useEffect, useSyncExternalStore } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { kaluta, type MyProfile } from '@/lib/api'
import { onChange } from '@/lib/live'

/**
 * The signed-in member's own profile, shared by every surface that shows it.
 *
 * The account (auth-service) knows the name but not the photo, so the top bar,
 * the composer and the rail card each need `/users/me`. One copy here means
 * one request, and one refresh when the editor announces a change - the photo
 * cannot be new in the rail card and old in the top bar.
 */
interface Snapshot {
  userId: string | null
  profile: MyProfile | null
}

let snapshot: Snapshot = { userId: null, profile: null }
let inflight: { userId: string; request: Promise<void> } | null = null
const listeners = new Set<() => void>()

function publish(next: Snapshot) {
  snapshot = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Fetch (again). Concurrent callers for the same member share one request. */
function load(userId: string): Promise<void> {
  if (inflight?.userId === userId) return inflight.request
  const request = kaluta.account
    .profile()
    .then((profile) => {
      // Signed out, or someone else signed in, while this was in flight.
      if (snapshot.userId === userId) publish({ userId, profile })
    })
    .catch(() => {
      // Keep what is shown: a failed refresh must not blank every avatar.
    })
    .finally(() => {
      if (inflight?.request === request) inflight = null
    })
  inflight = { userId, request }
  return request
}

export function useMyProfile(): MyProfile | null {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const current = useSyncExternalStore(subscribe, () => snapshot)

  useEffect(() => {
    if (userId !== snapshot.userId) publish({ userId, profile: null })
    // Also retries on the next mount if an earlier load failed.
    if (userId && !snapshot.profile) void load(userId)
  }, [userId])

  useEffect(
    () =>
      onChange('profile', () => {
        if (snapshot.userId) void load(snapshot.userId)
      }),
    [],
  )

  return current.userId === userId ? current.profile : null
}
