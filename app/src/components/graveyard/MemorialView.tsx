import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import {
  BadgeCheck, Camera, Check, Copy, Download, Flame, Flower2, Lock, MapPin, MessageSquare, QrCode, ShieldAlert,
} from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { useAuth } from '@/hooks/useAuth'
import { ApiError, kaluta, type Memorial, type MemorialEvent, type Tribute } from '@/lib/api'
import { cn } from '@/lib/utils'
import { DEATH_STATUS, FAITH_STYLES, lifeSpan, momentDate } from './format'
import { TICKET_REFRESH_MS, useEvery } from './useEvery'

const card = 'rounded-card-md border border-text-low/25 bg-text-low/5 p-5'
const field =
  'w-full rounded-card-sm border border-text-low/40 bg-text-low/5 px-3 py-2 text-sm text-text-hi placeholder:text-text-low focus:border-gold/40 focus:outline-none'
const ghost =
  'inline-flex items-center gap-1.5 rounded-full border border-text-low/40 px-4 py-2 text-xs font-semibold text-text-mid hover:border-gold/40 hover:text-text-hi disabled:opacity-40'
const primary =
  'inline-flex items-center justify-center gap-1.5 rounded-full bg-gold-soft px-4 py-2 text-xs font-bold text-ink disabled:opacity-40'

const KIND_ICON = { candle: Flame, flower: Flower2, message: MessageSquare, photo: Camera } as const

function Initials({ name, size }: { name: string; size: number }) {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => Array.from(part)[0])
    .join('')
    .toUpperCase()
  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-full bg-text-low/20 font-display text-text-hi"
      style={{ width: size, height: size, fontSize: size * 0.34 }}
    >
      {letters}
    </span>
  )
}

/** When a signed link stops working, in ms since the epoch (0 if it carries no ticket). */
function expiry(url: string): number {
  try {
    return Number(new URL(url, window.location.href).searchParams.get('e')) * 1000 || 0
  } catch {
    return 0
  }
}

/**
 * The voice recording. Its link is a five-minute ticket that the page renews, but
 * swapping the source of an element that is playing would cut it off. So the
 * renewed link is only taken up at the one moment it matters: pressing play on a
 * page that has been open long enough for the link in use to have expired. The
 * track then starts again from where it was.
 */
function MemorialAudio({ url, autoplay }: { url: string; autoplay: boolean }) {
  const [src, setSrc] = useState(url)
  return (
    <audio
      controls
      autoPlay={autoplay}
      src={src}
      onPlay={(e) => {
        const el = e.currentTarget
        if (url === src || expiry(src) > Date.now() + 15_000) return
        const at = el.currentTime
        setSrc(url)
        el.addEventListener(
          'loadedmetadata',
          () => {
            el.currentTime = at
            void el.play()
          },
          { once: true },
        )
      }}
      className="w-full"
    />
  )
}

/** The QR code engraved on the resting place, and the link it carries. */
function SharePanel({ memorial }: { memorial: Memorial }) {
  const [image, setImage] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let live = true
    QRCode.toDataURL(memorial.qr_url, { margin: 1, width: 320, errorCorrectionLevel: 'M' })
      .then((url) => live && setImage(url))
      .catch(() => live && setImage(null))
    return () => {
      live = false
    }
  }, [memorial.qr_url])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(memorial.qr_url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section className={card} aria-label="Share this memorial">
      <h3 className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-text-hi">
        <QrCode size={15} className="text-gold" aria-hidden="true" /> Visit and share
      </h3>
      <div className="flex flex-wrap items-center gap-4">
        {image ? (
          <img src={image} alt={`QR code for the memorial of ${memorial.full_name}`} className="h-32 w-32 rounded-card-sm bg-white p-1" />
        ) : (
          <span className="flex h-32 w-32 items-center justify-center rounded-card-sm bg-text-low/10 text-xs text-text-mid">QR</span>
        )}
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-xs text-text-mid">
            Scanning this code at the resting place opens this page — no account needed.
          </p>
          <p className="mono-data break-all text-xs text-text-hi">{memorial.qr_url}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void copy()} className={ghost}>
              {copied ? <Check size={12} aria-hidden="true" /> : <Copy size={12} aria-hidden="true" />}
              {copied ? 'Copied' : 'Copy link'}
            </button>
            {image && (
              <a href={image} download={`memorial-${memorial.qr_code}.png`} className={ghost}>
                <Download size={12} aria-hidden="true" /> Download QR
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function Tributes({ memorial, onChanged }: { memorial: Memorial; onChanged: () => void }) {
  const { user } = useAuth()
  // Candles and flowers are counted above; the list is the guest book, so a few
  // hundred of them cannot push the words off the first page.
  const [shown, setShown] = useState(20)
  const list = useApi(
    () => kaluta.memorials.tributes(memorial.id, { kind: 'message,photo', limit: shown }),
    [memorial.id, shown],
  )
  useEvery(list.reload, TICKET_REFRESH_MS)
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const leave = async (kind: string, extra: { body?: string; media_id?: string } = {}) => {
    setBusy(true)
    setError(null)
    setNote(null)
    try {
      const result = await kaluta.memorials.tribute(memorial.id, {
        kind,
        ...(user ? {} : { author_name: name.trim() || undefined }),
        ...extra,
      })
      if (kind === 'message') setMessage('')
      setNote(
        result.status === 'pending'
          ? 'Thank you. The family reads every message before it appears.'
          : kind === 'candle'
            ? 'Your candle is lit.'
            : kind === 'flower'
              ? 'Your flower is placed.'
              : 'Thank you — it is on the memorial.',
      )
      list.reload()
      onChanged()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not leave the tribute')
    } finally {
      setBusy(false)
    }
  }

  const sharePhoto = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const uploaded = await kaluta.media.upload(file)
      await leave('photo', { media_id: uploaded.id })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not share the photo')
      setBusy(false)
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const counts = memorial.tribute_counts
  const items = list.data?.items ?? []
  const total = list.data?.total ?? 0

  return (
    <section className={card} aria-label="Tributes">
      <h3 className="text-sm font-semibold text-text-hi">Tributes</h3>
      <p className="mt-1 text-xs text-text-mid">
        {[
          counts.candle ? `${counts.candle} candle${counts.candle === 1 ? '' : 's'}` : null,
          counts.flower ? `${counts.flower} flower${counts.flower === 1 ? '' : 's'}` : null,
          counts.message ? `${counts.message} message${counts.message === 1 ? '' : 's'}` : null,
          counts.photo ? `${counts.photo} photo${counts.photo === 1 ? '' : 's'}` : null,
        ].filter(Boolean).join(' · ') || 'Be the first to leave a tribute.'}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => void leave('candle')} disabled={busy} className={ghost}>
          <Flame size={13} aria-hidden="true" /> Light a candle
        </button>
        <button type="button" onClick={() => void leave('flower')} disabled={busy} className={ghost}>
          <Flower2 size={13} aria-hidden="true" /> Leave a flower
        </button>
        {user && (
          <>
            <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className={ghost}>
              <Camera size={13} aria-hidden="true" /> Share a photo
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              aria-label="Photo to share"
              onChange={(e) => void sharePhoto(e.target.files?.[0])}
            />
          </>
        )}
      </div>

      <form
        className="mt-4 space-y-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (message.trim()) void leave('message', { body: message.trim() })
        }}
      >
        {!user && (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            placeholder="Your name — optional"
            aria-label="Your name"
            className={field}
          />
        )}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          maxLength={4000}
          placeholder="Write in the guest book…"
          aria-label="Guest book message"
          className={cn(field, 'resize-none')}
        />
        <button type="submit" disabled={busy || !message.trim()} className={primary}>
          Sign the guest book
        </button>
      </form>
      {note && <p className="mt-3 text-sm text-success">{note}</p>}
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}

      {items.length > 0 && (
        <ul className="mt-5 space-y-2 border-t border-text-low/20 pt-4">
          {items.map((t: Tribute) => {
            const Icon = KIND_ICON[t.kind as keyof typeof KIND_ICON] ?? MessageSquare
            return (
              <li key={t.id} className="flex gap-3 text-sm">
                <Icon size={15} className="mt-0.5 shrink-0 text-gold" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-text-hi">
                    <span className="font-semibold">{t.author_name}</span>
                    <span className="text-text-mid">
                      {t.kind === 'candle' ? ' lit a candle' : t.kind === 'flower' ? ' left a flower' : t.kind === 'photo' ? ' shared a photo' : ''}
                    </span>
                  </p>
                  {t.body && <p className="mt-0.5 whitespace-pre-line text-text-mid">{t.body}</p>}
                  {t.media_url && (
                    <img src={t.media_url} alt={`Photo shared by ${t.author_name}`} className="mt-2 max-h-56 rounded-card-sm object-cover" loading="lazy" />
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {items.length < total && (
        <button type="button" onClick={() => setShown((n) => n + 20)} disabled={list.loading} className={cn(ghost, 'mt-3')}>
          Show earlier tributes ({total - items.length} more)
        </button>
      )}
    </section>
  )
}

/** Any signed-in member who can prove the death can start its verification. */
function ReportDeath({ memorial, onChanged }: { memorial: Memorial; onChanged: () => void }) {
  const [open, setOpen] = useState(false)
  const [evidence, setEvidence] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (memorial.death_status === 'verified') return null

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const document = file ? await kaluta.media.upload(file) : null
      await kaluta.memorials.reportDeath(memorial.id, {
        evidence: evidence.trim(),
        ...(document ? { document_media_id: document.id } : {}),
      })
      setNote('Thank you. Kinjy will review the evidence and the family will be told the outcome.')
      setOpen(false)
      setEvidence('')
      setFile(null)
      onChanged()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send the report')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={card} aria-label="Verify the death">
      <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-text-hi">
        <ShieldAlert size={15} className="text-gold" aria-hidden="true" /> Verification
      </h3>
      <p className="mt-1 text-xs text-text-mid">
        A memorial is marked verified once Kinjy has reviewed evidence of the death — a certificate, a
        notice, an official letter.
      </p>
      {note && <p className="mt-3 text-sm text-success">{note}</p>}
      {open ? (
        <form onSubmit={submit} className="mt-3 space-y-2">
          <textarea
            value={evidence}
            onChange={(e) => setEvidence(e.target.value)}
            rows={3}
            maxLength={4000}
            placeholder="What evidence do you have? Where is it from?"
            aria-label="Evidence of the death"
            className={cn(field, 'resize-none')}
          />
          <label className="block text-xs text-text-mid">
            A copy of the document — optional (image or PDF)
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-1 block text-xs text-text-mid"
            />
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={busy || evidence.trim().length < 10} className={primary}>
              Send for review
            </button>
            <button type="button" onClick={() => setOpen(false)} className={ghost}>
              Cancel
            </button>
          </div>
          {evidence.trim().length > 0 && evidence.trim().length < 10 && (
            <p className="text-xs text-warning">Say a little more about the evidence.</p>
          )}
        </form>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className={cn(ghost, 'mt-3')}>
          Report the death with evidence
        </button>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
    </section>
  )
}

/**
 * A memorial as visitors see it — on its public page (reached by the QR code)
 * and inside the app. Everything here works signed out except sharing a photo
 * and reporting the death, which need to know who is asking.
 */
export default function MemorialView({ memorial, onChanged }: { memorial: Memorial; onChanged: () => void }) {
  const { user } = useAuth()
  const events = useApi<{ items: MemorialEvent[] }>(() => kaluta.memorials.events(memorial.id), [memorial.id])
  const status = DEATH_STATUS[memorial.death_status] ?? DEATH_STATUS.unconfirmed
  const faith = FAITH_STYLES.find((f) => f.id === memorial.faith_style)
  const grave = memorial.grave
  const moments = events.data?.items ?? []

  return (
    <div className="space-y-4">
      <header className="overflow-hidden rounded-card-md border border-text-low/25">
        <div
          className="h-32 bg-cover bg-center sm:h-40"
          style={{
            backgroundImage: memorial.cover_url
              ? `url("${memorial.cover_url}")`
              : 'linear-gradient(135deg, rgb(var(--text-low-rgb) / 0.25), rgb(var(--gold-rgb) / 0.18))',
          }}
          role={memorial.cover_url ? 'img' : undefined}
          aria-label={memorial.cover_url ? `Cover image for ${memorial.full_name}` : undefined}
        />
        <div className="flex flex-wrap items-end gap-4 px-5 pb-5">
          <div className="-mt-12 shrink-0 rounded-full border-4 border-[rgb(var(--ink-rgb))]">
            {memorial.photo_url ? (
              <img src={memorial.photo_url} alt={`Portrait of ${memorial.full_name}`} className="h-24 w-24 rounded-full object-cover" />
            ) : (
              <Initials name={memorial.full_name} size={96} />
            )}
          </div>
          <div className="min-w-0 flex-1 pt-3">
            <h2 className="font-display text-2xl text-text-hi sm:text-3xl">{memorial.full_name}</h2>
            <p className="mt-1 text-sm text-text-mid">{lifeSpan(memorial.birth_date, memorial.death_date)}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {status.tone !== 'none' && (
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold',
                    status.tone === 'good' ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning',
                  )}
                >
                  {status.tone === 'good' && <BadgeCheck size={11} aria-hidden="true" />}
                  {status.label}
                </span>
              )}
              {memorial.visibility === 'private' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-text-low/15 px-2.5 py-0.5 text-[0.7rem] font-semibold text-text-mid">
                  <Lock size={10} aria-hidden="true" /> Private — only its administrators see it
                </span>
              )}
              {faith && faith.id !== 'none' && (
                <span className="rounded-full bg-text-low/15 px-2.5 py-0.5 text-[0.7rem] font-semibold text-text-mid">
                  {faith.label}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {memorial.audio.url && (
        <section className={card} aria-label="Memorial audio">
          <h3 className="mb-2 text-sm font-semibold text-text-hi">A voice to remember</h3>
          <MemorialAudio url={memorial.audio.url} autoplay={memorial.audio.autoplay} />
        </section>
      )}

      {memorial.biography && (
        <section className={card} aria-label="Biography">
          <h3 className="mb-2 text-sm font-semibold text-text-hi">Life</h3>
          <p className="whitespace-pre-line text-sm leading-relaxed text-text-mid">{memorial.biography}</p>
        </section>
      )}

      {moments.length > 0 && (
        <section className={card} aria-label="Timeline">
          <h3 className="mb-3 text-sm font-semibold text-text-hi">Timeline</h3>
          <ol className="space-y-3 border-s border-gold/40 ps-4">
            {moments.map((m) => (
              <li key={m.id} className="relative">
                <span aria-hidden="true" className="absolute -start-[1.32rem] top-1.5 h-2 w-2 rounded-full bg-gold" />
                <p className="mono-data text-xs text-text-mid">{momentDate(m.year, m.month, m.day)}</p>
                <p className="text-sm font-semibold text-text-hi">{m.title}</p>
                {m.body && <p className="mt-0.5 whitespace-pre-line text-sm text-text-mid">{m.body}</p>}
              </li>
            ))}
          </ol>
        </section>
      )}

      {grave.lat !== null && grave.lng !== null && (
        <section className={card} aria-label="Resting place">
          <h3 className="mb-1 inline-flex items-center gap-2 text-sm font-semibold text-text-hi">
            <MapPin size={15} className="text-gold" aria-hidden="true" /> Resting place
          </h3>
          {grave.label && <p className="text-sm text-text-hi">{grave.label}</p>}
          <p className="mono-data text-xs text-text-mid">
            {grave.lat.toFixed(5)}, {grave.lng.toFixed(5)}
          </p>
          <p className={cn('mt-1 text-xs', grave.verified ? 'text-success' : 'text-warning')}>
            {grave.verified
              ? `Captured at the grave itself${grave.accuracy_m != null ? `, to within about ${Math.max(1, Math.round(grave.accuracy_m))} m` : ''}.`
              : 'Entered by the family, not yet confirmed at the grave.'}
          </p>
          <a
            href={`https://www.openstreetmap.org/?mlat=${grave.lat}&mlon=${grave.lng}#map=18/${grave.lat}/${grave.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(ghost, 'mt-3')}
          >
            Open in a map
          </a>
        </section>
      )}

      <Tributes memorial={memorial} onChanged={onChanged} />
      <SharePanel memorial={memorial} />
      {user && <ReportDeath memorial={memorial} onChanged={onChanged} />}
    </div>
  )
}
