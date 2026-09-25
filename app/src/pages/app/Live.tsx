import { useEffect, useRef, useState } from 'react'
import { Camera, CameraOff, Radio, Send, Users } from 'lucide-react'
import AppShell, { RailCard } from '@/components/app/AppShell'
import { useApi } from '@/hooks/useApi'
import { useAuth } from '@/hooks/useAuth'
import { useRealtime } from '@/hooks/useRealtime'
import { ApiError, kaluta, type Conversation, type Message } from '@/lib/api'
import { cn } from '@/lib/utils'

/**
 * Live rooms.
 *
 * Two halves, and it matters that they are not conflated:
 *
 *  · The **chat is real** — a live room is a group conversation in
 *    messaging-service, delivered over the same WebSocket as direct messages.
 *  · The **video is not broadcast**. Kinjy has no ingest, no transcoder and no
 *    CDN, so the camera preview below is local to this browser and no viewer
 *    receives it. Faking a player here would hide a missing subsystem behind a
 *    convincing screen.
 */
export default function Live() {
  const { user } = useAuth()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [cameraOn, setCameraOn] = useState(false)
  const [roomId, setRoomId] = useState<string | null>(null)
  const roomIdRef = useRef<string | null>(null)
  roomIdRef.current = roomId
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [title, setTitle] = useState('')
  const [error, setError] = useState<string | null>(null)

  const rooms = useApi<{ items: Conversation[] }>(() => kaluta.messages.conversations(), [])

  const { connected } = useRealtime((event) => {
    if (event.type !== 'message' || event.conversation_id !== roomIdRef.current) return
    setMessages((current) =>
      current.some((m) => m.id === event.message_id)
        ? current
        : [
            ...current,
            {
              id: event.message_id!,
              sender_id: event.sender_id ?? '',
              encrypted: false,
              ciphertext_b64: null,
              body: event.body ?? null,
              kind: 'text',
              created_at: event.created_at ?? new Date().toISOString(),
            },
          ],
    )
  })

  useEffect(() => {
    return () => streamRef.current?.getTracks().forEach((track) => track.stop())
  }, [])

  const toggleCamera = async () => {
    if (cameraOn) {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      setCameraOn(false)
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setCameraOn(true)
    } catch {
      setError('Camera permission refused, or no camera on this device.')
    }
  }

  const openRoom = async (id: string) => {
    setRoomId(id)
    try {
      setMessages((await kaluta.messages.list(id)).items)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not open the room')
    }
  }

  const startRoom = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!title.trim() || !user) return
    setError(null)
    try {
      // A room is a group conversation; the host is its only member until
      // someone else joins with the id.
      const created = await kaluta.messages.start([user.id])
      setTitle('')
      rooms.reload()
      void openRoom(created.id)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not start the room')
    }
  }

  const send = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!draft.trim() || !roomId) return
    const text = draft.trim()
    setDraft('')
    try {
      await kaluta.messages.send(roomId, text)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send')
      setDraft(text)
    }
  }

  return (
    <AppShell
      title="Live"
      subtitle="Real-time rooms. The chat is live; video broadcasting is not built yet."
      action={
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold',
            connected ? 'border-emerald-400/30 text-emerald-200' : 'border-amber-400/30 text-amber-200',
          )}
        >
          <Radio size={12} aria-hidden="true" />
          {connected ? 'Chat live' : 'Reconnecting…'}
        </span>
      }
      aside={
        <>
          <RailCard title="What works here">
            <ul className="space-y-2 text-xs leading-relaxed text-text-mid">
              <li>
                <strong className="text-text-hi">Chat is real.</strong> Messages travel over the same
                WebSocket as direct messages and reach every participant instantly.
              </li>
              <li>
                <strong className="text-text-hi">Video is not broadcast.</strong> The preview is your
                own camera, in this browser. No ingest server, no transcoder, no CDN — nobody else
                receives it.
              </li>
              <li className="text-text-low">
                The blueprint's Live Intelligence layer — translated captions, question clustering,
                a host assistant, highlights marked during the broadcast — needs that pipeline first.
              </li>
            </ul>
          </RailCard>
          <RailCard title="Rooms">
            <ul className="space-y-1.5">
              {(rooms.data?.items ?? []).slice(0, 6).map((room) => (
                <li key={room.id}>
                  <button
                    type="button"
                    onClick={() => void openRoom(room.id)}
                    className={cn(
                      'w-full truncate rounded-card-sm px-2 py-1.5 text-start text-xs transition-colors',
                      roomId === room.id
                        ? 'bg-gold/10 text-gold-soft'
                        : 'text-text-mid hover:bg-white/5 hover:text-text-hi',
                    )}
                  >
                    {room.title ?? room.id.slice(0, 16)}
                  </button>
                </li>
              ))}
              {(rooms.data?.items ?? []).length === 0 && (
                <li className="text-xs text-text-low">No rooms yet.</li>
              )}
            </ul>
          </RailCard>
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* Stage */}
        <div className="overflow-hidden rounded-card-md border border-white/8 bg-black">
          <div className="relative aspect-video">
            <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
            {!cameraOn && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
                <Radio size={26} className="text-text-low" aria-hidden="true" />
                <p className="max-w-sm px-6 text-sm text-text-mid">
                  Turn your camera on to preview what you would broadcast. It stays on this device —
                  Kinjy cannot send it anywhere yet.
                </p>
              </div>
            )}
            {cameraOn && (
              <span className="absolute start-3 top-3 rounded-full bg-red-500/90 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-white">
                Preview only
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-white/8 bg-ink-2/60 p-3">
            <button
              type="button"
              onClick={toggleCamera}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/12 px-4 py-2 text-xs font-semibold text-text-mid transition-colors hover:border-gold/40 hover:text-gold-soft"
            >
              {cameraOn ? <CameraOff size={13} aria-hidden="true" /> : <Camera size={13} aria-hidden="true" />}
              {cameraOn ? 'Stop camera' : 'Start camera'}
            </button>

            <form onSubmit={startRoom} className="ms-auto flex gap-2">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Name a room…"
                aria-label="Room name"
                className="rounded-full border border-white/10 bg-ink/60 px-3 py-2 text-xs text-text-hi placeholder:text-text-low focus:border-gold/40 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!title.trim()}
                className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-4 py-2 text-xs font-bold text-ink disabled:opacity-40"
              >
                Open room
              </button>
            </form>
          </div>
        </div>

        {/* Live chat */}
        <div className="flex min-h-[420px] flex-col rounded-card-md border border-white/8 bg-ink-2/60 p-4">
          <h2 className="mb-3 inline-flex items-center gap-2 border-b border-white/8 pb-3 text-sm font-semibold text-text-hi">
            <Users size={14} className="text-gold" aria-hidden="true" />
            Live chat
          </h2>

          {!roomId ? (
            <p className="m-auto text-center text-sm text-text-low">
              Open a room to start chatting.
            </p>
          ) : (
            <>
              <div className="flex-1 space-y-2 overflow-y-auto">
                {messages.length === 0 && <p className="text-sm text-text-low">Say something first.</p>}
                {messages.map((message) => (
                  <p key={message.id} className="text-sm">
                    <span className="font-semibold text-gold-soft">
                      {message.sender_id === user?.id ? 'You' : `@${message.sender_id.slice(0, 10)}`}
                    </span>{' '}
                    <span className="text-text-mid">{message.body}</span>
                  </p>
                ))}
              </div>

              <form onSubmit={send} className="mt-3 flex gap-2 border-t border-white/8 pt-3">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Message the room…"
                  aria-label="Live chat message"
                  className="w-full rounded-full border border-white/10 bg-ink/60 px-3 py-2 text-sm text-text-hi placeholder:text-text-low focus:border-gold/40 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!draft.trim()}
                  aria-label="Send"
                  className="shrink-0 rounded-full bg-gradient-to-br from-gold-soft to-gold px-3.5 text-ink disabled:opacity-40"
                >
                  <Send size={14} />
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-amber-200">
          {error}
        </p>
      )}
    </AppShell>
  )
}
