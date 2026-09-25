import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { QrCode, RotateCcw, ScanLine } from 'lucide-react'
import { VerifiedBadge } from '@/components/ui-kit'

const cloudEase = [0.22, 1, 0.36, 1] as [number, number, number, number]

type Phase = 'camera' | 'memorial'

/**
 * QR memorial codes (memorials.md §4): engraved plaque + phone mock that
 * scans it — screen transitions from camera (1s scan-line sweep) to the
 * memorial card. Replayable two-state toggle.
 */
export default function QRScanDemo() {
  const reduced = useReducedMotion()
  const [phase, setPhase] = useState<Phase>('camera')
  const [scanKey, setScanKey] = useState(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scan = () => {
    if (timer.current) clearTimeout(timer.current)
    setPhase('camera')
    setScanKey((k) => k + 1)
    timer.current = setTimeout(() => setPhase('memorial'), reduced ? 150 : 1000)
  }

  useEffect(() => {
    scan()
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="relative flex items-end justify-center gap-4 lg:justify-end">
      {/* angled plaque frame */}
      <motion.figure
        initial={reduced ? false : { opacity: 0, rotate: -4, y: 24 }}
        whileInView={{ opacity: 1, rotate: -2, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.8, ease: cloudEase }}
        className="w-56 shrink-0 overflow-hidden rounded-card-lg border border-gold/30 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.75)] sm:w-64"
      >
        <img
          src="/memorial-qr.jpg"
          alt="Memorial plaque with an engraved QR code on brushed dark metal with gold trim"
          className="aspect-[4/3] w-full object-cover"
          loading="lazy"
        />
      </motion.figure>

      {/* phone mock */}
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 40, rotateY: -14 }}
        whileInView={{ opacity: 1, y: 0, rotateY: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.7, ease: cloudEase, delay: 0.15 }}
        style={{ perspective: 800 }}
        className="relative -ml-10 mb-6 w-36 shrink-0 sm:w-44"
      >
        <div className="overflow-hidden rounded-[1.6rem] border border-white/20 bg-[#0B0E1D] shadow-[0_30px_60px_-18px_rgba(0,0,0,0.85)] ring-4 ring-[#1A1F3B]">
          <div className="relative aspect-[9/16]">
            <AnimatePresence mode="wait">
              {phase === 'camera' ? (
                <motion.div
                  key={`cam-${scanKey}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35 }}
                  className="absolute inset-0 bg-[#12162B]"
                >
                  {/* camera viewfinder with QR glyph */}
                  <div className="absolute inset-4 rounded-card-md border border-white/15">
                    <QrCode className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-gold/80" size={44} />
                    {/* scan line sweep (1s) */}
                    {!reduced && (
                      <motion.span
                        aria-hidden="true"
                        className="absolute left-1 right-1 h-0.5 rounded-full bg-gold-soft shadow-[0_0_12px_rgba(240,200,120,0.9)]"
                        initial={{ top: '6%' }}
                        animate={{ top: '92%' }}
                        transition={{ duration: 1, ease: 'easeInOut' }}
                      />
                    )}
                  </div>
                  <p className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-1 text-center mono-data text-[0.58rem] tracking-widest text-text-mid">
                    <ScanLine size={10} className="text-gold-soft" /> SCANNING PLAQUE…
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="memorial"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: cloudEase }}
                  className="absolute inset-0 bg-gradient-to-b from-[#1A1F3B] to-[#0E1226] p-3"
                >
                  <div className="rounded-card-sm border border-gold/25 bg-white/[0.04] p-2.5">
                    <div className="mx-auto h-10 w-10 rounded-full border border-gold/40 bg-[#141830]" />
                    <p className="mt-2 flex items-center justify-center gap-1 text-center font-display text-[0.68rem] leading-tight text-text-hi">
                      Agnes N. Mushi <VerifiedBadge size={10} />
                    </p>
                    <p className="mt-0.5 text-center mono-data text-[0.5rem] tracking-widest text-gold-soft">1947 — 2024</p>
                    <div className="mx-auto mt-2 h-px w-3/4 bg-white/10" />
                    <p className="mt-1.5 text-center text-[0.5rem] leading-snug text-text-mid">
                      214 candles lit · guest book open
                    </p>
                    <span className="mx-auto mt-1.5 block w-fit rounded-full bg-gradient-to-br from-gold-soft to-gold px-2 py-0.5 text-[0.5rem] font-bold text-ink">
                      Light a candle
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* replay */}
      <button
        type="button"
        onClick={scan}
        className="absolute -bottom-3 right-0 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-[#0E1226]/80 px-3 py-1.5 text-[0.7rem] font-semibold text-text-mid backdrop-blur-sm transition-colors hover:border-gold/40 hover:text-gold-soft"
      >
        <RotateCcw size={12} /> Replay scan
      </button>
    </div>
  )
}
