import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowDown, MousePointerClick } from 'lucide-react'
import { ArcButton } from '@/components/ui-kit'

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

/** Section 1 — "Step inside": glass door panels part to reveal the app. */
export default function EnterHero() {
  const [open, setOpen] = useState(false)

  const enter = () => {
    setOpen(true)
    setTimeout(() => {
      document.getElementById('app-frame')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 700)
  }

  // also part the doors once the visitor scrolls past 60% of the hero
  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY > window.innerHeight * 0.42) setOpen(true)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <section className="twilight-field noise-overlay relative -mt-[72px] flex min-h-[calc(70dvh+72px)] items-center justify-center overflow-hidden px-6 pt-[72px]">
      {/* faint app preview behind the doors */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 top-[72px] bg-cover bg-top opacity-25"
        style={{ backgroundImage: 'url(/app-feed-mock.jpg)' }}
      />

      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="eyebrow text-gold"
        >
          Live demo
        </motion.p>
        <h1 className="display-lg mt-5">
          {'This is Kinjy, running.'.split(' ').map((w, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 + i * 0.08, duration: 0.65, ease: EASE }}
              className="inline-block pe-[0.26em] last:pe-0"
            >
              {w === 'running.' ? <span className="text-gold-grad">{w}</span> : w}
            </motion.span>
          ))}
        </h1>
        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.55, ease: EASE }}
          className="body-lg mx-auto mt-5 max-w-xl text-text-mid"
        >
          A real slice of the product — click everything. Data is simulated; the experience is not.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.55, ease: EASE }}
          className="mt-9"
        >
          <ArcButton variant="gold" size="lg" onClick={enter}>
            <MousePointerClick size={17} aria-hidden="true" /> Enter the app
          </ArcButton>
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="caption mt-6 flex items-center justify-center gap-1.5"
        >
          <ArrowDown size={13} aria-hidden="true" /> or keep scrolling
        </motion.p>
      </div>

      {/* the two glass door panels */}
      {(['left', 'right'] as const).map((side) => (
        <motion.div
          key={side}
          aria-hidden="true"
          initial={false}
          animate={{ x: open ? (side === 'left' ? '-102%' : '102%') : '0%' }}
          transition={{ duration: 0.9, ease: EASE }}
          className="cloud-glass absolute inset-y-0 z-20 w-1/2"
          style={{
            [side]: 0,
            background: 'linear-gradient(160deg, rgba(46,42,110,0.55), rgba(11,14,29,0.75))',
            borderRadius: 0,
          }}
        >
          <span
            className={`absolute top-1/2 h-24 w-px -translate-y-1/2 bg-gradient-to-b from-transparent via-gold/70 to-transparent ${side === 'left' ? 'right-0' : 'left-0'}`}
          />
        </motion.div>
      ))}
    </section>
  )
}
