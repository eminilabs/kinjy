import { fold, matchesQuery } from '@/lib/stickers'

/**
 * Unicode emoji for the composer: plain characters that go into the message
 * text like any other. They are not stickers - those are catalogue ids with
 * their own message kind (lib/stickers.ts) - and the two never convert into
 * one another.
 *
 * The data (names, categories, keywords, Unicode version) comes from two
 * data-only packages, `unicode-emoji-json` and `emojilib` (MIT, no runtime
 * code). They are imported on demand, so the ~80 KB they weigh is only
 * downloaded when someone opens the Emojis section. The browser draws the
 * glyphs from its own emoji font: no image is fetched or embedded.
 */

export const EMOJI_GROUPS = [
  'Smileys & Emotion',
  'People & Body',
  'Animals & Nature',
  'Food & Drink',
  'Travel & Places',
  'Activities',
  'Objects',
  'Symbols',
  'Flags',
] as const

export interface EmojiItem {
  /** The character(s) as they are inserted into the text. */
  char: string
  /** What a screen reader announces ("waving hand"). */
  name: string
  group: string
  /** Extra search words, lower-case, without the sticker-style slug. */
  keywords: string[]
}

interface RawEmoji {
  name: string
  group: string
}

let loading: Promise<EmojiItem[]> | null = null

/** The whole list, in Unicode order. One download, then cached; a failure is retried on the next open. */
export function loadEmoji(): Promise<EmojiItem[]> {
  loading ??= Promise.all([
    import('unicode-emoji-json/data-by-emoji.json'),
    import('unicode-emoji-json/data-ordered-emoji.json'),
    import('emojilib/dist/emoji-en-US.json'),
  ])
    .then(([byEmoji, ordered, words]) => {
      const data = byEmoji.default as unknown as Record<string, RawEmoji>
      const keywords = words.default as unknown as Record<string, string[]>
      const items = (ordered.default as unknown as string[]).flatMap((char) => {
        const raw = data[char]
        if (!raw) return []
        // emojilib spells some characters without the variation selector.
        const extra = keywords[char] ?? keywords[char.replace(/️/g, '')] ?? []
        return [
          {
            char,
            name: raw.name,
            group: raw.group,
            // The first entry is the slug ("waving_hand"), which only repeats the name.
            keywords: [...new Set(extra.slice(1).map((k) => k.replace(/_/g, ' ').toLowerCase()))],
          },
        ]
      })
      return withoutUnsupported(items)
    })
    .catch((err) => {
      loading = null
      throw err
    })
  return loading
}

const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'
export const EMOJI_FONT_STACK = EMOJI_FONT

/**
 * Newer emoji show as an empty box (or as several glyphs) on a system whose
 * emoji font predates them. A glyph the font really has is as wide as 😀; one
 * it does not have is not. Anything that does not measure like 😀 is left out
 * of the panel rather than offered as a box. If almost everything would be
 * removed the measurement itself is not to be trusted and nothing is.
 */
function withoutUnsupported(items: EmojiItem[]): EmojiItem[] {
  try {
    const context = document.createElement('canvas').getContext('2d')
    if (!context) return items
    context.font = `32px ${EMOJI_FONT}`
    const reference = context.measureText('😀').width
    if (!reference) return items
    const kept = items.filter((item) => Math.abs(context.measureText(item.char).width - reference) <= reference * 0.2)
    return kept.length >= items.length * 0.5 ? kept : items
  } catch {
    return items
  }
}

/** Local search: the query never leaves the browser. */
export function searchEmoji(items: EmojiItem[], query: string, limit = 120): EmojiItem[] {
  if (!fold(query)) return []
  return items.filter((item) => matchesQuery(item, query)).slice(0, limit)
}

/**
 * Recently used emoji, newest first, kept in this browser as a convenience.
 * A separate key from the sticker recents: the two never mix. Storage can be
 * blocked or empty, so every access is guarded and the panel works without it.
 */
const RECENT_KEY = 'kinjy.emoji.recent'
const RECENT_MAX = 32
const LOOKS_LIKE_EMOJI = /^(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|[0-9#*]️?⃣)/u

export function loadRecentEmoji(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
    if (!Array.isArray(raw)) return []
    return raw
      .filter((c): c is string => typeof c === 'string' && c.length <= 32 && LOOKS_LIKE_EMOJI.test(c))
      .slice(0, RECENT_MAX)
  } catch {
    return []
  }
}

export function rememberRecentEmoji(char: string): void {
  try {
    const next = [char, ...loadRecentEmoji().filter((c) => c !== char)].slice(0, RECENT_MAX)
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    /* storage unavailable: recents are a convenience only */
  }
}
