import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AudioLines, ChevronDown, Clapperboard, FileText, Image, Languages, Newspaper, Radio, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { avatarStyle, useAppTheme } from './theme'
import { FEED_MODES, PostCard, SEED_POSTS } from './posts'
import type { FeedMode, Post } from './posts'

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]
const FORMATS = [
  { icon: Image, label: 'Photo' },
  { icon: Clapperboard, label: 'Video' },
  { icon: AudioLines, label: 'Audio' },
  { icon: FileText, label: 'Article' },
  { icon: Radio, label: 'Live' },
]
const CIRCLES = ['Close Friends', 'Family', 'Business', 'Public']
const ONE_TO_MANY = [
  { icon: Clapperboard, label: 'Short video' },
  { icon: Newspaper, label: 'Newsletter' },
  { icon: Languages, label: 'Translate ×4' },
]

/* --------------------------------- Composer --------------------------------- */

export function Composer({ onPost }: { onPost: (text: string, circle: string) => void }) {
  const { t, tok } = useAppTheme()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [circle, setCircle] = useState(CIRCLES[0])
  const [circleOpen, setCircleOpen] = useState(false)
  const [extras, setExtras] = useState<string[]>(['Translate ×4'])
  const areaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) areaRef.current?.focus()
  }, [open])

  const post = () => {
    if (!text.trim()) return
    onPost(text.trim(), circle)
    setText('')
    setOpen(false)
  }

  return (
    <div className={cn('rounded-card-lg p-3.5', tok.card)}>
      <div className="flex items-center gap-3">
        <span className="h-10 w-10 shrink-0 rounded-full bg-cover ring-1 ring-gold/30" style={avatarStyle(0)} aria-hidden="true" />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn('flex-1 rounded-full px-4 py-2.5 text-start text-sm transition-colors', tok.input, tok.low, tok.hoverBg)}
        >
          {text || t('share')}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="overflow-hidden"
          >
            <textarea
              ref={areaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              placeholder={t('share')}
              className={cn('mt-3 w-full resize-none rounded-card-md p-3 text-sm outline-none focus:ring-1 focus:ring-gold/50', tok.input, tok.text)}
            />

            {/* format icons + circle selector */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {FORMATS.map((f) => (
                <button
                  key={f.label}
                  type="button"
                  title={f.label}
                  className={cn('flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:text-gold-soft', tok.subtleBg, tok.mid)}
                >
                  <f.icon size={14} aria-hidden="true" />
                </button>
              ))}
              <div className="relative ms-auto">
                <button
                  type="button"
                  onClick={() => setCircleOpen((v) => !v)}
                  aria-expanded={circleOpen}
                  className="inline-flex items-center gap-1 rounded-full border border-gold/35 bg-gold/10 px-3 py-1.5 text-xs font-bold text-gold-soft"
                >
                  {circle} <ChevronDown size={12} aria-hidden="true" />
                </button>
                <AnimatePresence>
                  {circleOpen && (
                    <motion.ul
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      transition={{ duration: 0.18 }}
                      className={cn('absolute end-0 top-9 z-40 w-36 rounded-card-md p-1.5 shadow-cloud', tok.cardSolid)}
                    >
                      {CIRCLES.map((c) => (
                        <li key={c}>
                          <button
                            type="button"
                            onClick={() => { setCircle(c); setCircleOpen(false) }}
                            className={cn('w-full rounded-card-sm px-3 py-1.5 text-start text-xs', circle === c ? 'text-gold-soft' : cn(tok.mid, tok.hoverBg))}
                          >
                            {c}
                          </button>
                        </li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* One-to-Many toggle */}
            <div className={cn('mt-3 rounded-card-md border border-indigo/30 bg-indigo/10 p-3')}>
              <p className="mb-2 flex items-center gap-1.5 text-[0.68rem] font-bold uppercase tracking-wider text-sky">
                <Sparkles size={11} aria-hidden="true" /> One-to-Many · also create
              </p>
              <div className="flex flex-wrap gap-1.5">
                {ONE_TO_MANY.map((o) => {
                  const on = extras.includes(o.label)
                  return (
                    <button
                      key={o.label}
                      type="button"
                      onClick={() => setExtras((xs) => (on ? xs.filter((x) => x !== o.label) : [...xs, o.label]))}
                      aria-pressed={on}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                        on ? 'bg-gradient-to-br from-gold-soft to-gold text-ink' : cn(tok.subtleBg, tok.mid, tok.hoverBg),
                      )}
                    >
                      <o.icon size={12} aria-hidden="true" /> {o.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setOpen(false); setText('') }}
                className={cn('rounded-full px-4 py-2 text-xs font-semibold', tok.subtleBg, tok.mid)}
              >
                Cancel
              </button>
              <motion.button
                type="button"
                onClick={post}
                disabled={!text.trim()}
                whileTap={{ scale: 1.04 }}
                className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-5 py-2 text-xs font-bold text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] transition enabled:hover:brightness-110 disabled:opacity-40"
              >
                Post to {circle}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!open && (
        <div className="mt-2.5 flex items-center gap-1.5 border-t border-transparent pt-2.5" style={{ borderColor: 'rgba(128,128,128,0.15)' }}>
          {FORMATS.map((f) => (
            <button
              key={f.label}
              type="button"
              onClick={() => setOpen(true)}
              className={cn('flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.68rem] font-semibold transition-colors hover:text-gold-soft', tok.mid)}
            >
              <f.icon size={12} aria-hidden="true" /> {f.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ----------------------------------- Feed ----------------------------------- */

interface FeedProps {
  mode: FeedMode
  onModeChange: (m: FeedMode) => void
}

export default function Feed({ mode, onModeChange }: FeedProps) {
  const { tok } = useAppTheme()
  const [userPosts, setUserPosts] = useState<Post[]>([])
  const [hidden, setHidden] = useState<string[]>([])
  const [toast, setToast] = useState<{ text: string; undo: () => void } | null>(null)

  // "Change my algorithm" — jump to suggested mode with undo toast
  useEffect(() => {
    const onAlgo = (e: Event) => {
      const suggested = (e as CustomEvent<FeedMode>).detail
      if (!suggested || suggested === mode) return
      const prev = mode
      onModeChange(suggested)
      const label = FEED_MODES.find((f) => f.id === suggested)?.label ?? suggested
      setToast({ text: `Switched to ${label}`, undo: () => { onModeChange(prev); setToast(null) } })
    }
    const onLess = (e: Event) => {
      const id = (e as CustomEvent<string>).detail
      setHidden((h) => [...h, id])
      setToast({ text: 'We’ll show less like this', undo: () => { setHidden((h) => h.filter((x) => x !== id)); setToast(null) } })
    }
    window.addEventListener('kaluta:change-algo', onAlgo)
    window.addEventListener('kaluta:show-less', onLess)
    return () => {
      window.removeEventListener('kaluta:change-algo', onAlgo)
      window.removeEventListener('kaluta:show-less', onLess)
    }
  }, [mode, onModeChange])

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(id)
  }, [toast])

  const addPost = (text: string, circle: string) => {
    const p: Post = {
      id: `user-${Date.now()}`,
      author: 'You', avatar: 0, handle: '@you', time: 'now', circle,
      kind: 'user', justNow: true, text,
      rank: Object.fromEntries(FEED_MODES.map((m) => [m.id, -1])) as Record<FeedMode, number>,
    }
    setUserPosts((ps) => [p, ...ps])
  }

  const ordered = [...userPosts, ...SEED_POSTS]
    .filter((p) => !hidden.includes(p.id))
    .sort((a, b) => a.rank[mode] - b.rank[mode])

  return (
    <div className="relative flex h-full flex-col">
      <Composer onPost={addPost} />

      {/* sticky feed-mode chips */}
      <div className={cn('sticky top-0 z-20 -mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 py-2 backdrop-blur-md [scrollbar-width:none] [&::-webkit-scrollbar]:hidden')}>
        {FEED_MODES.map((m) => (
          <motion.button
            key={m.id}
            type="button"
            onClick={() => onModeChange(m.id)}
            whileTap={{ scale: 0.96 }}
            aria-pressed={mode === m.id}
            className={cn(
              'shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold transition-colors duration-200',
              mode === m.id
                ? 'bg-gradient-to-br from-gold-soft to-gold text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]'
                : cn(tok.cardSolid, tok.mid, tok.hoverBg),
            )}
          >
            {m.label}
          </motion.button>
        ))}
      </div>

      {/* posts (FLIP reordered on mode change) */}
      <div className="content-auto mt-2 space-y-3.5 pb-16">
        <AnimatePresence initial={false} mode="popLayout">
          {ordered.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </AnimatePresence>
      </div>

      {/* undo toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.32, ease: EASE }}
            className="absolute bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full bg-ink-3 px-4 py-2.5 shadow-cloud-hover ring-1 ring-gold/30"
            role="status"
          >
            <span className="whitespace-nowrap text-xs font-semibold text-text-hi">{toast.text}</span>
            <button
              type="button"
              onClick={toast.undo}
              className="whitespace-nowrap rounded-full bg-gold/15 px-3 py-1 text-xs font-bold text-gold-soft transition-colors hover:bg-gold/25"
            >
              Undo
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
