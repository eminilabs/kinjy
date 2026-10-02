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
| **End-to-end encrypted messages** | Messages and chat attachments are **encrypted at rest** (`MESSAGES_ENCRYPTION_KEY`), so a stolen database or backup reveals nothing — but the server holds the key and can read them. No key exchange exists, so nothing is end-to-end; the thread header says “Encrypted on our servers”, not “end-to-end”. | Per-device keys, a key agreement (Signal/MLS via a vetted library), multi-device and key backup. |
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
- **3-relative corroboration for deceased persons** — modelled with the family
  tree, which is hidden. The memorial death verification itself (UNCONFIRMED →
  REPORTED → UNDER REVIEW → VERIFIED) now has its UI; see Graveyard below.
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

## Graveyard (02/10)

Visibility, tribute moderation, editing, the public QR page, the life timeline,
the grave location, administrators and succession, anniversary reminders and
death verification are built, and covered by `backend/tests/e2e_graveyard.py`
(88 checks) plus a browser pass of `/memorial/:code` and `/graveyard` (visitor,
family and member; WCAG AA in dark and light; 390px). A death on 29 February
used to make the memorial impossible to create; it no longer does.

A full audit followed (`backend/tests/e2e_graveyard_audit.py`, 39 checks). It
found and fixed: any administrator could remove the first and then delete the
memorial; naming an administrator bypassed the contact and age rules; an
administrator's own message waited for their own approval; the reminder series
ended after an outage; a "captured at the grave" claim was taken on trust; a
published tribute could not be taken down from the screen; candles buried the
guest book; and the public `/memorials` page showed a dead button, a candle that
was never sent anywhere, a made-up legacy contact and a paid tier that does not
exist.

Not built — in the blueprint (`info.md` §8):

- **Photos and videos.** The blueprint says "photos/videos/voice". A memorial
  has one portrait, one cover and one voice recording, and a visitor's message
  may carry a photo; there is no gallery and no video anywhere.
- **Paid flowers and candles** ("free + paid"). `paid` and `amount` exist on
  tributes; nothing charges, and the public pages no longer show a paid tier.
  The age rule is already settled — every checkout passes the `payments` gate
  (18+, AGE-SAFETY.md §24–25). The blueprint gives no price and no split.
- **Digital legacy contacts** — named in the blueprint, nothing more: who they
  are, what they may do, and what triggers it are not written down.

Deferred by the blueprint itself:

- **AR memorials** — "future AR memorials".
- **"Family" visibility** is accepted and treated as private (administrators
  only): the family is whoever the family tree says, and the tree is hidden
  (`FEATURES.familyTree`).

Known limits:

- **"Captured at the grave" is the device's word.** The location is marked
  confirmed when the device reports a position within 50 m; nothing proves the
  phone was at the grave, and a client that lies about its accuracy is
  believed.
- **No rate limit on visitors** — nor anywhere on the platform. A visitor
  without an account can light any number of candles; an administrator can take
  them down one by one, but not in bulk. Their messages always wait for the
  family, so nothing they write appears unreviewed.
- **A tribute's author cannot withdraw it.** Only an administrator can take it
  down.
- **Deleting a memorial leaves its files** in media-service, restricted and
  owned by whoever uploaded them.
- **The reporter of a death is not told the outcome** unless they administer
  the memorial; the family is.
- **Reminders fall at midnight UTC** on the anniversary, not at the family's
  local midnight.
- **Staff are not notified** of a new death report; they see the queue on
  `/graveyard` when they open it.
- Verified locally only, not on kinjy.com.

## Circles (02/10)

Membership, smart circles and the audience rule are built and covered by
`backend/tests/e2e_circles.py` (80 checks) plus browser passes of `/circles`
(functional flow, live updates, WCAG contrast in dark, light and cloud, 390px).

**Audit of 02/10, fixed:** reply notifications reached members removed from the
circle; any holder of a post id could subscribe to its live topic; blank names,
non-letter countries and blank cities were accepted; two simultaneous adds
answered 500; circles and members had no upper bound; warnings and errors on
`/circles` were unreadable in light mode and several texts sat under 4.5:1.

What the tests do not cover:

- **Verified locally only**, not on kinjy.com.
- **Smart circles trust the profile.** "Followers in Kigoma" means followers
  whose own profile says Kigoma; nothing verifies where anyone lives.
- **Members are not notified** of a circle post; it simply appears in their feed
  and in the Circles mode. Deliberate for now — a notification per post would be
  noisy — but not decided.
- **Community-only posts are readable by their author alone**, by id as well as
  in the feed. That was already the feed's behaviour; nothing in the app reads a
  community's posts yet, so nothing visible changed.
- **Fixed on the way, worth knowing:** every signed-in member could read every
  followers-only post on the platform, and the Following feed was always empty
  (social-service called `/users/me/following` with an empty token). Both now go
  through the same audience lookup as circles.
- **A live subscription is checked when it is made**, not again while it is
  open: a member removed while their page is open keeps receiving counter
  updates for that post until the page reloads or the socket reconnects. The
  updates carry counts and ids, never text.
- **Shared app chrome under 4.5:1**, outside `/circles` itself: the `text-low`
  token is 3.7:1 in dark and 2.6:1 in cloud (profile card labels, handles), and
  the gold-gradient primary style is 3.5:1 in light (active nav chip,
  notification badge, buttons on other pages). `/circles` avoids both; fixing
  them is a design-token change for the whole app.
- **`e2e_messaging_age.py` fails** at "could not open messages: 403" — the
  parental tier lock from 25/09 refuses the teen account it registers. Unrelated
  to circles; the test predates the lock and needs a supervised teen.

## Parental supervision (25/09)

- **The teenager's side of the page has not been seen.** The parent's side was
  loaded as a signed-in parent at 1280px and at 375px, with a live supervision
  link and a pending request, and light mode measured clean (34 text/background
  pairs, none under 4.5:1). The teen's view — the accept/decline buttons on an
  invitation, and the wording of a request that was declined — was exercised
  only through the API.
- **`/earn` has the same layout bug this page shipped with.** It is not in
  `APP_ROUTES` in `Layout.tsx`, so the marketing navbar still renders above its
  app shell and the page scrolls with a dead band at the top. `/supervision` was
  added to that list; `/earn` was left alone because fixing it means checking a
  page that is not part of this change.
- **A parent's own supervised state is not shown on the teen's side.** Either
  party sees the link and the requests, but neither sees the other's display
  name — only ids come back from `/supervision`. Workable, unfriendly.
- **No email or push when an invitation arrives**, only the in-app bell. A
  parent who is invited and does not open Kinjy never learns of it.
- **Time limits are set but not enforced by this feature.** The number is
  written to `preferences.daily_limit_minutes`, which the existing wellbeing
  counter already reads; that the enforcement path honours a parent-set value
  exactly as it honours a self-set one has not been re-verified since.

## Moderation: reports, decisions, appeals (28/09)

- ~~The member side has no screen.~~ Built: `/moderation` shows what was
  restricted, in plain words rather than column values, and takes the appeal.
- **No refusal is appealable, and that is not a bug today.** Every
  `block_publication` in the classifier also sets `escalate_child_safety`, so
  every refusal is a child-safety escalation and correctly leaves the ordinary
  appeals path. It does mean the `refused_publication` appeal branch is
  currently unreachable. `e2e_moderation.py` asserts this explicitly, so the
  day the classifier blocks for some other reason, that check fails and says
  so rather than the branch quietly coming alive untested.
- **Overturning clears the graded levels wholesale.** A reviewer who thinks a
  post was rated 18+ wrongly cannot say "it is violence 1, not sexual 2" — the
  appeal zeroes every category. Fine for the common case, crude for a genuinely
  borderline one.
- **No appeal against an account-level action**, because there are no
  account-level actions yet: no suspensions, no strikes, no rate limits imposed
  by moderation. When those arrive they need their own decision records.
- **Nothing expires.** Decisions and reports accumulate forever. A retention
  policy matters here more than most tables, since `body_snapshot` holds text
  that was refused publication.
- **The SLA is decorative.** Appeals get a `due_at` and overdue ones sort
  first, but nothing escalates, nobody is paged, and no appeal is ever granted
  by default for going unanswered.
- **`social-service/main.py:140` has an invalid escape sequence** (`\w` in a
  non-raw string) that Python warns about on every import and will eventually
  make an error. Pre-existing, one line, untouched here because it is in the
  hashtag regex rather than in anything this change covers.

## Trust & Safety console (28/09)

- **Seen at 1280px and 375px in both themes, with live queues.** The console's
  own text passes WCAG AA in light and dark (570 elements, size-aware
  thresholds). Overturning an appeal from the page was exercised end to end and
  the counters moved (review queue 131 → 130, appeals 5 → 4).
- **Three app-chrome contrast failures are pre-existing and untouched**: the
  avatar initial (1.12:1), the mobile bottom-nav labels in light mode (2.25:1),
  and `AppShell`'s subtitle in dark (3.96:1). Confirmed by running the same
  audit on `/circles`, which fails on exactly the same elements. They belong to
  components every app page shares, so they are not this change's to fix.
- **My first two contrast audits were wrong and would have sent me fixing
  nothing.** The first compared against a non-composited ancestor background,
  so a 10%-alpha overlay read as opaque near-white and a dark-mode button came
  back at 1.0:1. The second applied 4.5:1 to every element, including 24px
  semibold numerals whose AA threshold is 3:1. Only the third measurement —
  alpha-composited, size-aware — is the one quoted above.
- **No pagination.** The queue shows the first 50 of however many; with 131
  pending there is no way to reach the rest from the page.
- **No filtering or sorting**, so a reviewer cannot say "media only" or "most
  reported first", which is how this queue will actually want to be worked.
- **Rating is one-click and total.** The buttons set `age_rating` only; the
  graded category levels are shown but cannot be edited, so a reviewer cannot
  record "violence 1, not sexual 2" — the same bluntness the appeal overturn
  has.
- **Nothing refreshes on its own** and there is no optimistic update: every
  action refetches all three queries, which is fine at this size and will not
  be at ten times it.
- **The rest of `/admin` is still a mockup.** Ledger, KYC, fraud, leaders pool
  and AI watch are all static markup with invented figures, exactly as the
  moderation section was until today.

## Member moderation screen and reporting (28/09)

- **Reporting had no entry point at all until now.** The whole reports
  pipeline — three-from-distinct-accounts, the author's own report not
  counting, urgent routing for child-safety — shipped with no way for a member
  to file one. It is on the post card now. Comments can be reported through the
  API but have no control in the UI, so half the pipeline is still unreachable
  by hand.
- **A report that fails to send used to claim it had been filed.** The first
  version set "Thanks — a reviewer will look at this" optimistically and
  swallowed the error; the first time the local gateway was down it said
  exactly that while the request had been refused. Somebody reporting a child
  at risk has to be able to believe that message, so it now waits for the
  server and offers a retry on failure. What is still withheld is the outcome —
  whether the report moved a rating — because that is what makes reporting a
  way to probe the threshold.
- **No way to see or withdraw a report you filed.** Once sent it is gone from
  the member's view entirely, and the button just reads "Reported" until the
  page is reloaded, after which it offers to report again (the server
  deduplicates, so nothing doubles, but the UI does not know that).
- **The appeal box has no character counter** against its 2000-character limit,
  and a member who writes past it gets a silently truncated field.
- ~~The member page's "we could not check" state has not been seen.~~ Checked
  on 28/09 by stopping `social-service` so the decisions call fails while auth
  stays up: the page shows "We could not check this right now — this is not the
  same as nothing being restricted" with a retry, does not fall back to the
  reassuring empty state, and recovers through the retry button once the
  service is back. Patching `fetch` in the page never worked for this, because
  the navigation needed to remount the route discards the patch; stopping the
  service is both simpler and closer to the real failure.

## Deploying leaves deleted files behind (02/10)

- **`deploy.sh` copies but never deletes, and it finally cost a deploy.** The
  tree ships as a tar extracted over the top of the last one, so a file removed
  from the repository lives on the server forever. Merging develop deleted four
  unused shadcn components whose packages had also been dropped from
  `package.json`; the stale copies on the server were still in the build
  context, so `npm run build` type-checked files that no longer exist here and
  failed on four modules nobody imports. Nine stale files were found in all,
  dating back to 16 August, including `backend/social-service/classifier.py` -
  moved to `common/` on 25/09 and still sitting in production a week later.
  They have been removed by hand. The fix belongs in `deploy.sh`: extract into
  a fresh directory and swap, or carry a manifest and delete what is not in it.
  Until then every deploy inherits whatever the last one left.
- **Nothing was lost by it this time** - the deploy failed at the build step,
  before production was touched, which is the behaviour you want. But the
  failure pointed at files that do not exist in the repository, which is a
  confusing place to start debugging.

