import { X } from 'lucide-react'
import { PROFILE_LIMITS, SUGGESTED_LANGUAGES, languageName } from '@/lib/profileOptions'
import { inputClass } from './primitives'
import { cn } from '@/lib/utils'

interface SpokenLanguagesProps {
  id: string
  value: string[]
  /** Locale the language names are written in. */
  locale: string
  onChange: (next: string[]) => void
  disabled?: boolean
  describedBy?: string
}

/** The languages a member speaks, most fluent first, as removable chips. */
export default function SpokenLanguages({
  id,
  value,
  locale,
  onChange,
  disabled = false,
  describedBy,
}: SpokenLanguagesProps) {
  const full = value.length >= PROFILE_LIMITS.languages
  const available = SUGGESTED_LANGUAGES.filter((code) => !value.includes(code))
    .map((code) => ({ code, name: languageName(code, locale) }))
    .sort((a, b) => a.name.localeCompare(b.name, locale))

  return (
    <div>
      {value.length > 0 && (
        <ul className="mb-2.5 flex flex-wrap gap-1.5" aria-label="Languages you speak">
          {value.map((code, index) => {
            const name = languageName(code, locale)
            return (
              <li
                key={code}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full py-1 pe-1.5 ps-3 text-xs font-semibold',
                  index === 0 ? 'bg-gold/15 text-gold-soft ring-1 ring-gold/40' : 'bg-white/8 text-text-mid',
                )}
              >
                {name}
                <button
                  type="button"
                  onClick={() => onChange(value.filter((c) => c !== code))}
                  disabled={disabled}
                  aria-label={`Remove ${name}`}
                  className="rounded-full p-0.5 transition-colors hover:bg-white/10 disabled:opacity-40"
                >
                  <X size={12} aria-hidden="true" />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <select
        id={id}
        className={inputClass}
        value=""
        disabled={disabled || full}
        aria-describedby={describedBy}
        onChange={(event) => {
          if (event.target.value) onChange([...value, event.target.value])
        }}
      >
        <option value="">{full ? `Up to ${PROFILE_LIMITS.languages} languages` : 'Add a language…'}</option>
        {available.map(({ code, name }) => (
          <option key={code} value={code}>
            {name}
          </option>
        ))}
      </select>
    </div>
  )
}
