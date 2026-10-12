import type { ReactNode } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'

/**
 * Asking before something cannot be undone.
 *
 * Replaces `window.confirm`, which was being used for deleting a message and
 * removing a connection. Three reasons that is the wrong tool for an
 * irreversible action:
 *
 * * It cannot say what will actually happen. A native confirm is one line with
 *   two buttons labelled OK and Cancel - "OK" tells nobody whether they are
 *   about to delete for everyone or only for themselves.
 * * It is the same dialog every scam site uses, so people dismiss it without
 *   reading. A dialog that looks like the product is read like the product.
 * * It blocks the whole browser thread and is styled by the operating system,
 *   so it ignores the theme, the language direction and every accessibility
 *   setting the rest of the app honours.
 *
 * The confirm button carries the verb - "Delete message", not "OK" - because
 * the last thing somebody reads before an irreversible action should name the
 * action.
 */
export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  destructive = true,
  busy = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: ReactNode
  /** Names the action, never "OK". */
  confirmLabel: string
  cancelLabel?: string
  onConfirm: () => void
  /** Red for anything that destroys something; gold for an ordinary choice. */
  destructive?: boolean
  busy?: boolean
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription className="leading-relaxed">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {/* Cancel first in the DOM so it takes the initial focus: the safe
              choice should be the one a stray Enter lands on. */}
          <AlertDialogCancel disabled={busy}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={busy}
            className={cn(
              destructive && 'bg-red-500/90 text-white hover:bg-red-500',
            )}
          >
            {busy ? 'Working…' : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
