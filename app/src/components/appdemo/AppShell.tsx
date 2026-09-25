import { useCallback, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import AssistantOrb from './AssistantOrb'
import type { OrbDock } from './AssistantOrb'
import { ChipBar, TopBar } from './Chrome'
import CreateModule from './CreateModule'
import FamilyTreePeek from './FamilyTreePeek'
import Feed from './Feed'
import GraveyardPeek from './GraveyardPeek'
import ModulePeek from './ModulePeek'
import { LeftRail, RightRail } from './Rails'
import { useAppTheme } from './theme'
import type { ChromeKey } from './theme'
import type { FeedMode } from './posts'

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

/** Which center view each nav module opens. */
function centerFor(m: ChromeKey): 'feed' | 'create' | 'tree' | 'graveyard' | 'peek' {
  if (['home', 'following', 'forYou', 'public'].includes(m)) return 'feed'
  if (m === 'create') return 'create'
  if (m === 'familyTree') return 'tree'
  if (m === 'graveyard') return 'graveyard'
  return 'peek'
}

function dockFor(m: ChromeKey): OrbDock {
  if (m === 'create') return 'create'
  if (m === 'familyTree') return 'tree'
  if (m === 'graveyard') return 'graveyard'
  return 'feed'
}

const FEED_MODE_FOR: Partial<Record<ChromeKey, FeedMode>> = {
  home: 'forYou',
  forYou: 'forYou',
  following: 'following',
  public: 'latest',
}

/**
 * The framed app window (§2): top bar, universal chip nav, three-column body,
 * internally scrolling, restyled live by the theme context.
 */
export default function AppShell() {
  const { rtl, frameStyle, resolved } = useAppTheme()
  const [module, setModule] = useState<ChromeKey>('home')
  const [pinned, setPinned] = useState<ChromeKey[]>(['home', 'create', 'familyTree'])
  const [feedMode, setFeedMode] = useState<FeedMode>('forYou')

  const select = useCallback((m: ChromeKey) => {
    setModule(m)
    const fm = FEED_MODE_FOR[m]
    if (fm) setFeedMode(fm)
  }, [])

  const togglePin = useCallback((m: ChromeKey) => {
    setPinned((p) => (p.includes(m) ? p.filter((x) => x !== m) : [...p, m]))
  }, [])

  const center = centerFor(module)
  const dock = dockFor(module)
  const orb = <AssistantOrb dock={dock} />

  return (
    <div
      className={cn(
        'flex h-[780px] w-full flex-col overflow-hidden rounded-card-xl shadow-cloud-hover ring-1 transition-[box-shadow] duration-500',
        resolved === 'light' ? 'ring-black/15' : 'ring-white/15',
      )}
      style={frameStyle}
      dir={rtl ? 'rtl' : 'ltr'}
    >
      <TopBar />
      <ChipBar active={module} pinned={pinned} onSelect={select} onTogglePin={togglePin} />

      <div className="flex min-h-0 flex-1">
        <LeftRail pinned={pinned} onSelect={select} />

        {/* center column — internal scroll */}
        <main className="min-w-0 flex-1 overflow-y-auto overscroll-contain p-3.5" aria-label="Active module">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={center === 'peek' ? module : center}
              initial={{ opacity: 0, x: rtl ? -28 : 28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: rtl ? 28 : -28 }}
              transition={{ duration: 0.4, ease: EASE }}
              className="relative h-full"
            >
              {center === 'feed' && (
                <>
                  <Feed mode={feedMode} onModeChange={setFeedMode} />
                  {/* orb anchor: bottom-right on Home/feeds */}
                  <div className="pointer-events-none sticky bottom-4 z-30 flex justify-end">
                    <div className="pointer-events-auto -mt-20">{orb}</div>
                  </div>
                </>
              )}
              {center === 'create' && <CreateModule orb={orb} />}
              {center === 'tree' && <FamilyTreePeek orb={orb} />}
              {center === 'graveyard' && <GraveyardPeek orb={orb} />}
              {center === 'peek' && <ModulePeek module={module} />}
            </motion.div>
          </AnimatePresence>
        </main>

        <RightRail feedMode={feedMode} />
      </div>
    </div>
  )
}
