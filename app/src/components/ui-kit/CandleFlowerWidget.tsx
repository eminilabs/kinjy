import { cn } from '@/lib/utils'

export interface CandleFlowerWidgetProps {
  /** 'candle' | 'flower' */
  kind?: 'candle' | 'flower'
  /** Paid tier adds a gold halo + engraved ribbon */
  tier?: 'free' | 'premium'
  name?: string
  className?: string
}

/**
 * CandleFlowerWidget — memorial digital candle/flower with CSS flicker animation.
 * Free + paid tiers (premium gets a gold halo and ribbon label).
 */
export default function CandleFlowerWidget({
  kind = 'candle',
  tier = 'free',
  name,
  className,
}: CandleFlowerWidgetProps) {
  return (
    <div className={cn('relative inline-flex flex-col items-center gap-3 p-4', className)}>
      {tier === 'premium' && (
        <span
          aria-hidden="true"
          className="absolute top-1 h-16 w-16 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(240,200,120,0.35), transparent 70%)' }}
        />
      )}
      {kind === 'candle' ? (
        <span className="relative flex flex-col items-center" aria-hidden="true">
          {/* flame */}
          <span
            className="block h-5 w-2.5 origin-bottom animate-flicker rounded-[50%_50%_50%_50%/60%_60%_40%_40%]"
            style={{
              background: 'linear-gradient(to top, #E07856, #F0C878 55%, #FFF6DC)',
              boxShadow: '0 0 12px 3px rgba(240,200,120,0.55)',
            }}
          />
          {/* wick + body */}
          <span className="block h-1 w-0.5 bg-[#3a2e1a]" />
          <span className="block h-12 w-5 rounded-t-md rounded-b-sm bg-gradient-to-b from-[#F6F1E7] to-[#D9CDB4]" />
          <span className="mt-1 block h-1.5 w-9 rounded-full bg-white/10" />
        </span>
      ) : (
        <span className="relative block h-14 w-14" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <span
              key={i}
              className="absolute left-1/2 top-1/2 h-6 w-3.5 origin-bottom rounded-full bg-gradient-to-b from-[#F6F1E7] to-[#D8CBB0]"
              style={{ transform: `translate(-50%, -100%) rotate(${i * 60}deg)` }}
            />
          ))}
          <span className="absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold" />
          <span className="absolute left-1/2 top-full h-5 w-0.5 -translate-x-1/2 bg-success/60" />
        </span>
      )}
      {name && <span className="caption text-center">for {name}</span>}
      {tier === 'premium' && (
        <span className="rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-widest text-gold-soft">
          Premium tribute
        </span>
      )}
      <span className="sr-only">
        {kind === 'candle' ? 'A lit memorial candle' : 'A memorial flower'}
        {name ? ` for ${name}` : ''}
      </span>
    </div>
  )
}
