import type { ReactNode } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
}

/** Bottom sheet on a phone, centred narrow panel on wider screens. */
export default function ActionSheet({ open, onClose, title, description, children }: Props) {
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="bottom"
        className="max-h-[92dvh] gap-3 overflow-y-auto rounded-t-3xl border-white/10 bg-ink px-4 pb-6 pt-5 text-text-hi sm:inset-x-auto sm:left-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2"
      >
        <SheetTitle className="pr-10 text-base text-text-hi">{title}</SheetTitle>
        {description ? (
          <SheetDescription className="text-xs text-text-mid">{description}</SheetDescription>
        ) : (
          <SheetDescription className="sr-only">{title}</SheetDescription>
        )}
        {children}
      </SheetContent>
    </Sheet>
  )
}

export const fieldClass =
  'w-full min-h-[44px] rounded-2xl border border-white/10 bg-ink-2/60 px-4 py-2.5 text-base text-text-hi placeholder:text-text-low focus:border-gold/40 focus:outline-none sm:text-sm'

export const primaryBtn =
  'inline-flex min-h-[48px] w-full items-center justify-center rounded-full bg-gradient-to-br from-gold-soft to-gold px-6 text-sm font-bold text-ink disabled:opacity-40'

export const ghostBtn =
  'inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full border border-white/12 px-4 text-xs font-semibold text-text-mid transition-colors hover:border-gold/40 hover:text-gold-soft disabled:opacity-40'
