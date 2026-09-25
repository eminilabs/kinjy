import { useEffect, useRef, useState } from 'react'
import {
  Bold,
  Code,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAppTheme } from '@/components/appdemo/theme'
import { sanitizeHtml } from '@/lib/richtext'
import { cn } from '@/lib/utils'

interface Tool {
  id: string
  icon: LucideIcon
  label: string
  command: string
  value?: string
}

const TOOLS: Array<Tool | 'divider'> = [
  { id: 'bold', icon: Bold, label: 'Bold', command: 'bold' },
  { id: 'italic', icon: Italic, label: 'Italic', command: 'italic' },
  { id: 'strike', icon: Strikethrough, label: 'Strikethrough', command: 'strikeThrough' },
  'divider',
  { id: 'h2', icon: Heading2, label: 'Heading', command: 'formatBlock', value: 'h2' },
  { id: 'h3', icon: Heading3, label: 'Subheading', command: 'formatBlock', value: 'h3' },
  { id: 'quote', icon: Quote, label: 'Quote', command: 'formatBlock', value: 'blockquote' },
  { id: 'code', icon: Code, label: 'Code', command: 'formatBlock', value: 'pre' },
  'divider',
  { id: 'ul', icon: List, label: 'Bullet list', command: 'insertUnorderedList' },
  { id: 'ol', icon: ListOrdered, label: 'Numbered list', command: 'insertOrderedList' },
]

/**
 * A small WYSIWYG for article bodies.
 *
 * Built on contentEditable and `document.execCommand`. That API is formally
 * deprecated, but every browser still implements it and the alternative — a
 * full editor engine — is a dependency this project does not need for bold,
 * lists and links. Whatever it produces is passed through the whitelist
 * sanitiser before it leaves this component, so a paste from Word or a crafted
 * clipboard payload cannot smuggle markup through.
 */
export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write your article…',
  minHeight = 220,
}: {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: number
}) {
  const { tok } = useAppTheme()
  const editorRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState<Set<string>>(new Set())
  const [empty, setEmpty] = useState(!value)

  // Seed the DOM once. Re-writing innerHTML on every keystroke would move the
  // caret to the start on each character.
  useEffect(() => {
    if (editorRef.current && !editorRef.current.innerHTML && value) {
      editorRef.current.innerHTML = sanitizeHtml(value)
      setEmpty(false)
    }
  }, [value])

  const emit = () => {
    const html = editorRef.current?.innerHTML ?? ''
    setEmpty(!editorRef.current?.textContent?.trim())
    onChange(sanitizeHtml(html))
  }

  const refreshActive = () => {
    const next = new Set<string>()
    for (const tool of TOOLS) {
      if (tool === 'divider') continue
      try {
        if (tool.value) {
          if (document.queryCommandValue('formatBlock').toLowerCase() === tool.value) next.add(tool.id)
        } else if (document.queryCommandState(tool.command)) {
          next.add(tool.id)
        }
      } catch {
        /* queryCommandState throws on some blocks; the toolbar just shows nothing */
      }
    }
    setActive(next)
  }

  const run = (tool: Tool) => {
    editorRef.current?.focus()
    document.execCommand(tool.command, false, tool.value)
    refreshActive()
    emit()
  }

  const addLink = () => {
    const url = window.prompt('Link address')
    if (!url) return
    editorRef.current?.focus()
    document.execCommand('createLink', false, url)
    emit()
  }

  /** Paste as plain text: keeping source formatting is how junk markup arrives. */
  const onPaste = (event: React.ClipboardEvent) => {
    event.preventDefault()
    const text = event.clipboardData.getData('text/plain')
    document.execCommand('insertText', false, text)
    emit()
  }

  const toolButton = cn('flex h-7 w-7 items-center justify-center rounded-card-sm transition-colors')

  return (
    <div className={cn('overflow-hidden rounded-card-sm border', tok.input)}>
      <div className={cn('flex flex-wrap items-center gap-0.5 border-b p-1', tok.divider, 'border-b-current/10')}>
        {TOOLS.map((tool, index) =>
          tool === 'divider' ? (
            <span key={`d${index}`} className="mx-1 h-4 w-px bg-current/15" aria-hidden="true" />
          ) : (
            <button
              key={tool.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => run(tool)}
              aria-label={tool.label}
              aria-pressed={active.has(tool.id)}
              title={tool.label}
              className={cn(toolButton, active.has(tool.id) ? 'bg-gold/20 text-gold-soft' : cn(tok.mid, tok.hoverBg))}
            >
              <tool.icon size={14} />
            </button>
          ),
        )}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={addLink}
          aria-label="Add link"
          title="Add link"
          className={cn(toolButton, tok.mid, tok.hoverBg)}
        >
          <Link2 size={14} />
        </button>
      </div>

      <div className="relative">
        {empty && (
          <p className={cn('pointer-events-none absolute inset-x-3 top-3 text-base', tok.low)} aria-hidden="true">
            {placeholder}
          </p>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="Article body"
          onInput={emit}
          onBlur={emit}
          onPaste={onPaste}
          onKeyUp={refreshActive}
          onMouseUp={refreshActive}
          style={{ minHeight }}
          className={cn(
            'prose-article w-full px-3 py-3 text-base focus:outline-none',
            tok.text,
          )}
        />
      </div>
    </div>
  )
}
