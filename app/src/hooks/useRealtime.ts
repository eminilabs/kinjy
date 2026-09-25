import { useEffect, useRef, useState } from 'react'
import { realtime, type RealtimeEvent } from '@/lib/realtime'

export type { RealtimeEvent }

/**
 * Every frame the tab receives.
 *
 * Used by chat, which wants messages for any conversation without having to
 * enumerate them. Surfaces that care about one thing should use `useTopic`
 * instead so the server is not asked to send what nobody reads.
 */
export function useRealtime(onEvent: (event: RealtimeEvent) => void) {
  const [connected, setConnected] = useState(false)
  const handlerRef = useRef(onEvent)
  handlerRef.current = onEvent

  useEffect(() => realtime.onStatus(setConnected), [])
  useEffect(() => realtime.subscribe('', (event) => handlerRef.current(event)), [])

  return { connected }
}

/**
 * Live updates for one topic — `post:<id>`, `feed`, `shorts`, `user:<id>`.
 *
 * Pass `null` to subscribe to nothing: a card that has not resolved its post id
 * yet should not subscribe to `post:undefined`.
 */
export function useTopic(topic: string | null, onEvent: (event: RealtimeEvent) => void) {
  const handlerRef = useRef(onEvent)
  handlerRef.current = onEvent

  useEffect(() => {
    if (!topic) return
    return realtime.subscribe(topic, (event) => handlerRef.current(event))
  }, [topic])
}
