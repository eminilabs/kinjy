# Kaluta — what is not built yet

A living list of everything promised by the blueprint (or by a UI affordance)
that does **not** work today. Kept so nothing quietly passes for finished.

Rules for this file:

- If a screen looks complete but is not wired, it belongs here.
- If something was verified working, it comes **off** this list.
- Anything that cannot be verified in the current environment is marked
  **unverified** rather than assumed good.

Last reviewed: 2026-08-19 (live on kinjy.com; notifications, governance, One-to-Many, disappearing messages)

---

## 1. Missing infrastructure — cannot be faked

| Item | State | What it needs |
|---|---|---|
| **Live video broadcasting** | Chat is real, camera preview is local-only. **Nothing is transmitted.** `/live` says so on screen. | An ingest server, a transcoder and a CDN — or WebRTC peer-to-peer plus a TURN server (viewer-count limited). |
| **End-to-end encrypted messages** | The server refuses plaintext in an encrypted conversation, but no key exchange exists, so every real conversation runs **plaintext**. The UI labels which is which. | A key agreement + device key storage. |
| **Voice and video calls** | *Signalling* is built: offer/answer/ICE relay over the existing socket, payload never inspected. **No TURN server**, so peers behind symmetric NATs will fail to connect, and **no group calls** (an offer to 3+ is refused rather than left to fail mysteriously). | A TURN relay, and an SFU for groups. |
| **Real payment rails** | NowPayments and Mangopay run in **mock mode**. The ledger, splits and payout batches are real; money movement is not. | API keys, IPN endpoint reachable from the internet, payout whitelisting. |
| **WebAuthn off localhost** | Passkeys work on `http://localhost`. From another machine over plain HTTP the ceremony **will fail**. | HTTPS. |

## 2. Rules stored but not enforced

These are the dangerous ones: the setting exists, the API returns it, and a
member could reasonably believe it protects them.

| Item | State |
|---|---|
| `reduced_motion` | Saved, but no component reads it — animations run regardless. |
| `translation_auto` | Saved; translation is still one click per post, never automatic. |

`data_saver`, `age_mode`, `wellbeing_enabled` / `daily_limit_minutes`,
`autoplay_media` and `interest_topics` **are** now enforced, and verified on
2026-08-17 against the running stack:

- `age_mode` filters **in the feed query** — 40 posts as an adult, 39 as a
  child, and a direct link to an adult post answers 404 for a minor.
- `data_saver` withholds heavy URLs server-side (`url: null, deferred: true`)
  and trims to one attachment; `GET /posts/{id}/media` is the "load it anyway"
  door, which does *not* relax the age rule.
- Wellbeing time is counted server-side and clamped to the wall clock: three
  beats claiming 5 minutes each credited 5.0 → 5.0 → 5.1, and a first beat
  claiming the schema maximum credited 1.0.
- `interest_topics` adds a named `interest` factor (+0.80) that appears in
  "Why am I seeing this?" — verified absent, then present, on the same post.

`who_can_message`, `who_can_add_family` and `who_can_add_community` **are**
enforced: messaging-service, family-service and community-service all call
`common/permissions.py`, which asks user-service and fails closed. Verified
2026-08-17 — each returns 403 with the reason, and allows the action once the
target opens the setting or the connection is accepted.

## 3. Built as a mock, still a mock

- **Marketing pages**: `/platform`, `/feeds`, `/family`, `/memorials`,
  `/commerce`, `/payments`, `/safety`, `/developers`, `/app` — designed content,
  no live data. Intentional; they are the public showcase.
- **Admin console** (`/admin`) — the designed mock. The real admin endpoints
  exist (ledger trial balance, reconcile, leaders-pool snapshot, KYC, moderation)
  but nothing calls them.

## 3b. Real-time — works, with one deployment limit

Live updates run over **one** WebSocket per tab, multiplexed by topic
(`user:<id>`, `post:<id>`, `feed`, `shorts`). Verified 2026-08-17: a comment and
a like from a second account moved the counters on an open page with no reload.

- **Single replica only.** The hub keeps its subscriptions in process, so a
  second messaging-service replica would serve half the sockets and each would
  only see its own half. Redis pub/sub between replicas is the fix; it is not
  written. The code says so where the registry is declared.
- **Not yet live:** follows, connection invitations, family and community
  changes, wallet and commission movements. The hub carries them the moment
  those services call `/internal/broadcast` — nothing in the transport is
  missing, the calls are.

## 3c. Deployment

Everything is prepared and exercised locally for **kinjy.com**, but
**nothing is deployed**: the VPS refuses every key on this machine, and the root
password cannot be used from here. One command from the operator
(`bash bootstrap.sh`) installs the key and deploys.

DNS is already correct — `kinjy.com` and `www` both resolve to
<your-server>, verified 2026-08-19, so certificate issuance will work.

- `docker-compose.prod.yml` — no `--reload`, no source mount, and only the web
  container published. Verified with `docker compose config`: 1 published port
  instead of 17, 0 bind mounts, 0 reloaders.
- `app/Dockerfile` + `app/nginx.conf` — the SPA built once and served by nginx,
  which also proxies `/api`, `/media` and the WebSocket, so the browser sees one
  origin. Verified locally against the running gateway: index 200, deep route
  200, `/api/status` 13/13, and the socket handshake returning **101** with the
  `ready` frame.
- `deploy.sh` — sync, build, restart, then ask the stack for its own health.
- `.env.production.example` — every secret that must not carry over from dev.

- `Caddyfile` + a `caddy` service — automatic Let's Encrypt, automatic renewal,
  HSTS, and `www` redirected to the bare domain (a passkey registered on `www`
  would be rejected on the apex, so the redirect is correctness, not polish).
  Only 80 and 443 are published; the app itself has no host port at all.
- `bootstrap.sh` — authorises the key, installs Docker if absent, ships the
  secrets as mode 600, opens the firewall, warns if something already holds
  80/443, then deploys.
- `.env.production` — generated for the domain with fresh Postgres, RabbitMQ and
  JWT secrets. Gitignored.

**Unverified until it runs on the server**: the certificate has never been
issued, Caddy has never started, and no image has been built on that machine.
The deploy script checks all of it from outside afterwards.

Still to do once it is live: a backup for the Postgres volume, and rotating the
root password that was shared in chat.

## 3d. Shipped since — verified on production

Each of these was checked against https://kinjy.com, not only locally.

- **Notifications, end to end.** The store, its endpoints and the model had
  existed from the start with *nothing calling them* — the bell was a link to
  /messages. Services now call `common/notify.py` on comments, replies, follows,
  invitations, acceptances, forum replies and community decisions. Stored first,
  pushed second: an offline member finds it waiting, an online one sees it
  arrive. Verified with two accounts — 2 unread, correct links.
- **Community governance.** Private communities collected `pending` rows nobody
  could answer; joining one was a request into a void. Queue, admit, decline,
  ban, promote are now real, and a *secret* community answers 404 rather than
  403 to a non-member — confirming an id exists would leak what the tier hides.
- **One-to-Many.** `/creators/publish` returned 202 and created empty rows on the
  promise that "the AI layer fills them in"; nothing did. Translations,
  newsletters and articles are produced for real; short video, long video, audio
  and carousel come back `unsupported` **with the reason**, because no media
  pipeline exists. Verified: 8 outputs, 6 produced.
- **Disappearing messages.** The timer belongs to the room, not the sender, and
  everyone is told when it changes. Expiry deletes on the read and write paths
  rather than from a sweeper, so there is no window where a "disappeared"
  message is still served. Verified: 0 rows left in the database.
- **Thread summaries.** Refuses threads under 8 replies — a digest of six is a
  worse version of scrolling — and names its provider, including when it is the
  mock.
- **Graveyard browsing.** `GET /memorials` was a 405: a memorial could be
  created and reached by QR and never found again. Search and listing added,
  public on purpose.
- **Media, twice broken.** Uploads pointed at `http://localhost:8200` in
  production because `MEDIA_PUBLIC_BASE` was missing from the server `.env`; and
  the production overlay's blanket `volumes: !override []` had stripped
  media-service's **data volume**, so every deploy destroyed the uploads. Both
  fixed; persistence verified across a restart and a full container recreation.

## 3e. What /family promises, measured against what it does

Checked on production 2026-08-20, promise by promise.

- **"Family-only by default. Trees are private."** — was **false, and it was a
  privacy defect, not a missing feature**: `/family/search` and `/family/tree`
  took no token, so anyone on the internet could search a name and read a whole
  family — real given names, real relationships, the dead included. Now: no
  token → 401; a stranger's token → **404, not 403**, because confirming a
  person id exists leaks the family they were looking for; a stranger's search
  returns nothing. Verified, and verified that the legitimate owner still reads
  their own tree, search and paths.
- **Sharing per branch** ("your maternal line never sees the paternal side") —
  **not built**. The rule enforced is coarser: you may read a tree you belong
  to. Splitting visibility by branch is a finer rule that does not exist yet.
- **"Legacy contacts"** — **not built**. No model, no endpoint. Nobody can be
  named as steward of a tree.
- **"Export anytime · GEDCOM-friendly data portability"** — **not built**. No
  export endpoint of any kind. The claim "your family data is yours — take it
  wherever you go" is currently unbacked.
- **Heritage AI** (archive, timeline, documentary, biographies) — endpoints
  exist (`/family/heritage`, `/family/timeline`), no screen calls them.
- Working as described: the person/edge graph, derived relationships, the Level
  model, re-rooting, the path finder with per-hop relation labels, and
  corroboration with the three-close-relatives rule for the deceased.

## 4. Not started

- **Creator Studio / One-to-Many publishing** (one idea → article, video, audio,
  newsletter). Backend service exists; no UI, no transformation pipeline.
- **Advertising platform UI** — commerce-service has campaigns and the rate card;
  no screen to buy or manage one.
- **Forum → knowledge base** distillation with citations.
- **Kinjy Leaders payout to an actual rail** — the monthly snapshot, the
  commission ranking, the fraud-review gate and `/admin/leaders-pool/pay` all
  work and credit member wallets. Getting that wallet balance out of the
  building still goes through the ordinary payout batch, which is mock until
  the NowPayments/Mangopay keys are set.
- **Referral-pool refund when the pool fills mid-payment** — if the last seat is
  sold between checkout and settlement, the payment is flagged `refund_due` and
  logged loudly, but nothing refunds it automatically yet.
- **Dispute evidence uploads** — the API accepts a list of media URLs per
  message and stores them; the dispute screen has no file picker, so evidence
  can only be described in words today.
- **Admin arbitration screen** — `/admin/disputes` and
  `/admin/disputes/{id}/resolve` exist and work; there is no console page that
  calls them, so arbitration is an API call right now.
- **Family Heritage AI** — `/family/heritage` and `/family/timeline` exist and
  answer; no screen calls them. The marketing page promises an archive, an
  interactive timeline, a narrated documentary and biographies. None of that
  has a UI.
- **Memorial death verification workflow** (UNCONFIRMED → REPORTED → UNDER REVIEW
  → VERIFIED) and the 3-relative corroboration for deceased persons — modelled,
  no UI.
- **Smoke test leaves data behind** — `smoke-test.sh` registers two members and
  posts several items on every run, and never cleans up. Fine locally, wrong
  against anything shared.
- **In-browser recording and trimming for shorts.** Publishing works — pick a
  clip, see the real 9:16 frame, caption it, upload with progress — and on a
  phone the picker offers the camera. But there is no MediaRecorder capture, no
  trim handles, no cover-frame picker and no sound library, which is what
  TikTok's *creation* side actually is. What ships is upload-and-publish.
- **Shorts discovery is chronological.** The reel is newest-first with paging;
  it does not run through the ranker, so there is no For You / Following split
  on this surface yet.
- **Quote reposts in the composer** — the API takes a body (`POST
  /posts/{id}/repost`), and a quote renders correctly if one exists, but the
  card's repost button only sends a plain share. There is no "add your thoughts"
  box yet.
- **Signed-out view counts** — views are recorded per member, so a visitor
  reading a public post is not counted. Deliberate: there is nothing to
  deduplicate against, and a per-session identity would inflate the figure.

## 5. Known gaps in things that *do* work

- **Assistant knowledge coverage**: keyword lists are mostly English, so some
  reasonable French/Swahili questions find nothing even though the localized
  answer exists (e.g. *"Comment mon paiement est-il calculé ?"* — the French
  answer says "revenus", never "paiement"). The answer-text fallback catches
  most, not all.
- **Language detection** separates Arabic and Chinese by script and
  French/Swahili/English by function words. Short or ambiguous input falls back
  to the caller's hint.
- **Translation** runs through the mock provider; output is `[fr] original`.
  Labelled as such in the UI.
- **Family tree**: relationship labels stop at "cousin (degree N), M removed" and
  otherwise say "related through N steps" rather than inventing a term.

## 6. Unverified in this environment

The browser pane does not composite frames here, so these were built but never
seen running:

- **Composer collapse on scroll** and its floating button — the logic is there;
  a hidden tab does not scroll, so it could not be exercised.
- **Hidden scrollbars** — the CSS is in place and `scrollbar-width` computes to
  `none`, but whether every scroll area still *feels* right is a visual call.
- **Dialog close animation** — Radix waits for `animationend`, which never fires
  in a hidden tab. Expected to be fine on a visible tab; worth one look.
- **The footer flicker, on screen.** The constellation canvas now draws nothing
  while off screen (measured: 0 frames), runs at 30fps instead of 60, and no
  longer allocates a gradient per arc per frame. That the result *looks* smooth
  is unverified — a background tab pauses rAF, so the on-screen behaviour could
  not be measured here.
- **Heading leading, on screen.** Display headings sat below Fraunces' ink
  height (1.02–1.10 against a measured 1.12–1.13em), so any heading that
  wrapped had line 1's descenders overlapping line 2's ascenders. Raised above
  the floor and re-measured; that the new rhythm *looks* right is a visual call
  nobody has made yet.
- **Light mode, beyond contrast.** Every text/background pair on the feed now
  clears WCAG AA (66 checked, worst 5.3:1) and the dark theme still does (15
  checked). Whether the paper palette *looks* like Kaluta — the gold on cream in
  particular — is a judgement nobody has made by eye.
- **The floating stack, seen rather than measured.** The orb and the feed's
  composer button now take numbered slots (`lib/floating.ts`) and were verified
  not to overlap at 1280×720 and 375×812 — but the composer button only mounts
  past 220px of scroll, which a hidden tab will not do, so the check was made
  with probe elements carrying the same classes rather than the real button.
- **Every screenshot-level judgement** — spacing, contrast, whether a design
  actually reads well. All visual claims in this project rest on DOM measurements,
  not on seeing the page.
