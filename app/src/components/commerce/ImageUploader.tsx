import { useEffect, useRef, useState } from 'react'
import { ImagePlus, RotateCw, X } from 'lucide-react'
import { ApiError, kaluta } from '@/lib/api'
import { cn } from '@/lib/utils'

const MAX_IMAGES = 5
// The media service itself accepts up to 200 MB for a post; a listing photo
// that big only slows the buyer's phone, so we stop earlier.
const MAX_BYTES = 10 * 1024 * 1024
const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

interface Item {
  key: string
  /** Absent for a photo the listing already had: it is only a URL, nothing to upload or retry. */
  file?: File
  preview: string
  progress: number
  status: 'uploading' | 'done' | 'failed'
  url?: string
  error?: string
}

interface Props {
  /** Reports the uploaded URLs (in order) and whether any upload is still running. */
  onChange: (state: { urls: string[]; busy: boolean }) => void
  /** Photos the listing already has, shown first and counted toward the limit. Read once, when it mounts. */
  initialUrls?: string[]
  className?: string
}

const seed = (urls: string[] = []): Item[] =>
  urls.map((url, index) => ({
    key: `existing-${index}-${url}`,
    preview: url,
    progress: 1,
    status: 'done' as const,
    url,
  }))

// Only previews made from a local file need freeing; an existing photo is a plain URL.
const free = (item: Item) => {
  if (item.preview.startsWith('blob:')) URL.revokeObjectURL(item.preview)
}

export default function ImageUploader({ onChange, initialUrls, className }: Props) {
  const [items, setItems] = useState<Item[]>(() => seed(initialUrls))
  const [notice, setNotice] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const itemsRef = useRef<Item[]>(items)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const commit = (next: Item[]) => {
    itemsRef.current = next
    setItems(next)
    onChangeRef.current({
      urls: next.filter((i) => i.status === 'done' && i.url).map((i) => i.url as string),
      busy: next.some((i) => i.status === 'uploading'),
    })
  }
  const patch = (key: string, change: Partial<Item>) =>
    commit(itemsRef.current.map((i) => (i.key === key ? { ...i, ...change } : i)))

  useEffect(
    () => () => itemsRef.current.forEach(free),
    [],
  )

  const upload = async (item: Item) => {
    if (!item.file) return
    try {
      const uploaded = await kaluta.media.uploadWithProgress(
        item.file,
        (fraction) => patch(item.key, { progress: fraction }),
        { purpose: 'post' },
      )
      patch(item.key, { status: 'done', url: uploaded.url, progress: 1, error: undefined })
    } catch (err) {
      patch(item.key, {
        status: 'failed',
        error: err instanceof ApiError ? err.message : 'Upload failed',
      })
    }
  }

  const pick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    setNotice(null)
    const room = MAX_IMAGES - itemsRef.current.length
    const accepted: Item[] = []
    let skipped: string | null = null
    for (const file of files) {
      if (accepted.length >= room) {
        skipped = `Up to ${MAX_IMAGES} photos per listing.`
        break
      }
      if (!TYPES.includes(file.type)) {
        skipped = `${file.name || 'That file'} is not a JPEG, PNG, WebP or GIF photo.`
        continue
      }
      if (file.size > MAX_BYTES) {
        skipped = `${file.name || 'That photo'} is over ${MAX_BYTES / 1024 / 1024} MB.`
        continue
      }
      accepted.push({
        key: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        preview: URL.createObjectURL(file),
        progress: 0,
        status: 'uploading',
      })
    }
    if (skipped) setNotice(skipped)
    if (accepted.length === 0) return
    commit([...itemsRef.current, ...accepted])
    accepted.forEach((item) => void upload(item))
  }

  const remove = (key: string) => {
    const gone = itemsRef.current.find((i) => i.key === key)
    if (gone) free(gone)
    commit(itemsRef.current.filter((i) => i.key !== key))
  }

  const retry = (item: Item) => {
    patch(item.key, { status: 'uploading', progress: 0, error: undefined })
    void upload(item)
  }

  return (
    <div className={className}>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {items.map((item, index) => (
          <li
            key={item.key}
            className="relative aspect-square overflow-hidden rounded-2xl border border-white/10 bg-ink-2/60"
          >
            <img
              src={item.preview}
              alt={`Photo ${index + 1}`}
              className={cn('h-full w-full object-cover', item.status !== 'done' && 'opacity-50')}
            />
            {item.status === 'uploading' && (
              <div
                role="progressbar"
                aria-label={`Uploading photo ${index + 1}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(item.progress * 100)}
                className="absolute inset-x-0 bottom-0 h-1.5 bg-black/40"
              >
                <div className="h-full bg-gold" style={{ width: `${Math.round(item.progress * 100)}%` }} />
              </div>
            )}
            {item.status === 'failed' && (
              <button
                type="button"
                onClick={() => retry(item)}
                aria-label={`Retry photo ${index + 1}: ${item.error}`}
                className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/55 px-1 text-center text-[11px] font-semibold text-red-200"
              >
                <RotateCw size={16} aria-hidden="true" />
                Retry
              </button>
            )}
            <button
              type="button"
              onClick={() => remove(item.key)}
              aria-label={`Remove photo ${index + 1}`}
              className="absolute end-0 top-0 flex h-11 w-11 items-center justify-center"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-text-hi">
                <X size={13} aria-hidden="true" />
              </span>
            </button>
          </li>
        ))}
        {items.length < MAX_IMAGES && (
          <li>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex aspect-square min-h-[44px] w-full flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-white/20 text-xs font-semibold text-text-mid hover:border-gold/40 hover:text-gold-soft"
            >
              <ImagePlus size={20} aria-hidden="true" />
              Add
            </button>
          </li>
        )}
      </ul>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={pick}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
      <p className="caption mt-2">
        {items.length}/{MAX_IMAGES} photos · JPEG, PNG, WebP or GIF, up to {MAX_BYTES / 1024 / 1024} MB each
      </p>
      {notice && (
        <p role="alert" className="mt-1 text-xs text-red-200">
          {notice}
        </p>
      )}
      {items.some((i) => i.status === 'failed') && (
        <p role="alert" className="mt-1 text-xs text-red-200">
          {items.find((i) => i.status === 'failed')?.error} Tap a failed photo to retry, or remove it.
        </p>
      )}
    </div>
  )
}
