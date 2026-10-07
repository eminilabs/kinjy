import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronsUpDown, Maximize2, Minus, Plus } from 'lucide-react'
import { useAppTheme } from '@/components/appdemo/theme'
import type { FamilyTree } from '@/lib/api'
import { cn } from '@/lib/utils'
import StatusIcon from './Status'
import { CARD_H, CARD_W, GENDER_LABEL, GENDER_TINT, fullName, genderKey, layoutTree, lifespan, type Placed } from './layout'

const MIN_SCALE = 0.25
const MAX_SCALE = 2
const clamp = (value: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, value))

interface NodeProps {
  placed: Placed
  rootId: string
  selected: boolean
  lit: boolean
  isMe: boolean
  onSelect: (id: string) => void
  onCentre: (id: string) => void
}

/**
 * One person. Memoised on primitives, so choosing someone re-renders the two
 * cards whose state changed rather than every card in the tree.
 */
const TreeNode = memo(function TreeNode({ placed, rootId, selected, lit, isMe, onSelect, onCentre }: NodeProps) {
  const { tok } = useAppTheme()
  const { person, relation, more, sibling_kind } = placed.node
  const isRoot = placed.id === rootId
  const life = lifespan(person)
  const gender = genderKey(person.gender)
  const tint = GENDER_TINT[gender]
  const spoken = [
    fullName(person),
    isMe ? 'you' : relation,
    gender !== 'unspecified' ? GENDER_LABEL[gender] : null,
    life || null,
    person.status === 'verified' ? 'confirmed' : person.status === 'disputed' ? 'disputed' : 'not yet confirmed',
    more ? 'has more relatives beyond this view' : null,
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <button
      type="button"
      data-person={placed.id}
      data-row={placed.row}
      data-level={placed.node.level}
      data-gender={gender}
      aria-label={`${spoken}. Press Enter for details, or double-click to centre the tree here.`}
      aria-current={isRoot ? 'true' : undefined}
      aria-pressed={selected}
      title={fullName(person)}
      onClick={() => onSelect(placed.id)}
      onDoubleClick={() => onCentre(placed.id)}
      style={{ left: placed.x, top: placed.y, width: CARD_W, height: CARD_H }}
      className={cn(
        'absolute flex flex-col justify-center overflow-hidden rounded-card-md border px-3 text-start',
        tok.cardSolid,
        isRoot && 'border-gold/70',
        lit && !isRoot && 'border-gold/50',
        selected && 'ring-2 ring-gold/80',
        'hover:border-gold/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold/70',
      )}
    >
      {tint && (
        <>
          <span aria-hidden="true" className={cn('pointer-events-none absolute inset-0', tint.wash)} />
          <span aria-hidden="true" className={cn('pointer-events-none absolute inset-y-0 start-0 w-[3px]', tint.edge)} />
        </>
      )}
      {isRoot && <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gold/10" />}
      <span className={cn('relative truncate pe-5 text-[0.8rem] font-semibold leading-tight', tok.text)}>
        {fullName(person)}
      </span>
      <span className={cn('relative truncate text-[0.68rem] leading-tight', tok.low)}>
        {isMe ? 'You' : relation}
        {sibling_kind === 'half' ? ' · half' : ''}
        {life ? ` · ${life}` : ''}
      </span>
      <StatusIcon status={person.status} size={13} className="absolute end-2 top-1.5" />
      {more && (
        <span
          className="absolute -bottom-0 start-1/2 -translate-x-1/2 rounded-full border border-gold/40 bg-ink-2 p-0.5 text-gold-soft"
          aria-hidden="true"
        >
          <ChevronsUpDown size={11} />
        </span>
      )}
    </button>
  )
})

/**
 * The whole tree as a picture: generations in rows, children grouped under the
 * union of their parents, the person in the middle highlighted.
 *
 * Cards are real buttons (focusable, named, laid out by CSS), with the lines drawn
 * on a layer behind them, so the tree is operable from the keyboard and readable by a
 * screen reader rather than being a drawing of text. The layout is computed once per
 * tree; selecting someone does not recompute it. Pinch with two fingers, or use the
 * buttons or Ctrl+wheel, to zoom; drag to move around.
 */
export default function TreeCanvas({
  tree,
  selectedId,
  highlight,
  onSelect,
  onCentre,
}: {
  tree: FamilyTree
  selectedId: string | null
  /** People on a "how are we related?" path, drawn lit. */
  highlight?: string[]
  onSelect: (personId: string) => void
  onCentre: (personId: string) => void
}) {
  const layout = useMemo(() => layoutTree(tree), [tree])
  const lit = useMemo(() => new Set(highlight ?? []), [highlight])
  const scroller = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const scaleRef = useRef(1)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<{ distance: number; scale: number } | null>(null)
  const dragged = useRef(false)

  const applyScale = useCallback((next: number, focus?: { x: number; y: number }) => {
    const el = scroller.current
    const value = clamp(next)
    if (el) {
      // Keep the point under the fingers where it is while the picture grows or shrinks.
      const f = focus ?? { x: el.clientWidth / 2, y: el.clientHeight / 2 }
      const ratio = value / scaleRef.current
      const left = (el.scrollLeft + f.x) * ratio - f.x
      const topPos = (el.scrollTop + f.y) * ratio - f.y
      scaleRef.current = value
      setScale(value)
      requestAnimationFrame(() => {
        el.scrollLeft = left
        el.scrollTop = topPos
      })
    } else {
      scaleRef.current = value
      setScale(value)
    }
  }, [])

  const fit = useCallback(() => {
    const el = scroller.current
    if (el) applyScale(Math.min(1, (el.clientWidth - 4) / layout.width))
  }, [applyScale, layout.width])

  // When a different tree arrives: fit it to the box if it is wider (never smaller than a readable size),
  // then bring the person in the middle into view. Done when the box reports its size, so it is
  // right whatever the width of the screen.
  const arranged = useRef<unknown>(null)
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const arrange = () => {
      if (arranged.current === layout || el.clientWidth === 0) return
      arranged.current = layout
      const wanted = Math.max(0.7, Math.min(1, (el.clientWidth - 4) / layout.width))
      scaleRef.current = wanted
      setScale(wanted)
      requestAnimationFrame(() => {
        const root = layout.placed.find((p) => p.id === tree.root)
        if (!root) return
        el.scrollLeft = Math.max(0, (root.x + CARD_W / 2) * wanted - el.clientWidth / 2)
        el.scrollTop = Math.max(0, (root.y + CARD_H / 2) * wanted - el.clientHeight / 2)
      })
    }
    const watcher = new ResizeObserver(arrange)
    watcher.observe(el)
    arrange()
    return () => watcher.disconnect()
  }, [layout, tree.root])

  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const wheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return
      event.preventDefault()
      const box = el.getBoundingClientRect()
      applyScale(scaleRef.current * (event.deltaY < 0 ? 1.1 : 1 / 1.1), { x: event.clientX - box.left, y: event.clientY - box.top })
    }
    el.addEventListener('wheel', wheel, { passive: false })
    return () => el.removeEventListener('wheel', wheel)
  }, [applyScale])

  const onPointerDown = (event: React.PointerEvent) => {
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    dragged.current = false
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      gesture.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), scale: scaleRef.current }
    }
  }
  const onPointerMove = (event: React.PointerEvent) => {
    const el = scroller.current
    const before = pointers.current.get(event.pointerId)
    if (!el || !before) return
    const now = { x: event.clientX, y: event.clientY }
    pointers.current.set(event.pointerId, now)
    if (pointers.current.size === 2 && gesture.current) {
      const [a, b] = [...pointers.current.values()]
      const box = el.getBoundingClientRect()
      dragged.current = true
      applyScale(gesture.current.scale * (Math.hypot(a.x - b.x, a.y - b.y) / gesture.current.distance), {
        x: (a.x + b.x) / 2 - box.left,
        y: (a.y + b.y) / 2 - box.top,
      })
    } else if (pointers.current.size === 1) {
      const dx = now.x - before.x
      const dy = now.y - before.y
      if (!dragged.current && Math.hypot(dx, dy) < 4) return
      if (!dragged.current) el.setPointerCapture(event.pointerId)
      dragged.current = true
      el.scrollLeft -= dx
      el.scrollTop -= dy
    }
  }
  const onPointerEnd = (event: React.PointerEvent) => {
    pointers.current.delete(event.pointerId)
    if (pointers.current.size < 2) gesture.current = null
  }

  // Reading order is top to bottom, left to right, whatever order the server sent.
  const reading = layout.placed

  const move = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === '+' || event.key === '=') return applyScale(scaleRef.current * 1.15)
      if (event.key === '-') return applyScale(scaleRef.current / 1.15)
      const current = (event.target as HTMLElement).closest<HTMLElement>('[data-person]')?.dataset.person
      const here = layout.placed.find((p) => p.id === current)
      if (!here) return
      const sameRow = reading.filter((p) => p.row === here.row)
      let next: Placed | undefined
      if (event.key === 'ArrowRight') next = sameRow[sameRow.indexOf(here) + 1]
      else if (event.key === 'ArrowLeft') next = sameRow[sameRow.indexOf(here) - 1]
      else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        const row = reading.filter((p) => p.row === here.row + (event.key === 'ArrowDown' ? 1 : -1))
        next = [...row].sort((a, b) => Math.abs(a.x - here.x) - Math.abs(b.x - here.x))[0]
      } else return
      if (!next) return
      event.preventDefault()
      const target = scroller.current?.querySelector<HTMLElement>(`[data-person="${next.id}"]`)
      target?.focus()
    },
    [layout, reading, applyScale],
  )

  const { tok } = useAppTheme()
  const zoomButton = cn('inline-flex h-9 w-9 items-center justify-center rounded-full disabled:opacity-40', tok.text, tok.hoverBg)

  return (
    <div className="relative">
      <div
        ref={scroller}
        onKeyDown={move}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onClickCapture={(event) => {
          // A drag that ends on a card is a drag, not a choice.
          if (dragged.current) {
            event.stopPropagation()
            dragged.current = false
          }
        }}
        style={{ touchAction: 'none' }}
        className="max-h-[70vh] min-h-[320px] cursor-grab overflow-auto rounded-card-md border border-white/8"
      >
        <div style={{ width: layout.width * scale, height: layout.height * scale + 56 }} className="mx-auto">
          <div
            data-scale={scale.toFixed(2)}
            role="group"
            aria-label="Family tree"
            className="relative origin-top-left"
            style={{ width: layout.width, height: layout.height, transform: `scale(${scale})` }}
          >
            <svg width={layout.width} height={layout.height} className="pointer-events-none absolute inset-0" aria-hidden="true">
              {layout.connectors.map((line) => {
                const onPath =
                  line.kind === 'partner' || line.kind === 'sibling'
                    ? Boolean(line.ends && lit.has(line.ends[0]) && lit.has(line.ends[1]))
                    : line.parents.some((p) => lit.has(p)) && line.children.some((c) => lit.has(c))
                return (
                  <path
                    key={line.id}
                    data-connector={line.kind}
                    data-connector-id={line.id}
                    d={line.d}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={onPath ? 2.5 : line.kind === 'partner' ? 2 : 1.5}
                    strokeDasharray={line.dashed ? '5 4' : undefined}
                    strokeLinejoin="round"
                    className={onPath ? 'text-gold' : line.kind === 'partner' ? 'text-text-mid/70' : 'text-text-low/65'}
                  />
                )
              })}
              {layout.junctions.map((dot) => (
                <circle key={dot.id} cx={dot.x} cy={dot.y} r={3.2} className="fill-text-mid/80" />
              ))}
            </svg>
            {reading.map((placed) => (
              <TreeNode
                key={placed.id}
                placed={placed}
                rootId={tree.root}
                selected={placed.id === selectedId}
                lit={lit.has(placed.id)}
                isMe={placed.id === tree.me}
                onSelect={onSelect}
                onCentre={onCentre}
              />
            ))}
          </div>
        </div>
      </div>
      <div className={cn('absolute bottom-2 end-2 flex items-center gap-0.5 rounded-full p-1 shadow-md', tok.cardSolid)} role="group" aria-label="Zoom">
        <button type="button" className={zoomButton} onClick={() => applyScale(scaleRef.current / 1.25)} disabled={scale <= MIN_SCALE} aria-label="Zoom out">
          <Minus size={16} aria-hidden="true" />
        </button>
        <span className={cn('min-w-10 text-center text-xs tabular-nums', tok.text)} aria-live="polite">
          {Math.round(scale * 100)}%
        </span>
        <button type="button" className={zoomButton} onClick={() => applyScale(scaleRef.current * 1.25)} disabled={scale >= MAX_SCALE} aria-label="Zoom in">
          <Plus size={16} aria-hidden="true" />
        </button>
        <button type="button" className={zoomButton} onClick={fit} aria-label="Fit the whole tree in view">
          <Maximize2 size={15} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
