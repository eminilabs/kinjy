/**
 * Features that exist in the codebase but are not open to members yet.
 *
 * Hidden rather than deleted: the pages, components and endpoints stay, and
 * nothing links to them or renders them while their switch is off. Opening one
 * again is a matter of flipping it here — every navigation list, route and
 * section that mentions a feature asks this file, so none of them can be missed.
 *
 * Off means off everywhere: the app, the public site, and a URL typed by hand.
 * A feature that is hidden from the menu but still answers at its address is
 * not hidden, it is merely unlisted.
 */
export const FEATURES = {
  /** Broadcasting — there is no streaming backend yet. */
  live: false,
  /** Voice and video calls in the messenger. */
  calls: false,
  /** Buying and selling, and the /commerce page that presents it. */
  marketplace: true,
  /** The family tree inside the app: /tree, its privacy settings, the family search. */
  familyTreeApp: true,
  /**
   * The family tree as the public site presents it: the /family page and every line
   * of copy that advertises it. Off on purpose while that copy promises what is not
   * built (sharing by branch, export, the Heritage AI screens); see NOT-DONE.md.
   */
  familyTree: false,
  /** The Kinjy Assistant: the floating orb and the /assistant page. */
  assistant: false,
} as const

export type Feature = keyof typeof FEATURES

/**
 * How many of the blueprint's fifteen modules are open.
 *
 * The family tree and the marketplace are two of the fifteen (the tree counts as
 * open when the app has it, whatever the public site says); live, calls and
 * the assistant live inside other modules. Copy that says "Fifteen modules"
 * while two are hidden would advertise exactly what is being hidden.
 */
export const OPEN_MODULES =
  15 - [FEATURES.familyTreeApp, FEATURES.marketplace].filter((open) => !open).length

const WORDS = [
  'Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen', 'Twenty',
]

/** "Thirteen" — a count spelled out for headlines, digits past twenty. */
export function spelled(count: number): string {
  return WORDS[count] ?? String(count)
}

/** Which feature each route belongs to, app and public site alike. */
const ROUTE_FEATURE: ReadonlyArray<readonly [string, Feature]> = [
  ['/live', 'live'],
  ['/market', 'marketplace'],
  ['/commerce', 'marketplace'],
  ['/tree', 'familyTreeApp'],
  ['/family', 'familyTree'],
  ['/assistant', 'assistant'],
]

/**
 * Whether a link may be shown.
 *
 * Link lists filter themselves through this, so a menu entry disappears with
 * its feature instead of leading to a redirect.
 */
export function isRouteAvailable(to: string): boolean {
  const pathname = to.split(/[?#]/)[0]
  const match = ROUTE_FEATURE.find(
    ([route]) => pathname === route || pathname.startsWith(`${route}/`),
  )
  return match ? FEATURES[match[1]] : true
}
