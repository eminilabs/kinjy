/**
 * Arrow-key movement across a wrapped grid of buttons, by position on screen
 * rather than by index, so Up and Down land on the same column of the next
 * row whatever the width. Returns the index to focus, "up" when Up is pressed
 * on the first row (the caller decides where that leads), or undefined when
 * the key is not a navigation key.
 */
export function gridTarget(key: string, buttons: HTMLElement[], at: number): number | 'up' | undefined {
  if (at < 0) return undefined
  if (key === 'ArrowRight') return Math.min(at + 1, buttons.length - 1)
  if (key === 'ArrowLeft') return Math.max(at - 1, 0)
  if (key === 'Home') return 0
  if (key === 'End') return buttons.length - 1
  if (key !== 'ArrowDown' && key !== 'ArrowUp') return undefined
  const here = buttons[at].getBoundingClientRect()
  const down = key === 'ArrowDown'
  const candidates = buttons
    .map((button, index) => ({ index, rect: button.getBoundingClientRect() }))
    .filter(({ rect }) => (down ? rect.top > here.top + 4 : rect.top < here.top - 4))
  if (!candidates.length) return down ? at : 'up'
  const rowTop = down
    ? Math.min(...candidates.map(({ rect }) => rect.top))
    : Math.max(...candidates.map(({ rect }) => rect.top))
  return candidates
    .filter(({ rect }) => Math.abs(rect.top - rowTop) < 4)
    .sort((a, b) => Math.abs(a.rect.left - here.left) - Math.abs(b.rect.left - here.left))[0]?.index
}
