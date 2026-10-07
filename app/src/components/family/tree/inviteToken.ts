/**
 * Keeping an invitation link's token while somebody signs in or signs up.
 *
 * The token lives in the URL fragment (`/tree/invite#t=...`), which is never sent to a
 * server or written to a log. The sign-in page is not told about it: it is remembered
 * here, the fragment is removed from the address bar, and the invite page picks it up
 * again once the member is back (`/join?next=/tree/invite`). It is only a courtesy: the
 * server decides whether the token is good, and nothing is attached until the member
 * presses Accept.
 */
const KEY = 'kinjy.tree.invite'
const KEEP_MS = 7 * 24 * 3600 * 1000

export function rememberInvite(token: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ token, at: Date.now() }))
  } catch {
    /* private mode: the link still works if the same tab keeps the fragment */
  }
}

export function pendingInvite(): string {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return ''
    const saved = JSON.parse(raw) as { token?: string; at?: number }
    if (!saved.token || !saved.at || Date.now() - saved.at > KEEP_MS) {
      localStorage.removeItem(KEY)
      return ''
    }
    return saved.token
  } catch {
    return ''
  }
}

export function forgetInvite(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* nothing to forget */
  }
}

/** The token on this address, if any (`#t=...`). */
export function tokenFromHash(hash: string): string {
  const match = /^#t=([A-Za-z0-9_-]{20,128})$/.exec(hash)
  return match ? match[1] : ''
}
