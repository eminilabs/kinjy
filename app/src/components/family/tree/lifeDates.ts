import type { PersonDetail } from '@/lib/api'

/**
 * What a person's page says about when and where they were born and died.
 *
 * Only what is recorded is shown. A missing death date is never worked out (not from age, not from
 * "deceased"), a place is shown without a date and a date without a place, and a date that is only a
 * year, or a year and a month, stays a year, or a month and a year.
 */
export interface LifeRow {
  key: 'born' | 'died'
  /** The recorded date as stored (YYYY, YYYY-MM or YYYY-MM-DD), or null when there is none. */
  date: string | null
  place: string | null
  /** Recorded as deceased with no date at all: the page says the date is not recorded, it does not guess. */
  dateNotRecorded: boolean
}

const text = (value?: string | null) => (value ?? '').trim() || null

export function lifeRows(p: Pick<PersonDetail, 'birth_date' | 'birth_place' | 'death_date' | 'death_place' | 'deceased'>): LifeRow[] {
  const rows: LifeRow[] = []
  const birthDate = text(p.birth_date)
  const birthPlace = text(p.birth_place)
  if (birthDate || birthPlace) rows.push({ key: 'born', date: birthDate, place: birthPlace, dateNotRecorded: false })
  const deathDate = text(p.death_date)
  const deathPlace = text(p.death_place)
  if (p.deceased || deathDate || deathPlace) {
    rows.push({ key: 'died', date: deathDate, place: deathPlace, dateNotRecorded: !deathDate })
  }
  return rows
}

const PARTS = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/

/** A recorded date in the reader's language, with only the parts that were recorded. Unreadable input is shown as it was written. */
export function formatDate(iso: string, language: string): string {
  const m = PARTS.exec(iso)
  if (!m) return iso
  const year = Number(m[1])
  const month = m[2] ? Number(m[2]) : null
  const day = m[3] ? Number(m[3]) : null
  if (month !== null && (month < 1 || month > 12)) return iso
  if (day !== null && (day < 1 || day > 31)) return iso
  const when = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1))
  // Two-digit years (0000-0099) would be read as 1900-1999 by Date.UTC.
  when.setUTCFullYear(year)
  if (day !== null && (when.getUTCDate() !== day || when.getUTCMonth() !== (month as number) - 1)) return iso
  try {
    const options: Intl.DateTimeFormatOptions =
      month === null
        ? { year: 'numeric', timeZone: 'UTC' }
        : day === null
          ? { month: 'long', year: 'numeric', timeZone: 'UTC' }
          : { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }
    return new Intl.DateTimeFormat(language, options).format(when)
  } catch {
    return iso
  }
}
