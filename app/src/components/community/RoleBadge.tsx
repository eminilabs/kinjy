import { Clock, Crown, Shield, User } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * What the viewer is to a community. A pending request outranks the role,
 * since a pending row has no powers yet. Renders nothing for a non-member.
 */
export default function RoleBadge({
  role,
  status,
  className,
}: {
  role: string | null | undefined
  status?: string | null
  className?: string
}) {
  const base = 'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold'
  if (status === 'pending') {
    return (
      <span className={cn(base, 'border border-white/12 text-text-low', className)}>
        <Clock size={10} aria-hidden="true" /> Pending
      </span>
    )
  }
  if (role === 'owner') {
    return (
      <span className={cn(base, 'bg-gradient-to-br from-gold-soft to-gold font-bold text-ink', className)}>
        <Crown size={10} aria-hidden="true" /> Owner
      </span>
    )
  }
  if (role === 'moderator') {
    return (
      <span className={cn(base, 'border border-gold/40 bg-gold/10 text-gold-soft', className)}>
        <Shield size={10} aria-hidden="true" /> Moderator
      </span>
    )
  }
  if (role === 'member') {
    return (
      <span className={cn(base, 'border border-white/12 text-text-mid', className)}>
        <User size={10} aria-hidden="true" /> Member
      </span>
    )
  }
  return null
}
