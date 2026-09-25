# Payments Research Brief — NowPayments + Bank/Fintech Escrow (verified August 2026)

## NowPayments.io — verified API capabilities (from official docs/guides)

### Receiving crypto (payments IN)
- **Create payment**: `POST /v1/payment` with `price_amount`, `price_currency` (e.g. usd), `pay_currency`, `ipn_callback_url`, `order_id` → returns a deposit address. Alternative: `POST /v1/invoice` with `success_url` redirect.
- **IPN callbacks**: status changes POSTed to `ipn_callback_url`; header `x-nowpayments-sig` = HMAC-SHA512 over the JSON body with keys sorted alphabetically, signed with the IPN secret. Statuses: waiting, confirming, confirmed, sending, partially_paid, finished, failed, refunded, expired.
- **350+ currencies** supported, including **USDT BSC (usdtbsc)**.

### Auto-conversion to BSC USDT (user requirement)
- **Custody is default**: receipts land in the merchant's NowPayments custody balance.
- **Internal autoconversion inside custody**: off-chain swaps between open balances — receipts in any coin can be converted to a **USDT BSC balance** without leaving custody (fast, cheap, no on-chain hops).
- "Network Fee Optimization"/autoconversion can also auto-pick the cheapest coin and convert before sending to the payout wallet.
- The company's **safe wallet** is configured as the payout wallet (BSC USDT address). **Custody withdrawal minimum: $50** — batch treasury sweeps accordingly.

### Paying members (payouts OUT) — Mass Payouts API
- `POST /v1/payout` (batch of withdrawals: address, currency, amount) → `POST /v1/payout/verify` (2FA code; can be automated with an OTP library) → track via `GET /v1/payout/:payout_id`.
- **0% service fee** on payouts; 0.5% deposit fee (can be passed to customers); sender/receiver network-fee setting.
- Security defaults: **IP whitelisting, wallet-address whitelisting, 2FA on payouts** (can be disabled only via email request).
- 1000+ payouts in one API call; avg transaction ~5 min.

### The $1 commission threshold architecture (user requirement — implement faithfully, surface the nuance)
- Kaluta's **immutable internal ledger** accrues each member's commission entitlement per level (L1…L10).
- Funds physically sit in the **NowPayments custody balance** = the "escrow held by NowPayments".
- When a member's accrued, **eligible** balance ≥ **$1**, they enter the next Mass Payouts batch to their **whitelisted BSC wallet**.
- Below $1 → remains accrued in custody/ledger escrow until the threshold is reached. (Note to surface in UI: NowPayments custody treasury withdrawal floor is $50; network-level minimums per coin apply on-chain — the $1 rule works because payouts are batched off-chain from custody.)
- **Eligibility gate (user requirement)**: commission payout requires (1) account verified (KalutaKYC) AND (2) crypto wallet address filled in the backoffice. Ineligible members accrue but are flagged "Action required".

## Bank/fintech escrow for worldwide 10-level-deep commission cashouts — RECOMMENDATION
**Primary recommendation: Mangopay** (mangopay.com)
- Purpose-built **escrow wallets**: hold funds with **unlimited escrow duration**, release on conditions.
- **Split payments between as many parties as needed** — designed for marketplace commission + multi-party referral splits (fits a 10-level chain: each member gets a KYC'd e-wallet; splits are wallet-to-wallet transfers off-ledger-fees).
- Per-user KYC'd e-wallets, payouts to bank accounts worldwide, subscription billing, sandbox.
- Strongest architectural match for "escrow + 10-level distribution + worldwide".

**Secondary rails (last-mile coverage), recommend as complementary**:
- **Trolley** — affiliate/creator payout specialist, built-in tax handling, strong for commission programs.
- **Hyperwallet (PayPal)** — local bank transfers in 200+ countries, white-label payout portals.
- **Tipalti** — enterprise-grade, 190+ countries, tax/fraud automation (for later scale).
- **PayQuicker** — real-time micro-disbursements for affiliate networks.

Recommended target architecture: NowPayments (crypto rail: receipts → custody autoconvert to USDT BSC → safe wallet; member payouts via Mass Payouts) + Mangopay (fiat rail: escrow wallets, 10-level splits, bank cashouts) selected per member preference/region, both reconciled against the single immutable Kaluta ledger.
