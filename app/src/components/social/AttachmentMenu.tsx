import { useEffect, useId, useRef, useState } from 'react'
import { Camera, FileText, Image, Music, Paperclip } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Choice {
  id: string
  label: string
  Icon: LucideIcon
  /** Narrows the picker. A convenience only: the server still decides what a file really is. */
  accept?: string
  capture?: 'environment'
  multiple: boolean
}

const CHOICES: Choice[] = [
  { id: 'document', label: 'Document', Icon: FileText, multiple: true },
  { id: 'media', label: 'Photos & videos', Icon: Image, accept: 'image/*,video/*', multiple: true },
  { id: 'camera', label: 'Camera', Icon: Camera, accept: 'image/*,video/*', capture: 'environment', multiple: false },
  { id: 'audio', label: 'Audio', Icon: Music, accept: 'audio/*', multiple: true },
]

/**
 * `capture` only opens the camera on phones and tablets; a desktop browser
 * ignores it and shows a plain file picker, which would make "Camera" a second
 * "Photos & videos". So the entry is offered where it does what it says.
 */
const hasTouchCamera = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches === true

/**
 * The paperclip: a menu first, then a picker filtered for what was chosen —
 * the way WhatsApp does it — instead of one unfiltered file dialog.
 *
 * Keyboard: Enter/Space/ArrowDown open it on the first entry, arrows move,
 * Home/End jump, Escape or Tab closes, and focus returns to the paperclip.
 */
export default function AttachmentMenu({ onFiles }: { onFiles: (files: FileList | null) => void }) {
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const wrapper = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const items = useRef<Array<HTMLButtonElement | null>>([])
  const inputs = useRef<Record<string, HTMLInputElement | null>>({})
  const choices = CHOICES.filter((c) => c.id !== 'camera' || hasTouchCamera())

  useEffect(() => {
    if (!open) return
    items.current[0]?.focus()
    // pointerdown, not mousedown: iOS Safari sends no mouse events for a tap
    // on blank space, so the menu would stay open.
    const outside = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])

  const close = () => {
    setOpen(false)
    trigger.current?.focus()
  }

  const pick = (choice: Choice) => {
    close()
    // Still inside the click, so the browser lets the picker open.
    inputs.current[choice.id]?.click()
  }

  const onMenuKey = (event: React.KeyboardEvent) => {
    const index = items.current.findIndex((el) => el === document.activeElement)
    const last = choices.length - 1
    const focusAt = (i: number) => items.current[i]?.focus()
    if (event.key === 'ArrowDown') focusAt(index >= last ? 0 : index + 1)
    else if (event.key === 'ArrowUp') focusAt(index <= 0 ? last : index - 1)
    else if (event.key === 'Home') focusAt(0)
    else if (event.key === 'End') focusAt(last)
    else if (event.key === 'Escape') close()
    else if (event.key === 'Tab') {
      // Hand focus to the paperclip first, so Tab moves on from there rather
      // than from an entry that is about to disappear.
      trigger.current?.focus()
      setOpen(false)
    } else return
    if (event.key !== 'Tab') event.preventDefault()
  }

  return (
    <div ref={wrapper} className="relative shrink-0">
      {choices.map((choice) => (
        <input
          key={choice.id}
          ref={(el) => {
            inputs.current[choice.id] = el
          }}
          type="file"
          hidden
          accept={choice.accept}
          capture={choice.capture}
          multiple={choice.multiple}
          data-attach={choice.id}
          onChange={(e) => {
            onFiles(e.target.files)
            e.target.value = ''
          }}
        />
      ))}

      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !open) {
            e.preventDefault()
            setOpen(true)
          }
        }}
        aria-label="Attach"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        title="Photos, videos, audio, documents — any file up to 200 MB"
        className={cn(
          'rounded-full border p-2.5 hover:border-gold/40 hover:text-gold-soft',
          open ? 'border-gold/40 text-gold-soft' : 'border-white/12 text-text-mid',
        )}
      >
        <Paperclip size={15} aria-hidden="true" />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Attach"
          onKeyDown={onMenuKey}
          className="absolute bottom-full start-0 z-30 mb-2 w-48 rounded-card-md border border-white/10 bg-ink-2 p-1.5 shadow-cloud"
        >
          {choices.map((choice, i) => (
            <button
              key={choice.id}
              ref={(el) => {
                items.current[i] = el
              }}
              type="button"
              role="menuitem"
              tabIndex={-1}
              onClick={() => pick(choice)}
              className="flex w-full items-center gap-2.5 rounded-card-sm px-3 py-2 text-start text-sm text-text-mid hover:bg-white/5 hover:text-text-hi focus:bg-white/5 focus:text-text-hi focus:outline-none"
            >
              <choice.Icon size={15} className="shrink-0 text-gold" aria-hidden="true" />
              {choice.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
