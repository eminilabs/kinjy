# Kinjy — age, child safety and content access

This is the implementation proposal and the record of what is already built.
It is deliberately explicit about which is which: a safety document that reads
as though everything is finished is the most dangerous kind.

**Status key**
- ✅ **built** — code in this repository, covered by tests that run
- 🟨 **partial** — the mechanism exists, some surfaces are not on it yet
- ⬜ **specified** — designed here, not yet written

---

## 0. The one rule the rest follows from

> A minor must never receive age-restricted content **from the server**, for
> any reason, through any door, including doors nobody has thought of yet.

Everything below is a consequence. In particular it rules out the two designs
that are most tempting and most common:

- deciding age in the client, and
- filtering after ranking rather than before it.

Both work until somebody opens developer tools, copies a URL, or adds a new
surface that forgets the filter.

---

## 1. System architecture ✅

```
                       ┌──────────────────────────────┐
  every service ──────▶│   common/agesafety.py        │  pure, no I/O
                       │   AgeSafetyPolicyEngine      │  58 unit tests
                       └──────────────┬───────────────┘
                                      │ decisions
   ┌──────────────┐  authoritative    │
   │ auth-service │◀──────────────────┴─── common/ageclient.py
   │  age profile │   tier, age, jurisdiction          (60s cache,
   └──────────────┘                                     fails closed)
           ▲
           │ /internal/age-profile/{id}
           │
   social · messaging · community · commerce · media · creator
```

The engine is a **library, not a service**. A network hop in front of every
content check is a network hop that will be skipped under load, cached wrongly,
or bypassed by whoever is debugging a slow feed at 2am. The engine is pure
Python called in-process; only the *viewer's age* crosses the network, once per
minute per viewer.

**Failure handling.** `ageclient` returns `AgeTier.UNKNOWN` when auth-service is
unreachable, and `UNKNOWN.is_minor` is `True`. An identity outage therefore
makes the platform *more* restrictive, never less. Degraded answers are not
cached, so recovery is immediate.

---

## 2. Registration architecture ✅

```
country/region → date of birth → resolve AgePolicy → minimum-age check
   → assign tier (server) → write UserAgeProfile → privacy defaults by tier
   → ToS/Privacy → account created
```

**Frontend.** A `date` input, labelled with *why* it is asked and stating it is
not shown on the profile. The submit button is disabled until it is filled.
Nothing in the UI lets a member pick "teen" or "adult".

**Backend.** `auth-service/main.py::register` runs the age gate **before** any
row is written — no account, no profile, no referral credit survives a refusal.

**Refusal wording.** One message for every refusal reason, naming no age and
offering no hint that a different date would work:

> You do not currently meet the minimum age requirement to join Kinjy.

**Abuse — "enter 12, then enter 19".** `RegistrationAttempt` records refusals
under a salted hash of (email, country). A refused subject is in cooldown for
24 h, checked *before* the date is evaluated so timing reveals nothing, and the
cooldown response is byte-identical to a plain refusal.

**Privacy.** The attempts table stores a hash, never an address — a list of
people refused by a service with a minimum age is a list of children.

**Tests.** 12-year-old denied · 13 admitted as `TEEN_HIGH_PROTECTION` · 14
denied in DE and admitted in US · retry-with-adult-date denied · both refusals
worded identically.

---

## 3. Database schema ✅

| Table | Schema | Purpose |
|---|---|---|
| `user_age_profiles` | auth | DOB, tier, jurisdiction, assurance, review flag, next transition |
| `registration_attempts` | auth | hashed refusal log for retry control |
| `age_verifications` | auth | assurance outcomes — conclusions, never documents |
| `age_review_cases` | auth | open questions about a stated age |
| `jurisdiction_policies` | auth | versioned per-country rules, editable without deploy |
| `content_safety` | social | graded classification, one current row per item |

Date of birth lives in its own table, not on `User`. The user row is serialised
into a dozen responses; a DOB there leaks the first time somebody adds a field
to a profile payload.

`next_transition_on` is precomputed and indexed, so the birthday job is a
bounded indexed select rather than a scan of every account.

---

## 4. Age-policy engine ✅

`common/agesafety.py`. Functions: `registration_eligibility`, `can_view_content`,
`can_search_content`, `can_message_user`, `can_receive_media_in_request`,
`can_recommend_profile`, `can_use_feature`, `can_start_livestream`,
`can_monetize`, `can_use_marketplace`, `can_view_advertisement`,
`requires_age_verification`, `requires_parental_approval`.

Three properties, each load-bearing:

1. **Pure.** No DB, no HTTP, no ambient clock. Every rule is exhaustively
   testable, and the tests assert decisions rather than plumbing.
2. **Fails closed.** Unknown age, unrated content, unresolvable policy — each
   restricts. `UNCLASSIFIED` sorts *above* `TEEN_16_PLUS` in strictness.
3. **Jurisdiction can only tighten.** `resolve_policy` raises any configured
   minimum back to the Kinjy floor, so a compliance mis-entry of `8` cannot
   admit nine-year-olds. There is a test for exactly that.

Every `Verdict` carries the `policy_version` that produced it, so an audit row
replays as *which rule applied*, not merely *that something was refused*.

---

## 5. Teen Account system ✅

| Age | Tier | Assigned |
|---|---|---|
| < minimum | `UNDER_MINIMUM` | registration refused |
| 13–15 | `TEEN_HIGH_PROTECTION` | automatically |
| 16–17 | `TEEN_PROTECTED` | automatically |
| 18+ | `ADULT` | automatically |
| contested | `AGE_REVIEW_REQUIRED` | on signal; treated as a minor |
| none | `UNKNOWN` | signed out or no record; treated as a minor |

**Transitions** ✅ — `agegate.apply_age_transitions` moves accounts whose
birthday has crossed a boundary, driven by the indexed `next_transition_on`.
Idempotent, safe to run twice, exposed at `POST /admin/age/transitions/run` for
a scheduler. Historical safety records are never deleted by a transition:
turning 18 does not erase what happened at 15.

---

## 6. Privacy defaults ✅

`PRIVACY_DEFAULTS` in the engine, applied at creation by tier — private profile,
no indexing, no precise location, approval-required tagging, restricted
messaging, adult content blocked, sensitive-profiling ads off.

`LOCKED_SETTINGS_FOR_MINORS` cannot be changed by a minor at all:
`adult_content`, `search_engine_indexing`, `personalised_ads_sensitive`.

---

## 7. Content age classification ✅ (model + API) 🟨 (classifier)

`content_safety` grades eleven categories 0–3 alongside the summary
`age_rating`. One boolean cannot tell a beach photograph from pornography, or a
war report from gore posted for its own sake — a platform that grades them
alike hides journalism from adults *and* shows children the other thing.

`POST /internal/classify/{post_id}` — internal only, upsert, not reachable
through the gateway. A classification a member could set on their own post is
not a classification.

`exploitation_risk >= 2` or `PROHIBITED` removes the post immediately and logs
at error level for the child-safety process, rather than queueing it behind
ordinary moderation.

### The classifier ✅

`social-service/classifier.py`, run **inline at publication** — before the post
is committed as published, because a post classified a few seconds after it
goes out was visible to everyone for those seconds, and that is the entire
lifetime of most feed impressions.

Three backends in order: a **model** when one is configured, the **heuristic**
below, and a **human** for anything neither settles.

**The admission this is built around: a text heuristic cannot look at a
photograph.** So it does not pretend to. A post carrying an image, video or
audio is never auto-cleared — no amount of reading the caption tells you what
is in the picture. Those stay `UNCLASSIFIED` (adult-only) and go to
`/admin/classification-queue`. A classifier that marked them GENERAL because
the caption was innocuous would be the worst bug this codebase could hold.

The lexicon is deliberately small, about **acts rather than identities**, and
stored as data so Trust & Safety can edit it without a deploy. A long word list
is not a better classifier; it is a longer list of ways to mis-flag somebody
describing their own life, and the categories most often over-flagged —
sexuality, health, religion, ethnicity — are where a false positive does real
harm.

| Input | Result |
|---|---|
| ordinary text | `GENERAL`, confidence 0.75 |
| explicit text | `ADULT_18_PLUS` |
| gambling promotion | `TEEN_16_PLUS` + `gambling_level 2` (which the per-tier ceiling then blocks for **every** minor) |
| any media, no model | `UNCLASSIFIED` + queued — never guessed |
| author's own content warning | only ever **tightens** |
| minor + sexual content | publication **blocked**, child-safety escalation |
| exploitation signal | publication blocked, out of ordinary moderation entirely |

**Self-labelling** is believed when it restricts and never when it releases. It
is useful precisely because honest people use it, and useless as the only check
because dishonest ones do not.

**Community reports** restrict and never release: three reports pull `GENERAL`
back to `UNCLASSIFIED` pending review. The reverse would make brigading a way
to un-rate adult content.

**Backfill.** `POST /internal/classification-backfill` rates posts that predate
the classifier — 117 on first run, 35 queued. Idempotent.

---

## 8–11. Adult-content controls, recommendation, search ✅ 🟨

`agefilter.restrict_query` pushes eligibility **into the SQL**, before ordering
and paging, so restricted rows are never fetched, never ranked, never
serialised. Two conditions, both required:

```
post.id NOT IN (classified as forbidden)      -- known-bad excluded
AND post.id IN (has a classification at all)  -- unrated excluded
```

The second is the one that is easy to omit and is exactly how unrated content
reaches a child.

`agefilter.filter_items` then re-checks anything already serialised — belt and
braces, one batched query per page, so a surface that writes its own query and
forgets the filter still cannot leak.

| Surface | Status |
|---|---|
| Home feed, all modes | ✅ |
| Shorts reel | ✅ |
| Author timeline | ✅ |
| Single post by ID | ✅ |
| Post media list | ✅ |
| People search and suggestions | ✅ |
| Forum threads and replies | ✅ |
| Community discovery | ✅ |
| Comments, livestreams, notifications | ⬜ |

---

## 15–16, 22. Discovery, search and forums ✅

**People (§22).** `user-service/agediscovery.py`. An adult searching or
browsing suggestions does not see minors; a minor searching still finds
everybody, including other minors, because a teenager looking for their own
teacher or football club should find them. The restriction protects the people
being listed, not the person looking.

The messaging rules stop an adult who has already found a 14-year-old from
writing to them. This stops them finding one, which is cheaper, earlier, and
does not depend on the adult behaving badly first.

*Cost, stated plainly:* filtering after the query means a page can come back
short. The fetch is widened threefold to compensate. The alternative — joining
an age table that lives in another service's schema — would couple two
databases together to save a few rows.

*Failure direction:* when the **viewer's** own age cannot be established they
are treated as a minor, which widens what they see. That is right here: an
unknown-age viewer is not the threat this addresses, and treating them as an
adult would hide the platform from a teenager whose profile lookup happened to
fail.

**Forums.** `community-service/agecommunity.py`. Threads and replies are
classified on creation and filtered on read, through the same engine as the
feed. Forum text carries no media of its own, so unlike a post it can usually
be settled outright — which is why forums stay readable to teenagers even while
the image queue is backed up.

Replies are rated **individually**: one unsuitable answer removes that answer,
not the discussion. A direct link to a thread is gated exactly as a direct link
to a post is, and returns 404 for the same reason.

**Communities.** A community is not content, it is a door. It is judged on its
own name and description — a door is adult because of what it advertises, and
one heated thread in a gardening group does not make the group adult. Secret
communities were already excluded from discovery; this adds the public
community whose whole subject is adult.

The classifier moved to `common/classifier.py` when the second service needed
it. Duplicating a classifier is exactly the drift this architecture exists to
avoid.

---

## 12–13. Server-side authorization and direct URLs ✅

`GET /posts/{id}` for a restricted item returns **404, not 403**. Confirming
that a post exists but is out of reach tells somebody exactly which links are
worth passing to a minor.

Verified live: a 14-year-old, a 17-year-old and a signed-out visitor are all
refused a post rated `ADULT_18_PLUS`, on both the post route and the media
route. `?age=30`, `?adult=true`, `?age_mode=adult` and `?verified=true` change
nothing — the server reads the identity record and ignores the request.

---

## 14. Media access ✅

`common/mediasign.py` mints an HMAC ticket over (asset, viewer, expiry), valid
5 minutes. `Asset.access` is `public` for avatars and marketing art, and
`restricted` for anything attached to a post — marked **server-side at attach
time**, never declared by the uploader.

Signed at serialisation, downstream of the age check that selected the post, so
a ticket cannot exist for a viewer who was never allowed the post.

**What it defends, precisely.** A bearer token that disagrees with the ticket is
refused outright, so a link pasted into somebody else's signed-in browser fails
immediately. A link pasted into a private window works until the ticket
expires; shortening that window is the lever, which is why the TTL is a setting.
Restricted responses carry `Cache-Control: private, no-store` so a shared cache
cannot serve one viewer's authorised bytes to the next.

For an age-restricted post the question does not arise: no ticket is ever
minted, so there is nothing to copy.

Tested live: bare URL refused · forged signature refused · signed URL serves ·
copied URL refused in another member's session · refused to a teenager ·
expired ticket refused · a ticket for one asset does not open another.

---

## 24–25. Livestream and monetization ✅

`common/agefeatures.py` — one helper, used by every service that sells or pays,
because a marketplace that checks and a checkout that does not is a marketplace
with a checkout-shaped hole.

This gate is deliberately blunter than the content one: no grading, no
per-category ceiling, no "restrict rather than refuse". Money is where an age
rule stops being a judgement about suitability and becomes a legal one. A
15-year-old seeing an unsuitable post is a moderation failure; a 15-year-old
entering a contract, selling to strangers or receiving a payout is a different
problem with different consequences.

| Surface | Gate |
|---|---|
| list a product | `marketplace_sell` |
| place an order | `marketplace_buy` |
| **any** checkout | `payments` |
| add a payout destination | `monetization` |
| enable creator monetization | `monetization` |
| buy a referral-pool seat | `referral_pool` |

The checkout gate sits on the single door every payment goes through, not only
on the features that lead to it, so a surface that forgets its own check still
cannot take a minor's money.

**403, not 404**, unlike the content paths. Hiding the existence of a
marketplace from a teenager would be absurd — it is advertised on the marketing
pages — and the honest answer is that they may not use it yet, not that it is
not there. One sentence for every feature and every reason, naming no age.

`GET /creators/eligibility` lets a client grey a button out and say why,
instead of letting somebody fill in a payment form and refusing at the end. It
is a readout; the gates on the endpoints are what enforce anything, and they do
not consult it.

### Livestreaming, honestly

**There is no streaming backend.** No ingest, no session, no key — the `/live`
page is a front-end demonstration. What exists is `GET /live/eligibility`: the
age decision, exposed at the address a streaming stack would have to ask,
returning the tier, the minimum age, whether gifting and monetization are
allowed, and the policy version it came from.

Building the gate first is deliberate. The alternative is shipping the stack
and remembering the age rule afterwards, which is how a 13-year-old ends up
live to strangers. The endpoint says in its own payload that the
infrastructure is not built, so nobody reads it as more than it is.

---

## 17–19. Messaging ✅

Wired in `messaging-service/agecheck.py`, **on top of** the existing privacy
check rather than instead of it. The order matters: a member's own
`who_can_message` setting is asked first, and the age layer is what that
setting cannot waive. A 14-year-old who has opened their messages to everyone
has not thereby agreed to unknown adults.

| Case | Outcome |
|---|---|
| unknown adult → 14-year-old | refused, wording names neither age nor rule |
| unknown adult → 17-year-old | refused |
| adult → adult | allowed |
| 14-year-old → adult (they start it) | allowed — their choice, their initiation |
| unconnected teen → 13–15 | refused, "connect first" |
| attachment to an unaccepted minor | refused, text still delivered |
| the same after acceptance | allowed |

**Message requests.** `Participant.accepted_at` is null until somebody replies
or accepts. Starting a conversation is consent to it; being added to one is
not. Attachments wait for acceptance — an image that arrives before consent has
already been seen by the time anyone can report it, and "delete for everyone"
does not unsee it.

**Risk signal (§21).** `ContactAttempt` records every refusal: two ids, an
outcome, two tiers, a timestamp — no message content, because a safety signal
does not need to read what people wrote and a table that did would be worth
attacking. `risk_score` counts **distinct** minors who refused an account in 30
days, because ten attempts at one person is a different behaviour from one
attempt at ten people. At 0.6 the engine refuses contact with minors even where
an ordinary account could; at any level it is a reason to put a case in front
of a human, never a finding about the person.

`GET /admin/contact-risk` is the queue. Admin-only, and labelled in the payload
as a signal rather than a conclusion.

---

## 20–22. Age assurance, DOB manipulation, uncertain age ✅

`POST /auth/age-correction` — a legitimate route for a mistyped birthday that
is **not** a bypass:

| Correction | Outcome |
|---|---|
| within the same tier | applied immediately |
| minor → adult | `verification_required`; tier unchanged; review opened |
| places account below minimum | `under_review`; treated as a minor |

Limited to two corrections; further changes go to support.
`POST /internal/age-review/open` lets any service put an account into review,
and the account is treated as a minor **from that moment**, not from whenever a
reviewer opens the case.

---

## 23–26. Dashboard, advertising, jurisdictions, audit 🟨

- ✅ `GET /admin/age/review-queue`, `POST /admin/age/transitions/run`
- ✅ `jurisdiction_policies` is versioned and read at runtime — no deploy to
  change a country's minimum age
- ✅ every verdict carries `policy_version`
- ⬜ the Trust & Safety UI, the admin role split, and the append-only
  `AuditEvent` writer

---

## Tests ✅

```
python -m pytest backend/tests/test_agesafety.py -q     → 58 passed
backend/tests/e2e_agesafety.py     (live API)           → 33 checks passed
backend/tests/e2e_signed_media.py  (live API)           → 17 checks passed
backend/tests/e2e_messaging_age.py (live API)           → 18 checks passed
backend/tests/e2e_classifier.py    (live API)           → 24 checks passed
backend/tests/test_classifier.py                        → 26 passed
backend/tests/e2e_discovery_forums.py (live API)        → 26 checks passed
backend/tests/e2e_money_age.py     (live API)           → 26 checks passed
backend/tests/schema_drift.py                           → no drift
```

Covering: age arithmetic across leap days and birthday boundaries · every tier
boundary · jurisdiction raising and the floor that cannot be lowered · every
minor age against adult content · prohibited content refused to adults ·
exploitation risk overriding everything · unclassified and unrated withheld ·
signed-out ≠ adult · degraded lookup ≠ adult · graded category ceilings ·
overrides that tighten but cannot loosen · adult→minor messaging · discovery
restrictions · feature gates · restricted advertising · verification on
minor→adult · locked settings · policy version on every verdict.

---

## Penetration-testing checklist ⬜

1. Remove the client age check — API must still refuse *(tested ✅)*
2. Forge `age`, `adult`, `verified`, `age_mode` parameters *(tested ✅)*
3. Fetch a restricted post signed out *(tested ✅)*
4. Fetch the media URL directly *(tested ✅)*
5. Copy a media URL to a different session *(tested ✅)*
6. Register 12 → retry 19 *(tested ✅)*
7. Correct DOB minor → adult, then immediately fetch adult content
8. Replay an age-verification webhook
9. IDOR on `/internal/age-profile/{id}` from outside the private network
10. Race a transition job against a content fetch

---

## What I would build next, in order

1. **Wire messaging-service** to `can_message_user` — the rules are written and
   tested and simply not called.
3. **Community/search** onto `restrict_query`.
4. **The classifier**, so `UNCLASSIFIED` stops being the common case.
5. **Parental supervision**, **appeals**, **the T&S dashboard**.

---

## Honest limitations

- **No vision model is configured**, so every post carrying media needs a human
  before a teenager can see it. Text is classified; pictures are not. This is
  safe and it is also a real cost: a teenager's feed is currently text-heavy,
  and the review queue is the bottleneck.
- The heuristic lexicon is a stopgap with the failure modes of any word list.
  Every decision it makes is stamped `classifier_source="heuristic"` so its
  work can be found and re-run when a model arrives.
- Comments and notifications are not yet filtered.
- There is no streaming backend at all; only the age decision it will need.
- `POST /internal/*` relies on network isolation. That is how the rest of this
  platform already works, but an authenticated service mesh would be better.
- Nothing here has been reviewed by a lawyer. The jurisdiction table ships with
  five countries as *examples*; before launching anywhere, compliance staff must
  validate the configuration for that jurisdiction.


---

## Addendum: a measurement error worth recording

The first run of the signed-media test reported the raw URL as "refused". It
was not: the test was pointed at port 8205, which is **family-service**, and
family-service answers 404 to any path it does not recognise. Three assertions
passed without ever reaching media-service.

The test now probes `/health` and asserts it is talking to `media-service`
before trusting a single 404. Any test whose pass condition is "something was
refused" must first prove it reached the thing that was supposed to refuse it.


---

## Addendum: schema drift, and the tool for it

Wiring the messaging rules surfaced two pre-existing faults of the same kind.
`preferences.who_can_see_family`, `preferences.family_tree_shared`,
`conversations.disappear_after_seconds` and `messages.expires_at` were all in
their models and absent from the database, because `create_all` never alters a
table that already exists.

The symptom was nothing like the cause. `/internal/permissions` raised
UndefinedColumn, `permissions.check` caught it and returned "could not verify",
and **every permission check on the platform silently failed closed** — which
looked like a privacy setting, not a missing column.

`backend/tests/schema_drift.py` compares every model against the live database
and prints what is missing. Run it after adding any column and before any
deploy. It reads the models with a regex rather than importing them, so it
needs no service and no settings to run.
