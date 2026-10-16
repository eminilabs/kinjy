import type { CreatorFormats } from '@/lib/api'

const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * An article's HTML from its words — the first line the heading, the rest
 * paragraphs, every character escaped. The same shape the engine writes, for the
 * one case where the creator has edited the text before posting it: markup built
 * from what somebody typed is never anything but escaped text.
 */
export function articleHtml(text: string): string {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length === 0) return ''
  const [heading, ...rest] = lines
  const body = (rest.length > 0 ? rest : lines).map((l) => `<p>${escape(l)}</p>`).join('\n')
  return `<h2>${escape(heading)}</h2>\n${body}`
}

export const labelOf = (formats: CreatorFormats | null, id: string): string =>
  formats?.formats.find((f) => f.id === id)?.label ?? id

export const languageName = (formats: CreatorFormats | null, code: string): string =>
  formats?.languages.find((l) => l.code === code)?.name ?? code.toUpperCase()

/** "7 Oct 2026, 11:42" — when a job was made, as a person reads it. */
export function when(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
}

/** Two minutes ahead, in the viewer's local time for a datetime-local field. */
export function soonest(): string {
  const date = new Date(Date.now() + 2 * 60_000)
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
}
