import { Link, useParams } from 'react-router'
import { Landmark, Settings } from 'lucide-react'
import MemorialView from '@/components/graveyard/MemorialView'
import { TICKET_REFRESH_MS, useEvery } from '@/components/graveyard/useEvery'
import { useApi } from '@/hooks/useApi'
import { kaluta, type Memorial } from '@/lib/api'
import PublicShell from '@/components/landing/PublicShell'
import { KL_BTN_GHOST } from '@/components/landing/kl-classes'

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
    <PublicShell>
      <section className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        {memorial.loading && !memorial.data && (
          <p className="text-center text-sm text-[var(--kl-low)]" role="status">
            Opening the memorial…
          </p>
        )}
        {!memorial.loading && !memorial.data && (
          <div className="mx-auto max-w-md rounded-[20px] border border-[var(--kl-paper-2)] bg-[var(--kl-surface)] px-8 py-14 text-center shadow-[0_24px_48px_-34px_var(--kl-shadow)]">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#F6EBD3] text-[#8A6414]">
              <Landmark size={26} aria-hidden="true" />
            </span>
            <h1 className="mt-5 text-[1.6rem] font-bold leading-tight tracking-[-0.035em]">This memorial cannot be found</h1>
            <p className="mt-3 text-[0.95rem] leading-relaxed text-[var(--kl-mid)]">
              Check the code, or ask the family for the link. A memorial its family keeps private is only
              visible to them.
            </p>
            <Link to="/" className={`${KL_BTN_GHOST} mt-6 !py-3 !text-[15px]`}>
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
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--kl-paper-2)] bg-[var(--kl-surface)] px-5 py-2.5 text-sm font-semibold transition-colors hover:border-[var(--kl-gold)] hover:text-[var(--kl-gold-deep)]"
                >
                  <Settings size={14} aria-hidden="true" /> Manage this memorial
                </Link>
              </div>
            )}
            <MemorialView memorial={memorial.data} onChanged={memorial.reload} />
          </>
        )}
      </section>
    </PublicShell>
  )
}
