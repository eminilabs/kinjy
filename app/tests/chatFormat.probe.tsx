/**
 * The message formatter's rules, checked.
 *
 * Run with:  node tests/run.cjs
 *
 * Here rather than in a test framework because the app has none, and a parser
 * with boundary rules is exactly the thing that should not be verified by
 * looking at it. The interesting half is the cases that must NOT format:
 * `snake_case_name`, `2*3*4` and `5 * 3 = 15` all contain a mark and none of
 * them is formatting, and a formatter that gets those wrong is wrong in every
 * message on the platform at once.
 *
 * The tree is flattened to "tag(text)" so each rule reads as one string.
 */
import { formatChatText } from '../src/lib/chatFormat'
import type { ReactNode } from 'react'

/** A node tree flattened to "tag(text)" so a rule can be stated as a string. */
function shape(nodes: ReactNode[]): string {
  let out = ''
  for (const node of nodes) {
    if (node === null || node === undefined || node === false) continue
    if (typeof node === 'string' || typeof node === 'number') { out += String(node); continue }
    const el = node as { type?: unknown; props?: { children?: unknown } }
    const tag = typeof el.type === 'string' ? el.type : 'x'
    const kids = el.props?.children
    const inner = Array.isArray(kids) ? shape(kids as ReactNode[]) : shape([kids as ReactNode])
    out += tag === 'span' || tag === 'x' ? inner : `${tag}(${inner})`
  }
  return out
}

const CASES: Array<[string, string]> = [
  // What the marks do.
  ['*bold*', 'strong(bold)'],
  ['_italic_', 'em(italic)'],
  ['~gone~', 'del(gone)'],
  ['`code`', 'code(code)'],
  ['a *bold* b', 'a strong(bold) b'],
  ['*two words*', 'strong(two words)'],
  ['_*both*_', 'em(strong(both))'],

  // What they must NOT do - the part that is actually hard.
  ['2*3*4', '2*3*4'],
  ['snake_case_name', 'snake_case_name'],
  ['a * b * c', 'a * b * c'],
  ['*', '*'],
  ['**', '**'],
  ['* not bold*', '* not bold*'],
  ['*not closed', '*not closed'],
  ['5 * 3 = 15', '5 * 3 = 15'],
  ['file_name_here.txt', 'file_name_here.txt'],
  // Monospace is literal: the asterisks show.
  ['`*literal*`', 'code(*literal*)'],
  // Inline marks do not reach across a line.
  ['*one\ntwo*', '*one\ntwo*'],
  // A fenced block may.
  ['```one\ntwo```', 'code(one\ntwo)'],
  // Newlines are left in the text for whitespace-pre-wrap.
  ['a\nb', 'a\nb'],
  // Links still work, and inside a mark too.
  ['see https://kinjy.com now', 'see a(https://kinjy.com) now'],
  ['*https://kinjy.com*', 'strong(a(https://kinjy.com))'],
  // Trailing punctuation is not part of the address.
  ['go to https://kinjy.com.', 'go to a(https://kinjy.com). '.trimEnd()],
]

let failures = 0
for (const [input, expected] of CASES) {
  const got = shape(formatChatText(input))
  const pass = got === expected
  if (!pass) failures += 1
  console.log(
    (pass ? '  PASS ' : '  FAIL ') +
      JSON.stringify(input) +
      (pass ? '' : `  -> got ${JSON.stringify(got)} want ${JSON.stringify(expected)}`),
  )
}
console.log(failures === 0 ? 'OK' : `FAILED (${failures})`)
process.exit(failures === 0 ? 0 : 1)
