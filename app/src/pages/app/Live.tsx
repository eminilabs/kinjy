import { useEffect, useRef, useState } from 'react'
import { Camera, CameraOff, Radio, Send, Users } from 'lucide-react'
import AppShell from '@/components/app/AppShell'
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
      await kaluta.messages.send(roomId, { body: text })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send')
      setDraft(text)
    }
  }

  const label = 'mono-data text-[0.7rem] font-bold uppercase tracking-[0.15em] text-gold-soft'

  return (
    <AppShell
      aside={
        <>
          <section className="cloud-card p-5">
            <p className={cn(label, 'mb-3')}>What works here</p>
            <ul className="space-y-3 text-sm leading-relaxed text-text-mid">
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
          </section>
          <section className="cloud-card p-5">
            <p className={cn(label, 'mb-3')}>Rooms</p>
            <ul className="space-y-1">
              {(rooms.data?.items ?? []).slice(0, 6).map((room) => (
                <li key={room.id}>
                  <button
                    type="button"
                    onClick={() => void openRoom(room.id)}
                    aria-current={roomId === room.id ? 'true' : undefined}
                    className={cn(
                      'w-full truncate rounded-xl px-3 py-2 text-start text-sm font-medium transition-colors',
                      roomId === room.id
                        ? 'bg-gold/15 text-gold-soft'
                        : 'text-text-mid hover:bg-text-hi/[0.05] hover:text-text-hi',
                    )}
                  >
                    {room.title ?? room.id.slice(0, 16)}
                  </button>
                </li>
              ))}
              {(rooms.data?.items ?? []).length === 0 && (
                <li className="px-1 text-sm text-text-low">No rooms yet.</li>
              )}
            </ul>
          </section>
        </>
      }
    >
      <header className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <p className="mono-data text-[0.72rem] font-bold uppercase tracking-[0.15em] text-gold-soft">Live</p>
          <h1 className="mt-2 text-[clamp(38px,5vw,56px)] font-bold leading-[1.02] tracking-[-0.045em] text-text-hi">
            Talk in real time
          </h1>
          <p className="mt-3 max-w-xl text-[0.95rem] leading-relaxed text-text-low">
            Real-time rooms. The chat is live; video broadcasting is not built yet.
          </p>
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold',
            connected ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-200',
          )}
        >
          <span
            aria-hidden="true"
            className={cn('h-2 w-2 rounded-full', connected ? 'bg-emerald-400' : 'bg-amber-400')}
          />
          {connected ? 'Chat live' : 'Reconnecting…'}
        </span>
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
        {/* Stage */}
        <div className="cloud-card overflow-hidden">
          <div className="relative aspect-video bg-black">
            <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
            {!cameraOn && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10 text-white/80">
                  <Radio size={26} aria-hidden="true" />
                </span>
                <p className="max-w-sm px-6 text-sm leading-relaxed text-white/80">
                  Turn your camera on to preview what you would broadcast. It stays on this device —
                  Kinjy cannot send it anywhere yet.
                </p>
              </div>
            )}
            {cameraOn && (
              <span className="absolute start-3 top-3 rounded-full bg-red-500/90 px-3 py-1 text-[0.68rem] font-bold uppercase tracking-wide text-white">
                Preview only
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 p-4">
            <button
              type="button"
              onClick={toggleCamera}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--cloud-border)] px-5 py-2.5 text-sm font-semibold text-text-mid hover:border-gold/50 hover:text-gold-soft"
            >
              {cameraOn ? <CameraOff size={15} aria-hidden="true" /> : <Camera size={15} aria-hidden="true" />}
              {cameraOn ? 'Stop camera' : 'Start camera'}
            </button>

            <form onSubmit={startRoom} className="flex min-w-0 flex-1 gap-2 sm:ms-auto sm:flex-none">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Name a room…"
                aria-label="Room name"
                className="min-w-0 flex-1 rounded-full border border-transparent bg-text-hi/[0.07] px-5 py-2.5 text-sm text-text-hi placeholder:text-text-low focus:border-gold/50 focus:bg-transparent focus:outline-none sm:w-52 sm:flex-none"
              />
              <button
                type="submit"
                disabled={!title.trim()}
                className="shrink-0 rounded-full bg-gradient-to-br from-gold-soft to-gold px-5 py-2.5 text-sm font-bold text-ink disabled:opacity-40"
              >
                Open room
              </button>
            </form>
          </div>
        </div>

        {/* Live chat */}
        <div className="cloud-card flex min-h-[380px] flex-col p-5">
          <h2 className="mb-4 flex items-center gap-2.5 border-b border-[var(--cloud-border)] pb-4 text-[1.05rem] font-bold tracking-[-0.02em] text-text-hi">
            <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-gold/15 text-gold-soft">
              <Users size={16} aria-hidden="true" />
            </span>
            Live chat
          </h2>

          {!roomId ? (
            <div className="m-auto max-w-[14rem] text-center">
              <p className="text-base font-bold tracking-[-0.02em] text-text-hi">No room open</p>
              <p className="mt-1 text-sm leading-relaxed text-text-low">Open a room to start chatting.</p>
            </div>
          ) : (
            <>
              <div className="flex-1 space-y-3 overflow-y-auto pe-1">
                {messages.length === 0 && <p className="text-sm text-text-low">Say something first.</p>}
                {messages.map((message) => {
                  const mine = message.sender_id === user?.id
                  return (
                    <div key={message.id} className={cn('flex flex-col', mine ? 'items-end' : 'items-start')}>
                      <span className="mono-data mb-0.5 px-1 text-[0.68rem] text-text-low">
                        {mine ? 'You' : `@${message.sender_id.slice(0, 10)}`}
                      </span>
                      <p
                        className={cn(
                          'max-w-[85%] whitespace-pre-wrap break-words rounded-[18px] px-3.5 py-2 text-[0.92rem] leading-snug',
                          mine
                            ? 'bg-gradient-to-br from-gold-soft to-gold text-ink'
                            : 'bg-text-hi/[0.07] text-text-hi',
                        )}
                      >
                        {message.body}
                      </p>
                    </div>
                  )
                })}
              </div>

              <form onSubmit={send} className="mt-4 flex gap-2 border-t border-[var(--cloud-border)] pt-4">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Message the room…"
                  aria-label="Live chat message"
                  className="w-full min-w-0 rounded-full border border-transparent bg-text-hi/[0.07] px-4 py-2.5 text-sm text-text-hi placeholder:text-text-low focus:border-gold/50 focus:bg-transparent focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!draft.trim()}
                  aria-label="Send"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-gold-soft to-gold text-ink disabled:opacity-40"
                >
                  <Send size={16} />
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-5 rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {error}
        </p>
      )}
    </AppShell>
  )
}
