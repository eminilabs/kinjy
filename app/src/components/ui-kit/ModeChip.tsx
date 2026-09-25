import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface ModeChipProps {
  label: string
  active?: boolean
  onClick?: () => void
  icon?: React.ReactNode
  className?: string
}

/** ModeChip — pill toggle (feed modes, algorithms). Active = gold fill, inactive = glass. */
export default function ModeChip({ label, active = false, onClick, icon, className }: ModeChipProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.96 }}
      transition={{ duration: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors duration-200 ease-cloud-ease',
        active
          ? 'bg-gradient-to-br from-gold-soft to-gold text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]'
          : 'cloud-glass text-text-mid hover:text-text-hi hover:border-gold/30',
        className,
      )}
    >
      {icon}
      {label}
    </motion.button>
  )
}
