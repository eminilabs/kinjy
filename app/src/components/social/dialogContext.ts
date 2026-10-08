import { createContext, useContext } from 'react'

export const DialogContext = createContext<{ mobile: boolean; close: () => void }>({
  mobile: false,
  close: () => undefined,
})

/** Whether the dialog around the caller is the phone sheet, and a way to close it. */
export function useDialogContext() {
  return useContext(DialogContext)
}
