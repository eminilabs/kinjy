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

*Checked 20/08. Superseded: FT-03 to FT-07 (12/10) changed most of this. The current
state of each promise is in "FT-07: what the product says about the family tree", at the end.*

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
  newsletter). Partly built — a Studio screen for articles, newsletters and
  translations, and a media pipeline (carousel, audio, short and long video) on
  a synthetic voice. Dubbing, lip sync and editing footage are not. See
  "Creator Studio (07/10)" and "Creator Studio media pipeline (08/10)" below.
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
- **3-relative corroboration for deceased persons** — built with the family
  tree, which is open in the app since 06/10 (see "Family tree" below). The memorial death verification itself (UNCONFIRMED →
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

**Gallery of photos and videos (06/10)** — built (`info.md` §8, "photos/videos/voice"),
covered by `backend/tests/e2e_graveyard_gallery.py` (66 checks) and a browser
pass of the grid, the viewer, the family's screen, light mode and 390px (55
checks, WCAG AA). The family adds, captions, orders and removes up to 60 photos
and videos (500 MB in all); each carries an origin label; some can be marked
sensitive; an approved visitor photo can be promoted into it.

Not built — in the blueprint (`info.md` §8):

- **Paid flowers and candles** ("free + paid"). `paid` and `amount` exist on
  tributes; nothing charges, and the public pages no longer show a paid tier.
  The age rule is already settled — every checkout passes the `payments` gate
  (18+, AGE-SAFETY.md §24–25). The blueprint gives no price and no split.
- **Digital legacy contacts** — named in the blueprint, nothing more: who they
  are, what they may do, and what triggers it are not written down.

Deferred by the blueprint itself:

- **AR memorials** — "future AR memorials".
- **"Family" visibility** is accepted and treated as private (administrators
  only): the family is whoever the family tree says. The tree is open in the app
  (`FEATURES.familyTreeApp`, 06/10); the public `/family` page stays hidden
  (`FEATURES.familyTree`).

Known limits of the gallery:

- **No thumbnails.** There is no ffmpeg in media-service, so the grid loads the
  pictures themselves (25 MB at most each, twelve before "Show all"), and a
  video's first frame stands in for a poster.
- **A video must be playable where it is watched.** MP4 and WebM only; an iPhone
  `.mov` is refused with what to do. An MP4 encoded as HEVC passes the checks but
  Chrome and Firefox cannot play it — the viewer offers the download. Nothing is
  converted.
- **50 MB per video** because the gateway holds a whole upload in memory
  (`await request.body()`). Raising it means streaming the body through the
  gateway first.
- **Media is not age-rated.** The classifier cannot look at a picture, and posts
  with media stay adult-only until a person reviews them. A memorial gallery is
  shown to everyone — signed-out visitors, who are the people at the grave, and
  minors included — and the family's "sensitive" mark (blurred until shown) is
  the only guard. A decision, not an oversight; AGE-SAFETY.md says so.
- **Only the gallery's own files are deleted** with their item or their
  memorial. The portrait, cover, voice and tribute photos still stay in
  media-service, because the same bytes can be shared with a post.
- **A video's link lasts an hour, a picture's five minutes.** A picture whose
  link ran out asks for fresh ones and a second failure within ten seconds is
  believed. The page does not renew links while it is untouched.
- **Error red on the dark theme is 4.3:1.** The theme's `--danger` is `#DE5C5C`;
  small text needs 4.5:1. The gallery shows problems in normal text with a red
  icon; the other 17 uses in Circles and Graveyard (51 in the app) are a token
  change away from passing.

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
- **Deleting a memorial leaves its portrait, cover, voice and tribute photos** in
  media-service, restricted and owned by whoever uploaded them (the gallery's
  files are deleted).
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


## The imported members have not signed in yet (05/10)

- **Nobody has verified that DSM's password hashes authenticate here.** The
  library half is settled: passlib's bcrypt accepts a PHP-style `$2y$` hash
  with the same cost and salt, verifies the right password and rejects a wrong
  one, and the `error reading bcrypt version` line in the logs is trapped and
  harmless. An earlier run that raised `UnknownHashError` proved nothing - the
  test string had been mangled by shell quoting, not by passlib.
- **What is still unknown is the shape of the 14,791 hashes now in production.**
  All 14,791 rows have *a* hash, but their prefixes were never counted. If any
  of them are legacy MD5 or SHA rather than bcrypt, those members cannot sign
  in and will get "wrong password" rather than anything that explains itself.
  The check is one query - the prefix and length distribution of
  `auth.users.password_hash` - and it was not run because reading production
  was refused at the time. **Run it before telling anyone their account is
  ready.** A non-bcrypt hash is not a disaster: it means a forced password
  reset for those members, which is a decision to take knowingly rather than
  discover from support messages.
- **No imported member has actually logged in end to end.** Hash shape aside,
  the sign-in path for these accounts - no `users.profiles` row until it is
  materialised on demand, no age profile for the 7,484 without a usable birth
  date - has not been exercised once against production.

## A 200 MB limit nobody could reach (05/10)

- ~~Large photo and video posts fail against UploadCenter.~~ Fixed and deployed
  on 05/10: the client that sends the file had a flat 15-second timeout, which
  httpx also applies to the write phase, so that was the budget for pushing the
  whole body to R2 on a service advertising a 200 MB limit. The send now has
  its own budget scaled to the file.
- **The suite had been green through all of it.** Its large-file check uploaded
  an mp4 header followed by 8 MB of random bytes; local storage never looked
  inside a file, so it passed, and UploadCenter - which decodes what it is
  given - refused it for being a fake, hiding the timeout underneath. A test
  fixture that no real storage would accept is not a test of storage.
- **The deploy restarted postgres and rabbitmq, not only media-service.**
  `up -d --build media-service` recreated its dependencies too, so the whole
  platform took a short database blip for a one-service fix. Everything came
  back healthy (13/13), but a targeted restart is not as targeted as it looks.

## Changing a password is not recovering one (05/10)

- ~~There is still no "forgot password" flow.~~ Built on 05/10: ask by email,
  a one-hour single-use link, a new password, every session signed out. It is
  also what answers a legacy hash - a member whose imported hash cannot verify
  can get back in without anybody editing the database by hand.
- ~~But nothing can be sent until SMTP is configured.~~ Configured on 05/10:
  Resend over SMTP, from no-reply@kinjy.com, on a key whose account has
  kinjy.com verified. The flow is live on kinjy.com.
- ~~No mail has ever been sent from production.~~ One real message was sent on
  05/10 to the owner's own Gmail address and Resend reported it `delivered`. So
  the path works end to end: DNS, DKIM and the handoff. What that single send
  does *not* prove is which folder it landed in, or how other providers treat
  it - one delivered message to one Gmail account is a working path, not a
  reputation.
- **The sending account is shared with Digital Shopping Mall.** Its reset mail
  goes out on the same Resend key, so a bounce or spam complaint earned there
  costs Kinjy reputation too, and one address was already in a suppressed state
  on that account. Worth separating if either platform starts sending volume.
- **No Kinjy address has ever been verified.** `email_verified` is on the model
  and is never set to true anywhere, so a reset link goes to whatever address
  was typed at registration or imported from DSM. That is the usual model and is
  not wrong, but it is worth knowing it is unchecked.
- **An access token outlives the change by up to 30 minutes.** Revoking the
  sessions stops renewal, but a token already issued keeps working until it
  expires, so somebody who had the account is out within the half hour rather
  than at the moment the member presses the button. Closing that properly means
  checking `password_changed_at` against the token's `iat` on each request.
- **Nobody is told their password changed.** There is no email or notification,
  so a change made by somebody else passes unannounced. The endpoint publishes
  `user.password_changed` for a notifier that does not exist yet.
- **The new panel is in English only**, like the rest of the security screen.
  It joins the pages still waiting on the translation pass.

## Communities became groups (05/10)

- ~~A post addressed to a community was visible to nobody.~~ Fixed and deployed
  on 05/10: members post into a community, its posts reach its members' feeds
  and its own page, membership is checked before posting, and a member can
  leave. Communities have shareable URLs (`/communities/<slug>`), and the
  destination survives the sign-in door.
- ~~A public community is readable by the API without signing in, but not in
  the browser.~~ Opened on 05/10: a visitor reads a public community and its
  posts with the marketing chrome rather than the member shell, and the join
  button sends them to sign in and back. Private shows its name and description
  but not its posts, so it can be asked to join; secret stays a 404.
- **Nothing notifies a community when somebody posts in it.** Joining a group
  and then having to go and look at it is most of the way back to a forum. The
  notify helper is already used for join requests and could carry this.
- **The community page is English**, like the rest of the app pages, while the
  landing, sign-in and reset pages are in five languages.
- **No pagination on a community's posts.** The endpoint takes limit and offset
  and the page asks for the first twenty, so a busy group silently stops at
  twenty until somebody wires the rest.

## Feed, video and link previews (06/10)

- ~~A post could not be opened without leaving the feed, video used the
  browser's own player, and there was no scroll-to-load.~~ Built on 06/10:
  post dialog with comments, "people you follow who were here", scroll-to-load,
  a custom video player that follows the viewport, and link unfurling.
- **Scroll-to-load and video play-on-scroll were never seen working in a
  browser.** Both depend on IntersectionObserver, which delivers no callbacks
  while the page is hidden — and the test pane runs hidden, confirmed by
  `document.hidden === true` and by a hand-made observer on the same node also
  never firing. The data path underneath was checked instead (six pages, 120
  posts, no overlap), and the attach bug that *was* found came from reading the
  code, not from the browser. Somebody should scroll a real feed before this is
  called done.
- **A photo post previews as the generic Kinjy card until it is classified.**
  The share card only describes a post a signed-out visitor could read, and a
  freshly posted image is UNCLASSIFIED, which fails closed. That is the right
  call for safety and the wrong experience for somebody sharing a photo the
  moment they post it. Measured in the local stack only — nobody has timed how
  long classification takes in production.
- **The unfurler list in the Caddyfile is a list.** An unfurler not on it gets
  the app and therefore the generic card. That is the safe failure, but it does
  mean the list needs revisiting when a messenger matters enough.
- **Only the first link in a post is unfurled**, and only when the post has no
  media of its own.
- **Nothing refreshes a link card.** A page that changes its title keeps the
  old one for seven days, and a dead link keeps its card until then too.

## Family tree (06/10)

The tree was hidden behind one switch since 28/09. It is open **in the app**
(`FEATURES.familyTreeApp`: `/tree`, its privacy settings, the family search in
Explore). The public site's `/family` page and every line of copy advertising it
stay hidden (`FEATURES.familyTree`) on purpose, because that copy still promises
what is not built (below).

**Found and fixed, each reproduced against the running service before the change:**

- ~~"Trees are private" was still false after 20/08.~~ `GET /family/persons`
  listed **every person on the platform to anyone, with no token** (added after
  the earlier fix, to fill the screen's picker), and `/persons/{id}`, `/timeline`,
  `/duplicates`, `/heritage` and `/disputes` answered anyone too. All now answer
  the family only; a stranger gets 404, never 403.
- ~~Anyone with an account could write into anyone's tree.~~ Linking two people
  who were not members, confirming, and **disputing** (which marks the person
  `disputed`) needed no place in the tree. Writing now needs being in it; a
  member's node also needs that member's `who_can_add_family`.
- ~~The model accepted what cannot be true:~~ the same marriage written both ways,
  a spouse who is also a parent, two parent edges for one pair, a parent born
  after the child, dates in the future or out of order. Refused by the service,
  and backed by two partial unique indexes.
- ~~`PATCH` could not clear a field and could reassign `user_id` (a 500).~~
- ~~No way to remove a person.~~ `DELETE /family/persons/{id}`.
- ~~Siblings declared without a shared parent never appeared in the tree.~~
- ~~Every read loaded the whole relationships table.~~ Now only the family's
  connected component, and a tree response is capped at 250 people.

**Still not built (and stated, not hidden):**

- **Links are never verified.** A relationship is created `pending` and nothing
  moves it to `verified`; only *people* are corroborated. The screen therefore
  shows no verified/pending mark on lines, and "how are we related" reports 0
  verified links.
- **A member does not confirm a claim made about them.** The privacy setting only
  decides who may link their node; there is no "X says you are their cousin —
  accept?". (The setting's hint used to say there was; it no longer does.)
- **A dispute has no resolution path.** `disputes.status` can be `resolved` but no
  endpoint resolves one, so a disputed person stays disputed.
- **A deleted account leaves its node behind.** `user.deletion_requested` has no
  consumer; the node keeps a `user_id` that no longer exists and stays readable.
  `memorial.person_id` can likewise point at a person who was removed (services do
  not read each other's tables).
- **No age rule.** Nothing here treats a minor's node differently; the only
  protection is the owner's `who_can_see_family` / `who_can_add_family`
  settings, which parental supervision already constrains.
- **No cap on parents.** A person can have any number of `parent_of` edges; the
  graph assumes at most two for "full sibling" but does not enforce it. A product
  decision, not an invention to make here.
- **Per-branch sharing, legacy contacts, GEDCOM export, Heritage AI screens:**
  unchanged from 3e, and the reason the public page stays hidden.
- **The unique indexes need a clean table.** They are created by the service's
  migrations; on a database that already holds duplicate spouse or parent rows
  the migration fails (logged, not fatal) and only the service-level check
  applies. Look for `migration failed (family-service)` after deploying.
- Relation labels still stop at "cousin (degree N)" and otherwise say "related
  through N steps" (a step-parent shows that way), rather than invent a term.
- The tree and list views were exercised in a headless browser at 1440 and 390 px
  in both light and dark; not on a real phone, and not with a screen reader.

## Family tree against `todo copy.md` (07/10)

The product reference for the family tree is Module 5 of `todo copy.md` (untracked;
there is no `todo.md`). Compared with what was built on 06/10, before the second pass:

| `todo copy.md` says | State before this pass | Decision |
|---|---|---|
| Primitive edges only (`parent_of`, `spouse_of`, `adoptive_parent_of`, `guardian_of`, `sibling_of`); half-sibling and every complex relation computed, never stored | Matches. Checked on a blended family: full and half siblings were derived correctly from shared parents | Kept. A father/mother `role` is an *attribute of a parent edge*, not a new edge kind |
| Level model: root 0, ancestors positive, descendants negative | Matches | Kept |
| Trees strictly private, 404 for a stranger; 3 close confirmations for a deceased person | Matches (hardened on 06/10) | Untouched |
| Mobile: `Vue Générations` with **expandable cards Parents / Moi & Conjoint / Enfants** | A list by generation, **not expandable**, no such grouping | Rebuilt as expandable sections |
| Mobile: pinch-to-zoom and pan on the graph | Missing (the graph only scrolled inside its box) | Added, with zoom buttons |
| Graph view by default on desktop, generations view by default on mobile | Matches | Kept |
| Phase 2: invite a relative by link and claim the node on sign-up | Not built | Out of this pass |
| Phase 3: record oral histories on a person | Not built | Out of this pass |
| Phase 4: set `FEATURES.familyTree: true` | **Not done on purpose.** The app side is open through `FEATURES.familyTreeApp`; `familyTree` keeps hiding the public `/family` page while its copy promises what is not built | Deliberate gap, unchanged |
| *(silent)* gender, father/mother, how unions are drawn, blended families, layout rules | Gender was optional free text; no father/mother; "add a sibling" wrote a `sibling_of` edge; lines ran parent-to-child one by one and crossed cards | Decided with the product owner, below |
| *(outdated)* names `FamilyGraph.tsx` and the branch `feat/family-tree-mobile-ux` | `FamilyGraph.tsx` was replaced on 06/10; work is on `feat/family-tree` | Noted |

**Decisions where the todo is silent** (validated 07/10):

- `relationships.role` is nullable (`father`, `mother`, or unknown) and only on
  `parent_of` / `adoptive_parent_of`. `gender` belongs to the person; `role` to the
  relationship; **neither is ever derived from the other**.
- No "one father, one mother" limit. Biological and adoptive parents must coexist,
  and a rule across filiation types is not in the todo. The integrity checks that
  already exist (no loop, no duplicate pair, no parent born after the child) stay.
  The narrow rule *"within `parent_of` only, a child has at most one `father` and
  one `mother`"* is **proposed, not introduced**; it needs a product decision.
- Adding a sibling asks which parents are shared and writes real parent edges;
  `sibling_of` remains only for "parents unknown". Half-sibling stays derived.
- A union is a drawing device (the parents of a child), not a stored entity.
- End of a union (`relationships.until`) stays unexposed: the todo does not ask.
- Labels: Father / Mother when the role is known, otherwise Parent. No attempt
  yet at grandfather, uncle or cousin beyond what the graph already derives.

**Done in this pass (07/10), and what it still does not do:**

- Father / mother as a role of the parent link, gender as a choice on the person; a
  parent is added by saying father, mother or "parent, role not given". Existing
  links have no role and read "Parent" until it is set (the Links list lets the
  member who made a link set or clear it). Gender entered earlier as free text is
  shown as entered and drawn neutral unless it reads as woman or man.
- A brother or sister is added by ticking the parents they share; real parent links
  are written and half/full is derived. A child can name the other parent, so a
  person with several partners can have children from each union.
- The tree is drawn as a genealogy: generations in rows, one stem and bar per set of
  parents, partners side by side, nothing drawn across a card (measured on the
  rendered page for a simple family, many siblings, half-siblings by the mother and by
  the father, two unions, three generations, on a wide screen and at 390 px).
- Phone: Parents / the person and partners / Children as expandable sections; the
  graph zooms (pinch, Ctrl+wheel, buttons) and pans (drag).

Still open, stated rather than hidden:

- **"One father, one mother" is not enforced** and is proposed only: *within
  `parent_of`, a child has at most one `father` and one `mother`*. Adoptive links are
  excluded on purpose. It needs a product decision before it becomes a rule.
- **Parents on two different generations** (a person reached by two paths at different
  levels) can make a stem run across a card in between. Not seen in any family built
  here; the layout does not detect it.
- **More than two partners in a row**: a person can touch only two of them; the others
  are joined by a line under the cards (a person with three unions in a row is placed
  without overlap or crossing, but one of the partners is not adjacent).
- **Pinch and drag were exercised with emulated touch**, not on a real phone.
- Phases 2 (invite a relative by link, claim the node on sign-up), 3 (oral histories)
  and 4 (`FEATURES.familyTree`) of the todo are untouched.

### Layout engine rewritten (07/10, third pass)

The positions used to come from a relaxation (order by the parents' average, then a
least-squares compaction), so nothing guaranteed that a union's children were centred
or that a subtree stayed together. They now come from `arrange.ts`, a pure function
of the family structure: unions (the parents of a child) → chains (partners and
co-parents side by side) → one block per chain with a group of children per union →
bottom-up packing by contour → each group centred exactly under the point between its
parents (parents move apart rather than the children together) → top-level families
packed the same way. Ties are broken by birth date then name, never by the order the
server lists things in, and the person you are viewing is not the origin.
`layout.ts` only turns the positions into cards and connectors.

- Data model: unchanged. The one server change: adding a brother or sister with exactly
  one shared parent can name their *other* parent (someone in the tree who is not a
  parent of the person added to), so a half-sibling is a child of the other union and is
  never drawn under the first person's other parent. Parents unknown stays declared siblings.
- Tests: `app/scripts/test-family-layout.mjs` runs the algorithm on synthetic families
  (no browser): same generation = same Y, no overlap, no connector through a card,
  parent above child, each child drawn under its real parents only, children centred
  on their union to the pixel, half-sibling in the right group, unions not interleaved,
  same positions for the same data in any input order, and a new grandchild not
  reordering the rows above. Run: `docker compose exec web node scripts/test-family-layout.mjs`.
- Honest limits: two families joined by a marriage (a person who is a child of two
  trees) are drawn as two trees side by side; the second one's parents stand as near as
  they can to their child and the bar runs longer (`Layout.crossLinked`), it is not
  centred. A mother between two unions with wide descendants gets a long partner line.
  A tree this wide shows small cards when fitted on a desktop (zoom floor lowered to 25%).
- The line between two parents of the same child belongs to the union and is computed
  from the final positions; a `spouse_of` link is not needed to draw it (and none is
  created). When the pair are also recorded spouses, the spouse line is the one drawn.


### FT-01: invite someone to claim their place (built)

A member who added a living adult to their tree can make a link for that person
(`/tree/invite#t=<token>`) and pass it on themselves; Kinjy sends nothing and stores no
contact. The token is 256 bits, stored only as a SHA-256, works once, lives 7 days, can be
withdrawn, declined or superseded (one live link per person), and reads as the same plain
404 whether it never existed, expired, was used, withdrawn or declined. A visitor learns only
that a link is good; a signed-in member learns the invited person's given name. Accepting is an
explicit button: it attaches the account to the node (`status` becomes `verified`, as when
someone makes their own node), only for an adult account with no node yet (a second place is
never merged), never the inviter, never a minor (unknown age counts as a minor). Every
operation is audited (`family.invitation_events`, no token) and expired data is purged lazily
(invitations 90 days after expiry, events 365 days). Guessing is limited per source address.

Without touching auth-service or `/join`: the token rides in the URL fragment, is remembered
in the browser, removed from the address bar, and the visitor goes to
`/join?mode=signup|signin&next=/tree/invite`, which the sign-in page already honours.

Limits, stated rather than hidden:
- **Accepting makes the member belong to the tree**, so they then read it by the ordinary rule
  (belonging); the link itself never opens anything. Whether a claimed relative should see the
  whole connected family is an FT-02/FT-03 question.
- The acceptance page now says, before the choice, what joining the tree lets the member see
  (everyone connected through recorded links, their details, the archive kept for them) and do
  (add relatives and links, confirm or dispute). Limiting that access (for example to a branch
  or to the nearest relatives) means changing the read rules in family-service `access.py`;
  that is FT-03, not done here.
- The author of a node keeps edit rights on it after the claim (existing `created_by` rule).
- A node under 18 cannot be invited, and a minor's account cannot accept; there is no
  guardian-led path yet.
- The rate limit is in memory and per replica; it resets when the service restarts.
- An account deleted later keeps `Person.user_id` pointing at it: no consumer of
  `user.deletion_requested` exists in family-service (outside this task's scope).
- Invitations arriving through `/join?ref=` are not affiliate invitations: no sponsor credit
  is created, and registration proceeds as it does today.
- Browser flows (inviter panel, visitor, sign-in round trip, accept, phone) were run with
  headless Chrome scripts kept outside the repository.

### FT-02: roles in a family tree (built)

A role is held through a membership (`family.memberships`), anchored on the member's own place;
being a relative gives nothing. **Viewer** reads. **Contributor** adds relatives and links, edits
and removes what they added, confirms or disputes, adds to the archive, and invites Viewers onto
nodes they added. **Owner** also edits or removes any node that is not a member's, removes any
link, manages members (list, change role, remove) and invites Viewers or Contributors. A tree
always keeps an owner (no demoting, removing or leaving as the last one, and a last owner's own
place cannot be deleted while others hold roles). Readers admitted only by the owner's
`who_can_see_family` stay outside membership and read-only. Invitations carry the role (Viewer by
default) and stop working if the inviter loses the authority to grant it. Confirmations only count
from members who may still contribute. The server decides everything; `permissions` returns
`role`, `can_manage_members`, `invite_roles` and the existing flags.

Migration (once, at startup; `family.markers`): existing members become Contributors, so nobody
loses what they could do. An Owner is named only when exactly one member of a tree added their
*own* place themselves; any other tree is written to `family.ownership_reviews` and has no owner
until a person settles it (there is no tool for that yet). People without an account, or without a
recorded author, never get a membership.

Decisions and limits, stated rather than hidden:
- **Joining two trees is not done by linking.** A link between two trees is refused unless the
  second tree is the caller's alone (nobody else holds a role in it); that one is absorbed and the
  role it gave them goes with it. Linking into another member's tree (previously allowed with the
  member's `who_can_add_family` consent) now returns 404: use an invitation. Real fusion needs its own design.
- **Platform admins** keep, for now, the edit/delete access family-service already gave them, distinct from the roles. Whether a dedicated audit trail is needed for it: yes, it should be logged before it is used in production (nothing records it today). The split rule applies to them too.
- **A viewer may correct the personal details of their own place, and nothing else**: they cannot remove it, create or link people, confirm, dispute, invite or manage members. Contributors and owners may still remove their own place.
- **Trees left without an owner** by the migration (see `ownership_reviews`) cannot have members
  managed or contributors invited; contributors keep what they had.
- **Removing a person or a link that would split a tree** is refused (409, naming who would be left) unless every part keeps an owner; a tree that had no owner is left as it is. As a consequence a person cannot be unlinked from the tree, only removed, unless their part has its own owner.
- The members panel appears on the owner's own place; an owner with no place of their own (old
  data) has no screen for it yet.

### FT-04: GEDCOM export (built)

An owner can download their tree as GEDCOM 5.5.1 (UTF-8), after a preview with the numbers
(`POST /family/persons/{id}/export`, preview at `.../export/preview`). Export only: there is no
import. Only owners may export: being allowed to read a tree is not being allowed to send it out of
Kinjy (a contributor, a viewer, a reader admitted by `who_can_see_family`, a stranger and platform
staff are refused). No photos, documents or file links.

- **Hidden by default.** A person is written in full only if explicitly recorded as deceased (flag or
  death date) *and* verified. Nobody is judged dead by age. Everyone else is `Private`: no name, sex,
  dates, places or notes, but still in the structure, so the file shows that they exist and how they are
  related. The preview, the screen and the file's own header say so, with the counts (living or not
  recorded as deceased; record not verified).
- **No invented roles.** HUSB/WIFE come only from the father/mother role a parent link records.
  Unknown or clashing roles are left out of the family and counted; couples with no recorded roles,
  guardian links, declared siblings and disputed links are left out and counted, in the preview and in the header.
- **Recorded:** `family.export_events` (who, when, from which person, people, included, hidden;
  never the content), kept 365 days; five exports an hour per member (in memory, per replica).
- Limits: a tree over 4000 people is refused rather than cut; the number of people is not hidden by the masking;
  the file name is `kinjy-family-YYYYMMDD.ged` (the browser builds it if the server header is not readable);
  GEDCOM files produced were checked with a strict structural reader written for the tests, not with
  third-party genealogy software.
- The public `/family` page says "Export anytime": that promise now has a basis for owners (see FT-07).

### FT-03: sharing one branch (built)

A viewer can be limited to a branch: a person, everyone descended from them and the partners of
those (only the partners themselves, never their parents or other relatives), plus their own place.
It is applied where the tree is loaded (`access.load_family`, `access.reachable`), so the tree, a
person, search, the people list, paths, archive, timeline, duplicates, disputes, counts and the
tree size all show the branch and nothing else. A branch whose root is removed shows less, never
more. Branches are viewer-only: promoting a member clears it. An owner sets it on an invitation or
on a member, and the invitee is told exactly what will be hidden. Changes of role, branch and
joining are in `family.access_events` (ids only, kept 365 days).

- Limits: a co-parent who is not recorded as a spouse is outside the branch; a reader admitted only
  by the owner's `who_can_see_family` setting still reads the whole tree (that is the owner's explicit,
  separate choice); exports are owner-only so never limited.

### FT-05: trusted contacts (built)

An owner names up to three members who could take over the tree. Naming gives nothing and the
contact must accept. To take over they open a succession request: every owner is told, any owner
or the contact can cancel, and only after 30 days untouched does the contact become an owner (nobody
is removed). Refused for minors and for members limited to a branch; it lapses if the contact leaves
the tree or the one who named them is no longer an owner. There is no signal in this service that an
account is gone, so the owners' silence is what the waiting period measures. Applied by an hourly
sweep and whenever either side looks at it.

- Limits: the notification to owners is best effort (an in-app notice); nothing is sent by e-mail; an
  ownerless tree (`ownership_reviews`) has nobody who can name a contact.

### FT-06: heritage and AI, redefined (partly built, AI not)

No safe, real AI is available: the gateway produces only simulated output, and family data may not
leave local providers. So **nothing is generated and nothing is presented as AI**. Built: a person's
written memories (plain text, by contributors and owners, removed by their author or an owner, at
most 100 per person), a timeline from the person's own record and their dated memories, links
accepted only to our files (`/media/`) or https, no AI fields in the API. Not built: photo, document
and recording upload for people (no media-service flow and third-party files are sensitive),
transcription, restoration, biographies, documentary, voice interview, year in review, reunion
planner. They need a local model provider in ai-service and a decision on files of other people.

### FT-07: what the product says about the family tree (audit 12/10, closed 13/10)

Honoured and true in the app: private by default; roles; invitation to claim a place; sharing one branch
(read-only); trusted contacts with a waiting period; GEDCOM export for owners (living and unverified
hidden, no media); person confirmation with three close relatives for the deceased; how-are-we-related and
derived relationships; written memories and a timeline.

Corrected (every language that carries the text):
- `/family` (still hidden): heritage AI, narrated documentary, restoration, voice interview, year in review,
  reunion planner and "trees merge" removed or replaced; "verified" now says what is verified (people, not
  links); sharing, trusted contacts and export state their real limits; sign-up buttons. Simulated demo
  components deleted; `VerificationJourney` / `PathFinder` captions corrected.
- Landing: `landing.story.heritageText` (5 locales, "every link confirmed" removed) and the Premium line
  "Heritage AI" (`landing.plan.premium3a`, 5 locales) removed.
- Pricing: "heritage graph", "full export of ... family tree", "family records follow your succession
  settings" (gated variants) now say what exists; the home teaser no longer lists Heritage AI;
  `ModuleConstellation`, `HeroScene`, `platform/data.ts` and the platform visual no longer say "verified
  genealogy across infinite generations".
- Assistant knowledge base (`family-tree`, `heritage-ai`, `heritage-interview`, `family-year-review`, five
  languages): rewritten to what exists, the last three now say "not available yet" and what to do instead;
  deep links stay on the marketing routes the validator allows. `validate-kb.cjs` passes (49 entries).
- Samples and demos: a feed sample claiming "restored ... with Heritage AI", a home sample saying
  "verified our family tree", and the `/app` demo's "VERIFIED" edges ("RECORDED") corrected.
- The Developers page no longer has a family-tree API example (there is no public `/v1` family API), and
  the Memorials page no longer has a gated "remembrance gatherings" block (invitations and attendance do not
  exist).

**Not changed on purpose; no clear link to the family tree** (audit, with a proposed fix; each changes the
meaning of a claim, so each needs your decision):
- `platform/data.ts` Digital Graveyard card, bullet "Legacy contacts & succession": succession for
  *memorials* exists (up to three administrators); *legacy contacts* for memorials are "not available yet" on
  `/memorials` itself. Propose: "Memorial administrators & succession".
- `pages/PostPage.tsx` "Thirteen modules": hard-coded; the real number is `OPEN_MODULES`. Propose: `spelled(OPEN_MODULES)`.
- `creators/BadgeRow.tsx` "Family Historian" badge: nothing awards it. Propose: remove or mark as an example.
- Developers page (`family.path.find` in `AgentReadable`, `/v1/memorials/...`): there is no public `/v1` API
  at all; the page is a mock. Propose: a visible "preview, not available" label, or removal.
- Pricing "Messenger (E2E)" (see the messenger notes above) and the visible "Full export of posts, messages and
  media": nobody has checked that this export exists. Propose: verify, then keep or reword.
- `landing.plan.premium3b` "4K video": not checked.
- `app/.kb-seed.cjs` is a generated, tracked bundle of the knowledge base: stale until reseeded
  (`node seed-kb.cjs ...`); check the production table before enabling the assistant.
- `components/home/HeritageBand.tsx`, `ModuleConstellation`/`PricingTeaser` variants: dead or unused code
  that still carries the old wording; harmless, delete when convenient.

**`/family` stays off.** Everything the flag switches in the visible product is now true, so it could be
opened; it is the product owner's decision. Before opening: reseed or check the assistant KB (it
answers from whatever was seeded), and read the page once in the five languages' navigation (the page
itself is English only).

#### Release gates before the family-tree functions go to production
1. **Journal of administration actions.** Platform staff keep the technical power family-service has always
   given them over a tree: change or remove a link by its id, and edit or remove a node of a tree its owner
   opened to everyone. They have **no** power to read a private tree. Every such use outside the tree's own
   rules is now written to `family.access_events` (`admin_change_link`, `admin_edit_person`,
   `admin_delete_person`: who, which tree, what; no content), and nothing is written when a staff member acts as
   an ordinary owner. Still required before production: a place where staff can *read* that journal (no screen
   or endpoint exists), a retention decision (365 days today), and a decision whether this power should exist
   at all. Admin actions in other services are not covered by this.
2. **Trees without an owner** (`family.ownership_reviews`). The migration named an owner only where the history
   shows one beyond doubt, and wrote every other tree to this table (152 on the development data). In such
   a tree contributors keep what they had, nobody can manage members, invite contributors, export or name a
   trusted contact. **Nothing makes anyone an owner automatically.** Recommended process, to build as its own task:
   - an ownership claim, opened by a member who holds a role in the tree, with a short written reason;
   - every member of the tree is told; the claim runs a waiting period (30 days, as for succession) during which
     any member can object; with two or more other members, a majority of them must approve instead of waiting;
   - if nobody objects (or the majority approves) the claimant becomes an owner; if members object, the
     claim goes to staff for review, with identity checks and a written, journalled decision;
   - every step goes to the access journal; a tree with a single member and no objection follows the waiting period;
   - new trees always start with an owner (already true), so the table only shrinks.
   Until it exists the list is a task list for support, not an automatic grant.
3. **A real AI feature** (below) must not ship before its own gate.

#### Can IleAI feed FT-06? Evaluation (no code written, no data sent)
- Facts found: `.env` holds an `ILEAI_API_KEY` (its value was not read or printed); ai-service has **no
  IleAI provider** (its registry knows `mock`, `kimi`, `deepseek`, `anthropic`, `openai`, and only `mock` counts
  as local); a web search found no documentation, pricing, hosting location or data policy for a service by
  that name, so nothing about it can be confirmed.
- Rule in force: the gateway sends data marked `sensitive` only to local providers. Family data (living
  relatives, minors, the deceased) is sensitive. An IleAI reached over the internet would therefore be refused
  for it, unless it is shown to be self-hosted or covered by an agreement that it stores nothing and does not
  train on inputs.
- Verdict: **not feasible today**, and not attempted. It becomes feasible if all of these hold: (1) its
  documentation and data policy are provided and show where it runs, what it keeps and whether it trains on
  inputs; (2) a provider entry is added in ai-service's gateway (outside Family Tree, so a separate decision)
  with `local` only if truly local, or a new, explicit "approved processor" class; (3) the first use is narrow
  and reversible: summarise one memory a member has written, for a verified deceased person, on an owner's
  explicit opt-in per tree, shown as a draft labelled with provider and model, never written to the graph,
  published only by a person; (4) tested first on synthetic text only; (5) calls are metered by ai-service as
  now (tokens, not content) and listed in the access journal.
- Not suitable even then: restoring photos, transcribing recordings of other people, writing biographies,
  inferring any relationship or origin: they need files and facts that Kinjy neither stores nor may invent.

## Layout, cards and the black /hub (06/10)

- ~~`/hub` went black on refresh.~~ Fixed on 06/10: three paging hooks sat
  after SocialHub's `if (authLoading)` return, so the first render ran fewer
  hooks than the second — React error #310, unmounted tree. It only ever showed
  on a *fresh* load, because that is the only time auth starts in a loading
  state; reaching /hub from inside the app had auth already resolved and looked
  fine. Verified on production by hard-refreshing /hub signed in.
- ~~The feed card was see-through and the columns wasted a third of the
  screen.~~ Fixed: `--cloud` is opaque `#1C1F2D` under `[data-theme='cloud']`,
  the shell is `max-w-app` (1600px), and the right rail scrolls on its own.
- **The opaque card depends on `.force-dark` / `.twilight-field` being on every
  section that paints its own background.** Those classes redeclare `--cloud`,
  which is the only reason the marketing heroes keep their glass — the
  `[data-theme]` selector scopes nothing, since AppThemeProvider wraps the
  whole tree from main.tsx. A new dark section without one of those classes
  will get opaque cards against its background and look wrong. Verified on
  /creators, not on every marketing page.
- **The layout, dialog and push-toggle work was verified on production, not
  locally.** `app/node_modules` was empty for part of this session, so the
  local dev server could not be trusted; it has since been reinstalled (253
  packages) and `tsc -b` is clean.
- **`demo.diag.fbirbgei@example.com` is a real account on production**, created
  for these checks. It should be removed.
- **The imported `$2y$` hash prefixes still have not been verified against a
  real production row.** One query; it has been blocked twice.

## Mobile (06/10)

- ~~The site could be dragged sideways on a phone.~~ Fixed: `min-w-0` on the
  nav-demo column (/platform was 1535px wide on a 375px screen), and
  `overflow-x-clip` on the page shell for the scroll-reveal sections that sit
  at a translateX until they animate in.
- ~~Text bottomed out at 8px and icon buttons at 36px.~~ Floors added: 0.72rem
  (11.5px) under the phone breakpoint, 44px targets on a coarse pointer.
- **This is not a mobile-first redesign.** What was done is remedial: no
  sideways scroll, a legible type floor, thumb-sized targets - measured on
  every route at 375px. The layouts themselves are still desktop layouts that
  collapse to one column, and several pages deserve a phone-first pass in their
  own right rather than a `lg:` prefix removed here and there.
- **The floors are blanket CSS overrides, not corrected call sites.** ~470
  usages of the small tiers still say `text-[0.6rem]` in the markup and only
  look right because of the media query in index.css. Somebody changing the
  type scale needs to know that rule is there.
- **Verified by measurement, not by eye.** Screenshots timed out for most of
  this session because the browser pane was hidden, so the evidence is
  geometry: `scrollWidth`, bounding boxes, computed font sizes. Nobody has
  actually looked at these pages on a phone.
- **`pointer: coarse` was exercised in emulation only.** A real touch device
  may match differently.

## Sync of main into develop (08/10)

What came from where: replies, the composer's emoji/sticker panel, the redesign and the voice-note player are develop's; reactions (one emoji per person, counts not names), edit, delete, the sticker catalogue (glyphs, packs, age tier), push notifications, the arrival sound and the message toast are main's. A sticker reaction (BART's) no longer exists.

- **Anything that deletes a message leaves its attachment behind.** `DELETE /conversations/{id}/messages/{id}` clears the text and the reference, but media-service keeps the file, and a signed link issued before stays valid for up to its lifetime. Both `/internal/media/*/discard` endpoints exclude chat attachments on purpose. It belongs with the chat-attachment lifecycle work (`e2e_chat_attachment_expiry.py`), not with a patch on delete.
- **Deleting is allowed to a blocked member, and nothing keeps what was deleted.** Retracting your own words is a feature, but on a platform that takes child safety seriously it also means a message can be wiped after it was reported. A decision, not an oversight: either keep a short-lived evidence copy for reported messages, or accept it.
- **`/internal/*` authenticates nobody.** The gateway not routing them is the only protection, which is why one server-side request forgery (the push endpoint, fixed in this sync) reached order funding and age review. A shared-secret header on internal calls would make the next one harmless.
- **A push endpoint known to somebody else can be re-registered under their account** (the row is reassigned by design, so a browser that changes account keeps working). The endpoint is a long unguessable URL, so it takes a leak first; not changed.
- **`/forums` and `/tree` have the redesign's layout only partly**: both were rewritten on develop while the redesign restyled the old versions, so develop's pages were kept whole.
- **Explore's empty state** shows main's discovery lists (people to connect with, spaces to join) instead of the redesign's "Start typing to explore" card.
- **Legacy sticker reactions** are kept in `messaging.message_reactions_legacy` after the migration renames them; nothing reads them. Drop the table once nobody needs them.
## Creator Studio (07/10)

`/studio` (blueprint module G) is built for what the engine can really make: a
creator writes once, chooses articles, newsletters and translations in up to five
languages, and **sees** every result with the label it was made under — which
the engine never showed before: `POST /creators/publish` produced outputs and
nothing in the app read them back. Each piece can be copied, or posted (edited
first, as an article or a text post, with its provenance). Everything made is
kept in a history that can be reopened, linked to and deleted, and the creator's
standing — monetization, what they keep, subscribers, badges — sits beside it.
Covered by `backend/tests/e2e_creator_studio.py` (57 checks) and a browser pass
(42 checks: the form, the results, posting, history, the panel, light mode, a
phone, a minor).

Fixed on the way:

- **An article was HTML built from raw text.** A line containing `<script>` was
  stored as markup. Every character the creator typed is now escaped, and the
  screen shows the plain words.
- **The engine had no size limit.** One request could ask for megabytes to be
  translated into every language. The source is capped at 20,000 characters, a
  format or language counts once, and "translate into the language it is written
  in" makes nothing (and is refused when it is all that was asked).
- **A translation by the stand-in AI looked like a translation.** Its output is
  now marked **Simulated** — on the row, so it stays true after a real provider
  is configured — and cannot be posted.

Not built:

- **Video, audio, carousel** were not built on 07/10; they are since — see
  "Creator Studio media pipeline (08/10)" below.
- **A real AI provider.** None is configured, so translations are marked, not
  made. Articles and newsletters in the creator's own language are real.
- **Sending a newsletter.** There is no subscriber list, opt-in or unsubscribe;
  the mailer that exists (password reset) is not connected. The Studio makes the
  text to copy.
- **Scheduled posts, AI credits, the brand kit, the copilot, autonomous agents
  and the Pre-Publish Guardian.** All in the blueprint and the public page; none
  built. The pricing page still promises the first two.
- **Creator earnings.** `GET /creators/earnings` still returns a simulation, so
  the panel shows only the share a creator keeps. A subscription records the
  entitlement and charges nothing.
- **Series and badges have no screen** beyond the badge list in the panel.

Known limits:

- **Text runs inline.** Articles, newsletters and translations are made inside
  the request. Media renders do not (see below).
- **No rate limit**, as everywhere on the platform: once a real provider answers,
  each request costs money and nothing caps a creator's requests.
- **An output cannot be edited in place.** It can be changed in the draft just
  before posting, and that change is not saved to the job.
- **Small warning, success and error text** in the theme's colours is under
  4.5:1 in one theme or the other. The Studio keeps such messages in normal text
  with a coloured border or mark instead; the colours themselves are a design
  decision (see the gallery's note on the error red).
- Verified locally only, not on kinjy.com.

## Creator Studio media pipeline (08/10)

The Studio can now make **a carousel, an audio narration, and a short or long
video** from the creator's text. The format list is asked of the machine
(`GET /creators/formats` -> `render.unavailable`), so an image without the tools
says so instead of accepting a job it can only fail.

How it works: `POST /creators/publish` writes media rows as `queued` and returns
at once; `media_jobs.py` renders them on two worker threads, stores the files at
media-service through a new internal route (`POST /internal/media/ingest`, never
proxied by the gateway, owned by the creator, `restricted` from the first byte)
and flips the row to `ready`. The screen reads the job again every 2.5 s until
nothing is waiting. `render.py` is the engine: slides drawn with Pillow (the
app's ink and gold, DejaVu and WenQuanYi fonts, Arabic shaped by raqm), text read
by espeak-ng, MP3 and MP4 encoded by ffmpeg. A video is **one** encode whose
picture timeline is the sum of the lengths its voice was padded to, so the words
on screen and the words said cannot drift apart. A render can be posted: a
carousel as a `carousel`, audio as `audio`, a long video as `video`, a short
video as a **Short** (with its width, height and length).

Covered by `backend/tests/e2e_creator_media.py` (74 checks, live API, real
renders): the bytes are a PNG, an MP3 and an MP4 of the size and length the
engine claims - read from the files, with the MP4's own header, not the
engine's answer - and `ffprobe`/`volumedetect` agreed by hand (H.264 720x1280
at 24 fps, AAC, real signal); no file is served without its owner's ticket;
a limit refuses; all five languages draw and speak; hostile text; posting a
render; deleting a job. A restart in the middle of a render was exercised by
hand (the in-flight row failed with its reason, nothing stayed "running").
`e2e_creator_studio.py` is 56 checks.

Fixed on the way: the job stayed `running` after its last render (the session
did not flush before the status was recomputed) - found by the new test.

What it is **not**, said plainly:

- **The voice is espeak-ng.** Clear, free, offline - and unmistakably a machine,
  roughly 1990s. `render.speak()` is the only function that knows which engine
  talks; a neural voice (Piper, a cloud TTS) replaces it and nothing else. Swahili
  and Arabic (undiacritised) are the weakest. Every audio and video is labelled
  `ai_generated` and the screen says "synthetic voice".
- **A video is slides read aloud**, not footage: the creator's lines, a still
  per paragraph, a voice. No b-roll, no motion, no music, no brand kit, no
  captions beyond the text on the slide. **No dubbing** of an uploaded recording
  into another language, no lip sync: the engine takes text only.
- **Another language needs a real translator.** With the stand-in AI, a carousel,
  audio or video in a language other than the text's is `unsupported` ("needs a
  real translation provider"): a slide would print "[fr] ..." and the voice
  would read it. Articles are still made and marked Simulated.
- **Limits that refuse, never cut:** a carousel up to 20 slides, a short video
  up to 90 s, a long video up to 10 min, audio up to 25 min, 12 renders at once
  per creator (429). A paragraph is a slide; one longer than a slide is cut at
  sentence ends.
- **Emoji are left off slides** (the font has none) and **web addresses are not
  spoken**; the creator's text is otherwise untouched.
- **Everything is one machine's CPU.** Two render threads per creator-service
  process (four in the production overlay, which runs two workers). A long video
  takes seconds to a minute; there is no queue across processes, priority, or
  progress bar - only "waiting" and "making it".
- **A restart fails what was rendering** (`media_jobs.recover`, with the reason
  "Interrupted when the service restarted. Make it again."); nothing resumes.
- **Files stay local** (media volume), never UploadCenter. Deleting a job deletes
  its files unless a post is showing them (`social-service /internal/media-in-use`);
  if that check cannot be made, nothing is deleted. A file whose job is deleted
  *while it renders* is removed when the render lands.
- **The image is bigger.** creator-service builds with `MEDIA_TOOLS=1`: ffmpeg,
  espeak-ng, fonts and Pillow take it from 818 MB to 1.5 GB (Debian's ffmpeg
  pulls a long list of libraries). The other twelve images are unchanged. **A
  deployment must rebuild the creator image** (`docker compose build
  creator-service`) or the formats show as unavailable.
- **The frontend for it was written, not machine-checked** - no typecheck, lint
  or browser pass was run on the media UI (players, polling, posting a render).
- Still true from before: no rate limit beyond the cap above, no scheduled posts,
  no AI credits, no real earnings.

## AI provider — lot 0, the guard rails (08/10)

Done before any real provider is connected, because the gateway was unsafe to
connect one to. What it did: register any vendor whose key was set, claim every
task for it, and answer all of them with made-up text under the vendor's name -
with `mock: false`. A key alone would have removed the "Simulated" label from a
translation that was still "[fr] ...". And a key alone would have done nothing
else: the router picks the cheapest provider and the stand-in costs nothing, so
it won for ever.

Now (`backend/ai-service/gateway.py`):

- **A provider is real only if its key is set, an adapter exists, and
  `AI_LIVE_ENABLED` is on**, and it declares only the tasks its adapter
  implements. Made-up output is produced by the mock and by nothing else; a real
  provider with no adapter for a task is refused, not answered.
- **A real provider beats the stand-in** for the tasks it declares.
- **The translation cache never serves, and never stores, a made-up answer.** The
  8 stand-in rows already in `ai.translations` were left in place (migrations are
  additive here) and are simply never read.
- A provider failing maps to a 502 with a message written to be shown.
- **The key is isolated.** `.env.ai` (git-ignored) is read by ai-service only;
  `.env` goes to all 13 containers. Checked by running throwaway containers: the
  probe variable reached ai-service and neither community-service nor
  creator-service. A key with no adapter is ignored with a warning that never
  contains it; `/ai/providers` and the logs were grepped for a probe value: none.

Tests: `test_ai_gateway.py` (23) and `e2e_ai_gateway.py` (11). The unit tests
were mutation-checked: restoring the old registry behaviour fails 4 of them,
removing "a real provider beats the mock" fails 3.

Not done in lot 0, on purpose:

- **No provider, no adapter, no real call.** Nothing is wired; the Studio still
  shows "Simulated". The vendors in `VENDORS` (kimi, deepseek, anthropic, openai)
  are descriptions without adapters, and `claude-sonnet-5` there is probably not
  a valid model id. The provider chosen for the project (the name "ille.ai" is a
  domain for sale, not an API) is still to be identified.
- **`common/classifier.py` `model_available()` is untouched.** It reads a `models`
  key that `/ai/providers` never returns (it returns `tasks`), so it always says
  "no moderation model". That is correct today and stays correct by construction:
  no real provider can declare `moderate` without an adapter for it. Fixing the
  key is a child-safety change and belongs with the day moderation is wired.
- **Minors, quotas, the monthly cap, the Studio's background translation, the
  line-by-line translation protocol and the fake provider server** are lots 1-3.
- The `AI_LIVE_ENABLED` switch was unit-tested; an attempt to exercise it in the
  running stack by passing it from the shell did not reach the container, so it
  was not exercised there.

## AI provider - lot 1, the IleAI adapter (12/10)

IleAI (api.ileai.io; its API calls itself "EMINI AI - API Gateway") is the chosen provider,
for translation. `backend/ai-service/ileai_adapter.py` is registered in ai-service behind the
same three conditions as any provider (key, adapter, `AI_LIVE_ENABLED`); a failed provider call
is written to `ai.ai_calls` with `succeeded=false`. Tests: `test_ileai_adapter.py` (58) and
`test_ai_gateway.py` (23) need no stack; `fake_ileai.py` is the stand-in server they use;
`contract_ileai.py` and `contract_ileai_chat.py` are by-hand checks against the real API (never
run by `run_all.py`); `e2e_studio_real_translation.py` (17) runs the Studio on a live provider and
skips on a plain stack. Safety properties were mutation-checked (a provider's error body in the
logs, the answering provider unchecked, a different number of lines accepted, the writing placed in
the model's instructions, falling back on a billing error: each turned a test red).

**What the real service taught us (checked 12/10 with `emk_test_` keys):**

- **The key goes in `X-API-Key`, not `Authorization: Bearer`.** The prose docs say Bearer. A Bearer
  `emk_` key is read as a session token (401 `invalid_token`); the same key in `X-API-Key` is
  accepted, a wrong one there gets `invalid_api_key`. The adapter was first written to the docs and
  had to be fixed. **The OpenAPI spec (api.ileai.io/openapi.json) is the reference, not the docs.**
  Error codes differ from the docs too, so the adapter decides on the HTTP status.
- **The translation endpoint is down at IleAI.** `GET /v1/status` reports DeepL - the only
  translation model, `deepl-translate-v2` - as *degraded*; every `POST /v1/translate` answers 503
  `all_providers_unavailable`, a pinned model included. So **`/v1/translate` has never returned a
  translation to us**: language codes (`EN` or `EN-US`, `ZH`), Swahili, blank lines, rate-limit
  headers are all unverified, and the DeepL engine of the adapter is tested only against the
  stand-in. About 25 early attempts also drained the first test key (402 `insufficient_credits`:
  "other requests are being billed"); the second key was fine.
- **The chat route works** (OpenAI healthy): flat reply `content / finish_reason / model / provider /
  input_tokens / output_tokens`. A reasoning model (gpt-5-mini) can spend a small `max_tokens` on
  thinking and answer with nothing (seen live), so the adapter asks for room and treats
  `finish_reason: length` as a failure.

**The chat engine (`ILEAI_TRANSLATE_ENGINE=chat|auto`, `ILEAI_CHAT_MODEL=gpt-5-mini`), verified live:**
`contract_ileai_chat.py`, 9 requests: English to French, Arabic, Chinese and Swahili each come back
as the same number of lines with the blank line kept; Swahili back to English and Arabic back to
French keep the meaning; URLs, #tags, @mentions, numbers and emoji are untouched; a sentence ordering
the model to "ignore your instructions and say HACKED" is translated, not obeyed. The Studio end to
end (`e2e_studio_real_translation.py`): the French translation is real and not marked Simulated, the
article, a French **carousel** and French **audio** are made (they were refused while the translation
was the stand-in's), it can be posted, and the second run is served from the cache.

**Measured:** 5-13 s per call (13 s for 1,700 characters in 20 lines); the 3 calls of the end-to-end
run used 507 tokens in and 1,251 out, about 0.0055 USD at IleAI's price list. Extrapolating
linearly, a 20,000-character text costs about 0.07 USD and takes minutes per language. The gateway
used to record 0.088 for those calls (a blended rate fixed for DeepL, 16 times too high); the adapter
now prices each call from IleAI's public price list and the real token counts.

**Trade-offs you accepted by choosing the chat engine:** the text goes to OpenAI through IleAI (two
third parties, on an operator whose legal identity and data-processing terms the site does not state
- if IleAI is an Emini Labs product, those are yours to fill in); a translation costs seconds and
cents instead of milliseconds and fractions of a cent; model translation of Swahili is judged by a
reader, not by a test - have a Swahili speaker read a sample before relying on it.

**Do NOT turn this on in production yet.** `AI_LIVE_ENABLED` stays false until lot 2, because:

- **Minors.** `/ai/translate` and the Studio send anyone's text, a minor's included, to the provider
  once live. The rule you still have to choose (my recommendation: none for under 18) is not coded.
- **Time.** The Studio translates inside the request. It took 13 s and then 26 s for two lines
  against the public gateway's 30 s; five languages or a long text will return 504. Translation
  must move to the background worker the media renders already use (and `derive._translate`'s 20 s
  timeout with it).
- **Budget.** No per-creator quota, no monthly cap, no low-balance alert yet.
- **Disclosure.** The privacy policy and a line in the Studio ("your text is sent to a third-party
  translation service") are not written.
- **The Studio's banner** still says Simulated whenever `/ai/providers` shows only the stand-in; it
  needs no change for a live provider, but the wording of the translation page has not been reviewed.

**To try it yourself:** in `.env.ai` set `ILEAI_TRANSLATE_ENGINE=chat` and `ILEAI_CHAT_MODEL=gpt-5-mini`,
in `.env` set `AI_LIVE_ENABLED=true`, recreate ai-service, use an adult test account and invented
text, then turn the switch off again.

**Also found:** the public gateway's first request to a service that has been idle can stall for
about 10 s, sometimes past its 30 s (504). It explains the 504s tests have always had to retry; it is
the gateway's connection handling, not translation, and is untouched.

**Still to do:** when DeepL is back at IleAI, re-run `python backend/tests/contract_ileai.py` (about
20 requests, spend nothing before the status page shows deepl healthy) and fix whatever differs; lot
2 (above); lot 3-4: a Swahili/Arabic/Chinese quality read, then a progressive rollout.

## AI provider - lot 2, who may be translated, how much, and off the request (13/10)

You confirmed the rule for minors: **no real translation before 18.** What changed:

- **Only a confirmed adult's writing reaches a provider** (`ai-service/main.py`, `_do_translate`).
  `agefeatures` already counts anyone who is not a confirmed adult as a minor - an age nobody
  established, a failed lookup, a visitor - so every doubt resolves to "do not send". Those get the
  stand-in's answer flagged `withheld`, and not even a cached real translation. The rule sits where
  the text would leave the platform, not only in the callers: there is a public route (`/ai/translate`,
  which needs a signed-in adult) and an internal one (`/internal/translate`, never proxied by the
  gateway, which applies the rule to the member the caller names).
- **A hole this exposed, closed:** the public `/ai/run` accepted `task=translate` and would have
  skipped the age rule, the cache and the limits. It now serves only tasks the stand-in answers; a task
  with a real provider needs a route of its own with its own rules.
- **Limits** (`limits.py`, only when a real provider is about to be called): a member's daily
  allowance, 100,000 characters (`AI_TRANSLATE_DAILY_CHARS`), and the platform's monthly budget,
  5 USD (`AI_MONTHLY_BUDGET_USD`), summed from `ai.ai_calls`; over it, 429 / 503 with a sentence a
  member can act on. **Both numbers are defaults I chose; set yours.** A failed call counts for nothing,
  a cached one is free.
- **Translation is made off the request.** An article, newsletter or translation that has to be
  translated is `queued` and made by the same worker as the media; the request returns at once (it took
  13 s and then 26 s inline against the gateway's 30 s). Three outputs of one text in one language make
  **one** provider call (identical requests are serialised per member, and the second finds the first in
  the cache). Text in the creator's own language is still made inside the request.
- **A minor in the Studio** gets their own language as before, and for every other language a row that
  says "Translation into other languages is not available for accounts under 18" - no invented text, no
  "Simulated" marker. `GET /creators/formats` now carries `translation: {available, reason, notice}` so the
  screen can say so first (the form disables the other languages and shows the reason; with a real
  provider it shows the disclosure line). **That form change is written, not machine-checked.**
- The age lookup in `publish` was a blocking call inside an `async` handler (mine, and a way to freeze the
  whole service if user-service were slow): it now runs in a thread.

Tests: `test_ai_limits.py` (7), `test_creator_translation.py` (19; the one-at-a-time lock, the quota
boundary and the "withheld" handling were mutation-checked) and `e2e_translation_rules.py` (26, against
the stand-in for IleAI: adult / minor / visitor, the cache, `/ai/run` closed, the allowance per member, one
call for three outputs, a minor in the Studio, "no credit" and "outage" told in plain words without the
key or the writing, a French carousel). Run it with `backend/tests/compose.fake-ileai.yml` (it points
ai-service at the stand-in with a made-up key, so no real key is used); `e2e_creator_studio.py` is 64 and
`e2e_creator_media.py` 74.

**Not done, or not proven:**

- **The monthly budget has only a unit test.** Tripping it on the live stack would need real spend (or
  polluting `ai.ai_calls`), so it was not exercised end to end.
- **`e2e_studio_real_translation.py` (the real provider) was not re-run after this change.** Translation
  now goes through the internal route and the worker; it needs a run with the real key (the chat engine).
- **The privacy-policy text is not written**, and the disclosure line in the Studio is a draft sentence.
- **The quota is per member, per rolling 24 h, in characters sent** (system prompts and batches excluded).
  Two requests racing can overshoot it slightly; there is no per-IP or per-account-creation limit.
- **A member can still read an adult's cached real translation only if they are an adult** - a minor never
  gets one - but the cache is shared between adults.
- **DeepL was still down at IleAI** at the last check, so the DeepL endpoint (as opposed to the chat engine)
  remains unverified.
- **The gateway's first-request stall** (5-30 s after the stack has been idle; sometimes a 504) kept
  interrupting test runs. It is not the 5 s keep-alive: idle gaps of 7 and 12 s were fast. The cause is
  not found; the machine's load average was about 4. The Studio tests now retry the first call once and
  say so.
- **Dev only:** the creator service's auto-reload once hung after four files changed within seconds
  (`docker restart kaluta-creator` fixed it; no data affected).

## Creator Studio - the 10-point finish line (13/10)

You asked for the Studio to be finished at ten points: real translation, and the three things the pricing page
already promises Basic members (newsletter sending, scheduled posts, AI credits). Nothing is committed.

**1. Real translation, re-run after lot 2: done.** `e2e_studio_real_translation.py` passes (18) with the real
provider (chat engine): the request returns almost at once, the French article, carousel and audio are made, it can
be posted, the second run is served from the cache, and a visitor is not handed it. About 0.004 USD for the runs.

**3. DeepL: not resolved, and IleAI's status page was wrong.** `GET /v1/status` said DeepL was healthy; a translation
still answered 503 (request id `0815578c-1c2e-447e-80d4-945cfb47b58a`, for their support). The chat engine stays.

**9. AI credits by plan: done, with a hole you must know about.** A credit is 1,000 characters; a plan gives a
calendar month of them: Free 20, Basic 200, Premium 1,000 (`AI_CREDITS_*`). This replaces the flat daily allowance of
lot 2. `GET /ai/credits` tells a member their plan, what is used and what is left (rounded down, so the numbers add
up); the Studio form shows it; the plans page lists it. **`POST /subscriptions` only records a plan - nothing
checks it was paid for, so any member can record themselves Premium for nothing** (the server stored a 99 USD
yearly plan with no payment, in my test). So `AI_CREDITS_TRUST_SUBSCRIPTIONS` is **off by default** and every
member gets the Free allowance whatever plan they have recorded; turn it on only when billing confirms
subscriptions. Tests: `test_ai_limits.py` (25), `test_ai_plans.py` (9; the trust switch and the unknown-plan rule
were mutation-checked), and `e2e_translation_rules.py` (32) with the stand-in provider.

**8. Scheduled posts: done.** `POST /posts` takes `scheduled_for` (a time with a time zone, from a minute to a year
ahead). The post is judged when it is written - classified, its media restricted, refused if it must be - and held as
`status="scheduled"`, visible to nobody but its author (`GET /posts/scheduled`), who can move it
(`PATCH /posts/{id}/schedule`), publish it now, or cancel it. A loop in social-service releases what is due, every 20
seconds, atomically (two workers cannot release it twice, and a post cancelled or withheld meanwhile is not brought
back). A scheduled post cannot be reacted to, commented on or shared. The Studio's "Post it" panel has "Publish
later". `e2e_scheduled_posts.py` (26) includes a real wait for the loop. Not done: **plan gating** (the pricing page
lists it under Basic; it is available to everyone until billing makes plans real), and a **cap test** (100 waiting
posts per author is untested). It runs in each social-service process: with two workers each runs a loop, which the
atomic release makes safe.

**7. Newsletters: done on the server and the screen, not yet on a real mail server.**
- Public sign-up (`POST /creators/{handle}/newsletter/subscribe`) and the page `/newsletter/:handle`: one
  confirmation mail, **double opt-in** (nothing is ever sent to an unconfirmed address), the same reply whether
  or not the address was known (so the form cannot be used to find out who is on a list), and capped (one
  confirmation an hour per address and creator, 30 an hour per creator, 5 a day per address).
- Links in the mails are **signed, not stored** (`newsletter_links.py`): a database dump cannot confirm or cancel
  anybody; a confirmation link expires after 14 days, an unsubscribe one never; one cannot be used for the other.
- **Leaving is one click**, from the page (a button, because mail scanners open links) or from the mail client's own
  button (`List-Unsubscribe` + `List-Unsubscribe-Post`), and takes effect even for an issue being sent.
- Sending (`POST /creators/newsletter/send`, from the Studio's newsletter card with a confirm step and a live
  count): **only a confirmed adult**, at most `NEWSLETTER_MAX_RECIPIENTS` people and `NEWSLETTER_MAX_ISSUES_PER_DAY`
  issues, one at a time. The creator sees counts and a masked preview, never addresses. Plain text only.
- **Resumes after a crash, at most once each:** an attempt is written down before the mail is handed over; a
  message in flight when the service dies is recorded `unknown` and *not* sent again. Tested by really killing
  the service (`docker kill`) mid-send: 11 sent, 1 left out, nobody twice.
- Tests: `test_newsletter_links.py` (17; mutation-checked), `e2e_newsletters.py` (44) against a mail sink
  (`fake_smtp.py`, `compose.fake-smtp.yml`): no mail leaves the machine. **No real SMTP server was ever used**, so
  the one thing not proven is delivery to a real inbox: SPF/DKIM/DMARC, bounces, spam filters and the sender
  reputation of whatever server you configure.
- Not built: bounce and complaint handling (a hard-bouncing address keeps being tried), per-IP limits on the public
  sign-up, a "send me a test" button (subscribe yourself instead), editing or scheduling an issue, and a way for
  a reader to see or manage their subscriptions beyond the link in each mail.

**Not in the ten, still open:** the privacy-policy text and the Studio disclosure sentence; the Studio screens
(none of the frontend of this block - credits line, "Publish later", newsletter card, `/newsletter/:handle`, the
minors message, the post-translation button's new handling - was machine-checked); a Swahili / Arabic / Chinese
read by native speakers; the commit and the PR.

## Creator Studio — local review and supplier report (14/10)

The latest Studio UI is now type-checked, linted and exercised in Chromium. Added a
scheduled-post list with rescheduling, publish-now and cancellation; refreshed credits
after generation and newsletter subscriber counts on demand; corrected the source-language
initialisation and minor-account messages; stopped a failed job lookup showing the previous
job; added `/studio/privacy` and a more explicit external-translation disclosure. Downloads
now request attachment disposition from media-service without bypassing its signed tickets.
The development frontend uses same-origin `/api`, including when opened from another device.

Verified: 151 AI/limits/plan/translation/newsletter-link unit tests, 61 media-signature
unit tests, 64 Studio API checks, 26 scheduled-post API checks (including the timed loop),
and 16 browser checks in `backend/tests/e2e_studio_ui.py`. The browser covered all six
original-language formats and their previews, downloading, scheduling and management,
newsletter sign-up/confirmation/send/unsubscribe on the SMTP sink, minor restrictions,
light/dark and phone width, source language, disclosure and a missing job. No uncaught
browser errors in the final run. Build and scoped lint passed.

Do not read that as a production or commercial sign-off. The complete media API suite
was interrupted by a media-service reload; the browser subsequently verified the normal
six-format path, not every extreme limit or language. No real newsletter inbox was used.
The real IleAI chat adapter translated a test sentence today; DeepL through IleAI still
returned 503 despite a healthy status report. The full real-provider Studio E2E was not
re-run today. SMTP, payment credentials and payment-confirmed entitlements remain open,
as do interface localisation, native-speaker review and the commit/PR.

See `STUDIO-CREATOR-BILAN.md` for the dated supplier/access checklist and exact scope.
The normal local configuration is restored after testing; simulated SMTP is removed.
