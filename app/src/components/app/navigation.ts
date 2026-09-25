import type { ChromeKey } from '@/components/appdemo/theme'

/**
 * The bridge between the designed app chrome and real routing.
 *
 * The demo shell switches a local `module` state; the live app navigates. Both
 * speak the same ChromeKey vocabulary, so the labels, icons and blueprint
 * ordering are shared rather than duplicated — and translated once, in
 * CHROME_STRINGS.
 */
export const ROUTE_FOR: Record<ChromeKey, string> = {
  home: '/hub',
  following: '/hub?mode=following',
  forYou: '/hub?mode=for_you',
  public: '/hub?mode=global',
  forums: '/forums',
  circles: '/circles',
  communities: '/communities',
  messages: '/messages',
  live: '/live',
  familyTree: '/tree',
  graveyard: '/graveyard',
  explore: '/explore',
  marketplace: '/market',
  create: '/hub?compose=1',
  earnings: '/earn',
  profile: '/dashboard',
  // Non-module strings that share the dictionary; never rendered as nav.
  search: '',
  share: '',
  pinned: '',
  trending: '',
  suggested: '',
  pool: '',
  whyTitle: '',
}

/**
 * The modules that are actual destinations.
 *
 * Following, For You and Public are deliberately absent: they are *modes of the
 * feed*, not places. They already live in the feed's own mode selector, and
 * repeating them in the global bar meant the same menu twice — with the odd
 * result that "Home" and "For You" led to the same page in different states.
 */
export const NAV_DESTINATIONS: ChromeKey[] = [
  'home',
  'create',
  'messages',
  'forums',
  'circles',
  'communities',
  'live',
  'familyTree',
  'graveyard',
  'explore',
  'marketplace',
  'earnings',
]

/** Shorts is ours, not in the blueprint's original list — appended, not inserted. */
export const EXTRA_NAV: Array<{ key: string; route: string; label: string }> = [
  { key: 'shorts', route: '/shorts', label: 'Shorts' },
]

/** Which chip should look active for the current location. */
export function activeKeyFor(pathname: string, search: string): ChromeKey | 'shorts' | null {
  if (pathname === '/shorts') return 'shorts'
  // Every feed mode is still Home — the mode is a state of that page, so the
  // chip must not jump around as the member switches tabs inside it.
  if (pathname === '/hub') {
    return new URLSearchParams(search).get('compose') ? 'create' : 'home'
  }
  const found = (Object.entries(ROUTE_FOR) as Array<[ChromeKey, string]>).find(
    ([, route]) => route === pathname,
  )
  return found ? found[0] : null
}
