import type { TreeRole } from '@/lib/api'

export const ROLE_LABEL: Record<TreeRole, string> = { viewer: 'Viewer', contributor: 'Contributor', owner: 'Owner' }
export const ROLE_MEANING: Record<TreeRole, string> = {
  viewer: 'can only look at the tree',
  contributor: 'can add relatives and links, and change what they added',
  owner: 'can also manage who has access',
}
