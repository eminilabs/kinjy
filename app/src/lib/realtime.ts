import { tokens } from '@/lib/api'

export interface RealtimeEvent {
  type: string
  topic?: string
  /** chat */
  conversation_id?: string
  message_id?: string
  sender_id?: string
  encrypted?: boolean
  body?: string | null
  created_at?: string
  /** engagement */
  post_id?: string
  likes_count?: number
  comments_count?: number
  reposts_count?: number
  views_count?: number
  counts?: Record<string, number>
  total?: number
  actor?: string
  author_id?: string
  comment_id?: string
  parent_id?: string | null
  reply_to?: string | null
  depth?: number
  format?: string
  mature?: boolean
  kind?: string
  /** notifications */
  id?: number | string
  title?: string
  link?: string | null
  unread?: number
  /** forums */
  thread_id?: string
  reply_id?: string
  replies_count?: number
}

type Listener = (event: RealtimeEvent) => void

const BASE = import.meta.env.VITE_API_BASE ?? '/api'

function socketUrl(token: string): string {
  // VITE_API_BASE may be absolute (http://localhost:8200/api) or relative
  // (/api behind the Vite proxy); both have to become a ws:// origin.
  const httpUrl = BASE.startsWith('http') ? `${BASE}/ws` : `${window.location.origin}${BASE}/ws`
  return `${httpUrl.replace(/^http/, 'ws')}?token=${encodeURIComponent(token)}`
}

/**
 * One socket for the whole tab.
 *
 * Every live surface multiplexes over this single connection rather than
 * opening its own: a feed of twenty cards each wanting its own updates would
 * otherwise be twenty WebSockets, twenty handshakes and twenty keep-alives, and
 * browsers cap concurrent sockets per origin — the last cards would simply
 * never connect.
 *
 * Topics are reference-counted, so a card unmounting stops its subscription
 * only when no other card wants it, and the full set is re-sent on every
 * reconnect — a socket that comes back without resubscribing looks connected
 * and delivers nothing, which is the worst of both.
 */
class Realtime {
  private socket: WebSocket | null = null
  private retry = 0
  private retryTimer?: number
  private keepAlive?: number
  private wanted = false

  /** topic -> listeners. The empty string is the "everything" channel. */
  private listeners = new Map<string, Set<Listener>>()
  private statusListeners = new Set<(connected: boolean) => void>()
  private connected = false

  private topics(): string[] {
    return [...this.listeners.keys()].filter(Boolean)
  }

  private setConnected(value: boolean) {
    if (this.connected === value) return
    this.connected = value
    this.statusListeners.forEach((fn) => fn(value))
  }

  private send(frame: unknown) {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(frame))
  }

  private connect() {
    const token = tokens.access
    if (!token || this.socket || !this.wanted) return

    const socket = new WebSocket(socketUrl(token))
    this.socket = socket

    socket.onopen = () => {
      this.retry = 0
      this.setConnected(true)
      const topics = this.topics()
      if (topics.length) this.send({ action: 'subscribe', topics })
      // A periodic ping keeps intermediaries from culling an idle socket.
      this.keepAlive = window.setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) socket.send('ping')
      }, 25000)
    }

    socket.onmessage = (event) => {
      let payload: RealtimeEvent
      try {
        payload = JSON.parse(event.data)
      } catch {
        return // keep-alive echoes and other non-JSON frames
      }
      this.listeners.get(payload.topic ?? '')?.forEach((fn) => fn(payload))
      // The "everything" channel still sees topic-scoped frames; chat relies on
      // it and should not have to enumerate its own conversations.
      if (payload.topic) this.listeners.get('')?.forEach((fn) => fn(payload))
    }

    socket.onclose = () => {
      this.socket = null
      this.setConnected(false)
      window.clearInterval(this.keepAlive)
      if (!this.wanted) return
      this.retry += 1
      this.retryTimer = window.setTimeout(
        () => this.connect(),
        Math.min(30000, 1000 * 2 ** this.retry),
      )
    }

    socket.onerror = () => socket.close()
  }

  private maybeClose() {
    if (this.listeners.size) return
    this.wanted = false
    window.clearTimeout(this.retryTimer)
    window.clearInterval(this.keepAlive)
    this.socket?.close()
    this.socket = null
  }

  /** Listen to one topic, or to everything when `topic` is empty. */
  subscribe(topic: string, listener: Listener): () => void {
    const fresh = !this.listeners.has(topic)
    const set = this.listeners.get(topic) ?? new Set<Listener>()
    set.add(listener)
    this.listeners.set(topic, set)

    this.wanted = true
    if (!this.socket) this.connect()
    else if (fresh && topic) this.send({ action: 'subscribe', topics: [topic] })

    return () => {
      const current = this.listeners.get(topic)
      if (!current) return
      current.delete(listener)
      if (current.size) return
      this.listeners.delete(topic)
      // Only tell the server once nobody in this tab wants it any more.
      if (topic) this.send({ action: 'unsubscribe', topics: [topic] })
      this.maybeClose()
    }
  }

  onStatus(listener: (connected: boolean) => void): () => void {
    this.statusListeners.add(listener)
    listener(this.connected)
    return () => {
      this.statusListeners.delete(listener)
    }
  }

  /** Drop the connection — used on sign-out, so the next member gets a fresh one. */
  reset() {
    this.listeners.clear()
    this.maybeClose()
  }
}

export const realtime = new Realtime()
