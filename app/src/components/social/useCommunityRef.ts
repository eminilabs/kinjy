import { useEffect, useState } from 'react'
import { kaluta } from '@/lib/api'

export interface CommunityRef {
  id: string
  name: string
  slug: string
}

/**
 * Names of the communities posts belong to.
 *
 * A post carries only `community_id`. The feed is a page of twenty cards that
 * mostly come from a handful of groups, so each group is looked up once and
 * remembered, rather than once per card. A community post is only ever shown to
 * its members, so the lookup succeeds for the viewer; if it does not (a secret
 * group, a signed-out visitor), the card simply names no group.
 */
const cache = new Map<string, CommunityRef | null>()
const pending = new Map<string, Promise<void>>()

function load(id: string): Promise<void> {
  let request = pending.get(id)
  if (!request) {
    request = kaluta.communities
      .get(id)
      .then((community) => {
        cache.set(id, { id: community.id, name: community.name, slug: community.slug })
      })
      .catch(() => {
        cache.set(id, null)
      })
      .finally(() => {
        pending.delete(id)
      })
    pending.set(id, request)
  }
  return request
}

export function useCommunityRef(id: string | null | undefined): CommunityRef | null {
  const [, refresh] = useState(0)
  useEffect(() => {
    if (!id || cache.has(id)) return
    let alive = true
    void load(id).then(() => {
      if (alive) refresh((n) => n + 1)
    })
    return () => {
      alive = false
    }
  }, [id])
  return id ? (cache.get(id) ?? null) : null
}
