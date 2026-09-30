/**
 * The profile editor's form state, kept apart from the components.
 *
 * The editor sends only what changed: `PATCH /users/me` reads an absent field
 * as "leave it", so sending the whole form would re-validate (and re-sync to
 * auth-service) fields the member never touched.
 */
import type { MyProfile, ProfileUpdate } from '@/lib/api'
import { PROFILE_LIMITS, splitLanguages } from '@/lib/profileOptions'

export interface ProfileDraft {
  display_name: string
  bio: string
  country: string
  state: string
  city: string
  neighborhood: string
  languages: string[]
  lang: string
}

export type DraftField = keyof ProfileDraft
export type DraftProblems = Partial<Record<DraftField, string>>

/** Optional text fields: blank on the form, null on the server. */
const CLEARABLE = ['bio', 'country', 'state', 'city', 'neighborhood'] as const

export function draftFrom(profile: MyProfile): ProfileDraft {
  return {
    display_name: profile.display_name,
    bio: profile.bio ?? '',
    country: profile.country ?? '',
    state: profile.state ?? '',
    city: profile.city ?? '',
    neighborhood: profile.neighborhood ?? '',
    languages: splitLanguages(profile.languages),
    lang: profile.lang,
  }
}

/** Counted in code points, as the server counts them: an emoji is one, not two. */
export function lengthOf(value: string): number {
  return [...value].length
}

/** What to send: only the fields that differ from what is saved. */
export function changesBetween(draft: ProfileDraft, saved: MyProfile): ProfileUpdate {
  const patch: ProfileUpdate = {}

  const name = draft.display_name.trim()
  if (name !== saved.display_name) patch.display_name = name

  for (const field of CLEARABLE) {
    // The bio keeps its inner line breaks; only the ends are trimmed.
    const value = draft[field].trim()
    if (value !== (saved[field] ?? '')) patch[field] = value === '' ? null : value
  }

  const languages = draft.languages.join(',')
  if (languages !== saved.languages) patch.languages = languages
  if (draft.lang !== saved.lang) patch.lang = draft.lang
  return patch
}

function tooLong(value: string, max: number): string | undefined {
  const length = lengthOf(value.trim())
  return length > max ? `At most ${max} characters (${length} now).` : undefined
}

/** Problems the server would refuse anyway, found before the round trip. */
export function draftProblems(draft: ProfileDraft): DraftProblems {
  const problems: DraftProblems = {}
  const nameLength = lengthOf(draft.display_name.trim())
  if (nameLength < PROFILE_LIMITS.displayName.min) {
    problems.display_name = `At least ${PROFILE_LIMITS.displayName.min} characters.`
  } else {
    problems.display_name = tooLong(draft.display_name, PROFILE_LIMITS.displayName.max)
  }
  problems.bio = tooLong(draft.bio, PROFILE_LIMITS.bio)
  problems.state = tooLong(draft.state, PROFILE_LIMITS.state)
  problems.city = tooLong(draft.city, PROFILE_LIMITS.city)
  problems.neighborhood = tooLong(draft.neighborhood, PROFILE_LIMITS.neighborhood)
  if (draft.languages.length === 0) problems.languages = 'Choose at least one language.'

  return Object.fromEntries(Object.entries(problems).filter(([, message]) => message)) as DraftProblems
}
