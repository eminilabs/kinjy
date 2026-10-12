import { useState } from 'react'
import { Users } from 'lucide-react'
import { useAppTheme } from '@/components/appdemo/theme'
import { useApi } from '@/hooks/useApi'
import { ApiError, kaluta, type TreeRole } from '@/lib/api'
import { cn } from '@/lib/utils'
import FamilyFinder from './FamilyFinder'
import { ROLE_LABEL } from './treeRoles'

/**
 * Who holds a role in this tree, for its owners. The server decides everything: a role is
 * changed or removed only if it allows it, and a tree always keeps an owner.
 */
export default function MembersPanel({ personId }: { personId: string }) {
  const { tok } = useAppTheme()
  const list = useApi(() => kaluta.family.members(personId), [personId])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [choosing, setChoosing] = useState<string | null>(null)

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true)
    setError(null)
    try {
      await action()
      list.reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That did not work. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mt-5 border-t border-white/10 pt-4" aria-labelledby="members-title">
      <h3 id="members-title" className={cn('mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide', tok.mid)}>
        <Users size={13} aria-hidden="true" /> Who has access to this tree
      </h3>
      <p className={cn('mb-2 text-xs', tok.low)}>Being related to someone gives no access: only a role does.</p>
      {list.loading && <p className={cn('text-xs', tok.low)}>Loading…</p>}
      {error && <p className="mb-2 text-xs text-red-300" role="alert">{error}</p>}
      <ul className="space-y-2">
        {list.data?.items.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center justify-between gap-2">
            <span className={cn('text-sm', tok.text)}>
              {m.name ?? 'A member'} {m.is_me && <span className={tok.low}>(you)</span>}
            </span>
            <span className="flex items-center gap-2">
              <select
                aria-label={`Role of ${m.name ?? 'this member'}`}
                value={m.role}
                disabled={busy}
                onChange={(e) => run(() => kaluta.family.setMemberRole(m.id, e.target.value as TreeRole))}
                className={cn('rounded-card-sm px-2 py-1.5 text-xs', tok.input, tok.text)}
              >
                {(Object.keys(ROLE_LABEL) as TreeRole[]).map((r) => (
                  <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                ))}
              </select>
              <button type="button" disabled={busy} onClick={() => run(() => kaluta.family.removeMember(m.id))} className={cn('min-h-9 px-2 text-xs underline underline-offset-2', tok.mid)}>
                {m.is_me ? 'Leave' : 'Remove'}
              </button>
            </span>
            {m.role === 'viewer' && (
              <span className={cn('w-full text-xs', tok.low)}>
                {m.branch ? (
                  <>
                    Sees only the branch of {m.branch.name ?? 'a person'}: that person, their descendants and partners.{' '}
                    <button type="button" disabled={busy} onClick={() => run(() => kaluta.family.setMemberBranch(m.id, null))} className="underline underline-offset-2">
                      Show the whole tree
                    </button>
                  </>
                ) : (
                  <>
                    Sees the whole tree.{' '}
                    <button type="button" disabled={busy} onClick={() => setChoosing(choosing === m.id ? null : m.id)} className="underline underline-offset-2">
                      Limit to one branch
                    </button>
                  </>
                )}
                {choosing === m.id && (
                  <span className="mt-2 block">
                    <FamilyFinder
                      label="Find the person whose branch to share"
                      placeholder="Whose branch? (their descendants and partners)"
                      onPick={(person) => {
                        setChoosing(null)
                        void run(() => kaluta.family.setMemberBranch(m.id, person.id))
                      }}
                    />
                  </span>
                )}
              </span>
            )}
          </li>
        ))}
      </ul>
      {list.data && list.data.items.length === 0 && <p className={cn('text-xs', tok.low)}>Nobody else holds a role yet.</p>}
    </section>
  )
}
