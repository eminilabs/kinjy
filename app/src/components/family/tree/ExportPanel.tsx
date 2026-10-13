import { useState } from 'react'
import { Download } from 'lucide-react'
import { useAppTheme } from '@/components/appdemo/theme'
import { useApi } from '@/hooks/useApi'
import { ApiError, kaluta } from '@/lib/api'
import { cn } from '@/lib/utils'

/**
 * Take the tree out of Kinjy as a GEDCOM file. Owners only: a file travels beyond every rule that
 * protects the tree here. Living people and anyone whose record is not verified are hidden, and
 * this says so, with the numbers, before anything is downloaded.
 */
export default function ExportPanel({ personId }: { personId: string }) {
  const { tok } = useAppTheme()
  const preview = useApi(() => kaluta.family.exportPreview(personId), [personId])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const download = async () => {
    setBusy(true)
    setError(null)
    setDone(false)
    try {
      const { blob, filename } = await kaluta.family.exportGedcom(personId)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setDone(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'The export did not work. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const p = preview.data
  return (
    <section className="mt-5 border-t border-white/10 pt-4" aria-labelledby="export-title">
      <h3 id="export-title" className={cn('mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide', tok.mid)}>
        <Download size={13} aria-hidden="true" /> Export this tree (GEDCOM)
      </h3>
      <p className={cn('mb-2 text-xs', tok.low)}>
        Only owners can export. The file leaves Kinjy and can be passed on by anyone who has it: none of the rules that protect this tree apply to it any more. It has no photos or documents.
      </p>
      {preview.loading && <p className={cn('text-xs', tok.low)}>Counting…</p>}
      {p && (
        <div className={cn('mb-2 space-y-1 text-xs', tok.mid)}>
          <p>
            {p.people} {p.people === 1 ? 'person' : 'people'}: {p.included} written in full, {p.masked} hidden as “Private”.
          </p>
          {p.masked > 0 && (
            <>
              <p>
                Hidden: {p.masked_living} verified but not recorded as deceased, {p.masked_unverified} whose record is not verified. Nobody is assumed to be dead because of their age.
              </p>
              <p role="note" className="font-semibold">
                {p.warning}
              </p>
            </>
          )}
          {Object.entries(p.omitted_links).map(([kind, count]) => (
            <p key={kind}>
              Left out, because GEDCOM cannot show it faithfully: {count} {p.omitted_labels[kind]}.
            </p>
          ))}
        </div>
      )}
      {error && <p className="mb-2 text-xs text-red-300" role="alert">{error}</p>}
      {done && <p className={cn('mb-2 text-xs', tok.mid)} role="status">The file was downloaded. This export has been recorded (who, when and how many people, never the content).</p>}
      <button type="button" disabled={busy || !p} onClick={download} className={cn('inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/15 px-3.5 py-1.5 text-xs font-semibold disabled:opacity-60', tok.text, tok.hoverBg)}>
        <Download size={13} aria-hidden="true" /> Download .ged file
      </button>
    </section>
  )
}
