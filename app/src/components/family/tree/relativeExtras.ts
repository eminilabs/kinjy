import type { ParentRole, RelativeExtras, RelativeKind } from '@/lib/api'

/** A parent as the panel knows them: who, and what they are to this person if it was said. */
export interface KnownParent {
  id: string
  name: string
  role: ParentRole | null
}

export interface ExtraAnswers {
  /** parent / adoptive_parent: explicit, including "not given". Unanswered until chosen. */
  role: ParentRole | 'unknown' | null
  /** child */
  anchorRole: ParentRole | ''
  otherParent: { id: string; name: string } | null
  otherRole: ParentRole | ''
  /** sibling */
  shared: string[]
}

export const noAnswers = (): ExtraAnswers => ({ role: null, anchorRole: '', otherParent: null, otherRole: '', shared: [] })

/** A parent is added knowing whether they are the father, the mother, or that it is not said. */
export const isReady = (relation: RelativeKind, answers: ExtraAnswers): boolean =>
  relation === 'parent' || relation === 'adoptive_parent' ? answers.role !== null : true

/** What goes to the server. Nothing is filled in for anyone: an unanswered role is left out. */
export function toExtras(relation: RelativeKind, answers: ExtraAnswers): RelativeExtras {
  if (relation === 'parent' || relation === 'adoptive_parent') {
    return answers.role && answers.role !== 'unknown' ? { role: answers.role } : {}
  }
  if (relation === 'child') {
    return {
      ...(answers.anchorRole ? { anchor_role: answers.anchorRole } : {}),
      ...(answers.otherParent ? { other_parent_id: answers.otherParent.id } : {}),
      ...(answers.otherParent && answers.otherRole ? { other_parent_role: answers.otherRole } : {}),
    }
  }
  if (relation === 'sibling') return answers.shared.length ? { shared_parent_ids: answers.shared } : {}
  return {}
}
