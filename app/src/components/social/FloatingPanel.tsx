import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * A small floating panel (sticker picker, list of who reacted), portalled to <body>: the thread sits inside a
 * backdrop-filtered card, where position:fixed would be relative to the card
 * and the panel would be clipped by the scrolling list.
 */
export default function FloatingPanel({
  anchor,
  label,
  onClose,
  children,
}: {
  anchor: DOMRect
  label: string
  onClose: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const opener = useRef<Element | null>(document.activeElement)
  // The latest onClose, read when needed. Listing it as an effect dependency would tear the
  // listeners down and put focus back on the opener each time the owner re-renders - which
  // happens whenever something is picked while the panel stays open (an emoji inserted
  // into the message field, say).
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  })

  // Placed above the anchor when there is room, below otherwise, and kept inside the screen. Done
  // again whenever the panel changes size: a panel that fills in after opening (the emoji list
  // loads on demand) would otherwise be placed for its empty height and then grow over its anchor.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const place = () => {
      const { width, height } = el.getBoundingClientRect()
      const above = anchor.top - height - 8
      const top = above >= 8 ? above : Math.min(anchor.bottom + 8, window.innerHeight - height - 8)
      const left = Math.min(Math.max(8, anchor.left + anchor.width / 2 - width / 2), window.innerWidth - width - 8)
      setPos((current) => (current && current.top === top && current.left === left ? current : { top, left }))
    }
    place()
    const watcher = new ResizeObserver(place)
    watcher.observe(el)
    return () => watcher.disconnect()
  }, [anchor])

  useEffect(() => {
    const away = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) closeRef.current()
    }
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        closeRef.current()
      }
    }
    document.addEventListener('pointerdown', away, true)
    document.addEventListener('keydown', key, true)
    const previous = opener.current
    return () => {
      document.removeEventListener('pointerdown', away, true)
      document.removeEventListener('keydown', key, true)
      // Focus goes back to whatever opened the panel.
      if (previous instanceof HTMLElement && document.contains(previous)) previous.focus()
    }
  }, [])

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label={label}
      style={{ position: 'fixed', top: pos?.top ?? 0, left: pos?.left ?? 0, opacity: pos ? 1 : 0 }}
      className="z-50 max-w-[calc(100vw-16px)] rounded-card-md border border-white/12 bg-ink-2 p-1.5 shadow-lg"
    >
      {children}
    </div>,
    document.body,
  )
}

