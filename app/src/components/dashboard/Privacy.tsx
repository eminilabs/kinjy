import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight, Eye, MessageSquare, Sparkles, TreeDeciduous, UserPlus, UsersRound } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { ApiError, kaluta } from '@/lib/api'
import { FEATURES, type Feature } from '@/lib/features'
import { announce, onChange } from '@/lib/live'
import { Badge, Panel, PanelState, Segmented, SettingRow, Switch } from './primitives'

const CHOICES = [
  { id: 'everyone', label: 'Anyone' },
  { id: 'connections', label: 'Connections only' },
  { id: 'nobody', label: 'No one' },
] as const

interface Control {
  key: string
  icon: LucideIcon
  title: string
  hint: string
  /** Defaults to CHOICES. The family tree asks a different question. */
  choices?: ReadonlyArray<{ id: string; label: string }>
  fallback?: string
  /** A setting about a feature that is switched off is not shown either. */
  feature?: Feature
}

/** Who may read your family tree. "No one" is not offered here — closing the
 *  tree entirely is the separate switch below, so the two are not confused. */
const FAMILY_CHOICES = [
  { id: 'family', label: 'Your family' },
  { id: 'connections', label: 'Connections' },
  { id: 'everyone', label: 'Anyone' },
] as const

const ALL_CONTROLS: Control[] = [
  {
    key: 'who_can_invite',
    icon: UserPlus,
    title: 'Send you a connection invitation',
    hint: 'Following you is always open — following is one-way and public.',
  },
  {
    key: 'who_can_message',
    icon: MessageSquare,
    title: 'Message you',
    hint: 'Enforced by messaging-service, not just hidden in the UI.',
  },
  {
    key: 'who_can_add_family',
    icon: TreeDeciduous,
    title: 'Add you to a family tree',
    hint: 'A relationship claim still needs your confirmation on top of this.',
    feature: 'familyTree',
  },
  {
    key: 'who_can_add_community',
    icon: UsersRound,
    title: 'Add you to a community',
    hint: 'Stops someone dropping you into a group you never asked for.',
  },
  {
    key: 'who_can_see_family',
    icon: TreeDeciduous,
    title: 'See your family tree',
    hint: 'Applied by family-service on every read — names, dates and relationships, including the dead. "Your family" means people who share the graph with you.',
    choices: FAMILY_CHOICES,
    fallback: 'family',
    feature: 'familyTree',
  },
]

const CONTROLS = ALL_CONTROLS.filter((control) => !control.feature || FEATURES[control.feature])

/**
 * Privacy — who may reach you.
 *
 * The invitations and connections themselves are managed on /connections; this
 * tab keeps the rules and a pointer there, so there is one place to act on a
 * person rather than two that can each do half of it.
 */
export default function Privacy() {
  const prefs = useApi<Record<string, unknown>>(() => kaluta.account.preferences(), [])
  const connections = useApi(() => kaluta.connections.list(), [])
  const [saving, setSaving] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => onChange('connections', connections.reload), [connections.reload])

  const set = async (key: string, value: string | boolean) => {
    setSaving(key)
    setNote(null)
    try {
      await kaluta.account.setPreferences({ [key]: value })
      prefs.reload()
      // The assistant orb lives outside this tree; tell it to re-read.
      if (key === 'assistant_visible') announce('profile')
    } catch (err) {
      setNote(err instanceof ApiError ? err.message : 'Could not save that setting')
    } finally {
      setSaving(null)
    }
  }

  const incoming = connections.data?.incoming.length ?? 0
  const accepted = connections.data?.accepted.length ?? 0

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
      <Panel
        title="Who can reach you"
        subtitle="Following is always open. Everything below is your call."
      >
        <PanelState loading={prefs.loading} error={prefs.error}>
          <ul>
            {CONTROLS.map((control, i) => {
              const value = String(prefs.data?.[control.key] ?? control.fallback ?? 'connections')
              const choices = control.choices ?? CHOICES
              return (
                <SettingRow
                  key={control.key}
                  icon={control.icon}
                  tone={(['gold', 'sky', 'coral', 'emerald'] as const)[i % 4]}
                  title={control.title}
                  hint={control.hint}
                  saving={saving === control.key}
                >
                  <Segmented
                    value={value}
                    options={choices}
                    disabled={saving === control.key}
                    onChange={(next) => set(control.key, next)}
                  />
                </SettingRow>
              )
            })}

            {FEATURES.assistant && (
              <SettingRow
                icon={Sparkles}
                tone="coral"
                title="Show the Kinjy Assistant"
                hint="The floating orb. Turning it off hides it everywhere — it is always-on-top UI, so dismissing it should be a real setting, not a close button that comes back."
                control={
                  <Switch
                    label="Show the Kinjy Assistant"
                    checked={Boolean(prefs.data?.assistant_visible ?? true)}
                    onChange={(next) => set('assistant_visible', next)}
                  />
                }
              />
            )}

            <SettingRow
              icon={Eye}
              tone="sky"
              title="Suggest me to other members"
              hint="Turning this off keeps you out of the “People to follow” rail. It does not hide your posts — visibility per post is set when you publish."
              control={
                <Switch
                  label="Suggest me to other members"
                  checked={Boolean(prefs.data?.discoverable ?? true)}
                  onChange={(next) => set('discoverable', next)}
                />
              }
            />

            {FEATURES.familyTree && (
              <SettingRow
                icon={TreeDeciduous}
                tone="emerald"
                title="Share your family tree at all"
                hint="Turning this off closes the tree to everyone regardless of the audience above, without losing the choice you made there. You always keep full access to the people you added yourself."
                control={
                  <Switch
                    label="Share your family tree at all"
                    checked={Boolean(prefs.data?.family_tree_shared ?? true)}
                    onChange={(next) => set('family_tree_shared', next)}
                  />
                }
              />
            )}
          </ul>
        </PanelState>
      </Panel>

      <Panel
        title="Connections"
        subtitle={`Accepting an invitation is what opens messaging, ${FEATURES.familyTree ? 'family links ' : ''}and community invites.`}
        action={incoming > 0 ? <Badge tone="warn">{incoming} waiting</Badge> : undefined}
      >
        <PanelState loading={connections.loading} error={connections.error}>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-text-hi/[0.05] p-4">
              <p className="mono-data text-[2rem] font-bold leading-none text-gold-soft">{incoming}</p>
              <p className="mt-2 text-sm text-text-low">{incoming === 1 ? 'invitation' : 'invitations'} waiting</p>
            </div>
            <div className="rounded-2xl bg-text-hi/[0.05] p-4">
              <p className="mono-data text-[2rem] font-bold leading-none text-text-hi">{accepted}</p>
              <p className="mt-2 text-sm text-text-low">{accepted === 1 ? 'connection' : 'connections'}</p>
            </div>
          </div>
          <Link
            to={incoming > 0 ? '/connections?tab=incoming' : '/connections'}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-gold-soft to-gold px-6 py-3 text-sm font-bold text-ink"
          >
            Manage your connections
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </PanelState>
      </Panel>

      {note && <p className="rounded-2xl bg-gold/10 px-5 py-3 text-sm text-text-hi lg:col-span-2">{note}</p>}
    </div>
  )
}
