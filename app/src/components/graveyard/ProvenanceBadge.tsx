import { cn } from '@/lib/utils'
import { provenanceLabel } from './format'

// Normal text colour on every label; what sets an AI or verified one apart is its
// border. The theme's warning and success colours are 3.2–4.1:1 on a tinted
// background in light mode — under the 4.5:1 this small text needs.
const ON_PAGE: Record<string, string> = {
  original: 'bg-text-low/15 text-text-mid',
  edited: 'bg-text-low/15 text-text-mid',
  ai_assisted: 'border border-warning/60 bg-warning/10 text-text-hi',
  ai_generated: 'border border-warning/60 bg-warning/10 text-text-hi',
  verified_source: 'border border-success/60 bg-success/10 text-text-hi',
}

// The viewer is black whatever the theme, so it cannot use the theme's tokens:
// they would turn dark in light mode, on black.
const ON_DARK: Record<string, string> = {
  original: 'bg-white/15 text-white',
  edited: 'bg-white/15 text-white',
  ai_assisted: 'bg-amber-300/20 text-amber-200',
  ai_generated: 'bg-amber-300/20 text-amber-200',
  verified_source: 'bg-emerald-300/20 text-emerald-200',
}

/**
 * Where a photo or video comes from — original, edited, AI assisted, AI generated
 * or from a verified source. The platform labels every piece of media this way
 * (blueprint §17), and a memorial's pictures are the ones people most need to be
 * able to trust.
 */
export default function ProvenanceBadge({ value, onDark = false }: { value: string; onDark?: boolean }) {
  const palette = onDark ? ON_DARK : ON_PAGE
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[0.65rem] font-semibold',
        palette[value] ?? palette.original,
      )}
    >
      {provenanceLabel(value)}
    </span>
  )
}
