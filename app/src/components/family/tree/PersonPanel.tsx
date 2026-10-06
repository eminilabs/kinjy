import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, ArrowLeft, Crosshair, GitBranch, Link2, Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { useAppTheme } from '@/components/appdemo/theme'
import { useApi } from '@/hooks/useApi'
import { ApiError, kaluta, type HowRelated, type PersonDetail, type RelativeKind } from '@/lib/api'
import { cn } from '@/lib/utils'
import LinkExisting from './LinkExisting'
import PersonForm from './PersonForm'
import { emptyValues, toFields, valuesFrom, type FormValues } from './formValues'
import StatusIcon from './Status'
import { STATUS_LABEL, fullName, initials, lifespan } from './layout'

const RELATIVES: Array<{ id: RelativeKind; label: string; note?: string }> = [
  { id: 'parent', label: 'Parent' },
  { id: 'adoptive_parent', label: 'Adoptive parent' },
  { id: 'child', label: 'Child' },
  { id: 'spouse', label: 'Partner' },
  { id: 'sibling', label: 'Sibling', note: 'For siblings whose parents are not in the tree. Otherwise add them as a child of the parent.' },
]

/** One link this person has, as they would read it: who, and as what. */
export interface PanelLink {
  id: string
  otherId: string
  otherName: string
  role: string
  /** The server says whether this caller may take the link back. */
  removable: boolean
}

type Mode =
  | { kind: 'view' }
  | { kind: 'edit' }
  | { kind: 'add'; relation: RelativeKind }
  | { kind: 'link' }
  | { kind: 'unlink'; link: PanelLink }
  | { kind: 'remove' }
  | { kind: 'dispute' }

const message = (err: unknown, fallback: string) => (err instanceof ApiError ? err.message : fallback)

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  const { tok } = useAppTheme()
  return (
    <div>
      <dt className={cn('text-[0.7rem] font-semibold uppercase tracking-wide', tok.low)}>{label}</dt>
      <dd className={cn('text-sm', tok.text)}>{children}</dd>
    </div>
  )
}

/**
 * The person you picked: who they are, how they are related to you, and what you
 * may do about them.
 *
 * What you may do is not worked out here. The server sends `permissions` with the
 * person, and the buttons follow it; a button that is missing is one the server
 * would refuse. Every action then goes through the server, whose answer is shown
 * as it comes - a refused date or a duplicate is its message, not a guess.
 */
export default function PersonPanel({
  personId,
  meId,
  links,
  onCentre,
  onChanged,
  onRemoved,
  onShowPath,
  onClose,
}: {
  personId: string
  /** The caller's own node, to say how this person relates to them. */
  meId: string | null
  /** The links this person has in the tree being shown. */
  links: PanelLink[]
  onCentre: (personId: string) => void
  /** Something about the tree changed: reload it. */
  onChanged: () => void
  onRemoved: (personId: string) => void
  onShowPath: (ids: string[] | undefined) => void
  /** Present on a phone, where the panel is a screen of its own. */
  onClose?: () => void
}) {
  const { tok } = useAppTheme()
  const detail = useApi<PersonDetail>(() => kaluta.family.person(personId), [personId])
  const [mode, setMode] = useState<Mode>({ kind: 'view' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [why, setWhy] = useState('')
  const [path, setPath] = useState<HowRelated | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (onClose) heading.current?.focus()
  }, [onClose, detail.data])

  const person = detail.data
  const run = async (action: () => Promise<void>, failure: string) => {
    setBusy(true)
    setError(null)
    setNote(null)
    try {
      await action()
    } catch (err) {
      setError(message(err, failure))
    } finally {
      setBusy(false)
    }
  }

  const back = (
    <div className="mb-3 flex items-center justify-between gap-2">
      {onClose ? (
        <button type="button" onClick={onClose} className={cn('inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold', tok.mid, tok.hoverBg)}>
          <ArrowLeft size={13} aria-hidden="true" /> Back to the tree
        </button>
      ) : (
        <span />
      )}
    </div>
  )

  if (detail.loading && !person) {
    return (
      <div role="status" className={cn('rounded-card-lg p-5 text-sm', tok.card, tok.low)}>
        {back}Loading this person…
      </div>
    )
  }
  if (detail.error || !person) {
    const gone = detail.error?.toLowerCase().includes('not found')
    return (
      <div role="alert" className={cn('rounded-card-lg p-5', tok.card)}>
        {back}
        <p className="text-sm text-red-200">{gone ? 'This person is no longer in the tree.' : (detail.error ?? 'Could not load this person.')}</p>
        <div className="mt-3 flex gap-2">
          {!gone && (
            <button type="button" onClick={detail.reload} className="rounded-full border border-white/15 px-4 py-1.5 text-xs font-semibold text-text-hi">
              Try again
            </button>
          )}
          <button type="button" onClick={onClose ?? onChanged} className={cn('rounded-full border border-white/15 px-4 py-1.5 text-xs font-semibold', tok.mid)}>
            {onClose ? 'Close' : 'Refresh the tree'}
          </button>
        </div>
      </div>
    )
  }

  const perms = person.permissions
  const threshold = person.deceased ? 3 : 1
  const counts = person.counts
  const relatives = [
    counts.parents && `${counts.parents} ${counts.parents === 1 ? 'parent' : 'parents'}`,
    counts.spouses && `${counts.spouses} ${counts.spouses === 1 ? 'partner' : 'partners'}`,
    counts.siblings && `${counts.siblings} ${counts.siblings === 1 ? 'sibling' : 'siblings'}`,
    counts.children && `${counts.children} ${counts.children === 1 ? 'child' : 'children'}`,
  ].filter(Boolean)

  const afterChange = () => {
    detail.reload()
    onChanged()
  }

  const decide = (decision: 'confirm' | 'dispute') =>
    run(async () => {
      await kaluta.family.confirm(person.id, decision, decision === 'dispute' ? why.trim() || undefined : undefined)
      setMode({ kind: 'view' })
      setWhy('')
      afterChange()
    }, 'Could not record that.')

  const showPath = () =>
    run(async () => {
      if (!meId) return
      const found = await kaluta.family.howRelated(meId, person.id)
      setPath(found)
      onShowPath(found.related ? [meId, ...found.path.map((step) => step.person_id)] : undefined)
    }, 'Could not work out the path.')

  return (
    <article aria-labelledby="person-heading" className={cn('rounded-card-lg p-5', tok.card)}>
      {back}
      <header className="flex items-start gap-3">
        <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gold/15 text-base font-semibold text-gold-soft">
          {initials(person)}
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="person-heading" ref={heading} tabIndex={-1} className={cn('break-words text-lg font-semibold leading-tight outline-none', tok.text)}>
            {fullName(person)}
          </h2>
          <p className={cn('mt-0.5 flex flex-wrap items-center gap-x-2 text-xs', tok.low)}>
            <StatusIcon status={person.status} />
            {STATUS_LABEL[person.status ?? 'pending']}
            {person.deceased && <span>· Deceased</span>}
          </p>
        </div>
      </header>

      <dl className="mt-4 grid gap-3">
        {person.is_me ? (
          <Fact label="Relation">This is you</Fact>
        ) : (
          person.relation_to_me && <Fact label="Related to you as">{person.relation_to_me}</Fact>
        )}
        {lifespan(person) && <Fact label="Life">{lifespan(person)}</Fact>}
        {person.birth_place && <Fact label="Born in">{person.birth_place}</Fact>}
        {person.death_place && <Fact label="Died in">{person.death_place}</Fact>}
        {person.other_names && <Fact label="Also known as">{person.other_names}</Fact>}
        {person.gender && <Fact label="Gender">{person.gender}</Fact>}
        {relatives.length > 0 && <Fact label="In the tree">{relatives.join(' · ')}</Fact>}
        {person.biography && (
          <Fact label="About">
            <span className="whitespace-pre-wrap break-words">{person.biography}</span>
          </Fact>
        )}
      </dl>

      {note && <p role="status" className="mt-3 text-sm text-gold-soft">{note}</p>}
      {error && mode.kind === 'view' && (
        <p role="alert" className="mt-3 text-sm text-red-200">
          {error}
        </p>
      )}

      {mode.kind === 'view' && (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => onCentre(person.id)} className={cn('inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3.5 py-1.5 text-xs font-semibold', tok.text, tok.hoverBg)}>
              <Crosshair size={13} aria-hidden="true" /> See the tree from here
            </button>
            {meId && !person.is_me && person.relation_to_me && (
              <button type="button" disabled={busy} onClick={() => void showPath()} className={cn('inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3.5 py-1.5 text-xs font-semibold disabled:opacity-40', tok.text, tok.hoverBg)}>
                <GitBranch size={13} aria-hidden="true" /> How are we related?
              </button>
            )}
            {perms.can_edit && (
              <button type="button" onClick={() => setMode({ kind: 'edit' })} className={cn('inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3.5 py-1.5 text-xs font-semibold', tok.text, tok.hoverBg)}>
                <Pencil size={13} aria-hidden="true" /> Edit
              </button>
            )}
            {perms.can_delete && (
              <button type="button" onClick={() => setMode({ kind: 'remove' })} className="inline-flex items-center gap-1.5 rounded-full border border-red-400/40 px-3.5 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-400/10">
                <Trash2 size={13} aria-hidden="true" /> Remove
              </button>
            )}
          </div>

          {path && (
            <div className="mt-4 border-t border-white/10 pt-3">
              {path.related ? (
                <ol className="space-y-1.5 text-sm">
                  <li className={tok.text}>You</li>
                  {path.path.map((step, index) => (
                    <li key={`${step.person_id}-${index}`} className={cn('flex items-baseline gap-2', tok.mid)}>
                      <span aria-hidden="true" className="text-gold">↓</span>
                      <span className={cn('font-semibold', tok.text)}>{step.name ?? 'Someone'}</span>
                      <span className={tok.low}>{step.relation ?? step.step}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className={cn('text-sm', tok.mid)}>No known relation between you.</p>
              )}
            </div>
          )}

          {perms.can_link && (
            <section className="mt-5 border-t border-white/10 pt-4" aria-labelledby="add-relative">
              <h3 id="add-relative" className={cn('mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide', tok.mid)}>
                <Plus size={13} aria-hidden="true" /> Add a relative of {person.given_name}
              </h3>
              <div className="flex flex-wrap gap-2">
                {RELATIVES.map((r) => (
                  <button key={r.id} type="button" onClick={() => setMode({ kind: 'add', relation: r.id })} className={cn('rounded-full border border-white/15 px-3.5 py-1.5 text-xs font-semibold', tok.text, tok.hoverBg)}>
                    {r.label}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setMode({ kind: 'link' })} className={cn('mt-2 inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold underline underline-offset-2', tok.mid)}>
                <Link2 size={13} aria-hidden="true" /> Link someone who is already in the tree
              </button>
            </section>
          )}

          {links.length > 0 && (
            <section className="mt-5 border-t border-white/10 pt-4" aria-labelledby="links-title">
              <h3 id="links-title" className={cn('mb-2 text-xs font-semibold uppercase tracking-wide', tok.mid)}>
                Links
              </h3>
              <ul className="space-y-1.5">
                {links.map((link) => (
                  <li key={link.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate">
                      <span className={cn('font-semibold', tok.text)}>{link.otherName}</span>
                      <span className={tok.low}> · {link.role}</span>
                    </span>
                    {link.removable && (
                      <button type="button" onClick={() => setMode({ kind: 'unlink', link })} aria-label={`Remove the link with ${link.otherName}`} className="inline-flex min-h-9 shrink-0 items-center px-2 text-xs text-red-200 underline underline-offset-2">
                        Remove link
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {perms.can_confirm && !person.is_me && (
            <section className="mt-5 border-t border-white/10 pt-4" aria-labelledby="corroboration">
              <h3 id="corroboration" className={cn('mb-2 text-xs font-semibold uppercase tracking-wide', tok.mid)}>
                Confirm what you know
              </h3>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={threshold} aria-valuenow={Math.min(person.confirmations ?? 0, threshold)} aria-label="Confirmations from close relatives">
                <div className="h-full rounded-full bg-success" style={{ width: `${Math.min(100, ((person.confirmations ?? 0) / threshold) * 100)}%` }} />
              </div>
              <p className={cn('mt-1.5 text-xs', tok.low)}>
                {person.confirmations ?? 0} of {threshold} confirmation{threshold === 1 ? '' : 's'} from close relatives
                {person.my_decision === 'confirm' && ' · you confirmed'}
                {person.my_decision === 'dispute' && ' · you disputed'}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" disabled={busy || person.my_decision === 'confirm'} onClick={() => void decide('confirm')} className="inline-flex items-center gap-1.5 rounded-full border border-success/40 px-3.5 py-1.5 text-xs font-semibold text-success hover:bg-success/10 disabled:opacity-40">
                  <ShieldCheck size={13} aria-hidden="true" /> I can confirm this
                </button>
                <button type="button" disabled={busy} onClick={() => setMode({ kind: 'dispute' })} className="inline-flex items-center gap-1.5 rounded-full border border-warning/40 px-3.5 py-1.5 text-xs font-semibold text-warning hover:bg-warning/10 disabled:opacity-40">
                  <AlertTriangle size={13} aria-hidden="true" /> This is wrong
                </button>
              </div>
            </section>
          )}
        </>
      )}

      {mode.kind === 'edit' && (
        <section className="mt-5 border-t border-white/10 pt-4">
          <h3 className={cn('mb-3 text-sm font-semibold', tok.text)}>Edit {person.given_name}</h3>
          <PersonForm
            initial={valuesFrom(person)}
            submitLabel="Save"
            busy={busy}
            error={error}
            onCancel={() => { setMode({ kind: 'view' }); setError(null) }}
            onSubmit={(values: FormValues) =>
              void run(async () => {
                await kaluta.family.updatePerson(person.id, toFields(values, true))
                setMode({ kind: 'view' })
                setNote('Saved.')
                afterChange()
              }, 'Could not save.')
            }
          />
        </section>
      )}

      {mode.kind === 'add' && (
        <section className="mt-5 border-t border-white/10 pt-4">
          <h3 className={cn('mb-1 text-sm font-semibold', tok.text)}>
            Add {RELATIVES.find((r) => r.id === mode.relation)?.label.toLowerCase()} of {person.given_name}
          </h3>
          {RELATIVES.find((r) => r.id === mode.relation)?.note && (
            <p className={cn('mb-3 text-xs', tok.low)}>{RELATIVES.find((r) => r.id === mode.relation)?.note}</p>
          )}
          <PersonForm
            initial={emptyValues()}
            submitLabel="Add to the tree"
            busy={busy}
            error={error}
            onCancel={() => { setMode({ kind: 'view' }); setError(null) }}
            onSubmit={(values: FormValues) =>
              void run(async () => {
                const added = await kaluta.family.addRelative(person.id, mode.relation, toFields(values, false))
                setMode({ kind: 'view' })
                setNote(`${fullName(added.person)} added.`)
                afterChange()
              }, 'Could not add them.')
            }
          />
        </section>
      )}

      {mode.kind === 'link' && (
        <section className="mt-5 border-t border-white/10 pt-4">
          <h3 className={cn('mb-3 text-sm font-semibold', tok.text)}>Link someone to {person.given_name}</h3>
          <LinkExisting
            anchorId={person.id}
            anchorName={fullName(person)}
            busy={busy}
            error={error}
            onCancel={() => { setMode({ kind: 'view' }); setError(null) }}
            onSubmit={(relation, other) =>
              void run(async () => {
                const kind = { parent: 'parent_of', adoptive_parent: 'adoptive_parent_of', child: 'parent_of', spouse: 'spouse_of', sibling: 'sibling_of' }[relation]
                const otherIsFrom = relation === 'parent' || relation === 'adoptive_parent'
                await kaluta.family.link({
                  from_person_id: otherIsFrom ? other.id : person.id,
                  to_person_id: otherIsFrom ? person.id : other.id,
                  kind,
                })
                setMode({ kind: 'view' })
                setNote(`${fullName(other)} linked.`)
                afterChange()
              }, 'Could not link them.')
            }
          />
        </section>
      )}

      {mode.kind === 'unlink' && (
        <section role="alertdialog" aria-labelledby="unlink-title" className="mt-5 rounded-card-md border border-red-400/40 p-4">
          <h3 id="unlink-title" className={cn('text-sm font-semibold', tok.text)}>
            Remove the link with {mode.link.otherName}?
          </h3>
          <p className={cn('mt-1 text-xs', tok.mid)}>Both people stay in the tree; only this link goes.</p>
          {error && <p role="alert" className="mt-2 text-sm text-red-200">{error}</p>}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await kaluta.family.unlink(mode.link.id)
                  setMode({ kind: 'view' })
                  setNote('Link removed.')
                  afterChange()
                }, 'Could not remove the link.')
              }
              className="rounded-full bg-red-500/80 px-4 py-1.5 text-xs font-bold text-white disabled:opacity-40"
            >
              {busy ? 'Removing…' : 'Remove link'}
            </button>
            <button type="button" disabled={busy} onClick={() => { setMode({ kind: 'view' }); setError(null) }} className={cn('rounded-full border border-white/15 px-4 py-1.5 text-xs font-semibold', tok.mid)}>
              Keep it
            </button>
          </div>
        </section>
      )}

      {mode.kind === 'dispute' && (
        <section className="mt-5 border-t border-white/10 pt-4">
          <label htmlFor="dispute-why" className={cn('mb-1 block text-sm font-semibold', tok.text)}>
            What is wrong? <span className={cn('font-normal', tok.low)}>(optional)</span>
          </label>
          <textarea id="dispute-why" value={why} onChange={(e) => setWhy(e.target.value)} maxLength={1000} rows={3} className={cn('w-full rounded-card-sm px-3 py-2 text-sm focus:border-gold/50 focus:outline-none', tok.input, tok.text)} />
          {error && <p role="alert" className="mt-2 text-sm text-red-200">{error}</p>}
          <div className="mt-3 flex gap-2">
            <button type="button" disabled={busy} onClick={() => void decide('dispute')} className="rounded-full border border-warning/50 px-4 py-1.5 text-xs font-semibold text-warning hover:bg-warning/10 disabled:opacity-40">
              Mark as disputed
            </button>
            <button type="button" disabled={busy} onClick={() => { setMode({ kind: 'view' }); setError(null) }} className={cn('rounded-full border border-white/15 px-4 py-1.5 text-xs font-semibold', tok.mid)}>
              Cancel
            </button>
          </div>
        </section>
      )}

      {mode.kind === 'remove' && (
        <section role="alertdialog" aria-labelledby="remove-title" aria-describedby="remove-body" className="mt-5 rounded-card-md border border-red-400/40 p-4">
          <h3 id="remove-title" className={cn('text-sm font-semibold', tok.text)}>
            Remove {fullName(person)} from the tree?
          </h3>
          <p id="remove-body" className={cn('mt-1 text-xs', tok.mid)}>
            Their relationships, and the confirmations about them, are removed with them. Photos and documents attached to them stay in the archive. This cannot be undone.
          </p>
          {error && <p role="alert" className="mt-2 text-sm text-red-200">{error}</p>}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await kaluta.family.deletePerson(person.id)
                  onRemoved(person.id)
                }, 'Could not remove them.')
              }
              className="rounded-full bg-red-500/80 px-4 py-1.5 text-xs font-bold text-white disabled:opacity-40"
            >
              {busy ? 'Removing…' : 'Remove'}
            </button>
            <button type="button" disabled={busy} onClick={() => { setMode({ kind: 'view' }); setError(null) }} className={cn('rounded-full border border-white/15 px-4 py-1.5 text-xs font-semibold', tok.mid)}>
              Keep them
            </button>
          </div>
        </section>
      )}
    </article>
  )
}
