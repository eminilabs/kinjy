import { useEffect, useState } from 'react'
import { Baby, Gauge, Hash, PlayCircle, Timer, X } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { ApiError, kaluta, type WellbeingStatus } from '@/lib/api'
import { Panel, PanelState, inputClass } from './primitives'
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

  const Toggle = ({
    id,
    icon: Icon,
    title,
    hint,
    checked,
  }: {
    id: string
    icon: typeof Gauge
    title: string
    hint: string
    checked: boolean
  }) => (
    <label className="flex cursor-pointer items-start gap-3">
      <Icon size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-gold-soft" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-text-hi">{title}</span>
        <span className="caption block">{hint}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={saving === id}
        onChange={(event) => set(id, event.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 accent-gold"
      />
    </label>
  )

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel title="Data and media" subtitle="What gets downloaded, and when.">
        <PanelState loading={prefs.loading} error={prefs.error}>
          <div className="space-y-4">
            <Toggle
              id="data_saver"
              icon={Gauge}
              title="Data saver"
              hint="Video and audio arrive without their URL — the feed sends one attachment per post and nothing heavy loads until you tap it. Enforced by social-service, so the bytes never leave the server."
              checked={dataSaver}
            />
            <Toggle
              id="autoplay_media"
              icon={PlayCircle}
              title="Autoplay video"
              hint="Off means a clip waits for you to press play, and its file is not preloaded."
              checked={autoplay}
            />
          </div>
        </PanelState>
      </Panel>

      <Panel
        title="What you want more of"
        subtitle="Declared, not guessed — and it shows up by name in “Why am I seeing this?”."
      >
        <PanelState loading={prefs.loading} error={prefs.error}>
          <div className="flex items-start gap-3">
            <Hash size={16} aria-hidden="true" className="mt-1 shrink-0 text-gold-soft" />
            <div className="min-w-0 flex-1">
              <ul className="flex flex-wrap gap-1.5">
                {interests.map((topic) => (
                  <li key={topic}>
                    <button
                      type="button"
                      disabled={saving === 'interest_topics'}
                      onClick={() => set('interest_topics', interests.filter((t) => t !== topic))}
                      className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 text-[0.7rem] font-semibold text-gold-soft transition-colors hover:bg-gold/20"
                    >
                      #{topic}
                      <X size={11} aria-hidden="true" />
                    </button>
                  </li>
                ))}
                {interests.length === 0 && (
                  <li className="caption">Nothing yet — the feed leans on who you follow.</li>
                )}
              </ul>

              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  const value = topicDraft.trim().replace(/^#/, '').toLowerCase()
                  if (!value || interests.includes(value)) return
                  setTopicDraft('')
                  void set('interest_topics', [...interests, value])
                }}
                className="mt-3 flex gap-2"
              >
                <input
                  value={topicDraft}
                  onChange={(event) => setTopicDraft(event.target.value)}
                  placeholder="agriculture"
                  aria-label="Add a topic"
                  className={cn(inputClass, 'flex-1')}
                />
                <button
                  type="submit"
                  disabled={!topicDraft.trim() || saving === 'interest_topics'}
                  className="shrink-0 rounded-full border border-white/12 px-4 text-xs font-semibold text-text-mid transition-colors hover:border-gold/40 hover:text-gold-soft disabled:opacity-40"
                >
                  Add
                </button>
              </form>

              <p className="caption mt-2">
                A topic here matches the same hashtags posts carry, so #Agriculture and the topics
                box are one thing to the ranker.
              </p>
            </div>
          </div>
        </PanelState>
      </Panel>

      <Panel
        title="Your default feed"
        subtitle="Where Kinjy opens, and which algorithm orders it."
      >
        <PanelState loading={prefs.loading} error={prefs.error}>
          <div className="space-y-4">
            <label className="block">
              <span className="caption mb-1 block">Opening mode</span>
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
              <span className="caption mb-1 block">Ranking algorithm</span>
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
              <span className="caption mt-1 block">
                Only used by the modes that rank. A chronological mode stays chronological — it
                would be dishonest to name an algorithm that never ran.
              </span>
            </label>
          </div>
        </PanelState>
      </Panel>

      <Panel title="Age mode" subtitle="Applied when the feed is built, not after.">
        <PanelState loading={prefs.loading} error={prefs.error}>
          <div className="flex items-start gap-3">
            <Baby size={16} aria-hidden="true" className="mt-1 shrink-0 text-gold-soft" />
            <div className="min-w-0 flex-1 space-y-1.5">
              {AGE_MODES.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  disabled={saving === 'age_mode'}
                  onClick={() => set('age_mode', mode.id)}
                  className={cn(
                    'block w-full rounded-card-sm border px-3 py-2 text-start transition-colors',
                    ageMode === mode.id
                      ? 'border-gold/50 bg-gold/10'
                      : 'border-white/10 hover:bg-white/5',
                  )}
                >
                  <span className="block text-sm font-medium text-text-hi">{mode.label}</span>
                  <span className="caption block">{mode.hint}</span>
                </button>
              ))}
              <p className="caption pt-1">
                A post excluded this way is never selected, never serialised and never sent — a
                direct link to one answers 404 as well.
              </p>
            </div>
          </div>
        </PanelState>
      </Panel>

      <Panel
        title="Time on Kinjy"
        subtitle="Counted on the server, so it survives a reload or a second tab."
        className="lg:col-span-2"
      >
        <PanelState loading={prefs.loading} error={prefs.error}>
          <div className="space-y-4">
            <Toggle
              id="wellbeing_enabled"
              icon={Timer}
              title="Track my daily time"
              hint="Only counted while the tab is in front. Crossing the limit shows a notice — Kinjy will not lock you out of your own account."
              checked={wellbeingOn}
            />

            {wellbeingOn && (
              <div className="flex flex-wrap items-end gap-3">
                <label className="block">
                  <span className="caption mb-1 block">Daily limit (minutes)</span>
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
                    className={cn(inputClass, 'w-40')}
                  />
                </label>

                {wellbeing && (
                  <p className="caption pb-2.5">
                    <span className="mono-data text-text-hi">
                      {Math.round(wellbeing.minutes_today)} min
                    </span>{' '}
                    today
                    {wellbeing.remaining_minutes !== null && !wellbeing.over_limit && (
                      <> · {Math.round(wellbeing.remaining_minutes)} min left</>
                    )}
                    {wellbeing.over_limit && <span className="text-gold-soft"> · limit passed</span>}
                  </p>
                )}
              </div>
            )}
          </div>
        </PanelState>
      </Panel>

      {note && (
        <p role="alert" className="text-sm text-red-300 lg:col-span-2">
          {note}
        </p>
      )}
    </div>
  )
}
