import type { PersonDetail, PersonFields } from '@/lib/api'

export interface FormValues {
  given_name: string
  family_name: string
  other_names: string
  gender: string
  birth_date: string
  birth_place: string
  deceased: boolean
  death_date: string
  death_place: string
  biography: string
}

export const emptyValues = (given = '', family = ''): FormValues => ({
  given_name: given,
  family_name: family,
  other_names: '',
  gender: '',
  birth_date: '',
  birth_place: '',
  deceased: false,
  death_date: '',
  death_place: '',
  biography: '',
})

export const valuesFrom = (p: PersonDetail): FormValues => ({
  given_name: p.given_name,
  family_name: p.family_name ?? '',
  other_names: p.other_names ?? '',
  gender: p.gender ?? '',
  birth_date: p.birth_date ?? '',
  birth_place: p.birth_place ?? '',
  deceased: Boolean(p.deceased),
  death_date: p.death_date ?? '',
  death_place: p.death_place ?? '',
  biography: p.biography ?? '',
})

/**
 * What goes over the wire. When creating, a blank field is simply not sent. When
 * editing, a blank field is sent as null: the member emptied it, and the server
 * clears it (leaving it out would mean "leave it alone").
 */
export function toFields(v: FormValues, editing: boolean): PersonFields {
  const text = (value: string) => (value.trim() === '' ? (editing ? null : undefined) : value.trim())
  return {
    given_name: v.given_name.trim(),
    family_name: text(v.family_name),
    other_names: text(v.other_names),
    gender: text(v.gender),
    birth_date: text(v.birth_date),
    birth_place: text(v.birth_place),
    deceased: v.deceased,
    death_date: v.deceased ? text(v.death_date) : editing ? null : undefined,
    death_place: v.deceased ? text(v.death_place) : editing ? null : undefined,
    biography: text(v.biography),
  }
}
