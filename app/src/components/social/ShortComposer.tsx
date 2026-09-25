import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Film, Loader2, RotateCcw, Upload, X } from 'lucide-react'
import { ApiError, kaluta } from '@/lib/api'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

/** Long enough for a real clip, short enough to stay a short. */
const MAX_SECONDS = 180
const MAX_BYTES = 200 * 1024 * 1024

interface Probe {
  width: number
  height: number
  duration: number
}

/**
 * Read a clip's real dimensions and length from the file itself.
 *
 * The server would need ffprobe to learn the same thing, and the browser
 * already decoded the header to show a preview. Measuring here means the
 * player can frame a clip on first paint instead of resizing once metadata
 * arrives, and the length limit is enforced against the actual duration rather
 * than a guess from the file size.
 */
function probeVideo(file: File): Promise<Probe> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const url = URL.createObjectURL(file)
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      const probe = {
        width: video.videoWidth,
        height: video.videoHeight,
        duration: Number.isFinite(video.duration) ? video.duration : 0,
      }
      URL.revokeObjectURL(url)
      resolve(probe)
    }
    video.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('That file could not be read as a video'))
    }
    video.src = url
  })
}

function formatDuration(seconds: number): string {
  const s = Math.round(seconds)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/**
 * Publish a short.
 *
 * A short is a *declared* format, not a portrait clip the feed decided to
 * promote — so this is a separate surface with its own framing preview, rather
 * than a checkbox on the feed composer. What the author sees here is the 9:16
 * crop the reel will actually show, including the letterboxing a landscape clip
 * will get, so nothing is a surprise after publishing.
 */
export default function ShortComposer({
  open,
  onOpenChange,
  onPublished,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPublished?: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [probe, setProbe] = useState<Probe | null>(null)
  const [caption, setCaption] = useState('')
  const [visibility, setVisibility] = useState('public')
  const [provenance, setProvenance] = useState('original')
  const [mature, setMature] = useState(false)
  const [progress, setProgress] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Object URLs are a real allocation; a composer opened and abandoned a dozen
  // times would otherwise hold every clip the member browsed.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const reset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(null)
    setPreviewUrl(null)
    setProbe(null)
    setCaption('')
    setMature(false)
    setProgress(0)
    setError(null)
  }

  const pick = async (files: FileList | null) => {
    const chosen = files?.[0]
    if (!chosen) return
    setError(null)

    if (!chosen.type.startsWith('video/')) {
      setError('A short needs a video file.')
      return
    }
    if (chosen.size > MAX_BYTES) {
      setError(`That clip is ${Math.round(chosen.size / 1024 / 1024)} MB — the limit is 200 MB.`)
      return
    }

    try {
      const measured = await probeVideo(chosen)
      if (measured.duration > MAX_SECONDS) {
        setError(
          `That clip runs ${formatDuration(measured.duration)} — a short tops out at ${formatDuration(MAX_SECONDS)}.`,
        )
        return
      }
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setFile(chosen)
      setProbe(measured)
      setPreviewUrl(URL.createObjectURL(chosen))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That file could not be read as a video')
    }
  }

  const publish = async () => {
    if (!file || !probe) return
    setBusy(true)
    setError(null)
    setProgress(0)
    abortRef.current = new AbortController()

    try {
      const asset = await kaluta.media.uploadWithProgress(file, setProgress, {
        provenance,
        altText: caption.slice(0, 200) || undefined,
        signal: abortRef.current.signal,
      })

      await kaluta.posts.create({
        body: caption,
        format: 'short',
        visibility,
        provenance,
        mature,
        media: [
          {
            media_id: asset.id,
            url: asset.url,
            kind: 'video',
            alt_text: caption.slice(0, 200) || null,
            // Travels with the post so the reel can frame it immediately.
            width: probe.width,
            height: probe.height,
            duration_seconds: probe.duration,
          },
        ],
      })

      reset()
      onOpenChange(false)
      onPublished?.()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not publish that short')
    } finally {
      setBusy(false)
      abortRef.current = null
    }
  }

  const portrait = probe ? probe.height > probe.width : true

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Film size={16} className="text-gold" aria-hidden="true" />
            New short
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-[minmax(0,220px)_1fr]">
          {/* The 9:16 frame the reel will actually use. */}
          <div className="mx-auto w-full max-w-[220px]">
            <div className="relative aspect-[9/16] overflow-hidden rounded-card-md border border-white/10 bg-black">
              {previewUrl ? (
                <video
                  src={previewUrl}
                  className="h-full w-full object-contain"
                  controls
                  playsInline
                  loop
                />
              ) : (
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="flex h-full w-full flex-col items-center justify-center gap-2 text-text-low transition-colors hover:text-gold-soft"
                >
                  <Upload size={22} aria-hidden="true" />
                  <span className="px-4 text-center text-xs">
                    Choose a clip, or record one on your phone
                  </span>
                </button>
              )}
            </div>

            {probe && (
              <p className="caption mt-2 text-center">
                {probe.width}×{probe.height} · {formatDuration(probe.duration)}
                {!portrait && (
                  <>
                    <br />
                    <span className="text-amber-200">
                      Landscape — the reel will letterbox it.
                    </span>
                  </>
                )}
              </p>
            )}

            {file && !busy && (
              <button
                type="button"
                onClick={reset}
                className="mx-auto mt-2 flex items-center gap-1.5 text-xs font-semibold text-text-low hover:text-text-hi"
              >
                <RotateCcw size={12} aria-hidden="true" />
                Choose another
              </button>
            )}

            <input
              ref={inputRef}
              type="file"
              accept="video/mp4,video/webm"
              // On a phone this offers the camera as well as the library, which
              // is as close to "record a short" as the web gives us without
              // shipping a recorder.
              capture="user"
              hidden
              onChange={(event) => void pick(event.target.files)}
            />
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="caption mb-1 block">Caption</span>
              <textarea
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                rows={4}
                maxLength={2200}
                placeholder="Say something, and use #hashtags so people can find it…"
                className="w-full resize-none rounded-card-sm border border-white/12 bg-ink-2/70 px-3 py-2 text-sm text-text-hi placeholder:text-text-low focus:border-gold/40 focus:outline-none"
              />
              <span className="caption">{caption.length}/2200</span>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="caption mb-1 block">Audience</span>
                <select
                  value={visibility}
                  onChange={(event) => setVisibility(event.target.value)}
                  className="w-full rounded-card-sm border border-white/12 bg-ink-2/70 px-3 py-2 text-sm text-text-hi focus:border-gold/40 focus:outline-none"
                >
                  <option value="public">Everyone</option>
                  <option value="followers">Followers</option>
                </select>
              </label>

              <label className="block">
                <span className="caption mb-1 block">How it was made</span>
                <select
                  value={provenance}
                  onChange={(event) => setProvenance(event.target.value)}
                  className="w-full rounded-card-sm border border-white/12 bg-ink-2/70 px-3 py-2 text-sm text-text-hi focus:border-gold/40 focus:outline-none"
                >
                  <option value="original">Original</option>
                  <option value="edited">Edited</option>
                  <option value="ai_assisted">AI assisted</option>
                  <option value="ai_generated">AI generated</option>
                </select>
              </label>
            </div>

            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={mature}
                onChange={(event) => setMature(event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-gold"
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-text-hi">Adult content</span>
                <span className="caption block">
                  Keeps this out of the reel for members on a teen or child profile. Declared by
                  you — the platform does not guess it from the pixels.
                </span>
              </span>
            </label>

            {busy && (
              <div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gold transition-[width] duration-200"
                    style={{ width: `${Math.round(progress * 100)}%` }}
                  />
                </div>
                <p className="caption mt-1.5">
                  {progress < 1
                    ? `Uploading — ${Math.round(progress * 100)}%`
                    : 'Uploaded. Publishing…'}
                </p>
              </div>
            )}

            {error && (
              <p className="flex items-start gap-2 text-sm text-amber-200">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2">
              {busy ? (
                <button
                  type="button"
                  onClick={() => abortRef.current?.abort()}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/12 px-4 py-2 text-sm font-semibold text-text-mid hover:text-text-hi"
                >
                  <X size={14} aria-hidden="true" />
                  Cancel upload
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="rounded-full border border-white/12 px-4 py-2 text-sm font-semibold text-text-mid hover:text-text-hi"
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                onClick={() => void publish()}
                disabled={!file || busy}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold text-ink transition',
                  'bg-gradient-to-br from-gold-soft to-gold hover:brightness-110',
                  'disabled:cursor-not-allowed disabled:opacity-40',
                )}
              >
                {busy && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
                Post short
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
