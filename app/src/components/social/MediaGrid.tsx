import { useState } from 'react'
import type { PostMedia } from '@/lib/api'
import { cn } from '@/lib/utils'
import VideoPlayer from './VideoPlayer'

/**
 * A post's pictures, laid out the way people expect them.
 *
 * What was wrong before: every image was `object-cover`, which crops. A single
 * portrait photo — most phone photos — lost its top and bottom, so a picture of
 * somebody arrived with their head cut off, and a screenshot arrived unreadable.
 * Several images were forced into fixed-height halves, so three pictures left a
 * gap and five were simply all there, each one short and cropped.
 *
 * The rule now follows the count, because what is right depends on it:
 *
 * * **One** — never cropped. The whole picture, at its own shape, centred on a
 *   dark ground and capped in height so a very tall image does not push the
 *   next post off the screen. A single image is the post; cutting it is cutting
 *   the post.
 * * **Two** — side by side, equal, cropped to match. Two pictures of different
 *   shapes sitting at different heights reads as a mistake.
 * * **Three** — one tall on the left, two stacked on the right.
 * * **Four or more** — a two-by-two grid, with "+N" over the last tile when
 *   there are more. Cropping is right here: the grid is a contact sheet, and
 *   the viewer is one tap away.
 *
 * Cropped tiles are centred on their subject as far as CSS allows
 * (`object-cover` keeps the middle), which is why the single-image case is the
 * one that must not crop: there is no grid to keep tidy, only a photograph.
 */
export default function MediaGrid({
  media,
  onOpen,
  onLoadDeferred,
  loadingDeferred,
  autoplay = true,
}: {
  media: PostMedia[]
  onOpen: (index: number) => void
  /** Data saver: the server sent no URL until the member asks. */
  onLoadDeferred: () => void
  loadingDeferred: boolean
  autoplay?: boolean
}) {
  if (media.length === 0) return null

  const shown = media.slice(0, 4)
  const hidden = media.length - shown.length

  const tile = (item: PostMedia, index: number, className: string) => (
    <Tile
      key={item.url ?? `deferred-${index}`}
      item={item}
      index={index}
      className={className}
      onOpen={onOpen}
      onLoadDeferred={onLoadDeferred}
      loadingDeferred={loadingDeferred}
      autoplay={autoplay}
      more={index === shown.length - 1 && hidden > 0 ? hidden : 0}
    />
  )

  // One: the picture itself, uncropped.
  if (media.length === 1) {
    const only = media[0]
    // The box is reserved from the real shape when it is known, so the card
    // does not collapse to a line and then shove the feed down when the
    // picture lands. Capped the same way the image is, and clamped so a very
    // wide panorama still has somewhere to sit.
    const ratio =
      only.width && only.height ? Math.min(Math.max(only.width / only.height, 0.5), 3) : null
    return (
      <div
        className="-mx-5 mt-3 border-y border-white/8 bg-black/40"
        style={
          ratio
            ? { aspectRatio: String(ratio), maxHeight: 560 }
            : // Unknown shape - every post made before anything measured. A
              // minimum keeps the jump small instead of total.
              { minHeight: 220 }
        }
      >
        <Tile
          item={only}
          index={0}
          single
          boxed={Boolean(ratio)}
          className=""
          onOpen={onOpen}
          onLoadDeferred={onLoadDeferred}
          loadingDeferred={loadingDeferred}
          autoplay={autoplay}
          more={0}
        />
      </div>
    )
  }

  // Three: one tall beside two stacked.
  if (media.length === 3) {
    return (
      <div className="-mx-5 mt-3 grid h-80 grid-cols-2 gap-0.5 overflow-hidden border-y border-white/8 bg-ink">
        {tile(media[0], 0, 'h-full min-h-0')}
        <div className="grid min-h-0 grid-rows-2 gap-0.5">
          {tile(media[1], 1, 'h-full min-h-0')}
          {tile(media[2], 2, 'h-full min-h-0')}
        </div>
      </div>
    )
  }

  // Two, or four and more.
  return (
    <div
      className={cn(
        '-mx-5 mt-3 grid grid-cols-2 gap-0.5 overflow-hidden border-y border-white/8 bg-ink',
        media.length === 2 ? 'h-64' : 'h-80',
      )}
    >
      {shown.map((item, index) => tile(item, index, 'h-full min-h-0'))}
    </div>
  )
}

function Tile({
  item,
  index,
  className,
  onOpen,
  onLoadDeferred,
  loadingDeferred,
  autoplay,
  more,
  single = false,
  boxed = false,
}: {
  item: PostMedia
  index: number
  className: string
  onOpen: (index: number) => void
  onLoadDeferred: () => void
  loadingDeferred: boolean
  autoplay: boolean
  /** How many further pictures this tile stands for. */
  more: number
  single?: boolean
  /** The container already has the right shape, so the image fills it. */
  boxed?: boolean
}) {
  const [broken, setBroken] = useState(false)

  // Data saver: nothing has downloaded, and the tap is what asks for it.
  if (item.url === null) {
    return (
      <button
        type="button"
        onClick={onLoadDeferred}
        disabled={loadingDeferred}
        className={cn(
          'flex w-full flex-col items-center justify-center gap-1 bg-white/4 hover:bg-white/8 disabled:opacity-60',
          single ? 'py-10' : className,
        )}
      >
        <span className="text-sm text-text-hi">
          {loadingDeferred ? 'Loading…' : `Tap to load ${item.kind}`}
        </span>
        <span className="caption text-text-low">Data saver is on — nothing downloaded yet</span>
      </button>
    )
  }

  if (item.kind === 'video') {
    return (
      <div className={cn('relative w-full overflow-hidden bg-black', className)}>
        <VideoPlayer
          src={item.url}
          autoplay={autoplay}
          onExpand={() => onOpen(index)}
          className="h-full w-full"
        />
      </div>
    )
  }

  if (broken) {
    // A dead URL should leave a tidy tile, not a torn-page icon and the alt
    // text spilling across the card.
    return (
      <div
        className={cn(
          'flex w-full items-center justify-center bg-white/[0.04]',
          single ? 'py-12' : className,
        )}
      >
        <span className="caption">This image could not be loaded</span>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(index)}
      aria-label={item.alt_text || 'Open image'}
      className={cn('relative block w-full overflow-hidden', single && boxed && 'h-full', className)}
    >
      <img
        src={item.url}
        alt={item.alt_text ?? ''}
        loading="lazy"
        onError={() => setBroken(true)}
        className={cn(
          'cursor-zoom-in hover:opacity-95',
          single
            // The whole picture, at its own shape. Capped so a very tall image
            // does not push the rest of the feed off the screen - it opens full
            // size on tap.
            //
            // `h-full` only when the container already has the shape: inside a
            // box defined by min-height alone it resolves to zero, and the
            // image renders as a line.
            ? cn('mx-auto max-h-[560px] w-full object-contain', boxed && 'h-full')
            : 'h-full w-full object-cover',
        )}
      />
      {more > 0 && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-2xl font-semibold text-white">
          +{more}
        </span>
      )}
    </button>
  )
}
