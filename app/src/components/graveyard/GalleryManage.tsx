import { useRef, useState } from 'react'
import { ArrowDown, ArrowUp, CircleAlert, ImagePlus, Play, Trash2, X } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { ApiError, kaluta, type GalleryItem, type Memorial } from '@/lib/api'
import { cn } from '@/lib/utils'
import { PROVENANCE, formatBytes } from './format'

const card = 'rounded-card-md border border-text-low/25 bg-text-low/5 p-5'
const field =
  'w-full rounded-card-sm border border-text-low/40 bg-text-low/5 px-3 py-2 text-sm text-text-hi placeholder:text-text-low focus:border-gold/40 focus:outline-none'
const ghost =
  'inline-flex items-center gap-1.5 rounded-full border border-text-low/40 px-3.5 py-1.5 text-xs font-semibold text-text-mid hover:border-gold/40 hover:text-text-hi disabled:opacity-40'
const primary =
  'inline-flex items-center justify-center gap-1.5 rounded-full bg-gold-soft px-4 py-2 text-xs font-bold text-ink disabled:opacity-40'

const MB = 1024 * 1024
/** What media-service will take for a memorial; checked here first so a refusal costs no upload. */
const LIMITS = { image: 25 * MB, video: 50 * MB }
const ACCEPT = 'image/jpeg,image/png,image/webp,video/mp4,video/webm'

const message = (err: unknown, fallback: string) => (err instanceof ApiError ? err.message : fallback)

/**
 * A problem, said in the page's normal text colour with a red mark beside it.
 * The theme's red is 4.3:1 on the dark card — under the 4.5:1 small text needs —
 * and a message someone has to act on is the last text that may be hard to read.
 */
function ErrorLine({ text, className }: { text: string; className?: string }) {
  return (
    <p role="alert" className={cn('flex items-start gap-1.5 text-sm text-text-hi', className)}>
      <CircleAlert size={14} className="mt-0.5 shrink-0 text-danger" aria-hidden="true" />
      {text}
    </p>
  )
}

function kindOf(file: File): 'image' | 'video' | null {
  if (['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return 'image'
  if (['video/mp4', 'video/webm'].includes(file.type)) return 'video'
  return null
}

/** Why this file will not be sent, in words that say what to do — or null if it can go. */
function refusal(file: File): string | null {
  const kind = kindOf(file)
  if (!kind) {
    return file.type === 'video/quicktime' || /\.mov$/i.test(file.name)
      ? 'An iPhone video (.mov) has to be saved as MP4 (H.264) first.'
      : 'Photos can be JPEG, PNG or WebP; videos MP4 or WebM.'
  }
  if (file.size > LIMITS[kind]) {
    return `${kind === 'video' ? 'Videos' : 'Photos'} are limited to ${LIMITS[kind] / MB} MB — this one is ${formatBytes(file.size)}.`
  }
  return null
}

interface Entry {
  key: string
  name: string
  size: number
  state: 'waiting' | 'uploading' | 'adding' | 'done' | 'error'
  progress: number
  message?: string
}

function Thumb({ item, onBroken }: { item: GalleryItem; onBroken: (at: number) => void }) {
  return item.kind === 'image' ? (
    <img src={item.url} alt="" loading="lazy" decoding="async" onError={(e) => onBroken(e.timeStamp)} className="h-14 w-14 shrink-0 rounded-card-sm object-cover" />
  ) : (
    <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-card-sm bg-text-low/20">
      <video src={`${item.url}#t=0.1`} preload="metadata" muted playsInline onError={(e) => onBroken(e.timeStamp)} className="h-full w-full object-cover" />
      <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-white" aria-hidden="true">
        <Play size={16} fill="currentColor" />
      </span>
    </span>
  )
}

function Row({
  item,
  index,
  count,
  memorialId,
  onMove,
  onChanged,
  onBroken,
}: {
  item: GalleryItem
  index: number
  count: number
  memorialId: string
  onMove: (from: number, to: number) => void
  onChanged: () => void
  onBroken: (at: number) => void
}) {
  const [caption, setCaption] = useState(item.caption ?? '')
  // Held here so a click shows at once; put back if the server says no.
  const [sensitive, setSensitive] = useState(item.sensitive)
  const [origin, setOrigin] = useState(item.provenance)
  const [confirm, setConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async (patch: Parameters<typeof kaluta.memorials.updateMedia>[2]): Promise<boolean> => {
    setError(null)
    try {
      await kaluta.memorials.updateMedia(memorialId, item.id, patch)
      onChanged()
      return true
    } catch (err) {
      setError(message(err, 'Could not save it'))
      return false
    }
  }

  const remove = async () => {
    setError(null)
    try {
      await kaluta.memorials.removeMedia(memorialId, item.id)
      onChanged()
    } catch (err) {
      setError(message(err, 'Could not remove it'))
    }
  }

  const n = index + 1
  return (
    <li className="rounded-card-sm border border-text-low/20 p-3">
      <div className="flex items-start gap-3">
        <Thumb item={item} onBroken={onBroken} />
        <div className="min-w-0 flex-1 space-y-2">
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            onBlur={() => {
              const next = caption.trim()
              if (next !== (item.caption ?? '')) void save({ caption: next || null })
            }}
            maxLength={500}
            placeholder="A caption — optional"
            aria-label={`Caption for item ${n}`}
            className={field}
          />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <label className="flex items-center gap-2 text-xs text-text-mid">
              <input
                type="checkbox"
                checked={sensitive}
                onChange={(e) => {
                  const next = e.target.checked
                  setSensitive(next)
                  void save({ sensitive: next }).then((saved) => saved || setSensitive(!next))
                }}
              />
              Sensitive — blurred until shown
            </label>
            <label className="flex items-center gap-2 text-xs text-text-mid">
              Origin
              <select
                value={origin}
                onChange={(e) => {
                  const previous = origin
                  setOrigin(e.target.value)
                  void save({ provenance: e.target.value }).then((saved) => saved || setOrigin(previous))
                }}
                aria-label={`Origin of item ${n}`}
                className="rounded-card-sm border border-text-low/40 bg-text-low/5 px-2 py-1 text-xs text-text-hi"
              >
                {PROVENANCE.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <span className="text-xs text-text-mid">
              {item.kind === 'video' ? 'Video' : 'Photo'} · {formatBytes(item.size_bytes)}
              {item.from_tribute && ' · from a tribute'}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-1">
          <button type="button" onClick={() => onMove(index, index - 1)} disabled={index === 0} aria-label={`Move item ${n} earlier`} className={cn(ghost, '!px-2')}>
            <ArrowUp size={13} aria-hidden="true" />
          </button>
          <button type="button" onClick={() => onMove(index, index + 1)} disabled={index === count - 1} aria-label={`Move item ${n} later`} className={cn(ghost, '!px-2')}>
            <ArrowDown size={13} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {confirm ? (
          <>
            <span className="text-xs text-text-mid">
              {item.from_tribute ? 'Take it off the gallery? The tribute keeps it.' : 'Remove it for good?'}
            </span>
            <button type="button" onClick={() => void remove()} className="rounded-full bg-red-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-red-700">
              Yes, remove
            </button>
            <button type="button" onClick={() => setConfirm(false)} className={ghost}>
              Keep it
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setConfirm(true)} aria-label={`Remove item ${n}`} className={ghost}>
            <Trash2 size={12} aria-hidden="true" /> Remove
          </button>
        )}
      </div>
      {error && <ErrorLine text={error} className="mt-2" />}
    </li>
  )
}

/**
 * The family's side of the gallery: add photos and videos, caption them, say
 * where each comes from, mark the ones some visitors would rather not meet
 * unprepared, put them in order, and take them out.
 *
 * Several files go up one after another with a progress bar each — a phone's
 * video is tens of megabytes, and a spinner would say nothing for a minute.
 * Anything the server would refuse is refused here first, with what to do.
 */
export default function GalleryManage({ memorial, refresh }: { memorial: Memorial; refresh: number }) {
  const gallery = useApi(() => kaluta.memorials.gallery(memorial.id), [memorial.id, refresh])
  const [queue, setQueue] = useState<Entry[]>([])
  const [busy, setBusy] = useState(false)
  const [provenance, setProvenance] = useState('original')
  const [error, setError] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const aborters = useRef(new Map<string, AbortController>())
  const lastReload = useRef(-Infinity)

  const items = gallery.data?.items ?? []
  const limit = gallery.data?.limit ?? 60
  const maxBytes = gallery.data?.max_bytes ?? 500 * MB
  const used = gallery.data?.bytes_used ?? 0

  // A thumbnail whose ticket ran out asks for fresh ones, once in a while.
  const broken = (at: number) => {
    if (at - lastReload.current > 10_000) {
      lastReload.current = at
      gallery.reload()
    }
  }

  const patchEntry = (key: string, change: Partial<Entry>) =>
    setQueue((q) => q.map((e) => (e.key === key ? { ...e, ...change } : e)))

  const start = async (files: File[]) => {
    const entries: Entry[] = files.map((file) => ({
      key: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: file.name,
      size: file.size,
      state: 'waiting',
      progress: 0,
    }))
    setQueue((q) => [...q.filter((e) => e.state !== 'done'), ...entries])
    setBusy(true)
    let count = items.length
    let bytes = used
    for (const [i, file] of files.entries()) {
      const entry = entries[i]
      const reason =
        refusal(file) ??
        (count >= limit
          ? `The gallery is full — it holds ${limit} photos and videos.`
          : bytes + file.size > maxBytes
            ? `Not enough room — a gallery holds ${maxBytes / MB} MB.`
            : null)
      if (reason) {
        patchEntry(entry.key, { state: 'error', message: reason })
        continue
      }
      const controller = new AbortController()
      aborters.current.set(entry.key, controller)
      try {
        patchEntry(entry.key, { state: 'uploading' })
        const uploaded = await kaluta.media.uploadWithProgress(file, (fraction) => patchEntry(entry.key, { progress: fraction }), {
          purpose: 'memorial',
          provenance,
          signal: controller.signal,
        })
        patchEntry(entry.key, { state: 'adding', progress: 1 })
        await kaluta.memorials.addMedia(memorial.id, { media_id: uploaded.id })
        patchEntry(entry.key, { state: 'done' })
        count += 1
        bytes += file.size
        gallery.reload()
      } catch (err) {
        patchEntry(entry.key, { state: 'error', message: message(err, 'Could not add it') })
      } finally {
        aborters.current.delete(entry.key)
      }
    }
    setBusy(false)
  }

  const move = async (from: number, to: number) => {
    if (to < 0 || to >= items.length) return
    const ids = items.map((i) => i.id)
    ;[ids[from], ids[to]] = [ids[to], ids[from]]
    setError(null)
    try {
      await kaluta.memorials.reorderMedia(memorial.id, ids)
      gallery.reload()
    } catch (err) {
      setError(message(err, 'Could not change the order'))
    }
  }

  const full = items.length >= limit
  return (
    <section className={card} aria-label="Photos and videos">
      <h3 className="text-sm font-semibold text-text-hi">
        Photos and videos ({items.length}/{limit})
      </h3>
      <p className="mt-1 text-xs text-text-mid">
        Up to {limit}, {formatBytes(maxBytes)} in all. Photos as JPEG, PNG or WebP up to {LIMITS.image / MB} MB; videos as MP4 or
        WebM up to {LIMITS.video / MB} MB. Using {formatBytes(used)}.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => input.current?.click()} disabled={busy || full} className={primary}>
          <ImagePlus size={13} aria-hidden="true" /> Add photos or videos
        </button>
        <label className="flex items-center gap-2 text-xs text-text-mid">
          They are
          <select
            value={provenance}
            onChange={(e) => setProvenance(e.target.value)}
            aria-label="Origin of the files you add"
            className="rounded-card-sm border border-text-low/40 bg-text-low/5 px-2 py-1 text-xs text-text-hi"
          >
            {PROVENANCE.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <input
          ref={input}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          aria-label="Photos or videos to add"
          onChange={(e) => {
            const picked = [...(e.target.files ?? [])]
            e.target.value = ''
            if (picked.length) void start(picked)
          }}
        />
      </div>

      {queue.length > 0 && (
        <ul className="mt-3 space-y-1.5" aria-label="Uploads">
          {queue.map((e) => (
            <li key={e.key} className="rounded-card-sm border border-text-low/25 px-3 py-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-text-hi">{e.name}</span>
                <span className={cn('shrink-0', e.state === 'error' ? 'font-semibold text-text-hi' : e.state === 'done' ? 'text-success' : 'text-text-mid')}>
                  {e.state === 'waiting' && 'Waiting'}
                  {e.state === 'uploading' && `Uploading ${Math.round(e.progress * 100)}%`}
                  {e.state === 'adding' && 'Adding…'}
                  {e.state === 'done' && 'Added'}
                  {e.state === 'error' && 'Not added'}
                </span>
                {e.state === 'uploading' && (
                  <button type="button" onClick={() => aborters.current.get(e.key)?.abort()} aria-label={`Cancel ${e.name}`} className="rounded-full p-1 text-text-mid hover:text-danger">
                    <X size={12} aria-hidden="true" />
                  </button>
                )}
              </div>
              {(e.state === 'uploading' || e.state === 'adding') && (
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-text-low/25" role="progressbar" aria-label={`Uploading ${e.name}`} aria-valuenow={Math.round(e.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full bg-gold" style={{ width: `${Math.round(e.progress * 100)}%` }} />
                </div>
              )}
              {e.state === 'error' && e.message && <ErrorLine text={e.message} className="mt-1 !text-xs" />}
            </li>
          ))}
        </ul>
      )}

      {gallery.loading && !gallery.data && <p className="mt-3 text-sm text-text-mid">Loading…</p>}
      {gallery.data && items.length === 0 && <p className="mt-3 text-sm text-text-mid">Nothing here yet.</p>}
      <ul className="mt-3 space-y-2">
        {items.map((item, i) => (
          <Row
            key={item.id}
            item={item}
            index={i}
            count={items.length}
            memorialId={memorial.id}
            onMove={(from, to) => void move(from, to)}
            onChanged={gallery.reload}
            onBroken={broken}
          />
        ))}
      </ul>
      {(error ?? gallery.error) && <ErrorLine text={(error ?? gallery.error) as string} className="mt-2" />}
    </section>
  )
}
