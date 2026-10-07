import { useId } from 'react'
import { useAppTheme } from '@/components/appdemo/theme'
import type { ParentRole, Person, RelativeKind } from '@/lib/api'
import { cn } from '@/lib/utils'
import FamilyFinder from './FamilyFinder'
import { fullName } from './layout'
import type { ExtraAnswers, KnownParent } from './relativeExtras'

const ROLE_LABEL: Record<ParentRole, string> = { father: 'Father', mother: 'Mother' }

function RoleSelect({
  label,
  value,
  onChange,
}: {
  label: string
  value: ParentRole | ''
  onChange: (role: ParentRole | '') => void
}) {
  const { tok } = useAppTheme()
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className={cn('mb-1 block text-xs font-semibold', tok.mid)}>
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as ParentRole | '')} className={cn('w-full rounded-card-sm px-3 py-2 text-sm focus:border-gold/50 focus:outline-none', tok.input, tok.text)}>
        <option value="">Parent (not specified)</option>
        <option value="father">Father</option>
        <option value="mother">Mother</option>
      </select>
    </div>
  )
}

/**
 * What else has to be said when adding a relative, depending on who they are:
 *
 * - a parent: father, mother, or parent with no role - asked outright, never guessed;
 * - a child: who the child's other parent is, if anyone in the tree;
 * - a brother or sister: which of this person's parents they share - the real parent
 *   links are written, so full and half siblings come out of the tree, not out of a label.
 */
export default function RelativeQuestions({
  relation,
  anchorName,
  parents,
  partners,
  answers,
  onChange,
}: {
  relation: RelativeKind
  anchorName: string
  parents: KnownParent[]
  partners: Array<{ id: string; name: string }>
  answers: ExtraAnswers
  onChange: (next: ExtraAnswers) => void
}) {
  const { tok } = useAppTheme()
  const group = useId()
  const set = (patch: Partial<ExtraAnswers>) => onChange({ ...answers, ...patch })

  if (relation === 'parent' || relation === 'adoptive_parent') {
    return (
      <fieldset className="space-y-1.5">
        <legend className={cn('mb-1 text-xs font-semibold', tok.mid)}>
          They are {anchorName}’s … *
        </legend>
        {(
          [
            ['father', 'Father'],
            ['mother', 'Mother'],
            ['unknown', 'Parent (role not given)'],
          ] as const
        ).map(([value, label]) => (
          <label key={value} className={cn('flex items-center gap-2 text-sm', tok.text)}>
            <input type="radio" name={group} checked={answers.role === value} onChange={() => set({ role: value })} />
            {label}
          </label>
        ))}
      </fieldset>
    )
  }

  if (relation === 'child') {
    const chosen = answers.otherParent
    return (
      <div className="space-y-3">
        <div>
          <p className={cn('mb-1 text-xs font-semibold', tok.mid)}>The child’s other parent</p>
          {chosen ? (
            <p className={cn('flex items-center justify-between gap-2 rounded-card-sm px-3 py-2 text-sm', tok.input, tok.text)}>
              <span className="truncate font-semibold">{chosen.name}</span>
              <button type="button" onClick={() => set({ otherParent: null, otherRole: '' })} className="inline-flex min-h-9 shrink-0 items-center px-2 text-xs text-gold-soft underline underline-offset-2">
                Change
              </button>
            </p>
          ) : (
            <div className="space-y-2">
              {partners.length > 0 && (
                <div className="flex flex-wrap gap-2" role="group" aria-label={`Partners of ${anchorName}`}>
                  {partners.map((partner) => (
                    <button key={partner.id} type="button" onClick={() => set({ otherParent: partner })} className={cn('rounded-full border border-white/15 px-3.5 py-1.5 text-xs font-semibold', tok.text, tok.hoverBg)}>
                      {partner.name}
                    </button>
                  ))}
                </div>
              )}
              <FamilyFinder
                onPick={(person: Person) => set({ otherParent: { id: person.id, name: fullName(person) } })}
                placeholder="Someone else in the tree"
                label="Find the other parent in the tree"
              />
              <p className={cn('text-xs', tok.low)}>Leave empty if they are not in the tree or not known.</p>
            </div>
          )}
        </div>
        <RoleSelect label={`${anchorName} is the child’s …`} value={answers.anchorRole} onChange={(anchorRole) => set({ anchorRole })} />
        {chosen && <RoleSelect label={`${chosen.name} is the child’s …`} value={answers.otherRole} onChange={(otherRole) => set({ otherRole })} />}
      </div>
    )
  }

  if (relation === 'sibling') {
    if (!parents.length) {
      return (
        <p className={cn('text-xs', tok.low)}>
          No parent of {anchorName} is in the tree yet, so they will be recorded as brother or sister without a shared parent. Add the parents first to share them.
        </p>
      )
    }
    return (
      <fieldset className="space-y-1.5">
        <legend className={cn('mb-1 text-xs font-semibold', tok.mid)}>Which of {anchorName}’s parents are also theirs?</legend>
        {parents.map((parent) => (
          <label key={parent.id} className={cn('flex items-center gap-2 text-sm', tok.text)}>
            <input
              type="checkbox"
              checked={answers.shared.includes(parent.id)}
              onChange={(e) => set({ shared: e.target.checked ? [...answers.shared, parent.id] : answers.shared.filter((id) => id !== parent.id) })}
            />
            {parent.name}
            {parent.role && <span className={tok.low}>({ROLE_LABEL[parent.role].toLowerCase()})</span>}
          </label>
        ))}
        <p className={cn('text-xs', tok.low)}>
          Tick the parents they share. Leave all unticked if their parents are not in the tree. Whether they are full or half brothers or sisters follows from this.
        </p>
      </fieldset>
    )
  }

  return null
}
