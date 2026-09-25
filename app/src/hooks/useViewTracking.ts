import { useEffect, useRef } from 'react'
import { kaluta } from '@/lib/api'

/** A card must be this visible, this long, before it counts as seen. */
const VISIBLE_RATIO = 0.5
const DWELL_MS = 1200
/** Wait this long after the last new card before sending the batch. */
const FLUSH_MS = 2500

/**
 * Count a post as viewed when it was actually on screen.
 *
 * Three deliberate choices, because a view count is a number people trust:
 *
 * - **Half the card, for over a second.** Firing on first pixel would count
 *   everything a fast scroll flew past, which measures scrolling.
 * - **Batched.** One request per card would be one request per scroll tick.
 * - **Once per member, enforced server-side.** The client forgetting what it
 *   sent (a reload, a second tab) must not inflate anyone's figure.
 *
 * Attach to the scroll container; cards are found by their `data-post-id`.
 */
export function useViewTracking(
  containerRef: React.RefObject<HTMLElement | null>,
  enabled = true,
) {
  const sent = useRef(new Set<string>())
  const pending = useRef(new Set<string>())
  const timers = useRef(new Map<string, number>())

  useEffect(() => {
    const root = containerRef.current
    if (!enabled || !root || typeof IntersectionObserver === 'undefined') return

    let flush: number | undefined

    const send = () => {
      const batch = [...pending.current]
      pending.current.clear()
      if (!batch.length) return
      // Marked as sent before the call resolves: a failed report is not worth
      // retrying, and retrying is how a count starts drifting.
      batch.forEach((id) => sent.current.add(id))
      void kaluta.posts.views(batch).catch(() => undefined)
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.postId
          if (!id || sent.current.has(id)) continue

          if (entry.isIntersecting && entry.intersectionRatio >= VISIBLE_RATIO) {
            if (timers.current.has(id)) continue
            timers.current.set(
              id,
              window.setTimeout(() => {
                timers.current.delete(id)
                pending.current.add(id)
                window.clearTimeout(flush)
                flush = window.setTimeout(send, FLUSH_MS)
              }, DWELL_MS),
            )
          } else {
            // Scrolled away before the dwell elapsed — it was not read.
            const timer = timers.current.get(id)
            if (timer) {
              window.clearTimeout(timer)
              timers.current.delete(id)
            }
          }
        }
      },
      { threshold: [0, VISIBLE_RATIO, 1] },
    )

    // Cards mount and unmount as the feed loads, so watch the list itself.
    const attach = () => {
      root.querySelectorAll<HTMLElement>('[data-post-id]').forEach((card) => observer.observe(card))
    }
    attach()
    const mutations = new MutationObserver(attach)
    mutations.observe(root, { childList: true, subtree: true })

    return () => {
      observer.disconnect()
      mutations.disconnect()
      timers.current.forEach((timer) => window.clearTimeout(timer))
      timers.current.clear()
      window.clearTimeout(flush)
      // Anything already counted as read is reported rather than dropped on
      // navigation — otherwise the last screenful never counts.
      send()
    }
  }, [containerRef, enabled])
}
