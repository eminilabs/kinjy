import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCheck,
  Clock,
  Download,
  File as FileIcon,
  FileText,
  Lock,
  MessageSquare,
  Mic,
  Plus,
  Search,
  Send,
  ShieldOff,
  Square,
  Trash2,
  UserRound,
  Users,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react'
import AppShell from '@/components/app/AppShell'
import { useAppTheme } from '@/components/appdemo/theme'
import AttachmentMenu from '@/components/social/AttachmentMenu'
import MediaLightbox from '@/components/social/MediaLightbox'
import VoiceNotePlayer from '@/components/social/VoiceNotePlayer'
import {
  ReactButton,
  ReactionChips,
  ReactionList,
  StickerPicker,
} from '@/components/social/MessageReactions'
import EmojiStickerButton from '@/components/social/EmojiStickerPanel'
import { stickerUrl } from '@/lib/stickers'
import {
  ReplyBanner,
  ReplyButton,
  ReplyQuote,
  SwipeToReply,
  type QuoteTarget,
} from '@/components/social/MessageReply'
import MemberAvatar from '@/components/social/MemberAvatar'
import { useApi } from '@/hooks/useApi'
import { useRealtime } from '@/hooks/useRealtime'
import { useAuth } from '@/hooks/useAuth'
import { useMyProfile } from '@/hooks/useMyProfile'
import {
  ApiError,
  kaluta,
  type Conversation,
  type Message,
  type PersonBrief,
  type Presence,
} from '@/lib/api'
import { FEATURES } from '@/lib/features'
import { realtime } from '@/lib/realtime'
import { cn } from '@/lib/utils'

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const list = window.matchMedia(query)
    const update = () => setMatches(list.matches)
    update()
    list.addEventListener('change', update)
    return () => list.removeEventListener('change', update)
  }, [query])
  return matches
}

/** A message as the thread holds it: possibly still on its way to the server. */
type ChatMessage = Message & {
  client_id?: string | null
  status?: 'sending' | 'failed'
  /** Upload progress, 0–1, while an attachment is on its way. */
  progress?: number
  /** A local object URL, so a photo shows before its upload finishes. */
  preview_url?: string | null
}

/** The server pages 50 at a time; a full page means there may be more above. */
const PAGE = 50
/** How long a "typing" hint lasts without a fresh frame. */
const TYPING_TTL_MS = 5000
/** The server relays one typing frame per 2s; sending more is wasted. */
const TYPING_SEND_EVERY_MS = 2000
/** media-service's limit, checked here too so a 2 GB file fails at once, not at 99%. */
const MAX_FILE_BYTES = 200 * 1024 * 1024
/** Consecutive messages from one sender within this window read as one burst. */
const BURST_MS = 5 * 60 * 1000

// --- dates -----------------------------------------------------------------
//
// Formatted in the app's language (the switcher in the top bar), not the
// browser's: a French interface saying "Yesterday" — or an English one saying
// "hier" — reads as a bug.

const DAY_MS = 86_400_000

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

/** Whole calendar days between a date and today: 0 today, 1 yesterday. */
function daysAgo(iso: string): number {
  return Math.round((startOfDay(new Date()) - startOfDay(new Date(iso))) / DAY_MS)
}

/** Lower-case without accents, for matching "helene" against "Hélène". */
const fold = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

const capitalise = (text: string) => text.charAt(0).toLocaleUpperCase() + text.slice(1)

function timeOf(iso: string, locale: string): string {
  return new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
}

/** The separator between days in a thread: "Today", "Yesterday", "Monday", "Mon 22 September". */
function dayLabel(iso: string, locale: string): string {
  const date = new Date(iso)
  const days = daysAgo(iso)
  if (days <= 1) {
    return capitalise(new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-days, 'day'))
  }
  if (days < 7) return capitalise(date.toLocaleDateString(locale, { weekday: 'long' }))
  return capitalise(
    date.toLocaleDateString(locale, {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
      ...(date.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}),
    }),
  )
}

/** The stamp in the conversation list: a time today, then a day, then a date. */
function listStamp(iso: string, locale: string): string {
  const date = new Date(iso)
  const days = daysAgo(iso)
  if (days === 0) return timeOf(iso, locale)
  if (days === 1) return capitalise(new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-1, 'day'))
  if (days < 7) return capitalise(date.toLocaleDateString(locale, { weekday: 'short' }))
  return date.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    ...(date.getFullYear() !== new Date().getFullYear() ? { year: '2-digit' } : {}),
  })
}

/** The full moment, for a hover title: the bubble itself shows only the time. */
function fullStamp(iso: string, locale: string): string {
  return new Date(iso).toLocaleString(locale, { dateStyle: 'full', timeStyle: 'short' })
}

function lastSeenLabel(presence: Presence | undefined, locale: string): string | null {
  if (!presence) return null
  if (presence.online) return 'Online'
  if (!presence.last_seen) return 'Offline'
  const minutes = Math.round((Date.now() - new Date(presence.last_seen).getTime()) / 60000)
  if (minutes < 1) return 'Last seen just now'
  if (minutes < 60) return `Last seen ${minutes} min ago`
  const days = daysAgo(presence.last_seen)
  if (days === 0) return `Last seen today at ${timeOf(presence.last_seen, locale)}`
  return `Last seen ${listStamp(presence.last_seen, locale)} at ${timeOf(presence.last_seen, locale)}`
}

// --- attachments -------------------------------------------------------------

/** Mirrors media-service's classification, for the bubble shown before it answers. */
function kindOf(file: File): string {
  const type = file.type.toLowerCase()
  if (type.startsWith('image/') && !type.includes('svg')) return 'image'
  if (type.startsWith('video/')) return 'video'
  if (type.startsWith('audio/')) return 'audio'
  if (type === 'application/pdf') return 'document'
  return 'file'
}

function sizeLabel(bytes: number | null | undefined): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`
}

function extensionOf(name: string | null | undefined): string {
  const match = /\.([a-z0-9]{1,6})$/i.exec(name ?? '')
  return match ? match[1].toUpperCase() : 'FILE'
}

/** The recorder's own container: webm/opus in Chrome and Firefox, mp4/aac in Safari. */
function recorderType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find((type) =>
    MediaRecorder.isTypeSupported(type),
  )
}

/** An adaptive meta indicator showing the timestamp and delivery/read ticks. */
function MessageMeta({
  message,
  locale,
  mine,
  isRead,
  className,
}: {
  message: ChatMessage
  locale: string
  mine: boolean
  isRead: boolean
  className?: string
}) {
  const isSending = message.status === 'sending'
  const isFailed = message.status === 'failed'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 select-none whitespace-nowrap text-[0.68rem] text-text-low',
        className,
      )}
      title={fullStamp(message.created_at, locale)}
    >
      <span>
        {isSending
          ? message.media_kind
            ? `${Math.round((message.progress ?? 0) * 100)}%`
            : 'Sending…'
          : timeOf(message.created_at, locale)}
      </span>
      {mine && !isFailed && (
        <span className="inline-flex items-center ms-0.5">
          {isSending ? (
            <Clock size={11} className="text-text-low/70" aria-label="Sending" />
          ) : isRead ? (
            <CheckCheck size={13} className="text-sky-400 dark:text-sky-400" aria-label="Read" />
          ) : (
            <CheckCheck size={13} className="text-text-low/60" aria-label="Delivered" />
          )}
        </span>
      )}
    </span>
  )
}

/** One attachment, drawn for what it is. */
function Attachment({
  message,
  onOpenImage,
  sender,
  mine,
  metaSlot,
}: {
  message: ChatMessage
  onOpenImage: (url: string) => void
  dark?: boolean
  sender?: PersonBrief | { handle?: string; display_name?: string; avatar_url?: string | null } | null
  mine?: boolean
  metaSlot?: React.ReactNode
}) {
  const url = message.media_url ?? message.preview_url ?? null
  const kind = message.media_kind ?? 'file'

  if (url && kind === 'image') {
    return (
      <button type="button" onClick={() => onOpenImage(url)} className="block overflow-hidden rounded-card-sm">
        <img
          src={url}
          alt={message.media_name ?? 'Photo'}
          loading="lazy"
          className="max-h-72 w-auto max-w-full object-cover"
        />
      </button>
    )
  }
  if (url && kind === 'video') {
    return <video src={url} controls preload="metadata" className="max-h-80 max-w-full rounded-card-sm" />
  }
  if (url && kind === 'audio') {
    return (
      <VoiceNotePlayer
        src={url}
        senderAvatarUrl={sender?.avatar_url}
        senderDisplayName={sender?.display_name}
        senderHandle={sender?.handle}
        mine={mine}
        metaSlot={metaSlot}
      />
    )
  }

  // Documents and everything else: a card that says what it is and downloads it.
  const Icon = kind === 'document' ? FileText : FileIcon
  const card = (
    <span className="flex min-w-[200px] max-w-[280px] items-center gap-3 rounded-card-sm border border-white/10 bg-ink-2/50 px-3 py-2.5">
      <Icon size={22} className="shrink-0 text-gold-soft" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-text-hi">{message.media_name ?? 'File'}</span>
        <span className="caption block">
          {extensionOf(message.media_name)}
          {message.media_size ? ` · ${sizeLabel(message.media_size)}` : ''}
        </span>
      </span>
      {message.media_url && <Download size={16} className="shrink-0 text-text-mid" aria-hidden="true" />}
    </span>
  )
  return message.media_url ? (
    <a
      href={message.media_url}
      target="_blank"
      rel="noopener noreferrer"
      download={message.media_name ?? true}
      aria-label={`Download ${message.media_name ?? 'file'}`}
    >
      {card}
    </a>
  ) : (
    card
  )
}

/**
 * Fold incoming messages into the thread: once per id, in time order.
 *
 * The same message can arrive by three routes — the POST response, the socket
 * frame (which may beat the POST response back), and the catch-up after a
 * reconnect — so every route goes through here rather than appending. A pending
 * bubble is replaced by the stored message carrying the same `client_id`.
 */
function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  let next = current
  for (const message of incoming) {
    const known = next.findIndex((m) => m.id === message.id)
    if (known >= 0) {
      // Already here — possibly from the POST response, which knows less than
      // the socket frame or the list (no attachment URL). Fill in, never erase.
      const merged = { ...next[known], ...message, status: undefined }
      next = next.map((m, i) => (i === known ? merged : m))
      continue
    }
    const pending = message.client_id
      ? next.findIndex((m) => m.client_id === message.client_id)
      : -1
    next =
      pending >= 0
        ? next.map((m, i) =>
            // Keep the local preview until the stored copy has its own URL.
            i === pending ? { ...m, ...message, status: undefined, progress: undefined } : m,
          )
        : [...next, message]
  }
  if (next === current) return current
  return [...next].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )
}

/** What to call a thread: its title, or simply the other people in it. */
function titleOf(conversation: Conversation, others: string[]): string {
  if (conversation.title) return conversation.title
  const names = others
    .map((id) => conversation.profiles?.[id]?.display_name)
    .filter((name): name is string => Boolean(name))
  if (names.length) return names.join(', ')
  // Only when the profile could not be resolved at all — better a short id than
  // an empty row, but it should be rare enough to notice.
  return others[0] ? `@${others[0].slice(0, 12)}` : 'Conversation'
}

/** An avatar with the member's online dot. Never a link here: a tap means "write". */
function PresenceAvatar({
  profile,
  online,
  size = 36,
}: {
  profile: PersonBrief | { handle: string; display_name: string; avatar_url: string | null } | null | undefined
  online?: boolean
  size?: number
}) {
  return (
    <span className="relative inline-flex shrink-0">
      <MemberAvatar
        handle={null}
        displayName={profile?.display_name ?? profile?.handle}
        avatarUrl={profile?.avatar_url}
        size={size}
      />
      {online && (
        <span
          aria-label="Online"
          className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-ink bg-emerald-400"
        />
      )}
    </span>
  )
}

export default function Messages() {
  const { user } = useAuth()
  const me = useMyProfile()
  const { lang: locale, resolved } = useAppTheme()
  const [params, setParams] = useSearchParams()
  const requestedId = params.get('c')
  const paramsRef = useRef(params)
  paramsRef.current = params
  const navigate = useNavigate()
  // Below `lg` the list and the thread are separate screens; ?c= says which.
  const wide = useMediaQuery('(min-width: 1024px)')
  const wideRef = useRef(wide)
  wideRef.current = wide
  const showThread = wide || Boolean(requestedId)
  /** Whether opening the current thread added a history entry to go back over. */
  const pushedThread = useRef(false)

  const conversations = useApi<{ items: Conversation[] }>(() => kaluta.messages.conversations(), [])
  const connections = useApi(() => kaluta.connections.list(), [])

  const [activeId, setActiveId] = useState<string | null>(null)
  // Socket callbacks are created once; refs keep them reading live values.
  const activeIdRef = useRef<string | null>(null)
  activeIdRef.current = activeId
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const messagesRef = useRef<ChatMessage[]>([])
  messagesRef.current = messages
  const [hasOlder, setHasOlder] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [loadingThread, setLoadingThread] = useState(false)
  const [draft, setDraft] = useState('')
  // The message the next send answers, and the one just jumped to from a quote.
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  // The sticker picker and the "who reacted" list, each anchored to a bubble.
  const [picker, setPicker] = useState<{ id: string; rect: DOMRect; withReply: boolean } | null>(null)
  const [reactionList, setReactionList] = useState<{ id: string; rect: DOMRect } | null>(null)
  const catalogue = useApi(() => kaluta.messages.stickers(), [])
  const [peer, setPeer] = useState('')
  const [composing, setComposing] = useState(false)
  const [results, setResults] = useState<Array<PersonBrief & { user_id: string }>>([])
  const [searched, setSearched] = useState(false)
  // Kept apart from `error`, which renders in the thread pane on the right —
  // a refusal to *start* a conversation belongs next to the person you clicked,
  // not in a column you are not looking at.
  const [startError, setStartError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [presence, setPresence] = useState<Record<string, Presence>>({})
  /** conversation -> member -> expiry (ms). */
  const [typing, setTyping] = useState<Record<string, Record<string, number>>>({})
  /** Live read receipts, layered over each conversation's `read_state`. */
  const [reads, setReads] = useState<Record<string, Record<string, string>>>({})
  const lastTypingSent = useRef(0)

  // --- scrolling ------------------------------------------------------------
  const listRef = useRef<HTMLDivElement>(null)
  const nearBottom = useRef(true)
  const scrollMode = useRef<'bottom' | 'keep' | { restoreFrom: number }>('bottom')

  const onScroll = () => {
    const el = listRef.current
    if (el) nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }

  // After every change to the thread: stay at the bottom when the reader was
  // there (or just sent something), hold position when history was prepended,
  // and otherwise leave the reader where they are — yanking someone who
  // scrolled up to read back down to a new message loses their place.
  useLayoutEffect(() => {
    const el = listRef.current
    if (!el) return
    const mode = scrollMode.current
    if (typeof mode === 'object') {
      el.scrollTop = el.scrollHeight - mode.restoreFrom
    } else if (mode === 'bottom' || nearBottom.current) {
      el.scrollTop = el.scrollHeight
    }
    scrollMode.current = 'keep'
  }, [messages])

  // --- reading ---------------------------------------------------------------
  /** Only when the thread is actually in front of the member. */
  const markRead = useCallback((conversationId: string) => {
    if (document.visibilityState !== 'visible') return
    void kaluta.messages.markRead(conversationId).catch(() => undefined)
  }, [])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && activeIdRef.current) {
        markRead(activeIdRef.current)
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [markRead])

  /**
   * `how` decides the history entry. On a phone the list and the thread are
   * two screens, so opening a thread from the list pushes one — the back
   * gesture must return to the list, not leave Messages. On a wide screen
   * both are visible and the URL only records which thread is open.
   */
  const openThread = useCallback(
    async (conversationId: string, how: 'user' | 'url' | 'auto' = 'user') => {
      setActiveId(conversationId)
      activeIdRef.current = conversationId
      setReplyTo(null)
      if (how !== 'url') {
        const push = how === 'user' && !wideRef.current && !paramsRef.current.get('c')
        pushedThread.current = push
        setParams(
          (current) => {
            const next = new URLSearchParams(current)
            next.set('c', conversationId)
            return next
          },
          { replace: !push },
        )
      }
      setLoadingThread(true)
      setError(null)
      setMessages([])
      try {
        const page = await kaluta.messages.list(conversationId)
        if (activeIdRef.current !== conversationId) return
        scrollMode.current = 'bottom'
        setMessages(page.items)
        setHasOlder(page.items.length >= PAGE)
        markRead(conversationId)
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Could not load the conversation')
      } finally {
        setLoadingThread(false)
      }
    },
    [markRead, setParams],
  )

  // Which thread to show: the one the URL names (a notification, the Message
  // button on a profile, a tap on a phone), else — on a wide screen only —
  // the most recent. A phone shows the list first, and a thread that is not on
  // screen must not be opened, since opening one marks it read.
  useEffect(() => {
    if (requestedId) {
      if (requestedId !== activeIdRef.current) void openThread(requestedId, 'url')
      return
    }
    if (!wide) {
      // Back on the list (the back button or gesture): nothing is being read.
      activeIdRef.current = null
      setActiveId(null)
      return
    }
    const first = conversations.data?.items[0]
    if (first && !activeIdRef.current) void openThread(first.id, 'auto')
  }, [requestedId, conversations.data, openThread, wide])

  const backToList = () => {
    if (pushedThread.current) {
      pushedThread.current = false
      navigate(-1)
    } else {
      setParams(
        (current) => {
          const next = new URLSearchParams(current)
          next.delete('c')
          return next
        },
        { replace: true },
      )
    }
  }

  const loadOlder = async () => {
    const conversationId = activeIdRef.current
    const oldest = messagesRef.current.find((m) => !m.status)
    if (!conversationId || !oldest) return
    setLoadingOlder(true)
    try {
      const page = await kaluta.messages.list(conversationId, { before: oldest.id })
      if (activeIdRef.current !== conversationId) return
      const el = listRef.current
      scrollMode.current = { restoreFrom: el ? el.scrollHeight - el.scrollTop : 0 }
      setMessages((current) => mergeMessages(current, page.items))
      setHasOlder(page.items.length >= PAGE)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load older messages')
    } finally {
      setLoadingOlder(false)
    }
  }

  // --- sending ---------------------------------------------------------------
  /** Files waiting for (re)delivery, by client id — what "tap to retry" re-sends. */
  const filesRef = useRef(new Map<string, { file: File; body: string | null }>())
  /** Object URLs made for local previews, released when the page goes. */
  const previewsRef = useRef(new Set<string>())
  useEffect(() => {
    const previews = previewsRef.current
    return () => previews.forEach((url) => URL.revokeObjectURL(url))
  }, [])

  /**
   * Upload (if there is a file), then send, in the background — the bubble is
   * already on screen. The client id travels with the request, so a retry
   * after a lost response finds the stored message instead of sending it twice.
   */
  const deliver = useCallback(
    async (
      conversationId: string,
      clientId: string,
      body: string | null,
      file?: File,
      replyToId?: string | null,
      stickerId?: string | null,
    ) => {
      try {
        let mediaId: string | undefined
        if (file) {
          const asset = await kaluta.media.uploadWithProgress(
            file,
            (fraction) =>
              setMessages((current) =>
                current.map((m) => (m.client_id === clientId && m.status ? { ...m, progress: fraction } : m)),
              ),
            { purpose: 'chat' },
          )
          mediaId = asset.id
        }
        const created = await kaluta.messages.send(conversationId, { body, mediaId, clientId, replyToId, stickerId })
        filesRef.current.delete(clientId)
        if (activeIdRef.current !== conversationId) return
        // Usually the socket frame has already brought the full message; this
        // covers the case where it has not. Only the fields known here are
        // set, so it never erases what the frame filled in.
        setMessages((current) =>
          mergeMessages(current, [
            {
              id: created.id,
              client_id: clientId,
              sender_id: user!.id,
              encrypted: false,
              ciphertext_b64: null,
              body,
              kind: stickerId ? 'sticker' : file ? 'media' : 'text',
              sticker_id: stickerId ?? null,
              reply_to_id: replyToId ?? null,
              created_at: created.created_at,
            },
          ]),
        )
      } catch (err) {
        setMessages((current) =>
          current.map((m) => (m.client_id === clientId && m.status ? { ...m, status: 'failed' } : m)),
        )
        setError(err instanceof ApiError ? err.message : 'Could not send — check your connection.')
      }
    },
    [user],
  )

  /** One message per file; the caption rides on the first. */
  const sendFiles = (files: File[], caption: string) => {
    const conversationId = activeIdRef.current
    if (!conversationId || !user || !files.length) return
    const tooBig = files.find((file) => file.size > MAX_FILE_BYTES)
    if (tooBig) {
      setError(`“${tooBig.name}” is larger than the 200 MB limit.`)
      return
    }
    setError(null)
    scrollMode.current = 'bottom'
    const pending: ChatMessage[] = files.map((file, index) => {
      const clientId = crypto.randomUUID()
      const body = index === 0 && caption ? caption : null
      filesRef.current.set(clientId, { file, body })
      const replyToId = index === 0 ? replyTo?.id : null
      const kind = kindOf(file)
      const preview = ['image', 'video', 'audio'].includes(kind) ? URL.createObjectURL(file) : null
      if (preview) previewsRef.current.add(preview)
      return {
        id: `local_${clientId}`,
        client_id: clientId,
        status: 'sending',
        progress: 0,
        preview_url: preview,
        sender_id: user.id,
        encrypted: false,
        ciphertext_b64: null,
        body,
        kind: 'media',
        reply_to_id: replyToId ?? null,
        media_kind: kind,
        media_name: file.name,
        media_type: file.type,
        media_size: file.size,
        created_at: new Date().toISOString(),
      }
    })
    setMessages((current) => [...current, ...pending])
    // One after another: parallel uploads share the same uplink, so none of
    // them finishes sooner, and they would land out of order.
    void (async () => {
      for (const message of pending) {
        const entry = filesRef.current.get(message.client_id!)
        if (entry) await deliver(conversationId, message.client_id!, entry.body, entry.file, message.reply_to_id)
      }
    })()
  }

  const [staged, setStaged] = useState<File[]>([])
  const stage = (files: FileList | File[] | null) => {
    // Copied now, not inside the updater: a FileList is live, and the input
    // is cleared right after this call, which would empty it first.
    const picked = files ? Array.from(files) : []
    if (!picked.length) return
    setStaged((current) => [...current, ...picked].slice(0, 10))
  }

  const send = (event: React.FormEvent) => {
    event.preventDefault()
    const conversationId = activeIdRef.current
    const text = draft.trim()
    if (!conversationId || !user) return
    if (staged.length) {
      sendFiles(staged, text)
      setStaged([])
      setDraft('')
      setReplyTo(null)
      return
    }
    if (!text) return
    const replyToId = replyTo?.id ?? null
    setReplyTo(null)
    setDraft('')
    setError(null)
    const clientId = crypto.randomUUID()
    scrollMode.current = 'bottom'
    setMessages((current) => [
      ...current,
      {
        id: `local_${clientId}`,
        client_id: clientId,
        status: 'sending',
        sender_id: user.id,
        encrypted: false,
        ciphertext_b64: null,
        body: text,
        kind: 'text',
        reply_to_id: replyToId,
        created_at: new Date().toISOString(),
      },
    ])
    void deliver(conversationId, clientId, text, undefined, replyToId)
  }

  const retry = (message: ChatMessage) => {
    const conversationId = activeIdRef.current
    if (!conversationId || !message.client_id) return
    const entry = filesRef.current.get(message.client_id)
    if (!entry && !message.body && !message.sticker_id) return
    setError(null)
    setMessages((current) =>
      current.map((m) => (m.client_id === message.client_id ? { ...m, status: 'sending', progress: 0 } : m)),
    )
    void deliver(
      conversationId,
      message.client_id,
      entry ? entry.body : message.body,
      entry?.file,
      message.reply_to_id,
      message.sticker_id,
    )
  }

  /** A sticker from the panel, sent as a message of its own (answering the message being replied to, if any). */
  const sendSticker = (stickerId: string) => {
    const conversationId = activeIdRef.current
    if (!conversationId || !user) return
    const replyToId = replyTo?.id ?? null
    setReplyTo(null)
    setError(null)
    const clientId = crypto.randomUUID()
    scrollMode.current = 'bottom'
    setMessages((current) => [
      ...current,
      {
        id: `local_${clientId}`,
        client_id: clientId,
        status: 'sending',
        sender_id: user.id,
        encrypted: false,
        ciphertext_b64: null,
        body: null,
        kind: 'sticker',
        sticker_id: stickerId,
        reply_to_id: replyToId,
        created_at: new Date().toISOString(),
      },
    ])
    void deliver(conversationId, clientId, null, undefined, replyToId, stickerId)
  }

  // --- voice messages ------------------------------------------------------------
  const [recordingSince, setRecordingSince] = useState<number | null>(null)
  const [, setTick] = useState(0)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const discardRecording = useRef(false)

  useEffect(() => {
    if (recordingSince === null) return
    const timer = window.setInterval(() => setTick((n) => n + 1), 500)
    return () => window.clearInterval(timer)
  }, [recordingSince])

  const startRecording = async () => {
    const type = recorderType()
    if (!type || !navigator.mediaDevices?.getUserMedia) {
      setError('This browser cannot record voice messages.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: type })
      const chunks: Blob[] = []
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data)
      }
      recorder.onstop = () => {
        // Release the microphone at once — the browser's "recording" dot
        // staying on after the message is sent is how trust gets lost.
        stream.getTracks().forEach((track) => track.stop())
        setRecordingSince(null)
        recorderRef.current = null
        if (discardRecording.current || !chunks.length) return
        const base = type.split(';')[0]
        const extension = base.split('/')[1] === 'mp4' ? 'm4a' : base.split('/')[1]
        sendFiles([new File(chunks, `voice-message.${extension}`, { type: base })], '')
      }
      discardRecording.current = false
      recorder.start()
      recorderRef.current = recorder
      setRecordingSince(Date.now())
    } catch {
      setError('Microphone access was refused. Allow it in the browser to record.')
    }
  }

  const stopRecording = (discard: boolean) => {
    discardRecording.current = discard
    recorderRef.current?.stop()
  }

  const recordingFor = recordingSince === null ? 0 : Math.floor((Date.now() - recordingSince) / 1000)

  // Emoji go into the text at the caret. The caret is read from the field itself (it keeps
  // its selection while the panel has focus) and put back after the render, just behind the
  // new characters, so the member carries on typing where they were.
  const draftRef = useRef(draft)
  useLayoutEffect(() => {
    draftRef.current = draft
  })
  const caretRef = useRef<number | null>(null)
  const insertEmoji = (text: string) => {
    const field = inputRef.current
    const current = draftRef.current
    const chained = caretRef.current !== null // another insertion in the same tick
    const start = chained ? caretRef.current! : (field?.selectionStart ?? current.length)
    const end = chained ? start : (field?.selectionEnd ?? start)
    caretRef.current = start + text.length
    draftRef.current = current.slice(0, start) + text + current.slice(end)
    onDraftChange(draftRef.current)
  }
  useLayoutEffect(() => {
    if (caretRef.current === null) return
    inputRef.current?.setSelectionRange(caretRef.current, caretRef.current)
    caretRef.current = null
  }, [draft])

  const onDraftChange = (value: string) => {
    setDraft(value)
    const conversationId = activeIdRef.current
    const now = Date.now()
    if (conversationId && value.trim() && now - lastTypingSent.current > TYPING_SEND_EVERY_MS) {
      lastTypingSent.current = now
      realtime.emit({ action: 'typing', conversation_id: conversationId })
    }
  }

  const [lightbox, setLightbox] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  // --- starting a conversation -------------------------------------------------
  /** Open (or reuse) a thread with this member. */
  const startWith = async (userId: string) => {
    setError(null)
    setStartError(null)
    try {
      const created = await kaluta.messages.start([userId])
      setPeer('')
      setResults([])
      setSearched(false)
      setComposing(false)
      conversations.reload()
      void openThread(created.id)
    } catch (err) {
      // Usually their `who_can_message` setting refusing. The server's sentence
      // already says what to do next, so it is shown verbatim.
      setStartError(err instanceof ApiError ? err.message : 'Could not start the conversation')
    }
  }

  const answerInvitation = async (userId: string, accept: boolean) => {
    try {
      await kaluta.connections.respond(userId, accept)
      connections.reload()
    } catch (err) {
      setStartError(err instanceof ApiError ? err.message : 'Could not answer the invitation')
    }
  }

  // Debounced: a request per keystroke would be a request per keystroke, and
  // the last one to arrive is not necessarily the last one typed.
  useEffect(() => {
    const query = peer.trim()
    if (query.length < 2) {
      setResults([])
      setSearched(false)
      return
    }
    const timer = window.setTimeout(() => {
      void kaluta.people
        .search(query)
        .then((r) => {
          setResults(r.items)
          setSearched(true)
        })
        .catch(() => {
          setResults([])
          setSearched(true)
        })
    }, 250)
    return () => window.clearTimeout(timer)
  }, [peer])

  // --- presence ----------------------------------------------------------------
  const friends = useMemo(() => connections.data?.accepted ?? [], [connections.data])
  const invitations = connections.data?.incoming ?? []

  const presenceIds = useMemo(() => {
    const ids = new Set<string>(friends.map((f) => f.user_id))
    for (const c of conversations.data?.items ?? []) c.participants.forEach((p) => ids.add(p))
    if (user) ids.delete(user.id)
    return [...ids].sort()
  }, [friends, conversations.data, user])
  const presenceKey = presenceIds.join(',')

  const refreshPresence = useCallback(() => {
    if (!presenceKey) return
    void kaluta.messages
      .presence(presenceKey.split(','))
      .then((r) => setPresence((current) => ({ ...current, ...r.items })))
      .catch(() => undefined)
  }, [presenceKey])

  useEffect(refreshPresence, [refreshPresence])

  // Online friends first, then by name: the people you can reach right now.
  const sortedFriends = useMemo(
    () =>
      [...friends].sort((a, b) => {
        const online = Number(Boolean(presence[b.user_id]?.online)) - Number(Boolean(presence[a.user_id]?.online))
        return online || (a.profile?.display_name ?? '').localeCompare(b.profile?.display_name ?? '')
      }),
    [friends, presence],
  )

  // --- the full friends list ---------------------------------------------------------
  const [showAllFriends, setShowAllFriends] = useState(false)
  const [friendQuery, setFriendQuery] = useState('')
  const [onlineOnly, setOnlineOnly] = useState(false)
  const closeAllFriends = () => {
    setShowAllFriends(false)
    setFriendQuery('')
    setOnlineOnly(false)
  }

  // Matched on name and handle, ignoring case and accents — "helene" finds
  // Hélène, and "@kofi" finds kofi.test. The list is already loaded, so this
  // filters locally rather than asking the server on every keystroke.
  const matchingFriends = useMemo(() => {
    const query = fold(friendQuery.trim().replace(/^@/, ''))
    return sortedFriends.filter((friend) => {
      if (onlineOnly && !presence[friend.user_id]?.online) return false
      if (!query) return true
      return (
        fold(friend.profile?.display_name ?? '').includes(query) ||
        fold(friend.profile?.handle ?? '').includes(query)
      )
    })
  }, [sortedFriends, friendQuery, onlineOnly, presence])

  // --- reactions -------------------------------------------------------------------
  /** One reaction per member: replace theirs, or remove it when `stickerId` is null. */
  const setReaction = useCallback((messageId: string, userId: string, stickerId: string | null) => {
    setMessages((current) =>
      current.map((m) => {
        if (m.id !== messageId) return m
        const others = (m.reactions ?? []).filter((r) => r.user_id !== userId)
        return { ...m, reactions: stickerId ? [...others, { user_id: userId, sticker_id: stickerId }] : others }
      }),
    )
  }, [])

  /** Choosing your current sticker again takes it back; another one replaces it. */
  const toggleReaction = (message: ChatMessage, stickerId: string) => {
    const conversationId = activeIdRef.current
    if (!conversationId || !user || message.status || message.id.startsWith('local_')) return
    const previous = message.reactions?.find((r) => r.user_id === user.id)?.sticker_id ?? null
    const next = previous === stickerId ? null : stickerId
    setReaction(message.id, user.id, next)
    const call = next
      ? kaluta.messages.react(conversationId, message.id, next)
      : kaluta.messages.unreact(conversationId, message.id)
    call.catch((err) => {
      setReaction(message.id, user.id, previous)
      setError(err instanceof ApiError ? err.message : 'Could not react — check your connection.')
    })
  }

  // --- live events ---------------------------------------------------------------
  const { connected } = useRealtime((event) => {
    switch (event.type) {
      case 'message': {
        if (event.conversation_id === activeIdRef.current && event.message_id) {
          setMessages((current) =>
            mergeMessages(current, [
              {
                id: event.message_id!,
                client_id: event.client_id ?? null,
                sender_id: event.sender_id ?? '',
                encrypted: Boolean(event.encrypted),
                ciphertext_b64: null,
                body: event.body ?? null,
                kind: event.kind ?? 'text',
                sticker_id: event.kind === 'sticker' ? (event.sticker_id ?? null) : null,
                reply_to_id: event.reply_to_id ?? null,
                media_url: event.media_url ?? null,
                media_kind: event.media_kind ?? null,
                media_name: event.media_name ?? null,
                media_type: event.media_type ?? null,
                media_size: event.media_size ?? null,
                created_at: event.created_at ?? new Date().toISOString(),
              },
            ]),
          )
          if (event.sender_id !== user?.id) markRead(event.conversation_id)
        }
        // Whoever sent a message has stopped typing it.
        if (event.conversation_id && event.sender_id) {
          const { conversation_id: cid, sender_id: sid } = event
          setTyping((current) => {
            if (!current[cid]?.[sid]) return current
            const rest = { ...current[cid] }
            delete rest[sid]
            return { ...current, [cid]: rest }
          })
        }
        conversations.reload()
        break
      }
      case 'reaction': {
        if (event.conversation_id === activeIdRef.current && event.message_id && event.user_id) {
          setReaction(event.message_id, event.user_id, event.sticker_id ?? null)
        }
        break
      }
      case 'read': {
        if (!event.conversation_id || !event.user_id || !event.read_at) break
        const { conversation_id: cid, user_id: uid, read_at } = event
        setReads((current) => ({ ...current, [cid]: { ...current[cid], [uid]: read_at } }))
        // My own read, from this tab or another: the unread badge is stale.
        if (uid === user?.id) conversations.reload()
        break
      }
      case 'typing': {
        if (!event.conversation_id || !event.user_id) break
        const { conversation_id: cid, user_id: uid } = event
        const expires = Date.now() + TYPING_TTL_MS
        setTyping((current) => ({ ...current, [cid]: { ...current[cid], [uid]: expires } }))
        window.setTimeout(() => {
          setTyping((current) => {
            const at = current[cid]?.[uid]
            if (!at || at > Date.now()) return current
            const rest = { ...current[cid] }
            delete rest[uid]
            return { ...current, [cid]: rest }
          })
        }, TYPING_TTL_MS + 100)
        break
      }
      case 'presence': {
        if (!event.user_id) break
        const uid = event.user_id
        setPresence((current) => ({
          ...current,
          [uid]: { online: Boolean(event.online), last_seen: event.last_seen ?? null },
        }))
        break
      }
    }
  })

  // Catch up whenever the socket (re)connects. Frames sent while it was down —
  // a network drop, a laptop lid, the token expiring — are never replayed by
  // the server, so without this they would simply be missing until a reload.
  // The first connect counts too: a message can land between the thread's
  // initial fetch and the socket becoming ready.
  const reloadConversations = conversations.reload
  useEffect(() => {
    if (!connected) return
    reloadConversations()
    refreshPresence()
    const conversationId = activeIdRef.current
    if (!conversationId) return
    const last = [...messagesRef.current].reverse().find((m) => !m.status)
    void kaluta.messages
      .list(conversationId, { after: last?.id })
      .then((page) => {
        // The member may have switched threads while this was in flight.
        if (activeIdRef.current === conversationId) {
          setMessages((current) => mergeMessages(current, page.items))
        }
      })
      .catch(() => undefined)
    // refreshPresence is deliberately left out: a new friend must not trigger
    // a whole catch-up, only a presence fetch (handled by its own effect).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, reloadConversations])

  // --- derived view state ---------------------------------------------------------
  const active = conversations.data?.items.find((c) => c.id === activeId)
  const activeOthers = active ? active.participants.filter((p) => p !== user?.id) : []

  const readAt = (conversation: Conversation, uid: string): string | null =>
    reads[conversation.id]?.[uid] ?? conversation.read_state?.[uid] ?? null

  const typingNames = active
    ? Object.entries(typing[active.id] ?? {})
        .filter(([uid, until]) => uid !== user?.id && until > Date.now())
        .map(([uid]) => active.profiles?.[uid]?.display_name ?? 'Someone')
    : []

  // The receipt goes under my latest stored message only — one "Seen" per
  // thread, where the eye lands, not a tick-mark on every bubble.
  const nameOf = (message: ChatMessage) =>
    message.sender_id === user?.id ? 'You' : (active?.profiles?.[message.sender_id]?.display_name ?? 'Member')

  const startReply = (message: ChatMessage) => {
    // A bubble still on its way has no id the server knows yet.
    if (message.status || message.id.startsWith('local_')) return
    setReplyTo(message)
    inputRef.current?.focus()
  }

  /** The original is built from what the thread already holds; the server never sends its text. */
  const quoteOf = (message: ChatMessage): QuoteTarget | null => {
    if (!message.reply_to_id) return null
    if (message.reply_to_deleted) return { state: 'deleted' }
    const original = messages.find((m) => m.id === message.reply_to_id)
    return original ? { state: 'found', name: nameOf(original), message: original } : { state: 'older' }
  }

  const jumpTo = (id: string) => {
    const el = document.getElementById(`msg-${id}`)
    if (!el) return
    el.scrollIntoView({ block: 'center' })
    setHighlightId(id)
    window.setTimeout(() => setHighlightId((current) => (current === id ? null : current)), 1500)
  }

  const lastMine = [...messages].reverse().find((m) => m.sender_id === user?.id && !m.status)
  const seenBy =
    active && lastMine
      ? activeOthers.filter((uid) => {
          const at = readAt(active, uid)
          return at !== null && new Date(at).getTime() >= new Date(lastMine.created_at).getTime()
        })
      : []

  const headerSubtitle = (() => {
    if (!active) return null
    if (typingNames.length) return `${typingNames.join(', ')} ${typingNames.length > 1 ? 'are' : 'is'} typing…`
    if (active.kind === 'direct' && activeOthers[0]) return lastSeenLabel(presence[activeOthers[0]], locale)
    const online = activeOthers.filter((uid) => presence[uid]?.online).length
    return `${activeOthers.length + 1} members${online ? ` · ${online} online` : ''}`
  })()

  return (
    <AppShell
      // On a phone, the open thread is the whole screen: its own header (with
      // the back button) says where you are, and every pixel above the
      // composer is a message you can read.
      title={showThread && !wide ? undefined : 'Messages'}
      subtitle="Private conversations between members."
      action={showThread && !wide ? undefined : (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold',
            connected
              ? 'border-emerald-400/30 text-emerald-200'
              : 'border-amber-400/30 text-amber-200',
          )}
        >
          {connected ? <Wifi size={12} aria-hidden="true" /> : <WifiOff size={12} aria-hidden="true" />}
          {connected ? 'Connected' : 'Reconnecting…'}
        </span>
      )}
    >
      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <div className={cn('min-w-0 space-y-4', showThread && 'hidden lg:block')}>
          {/* Friends: every accepted connection, one tap from a conversation.
              A strip rather than a second list, so the conversations below
              stay in view at the same time. */}
          <section aria-labelledby="friends-heading">
            <div className="mb-2 flex items-center gap-2">
              <h2 id="friends-heading" className="flex items-center gap-2 text-sm font-semibold text-text-hi">
                Friends
                <span className="caption font-normal">
                  {friends.length
                    ? `${friends.filter((f) => presence[f.user_id]?.online).length} online · ${friends.length}`
                    : ''}
                </span>
              </h2>
              {friends.length > 0 && (
                <button
                  type="button"
                  onClick={() => (showAllFriends ? closeAllFriends() : setShowAllFriends(true))}
                  aria-expanded={showAllFriends}
                  aria-controls="all-friends"
                  className="ms-auto inline-flex items-center gap-1 rounded-full border border-white/12 px-2.5 py-1 text-xs font-semibold text-text-mid hover:border-gold/40 hover:text-gold-soft"
                >
                  {showAllFriends ? (
                    <>
                      <X size={12} aria-hidden="true" /> Close
                    </>
                  ) : (
                    <>
                      <Users size={12} aria-hidden="true" /> See all
                    </>
                  )}
                </button>
              )}
            </div>

            {connections.loading && !connections.data && <p className="caption">Loading…</p>}
            {connections.data && friends.length === 0 && (
              <p className="caption">
                No connections yet. Accepted connections appear here, ready to message.
              </p>
            )}

            {/* The full list, searchable. The strip below only fits a handful;
                with a few hundred connections, finding one person needs a
                search box, not a horizontal scroll. */}
            {showAllFriends && (
              <div id="all-friends" className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="relative flex min-w-0 flex-1 items-center">
                    <Search size={13} className="pointer-events-none absolute start-3 text-text-low" aria-hidden="true" />
                    <input
                      type="search"
                      value={friendQuery}
                      onChange={(e) => setFriendQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') closeAllFriends()
                      }}
                      placeholder="Search your friends…"
                      aria-label="Search your friends"
                      autoFocus
                      className="w-full rounded-full border border-white/10 bg-ink-2/60 py-2 pe-3 ps-8 text-xs text-text-hi placeholder:text-text-low focus:border-gold/40 focus:outline-none"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setOnlineOnly((v) => !v)}
                    aria-pressed={onlineOnly}
                    className={cn(
                      'shrink-0 rounded-full border px-2.5 py-1.5 text-xs font-semibold',
                      onlineOnly
                        ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200'
                        : 'border-white/12 text-text-mid hover:text-text-hi',
                    )}
                  >
                    Online
                  </button>
                </div>

                <p className="caption" aria-live="polite">
                  {matchingFriends.length === friends.length && !onlineOnly
                    ? `${friends.length} friend${friends.length > 1 ? 's' : ''}`
                    : `${matchingFriends.length} of ${friends.length}`}
                </p>

                {matchingFriends.length === 0 ? (
                  <p className="caption py-2">
                    {onlineOnly && !friendQuery.trim()
                      ? 'None of your friends is online right now.'
                      : `No friend matches “${friendQuery.trim()}”.`}
                  </p>
                ) : (
                  <ul className="-mx-1 max-h-[45dvh] space-y-0.5 overflow-y-auto">
                    {matchingFriends.map((friend) => (
                      <li key={friend.user_id} className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            closeAllFriends()
                            void startWith(friend.user_id)
                          }}
                          aria-label={`Message ${friend.profile?.display_name ?? 'this member'}`}
                          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-card-sm px-2 py-1.5 text-start hover:bg-white/5"
                        >
                          <PresenceAvatar profile={friend.profile} online={presence[friend.user_id]?.online} size={34} />
                          <span className="min-w-0">
                            <span className="block truncate text-sm text-text-hi">
                              {friend.profile?.display_name ?? 'Member'}
                            </span>
                            <span className="caption block truncate">
                              {friend.profile?.handle ? `@${friend.profile.handle}` : ''}
                              {presence[friend.user_id] ? ` · ${lastSeenLabel(presence[friend.user_id], locale)}` : ''}
                            </span>
                          </span>
                          <MessageSquare size={14} className="ms-auto shrink-0 text-text-low" aria-hidden="true" />
                        </button>
                        {friend.profile?.handle && (
                          <Link
                            to={`/u/${friend.profile.handle}`}
                            aria-label={`${friend.profile.display_name}'s profile`}
                            title="View profile"
                            className="shrink-0 rounded-full p-2 text-text-low hover:text-text-hi"
                          >
                            <UserRound size={14} aria-hidden="true" />
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {!showAllFriends && friends.length > 0 && (
              <ul className="-mx-1 flex gap-1 overflow-x-auto pb-1">
                {sortedFriends.map((friend) => (
                  <li key={friend.user_id} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => void startWith(friend.user_id)}
                      title={`Message ${friend.profile?.display_name ?? 'this member'}`}
                      className="flex w-[64px] flex-col items-center gap-1 rounded-card-sm px-1 py-1.5 hover:bg-white/5"
                    >
                      <PresenceAvatar
                        profile={friend.profile}
                        online={presence[friend.user_id]?.online}
                        size={40}
                      />
                      <span className="w-full truncate text-center text-[0.7rem] text-text-mid">
                        {friend.profile?.display_name.split(' ')[0] ?? 'Member'}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Answered here too: a friend request is the step before a
                conversation, so it belongs where conversations start. */}
            {invitations.length > 0 && (
              <div className="mt-2 space-y-1.5 rounded-card-sm border border-gold/25 bg-gold/5 p-2.5">
                <p className="caption">
                  {invitations.length} invitation{invitations.length > 1 ? 's' : ''} to connect
                </p>
                {invitations.map((invite) => (
                  <div key={invite.user_id} className="flex items-center gap-2">
                    <PresenceAvatar profile={invite.profile} size={28} />
                    <span className="min-w-0 flex-1 truncate text-sm text-text-hi">
                      {invite.profile?.display_name ?? 'Member'}
                    </span>
                    <button
                      type="button"
                      onClick={() => void answerInvitation(invite.user_id, true)}
                      aria-label={`Accept ${invite.profile?.display_name ?? 'invitation'}`}
                      className="rounded-full bg-gold/90 p-1.5 text-ink hover:bg-gold"
                    >
                      <Check size={13} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void answerInvitation(invite.user_id, false)}
                      aria-label={`Decline ${invite.profile?.display_name ?? 'invitation'}`}
                      className="rounded-full border border-white/12 p-1.5 text-text-mid hover:text-text-hi"
                    >
                      <X size={13} aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="space-y-3">
            {/* Starting a conversation with someone who is not yet a friend is
                an action, so it is a button — not a form permanently occupying
                the top of the list. */}
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-text-hi">Conversations</h2>
              <button
                type="button"
                onClick={() => setComposing((v) => !v)}
                aria-expanded={composing}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/12 px-3 py-1.5 text-xs font-semibold text-text-mid hover:border-gold/40 hover:text-gold-soft"
              >
                <Plus size={12} aria-hidden="true" />
                New
              </button>
            </div>

            {composing && (
              <div>
                <input
                  id="peer-search"
                  value={peer}
                  onChange={(e) => setPeer(e.target.value)}
                  placeholder="Search by name or @handle…"
                  aria-label="Search for someone to message"
                  autoFocus
                  className="w-full rounded-full border border-white/10 bg-ink-2/60 px-3 py-2 text-xs text-text-hi placeholder:text-text-low focus:border-gold/40 focus:outline-none"
                />

                {peer.trim().length > 0 && peer.trim().length < 2 && (
                  <p className="caption mt-1.5">Keep typing — two characters at least.</p>
                )}

                {results.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {results.map((person) => (
                      <li key={person.user_id}>
                        <button
                          type="button"
                          onClick={() => void startWith(person.user_id)}
                          className="flex w-full items-center gap-2.5 rounded-card-sm px-2 py-1.5 text-start hover:bg-white/5"
                        >
                          <PresenceAvatar profile={person} online={presence[person.user_id]?.online} size={28} />
                          <span className="min-w-0">
                            <span className="block truncate text-sm text-text-hi">{person.display_name}</span>
                            <span className="caption block truncate">@{person.handle}</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {searched && peer.trim().length >= 2 && results.length === 0 && (
                  <p className="caption mt-2">
                    Nobody found. Someone who turned off discovery in their privacy
                    settings will not appear here.
                  </p>
                )}
              </div>
            )}

            {startError && (
              <p role="alert" className="rounded-card-sm border border-amber-300/30 bg-amber-300/10 px-2.5 py-2 text-xs text-amber-100">
                {startError}
              </p>
            )}

            {conversations.loading && !conversations.data && <p className="text-sm text-text-low">Loading…</p>}
            {conversations.data?.items.length === 0 && (
              <p className="text-sm text-text-low">
                No conversations yet. Tap a friend above, or use “New”.
              </p>
            )}

            <ul className="space-y-2">
              {(conversations.data?.items ?? []).map((conversation) => {
                const others = conversation.participants.filter((p) => p !== user?.id)
                const typingHere = Object.entries(typing[conversation.id] ?? {}).some(
                  ([uid, until]) => uid !== user?.id && until > Date.now(),
                )
                return (
                  <li key={conversation.id}>
                    <button
                      type="button"
                      onClick={() => void openThread(conversation.id)}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-card-sm border p-2.5 text-start',
                        activeId === conversation.id
                          ? 'border-gold/40 bg-gold/5'
                          : 'border-white/8 bg-ink-2/40 hover:border-white/15',
                      )}
                    >
                      <PresenceAvatar
                        profile={conversation.profiles?.[others[0]]}
                        online={conversation.kind === 'direct' && presence[others[0]]?.online}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline gap-2">
                          <span className="truncate text-sm font-medium text-text-hi">
                            {titleOf(conversation, others)}
                          </span>
                          <span
                            className={cn(
                              'ms-auto shrink-0 text-[0.7rem]',
                              (conversation.unread ?? 0) > 0 ? 'font-semibold text-gold-soft' : 'text-text-low',
                            )}
                            title={fullStamp(conversation.last_message_at, locale)}
                          >
                            {listStamp(conversation.last_message_at, locale)}
                          </span>
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="caption flex min-w-0 items-center gap-1">
                            {typingHere ? (
                              <span className="text-gold-soft">typing…</span>
                            ) : conversation.last_message ? (
                              <span className="truncate">
                                {conversation.last_message.sender_id === user?.id && 'You: '}
                                {conversation.last_message.preview}
                              </span>
                            ) : (
                              <>
                                {conversation.encrypted || conversation.sealed_at_rest ? (
                                  <Lock size={10} aria-hidden="true" />
                                ) : (
                                  <ShieldOff size={10} aria-hidden="true" />
                                )}
                                No messages yet
                              </>
                            )}
                          </span>
                          {(conversation.unread ?? 0) > 0 && (
                            <span className="ms-auto shrink-0 rounded-full bg-gold px-1.5 py-0.5 text-[0.65rem] font-bold text-ink">
                              {conversation.unread}
                            </span>
                          )}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>

        {/* Thread */}
        <div
          className={cn(
            // Phone: the space between the sticky top chrome (~113px + 16px)
            // and the bottom bar (the shell's 96px of padding).
            'cloud-card relative flex h-[calc(100dvh-230px)] min-h-[360px] min-w-0 flex-col p-3 sm:p-5',
            'lg:h-[calc(100dvh-220px)] lg:min-h-[440px]',
            !showThread && 'hidden',
            dragging && 'ring-2 ring-gold/50',
          )}
          onDragOver={(e) => {
            if (!active || !e.dataTransfer.types.includes('Files')) return
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false)
          }}
          onDrop={(e) => {
            if (!active) return
            e.preventDefault()
            setDragging(false)
            stage(e.dataTransfer.files)
          }}
        >
          {dragging && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-ink/70 text-sm font-semibold text-gold-soft">
              Drop to attach
            </div>
          )}
          {!active ? (
            <div className="m-auto text-center">
              <MessageSquare size={22} className="mx-auto text-text-low" aria-hidden="true" />
              <p className="mt-2 text-sm text-text-low">
                {loadingThread ? 'Loading…' : 'Pick a conversation or a friend.'}
              </p>
            </div>
          ) : (
            <>
              <header className="mb-3 flex items-center gap-3 border-b border-white/8 pb-3">
                <button
                  type="button"
                  onClick={backToList}
                  aria-label="Back to conversations"
                  className="-ms-1 shrink-0 rounded-full p-1.5 text-text-mid hover:text-text-hi lg:hidden"
                >
                  <ArrowLeft size={18} className="rtl:rotate-180" aria-hidden="true" />
                </button>
                <PresenceAvatar
                  profile={active.profiles?.[activeOthers[0]]}
                  online={active.kind === 'direct' && presence[activeOthers[0]]?.online}
                  size={40}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-text-hi">{titleOf(active, activeOthers)}</p>
                  <p
                    className={cn('caption truncate', typingNames.length > 0 && 'text-gold-soft')}
                    aria-live="polite"
                  >
                    {headerSubtitle}
                  </p>
                </div>
                {/* Three different promises, and the label says exactly which
                    one holds: "encrypted" alone would let storage encryption
                    pass for end-to-end, which it is not. */}
                <span
                  className="caption ms-auto hidden shrink-0 items-center gap-1 sm:inline-flex"
                  title={
                    active.encrypted
                      ? 'End-to-end encrypted — only the people in this conversation can read it.'
                      : active.sealed_at_rest
                        ? 'Messages and files are stored encrypted on Kinjy’s servers, so a copy of the database reveals nothing. This is not end-to-end encryption: Kinjy’s servers can read them.'
                        : 'Stored without encryption on Kinjy’s servers.'
                  }
                >
                  {active.encrypted || active.sealed_at_rest ? (
                    <Lock size={11} aria-hidden="true" />
                  ) : (
                    <ShieldOff size={11} aria-hidden="true" />
                  )}
                  {active.encrypted
                    ? 'End-to-end encrypted'
                    : active.sealed_at_rest
                      ? 'Encrypted on our servers'
                      : 'Not encrypted'}
                </span>
              </header>

              <div ref={listRef} onScroll={onScroll} className="flex flex-1 flex-col overflow-y-auto pe-1">
                {hasOlder && (
                  <div className="mb-2 text-center">
                    <button
                      type="button"
                      onClick={() => void loadOlder()}
                      disabled={loadingOlder}
                      className="rounded-full border border-white/12 px-3 py-1 text-xs text-text-mid hover:text-text-hi disabled:opacity-50"
                    >
                      {loadingOlder ? 'Loading…' : 'Load older messages'}
                    </button>
                  </div>
                )}
                {loadingThread && <p className="text-sm text-text-low">Loading messages…</p>}
                {!loadingThread && messages.length === 0 && (
                  <p className="text-sm text-text-low">No messages yet. Say hello.</p>
                )}
                {messages.map((message, index) => {
                  const mine = message.sender_id === user?.id
                  const sender = active.profiles?.[message.sender_id]
                  const previous = messages[index - 1]
                  // A new day gets a separator; within a day, messages from the
                  // same person a few minutes apart sit together as one burst.
                  const newDay =
                    !previous ||
                    startOfDay(new Date(previous.created_at)) !== startOfDay(new Date(message.created_at))
                  const burst =
                    !newDay &&
                    previous.sender_id === message.sender_id &&
                    new Date(message.created_at).getTime() - new Date(previous.created_at).getTime() < BURST_MS
                  const hasText = !message.encrypted && Boolean(message.body?.trim())
                  const isAudio = message.media_kind === 'audio'
                  const mediaOnly = Boolean(message.media_kind) && !hasText
                  // A sticker stands on its own, without a bubble, unless it answers a message
                  // (then the quote needs one to sit in).
                  const isSticker = message.kind === 'sticker' && Boolean(message.sticker_id)
                  const bareSticker = isSticker && !message.reply_to_id
                  const stickerSrc = isSticker ? stickerUrl(message.sticker_id!) : null
                  const stickerName =
                    catalogue.data?.items.find((s) => s.id === message.sticker_id)?.name ?? 'Sticker'

                  const isRead =
                    Boolean(active) && mine
                      ? activeOthers.some((uid) => {
                          const at = readAt(active, uid)
                          return at !== null && new Date(at).getTime() >= new Date(message.created_at).getTime()
                        })
                      : false

                  const meta = (
                    <MessageMeta
                      message={message}
                      locale={locale}
                      mine={mine}
                      isRead={isRead}
                    />
                  )

                  const attachmentSender = mine
                    ? (user
                        ? {
                            display_name: user.display_name,
                            handle: user.handle,
                            avatar_url: me?.avatar_url ?? active.profiles?.[user.id]?.avatar_url ?? null,
                          }
                        : null)
                    : sender

                  return (
                    <div key={message.client_id ?? message.id}>
                      {newDay && (
                        <div className="my-4 flex items-center gap-3" role="separator">
                          <span className="h-px flex-1 bg-white/8" />
                          <span className="caption rounded-full border border-white/8 bg-ink-2/60 px-3 py-0.5">
                            {dayLabel(message.created_at, locale)}
                          </span>
                          <span className="h-px flex-1 bg-white/8" />
                        </div>
                      )}
                      <div
                        id={`msg-${message.id}`}
                        className={cn(
                          'flex flex-col rounded-card-md',
                          mine ? 'items-end' : 'items-start',
                          burst ? 'mt-0.5' : 'mt-3',
                          highlightId === message.id && 'bg-gold/20',
                        )}
                      >
                        {!mine && active.kind === 'group' && !burst && (
                          <span className="caption mb-0.5 ms-1">{sender?.display_name ?? 'Member'}</span>
                        )}
                        <div className="group/bubble relative flex max-w-[75%] items-stretch">
                        {/* Beside the bubble, out of the flow: they must not widen it or push the reactions off its edge. */}
                        <div className={cn('absolute inset-y-0 flex items-center', mine ? 'end-full' : 'start-full')}>
                          <ReplyButton
                            onClick={() => startReply(message)}
                            label={`Reply to ${nameOf(message)}`}
                          />
                          {!message.status && !message.id.startsWith('local_') && (
                            <ReactButton
                              label={`React to ${nameOf(message)}`}
                              onOpen={(rect) => setPicker({ id: message.id, rect, withReply: false })}
                            />
                          )}
                        </div>
                        <SwipeToReply
                          onReply={() => startReply(message)}
                          onLongPress={() => {
                            const rect = document.getElementById(`msg-${message.id}`)?.getBoundingClientRect()
                            if (rect) setPicker({ id: message.id, rect, withReply: true })
                          }}
                          disabled={Boolean(message.status)}
                        >
                        <div
                          className={cn(
                            'min-w-0 rounded-card-md',
                            bareSticker
                              ? 'p-0'
                              : (isAudio && mediaOnly)
                                ? 'px-2.5 py-1.5'
                                : mediaOnly
                                  ? 'p-1.5'
                                  : 'px-3.5 py-1.5',
                            bareSticker
                              ? 'text-text-hi'
                              : mine
                                ? 'bg-gold/15 text-text-hi'
                                : 'border border-white/8 bg-white/[0.08] text-text-hi',
                            message.status === 'sending' && 'opacity-80',
                            message.status === 'failed' && 'border border-red-400/40',
                          )}
                        >
                          {quoteOf(message) && (
                            <ReplyQuote
                              target={quoteOf(message)!}
                              mine={mine}
                              onJump={() => message.reply_to_id && jumpTo(message.reply_to_id)}
                            />
                          )}
                          {isSticker && stickerSrc && (
                            <img
                              src={stickerSrc}
                              alt={stickerName}
                              width={128}
                              height={128}
                              draggable={false}
                              className="h-32 w-32 max-w-full object-contain"
                            />
                          )}
                          {message.media_kind && (
                            <div className={cn('relative', hasText && '-mx-2 -mt-0.5 mb-1')}>
                              <Attachment
                                message={message}
                                onOpenImage={setLightbox}
                                dark={resolved !== 'light'}
                                sender={attachmentSender}
                                mine={mine}
                                metaSlot={meta}
                              />
                              {message.status === 'sending' && !isAudio && (
                                <div className="absolute inset-x-2 bottom-2 h-1 overflow-hidden rounded-full bg-black/40">
                                  <div
                                    className="h-full bg-gold"
                                    style={{ width: `${Math.round((message.progress ?? 0) * 100)}%` }}
                                  />
                                </div>
                              )}
                            </div>
                          )}
                          {(hasText || (message.encrypted && !isSticker)) && (
                            <div className="relative text-sm leading-relaxed">
                              <span className="whitespace-pre-wrap break-words">
                                {message.encrypted ? (
                                  <span className="italic text-text-low">
                                    Encrypted — only your device can read this.
                                  </span>
                                ) : (
                                  message.body
                                )}
                              </span>
                              {/* WhatsApp-style adaptive inline-float timestamp */}
                              <span className="float-right ml-2.5 mt-1 inline-flex items-center select-none align-bottom">
                                {meta}
                              </span>
                            </div>
                          )}
                          {(!hasText && (!isAudio || !message.media_kind)) && (
                            <div
                              className={cn('text-right text-[0.68rem] text-text-low', mediaOnly || bareSticker ? 'px-1.5 pt-0.5' : 'mt-0.5')}
                              title={fullStamp(message.created_at, locale)}
                            >
                              {meta}
                            </div>
                          )}
                        </div>
                        </SwipeToReply>
                        </div>
                        <ReactionChips
                          reactions={message.reactions ?? []}
                          myId={user?.id}
                          catalogue={catalogue.data?.items ?? []}
                          onOpen={(rect) => setReactionList({ id: message.id, rect })}
                        />
                        {message.status === 'failed' && (
                          <button
                            type="button"
                            onClick={() => retry(message)}
                            className="mt-1 inline-flex items-center gap-1 text-xs text-red-200 hover:underline"
                          >
                            <AlertCircle size={12} aria-hidden="true" />
                            Not sent — tap to retry
                          </button>
                        )}
                        {lastMine && message.id === lastMine.id && active.kind === 'group' && seenBy.length > 0 && (
                          <span className="caption mt-0.5 inline-flex items-center gap-1">
                            <CheckCheck size={12} className="text-sky-400" aria-hidden="true" />
                            Seen by {seenBy.length}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
                {typingNames.length > 0 && (
                  <div className="mt-3 flex" aria-hidden="true">
                    <span className="inline-flex gap-1 rounded-card-md bg-white/6 px-3.5 py-3">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-mid"
                          style={{ animationDelay: `${i * 150}ms` }}
                        />
                      ))}
                    </span>
                  </div>
                )}
              </div>

              {/* Files waiting to go: reviewed, captioned, removable. */}
              {staged.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2" aria-label="Attachments to send">
                  {staged.map((file, index) => (
                    <li
                      key={`${file.name}-${index}`}
                      className="flex max-w-[220px] items-center gap-2 rounded-card-sm border border-white/10 bg-ink-2/60 py-1.5 pe-1.5 ps-2.5"
                    >
                      <FileIcon size={14} className="shrink-0 text-gold-soft" aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block truncate text-xs text-text-hi">{file.name}</span>
                        <span className="caption block">{sizeLabel(file.size)}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setStaged((current) => current.filter((_, i) => i !== index))}
                        aria-label={`Remove ${file.name}`}
                        className="rounded-full p-1 text-text-mid hover:text-text-hi"
                      >
                        <X size={12} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* The end padding keeps Send clear of the assistant orb, which
                  rests in the bottom-end corner (lib/floating.ts, slot 0) —
                  exactly where a full-height thread puts its composer. No
                  orb, no gap: Send keeps the full width. */}
              {replyTo && (
                <ReplyBanner name={nameOf(replyTo)} message={replyTo} onCancel={() => setReplyTo(null)} />
              )}
              <form onSubmit={send} className={cn('mt-3 flex items-center gap-2 border-t border-white/8 pt-3', FEATURES.assistant && 'pe-14 lg:pe-12')}>
                {recordingSince !== null ? (
                  <>
                    <button
                      type="button"
                      onClick={() => stopRecording(true)}
                      aria-label="Discard the recording"
                      className="shrink-0 rounded-full border border-white/12 p-2.5 text-text-mid hover:text-red-200"
                    >
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                    <span className="flex flex-1 items-center gap-2 rounded-full border border-red-400/30 bg-red-400/10 px-4 py-2.5 text-sm text-red-100" role="status">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" aria-hidden="true" />
                      Recording {Math.floor(recordingFor / 60)}:{String(recordingFor % 60).padStart(2, '0')}
                    </span>
                    <button
                      type="button"
                      onClick={() => stopRecording(false)}
                      aria-label="Stop and send the voice message"
                      className="shrink-0 rounded-full bg-gradient-to-br from-gold-soft to-gold px-4 py-2.5 text-ink"
                    >
                      <Square size={15} aria-hidden="true" />
                    </button>
                  </>
                ) : (
                  <>
                    <AttachmentMenu onFiles={stage} />
                    <EmojiStickerButton catalogue={catalogue.data} onEmoji={insertEmoji} onSticker={sendSticker} />
                    <input
                      ref={inputRef}
                      value={draft}
                      onChange={(e) => onDraftChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape' && replyTo) {
                          e.preventDefault()
                          setReplyTo(null)
                        }
                      }}
                      onPaste={(e) => {
                        // A pasted screenshot is an attachment, not text.
                        if (e.clipboardData.files.length) {
                          e.preventDefault()
                          stage(e.clipboardData.files)
                        }
                      }}
                      placeholder={staged.length ? 'Add a caption…' : 'Write a message…'}
                      aria-label="Message"
                      className="w-full min-w-0 rounded-full border border-white/10 bg-ink-2/60 px-4 py-2.5 text-sm text-text-hi placeholder:text-text-low focus:border-gold/40 focus:outline-none"
                    />
                    {draft.trim() || staged.length ? (
                      <button
                        type="submit"
                        aria-label="Send"
                        className="shrink-0 rounded-full bg-gradient-to-br from-gold-soft to-gold px-4 py-2.5 text-ink"
                      >
                        <Send size={15} aria-hidden="true" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void startRecording()}
                        aria-label="Record a voice message"
                        className="shrink-0 rounded-full border border-white/12 px-4 py-2.5 text-text-mid hover:border-gold/40 hover:text-gold-soft"
                      >
                        <Mic size={15} aria-hidden="true" />
                      </button>
                    )}
                  </>
                )}
              </form>
            </>
          )}
          {error && (
            <p role="alert" className="mt-2 text-sm text-red-200">
              {error}
            </p>
          )}
        </div>
      </div>
      {picker && (() => {
        const target = messages.find((m) => m.id === picker.id)
        if (!target || !catalogue.data) return null
        return (
          <StickerPicker
            anchor={picker.rect}
            catalogue={catalogue.data}
            current={target.reactions?.find((r) => r.user_id === user?.id)?.sticker_id}
            onPick={(stickerId) => toggleReaction(target, stickerId)}
            onReply={picker.withReply ? () => startReply(target) : undefined}
            onClose={() => setPicker(null)}
          />
        )
      })()}
      {reactionList && (() => {
        const target = messages.find((m) => m.id === reactionList.id)
        if (!target?.reactions?.length) return null
        return (
          <ReactionList
            anchor={reactionList.rect}
            reactions={target.reactions}
            catalogue={catalogue.data?.items ?? []}
            nameOf={(id) => (id === user?.id ? 'You' : (active?.profiles?.[id]?.display_name ?? 'Member'))}
            myId={user?.id}
            onRemove={() => {
              const mine = target.reactions?.find((r) => r.user_id === user?.id)
              if (mine) toggleReaction(target, mine.sticker_id)
            }}
            onClose={() => setReactionList(null)}
          />
        )
      })()}
      {lightbox && (
        <MediaLightbox
          media={[{ url: lightbox, kind: 'image', alt_text: null }]}
          index={0}
          onClose={() => setLightbox(null)}
        />
      )}
    </AppShell>
  )
}
