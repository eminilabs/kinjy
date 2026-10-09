/**
 * A sticker id is `<pack>.<name>`. The catalogue is the server's: what a sticker
 * looks like (its glyph, or artwork it provides) comes with it, so an id on its
 * own is only checked against this pattern before it is kept as a recent.
 */
const ID = /^([a-z0-9-]+)\.([a-z0-9-]+)$/

/** Lower-case, accent-free: "cœur", "Coeur" and "coeur" all match the same sticker. */
export function fold(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

/** Local search over the catalogue the server sent: the query never leaves the browser. */
export function matchesQuery(sticker: { name: string; keywords: string[] }, query: string): boolean {
  const q = fold(query)
  if (!q) return true
  return fold(sticker.name).includes(q) || sticker.keywords.some((k) => fold(k).includes(q))
}

/**
 * Recently used stickers, newest first. Ids only, kept in this browser as a
 * convenience: storage can be blocked or empty (private window), so every
 * access is guarded and the panel works without it.
 */
const RECENT_KEY = 'kinjy.stickers.recent'
const RECENT_MAX = 16

export function loadRecents(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
    return Array.isArray(raw) ? raw.filter((id): id is string => typeof id === 'string' && ID.test(id)).slice(0, RECENT_MAX) : []
  } catch {
    return []
  }
}

export function rememberRecent(id: string): void {
  try {
    const next = [id, ...loadRecents().filter((x) => x !== id)].slice(0, RECENT_MAX)
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    /* storage unavailable: recents are a convenience only */
  }
}
