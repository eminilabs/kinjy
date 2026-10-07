import { useEffect, useId, useRef, useState } from 'react'
import { Smile, Sticker } from 'lucide-react'
import EmojiPanel from '@/components/social/EmojiPanel'
import FloatingPanel from '@/components/social/FloatingPanel'
import StickerPanel from '@/components/social/StickerPanel'
import type { StickerCatalogue } from '@/lib/api'
import { cn } from '@/lib/utils'

/**
 * The composer's one panel, with two clearly separate sections:
 *
 *   Emojis   - Unicode characters inserted into the text at the caret. The
 *              panel stays open so several can be added; nothing is sent.
 *   Stickers - the existing StickerPanel, unchanged: one catalogue, picked
 *              sticker sent at once as a message of its own.
 *
 * An emoji is text and a sticker is a catalogue id; the panel never turns one
 * into the other. The last section used is remembered in this browser.
 */

type Section = 'emoji' | 'sticker'
const SECTION_KEY = 'kinjy.panel.section'

function loadSection(): Section {
  try {
    return localStorage.getItem(SECTION_KEY) === 'sticker' ? 'sticker' : 'emoji'
  } catch {
    return 'emoji'
  }
}

function saveSection(section: Section): void {
  try {
    localStorage.setItem(SECTION_KEY, section)
  } catch {
    /* storage unavailable: the choice is only a convenience */
  }
}

const SECTIONS: { id: Section; label: string; Icon: typeof Smile }[] = [
  { id: 'emoji', label: 'Emojis', Icon: Smile },
  { id: 'sticker', label: 'Stickers', Icon: Sticker },
]

function PanelBody({
  catalogue,
  onEmoji,
  onSticker,
}: {
  catalogue: StickerCatalogue | null
  onEmoji: (char: string) => void
  onSticker: (id: string) => void
}) {
  const [section, setSection] = useState<Section>(loadSection)
  // Focus goes into the section on opening; a switch made on the tabs keeps it on the tabs,
  // so the arrow keys can keep moving between them.
  const [focusContent, setFocusContent] = useState(true)
  const keepOnTab = useRef<Section | null>(null)
  const ids = useId()

  const choose = (next: Section, fromKeyboard: boolean) => {
    saveSection(next)
    setFocusContent(false)
    keepOnTab.current = fromKeyboard ? next : null
    setSection(next)
  }

  useEffect(() => {
    if (keepOnTab.current) {
      document.getElementById(`${ids}-tab-${keepOnTab.current}`)?.focus()
      keepOnTab.current = null
    }
  }, [section, ids])

  const onKey = (event: React.KeyboardEvent) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Home' && event.key !== 'End') return
    event.preventDefault()
    choose(event.key === 'ArrowLeft' || event.key === 'Home' ? 'emoji' : 'sticker', true)
  }

  return (
    <div className="flex w-[min(21rem,calc(100vw-32px))] flex-col gap-1.5">
      <div role="tablist" aria-label="Panel sections" onKeyDown={onKey} className="grid grid-cols-2 gap-1 rounded-full bg-black/20 p-0.5">
        {SECTIONS.map(({ id, label, Icon }) => (
          <button
            key={id}
            id={`${ids}-tab-${id}`}
            type="button"
            role="tab"
            aria-selected={section === id}
            aria-controls={`${ids}-panel`}
            tabIndex={section === id ? 0 : -1}
            onClick={() => choose(id, false)}
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-text-mid hover:text-text-hi focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold/60',
              section === id && 'bg-gold/20 text-text-hi',
            )}
          >
            <Icon size={14} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
      <div id={`${ids}-panel`} role="tabpanel" aria-labelledby={`${ids}-tab-${section}`}>
        {section === 'emoji' ? (
          <EmojiPanel onPick={onEmoji} autoFocus={focusContent} />
        ) : catalogue ? (
          <StickerPanel catalogue={catalogue} onPick={onSticker} />
        ) : (
          <p className="px-2 py-8 text-center text-sm text-text-low">Stickers are unavailable right now.</p>
        )}
      </div>
    </div>
  )
}

/**
 * The smiley in the composer: opens the panel above the message field. Focus
 * returns to this button when the panel closes. Choosing a sticker sends it and
 * closes the panel; choosing an emoji only inserts it.
 */
export default function EmojiStickerButton({
  catalogue,
  onEmoji,
  onSticker,
}: {
  catalogue: StickerCatalogue | null
  onEmoji: (char: string) => void
  onSticker: (stickerId: string) => void
}) {
  const [anchor, setAnchor] = useState<DOMRect | null>(null)
  const button = useRef<HTMLButtonElement>(null)
  const close = () => {
    setAnchor(null)
    button.current?.focus()
  }
  return (
    <>
      <button
        ref={button}
        type="button"
        onClick={(event) => (anchor ? close() : setAnchor(event.currentTarget.getBoundingClientRect()))}
        aria-label="Emojis and stickers"
        aria-haspopup="dialog"
        aria-expanded={Boolean(anchor)}
        title="Emojis and stickers"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-text-mid hover:bg-text-hi/[0.07] hover:text-gold-soft"
      >
        <Smile size={15} aria-hidden="true" />
      </button>
      {anchor && (
        <FloatingPanel anchor={anchor} label="Emojis and stickers" onClose={close}>
          <PanelBody
            catalogue={catalogue}
            onEmoji={onEmoji}
            onSticker={(id) => {
              onSticker(id)
              close()
            }}
          />
        </FloatingPanel>
      )}
    </>
  )
}
