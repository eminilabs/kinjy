import { forwardRef, useCallback, useLayoutEffect, useRef } from 'react'
import type { KeyboardEvent, TextareaHTMLAttributes } from 'react'
import { enterSends } from '@/lib/chatFormat'
import { cn } from '@/lib/utils'

/**
 * A composer that can hold more than one line.
 *
 * Every box you write a message in — a chat, an edit, a comment, a reply —
 * used to be an `<input>`, which cannot contain a line break at all: pressing
 * Enter submitted the form and there was no other key to try. So a message
 * with two paragraphs could not be written, only pasted.
 *
 * It grows with the text up to `maxRows` and then scrolls, so a long message
 * does not push the send button off the screen.
 */
interface MessageInputProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'rows'> {
  /** Enter (without Shift) on a keyboard. Returns nothing; the caller sends. */
  onSubmit?: () => void
  /** How tall it may grow before it starts scrolling instead. */
  maxRows?: number
}

const MessageInput = forwardRef<HTMLTextAreaElement, MessageInputProps>(function MessageInput(
  { onSubmit, onKeyDown, maxRows = 6, className, value, ...rest },
  ref,
) {
  const inner = useRef<HTMLTextAreaElement | null>(null)

  const attach = useCallback(
    (node: HTMLTextAreaElement | null) => {
      inner.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) ref.current = node
    },
    [ref],
  )

  /**
   * Fit the box to its text.
   *
   * `height: auto` first and always, because `scrollHeight` is never reported
   * as less than the element's own height. Measure a box that is already tall
   * and it answers "tall" whatever is in it, so a box that grows once can
   * never shrink again — it holds itself up by its own measurement.
   *
   * Measured from the element's own line-height rather than from a guess, so
   * the ceiling is right at every type scale and in both themes.
   */
  const fit = useCallback(() => {
    const el = inner.current
    if (!el) return
    el.style.height = 'auto'
    // Nothing is measurable in a box with no width, and the answer is not
    // merely imprecise but wildly wrong: with no room to lay out, the
    // placeholder wraps one word per line and `scrollHeight` comes back as a
    // dozen lines for an empty field. Left at its natural single row until
    // there is a width to measure against.
    if (el.clientWidth === 0) return
    const line = Number.parseFloat(getComputedStyle(el).lineHeight) || 20
    const padding = el.offsetHeight - el.clientHeight + 1
    const ceiling = line * maxRows + padding
    el.style.height = `${Math.min(el.scrollHeight, ceiling)}px`
    el.style.overflowY = el.scrollHeight > ceiling ? 'auto' : 'hidden'
  }, [maxRows])

  useLayoutEffect(fit, [value, fit])

  /**
   * Measure again whenever the box changes width.
   *
   * The text alone is not enough to know how tall this has to be: the same
   * words need more lines in a narrower box. Without this, the very first
   * measurement — taken before the surrounding grid has settled, when the
   * composer is briefly a few pixels wide — decided the height for good,
   * because an empty composer's text never changes afterwards and nothing
   * else would re-run it. The composer opened at its full six-line height and
   * stayed there.
   *
   * The parent is watched rather than the box itself: watching something you
   * resize from inside the callback is a loop. Width only, for the same
   * reason — our own height change moves the parent's height, not its width.
   */
  useLayoutEffect(() => {
    const parent = inner.current?.parentElement
    if (!parent || typeof ResizeObserver === 'undefined') return
    // -1 rather than the current width, so the observer's first callback -
    // which arrives once layout has actually happened - always re-measures.
    let lastWidth = -1
    const watcher = new ResizeObserver(() => {
      if (parent.clientWidth === lastWidth) return
      lastWidth = parent.clientWidth
      fit()
    })
    watcher.observe(parent)
    return () => watcher.disconnect()
  }, [fit])

  const keyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    onKeyDown?.(event)
    if (event.defaultPrevented) return
    // Shift+Enter is always a new line. A plain Enter sends on a keyboard and
    // starts a new line on a touch device, where there is no Shift to hold.
    if (event.key === 'Enter' && !event.shiftKey && !event.altKey && onSubmit && enterSends()) {
      event.preventDefault()
      onSubmit()
    }
  }

  return (
    <textarea
      ref={attach}
      value={value}
      rows={1}
      onKeyDown={keyDown}
      className={cn('resize-none', className)}
      {...rest}
    />
  )
})

export default MessageInput
