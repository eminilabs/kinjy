import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, ReactNode } from 'react'
import { Link } from 'react-router'
import { Check, ExternalLink } from 'lucide-react'
import { useAppTheme, type AppLang } from '@/components/appdemo/theme'
import { useAuth } from '@/hooks/useAuth'
import { LANGUAGES } from '@/i18n'
import { ApiError, kaluta, type MyProfile, type ProfileUpdate } from '@/lib/api'
import { announce } from '@/lib/live'
import { PROFILE_LIMITS, countryOptions } from '@/lib/profileOptions'
import ProfileImagePicker from './ProfileImagePicker'
import SpokenLanguages from './SpokenLanguages'
import { Panel, PanelState, inputClass } from './primitives'
import {
  changesBetween,
  draftFrom,
  draftProblems,
  lengthOf,
  type DraftField,
  type ProfileDraft,
} from './profileDraft'
import { cn } from '@/lib/utils'

function isAppLang(code: string): code is AppLang {
  return LANGUAGES.some((language) => language.code === code)
}

function Field({
  id,
  label,
  hint,
  problem,
  counter,
  children,
}: {
  id: string
  label: string
  hint?: ReactNode
  problem?: string
  counter?: string
  children: ReactNode
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="caption">
          {label}
        </label>
        {counter && <span className="caption mono-data">{counter}</span>}
      </div>
      {children}
      {problem ? (
        <p id={`${id}-note`} role="alert" className="mt-1.5 text-xs text-red-200">
          {problem}
        </p>
      ) : (
        hint && (
          <p id={`${id}-note`} className="caption mt-1.5">
            {hint}
          </p>
        )
      )}
    </div>
  )
}

/**
 * Edit how the rest of Kinjy sees you.
 *
 * Text fields are saved together with one button; images apply as soon as
 * they are uploaded (see ProfileImagePicker). The server re-checks everything
 * this form checks, so the checks here only save a round trip.
 */
export default function ProfileEditor() {
  const { refresh } = useAuth()
  const { lang: uiLang, setLang } = useAppTheme()

  const [saved, setSaved] = useState<MyProfile | null>(null)
  const [draft, setDraft] = useState<ProfileDraft | null>(null)
  const [mayAddNeighborhood, setMayAddNeighborhood] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedNotice, setSavedNotice] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      kaluta.account.profile(),
      // Without an answer the field is left out: the same call the server makes.
      kaluta.account.profileEligibility().catch(() => ({ neighborhood: false })),
    ])
      .then(([profile, eligibility]) => {
        if (cancelled) return
        setSaved(profile)
        setDraft(draftFrom(profile))
        setMayAddNeighborhood(eligibility.neighborhood)
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(err instanceof ApiError ? err.message : 'Could not load your profile')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const countries = useMemo(() => countryOptions(uiLang), [uiLang])

  if (!saved || !draft) {
    return (
      <Panel title="Profile" subtitle="How the rest of Kinjy sees you.">
        <PanelState loading={loading} error={loadError}>
          {null}
        </PanelState>
      </Panel>
    )
  }

  const patch = changesBetween(draft, saved)
  const dirty = Object.keys(patch).length > 0
  const problems = draftProblems(draft)
  const valid = Object.keys(problems).length === 0

  const set = <K extends DraftField>(field: K, value: ProfileDraft[K]) => {
    setSavedNotice(false)
    setDraft((current) => (current ? { ...current, [field]: value } : current))
  }

  const text = (field: DraftField) => ({
    id: `profile-${field}`,
    value: draft[field] as string,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      set(field, event.target.value),
    'aria-invalid': Boolean(problems[field]) || undefined,
    'aria-describedby': `profile-${field}-note`,
  })

  const afterSave = async (sent: ProfileUpdate) => {
    announce('profile')
    // The name and interface language also live on the account (auth-service),
    // which is what the page header and menus read.
    if ('display_name' in sent || 'lang' in sent) await refresh()
    if (sent.lang && isAppLang(sent.lang)) setLang(sent.lang)
  }

  const save = async () => {
    if (!dirty || !valid) return
    setSaving(true)
    setSaveError(null)
    try {
      const updated = await kaluta.account.updateProfile(patch)
      setSaved(updated)
      setDraft(draftFrom(updated))
      setSavedNotice(true)
      await afterSave(patch)
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Your profile could not be saved')
    } finally {
      setSaving(false)
    }
  }

  // Only the saved copy moves: unsaved text edits stay in the form.
  const changeImage = (key: 'avatar_asset_id' | 'cover_asset_id') => async (assetId: string | null) => {
    const sent: ProfileUpdate = { [key]: assetId }
    setSaved(await kaluta.account.updateProfile(sent))
    await afterSave(sent)
  }

  const bioLength = lengthOf(draft.bio.trim())

  return (
    <div className="space-y-5">
      <Panel
        title="Photos"
        subtitle="Changes here are saved straight away."
        action={
          <Link
            to={`/u/${saved.handle}`}
            className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-text-mid transition-colors hover:text-gold-soft"
          >
            View profile
            <ExternalLink size={12} aria-hidden="true" />
          </Link>
        }
      >
        <div className="space-y-6">
          <ProfileImagePicker
            purpose="avatar"
            url={saved.avatar_url}
            displayName={saved.display_name}
            onChange={changeImage('avatar_asset_id')}
            disabled={saving}
          />
          <ProfileImagePicker
            purpose="cover"
            url={saved.cover_url}
            displayName={saved.display_name}
            onChange={changeImage('cover_asset_id')}
            disabled={saving}
          />
        </div>
      </Panel>

      <Panel title="Profile" subtitle="How the rest of Kinjy sees you.">
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            void save()
          }}
        >
          <fieldset disabled={saving} className="space-y-5">
            <Field id="profile-display_name" label="Display name" problem={problems.display_name}>
              <input {...text('display_name')} className={inputClass} autoComplete="name" />
            </Field>

            <Field
              id="profile-bio"
              label="Bio"
              problem={problems.bio}
              counter={`${bioLength} / ${PROFILE_LIMITS.bio}`}
              hint="Anyone can read your bio, younger members included, so keep it suitable for all ages."
            >
              <textarea {...text('bio')} rows={4} className={cn(inputClass, 'resize-y')} />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="profile-country" label="Country" hint="Shown on your profile.">
                <select {...text('country')} className={inputClass} autoComplete="country">
                  <option value="">Not shown</option>
                  {countries.map(({ code, name }) => (
                    <option key={code} value={code}>
                      {name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field id="profile-state" label="State or region" problem={problems.state}>
                <input {...text('state')} className={inputClass} autoComplete="address-level1" />
              </Field>
              <Field id="profile-city" label="City" problem={problems.city}>
                <input {...text('city')} className={inputClass} autoComplete="address-level2" />
              </Field>
              {mayAddNeighborhood && (
                <Field
                  id="profile-neighborhood"
                  label="Neighbourhood"
                  problem={problems.neighborhood}
                  hint="Only you can see this. It is never shown on your profile."
                >
                  <input {...text('neighborhood')} className={inputClass} autoComplete="address-level3" />
                </Field>
              )}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                id="profile-languages"
                label="Languages you speak"
                problem={problems.languages}
                hint="Most fluent first. Shown on your profile."
              >
                <SpokenLanguages
                  id="profile-languages"
                  value={draft.languages}
                  locale={uiLang}
                  onChange={(next) => set('languages', next)}
                  disabled={saving}
                  describedBy="profile-languages-note"
                />
              </Field>
              <Field id="profile-lang" label="Kinjy's language" hint="The language menus and messages appear in.">
                <select {...text('lang')} className={inputClass}>
                  {LANGUAGES.map((language) => (
                    <option key={language.code} value={language.code}>
                      {language.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {saveError && (
              <p role="alert" className="rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {saveError}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2 border-t border-[var(--cloud-border)] pt-5">
              <button
                type="submit"
                disabled={!dirty || !valid || saving}
                className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-5 py-2.5 text-sm font-semibold text-ink transition-opacity disabled:opacity-40"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              {dirty && (
                <button
                  type="button"
                  onClick={() => {
                    setDraft(draftFrom(saved))
                    setSaveError(null)
                  }}
                  className="rounded-full border border-[var(--cloud-border)] px-5 py-2.5 text-sm font-semibold text-text-mid transition-colors hover:text-text-hi"
                >
                  Discard
                </button>
              )}
              <span aria-live="polite" className="ms-1 text-sm text-emerald-200">
                {savedNotice && !dirty && (
                  <span className="inline-flex items-center gap-1.5">
                    <Check size={14} aria-hidden="true" />
                    Saved
                  </span>
                )}
              </span>
            </div>
          </fieldset>
        </form>
      </Panel>
    </div>
  )
}
