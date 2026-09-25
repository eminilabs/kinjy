/**
 * The floating stack, in one place.
 *
 * Every always-on-top control anchors to the bottom-inline-end corner, and each
 * one used to pick its own offsets: the assistant orb sat at `bottom-24 end-4 /
 * lg:bottom-6 lg:end-6` while the feed's composer button chose `bottom-24 end-5
 * / lg:bottom-8 lg:end-8`. Those are close enough to look deliberate and far
 * enough apart to overlap — on a 1280×720 window they shared 48×44 pixels, so
 * the orb sat on top of the button.
 *
 * Slots here are stacked upward from the corner and share one inline edge, so
 * adding another floating control means taking the next slot rather than
 * guessing a new offset.
 */

/** Slot 0 — the corner itself. The assistant orb (56px tall). */
export const FLOAT_SLOT_0 = 'bottom-24 end-4 lg:bottom-6 lg:end-6'

/**
 * Slot 1 — directly above slot 0.
 *
 * 96 + 56 + 12 = 164px on small screens, 24 + 56 + 12 = 92px from `lg` up:
 * the orb's offset, plus its height, plus a gap that reads as separation
 * rather than as a mistake.
 */
export const FLOAT_SLOT_1 = 'bottom-[10.25rem] end-4 lg:bottom-[5.75rem] lg:end-6'

/**
 * Where a control belongs when the assistant orb is the only thing below it.
 *
 * A member who hides the orb in their settings should not be left with a button
 * hovering above an empty corner, so the slot collapses down.
 */
export function slotAboveOrb(orbVisible: boolean): string {
  return orbVisible ? FLOAT_SLOT_1 : FLOAT_SLOT_0
}
