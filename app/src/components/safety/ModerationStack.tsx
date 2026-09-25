import { useRef } from 'react'
import { pinLength } from '@/lib/pinLength'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { Bot, Users, ShieldCheck, MessagesSquare, FileText } from 'lucide-react'

gsap.registerPlugin(ScrollTrigger)

const LAYERS = [
  {
    icon: Bot,
    name: 'Automated',
    desc: 'AI screens every upload in milliseconds — spam, abuse, illegal content, coordinated manipulation.',
    volume: 'millions/day',
    target: 4200000,
    format: (v: number) => `${(v / 1_000_000).toFixed(1)}M`,
    width: '100%',
  },
  {
    icon: Users,
    name: 'Community',
    desc: 'Trained member reviewers with context tools and full decision history.',
    volume: 'thousands/day',
    target: 38400,
    format: (v: number) => `${Math.round(v / 1000)}K`,
    width: '88%',
  },
  {
    icon: ShieldCheck,
    name: 'Platform',
    desc: 'A professional trust & safety team handles escalations, legal requests and edge cases.',
    volume: 'hundreds/day',
    target: 640,
    format: (v: number) => `${Math.round(v)}`,
    width: '76%',
  },
  {
    icon: MessagesSquare,
    name: 'Appeals',
    desc: 'Every decision can be appealed to humans. Violated rule, action taken, duration and appeal path are always disclosed.',
    volume: 'always open',
    target: 100,
    format: (v: number) => `${Math.round(v)}%`,
    width: '64%',
  },
  {
    icon: FileText,
    name: 'Transparency',
    desc: 'Public quarterly reports: enforcement volumes, policy changes, appeal outcomes.',
    volume: 'published',
    target: 4,
    format: (v: number) => `${Math.round(v)}/yr`,
    width: '52%',
  },
]

/**
 * ModerationStack — refinement #17. Five glass strata (widening downward like a
 * funnel) build as you scroll (pinned 140vh); each layer's throughput counter ticks.
 * Reduced motion: static stacked diagram.
 */
export default function ModerationStack() {
  const scope = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const layers = gsap.utils.toArray<HTMLElement>('[data-layer]')

      if (reduce) {
        // Static stacked diagram with final counter values
        layers.forEach((layer, i) => {
          const counter = layer.querySelector<HTMLElement>('[data-counter]')
          if (counter) counter.textContent = LAYERS[i].format(LAYERS[i].target)
        })
        return
      }

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: scope.current,
          start: 'top top',
          end: pinLength(1.4),
          scrub: 0.5,
          pin: true,
          pinSpacing: true,
        },
      })

      layers.forEach((layer, i) => {
        const counter = layer.querySelector<HTMLElement>('[data-counter]')
        const state = { v: 0 }
        tl.fromTo(
          layer,
          { opacity: 0, y: 90, scale: 0.96 },
          { opacity: 1, y: 0, scale: 1, duration: 1, ease: 'power2.out' },
          i * 0.9,
        )
        if (counter) {
          tl.to(
            state,
            {
              v: LAYERS[i].target,
              duration: 0.9,
              ease: 'power1.out',
              onUpdate: () => {
                counter.textContent = LAYERS[i].format(state.v)
              },
            },
            i * 0.9 + 0.15,
          )
        }
      })

      // The stack gently compresses and settles
      tl.to('[data-stack]', { scale: 0.985, duration: 0.6, ease: 'power2.inOut' }, layers.length * 0.9)
      tl.to('[data-stack]', { scale: 1, duration: 0.5, ease: 'power2.out' }, layers.length * 0.9 + 0.6)
    },
    { scope },
  )

  return (
    <section ref={scope} aria-labelledby="layers-heading" className="relative overflow-hidden py-24">
      <div className="mx-auto max-w-container px-6">
        <div className="text-center">
          <p className="eyebrow text-gold">Refinement #17 · Layered moderation</p>
          <h2 id="layers-heading" className="h2 mt-3">
            Five layers between harm and you.
          </h2>
        </div>

        <div data-stack className="mx-auto mt-14 flex max-w-4xl flex-col items-center gap-3">
          {LAYERS.map((layer, i) => (
            <div
              key={layer.name}
              data-layer
              className="cloud-card flex items-center gap-4 px-5 py-4 md:px-7"
              style={{ width: layer.width }}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-gold/10 text-gold-soft">
                <layer.icon size={18} strokeWidth={1.9} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-text-hi">
                  <span className="mono-data me-2 text-[0.68rem] font-medium text-text-low">L{i + 1}</span>
                  {layer.name}
                  <span className="mono-data ms-3 text-[0.72rem] font-medium text-gold-soft">{layer.volume}</span>
                </p>
                <p className="caption mt-0.5 line-clamp-2">{layer.desc}</p>
              </div>
              <span data-counter className="mono-data hidden shrink-0 text-lg text-sky sm:inline">
                0
              </span>
            </div>
          ))}
        </div>

        {/* Appeals disclosure example */}
        <div className="mx-auto mt-10 max-w-3xl rounded-card-md border border-white/10 bg-ink-2/80 p-5">
          <p className="caption font-bold uppercase tracking-[0.14em] text-gold-soft">
            What you see when a decision affects you
          </p>
          <dl className="mono-data mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-[0.78rem] md:grid-cols-4">
            <div>
              <dt className="text-text-low">Violated rule</dt>
              <dd className="mt-0.5 text-text-hi">§3.2 Graphic content</dd>
            </div>
            <div>
              <dt className="text-text-low">Action</dt>
              <dd className="mt-0.5 text-text-hi">Post removed</dd>
            </div>
            <div>
              <dt className="text-text-low">Duration</dt>
              <dd className="mt-0.5 text-text-hi">Permanent</dd>
            </div>
            <div>
              <dt className="text-text-low">Appeal</dt>
              <dd className="mt-0.5 text-success">Open · human review</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  )
}
