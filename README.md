# Kaluta Society

AI-powered global social operating system. This repository holds the product
blueprint, the React frontend and the FastAPI microservice backend.

```
Kaluta Society/
├── docker-compose.yml        the whole local stack
├── .env.example              copy to .env
├── app/                      React 19 + Vite + Tailwind + shadcn frontend
├── backend/
│   ├── Dockerfile            one image definition, parameterised by SERVICE
│   ├── requirements.txt      shared dependency set
│   ├── common/               shared library (db, auth, economy, events…)
│   ├── gateway/              single public entry point
│   └── <n>-service/          one directory per microservice
└── info.md, plan.md, …       the blueprint and research documents
```

## Getting started

```bash
cp .env.example .env
```

Then bring the stack up:

```bash
docker compose up -d
```

| Surface | URL |
|---|---|
| Frontend | http://localhost:3030 |
| API gateway | http://localhost:8200 |
| Gateway docs | http://localhost:8200/docs |
| Stack health | http://localhost:8200/api/status |
| Postgres | `localhost:5445` (user `kaluta`) |
| RabbitMQ console | http://localhost:15675 (guest/guest) |

Every service also publishes its own OpenAPI page, e.g. the ledger at
http://localhost:8210/docs.

## Services

| Service | Port | Schema | Owns |
|---|---|---|---|
| gateway | 8200 | — | routing, single origin, `/api/status` |
| auth-service | 8201 | `auth` | accounts, sessions, passkeys, deletion, sponsor link, referral pool |
| user-service | 8202 | `users` | profiles, follows, Circles, preferences, blocks |
| social-service | 8203 | `social` | posts, feed modes, algorithm marketplace, reactions |
| community-service | 8204 | `community` | communities, forums, forum-to-knowledge |
| family-service | 8205 | `family` | the genealogical graph, verification, heritage |
| memorial-service | 8206 | `memorial` | Digital Graveyard, tributes, QR codes |
| messaging-service | 8207 | `messaging` | E2E messenger, WebSocket delivery, notifications |
| creator-service | 8208 | `creator` | creator studio, publishing engine, subscriptions |
| commerce-service | 8209 | `commerce` | marketplace with escrow, ad platform |
| ledger-service | 8210 | `ledger` | immutable ledger, wallets, commissions, escrow, Kinjy Leaders |
| payment-service | 8211 | `payment` | NowPayments/Mangopay rails, KYC, payout batches |
| ai-service | 8212 | `ai` | AI gateway, translation, the Kaluta Assistant |
| media-service | 8213 | `media` | uploads, provenance labels |

All services share one Postgres instance but each owns a private schema, so no
service can reach another's tables through the ORM.

## Working on it

Source is bind-mounted and uvicorn runs with `--reload`, so editing a file on
the host reloads that container. Only dependency changes need a rebuild:

```bash
docker compose build auth-service && docker compose up -d auth-service
```

Useful commands:

```bash
docker compose logs -f ledger-service
```

```bash
docker compose exec postgres psql -U kaluta -d kaluta -c "\dn"
```

## Try the economy without writing anything

The blueprint's split formulas are implemented in `backend/common/economy.py`
and exposed as a pure simulation:

```bash
curl -s -X POST http://localhost:8200/api/ledger/simulate -H "Content-Type: application/json" -d '{"kind":"ad_purchase","amount":"1000"}'
```

```bash
curl -s http://localhost:8200/api/ledger/rules
```

## What is real and what is not

Deliberately explicit, because a half-wired money path is worse than an obvious gap:

- **Real:** account lifecycle, JWT + sessions, the direct sponsor lookup, all
  split maths with exact-sum guarantees, double-entry posting with idempotency
  and reversals, the family graph and its derived relationships, feed ranking
  and the honest "why am I seeing this", escrowed orders, ad floor enforcement.
- **Mocked, clearly labelled:** payment rails run in mock mode until
  `NOWPAYMENTS_API_KEY` / Mangopay credentials are set; the AI gateway routes
  and meters for real but every provider currently returns mock output.
- **Not started:** WebAuthn registration/assertion ceremonies (the tables and
  endpoints exist, the ceremony does not), C2PA signing, Mangopay live calls,
  live-streaming, the developer app marketplace.

## Frontend ↔ backend

The frontend talks only to the gateway. `app/src/lib/api.ts` holds the client
(token storage, transparent refresh on 401, uniform error messages) and
`app/src/hooks/useApi.ts` the fetch-on-mount hook.

Wired to live data today:

| Surface | Endpoint | What it replaces |
|---|---|---|
| Home · economy section | `/api/ledger/rules` | hard-coded 40/5/9/46, 20%, 10% |
| Feeds · Algorithm Marketplace | `/api/algorithms` | a static list of 21 fictional entries |

Both keep their published copy as a fallback and say so on screen, so a service
being down degrades the page instead of blanking it.

Publishing an algorithm through the API makes it appear in the marketplace,
attributed to its developer:

```bash
curl -s -X POST http://localhost:8200/api/algorithms -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"id":"kigoma_farmers","name":"Kigoma Farmers","description":"Regional market prices first.","weight_locality":1.4}'
```

### Authentication

`/join` is the public entry point (`?mode=signin|signup`, `?ref=CODE` carries the
inviter). `AuthProvider` in `app/src/lib/auth.tsx` holds the session; read it
with `useAuth()`. Access tokens live in localStorage and refresh transparently on
a 401 — a failure that is *not* a 401 never signs the member out, so a service
blip doesn't cost them their session.

`/dashboard` is route-guarded and covers the blueprint's member surface:

| Tab | Backs onto | Blueprint |
|---|---|---|
| Earnings | `/wallet`, `/commissions`, `/payments/eligibility`, `/payments/destinations` | §10 §11 + the $1 payout gate |
| Verification | `/kyc/status`, `/kyc/start` | §20 — fee and identity check kept separate |
| Security | `/auth/sessions`, `/auth/passkeys` | §5 — device manager, no central biometric store |
| Account | `/auth/account/delete` | §4 — deactivate or delete, no justification asked |

Try it:

```bash
curl -s -X POST http://localhost:8200/api/auth/register -H 'Content-Type: application/json' -d '{"email":"you@example.com","password":"KalutaDemo123!","display_name":"Your Name","handle":"your.handle"}'
```

### Social Hub — the real feed

`/hub` is the member's feed (`/feeds` remains the public marketing page). It
implements the blueprint's first two mandatory refinements against live services:

- **Explicit feed modes.** All ten come from `/api/feed/modes`. `Following` is
  strictly reverse-chronological and the UI says so — a ranked feed labelled
  chronological would be the exact conflict the blueprint set out to resolve.
- **"Why am I seeing this?"** sits at the **top** of each card as a `?` — the
  reader wonders why a post is there *before* reading it, not after the
  reactions. It gives two answers, kept apart:
  - **Selection** — which rule put the post in this feed ("It is one of the most
    recent posts", "Tagged #technology", "You follow the author", "The author
    made it public").
  - **Ordering** — the algorithm, its score and each component, **only when the
    mode actually ranks**. On a chronological feed it says so instead.

  That split was a correctness fix, not a cosmetic one: the panel used to report
  `Ranked by chronological · score 0.464` on the unranked `new` feed, describing
  a ranking that never ran. An unknown algorithm now degrades to the selection
  reasons rather than blanking the answer.
- **"Show less like this"** posts a signal to `/api/feed/signals` and the next
  ranking honours it visibly: the same post drops to `score 0.191` with a named
  `You asked for less like this −0.50` factor.
- **Provenance is declared, not guessed.** The composer asks the author
  (Original / AI assisted / AI generated) because the platform cannot detect
  assistance reliably, and the label travels with the post.

### Universal Navigation — the signed-in app

Signing in swaps the marketing nav for the blueprint's Universal Navigation: a
desktop rail and the five-entry mobile bottom bar (`AppShell`). Every entry
opens its own page against a live service.

| Nav entry | Route | Service |
|---|---|---|
| Home / Following / For You / Public | `/hub?mode=…` | social |
| Forums | `/forums` | community |
| Circles | `/circles` | user |
| Communities | `/communities` | community |
| Messages | `/messages` | messaging |
| Live | `/live` | — nothing built; the page says so |
| Family Tree | `/tree` | family |
| Digital Graveyard | `/graveyard` | memorial |
| Explore | `/explore` | community + commerce + family |
| Marketplace | `/market` | commerce |
| Earnings | `/dashboard` | ledger + payment + auth |

Live is the one entry with no backend. Rather than a convincing mock, its page
states plainly that nothing runs behind it — a screen that looks finished is how
a gap survives until someone demos it.

### The Kaluta Assistant

A floating orb on every page (`components/assistant/LiveAssistant.tsx`) talking
to `ai-service`. It **repositions per module** — beside the composer on the feed,
top-right on the family tree, bottom-left on the dashboard — and every answer is
grounded in the knowledge base, role-scoped, and cited.

The knowledge base holds **245 rows: 49 topics × 5 languages**, seeded from
`src/components/assistant/knowledgeBase.ts` — content already written for this
purpose, moved server-side rather than restated more thinly:

```bash
docker compose exec web node seed-kb.cjs <admin-email> <password> http://gateway:8000/api
```

Check what it knows: `curl localhost:8200/api/assistant/kb/stats`

Behaviours worth knowing:

- **It replies in the language of the question**, not the interface. Arabic and
  Chinese are settled by script; French, Swahili and English by a function-word
  vote, because guessing from the Latin alphabet answered French questions in
  English.
- **Accent-insensitive**: "cimetiere" matches "cimetière".
- **Role-scoped**: earnings answers are `member,admin`, so a visitor asking
  about payouts is told nothing — that is the gate working, not a miss.
- **It refuses to invent.** With no grounded match it says so. Two response
  formats are offered on every grounded answer: written (illustration + numbered
  steps) and a scripted walkthrough clip.
- Voice input uses the Web Speech API where the browser has it.

### Signed-in layout

The signed-in app wears the product design from the `/app` demo, not a generic
dashboard layout. On the app routes (listed in `Layout.tsx`) the marketing navbar
and footer are **suppressed** — `AppShell` is the chrome there, and rendering both
gave two stacked headers. The logo in the top bar is the way back to the public
site. `AppShell` composes:

- **`AppTopBar`** — logo, search (→ `/explore`), language, the
  **Cloud / Light / Dark / System** switcher, notifications, avatar.
- **`AppChipBar`** — **destinations only**, and only the ones you pinned; the rest
  sit under "All modules", where the pin control lives. Fifteen chips at once read
  as a wall, so pinning decides what is on the bar rather than merely reordering
  an exhaustive list. Following / For You / Public are deliberately **not** here:
  they are modes of the feed, not places, and they live in the feed's own mode
  selector (`navigation.ts` — `NAV_DESTINATIONS`).
- **Three columns** — profile mini-card rail, working column, optional
  `RailCard` context rail. Below `lg` the rails collapse to the mobile bottom bar.

Everything paints through the theme tokens from `appdemo/theme`, so switching
display mode restyles the whole app rather than one framed demo. `AppThemeProvider`
sits in `main.tsx` with `persist`, keeping the choice across reloads and syncing
`display_mode` to `/preferences`; the demo at `/app` nests its own throwaway
provider so it cannot overwrite the member's setting.

Labels and icons come from `CHROME_STRINGS` / `MODULE_ICONS`, already translated
into the five languages — `components/app/navigation.ts` only maps each
`ChromeKey` to a route.

### Posting

The composer is collapsed in the feed — avatar, a one-line prompt, and
Photo / Video / Article shortcuts — and the full form opens in a **dialog**. Past
220px of scroll the card steps aside and a floating button takes over, so the
feed keeps the width. Visibility and provenance sit in the dialog where they are
legible; topics, city and language hide behind the tag button until wanted.

Articles get a **WYSIWYG** (`RichTextEditor`): bold, italic, strike, headings,
quote, code, lists, links. The headline becomes the document's first `<h2>`, so a
stored article is one self-contained HTML document.

**That markup is an XSS boundary.** `lib/richtext.ts` rebuilds it against a tag
and attribute whitelist — parse, walk, keep only what is named, drop the rest —
so an unknown tag is safe by default rather than dangerous by default. Links are
limited to http/https/mailto. Sanitising runs on save *and* on render, because
the database can hold rows this code never wrote. Paste is forced to plain text.
Verified: `<script>`, `<img onerror>` and `javascript:` hrefs are stripped while
headings, lists and bold survive.

### Reactions, hashtags, media preview

**Reactions** — like, celebrate, support, insightful, love. One per member per
post: picking a second replaces the first, tapping the current one clears it.
Counts ship inline with each post so a feed of 20 does not fire 20 extra
requests. `likes_count` stays the total across all kinds, so existing ranking
signals keep working without a migration.

**Hashtags** are extracted from the body server-side and merged into the post's
topics — a member who writes `#agriculture` gets the same reach as one who filled
the topics box. The pattern accepts accented, Arabic and CJK characters; an
English-only `\w` would silently drop a Swahili or Arabic tag.

The composer shows detected tags as chips **while you type**, using the same
pattern as the server — a tag shown as recognised in the UI but dropped on save
would be worse than no feedback at all.

In the feed a tag links to `?mode=topics&topic=…`, and the feed's topic, city and
country filters are **read from the URL**. They used to be local state, so a
hashtag link switched the mode and then ignored the topic: the feed came back
unfiltered and clicking a tag looked like it did nothing.

**Media preview** — click an image for a full-screen viewer with keyboard paging.
It is portalled to `<body>`: every `.cloud-card` has a `backdrop-filter`, which
establishes a containing block, so `position: fixed` inside a card resolves
against the card rather than the viewport.

### Threaded comments

Two visual levels — a comment and a reply. Anything deeper **flattens**: the
server re-attaches it to the branch root and records `reply_to`, and the client
prefills an `@handle` mention. Indentation stops being able to show who answered
whom once a thread runs out of horizontal room, so the mention carries it
instead (`MAX_COMMENT_DEPTH` in social-service).

Author handles are resolved in one batch via `POST /internal/profiles` rather
than a request per row; if user-service is unreachable the thread still renders
with ids. Mentions are highlighted by splitting text nodes — never by injecting
markup.

### Profiles

Every avatar in the app is the same component (`MemberAvatar`) and every one of
them links to `/u/{handle}`. Before, each surface drew its own initials block, so
an avatar was clickable in some places and inert in others, and the same person's
colour differed between the feed and the rail. The fallback colour is now derived
from the handle, so one member keeps one colour everywhere — which makes a
comment thread scannable without reading a name.

The profile page carries the cover, identity, follower counts, the relationship
actions (Follow / Connect / Message, each reflecting what the permission check
allows) and the member's posts. Post authors are resolved **in one batch per
page**, not one request per card.

`GET /posts/by/{author_id}` applies visibility server-side: a visitor gets public
posts only, and follower-only posts never enter the payload. Verified — the owner
sees 8 posts (`followers`, `public`), a visitor sees 7 (`public`).

### Follow vs connect, and privacy

Two different relationships, deliberately:

- **Follow** is one-way and needs nobody's permission.
- **Connect** is an invitation the other person accepts, and **that acceptance is
  what unlocks messaging, family links and community invites.**

Each member sets the rules in Dashboard → Privacy (`who_can_invite`,
`who_can_message`, `who_can_add_family`, `who_can_add_community`,
`discoverable`), each `everyone | connections | nobody`. Defaults are the
cautious reading: anyone may *ask* to connect; only an accepted connection may
message you.

**The rules are enforced server-side.** messaging-service asks
`/internal/permissions/{actor}/{target}` before creating a conversation and
**fails closed** — if user-service is unreachable it refuses rather than assumes
yes, so an outage cannot become a way around someone's setting. Verified end to
end: chat refused before connecting, refused while pending, allowed after
acceptance, and refused again once the target sets `who_can_message=nobody`.

That permission logic lives in one place. Three services re-deriving "are they
connected?" would drift, and the copy that drifts is the one that leaks.

### Suggestions

The feed rail suggests **people, communities and forums** (`/users/suggestions`,
`/discover`). Each list states the ranking it actually used — "Most followed on
Kaluta", "Most active right now" — rather than implying a personalisation that
does not exist yet. Already-followed, blocked and blocking accounts are excluded;
**secret communities never appear**, since a suggestion list is exactly the leak
that would undo them.

The feed header is one menu rather than ten chips — the modes carry their
descriptions inside it, which the chip row never had room for.

Lenis smooth scroll is **off** on app routes: eased scrolling is a brochure
flourish that costs latency through a feed and takes over `window.scrollTo`. Attached media renders in the card: one image
full-width, several in a grid, videos with controls. `/shorts` is the vertical
reel — a short is simply a post whose format is video, and an IntersectionObserver
plays only the clip on screen.

### Real-time

The gateway relays WebSockets (`/api/ws` → messaging-service), so the browser
still talks to one origin. `useRealtime` reconnects with backoff and the UI shows
Live / Reconnecting rather than silently going stale. Direct messages and Live
room chat share the same socket.

### Passkeys

The WebAuthn ceremony is wired end to end: `/auth/passkeys/register/options` →
`navigator.credentials.create()` → `/register/verify`, and the same shape for
sign-in. Challenges are single-use, stored in Redis when reachable. Kaluta keeps
a public key and a signature counter — never a biometric.

### Live — what is real and what is not

`/live` gives **real-time chat** (a live room is a group conversation) and a
**local camera preview**. Video is *not* broadcast: there is no ingest server,
no transcoder and no CDN, so nobody else receives the stream. The page says so
on screen rather than showing a convincing player.

The marketing pages under `/platform`, `/feeds`, `/family` etc. remain the public
showcase and keep their designed content.

### GSAP inside React

Use `useGSAP` from `@gsap/react`, never `useEffect`. `ScrollTrigger`'s `pin`
re-parents the pinned node into a `.pin-spacer`; a `useEffect` cleanup runs after
React has already detached the node, so the revert lands too late and React's own
`removeChild` throws, killing every navigation.

## Database migrations

Tables are created on startup with `create_all`, which only creates *missing
tables* — it never adds a column to an existing one. Once the schema is in use,
a column change needs a real migration; add Alembic before that point.
