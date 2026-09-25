import { useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Role } from './knowledgeBase'
import { RoleContext } from './roleStore'
import type { RoleContextValue } from './roleStore'

/**
 * RoleProvider — demo role switcher (Visitor / Member / Admin).
 * In production this reads the authenticated session; here it drives the
 * permission-scoped answers of the assistant (admin-only knowledge is refused
 * or escalated for non-admin roles).
 */
export default function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>('member')
  const setRole = useCallback((r: Role) => setRoleState(r), [])
  const value = useMemo<RoleContextValue>(() => ({ role, setRole, canSeeAdmin: role === 'admin' }), [role, setRole])
  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>
}
