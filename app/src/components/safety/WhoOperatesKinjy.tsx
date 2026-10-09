import { Building2 } from 'lucide-react'
import { COMPANY } from '@/lib/company'

/**
 * Who a member is actually agreeing with.
 *
 * This page is what sign-up links to as the terms — "By creating an account you
 * accept the community standards" points here. Terms that never name the
 * company behind them, or where to write to it, are not terms anybody can act
 * on: a member with a complaint, a data request or a legal notice needs an
 * address, and in several of the places Kinjy operates, naming the operator is
 * not optional.
 */
export default function WhoOperatesKinjy() {
  return (
    <section aria-labelledby="operator-heading" className="kl-pad-x py-[clamp(48px,7vw,96px)]">
      <div className="mx-auto max-w-2xl rounded-[20px] border border-[var(--kl-paper-2)] bg-[var(--kl-surface)] p-7">
        <p className="inline-flex items-center gap-2 text-[var(--kl-gold-deep)]">
          <Building2 size={16} aria-hidden="true" />
          <span className="text-sm font-semibold">Who you are agreeing with</span>
        </p>

        <h2 id="operator-heading" className="kl-h3 mt-3">
          {COMPANY.name} is operated from {COMPANY.country}.
        </h2>

        <p className="mt-3 text-sm leading-relaxed text-[var(--kl-mid)]">
          These standards, and the agreement you accept when you create an account, are between
          you and the company registered at the address below. Write to it for anything that needs
          a formal answer — a complaint about a moderation decision, a request for your data, or a
          legal notice.
        </p>

        <address className="mt-5 not-italic">
          <span className="block text-sm font-semibold text-[var(--kl-ink)]">{COMPANY.name}</span>
          {COMPANY.addressLines.map((line) => (
            <span key={line} className="block text-sm text-[var(--kl-mid)]">
              {line}
            </span>
          ))}
        </address>

        <p className="mt-5 text-[13px] text-[var(--kl-low)]">
          Everything on this page describes how that company moderates, stores and deletes what
          you put here.
        </p>
      </div>
    </section>
  )
}
