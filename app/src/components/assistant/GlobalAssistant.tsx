import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import Orb from './Orb'
import type { OrbState } from './Orb'
import ChatPanel from './ChatPanel'
import RoleProvider from './RoleContext'
import { useRole } from './roleStore'
import { ASSISTANT_OPEN_EVENT, ASSISTANT_OPEN_WATCH_EVENT } from './types'

/**
 * GlobalAssistant — the embedded Kinjy agent mounted on every route (§7.5).
 * A 56px breathing conic-gradient orb that relocates per active module
 * (useLocation-driven anchor map), sliding to its new anchor with a
 * stiffness-180 / damping-22 spring (≈420ms cloud-ease feel), and opens a
 * 420px glass chat panel (r-xl). Mobile collapses to a 48px edge tab.
 */

type Anchor =
  | 'bottom-right'
  | 'bottom-right-raised'
  | 'bottom-left'
  | 'bottom-center'
  | 'composer'
  | 'top-left'

function anchorFor(pathname: string): Anchor {
  if (pathname.startsWith('/family')) return 'top-left'
  if (pathname.startsWith('/memorials')) return 'bottom-left'
  if (pathname.startsWith('/admin')) return 'bottom-left'
  if (pathname.startsWith('/assistant')) return 'bottom-center'
  if (pathname.startsWith('/app')) return 'composer'
  if (pathname.startsWith('/commerce')) return 'bottom-right-raised'
  // Home / feeds / platform / pricing / explore / everything else
  return 'bottom-right'
}

const PANEL_W = 420
const PANEL_H = 600

function useViewport() {
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight })
  useEffect(() => {
    const onResize = () => setVp({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return vp
}

function GlobalAssistantInner() {
  const { pathname } = useLocation()
  const reduced = useReducedMotion()
  const { role } = useRole()
  const vp = useViewport()

  const [open, setOpen] = useState(false)
  const [panelTab, setPanelTab] = useState<'chat' | 'watch'>('chat')
  const [orbState, setOrbState] = useState<OrbState>('idle')
  const [watchUnread, setWatchUnread] = useState(true)
  const [tipHiddenFor, setTipHiddenFor] = useState<string | null>(null)

  const isMobile = vp.w < 640
  const orbSize = isMobile ? 48 : 56
  const margin = isMobile ? 12 : 24
  const anchor = anchorFor(pathname)

  /* Orb anchor position (top-left coords), transform-driven via x/y spring */
  const orbPos = useMemo(() => {
    switch (anchor) {
      case 'top-left':
        return { x: margin, y: 96 }
      case 'bottom-left':
        return { x: margin, y: vp.h - orbSize - margin }
      case 'bottom-center':
        return { x: (vp.w - orbSize) / 2, y: vp.h - orbSize - margin }
      case 'composer':
        return { x: vp.w * (isMobile ? 0.85 : 0.66) - orbSize / 2, y: vp.h - orbSize - (isMobile ? 88 : 120) }
      case 'bottom-right-raised':
        return { x: vp.w - orbSize - margin, y: vp.h - orbSize - 88 }
      case 'bottom-right':
      default:
        return { x: vp.w - orbSize - margin, y: vp.h - orbSize - margin }
    }
  }, [anchor, vp, orbSize, margin, isMobile])

  /* Panel position adjacent to the orb, clamped into the viewport */
  const panelPos = useMemo(() => {
    if (isMobile) return { x: 0, y: 0 }
    const left = orbPos.x > vp.w / 2 ? orbPos.x + orbSize - PANEL_W : orbPos.x
    const top = orbPos.y > vp.h / 2 ? orbPos.y - PANEL_H - 14 : orbPos.y + orbSize + 14
    return {
      x: Math.max(12, Math.min(left, vp.w - PANEL_W - 12)),
      y: Math.max(84, Math.min(top, vp.h - PANEL_H - 12)),
    }
  }, [orbPos, vp, orbSize, isMobile])

  const openPanel = useCallback((tab: 'chat' | 'watch') => {
    setPanelTab(tab)
    setOpen(true)
    if (tab === 'watch') setWatchUnread(false)
  }, [])

  /* Marketing pages can open the panel via custom events */
  useEffect(() => {
    const openChat = () => openPanel('chat')
    const openWatch = () => openPanel('watch')
    window.addEventListener(ASSISTANT_OPEN_EVENT, openChat)
    window.addEventListener(ASSISTANT_OPEN_WATCH_EVENT, openWatch)
    return () => {
      window.removeEventListener(ASSISTANT_OPEN_EVENT, openChat)
      window.removeEventListener(ASSISTANT_OPEN_WATCH_EVENT, openWatch)
    }
  }, [openPanel])

  /* "That's me ↓" tooltip on the /assistant page (first load, auto-hides) */
  useEffect(() => {
    if (!pathname.startsWith('/assistant')) return
    const id = setTimeout(() => setTipHiddenFor(pathname), 6000)
    return () => clearTimeout(id)
  }, [pathname])
  const tipVisible = pathname.startsWith('/assistant') && tipHiddenFor !== pathname && !open

  const notifying = !open && watchUnread && role === 'admin'
  const effectiveState: OrbState =
    orbState !== 'idle' && open ? orbState : notifying ? 'notifying' : orbState
  const spring = reduced
    ? { duration: 0.01 }
    : { type: 'spring' as const, stiffness: 180, damping: 22 }

  return (
    <>
      {/* The orb */}
      <motion.div
        className="fixed left-0 top-0 z-[80]"
        animate={{ x: orbPos.x, y: orbPos.y }}
        transition={spring}
        style={{ width: orbSize, height: orbSize }}
      >
        <AnimatePresence>
          {!open && (
            <motion.button
              key="orb"
              type="button"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.3 }}
              onClick={() => openPanel('chat')}
              aria-label="Open Kinjy Assistant"
              className="block h-full w-full rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
            >
              <Orb size={orbSize} state={effectiveState} />
            </motion.button>
          )}
        </AnimatePresence>

        {/* "That's me ↓" tooltip */}
        <AnimatePresence>
          {tipVisible && !open && (
            <motion.span
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-full border border-gold/30 bg-ink-2/95 px-3 py-1.5 text-[0.68rem] font-bold text-gold-soft shadow-cloud"
            >
              That's me ↓
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>

      {/* The panel — orb morphs into it (380ms shared-element feel) */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            className="fixed z-[85]"
            style={
              isMobile
                ? { inset: 0 }
                : { left: 0, top: 0, width: PANEL_W, height: PANEL_H, maxWidth: 'calc(100vw - 24px)' }
            }
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.55, x: panelPos.x, y: panelPos.y }}
            animate={{ opacity: 1, scale: 1, x: panelPos.x, y: panelPos.y }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.7, transition: { duration: 0.24 } }}
            transition={reduced ? { duration: 0.15 } : { duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className={isMobile ? 'h-[100dvh] w-screen' : 'h-full w-full'}>
              <ChatPanel onClose={() => setOpen(false)} initialTab={panelTab} onOrbState={setOrbState} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

/** Public wrapper — provides the demo Role context around the whole agent. */
export default function GlobalAssistant() {
  return (
    <RoleProvider>
      <GlobalAssistantInner />
    </RoleProvider>
  )
}
