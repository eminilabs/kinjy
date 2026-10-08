import { useId, useState } from 'react'
import { useAppTheme } from '@/components/appdemo/theme'
import { cn } from '@/lib/utils'
import { GENDER_OPTIONS, type FormValues } from './formValues'

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: (props: { id: string; 'aria-describedby'?: string }) => React.ReactNode
}) {
  const id = useId()
  const { tok } = useAppTheme()
  return (
    <div>
      <label htmlFor={id} className={cn('mb-1 block text-xs font-semibold', tok.mid)}>
        {label}
      </label>
      {children({ id, 'aria-describedby': hint ? `${id}-hint` : undefined })}
      {hint && (
        <p id={`${id}-hint`} className={cn('mt-1 text-[0.7rem]', tok.low)}>
          {hint}
        </p>
      )}
    </div>
  )
}

/**
 * The fields of a person, for adding someone and for editing them.
 *
 * It only collects and sends; whether the dates make sense, whether the name is
 * allowed and whether this person may be changed are the server's to say, and its
 * answer is shown as it comes. The one check made here is the one a phone keyboard
 * makes easy to get wrong: the death date cannot be set before the birth date.
 */
export default function PersonForm({
  initial,
  submitLabel,
  busy,
  error,
  onSubmit,
  onCancel,
  extra,
  ready = true,
}: {
  initial: FormValues
  submitLabel: string
  busy: boolean
  error: string | null
  onSubmit: (values: FormValues) => void
  onCancel?: () => void
  /** Questions that belong to what is being added, shown before the buttons. */
  extra?: React.ReactNode
  /** False while a required extra question is unanswered. */
  ready?: boolean
}) {
  const { tok } = useAppTheme()
  const [v, setV] = useState<FormValues>(initial)
  const today = new Date().toISOString().slice(0, 10)
  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) => setV((current) => ({ ...current, [key]: value }))
  const backwards = Boolean(v.deceased && v.birth_date && v.death_date && v.death_date < v.birth_date)
  const input = cn('w-full rounded-card-sm px-3 py-2 text-sm placeholder:text-text-low focus:border-gold/50 focus:outline-none', tok.input, tok.text)

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (!v.given_name.trim() || backwards || !ready) return
        onSubmit(v)
      }}
      className="space-y-3"
      noValidate
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Given name *">
          {(p) => (
            <input
              {...p}
              value={v.given_name}
              onChange={(e) => set('given_name', e.target.value)}
              maxLength={120}
              required
              autoComplete="off"
              className={input}
            />
          )}
        </Field>
        <Field label="Family name">
          {(p) => <input {...p} value={v.family_name} onChange={(e) => set('family_name', e.target.value)} maxLength={120} autoComplete="off" className={input} />}
        </Field>
      </div>
      <Field label="Other names" hint="A maiden name, a nickname, another spelling.">
        {(p) => <input {...p} value={v.other_names} onChange={(e) => set('other_names', e.target.value)} maxLength={255} autoComplete="off" className={input} />}
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Born">
          {(p) => <input {...p} type="date" max={today} value={v.birth_date} onChange={(e) => set('birth_date', e.target.value)} className={input} />}
        </Field>
        <Field label="Place of birth">
          {(p) => <input {...p} value={v.birth_place} onChange={(e) => set('birth_place', e.target.value)} maxLength={200} autoComplete="off" className={input} />}
        </Field>
      </div>
      <Field label="Gender" hint="As they would say it. It is never guessed, and it does not decide who is a father or a mother.">
        {(p) => (
          <select {...p} value={v.gender} onChange={(e) => set('gender', e.target.value)} className={input}>
            {GENDER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
            {v.gender && !GENDER_OPTIONS.some((option) => option.value === v.gender) && <option value={v.gender}>{v.gender} (as entered)</option>}
          </select>
        )}
      </Field>
      <label className={cn('flex items-start gap-2 text-sm', tok.mid)}>
        <input type="checkbox" checked={v.deceased} onChange={(e) => set('deceased', e.target.checked)} className="mt-0.5" />
        <span>
          Deceased
          <span className={cn('block text-xs', tok.low)}>Three close relatives must confirm a person who has died.</span>
        </span>
      </label>
      {v.deceased && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Died">
            {(p) => <input {...p} type="date" max={today} min={v.birth_date || undefined} value={v.death_date} onChange={(e) => set('death_date', e.target.value)} className={input} />}
          </Field>
          <Field label="Place of death">
            {(p) => <input {...p} value={v.death_place} onChange={(e) => set('death_place', e.target.value)} maxLength={200} autoComplete="off" className={input} />}
          </Field>
        </div>
      )}
      {backwards && (
        <p role="alert" className="text-xs text-warning">
          The death date is before the birth date.
        </p>
      )}
      <Field label="Biography" hint={`${v.biography.length} / 5000`}>
        {(p) => <textarea {...p} value={v.biography} onChange={(e) => set('biography', e.target.value)} maxLength={5000} rows={4} className={input} />}
      </Field>

      {extra}

      {error && (
        <p role="alert" className="text-sm text-red-200">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={busy || !v.given_name.trim() || backwards || !ready}
          className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-5 py-2 text-sm font-bold text-ink disabled:opacity-40"
        >
          {busy ? 'Saving…' : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className={cn('rounded-full border border-white/15 px-5 py-2 text-sm font-semibold disabled:opacity-40', tok.mid, tok.hoverBg)}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
