import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Flame, Flower2, QrCode, Send, Volume2, VolumeX } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CandleFlowerWidget } from '@/components/ui-kit'
import { avatarStyle, useAppTheme } from './theme'
import type { ReactNode } from 'react'

interface Props {
  orb?: ReactNode
}

/** Graveyard peek — memorial card with tributes, guest book, audio toggle, QR plaque. */
export default function GraveyardPeek({ orb }: Props) {
  const { tok } = useAppTheme()
  const [candles, setCandles] = useState(128)
  const [flowers, setFlowers] = useState(64)
  const [autoplay, setAutoplay] = useState(true)
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState<string[]>([])

  const submit = () => {
    if (!message.trim()) return
    setPending((p) => [...p, message.trim()])
    setMessage('')
  }

  return (
    <div className="flex h-full flex-col gap-3.5 lg:flex-row">
      {/* Memorial card */}
      <div className={cn('flex-1 overflow-hidden rounded-card-lg', tok.card)}>
        <div className="relative">
          <img src="/memorial-hero.jpg" alt="Candlelit memorial for Baba Musa Wekesa" className="aspect-[16/7] w-full object-cover" loading="lazy" />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/85 to-transparent p-4 pt-10">
            <p className="font-display text-xl font-medium text-text-hi">Baba Musa Wekesa</p>
            <p className="text-xs text-gold-soft">1948 – 2023 · “He planted trees whose shade he never sat in.”</p>
          </div>
          <span className="absolute end-3 top-3 rounded-full border border-success/40 bg-success/15 px-2.5 py-1 font-mono text-[0.62rem] font-semibold text-success">
            VERIFIED MEMORIAL
          </span>
        </div>

        {/* action bar + orb anchor */}
        <div className="flex items-center gap-2.5 p-4">
          <motion.button
            type="button"
            onClick={() => setCandles((c) => c + 1)}
            whileTap={{ scale: 1.05 }}
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-gold-soft to-gold px-3.5 py-1.5 text-xs font-bold text-ink"
          >
            <Flame size={12} aria-hidden="true" /> Candle · <span className="tabular-nums">{candles}</span>
          </motion.button>
          <motion.button
            type="button"
            onClick={() => setFlowers((f) => f + 1)}
            whileTap={{ scale: 1.05 }}
            className={cn('inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold', tok.subtleBg, tok.mid, tok.hoverBg)}
          >
            <Flower2 size={12} aria-hidden="true" /> Flower · <span className="tabular-nums">{flowers}</span>
          </motion.button>
          <button
            type="button"
            onClick={() => setAutoplay((v) => !v)}
            aria-pressed={autoplay}
            className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold', tok.subtleBg, autoplay ? 'text-sky' : tok.low)}
          >
            {autoplay ? <Volume2 size={12} aria-hidden="true" /> : <VolumeX size={12} aria-hidden="true" />}
            Memorial audio {autoplay ? 'ON' : 'OFF'}
          </button>
          {/* orb anchor beside the memorial action bar */}
          <span className="ms-auto">{orb}</span>
        </div>

        {/* tributes visual + guest book */}
        <div className="grid gap-4 border-t p-4 sm:grid-cols-2" style={{ borderColor: 'rgba(128,128,128,0.15)' }}>
          <div className="flex items-center justify-around">
            <CandleFlowerWidget kind="candle" tier="premium" name="Musa" />
            <CandleFlowerWidget kind="flower" tier="free" name="Musa" />
          </div>
          <div>
            <p className={cn('mb-2 text-xs font-bold uppercase tracking-wider', tok.low)}>Guest book</p>
            <div className="flex gap-2">
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                placeholder="Leave a memory…"
                className={cn('min-w-0 flex-1 rounded-full px-3.5 py-2 text-xs outline-none focus:ring-1 focus:ring-gold/50', tok.input, tok.text)}
              />
              <motion.button
                type="button"
                onClick={submit}
                whileTap={{ scale: 1.05 }}
                aria-label="Submit guest book message"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold-soft to-gold text-ink"
              >
                <Send size={13} />
              </motion.button>
            </div>
            <p className={cn('mt-1.5 text-[0.65rem]', tok.low)}>Your message will appear after admin review.</p>
            <AnimatePresence initial={false}>
              {pending.map((m, i) => (
                <motion.p
                  key={`${i}-${m}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-2 rounded-card-sm border border-warning/30 bg-warning/10 px-3 py-1.5 text-xs text-warning"
                >
                  “{m}” — pending review
                </motion.p>
              ))}
            </AnimatePresence>
            <div className={cn('mt-2 space-y-1.5 text-xs', tok.mid)}>
              <p className="flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-cover" style={avatarStyle(4)} aria-hidden="true" />
                “He taught me to ride a bicycle on this very street.” — Naliaka
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* QR plaque */}
      <div className={cn('w-full shrink-0 self-start rounded-card-lg p-4 lg:w-[220px]', tok.card)}>
        <p className={cn('mb-2 flex items-center gap-1.5 text-sm font-bold', tok.text)}>
          <QrCode size={15} className="text-gold" aria-hidden="true" /> QR plaque
        </p>
        <img src="/memorial-qr.jpg" alt="Engraved memorial QR plaque" className="w-full rounded-card-md object-cover" loading="lazy" />
        <p className={cn('mt-2.5 text-[0.68rem] leading-relaxed', tok.mid)}>
          Scan at the graveside to open this memorial — candles, stories and the audio tribute.
        </p>
      </div>
    </div>
  )
}
