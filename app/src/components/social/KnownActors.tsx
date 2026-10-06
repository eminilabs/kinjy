import { Link } from 'react-router'
import type { KnownActors as Actors } from '@/lib/api'

/**
 * "Ama and 12 others reacted to this" — the people you follow who got here first.
 *
 * Only people the viewer actually follows are named. A row of strangers is
 * noise; somebody you know is a reason to look, and it is also the honest
 * version of social proof — it does not imply a relationship that is not
 * there. Everyone else is a number.
 */
export default function KnownActors({ actors }: { actors?: Actors | null }) {
  if (!actors) return null
  const { people, others } = actors
  if (people.length === 0 && others === 0) return null

  const names = people.map((person) => (
    <Link
      key={person.id}
      to={person.handle ? `/u/${person.handle}` : '#'}
      className="font-semibold text-text-mid hover:text-gold-soft"
    >
      {person.name}
    </Link>
  ))

  // Nobody known: just the count, and no claim about who.
  if (names.length === 0) {
    return (
      <p className="caption mt-2.5 border-t border-white/6 pt-2.5">
        {others} {others === 1 ? 'person' : 'people'} reacted or commented
      </p>
    )
  }

  const verb = people.every((p) => p.action === 'commented') ? 'commented on this' : 'reacted to this'

  return (
    <p className="caption mt-2.5 flex flex-wrap items-center gap-x-1 border-t border-white/6 pt-2.5">
      {names.map((node, index) => (
        <span key={people[index].id}>
          {node}
          {index < names.length - 1 && (index === names.length - 2 && others === 0 ? ' and ' : ', ')}
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
