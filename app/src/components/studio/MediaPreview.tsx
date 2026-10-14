import { Download } from 'lucide-react'
import type { PublishMedia } from '@/lib/api'

const link =
  'inline-flex items-center gap-1.5 rounded-full border border-text-low/40 px-3 py-1 text-xs font-semibold text-text-mid hover:border-gold/40 hover:text-text-hi'

// The HTML download attribute is ignored for a different origin (the media
// server in development). Ask the server for an attachment too.
const downloadUrl = (url: string) => `${url}${url.includes('?') ? '&' : '?'}download=1`

/** A saved file's name: "kinjy-carousel-2.png", not an opaque id. */
const fileName = (target: string, index: number, total: number, media: PublishMedia): string => {
  const extension = media.content_type.split('/')[1]?.replace('mpeg', 'mp3') ?? 'bin'
  return `kinjy-${target.replace('_', '-')}${total > 1 ? `-${index + 1}` : ''}.${extension}`
}

/**
 * What a render made, shown the way it will be seen: slides as a strip, a
 * narration as a player, a video as a video.
 *
 * The addresses carry a ticket that expires. A player that outlives it fails to
 * load, and `onExpired` asks the page for the job again — which comes back with
 * fresh ones — instead of leaving a broken picture the creator has to reload by
 * hand.
 */
export default function MediaPreview({
  target,
  media,
  label,
  onExpired,
}: {
  target: string
  media: PublishMedia[]
  label: string
  onExpired: () => void
}) {
  if (media.length === 0) return null

  if (target === 'carousel') {
    return (
      <div className="mt-3">
        <ol className="flex snap-x gap-3 overflow-x-auto pb-2" aria-label={`${label}, ${media.length} slides`}>
          {media.map((m, i) => (
            <li key={m.id} className="shrink-0 snap-start">
              <img
                src={m.url}
                alt={m.alt || `Slide ${i + 1}`}
                width={m.width ?? undefined}
                height={m.height ?? undefined}
                loading="lazy"
                onError={onExpired}
                className="h-72 w-auto rounded-card-sm border border-text-low/25"
              />
              <a href={downloadUrl(m.url)} download={fileName(target, i, media.length, m)} className={`${link} mt-1.5`} aria-label={`Download slide ${i + 1}`}>
                <Download size={12} aria-hidden="true" /> {i + 1} / {media.length}
              </a>
            </li>
          ))}
        </ol>
      </div>
    )
  }

  const [file] = media
  return (
    <div className="mt-3 space-y-2">
      {file.kind === 'video' ? (
        <video
          src={file.url}
          controls
          playsInline
          preload="metadata"
          aria-label={label}
          onError={onExpired}
          className="max-h-96 max-w-full rounded-card-sm bg-black"
        />
      ) : (
        <audio src={file.url} controls preload="metadata" aria-label={label} onError={onExpired} className="w-full" />
      )}
      <div className="flex flex-wrap items-center gap-2 text-xs text-text-mid">
        {file.seconds != null && <span>{formatLength(file.seconds)}</span>}
        <a href={downloadUrl(file.url)} download={fileName(target, 0, 1, file)} className={link}>
          <Download size={12} aria-hidden="true" /> Download
        </a>
      </div>
    </div>
  )
}

const formatLength = (seconds: number): string => {
  const whole = Math.round(seconds)
  return whole < 60 ? `${whole} s` : `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`
}
