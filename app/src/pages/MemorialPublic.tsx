import { Link, useParams } from 'react-router'
import { Landmark, Settings } from 'lucide-react'
import MemorialView from '@/components/graveyard/MemorialView'
import { TICKET_REFRESH_MS, useEvery } from '@/components/graveyard/useEvery'
import { useApi } from '@/hooks/useApi'
import { kaluta, type Memorial } from '@/lib/api'

/**
 * /memorial/:code — where the QR code on a resting place leads.
 *
 * Public, and signed out is the normal case: the person scanning is standing
 * at a grave with their phone, not logged in to anything. They can read the
 * life story, light a candle, leave a flower or a message for the family.
 */
export default function MemorialPublic() {
  const { code = '' } = useParams()
  const memorial = useApi<Memorial>(() => kaluta.memorials.byQr(code), [code])
  // The pictures and the voice are fetched with five-minute tickets.
  useEvery(memorial.reload, TICKET_REFRESH_MS)

  return (
    <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      {memorial.loading && !memorial.data && (
        <p className="text-center text-sm text-text-mid" role="status">
          Opening the memorial…
        </p>
      )}
      {!memorial.loading && !memorial.data && (
        <div className="mx-auto max-w-md py-16 text-center">
          <Landmark size={26} className="mx-auto text-text-mid" aria-hidden="true" />
          <h1 className="mt-3 font-display text-2xl text-text-hi">This memorial cannot be found</h1>
          <p className="mt-2 text-sm text-text-mid">
            Check the code, or ask the family for the link. A memorial its family keeps private is only
            visible to them.
          </p>
          <Link to="/" className="mt-5 inline-block text-sm font-semibold text-text-hi underline underline-offset-2">
            Go to Kinjy
          </Link>
        </div>
      )}
      {memorial.data && (
        <>
          {memorial.data.is_admin && (
            <div className="mb-4 flex justify-end">
              <Link
                to={`/graveyard?open=${memorial.data.id}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-text-low/40 px-4 py-2 text-xs font-semibold text-text-mid hover:border-gold/40 hover:text-text-hi"
              >
                <Settings size={12} aria-hidden="true" /> Manage this memorial
              </Link>
            </div>
          )}
          <MemorialView memorial={memorial.data} onChanged={memorial.reload} />
        </>
      )}
    </section>
  )
}
