import { useEffect, useRef, useState } from 'react'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { ApiError, kaluta } from '@/lib/api'
import { cn } from '@/lib/utils'
import { MAX_EVIDENCE, MAX_EVIDENCE_BYTES, type EvidenceFile } from './DisputeModel'

/**
 * Photos are uploaded the moment they are picked, through the same
 * media-service call as every other screen; the dispute then only carries URLs.
 */
export default function DisputeEvidenceInput({
  value,
  onChange,
  onBusyChange,
  disabled,
  compact,
}: {
  value: EvidenceFile[]
  onChange: (next: EvidenceFile[]) => void
  onBusyChange?: (busy: boolean) => void
  disabled?: boolean
  /** Icon-only trigger, for the composer bar. */
  compact?: boolean
}) {
  const input = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(0)
  const [error, setError] = useState<string | null>(null)
  // Uploads resolve later than the render that started them.
  const valueRef = useRef(value)
  valueRef.current = value

  useEffect(() => onBusyChange?.(uploading > 0), [uploading, onBusyChange])

  const pick = async (files: FileList | null) => {
    if (!files) return
    setError(null)
    const room = MAX_EVIDENCE - value.length - uploading
    const chosen = Array.from(files).slice(0, Math.max(0, room))
    if (files.length > chosen.length) setError(`You can attach up to ${MAX_EVIDENCE} photos.`)

    for (const file of chosen) {
      if (!file.type.startsWith('image/')) {
        setError('Only photos can be attached.')
        continue
      }
      if (file.size > MAX_EVIDENCE_BYTES) {
        setError(`${file.name || 'That photo'} is over ${MAX_EVIDENCE_BYTES / 1024 / 1024} MB.`)
        continue
      }
      setUploading((n) => n + 1)
      try {
        const uploaded = await kaluta.media.upload(file, 'original')
        onChange([...valueRef.current, { url: uploaded.url, name: file.name }])
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'That photo could not be uploaded')
      } finally {
        setUploading((n) => n - 1)
      }
    }
    if (input.current) input.current.value = ''
  }

  const full = value.length + uploading >= MAX_EVIDENCE

  return (
    <div className={compact ? 'contents' : undefined}>
      {(value.length > 0 || uploading > 0) && (
        <ul className={cn('flex flex-wrap gap-2', compact ? 'order-first basis-full' : 'mb-2')}>
          {value.map((file, i) => (
            <li key={file.url} className="relative">
              <img
                src={file.url}
                alt={file.name}
                className="h-14 w-14 rounded-card-sm border border-white/12 object-cover"
              />
              <button
                type="button"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                aria-label={`Remove ${file.name || 'photo'}`}
                className="absolute -end-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-text-hi ring-1 ring-white/20 after:absolute after:-inset-2.5 after:content-['']"
              >
                <X size={12} aria-hidden="true" />
              </button>
            </li>
          ))}
          {Array.from({ length: uploading }).map((_, i) => (
            <li
              key={`up-${i}`}
              role="status"
              aria-label="Uploading photo"
              className="flex h-14 w-14 items-center justify-center rounded-card-sm border border-white/12 bg-ink-2/70"
            >
              <Loader2 size={16} className="animate-spin text-text-low" aria-hidden="true" />
            </li>
          ))}
        </ul>
      )}

      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => void pick(e.target.files)}
      />
      <button
        type="button"
        disabled={disabled || full}
        onClick={() => input.current?.click()}
        aria-label="Attach photos"
        className={cn(
          'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-white/12 text-xs font-semibold text-text-mid transition-colors hover:border-gold/40 hover:text-gold-soft disabled:opacity-40',
          compact ? 'min-w-11 px-3' : 'px-4',
        )}
      >
        <ImagePlus size={16} aria-hidden="true" />
        {!compact && `Add photos (${value.length}/${MAX_EVIDENCE})`}
      </button>
      {error && (
        <p role="alert" className={cn('text-xs text-red-200', compact ? 'order-last basis-full' : 'mt-1.5')}>
          {error}
        </p>
      )}
    </div>
  )
}

