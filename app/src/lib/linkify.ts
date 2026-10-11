/**
 * Finding the addresses in something somebody typed.
 *
 * Shared by posts and comments because they had a copy each, and a copy each
 * is how one of them ends up linkifying something the other does not - which
 * is exactly what happened: a comment could carry a link and a post could not,
 * and then the reverse.
 *
 * Two shapes count as an address:
 *
 *   https://example.com/path   - explicit, unambiguous, always a link
 *   example.com/path           - bare, and only when the ending is one people
 *                                actually write links with
 *
 * The bare form is the one that needs care. "Go to digitalshoppingmall.net" is
 * plainly a link and reads as broken when it is not one. But `Node.js`,
 * `README.md`, `app.tsx` and `i.e.` have the same shape, and turning those
 * into links is worse than missing the occasional domain - a reader who clicks
 * "Node.js" and lands on a parked page learns the site is guessing.
 *
 * So a bare domain is only an address when its ending is on the list below, or
 * when it starts with www. That is a deliberately conservative trade: an
 * unusual TLD stays text, and nothing that is not a link becomes one.
 */

/** Endings common enough to be worth guessing on, plus the ones this audience uses. */
const BARE_TLDS = [
  'com', 'net', 'org', 'info', 'biz', 'app', 'dev', 'io', 'ai', 'co',
  'me', 'tv', 'shop', 'store', 'online', 'site', 'blog', 'news', 'xyz',
  'africa', 'ug', 'tz', 'ke', 'rw', 'bi', 'cd', 'ng', 'gh', 'za', 'sn',
  'ci', 'cm', 'bj', 'tg', 'ml', 'bf', 'fr', 'uk', 'de', 'es', 'it', 'be',
  'ca', 'us', 'ch', 'nl', 'se', 'no', 'pt', 'br', 'in', 'cn', 'jp',
]

/**
 * One expression matching both shapes.
 *
 * Used with a capturing group so `String.split` keeps the matches, which is
 * how the renderers turn a body into an array of text and elements without
 * ever building markup from it.
 */
export const LINK_RE = new RegExp(
  // explicit scheme
  `(https?:\\/\\/[^\\s<>"']+` +
    // or a bare domain, either starting www. or ending in a known TLD
    `|(?:www\\.[^\\s<>"']+` +
    `|[a-z0-9][a-z0-9-]*(?:\\.[a-z0-9-]+)*\\.(?:${BARE_TLDS.join('|')})(?:\\/[^\\s<>"']*)?)` +
    `)`,
  'gi',
)

/** Does this fragment, produced by splitting on LINK_RE, look like an address? */
export function isLink(part: string): boolean {
  if (!part) return false
  if (/^https?:\/\//i.test(part)) return true
  if (/^www\./i.test(part)) return true
  // A bare domain: the ending has to be one of the known ones, and the whole
  // thing has to be a single run with no spaces.
  const host = part.split('/')[0]
  const ending = host.split('.').pop()?.toLowerCase() ?? ''
  return BARE_TLDS.includes(ending) && !/\s/.test(part)
}

/**
 * Split an address into the part that is the link and the punctuation that is
 * the sentence's.
 *
 * "see example.com." ends in a full stop that belongs to the sentence, and a
 * link carrying it goes to the wrong place - or nowhere.
 */
export function splitTrailing(part: string): { href: string; text: string; trailing: string } {
  const trailing = part.match(/[.,;:!?)\]]+$/)?.[0] ?? ''
  const text = trailing ? part.slice(0, -trailing.length) : part
  // A bare domain needs a scheme to be followed; https, because a site worth
  // linking to in 2026 has it and the browser will not downgrade for us.
  const href = /^https?:\/\//i.test(text) ? text : `https://${text}`
  return { href, text, trailing }
}

/**
 * A hashtag or an @mention, as one pattern.
 *
 * A regex literal, not a string: a backslash inside a template literal is
 * dropped, so writing this inline as `[\w…]` silently became `[w…]` - and with
 * the trailing dash in the class that matched whole phrases, turning a
 * sentence into a single topic link. `.source` keeps it exactly as written.
 */
export const TAG_OR_MENTION =
  /#[\wÀ-ÿ؀-ۿ一-鿿][\wÀ-ÿ؀-ۿ一-鿿-]{1,49}|@[a-z0-9_.]{2,40}/
