/**
 * Asking for the display copy of a picture rather than the original.
 *
 * Every image in a post is stored whole - a camera file, a median of 375 kB
 * and a tail into the megabytes - and until now the feed was sent exactly
 * that, into a column 560 px wide. media-service keeps a feed-sized copy of
 * each one; this is how a page asks for it.
 *
 * The flag is a plain query parameter and the ticket is signed over the asset
 * id alone, so adding it neither needs a second URL from the server nor
 * weakens the one we have. A picture with no copy yet - anything uploaded
 * before they existed and not yet backfilled - is served whole, exactly as
 * before, so this is always safe to ask for.
 */
export function preview(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  // Signed media always carries a ticket, so there is a query string already;
  // the check is for the local provider and for anything hand-built in a test.
  return `${url}${url.includes('?') ? '&' : '?'}p=1`
}
