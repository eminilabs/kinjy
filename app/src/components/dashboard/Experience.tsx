import { useEffect, useState } from 'react'
import { Check, Gauge, Hash, PlayCircle, Timer, X } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { ApiError, kaluta, type WellbeingStatus } from '@/lib/api'
import { Panel, PanelState, SettingRow, Switch, inputClass } from './primitives'
import { cn } from '@/lib/utils'

const AGE_MODES = [
  { id: 'adult', label: 'Adult', hint: 'No age filtering.' },
  { id: 'teen', label: 'Teen', hint: 'Posts declared adult are excluded.' },
  { id: 'child', label: 'Child', hint: 'Same filter, stricter defaults.' },
] as const

/**
 * Experience — data, age and time.
 *
 * These three sat in the database with nothing reading them, which is worse
 * than not offering them: a member reasonably believes a saved setting does
 * something. Each one is now enforced by a service, and each line below says
 * *where*, so the promise on screen matches the code.
 */
export default function Experience() {
  const prefs = useApi<Record<string, unknown>>(() => kaluta.account.preferences(), [])
  const [wellbeing, setWellbeing] = useState<WellbeingStatus | null>(null)
  const modes = useApi(async () => (await kaluta.feeds.modes()).modes, [])
  const algorithms = useApi(async () => (await kaluta.feeds.algorithms()).items, [])
  const [topicDraft, setTopicDraft] = useState('')
  const [saving, setSaving] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => {
    kaluta.account
      .wellbeing()
      .then(setWellbeing)
      .catch(() => undefined)
  }, [prefs.data])

  const set = async (key: string, value: unknown) => {
    setSaving(key)
    setNote(null)
    try {
      await kaluta.account.setPreferences({ [key]: value })
      prefs.reload()
    } catch (err) {
      setNote(err instanceof ApiError ? err.message : 'Could not save that setting')
    } finally {
      setSaving(null)
    }
  }

  const data = prefs.data ?? {}
  const dataSaver = Boolean(data.data_saver)
  const autoplay = data.autoplay_media !== false
  const ageMode = String(data.age_mode ?? 'adult')
  const wellbeingOn = Boolean(data.wellbeing_enabled)
  const limit = Number(data.daily_limit_minutes ?? 0)
  const interests = Array.isArray(data.interest_topics) ? (data.interest_topics as string[]) : []

  const switchRow = (
    id: string,
    icon: typeof Gauge,
    tone: 'gold' | 'sky' | 'coral' | 'emerald',
    title: string,
    hint: string,
    checked: boolean,
  ) => (
    <SettingRow
      icon={icon}
      tone={tone}
      title={title}
      hint={hint}
      saving={saving === id}
      control={<Switch label={title} checked={checked} disabled={saving === id} onChange={(next) => set(id, next)} />}
    />
  )

  const label = 'mb-2 block text-sm font-semibold text-text-mid'
  const usedPct =
    wellbeing && limit > 0 ? Math.min(100, (wellbeing.minutes_today / limit) * 100) : 0

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-2">
      <Panel title="Data and media" subtitle="What gets downloaded, and when.">
        <PanelState loading={prefs.loading} error={prefs.error}>
          <ul>
            {switchRow(
              'data_saver',
              Gauge,
              'sky',
              'Data saver',
              'Video and audio arrive without their URL — the feed sends one attachment per post and nothing heavy loads until you tap it. Enforced by social-service, so the bytes never leave the server.',
              dataSaver,
            )}
            {switchRow(
              'autoplay_media',
              PlayCircle,
              'coral',
              'Autoplay video',
              'Off means a clip waits for you to press play, and its file is not preloaded.',
              autoplay,
            )}
          </ul>
        </PanelState>
      </Panel>

      <Panel
        title="What you want more of"
        subtitle="Declared, not guessed — and it shows up by name in “Why am I seeing this?”."
      >
        <PanelState loading={prefs.loading} error={prefs.error}>
          <div className="min-h-[3rem]">
            {interests.length === 0 ? (
              <div className="flex items-center gap-3 rounded-2xl bg-text-hi/[0.05] px-4 py-3 text-sm text-text-low">
                <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gold/20 text-gold-soft">
                  <Hash size={16} />
                </span>
                Nothing yet — the feed leans on who you follow.
              </div>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {interests.map((topic) => (
                  <li key={topic}>
                    <button
                      type="button"
                      disabled={saving === 'interest_topics'}
                      onClick={() => set('interest_topics', interests.filter((t) => t !== topic))}
                      className="inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-3.5 py-1.5 text-sm font-semibold text-gold-soft hover:bg-gold/25"
                    >
                      #{topic}
                      <X size={13} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault()
              const value = topicDraft.trim().replace(/^#/, '').toLowerCase()
              if (!value || interests.includes(value)) return
              setTopicDraft('')
              void set('interest_topics', [...interests, value])
            }}
            className="mt-4 flex gap-2"
          >
            <input
              value={topicDraft}
              onChange={(event) => setTopicDraft(event.target.value)}
              placeholder="agriculture"
              aria-label="Add a topic"
              className={cn(inputClass, 'flex-1 !rounded-full')}
            />
            <button
              type="submit"
              disabled={!topicDraft.trim() || saving === 'interest_topics'}
              className="shrink-0 rounded-full bg-gradient-to-br from-gold-soft to-gold px-6 py-3 text-sm font-bold text-ink disabled:opacity-40"
            >
              Add
            </button>
          </form>

          <p className="mt-3 text-sm leading-relaxed text-text-low">
            A topic here matches the same hashtags posts carry, so #Agriculture and the topics
            box are one thing to the ranker.
          </p>
        </PanelState>
      </Panel>

      <Panel
        title="Your default feed"
        subtitle="Where Kinjy opens, and which algorithm orders it."
      >
        <PanelState loading={prefs.loading} error={prefs.error}>
          <div className="space-y-5">
            <label className="block">
              <span className={label}>Opening mode</span>
              <select
                value={String(data.default_feed_mode ?? 'following')}
                disabled={saving === 'default_feed_mode'}
                onChange={(event) => set('default_feed_mode', event.target.value)}
                className={inputClass}
              >
                {(modes.data ?? []).map((mode) => (
                  <option key={mode.id} value={mode.id}>
                    {mode.label}
                    {mode.ranked ? ' · ranked' : ' · chronological'}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className={label}>Ranking algorithm</span>
              <select
                value={String(data.algorithm_id ?? 'chronological')}
                disabled={saving === 'algorithm_id'}
                onChange={(event) => set('algorithm_id', event.target.value)}
                className={inputClass}
              >
                {(algorithms.data ?? []).map((algo) => (
                  <option key={algo.id} value={algo.id}>
                    {algo.name}
                  </option>
                ))}
              </select>
              <span className="mt-2 block text-sm leading-relaxed text-text-low">
                Only used by the modes that rank. A chronological mode stays chronological — it
                would be dishonest to name an algorithm that never ran.
              </span>
            </label>
          </div>
        </PanelState>
      </Panel>

      <Panel title="Age mode" subtitle="Applied when the feed is built, not after.">
        <PanelState loading={prefs.loading} error={prefs.error}>
          <div role="radiogroup" aria-label="Age mode" className="space-y-2">
            {AGE_MODES.map((mode) => {
              const active = ageMode === mode.id
              return (
                <button
                  key={mode.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={saving === 'age_mode'}
                  onClick={() => set('age_mode', mode.id)}
                  className={cn(
                    'flex w-full items-center gap-4 rounded-2xl border px-4 py-3.5 text-start transition-colors',
                    active ? 'border-gold/60 bg-gold/10' : 'border-[var(--cloud-border)] hover:bg-text-hi/[0.05]',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'grid h-6 w-6 shrink-0 place-items-center rounded-full border-2',
                      active ? 'border-gold bg-gold text-ink' : 'border-text-low/50',
                    )}
                  >
                    {active && <Check size={13} />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[0.98rem] font-semibold text-text-hi">{mode.label}</span>
                    <span className="block text-sm text-text-low">{mode.hint}</span>
                  </span>
                </button>
              )
            })}
          </div>
          <p className="mt-4 text-sm leading-relaxed text-text-low">
            A post excluded this way is never selected, never serialised and never sent — a
            direct link to one answers 404 as well.
          </p>
        </PanelState>
      </Panel>

      <Panel
        title="Time on Kinjy"
        subtitle="Counted on the server, so it survives a reload or a second tab."
        className="lg:col-span-2"
      >
        <PanelState loading={prefs.loading} error={prefs.error}>
          <ul>
            {switchRow(
              'wellbeing_enabled',
              Timer,
              'emerald',
              'Track my daily time',
              'Only counted while the tab is in front. Crossing the limit shows a notice — Kinjy will not lock you out of your own account.',
              wellbeingOn,
            )}
          </ul>

          {wellbeingOn && (
            <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-5 border-t border-[var(--cloud-border)] pt-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-end">
              <label className="block">
                <span className={label}>Daily limit (minutes)</span>
                <input
                  type="number"
                  min={5}
                  max={720}
                  step={5}
                  defaultValue={limit || 60}
                  disabled={saving === 'daily_limit_minutes'}
                  onBlur={(event) => {
                    const value = Number(event.target.value)
                    if (value && value !== limit) set('daily_limit_minutes', value)
                  }}
                  className={cn(inputClass, 'sm:w-44')}
                />
              </label>

              {wellbeing && (
                <div>
                  <p className="text-sm text-text-low">
                    <span className="mono-data font-bold text-text-hi">{Math.round(wellbeing.minutes_today)} min</span>{' '}
                    today
                    {wellbeing.remaining_minutes !== null && !wellbeing.over_limit && (
                      <> · {Math.round(wellbeing.remaining_minutes)} min left</>
                    )}
                    {wellbeing.over_limit && <span className="font-semibold text-gold-soft"> · limit passed</span>}
                  </p>
                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-text-hi/10">
                    <div className="h-full rounded-full bg-gradient-to-r from-gold-soft to-gold" style={{ width: `${usedPct}%` }} />
                  </div>
                </div>
              )}
            </div>
          )}
        </PanelState>
      </Panel>

      {note && (
        <p role="alert" className="rounded-2xl bg-danger/10 px-5 py-3 text-sm text-danger lg:col-span-2">
          {note}
        </p>
      )}
    </div>
  )
}
