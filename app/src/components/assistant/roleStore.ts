import { createContext, useContext } from 'react'
import type { Role } from './knowledgeBase'

/** Shape of the demo role context (see RoleContext.tsx). */
export interface RoleContextValue {
  role: Role
  setRole: (r: Role) => void
  canSeeAdmin: boolean
}

export const RoleContext = createContext<RoleContextValue | null>(null)

/** Read the current demo role; safe member default outside a provider. */
export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext)
  if (!ctx) {
    return { role: 'member', setRole: () => undefined, canSeeAdmin: false }
  }
  return ctx
}
