import type { Sticker } from '@/lib/api'
import { cn } from '@/lib/utils'

/**
 * A sticker, drawn: its artwork when the server has some, otherwise its glyph.
 *
 * Both come from the server's catalogue, never from the message, so a sticker
 * cannot be made to show a picture nobody curated. The caller names it for a
 * screen reader (a button label, or `role="img"` on the bubble); this only draws.
 */
export default function StickerFace({
  sticker,
  className,
  imageClassName,
}: {
  sticker: Pick<Sticker, 'glyph' | 'image_url'>
  className?: string
  imageClassName?: string
}) {
  if (sticker.image_url) {
    return <img src={sticker.image_url} alt="" draggable={false} className={imageClassName} />
  }
  return (
    <span aria-hidden="true" className={cn('select-none leading-none', className)}>
      {sticker.glyph}
    </span>
  )
}
