import { Link } from 'react-router'
import type { KnownActors as Actors } from '@/lib/api'

/** The verb for a count of people, naming what they actually did. */
function phrase(count: number, action: 'reacted' | 'commented' | 'both'): string {
  const people = `${count} ${count === 1 ? 'person' : 'people'}`
  // "reacted or commented" is what a program says when it knows the count and
  // not the action. The server knows the action, so this only says "and"
  // when both really happened.
  if (action === 'both') return `${people} reacted and commented`
  return `${people} ${action === 'commented' ? 'commented' : 'reacted'}`
}

/**
 * "Ama and 12 others reacted to this" — the people you follow who got here first.
 *
 * Only people the viewer actually follows are named. A row of strangers is
 * noise; somebody you know is a reason to look, and it is the honest version
 * of social proof — it does not imply a relationship that is not there.
 * Everyone else is a number, and the number says what they did.
 */
export default function KnownActors({ actors }: { actors?: Actors | null }) {
  if (!actors) return null
  const { people, others } = actors
  const othersAction = actors.others_action ?? 'reacted'
  if (people.length === 0 && others === 0) return null

  // Nobody known: the count and the verb, with no claim about who.
  if (people.length === 0) {
    return (
      <p className="caption mt-2.5 border-t border-white/6 pt-2.5">
        {phrase(others, othersAction)}
      </p>
    )
  }

  const verb = people.every((p) => p.action === 'commented') ? 'commented on this' : 'reacted to this'

  return (
    <p className="caption mt-2.5 flex flex-wrap items-center gap-x-1 border-t border-white/6 pt-2.5">
      {people.map((person, index) => (
        <span key={person.id}>
          <Link
            to={person.handle ? `/u/${person.handle}` : '#'}
            className="font-semibold text-text-mid hover:text-gold-soft"
          >
            {person.name}
          </Link>
          {index < people.length - 1 && (index === people.length - 2 && others === 0 ? ' and ' : ', ')}
        </span>
      ))}
      {others > 0 && (
        <span>
          {' and '}
          {others} {others === 1 ? 'other' : 'others'}
        </span>
      )}
      <span>{verb}</span>
    </p>
  )
}
