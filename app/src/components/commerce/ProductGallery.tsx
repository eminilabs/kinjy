import { useMemo, useRef, useState } from 'react'
import { ImageOff } from 'lucide-react'
import MediaLightbox from '@/components/social/MediaLightbox'
import type { PostMedia } from '@/lib/api'
import { cn } from '@/lib/utils'

/** Media storage may be private for some viewers, so a broken URL must degrade, not show a broken icon. */
export function ProductImage({
  src,
  alt,
  className,
}: {
  src?: string | null
  alt: string
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label="No photo available"
        className={cn('flex items-center justify-center bg-ink-2/80 text-text-low', className)}
      >
        <ImageOff size={24} aria-hidden="true" />
      </div>
    )
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn('object-cover', className)}
    />
  )
}

export default function ProductGallery({ images, title }: { images: string[]; title: string }) {
  const [active, setActive] = useState(0)
  const [open, setOpen] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)

  const media = useMemo<PostMedia[]>(
    () => images.map((url) => ({ url, kind: 'image', alt_text: title })),
    [images, title],
  )

  const goTo = (index: number) => {
    const el = scroller.current
    if (!el) return
    el.scrollTo({ left: index * el.clientWidth, behavior: 'smooth' })
    setActive(index)
  }

  if (images.length === 0) {
    return (
      <ProductImage
        alt={title}
        className="aspect-square w-full rounded-card-sm md:aspect-[4/3]"
      />
    )
  }

  return (
    <div>
      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget
          const index = Math.round(el.scrollLeft / Math.max(1, el.clientWidth))
          if (index !== active) setActive(index)
        }}
        className="flex snap-x snap-mandatory overflow-x-auto rounded-card-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((url, i) => (
          <button
            key={url + i}
            type="button"
            onClick={() => setOpen(true)}
            aria-label={`Enlarge photo ${i + 1} of ${images.length}`}
            className="aspect-square w-full shrink-0 snap-center md:aspect-[4/3]"
          >
            <ProductImage src={url} alt={title} className="h-full w-full" />
          </button>
        ))}
      </div>

      {images.length > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {images.map((url, i) => (
            <button
              key={url + i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === active}
              className={cn(
                'h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 md:h-16 md:w-16',
                i === active ? 'border-gold' : 'border-transparent opacity-70',
              )}
            >
              <ProductImage src={url} alt="" className="h-full w-full" />
            </button>
          ))}
        </div>
      )}

      {open && <MediaLightbox media={media} index={active} onClose={() => setOpen(false)} />}
    </div>
  )
}
