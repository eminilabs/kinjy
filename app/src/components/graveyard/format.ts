/** Dates on memorials are calendar dates, not instants: read them in UTC so a
 *  reader west of Greenwich does not see someone die the day before. */
export function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  const day = new Date(`${iso.slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(day.getTime())) return null
  return day.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

/** "2 March 1940 — 14 July 2020", or as much of it as is known. */
export function lifeSpan(birth: string | null, death: string | null): string {
  const from = formatDate(birth)
  const to = formatDate(death)
  if (from && to) return `${from} — ${to}`
  if (to) return `Died ${to}`
  if (from) return `Born ${from}`
  return 'Dates not recorded'
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/** A timeline moment, at the precision the family gave it. */
export function momentDate(year: number, month: number | null, day: number | null): string {
  if (month && day) return `${day} ${MONTHS[month - 1]} ${year}`
  if (month) return `${MONTHS[month - 1]} ${year}`
  return String(year)
}

/** What the death-verification state means, in the family's words. */
export const DEATH_STATUS: Record<string, { label: string; tone: 'good' | 'pending' | 'none' }> = {
  verified: { label: 'Death verified', tone: 'good' },
  under_review: { label: 'Being verified', tone: 'pending' },
  reported: { label: 'Death reported', tone: 'pending' },
  unconfirmed: { label: 'Not yet verified', tone: 'none' },
}

/** Faith styles the family can choose from — never inferred, always chosen. */
export const FAITH_STYLES: Array<{ id: string; label: string }> = [
  { id: 'none', label: 'None' },
  { id: 'christian', label: 'Christian' },
  { id: 'muslim', label: 'Muslim' },
  { id: 'jewish', label: 'Jewish' },
  { id: 'hindu', label: 'Hindu' },
  { id: 'buddhist', label: 'Buddhist' },
  { id: 'traditional', label: 'Traditional' },
  { id: 'secular', label: 'Secular' },
  { id: 'other', label: 'Other' },
]
