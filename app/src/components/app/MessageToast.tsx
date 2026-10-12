import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router'
import { X } from 'lucide-react'
import MemberAvatar from '@/components/social/MemberAvatar'
import { useTopic } from '@/hooks/useRealtime'
import { useAuth } from '@/hooks/useAuth'
import { kaluta, type Conversation } from '@/lib/api'
import { cn } from '@/lib/utils'

/** How long a card stays before it leaves on its own. */
const DWELL_MS = 6000

type Incoming = {
  conversationId: string
  name: string
  handle: string
  avatarUrl: string | null
  preview: string
}

/**
 * A message arriving while you are somewhere else in the app.
 *
 * The sound said something had happened and nothing said what, so the only way
 * to find out was to go to Messages and look. This is the card Messenger shows
 * instead: who it is, their photo, the first of what they said, and one tap to
 * open it.
 *
 * What it will not do is invent the message. Conversations here are end to end
 * encrypted, so the server has no plaintext to put in the event and none to put
 * in a preview; where that is the case the card says a message arrived and
 * leaves the reading of it to the thread, which holds the keys. Showing
 * "Encrypted message" under somebody's name is honest. Showing ciphertext, or
 * guessing, would not be.
 */
export default function MessageToast() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [card, setCard] = useState<Incoming | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Where the member is right now, read at event time rather than captured
  // when the subscription was made - otherwise opening Messages would not stop
  // the cards, because the handler would still be looking at the old path.
  //
  // Written in an effect, not during render: a ref assigned while rendering is
  // a side effect in the render phase, which React may run twice or throw away.
  const here = useRef(location)
  useEffect(() => {
    here.current = location
  }, [location])

  const dismiss = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    setCard(null)
  }, [])

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), [])

  const show = useCallback(
    (next: Incoming) => {
      if (timer.current) clearTimeout(timer.current)
      setCard(next)
      timer.current = setTimeout(() => setCard(null), DWELL_MS)
    },
    [],
  )

  useTopic(user?.id ? `user:${user.id}` : null, (event) => {
    if (event.type !== 'message') return
    // Your own message, arriving in your other tabs. Not news to you.
    if (event.sender_id === user?.id) return

    const path = here.current.pathname
    const open = new URLSearchParams(here.current.search).get('c')
    // Already reading this conversation, or sitting on the Messages page with
    // it open: the thread is showing the message, which is better than a card
    // telling you about the message you are looking at.
    if (path.startsWith('/messages') && (open === event.conversation_id || !open)) return

    // The list is what knows the sender's name, their picture and the preview
    // - and the preview is the one the server considers safe to show, which
    // for an encrypted thread is not the text.
    kaluta.messages
      .conversations()
      .then(({ items }) => {
        const convo = items.find((c: Conversation) => c.id === event.conversation_id)
        if (!convo) return
        const sender = convo.profiles?.[event.sender_id as string]
        const preview = convo.last_message?.preview?.trim()
        show({
          conversationId: convo.id,
          name: sender?.display_name ?? convo.title ?? 'New message',
          handle: sender?.handle ?? '',
          avatarUrl: sender?.avatar_url ?? null,
          preview: preview || (convo.encrypted ? 'Encrypted message' : 'Sent you a message'),
        })
      })
      .catch(() => undefined)
  })

  if (!card) return null

  return (
    <div
      // Above the mobile bottom bar, out of the way of the composer. aria-live
      // polite rather than assertive: a message is worth announcing, not worth
      // interrupting what is being read.
      className="fixed inset-x-0 bottom-20 z-50 flex justify-center px-3 lg:bottom-6 lg:left-auto lg:right-6 lg:justify-end lg:px-0"
      role="status"
      aria-live="polite"
    >
      <div className="flex w-full max-w-sm items-center gap-3 rounded-card-lg border border-white/12 bg-ink-2/95 p-3 shadow-cloud backdrop-blur-md">
        <button
          type="button"
          onClick={() => {
            dismiss()
            navigate(`/messages?c=${encodeURIComponent(card.conversationId)}`)
          }}
          className="flex min-w-0 flex-1 items-center gap-3 text-start"
        >
          <MemberAvatar displayName={card.name} avatarUrl={card.avatarUrl} size={44} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-text-hi">{card.name}</span>
            {/* One line, clipped. A card that grows with the message is a
                message, and the thread is where messages are read. */}
            <span className={cn('block truncate text-[0.78rem] text-text-mid')}>{card.preview}</span>
          </span>
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded-full p-1.5 text-text-low hover:bg-white/10 hover:text-text-hi"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
