/**
 * Rich-text safety for article bodies.
 *
 * An article is authored as HTML in a contentEditable surface, stored, then
 * rendered back to other members. That round trip is an XSS vector unless the
 * markup is reduced to a known-safe subset — a `<img onerror>` or a `<script>`
 * pasted into the editor would otherwise execute in every reader's session.
 *
 * The approach is a whitelist rebuild rather than a blacklist strip: parse the
 * markup, walk it, and keep *only* the tags and attributes named here. Anything
 * unknown is dropped, so a tag nobody thought of is safe by default instead of
 * dangerous by default.
 *
 * Sanitising happens on render as well as on save, because the database can
 * contain anything — rows predating this code, or written by another client.
 */

const ALLOWED_TAGS = new Set([
  'P', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'S',
  'H2', 'H3', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'A', 'CODE', 'PRE',
])

/** Only href on links, and only to schemes that cannot execute anything. */
const SAFE_SCHEMES = ['http:', 'https:', 'mailto:']

function safeHref(value: string): string | null {
  try {
    // Resolve against the current origin so "/foo" and "page" stay valid.
    const url = new URL(value, window.location.origin)
    return SAFE_SCHEMES.includes(url.protocol) ? url.href : null
  } catch {
    return null
  }
}

function clean(node: Node, out: Node, doc: Document): void {
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      out.appendChild(doc.createTextNode(child.textContent ?? ''))
      continue
    }
    if (child.nodeType !== Node.ELEMENT_NODE) continue

    const element = child as Element
    if (!ALLOWED_TAGS.has(element.tagName)) {
      // Keep the words, drop the wrapper: unwrapping a <div> or a <span> loses
      // styling but never loses the author's text.
      clean(element, out, doc)
      continue
    }

    const copy = doc.createElement(element.tagName.toLowerCase())
    if (element.tagName === 'A') {
      const href = safeHref(element.getAttribute('href') ?? '')
      if (!href) {
        clean(element, out, doc)
        continue
      }
      copy.setAttribute('href', href)
      copy.setAttribute('rel', 'noopener noreferrer nofollow')
      copy.setAttribute('target', '_blank')
    }
    clean(element, copy, doc)
    out.appendChild(copy)
  }
}

export function sanitizeHtml(html: string): string {
  if (!html) return ''
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
  const container = doc.createElement('div')
  clean(doc.body, container, doc)
  return container.innerHTML
}

/** Plain text for previews, search and the feed's non-article surfaces. */
export function htmlToText(html: string): string {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim()
}

/** Does this body actually contain markup, or is it plain text? */
export function looksLikeHtml(value: string): boolean {
  return /<(p|br|h2|h3|ul|ol|li|blockquote|strong|b|em|i|a|code|pre)\b/i.test(value)
}
