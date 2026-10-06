/**
 * Links that leave the platform, and the invitation they carry.
 *
 * A shared post is the only piece of Kinjy most people will ever see before
 * deciding whether to join, so the link has two jobs: open the post for
 * somebody with no account, and credit the member who sent it if that person
 * does join.
 *
 * The credit is the member's own referral code — the same one the direct 20%
 * programme pays on — added as `?ref=`. It is added only for a member who is
 * signed in, because a code is something an account has; a visitor sharing a
 * post has nothing to attach and the link is simply a link.
 */

const REF_KEY = 'kinjy.pending_ref'

/** Where this build lives, for links that will be read outside the app. */
export function siteOrigin(): string {
  return window.location.origin
}

/** The public address of one post. */
export function postUrl(postId: string, ref?: string | null): string {
  const url = new URL(`/p/${postId}`, siteOrigin())
  if (ref) url.searchParams.set('ref', ref)
  return url.toString()
}

/**
 * Remember an invitation code that arrived with a link.
 *
 * Someone who opens a shared post and then reads three more pages before
 * signing up must still credit whoever sent them. Without this the code lived
 * only in the URL of the first page and was lost on the first click.
 *
 * Kept per browser and deliberately not merged with anything else: it is a
 * hint about where somebody came from, not an identity.
 */
export function rememberRef(ref: string | null | undefined): void {
  if (!ref) return
  // Codes are 8 characters of A-Z0-9 (see _referral_code in auth-service).
  // Anything else is somebody playing with the query string.
  if (!/^[A-Z0-9]{4,16}$/.test(ref)) return
  try {
    localStorage.setItem(REF_KEY, ref)
  } catch {
    /* private window, blocked storage: the sign-up still works, uncredited */
  }
}

/** The code to offer the sign-up form, if one arrived earlier. */
export function pendingRef(): string {
  try {
    return localStorage.getItem(REF_KEY) ?? ''
  } catch {
    return ''
  }
}

/** Once it has been used, it should not follow them into a second account. */
export function clearPendingRef(): void {
  try {
    localStorage.removeItem(REF_KEY)
  } catch {
    /* nothing to clear */
  }
}

/**
 * Hand a link to whatever the device uses for sharing, falling back to the
 * clipboard.
 *
 * Returns how it was shared so the caller can say so. `navigator.share` throws
 * AbortError when somebody closes the sheet, which is a choice rather than a
 * failure and is reported as such.
 */
export async function shareLink(
  url: string,
  title: string,
): Promise<'shared' | 'copied' | 'cancelled' | 'failed'> {
  if (navigator.share) {
    try {
      await navigator.share({ title, url })
      return 'shared'
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled'
      // Any other failure falls through to the clipboard rather than leaving
      // the member with nothing.
    }
  }
  try {
    await navigator.clipboard.writeText(url)
    return 'copied'
  } catch {
    return 'failed'
  }
}
