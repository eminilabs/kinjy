import { useMemo, type ReactNode } from 'react'
import { X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'
import { DialogContext, useDialogContext } from './dialogContext'

/**
 * A window on a computer, a sheet from the bottom on a phone.
 *
 * Facebook, Instagram and LinkedIn all put comments, shares and reposts in a
 * sheet that slides up under the thumb on a phone, with a grab handle and the
 * input pinned to the bottom. A centred box is the wrong shape there: it floats
 * in the middle of a screen that is mostly keyboard.
 *
 *  - `auto`   sized to its content (repost, share)
 *  - `scroll` fills the screen and scrolls as one page (a whole post)
 *  - `pinned` fills the screen; the content decides what scrolls, so a composer
 *             can stay at the bottom (comments)
 */
export type DialogLayout = 'auto' | 'scroll' | 'pinned'

const SURFACE = 'border-[var(--cloud-border)] bg-ink-2 text-text-hi'

const WIDTH = { md: 'sm:max-w-md', xl: 'sm:max-w-xl', '2xl': 'sm:max-w-2xl' } as const

export function ResponsiveDialog({
  open,
  onOpenChange,
  layout = 'auto',
  width = 'md',
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  layout?: DialogLayout
  width?: keyof typeof WIDTH
  children: ReactNode
}) {
  const mobile = useIsMobile()
  const value = useMemo(() => ({ mobile, close: () => onOpenChange(false) }), [mobile, onOpenChange])

  if (mobile) {
    return (
      <DialogContext.Provider value={value}>
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent
            side="bottom"
            // The sheet's own corner close button is hidden: the header carries one.
            className={cn(
              SURFACE,
              'gap-0 rounded-t-[24px] p-0 pb-[env(safe-area-inset-bottom)] shadow-[0_-30px_60px_-30px_rgba(0,0,0,.5)] [&>button]:hidden',
              layout === 'auto' ? 'max-h-[90dvh]' : 'h-[92dvh]',
            )}
          >
            <div aria-hidden="true" className="mx-auto mb-1 mt-2.5 h-1.5 w-11 shrink-0 rounded-full bg-text-hi/20" />
            <div
              className={cn(
                'flex min-h-0 flex-1 flex-col',
                layout === 'pinned' ? 'overflow-hidden' : 'overflow-y-auto',
              )}
            >
              {children}
            </div>
          </SheetContent>
        </Sheet>
      </DialogContext.Provider>
    )
  }

  return (
    <DialogContext.Provider value={value}>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn(
            SURFACE,
            'gap-0 overflow-hidden rounded-[24px] p-0 shadow-[0_40px_80px_-30px_rgba(0,0,0,.45)]',
            WIDTH[width],
            layout === 'scroll' && 'max-h-[90vh] overflow-y-auto',
            layout === 'pinned' && 'flex max-h-[88vh] flex-col',
          )}
        >
          {children}
        </DialogContent>
      </Dialog>
    </DialogContext.Provider>
  )
}

/** The title that the surrounding primitive (dialog or sheet) expects. */
export function DialogHeading({ className, children }: { className?: string; children: ReactNode }) {
  const { mobile } = useDialogContext()
  return mobile ? (
    <SheetTitle className={className}>{children}</SheetTitle>
  ) : (
    <DialogTitle className={className}>{children}</DialogTitle>
  )
}

export function DialogSubheading({ className, children }: { className?: string; children: ReactNode }) {
  const { mobile } = useDialogContext()
  return mobile ? (
    <SheetDescription className={className}>{children}</SheetDescription>
  ) : (
    <DialogDescription className={className}>{children}</DialogDescription>
  )
}

/** A close button for the phone sheet; on a computer the dialog has its own. */
export function SheetClose() {
  const { mobile, close } = useDialogContext()
  if (!mobile) return null
  return (
    <button
      type="button"
      onClick={close}
      aria-label="Close"
      className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-text-hi/[0.08] text-text-mid hover:text-text-hi"
    >
      <X size={17} aria-hidden="true" />
    </button>
  )
}
